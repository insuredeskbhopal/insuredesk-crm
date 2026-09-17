import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import '../models/policy.dart';
import '../screens/policy_details_screen.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'glass_card.dart';

class PolicyCard extends StatelessWidget {
  final Policy policy;
  final VoidCallback? onTap;

  const PolicyCard({
    super.key,
    required this.policy,
    this.onTap,
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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]} ${dt.year}';
      }
    } catch (_) {}

    final parts = s.split(RegExp(r'[-/]'));
    if (parts.length == 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
    // Indian formatting
    final str = intVal.toString();
    if (str.length <= 3) return '₹$str';
    final last3 = str.substring(str.length - 3);
    final rest = str.substring(0, str.length - 3);
    final formattedRest = rest.replaceAllMapped(RegExp(r'(\d)(?=(\d\d)+$)'), (m) => '${m[1]},');
    return '₹$formattedRest,$last3';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final toneColor = _getToneColor(policy.tone, isDark);
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 480;

    final hasInsuredName = policy.insuredName.trim().isNotEmpty;
    final hasVehicleNumber = policy.vehicleNumber != null && policy.vehicleNumber!.trim().isNotEmpty;
    final hasMakeModel = policy.makeModel != null && policy.makeModel!.trim().isNotEmpty;
    final hasSumInsured = policy.sumInsured != null && policy.sumInsured!.trim().isNotEmpty;
    final hasExpiry = policy.expiryDate != null && policy.expiryDate!.trim().isNotEmpty;

    final isDue = policy.status.toLowerCase().contains('due') || policy.status.toLowerCase().contains('pending');
    final isExpired = policy.status.toLowerCase().contains('expired');

    final statusColor = isExpired
        ? (isDark ? Colors.redAccent.shade100 : Colors.red.shade700)
        : isDue
            ? (isDark ? Colors.amber.shade300 : Colors.amber.shade800)
            : (isDark ? const Color(0xFF34D399) : const Color(0xFF059669));

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

    return GlassCard(
      onTap: openDetails,
      padding: EdgeInsets.all(isSmall ? 14 : 16),
      borderRadius: isSmall ? 16 : 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Header: Icon, Company Name, Category & Status ───
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Category Icon Container
              Container(
                width: isSmall ? 40 : 44,
                height: isSmall ? 40 : 44,
                decoration: BoxDecoration(
                  color: toneColor.withAlpha(isDark ? 45 : 22),
                  borderRadius: BorderRadius.circular(isSmall ? 12 : 14),
                  border: Border.all(
                    color: toneColor.withAlpha(isDark ? 60 : 35),
                    width: 1,
                  ),
                ),
                child: Icon(
                  policy.icon,
                  color: toneColor,
                  size: isSmall ? 20 : 22,
                ),
              ),
              Gap(isSmall ? 10 : 12),

              // Company & Category Title
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      policy.companyName.isNotEmpty ? policy.companyName : policy.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontSize: isSmall ? 13.5 : 14.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Gap(3),
                    Row(
                      children: [
                        // Category Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: toneColor.withAlpha(isDark ? 40 : 20),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            policy.policyCategory.toUpperCase(),
                            style: TextStyle(
                              color: toneColor,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                        const Gap(6),
                        Expanded(
                          child: Text(
                            policy.policyType,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
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

              // Status Badge with glowing dot
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(isDark ? 35 : 18),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: statusColor.withAlpha(isDark ? 60 : 35),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const Gap(5),
                    Text(
                      policy.status,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // ─── Divider ───
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 11),
            child: Divider(
              height: 1,
              thickness: 1,
              color: isDark ? Colors.white.withAlpha(14) : Colors.black.withAlpha(12),
            ),
          ),

          // ─── Insured Person & Policy Number ───
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User / Insured Icon
              Icon(
                Icons.person_rounded,
                size: 16,
                color: toneColor,
              ),
              const Gap(6),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasInsuredName ? policy.insuredName : 'Insured Policyholder',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontSize: isSmall ? 13.5 : 14.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Gap(2),
                    Text(
                      'Policy #${policy.policyNumber ?? policy.id}',
                      style: TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Vehicle Registration / Asset Tag
              if (hasVehicleNumber) ...[
                const Gap(8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(
                      color: isDark ? Colors.white24 : Colors.black12,
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.directions_car_filled_rounded,
                        size: 13,
                        color: toneColor,
                      ),
                      const Gap(4),
                      Text(
                        policy.vehicleNumber!,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),

          // Optional Make / Model sub-line
          if (hasMakeModel) ...[
            const Gap(4),
            Padding(
              padding: const EdgeInsets.only(left: 22),
              child: Text(
                policy.makeModel!,
                style: TextStyle(
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],

          const Gap(12),

          // ─── Key Metrics Grid: Sum Insured, Expiry Date, Total Premium ───
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A).withAlpha(160) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.white.withAlpha(15) : Colors.black.withAlpha(12),
                width: 0.8,
              ),
            ),
            child: Row(
              children: [
                // Sum Insured / IDV
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SUM INSURED',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                        ),
                      ),
                      const Gap(2),
                      Text(
                        hasSumInsured ? _formatAmount(policy.sumInsured) : 'Covered',
                        style: TextStyle(
                          fontSize: isSmall ? 11.5 : 12.5,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Vertical Divider
                Container(
                  height: 24,
                  width: 1,
                  color: isDark ? Colors.white12 : Colors.black12,
                ),

                // Expiry Date
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VALID TILL',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.4,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                        const Gap(2),
                        Text(
                          hasExpiry ? _formatDate(policy.expiryDate) : 'Ongoing',
                          style: TextStyle(
                            fontSize: isSmall ? 11.5 : 12.5,
                            fontWeight: FontWeight.w700,
                            color: isDue ? statusColor : (isDark ? Colors.white : const Color(0xFF0F172A)),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),

                // Vertical Divider
                Container(
                  height: 24,
                  width: 1,
                  color: isDark ? Colors.white12 : Colors.black12,
                ),

                // Total Premium
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PREMIUM',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.4,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                        const Gap(2),
                        Text(
                          policy.price.replaceAll('/yr', ''),
                          style: TextStyle(
                            fontSize: isSmall ? 12 : 13,
                            fontWeight: FontWeight.w900,
                            color: toneColor,
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
          ),

          const Gap(10),

          // ─── Bottom Footer: View Details & Quick PDF Action ───
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // "View Policy Details" link
              InkWell(
                onTap: openDetails,
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'View Policy Details',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.primaryBlueDark : AppColors.primaryBlue,
                        ),
                      ),
                      const Gap(4),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        size: 10,
                        color: isDark ? AppColors.primaryBlueDark : AppColors.primaryBlue,
                      ),
                    ],
                  ),
                ),
              ),

              // PDF Download Button (if document is available)
              if (policy.hasPdf)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () {
                      ApiService.downloadDocument(
                        context,
                        policy.id,
                        kind: 'policy',
                        title: policy.policyNumber ?? policy.name,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1D4ED8).withAlpha(isDark ? 40 : 18),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFF1D4ED8).withAlpha(isDark ? 80 : 40),
                          width: 0.8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(
                            Icons.download_rounded,
                            size: 13,
                            color: Color(0xFF2563EB),
                          ),
                          Gap(4),
                          Text(
                            'PDF',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
