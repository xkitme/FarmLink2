import 'package:farmlink/core/dto/dashboard_stats.dart';
import 'package:flutter_test/flutter_test.dart';

/// 116f-D C6：DashboardStats typed DTO 解析正确，
/// 异常字段容错与 `data_dashboard_page.dart` 的 `_int/_double/_text/_map/_list`
/// 助手语义一致（num→值、可解析字符串→值、其余→0；null/空/'null'→fallback）。
void main() {
  Map<String, dynamic> fullPayload() => <String, dynamic>{
        'year': 2026,
        'cards': <String, dynamic>{
          'userCount': 11,
          'plotCount': 22,
          'totalAreaMu': 33.5,
          'recordCount': 44,
          'totalCost': 55.25,
          'productCount': 66,
          'orderCount': 77,
          'orderAmount': 88.75,
          'disasterCount': 2,
          'disasterLoss': 1200.5,
          'policyCount': 3,
          'aiCallCount': 99,
        },
        'platformStats': <String, dynamic>{
          'farmerCount': 10,
          'totalAreaMu': 330.5,
          'cropTypeCount': 6,
          'aiServiceCount': 150,
          'orderCount': 77,
        },
        'cropArea': <dynamic>[
          <String, dynamic>{'cropType': '水稻', 'areaMu': 20.5, 'plots': 2},
          <String, dynamic>{'cropType': '玉米', 'areaMu': '13', 'plots': 1},
        ],
        'farmRecordTypes': <dynamic>[
          <String, dynamic>{'type': '施肥', 'count': 7},
        ],
        'disasterStats': <dynamic>[
          <String, dynamic>{'type': '干旱', 'count': 1, 'loss': 800},
        ],
        'latestStatReports': <dynamic>[
          <String, dynamic>{
            'id': 5,
            'statType': '产量',
            'dataJson': <String, dynamic>{
              'cropType': '水稻',
              'areaMu': 12.5,
              'yieldKg': 300,
            },
            'status': 'SUBMITTED',
            'createdAt': '2026-08-10T02:00:00.000Z',
          },
        ],
        'latestSyncLogs': <dynamic>[
          <String, dynamic>{
            'id': 9,
            'userId': 1,
            'tableName': 'farm_record',
            'operation': 'INSERT',
            'localUuid': 'uuid-1',
            'syncStatus': 'SUCCESS',
            'conflictDetail': null,
            'syncedAt': '2026-08-11T03:00:00.000Z',
          },
        ],
        'upcomingPolicyDeadline': <String, dynamic>{
          'id': 4,
          'title': '玉米种植补贴',
          'category': '农业补贴',
          'validTo': '2026-12-31T00:00:00.000Z',
        },
        'serviceStatus': <String, dynamic>{
          'dataSource': '平台业务数据',
          'mode': '运行中',
          'message': '数据已更新',
        },
      };

  test('完整 payload：cards/平台统计/各列表与服务状态解析正确', () {
    final d = DashboardStats.fromJson(fullPayload());

    expect(d.year, 2026);

    expect(d.cards.userCount, 11);
    expect(d.cards.plotCount, 22);
    expect(d.cards.totalAreaMu, 33.5);
    expect(d.cards.recordCount, 44);
    expect(d.cards.totalCost, 55.25);
    expect(d.cards.productCount, 66);
    expect(d.cards.orderCount, 77);
    expect(d.cards.orderAmount, 88.75);
    expect(d.cards.disasterCount, 2);
    expect(d.cards.disasterLoss, 1200.5);
    expect(d.cards.policyCount, 3);
    expect(d.cards.aiCallCount, 99);

    expect(d.platformStats!.farmerCount, 10);
    expect(d.platformStats!.totalAreaMu, 330.5);
    expect(d.platformStats!.cropTypeCount, 6);
    expect(d.platformStats!.aiServiceCount, 150);
    expect(d.platformStats!.orderCount, 77);

    expect(d.cropArea, hasLength(2));
    expect(d.cropArea[0].cropType, '水稻');
    expect(d.cropArea[0].areaMu, 20.5);
    expect(d.cropArea[0].plots, 2);
    expect(d.cropArea[1].areaMu, 13.0); // 字符串 '13' → 13.0

    expect(d.farmRecordTypes.single.type, '施肥');
    expect(d.farmRecordTypes.single.count, 7);

    expect(d.disasterStats.single.type, '干旱');
    expect(d.disasterStats.single.count, 1);
    expect(d.disasterStats.single.loss, 800.0);

    final report = d.latestStatReports.single;
    expect(report.id, 5);
    expect(report.statType, '产量');
    expect(report.cropType, '水稻');
    expect(report.areaMu, 12.5);
    expect(report.yieldKg, 300.0);
    expect(report.dataJson['areaMu'], 12.5);
    expect(report.status, 'SUBMITTED');
    expect(report.createdAt, DateTime.parse('2026-08-10T02:00:00.000Z'));

    final log = d.latestSyncLogs.single;
    expect(log.id, 9);
    expect(log.userId, 1);
    expect(log.tableName, 'farm_record');
    expect(log.operation, 'INSERT');
    expect(log.localUuid, 'uuid-1');
    expect(log.syncStatus, 'SUCCESS');
    expect(log.conflictDetail, isNull);
    expect(log.syncedAt, DateTime.parse('2026-08-11T03:00:00.000Z'));

    expect(d.upcomingPolicyDeadline!.id, 4);
    expect(d.upcomingPolicyDeadline!.title, '玉米种植补贴');
    expect(d.upcomingPolicyDeadline!.validTo,
        DateTime.parse('2026-12-31T00:00:00.000Z'));

    expect(d.serviceStatus.dataSource, '平台业务数据');
    expect(d.serviceStatus.mode, '运行中');
    expect(d.serviceStatus.message, '数据已更新');
  });

  test('statReport 外层字段缺失时回退 dataJson 内字段（与看板页一致）', () {
    final d = DashboardStats.fromJson(<String, dynamic>{
      'latestStatReports': <dynamic>[
        <String, dynamic>{
          'statType': '面积',
          'dataJson': <String, dynamic>{
            'cropType': '小麦',
            'areaMu': '8.5',
            'yieldKg': 100,
          },
        },
      ],
    });

    final report = d.latestStatReports.single;
    expect(report.cropType, '小麦');
    expect(report.areaMu, 8.5);
    expect(report.yieldKg, 100.0);
  });

  test('缺失/异常聚合块回退空结构与 0（容错与看板页助手一致）', () {
    final d = DashboardStats.fromJson(<String, dynamic>{
      'cards': 'bad',
      'cropArea': <String, dynamic>{'nope': true},
      'farmRecordTypes': 'bad',
      'disasterStats': null,
      'latestStatReports': <dynamic>['bad', <String, dynamic>{}],
      'latestSyncLogs': null,
      'serviceStatus': null,
    });

    expect(d.year, 0);
    expect(d.cards.userCount, 0);
    expect(d.cards.totalAreaMu, 0);
    expect(d.platformStats, isNull);
    expect(d.cropArea, isEmpty); // 非 List → 空
    expect(d.farmRecordTypes, isEmpty);
    expect(d.disasterStats, isEmpty);
    expect(d.latestStatReports, hasLength(1)); // 仅保留 Map 元素
    expect(d.latestStatReports.single.statType, '');
    expect(d.latestSyncLogs, isEmpty);
    expect(d.upcomingPolicyDeadline, isNull);
    expect(d.serviceStatus.message, '');
  });

  test('数值字符串可解析即收敛（"12.5"→12.5、"abc"→0），文本 "null"→fallback', () {
    final d = DashboardStats.fromJson(<String, dynamic>{
      'year': '2026',
      'cards': <String, dynamic>{'userCount': 'abc', 'orderAmount': '9.5'},
      'cropArea': <dynamic>[
        <String, dynamic>{'cropType': 'null', 'areaMu': null, 'plots': '2'},
      ],
      'serviceStatus': <String, dynamic>{'message': 'null'},
    });

    expect(d.year, 2026);
    expect(d.cards.userCount, 0);
    expect(d.cards.orderAmount, 9.5);
    expect(d.cropArea.single.cropType, '未填写'); // 'null' → fallback
    expect(d.cropArea.single.areaMu, 0);
    expect(d.cropArea.single.plots, 2);
    expect(d.serviceStatus.message, '');
  });
}
