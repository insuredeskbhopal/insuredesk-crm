import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/policy.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_dialogs.dart';

class PolicyDetailsScreen extends StatelessWidget {
  final Policy policy;

  const PolicyDetailsScreen({
    super.key,
    required this.policy,
  });



  String _formatDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) return 'Not Specified';
    final s = raw.trim();
    try {
      final dt = DateTime.tryParse(s);
      if (dt != null) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]} ${dt.year}';
      }
    } catch (_) {}

    final parts = s.split(RegExp(r'[-/]'));
    if (parts.length == 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (parts[0].length == 4) {
        final m = int.tryParse(parts[1]) ?? 1;
        return '${parts[2].padLeft(2, '0')} ${months[(m - 1).clamp(0, 11)]} ${parts[0]}';
      } else if (parts[2].length == 4) {
        final m = int.tryParse(parts[1]) ?? 1;
        return '${parts[0].padLeft(2, '0')} ${months[(m - 1).clamp(0, 11)]} ${parts[2]}';
      }
    }
    return s;
  }

  String _formatAmount(String? raw) {
    if (raw == null || raw.trim().isEmpty || raw == '0') return 'N/A';
    final clean = raw.trim().replaceAll('₹', '').replaceAll(',', '').trim();
    final numVal = double.tryParse(clean);
    if (numVal == null) return raw.startsWith('₹') ? raw : '₹$raw';
    final intVal = numVal.round();
    final str = intVal.toString();
    if (str.length <= 3) return '₹$str';
    final last3 = str.substring(str.length - 3);
    final rest = str.substring(0, str.length - 3);
    final formattedRest = rest.replaceAllMapped(RegExp(r'(\d)(?=(\d\d)+$)'), (m) => '${m[1]},');
    return '₹$formattedRest,$last3';
  }

  void _copyToClipboard(BuildContext context, String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
            const Gap(8),
            Text('$label copied to clipboard!'),
          ],
        ),
        backgroundColor: const Color(0xFF059669),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    final clean = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openWhatsApp(String phoneNumber) async {
    final clean = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    final uri = Uri.parse('https://wa.me/$clean');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 480;

    final isExpired = policy.status.toLowerCase().contains('expired');
    final isDue = policy.status.toLowerCase().contains('due') || policy.status.toLowerCase().contains('pending');

    final statusColor = isExpired
        ? (isDark ? Colors.redAccent.shade100 : Colors.red.shade700)
        : isDue
            ? (isDark ? Colors.amber.shade300 : Colors.amber.shade800)
            : (isDark ? const Color(0xFF34D399) : const Color(0xFF059669));

    final hasVehicleNumber = policy.vehicleNumber != null && policy.vehicleNumber!.trim().isNotEmpty;
    final hasMakeModel = policy.makeModel != null && policy.makeModel!.trim().isNotEmpty;
    final hasSumInsured = policy.sumInsured != null && policy.sumInsured!.trim().isNotEmpty;
    final hasExpiry = policy.expiryDate != null && policy.expiryDate!.trim().isNotEmpty;
    final hasStart = policy.startDate != null && policy.startDate!.trim().isNotEmpty;
    final hasNetPremium = policy.netPremium != null && policy.netPremium!.trim().isNotEmpty;
    final hasContactNumber = policy.contactNumber != null && policy.contactNumber!.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 18,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Policy Details',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 20),
            tooltip: 'Share Details',
            onPressed: () {
              final shareText = '''
BimaHeadquarter Policy Summary:
Insured Name: ${policy.insuredName.isNotEmpty ? policy.insuredName : 'Valued Client'}
Company: ${policy.companyName.isNotEmpty ? policy.companyName : policy.name}
Category: ${policy.policyCategory}
Policy No: ${policy.policyNumber ?? policy.id}
${hasVehicleNumber ? 'Vehicle No: ${policy.vehicleNumber}\n' : ''}Valid Till: ${_formatDate(policy.expiryDate)}
Premium: ${policy.price}
Status: ${policy.status}
''';
              _copyToClipboard(context, shareText, 'Policy summary');
            },
          ),
          IconButton(
            icon: const Icon(Icons.download_rounded, size: 22),
            tooltip: 'Download PDF',
            onPressed: () {
              ApiService.downloadDocument(
                context,
                policy.id,
                kind: 'policy',
                title: policy.policyNumber ?? policy.name,
              );
            },
          ),
          const Gap(4),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.fromLTRB(isSmall ? 14 : 18, 16, isSmall ? 14 : 18, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ─── 1. HERO POLICY HEADER CARD ───
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(isSmall ? 16 : 20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: isDark
                              ? [
                                  const Color(0xFF1E293B),
                                  const Color(0xFF0F172A),
                                ]
                              : [
                                  const Color(0xFF1E3A8A),
                                  const Color(0xFF1D4ED8),
                                ],
                        ),
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF1D4ED8).withAlpha(isDark ? 50 : 70),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                        border: Border.all(
                          color: isDark ? Colors.white12 : Colors.white24,
                          width: 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top Row: Category Pill & Status Badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(35),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white30, width: 0.8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      policy.icon,
                                      size: 13,
                                      color: Colors.white,
                                    ),
                                    const Gap(5),
                                    Text(
                                      '${policy.policyCategory.toUpperCase()} INSURANCE',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.6,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: statusColor.withAlpha(45),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: statusColor, width: 1),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: statusColor,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const Gap(5),
                                    Text(
                                      policy.status.toUpperCase(),
                                      style: TextStyle(
                                        color: isDark ? Colors.white : Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.4,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const Gap(14),

                          // Insurer Company Name
                          Text(
                            policy.companyName.isNotEmpty ? policy.companyName : policy.name,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const Gap(3),

                          // Insured Name
                          Text(
                            policy.insuredName.isNotEmpty ? policy.insuredName : 'Insured Policyholder',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: isSmall ? 20 : 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                              height: 1.2,
                            ),
                          ),

                          const Gap(10),

                          // Policy Number Box with Copy Action
                          InkWell(
                            onTap: () {
                              final pNum = policy.policyNumber ?? policy.id;
                              _copyToClipboard(context, pNum, 'Policy number');
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.black.withAlpha(50),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.white24, width: 0.8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.tag_rounded, size: 14, color: Colors.white70),
                                  const Gap(4),
                                  Text(
                                    policy.policyNumber ?? policy.id,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const Gap(8),
                                  const Icon(Icons.copy_rounded, size: 12, color: Colors.white60),
                                ],
                              ),
                            ),
                          ),

                          // Vehicle Plate Badge if vehicle exists
                          if (hasVehicleNumber) ...[
                            const Gap(12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF08A), // Indian Yellow Plate
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFCA8A04), width: 1.2),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1E3A8A),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                    child: const Text(
                                      'IND',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 8,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  const Gap(7),
                                  Text(
                                    policy.vehicleNumber!,
                                    style: const TextStyle(
                                      color: Color(0xFF0F172A),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const Gap(16),

                    // ─── 2. 3-COLUMN METRICS STATS BOX ───
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(isDark ? 40 : 10),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          // Sum Insured / IDV
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'SUM INSURED',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const Gap(4),
                                Text(
                                  hasSumInsured ? _formatAmount(policy.sumInsured) : 'Covered',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),

                          Container(height: 32, width: 1, color: isDark ? Colors.white12 : Colors.black12),

                          // Valid Till
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'VALID TILL',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const Gap(4),
                                  Text(
                                    hasExpiry ? _formatDate(policy.expiryDate) : 'Ongoing',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: isDue ? statusColor : (isDark ? Colors.white : const Color(0xFF0F172A)),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          Container(height: 32, width: 1, color: isDark ? Colors.white12 : Colors.black12),

                          // Premium
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(left: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'GROSS PREMIUM',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const Gap(4),
                                  Text(
                                    policy.price.replaceAll('/yr', ''),
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF2563EB),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Gap(18),

                    // ─── 3. SECTION: COVERAGE & ASSET SPECIFICATIONS ───
                    _buildSectionHeader(context, 'Coverage & Asset Specifications', Icons.shield_outlined, isDark),
                    const Gap(8),
                    _buildCardGroup(
                      isDark: isDark,
                      items: [
                        _buildDetailItem('Policy Category', policy.policyCategory, isDark, icon: Icons.category_outlined),
                        _buildDetailItem('Policy Type', policy.policyType, isDark, icon: Icons.description_outlined),
                        if (hasVehicleNumber)
                          _buildDetailItem('Vehicle / Asset Reg No.', policy.vehicleNumber!, isDark, icon: Icons.directions_car_outlined),
                        if (hasMakeModel)
                          _buildDetailItem('Make & Model', policy.makeModel!, isDark, icon: Icons.speed_outlined),
                        if (hasSumInsured)
                          _buildDetailItem('Total IDV / Sum Insured', _formatAmount(policy.sumInsured), isDark, icon: Icons.monetization_on_outlined),
                      ],
                    ),

                    const Gap(18),

                    // ─── 4. SECTION: SCHEDULE & VALIDITY ───
                    _buildSectionHeader(context, 'Schedule & Validity Period', Icons.date_range_outlined, isDark),
                    const Gap(8),
                    _buildCardGroup(
                      isDark: isDark,
                      items: [
                        if (hasStart)
                          _buildDetailItem('Policy Start Date', _formatDate(policy.startDate), isDark, icon: Icons.event_available_outlined),
                        _buildDetailItem('Policy Expiry Date', _formatDate(policy.expiryDate), isDark, icon: Icons.event_busy_outlined),
                        _buildDetailItem('Current Status', policy.status, isDark, icon: Icons.info_outline, highlightColor: statusColor),
                      ],
                    ),

                    const Gap(18),

                    // ─── 5. SECTION: FINANCIALS & PREMIUM BREAKDOWN ───
                    _buildSectionHeader(context, 'Financials & Premium Breakdown', Icons.receipt_long_outlined, isDark),
                    const Gap(8),
                    _buildCardGroup(
                      isDark: isDark,
                      items: [
                        if (hasNetPremium)
                          _buildDetailItem('Net Premium (Excl. GST)', _formatAmount(policy.netPremium), isDark, icon: Icons.account_balance_wallet_outlined),
                        _buildDetailItem('Total Gross Premium (Paid)', policy.price.replaceAll('/yr', ''), isDark, icon: Icons.payments_outlined, isBold: true),
                        _buildDetailItem('Verification Source', 'CRM Verified Document Extraction', isDark, icon: Icons.verified_outlined),
                      ],
                    ),

                    // ─── 6. SECTION: CONTACT & ADVISOR SUPPORT ───
                    if (policy.insuredName.isNotEmpty || hasContactNumber) ...[
                      const Gap(18),
                      _buildSectionHeader(context, 'Policyholder & Contact Assistance', Icons.support_agent_outlined, isDark),
                      const Gap(8),
                      _buildCardGroup(
                        isDark: isDark,
                        items: [
                          _buildDetailItem('Primary Insured', policy.insuredName.isNotEmpty ? policy.insuredName : 'Policyholder', isDark, icon: Icons.person_outline),
                          if (policy.contactPerson != null && policy.contactPerson!.isNotEmpty)
                            _buildDetailItem('Contact Person', policy.contactPerson!, isDark, icon: Icons.badge_outlined),
                          if (hasContactNumber)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.phone_outlined, size: 18, color: isDark ? Colors.white60 : const Color(0xFF64748B)),
                                      const Gap(10),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Registered Mobile',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                            ),
                                          ),
                                          const Gap(2),
                                          Text(
                                            policy.contactNumber!,
                                            style: TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.phone, color: Color(0xFF10B981), size: 20),
                                        onPressed: () => _makePhoneCall(policy.contactNumber!),
                                        tooltip: 'Call',
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF2563EB), size: 20),
                                        onPressed: () => _openWhatsApp(policy.contactNumber!),
                                        tooltip: 'WhatsApp',
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],

                    const Gap(20),

                    // ─── 7. QUICK ACTION CARDS (Claim & Renewal) ───
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => CommonDialogs.showRegisterClaimModal(context),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDC2626).withAlpha(isDark ? 35 : 12),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: const Color(0xFFDC2626).withAlpha(isDark ? 80 : 30),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.report_problem_outlined, size: 16, color: Color(0xFFDC2626)),
                                  Gap(6),
                                  Text(
                                    'Raise Claim',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFFDC2626),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const Gap(10),
                        Expanded(
                          child: InkWell(
                            onTap: () => CommonDialogs.showPayPremiumModal(context),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706).withAlpha(isDark ? 35 : 12),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: const Color(0xFFD97706).withAlpha(isDark ? 80 : 30),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.autorenew_rounded, size: 16, color: Color(0xFFD97706)),
                                  Gap(6),
                                  Text(
                                    'Renew Policy',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFFD97706),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const Gap(30),
                  ],
                ),
              ),
            ),

            // ─── 8. STICKY BOTTOM ACTION BAR (Download Official PDF) ───
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: isSmall ? 16 : 20,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(isDark ? 80 : 15),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
                border: Border(
                  top: BorderSide(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                    width: 1,
                  ),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1D4ED8),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.download_rounded, size: 20),
                  label: const Text(
                    'Download Official Policy PDF',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.2,
                    ),
                  ),
                  onPressed: () {
                    ApiService.downloadDocument(
                      context,
                      policy.id,
                      kind: 'policy',
                      title: policy.policyNumber ?? policy.name,
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title, IconData icon, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF2563EB)),
        const Gap(6),
        Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white70 : const Color(0xFF334155),
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }

  Widget _buildCardGroup({required bool isDark, required List<Widget> items}) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            if (i > 0)
              Divider(
                height: 1,
                thickness: 1,
                color: isDark ? Colors.white10 : const Color(0xFFF1F5F9),
              ),
            items[i],
          ],
        ],
      ),
    );
  }

  Widget _buildDetailItem(
    String label,
    String value,
    bool isDark, {
    IconData? icon,
    Color? highlightColor,
    bool isBold = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 17, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)),
            const Gap(10),
          ],
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
            ),
          ),
          const Gap(8),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isBold ? FontWeight.w900 : FontWeight.w700,
                color: highlightColor ?? (isDark ? Colors.white : const Color(0xFF0F172A)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
