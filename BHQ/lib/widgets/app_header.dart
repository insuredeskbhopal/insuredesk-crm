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
    final isCompact = screenWidth < 480;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 12 : 20,
        vertical: isCompact ? 8 : 12,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : AppColors.cardLight,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppColors.glassBorderDark : AppColors.glassBorderLight,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Left Section: Clean Greeting & User Name Stack
            Expanded(
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset(
                      'assets/brand/app-logo.png',
                      width: isCompact ? 32 : 36,
                      height: isCompact ? 32 : 36,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                    ),
                  ),
                  const Gap(10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          userName,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: isCompact ? 15 : 17,
                            letterSpacing: -0.3,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Gap(1),
                        Text(
                          'Client ID: $clientId',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.white60 : const Color(0xFF64748B),
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

            Gap(isCompact ? 6 : 12),

            // Right Section: Sleek Floating Glass Action Toolbar
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Unified Frosted Glass Capsule for Actions
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withAlpha(12)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isDark
                          ? AppColors.glassBorderDark
                          : AppColors.glassBorderLight,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 1. Theme Switcher Action
                      _HeaderActionButton(
                        tooltip: isDark ? 'Light Mode' : 'Dark Mode',
                        icon: isDark
                            ? Icons.wb_sunny_rounded
                            : Icons.dark_mode_rounded,
                        iconColor:
                            isDark ? Colors.amber : AppColors.primaryBlue,
                        bgColor: (isDark ? Colors.amber : AppColors.primaryBlue)
                            .withAlpha(20),
                        isCompact: isCompact,
                        onTap: () {
                          ref.read(themeModeProvider.notifier).state =
                              isDark ? ThemeMode.light : ThemeMode.dark;
                        },
                      ),
                      Gap(isCompact ? 2 : 4),

                      // 2. Search Action
                      _HeaderActionButton(
                        tooltip: 'Search',
                        icon: Icons.search_rounded,
                        iconColor:
                            isDark ? Colors.white70 : AppColors.textPrimary,
                        isCompact: isCompact,
                        onTap: onSearchTap,
                      ),
                      Gap(isCompact ? 2 : 4),

                      // 3. Notification Action with Badge Dot
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          _HeaderActionButton(
                            tooltip: 'Notifications',
                            icon: Icons.notifications_none_rounded,
                            iconColor:
                                isDark ? Colors.white70 : AppColors.textPrimary,
                            isCompact: isCompact,
                            onTap: onNotificationTap,
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isDark
                                      ? AppColors.darkBackground
                                      : Colors.white,
                                  width: 1,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Gap(10),

                // 4. User Profile Avatar & Sign Out Dropdown Menu
                PopupMenuButton<String>(
                  tooltip: 'User Profile & Settings',
                  offset: const Offset(0, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                    side: BorderSide(
                      color: isDark
                          ? AppColors.glassBorderDark
                          : AppColors.glassBorderLight,
                    ),
                  ),
                  color: isDark ? AppColors.cardDark : Colors.white,
                  elevation: 12,
                  onSelected: (value) {
                    if (value == 'logout') {
                      ref.read(authProvider.notifier).logout();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Row(
                            children: [
                              Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                              Gap(8),
                              Text('Logged out successfully. Redirecting to Client Login...'),
                            ],
                          ),
                          backgroundColor: Color(0xFF0F172A),
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
                    // Header Block: User Profile Summary
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
                                gradient: LinearGradient(
                                  colors: [AppColors.primaryBlue, AppColors.accent],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  userInitials,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
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
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      color: isDark ? Colors.white : AppColors.textPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    (user?.email != null && user!.email.isNotEmpty)
                                        ? user.email
                                        : 'ID: $clientId',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? Colors.white54 : AppColors.textMuted,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const Gap(4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withAlpha(25),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'ID: $clientId • ACTIVE',
                                      style: const TextStyle(
                                        color: Color(0xFF10B981),
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
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
                            color: isDark ? Colors.white70 : AppColors.textSecondary,
                          ),
                          const Gap(10),
                          const Text(
                            'My Client Account',
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
                            Icons.shield_outlined,
                            size: 18,
                            color: isDark ? Colors.white70 : AppColors.textSecondary,
                          ),
                          const Gap(10),
                          const Text(
                            'Security & MPIN',
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
                            Icons.system_update_alt_rounded,
                            size: 18,
                            color: isDark ? Colors.white70 : AppColors.textSecondary,
                          ),
                          const Gap(10),
                          const Expanded(
                            child: Text(
                              'Check for Updates',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB).withAlpha(isDark ? 40 : 20),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'v1.0.1',
                              style: TextStyle(
                                color: Color(0xFF2563EB),
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),

                    // LOGOUT / SIGN OUT ITEM
                    const PopupMenuItem<String>(
                      value: 'logout',
                      child: Row(
                        children: [
                          Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 18),
                          Gap(10),
                          Text(
                            'Logout',
                            style: TextStyle(
                              color: Color(0xFFEF4444),
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  child: Container(
                    width: isCompact ? 30 : 36,
                    height: isCompact ? 30 : 36,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [AppColors.primaryBlue, AppColors.accent],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 6,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        userInitials,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          letterSpacing: 0.5,
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
    );
  }
}

class _HeaderActionButton extends StatelessWidget {
  final String tooltip;
  final IconData icon;
  final Color iconColor;
  final Color? bgColor;
  final bool isCompact;
  final VoidCallback? onTap;

  const _HeaderActionButton({
    required this.tooltip,
    required this.icon,
    required this.iconColor,
    this.bgColor,
    this.isCompact = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = isCompact ? 30.0 : 34.0;
    final iconSize = isCompact ? 16.0 : 18.0;

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: bgColor ??
                  (isDark ? Colors.white.withAlpha(10) : Colors.transparent),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: iconSize,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }
}
