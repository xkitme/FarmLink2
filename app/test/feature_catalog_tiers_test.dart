import 'package:farmlink/core/feature_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('feature catalog keeps stable ids and tier counts', () {
    final ids = kFeatureCatalog.map((f) => f.id).toSet();

    expect(ids.length, kFeatureCatalog.length);
    expect(kFeatureCatalog.length, 70);
    expect(kPrimaryFeatures.length, 6);
    expect(kToolFeatures.length, 49);
    expect(kExperimentalFeatures.length, 15);
  });

  test('primary tier is the six core user journeys', () {
    final primaryByName = {for (final f in kPrimaryFeatures) f.name: f};

    expect(primaryByName.keys, {
      '病虫害识别',
      '乡村集市',
      '农机租赁',
      '灾情上报',
      '补贴申请',
      '农情数据看板',
    });
    expect(primaryByName['病虫害识别']!.id, 'plant-care.diagnose');
    expect(primaryByName['乡村集市']!.journey, 'market');
    expect(primaryByName['农机租赁']!.route, '/machinery');
    expect(primaryByName['灾情上报']!.journey, 'disaster');
    expect(primaryByName['补贴申请']!.route, '/policy/service');
    expect(primaryByName['农情数据看板']!.id, 'village.dashboard');
  });

  test('experimental features are separated from core journeys', () {
    final experimentalNames = kExperimentalFeatures.map((f) => f.name).toSet();
    final toolNames = kToolFeatures.map((f) => f.name).toSet();

    expect(experimentalNames, containsAll(['价格预测', '期货行情', 'AI 质量分级', '遥感分析']));
    expect(toolNames, containsAll(['实时行情', '农事日历', '村医问诊', '数据同步']));
    expect(experimentalNames.contains('乡村集市'), isFalse);
    expect(toolNames.contains('补贴申请'), isFalse);
  });
}
