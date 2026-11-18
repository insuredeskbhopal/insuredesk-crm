import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';

class QuickActionItem {
  final String label;
  final IconData icon;
  final Color color;
  final Color? lightColor;
  final Color? darkColor;

  const QuickActionItem({
    required this.label,
    required this.icon,
    required this.color,
    this.lightColor,
    this.darkColor,
  });
}

class QuickActionsGrid extends StatelessWidget {
  final Function(String action)? onActionTap;

  const QuickActionsGrid({super.key, this.onActionTap});

  static const actions = [
    QuickActionItem(
      label: 'Renew',
      icon: Icons.autorenew_rounded,
      color: Color(0xFF007AFF), // Apple Blue
    ),
    QuickActionItem(
      label: 'File Claim',
      icon: Icons.add_moderator_rounded,
      color: Color(0xFF34C759), // Apple Green
    ),
    QuickActionItem(
      label: 'Download ID',
      icon: Icons.arrow_downward_rounded,
      color: Color(0xFF5856D6), // Apple Indigo
    ),
    QuickActionItem(
      label: 'Pay Premium',
      icon: Icons.credit_card_rounded,
      color: Color(0xFFFF9500), // Apple Orange
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: actions.map((item) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: InkWell(
              onTap: () {
                if (item.label == 'Download ID') {
                  onActionTap?.call('Download Policy');
                } else if (item.label == 'Renew') {
                  onActionTap?.call('Renew Policy');
                } else {
                  onActionTap?.call(item.label);
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: item.color.withValues(alpha: isDark ? 0.20 : 0.08),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: isDark
                                  ? [
                                      const Color(0xFF1E293B).withValues(alpha: 0.82),
                                      const Color(0xFF0F172A).withValues(alpha: 0.72),
                                    ]
                                  : [
                                      Colors.white.withValues(alpha: 0.90),
                                      Colors.white.withValues(alpha: 0.70),
                                    ],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.16)
                                  : Colors.white.withValues(alpha: 0.85),
                              width: 1.0,
                            ),
                          ),
                          child: Center(
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: item.color.withValues(alpha: isDark ? 0.30 : 0.16),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                item.icon,
                                color: item.color,
                                size: 18,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Gap(6),
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      letterSpacing: -0.2,
                      color: isDark ? Colors.white70 : const Color(0xFF1C1C1E),
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
