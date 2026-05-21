class AppUser {
  final int id;
  final String username;
  final String? nickname;
  final String? phone;
  final String? avatarUrl;
  final String role;
  final String? regionCode;
  final String? villageName;
  final int points;
  final bool isElderMode;

  const AppUser({
    required this.id,
    required this.username,
    this.nickname,
    this.phone,
    this.avatarUrl,
    this.role = 'FARMER',
    this.regionCode,
    this.villageName,
    this.points = 0,
    this.isElderMode = false,
  });

  String get displayName => nickname?.isNotEmpty == true ? nickname! : username;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as int,
        username: j['username'] as String? ?? '',
        nickname: j['nickname'] as String?,
        phone: j['phone'] as String?,
        avatarUrl: j['avatarUrl'] as String?,
        role: j['role'] as String? ?? 'FARMER',
        regionCode: j['regionCode'] as String?,
        villageName: j['villageName'] as String?,
        points: (j['points'] as int?) ?? 0,
        isElderMode: (j['isElderMode'] as bool?) ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'nickname': nickname,
        'phone': phone,
        'avatarUrl': avatarUrl,
        'role': role,
        'regionCode': regionCode,
        'villageName': villageName,
        'points': points,
        'isElderMode': isElderMode,
      };
}
