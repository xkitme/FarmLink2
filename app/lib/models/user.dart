class AppUser {
  final int id;
  final String username;
  final String? nickname;
  final String? realName;
  final String? phone;
  final String? avatarUrl;
  final String? bannerUrl;
  final String role;
  final String? regionCode;
  final String? villageName;
  final String? shippingAddress;
  final int points;
  final int growth;
  final bool isElderMode;

  const AppUser({
    required this.id,
    required this.username,
    this.nickname,
    this.realName,
    this.phone,
    this.avatarUrl,
    this.bannerUrl,
    this.role = 'FARMER',
    this.regionCode,
    this.villageName,
    this.shippingAddress,
    this.points = 0,
    this.growth = 0,
    this.isElderMode = false,
  });

  String get displayName => nickname?.isNotEmpty == true ? nickname! : username;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as int,
        username: j['username'] as String? ?? '',
        nickname: j['nickname'] as String?,
        realName: j['realName'] as String?,
        phone: j['phone'] as String?,
        avatarUrl: j['avatarUrl'] as String?,
        bannerUrl: j['bannerUrl'] as String?,
        role: j['role'] as String? ?? 'FARMER',
        regionCode: j['regionCode'] as String?,
        villageName: j['villageName'] as String?,
        shippingAddress: j['shippingAddress'] as String?,
        points: (j['points'] as int?) ?? 0,
        growth: (j['growth'] as int?) ?? 0,
        isElderMode: (j['isElderMode'] as bool?) ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'nickname': nickname,
        'realName': realName,
        'phone': phone,
        'avatarUrl': avatarUrl,
        'bannerUrl': bannerUrl,
        'role': role,
        'regionCode': regionCode,
        'villageName': villageName,
        'shippingAddress': shippingAddress,
        'points': points,
        'growth': growth,
        'isElderMode': isElderMode,
      };
}

/// 成长值/等级信息（后端 `/user/growth` 与 `/user/profile` 的 growthInfo 字段口径一致）。
class GrowthInfo {
  final int growth;
  final int level;
  final String levelName;
  final String? nextLevelName;
  final int currentLevelAt;
  final int nextLevelAt;
  final int remaining;
  final double progress;
  final bool isMax;

  const GrowthInfo({
    required this.growth,
    required this.level,
    required this.levelName,
    required this.nextLevelName,
    required this.currentLevelAt,
    required this.nextLevelAt,
    required this.remaining,
    required this.progress,
    required this.isMax,
  });

  factory GrowthInfo.fromJson(Map<String, dynamic> j) => GrowthInfo(
        growth: (j['growth'] as num?)?.toInt() ?? 0,
        level: (j['level'] as num?)?.toInt() ?? 1,
        levelName: j['levelName'] as String? ?? '新芽',
        nextLevelName: j['nextLevelName'] as String?,
        currentLevelAt: (j['currentLevelAt'] as num?)?.toInt() ?? 0,
        nextLevelAt: (j['nextLevelAt'] as num?)?.toInt() ?? 0,
        remaining: (j['remaining'] as num?)?.toInt() ?? 0,
        progress: (j['progress'] as num?)?.toDouble() ?? 0,
        isMax: (j['isMax'] as bool?) ?? false,
      );

  /// hero/资料页统一文案：满级显示「已达最高等级」，否则「距<下一级>还差 N 成长值」。
  String get headline =>
      isMax ? '已达最高等级 · $levelName' : '距$nextLevelName还差 $remaining 成长值';
}
