import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/ink_card.dart';

class CalligraphyPage extends StatefulWidget {
  const CalligraphyPage({super.key});

  @override
  State<CalligraphyPage> createState() => _CalligraphyPageState();
}

class _CalligraphyPageState extends State<CalligraphyPage> {
  String? _imagePath;
  String? _imageLocalPath;
  bool _uploading = false;
  Map<String, dynamic>? _review;
  String? _error;

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 85);
    if (file == null) return;
    setState(() {
      _imageLocalPath = file.path;
      _review = null;
      _error = null;
    });
  }

  Future<void> _upload() async {
    if (_imageLocalPath == null) return;
    setState(() { _uploading = true; _error = null; });
    try {
      final res = await ApiClient.postMultipart(
        '/api/ai/calligraphy/review',
        'image',
        _imageLocalPath!,
      );
      if (!mounted) return;
      setState(() {
        _review = res['data'] as Map<String, dynamic>?;
        _uploading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _uploading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: InkColors.background,
      appBar: AppBar(
        title: const Text('书法点评'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 说明
            InkCard(
              padding: const EdgeInsets.all(16),
              gradient: const LinearGradient(
                colors: [Color(0xFF0D1208), Color(0xFF141A0E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              child: Row(
                children: [
                  const Text('🖌', style: TextStyle(fontSize: 32)),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI 书法点评', style: TextStyle(
                          color: InkColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        )),
                        SizedBox(height: 4),
                        Text('上传书法作品，AI 从笔法、结构、墨色等维度进行专业点评', style: TextStyle(
                          color: InkColors.textSecondary,
                          fontSize: 12,
                          height: 1.5,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 上传区
            GestureDetector(
              onTap: () => _showPicker(context),
              child: InkCard(
                padding: EdgeInsets.zero,
                child: _imageLocalPath != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          File(_imageLocalPath!),
                          height: 260,
                          width: double.infinity,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => _buildPlaceholder(),
                        ),
                      )
                    : _buildPlaceholder(),
              ),
            ),

            const SizedBox(height: 16),

            // 操作按钮
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showPicker(context),
                    icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                    label: Text(_imageLocalPath != null ? '重新上传' : '选择图片'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: InkColors.gold,
                      side: const BorderSide(color: InkColors.gold),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                if (_imageLocalPath != null) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _uploading ? null : _upload,
                      icon: _uploading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(InkColors.background),
                              ),
                            )
                          : const Icon(Icons.auto_awesome, size: 18),
                      label: Text(_uploading ? '点评中...' : 'AI 点评'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),

            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: InkColors.cinnabar, fontSize: 13),
                  textAlign: TextAlign.center),
            ],

            // 点评结果
            if (_review != null) ...[
              const SizedBox(height: 24),
              _buildReview(_review!),
            ],
          ],
        ),
      ),
    );
  }

  void _showPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: InkColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: InkColors.gold),
                title: const Text('拍摄书法', style: TextStyle(color: InkColors.textPrimary)),
                onTap: () { Navigator.pop(context); _pickImage(ImageSource.camera); },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: InkColors.gold),
                title: const Text('从相册选取', style: TextStyle(color: InkColors.textPrimary)),
                onTap: () { Navigator.pop(context); _pickImage(ImageSource.gallery); },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() => SizedBox(
    height: 200,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: const [
        Icon(Icons.add_photo_alternate_outlined, color: InkColors.textDisabled, size: 48),
        SizedBox(height: 12),
        Text('点击上传书法作品', style: TextStyle(color: InkColors.textSecondary, fontSize: 13)),
        SizedBox(height: 4),
        Text('支持拍照或从相册选取', style: TextStyle(color: InkColors.textDisabled, fontSize: 11)),
      ],
    ),
  );

  Widget _buildReview(Map<String, dynamic> review) {
    final scores = review['scores'] as Map<String, dynamic>? ?? {};
    final comments = review['comments'] as List? ?? [];
    final overall = review['overall'] as String? ?? '';
    final suggestion = review['suggestion'] as String? ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionTitle('AI 点评报告'),
        // 评分雷达
        if (scores.isNotEmpty) ...[
          InkCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: scores.entries.map((e) {
                final score = (e.value as num).toDouble();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 60,
                        child: Text(e.key, style: const TextStyle(
                          color: InkColors.textSecondary,
                          fontSize: 12,
                        )),
                      ),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(2),
                          child: LinearProgressIndicator(
                            value: score / 10,
                            backgroundColor: InkColors.border,
                            valueColor: AlwaysStoppedAnimation(
                              score >= 8 ? InkColors.jade
                                : score >= 6 ? InkColors.gold
                                : InkColors.cinnabar,
                            ),
                            minHeight: 6,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('${score.toStringAsFixed(1)}', style: const TextStyle(
                        color: InkColors.gold,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      )),
                    ],
                  ),
                );
              }).toList(),
            ),
          )
          .animate().fade(duration: 400.ms),
          const SizedBox(height: 12),
        ],
        // 总评
        if (overall.isNotEmpty)
          InkCard(
            padding: const EdgeInsets.all(16),
            gradient: const LinearGradient(
              colors: [Color(0xFF0D1208), Color(0xFF141A0E)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.star_outline, color: InkColors.jade, size: 16),
                    SizedBox(width: 6),
                    Text('总体评价', style: TextStyle(
                      color: InkColors.jade,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    )),
                  ],
                ),
                const SizedBox(height: 10),
                Text(overall, style: const TextStyle(
                  color: InkColors.textPrimary,
                  fontSize: 14,
                  height: 1.7,
                )),
                if (suggestion.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Divider(color: InkColors.border),
                  const SizedBox(height: 8),
                  const Text('改进建议', style: TextStyle(
                    color: InkColors.gold,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  )),
                  const SizedBox(height: 6),
                  Text(suggestion, style: const TextStyle(
                    color: InkColors.textSecondary,
                    fontSize: 13,
                    height: 1.6,
                  )),
                ],
              ],
            ),
          )
          .animate(delay: 200.ms).fade(duration: 400.ms),
      ],
    );
  }
}
