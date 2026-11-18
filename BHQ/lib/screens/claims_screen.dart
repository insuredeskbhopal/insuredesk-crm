import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';

import '../models/claim.dart';
import '../widgets/app_loader.dart';
import '../widgets/common_dialogs.dart';
import '../services/crm_data_provider.dart';

class ClaimsScreen extends ConsumerStatefulWidget {
  const ClaimsScreen({super.key});

  @override
  ConsumerState<ClaimsScreen> createState() => _ClaimsScreenState();
}

class _ClaimsScreenState extends ConsumerState<ClaimsScreen> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final claimsAsync = ref.watch(liveClaimsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(liveClaimsProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Claims',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 26,
                          letterSpacing: -0.6,
                          color: isDark ? Colors.white : const Color(0xFF000000),
                        ),
                      ),
                      const Gap(3),
                      Text(
                        'Live tracking & settlement updates',
                        style: TextStyle(
                          color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    final policies = ref.read(livePoliciesProvider).value ?? [];
                    CommonDialogs.showRegisterClaimModal(
                      context,
                      availablePolicies: policies,
                      onClaimFiled: () => ref.invalidate(liveClaimsProvider),
                    );
                  },
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: const Text('File Claim'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF007AFF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),

            const Gap(20),

            claimsAsync.when(
              data: (claimsList) {
                if (claimsList.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                        width: 0.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(isDark ? 25 : 6),
                          blurRadius: 12,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: const Color(0xFF34C759).withAlpha(isDark ? 40 : 25),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.verified_user_rounded,
                            size: 28,
                            color: Color(0xFF34C759),
                          ),
                        ),
                        const Gap(16),
                        Text(
                          'No Active Claims on File',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                            color: isDark ? Colors.white : const Color(0xFF000000),
                          ),
                        ),
                        const Gap(6),
                        Text(
                          'All your policies are in good standing with zero open disputes. If you experience vehicle damage, accident, or hospitalization, we provide instant 24x7 cashless assistance.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12.5,
                            height: 1.45,
                            color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                          ),
                        ),
                        const Gap(20),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            _buildEmergencyChip('Cashless Garage Network', Icons.car_repair_rounded, isDark),
                            _buildEmergencyChip('24x7 Roadside Assistance', Icons.support_agent_rounded, isDark),
                            _buildEmergencyChip('Instant Digital Filing', Icons.bolt_rounded, isDark),
                          ],
                        ),
                        const Gap(20),
                        ElevatedButton.icon(
                          onPressed: () {
                            final policies = ref.read(livePoliciesProvider).value ?? [];
                            CommonDialogs.showRegisterClaimModal(
                              context,
                              availablePolicies: policies,
                              onClaimFiled: () => ref.invalidate(liveClaimsProvider),
                            );
                          },
                          icon: const Icon(Icons.add_circle_outline_rounded, size: 16),
                          label: const Text('Initiate Claim Now'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1D4ED8),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: claimsList.length,
                  separatorBuilder: (context, index) => const Gap(16),
                  itemBuilder: (context, idx) {
                    final claim = claimsList[idx];
                    return _buildClientClaimCard(context, claim, isDark);
                  },
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: AppLoader(
                  message: 'Retrieving IRDAI claim settlements...',
                  subtitle: 'Direct cashless processing network',
                ),
              ),
              error: (err, _) => Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.cloud_off_rounded, size: 36, color: Color(0xFF94A3B8)),
                      const Gap(12),
                      Text(
                        'Unable to load claims',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                      ),
                      const Gap(4),
                      Text(
                        'Please check your internet connection or try again.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
                      ),
                      const Gap(16),
                      ElevatedButton.icon(
                        onPressed: () => ref.refresh(liveClaimsProvider),
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text('Retry Connection'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D4ED8),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClientClaimCard(BuildContext context, Claim claim, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 20 : 6),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header: Claim ID, Policy & Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Claim #${claim.id}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                    const Gap(3),
                    Text(
                      'Policy #${claim.policyNo} • ${claim.insurer}',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? Colors.white60 : const Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Gap(8),
              _buildClientStatusBadge(claim.status),
            ],
          ),

          const Gap(16),

          // 2. Claim Timeline Header & Progress Tracker
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Claim Progress Timeline',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                  color: Color(0xFF475569),
                ),
              ),
              Text(
                _getStepStatusText(claim.status),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1D4ED8),
                ),
              ),
            ],
          ),
          const Gap(12),
          _buildProgressTrackerTimeline(claim.status, isDark),

          const Gap(18),

          // 3. Claim Amount Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isDark ? Colors.white10 : const Color(0xFFF1F5F9),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Claim Amount',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
                Text(
                  claim.claimAmount,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),

          const Gap(14),

          // 4. Clean 50/50 Full-Width Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => CommonDialogs.showClaimDocumentUploadModal(context, claim.id),
                  icon: const Icon(Icons.upload_file_rounded, size: 14),
                  label: const Text('Upload Docs', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    side: BorderSide(
                      color: isDark ? Colors.white24 : const Color(0xFFCBD5E1),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const Gap(10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => CommonDialogs.showClaimSummaryModal(context, claim),
                  icon: const Icon(Icons.download_rounded, size: 14),
                  label: const Text('View Summary', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
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

  String _getStepStatusText(ClaimStatus status) {
    switch (status) {
      case ClaimStatus.cashlessSettled:
        return 'Step 4 of 4 (Settled)';
      case ClaimStatus.approved:
        return 'Step 3 of 4 (Approved)';
      case ClaimStatus.surveyorAssigned:
        return 'Step 2 of 4 (Inspecting)';
      case ClaimStatus.docsUnderReview:
        return 'Step 2 of 4 (In Review)';
      case ClaimStatus.registered:
      default:
        return 'Step 1 of 4 (Registered)';
    }
  }

  Widget _buildProgressTrackerTimeline(ClaimStatus status, bool isDark) {
    int activeStep = 1;
    switch (status) {
      case ClaimStatus.registered:
        activeStep = 1;
        break;
      case ClaimStatus.docsUnderReview:
      case ClaimStatus.surveyorAssigned:
        activeStep = 2;
        break;
      case ClaimStatus.approved:
        activeStep = 3;
        break;
      case ClaimStatus.cashlessSettled:
        activeStep = 4;
        break;
      default:
        activeStep = 1;
        break;
    }

    final steps = [
      {'label': 'Registered', 'icon': Icons.check_circle_rounded},
      {'label': 'Docs Uploaded', 'icon': Icons.description_rounded},
      {'label': 'Under Review', 'icon': Icons.hourglass_top_rounded},
      {'label': 'Settled', 'icon': Icons.verified_user_rounded},
    ];

    return Row(
      children: List.generate(steps.length, (idx) {
        final isCompleted = (idx + 1) <= activeStep;
        final color = isCompleted
            ? const Color(0xFF10B981)
            : (isDark ? Colors.white24 : const Color(0xFFCBD5E1));

        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: isCompleted ? color : Colors.transparent,
                            shape: BoxShape.circle,
                            border: Border.all(color: color, width: 1.5),
                          ),
                          child: Center(
                            child: Icon(
                              steps[idx]['icon'] as IconData,
                              size: 10,
                              color: isCompleted ? Colors.white : color,
                            ),
                          ),
                        ),
                        if (idx < steps.length - 1)
                          Expanded(
                            child: Container(
                              height: 2,
                              margin: const EdgeInsets.symmetric(horizontal: 2),
                              color: isCompleted
                                  ? const Color(0xFF10B981)
                                  : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                            ),
                          ),
                      ],
                    ),
                    const Gap(4),
                    Text(
                      steps[idx]['label'] as String,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: isCompleted ? FontWeight.w700 : FontWeight.w500,
                        color: isCompleted
                            ? (isDark ? Colors.white : const Color(0xFF0F172A))
                            : (isDark ? Colors.white38 : const Color(0xFF94A3B8)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildClientStatusBadge(ClaimStatus status) {
    Color color = const Color(0xFF1D4ED8);
    String label = 'Under Review';

    switch (status) {
      case ClaimStatus.cashlessSettled:
        color = const Color(0xFF10B981);
        label = 'Settlement Released';
        break;
      case ClaimStatus.approved:
        color = const Color(0xFF0D9488);
        label = 'Approved';
        break;
      case ClaimStatus.surveyorAssigned:
        color = const Color(0xFFD97706);
        label = 'Inspection Pending';
        break;
      case ClaimStatus.docsUnderReview:
        color = const Color(0xFF7C3AED);
        label = 'Under Review';
        break;
      case ClaimStatus.registered:
      default:
        color = const Color(0xFF1D4ED8);
        label = 'Claim Registered';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildEmergencyChip(String label, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF2563EB)),
          const Gap(5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : const Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }
}
