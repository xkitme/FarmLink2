import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

/// 智能植保拍照闭环：识病、查看用药建议、建档、排程复查。
class PhotoFlowPage extends StatefulWidget {
  const PhotoFlowPage({super.key});

  @override
  State<PhotoFlowPage> createState() => _PhotoFlowPageState();
}

class _PhotoFlowPageState extends State<PhotoFlowPage> {
  final _picker = ImagePicker();

  Uint8List? _image;
  String? _imageName;
  bool _detecting = false;
  bool _archiving = false;
  Map<String, dynamic>? _result;

  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? value.cast<String, dynamic>() : <String, dynamic>{};

  Future<void> _pick(ImageSource source) async {
    try {
      final image = await _picker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 1600,
      );
      if (image == null) return;
      final bytes = await image.readAsBytes();
      if (!mounted) return;
      setState(() {
        _image = bytes;
        _imageName = image.name;
        _result = null;
        _detecting = true;
      });
      await _detect();
    } catch (error) {
      if (!mounted) return;
      setState(() => _detecting = false);
      toast(context, actionErrorMessage('选择图片', error), error: true);
    }
  }

  Future<void> _detect() async {
    final image = _image;
    if (image == null) return;
    try {
      // 走真视觉链路 /ai/image/detect（minicpm-v + JSON 强制 + 中文 few-shot），
      // 不再用 /agri/disease/detect 的随机抽兜底——香蕉→番茄病害那种胡说已修复。
      // 后端 imageAnalyze 把识别结果包在 data.result 里，知识库命中时附带 knownDisease。
      final data = _map(await ApiClient.upload(
        '/ai/image/detect',
        image,
        _imageName ?? 'leaf.jpg',
      ));
      final nested = _map(data['result']);
      final flat = nested.isNotEmpty ? Map<String, dynamic>.from(nested) : data;
      // 把 knownDisease 透传成旧版的 disease 键，本页 _reportCard / _archive 既有
      // 字段读法无需大改。adviceText 也兼容映射到 advice。
      if (flat['disease'] == null && flat['knownDisease'] != null) {
        flat['disease'] = flat['knownDisease'];
      }
      if (flat['advice'] == null && flat['adviceText'] != null) {
        flat['advice'] = flat['adviceText'];
      }
      if (!mounted) return;
      setState(() {
        _result = flat;
        _detecting = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _detecting = false);
      toast(context, actionErrorMessage('识别', error), error: true);
    }
  }

  bool get _recognized {
    final r = _result;
    if (r == null) return false;
    final flag = r['recognized'];
    if (flag is bool) return flag;
    final label = '${r['resultLabel'] ?? ''}';
    final conf = (r['confidence'] as num?)?.toDouble() ?? 0;
    return label.isNotEmpty && label != '无法识别' && conf > 0;
  }

  Future<void> _archive() async {
    final result = _result;
    if (result == null || _archiving) return;
    final disease = _map(result['disease']);
    final label =
        '${result['resultLabel'] ?? disease['diseaseName'] ?? '疑似病害'}';
    // 用药描述优先取 KB 的 medicineAdvice（结构化、含登记药名），其次取视觉模型
    // 给出的 adviceText（识别成功但 KB 未收录的病害走这里），最后兜底通用文案。
    final knownMedicine = '${disease['medicineAdvice'] ?? ''}'.trim();
    final aiAdvice = '${result['adviceText'] ?? result['advice'] ?? ''}'.trim();
    final medicine = knownMedicine.isNotEmpty
        ? knownMedicine
        : aiAdvice.isNotEmpty
            ? aiAdvice
            : '请按农药标签推荐剂量施用';
    final cropType = '${disease['cropType'] ?? ''}';
    final confirmed = await _confirmArchive(label, medicine);
    if (confirmed != true || !mounted) return;

    setState(() => _archiving = true);
    final today = DateTime.now();
    final recheckDate = today.add(const Duration(days: 7));
    try {
      await ApiClient.post('/agri/record', body: {
        'recordType': '打药',
        'cropType': cropType,
        'content': '$label 防治：$medicine',
        'recordDate': today.toIso8601String(),
      });
      await ApiClient.post('/agri/record', body: {
        'recordType': '复查',
        'cropType': cropType,
        'content': '$label 防治效果复查（用药后第 7 天）',
        'recordDate': recheckDate.toIso8601String(),
      });
      if (!mounted) return;
      toast(context, '已加入农事日历，7 天后将提醒复查');
      context.go('/agri');
    } catch (error) {
      if (mounted) {
        toast(context, actionErrorMessage('建档', error), error: true);
      }
    } finally {
      if (mounted) setState(() => _archiving = false);
    }
  }

  Future<bool?> _confirmArchive(String label, String medicine) {
    return showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '建档预览',
                style: TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 16),
              _previewRow(
                Icons.medication_outlined,
                '今日用药',
                '$label 防治：$medicine',
              ),
              const SizedBox(height: 12),
              _previewRow(
                Icons.event_repeat_outlined,
                '7 天后',
                '$label 防治效果复查',
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(sheetContext, true),
                  child: const Text('确认建档'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _previewRow(IconData icon, String tag, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(R.sm),
          ),
          child: Icon(icon, size: 20, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tag,
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                text,
                style: const TextStyle(
                  color: AppColors.onSurface,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: AppColors.onSurfaceVariant,
          ),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/agri'),
        ),
        title: const Text(
          '智能植保',
          style: TextStyle(
            color: AppColors.primary,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          _heroCard(),
          const SizedBox(height: 16),
          _uploadArea(),
          if (_detecting) ...[
            const SizedBox(height: 24),
            const Loading(text: 'AI 正在识别叶片...'),
          ],
          if (_result != null && !_detecting) ...[
            const SizedBox(height: 16),
            _reportCard(),
            const SizedBox(height: 16),
            // 「无法识别」不弹建档——避免把胡判的病害写入农事日历。
            if (_recognized) ...[
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _archiving ? null : _archive,
                  icon: _archiving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(Icons.fact_check_outlined),
                  label: Text(_archiving ? '建档中' : '一键建档并提醒复查'),
                ),
              ),
              const SizedBox(height: 10),
            ],
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: _archiving ? null : () => _pick(ImageSource.camera),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('重新拍照'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _heroCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(R.lg),
        boxShadow: AppColors.ambientShadow,
      ),
      child: const Row(
        children: [
          Icon(Icons.biotech_outlined, color: Colors.white, size: 38),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI 智能植保 · 一拍即诊',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  '拍照识别病虫害，生成防治方案并排程复查',
                  style: TextStyle(
                    color: AppColors.onPrimaryContainer,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _uploadArea() {
    return InkWell(
      borderRadius: BorderRadius.circular(R.md),
      onTap: _detecting || _archiving ? null : _chooseSource,
      child: Container(
        height: _image == null ? 168 : 220,
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(R.md),
          border: Border.all(color: AppColors.outlineVariant, width: 1.5),
        ),
        child: _image == null
            ? const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.add_a_photo_outlined,
                    size: 38,
                    color: AppColors.primary,
                  ),
                  SizedBox(height: 10),
                  Text(
                    '拍照或上传叶片照片',
                    style: TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    '支持相机拍摄和相册选图',
                    style: TextStyle(
                      color: AppColors.outline,
                      fontSize: 12,
                    ),
                  ),
                ],
              )
            : ClipRRect(
                borderRadius: BorderRadius.circular(R.md),
                child: Image.memory(
                  _image!,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
      ),
    );
  }

  void _chooseSource() {
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(
                Icons.photo_camera_outlined,
                color: AppColors.primary,
              ),
              title: const Text('拍照识别'),
              onTap: () {
                Navigator.pop(sheetContext);
                _pick(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.photo_library_outlined,
                color: AppColors.secondary,
              ),
              title: const Text('从相册选择'),
              onTap: () {
                Navigator.pop(sheetContext);
                _pick(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _reportCard() {
    final result = _result!;

    // 「无法识别」分支：去 VERIFIED 徽章/置信度/建档，避免把胡判结果展示成权威诊断。
    if (!_recognized) {
      final advice = '${result['adviceText'] ?? result['advice'] ?? '未能识别出明确的病害特征，建议重新拍摄叶片正反面或茎秆果实清晰照片。'}';
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(R.md),
          border: Border.all(color: AppColors.outlineVariant, width: 1),
          boxShadow: AppColors.ambientShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.help_outline,
                    color: AppColors.onSurfaceVariant, size: 19),
                SizedBox(width: 6),
                Text('智能识别 · 未能识别',
                    style: TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    )),
              ],
            ),
            const SizedBox(height: 10),
            Text(advice,
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 13,
                  height: 1.5,
                )),
          ],
        ),
      );
    }

    final disease = _map(result['disease']);
    final label =
        '${result['resultLabel'] ?? disease['diseaseName'] ?? '疑似病害'}';
    final confidence = ((result['confidence'] as num?)?.toDouble() ?? 0) * 100;
    final prevention =
        '${disease['prevention'] ?? result['advice'] ?? '请结合田间情况及时处置'}';
    final medicine = '${disease['medicineAdvice'] ?? '请按农药标签推荐剂量施用'}';
    final symptoms = '${disease['symptoms'] ?? ''}';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.primary, width: 1.5),
        boxShadow: AppColors.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.verified, color: AppColors.primary, size: 19),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  '智能植保诊断报告',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              StatusChip('VERIFIED'),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(R.sm),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text(
                  '${confidence.toStringAsFixed(1)}%',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          if (symptoms.isNotEmpty) ...[
            const SizedBox(height: 12),
            _reportLine('病害特征', symptoms),
          ],
          const SizedBox(height: 12),
          _reportLine('防治建议', prevention),
          const SizedBox(height: 8),
          _reportLine('农药剂量建议', medicine),
        ],
      ),
    );
  }

  Widget _reportLine(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: AppColors.onSurfaceVariant,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          content,
          style: const TextStyle(
            color: AppColors.onSurface,
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
