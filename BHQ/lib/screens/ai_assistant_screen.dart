import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import '../services/crm_data_provider.dart';
import '../theme/auth_provider.dart';

class AiAssistantScreen extends ConsumerStatefulWidget {
  const AiAssistantScreen({super.key});

  @override
  ConsumerState<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends ConsumerState<AiAssistantScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'text':
          'Namaste! I am your BimaHQ 24x7 AI Policy Copilot. Ask me anything about your active policies, tax exemptions under Sec 80D, or upcoming renewals!'
    }
  ];

  void _sendQuery(String prompt) {
    if (prompt.trim().isEmpty) return;
    final text = prompt.trim();
    setState(() {
      _messages.add({'role': 'user', 'text': text});
    });
    _controller.clear();

    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        final policies = ref.read(livePoliciesProvider).value ?? [];
        final claims = ref.read(liveClaimsProvider).value ?? [];
        final authState = ref.read(authProvider);
        final clientName = authState.user?.name ?? 'Valued Client';

        String reply = 'I scanned your CRM policy records for $clientName. You currently have ${policies.length} registered policy records and ${claims.length} claim files in your portfolio.';
        final lower = text.toLowerCase();
        if (lower.contains('motor') || lower.contains('car') || lower.contains('expire')) {
          final expiring = policies.where((p) => p.status.toLowerCase().contains('due') || p.status.toLowerCase().contains('renew')).toList();
          if (expiring.isNotEmpty) {
            reply = 'You have ${expiring.length} policy due for renewal soon:\n• ${expiring.first.name} (#${expiring.first.policyNumber}) - Premium: ${expiring.first.price}.';
          } else {
            reply = 'Great news! None of your motor policies are currently overdue. All policies are active and protected.';
          }
        } else if (lower.contains('tax') || lower.contains('80d') || lower.contains('save')) {
          reply = 'Based on your active insurance records, health insurance premiums qualify for Section 80D exemption up to ₹25,000 for self/family (and ₹50,000 for senior citizens). You can download tax exemption certificates under the Documents tab.';
        } else if (lower.contains('claim')) {
          if (claims.isNotEmpty) {
            reply = 'You have ${claims.length} claim on record:\n• Claim #${claims.first.id} for policy #${claims.first.policyNo} is currently ${claims.first.status.name}.';
          } else {
            reply = 'You currently have zero active or pending claims on record. If you need to register a claim, tap the "File Claim" button.';
          }
        }

        setState(() {
          _messages.add({
            'role': 'assistant',
            'text': reply,
          });
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDesktop = MediaQuery.of(context).size.width >= 1024;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, isDesktop ? 20 : 120),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header Bar
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF9333EA)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const Gap(10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Insurance Assistant & Copilot',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.3,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const Gap(6),
                        Text(
                          'GPT-4o Underwriting Model Connected',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: isDark ? Colors.white.withAlpha(128) : Colors.black45,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const Gap(12),

          // 2. Custom Prompt Recommendation Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                _promptPill('Which motor policies expire in 15 days?', isDark),
                _promptPill('Calculate my Sec 80D tax savings', isDark),
                _promptPill('Show claims with cashless approval pending', isDark),
              ],
            ),
          ),

          const Gap(12),

          // 3. Chat Messages Stream
          Expanded(
            child: ListView.builder(
              physics: const BouncingScrollPhysics(),
              itemCount: _messages.length,
              itemBuilder: (context, idx) {
                final msg = _messages[idx];
                final isUser = msg['role'] == 'user';

                return Align(
                  alignment:
                      isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.82,
                    ),
                    decoration: BoxDecoration(
                      color: isUser
                          ? const Color(0xFF2563EB)
                          : (isDark
                              ? const Color(0xFF1E293B)
                              : Colors.white),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: Radius.circular(isUser ? 16 : 4),
                        bottomRight: Radius.circular(isUser ? 4 : 16),
                      ),
                      border: isUser
                          ? null
                          : Border.all(
                              color: isDark
                                  ? Colors.white10
                                  : const Color(0xFFE2E8F0),
                              width: 1,
                            ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(isDark ? 30 : 10),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isUser) ...[
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.auto_awesome_rounded,
                                size: 12,
                                color: Color(0xFF2563EB),
                              ),
                              const Gap(4),
                              Text(
                                'BimaHQ AI Copilot',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isDark
                                      ? Colors.white60
                                      : const Color(0xFF2563EB),
                                ),
                              ),
                            ],
                          ),
                          const Gap(6),
                        ],
                        Text(
                          msg['text']!,
                          style: TextStyle(
                            color: isUser
                                ? Colors.white
                                : (isDark ? Colors.white : Colors.black87),
                            fontSize: 12.5,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const Gap(10),

          // 4. Floating Query Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                color: isDark ? Colors.white12 : const Color(0xFFCBD5E1),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(isDark ? 40 : 15),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.auto_awesome_rounded,
                  color: Color(0xFF2563EB),
                  size: 18,
                ),
                const Gap(10),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    onSubmitted: _sendQuery,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Ask AI assistant any policy or tax question...',
                      hintStyle: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white38 : Colors.black38,
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
                const Gap(8),
                InkWell(
                  onTap: () => _sendQuery(_controller.text),
                  borderRadius: BorderRadius.circular(100),
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: const BoxDecoration(
                      color: Color(0xFF2563EB),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_upward_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _promptPill(String label, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: () => _sendQuery(label),
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.south_east_rounded,
                size: 11,
                color: isDark ? Colors.white.withAlpha(128) : const Color(0xFF2563EB),
              ),
              const Gap(6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white70 : Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
