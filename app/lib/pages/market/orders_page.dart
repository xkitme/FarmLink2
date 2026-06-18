import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../widgets/common.dart';

/// 我的订单页：买家视角订单列表（GET /market/order/list）。
///
/// AI 语音助手「下单 → 支付」闭环后可在此查看订单与状态；也作为集市的常规订单入口。
class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  bool _loading = true;
  String? _error;
  List<_Order> _orders = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.get('/market/order/list', query: {
        'role': 'buyer',
        'pageNum': 1,
        'pageSize': 50,
      });
      final records = (data['records'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(_Order.fromApi)
          .toList();
      if (!mounted) return;
      setState(() {
        _orders = records;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = actionErrorMessage('加载订单', e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceLow,
      appBar: const FarmAppBar(title: '我的订单', showBack: true, showSearch: false),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return _centeredScroll(
        icon: Icons.cloud_off_outlined,
        title: _error!,
        action: TextButton(onPressed: _load, child: const Text('重试')),
      );
    }
    if (_orders.isEmpty) {
      return _centeredScroll(
        icon: Icons.receipt_long_outlined,
        title: '还没有订单',
        subtitle: '去集市挑选好物，或对 AI 语音助手说「帮我下单」',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: _orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _OrderCard(order: _orders[i]),
    );
  }

  Widget _centeredScroll({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? action,
  }) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.28),
        Icon(icon, size: 48, color: AppColors.outline),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
          ),
        ],
        if (action != null) ...[
          const SizedBox(height: 8),
          Center(child: action),
        ],
      ],
    );
  }
}

class _OrderCard extends StatelessWidget {
  final _Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final st = _statusStyle(order.status);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(R.md),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '订单号 ${order.orderNo}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: st.$2.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(R.sm),
                ),
                child: Text(
                  st.$1,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: st.$2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            order.productTitle,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                '数量 ${order.quantity}${order.unit}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              Text(
                '￥${order.totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          if (order.receiver.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 15, color: AppColors.outline),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    order.receiver,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// 返回 (中文状态, 颜色)。
  (String, Color) _statusStyle(String status) {
    switch (status) {
      case 'PENDING':
        return ('待支付', AppColors.warning);
      case 'PAID':
        return ('已支付', AppColors.primary);
      case 'SHIPPED':
        return ('已发货', AppColors.secondary);
      case 'DONE':
        return ('已完成', AppColors.outline);
      case 'CANCELLED':
        return ('已取消', AppColors.outline);
      default:
        return (status, AppColors.outline);
    }
  }
}

class _Order {
  final String orderNo;
  final int quantity;
  final double totalAmount;
  final String status;
  final String productTitle;
  final String unit;
  final String receiver;

  const _Order({
    required this.orderNo,
    required this.quantity,
    required this.totalAmount,
    required this.status,
    required this.productTitle,
    required this.unit,
    required this.receiver,
  });

  factory _Order.fromApi(Map<String, dynamic> j) {
    final product = j['product'] as Map<String, dynamic>?;
    final r = j['receiverInfo'] as Map<String, dynamic>?;
    final receiver = r == null
        ? ''
        : [r['realName'], r['phone'], r['address']]
            .map((e) => (e ?? '').toString().trim())
            .where((e) => e.isNotEmpty)
            .join(' · ');
    return _Order(
      orderNo: (j['orderNo'] ?? '').toString(),
      quantity: (j['quantity'] as num?)?.toInt() ?? 0,
      totalAmount: (j['totalAmount'] as num?)?.toDouble() ?? 0,
      status: (j['status'] ?? 'PENDING').toString(),
      productTitle: (product?['title'] ?? '商品').toString(),
      unit: (product?['unit'] ?? '').toString(),
      receiver: receiver,
    );
  }
}
