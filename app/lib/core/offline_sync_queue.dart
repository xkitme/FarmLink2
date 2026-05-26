import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

class OfflineSyncQueue {
  OfflineSyncQueue._();

  static const _key = 'sync:queue';
  static const _replayTables = {'land_plot', 'farm_record', 'disaster_report'};

  static Future<List<SyncQueueItem>> all() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((item) => SyncQueueItem.fromJson(item.cast<String, dynamic>()))
            .toList();
      }
    } catch (_) {
      return [];
    }
    return [];
  }

  static Future<int> waitingCount() async {
    final items = await all();
    return items.where((item) => item.status != SyncStatus.synced).length;
  }

  static Future<SyncQueueItem> enqueue({
    required String tableName,
    required Map<String, dynamic> payload,
    String operation = 'INSERT',
    String? path,
  }) async {
    final items = await all();
    final localUuid = '${payload['localUuid'] ?? _uuid()}';
    final item = SyncQueueItem(
      id: _uuid(),
      tableName: tableName,
      operation: operation,
      path: path,
      localUuid: localUuid,
      payload: {...payload, 'localUuid': localUuid},
      status: SyncStatus.pending,
      retryCount: 0,
      createdAt: DateTime.now(),
    );
    await _save([item, ...items]);
    return item;
  }

  static Future<OfflineSyncResult> enqueueAndFlush({
    required String tableName,
    required Map<String, dynamic> payload,
    String operation = 'INSERT',
    String? path,
  }) async {
    await enqueue(
      tableName: tableName,
      payload: payload,
      operation: operation,
      path: path,
    );
    return flush();
  }

  static Future<OfflineSyncResult> flush() async {
    final items = await all();
    if (items.isEmpty) return const OfflineSyncResult.empty();

    var success = 0;
    var conflict = 0;
    var failed = 0;
    final remaining = <SyncQueueItem>[];

    for (final item in items) {
      try {
        final result = await _submit(item);
        if (result == SyncStatus.synced) {
          success++;
        } else if (result == SyncStatus.conflict) {
          conflict++;
          remaining.add(item.next(result, lastError: '服务端数据更新，需要人工合并'));
        } else {
          failed++;
          remaining.add(item.next(SyncStatus.failed, lastError: '同步失败'));
        }
      } catch (_) {
        failed++;
        remaining.add(item.next(SyncStatus.failed, lastError: '同步失败'));
      }
    }

    await _save(remaining);
    return OfflineSyncResult(
      total: items.length,
      success: success,
      conflict: conflict,
      failed: failed,
      remaining: remaining.length,
    );
  }

  static Future<void> remove(String id) async {
    final items = await all();
    await _save(items.where((item) => item.id != id).toList());
  }

  static Future<void> clear() => _save([]);

  static Future<SyncStatus> _submit(SyncQueueItem item) async {
    if (_replayTables.contains(item.tableName)) {
      final data = await ApiClient.post('/data/sync', body: {
        'items': [item.toReplayPayload()],
      }) as Map<String, dynamic>;
      final results = data['results'];
      if (results is List && results.isNotEmpty) {
        final first = results.first;
        if (first is Map) {
          final status = '${first['status']}';
          if (status == 'SUCCESS') return SyncStatus.synced;
          if (status == 'CONFLICT') return SyncStatus.conflict;
        }
      }
      return SyncStatus.synced;
    }

    if (item.path == null || item.path!.isEmpty) {
      throw Exception('缺少同步接口路径');
    }
    await ApiClient.post(item.path!, body: item.payload);
    return SyncStatus.synced;
  }

  static Future<void> _save(List<SyncQueueItem> items) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(
      _key,
      jsonEncode(items.map((item) => item.toJson()).toList()),
    );
  }

  static String _uuid() {
    final random = Random().nextInt(1 << 32).toRadixString(16);
    return 'local-${DateTime.now().microsecondsSinceEpoch}-$random';
  }
}

enum SyncStatus {
  pending,
  failed,
  conflict,
  synced;

  String get label {
    switch (this) {
      case SyncStatus.pending:
        return '待同步';
      case SyncStatus.failed:
        return '待重试';
      case SyncStatus.conflict:
        return '冲突';
      case SyncStatus.synced:
        return '已同步';
    }
  }
}

class SyncQueueItem {
  final String id;
  final String tableName;
  final String operation;
  final String? path;
  final String localUuid;
  final Map<String, dynamic> payload;
  final SyncStatus status;
  final int retryCount;
  final String? lastError;
  final DateTime createdAt;

  const SyncQueueItem({
    required this.id,
    required this.tableName,
    required this.operation,
    required this.localUuid,
    required this.payload,
    required this.status,
    required this.retryCount,
    required this.createdAt,
    this.path,
    this.lastError,
  });

  factory SyncQueueItem.fromJson(Map<String, dynamic> json) => SyncQueueItem(
        id: '${json['id']}',
        tableName: '${json['tableName']}',
        operation: '${json['operation'] ?? 'INSERT'}',
        path: json['path'] == null ? null : '${json['path']}',
        localUuid: '${json['localUuid']}',
        payload: (json['payload'] as Map?)?.cast<String, dynamic>() ??
            <String, dynamic>{},
        status: SyncStatus.values.firstWhere(
          (status) => status.name == json['status'],
          orElse: () => SyncStatus.pending,
        ),
        retryCount: (json['retryCount'] as num?)?.toInt() ?? 0,
        lastError: json['lastError'] == null ? null : '${json['lastError']}',
        createdAt: DateTime.tryParse('${json['createdAt']}') ?? DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'tableName': tableName,
        'operation': operation,
        'path': path,
        'localUuid': localUuid,
        'payload': payload,
        'status': status.name,
        'retryCount': retryCount,
        'lastError': lastError,
        'createdAt': createdAt.toIso8601String(),
      };

  Map<String, dynamic> toReplayPayload() => {
        'tableName': tableName,
        'operation': operation,
        'localUuid': localUuid,
        'payload': payload,
      };

  SyncQueueItem next(SyncStatus nextStatus, {String? lastError}) =>
      SyncQueueItem(
        id: id,
        tableName: tableName,
        operation: operation,
        path: path,
        localUuid: localUuid,
        payload: payload,
        status: nextStatus,
        retryCount: retryCount + 1,
        lastError: lastError ?? this.lastError,
        createdAt: createdAt,
      );
}

class OfflineSyncResult {
  final int total;
  final int success;
  final int conflict;
  final int failed;
  final int remaining;

  const OfflineSyncResult({
    required this.total,
    required this.success,
    required this.conflict,
    required this.failed,
    required this.remaining,
  });

  const OfflineSyncResult.empty()
      : total = 0,
        success = 0,
        conflict = 0,
        failed = 0,
        remaining = 0;

  bool get allSynced => total > 0 && remaining == 0 && failed == 0;
}
