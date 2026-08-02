import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'constants.dart';

typedef _ResponseFactory = Future<http.Response> Function(
    Map<String, String> headers);
typedef _StreamedResponseFactory = Future<http.StreamedResponse> Function(
    Map<String, String> headers);

/// 业务异常（携带服务端业务码）
class ApiException implements Exception {
  final int code;
  final String message;
  ApiException(this.code, this.message);
  @override
  String toString() => message;
}

class SseEvent {
  final String type;
  final dynamic data;

  const SseEvent({required this.type, this.data});
}

/// 统一 HTTP 客户端，对接服务端 `{ code, msg, data }` 响应格式。
class ApiClient {
  static String baseUrl = kBaseUrl;
  static String? _token;
  static Future<bool> Function()? _refreshHandler;
  static Future<void> Function()? _sessionExpiredHandler;
  static Future<bool>? _refreshInFlight;
  static Future<void>? _expiryInFlight;
  static bool _automaticRefreshEnabled = true;

  static void configureAuth({
    required Future<bool> Function() refreshHandler,
    required Future<void> Function() sessionExpiredHandler,
  }) {
    _refreshHandler = refreshHandler;
    _sessionExpiredHandler = sessionExpiredHandler;
    _automaticRefreshEnabled = true;
  }

  static void setToken(String? t) => _token = t;
  static String? get token => _token;

  static void setAutomaticRefreshEnabled(bool enabled) {
    _automaticRefreshEnabled = enabled;
  }

  static Future<void> waitForPendingRefresh() async {
    await _refreshInFlight;
  }

  static Map<String, String> _headersFor(String? token) => {
        'Content-Type': 'application/json; charset=utf-8',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static Uri _uri(String path, [Map<String, dynamic>? query]) {
    final q = query?.map((k, v) => MapEntry(k, '$v'));
    return Uri.parse('$baseUrl$kApiPrefix$path').replace(queryParameters: q);
  }

  static String resolveImageUrl(String value) {
    final source = value.trim();
    if (source.isEmpty) return source;
    final uri = Uri.tryParse(source);
    if (uri?.hasScheme == true) return source;
    return Uri.parse(baseUrl).resolve(source).toString();
  }

  static Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final res = await _sendAuthenticated(
      (headers) => http
          .get(_uri(path, query), headers: headers)
          .timeout(const Duration(seconds: 15)),
    );
    return _parse(res);
  }

