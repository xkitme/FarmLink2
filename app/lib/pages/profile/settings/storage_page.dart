import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants.dart';
import '../../../core/offline_sync_queue.dart';
import '../../../widgets/common.dart';
import 'settings_widgets.dart';

/// 存储空间管理：展示本机各类数据的真实占用，并支持清理业务数据缓存。
/// 占用值由 SharedPreferences 中各键的 UTF-8 字节数实时统计，而非写死。
class StoragePage extends StatefulWidget {
  const StoragePage({super.key});

  @override
  State<StoragePage> createState() => _StoragePageState();
}

/// 业务数据缓存键前缀（与设置首页「清除缓存」口径一致）
const _cachePrefixes = ['cache:', 'dashboard:', 'service:'];

class _StorageUsage {
  final int cacheBytes; // 业务数据缓存（地块/农事/灾情等列表）
  final int queueBytes; // 待发送队列
  final int prefBytes; // 偏好与登录信息
  final int cacheRecords; // 缓存记录条数
  final int queueWaiting; // 待发送条数

  const _StorageUsage({
    required this.cacheBytes,
    required this.queueBytes,
    required this.prefBytes,
    required this.cacheRecords,
    required this.queueWaiting,
  });

  int get totalBytes => cacheBytes + queueBytes + prefBytes;

  const _StorageUsage.empty()
      : cacheBytes = 0,
        queueBytes = 0,
        prefBytes = 0,
        cacheRecords = 0,
        queueWaiting = 0;
}

class _StoragePageState extends State<StoragePage> {
  bool _loading = true;
  bool _clearing = false;
  _StorageUsage _usage = const _StorageUsage.empty();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final sp = await SharedPreferences.getInstance();
    var cacheBytes = 0;
    var queueBytes = 0;
    var prefBytes = 0;
    var cacheRecords = 0;

    for (final key in sp.getKeys()) {
      final value = sp.get(key);
      final bytes = _bytesOf(key, value);
      if (key == 'sync:queue') {
        queueBytes += bytes;
      } else if (_cachePrefixes.any(key.startsWith)) {
        cacheBytes += bytes;
        if (key.startsWith('cache:') &&
            !key.endsWith(':updatedAt') &&
            value is String) {
          cacheRecords += _countList(value);
        }
      } else {
        prefBytes += bytes;
      }
    }

    final waiting = await OfflineSyncQueue.waitingCount();
    if (!mounted) return;
    setState(() {
      _usage = _StorageUsage(
        cacheBytes: cacheBytes,
        queueBytes: queueBytes,
        prefBytes: prefBytes,
        cacheRecords: cacheRecords,
        queueWaiting: waiting,
      );
      _loading = false;
    });
  }

  Future<void> _clearCache() async {
    final confirmed = await _confirmClear();
    if (confirmed != true) return;
    setState(() => _clearing = true);
    try {
      final sp = await SharedPreferences.getInstance();
      final keys = sp
          .getKeys()
          .where((key) => _cachePrefixes.any(key.startsWith))
          .toList();
      for (final key in keys) {
        await sp.remove(key);
      }
      await OfflineSyncQueue.clear();
      if (!mounted) return;
      toast(context, '已清理缓存（${keys.length} 项）');
      await _load();
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('清理', e), error: true);
    } finally {
      if (mounted) setState(() => _clearing = false);
    }
  }

  Future<bool?> _confirmClear() {
    return showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                '清理缓存',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '将清空已下载的业务数据缓存与待发送队列，'
                '清理后重新进入页面会再次拉取最新数据。账号与设置不受影响。',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(sheetContext).pop(true),
                  child: const Text('确认清理'),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 50,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(sheetContext).pop(false),
                  child: const Text('再想想'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const SettingsPageAppBar(title: '存储空间管理'),
      body: _loading
          ? const Loading(text: '正在统计占用')
          : RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                children: [
                  _totalCard(),
                  const SizedBox(height: 16),
                  const SettingsGroupLabel('占用明细'),
                  AppCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: [
                        _row(
                          Icons.dataset_outlined,
                          '业务数据缓存',
                          '${_usage.cacheRecords} 条记录',
                          _fmt(_usage.cacheBytes),
                        ),
                        const Divider(height: 1, indent: 56),
                        _row(
                          Icons.outbox_outlined,
                          '待发送队列',
                          '${_usage.queueWaiting} 条待发送',
                          _fmt(_usage.queueBytes),
                        ),
                        const Divider(height: 1, indent: 56),
                        _row(
                          Icons.tune_rounded,
                          '账号与偏好设置',
                          '登录信息、提醒开关等',
                          _fmt(_usage.prefBytes),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: _clearing ? null : _clearCache,
                      icon: _clearing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.cleaning_services_outlined,
                              size: 20),
                      label: Text(_clearing ? '清理中' : '清理缓存'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Center(
                    child: Text(
                      '清理仅移除可重新拉取的数据缓存，不影响账号与设置',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _totalCard() {
    final total = _usage.totalBytes;
    final cacheFraction =
        total == 0 ? 0.0 : (_usage.cacheBytes + _usage.queueBytes) / total;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '本机已用空间',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 6),
          Text(
            _fmt(total),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(R.sm),
            child: LinearProgressIndicator(
              value: cacheFraction.clamp(0.02, 1.0),
              minHeight: 8,
              backgroundColor: Colors.white.withValues(alpha: 0.25),
              color: AppColors.gold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '其中可清理的数据缓存约 ${_fmt(_usage.cacheBytes + _usage.queueBytes)}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String subtitle, String trailing) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primary, size: 22),
      title: Text(label, style: const TextStyle(fontSize: 15)),
      subtitle: Text(
        subtitle,
        style:
            const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12),
      ),
      trailing: Text(
        trailing,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.onSurface,
        ),
      ),
    );
  }

  /// 估算单个键值对的 UTF-8 字节占用（键 + 值）
  static int _bytesOf(String key, Object? value) {
    var bytes = utf8.encode(key).length;
    if (value is String) {
      bytes += utf8.encode(value).length;
    } else if (value is List<String>) {
      for (final item in value) {
        bytes += utf8.encode(item).length;
      }
    } else if (value != null) {
      bytes += utf8.encode(value.toString()).length;
    }
    return bytes;
  }

  static int _countList(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) return decoded.length;
    } catch (_) {}
    return 0;
  }

  /// 字节数转可读单位
  static String _fmt(int bytes) {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return '$bytes B';
    final kb = bytes / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(kb < 10 ? 1 : 0)} KB';
    final mb = kb / 1024;
    return '${mb.toStringAsFixed(mb < 10 ? 2 : 1)} MB';
  }
}
