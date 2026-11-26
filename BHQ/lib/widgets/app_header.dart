import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../theme/app_theme.dart';
import '../theme/theme_provider.dart';
import '../theme/auth_provider.dart';
import '../services/crm_data_provider.dart';
import '../services/app_update_service.dart';
import 'common_dialogs.dart';

class AppHeader extends ConsumerWidget {
  final VoidCallback? onSearchTap;
  final VoidCallback? onNotificationTap;

  const AppHeader({
    super.key,
    this.onSearchTap,
    this.onNotificationTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final userName = (user != null && user.name.isNotEmpty) ? user.name : 'Valued Client';
    final userInitials = (user != null && user.avatarInitials.isNotEmpty) ? user.avatarInitials : 'CL';
    final clientId = (user != null && user.clientId.isNotEmpty) ? user.clientId : 'Client Portal';

    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 400;

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Container(
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xCC000000)
                : Colors.white.withValues(alpha: 0.85),
            border: Border(
              bottom: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : Colors.black.withValues(alpha: 0.08),
                width: 0.5,
              ),
            ),
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                isCompact ? 14 : 18,
                8,
                isCompact ? 14 : 18,
                10,
              ),
              child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Left Section: App Logo + Client Name
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset(
                  'assets/brand/app-logo.png',
                  width: 36,
                  height: 36,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlue.withAlpha(25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.shield_rounded,
                      color: AppColors.primaryBlue,
                      size: 20,
                    ),
                  ),
                ),
              ),
              const Gap(12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      userName,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: isCompact ? 16 : 18,
                        letterSpacing: -0.4,
                        color: isDark ? Colors.white : const Color(0xFF000000),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Gap(2),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF34C759), // Apple System Green Active Dot
                            shape: BoxShape.circle,
                          ),
                        ),
                        const Gap(5),
                        Flexible(
                          child: Text(
                            'Active Portfolio • ID: ${clientId.length > 10 ? clientId.substring(0, 8).toUpperCase() : clientId}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const Gap(8),

              // Right Section: iOS Circular System Actions + Avatar
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 1. Theme Switcher
                  _IosCircleButton(
                    tooltip: isDark ? 'Light Mode' : 'Dark Mode',
                    iconData: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                    isDark: isDark,
                    onTap: () {
                      ref.read(themeModeProvider.notifier).state =
                          isDark ? ThemeMode.light : ThemeMode.dark;
                    },
                  ),
                  const Gap(6),

                  // 2. Search
                  _IosCircleButton(
                    tooltip: 'Search',
                    iconData: Icons.search_rounded,
                    isDark: isDark,
                    onTap: onSearchTap,
                  ),
                  const Gap(6),

                  // 3. Notifications with Badge
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      _IosCircleButton(
                        tooltip: 'Notifications',
                        iconData: Icons.notifications_none_rounded,
                        isDark: isDark,
                        onTap: onNotificationTap,
                      ),
                      Positioned(
                        top: 2,
                        right: 2,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF3B30), // Apple System Red
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isDark ? AppColors.darkBackground : Colors.white,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Gap(10),

                  // 4. Apple User Profile Avatar & Dropdown Menu
                  PopupMenuButton<String>(
                    tooltip: 'User Profile & Settings',
                    offset: const Offset(0, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(
                        color: isDark
                            ? AppColors.glassBorderDark
                            : AppColors.glassBorderLight,
                        width: 0.5,
                      ),
                    ),
                    color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                    elevation: 12,
                    onSelected: (value) async {
                      if (value == 'logout') {
                        await ref.read(authProvider.notifier).logout();
                        ref.invalidate(livePoliciesProvider);
                        ref.invalidate(liveClaimsProvider);
                        ref.invalidate(liveProfileProvider);
                        ref.invalidate(liveServiceRequestsProvider);
                        ref.invalidate(liveNotificationsProvider);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Row(
                              children: [
                                Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                                Gap(8),
                                Text('Logged out successfully.'),
                              ],
                            ),
                            backgroundColor: Color(0xFF1C1C1E),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      } else if (value == 'profile') {
                        final liveProfile = ref.read(liveProfileProvider).value ?? {};
                        final userMap = authState.user != null
                            ? {
                                'name': authState.user!.name,
                                'phone': liveProfile['phone'] ?? authState.user!.accountNo,
                                'email': authState.user!.email,
                                'id': authState.user!.clientId,
                              }
                            : <String, dynamic>{};
                        CommonDialogs.showProfileModal(context, userMap, liveProfile);
                      } else if (value == 'security') {
                        CommonDialogs.showChangeMpinModal(context);
                      } else if (value == 'update') {
                        AppUpdateService.checkForUpdate(context, silent: false);
                      }
                    },
                    itemBuilder: (context) => [
                      // Header Profile Summary
                      PopupMenuItem<String>(
                        enabled: false,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Color(0xFF007AFF),
                                ),
                                child: Center(
                                  child: Text(
                                    userInitials,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ),
                              const Gap(12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      userName,
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                        color: isDark ? Colors.white : const Color(0xFF000000),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      (user?.email != null && user!.email.isNotEmpty)
                                          ? user.email
                                          : 'ID: $clientId',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF8E8E93),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const PopupMenuDivider(),

                      // Profile Option
                      PopupMenuItem<String>(
                        value: 'profile',
                        child: Row(
                          children: [
                            Icon(
                              Icons.person_outline_rounded,
                              size: 18,
                              color: isDark ? Colors.white70 : const Color(0xFF3C3C43),
                            ),
                            const Gap(10),
                            const Text(
                              'Account Details',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),

                      // Security Option
                      PopupMenuItem<String>(
                        value: 'security',
                        child: Row(
                          children: [
                            Icon(
                              Icons.lock_outline_rounded,
                              size: 18,
                              color: isDark ? Colors.white70 : const Color(0xFF3C3C43),
                            ),
                            const Gap(10),
                            const Text(
                              'Security & Passcode',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),

                      // Check for Updates Option
                      PopupMenuItem<String>(
                        value: 'update',
                        child: Row(
                          children: [
                            Icon(
                              Icons.arrow_downward_rounded,
                              size: 18,
                              color: isDark ? Colors.white70 : const Color(0xFF3C3C43),
                            ),
                            const Gap(10),
                            const Expanded(
                              child: Text(
                                'Check for Updates',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF007AFF).withAlpha(isDark ? 50 : 25),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'v1.0.1',
                                style: TextStyle(
                                  color: Color(0xFF007AFF),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),

                      // LOGOUT
                      const PopupMenuItem<String>(
                        value: 'logout',
                        child: Row(
                          children: [
                            Icon(Icons.logout_rounded, color: Color(0xFFFF3B30), size: 18),
                            Gap(10),
                            Text(
                              'Sign Out',
                              style: TextStyle(
                                color: Color(0xFFFF3B30),
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF007AFF),
                        border: Border.all(
                          color: isDark ? Colors.white24 : const Color(0x33007AFF),
                          width: 1.5,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          userInitials,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  ),
);
}
}

class _IosCircleButton extends StatelessWidget {
  final String tooltip;
  final IconData iconData;
  final bool isDark;
  final VoidCallback? onTap;

  const _IosCircleButton({
    required this.tooltip,
    required this.iconData,
    required this.isDark,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withAlpha(20)
                  : const Color(0xFFF2F2F7),
              shape: BoxShape.circle,
            ),
            child: Icon(
              iconData,
              size: 17,
              color: isDark ? Colors.white : const Color(0xFF1C1C1E),
            ),
          ),
        ),
      ),
    );
  }
}
