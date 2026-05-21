class Content {
  final String id;
  final String title;
  final String category;
  final String body;
  final String? author;
  final String? dynasty;
  final String? coverUrl;
  final String? summary;
  final int viewCount;
  final bool isFavorited;

  const Content({
    required this.id,
    required this.title,
    required this.category,
    required this.body,
    this.author,
    this.dynasty,
    this.coverUrl,
    this.summary,
    this.viewCount = 0,
    this.isFavorited = false,
  });

  factory Content.fromJson(Map<String, dynamic> j) => Content(
    id:         j['id'] as String,
    title:      j['title'] as String,
    category:   j['category'] as String,
    body:       j['body'] as String,
    author:     j['author'] as String?,
    dynasty:    j['dynasty'] as String?,
    coverUrl:   j['coverUrl'] as String?,
    summary:    j['summary'] as String?,
    viewCount:  (j['viewCount'] as int?) ?? 0,
    isFavorited:(j['isFavorited'] as bool?) ?? false,
  );
}

class ContentMeta {
  final String id;
  final String title;
  final String category;
  final String? author;
  final String? dynasty;
  final String? summary;
  final int viewCount;

  const ContentMeta({
    required this.id,
    required this.title,
    required this.category,
    this.author,
    this.dynasty,
    this.summary,
    this.viewCount = 0,
  });

  factory ContentMeta.fromJson(Map<String, dynamic> j) => ContentMeta(
    id:        j['id'] as String,
    title:     j['title'] as String,
    category:  j['category'] as String,
    author:    j['author'] as String?,
    dynasty:   j['dynasty'] as String?,
    summary:   j['summary'] as String?,
    viewCount: (j['viewCount'] as int?) ?? 0,
  );
}
