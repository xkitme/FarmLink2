import 'package:farmlink/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('FarmLink app starts', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({'onboarding_seen': true});

    await tester.pumpWidget(const FarmLinkApp());
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
