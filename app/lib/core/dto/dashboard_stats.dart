/// 数据看板 typed DTO（116f-D 样板）。
///
/// 对应 `GET /data/dashboard`（农情数据看板聚合响应）。
///
/// 解析容错口径与 `pages/data/data_dashboard_page.dart` 的取值助手
/// （`_int` / `_double` / `_text` / `_map` / `_list`）语义一致：
/// 数值字段 num→值、字符串可解析→值、其余→0；文本字段去首尾空白，
/// `null`/空/`'null'` 回退 fallback；聚合块缺失回退空结构，不抛错。
library;

/// num → int；字符串可解析 → 值；其余 → 0（与看板页 `_int` 一致）。
int _asInt(dynamic value) =>
    value is num ? value.toInt() : (int.tryParse('$value') ?? 0);

/// num → double；字符串可解析 → 值；其余 → 0（与看板页 `_double` 一致）。
double _asDouble(dynamic value) =>
    value is num ? value.toDouble() : (double.tryParse('$value') ?? 0);

/// 去首尾空白；`null`/空/`'null'` 回退 fallback（与看板页 `_text` 一致）。
String _asText(dynamic value, {String fallback = ''}) {
  final text = '${value ?? ''}'.trim();
  return (text.isEmpty || text == 'null') ? fallback : text;
}

/// Map → 键字符串化的 Map；其余 → 空 Map（与看板页 `_map` 一致）。
Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map) {
    return value.map((key, value) => MapEntry('$key', value));
  }
  return <String, dynamic>{};
}

/// List → 仅保留 Map 元素并逐个 `_map`；其余 → 空列表（与看板页 `_list` 一致）。
List<Map<String, dynamic>> _asList(dynamic value) {
  if (value is List) {
    return value.whereType<Map>().map(_asMap).toList();
  }
  return <Map<String, dynamic>>[];
}

DateTime? _asDate(dynamic value) => DateTime.tryParse(_asText(value));

/// 平台级聚合卡片（全平台用户/商品/订单/成交额等，仅管理员/村委可见）。
class DashboardStatCards {
  final int userCount;
  final int plotCount;
  final double totalAreaMu;
  final int recordCount;
  final double totalCost;
  final int productCount;
  final int orderCount;
  final double orderAmount;
  final int disasterCount;
  final double disasterLoss;
  final int policyCount;
  final int aiCallCount;

  const DashboardStatCards({
    this.userCount = 0,
    this.plotCount = 0,
    this.totalAreaMu = 0,
    this.recordCount = 0,
    this.totalCost = 0,
    this.productCount = 0,
    this.orderCount = 0,
    this.orderAmount = 0,
    this.disasterCount = 0,
    this.disasterLoss = 0,
    this.policyCount = 0,
    this.aiCallCount = 0,
  });

  factory DashboardStatCards.fromJson(Map<String, dynamic> j) =>
      DashboardStatCards(
        userCount: _asInt(j['userCount']),
        plotCount: _asInt(j['plotCount']),
        totalAreaMu: _asDouble(j['totalAreaMu']),
        recordCount: _asInt(j['recordCount']),
        totalCost: _asDouble(j['totalCost']),
        productCount: _asInt(j['productCount']),
        orderCount: _asInt(j['orderCount']),
        orderAmount: _asDouble(j['orderAmount']),
        disasterCount: _asInt(j['disasterCount']),
        disasterLoss: _asDouble(j['disasterLoss']),
        policyCount: _asInt(j['policyCount']),
        aiCallCount: _asInt(j['aiCallCount']),
      );
}

/// 管理员专属平台统计（非管理员为 null）。
class DashboardPlatformStats {
  final int farmerCount;
  final double totalAreaMu;
  final int cropTypeCount;
  final int aiServiceCount;
  final int orderCount;

  const DashboardPlatformStats({
    this.farmerCount = 0,
    this.totalAreaMu = 0,
    this.cropTypeCount = 0,
    this.aiServiceCount = 0,
    this.orderCount = 0,
  });

