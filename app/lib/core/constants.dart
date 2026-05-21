import 'package:flutter/material.dart';

// ── API ──────────────────────────────────────────────
// 比赛现场改成笔记本的局域网 IP，或用 USB 调试时保持 10.0.2.2
const String kBaseUrl = 'http://192.168.1.100:8000';

// ── 墨色调色板 ────────────────────────────────────────
class InkColors {
  InkColors._();

  // 背景层
  static const background  = Color(0xFF0A0B0E);
  static const surface     = Color(0xFF13141A);
  static const surfaceHigh = Color(0xFF1D1E27);
  static const border      = Color(0xFF2A2720);

  // 金色主调
  static const gold        = Color(0xFFC9A028);
  static const goldLight   = Color(0xFFE8C547);
  static const goldDim     = Color(0xFF7A5E14);

  // 辅助色
  static const cinnabar    = Color(0xFFB83025);   // 朱砂红
  static const jade        = Color(0xFF2E7D6E);   // 翠绿
  static const indigo      = Color(0xFF3D4F8A);   // 靛蓝

  // 文字
  static const textPrimary   = Color(0xFFF0EBE0);  // 宣纸白
  static const textSecondary = Color(0xFF9E8F7A);  // 旧墨灰
  static const textDisabled  = Color(0xFF4A443C);

  // 渐变
  static const goldGradient = LinearGradient(
    colors: [Color(0xFFC9A028), Color(0xFFE8C547)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const inkGradient = LinearGradient(
    colors: [Color(0xFF0A0B0E), Color(0xFF1D1E27)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}

// ── 内容类别 ──────────────────────────────────────────
const Map<String, Map<String, dynamic>> kCategories = {
  'poetry':      {'label': '诗词', 'icon': '📜', 'color': Color(0xFFC9A028)},
  'calligraphy': {'label': '书法', 'icon': '🖌', 'color': Color(0xFF2E7D6E)},
  'classics':    {'label': '国学', 'icon': '📚', 'color': Color(0xFF3D4F8A)},
  'history':     {'label': '历史', 'icon': '🏛', 'color': Color(0xFFB83025)},
  'festival':    {'label': '节气', 'icon': '🌿', 'color': Color(0xFF2E7D6E)},
};

// ── AI 角色 ───────────────────────────────────────────
const List<Map<String, String>> kCharacters = [
  {
    'key':   'confucius',
    'name':  '孔夫子',
    'title': '至圣先师',
    'desc':  '仁义礼智信，以德化天下',
    'emoji': '🎓',
  },
  {
    'key':   'libai',
    'name':  '李太白',
    'title': '诗仙',
    'desc':  '举杯邀明月，豪情万丈',
    'emoji': '🍶',
  },
  {
    'key':   'sushi',
    'name':  '苏东坡',
    'title': '东坡居士',
    'desc':  '一蓑烟雨任平生，旷达随缘',
    'emoji': '🌊',
  },
];
