import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/policy.dart';
import '../services/api_service.dart';
import '../widgets/glass_card.dart';

/// Ultra-Premium Apple-Grade Contact BimaHeadquarter Screen
/// Used when a policy record is registered (e.g. via insurer statement / Excel import)
/// but does not have a PDF document directly attached yet.
class ContactBimaheadquarterScreen extends StatefulWidget {
  final Policy policy;

  const ContactBimaheadquarterScreen({
    super.key,
    required this.policy,
  });

  @override
  State<ContactBimaheadquarterScreen> createState() =>
      _ContactBimaheadquarterScreenState();
}

class _ContactBimaheadquarterScreenState
    extends State<ContactBimaheadquarterScreen> {
  bool _isSubmitting = false;
  bool _requestSent = false;

  static const String _defaultHelplinePhone = '+919424411103';
  static const String _defaultSupportEmail = 'support@bimaheadquarter.com';

  String get _advisorPhone {
    final contact = widget.policy.contactNumber?.trim() ?? '';
    final digits = contact.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length >= 10) {
      return '+91${digits.substring(digits.length - 10)}';
    }
    return _defaultHelplinePhone;
  }

  String get _whatsappMessage {
    final polNo = widget.policy.policyNumber ?? widget.policy.id;
    final company = widget.policy.companyName.isNotEmpty
        ? widget.policy.companyName
        : widget.policy.name;
    final insured = widget.policy.insuredName.isNotEmpty
        ? widget.policy.insuredName
        : 'Policyholder';
    final vehicle = widget.policy.vehicleNumber?.isNotEmpty == true
        ? ' (Vehicle: ${widget.policy.vehicleNumber})'
        : '';

    return 'Hello BimaHeadquarter Team,\n\n'
        'I am requesting the official original policy PDF document for:\n'
        '• Policy Number: $polNo\n'
        '• Insurer: $company\n'
        '• Insured Name: $insured$vehicle\n\n'
        'Kindly dispatch the digital copy to my registered WhatsApp number. Thank you!';
  }

  Future<void> _openWhatsApp() async {
    final phoneDigits = _advisorPhone.replaceAll(RegExp(r'[^0-9]'), '');
    final encodedMsg = Uri.encodeComponent(_whatsappMessage);
    final uri = Uri.parse('https://wa.me/$phoneDigits?text=$encodedMsg');

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      if (mounted) {
        _showToast('Could not open WhatsApp. Please call our desk directly.');
      }
    }
  }

  Future<void> _callHelpline() async {
    final uri = Uri.parse('tel:$_advisorPhone');
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      if (mounted) {
        _showToast('Phone dialer not supported on this device.');
      }
    }
  }

  Future<void> _sendEmail() async {
    final polNo = widget.policy.policyNumber ?? widget.policy.id;
    final subject = Uri.encodeComponent(
        'Policy Schedule Request - #$polNo - ${widget.policy.insuredName}');
    final body = Uri.encodeComponent(_whatsappMessage);
    final uri =
        Uri.parse('mailto:$_defaultSupportEmail?subject=$subject&body=$body');

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      if (mounted) {
        _showToast('No email app found on this device.');
      }
    }
  }

  Future<void> _submitOneTapRequest() async {
    if (_isSubmitting || _requestSent) return;

    setState(() => _isSubmitting = true);
    final polNo = widget.policy.policyNumber ?? widget.policy.id;

    try {
      await ApiService.submitServiceRequest(
        requestType: 'SUPPORT',
        subject: 'Policy PDF Schedule Request',
        description:
            'Client requested original policy PDF copy for ${widget.policy.name} (Policy #$polNo). Insured: ${widget.policy.insuredName}.',
        policyNumber: polNo,
      );

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _requestSent = true;
        });
        _showToast('Document request registered! BimaHeadquarter desk notified.');
      }
    } catch (err) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        final msg = err.toString().replaceAll('Exception:', '').trim();
        _showToast(msg.isNotEmpty ? 'Could not submit request: $msg' : 'Could not submit request right now. Please try WhatsApp or Call.');
      }
    }
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF1E293B),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pol = widget.policy;
    final polNo = pol.policyNumber ?? pol.id;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF000000) : const Color(0xFFF2F2F7),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle:
            isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
        leading: IconButton(
          icon: Icon(
            Icons.close_rounded,
            color: isDark ? Colors.white : const Color(0xFF1C1C1E),
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Contact BimaHeadquarter',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
            color: isDark ? Colors.white : const Color(0xFF1C1C1E),
          ),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Ambient Background Optical Orbs
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF34C759)
                        .withValues(alpha: isDark ? 0.16 : 0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: -40,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF007AFF)
                        .withValues(alpha: isDark ? 0.14 : 0.10),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Main Scrollable Content
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              physics: const BouncingScrollPhysics(),
              children: [
                // ─── 1. Policy Identity Card ───
                GlassCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFF34C759)
                                  .withValues(alpha: isDark ? 0.25 : 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.verified_user_rounded,
                              color: Color(0xFF34C759),
                              size: 24,
                            ),
                          ),
                          const Gap(12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  pol.companyName.isNotEmpty
                                      ? pol.companyName
                                      : pol.name,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.3,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF1C1C1E),
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const Gap(2),
                                Text(
                                  pol.policyType,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w500,
                                    color: isDark
                                        ? const Color(0xFF8E8E93)
                                        : const Color(0xFF6E6E73),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Gap(14),
                      Divider(
                        height: 1,
                        thickness: 0.5,
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.12)
                            : Colors.black.withValues(alpha: 0.08),
                      ),
                      const Gap(14),

                      // Key Telemetry Row
                      Row(
                        children: [
                          Expanded(
                            child: _detailTelemetry(
                              label: 'POLICY NUMBER',
                              value: polNo,
                              isDark: isDark,
                              canCopy: true,
                            ),
                          ),
                          if (pol.vehicleNumber != null &&
                              pol.vehicleNumber!.isNotEmpty)
                            Expanded(
                              child: _detailTelemetry(
                                label: 'VEHICLE / ASSET',
                                value: pol.vehicleNumber!,
                                isDark: isDark,
                              ),
                            ),
                        ],
                      ),
                      const Gap(12),
                      Row(
                        children: [
                          Expanded(
                            child: _detailTelemetry(
                              label: 'INSURED NAME',
                              value: pol.insuredName.isNotEmpty
                                  ? pol.insuredName
                                  : 'Registered Client',
                              isDark: isDark,
                            ),
                          ),
                          Expanded(
                            child: _detailTelemetry(
                              label: 'ANNUAL PREMIUM',
                              value: pol.price.replaceAll('/yr', ''),
                              isDark: isDark,
                            ),
                          ),
                        ],
                      ),

                      const Gap(14),
                      // Status Notice Chip
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF007AFF)
                              .withValues(alpha: isDark ? 0.15 : 0.10),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: const Color(0xFF007AFF)
                                .withValues(alpha: isDark ? 0.30 : 0.20),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.info_outline_rounded,
                              size: 16,
                              color: Color(0xFF007AFF),
                            ),
                            const Gap(8),
                            Expanded(
                              child: Text(
                                'Policy registered in CRM. Digital schedule copy dispatched on request.',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: isDark
                                      ? const Color(0xFF64D2FF)
                                      : const Color(0xFF007AFF),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const Gap(20),

                // ─── 2. Action Channels Title ───
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 10),
                  child: Text(
                    'CONTACT & DOCUMENT CHANNELS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: isDark
                          ? const Color(0xFF8E8E93)
                          : const Color(0xFF6E6E73),
                    ),
                  ),
                ),

                // Channel 1: WhatsApp Instant Delivery
                _ContactActionTile(
                  icon: Icons.chat_rounded,
                  iconColor: const Color(0xFF25D366),
                  iconBgColor: const Color(0xFF25D366)
                      .withValues(alpha: isDark ? 0.22 : 0.15),
                  title: 'Receive on WhatsApp',
                  subtitle:
                      'Instant PDF dispatch to your registered number',
                  badgeText: 'FASTEST',
                  badgeColor: const Color(0xFF25D366),
                  isDark: isDark,
                  onTap: _openWhatsApp,
                ),

                const Gap(12),

                // Channel 2: Direct Helpline Call
                _ContactActionTile(
                  icon: Icons.phone_in_talk_rounded,
                  iconColor: const Color(0xFF007AFF),
                  iconBgColor: const Color(0xFF007AFF)
                      .withValues(alpha: isDark ? 0.22 : 0.15),
                  title: 'Call BimaHeadquarter Desk',
                  subtitle: _advisorPhone,
                  badgeText: 'CALL',
                  badgeColor: const Color(0xFF007AFF),
                  isDark: isDark,
                  onTap: _callHelpline,
                ),

                const Gap(12),

                // Channel 3: 1-Tap CRM Service Request
                _ContactActionTile(
                  icon: _requestSent
                      ? Icons.check_circle_rounded
                      : (_isSubmitting
                          ? Icons.hourglass_top_rounded
                          : Icons.assignment_turned_in_rounded),
                  iconColor: _requestSent
                      ? const Color(0xFF34C759)
                      : const Color(0xFF5856D6),
                  iconBgColor: (_requestSent
                          ? const Color(0xFF34C759)
                          : const Color(0xFF5856D6))
                      .withValues(alpha: isDark ? 0.22 : 0.15),
                  title: _requestSent
                      ? 'Request Already Logged'
                      : '1-Tap In-App Request',
                  subtitle: _requestSent
                      ? 'Our insurance desk is preparing your schedule.'
                      : 'Log formal policy document dispatch ticket',
                  badgeText: _requestSent ? 'LOGGED' : 'IN-APP',
                  badgeColor: _requestSent
                      ? const Color(0xFF34C759)
                      : const Color(0xFF5856D6),
                  isDark: isDark,
                  onTap: _submitOneTapRequest,
                ),

                const Gap(12),

                // Channel 4: Email Support
                _ContactActionTile(
                  icon: Icons.mail_outline_rounded,
                  iconColor: const Color(0xFFFF9500),
                  iconBgColor: const Color(0xFFFF9500)
                      .withValues(alpha: isDark ? 0.22 : 0.15),
                  title: 'Email Support',
                  subtitle: _defaultSupportEmail,
                  badgeText: 'EMAIL',
                  badgeColor: const Color(0xFFFF9500),
                  isDark: isDark,
                  onTap: _sendEmail,
                ),

                const Gap(24),

                // Security & IRDAI Guarantee Footer
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.lock_outline_rounded,
                      size: 13,
                      color: isDark
                          ? const Color(0xFF8E8E93)
                          : const Color(0xFF8E8E93),
                    ),
                    const Gap(6),
                    Text(
                      'BimaHeadquarter • IRDAI Registered Insurance Broking Desk',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isDark
                            ? const Color(0xFF8E8E93)
                            : const Color(0xFF8E8E93),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailTelemetry({
    required String label,
    required String value,
    required bool isDark,
    bool canCopy = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
            color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF6E6E73),
          ),
        ),
        const Gap(3),
        Row(
          children: [
            Flexible(
              child: Text(
                value,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: isDark ? Colors.white : const Color(0xFF1C1C1E),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (canCopy) ...[
              const Gap(4),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: value));
                  _showToast('Copied $value to clipboard');
                },
                child: Icon(
                  Icons.copy_rounded,
                  size: 12,
                  color: isDark
                      ? const Color(0xFF64D2FF)
                      : const Color(0xFF007AFF),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _ContactActionTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final String title;
  final String subtitle;
  final String badgeText;
  final Color badgeColor;
  final bool isDark;
  final VoidCallback onTap;

  const _ContactActionTile({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.title,
    required this.subtitle,
    required this.badgeText,
    required this.badgeColor,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const Gap(14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                        color: isDark ? Colors.white : const Color(0xFF1C1C1E),
                      ),
                    ),
                    const Gap(6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: badgeColor.withValues(alpha: isDark ? 0.20 : 0.12),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        badgeText,
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                          color: badgeColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const Gap(3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isDark
                        ? const Color(0xFF8E8E93)
                        : const Color(0xFF6E6E73),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const Gap(8),
          Icon(
            Icons.chevron_right_rounded,
            color: isDark ? const Color(0xFF48484A) : const Color(0xFFC7C7CC),
            size: 20,
          ),
        ],
      ),
    );
  }
}
