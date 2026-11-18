import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../models/policy.dart';
import 'policy_details_screen.dart';
import '../widgets/app_loader.dart';
import '../widgets/policy_card.dart';
import '../services/crm_data_provider.dart';

class PoliciesScreen extends ConsumerStatefulWidget {
  const PoliciesScreen({super.key});

  @override
  ConsumerState<PoliciesScreen> createState() => _PoliciesScreenState();
}

class _PoliciesScreenState extends ConsumerState<PoliciesScreen> {
  int _statusTab = 0; // 0 = Active Only, 1 = All Policies, 2 = Expired
  int _selectedTab = 0;
  String _searchQuery = '';
  bool _isCompactView = false;
  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'All Categories',
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
      // 1. Status Filter: In Active tab, ONLY show active policies!
      if (_statusTab == 0 && !policy.isActive && !policy.isDueForRenewal) {
        return false;
      }
      if (_statusTab == 2 && !policy.isExpired) {
        return false;
      }

      final q = _searchQuery.toLowerCase().trim();
      if (q.isNotEmpty) {
        final matchesSearch =
            policy.name.toLowerCase().contains(q) ||
            policy.id.toLowerCase().contains(q) ||
            policy.subtitle.toLowerCase().contains(q) ||
            policy.insuredName.toLowerCase().contains(q) ||
            policy.companyName.toLowerCase().contains(q) ||
            policy.policyType.toLowerCase().contains(q) ||
            policy.policyCategory.toLowerCase().contains(q) ||
            (policy.policyNumber?.toLowerCase().contains(q) ?? false) ||
            (policy.vehicleNumber?.toLowerCase().contains(q) ?? false) ||
            (policy.makeModel?.toLowerCase().contains(q) ?? false);

        if (!matchesSearch) return false;
      }

