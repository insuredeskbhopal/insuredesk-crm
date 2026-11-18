import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/app_header.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/command_palette.dart';
import '../widgets/common_dialogs.dart';
import '../widgets/desktop_sidebar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/crm_data_provider.dart';
import '../services/app_update_service.dart';
import 'claims_screen.dart';
import 'dashboard_screen.dart';
import 'policies_screen.dart';
import 'renewals_screen.dart';
import 'support_screen.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell>
    with WidgetsBindingObserver {
  int _currentIndex = 0;
  bool _showCommandPalette = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        AppUpdateService.checkForUpdate(context, silent: true);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      // Auto-refresh CRM data whenever mobile app resumes from background
      ref.invalidate(livePoliciesProvider);
      ref.invalidate(liveClaimsProvider);
      ref.invalidate(liveServiceRequestsProvider);
      ref.invalidate(liveNotificationsProvider);
      ref.invalidate(liveProfileProvider);
    }
  }

  Widget _buildBody(int index) {
    switch (index) {
      case 0:
        return DashboardScreen(
          onNavigate: (index) {
            setState(() => _currentIndex = index);
          },
        );
      case 1:
        return const PoliciesScreen();
      case 2:
        return const RenewalsScreen();
      case 3:
        return const ClaimsScreen();
      case 4:
      default:
        return const SupportScreen();
    }
  }

  void _openCommandPalette() {
    setState(() => _showCommandPalette = true);
  }

  void _closeCommandPalette() {
    setState(() => _showCommandPalette = false);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDesktop = MediaQuery.of(context).size.width >= 1024;

    return PopScope(
      canPop: !_showCommandPalette && _currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_showCommandPalette) {
          _closeCommandPalette();
          return;
        }
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
          return;
        }
      },
      child: Shortcuts(
      shortcuts: <LogicalKeySet, Intent>{
        LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.keyK):
            const _OpenCommandIntent(),
        LogicalKeySet(LogicalKeyboardKey.meta, LogicalKeyboardKey.keyK):
            const _OpenCommandIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          _OpenCommandIntent: CallbackAction<_OpenCommandIntent>(
            onInvoke: (_) => _openCommandPalette(),
          ),
        },
        child: Scaffold(
          backgroundColor: isDark ? const Color(0xFF000000) : const Color(0xFFF2F2F7),
          body: Stack(
            children: [
              // ── Ambient Glassmorphic Color Orbs Background ──
              Positioned.fill(
                child: IgnorePointer(
                  child: Stack(
                    children: [
                      // Top Right Soft Blue Orb
                      Positioned(
                        top: -100,
                        right: -100,
                        child: Container(
                          width: 380,
                          height: 380,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                const Color(0xFF007AFF).withValues(alpha: isDark ? 0.18 : 0.09),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Mid Left Soft Emerald Orb
                      Positioned(
                        top: 280,
                        left: -120,
                        child: Container(
                          width: 340,
                          height: 340,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                const Color(0xFF34C759).withValues(alpha: isDark ? 0.14 : 0.07),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Bottom Right Soft Indigo Orb
                      Positioned(
                        bottom: 60,
                        right: -80,
                        child: Container(
                          width: 360,
                          height: 360,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                const Color(0xFF5856D6).withValues(alpha: isDark ? 0.16 : 0.07),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              Row(
                children: [
                  // Sidebar on Desktop
                  if (isDesktop)
                    DesktopSidebar(
                      selectedIndex: _currentIndex,
                      onSelect: (idx) {
                        setState(() => _currentIndex = idx);
                      },
                    ),

                  // Main App Area
                  Expanded(
                    child: Column(
                      children: [
                        AppHeader(
                          onSearchTap: _openCommandPalette,
                          onNotificationTap: () {
                            CommonDialogs.showNotificationsDialog(context);
                          },
                        ),
                        Expanded(child: _buildBody(_currentIndex)),
                      ],
                    ),
                  ),
                ],
              ),

              // Floating Glass Bottom Nav Bar on Mobile
              if (!isDesktop)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: GlassBottomNavBar(
                    currentIndex: _currentIndex,
                    onTap: (idx) {
                      setState(() => _currentIndex = idx);
                    },
                  ),
                ),

              // Global Command Palette Overlay Modal (Ctrl+K)
              if (_showCommandPalette)
                Positioned.fill(
                  child: Container(
                    color: Colors.black54,
                    child: CommandPaletteModal(
                      onSelectPage: (targetIndex) {
                        setState(() => _currentIndex = targetIndex);
                      },
                      onClose: _closeCommandPalette,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
  );
  }
}

class _OpenCommandIntent extends Intent {
  const _OpenCommandIntent();
}
