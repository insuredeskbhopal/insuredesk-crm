import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../models/policy.dart';
import '../widgets/policy_card.dart';
import '../widgets/common_dialogs.dart';
import '../services/crm_data_provider.dart';

class PoliciesScreen extends ConsumerStatefulWidget {
  const PoliciesScreen({super.key});

  @override
  ConsumerState<PoliciesScreen> createState() => _PoliciesScreenState();
}

class _PoliciesScreenState extends ConsumerState<PoliciesScreen> {
  int _selectedTab = 0;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'All Policies',
    'Health',
    'Motor',
    'Life',
    'Property',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Policy> _filterPolicies(List<Policy> allPolicies) {
    return allPolicies.where((policy) {
      final matchesSearch = policy.name
              .toLowerCase()
              .contains(_searchQuery.toLowerCase()) ||
          policy.id.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          policy.subtitle.toLowerCase().contains(_searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (_selectedTab == 1) return policy.icon == Icons.favorite_rounded;
      if (_selectedTab == 2) return policy.icon == Icons.directions_car_rounded;
      if (_selectedTab == 3) return policy.icon == Icons.shield_rounded;
      if (_selectedTab == 4) return policy.icon == Icons.business_rounded;

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSmall = MediaQuery.of(context).size.width < 600;
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
            // Page Title & Verified Badge Header
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'My Policies',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            fontSize: isSmall ? 20 : 22,
                            letterSpacing: -0.5,
                          ),
                    ),
                    const Gap(10),
                    InkWell(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Your policy portfolio is connected and synced live with CRM database.'),
                            backgroundColor: Color(0xFF10B981),
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withAlpha(isDark ? 30 : 15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFF10B981).withAlpha(40),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle_rounded, size: 13, color: Color(0xFF10B981)),
                            Gap(5),
                            Text(
                              'Verified & Live',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const Gap(3),
                policiesAsync.when(
                  data: (list) => Text(
                    '${list.length} Active Policies • Real-Time Database Sync',
                    style: TextStyle(
                      color: isDark ? Colors.white60 : const Color(0xFF64748B),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  loading: () => const Text('Connecting to CRM database...'),
                  error: (error, stack) => const Text('Offline Mode'),
                ),
              ],
            ),

            const Gap(16),

            // Search Bar
            TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val),
              style: const TextStyle(fontSize: 13.5),
              decoration: InputDecoration(
                hintText: 'Search by policy number or insurer...',
                hintStyle: TextStyle(
                  color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                  fontSize: 13,
                ),
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                    color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                    color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                  ),
                ),
              ),
            ),

            const Gap(12),

            // Category Filter Pills
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: List.generate(_categories.length, (idx) {
                  final isSelected = _selectedTab == idx;
                  
                  final categoryIcons = [
                    Icons.grid_view_rounded,
                    Icons.favorite_rounded,
                    Icons.directions_car_rounded,
                    Icons.shield_rounded,
                    Icons.business_rounded,
                  ];

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () => setState(() => _selectedTab = idx),
                      borderRadius: BorderRadius.circular(20),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF1D4ED8)
                              : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF1D4ED8)
                                : (isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: const Color(0xFF1D4ED8).withAlpha(50),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              categoryIcons[idx],
                              size: 14,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark ? Colors.white60 : const Color(0xFF64748B)),
                            ),
                            const Gap(6),
                            Text(
                              _categories[idx],
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : (isDark ? Colors.white70 : const Color(0xFF475569)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Gap(16),

            // Live Policies List or Clean Empty State
            policiesAsync.when(
              data: (allPolicies) {
                final filtered = _filterPolicies(allPolicies);
                if (filtered.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(
                          Icons.shield_outlined,
                          size: 40,
                          color: isDark ? Colors.white30 : const Color(0xFFCBD5E1),
                        ),
                        const Gap(12),
                        Text(
                          'You don\'t have any active policies in this category.',
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
                  itemCount: filtered.length,
                  separatorBuilder: (context, index) => const Gap(12),
                  itemBuilder: (context, index) {
                    final policy = filtered[index];
                    return PolicyCard(
                      policy: policy,
                      onTap: () {
                        CommonDialogs.showPolicyDetailsModal(context, policy);
                      },
                    );
                  },
                );
              },
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text('Could not load live policies: $err'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
