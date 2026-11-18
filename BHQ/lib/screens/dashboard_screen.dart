import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../widgets/ai_advisor_card.dart';
import '../widgets/app_loader.dart';
import '../widgets/common_dialogs.dart';
import '../widgets/kpi_grid.dart';
import '../widgets/policy_card.dart';
import '../widgets/quick_actions.dart';
import '../services/crm_data_provider.dart';
import '../models/policy.dart';
import 'policy_details_screen.dart';

class DashboardScreen extends ConsumerWidget {
  final ValueChanged<int>? onNavigate;

  const DashboardScreen({super.key, this.onNavigate});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 400;
    final policiesAsync = ref.watch(livePoliciesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(livePoliciesProvider);
        ref.invalidate(liveClaimsProvider);
        ref.invalidate(liveProfileProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.fromLTRB(isSmall ? 14 : 18, 14, isSmall ? 14 : 18, 80),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── 1. Apple Wallet-Style Hero Insurance Pass ───
            Builder(
              builder: (context) {
                final policies = policiesAsync.value ?? [];
                if (policies.isEmpty) {
                  return _AppleWalletEmptyPass(isDark: isDark);
                }

                final duePolicy = policies.where((p) =>
                    p.status.toLowerCase().contains('due') ||
                    p.status.toLowerCase().contains('renewal')).firstOrNull;
                final activePolicy = duePolicy ??
                    policies.where((p) => p.isActive).firstOrNull ??
                    policies.first;
                final isDue = duePolicy != null;

                return _AppleWalletHeroCard(
                  policy: activePolicy,
                  isDue: isDue,
                  isDark: isDark,
                  onViewTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PolicyDetailsScreen(policy: activePolicy),
                      ),
                    );
                  },
                  onRenewTap: () {
                    CommonDialogs.showPayPremiumModal(context);
                  },
                );
              },
            ),

            const Gap(18),

            // ─── 2. Apple Health-Style Telemetry Summary ───
            const KpiGrid(),

            const Gap(22),

            // ─── 3. Apple Quick Actions ───
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'QUICK ACTIONS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.6,
                      color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                    ),
                  ),
                ],
              ),
            ),
            const Gap(10),
            QuickActionsGrid(
              onActionTap: (action) {
                if (action == 'File Claim') {
                  final policies = ref.read(livePoliciesProvider).value ?? [];
                  CommonDialogs.showRegisterClaimModal(
                    context,
                    availablePolicies: policies,
                    onClaimFiled: () => ref.invalidate(liveClaimsProvider),
                  );
                } else if (action == 'Download Policy' || action == 'Download ID') {
                  CommonDialogs.showDownloadPolicyModal(context);
                } else if (action == 'Pay Premium' || action == 'Renew Policy' || action == 'Renew') {
                  CommonDialogs.showPayPremiumModal(context);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$action selected.')),
                  );
                }
              },
            ),

            const Gap(22),

            // ─── 4. Advisor Insights Carousel ───
            AiAdvisorCard(
              onActionTap: (action) {
                if (action.contains('Tax') || action.contains('Download')) {
                  CommonDialogs.showDownloadPolicyModal(context);
                } else if (action.contains('Discount') || action.contains('Renew') || action.contains('Claim')) {
                  CommonDialogs.showPayPremiumModal(context);
                } else if (action.contains('Shield') || action.contains('Activate')) {
                  CommonDialogs.showEndorsementRequestModal(
                    context,
                    defaultTitle: 'Request Cyber & Digital Theft Protection Add-on',
                    defaultDesc: 'Customer requested activation of Cyber Theft Shield add-on cover on their active policy portfolio.',
                  );
                } else if (action.contains('Analyze')) {
                  CommonDialogs.showComparePlansDialog(context);
                } else {
                  CommonDialogs.showEndorsementRequestModal(
                    context,
                    defaultTitle: 'Advisor Assistance: $action',
                    defaultDesc: 'Customer requested advisory assistance regarding: $action.',
                  );
                }
              },
            ),

            const Gap(22),

            // ─── 5. Active Policies Section ───
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'PORTFOLIO POLICIES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.6,
                      color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                    ),
                  ),
                  TextButton(
                    onPressed: () => onNavigate?.call(1),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'See All',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF007AFF), // Apple Blue
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Gap(10),

            policiesAsync.when(
              data: (policiesList) {
                if (policiesList.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                        width: 0.5,
                      ),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.shield_outlined,
                          size: 36,
                          color: Color(0xFF8E8E93),
                        ),
                        const Gap(8),
                        const Text(
                          'No Policies Registered Yet',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Gap(4),
                        Text(
                          'Your insurance coverage will appear here automatically.',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                }

                final activePolicies = policiesList.where((p) => p.isActive || p.isDueForRenewal).toList();
                final displayList = (activePolicies.isNotEmpty ? activePolicies : policiesList).take(3).toList();
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayList.length,
                  separatorBuilder: (context, index) => const Gap(10),
                  itemBuilder: (context, index) {
                    return PolicyCard(
                      policy: displayList[index],
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PolicyDetailsScreen(policy: displayList[index]),
                          ),
                        );
                      },
                    );
                  },
                );
              },
              loading: () => const AppPolicySkeleton(count: 2),
              error: (error, stack) => Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                    width: 0.5,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_rounded, size: 28, color: Color(0xFF8E8E93)),
                    const Gap(8),
                    const Text(
                      'Unable to load your active policies.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Color(0xFF8E8E93)),
                    ),
                    const Gap(10),
                    TextButton.icon(
                      onPressed: () => ref.refresh(livePoliciesProvider),
                      icon: const Icon(Icons.refresh_rounded, size: 14),
                      label: const Text('Retry', style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Apple Wallet-style Digital Insurance Pass Hero Card
class _AppleWalletHeroCard extends StatelessWidget {
  final Policy policy;
  final bool isDue;
  final bool isDark;
  final VoidCallback onViewTap;
  final VoidCallback onRenewTap;

  const _AppleWalletHeroCard({
    required this.policy,
    required this.isDue,
    required this.isDark,
    required this.onViewTap,
    required this.onRenewTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = isDue ? const Color(0xFFFF9500) : const Color(0xFF34C759);
    final statusText = isDue ? 'RENEWAL DUE' : 'ACTIVE PROTECTION';
    final vehicleNum = policy.vehicleNumber?.trim();
    final hasVehicle = vehicleNum != null && vehicleNum.isNotEmpty;
    final policyNum = policy.policyNumber?.trim() ?? policy.id;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? const [
                  Color(0xFF1C1C1E),
                  Color(0xFF2C2C2E),
                ]
              : const [
                  Color(0xFF0F172A), // Premium Deep Midnight
                  Color(0xFF1E293B),
                ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF007AFF).withValues(alpha: isDark ? 0.20 : 0.15),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.50 : 0.20),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(
          color: Colors.white.withValues(alpha: isDark ? 0.18 : 0.25),
          width: 1.0,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          onTap: onViewTap,
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Insurer Name + Status Pill
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(25),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.verified_user_rounded,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                          const Gap(10),
                          Expanded(
                            child: Text(
                              policy.companyName.isNotEmpty
                                  ? policy.companyName
                                  : 'BimaHeadquarter Pass',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                                letterSpacing: -0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Gap(8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: statusColor.withAlpha(35),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: statusColor.withAlpha(80),
                          width: 0.5,
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
                            ),
                          ),
                          const Gap(5),
                          Text(
                            statusText,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const Gap(16),

                // Middle: Policy Title & Key Details
                Text(
                  policy.name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const Gap(4),
                Text(
                  hasVehicle ? 'Vehicle No: $vehicleNum' : 'Policy No: $policyNum',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    fontFamily: 'monospace',
                    color: Colors.white70,
                    letterSpacing: 0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                const Gap(16),

                // Bottom Meta: Premium / Sum Insured + Action CTA
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SUM INSURED / VALUE',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                            color: Colors.white60,
                          ),
                        ),
                        const Gap(2),
                        Text(
                          policy.sumInsured ?? policy.price,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: isDue ? onRenewTap : onViewTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDue
                            ? const Color(0xFFFF9500)
                            : Colors.white.withAlpha(35),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(
                            color: isDue
                                ? Colors.transparent
                                : Colors.white.withAlpha(60),
                            width: 0.5,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            isDue ? 'Renew Now' : 'View Pass',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Gap(4),
                          const Icon(Icons.arrow_forward_rounded, size: 13),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Empty state when no policies are enrolled
class _AppleWalletEmptyPass extends StatelessWidget {
  final bool isDark;

  const _AppleWalletEmptyPass({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
          width: 0.5,
        ),
      ),
      child: const Row(
        children: [
          Icon(
            Icons.shield_outlined,
            color: Color(0xFF007AFF),
            size: 24,
          ),
          Gap(14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome to BimaHeadquarter',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Gap(2),
                Text(
                  'Your digital policy passes will be available here automatically.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF8E8E93),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
