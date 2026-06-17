import 'package:flutter/material.dart';

import '../core/constants.dart';

/// Lightweight Markdown renderer shared by AI chat and the voice assistant.
///
/// Supports headings, lists, dividers, code blocks, bold, italic and inline
/// code. It intentionally stays dependency-free because AI replies stream in
/// partial Markdown and this renderer is tolerant of unfinished markers.
class MarkdownText extends StatelessWidget {
  final String text;
  final TextStyle baseStyle;
  const MarkdownText(this.text, {super.key, required this.baseStyle});

  @override
  Widget build(BuildContext context) {
    final lines = text.replaceAll('\r\n', '\n').split('\n');
    final blocks = <Widget>[];
    final codeLines = <String>[];
    var inCodeBlock = false;
    for (final raw in lines) {
      final line = raw.trimRight();
      final t = line.trimLeft();
      if (t.startsWith('```')) {
        if (inCodeBlock) {
          blocks.add(_codeBlock(codeLines.join('\n')));
          codeLines.clear();
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeLines.add(line);
        continue;
      }
      if (RegExp(r'^([-*_=]\s*){3,}$').hasMatch(t)) {
        blocks.add(const Padding(
          padding: EdgeInsets.symmetric(vertical: 6),
          child:
              Divider(height: 1, thickness: 1, color: AppColors.outlineVariant),
        ));
        continue;
      }
      if (t.isEmpty) {
        blocks.add(const SizedBox(height: 6));
        continue;
      }
      final header = RegExp(r'^(#{1,6})\s+(.*)$').firstMatch(t);
      if (header != null) {
        blocks.add(Padding(
          padding: const EdgeInsets.only(top: 4, bottom: 2),
          child: _richText(
            header.group(2)!,
            baseStyle.copyWith(
              fontWeight: FontWeight.w800,
              fontSize: (baseStyle.fontSize ?? 14) + 1,
            ),
          ),
        ));
        continue;
      }
      final ordered = RegExp(r'^(\d{1,2})[.)]\s+(.*)$').firstMatch(t);
      if (ordered != null) {
        blocks.add(_listItem(
          marker: '${ordered.group(1)}.',
          text: ordered.group(2)!,
        ));
        continue;
      }
      final bullet = RegExp(r'^[-*•]\s+(.*)$').firstMatch(t);
      if (bullet != null) {
        blocks.add(_listItem(text: bullet.group(1)!));
        continue;
      }
      blocks.add(Padding(
        padding: const EdgeInsets.symmetric(vertical: 1.5),
        child: _richText(line, baseStyle),
      ));
    }
    if (inCodeBlock || codeLines.isNotEmpty) {
      blocks.add(_codeBlock(codeLines.join('\n')));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: blocks,
    );
  }

  Widget _richText(String text, TextStyle style) {
    return RichText(
      softWrap: true,
      overflow: TextOverflow.clip,
      text: _inline(text, style),
    );
  }

  Widget _listItem({String? marker, required String text}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: marker == null ? 13 : 24,
            child: marker == null
                ? Padding(
                    padding: const EdgeInsets.only(top: 7),
                    child: Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: baseStyle.color,
                        shape: BoxShape.circle,
                      ),
                    ),
                  )
                : Text(
                    marker,
                    style: baseStyle.copyWith(
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
          ),
          const SizedBox(width: 6),
          Expanded(child: _richText(text, baseStyle)),
        ],
      ),
    );
  }

  Widget _codeBlock(String code) {
    final content = code.trimRight().isEmpty ? ' ' : code.trimRight();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(R.sm),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Text(
          content,
          style: baseStyle.copyWith(
            fontFamily: 'monospace',
            fontSize: (baseStyle.fontSize ?? 14) - 1,
            height: 1.45,
          ),
        ),
      ),
    );
  }

  TextSpan _inline(String s, TextStyle style) {
    final spans = <TextSpan>[];
    final re = RegExp(r'\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`');
    var last = 0;
    for (final m in re.allMatches(s)) {
      if (m.start > last) {
        spans.add(TextSpan(text: s.substring(last, m.start), style: style));
      }
      if (m.group(1) != null) {
        spans.add(TextSpan(
            text: m.group(1),
            style: style.copyWith(
                fontWeight: FontWeight.w800, fontStyle: FontStyle.italic)));
      } else if (m.group(2) != null) {
        spans.add(TextSpan(
            text: m.group(2),
            style: style.copyWith(fontWeight: FontWeight.w800)));
      } else if (m.group(3) != null) {
        spans.add(TextSpan(
            text: m.group(3),
            style: style.copyWith(fontStyle: FontStyle.italic)));
      } else if (m.group(4) != null) {
        spans.add(TextSpan(
            text: m.group(4),
            style: style.copyWith(
                fontFamily: 'monospace',
                backgroundColor: AppColors.surfaceContainer)));
      }
      last = m.end;
    }
    if (last < s.length) {
      final tail = s.substring(last);
      final open = RegExp(r'(\*\*\*|\*\*|\*|`)(?=\S|$)').firstMatch(tail);
      if (open == null) {
        spans.add(TextSpan(text: tail, style: style));
      } else {
        final before = tail.substring(0, open.start);
        final after = tail.substring(open.end);
        if (before.isNotEmpty) {
          spans.add(TextSpan(text: before, style: style));
        }
        final marker = open.group(0)!;
        final styled = marker == '`'
            ? style.copyWith(
                fontFamily: 'monospace',
                backgroundColor: AppColors.surfaceContainer)
            : marker == '*'
                ? style.copyWith(fontStyle: FontStyle.italic)
                : style.copyWith(
                    fontWeight: FontWeight.w800,
                    fontStyle:
                        marker == '***' ? FontStyle.italic : FontStyle.normal);
        if (after.isNotEmpty) spans.add(TextSpan(text: after, style: styled));
      }
    }
    if (spans.isEmpty) spans.add(TextSpan(text: s, style: style));
    return TextSpan(children: spans);
  }
}
