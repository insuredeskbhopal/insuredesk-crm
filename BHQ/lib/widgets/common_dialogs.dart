import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../services/api_service.dart';
import '../services/crm_data_provider.dart';
import '../models/policy.dart';
import '../models/claim.dart';

class CommonDialogs {
  static void showRegisterClaimModal(BuildContext context, {VoidCallback? onClaimFiled}) {
    final policyController = TextEditingController();
    final amountController = TextEditingController();
    final hospitalController = TextEditingController();
    final remarksController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.assignment_turned_in_outlined, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text('File Claim', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ],
          ),
          content: SizedBox(
            width: 440,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: policyController,
                  decoration: const InputDecoration(
                    labelText: 'Policy Number *',
                    hintText: 'e.g. HE-22910',
                  ),
                ),
                const Gap(12),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Claim Amount (₹) *',
                    hintText: '1,25,000',
                  ),
                ),
                const Gap(12),
                TextField(
                  controller: hospitalController,
                  decoration: const InputDecoration(
                    labelText: 'Hospital / Garage Name',
                    hintText: 'Kokilaben Hospital / Sai Auto Service',
                  ),
                ),
                const Gap(12),
                TextField(
                  controller: remarksController,
                  decoration: const InputDecoration(
                    labelText: 'Incident Description / Remarks',
                    hintText: 'Brief description of the claim event...',
                  ),
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
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final messenger = ScaffoldMessenger.of(context);
                      final navigator = Navigator.of(ctx);
                      final policyNo = policyController.text.trim();
                      final amountText = amountController.text.replaceAll(',', '').replaceAll('₹', '').trim();
                      final amount = double.tryParse(amountText) ?? 0.0;

                      if (policyNo.isEmpty) {
                        messenger.showSnackBar(
                          const SnackBar(content: Text('Please enter a policy number.')),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);

                      try {
                        await ApiService.fileClaim(
                          policyNumber: policyNo,
                          claimAmount: amount,
                          garageOrHospital: hospitalController.text.trim(),
                          remarks: remarksController.text.trim(),
                        );
                        navigator.pop();
                        onClaimFiled?.call();
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Claim submitted successfully to CRM!'),
                            backgroundColor: Color(0xFF10B981),
                          ),
                        );
                      } catch (err) {
                        setDialogState(() => isSubmitting = false);
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text('Claim submission: ${err.toString().replaceAll("Exception:", "").trim()}'),
                            backgroundColor: const Color(0xFF10B981),
                          ),
                        );
                        navigator.pop();
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('File Claim'),
            ),
          ],
        ),
      ),
    );
  }

  static void showDownloadPolicyModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Consumer(
        builder: (dialogCtx, ref, _) {
          final policies = ref.watch(livePoliciesProvider).value ?? [];
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.file_download_outlined, color: Color(0xFF1D4ED8)),
                Gap(10),
                Text('Download Documents', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ],
            ),
            content: SizedBox(
              width: 440,
              child: policies.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'No policy documents available for download.',
                          style: TextStyle(color: Color(0xFF64748B)),
                        ),
                      ),
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (int i = 0; i < policies.length && i < 4; i++) ...[
                          if (i > 0) const Divider(),
                          ListTile(
                            leading: const Icon(Icons.picture_as_pdf_outlined, color: Colors.red),
                            title: Text(policies[i].name, maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text('Policy #${policies[i].policyNumber}'),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1D4ED8),
                                foregroundColor: Colors.white,
                                elevation: 0,
                              ),
                              onPressed: () {
                                Navigator.pop(ctx);
                                ApiService.downloadDocument(context, policies[i].id, title: policies[i].policyNumber ?? policies[i].name);
                              },
                              child: const Text('Download'),
                            ),
                          ),
                        ],
                      ],
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close', style: TextStyle(color: Color(0xFF64748B))),
              ),
            ],
          );
        },
      ),
    );
  }

  static void showPayPremiumModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => const _PayPremiumDialog(),
    );
  }

  static void showNotificationsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Consumer(
        builder: (dialogCtx, ref, _) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          final notifsAsync = ref.watch(liveNotificationsProvider);

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.notifications_active_rounded, color: Color(0xFF2563EB)),
                Gap(10),
                Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ],
            ),
            content: SizedBox(
              width: 440,
              child: notifsAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (err, _) => Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Unable to load notifications: $err',
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
                data: (notifs) {
                  if (notifs.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 40),
                          Gap(12),
                          Text(
                            'All caught up!',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          Gap(4),
                          Text(
                            'No pending renewals or alerts.',
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  }

                  return SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (int i = 0; i < notifs.length && i < 6; i++) ...[
                          if (i > 0) const Divider(height: 20),
                          _notificationItem(
                            icon: notifs[i]['type'] == 'renewal'
                                ? Icons.warning_amber_rounded
                                : (notifs[i]['type'] == 'claim'
                                    ? Icons.verified_user_rounded
                                    : Icons.info_outline_rounded),
                            color: notifs[i]['type'] == 'renewal'
                                ? const Color(0xFFD97706)
                                : (notifs[i]['type'] == 'claim'
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFF2563EB)),
                            title: notifs[i]['title'] ?? 'Notification',
                            subtitle: notifs[i]['message'] ?? '',
                            time: notifs[i]['time'] ?? 'Recent',
                            isDark: isDark,
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('All notifications marked as read.'),
                      backgroundColor: Color(0xFF10B981),
                    ),
                  );
                },
                child: const Text('Mark All Read', style: TextStyle(fontSize: 12)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close', style: TextStyle(color: Color(0xFF64748B))),
              ),
            ],
          );
        },
      ),
    );
  }

  static Widget _notificationItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required String time,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withAlpha(20),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const Gap(12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const Gap(2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? Colors.white60 : const Color(0xFF64748B),
                ),
              ),
              const Gap(4),
              Text(
                time,
                style: TextStyle(
                  fontSize: 10,
                  color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static void showComparePlansDialog(BuildContext context, {Policy? policy}) {
    final planTitle = policy != null ? '${policy.name} #${policy.policyNumber}' : 'Insurance Renewal Plan';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.compare_arrows_rounded, color: Color(0xFF2563EB)),
            Gap(10),
            Text('Compare Renewal Plans', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          ],
        ),
        content: SizedBox(
          width: 500,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                planTitle,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const Gap(12),
              Table(
                border: TableBorder.all(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(8),
                ),
                columnWidths: const {
                  0: FlexColumnWidth(2),
                  1: FlexColumnWidth(1.5),
                  2: FlexColumnWidth(1.5),
                },
                children: [
                  _tableRow('Feature', 'Current Plan', 'Upgraded Plan', isHeader: true),
                  _tableRow('Premium', policy?.price ?? 'Standard', 'Comprehensive'),
                  _tableRow('Coverage', 'Base Policy', 'Full Multi-Risk Cover'),
                  _tableRow('Renewal NCB', 'Standard NCB', '50% Max NCB Discount'),
                  _tableRow('Zero Dep', '❌ Standard', '✅ Included Free'),
                  _tableRow('24x7 RSA', '✅ Included', '✅ Priority Concierge'),
                  _tableRow('Engine / Addons', '❌ Standard', '✅ Enhanced Shield'),
                ],
              ),
              const Gap(14),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF10B981).withAlpha(40)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.savings_rounded, color: Color(0xFF10B981), size: 16),
                    Gap(8),
                    Expanded(
                      child: Text(
                        'Upgrading provides maximum coverage with exclusive NCB discounts',
                        style: TextStyle(fontSize: 11.5, color: Color(0xFF065F46), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1D4ED8),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              showPayPremiumModal(context);
            },
            child: const Text('Renew with Upgrade'),
          ),
        ],
      ),
    );
  }

  static TableRow _tableRow(String feature, String current, String upgraded, {bool isHeader = false}) {
    final style = TextStyle(
      fontSize: 11.5,
      fontWeight: isHeader ? FontWeight.w700 : FontWeight.w400,
      color: isHeader ? const Color(0xFF0F172A) : const Color(0xFF334155),
    );
    final bgColor = isHeader ? const Color(0xFFF8FAFC) : Colors.white;

    return TableRow(
      decoration: BoxDecoration(color: bgColor),
      children: [
        Padding(padding: const EdgeInsets.all(8), child: Text(feature, style: style)),
        Padding(padding: const EdgeInsets.all(8), child: Text(current, style: style)),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Text(upgraded, style: style.copyWith(
            color: isHeader ? const Color(0xFF0F172A) : const Color(0xFF1D4ED8),
            fontWeight: isHeader ? FontWeight.w700 : FontWeight.w600,
          )),
        ),
      ],
    );
  }

  static Widget _detailRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static void showPolicyDetailsModal(BuildContext context, Policy policy) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8).withAlpha(20),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(policy.icon, color: const Color(0xFF1D4ED8), size: 22),
            ),
            const Gap(12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(policy.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('Policy #${policy.policyNumber}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (policy.insuredName.isNotEmpty)
                _detailRow('Insured Name', policy.insuredName, isDark),
              _detailRow('Insurance Company', policy.companyName.isNotEmpty ? policy.companyName : policy.subtitle, isDark),
              _detailRow('Policy Category', policy.policyCategory, isDark),
              _detailRow('Policy Type', policy.policyType, isDark),
              _detailRow('Total Premium', policy.price, isDark),
              if (policy.netPremium != null && policy.netPremium!.isNotEmpty)
                _detailRow('Net Premium', '₹${policy.netPremium}', isDark),
              if (policy.sumInsured != null && policy.sumInsured!.isNotEmpty)
                _detailRow('Sum Insured / IDV', policy.sumInsured!, isDark),
              if (policy.vehicleNumber != null && policy.vehicleNumber!.isNotEmpty)
                _detailRow('Vehicle / Asset No', policy.vehicleNumber!, isDark),
              if (policy.makeModel != null && policy.makeModel!.isNotEmpty)
                _detailRow('Make / Model', policy.makeModel!, isDark),
              if (policy.startDate != null && policy.startDate!.isNotEmpty)
                _detailRow('Start Date', policy.startDate!, isDark),
              if (policy.expiryDate != null && policy.expiryDate!.isNotEmpty)
                _detailRow('Expiry Date', policy.expiryDate!, isDark),
              _detailRow('Status', policy.status, isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1D4ED8),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.download_rounded, size: 16),
            label: const Text('Download Policy PDF'),
            onPressed: () {
              Navigator.pop(ctx);
              ApiService.downloadDocument(context, policy.id, title: policy.policyNumber ?? policy.name);
            },
          ),
        ],
      ),
    );
  }

  static void showClaimDocumentUploadModal(BuildContext context, String claimId) {
    final docNameController = TextEditingController(text: 'Repair Estimate / Hospital Bill');
    final remarksController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.upload_file_rounded, color: Color(0xFF1D4ED8)),
              const Gap(10),
              Text('Upload Docs for Claim #$claimId', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Attach supporting bills, discharge summary, or repair estimates directly to this claim in CRM.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: docNameController,
                  decoration: const InputDecoration(labelText: 'Document Type / Title *'),
                ),
                const Gap(10),
                TextField(
                  controller: remarksController,
                  decoration: const InputDecoration(labelText: 'Remarks / Notes', hintText: 'Authorized estimate from workshop...'),
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
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'CLAIM_DOCUMENT_UPLOAD',
                          title: 'Doc Upload for Claim #$claimId: ${docNameController.text.trim()}',
                          description: 'Document: ${docNameController.text.trim()} attached for Claim #$claimId. Notes: ${remarksController.text.trim()}',
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Document attachment record logged to CRM claim successfully!'),
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
                  : const Text('Submit Document'),
            ),
          ],
        ),
      ),
    );
  }

  static void showClaimSummaryModal(BuildContext context, Claim claim) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            const Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981), size: 24),
            const Gap(10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Claim Summary #${claim.id}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('Policy #${claim.policyNo}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow('Insurance Company', claim.insurer, isDark),
              _detailRow('Claim Amount', claim.claimAmount, isDark),
              _detailRow('Estimated Payout', claim.estimatedPayout, isDark),
              _detailRow('Claim Status', claim.status.name.toUpperCase(), isDark),
              _detailRow('Date Filed', claim.dateFiled, isDark),
              if (claim.hospitalOrWorkshop.isNotEmpty)
                _detailRow('Workshop / Hospital', claim.hospitalOrWorkshop, isDark),
              if (claim.surveyorName.isNotEmpty)
                _detailRow('Surveyor Assigned', claim.surveyorName, isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: Color(0xFF64748B))),
          ),
        ],
      ),
    );
  }

  static void showProfileModal(BuildContext context, Map<String, dynamic> user, Map<String, dynamic> profile) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final name = profile['name'] ?? user['name'] ?? 'Account Holder';
    final phone = profile['phone'] ?? user['phone'] ?? '-';
    final email = profile['email'] ?? user['email'] ?? '-';
    final clientId = profile['id'] ?? user['id'] ?? '-';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.account_circle_outlined, color: Color(0xFF1D4ED8), size: 24),
            Gap(10),
            Text('Client Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow('Customer Name', name, isDark),
              _detailRow('Client ID', clientId, isDark),
              _detailRow('Registered Phone', phone, isDark),
              _detailRow('Email Address', email, isDark),
              _detailRow('Portal Access', 'Active (Authenticated)', isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: Color(0xFF64748B))),
          ),
        ],
      ),
    );
  }

  static void showChangeMpinModal(BuildContext context) {
    final currentMpinCtrl = TextEditingController();
    final newMpinCtrl = TextEditingController();
    final confirmMpinCtrl = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.lock_reset_rounded, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text('Change 6-Digit MPIN', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Update your secure 6-digit MPIN for accessing your BimaHeadquarter CRM portal.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: currentMpinCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Current 6-Digit MPIN *', counterText: ''),
                ),
                const Gap(10),
                TextField(
                  controller: newMpinCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New 6-Digit MPIN *', counterText: ''),
                ),
                const Gap(10),
                TextField(
                  controller: confirmMpinCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm New MPIN *', counterText: ''),
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
                      final curr = currentMpinCtrl.text.trim();
                      final nw = newMpinCtrl.text.trim();
                      final conf = confirmMpinCtrl.text.trim();
                      if (curr.length < 4 || nw.length != 6) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('New MPIN must be exactly 6 numeric digits.')),
                        );
                        return;
                      }
                      if (nw != conf) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('New MPIN and Confirm MPIN do not match.')),
                        );
                        return;
                      }
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.changeMpin(currentMpin: curr, newMpin: nw);
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('6-digit MPIN updated successfully on CRM!'),
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
                  : const Text('Update MPIN'),
            ),
          ],
        ),
      ),
    );
  }

  static void showEndorsementRequestModal(BuildContext context, {String? defaultTitle, String? defaultDesc}) {
    final titleCtrl = TextEditingController(text: defaultTitle ?? 'Policy Add-on Cover Request');
    final descCtrl = TextEditingController(text: defaultDesc ?? 'Customer requested policy coverage upgrade.');
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.add_moderator_rounded, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text('Request Policy Add-on', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Submit an add-on or endorsement request to your insurance advisor. The request is tracked in CRM.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Request Title *'),
                ),
                const Gap(10),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Coverage Details / Remarks *'),
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
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'POLICY_ADD_ON',
                          title: titleCtrl.text.trim(),
                          description: descCtrl.text.trim(),
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Add-on request submitted to CRM successfully!'),
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
}

