import 'package:http/browser_client.dart';
import 'package:http/http.dart' as http;
import 'package:web/web.dart' as web;

http.Client createApiHttpClient() => BrowserClient()..withCredentials = true;

String? readCsrfToken() {
  final cookies = web.document.cookie.split(';');
  for (final raw in cookies) {
    final cookie = raw.trim();
    final separator = cookie.indexOf('=');
    if (separator <= 0) continue;
    final name = cookie.substring(0, separator);
    if (name != 'csrf_token') continue;
    return Uri.decodeComponent(cookie.substring(separator + 1));
  }
  return null;
}
