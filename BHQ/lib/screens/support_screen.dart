import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/crm_data_provider.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  int? _expandedFaqIndex;

  Future<void> _openWhatsAppDirectly(BuildContext context) async {
    const phone = '918818889660';
    final urlString = 'https://wa.me/$phone?text=${Uri.encodeComponent('Hello Anand Soni, I need assistance with my insurance policy.')}';
    final uri = Uri.parse(urlString);

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Opening WhatsApp with Anand Soni (+91 88188 89660)...'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    }
  }

  Future<void> _openPhoneDialerDirectly(BuildContext context) async {
    final uri = Uri.parse('tel:+918818889660');
    try {
      final launched = await launchUrl(uri);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Calling Anand Soni (+91 88188 89660)...'),
            backgroundColor: Color(0xFF1D4ED8),
          ),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Calling Anand Soni (+91 88188 89660)...'),
            backgroundColor: Color(0xFF1D4ED8),
          ),
        );
      }
    }
  }

  final List<Map<String, String>> _faqs = [
    {
      'q': 'How do I request cashless hospital admission?',
      'a': 'Show your BimaHQ Health Card at any network hospital TPA desk 48 hours prior to planned admission, or within 24 hours for emergency cases. Our 24x7 desk will auto-approve cashless clearance.',
    },
    {
      'q': 'How can I download my Sec 80D tax exemption certificate?',
      'a': 'Go to Documents tab or click "Download Tax Receipts" on the Home carousel. Certificates for FY 2025-26 are IRDAI & Income Tax Dept compliant.',
    },
    {
      'q': 'What is No Claim Bonus (NCB) in Motor Insurance?',
      'a': 'NCB is a discount earned on own-damage premium for every claim-free year, ranging from 20% up to 50% discount on policy renewal.',
    },
    {
      'q': 'How to get 24x7 Motor Roadside Assistance (RSA)?',
      'a': 'Call our 24x7 RSA toll-free helpline at 1800-102-4567 for free towing, battery jumpstart, flat tire replacement, or emergency fuel delivery anywhere in India.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 480;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.fromLTRB(isSmall ? 12 : 16, 12, isSmall ? 12 : 16, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header Title & Subtitle
          Text(
            'Support & Assistance',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: isSmall ? 20 : 22,
                  letterSpacing: -0.5,
                ),
          ),
          const Gap(2),
          Text(
            '24x7 help for claims, renewals & advisor consultation',
            style: TextStyle(
              color: isDark ? Colors.white60 : const Color(0xFF64748B),
              fontSize: isSmall ? 12 : 13,
            ),
          ),

          const Gap(16),

          const Gap(20),

          // 3. Dedicated Insurance Advisor Card Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'My Dedicated Advisor',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(18),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 12),
                    Gap(4),
                    Text(
                      'IRDAI Certified',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Gap(10),
          Container(
            padding: EdgeInsets.all(isSmall ? 12 : 16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: const Color(0xFF1D4ED8),
                          foregroundImage: const AssetImage('assets/brand/anand-soni.png'),
                          child: const Text(
                            'AS',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              shape: BoxShape.circle,
                              border: Border.all(color: isDark ? const Color(0xFF1E293B) : Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Gap(14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Anand Soni',
                            style: TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Gap(2),
                          Text(
                            'Senior Portfolio Manager • Lic: IRDAI/89201',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: isDark ? Colors.white60 : const Color(0xFF64748B),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Gap(1),
                          const Text(
                            '+91 88188 89660',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1D4ED8),
                            ),
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
                      child: ElevatedButton.icon(
                        onPressed: () => _openPhoneDialerDirectly(context),
                        icon: const Icon(Icons.phone_rounded, size: 14),
                        label: const Text('Call Now', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D4ED8),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 9),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                    const Gap(8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openWhatsAppDirectly(context),
                        icon: const Icon(Icons.chat_rounded, size: 14),
                        label: const Text('WhatsApp', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF059669),
                          side: const BorderSide(color: Color(0xFF10B981)),
                          padding: const EdgeInsets.symmetric(vertical: 9),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const Gap(20),

          // 4. Vibrant Support Hub Options Grid
          const Text(
            'Quick Support Channels',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
          ),
          const Gap(10),

          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.45,
            ),
            children: [
              _buildSupportTile(
                context,
                icon: Icons.phone_callback_rounded,
                color: const Color(0xFF2563EB),
                title: 'Call Advisor',
                subtitle: '+91 88188 89660',
                badge: 'Direct',
                onTap: () => _openPhoneDialerDirectly(context),
              ),
              _buildSupportTile(
                context,
                icon: Icons.chat_rounded,
                color: const Color(0xFF10B981),
                title: 'WhatsApp Helpline',
                subtitle: 'Reply < 5 mins',
                badge: 'Fast',
                onTap: () => _openWhatsAppDirectly(context),
              ),
              _buildSupportTile(
                context,
                icon: Icons.confirmation_number_rounded,
                color: const Color(0xFFD97706),
                title: 'Service Tickets',
                subtitle: 'Track Requests',
                badge: '1 Active',
                onTap: _showNewTicketModal,
              ),
              _buildSupportTile(
                context,
                icon: Icons.auto_stories_rounded,
                color: const Color(0xFF9333EA),
                title: 'Policy FAQs',
                subtitle: 'Guides & Help',
                badge: '14 Articles',
                onTap: _showFaqKnowledgeBaseModal,
              ),
            ],
          ),

          const Gap(24),

          // 5. Service Tickets Tracker Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Support Tickets',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
              ),
              TextButton.icon(
                onPressed: _showNewTicketModal,
                icon: const Icon(Icons.add_circle_outline_rounded, size: 14),
                label: const Text('New Ticket', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const Gap(8),

          ref.watch(liveServiceRequestsProvider).when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (err, _) => Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.red.withAlpha(15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Unable to load support tickets: $err',
                style: const TextStyle(fontSize: 12, color: Colors.red),
              ),
            ),
            data: (tickets) {
              if (tickets.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: const Center(
                    child: Text(
                      'No support tickets filed yet. Tap "New Ticket" if you need any assistance.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ),
                );
              }

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tickets.length,
                separatorBuilder: (context, index) => const Gap(8),
                itemBuilder: (context, idx) {
                  final t = tickets[idx];
                  final id = (t['ticketNo'] ?? t['id'] ?? 'SR-${idx + 1}').toString();
                  final title = (t['title'] ?? t['subject'] ?? t['category'] ?? 'Service Request').toString();
                  final status = (t['status'] ?? 'Open').toString();
                  final statusColor = (status.toLowerCase().contains('resolve') || status.toLowerCase().contains('close'))
                      ? const Color(0xFF10B981)
                      : const Color(0xFFD97706);
                  final time = t['createdAt'] != null
                      ? t['createdAt'].toString().split('T').first
                      : 'Recent';

                  return _buildTicketTile(
                    context,
                    ticketId: id,
                    title: title,
                    status: status,
                    statusColor: statusColor,
                    time: time,
                    isDark: isDark,
                    ticketData: t,
                  );
                },
              );
            },
          ),

          const Gap(24),

          // 6. Frequently Asked Questions Section
          const Text(
            'Frequently Asked Questions',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
          ),
          const Gap(10),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _faqs.length,
            itemBuilder: (context, idx) {
              final isExpanded = _expandedFaqIndex == idx;
              final faq = _faqs[idx];

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: ExpansionTile(
                    key: ValueKey('faq_$idx'),
                    tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                    childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                    title: Text(
                      faq['q']!,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    trailing: Icon(
                      isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: const Color(0xFF2563EB),
                      size: 20,
                    ),
                    onExpansionChanged: (expanded) {
                      setState(() {
                        _expandedFaqIndex = expanded ? idx : null;
                      });
                    },
                    children: [
                      Text(
                        faq['a']!,
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.45,
                          color: isDark ? Colors.white70 : const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          const Gap(24),

          // 7. Official Company & Regulatory Footer
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.asset(
                        'assets/brand/app-logo.png',
                        width: 22,
                        height: 22,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                      ),
                    ),
                    const Gap(8),
                    const Text(
                      'Bima Headquarter',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
                const Gap(4),
                const Text(
                  'by Insuredesk IMF PVT LTD',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2563EB),
                  ),
                ),
                const Gap(4),
                Text(
                  'IRDAI Registered Insurance Marketing Firm • Dedicated Client Support',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSupportTile(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required String badge,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: color.withAlpha(isDark ? 40 : 20),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, color: color, size: 16),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withAlpha(isDark ? 30 : 15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color),
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12.5,
                    ),
                  ),
                  const Gap(1),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10.5,
                      color: isDark ? Colors.white60 : const Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTicketTile(
    BuildContext context, {
    required String ticketId,
    required String title,
    required String status,
    required Color statusColor,
    required String time,
    required bool isDark,
    Map<String, dynamic>? ticketData,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () => _showTicketDetailModal(context, ticketId, ticketData),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(20),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  status == 'Resolved' ? Icons.check_circle_rounded : Icons.pending_actions_rounded,
                  color: statusColor,
                  size: 16,
                ),
              ),
              const Gap(12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Ticket #$ticketId',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: Color(0xFF2563EB),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: statusColor.withAlpha(20),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            status,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Gap(3),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Gap(2),
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
          ),
        ),
      ),
    );
  }

  void _showNewTicketModal() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.confirmation_number_rounded, color: Color(0xFF2563EB)),
              Gap(10),
              Text('Raise Support Ticket', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SizedBox(
            width: 440,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Request Subject:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const Gap(6),
                TextField(
                  controller: titleController,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'e.g. Tax Certificate, Name correction, Policy copy...',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const Gap(12),
                const Text('Details & Description:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const Gap(6),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Describe how we can assist you...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final messenger = ScaffoldMessenger.of(context);
                      final title = titleController.text.trim();
                      final desc = descController.text.trim();
                      if (title.isEmpty) {
                        messenger.showSnackBar(
                          const SnackBar(content: Text('Please enter a ticket subject.')),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'GENERAL_SUPPORT',
                          title: title,
                          description: desc,
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        ref.invalidate(liveServiceRequestsProvider);
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Support ticket submitted to CRM successfully!'),
                            backgroundColor: Color(0xFF10B981),
                          ),
                        );
                      } catch (err) {
                        setDialogState(() => isSubmitting = false);
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text('Failed to submit ticket: ${err.toString().replaceAll("Exception:", "").trim()}'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit Ticket'),
            ),
          ],
        ),
      ),
    );
  }

  void _showFaqKnowledgeBaseModal() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.auto_stories_rounded, color: Color(0xFF9333EA)),
            Gap(10),
            Text('Knowledge Base & Guides', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Verified IRDAI Policy Guides Available', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const Gap(12),
              Material(
                color: Colors.transparent,
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: Color(0xFFE2E8F0))),
                  leading: const Icon(Icons.health_and_safety_rounded, color: Color(0xFF2563EB)),
                  title: const Text('Health Cashless Admission Guide', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Step-by-step TPA pre-authorization process', style: TextStyle(fontSize: 11)),
                  onTap: () {
                    Navigator.pop(ctx);
                    showDialog(
                      context: context,
                      builder: (guideCtx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        title: const Row(
                          children: [
                            Icon(Icons.health_and_safety_rounded, color: Color(0xFF2563EB)),
                            Gap(10),
                            Text('Cashless Hospitalization Guide', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        content: const Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('1. Present your BimaHQ Health Card & Gov ID at the Hospital TPA desk at admission.', style: TextStyle(fontSize: 12.5)),
                            Gap(8),
                            Text('2. Hospital initiates cashless pre-authorization with the insurance company.', style: TextStyle(fontSize: 12.5)),
                            Gap(8),
                            Text('3. Initial approval is typically received within 2-4 hours.', style: TextStyle(fontSize: 12.5)),
                            Gap(8),
                            Text('4. At discharge, final hospital bills are settled directly cashless by insurer.', style: TextStyle(fontSize: 12.5)),
                          ],
                        ),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(guideCtx), child: const Text('Got it')),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const Gap(8),
              Material(
                color: Colors.transparent,
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: Color(0xFFE2E8F0))),
                  leading: const Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981)),
                  title: const Text('Sec 80D & 80C Tax Savings Guide', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Exemption limits, receipts & deduction rules', style: TextStyle(fontSize: 11)),
                  onTap: () {
                    Navigator.pop(ctx);
                    showDialog(
                      context: context,
                      builder: (taxCtx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        title: const Row(
                          children: [
                            Icon(Icons.receipt_long_rounded, color: Color(0xFF10B981)),
                            Gap(10),
                            Text('Sec 80D Tax Deduction Guide', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        content: const Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('• Self, Spouse & Dependent Children: Deduction up to ₹25,000/year.', style: TextStyle(fontSize: 12.5)),
                            Gap(8),
                            Text('• Parents (Senior Citizens >= 60 yrs): Additional deduction up to ₹50,000/year.', style: TextStyle(fontSize: 12.5)),
                            Gap(8),
                            Text('• Preventive Health Checkups: Up to ₹5,000 within the overall 80D limit.', style: TextStyle(fontSize: 12.5)),
                            Gap(8),
                            Text('• Tax certificates are automatically generated from your active policies in CRM.', style: TextStyle(fontSize: 12.5, color: Color(0xFF1D4ED8), fontWeight: FontWeight.w600)),
                          ],
                        ),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(taxCtx), child: const Text('Close')),
                        ],
                      ),
                    );
                  },
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
        ],
      ),
    );
  }

  void _showTicketDetailModal(BuildContext context, String ticketId, [Map<String, dynamic>? ticketData]) {
    final title = ticketData?['title'] ?? ticketData?['subject'] ?? 'Support Ticket';
    final desc = ticketData?['description'] ?? 'Service request recorded in CRM.';
    final status = (ticketData?['status'] ?? 'Open').toString();
    final remarks = ticketData?['remarks'] ?? 'Assigned to your relationship manager.';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.confirmation_number_rounded, color: Color(0xFF2563EB)),
            const Gap(10),
            Text('Ticket #$ticketId', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Subject: $title', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              const Gap(4),
              Text('Status: $status', style: const TextStyle(fontSize: 11.5, color: Color(0xFFD97706), fontWeight: FontWeight.w600)),
              const Gap(12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Description:\n$desc', style: const TextStyle(fontSize: 11.5, color: Color(0xFF334155), height: 1.4)),
                    if (remarks.toString().isNotEmpty) ...[
                      const Gap(8),
                      Text('Advisor Note:\n$remarks', style: const TextStyle(fontSize: 11.5, color: Color(0xFF2563EB), height: 1.4)),
                    ],
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
        ],
      ),
    );
  }
}


