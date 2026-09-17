import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../theme/app_theme.dart';
import '../theme/theme_provider.dart';
import '../services/crm_data_provider.dart';

class SidebarItemData {
  final String label;
  final IconData icon;
  final String badge;

  const SidebarItemData({
    required this.label,
    required this.icon,
    this.badge = '',
  });
}

class DesktopSidebar extends ConsumerWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  const DesktopSidebar({
    super.key,
    required this.selectedIndex,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final policies = ref.watch(livePoliciesProvider).value ?? [];
    final claims = ref.watch(liveClaimsProvider).value ?? [];

    final policiesCount = policies.isNotEmpty ? policies.length.toString() : '';
    final renewalsCount = policies
        .where((p) =>
            p.status.toLowerCase().contains('due') ||
            p.status.toLowerCase().contains('renew') ||
            p.status.toLowerCase().contains('pending'))
        .length;
    final claimsCount = claims.isNotEmpty ? claims.length.toString() : '';

    final items = [
      const SidebarItemData(label: 'Home', icon: Icons.home_outlined),
      SidebarItemData(
        label: 'My Policies',
        icon: Icons.shield_outlined,
        badge: policiesCount,
      ),
      SidebarItemData(
        label: 'Renewals',
        icon: Icons.autorenew_rounded,
        badge: renewalsCount > 0 ? renewalsCount.toString() : '',
      ),
      SidebarItemData(
        label: 'My Claims',
        icon: Icons.verified_user_outlined,
        badge: claimsCount,
      ),
      const SidebarItemData(label: 'Documents', icon: Icons.folder_outlined),
      const SidebarItemData(label: 'Payments', icon: Icons.credit_card_outlined),
      const SidebarItemData(label: 'Family & Assets', icon: Icons.family_restroom_outlined),
      const SidebarItemData(label: 'Support', icon: Icons.help_outline_rounded),
    ];

    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : AppColors.cardLight,
        border: Border(
          right: BorderSide(
            color: isDark
                ? AppColors.glassBorderDark
                : const Color(0xFFE2E8F0),
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          // Logo Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    'assets/brand/app-logo.png',
                    width: 36,
                    height: 36,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E3A8A),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.shield_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ),
                const Gap(12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bima Headquarter',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        letterSpacing: -0.3,
                        color: isDark ? Colors.white : AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'by Insuredesk IMF PVT LTD',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Menu List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
              itemCount: items.length,
              separatorBuilder: (_, index) => const Gap(2),
              itemBuilder: (context, index) {
                final item = items[index];
                final isSelected = index == selectedIndex;

                return InkWell(
                  onTap: () => onSelect(index),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 9),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? (isDark
                              ? const Color(0xFF1E293B)
                              : const Color(0xFFEFF6FF))
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          item.icon,
                          size: 18,
                          color: isSelected
                              ? const Color(0xFF1D4ED8)
                              : (isDark
                                  ? Colors.white60
                                  : const Color(0xFF64748B)),
                        ),
                        const Gap(10),
                        Expanded(
                          child: Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              color: isSelected
                                  ? const Color(0xFF1D4ED8)
                                  : (isDark
                                      ? Colors.white
                                      : const Color(0xFF334155)),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (item.badge.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF1D4ED8)
                                  : (isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              item.badge,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isSelected
                                    ? Colors.white
                                    : (isDark
                                        ? Colors.white70
                                        : const Color(0xFF64748B)),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const Divider(height: 1),

          // Theme Toggle
          Padding(
            padding: const EdgeInsets.all(10),
            child: InkWell(
              onTap: () {
                ref.read(themeModeProvider.notifier).state =
                    isDark ? ThemeMode.light : ThemeMode.dark;
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    Icon(
                      isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                      size: 16,
                      color: isDark ? Colors.amber : const Color(0xFF64748B),
                    ),
                    const Gap(8),
                    Expanded(
                      child: Text(
                        isDark ? 'Light Theme' : 'Dark Theme',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.white70 : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
