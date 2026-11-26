import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/app_loader.dart';

/// Ultra-Premium Glassmorphism & 3D Interactive Login Screen for BimaHeadquarter.
/// Features dynamic aurora lighting, frosted acrylic glass, and interactive 3D perspective tilt.
class ClientLoginScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLoginSuccess;

  const ClientLoginScreen({super.key, this.onLoginSuccess});

  @override
  ConsumerState<ClientLoginScreen> createState() => _ClientLoginScreenState();
}

class _ClientLoginScreenState extends ConsumerState<ClientLoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _clientIdController = TextEditingController();
  final TextEditingController _mpinController = TextEditingController();

  final FocusNode _clientIdFocus = FocusNode();
  final FocusNode _mpinFocus = FocusNode();

  bool _obscureMpin = true;
  bool _isSuccessRedirecting = false;
  bool _isButtonPressed = false;

  // 3D Tilt parameters (interactive on mouse hover and touch drag)
  double _tiltX = 0.0; // Rotation around X axis (-1.0 to 1.0)
  double _tiltY = 0.0; // Rotation around Y axis (-1.0 to 1.0)

  // Aurora background animation
  late AnimationController _auroraController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _auroraController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat(reverse: true);

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOutCubic,
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _auroraController.dispose();
    _fadeController.dispose();
    _clientIdController.dispose();
    _mpinController.dispose();
    _clientIdFocus.dispose();
    _mpinFocus.dispose();
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
      _clientIdController.text,
      _mpinController.text,
    );

    if (success && mounted) {
      _triggerRedirect();
    }
  }

  void _triggerRedirect() {
    setState(() => _isSuccessRedirecting = true);
    Future.delayed(const Duration(milliseconds: 900), () {
      if (mounted && widget.onLoginSuccess != null) {
        widget.onLoginSuccess!();
      }
    });
  }

  void _showGoogleAccountPicker(BuildContext context) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withAlpha(140),
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: _GoogleAccountInputDialog(
          onConfirm: (email, name) {
            Navigator.of(ctx).pop();
            final authNotifier = ref.read(authProvider.notifier);
            authNotifier.initiateGoogleSignIn(email, name);
          },
        ),
      ),
    );
  }

  void _showForgotMpinModal(BuildContext context) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withAlpha(150),
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: _ForgotMpinModalDialog(
          initialPhone: _clientIdController.text,
          onSuccess: () {
            if (mounted && widget.onLoginSuccess != null) {
              _triggerRedirect();
            }
          },
        ),
      ),
    );
  }

  Future<void> _openAdvisorSupport() async {
    const phone = '918818889660';
    final urlString =
        'https://wa.me/$phone?text=${Uri.encodeComponent('Hello BimaHeadquarter Support, I need assistance logging into my account.')}';
    final uri = Uri.parse(urlString);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  void _onHover(PointerEvent event, Size size) {
    if (event.kind != PointerDeviceKind.mouse) return;
    final center = Offset(size.width / 2, size.height / 2);
    final dx = (event.localPosition.dx - center.dx) / (size.width / 2);
    final dy = (event.localPosition.dy - center.dy) / (size.height / 2);
    setState(() {
      _tiltX = dy.clamp(-0.5, 0.5);
      _tiltY = -dx.clamp(-0.5, 0.5);
    });
  }

  void _onHoverExit(PointerEvent event) {
    setState(() {
      _tiltX = 0.0;
      _tiltY = 0.0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final isSmall = size.width < 480;
    final isGoogleMode = authState.loginMode == 'google';

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF1F5F9),
      body: Stack(
        children: [
          // ── Layer 1: Atmospheric Aurora Mesh Glowing Background ──
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _auroraController,
              builder: (context, _) {
                final t = _auroraController.value;
                return CustomPaint(
                  painter: _AuroraMeshPainter(
                    animationProgress: t,
                    isDark: isDark,
                  ),
                );
              },
            ),
          ),

          // ── Layer 2: Ambient Blur Overlay for depth ──
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
              child: Container(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.35)
                    : Colors.white.withValues(alpha: 0.18),
              ),
            ),
          ),

          // ── Layer 3: Interactive 3D Glassmorphic Card ──
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: IntrinsicHeight(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(
                            horizontal: isSmall ? 18 : 28,
                            vertical: 16,
                          ),
                          child: FadeTransition(
                            opacity: _fadeAnimation,
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 440),
                              child: MouseRegion(
                                onHover: (e) => _onHover(e, const Size(440, 600)),
                                onExit: _onHoverExit,
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 140),
                                  curve: Curves.easeOut,
                                  transform: Matrix4.identity()
                                    ..setEntry(3, 2, 0.0012) // 3D Perspective
                                    ..rotateX(_tiltX * 0.08)  // Tilt around X
                                    ..rotateY(_tiltY * 0.08)  // Tilt around Y
                                  ,
                                  child: _build3DGlassCard(
                                    context,
                                    isDark: isDark,
                                    isSmall: isSmall,
                                    authState: authState,
                                    isGoogleMode: isGoogleMode,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _build3DGlassCard(
    BuildContext context, {
    required bool isDark,
    required bool isSmall,
    required AuthState authState,
    required bool isGoogleMode,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          // 3D Ambient colored glow
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: isDark ? 0.28 : 0.18),
            blurRadius: 48,
            spreadRadius: -4,
            offset: Offset(_tiltY * 18, 16 + _tiltX * 14),
          ),
          // Deep occlusion drop shadow
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.60 : 0.12),
            blurRadius: 32,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: isSmall ? 20 : 32,
              vertical: isSmall ? 20 : 28,
            ),
            decoration: BoxDecoration(
              // Translucent frosted glass gradient
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        const Color(0xFF1E293B).withValues(alpha: 0.82),
                        const Color(0xFF0F172A).withValues(alpha: 0.72),
                      ]
                    : [
                        Colors.white.withValues(alpha: 0.88),
                        Colors.white.withValues(alpha: 0.68),
                      ],
              ),
              borderRadius: BorderRadius.circular(28),
              // Dual-tone 3D Specular border (bright reflection on top-left, soft on bottom-right)
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.18)
                    : Colors.white.withValues(alpha: 0.75),
                width: 1.5,
              ),
            ),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // ── 3D Elevated Brand Squircle Logo ──
                  _build3DLogo(isDark),

                  const Gap(10),

                  Text(
                    'Bima Headquarter',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                      color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                    ),
                  ),
                  const Gap(4),

                  // Heading
                  Text(
                    isGoogleMode ? 'Link Google Account' : 'Sign In',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: isSmall ? 22 : 24,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.6,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const Gap(4),
                  Text(
                    isGoogleMode
                        ? 'Enter your credentials to pair your Google account with BimaHeadquarter.'
                        : 'Access your policies, claims, and renewals.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      height: 1.35,
                    ),
                  ),

                  // Google Mode Alert Card
                  if (isGoogleMode) ...[
                    const Gap(12),
                    _buildGoogleModeChip(isDark, authState),
                  ],

                  // Inline Error Banner
                  if (authState.errorMessage != null && !_isSuccessRedirecting) ...[
                    const Gap(12),
                    _buildErrorBanner(isDark, authState.errorMessage!),
                  ],

                  // Redirecting Success Banner
                  if (_isSuccessRedirecting) ...[
                    const Gap(12),
                    _buildSuccessBanner(isDark),
                  ],

                  const Gap(16),

                  // ── Glassmorphic Field: Mobile / Client ID ──
                  _buildGlassField(
                    controller: _clientIdController,
                    focusNode: _clientIdFocus,
                    label: 'Mobile Number or Client ID',
                    hintText: 'Enter Mobile Number or Client ID',
                    icon: Icons.person_outline_rounded,
                    isDark: isDark,
                    keyboardType: TextInputType.text,
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => _mpinFocus.requestFocus(),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Please enter your registered Mobile or Client ID';
                      }
                      return null;
                    },
                  ),

                  const Gap(16),

                  // ── Glassmorphic Field: Client MPIN ──
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Client MPIN',
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => _showForgotMpinModal(context),
                            child: Text(
                              'Forgot MPIN?',
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF0071E3),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Gap(7),
                      _buildGlassField(
                        controller: _mpinController,
                        focusNode: _mpinFocus,
                        label: '',
                        hintText: '4 to 6-digit MPIN',
                        icon: Icons.lock_outline_rounded,
                        isDark: isDark,
                        obscureText: _obscureMpin,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        maxLength: 6,
                        onSubmitted: (_) {
                          if (isGoogleMode) {
                            _handleGoogleLinkSubmit();
                          } else {
                            _handleRegularSubmit();
                          }
                        },
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureMpin ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            size: 19,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                          onPressed: () => setState(() => _obscureMpin = !_obscureMpin),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter your MPIN';
                          }
                          if (val.trim().length < 4 || val.trim().length > 6) {
                            return 'MPIN must be 4 to 6 digits';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),

                  const Gap(22),

                  // ── 3D Gradient CTA Primary Button ──
                  _build3DPrimaryButton(
                    isDark: isDark,
                    isLoading: authState.isLoading,
                    isGoogleMode: isGoogleMode,
                  ),

                  // Secondary Google Sign-In Option
                  if (!isGoogleMode) ...[
                    const Gap(18),
                    Row(
                      children: [
                        Expanded(
                          child: Divider(
                            color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                            thickness: 1,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Text(
                            'or',
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Divider(
                            color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                            thickness: 1,
                          ),
                        ),
                      ],
                    ),
                    const Gap(18),
                    _buildGlassGoogleButton(isDark),
                  ],

                  const Gap(24),

                  // Security Footnote & Regulatory compliance
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.lock_rounded,
                          size: 12,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                        const Gap(5),
                        Text(
                          '256-bit encryption • IRDAI Compliant',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Gap(6),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: GestureDetector(
                      onTap: _openAdvisorSupport,
                      child: Text(
                        'Need assistance? Contact your Advisor',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF0071E3),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _build3DLogo(bool isDark) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.18) : Colors.white,
          width: 2,
        ),
        boxShadow: [
          // 3D Rim and Depth Shadow
          BoxShadow(
            color: const Color(0xFF0071E3).withValues(alpha: 0.30),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Image.asset(
          'assets/brand/app-logo.png',
          fit: BoxFit.cover,
          errorBuilder: (ctx, err, stack) => const Icon(
            Icons.shield_rounded,
            size: 28,
            color: Color(0xFF0071E3),
          ),
        ),
      ),
    );
  }

  Widget _buildGlassField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String label,
    required String hintText,
    required IconData icon,
    required bool isDark,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
    TextInputAction textInputAction = TextInputAction.next,
    int? maxLength,
    Widget? suffixIcon,
    ValueChanged<String>? onSubmitted,
    FormFieldValidator<String>? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label.isNotEmpty) ...[
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
            ),
          ),
          const Gap(7),
        ],
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            // Glassmorphic translucent surface for inputs
            color: isDark
                ? Colors.black.withValues(alpha: 0.28)
                : Colors.white.withValues(alpha: 0.65),
            border: Border.all(
              color: focusNode.hasFocus
                  ? const Color(0xFF0071E3)
                  : (isDark ? Colors.white.withValues(alpha: 0.12) : const Color(0xFFCBD5E1)),
              width: focusNode.hasFocus ? 1.6 : 1.0,
            ),
            boxShadow: [
              if (focusNode.hasFocus)
                BoxShadow(
                  color: const Color(0xFF0071E3).withValues(alpha: 0.25),
                  blurRadius: 12,
                  spreadRadius: 1,
                ),
            ],
          ),
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            obscureText: obscureText,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            maxLength: maxLength,
            onFieldSubmitted: onSubmitted,
            validator: validator,
            style: GoogleFonts.inter(
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
            decoration: InputDecoration(
              counterText: '',
              hintText: hintText,
              hintStyle: GoogleFonts.inter(
                fontSize: 13.5,
                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
              ),
              prefixIcon: Icon(
                icon,
                size: 20,
                color: focusNode.hasFocus
                    ? const Color(0xFF0071E3)
                    : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
              ),
              suffixIcon: suffixIcon,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _build3DPrimaryButton({
    required bool isDark,
    required bool isLoading,
    required bool isGoogleMode,
  }) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isButtonPressed = true),
      onTapUp: (_) => setState(() => _isButtonPressed = false),
      onTapCancel: () => setState(() => _isButtonPressed = false),
      onTap: isLoading
          ? null
          : () {
              if (isGoogleMode) {
                _handleGoogleLinkSubmit();
              } else {
                _handleRegularSubmit();
              }
            },
      child: AnimatedScale(
        scale: _isButtonPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: Container(
          width: double.infinity,
          height: 52,
          decoration: BoxDecoration(
            // 3D Vibrant Gradient
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF0071E3),
                Color(0xFF2563EB),
                Color(0xFF3B82F6),
              ],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.35),
              width: 1.2,
            ),
            boxShadow: [
              // 3D Specular Elevation Glow
              BoxShadow(
                color: const Color(0xFF0071E3).withValues(alpha: 0.40),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Center(
            child: isLoading
                ? const AppSmallLoader(size: 20)
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isGoogleMode ? 'Confirm & Sign In' : 'Sign In',
                        style: GoogleFonts.inter(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                          color: Colors.white,
                        ),
                      ),
                      const Gap(8),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        size: 18,
                        color: Colors.white,
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildGlassGoogleButton(bool isDark) {
    return Container(
      width: double.infinity,
      height: 50,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.white.withValues(alpha: 0.70),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.14) : const Color(0xFFE2E8F0),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showForgotMpinModal(context),
          borderRadius: BorderRadius.circular(14),
          child: Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.sms_outlined,
                  size: 18,
                  color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                ),
                const Gap(10),
                Text(
                  'Login / Set MPIN via OTP',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGoogleModeChip(bool isDark, AuthState authState) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.07) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.12) : const Color(0xFFCBD5E1),
        ),
      ),
      child: Row(
        children: [
          const _GoogleLogoIcon(size: 17),
          const Gap(10),
          Expanded(
            child: Text(
              authState.pendingGoogleEmail ?? 'Google Account',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          InkWell(
            onTap: () => ref.read(authProvider.notifier).resetToRegularMode(),
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              child: Text(
                'Cancel',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF0071E3),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(bool isDark, String error) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444).withValues(alpha: isDark ? 0.20 : 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFEF4444).withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 18,
            color: Color(0xFFEF4444),
          ),
          const Gap(10),
          Expanded(
            child: Text(
              error,
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
                color: const Color(0xFFEF4444),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessBanner(bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: isDark ? 0.20 : 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF10B981).withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.check_circle_rounded,
            size: 18,
            color: Color(0xFF10B981),
          ),
          const Gap(10),
          Expanded(
            child: Text(
              'Sign in verified! Redirecting to your policies...',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF10B981),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom Painter for Atmospheric Glowing Aurora Mesh
class _AuroraMeshPainter extends CustomPainter {
  final double animationProgress;
  final bool isDark;

  _AuroraMeshPainter({
    required this.animationProgress,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Orb 1: Royal Blue / Indigo (Top-Left)
    final orb1Center = Offset(
      w * 0.25 + math.sin(animationProgress * math.pi * 2) * 50,
      h * 0.20 + math.cos(animationProgress * math.pi * 2) * 40,
    );
    final orb1Paint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF2563EB).withValues(alpha: isDark ? 0.45 : 0.32),
          const Color(0xFF1D4ED8).withValues(alpha: isDark ? 0.25 : 0.15),
          Colors.transparent,
        ],
        stops: const [0.0, 0.45, 1.0],
      ).createShader(Rect.fromCircle(center: orb1Center, radius: w * 0.55));
    canvas.drawCircle(orb1Center, w * 0.55, orb1Paint);

    // Orb 2: Vibrant Cyan / Emerald (Bottom-Right)
    final orb2Center = Offset(
      w * 0.80 - math.cos(animationProgress * math.pi * 2) * 60,
      h * 0.75 + math.sin(animationProgress * math.pi * 2) * 50,
    );
    final orb2Paint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF06B6D4).withValues(alpha: isDark ? 0.35 : 0.25),
          const Color(0xFF0D9488).withValues(alpha: isDark ? 0.20 : 0.10),
          Colors.transparent,
        ],
        stops: const [0.0, 0.40, 1.0],
      ).createShader(Rect.fromCircle(center: orb2Center, radius: w * 0.60));
    canvas.drawCircle(orb2Center, w * 0.60, orb2Paint);

    // Orb 3: Violet / Purple Accent (Top-Right)
    final orb3Center = Offset(
      w * 0.85 + math.sin(animationProgress * math.pi * 2) * 35,
      h * 0.15 - math.cos(animationProgress * math.pi * 2) * 35,
    );
    final orb3Paint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF8B5CF6).withValues(alpha: isDark ? 0.30 : 0.18),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: orb3Center, radius: w * 0.45));
    canvas.drawCircle(orb3Center, w * 0.45, orb3Paint);
  }

  @override
  bool shouldRepaint(covariant _AuroraMeshPainter oldDelegate) {
    return oldDelegate.animationProgress != animationProgress ||
        oldDelegate.isDark != isDark;
  }
}