  factory DashboardPlatformStats.fromJson(Map<String, dynamic> j) =>
      DashboardPlatformStats(
        farmerCount: _asInt(j['farmerCount']),
        totalAreaMu: _asDouble(j['totalAreaMu']),
        cropTypeCount: _asInt(j['cropTypeCount']),
        aiServiceCount: _asInt(j['aiServiceCount']),
        orderCount: _asInt(j['orderCount']),
      );
}

/// 种植结构条目（按面积降序由后端返回，DTO 保持顺序）。
class DashboardCropAreaItem {
  final String cropType;
  final double areaMu;
  final int plots;

  const DashboardCropAreaItem({
    this.cropType = '未填写',
    this.areaMu = 0,
    this.plots = 0,
  });

  factory DashboardCropAreaItem.fromJson(Map<String, dynamic> j) =>
      DashboardCropAreaItem(
        cropType: _asText(j['cropType'], fallback: '未填写'),
        areaMu: _asDouble(j['areaMu']),
        plots: _asInt(j['plots']),
      );
}

/// 农事类型统计条目。
class DashboardFarmRecordTypeItem {
  final String type;
  final int count;

  const DashboardFarmRecordTypeItem({this.type = '', this.count = 0});

  factory DashboardFarmRecordTypeItem.fromJson(Map<String, dynamic> j) =>
      DashboardFarmRecordTypeItem(
        type: _asText(j['type']),
        count: _asInt(j['count']),
      );
}

/// 灾情统计条目。
class DashboardDisasterStatItem {
  final String type;
  final int count;
  final double loss;

  const DashboardDisasterStatItem({this.type = '', this.count = 0, this.loss = 0});

  factory DashboardDisasterStatItem.fromJson(Map<String, dynamic> j) =>
      DashboardDisasterStatItem(
        type: _asText(j['type']),
        count: _asInt(j['count']),
        loss: _asDouble(j['loss']),
      );
}

/// 最近统计上报条目（dataJson 已由后端解析为对象）。
class DashboardStatReportItem {
  final int id;
  final String statType;
  final String cropType;
  final double areaMu;
  final double yieldKg;
  final Map<String, dynamic> dataJson;
  final String status;
  final DateTime? createdAt;

  const DashboardStatReportItem({
    this.id = 0,
    this.statType = '',
    this.cropType = '综合',
    this.areaMu = 0,
    this.yieldKg = 0,
    this.dataJson = const <String, dynamic>{},
    this.status = '',
    this.createdAt,
  });

  factory DashboardStatReportItem.fromJson(Map<String, dynamic> j) {
    final dataJson = _asMap(j['dataJson']);
    return DashboardStatReportItem(
      id: _asInt(j['id']),
      statType: _asText(j['statType']),
      // 与看板页 _reportTile 一致：外层字段优先，缺失时回退 dataJson 内字段。
      cropType: _asText(
        j['cropType'],
        fallback: _asText(dataJson['cropType'], fallback: '综合'),
      ),
      areaMu: _asDouble(
        j.containsKey('areaMu') ? j['areaMu'] : dataJson['areaMu'],
      ),
      yieldKg: _asDouble(
        j.containsKey('yieldKg') ? j['yieldKg'] : dataJson['yieldKg'],
      ),
      dataJson: dataJson,
      status: _asText(j['status']),
      createdAt: _asDate(j['createdAt']),
    );
  }
}

/// 最近同步日志条目。
class DashboardSyncLogItem {
  final int id;
  final int userId;
  final String tableName;
  final String operation;
  final String? localUuid;
  final String syncStatus;
  final String? conflictDetail;
  final DateTime? syncedAt;

  const DashboardSyncLogItem({
    this.id = 0,
    this.userId = 0,
    this.tableName = '',
    this.operation = '',
    this.localUuid,
    this.syncStatus = '',
    this.conflictDetail,
    this.syncedAt,
  });

