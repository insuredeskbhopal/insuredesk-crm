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
import 'documents_screen.dart';
import 'family_assets_screen.dart';
import 'payments_screen.dart';
import 'policies_screen.dart';
import 'renewals_screen.dart';
import 'support_screen.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> with WidgetsBindingObserver {
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
        return const DocumentsScreen();
      case 5:
        return const PaymentsScreen();
      case 6:
        return const FamilyAssetsScreen();
      case 7:
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
    final isDesktop = MediaQuery.of(context).size.width >= 1024;

    return Shortcuts(
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
          body: Stack(
            children: [
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
                        Expanded(
                          child: _buildBody(_currentIndex),
                        ),
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
    );
  }
}

class _OpenCommandIntent extends Intent {
  const _OpenCommandIntent();
}
