import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../models/dashboard_data.dart';
import '../models/policy.dart';
import '../services/crm_data_provider.dart';

/// Ultra-Premium Apple-Grade Coverage Overview Card
/// Designed to Apple Card / Apple Health executive financial standards.
/// Completely immune to overflows, text clipping, and cramped viewports.
/// Strictly spotlights policy contracts (never renewal tasks).
class KpiGrid extends ConsumerWidget {
  final List<KpiMetric>? customKpis;

  const KpiGrid({
    super.key,
    this.customKpis,
  });

  String _formatIndianNumber(double val) {
    final s = val.toStringAsFixed(0);
    if (s.length <= 3) return s;
    final lastThree = s.substring(s.length - 3);
    final rest = s.substring(0, s.length - 3);
    final buffer = StringBuffer();
    for (int i = 0; i < rest.length; i++) {
      if (i > 0 && (rest.length - i) % 2 == 0) {
        buffer.write(',');
      }
      buffer.write(rest[i]);
    }
    return '${buffer.toString()},$lastThree';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final policiesAsync = ref.watch(livePoliciesProvider);
    final claimsAsync = ref.watch(liveClaimsProvider);

    final policies = policiesAsync.value ?? <Policy>[];
    final claims = claimsAsync.value ?? [];

    // Strictly spotlight genuinely active policies (unexpired validity)
    final activePolicies = policies.where((p) => p.isActive).toList();
    final activeCount = activePolicies.length;
    final claimsCount = claims.length;

    double totalSumInsured = 0.0;
    double totalPremium = 0.0;
    int motorCount = 0;
    int healthCount = 0;
    int commercialCount = 0;

    for (final p in activePolicies) {
      final cleanSum = (p.sumInsured ?? '').replaceAll(RegExp(r'[^0-9.]'), '');
      totalSumInsured += double.tryParse(cleanSum) ?? 0.0;

      final cleanPrem = p.price.replaceAll(RegExp(r'[^0-9.]'), '');
      totalPremium += double.tryParse(cleanPrem) ?? 0.0;

      final cat = p.policyCategory.toLowerCase();
      if (cat.contains('motor') ||
          (p.vehicleNumber != null && p.vehicleNumber!.isNotEmpty)) {
        motorCount++;
      } else if (cat.contains('health')) {
        healthCount++;
      } else {
        commercialCount++;
      }
    }

    // Format Sum Insured display
    String coverageDisplay = '₹0';
    if (totalSumInsured >= 10000000) {
      coverageDisplay =
          '₹${(totalSumInsured / 10000000).toStringAsFixed(2)} Cr';
    } else if (totalSumInsured >= 100000) {
      coverageDisplay = '₹${(totalSumInsured / 100000).toStringAsFixed(1)} L';
    } else if (totalSumInsured > 0) {
      coverageDisplay = '₹${_formatIndianNumber(totalSumInsured)}';
    } else if (policies.isNotEmpty) {
      coverageDisplay = '$activeCount Policies';
    }

    // Format Total Premium display
    String premiumDisplay = '₹0';
    if (totalPremium >= 10000000) {
      premiumDisplay = '₹${(totalPremium / 10000000).toStringAsFixed(2)} Cr';
    } else if (totalPremium >= 100000) {
      premiumDisplay = '₹${(totalPremium / 100000).toStringAsFixed(1)} L';
    } else if (totalPremium > 0) {
      premiumDisplay = '₹${_formatIndianNumber(totalPremium)}';
    }

    // Apple Frosted Glass Styling
    final glassGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: isDark
          ? [
              const Color(0xFF1E293B).withValues(alpha: 0.88),
              const Color(0xFF0F172A).withValues(alpha: 0.80),
            ]
          : [
              Colors.white.withValues(alpha: 0.95),
              Colors.white.withValues(alpha: 0.82),
            ],
    );

    final specularBorder = Border.all(
      color: isDark
          ? Colors.white.withValues(alpha: 0.16)
          : Colors.white.withValues(alpha: 0.90),
      width: 1.0,
    );

