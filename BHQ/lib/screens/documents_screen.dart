import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../services/crm_data_provider.dart';

class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

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
              'Documents',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    letterSpacing: -0.5,
                  ),
            ),
            const Gap(2),
            Text(
              'Official policy schedules & tax certificates from CRM',
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
                          Icons.folder_open_outlined,
                          size: 40,
                          color: isDark ? Colors.white30 : const Color(0xFFCBD5E1),
                        ),
                        const Gap(12),
                        Text(
                          'No documents uploaded yet in CRM.',
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
                              color: const Color(0xFF1D4ED8).withAlpha(15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.picture_as_pdf_outlined,
                              color: Color(0xFF1D4ED8),
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
                                  'Policy Schedule • #${policy.policyNumber ?? policy.id}',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: isDark ? Colors.white60 : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Downloading Policy Schedule for ${policy.policyNumber ?? policy.name}...'),
                                  backgroundColor: const Color(0xFF10B981),
                                ),
                              );
                            },
                            icon: const Icon(Icons.download_rounded, size: 14),
                            label: const Text(
                              'Download',
                              style: TextStyle(fontSize: 11),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
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
                child: Text('Unable to load documents: $err'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