  static Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final encoded = jsonEncode(body ?? {});
    final res = await _sendAuthenticated(
      (headers) => http
          .post(_uri(path), headers: headers, body: encoded)
          .timeout(const Duration(seconds: 30)),
    );
    return _parse(res);
  }

  /// refresh rotation 使用不携带 access 的原始请求，避免 401 处理递归。
  static Future<Map<String, dynamic>> refreshSession(
      String refreshToken) async {
    final res = await http
        .post(
          _uri('/auth/refresh'),
          headers: _headersFor(null),
          body: jsonEncode(<String, dynamic>{'refreshToken': refreshToken}),
        )
        .timeout(const Duration(seconds: 30));
    final data = _parse(res);
    if (data is! Map<String, dynamic>) {
      throw ApiException(res.statusCode, '刷新会话响应异常');
    }
    return data;
  }

  /// POST 并返回原始二进制响应（如 TTS 的 audio/wav）。
  /// 成功（HTTP 200 且 Content-Type 为音频）返回字节；否则按统一 JSON 错误体抛 ApiException。
  static Future<Uint8List> postBytes(String path,
      {Map<String, dynamic>? body,
      Duration timeout = const Duration(seconds: 30)}) async {
    final encoded = jsonEncode(body ?? {});
    final res = await _sendAuthenticated(
      (headers) => http
          .post(_uri(path), headers: headers, body: encoded)
          .timeout(timeout),
    );
    final ct = res.headers['content-type'] ?? '';
    if (res.statusCode == 200 && ct.startsWith('audio/')) {
      return res.bodyBytes;
    }
    // 错误：尝试解析统一 { code, msg } 响应
    try {
      final m = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      final code = m['code'] as int? ?? res.statusCode;
      throw ApiException(code, m['msg'] as String? ?? '请求失败');
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(res.statusCode, '请求失败');
    }
  }

  static Future<dynamic> put(String path, {Map<String, dynamic>? body}) async {
    final encoded = jsonEncode(body ?? {});
    final res = await _sendAuthenticated(
      (headers) => http
          .put(_uri(path), headers: headers, body: encoded)
          .timeout(const Duration(seconds: 15)),
    );
    return _parse(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await _sendAuthenticated(
      (headers) => http
          .delete(_uri(path), headers: headers)
          .timeout(const Duration(seconds: 15)),
    );
    return _parse(res);
  }

  /// 上传图片（multipart），用于 AI 识别类接口
  static Future<dynamic> upload(String path, Uint8List bytes, String filename,
      {String field = 'image', Map<String, String>? fields}) async {
    final res = await _sendAuthenticated((headers) async {
      final req = http.MultipartRequest('POST', _uri(path))
        ..headers.addAll(<String, String>{
          if (headers['Authorization'] != null)
            'Authorization': headers['Authorization']!,
        })
        ..files.add(
          http.MultipartFile.fromBytes(field, bytes, filename: filename),
        );
      if (fields != null) req.fields.addAll(fields);
      final streamed = await req.send().timeout(const Duration(seconds: 240));
      return http.Response.fromStream(streamed);
    });
    return _parse(res);
  }

  static Stream<SseEvent> streamEvents(
      String path, Map<String, dynamic> body) async* {
    final encoded = jsonEncode(body);
    final res = await _sendStreamAuthenticated((headers) {
      final req = http.Request('POST', _uri(path))
        ..headers.addAll(headers)
        ..body = encoded;
      return req.send().timeout(const Duration(seconds: 12));
    });
    if (res.statusCode != 200) throw ApiException(res.statusCode, '请求失败');

    var buffer = '';
    var eventName = 'message';
    final dataLines = <String>[];

    SseEvent? flushEvent() {
      if (dataLines.isEmpty) {
        eventName = 'message';
        return null;
      }
      final raw = dataLines.join('\n');
      dataLines.clear();
      final type = eventName;
      eventName = 'message';
      if (raw == '[DONE]') return const SseEvent(type: 'done', data: '[DONE]');
      dynamic parsed;
      try {
        parsed = jsonDecode(raw);
      } catch (_) {
        parsed = raw;
      }
      return SseEvent(type: type, data: parsed);
    }

    SseEvent? handleLine(String rawLine) {
      var line = rawLine;
      if (line.endsWith('\r')) {
        line = line.substring(0, line.length - 1);
      }
      if (line.isEmpty) return flushEvent();
      if (line.startsWith(':')) return null;

      final separator = line.indexOf(':');
      final field = separator >= 0 ? line.substring(0, separator) : line;
      var value = separator >= 0 ? line.substring(separator + 1) : '';
      if (value.startsWith(' ')) value = value.substring(1);

      if (field == 'event') {
        eventName = value.trim().isEmpty ? 'message' : value.trim();
      } else if (field == 'data') {
        dataLines.add(value);
      }
      return null;
    }

    await for (final chunk in res.stream.transform(utf8.decoder)) {
      buffer += chunk;
      while (true) {
        final idx = buffer.indexOf('\n');
        if (idx < 0) break;
        final event = handleLine(buffer.substring(0, idx));
        buffer = buffer.substring(idx + 1);
        if (event == null) continue;
        if (event.data == '[DONE]') return;
        yield event;
      }
    }

    if (buffer.isNotEmpty) {
      final event = handleLine(buffer);
      if (event != null) {
        if (event.data == '[DONE]') return;
        yield event;
      }
    }
    final tailEvent = flushEvent();
    if (tailEvent != null && tailEvent.data != '[DONE]') yield tailEvent;
  }

  /// SSE 流式（AI 对话），保留旧调用方的 delta 字符串接口。
  static Stream<String> stream(String path, Map<String, dynamic> body) async* {
    await for (final event in streamEvents(path, body)) {
      if (event.type == 'done') return;
      if (event.type != 'message') continue;
      final data = event.data;
      if (data is Map && data['delta'] is String) {
        yield data['delta'] as String;
      } else if (data is String) {
        yield data;
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

  static Future<http.Response> _sendAuthenticated(
    _ResponseFactory send,
  ) async {
    final failedToken = _token;
    var response = await send(_headersFor(failedToken));
    if (response.statusCode != 401 || failedToken == null) return response;
    if (!_automaticRefreshEnabled) return response;

    if (await _refreshAfter(failedToken)) {
      response = await send(_headersFor(_token));
      if (response.statusCode == 401) await _expireSession();
    } else {
      await _expireSession();
    }
    return response;
  }

  static Future<http.StreamedResponse> _sendStreamAuthenticated(
    _StreamedResponseFactory send,
  ) async {
    final failedToken = _token;
    var response = await send(_headersFor(failedToken));
    if (response.statusCode != 401 || failedToken == null) return response;
    if (!_automaticRefreshEnabled) return response;

    await response.stream.drain<void>();
    if (await _refreshAfter(failedToken)) {
      response = await send(_headersFor(_token));
      if (response.statusCode == 401) await _expireSession();
    } else {
      await _expireSession();
    }
    return response;
  }

  static Future<bool> _refreshAfter(String failedToken) async {
    // 较晚返回的旧 401 看到 token 已换代时只需重放，不能再次 rotation。
    if (_token != failedToken) return _token != null;
    final active = _refreshInFlight;
    if (active != null) return active;
    final handler = _refreshHandler;
    if (handler == null) return false;

    final future = Future<bool>.sync(handler);
    _refreshInFlight = future;
    try {
      return await future;
    } catch (_) {
      return false;
    } finally {
      if (identical(_refreshInFlight, future)) _refreshInFlight = null;
    }
  }

  static Future<void> _expireSession() async {
    final active = _expiryInFlight;
    if (active != null) return active;
    final handler = _sessionExpiredHandler;
    if (handler == null) return;
    final future = Future<void>.sync(handler);
    _expiryInFlight = future;
    try {
      await future;
    } finally {
      if (identical(_expiryInFlight, future)) _expiryInFlight = null;
    }
  }
}
