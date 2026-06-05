import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/offline_cache.dart';
import '../../core/offline_sync_queue.dart';
import '../common/info_detail_page.dart';
import '../../widgets/common.dart';

/// 流通销售服务 —— 行情/价格预测/期货/出口合规/收购站/团购/
/// 质量分级/直播话术/包装文案/溯源/物流（11 项均接服务端）
class MarketServicePage extends StatefulWidget {
  const MarketServicePage({super.key});

  @override
  State<MarketServicePage> createState() => _MarketServicePageState();
}

class _MarketServicePageState extends State<MarketServicePage> {
  final _picker = ImagePicker();
  bool _loading = true;
  bool _fromCache = false;
  String? _error;

  List<Map<String, dynamic>> _prices = [];
  List<Map<String, dynamic>> _buyers = [];
  List<Map<String, dynamic>> _groupbuys = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Map<String, dynamic> _m(dynamic v) =>
      v is Map ? v.cast<String, dynamic>() : <String, dynamic>{};
  List<Map<String, dynamic>> _list(dynamic v) => (v is List ? v : const [])
      .whereType<Map>()
      .map((e) => e.cast<String, dynamic>())
      .toList();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await Future.wait<dynamic>([
        ApiClient.get('/market/price'),
        ApiClient.get('/market/buyer/list'),
        ApiClient.get('/market/groupbuy/list'),
      ]);
      if (!mounted) return;
      _prices = _list(r[0]);
      _buyers = _list(r[1]);
      _groupbuys = _list(r[2]);
      await OfflineCache.saveList('market:price', _prices);
      await OfflineCache.saveList('market:buyer', _buyers);
      setState(() {
        _fromCache = false;
        _loading = false;
      });
    } catch (e) {
      _prices = await OfflineCache.readList('market:price');
      _buyers = await OfflineCache.readList('market:buyer');
      if (!mounted) return;
      setState(() {
        _fromCache = _prices.isNotEmpty || _buyers.isNotEmpty;
        _error = _fromCache ? null : '服务暂时不可用，请稍后重试';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurfaceVariant),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/market'),
        ),
        title: const Text('流通服务',
            style: TextStyle(
                color: AppColors.primary,
                fontSize: 20,
                fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: _loading
          ? const Loading(text: '正在加载行情数据...')
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                    children: [
                      if (_fromCache)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: AlertBanner('数据更新中，下拉刷新可重试', critical: false),
                        ),
                      const SectionTitle('实时行情'),
                      _priceList(),
                      const SectionTitle('行情工具'),
                      _toolRow([
                        (Icons.show_chart, '价格预测', _predictSheet),
                        (Icons.candlestick_chart, '期货行情', _futuresSheet),
                        (Icons.public, '出口合规', _exportSheet),
                      ]),
                      const SectionTitle('收购站'),
                      _buyerList(),
                      SectionTitle('农资团购',
                          trailing: TextButton.icon(
                            onPressed: _createGroupbuy,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('发起'),
                          )),
                      _groupbuyList(),
                      const SectionTitle('AI 营销工具'),
                      _toolRow([
                        (Icons.grade, '质量分级', _gradeDetect),
                        (Icons.mic, '直播话术', _liveSheet),
                        (Icons.inventory_2, '包装文案', _packageSheet),
                      ]),
                      const SectionTitle('溯源与物流'),
                      _toolRow([
                        (Icons.qr_code_2, '溯源查询', _traceSheet),
                        (Icons.local_shipping, '物流查询', _logisticsSheet),
                      ]),
                    ],
                  ),
                ),
    );
  }

  // ── 实时行情 ──────────────────────────────
  Widget _priceList() {
    if (_prices.isEmpty) return const AppCard(child: Text('暂无行情数据'));
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          for (var i = 0; i < _prices.length && i < 8; i++) ...[
            if (i > 0) const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${_prices[i]['productName'] ?? '农产品'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text('${_prices[i]['marketName'] ?? '周边市场'}',
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  Text(
                      '¥${_prices[i]['price'] ?? 0}/${_prices[i]['unit'] ?? '斤'}',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.error)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── 收购站 ────────────────────────────────
  Widget _buyerList() {
    if (_buyers.isEmpty) return const AppCard(child: Text('暂无收购站信息'));
    return Column(
      children: [
        for (final b in _buyers)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.goldContainer.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(R.md),
                    ),
                    child:
                        const Icon(Icons.store, color: AppColors.goldContainer),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${b['name'] ?? '收购站'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        Text('${b['address'] ?? b['regionCode'] ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  if (_buyerPhone(b).isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.call, color: AppColors.primary),
                      onPressed: () => toast(context, '联系电话：${_buyerPhone(b)}'),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  String _buyerPhone(Map<String, dynamic> buyer) =>
      '${buyer['phone'] ?? buyer['contactPhone'] ?? ''}';

  // ── 农资团购 ──────────────────────────────
  Widget _groupbuyList() {
    if (_groupbuys.isEmpty) {
      return const AppCard(child: Text('暂无团购，点击「发起」组织一次集采'));
    }
    return Column(
      children: [
        for (final g in _groupbuys)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              onTap: () => _joinGroupbuy(g),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text('${g['title'] ?? g['itemName'] ?? '团购'}',
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                      StatusChip(g['status'] == 'SUCCESS' ? '已成团' : '进行中',
                          color: g['status'] == 'SUCCESS'
                              ? AppColors.onSurfaceVariant
                              : AppColors.primary),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                      '${g['itemName'] ?? ''} · ¥${g['unitPrice'] ?? 0} · 已参 ${g['currentCount'] ?? 0}/${g['targetCount'] ?? 0}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant)),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: ((g['progress'] ?? 0) as num) / 100,
                      minHeight: 6,
                      backgroundColor: AppColors.surfaceHigh,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _createGroupbuy() async {
    final title = TextEditingController();
    final item = TextEditingController();
    final price = TextEditingController();
    final target = TextEditingController();
    final ok = await _formSheet(title: '发起农资团购', fields: [
      _field(title, '团购标题'),
      _field(item, '商品名称'),
      _field(price, '单价（元）', number: true),
      _field(target, '目标人数', number: true),
    ]);
    if (ok != true) return;
    await _submit(
        '/market/groupbuy',
        {
          'title': title.text.trim(),
          'itemName': item.text.trim(),
          'unitPrice': double.tryParse(price.text) ?? 0,
          'targetCount': int.tryParse(target.text) ?? 0,
        },
        'group_buy',
        '团购已发起');
  }

  Future<void> _joinGroupbuy(Map<String, dynamic> g) async {
    if (g['status'] == 'SUCCESS') {
      toast(context, '该团购已成团');
      return;
    }
    try {
      await ApiClient.post('/market/groupbuy/${g['id']}/join',
          body: {'count': 1});
      if (!mounted) return;
      toast(context, '参团成功');
      _load();
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('参团', e), error: true);
    }
  }

  // ── 行情工具 ──────────────────────────────
  Future<void> _predictSheet() async {
    try {
      final list = _list(await ApiClient.get('/market/price/predict'));
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '价格趋势预测',
            sections: [
              InfoSection(
                body: list.isEmpty ? '暂无预测数据' : null,
                items: list.isEmpty
                    ? null
                    : [
                        for (final p in list)
                          '${p['productName']}：预测 ¥${p['predictedPrice'] ?? p['price'] ?? '—'}（${'${p['predictDate'] ?? ''}'.split('T').first}）',
                      ],
              ),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('读取', e), error: true);
    }
  }

  Future<void> _futuresSheet() async {
    try {
      final r = _m(await ApiClient.get('/market/futures'));
      final list = (r['list'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '期货行情参考',
            sections: [
              InfoSection(items: [
                for (final f in list)
                  '${(f as Map)['contract']}：${f['price']} ${f['unit'] ?? ''}'
                      '（${(f['change'] as num? ?? 0) >= 0 ? '+' : ''}${f['changePct']}%）',
              ]),
              InfoSection(body: '${r['tip'] ?? ''}'),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('读取', e), error: true);
    }
  }

  Future<void> _exportSheet() async {
    final product = TextEditingController();
    final ok = await _formSheet(
        title: '出口合规查询', fields: [_field(product, '农产品名称（如 柑橘）')]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.get('/market/export',
          query: {'product': product.text.trim()}));
      final docs = (r['docs'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '${r['product']} 出口合规',
            body: '执行标准：${r['standard'] ?? ''}\n\n'
                '检疫要求：${r['quarantine'] ?? ''}\n\n'
                '所需单证：${docs.join('、')}\n\n'
                '${r['tip'] ?? ''}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('查询', e), error: true);
    }
  }

  // ── AI 营销工具 ───────────────────────────
  Future<void> _gradeDetect() async {
    final src = await _pickSource();
    if (src == null) return;
    final img =
        await _picker.pickImage(source: src, imageQuality: 82, maxWidth: 1600);
    if (img == null) return;
    final bytes = await img.readAsBytes();
    if (!mounted) return;
    showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)));
    try {
      final r = _m(await ApiClient.upload(
          '/market/grade/detect', bytes, img.name,
          fields: const {'productName': '农产品'}));
      if (!mounted) return;
      Navigator.pop(context);
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: 'AI 质量分级',
            body: '分级结果：${r['grade'] ?? '—'}\n'
                '综合评分：${r['overallScore'] ?? '—'}\n\n'
                '${r['advice'] ?? ''}',
          ));
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      toast(context, actionErrorMessage('分级', e), error: true);
    }
  }

  Future<void> _liveSheet() async {
    final name = TextEditingController();
    final price = TextEditingController();
    final ok = await _formSheet(title: '直播带货话术', fields: [
      _field(name, '产品名称'),
      _field(price, '直播价（元，选填）', number: true),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/market/live/script', body: {
        'productName': name.text.trim(),
        'price': double.tryParse(price.text),
      }));
      final script = (r['script'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '直播话术 · ${name.text.trim()}',
            sections: [
              InfoSection(items: [
                for (final s in script) '$s',
              ]),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('生成', e), error: true);
    }
  }

  Future<void> _packageSheet() async {
    final name = TextEditingController();
    final feat = TextEditingController();
    final ok = await _formSheet(title: '包装设计文案', fields: [
      _field(name, '产品名称'),
      _field(feat, '产品卖点（逗号分隔）'),
    ]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.post('/market/package/generate', body: {
        'productName': name.text.trim(),
        'features': feat.text.trim().split(RegExp(r'[,，、]')),
      }));
      final tags = (r['tags'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '包装文案 · ${name.text.trim()}',
            body: '【标语】${r['slogan'] ?? ''}\n\n'
                '【文案】${r['description'] ?? ''}\n\n'
                '【标签】${tags.join(' · ')}\n\n'
                '【设计建议】${r['designTip'] ?? ''}',
          ));
    } catch (e) {
      if (mounted) toast(context, actionErrorMessage('生成', e), error: true);
    }
  }

  // ── 溯源 / 物流 ───────────────────────────
  Future<void> _traceSheet() async {
    final code = TextEditingController();
    final ok = await _formSheet(title: '溯源查询', fields: [_field(code, '溯源码')]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.get('/market/trace/${code.text.trim()}'));
      final records = (r['records'] as List? ?? []).cast<dynamic>();
      final product = _m(r['product']);
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '溯源信息',
            sections: [
              InfoSection(
                subtitle: '${product['title'] ?? '农产品'}',
                items: [
                  for (final rec in records)
                    '${(rec as Map)['stage']}：${rec['description'] ?? ''}',
                ],
              ),
            ],
          ));
    } catch (e) {
      if (mounted) toast(context, '未查询到该溯源码', error: true);
    }
  }

  Future<void> _logisticsSheet() async {
    final no = TextEditingController();
    final ok = await _formSheet(title: '冷链物流查询', fields: [_field(no, '物流单号')]);
    if (ok != true) return;
    try {
      final r = _m(await ApiClient.get('/market/logistics/${no.text.trim()}'));
      final traces = (r['traces'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      if (!mounted) return;
      context.push('/detail/info',
          extra: InfoDetailData(
            title: '物流追踪 · ${r['company'] ?? ''}',
            body: '状态：${_logisticsStatusLabel('${r['status'] ?? ''}')}',
            sections: traces.isNotEmpty
                ? [
                    InfoSection(items: [
                      for (final t in traces) '${(t as Map)['desc']}',
                    ]),
                  ]
                : null,
          ));
    } catch (e) {
      if (mounted) toast(context, '未查询到物流信息', error: true);
    }
  }

  // ── 通用 ──────────────────────────────────
  Widget _toolRow(List<(IconData, String, VoidCallback)> items) {
    return Row(
      children: [
        for (final it in items) ...[
          Expanded(
            child: AppCard(
              padding: const EdgeInsets.symmetric(vertical: 16),
              onTap: it.$3,
              child: Column(
                children: [
                  Icon(it.$1, color: AppColors.primary, size: 26),
                  const SizedBox(height: 6),
                  Text(it.$2, style: const TextStyle(fontSize: 13)),
                ],
              ),
            ),
          ),
          if (it != items.last) const SizedBox(width: 12),
        ],
      ],
    );
  }

  Future<void> _submit(String path, Map<String, dynamic> payload, String table,
      String okMsg) async {
    try {
      await ApiClient.post(path, body: payload);
      if (!mounted) return;
      toast(context, okMsg);
      _load();
    } catch (_) {
      await OfflineSyncQueue.enqueue(
          tableName: table, payload: payload, path: path);
      if (mounted) toast(context, '已加入待发送队列，将自动重传');
    }
  }

  Future<ImageSource?> _pickSource() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      useRootNavigator: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (c) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined,
                  color: AppColors.primary),
              title: const Text('拍照'),
              onTap: () => Navigator.pop(c, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppColors.secondary),
              title: const Text('从相册选择'),
              onTap: () => Navigator.pop(c, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool?> _formSheet(
      {required String title, required List<Widget> fields}) {
    return showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.lg)),
      ),
      builder: (sheetCtx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(sheetCtx).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface)),
            const SizedBox(height: 14),
            ...fields,
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(sheetCtx, true),
                child: const Text('确定'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {bool number = false, int lines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        maxLines: lines,
        keyboardType: number ? TextInputType.number : TextInputType.text,
        decoration: InputDecoration(labelText: label, filled: true),
      ),
    );
  }

  String _logisticsStatusLabel(String status) {
    switch (status) {
      case 'CREATED':
        return '已创建';
      case 'PICKED':
        return '已揽收';
      case 'TRANSIT':
        return '运输中';
      case 'ARRIVED':
        return '已到站';
      case 'DELIVERED':
        return '已签收';
      default:
        return status.isEmpty ? '运输中' : status;
    }
  }
}
