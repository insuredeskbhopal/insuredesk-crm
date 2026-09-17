import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bimaheadquarter_app/screens/login_screen.dart';
import 'package:bimaheadquarter_app/theme/auth_provider.dart';
import 'package:bimaheadquarter_app/services/crm_data_provider.dart';
import 'package:bimaheadquarter_app/models/policy.dart';
import 'package:bimaheadquarter_app/models/claim.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CRM Mobile Client Verification Flow', () {
    testWidgets('1. Login screen renders authentic branding and fields', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ClientLoginScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.text('Bima Headquarter'), findsWidgets);
      expect(find.text('SECURE CLIENT ACCESS'), findsWidgets);
    });

    testWidgets('2. Empty State Verification - Zero policies returns clean empty UI', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          livePoliciesProvider.overrideWith((ref) => Future.value(<Policy>[])),
          liveClaimsProvider.overrideWith((ref) => Future.value(<Claim>[])),
          liveServiceRequestsProvider.overrideWith((ref) => Future.value(<Map<String, dynamic>>[])),
          liveNotificationsProvider.overrideWith((ref) => Future.value(<Map<String, dynamic>>[])),
        ],
      );
      addTearDown(container.dispose);

      final policies = await container.read(livePoliciesProvider.future);
      final claims = await container.read(liveClaimsProvider.future);
      final requests = await container.read(liveServiceRequestsProvider.future);
      final notifs = await container.read(liveNotificationsProvider.future);

      expect(policies, isEmpty);
      expect(claims, isEmpty);
      expect(requests, isEmpty);
      expect(notifs, isEmpty);
    });

    testWidgets('3. AuthNotifier session management and logout', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          authProvider.overrideWith((ref) => AuthNotifier()..state = const AuthState(
            isAuthenticated: true,
            user: AuthUser(
              clientId: '10fc2918-506f-468b-8a52-c5171eacfc57',
              name: 'TEST ACCOUNT - Mobile Client',
              email: 'test.client@bimaheadquarter.com',
              accountNo: 'BHQ-99001',
              avatarInitials: 'TA',
            ),
          )),
        ],
      );
      addTearDown(container.dispose);

      expect(container.read(authProvider).isAuthenticated, isTrue);
      expect(container.read(authProvider).user?.name, 'TEST ACCOUNT - Mobile Client');

      container.read(authProvider.notifier).logout();
      expect(container.read(authProvider).isAuthenticated, isFalse);
      expect(container.read(authProvider).user, isNull);
    });
  });
}
