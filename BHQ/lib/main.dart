import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';
import 'theme/theme_provider.dart';
import 'theme/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.ensureReachableHost();
  runApp(
    const ProviderScope(
      child: BimaHQApp(),
    ),
  );
}

class BimaHQApp extends ConsumerWidget {
  const BimaHQApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'Bima Headquarter',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      home: authState.isAuthenticated
          ? const MainShell()
          : const ClientLoginScreen(),
    );
  }
}

