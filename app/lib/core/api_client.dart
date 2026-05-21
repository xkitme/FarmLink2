import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'constants.dart';

/// 业务异常（携带后端业务码）
class ApiException implements Exception {
  final int code;
  final String message;
  ApiException(this.code, this.message);
  @override
  String toString() => message;
}

/// 统一 HTTP 客户端，对接后端 `{ code, msg, data }` 响应格式。
class ApiClient {
  static String baseUrl = kBaseUrl;
  static String? _token;

  static void setToken(String? t) => _token = t;
  static String? get token => _token;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  static Uri _uri(String path, [Map<String, dynamic>? query]) {
    final q = query?.map((k, v) => MapEntry(k, '$v'));
    return Uri.parse('$baseUrl$kApiPrefix$path').replace(queryParameters: q);
  }

  static Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final res = await http
        .get(_uri(path, query), headers: _headers)
        .timeout(const Duration(seconds: 15));
    return _parse(res);
  }

  static Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final res = await http
        .post(_uri(path), headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 30));
    return _parse(res);
  }

  static Future<dynamic> put(String path, {Map<String, dynamic>? body}) async {
    final res = await http
        .put(_uri(path), headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 15));
    return _parse(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await http
        .delete(_uri(path), headers: _headers)
        .timeout(const Duration(seconds: 15));
    return _parse(res);
  }

  /// 上传图片（multipart），用于 AI 识别类接口
  static Future<dynamic> upload(String path, Uint8List bytes, String filename,
      {String field = 'image', Map<String, String>? fields}) async {
    final req = http.MultipartRequest('POST', _uri(path))
      ..headers.addAll({if (_token != null) 'Authorization': 'Bearer $_token'})
      ..files.add(http.MultipartFile.fromBytes(field, bytes, filename: filename));
    if (fields != null) req.fields.addAll(fields);
    final streamed = await req.send().timeout(const Duration(seconds: 60));
    return _parse(await http.Response.fromStream(streamed));
  }

  /// SSE 流式（AI 对话）
  static Stream<String> stream(String path, Map<String, dynamic> body) async* {
    final req = http.Request('POST', _uri(path))
      ..headers.addAll(_headers)
      ..body = jsonEncode(body);
    final res = await req.send().timeout(const Duration(seconds: 12));
    if (res.statusCode != 200) throw ApiException(res.statusCode, '请求失败');
    await for (final chunk in res.stream.transform(utf8.decoder)) {
      for (final line in chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          final d = line.substring(6).trim();
          if (d == '[DONE]') return;
          yield d;
        }
      }
    }
  }

  /// 解析统一响应，成功返回 data，失败抛 ApiException
  static dynamic _parse(http.Response res) {
    Map<String, dynamic> body;
    try {
      body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(res.statusCode, '服务器响应异常');
    }
    final code = body['code'] as int? ?? res.statusCode;
    if (code != 200) {
      throw ApiException(code, body['msg'] as String? ?? '请求失败');
    }
    return body['data'];
  }
}
