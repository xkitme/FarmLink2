import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineCache {
  OfflineCache._();

  static Future<List<Map<String, dynamic>>> readList(String key) async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString('cache:$key');
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((item) => item.cast<String, dynamic>())
            .toList();
      }
    } catch (_) {
      return [];
    }
    return [];
  }

  static Future<void> saveList(
      String key, List<Map<String, dynamic>> records) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString('cache:$key', jsonEncode(records));
    await sp.setString(
        'cache:$key:updatedAt', DateTime.now().toIso8601String());
  }

  static Future<String?> updatedAt(String key) async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString('cache:$key:updatedAt');
  }
}
