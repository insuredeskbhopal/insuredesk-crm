import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';

import '../theme/app_theme.dart';
import '../theme/auth_provider.dart';
import '../services/api_service.dart';

class ClientLoginScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLoginSuccess;

  const ClientLoginScreen({super.key, this.onLoginSuccess});

  @override
  ConsumerState<ClientLoginScreen> createState() => _ClientLoginScreenState();
}

class _ClientLoginScreenState extends ConsumerState<ClientLoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _clientIdController =
      TextEditingController();
  final TextEditingController _mpinController =
      TextEditingController();

  // Google Linking controllers
  final TextEditingController _googleClientIdController =
      TextEditingController();
  final TextEditingController _googleMpinController =
      TextEditingController();

  bool _obscureMpin = true;
  bool _obscureGoogleMpin = true;
  bool _isSuccessRedirecting = false;

  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );
    _fadeController.forward();
    _loadSavedCredentials();
  }

  void _loadSavedCredentials() async {
    final user = await ApiService.getUser();
    if (user != null && mounted) {
      setState(() {
        _clientIdController.text = user['customerId'] ?? user['id'] ?? '';
      });
    }
  }

  @override
  void dispose() {
    _clientIdController.dispose();
    _mpinController.dispose();
    _googleClientIdController.dispose();
    _googleMpinController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  void _handleRegularSubmit() async {
    FocusScope.of(context).unfocus();
    final authNotifier = ref.read(authProvider.notifier);
    final success = await authNotifier.loginWithCredentials(
      _clientIdController.text,
      _mpinController.text,
    );

    if (success && mounted) {
      _triggerRedirect();
    }
  }

  void _handleGoogleLinkSubmit() async {
    FocusScope.of(context).unfocus();
    final authNotifier = ref.read(authProvider.notifier);
    final success = await authNotifier.linkAndAuthenticateGoogle(
      _googleClientIdController.text,
      _googleMpinController.text,
    );

    if (success && mounted) {
      _triggerRedirect();
    }
  }

  void _triggerRedirect() {
    setState(() => _isSuccessRedirecting = true);
    Future.delayed(const Duration(milliseconds: 1100), () {
      if (mounted && widget.onLoginSuccess != null) {
        widget.onLoginSuccess!();
      }
    });
  }

  void _showGoogleAccountPicker(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => _GoogleAccountInputDialog(
        onConfirm: (email, name) {
          Navigator.of(ctx).pop();
          final authNotifier = ref.read(authProvider.notifier);
          authNotifier.initiateGoogleSignIn(email, name);
        },
      ),
    );
  }

  void _showForgotMpinModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => const _ForgotMpinModalDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= 900;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : const Color(0xFFF3F7FC),
      body: Stack(
        children: [
          // Background ambient radial lights
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 500,
              height: 500,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF38BDF8).withAlpha(isDark ? 25 : 35),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -150,
            left: -100,
            child: Container(
              width: 500,
              height: 500,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF0D9488).withAlpha(isDark ? 20 : 30),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Main Layout split screen on Desktop, single column on Mobile
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: isDesktop
                  ? Row(
                      children: [
                        // Left Brand & Trust Panel
                        Expanded(
                          flex: 5,
                          child: _buildLeftBrandPanel(context),
                        ),
                        // Right Auth Panel
                        Expanded(
                          flex: 6,
                          child: _buildRightAuthPanel(context, authState, isDark),
                        ),
                      ],
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Column(
                        children: [
                          _buildMobileTopHeader(context),
                          const Gap(12),
                          _buildAuthCard(context, authState, isDark),
                          const Gap(12),
                          _buildFooterStatus(context, isCompact: true),
                        ],
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // LEFT BRAND & TRUST PANEL (DESKTOP >= 900px)
  // ==========================================
  Widget _buildLeftBrandPanel(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(24),
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF07162F),
            Color(0xFF0B2348),
            Color(0xFF0A4754),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF07162F).withAlpha(100),
            blurRadius: 30,
            offset: const Offset(0, 15),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background subtle grid lines design
          Positioned.fill(
            child: CustomPaint(
              painter: _GridPatternPainter(
                lineColor: Colors.white.withAlpha(12),
              ),
            ),
          ),

          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Header Brand Badge & Trust Pills
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // App Title / Logo Branding
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.asset(
                          'assets/brand/app-logo.png',
                          width: 48,
                          height: 48,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF38BDF8).withAlpha(40),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: const Color(0xFF38BDF8).withAlpha(80),
                              ),
                            ),
                            child: const Icon(
                              Icons.shield_outlined,
                              color: Color(0xFF38BDF8),
                              size: 26,
                            ),
                          ),
                        ),
                      ),
                      const Gap(14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Bima Headquarter',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                          Text(
                            'by Insuredesk IMF PVT LTD',
                            style: TextStyle(
                              color: Colors.white.withAlpha(200),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Gap(32),

                  // Pill Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withAlpha(35),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFF10B981).withAlpha(90),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Color(0xFF10B981),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                        ),
                        const Gap(8),
                        const Text(
                          'CLIENT PORTAL',
                          style: TextStyle(
                            color: Color(0xFF6EE7B7),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Gap(20),

                  // Headline
                  RichText(
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 32,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: -0.8,
                      ),
                      children: [
                        TextSpan(
                          text: 'Policies, Renewals & Claims.\n',
                          style: TextStyle(color: Color(0xFF38BDF8)),
                        ),
                        TextSpan(text: 'All in one place.'),
                      ],
                    ),
                  ),
                  const Gap(16),

                  // Sub-headline
                  Text(
                    'View your policy schedules, track claim progress, and manage upcoming renewals.',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: Colors.white.withAlpha(200),
                    ),
                  ),
                ],
              ),

              const Gap(24),

              // Feature Showcase Container (Frosted Glass List)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(12),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: Colors.white.withAlpha(25),
                  ),
                ),
                child: Column(
                  children: [
                    _buildFeatureShowcaseItem(
                      icon: Icons.assignment_turned_in_outlined,
                      iconBgColor: const Color(0xFF3B82F6),
                      title: 'Policy Repository',
                      subtitle: 'View active policies, coverage details & documents',
                    ),
                    const Divider(height: 20, color: Colors.white12),
                    _buildFeatureShowcaseItem(
                      icon: Icons.verified_user_outlined,
                      iconBgColor: const Color(0xFF10B981),
                      title: 'Claim Assistance',
                      subtitle: 'Track updates and submit requested claim documents',
                    ),
                    const Divider(height: 20, color: Colors.white12),
                    _buildFeatureShowcaseItem(
                      icon: Icons.autorenew_rounded,
                      iconBgColor: const Color(0xFFF59E0B),
                      title: 'Renewal Management',
                      subtitle: 'Review upcoming renewals and receive timely assistance',
                    ),
                    const Divider(height: 20, color: Colors.white12),
                    _buildFeatureShowcaseItem(
                      icon: Icons.headset_mic_outlined,
                      iconBgColor: const Color(0xFF8B5CF6),
                      title: 'Secure Support Desk',
                      subtitle: 'Connect directly with assigned account manager',
                    ),
                  ],
                ),
              ),

              const Gap(24),

              // Footer Status Indicator
              _buildFooterStatus(context, isCompact: false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureShowcaseItem({
    required IconData icon,
    required Color iconBgColor,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconBgColor.withAlpha(45),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconBgColor, size: 20),
        ),
        const Gap(14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Gap(2),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.white.withAlpha(170),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        Icon(
          Icons.chevron_right_rounded,
          color: Colors.white.withAlpha(100),
          size: 20,
        ),
      ],
    );
  }

  // ==========================================
  // MOBILE TOP HEADER (< 900px)
  // ==========================================
  Widget _buildMobileTopHeader(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Image.asset(
            'assets/brand/app-logo.png',
            width: 56,
            height: 56,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) => Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFF1E3A8A),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.shield_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
          ),
        ),
        const Gap(10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withAlpha(20),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFF10B981).withAlpha(45),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
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
              const Text(
                'SECURE CLIENT ACCESS',
                style: TextStyle(
                  color: Color(0xFF059669),
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        const Gap(6),
        Text(
          'Bima Headquarter',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Theme.of(context).brightness == Brightness.dark ? Colors.white : const Color(0xFF0F172A),
                letterSpacing: -0.4,
              ),
        ),
        const Gap(2),
        Text(
          'by Insuredesk IMF PVT LTD',
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF2563EB),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // RIGHT AUTH PANEL (CONTAINER & GLASS CARD)
  // ==========================================
  Widget _buildRightAuthPanel(
      BuildContext context, AuthState authState, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
      child: Column(
        children: [
          // Top Floating Navigation Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Navigating to BimaHQ Main Website...'),
                    ),
                  );
                },
                icon: const Icon(Icons.arrow_back_rounded, size: 16),
                label: const Text('Go to Website'),
                style: TextButton.styleFrom(
                  foregroundColor: isDark ? Colors.white70 : AppColors.textSecondary,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isDark ? AppColors.glassBorderDark : AppColors.glassBorderLight,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const Expanded(child: SizedBox()),

          // Centered Login Card
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: _buildAuthCard(context, authState, isDark),
            ),
          ),

          const Expanded(child: SizedBox()),
        ],
      ),
    );
  }

  // ==========================================
  // MAIN AUTH GLASSMORPHISM CARD
  // ==========================================
  Widget _buildAuthCard(
      BuildContext context, AuthState authState, bool isDark) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    if (_isSuccessRedirecting || authState.isAuthenticated) {
      return _buildSuccessRedirectCard(context, authState, isDark);
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(isDesktop ? 28 : 22),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          padding: isDesktop
              ? const EdgeInsets.all(32)
              : const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.cardDark.withAlpha(220)
                : Colors.white.withAlpha(235),
            borderRadius: BorderRadius.circular(isDesktop ? 28 : 22),
            border: Border.all(
              color: isDark
                  ? Colors.white.withAlpha(20)
                  : Colors.white.withAlpha(200),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withAlpha(100)
                    : const Color(0xFF2563EB).withAlpha(15),
                blurRadius: 36,
                offset: const Offset(0, 16),
                spreadRadius: -4,
              ),
              BoxShadow(
                color: isDark
                    ? Colors.transparent
                    : const Color(0xFF0F172A).withAlpha(10),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header Category Tag & Dynamic Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlue.withAlpha(15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'CLIENT PORTAL',
                      style: TextStyle(
                        color: isDark ? const Color(0xFF60A5FA) : AppColors.primaryBlue,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.lock_clock_outlined,
                    color: isDark ? Colors.white38 : AppColors.textMuted,
                    size: isDesktop ? 20 : 18,
                  ),
                ],
              ),
              Gap(isDesktop ? 16 : 10),

              Text(
                authState.loginMode == 'google'
                    ? 'Link Google Account'
                    : 'Sign in to your Portal',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: isDesktop ? 22 : 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
              ),
              const Gap(4),
              Text(
                authState.loginMode == 'google'
                    ? 'Verify credentials once to enable 1-click Google sign-in.'
                    : 'Enter your Client ID and 4-digit MPIN to access policy details.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontSize: isDesktop ? 12.5 : 12,
                      color: isDark ? Colors.white70 : const Color(0xFF64748B),
                    ),
              ),
              Gap(isDesktop ? 22 : 14),

              // Banners: Error or Success
              if (authState.errorMessage != null) ...[
                _buildAlertBanner(
                  context,
                  isError: true,
                  message: authState.errorMessage!,
                  onClose: () =>
                      ref.read(authProvider.notifier).clearBanners(),
                ),
                Gap(isDesktop ? 16 : 10),
              ],

              if (authState.successMessage != null) ...[
                _buildAlertBanner(
                  context,
                  isError: false,
                  message: authState.successMessage!,
                  onClose: () =>
                      ref.read(authProvider.notifier).clearBanners(),
                ),
                Gap(isDesktop ? 16 : 10),
              ],

              // DUAL MODE CONTENT SWITCHER
              if (authState.loginMode == 'regular')
                _buildRegularLoginForm(context, authState, isDark)
              else
                _buildGoogleLinkingForm(context, authState, isDark),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // MODE A: REGULAR CLIENT ID + MPIN FORM
  // ==========================================
  Widget _buildRegularLoginForm(
      BuildContext context, AuthState authState, bool isDark) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Client ID / Mobile Number Field
          Text(
            'Registered Mobile Number or Client ID',
            style: TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 12,
              color: isDark ? Colors.white70 : const Color(0xFF475569),
            ),
          ),
          const Gap(5),
          TextFormField(
            controller: _clientIdController,
            keyboardType: TextInputType.text,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 13.5,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(
                horizontal: 14,
                vertical: isDesktop ? 14 : 11,
              ),
              hintText: 'Client ID or Phone Number',
              hintStyle: TextStyle(
                color: isDark ? Colors.white38 : AppColors.textMuted,
                fontWeight: FontWeight.normal,
                fontSize: 13,
              ),
              prefixIcon: Icon(
                Icons.phone_android_rounded,
                size: isDesktop ? 19 : 17,
                color: isDark ? Colors.white54 : const Color(0xFF64748B),
              ),
              filled: true,
              fillColor: isDark
                  ? Colors.white.withAlpha(10)
                  : const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withAlpha(15)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withAlpha(15)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: AppColors.primaryBlue.withAlpha(180),
                  width: 1.5,
                ),
              ),
            ),
          ),
          Gap(isDesktop ? 14 : 9),

          // 2. Client MPIN Field (4-digit numeric code)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Client MPIN',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                  color: isDark ? Colors.white70 : const Color(0xFF475569),
                ),
              ),
              InkWell(
                onTap: () => _showForgotMpinModal(context),
                child: const Text(
                  'Forgot MPIN?',
                  style: TextStyle(
                    color: AppColors.primaryBlue,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const Gap(5),
          TextFormField(
            controller: _mpinController,
            obscureText: _obscureMpin,
            keyboardType: TextInputType.number,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: TextStyle(
              fontWeight: FontWeight.w600,
              letterSpacing: 4,
              fontSize: 14,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(
                horizontal: 14,
                vertical: isDesktop ? 14 : 11,
              ),
              counterText: '',
              hintText: '••••••',
              hintStyle: TextStyle(
                color: isDark ? Colors.white38 : AppColors.textMuted,
                fontWeight: FontWeight.normal,
                fontSize: 13,
              ),
              prefixIcon: Icon(
                Icons.key_rounded,
                size: isDesktop ? 19 : 17,
                color: isDark ? Colors.white54 : const Color(0xFF64748B),
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureMpin
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: isDesktop ? 19 : 17,
                  color: isDark ? Colors.white54 : const Color(0xFF64748B),
                ),
                onPressed: () => setState(() => _obscureMpin = !_obscureMpin),
              ),
              filled: true,
              fillColor: isDark
                  ? Colors.white.withAlpha(10)
                  : const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withAlpha(15)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withAlpha(15)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: AppColors.primaryBlue.withAlpha(180),
                  width: 1.5,
                ),
              ),
            ),
          ),
          Gap(isDesktop ? 12 : 8),

          // 3. Remember Device Checkbox
          Row(
            children: [
              SizedBox(
                height: 20,
                width: 20,
                child: Checkbox(
                  value: authState.rememberDevice,
                  activeColor: AppColors.primaryBlue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                  onChanged: (val) {
                    ref
                        .read(authProvider.notifier)
                        .toggleRememberDevice(val ?? true);
                  },
                ),
              ),
              const Gap(8),
              Text(
                'Remember this device',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white70 : const Color(0xFF475569),
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
          Gap(isDesktop ? 20 : 12),

          // 4. Primary CTA: Sign In Securely Button (Gradient & Soft Shadow)
          Container(
            width: double.infinity,
            height: isDesktop ? 46 : 42,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2563EB).withAlpha(50),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: authState.isLoading ? null : _handleRegularSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: authState.isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lock_outline_rounded, size: isDesktop ? 18 : 16),
                        const Gap(6),
                        Text(
                          'Sign In Securely',
                          style: TextStyle(
                            fontSize: isDesktop ? 14.5 : 13.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Gap(6),
                        Icon(Icons.login_rounded, size: isDesktop ? 18 : 16),
                      ],
                    ),
            ),
          ),
          Gap(isDesktop ? 16 : 10),

          // 5. Line Divider ("or continue with")
          Row(
            children: [
              Expanded(
                child: Divider(
                  color: isDark
                      ? Colors.white.withAlpha(15)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Text(
                  'or continue with',
                  style: TextStyle(
                    color: isDark ? Colors.white54 : const Color(0xFF94A3B8),
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
              Expanded(
                child: Divider(
                  color: isDark
                      ? Colors.white.withAlpha(15)
                      : const Color(0xFFE2E8F0),
                ),
              ),
            ],
          ),
          Gap(isDesktop ? 16 : 10),

          // 6. Secondary CTA: Continue with Google Button (Soft white background)
          SizedBox(
            width: double.infinity,
            height: isDesktop ? 46 : 42,
            child: OutlinedButton(
              onPressed: authState.isLoading
                  ? null
                  : () => _showGoogleAccountPicker(context),
              style: OutlinedButton.styleFrom(
                backgroundColor: isDark ? Colors.white.withAlpha(8) : Colors.white,
                foregroundColor: isDark ? Colors.white : const Color(0xFF334155),
                side: BorderSide(
                  color: isDark
                      ? Colors.white.withAlpha(20)
                      : const Color(0xFFE2E8F0),
                  width: 1.2,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const _GoogleLogoIcon(),
                  const Gap(8),
                  Text(
                    'Continue with Google',
                    style: TextStyle(
                      fontSize: isDesktop ? 13.5 : 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Gap(isDesktop ? 16 : 10),

          // 7. Encrypted Credentials Trust Footer Note
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.check_circle,
                color: Color(0xFF10B981),
                size: 14,
              ),
              const Gap(6),
              Flexible(
                child: Text(
                  'Your account is protected with encrypted client credentials.',
                  style: TextStyle(
                    fontSize: 10.5,
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // MODE B: GOOGLE LINKING FORM (FIRST-TIME USER)
  // ==========================================
  Widget _buildGoogleLinkingForm(
      BuildContext context, AuthState authState, bool isDark) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Highlight Notice Banner Box
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF38BDF8).withAlpha(20),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF38BDF8).withAlpha(60),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline_rounded,
                color: Color(0xFF0284C7),
                size: 18,
              ),
              const Gap(8),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: TextStyle(
                      fontSize: 11.5,
                      height: 1.35,
                      color: isDark ? Colors.white.withAlpha(230) : const Color(0xFF0F172A),
                    ),
                    children: [
                      const TextSpan(text: 'First-time setup for '),
                      TextSpan(
                        text: authState.pendingGoogleEmail ?? 'user@example.com',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                      const TextSpan(
                        text:
                            '. Your next Google sign-in will open the portal directly.',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        Gap(isDesktop ? 16 : 10),

        // Inputs for Client ID & MPIN pairing
        Text(
          'Client ID',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
        ),
        const Gap(5),
        TextFormField(
          controller: _googleClientIdController,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: isDesktop ? 14 : 10,
            ),
            hintText: 'Client ID or Phone Number',
            prefixIcon: Icon(Icons.mail_outline_rounded, size: isDesktop ? 20 : 18),
            filled: true,
            fillColor:
                isDark ? Colors.white.withAlpha(12) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        Gap(isDesktop ? 14 : 9),

        Text(
          'Client MPIN',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
        ),
        const Gap(5),
        TextFormField(
          controller: _googleMpinController,
          obscureText: _obscureGoogleMpin,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            letterSpacing: 4,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: isDesktop ? 14 : 10,
            ),
            counterText: '',
            hintText: '••••••',
            prefixIcon: Icon(Icons.key_rounded, size: isDesktop ? 20 : 18),
            suffixIcon: IconButton(
              icon: Icon(
                _obscureGoogleMpin
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                size: isDesktop ? 20 : 18,
              ),
              onPressed: () =>
                  setState(() => _obscureGoogleMpin = !_obscureGoogleMpin),
            ),
            filled: true,
            fillColor:
                isDark ? Colors.white.withAlpha(12) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        Gap(isDesktop ? 20 : 12),

        // Submit Button: Link & Authenticate
        SizedBox(
          width: double.infinity,
          height: isDesktop ? 48 : 42,
          child: ElevatedButton(
            onPressed: authState.isLoading ? null : _handleGoogleLinkSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D9488),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: authState.isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.link_rounded, size: isDesktop ? 20 : 18),
                      const Gap(6),
                      Text(
                        'Link & Authenticate',
                        style: TextStyle(
                          fontSize: isDesktop ? 15 : 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        Gap(isDesktop ? 14 : 10),

        // Navigation Back Options
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: () => _showGoogleAccountPicker(context),
              child: const Text(
                'Choose another Google account',
                style: TextStyle(fontSize: 11),
              ),
            ),
            TextButton(
              onPressed: () {
                ref.read(authProvider.notifier).resetToRegularMode();
              },
              child: const Text(
                'Back to Client ID login',
                style: TextStyle(fontSize: 11),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ==========================================
  // SUCCESS REDIRECT CARD STATE
  // ==========================================
  Widget _buildSuccessRedirectCard(
      BuildContext context, AuthState authState, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFF10B981).withAlpha(100)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 30,
            offset: Offset(0, 15),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withAlpha(30),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.verified_user_rounded,
              color: Color(0xFF10B981),
              size: 48,
            ),
          ),
          const Gap(20),
          const Text(
            'Session Authenticated!',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Gap(8),
          Text(
            'Welcome back, ${authState.user?.name ?? "Client"}',
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF10B981),
              fontWeight: FontWeight.w600,
            ),
          ),
          const Gap(16),
          Text(
            'Entering protected workspace vault...',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white60 : AppColors.textMuted,
            ),
          ),
          const Gap(24),
          const SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // ALERT BANNER COMPONENT (ERROR / SUCCESS)
  // ==========================================
  Widget _buildAlertBanner(
    BuildContext context, {
    required bool isError,
    required String message,
    required VoidCallback onClose,
  }) {
    final bgColor = isError ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5);
    final borderColor =
        isError ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7);
    final textColor =
        isError ? const Color(0xFF991B1B) : const Color(0xFF065F46);
    final iconData =
        isError ? Icons.shield_moon_outlined : Icons.shield_outlined;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(iconData, color: textColor, size: 20),
          const Gap(10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: textColor,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          InkWell(
            onTap: onClose,
            child: Icon(Icons.close, color: textColor, size: 16),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // FOOTER SERVER STATUS INDICATOR
  // ==========================================
  Widget _buildFooterStatus(BuildContext context, {required bool isCompact}) {
    return Row(
      mainAxisAlignment:
          isCompact ? MainAxisAlignment.center : MainAxisAlignment.start,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: const BoxDecoration(
            color: Color(0xFF10B981),
            shape: BoxShape.circle,
          ),
        ),
        const Gap(8),
        Text(
          'Bima Headquarter by Insuredesk IMF PVT LTD • 256-bit Encrypted',
          style: TextStyle(
            fontSize: 10.5,
            color: isCompact
                ? (Theme.of(context).brightness == Brightness.dark
                    ? Colors.white54
                    : AppColors.textMuted)
                : Colors.white.withAlpha(150),
          ),
        ),
      ],
    );
  }
}

// ==========================================
// GOOGLE ACCOUNT INPUT MODAL DIALOG
// ==========================================
class _GoogleAccountInputDialog extends StatefulWidget {
  final Function(String email, String name) onConfirm;

  const _GoogleAccountInputDialog({required this.onConfirm});

  @override
  State<_GoogleAccountInputDialog> createState() =>
      _GoogleAccountInputDialogState();
}

class _GoogleAccountInputDialogState extends State<_GoogleAccountInputDialog> {
  final _emailCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final email = _emailCtrl.text.trim();
    final name = _nameCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid Google email address.');
      return;
    }
    widget.onConfirm(email, name.isNotEmpty ? name : 'Google User');
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: const Row(
        children: [
          _GoogleLogoIcon(),
          Gap(12),
          Text(
            'Sign in with Google',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Enter your Google account details to link with your BimaHQ Client ID and 6-digit MPIN:',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const Gap(14),
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Google Email',
              hintText: 'name@gmail.com',
              prefixIcon: Icon(Icons.email_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.all(Radius.circular(12)),
              ),
            ),
          ),
          const Gap(10),
          TextField(
            controller: _nameCtrl,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Full Name (Optional)',
              hintText: 'Your name',
              prefixIcon: Icon(Icons.person_outline),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.all(Radius.circular(12)),
              ),
            ),
          ),
          if (_error != null) ...[
            const Gap(8),
            Text(
              _error!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
          ),
          child: const Text('Continue'),
        ),
      ],
    );
  }
}

// ==========================================
// FORGOT MPIN MODAL DIALOG
// ==========================================
class _ForgotMpinModalDialog extends StatelessWidget {
  const _ForgotMpinModalDialog();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: const Row(
        children: [
          Icon(Icons.help_outline_rounded, color: AppColors.primaryBlue),
          Gap(10),
          Text(
            'Reset Client MPIN',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Need help resetting your 6-digit MPIN? Select a verification method below:',
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
          const Gap(16),
          ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFCBD5E1)),
            ),
            leading: const Icon(Icons.chat_bubble_outline_rounded,
                color: Color(0xFF10B981)),
            title: const Text(
              'Request OTP via WhatsApp',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            subtitle: const Text(
              'Receive verification OTP on your registered phone',
              style: TextStyle(fontSize: 11),
            ),
            onTap: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Verification OTP requested for your registered mobile number.'),
                  backgroundColor: Color(0xFF10B981),
                ),
              );
            },
          ),
          const Gap(10),
          ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFCBD5E1)),
            ),
            leading: const Icon(Icons.support_agent_rounded,
                color: AppColors.primaryBlue),
            title: const Text(
              'Contact BimaHQ Support',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            subtitle: const Text(
              'Get direct assistance from your dedicated relationship manager',
              style: TextStyle(fontSize: 11),
            ),
            onTap: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Support request sent to your relationship manager.'),
                  backgroundColor: AppColors.primaryBlue,
                ),
              );
            },
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }
}

// ==========================================
// GOOGLE LOGO ICON COMPONENT
// ==========================================
class _GoogleLogoIcon extends StatelessWidget {
  const _GoogleLogoIcon();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 18,
      height: 18,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final paintRed = Paint()..color = const Color(0xFFEA4335);
    final paintBlue = Paint()..color = const Color(0xFF4285F4);
    final paintGreen = Paint()..color = const Color(0xFF34A853);
    final paintYellow = Paint()..color = const Color(0xFFFBBC05);

    // Draw stylized multi-colored G icon shapes
    final center = Offset(w / 2, h / 2);
    final radius = w / 2;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -0.5,
      1.8,
      true,
      paintRed,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      1.3,
      1.4,
      true,
      paintGreen,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      2.7,
      1.0,
      true,
      paintYellow,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      3.7,
      1.6,
      true,
      paintBlue,
    );

    // Inner cutout circle
    final cutoutPaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.55, cutoutPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ==========================================
// GRID PATTERN PAINTER FOR LEFT PANEL
// ==========================================
class _GridPatternPainter extends CustomPainter {
  final Color lineColor;

  _GridPatternPainter({required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 1.0;

    const double step = 32.0;

    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
