import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class BottomNavItemData {
  final String label;
  final IconData icon;
  final IconData? activeIcon;
  final IconData? inactiveIcon;
  final int targetIndex;

  const BottomNavItemData({
    required this.label,
    required this.icon,
    this.activeIcon,
    this.inactiveIcon,
    required this.targetIndex,
  });

  IconData get effectiveActiveIcon => activeIcon ?? icon;
  IconData get effectiveInactiveIcon => inactiveIcon ?? icon;
}

class GlassBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const GlassBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  static const items = [
    BottomNavItemData(
      label: 'Home',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
      inactiveIcon: Icons.home_outlined,
      targetIndex: 0,
    ),
    BottomNavItemData(
      label: 'Policies',
      icon: Icons.shield_outlined,
      activeIcon: Icons.shield_rounded,
      inactiveIcon: Icons.shield_outlined,
      targetIndex: 1,
    ),
    BottomNavItemData(
      label: 'Renewals',
      icon: Icons.autorenew_rounded,
      activeIcon: Icons.autorenew_rounded,
      inactiveIcon: Icons.autorenew_outlined,
      targetIndex: 2,
    ),
    BottomNavItemData(
      label: 'Claims',
      icon: Icons.verified_user_outlined,
      activeIcon: Icons.verified_user_rounded,
      inactiveIcon: Icons.verified_user_outlined,
      targetIndex: 3,
    ),
    BottomNavItemData(
      label: 'Support',
      icon: Icons.headset_mic_outlined,
      activeIcon: Icons.headset_mic_rounded,
      inactiveIcon: Icons.headset_mic_outlined,
      targetIndex: 4,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeColor = isDark ? AppColors.primaryBlueDark : AppColors.primaryBlue;
    final inactiveColor = isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93);

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xDD121214) // Apple Dark Translucent
                : const Color(0xEEFFFFFF), // Apple Light Translucent
            border: Border(
              top: BorderSide(
                color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFD1D1D6),
                width: 0.5,
              ),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 52,
              child: Row(
                children: List.generate(items.length, (index) {
                  final item = items[index];
                  final isSelected = currentIndex == item.targetIndex;

                  return Expanded(
                    child: InkWell(
                      onTap: () => onTap(item.targetIndex),
                      splashColor: Colors.transparent,
                      highlightColor: Colors.transparent,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AnimatedScale(
                            scale: isSelected ? 1.06 : 1.0,
                            duration: const Duration(milliseconds: 200),
                            curve: Curves.easeOutCubic,
                            child: Icon(
                              isSelected ? item.effectiveActiveIcon : item.effectiveInactiveIcon,
                              size: 23,
                              color: isSelected ? activeColor : inactiveColor,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            item.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                              letterSpacing: -0.2,
                              color: isSelected ? activeColor : inactiveColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
