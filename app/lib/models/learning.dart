class LearningStats {
  final int total;
  final int mastered;
  final int reviewing;
  final int streak;
  final int checkinToday;

  const LearningStats({
    required this.total,
    required this.mastered,
    required this.reviewing,
    required this.streak,
    required this.checkinToday,
  });

  factory LearningStats.fromJson(Map<String, dynamic> j) => LearningStats(
    total:        (j['total'] as int?) ?? 0,
    mastered:     (j['mastered'] as int?) ?? 0,
    reviewing:    (j['reviewing'] as int?) ?? 0,
    streak:       (j['streak'] as int?) ?? 0,
    checkinToday: (j['checkinToday'] as int?) ?? 0,
  );
}

class ReviewItem {
  final String progressId;
  final String contentId;
  final String contentTitle;
  final String category;
  final int mastery;
  final DateTime nextReviewAt;

  const ReviewItem({
    required this.progressId,
    required this.contentId,
    required this.contentTitle,
    required this.category,
    required this.mastery,
    required this.nextReviewAt,
  });

  factory ReviewItem.fromJson(Map<String, dynamic> j) => ReviewItem(
    progressId:    j['id'] as String,
    contentId:     j['contentId'] as String,
    contentTitle:  (j['content'] as Map?)?['title'] as String? ?? '',
    category:      (j['content'] as Map?)?['category'] as String? ?? '',
    mastery:       (j['mastery'] as int?) ?? 0,
    nextReviewAt:  DateTime.parse(j['nextReviewAt'] as String),
  );
}
