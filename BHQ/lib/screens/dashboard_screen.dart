import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../widgets/ai_advisor_card.dart';
import '../widgets/common_dialogs.dart';
import '../widgets/kpi_grid.dart';
import '../widgets/policy_card.dart';
import '../widgets/quick_actions.dart';
import '../services/crm_data_provider.dart';

class DashboardScreen extends ConsumerWidget {
  final ValueChanged<int>? onNavigate;

  const DashboardScreen({super.key, this.onNavigate});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 480;
    final policiesAsync = ref.watch(livePoliciesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(livePoliciesProvider);
        ref.invalidate(liveClaimsProvider);
        ref.invalidate(liveProfileProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.fromLTRB(isSmall ? 12 : 16, 12, isSmall ? 12 : 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Policy Attention Alert Banner (Dynamic from CRM)
            Builder(
              builder: (context) {
                final policies = policiesAsync.value ?? [];
                if (policies.isEmpty) {
                  return Container(
                    padding: EdgeInsets.all(isSmall ? 12 : 16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? Colors.white10 : const Color(0xFFBFDBFE),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.verified_user_outlined,
                          color: Color(0xFF2563EB),
                          size: 20,
                        ),
                        Gap(isSmall ? 8 : 12),
                        Expanded(
                          child: Text(
                            'Connected live to BimaHeadquarter CRM. Your active policies will be listed below.',
                            style: TextStyle(
                              fontSize: isSmall ? 11 : 12,
                              color: isDark ? Colors.white70 : const Color(0xFF1E40AF),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final duePolicy = policies.where((p) => p.status.toLowerCase().contains('due') || p.status.toLowerCase().contains('renewal')).firstOrNull;
                final alertPolicy = duePolicy ?? policies.first;
                final isDue = duePolicy != null;

                return Container(
                  padding: EdgeInsets.all(isSmall ? 12 : 16),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF1E293B)
                        : (isDue ? const Color(0xFFFFFBEB) : const Color(0xFFF0FDF4)),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark
                          ? Colors.white10
                          : (isDue ? const Color(0xFFFDE68A) : const Color(0xFFBBF7D0)),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isDue ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded,
                        color: isDue ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                        size: 18,
                      ),
                      Gap(isSmall ? 8 : 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isDue ? 'Policy Renewal Upcoming' : 'Policy Protection Active',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: isSmall ? 12 : 13,
                                color: isDue ? const Color(0xFF92400E) : const Color(0xFF166534),
                              ),
                            ),
                            const Gap(2),
                            Text(
                              '${alertPolicy.name} • ${alertPolicy.price}',
                              style: TextStyle(
                                fontSize: isSmall ? 11 : 12,
                                color: isDark
                                    ? Colors.white70
                                    : (isDue ? const Color(0xFF78350F) : const Color(0xFF14532D)),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const Gap(8),
                      ElevatedButton(
                        onPressed: () => CommonDialogs.showPayPremiumModal(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isDue ? const Color(0xFFD97706) : const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.symmetric(
                            horizontal: isSmall ? 8 : 12,
                            vertical: isSmall ? 6 : 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(isDue ? 'Renew Policy' : 'View Policy', style: TextStyle(fontSize: isSmall ? 11 : 12)),
                      ),
                    ],
                  ),
                );
              },
            ),

            Gap(isSmall ? 14 : 20),

            // Insurance Portfolio Summary Stats
            const KpiGrid(),

            Gap(isSmall ? 14 : 20),

            // Advisor Offers Carousel
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

            Gap(isSmall ? 16 : 24),

            // Actions Header: "What would you like to do?"
            Text(
              'What would you like to do?',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: isSmall ? 14 : 15,
              ),
            ),
            Gap(isSmall ? 10 : 12),
            QuickActionsGrid(
              onActionTap: (action) {
                if (action == 'File Claim') {
                  CommonDialogs.showRegisterClaimModal(context);
                } else if (action == 'Download Policy') {
                  CommonDialogs.showDownloadPolicyModal(context);
                } else if (action == 'Pay Premium' || action == 'Renew Policy') {
                  CommonDialogs.showPayPremiumModal(context);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$action selected.')),
                  );
                }
              },
            ),

            Gap(isSmall ? 16 : 24),

            // Active Policies Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'My Active Policies',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
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
                    'View All',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1D4ED8),
                    ),
                  ),
                ),
              ],
            ),
            const Gap(12),

            policiesAsync.when(
              data: (policiesList) {
                final displayList = policiesList.take(3).toList();
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayList.length,
                  separatorBuilder: (context, index) => const Gap(10),
                  itemBuilder: (context, index) {
                    return PolicyCard(
                      policy: displayList[index],
                      onTap: () {
                        CommonDialogs.showDownloadPolicyModal(context);
                      },
                    );
                  },
                );
              },
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (error, stack) => Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                  ),
                ),
                child: const Center(
                  child: Text(
                    'No active policies found. Policies issued in CRM will automatically appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