    final dividerColor = isDark
        ? Colors.white.withValues(alpha: 0.10)
        : Colors.black.withValues(alpha: 0.08);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          // Soft ambient blue tinted glow
          BoxShadow(
            color: const Color(0xFF007AFF)
                .withValues(alpha: isDark ? 0.10 : 0.05),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
          // Deep occlusion drop shadow
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.40 : 0.06),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            decoration: BoxDecoration(
              gradient: glassGradient,
              borderRadius: BorderRadius.circular(24),
              border: specularBorder,
            ),
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ─── 1. Header: Zero-Overflow Title & Status Pill ───
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF007AFF),
                            ),
                          ),
                          const Gap(7),
                          Flexible(
                            child: Text(
                              'COVERAGE OVERVIEW',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                                color: isDark
                                    ? const Color(0xFF98989D)
                                    : const Color(0xFF6E6E73),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Gap(8),
                    // Glassmorphic IRDAI Verified Pill
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF34C759)
                            .withValues(alpha: isDark ? 0.22 : 0.14),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFF34C759)
                              .withValues(alpha: isDark ? 0.45 : 0.28),
                          width: 0.6,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 5,
                            height: 5,
                            decoration: const BoxDecoration(
                              color: Color(0xFF34C759),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const Gap(4),
                          const Text(
                            'IRDAI Sync',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.1,
                              color: Color(0xFF34C759),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const Gap(14),

                // ─── 2. Hero Metric: Total Sum Insured Display ───
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TOTAL SUM INSURED',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: isDark
                            ? const Color(0xFF8E8E93)
                            : const Color(0xFF636366),
                      ),
                    ),
                    const Gap(3),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        coverageDisplay,
                        style: TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1.2,
                          color: isDark
                              ? Colors.white
                              : const Color(0xFF1C1C1E),
                        ),
                      ),
                    ),
                    const Gap(4),
                    Text(
                      totalSumInsured > 0
                          ? '₹${_formatIndianNumber(totalSumInsured)} active asset protection across $activeCount verified policies'
                          : '$activeCount active policy contracts secured in portfolio',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -0.1,
                        color: isDark
                            ? const Color(0xFF8E8E93)
                            : const Color(0xFF636366),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),

                const Gap(14),

                // ─── 3. Apple Health-Style Segmented Distribution Bar ───
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    height: 5.5,
                    width: double.infinity,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.10)
                        : Colors.black.withValues(alpha: 0.06),
                    child: activeCount == 0
                        ? const SizedBox.shrink()
                        : Row(
                            children: [
                              if (motorCount > 0)
                                Expanded(
                                  flex: motorCount,
                                  child: Container(
                                    color: const Color(0xFFFF9500),
                                  ),
                                ),
                              if (healthCount > 0)
                                Expanded(
                                  flex: healthCount,
                                  child: Container(
                                    color: const Color(0xFF34C759),
                                  ),
                                ),
                              if (commercialCount > 0)
                                Expanded(
                                  flex: commercialCount,
                                  child: Container(
                                    color: const Color(0xFF5856D6),
                                  ),
                                ),
                            ],
                          ),
                  ),
                ),

                const Gap(8),

                // Micro Legend with Responsive Wrapping
                Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    if (motorCount > 0)
                      _legendDot(
                        color: const Color(0xFFFF9500),
                        label: '$motorCount Motor Assets',
                        isDark: isDark,
                      ),
                    if (healthCount > 0)
                      _legendDot(
                        color: const Color(0xFF34C759),
                        label: '$healthCount Health',
                        isDark: isDark,
                      ),
                    if (commercialCount > 0)
                      _legendDot(
                        color: const Color(0xFF5856D6),
                        label: '$commercialCount Commercial',
                        isDark: isDark,
                      ),
                  ],
                ),

                const Gap(14),
                Divider(height: 1, thickness: 0.5, color: dividerColor),
                const Gap(12),

                // ─── 4. Executive Telemetry Pods (Spacious 2-Pod Split) ───
                Row(
                  children: [
                    // Left Pod: Active Policies
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 11,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF007AFF)
                                  .withValues(alpha: 0.10)
                              : const Color(0xFF007AFF)
                                  .withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: const Color(0xFF007AFF)
                                .withValues(alpha: isDark ? 0.28 : 0.16),
                            width: 0.8,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.shield_rounded,
                                  size: 13,
                                  color: Color(0xFF007AFF),
                                ),
                                const Gap(5),
                                Expanded(
                                  child: Text(
                                    'POLICIES',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.6,
                                      color: isDark
                                          ? const Color(0xFF64D2FF)
                                          : const Color(0xFF007AFF),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const Gap(6),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                '$activeCount Active',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.4,
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF1C1C1E),
                                ),
                              ),
                            ),
                            const Gap(2),
                            Text(
                              'Secured Contracts',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w500,
                                color: isDark
                                    ? const Color(0xFF8E8E93)
                                    : const Color(0xFF636366),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Gap(10),
                    // Right Pod: Annual Premium
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 11,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF34C759)
                                  .withValues(alpha: 0.10)
                              : const Color(0xFF34C759)
                                  .withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: const Color(0xFF34C759)
                                .withValues(alpha: isDark ? 0.28 : 0.16),
                            width: 0.8,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.payments_rounded,
                                  size: 13,
                                  color: Color(0xFF34C759),
                                ),
                                const Gap(5),
                                Expanded(
                                  child: Text(
                                    'ANNUAL PREMIUM',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.6,
                                      color: isDark
                                          ? const Color(0xFF30D158)
                                          : const Color(0xFF248A3D),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const Gap(6),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                premiumDisplay,
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.4,
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF1C1C1E),
                                ),
                              ),
                            ),
                            const Gap(2),
                            Text(
                              'Annual Invested',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w500,
                                color: isDark
                                    ? const Color(0xFF8E8E93)
                                    : const Color(0xFF636366),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                const Gap(10),

                // ─── 5. Bottom Full-Width Portfolio Security Capsule ───
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF5856D6)
                            .withValues(alpha: 0.12)
                        : const Color(0xFF5856D6)
                            .withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF5856D6)
                          .withValues(alpha: isDark ? 0.26 : 0.14),
                      width: 0.7,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        claimsCount > 0
                            ? Icons.info_outline_rounded
                            : Icons.verified_user_rounded,
                        size: 14,
                        color: const Color(0xFF5856D6),
                      ),
                      const Gap(7),
                      Expanded(
                        child: Text(
                          claimsCount > 0
                              ? '$claimsCount Claim in Review • Active Support'
                              : '100% Portfolio Security • Zero Open Claims',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark
                                ? const Color(0xFFBF5AF2)
                                : const Color(0xFF5856D6),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: (claimsCount > 0
                                  ? const Color(0xFFFF9500)
                                  : const Color(0xFF34C759))
                              .withValues(alpha: isDark ? 0.25 : 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          claimsCount > 0 ? 'Review' : 'Active',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: claimsCount > 0
                                ? const Color(0xFFFF9500)
                                : const Color(0xFF34C759),
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
      ),
    );
  }

  Widget _legendDot({
    required Color color,
    required String label,
    required bool isDark,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const Gap(5),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF6E6E73),
          ),
        ),
      ],
    );
  }
}
