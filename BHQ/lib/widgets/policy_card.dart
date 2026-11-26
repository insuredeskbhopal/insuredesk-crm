import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import '../models/policy.dart';
import '../screens/policy_details_screen.dart';
import '../screens/contact_bimaheadquarter_screen.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'common_dialogs.dart';
import 'glass_card.dart';

class PolicyCard extends StatelessWidget {
  final Policy policy;
  final VoidCallback? onTap;
  final bool isCompact;

  const PolicyCard({
    super.key,
    required this.policy,
    this.onTap,
    this.isCompact = false,
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

  String _formatDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) return '-';
    final s = raw.trim();
    try {
      final dt = DateTime.tryParse(s);
      if (dt != null) {
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]} ${dt.year}';
      }
    } catch (_) {}

    final parts = s.split(RegExp(r'[-/]'));
    if (parts.length == 3) {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      if (parts[0].length == 4) {
        final m = int.tryParse(parts[1]) ?? 1;
        return '${parts[2].padLeft(2, '0')} ${months[(m - 1).clamp(0, 11)]} ${parts[0]}';
      } else if (parts[2].length == 4) {
        final m = int.tryParse(parts[1]) ?? 1;
        return '${parts[0].padLeft(2, '0')} ${months[(m - 1).clamp(0, 11)]} ${parts[2]}';
      }
    }
    return s;
  }

  String _formatAmount(String? raw) {
    if (raw == null || raw.trim().isEmpty || raw == '0') return '-';
    final clean = raw.trim().replaceAll('₹', '').replaceAll(',', '').trim();
    final numVal = double.tryParse(clean);
    if (numVal == null) return raw.startsWith('₹') ? raw : '₹$raw';
    final intVal = numVal.round();
    final str = intVal.toString();
    if (str.length <= 3) return '₹$str';
    final last3 = str.substring(str.length - 3);
    final rest = str.substring(0, str.length - 3);
    final formattedRest = rest.replaceAllMapped(
      RegExp(r'(\d)(?=(\d\d)+$)'),
      (m) => '${m[1]},',
    );
    return '₹$formattedRest,$last3';
  }

  Widget _buildHsrpBadge(String plate, bool isDark) =>
      CommonDialogs.buildHsrpPlate(plate, isDark: isDark);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final toneColor = _getToneColor(policy.tone, isDark);
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 480;

    final hasInsuredName = policy.insuredName.trim().isNotEmpty;
    final hasVehicleNumber =
        policy.vehicleNumber != null && policy.vehicleNumber!.trim().isNotEmpty;
    final hasMakeModel =
        policy.makeModel != null && policy.makeModel!.trim().isNotEmpty;
    final hasSumInsured =
        policy.sumInsured != null && policy.sumInsured!.trim().isNotEmpty;
    final hasExpiry =
        policy.expiryDate != null && policy.expiryDate!.trim().isNotEmpty;

    final isDue =
        policy.status.toLowerCase().contains('due') ||
        policy.status.toLowerCase().contains('pending');
    final isExpired = policy.status.toLowerCase().contains('expired');

    final statusColor = isExpired
        ? (isDark
              ? const Color(0xFFFF453A)
              : const Color(0xFFFF3B30)) // Apple Red
        : isDue
        ? (isDark
              ? const Color(0xFFFF9F0A)
              : const Color(0xFFFF9500)) // Apple Orange
        : (isDark
              ? const Color(0xFF30D158)
              : const Color(0xFF34C759)); // Apple Green

    // Clean product type (strip redundant trailing 'Policy')
    String cleanProductType = policy.policyType.trim();
    if (cleanProductType.toLowerCase().endsWith(' policy') &&
        cleanProductType.length > 7) {
      cleanProductType = cleanProductType
          .substring(0, cleanProductType.length - 7)
          .trim();
    }

    void openDetails() {
      if (onTap != null) {
        onTap!();
      } else {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PolicyDetailsScreen(policy: policy),
          ),
        );
      }
    }

    if (isCompact) {
      return GlassCard(
        onTap: openDetails,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        borderRadius: 16,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: toneColor.withValues(alpha: isDark ? 0.28 : 0.14),
                borderRadius: BorderRadius.circular(11),
                border: Border.all(
                  color: toneColor.withValues(alpha: isDark ? 0.40 : 0.25),
                  width: 0.8,
                ),
              ),
              child: Icon(
                policy.icon,
                color: toneColor,
                size: 20,
              ),
            ),
            const Gap(12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    hasInsuredName ? policy.insuredName : policy.name,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.2,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Gap(3),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 1.5,
                        ),
                        decoration: BoxDecoration(
                          color: toneColor.withValues(
                            alpha: isDark ? 0.28 : 0.14,
                          ),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          policy.policyCategory.toUpperCase(),
                          style: TextStyle(
                            color: toneColor,
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                      const Gap(6),
                      Expanded(
                        child: Text(
                          hasVehicleNumber
                              ? policy.vehicleNumber!
                              : (policy.policyNumber != null
                                  ? '#${policy.policyNumber}'
                                  : cleanProductType),
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: hasVehicleNumber ? 'monospace' : null,
                            fontWeight: FontWeight.w500,
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
                ],
              ),
            ),
            const Gap(10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _formatAmount(policy.netPremium ?? policy.price),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                    color: Color(0xFF007AFF),
                  ),
                ),
                const Gap(3),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const Gap(4),
                    Text(
                      policy.status,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const Gap(6),
            Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: isDark ? Colors.white24 : const Color(0xFFCBD5E1),
            ),
          ],
        ),
      );
    }

    return GlassCard(
      onTap: openDetails,
      padding: EdgeInsets.all(isSmall ? 15 : 18),
      borderRadius: isSmall ? 18 : 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. Header: Insurer Icon, Insurer Name, Category & Live Status Capsule ───
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: isSmall ? 40 : 44,
                height: isSmall ? 40 : 44,
                decoration: BoxDecoration(
                  color: toneColor.withValues(alpha: isDark ? 0.28 : 0.14),
                  borderRadius: BorderRadius.circular(isSmall ? 11 : 13),
                  border: Border.all(
                    color: toneColor.withValues(alpha: isDark ? 0.40 : 0.25),
                    width: 0.8,
                  ),
                ),
                child: Icon(
                  policy.icon,
                  color: toneColor,
                  size: isSmall ? 20 : 22,
                ),
              ),
              const Gap(12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      policy.companyName.isNotEmpty
                          ? policy.companyName
                          : policy.name,
                      style: TextStyle(
                        fontSize: isSmall ? 13.5 : 14.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                      maxLines: 2,
                      softWrap: true,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Gap(4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: toneColor.withValues(
                              alpha: isDark ? 0.28 : 0.14,
                            ),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            policy.policyCategory.toUpperCase(),
                            style: TextStyle(
                              color: toneColor,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        if (cleanProductType.isNotEmpty) ...[
                          const Gap(6),
                          Expanded(
                            child: Text(
                              cleanProductType,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isDark
                                    ? const Color(0xFF98989D)
                                    : const Color(0xFF6E6E73),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const Gap(8),
              // Apple Glassmorphic Status Capsule
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 3.5,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: isDark ? 0.22 : 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: statusColor.withValues(alpha: isDark ? 0.45 : 0.25),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: statusColor.withValues(alpha: 0.6),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                    const Gap(4),
                    Text(
                      policy.status,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const Gap(12),
          Container(
            height: 0.8,
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.05),
          ),
          const Gap(12),

          // ─── 2. Insured Entity, Asset & Number Plate ───
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.verified_user_rounded,
                          size: 13,
                          color: toneColor,
                        ),
                        const Gap(5),
                        Expanded(
                          child: Text(
                            hasInsuredName
                                ? policy.insuredName
                                : 'Insured Policyholder',
                            style: TextStyle(
                              fontSize: isSmall ? 13 : 13.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const Gap(4),
                    Row(
                      children: [
                        Text(
                          '#${policy.policyNumber ?? policy.id}',
                          style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w600,
                            color: isDark
                                ? const Color(0xFF98989D)
                                : const Color(0xFF6E6E73),
                          ),
                        ),
                        if (hasMakeModel) ...[
                          const Gap(6),
                          Container(
                            width: 3,
                            height: 3,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDark
                                  ? const Color(0xFF98989D)
                                  : const Color(0xFF6E6E73),
                            ),
                          ),
                          const Gap(6),
                          Expanded(
                            child: Text(
                              policy.makeModel!,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isDark
                                    ? const Color(0xFF98989D)
                                    : const Color(0xFF6E6E73),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (hasVehicleNumber) ...[
                const Gap(10),
                _buildHsrpBadge(policy.vehicleNumber!, isDark),
              ],
            ],
          ),

          const Gap(14),

          // ─── 3. Financial Telemetry Grid (Apple Health Style Capsule) ───
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF0F172A).withValues(alpha: 0.60)
                  : const Color(0xFFF1F5F9).withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.05),
                width: 0.8,
              ),
            ),
            child: Row(
              children: [
                // 1. Sum Insured
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SUM INSURED',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: isDark
                              ? const Color(0xFF98989D)
                              : const Color(0xFF8E8E93),
                        ),
                      ),
                      const Gap(3),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          hasSumInsured
                              ? _formatAmount(policy.sumInsured)
                              : 'Standard',
                          style: TextStyle(
                            fontSize: isSmall ? 12.5 : 13.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                            color: isDark
                                ? Colors.white
                                : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 0.8,
                  height: 26,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.10)
                      : Colors.black.withValues(alpha: 0.06),
                ),
                // 2. Valid Till
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VALID TILL',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: isDark
                                ? const Color(0xFF98989D)
                                : const Color(0xFF8E8E93),
                          ),
                        ),
                        const Gap(3),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            hasExpiry
                                ? _formatDate(policy.expiryDate)
                                : 'Ongoing',
                            style: TextStyle(
                              fontSize: isSmall ? 11.5 : 12.5,
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(
                  width: 0.8,
                  height: 26,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.10)
                      : Colors.black.withValues(alpha: 0.06),
                ),
                // 3. Premium
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PREMIUM',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: isDark
                                ? const Color(0xFF98989D)
                                : const Color(0xFF8E8E93),
                          ),
                        ),
                        const Gap(3),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            _formatAmount(policy.netPremium ?? policy.price),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                              color: Color(0xFF007AFF),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Gap(14),

          // ─── 4. Actions: Apple Secondary Details + Primary PDF / Contact HQ ───
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              InkWell(
                onTap: openDetails,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7.5,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.black.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDark
                          ? Colors.white12
                          : Colors.black.withValues(alpha: 0.08),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'View Details',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? Colors.white
                              : const Color(0xFF0F172A),
                        ),
                      ),
                      const Gap(4),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        size: 9.5,
                        color: isDark
                            ? const Color(0xFF98989D)
                            : const Color(0xFF6E6E73),
                      ),
                    ],
                  ),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () => CommonDialogs.showWhatsAppShareSheet(
                      context,
                      policy,
                    ),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(7.5),
                      decoration: BoxDecoration(
                        color: const Color(
                          0xFF25D366,
                        ).withValues(alpha: isDark ? 0.20 : 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: const Color(
                            0xFF25D366,
                          ).withValues(alpha: isDark ? 0.35 : 0.25),
                          width: 0.8,
                        ),
                      ),
                      child: const Icon(
                        Icons.chat_bubble_rounded,
                        size: 13,
                        color: Color(0xFF25D366),
                      ),
                    ),
                  ),
                  const Gap(8),
                  if (policy.hasPdf)
                    InkWell(
                  onTap: () {
                    ApiService.downloadDocument(
                      context,
                      policy.id,
                      kind: 'policy',
                      title: policy.policyNumber ?? policy.name,
                    );
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7.5,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF007AFF), Color(0xFF0056D2)],
                      ),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(
                            0xFF007AFF,
                          ).withValues(alpha: 0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.arrow_downward_rounded,
                          size: 13,
                          color: Colors.white,
                        ),
                        Gap(5),
                        Text(
                          'Download PDF',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            ContactBimaheadquarterScreen(policy: policy),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7.5,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(
                        0xFF34C759,
                      ).withValues(alpha: isDark ? 0.20 : 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(
                          0xFF34C759,
                        ).withValues(alpha: isDark ? 0.45 : 0.30),
                        width: 0.8,
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.support_agent_rounded,
                          size: 14,
                          color: Color(0xFF34C759),
                        ),
                        Gap(5),
                        Text(
                          'Contact HQ',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF34C759),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    ),
  );
}
}