  factory DashboardSyncLogItem.fromJson(Map<String, dynamic> j) {
    final localUuid = _asText(j['localUuid']);
    final conflictDetail = _asText(j['conflictDetail']);
    return DashboardSyncLogItem(
      id: _asInt(j['id']),
      userId: _asInt(j['userId']),
      tableName: _asText(j['tableName']),
      operation: _asText(j['operation']),
      localUuid: localUuid.isEmpty ? null : localUuid,
      syncStatus: _asText(j['syncStatus']),
      conflictDetail: conflictDetail.isEmpty ? null : conflictDetail,
      syncedAt: _asDate(j['syncedAt']),
    );
  }
}

/// 最近将截止的政策（无则 null）。
class DashboardUpcomingPolicy {
  final int id;
  final String title;
  final String category;
  final DateTime? validTo;

  const DashboardUpcomingPolicy({
    this.id = 0,
    this.title = '',
    this.category = '',
    this.validTo,
  });

  factory DashboardUpcomingPolicy.fromJson(Map<String, dynamic> j) =>
      DashboardUpcomingPolicy(
        id: _asInt(j['id']),
        title: _asText(j['title']),
        category: _asText(j['category']),
        validTo: _asDate(j['validTo']),
      );
}

/// 服务状态块。
class DashboardServiceStatus {
  final String dataSource;
  final String mode;
  final String message;

  const DashboardServiceStatus({
    this.dataSource = '',
    this.mode = '',
    this.message = '',
  });

  factory DashboardServiceStatus.fromJson(Map<String, dynamic> j) =>
      DashboardServiceStatus(
        dataSource: _asText(j['dataSource']),
        mode: _asText(j['mode']),
        message: _asText(j['message']),
      );
}

/// 农情数据看板聚合响应。
class DashboardStats {
  final int year;
  final DashboardStatCards cards;
  final DashboardPlatformStats? platformStats;
  final List<DashboardCropAreaItem> cropArea;
  final List<DashboardFarmRecordTypeItem> farmRecordTypes;
  final List<DashboardDisasterStatItem> disasterStats;
  final List<DashboardStatReportItem> latestStatReports;
  final List<DashboardSyncLogItem> latestSyncLogs;
  final DashboardUpcomingPolicy? upcomingPolicyDeadline;
  final DashboardServiceStatus serviceStatus;

  const DashboardStats({
    this.year = 0,
    this.cards = const DashboardStatCards(),
    this.platformStats,
    this.cropArea = const <DashboardCropAreaItem>[],
    this.farmRecordTypes = const <DashboardFarmRecordTypeItem>[],
    this.disasterStats = const <DashboardDisasterStatItem>[],
    this.latestStatReports = const <DashboardStatReportItem>[],
    this.latestSyncLogs = const <DashboardSyncLogItem>[],
    this.upcomingPolicyDeadline,
    this.serviceStatus = const DashboardServiceStatus(),
  });

  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
        year: _asInt(j['year']),
        cards: DashboardStatCards.fromJson(_asMap(j['cards'])),
        platformStats: j['platformStats'] == null
            ? null
            : DashboardPlatformStats.fromJson(_asMap(j['platformStats'])),
        cropArea: <DashboardCropAreaItem>[
          for (final item in _asList(j['cropArea']))
            DashboardCropAreaItem.fromJson(item),
        ],
        farmRecordTypes: <DashboardFarmRecordTypeItem>[
          for (final item in _asList(j['farmRecordTypes']))
            DashboardFarmRecordTypeItem.fromJson(item),
        ],
        disasterStats: <DashboardDisasterStatItem>[
          for (final item in _asList(j['disasterStats']))
            DashboardDisasterStatItem.fromJson(item),
        ],
        latestStatReports: <DashboardStatReportItem>[
          for (final item in _asList(j['latestStatReports']))
            DashboardStatReportItem.fromJson(item),
        ],
        latestSyncLogs: <DashboardSyncLogItem>[
          for (final item in _asList(j['latestSyncLogs']))
            DashboardSyncLogItem.fromJson(item),
        ],
        upcomingPolicyDeadline: j['upcomingPolicyDeadline'] == null
            ? null
            : DashboardUpcomingPolicy.fromJson(
                _asMap(j['upcomingPolicyDeadline']),
              ),
        serviceStatus: DashboardServiceStatus.fromJson(
          _asMap(j['serviceStatus']),
        ),
      );
}
