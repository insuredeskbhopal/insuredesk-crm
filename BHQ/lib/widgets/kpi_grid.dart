import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../models/dashboard_data.dart';
import '../models/policy.dart';
import '../theme/app_theme.dart';
import '../services/crm_data_provider.dart';
import 'glass_card.dart';

class KpiGrid extends ConsumerWidget {
  final List<KpiMetric>? customKpis;

  const KpiGrid({
    super.key,
    this.customKpis,
  });

  Color _getToneColor(PolicyTone tone, bool isDark) {
    switch (tone) {
      case PolicyTone.accent:
        return isDark ? AppColors.accentLight : AppColors.accent;
      case PolicyTone.primary:
        return isDark ? AppColors.primaryBlueDark : AppColors.primaryBlue;
      case PolicyTone.amber:
        return isDark ? AppColors.amberLight : AppColors.amber;
      case PolicyTone.muted:
        return isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final policiesAsync = ref.watch(livePoliciesProvider);
    final claimsAsync = ref.watch(liveClaimsProvider);

    final policies = policiesAsync.value ?? <Policy>[];
    final claims = claimsAsync.value ?? [];

    final activeCount = policies.length;
    final renewalCount = policies.where((p) => p.status.toLowerCase().contains('renewal') || p.status.toLowerCase().contains('due')).length;
    final claimsCount = claims.length;

    double totalSumInsured = 0.0;
    for (final p in policies) {
      final clean = (p.sumInsured ?? '').replaceAll(RegExp(r'[^0-9.]'), '');
      final val = double.tryParse(clean) ?? 0.0;
      totalSumInsured += val;
    }
    String coverageDisplay = '₹0';
    if (totalSumInsured >= 10000000) {
      coverageDisplay = '₹${(totalSumInsured / 10000000).toStringAsFixed(1)} Cr';
    } else if (totalSumInsured >= 100000) {
      coverageDisplay = '₹${(totalSumInsured / 100000).toStringAsFixed(1)} Lakh';
    } else if (totalSumInsured > 0) {
      coverageDisplay = '₹${totalSumInsured.toStringAsFixed(0)}';
    } else if (policies.isNotEmpty) {
      coverageDisplay = '${policies.length} Policies';
    }

    final kpis = customKpis ?? [
      KpiMetric(
        label: 'Active Policies',
        value: activeCount.toString(),
        note: '$activeCount synced with CRM',
        tone: PolicyTone.accent,
        icon: Icons.shield_outlined,
      ),
      KpiMetric(
        label: 'Upcoming Renewals',
        value: renewalCount.toString(),
        note: renewalCount > 0 ? 'Due soon' : 'All up to date',
        tone: PolicyTone.amber,
        icon: Icons.autorenew_rounded,
      ),
      KpiMetric(
        label: 'Open Claims',
        value: claimsCount.toString(),
        note: claimsCount > 0 ? 'Active in tracker' : 'No pending claims',
        tone: PolicyTone.primary,
        icon: Icons.verified_user_outlined,
      ),
      KpiMetric(
        label: 'Total Coverage',
        value: coverageDisplay,
        note: totalSumInsured > 0 ? 'Sum Insured' : 'Active Portfolios',
        tone: PolicyTone.muted,
        icon: Icons.account_balance_outlined,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = constraints.maxWidth;
        final crossAxisCount = screenWidth > 640 ? 4 : 2;
        final aspectRatio = screenWidth < 480 ? 1.38 : (screenWidth > 640 ? 1.6 : 1.45);
        final cardPadding = screenWidth < 480 ? 12.0 : 14.0;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: kpis.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: screenWidth < 480 ? 8 : 10,
            mainAxisSpacing: screenWidth < 480 ? 8 : 10,
            childAspectRatio: aspectRatio,
          ),
          itemBuilder: (context, index) {
            final kpi = kpis[index];
            final themeColor = _getToneColor(kpi.tone, isDark);
            final kpiIcon = kpi.icon ?? Icons.analytics_outlined;

            return GlassCard(
              padding: EdgeInsets.all(cardPadding),
              borderRadius: 14,
              child: Stack(
                clipBehavior: Clip.hardEdge,
                children: [
                  // 1. Subtle Radial Glow Tint
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: RadialGradient(
                          center: Alignment.bottomRight,
                          radius: 1.2,
                          colors: [
                            themeColor.withAlpha(isDark ? 30 : 15),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 2. Large Faded Watermark Icon Background
                  Positioned(
                    right: -12,
                    bottom: -12,
                    child: IgnorePointer(
                      child: Opacity(
                        opacity: isDark ? 0.12 : 0.07,
                        child: Icon(
                          kpiIcon,
                          size: 78,
                          color: themeColor,
                        ),
                      ),
                    ),
                  ),

                  // 3. Main Card Foreground Content
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Top Row: Container Icon Badge + Category Pill
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: themeColor.withAlpha(isDark ? 35 : 20),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              kpiIcon,
                              size: 16,
                              color: themeColor,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withAlpha(10) : Colors.black.withAlpha(6),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              kpi.label,
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white70 : const Color(0xFF475569),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),

                      // Value & Note Section
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            kpi.value,
                            style: TextStyle(
                              fontSize: screenWidth < 480 ? 20 : 22,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const Gap(2),
                          Text(
                            kpi.note,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w500,
                              color: isDark ? Colors.white60 : const Color(0xFF64748B),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
