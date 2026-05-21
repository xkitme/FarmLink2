import 'package:flutter/material.dart';

// ── API ──────────────────────────────────────────────
// 比赛现场改成后端笔记本的局域网 IP；Android 模拟器用 10.0.2.2
const String kBaseUrl = 'http://192.168.1.100:8000';
const String kApiPrefix = '/api/v1';

// ── 田园色板（清爽自然，适老高对比） ─────────────────
class AppColors {
  AppColors._();

  static const primary      = Color(0xFF3D8B40); // 田园绿
  static const primaryDark  = Color(0xFF2E6B30);
  static const primaryLight = Color(0xFFE3F1E4);
  static const harvest      = Color(0xFFE8A33D); // 丰收金
  static const sky          = Color(0xFF4A90D9); // 天蓝
  static const earth        = Color(0xFF8D6E63); // 土褐
  static const danger       = Color(0xFFD9534F);

  static const background   = Color(0xFFF4F6F1); // 浅米绿背景
  static const surface      = Color(0xFFFFFFFF);
  static const border       = Color(0xFFE3E6DF);

  static const textPrimary   = Color(0xFF2A2E27);
  static const textSecondary = Color(0xFF6B7066);
  static const textHint      = Color(0xFFA0A69A);

  static const primaryGradient = LinearGradient(
    colors: [Color(0xFF4CA050), Color(0xFF3D8B40)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

// ── 八大板块 ──────────────────────────────────────────
const List<Map<String, dynamic>> kSections = [
  {'key': 'agri',      'label': 'AI 农业生产', 'icon': Icons.eco,            'color': Color(0xFF3D8B40)},
  {'key': 'market',    'label': '流通销售',    'icon': Icons.storefront,     'color': Color(0xFFE8A33D)},
  {'key': 'machinery', 'label': '农机共享',    'icon': Icons.agriculture,    'color': Color(0xFF8D6E63)},
  {'key': 'disaster',  'label': '气象灾害',    'icon': Icons.warning_amber,  'color': Color(0xFFD9534F)},
  {'key': 'policy',    'label': '惠农政策',    'icon': Icons.account_balance, 'color': Color(0xFFC0392B)},
  {'key': 'life',      'label': '乡村生活',    'icon': Icons.home_work,      'color': Color(0xFF4A90D9)},
  {'key': 'data',      'label': '数据管理',    'icon': Icons.insights,       'color': Color(0xFF6A5ACD)},
  {'key': 'ai',        'label': 'AI 助手',     'icon': Icons.smart_toy,      'color': Color(0xFF2E8B8B)},
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
