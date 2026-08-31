import 'package:flutter/material.dart';

import 'farm_tokens.dart';

/// 页面/区块的「加载状态」枚举：116h-A 统一五态，页面据此分发而非各写各的 if。
enum FarmViewState {
  loading,
  empty,
  error,
  unauthorized,
  offline,
}

/// 统一状态分发组件：按 [state] 渲染对应状态视图，避免每页重复 switch。
///
/// - [loading]/[empty]/[offline] 不带动作，纯占位 + 文案。
/// - [error] 提供 [onRetry]。
/// - [unauthorized] 提供 [onLogin]（回到登录）与可选的 [onRetry]。
/// - 各状态也可用 [FarmLoading]/[FarmEmpty]/[FarmError]/[FarmUnauthorized]/[FarmOffline]
///   单独使用。
class FarmStateView extends StatelessWidget {
  final FarmViewState state;
  final String? message;

  /// 加载态文案，默认「正在加载…」。
  final String? loadingText;

  /// 空态文案，默认「暂无内容」。
  final String? emptyText;

  /// 空态图标。
  final IconData emptyIcon;

  /// 错误态重试回调（仅 [FarmViewState.error]/[offline]/[unauthorized] 用）。
  final VoidCallback? onRetry;

  /// 未授权态「去登录」回调（仅 [FarmViewState.unauthorized] 用）。
  final VoidCallback? onLogin;

  const FarmStateView({
    super.key,
    required this.state,
    this.message,
    this.loadingText,
    this.emptyText,
    this.emptyIcon = Icons.inbox_outlined,
    this.onRetry,
    this.onLogin,
  });

  @override
  Widget build(BuildContext context) {
    switch (state) {
      case FarmViewState.loading:
        return FarmLoading(text: loadingText ?? message);
      case FarmViewState.empty:
        return FarmEmpty(emptyText ?? message ?? '暂无内容', icon: emptyIcon);
      case FarmViewState.error:
        return FarmError(message ?? '加载失败，请重试', onRetry: onRetry);
      case FarmViewState.unauthorized:
        return FarmUnauthorized(
          message ?? '登录已过期，请重新登录',
          onLogin: onLogin,
          onRetry: onRetry,
        );
      case FarmViewState.offline:
        return FarmOffline(message ?? '服务暂时不可用，请稍后重试', onRetry: onRetry);
    }
  }
}

/// 加载中。
class FarmLoading extends StatelessWidget {
  final String? text;
  const FarmLoading({super.key, this.text});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(
              color: FarmColors.primary, strokeWidth: 2.5),
          if (text != null) ...[
            const SizedBox(height: FarmSpacing.md),
            Text(text!,
                style: const TextStyle(color: FarmColors.onSurfaceVariant)),
          ],
        ],
      ),
    );
  }
}

/// 空状态。
class FarmEmpty extends StatelessWidget {
  final String text;
  final IconData icon;
  const FarmEmpty(this.text, {super.key, this.icon = Icons.inbox_outlined});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: FarmColors.outlineVariant),
          const SizedBox(height: FarmSpacing.md),
          Text(text,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: FarmColors.onSurfaceVariant, fontSize: 14)),
        ],
      ),
    );
  }
}

/// 错误 + 重试（服务返回了错误 / 业务失败）。
class FarmError extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const FarmError(this.message, {super.key, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded,
              size: 56, color: FarmColors.error),
          const SizedBox(height: FarmSpacing.md),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: FarmSpacing.xl),
            child: Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: FarmColors.onSurfaceVariant)),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: FarmSpacing.lg),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('重试'),
            ),
          ],
        ],
      ),
    );
  }
}

/// 未授权（登录过期 / 无权限），给出「重新登录」主动作。
class FarmUnauthorized extends StatelessWidget {
  final String message;
  final VoidCallback? onLogin;
  final VoidCallback? onRetry;
  const FarmUnauthorized(this.message, {super.key, this.onLogin, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.lock_outline_rounded,
              size: 56, color: FarmColors.goldContainer),
          const SizedBox(height: FarmSpacing.md),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: FarmSpacing.xl),
            child: Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: FarmColors.onSurfaceVariant)),
          ),
          const SizedBox(height: FarmSpacing.lg),
          if (onLogin != null)
            ElevatedButton.icon(
              onPressed: onLogin,
              icon: const Icon(Icons.login_rounded, size: 18),
              label: const Text('重新登录'),
            ),
          if (onRetry != null) ...[
            const SizedBox(height: FarmSpacing.sm),
            TextButton(onPressed: onRetry, child: const Text('重试')),
          ],
        ],
      ),
    );
  }
}

/// 离线 / 服务不可用（连不上服务，与业务错误区分）。
class FarmOffline extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const FarmOffline(this.message, {super.key, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: 56, color: FarmColors.outline),
          const SizedBox(height: FarmSpacing.md),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: FarmSpacing.xl),
            child: Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: FarmColors.onSurfaceVariant)),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: FarmSpacing.lg),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('重试'),
            ),
          ],
        ],
      ),
    );
  }
}