/// Glassmorphic Google Sign-In Dialog
class _GoogleAccountInputDialog extends StatefulWidget {
  final Function(String email, String name) onConfirm;

  const _GoogleAccountInputDialog({required this.onConfirm});

  @override
  State<_GoogleAccountInputDialog> createState() => _GoogleAccountInputDialogState();
}

class _GoogleAccountInputDialogState extends State<_GoogleAccountInputDialog> {
  final _emailController = TextEditingController();
  final _nameController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    final email = _emailController.text.trim();
    final name = _nameController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid Google email address');
      return;
    }
    widget.onConfirm(email, name.isEmpty ? email.split('@').first : name);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    const Color(0xFF1E293B).withValues(alpha: 0.92),
                    const Color(0xFF0F172A).withValues(alpha: 0.88),
                  ]
                : [
                    Colors.white.withValues(alpha: 0.95),
                    Colors.white.withValues(alpha: 0.88),
                  ],
          ),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.8),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.all(26),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const _GoogleLogoIcon(size: 22),
                const Gap(10),
                Text(
                  'Continue with Google',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.4,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            const Gap(8),
            Text(
              'Enter your Google account email to link with your portfolio.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
            const Gap(18),
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _error!,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFFEF4444),
                  ),
                ),
              ),
              const Gap(12),
            ],
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              style: GoogleFonts.inter(fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Google Email Address *',
                hintText: 'name@gmail.com',
                prefixIcon: const Icon(Icons.email_outlined, size: 20),
                filled: true,
                fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFCBD5E1)),
                ),
              ),
            ),
            const Gap(14),
            TextField(
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              style: GoogleFonts.inter(fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Your Name (Optional)',
                hintText: 'e.g. Rahul Sharma',
                prefixIcon: const Icon(Icons.person_outline, size: 20),
                filled: true,
                fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFCBD5E1)),
                ),
              ),
            ),
            const Gap(22),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'Cancel',
                    style: GoogleFonts.inter(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    ),
                  ),
                ),
                const Gap(8),
                ElevatedButton(
                  onPressed: _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0071E3),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  child: Text(
                    'Continue',
                    style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Glassmorphic Forgot MPIN Modal Dialog
class _ForgotMpinModalDialog extends StatefulWidget {
  final String initialPhone;
  final VoidCallback onSuccess;

  const _ForgotMpinModalDialog({
    required this.initialPhone,
    required this.onSuccess,
  });

  @override
  State<_ForgotMpinModalDialog> createState() => _ForgotMpinModalDialogState();
}

class _ForgotMpinModalDialogState extends State<_ForgotMpinModalDialog> {
  int _step = 1; // 1: Enter Phone & Request OTP, 2: Enter OTP & Set New MPIN
  bool _isLoading = false;
  String? _error;
  String? _successMsg;

  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _newMpinController = TextEditingController();
  final _confirmMpinController = TextEditingController();

  int _resendCooldown = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _phoneController.text = widget.initialPhone;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _newMpinController.dispose();
    _confirmMpinController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    setState(() => _resendCooldown = 30);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCooldown > 0) {
        setState(() => _resendCooldown--);
      } else {
        timer.cancel();
      }
    });
  }

  void _handleSendOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone.length < 10) {
      setState(() => _error = 'Please enter your registered 10-digit mobile number.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await ApiService.sendClientOtp(phone);
      if (res['success'] == true) {
        setState(() {
          _step = 2;
          _isLoading = false;
          _successMsg = res['message'] ?? 'OTP code sent to your registered phone.';
        });
        _startTimer();
      } else {
        setState(() {
          _isLoading = false;
          _error = res['error'] ?? 'Could not send verification code.';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Error sending code: ${e.toString().replaceAll("Exception:", "").trim()}';
      });
    }
  }

  void _handleVerifyAndReset() async {
    final otp = _otpController.text.trim();
    final newMpin = _newMpinController.text.trim();
    final confirmMpin = _confirmMpinController.text.trim();

    if (otp.length != 6) {
      setState(() => _error = 'Please enter the 6-digit verification code.');
      return;
    }
    if (newMpin.length < 4 || newMpin.length > 6) {
      setState(() => _error = 'New MPIN must be 4 to 6 numeric digits.');
      return;
    }
    if (newMpin != confirmMpin) {
      setState(() => _error = 'New MPIN and Confirm MPIN do not match.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await ApiService.verifyOtpAndSetMpin(
        phone: _phoneController.text.trim(),
        otp: otp,
        newMpin: newMpin,
      );

      if (res['success'] == true) {
        setState(() => _isLoading = false);
        if (mounted) {
          Navigator.of(context).pop();
          widget.onSuccess();
        }
      } else {
        setState(() {
          _isLoading = false;
          _error = res['error'] ?? 'Verification failed. Please check the code.';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Failed to reset MPIN: ${e.toString().replaceAll("Exception:", "").trim()}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    const Color(0xFF1E293B).withValues(alpha: 0.92),
                    const Color(0xFF0F172A).withValues(alpha: 0.88),
                  ]
                : [
                    Colors.white.withValues(alpha: 0.95),
                    Colors.white.withValues(alpha: 0.88),
                  ],
          ),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.8),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.all(26),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0071E3).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.lock_reset_rounded,
                    color: Color(0xFF0071E3),
                    size: 22,
                  ),
                ),
                const Gap(12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _step == 1 ? 'Reset Your MPIN' : 'Verify Code & Set MPIN',
                        style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.4,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const Gap(2),
                      Text(
                        _step == 1
                            ? 'We will send a 6-digit OTP code to verify your identity.'
                            : 'Enter the OTP and choose a new 4 to 6-digit MPIN.',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Gap(18),
            if (_error != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _error!,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFFEF4444),
                  ),
                ),
              ),
              const Gap(12),
            ],
            if (_successMsg != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _successMsg!,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF10B981),
                  ),
                ),
              ),
              const Gap(12),
            ],
            if (_step == 1) ...[
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: GoogleFonts.inter(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Registered Mobile Number *',
                  hintText: 'Enter 10-digit Mobile Number',
                  prefixIcon: const Icon(Icons.phone_iphone_rounded, size: 20),
                  filled: true,
                  fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFCBD5E1)),
                  ),
                ),
              ),
            ] else ...[
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                style: GoogleFonts.jetBrainsMono(fontSize: 16, letterSpacing: 4),
                decoration: InputDecoration(
                  labelText: '6-Digit OTP Code *',
                  counterText: '',
                  prefixIcon: const Icon(Icons.security_rounded, size: 20),
                  filled: true,
                  fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFCBD5E1)),
                  ),
                ),
              ),
              const Gap(12),
              TextField(
                controller: _newMpinController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                obscureText: true,
                style: GoogleFonts.inter(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'New 4 to 6-digit MPIN *',
                  counterText: '',
                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                  filled: true,
                  fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFCBD5E1)),
                  ),
                ),
              ),
              const Gap(12),
              TextField(
                controller: _confirmMpinController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                obscureText: true,
                style: GoogleFonts.inter(fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Confirm New MPIN *',
                  counterText: '',
                  prefixIcon: const Icon(Icons.lock_rounded, size: 20),
                  filled: true,
                  fillColor: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFCBD5E1)),
                  ),
                ),
              ),
              const Gap(10),
              if (_resendCooldown > 0)
                Text(
                  'Resend code in $_resendCooldown seconds',
                  style: GoogleFonts.inter(fontSize: 11.5, color: const Color(0xFF64748B)),
                )
              else
                GestureDetector(
                  onTap: _handleSendOtp,
                  child: Text(
                    'Resend OTP Code',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF0071E3),
                    ),
                  ),
                ),
            ],
            const Gap(22),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'Cancel',
                    style: GoogleFonts.inter(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    ),
                  ),
                ),
                const Gap(8),
                ElevatedButton(
                  onPressed: _isLoading
                      ? null
                      : (_step == 1 ? _handleSendOtp : _handleVerifyAndReset),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0071E3),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  child: _isLoading
                      ? const AppSmallLoader(size: 16)
                      : Text(
                          _step == 1 ? 'Send Code' : 'Set MPIN & Sign In',
                          style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Official Vector Google G Logo Icon
class _GoogleLogoIcon extends StatelessWidget {
  final double size;
  const _GoogleLogoIcon({this.size = 18});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
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

    final redPaint = Paint()..color = const Color(0xFFEA4335);
    final bluePaint = Paint()..color = const Color(0xFF4285F4);
    final yellowPaint = Paint()..color = const Color(0xFFFBBC05);
    final greenPaint = Paint()..color = const Color(0xFF34A853);

    // Blue horizontal bar & right arc
    final bluePath = Path()
      ..moveTo(w * 0.5, h * 0.42)
      ..lineTo(w * 0.95, h * 0.42)
      ..arcToPoint(
        Offset(w * 0.88, h * 0.72),
        radius: Radius.circular(w * 0.48),
        clockwise: true,
      )
      ..lineTo(w * 0.5, h * 0.5)
      ..close();
    canvas.drawPath(bluePath, bluePaint);

    // Red top arc
    final redPath = Path()
      ..moveTo(w * 0.5, h * 0.05)
      ..arcToPoint(
        Offset(w * 0.86, h * 0.22),
        radius: Radius.circular(w * 0.45),
        clockwise: true,
      )
      ..lineTo(w * 0.72, h * 0.35)
      ..arcToPoint(
        Offset(w * 0.5, h * 0.22),
        radius: Radius.circular(w * 0.3),
        clockwise: false,
      )
      ..close();
    canvas.drawPath(redPath, redPaint);

    // Yellow left arc
    final yellowPath = Path()
      ..moveTo(w * 0.5, h * 0.05)
      ..arcToPoint(
        Offset(w * 0.14, h * 0.28),
        radius: Radius.circular(w * 0.45),
        clockwise: false,
      )
      ..lineTo(w * 0.28, h * 0.39)
      ..arcToPoint(
        Offset(w * 0.5, h * 0.22),
        radius: Radius.circular(w * 0.3),
        clockwise: true,
      )
      ..close();
    canvas.drawPath(yellowPath, yellowPaint);

    // Green bottom arc
    final greenPath = Path()
      ..moveTo(w * 0.14, h * 0.28)
      ..arcToPoint(
        Offset(w * 0.5, h * 0.95),
        radius: Radius.circular(w * 0.45),
        clockwise: false,
      )
      ..arcToPoint(
        Offset(w * 0.88, h * 0.72),
        radius: Radius.circular(w * 0.45),
        clockwise: false,
      )
      ..lineTo(w * 0.72, h * 0.6)
      ..arcToPoint(
        Offset(w * 0.5, h * 0.78),
        radius: Radius.circular(w * 0.3),
        clockwise: true,
      )
      ..arcToPoint(
        Offset(w * 0.28, h * 0.39),
        radius: Radius.circular(w * 0.3),
        clockwise: true,
      )
      ..close();
    canvas.drawPath(greenPath, greenPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
