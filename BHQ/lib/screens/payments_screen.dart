import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../services/api_service.dart';
import '../services/crm_data_provider.dart';

class PaymentsScreen extends ConsumerWidget {
  const PaymentsScreen({super.key});

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
              'Payments',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    letterSpacing: -0.5,
                  ),
            ),
            const Gap(2),
            Text(
              'Premium ledger & payment receipts from CRM',
              style: TextStyle(
                color: isDark ? Colors.white60 : const Color(0xFF64748B),
                fontSize: 13,
              ),
            ),
            const Gap(20),
            policiesAsync.when(
              data: (policies) {
                if (policies.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(
                          Icons.credit_card_off_outlined,
                          size: 40,
                          color: isDark ? Colors.white30 : const Color(0xFFCBD5E1),
                        ),
                        const Gap(12),
                        Text(
                          'No payment history found in CRM.',
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
                  itemCount: policies.length,
                  separatorBuilder: (context, index) => const Gap(10),
                  itemBuilder: (context, idx) {
                    final policy = policies[idx];
                    final isDue = policy.status.toLowerCase().contains('due') || policy.status.toLowerCase().contains('renewal');

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: (!isDue ? const Color(0xFF10B981) : const Color(0xFFD97706)).withAlpha(20),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              !isDue ? Icons.check_circle_outline_rounded : Icons.pending_actions_rounded,
                              color: !isDue ? const Color(0xFF10B981) : const Color(0xFFD97706),
                              size: 20,
                            ),
                          ),
                          const Gap(14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  policy.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13.5,
                                  ),
                                ),
                                const Gap(2),
                                Text(
                                  'Policy #${policy.policyNumber ?? policy.id} • ${policy.expiryDate?.isNotEmpty == true ? policy.expiryDate : policy.status}',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: isDark ? Colors.white60 : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                policy.price,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              const Gap(4),
                              OutlinedButton(
                                onPressed: () {
                                  if (!isDue) {
                                    ApiService.downloadDocument(
                                      context,
                                      policy.id,
                                      kind: 'receipt',
                                      title: 'Receipt ${policy.policyNumber ?? policy.name}',
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Opening payment gateway...'),
                                      ),
                                    );
                                  }
                                },
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ),
                                child: Text(
                                  !isDue ? 'Receipt' : 'Pay Now',
                                  style: const TextStyle(fontSize: 10.5),
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
                child: Text('Unable to load payments: $err'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