      if (_selectedTab == 1) {
        return policy.policyCategory.toLowerCase() == 'health' ||
            policy.icon == Icons.favorite_rounded;
      }
      if (_selectedTab == 2) {
        return policy.policyCategory.toLowerCase() == 'motor' ||
            policy.icon == Icons.directions_car_rounded;
      }
      if (_selectedTab == 3) {
        return policy.policyCategory.toLowerCase() == 'life' ||
            policy.icon == Icons.shield_rounded;
      }
      if (_selectedTab == 4) {
        return policy.policyCategory.toLowerCase() == 'warehouse' ||
            policy.policyCategory.toLowerCase() == 'property' ||
            policy.icon == Icons.business_rounded;
      }

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
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page Title & Verified Badge Header
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Policies',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: isSmall ? 22 : 26,
                        letterSpacing: -0.6,
                        color: isDark ? Colors.white : const Color(0xFF000000),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 3.5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(
                          0xFF34C759,
                        ).withAlpha(isDark ? 35 : 20),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 5,
                            height: 5,
                            decoration: const BoxDecoration(
                              color: Color(0xFF34C759),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const Gap(4),
                          const Text(
                            'IRDAI Live',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF34C759),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Gap(3),
                policiesAsync.when(
                  data: (list) {
                    final activeCount = list
                        .where((p) => p.isActive || p.isDueForRenewal)
                        .length;
                    final expiredCount = list.where((p) => p.isExpired).length;
                    final totalCount = list.length;

                    String subtitle;
                    if (_statusTab == 0) {
                      subtitle =
                          '$activeCount active policy contracts secured in portfolio';
                    } else if (_statusTab == 2) {
                      subtitle =
                          '$expiredCount expired / historical policy contracts';
                    } else {
                      subtitle =
                          '$totalCount total policies registered in your portfolio';
                    }

                    return Text(
                      subtitle,
                      style: TextStyle(
                        color: isDark
                            ? const Color(0xFF8E8E93)
                            : const Color(0xFF8E8E93),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w400,
                      ),
                    );
                  },
                  loading: () => const Text('Loading your policies...'),
                  error: (error, stack) => const Text('Offline Mode'),
                ),
              ],
            ),

            const Gap(10),

            // ─── Status Filter: Active (Default) | All | Expired ───
            policiesAsync.when(
              data: (allPolicies) {
                final activeCount = allPolicies
                    .where((p) => p.isActive || p.isDueForRenewal)
                    .length;
                final expiredCount = allPolicies
                    .where((p) => p.isExpired)
                    .length;
                final totalCount = allPolicies.length;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(3.5),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF1C1C1E)
                        : const Color(0xFFF2F2F7),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark
                          ? Colors.white10
                          : Colors.black.withValues(alpha: 0.05),
                      width: 0.8,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Active Only (Default)
                      Expanded(
                        child: _buildStatusTab(
                          label: 'Active ($activeCount)',
                          isSelected: _statusTab == 0,
                          badgeColor: const Color(0xFF34C759),
                          isDark: isDark,
                          onTap: () => setState(() => _statusTab = 0),
                        ),
                      ),
                      // All Policies
                      Expanded(
                        child: _buildStatusTab(
                          label: 'All ($totalCount)',
                          isSelected: _statusTab == 1,
                          badgeColor: const Color(0xFF007AFF),
                          isDark: isDark,
                          onTap: () => setState(() => _statusTab = 1),
                        ),
                      ),
                      // Expired Only
                      Expanded(
                        child: _buildStatusTab(
                          label: 'Expired ($expiredCount)',
                          isSelected: _statusTab == 2,
                          badgeColor: const Color(0xFFFF3B30),
                          isDark: isDark,
                          onTap: () => setState(() => _statusTab = 2),
                        ),
                      ),
                    ],
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (err, stack) => const SizedBox.shrink(),
            ),

            const Gap(4),

            // Search Bar & Compact/Card View Toggle Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: TextStyle(
                      fontSize: 13.5,
                      color: isDark ? Colors.white : const Color(0xFF000000),
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search by policy #, vehicle, or insurer...',
                      hintStyle: const TextStyle(
                        color: Color(0xFF8E8E93),
                        fontSize: 12.5,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        size: 18,
                        color: Color(0xFF8E8E93),
                      ),
                      filled: true,
                      fillColor: isDark
                          ? const Color(0xFF1C1C1E)
                          : Colors.white,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: isDark
                              ? const Color(0xFF2C2C2E)
                              : const Color(0xFFE5E5EA),
                          width: 0.5,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: isDark
                              ? const Color(0xFF2C2C2E)
                              : const Color(0xFFE5E5EA),
                          width: 0.5,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: Color(0xFF007AFF),
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                ),
                const Gap(8),
                InkWell(
                  onTap: () => setState(() => _isCompactView = !_isCompactView),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark
                            ? const Color(0xFF2C2C2E)
                            : const Color(0xFFE5E5EA),
                        width: 0.5,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _isCompactView
                              ? Icons.view_agenda_rounded
                              : Icons.view_headline_rounded,
                          size: 17,
                          color: const Color(0xFF007AFF),
                        ),
                        const Gap(4),
                        Text(
                          _isCompactView ? 'Cards' : 'Compact',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF007AFF),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const Gap(12),

            // Category Filter Pills with Dynamic Counts
            policiesAsync.when(
              data: (allPolicies) {
                final statusFiltered = allPolicies.where((p) {
                  if (_statusTab == 0) return p.isActive || p.isDueForRenewal;
                  if (_statusTab == 2) return p.isExpired;
                  return true;
                }).toList();

                final motorCount = statusFiltered
                    .where(
                      (p) =>
                          p.policyCategory.toLowerCase() == 'motor' ||
                          p.icon == Icons.directions_car_rounded,
                    )
                    .length;
                final healthCount = statusFiltered
                    .where(
                      (p) =>
                          p.policyCategory.toLowerCase() == 'health' ||
                          p.icon == Icons.favorite_rounded,
                    )
                    .length;
                final lifeCount = statusFiltered
                    .where(
                      (p) =>
                          p.policyCategory.toLowerCase() == 'life' ||
                          p.icon == Icons.shield_rounded,
                    )
                    .length;
                final propCount = statusFiltered
                    .where(
                      (p) =>
                          p.policyCategory.toLowerCase() == 'warehouse' ||
                          p.policyCategory.toLowerCase() == 'property' ||
                          p.icon == Icons.business_rounded,
                    )
                    .length;
                final counts = [
                  statusFiltered.length,
                  healthCount,
                  motorCount,
                  lifeCount,
                  propCount,
                ];

                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: List.generate(_categories.length, (idx) {
                      final isSelected = _selectedTab == idx;
                      final count = counts[idx];

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
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF007AFF)
                                  : (isDark
                                        ? const Color(0xFF1C1C1E)
                                        : Colors.white),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF007AFF)
                                    : (isDark
                                          ? const Color(0xFF2C2C2E)
                                          : const Color(0xFFE5E5EA)),
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  categoryIcons[idx],
                                  size: 13,
                                  color: isSelected
                                      ? Colors.white
                                      : (isDark
                                            ? Colors.white60
                                            : const Color(0xFF64748B)),
                                ),
                                const Gap(5),
                                Text(
                                  '${_categories[idx]} ($count)',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: isSelected
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: isSelected
                                        ? Colors.white
                                        : (isDark
                                              ? Colors.white70
                                              : const Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (err, stack) => const SizedBox.shrink(),
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
                          color: isDark
                              ? Colors.white30
                              : const Color(0xFFCBD5E1),
                        ),
                        const Gap(12),
                        Text(
                          'You don\'t have any active policies in this category.',
                          style: TextStyle(
                            fontSize: 13.5,
                            color: isDark
                                ? Colors.white60
                                : const Color(0xFF64748B),
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
                  separatorBuilder: (context, index) =>
                      Gap(_isCompactView ? 8 : 12),
                  itemBuilder: (context, index) {
                    final policy = filtered[index];
                    return PolicyCard(
                      policy: policy,
                      isCompact: _isCompactView,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PolicyDetailsScreen(policy: policy),
                          ),
                        );
                      },
                    );
                  },
                );
              },
              loading: () => const AppPolicySkeleton(count: 3),
              error: (err, _) => Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 24,
                  ),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.cloud_off_rounded,
                        size: 36,
                        color: Color(0xFF94A3B8),
                      ),
                      const Gap(12),
                      Text(
                        'Unable to load policies',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: isDark
                              ? Colors.white
                              : const Color(0xFF0F172A),
                        ),
                      ),
                      const Gap(4),
                      Text(
                        'Please check your internet connection or try again.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark
                              ? Colors.white60
                              : const Color(0xFF64748B),
                        ),
                      ),
                      const Gap(16),
                      ElevatedButton.icon(
                        onPressed: () => ref.refresh(livePoliciesProvider),
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text('Retry Connection'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D4ED8),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
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

  Widget _buildStatusTab({
    required String label,
    required bool isSelected,
    required Color badgeColor,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(11),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 7.5),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF2C2C2E) : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(11),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
                    blurRadius: 5,
                    offset: const Offset(0, 1.5),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 5.5,
              height: 5.5,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: badgeColor,
              ),
            ),
            const Gap(5),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected
                    ? (isDark ? Colors.white : const Color(0xFF0F172A))
                    : (isDark
                          ? const Color(0xFF8E8E93)
                          : const Color(0xFF6E6E73)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
