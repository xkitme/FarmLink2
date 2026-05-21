import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'constants.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

class ApiClient {
  static String baseUrl = kBaseUrl;
  static String? _token;

  static void setToken(String? token) => _token = token;

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  static Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 15));
    return _parse(res);
  }

  static Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.post(uri, headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 30));
    return _parse(res);
  }

  static Future<Map<String, dynamic>> put(String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.put(uri, headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 15));
    return _parse(res);
  }

  // SSE streaming for AI chat
  static Stream<String> stream(String path, Map<String, dynamic> body) async* {
    final uri = Uri.parse('$baseUrl$path');
    final req = http.Request('POST', uri)
      ..headers.addAll(_headers)
      ..body = jsonEncode(body);

    final res = await req.send().timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) throw ApiException(res.statusCode, '请求失败');

    await for (final chunk in res.stream.transform(utf8.decoder)) {
      for (final line in chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6).trim();
          if (data == '[DONE]') return;
          yield data;
        }
      }
    }
  }

  // Multipart for calligraphy upload (cross-platform: accepts bytes)
  static Future<Map<String, dynamic>> postMultipartBytes(
      String path, String fileField, Uint8List bytes, String filename) async {
    final uri = Uri.parse('$baseUrl$path');
    final req = http.MultipartRequest('POST', uri)
      ..headers.addAll({if (_token != null) 'Authorization': 'Bearer $_token'})
      ..files.add(http.MultipartFile.fromBytes(fileField, bytes, filename: filename));
    final streamed = await req.send().timeout(const Duration(seconds: 60));
    final res = await http.Response.fromStream(streamed);
    return _parse(res);
  }

  static Map<String, dynamic> _parse(http.Response res) {
    final body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, body['message'] as String? ?? '请求失败');
    }
    return body;
  }
}