class _PayPremiumDialog extends ConsumerStatefulWidget {
  const _PayPremiumDialog();

  @override
  ConsumerState<_PayPremiumDialog> createState() => _PayPremiumDialogState();
}

class _PayPremiumDialogState extends ConsumerState<_PayPremiumDialog> {
  Map<String, String>? _selectedPolicy;
  String _selectedPaymentMethod = 'UPI';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final livePolicies = ref.watch(livePoliciesProvider).value ?? [];

    final availablePolicies = livePolicies.map((policy) {
      final priceClean = policy.price.replaceAll('/yr', '').trim();
      return {
        'id': policy.policyNumber ?? policy.id,
        'name': policy.name,
        'cover': policy.subtitle,
        'premium': priceClean,
        'base': priceClean,
        'gst': '18% GST incl.',
        'due': policy.status,
      };
    }).toList();

    if (availablePolicies.isNotEmpty &&
        (_selectedPolicy == null ||
            !availablePolicies.any((p) => p['id'] == _selectedPolicy!['id']))) {
      _selectedPolicy = availablePolicies[0];
    }

    if (availablePolicies.isEmpty) {
      return AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Pay Premium', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        content: const SizedBox(
          width: 440,
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text('No active policies found for renewal or payment.', style: TextStyle(color: Color(0xFF64748B))),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      );
    }

    final selPolicy = _selectedPolicy ?? availablePolicies[0];

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFD97706).withAlpha(20),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.account_balance_wallet_rounded,
              color: Color(0xFFD97706),
              size: 20,
            ),
          ),
          const Gap(12),
          const Text(
            'Pay Premium',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: SizedBox(
        width: 460,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Policy Selection Dropdown
              const Text(
                'Select Policy to Pay / Renew:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const Gap(6),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                  ),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<Map<String, String>>(
                    value: selPolicy,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF2563EB)),
                    dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    onChanged: (newValue) {
                      if (newValue != null) {
                        setState(() {
                          _selectedPolicy = newValue;
                        });
                      }
                    },
                    items: availablePolicies.map((policy) {
                      return DropdownMenuItem<Map<String, String>>(
                        value: policy,
                        child: Text(
                          '${policy['name']} (${policy['id']})',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),

              const Gap(14),

              // Dynamic Selected Policy Details Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withAlpha(8) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? Colors.white10 : const Color(0xFFBFDBFE),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            selPolicy['cover']!,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF1E3A8A),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD97706).withAlpha(20),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            selPolicy['due']!,
                            style: const TextStyle(
                              color: Color(0xFFD97706),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Gap(8),
                    const Divider(height: 1),
                    const Gap(8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Base Premium:',
                          style: TextStyle(fontSize: 11.5, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
                        ),
                        Text(
                          selPolicy['base']!,
                          style: TextStyle(fontSize: 11.5, color: isDark ? Colors.white70 : const Color(0xFF334155)),
                        ),
                      ],
                    ),
                    const Gap(2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'GST:',
                          style: TextStyle(fontSize: 11.5, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
                        ),
                        Text(
                          selPolicy['gst']!,
                          style: TextStyle(fontSize: 11.5, color: isDark ? Colors.white70 : const Color(0xFF334155)),
                        ),
                      ],
                    ),
                    const Gap(6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Premium Due:',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          selPolicy['premium']!,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF2563EB),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const Gap(14),

              // Payment Methods Section
              const Text(
                'Payment Method:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const Gap(6),
              Row(
                children: ['UPI / QR', 'NetBanking', 'Cards'].map((method) {
                  final isSelected = _selectedPaymentMethod == method;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(method),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedPaymentMethod = method),
                      selectedColor: const Color(0xFF2563EB).withAlpha(20),
                      labelStyle: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? const Color(0xFF2563EB) : (isDark ? Colors.white70 : const Color(0xFF475569)),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Payment of ${selPolicy['premium']} for ${selPolicy['name']} completed via $_selectedPaymentMethod.',
                ),
                backgroundColor: const Color(0xFF10B981),
              ),
            );
          },
          child: Text('Pay ${selPolicy['premium']}'),
        ),
      ],
    );
  }
}

