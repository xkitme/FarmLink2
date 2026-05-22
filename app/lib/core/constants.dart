import 'package:flutter/material.dart';

// ── API ──────────────────────────────────────────────
// 本地 web 调试用 localhost；比赛真机改成后端笔记本局域网 IP
const String kBaseUrl = 'http://localhost:8000';
const String kApiPrefix = '/api/v1';

/// 设计系统：Agro-Modernist Tech（参考 docs/设计参考.md）
class AppColors {
  AppColors._();

  // 主色 · 叶绿
  static const primary = Color(0xFF0D631B);
  static const primaryContainer = Color(0xFF2E7D32);
  static const primaryDim = Color(0xFF88D982);
  static const onPrimaryContainer = Color(0xFFCBFFC2);

  // 次色 · 大地棕
  static const secondary = Color(0xFF7A5649);
  // 第三色 · 麦金
  static const tertiary = Color(0xFF734E00);
  static const gold = Color(0xFFFFBA38); // AI 卡边框 / 高亮
  static const goldContainer = Color(0xFF926500);

  // 预警
  static const error = Color(0xFFBA1A1A);
  static const errorContainer = Color(0xFFFFDAD6);
  static const warning = Color(0xFFB26000);

  // 表面层
  static const background = Color(0xFFF9F9F9);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceLow = Color(0xFFF3F3F3);
  static const surfaceContainer = Color(0xFFEEEEEE);
  static const surfaceHigh = Color(0xFFE8E8E8);

  // 文字 / 描边
  static const onSurface = Color(0xFF1A1C1C);
  static const onSurfaceVariant = Color(0xFF40493D);
  static const outline = Color(0xFF707A6C);
  static const outlineVariant = Color(0xFFBFCABA);

  // 渐变（用于 hero 区）
  static const heroGradient = LinearGradient(
    colors: [Color(0xFF2E7D32), Color(0xFF0D631B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// 环境光阴影（柔和棕调，禁用浓黑）
  static List<BoxShadow> get ambientShadow => const [
        BoxShadow(
            color: Color(0x0D795548), blurRadius: 20, offset: Offset(0, 4)),
      ];
  static List<BoxShadow> get ambientShadowUp => const [
        BoxShadow(
            color: Color(0x0D795548), blurRadius: 20, offset: Offset(0, -4)),
      ];
}

// 圆角
class R {
  R._();
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 32.0;
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
    'color': Color(0xFF7A5649)
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

// ── 角色 ──────────────────────────────────────────────
const Map<String, String> kRoleLabels = {
  'FARMER': '普通农户',
  'BIGFARMER': '种植大户',
  'VILLAGE': '村委干部',
  'EXPERT': '农技员',
  'MERCHANT': '收购商',
  'ADMIN': '管理员',
};
