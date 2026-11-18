import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../widgets/app_loader.dart';
import '../widgets/common_dialogs.dart';
import '../widgets/policy_card.dart';
import '../services/crm_data_provider.dart';

class RenewalsScreen extends ConsumerWidget {
  const RenewalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final policiesAsync = ref.watch(livePoliciesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(livePoliciesProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Renewals',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 26,
                letterSpacing: -0.6,
                color: isDark ? Colors.white : const Color(0xFF000000),
              ),
            ),
            const Gap(3),
            Text(
              'Track expiry dates and manage policy renewals',
              style: TextStyle(
                color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                fontSize: 13,
                fontWeight: FontWeight.w400,
              ),
            ),
            const Gap(18),
            policiesAsync.when(
              data: (allPolicies) {
                final upcomingRenewals = allPolicies.where((p) {
                  final s = p.status.toLowerCase();
                  return s.contains('due') || s.contains('renewal') || s.contains('expired') || s.contains('pending');
                }).toList();

                if (upcomingRenewals.isEmpty) {
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
                            Icons.check_circle_rounded,
                            size: 28,
                            color: Color(0xFF34C759),
                          ),
                        ),
                        const Gap(16),
                        Text(
                          'All Policies Are Active',
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
                          'None of your ${allPolicies.length} tracked policies are currently due for renewal. We monitor your coverage 24x7 and will notify you 30 days prior to expiry.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12.5,
                            height: 1.45,
                            color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
                          ),
                        ),
                        const Gap(18),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.shield_rounded, size: 14, color: Color(0xFF007AFF)),
                              const Gap(6),
                              Text(
                                '${allPolicies.length} Policies Monitored',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : const Color(0xFF1C1C1E),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: upcomingRenewals.length,
                  separatorBuilder: (context, index) => const Gap(14),
                  itemBuilder: (context, idx) {
                    final policy = upcomingRenewals[idx];
                    return Column(
                      children: [
                        PolicyCard(policy: policy),
                        const Gap(8),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => CommonDialogs.showPayPremiumModal(context),
                            icon: const Icon(Icons.credit_card_rounded, size: 15),
                            label: Text('Instant Renewal (${policy.price})'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF007AFF),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                );
              },
              loading: () => const AppPolicySkeleton(count: 2),
              error: (err, stack) => Center(
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
                        'Unable to load renewals',
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
                        onPressed: () => ref.refresh(livePoliciesProvider),
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
}

