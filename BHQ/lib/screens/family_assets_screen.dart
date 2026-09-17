import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../theme/auth_provider.dart';
import '../services/crm_data_provider.dart';

import '../services/api_service.dart';

class FamilyAssetsScreen extends ConsumerWidget {
  const FamilyAssetsScreen({super.key});

  void _showAddMemberModal(BuildContext context, WidgetRef ref) {
    final nameCtrl = TextEditingController();
    final relationCtrl = TextEditingController(text: 'Spouse');
    final ageCtrl = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.person_add_alt_1_rounded, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text('Add Family Member', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Submit a family endorsement request to your CRM advisor to include a member under policy coverage.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Member Full Name *', hintText: 'Priya Sharma'),
                ),
                const Gap(10),
                DropdownButtonFormField<String>(
                  initialValue: relationCtrl.text,
                  decoration: const InputDecoration(labelText: 'Relationship *'),
                  items: const [
                    DropdownMenuItem(value: 'Spouse', child: Text('Spouse')),
                    DropdownMenuItem(value: 'Child (Son/Daughter)', child: Text('Child (Son/Daughter)')),
                    DropdownMenuItem(value: 'Parent (Father/Mother)', child: Text('Parent (Father/Mother)')),
                    DropdownMenuItem(value: 'Sibling', child: Text('Sibling')),
                  ],
                  onChanged: (val) {
                    if (val != null) relationCtrl.text = val;
                  },
                ),
                const Gap(10),
                TextField(
                  controller: ageCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Age / Year of Birth *', hintText: '28'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final name = nameCtrl.text.trim();
                      final age = ageCtrl.text.trim();
                      final rel = relationCtrl.text.trim();
                      if (name.isEmpty || age.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter member name and age.')),
                        );
                        return;
                      }
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'ADD_FAMILY_MEMBER',
                          title: 'Add Family Member: $name ($rel)',
                          description: 'Requested inclusion of family member $name ($rel, Age: $age) to policy coverage.',
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        ref.invalidate(liveServiceRequestsProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Member addition endorsement request logged in CRM!'),
                              backgroundColor: Color(0xFF10B981),
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Error: ${e.toString().replaceAll("Exception:", "").trim()}')),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit Request'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddAssetModal(BuildContext context, WidgetRef ref) {
    final assetTypeCtrl = TextEditingController(text: 'Motor Vehicle');
    final regNoCtrl = TextEditingController();
    final modelCtrl = TextEditingController();
    final valueCtrl = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.add_home_work_rounded, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text('Register Insured Asset', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: minAxisSize,
              children: [
                const Text(
                  'Register a vehicle or property asset to link with insurance policies in your CRM portfolio.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                DropdownButtonFormField<String>(
                  initialValue: assetTypeCtrl.text,
                  decoration: const InputDecoration(labelText: 'Asset Category *'),
                  items: const [
                    DropdownMenuItem(value: 'Motor Vehicle', child: Text('Motor Vehicle')),
                    DropdownMenuItem(value: 'Residential Property', child: Text('Residential Property')),
                    DropdownMenuItem(value: 'Commercial / Warehouse', child: Text('Commercial / Warehouse')),
                    DropdownMenuItem(value: 'Industrial Equipment', child: Text('Industrial Equipment')),
                  ],
                  onChanged: (val) {
                    if (val != null) assetTypeCtrl.text = val;
                  },
                ),
                const Gap(10),
                TextField(
                  controller: regNoCtrl,
                  decoration: const InputDecoration(labelText: 'Registration / Asset ID *', hintText: 'MP-04-XX-0001'),
                ),
                const Gap(10),
                TextField(
                  controller: modelCtrl,
                  decoration: const InputDecoration(labelText: 'Make, Model or Address', hintText: 'Hyundai Creta / Industrial Area'),
                ),
                const Gap(10),
                TextField(
                  controller: valueCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Estimated Value / Sum Insured', hintText: '₹7,50,000'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final regNo = regNoCtrl.text.trim();
                      if (regNo.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter asset registration/ID.')),
                        );
                        return;
                      }
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'ADD_ASSET',
                          title: 'Register Asset: ${assetTypeCtrl.text} - $regNo',
                          description: 'Requested registration of ${assetTypeCtrl.text}: $regNo, Make/Model: ${modelCtrl.text.trim()}, Est Value: ${valueCtrl.text.trim()}',
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        ref.invalidate(liveServiceRequestsProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Asset registration request submitted to CRM!'),
                              backgroundColor: Color(0xFF10B981),
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Error: ${e.toString().replaceAll("Exception:", "").trim()}')),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Register Asset'),
            ),
          ],
        ),
      ),
    );
  }

  static const minAxisSize = MainAxisSize.min;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final policiesAsync = ref.watch(livePoliciesProvider);

    final userName = authState.user?.name ?? 'Primary Account Holder';

    final members = [
      {'name': userName, 'relation': 'Self (Primary Insured)', 'age': 'Active', 'status': 'Covered'},
    ];

    final policies = policiesAsync.value ?? [];
    final motorPolicies = policies.where((p) => p.vehicleNumber != null && p.vehicleNumber!.isNotEmpty).toList();

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Family Members & Covered Assets',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  letterSpacing: -0.5,
                ),
          ),
          const Gap(2),
          Text(
            'Manage family members covered under Health Insurance and registered assets',
            style: TextStyle(
              color: isDark ? Colors.white60 : const Color(0xFF64748B),
              fontSize: 12,
            ),
          ),
          const Gap(20),

          // Covered Family Members
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Covered Family Members',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              TextButton.icon(
                onPressed: () => _showAddMemberModal(context, ref),
                icon: const Icon(Icons.person_add_alt_1_rounded, size: 14),
                label: const Text('Add Member', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const Gap(10),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: members.length,
            separatorBuilder: (context, index) => const Gap(10),
            itemBuilder: (context, idx) {
              final item = members[idx];
              final initial = item['name']!.isNotEmpty ? item['name']!.substring(0, 1).toUpperCase() : 'U';
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: const Color(0xFF2563EB).withAlpha(20),
                      child: Text(
                        initial,
                        style: const TextStyle(
                          color: Color(0xFF2563EB),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const Gap(12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['name']!,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13.5,
                            ),
                          ),
                          Text(
                            '${item['relation']} • ${item['age']}',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: isDark ? Colors.white60 : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withAlpha(20),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Covered',
                        style: TextStyle(
                          color: Color(0xFF10B981),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          const Gap(24),

          // Registered Assets
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Registered Insured Assets',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              TextButton.icon(
                onPressed: () => _showAddAssetModal(context, ref),
                icon: const Icon(Icons.add_home_work_rounded, size: 14),
                label: const Text('Add Asset', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const Gap(10),
          if (motorPolicies.isEmpty)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                ),
              ),
              child: const Center(
                child: Text(
                  'No registered vehicle or property assets found in your active policies.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: motorPolicies.length,
              separatorBuilder: (context, index) => const Gap(10),
              itemBuilder: (context, idx) {
                final policy = motorPolicies[idx];
                return Container(
                  padding: const EdgeInsets.all(14),
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
                          color: const Color(0xFF10B981).withAlpha(20),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.directions_car_rounded,
                          color: Color(0xFF10B981),
                          size: 20,
                        ),
                      ),
                      const Gap(12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              policy.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5,
                              ),
                            ),
                            Text(
                              'Reg: ${policy.vehicleNumber} • ${policy.price}',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? Colors.white60 : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
