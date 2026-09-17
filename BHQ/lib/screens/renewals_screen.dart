import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../widgets/common_dialogs.dart';
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
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    letterSpacing: -0.5,
                  ),
            ),
            const Gap(2),
            Text(
              'Policies tracked live from CRM database',
              style: TextStyle(
                color: isDark ? Colors.white60 : const Color(0xFF64748B),
                fontSize: 13,
              ),
            ),
            const Gap(20),
            policiesAsync.when(
              data: (allPolicies) {
                final upcomingRenewals = allPolicies.where((p) {
                  final s = p.status.toLowerCase();
                  return s.contains('due') || s.contains('renewal') || s.contains('pending');
                }).toList();

                final displayList = upcomingRenewals.isNotEmpty ? upcomingRenewals : allPolicies;

                if (displayList.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(
                          Icons.check_circle_outline_rounded,
                          size: 40,
                          color: isDark ? Colors.white30 : const Color(0xFFCBD5E1),
                        ),
                        const Gap(12),
                        Text(
                          'No policies currently due for renewal.',
                          style: TextStyle(
                            fontSize: 13.5,
                            color: isDark ? Colors.white60 : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayList.length,
                  separatorBuilder: (context, index) => const Gap(16),
                  itemBuilder: (context, idx) {
                    final policy = displayList[idx];
                    final isDue = policy.status.toLowerCase().contains('due') || policy.status.toLowerCase().contains('renewal');

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      policy.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14.5,
                                      ),
                                    ),
                                    const Gap(3),
                                    Text(
                                      policy.subtitle,
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: isDark ? Colors.white60 : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Gap(8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: (isDue ? const Color(0xFFD97706) : const Color(0xFF10B981)).withAlpha(20),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  policy.expiryDate?.isNotEmpty == true ? 'Expiry: ${policy.expiryDate}' : policy.status,
                                  style: TextStyle(
                                    color: isDue ? const Color(0xFFD97706) : const Color(0xFF10B981),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Gap(12),
                          const Divider(height: 1),
                          const Gap(12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Renewal Premium',
                                    style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                  ),
                                  Text(
                                    policy.price,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1D4ED8),
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withAlpha(15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.shield_rounded, size: 12, color: Color(0xFF10B981)),
                                    Gap(4),
                                    Text(
                                      'Synced with CRM',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Gap(14),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () {
                                    CommonDialogs.showDownloadPolicyModal(context);
                                  },
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: const Text('Download Policy', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                                ),
                              ),
                              const Gap(8),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () => CommonDialogs.showPayPremiumModal(context),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF1D4ED8),
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: const Text('Renew Policy', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (err, stack) => Center(
                child: Text('Unable to load renewals: $err'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

