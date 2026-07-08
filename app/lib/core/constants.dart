import 'package:flutter/material.dart';

// ── API ──────────────────────────────────────────────
// 默认连接服务端；APK 可通过 --dart-define=FARMLINK_API_BASE_URL=... 指定服务地址。
const String kBaseUrl = String.fromEnvironment(
  'FARMLINK_API_BASE_URL',
  defaultValue: 'http://localhost:8000',
);
const String kApiPrefix = '/api/v1';

// 应用版本（单一来源；与 pubspec.yaml version 保持一致）。
const String kAppVersion = '1.8.0';

/// 设计系统：Agro-Modernist Tech（参考 docs/设计参考.md）
class AppColors {
  AppColors._();

  // 主色 · 叶绿
  static const primary = Color(0xFF386641);
  static const primaryContainer = Color(0xFF3E6B4F);
  static const primaryDim = Color(0xFF52B788);
  static const onPrimaryContainer = Color(0xFFD8F3DC);

  // 次色 · 黛青
  static const secondary = Color(0xFF40916C);
  // 第三色 · 麦金
  static const tertiary = Color(0xFF2D6A4F);
  static const gold = Color(0xFFDDA15E); // AI 卡边框 / 高亮
  static const goldContainer = Color(0xFFE0892F);

  // 预警
  static const error = Color(0xFFBA1A1A);
  static const errorContainer = Color(0xFFFFDAD6);
  static const warning = Color(0xFFC58A37);
  static const priceRed = Color(0xFFC0584B);

  // 表面层
  static const background = Color(0xFFF4F1E4);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceLow = Color(0xFFF7FAF5);
  static const surfaceContainer = Color(0xFFEFEBDC);
  static const surfaceHigh = Color(0xFFECEFEA);

  // 文字 / 描边
  static const onSurface = Color(0xFF2F3A30);
  static const onSurfaceVariant = Color(0xFF726A57);
  static const outline = Color(0xFF9C8E7A);
  static const outlineVariant = Color(0xFFE5DFCE);

  // 渐变（用于 hero 区）
  static const heroGradient = LinearGradient(
    colors: [Color(0xFF3E6B4F), Color(0xFF5C8A6D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const authButtonGradient = LinearGradient(
    colors: [Color(0xFF5ED09B), Color(0xFF1E7F61)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// 环境光阴影（柔和棕调，禁用浓黑）
  static List<BoxShadow> get ambientShadow => const [
        BoxShadow(
          color: Color(0x12000000),
          blurRadius: 18,
          offset: Offset(0, 6),
        ),
      ];
  static List<BoxShadow> get ambientShadowUp => const [
        BoxShadow(
          color: Color(0x16000000),
          blurRadius: 14,
          offset: Offset(0, -2),
        ),
      ];
}

// 圆角
class R {
  R._();
  static const sm = 10.0;
  static const md = 16.0;
  static const lg = 26.0;
  static const pill = 999.0;
}

// ── 八大板块 ──────────────────────────────────────────
const List<Map<String, dynamic>> kSections = [
  {
    'key': 'agri',
    'label': 'AI 农业生产',
    'icon': Icons.eco,
    'color': Color(0xFF0D631B)
  },
  {
    'key': 'market',
    'label': '流通销售',
    'icon': Icons.storefront,
    'color': Color(0xFF926500)
  },
  {
    'key': 'machinery',
    'label': '农机共享',
    'icon': Icons.agriculture,
    'color': Color(0xFF2E6E66)
  },
  {
    'key': 'disaster',
    'label': '气象灾害',
    'icon': Icons.thunderstorm,
    'color': Color(0xFFBA1A1A)
  },
  {
    'key': 'policy',
    'label': '惠农政策',
    'icon': Icons.account_balance,
    'color': Color(0xFF2E7D32)
  },
  {
    'key': 'life',
    'label': '乡村生活',
    'icon': Icons.home_work,
    'color': Color(0xFF734E00)
  },
  {
    'key': 'data',
    'label': '数据管理',
    'icon': Icons.insights,
    'color': Color(0xFF40493D)
  },
  {
    'key': 'ai',
    'label': 'AI 助手',
    'icon': Icons.smart_toy,
    'color': Color(0xFF0D631B)
  },
];

// ── 行政区划名称（来自 backend/seeds/index.js 的 region 种子） ─────
// 用于把商品/卖家携带的 regionCode 数字码翻译成产地名称，避免向用户展示裸码。
const Map<String, String> kRegionNames = {
  '510000': '四川省',
  '510100': '成都市',
  '510131': '蒲江县',
  '510131100': '寿安街道',
  '510131100201': '松华村',
  '510131100202': '长滩村',
};

/// 把 regionCode 翻译为产地名称；未知或为空时回退到通用文案「乡村产地」，
/// 永不向用户展示裸数字码。
String regionName(String? code) {
  final key = code?.trim() ?? '';
  if (key.isEmpty) return '乡村产地';
  return kRegionNames[key] ?? '乡村产地';
}

// ── 角色 ──────────────────────────────────────────────
const Map<String, String> kRoleLabels = {
  'FARMER': '普通农户',
  'BIGFARMER': '种植大户',
  'VILLAGE': '村委干部',
  'EXPERT': '农技员',
  'MERCHANT': '收购商',
  'ADMIN': '管理员',
};
