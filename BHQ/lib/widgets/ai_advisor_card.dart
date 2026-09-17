import 'package:flutter/material.dart';

class AdvisorOffer {
  final String id;
  final String eyebrow;
  final String headline;
  final String description;
  final String ctaLabel;
  final IconData ctaIcon;
  final List<Color> gradient;
  final Color accentColor;
  final Widget backgroundArt;
  final String tag;
  final String title;

  const AdvisorOffer({
    required this.id,
    required this.eyebrow,
    required this.headline,
    required this.description,
    required this.ctaLabel,
    required this.ctaIcon,
    required this.gradient,
    required this.accentColor,
    required this.backgroundArt,
    String? tag,
    String? title,
  })  : tag = tag ?? eyebrow,
        title = title ?? headline;
}

class AiAdvisorCard extends StatefulWidget {
  final Function(String action)? onActionTap;
  final VoidCallback? onAnalyzeTap;

  const AiAdvisorCard({
    super.key,
    this.onActionTap,
    this.onAnalyzeTap,
  });

  static final List<AdvisorOffer> offers = [
    AdvisorOffer(
      id: 'tax_optimizer',
      eyebrow: 'TAX OPTIMIZER 2026',
      headline: 'Save up to ₹46,800 Tax under Sec 80D & 80C',
      description:
          'Generate instant IRDAI-compliant tax deduction certificates across all policies.',
      ctaLabel: 'Download Tax Receipts',
      ctaIcon: Icons.arrow_forward_rounded,
      gradient: const [
        Color(0xFF0F172A),
        Color(0xFF1E1B4B),
        Color(0xFF311042),
      ],
      accentColor: const Color(0xFFC084FC),
      backgroundArt: const _TaxGraphArt(),
    ),
    AdvisorOffer(
      id: 'motor_renewal',
      eyebrow: 'EXPRESS MOTOR RENEWAL',
      headline: 'Get 50% NCB Discount + Free Zero Dep Cover',
      description:
          'Lock in maximum NCB savings before your vehicle cover expires. Instant renewal with zero-dep protection.',
      ctaLabel: 'Claim 50% Discount',
      ctaIcon: Icons.directions_car_rounded,
      gradient: const [
        Color(0xFF064E3B),
        Color(0xFF022C22),
        Color(0xFF0F172A),
      ],
      accentColor: const Color(0xFF34D399),
      backgroundArt: const _MotorTimelineArt(),
    ),
    AdvisorOffer(
      id: 'cyber_shield',
      eyebrow: 'LIMITED TIME UPGRADE',
      headline: 'Complimentary ₹5 Lakh Cyber Theft Shield',
      description:
          'Protect online banking, UPI payments & digital transactions at zero added cost.',
      ctaLabel: 'Activate Shield Free',
      ctaIcon: Icons.verified_user_rounded,
      gradient: const [
        Color(0xFF1E293B),
        Color(0xFF1E3A8A),
        Color(0xFF0F172A),
      ],
      accentColor: const Color(0xFF38BDF8),
      backgroundArt: const _CyberShieldArt(),
    ),
    AdvisorOffer(
      id: 'health_floater',
      eyebrow: 'AI INSIGHTS ADVISOR',
      headline: 'Save up to ₹14,200 on Health Family Floater',
      description:
          'Compare top insurers for comprehensive cashless hospital networks in your city.',
      ctaLabel: 'Analyze Policy Now',
      ctaIcon: Icons.auto_awesome_rounded,
      gradient: const [
        Color(0xFF0F172A),
        Color(0xFF111827),
        Color(0xFF0D9488),
      ],
      accentColor: const Color(0xFF2DD4BF),
      backgroundArt: const _HealthGraphArt(),
    ),
  ];

  @override
  State<AiAdvisorCard> createState() => _AiAdvisorCardState();
}

class _AiAdvisorCardState extends State<AiAdvisorCard>
    with SingleTickerProviderStateMixin {
  late final PageController _pageController;
  late final AnimationController _progressController;

  int _currentIndex = 0;
  bool _isHovered = false;
  bool _isUserDragging = false;
  double _dragOffset = 0.0;
  Offset _pointerPosition = Offset.zero;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 1.0);
    _pageController.addListener(_onPageScroll);

    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    );

    _progressController.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        _goToNextPage();
      }
    });

    _startTimer();
  }

  void _onPageScroll() {
    if (mounted) {
      setState(() {});
    }
  }

  void _startTimer() {
    if (!_isHovered && !_isUserDragging && mounted) {
      _progressController.forward(from: _progressController.value);
    }
  }

  void _pauseTimer() {
    _progressController.stop();
  }

  void _goToNextPage() {
    final nextIndex = (_currentIndex + 1) % AiAdvisorCard.offers.length;
    if (_pageController.hasClients) {
      _pageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 700),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  void dispose() {
    _pageController.removeListener(_onPageScroll);
    _progressController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 480;

    return MouseRegion(
      onEnter: (_) {
        setState(() => _isHovered = true);
        _pauseTimer();
      },
      onExit: (_) {
        setState(() {
          _isHovered = false;
          _pointerPosition = Offset.zero;
        });
        _startTimer();
      },
      onHover: (event) {
        final renderBox = context.findRenderObject() as RenderBox?;
        if (renderBox != null) {
          final size = renderBox.size;
          final localPos = event.localPosition;
          setState(() {
            _pointerPosition = Offset(
              ((localPos.dx / size.width) - 0.5) * 16.0,
              ((localPos.dy / size.height) - 0.5) * 16.0,
            );
          });
        }
      },
      child: GestureDetector(
        onPanStart: (_) {
          setState(() => _isUserDragging = true);
          _pauseTimer();
        },
        onPanUpdate: (details) {
          setState(() => _dragOffset += details.delta.dx);
        },
        onPanEnd: (details) {
          setState(() => _isUserDragging = false);
          if (_dragOffset.abs() > 40) {
            if (_dragOffset < 0) {
              _goToNextPage();
            } else {
              final prevIndex = (_currentIndex - 1 + AiAdvisorCard.offers.length) %
                  AiAdvisorCard.offers.length;
              if (_pageController.hasClients) {
                _pageController.animateToPage(
                  prevIndex,
                  duration: const Duration(milliseconds: 700),
                  curve: Curves.easeOutCubic,
                );
              }
            }
          }
          setState(() => _dragOffset = 0.0);
          _startTimer();
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          clipBehavior: Clip.antiAlias,
          child: SizedBox(
            height: isSmall ? 185 : 205,
            child: Stack(
              children: [
                PageView.builder(
                  key: ValueKey('advisor_carousel_${_pageController.hashCode}'),
                  controller: _pageController,
                  clipBehavior: Clip.antiAlias,
                  onPageChanged: (index) {
                    setState(() {
                      _currentIndex = index;
                    });
                    _progressController.forward(from: 0.0);
                  },
                  itemCount: AiAdvisorCard.offers.length,
                  itemBuilder: (context, index) {
                    final offer = AiAdvisorCard.offers[index];

                    final pageOffset = (_currentIndex - index).toDouble();
                    final parallaxX = (pageOffset * 30.0 + _pointerPosition.dx).clamp(-40.0, 40.0);
                    final parallaxY = _pointerPosition.dy.clamp(-15.0, 15.0);

                    return Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        clipBehavior: Clip.antiAlias,
                        child: Container(
                          padding: EdgeInsets.symmetric(
                              horizontal: isSmall ? 16 : 24, vertical: isSmall ? 14 : 20),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: offer.gradient,
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                          ),
                          child: Stack(
                            clipBehavior: Clip.hardEdge,
                            children: [
                              // 1. Custom Feature-Specific Abstract Artwork
                              Positioned.fill(
                                child: Transform.translate(
                                  offset: Offset(parallaxX, parallaxY),
                                  child: Opacity(
                                    opacity: 0.85,
                                    child: offer.backgroundArt,
                                  ),
                                ),
                              ),

                              // Top Edge Glow Highlight
                              Positioned(
                                top: -20,
                                left: 0,
                                right: 0,
                                child: Container(
                                  height: 1,
                                  decoration: BoxDecoration(
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.white.withAlpha(50),
                                        blurRadius: 10,
                                        spreadRadius: 1,
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              // 2. Main Card Content
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  // Top Header Row: Eyebrow Tag & Engraved Counter
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        offer.eyebrow,
                                        style: TextStyle(
                                          color: Colors.white.withAlpha(170),
                                          fontSize: isSmall ? 9.5 : 10.5,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: isSmall ? 1.0 : 1.6,
                                        ),
                                      ),
                                      Text(
                                        '0${index + 1} / 0${AiAdvisorCard.offers.length}',
                                        style: TextStyle(
                                          color: Colors.white.withAlpha(130),
                                          fontSize: isSmall ? 10.0 : 11.0,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                    ],
                                  ),

                                  // Headline & Description Stack
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        offer.headline,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: isSmall ? 15.0 : 17.5,
                                          fontWeight: FontWeight.w800,
                                          height: 1.2,
                                          letterSpacing: -0.3,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        offer.description,
                                        style: TextStyle(
                                          color: Colors.white.withAlpha(150),
                                          fontSize: isSmall ? 11.0 : 12.0,
                                          height: 1.25,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),

                                  // Glass Pill CTA Button
                                  _GlassPillButton(
                                    label: offer.ctaLabel,
                                    icon: offer.ctaIcon,
                                    accentColor: offer.accentColor,
                                    isSmall: isSmall,
                                    onTap: () {
                                      widget.onActionTap?.call(offer.ctaLabel);
                                      widget.onAnalyzeTap?.call();
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),

                // 3. Segmented Animated Progress Capsules (Bottom Right)
                Positioned(
                  bottom: isSmall ? 12 : 14,
                  right: isSmall ? 14 : 22,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(
                      AiAdvisorCard.offers.length,
                      (dotIndex) {
                        final isActive = _currentIndex == dotIndex;
                        final activeOffer = AiAdvisorCard.offers[_currentIndex];

                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeOutCubic,
                          margin: EdgeInsets.only(left: isSmall ? 3 : 5),
                          width: isActive ? (isSmall ? 28 : 56) : (isSmall ? 8 : 14),
                          height: 3.5,
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(45),
                            borderRadius: BorderRadius.circular(2),
                          ),
                          child: isActive
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(2),
                                  child: AnimatedBuilder(
                                    animation: _progressController,
                                    builder: (context, child) {
                                      return FractionallySizedBox(
                                        alignment: Alignment.centerLeft,
                                        widthFactor: _progressController.value,
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: activeOffer.accentColor,
                                            borderRadius:
                                                BorderRadius.circular(2),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                )
                              : null,
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact Glass Pill CTA Button
class _GlassPillButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final Color accentColor;
  final bool isSmall;
  final VoidCallback onTap;

  const _GlassPillButton({
    required this.label,
    required this.icon,
    required this.accentColor,
    this.isSmall = false,
    required this.onTap,
  });

  @override
  State<_GlassPillButton> createState() => _GlassPillButtonState();
}

class _GlassPillButtonState extends State<_GlassPillButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        transformAlignment: Alignment.center,
        transform: Matrix4.translationValues(0, _isHovered ? -2.0 : 0.0, 0.0),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(100),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              height: widget.isSmall ? 32 : 38,
              padding: EdgeInsets.symmetric(horizontal: widget.isSmall ? 10 : 16),
              decoration: BoxDecoration(
                color: _isHovered
                    ? Colors.white.withAlpha(250)
                    : Colors.white.withAlpha(235),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                  color: Colors.white.withAlpha(100),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(_isHovered ? 40 : 20),
                    blurRadius: _isHovered ? 14 : 8,
                    offset: Offset(0, _isHovered ? 6 : 3),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.label,
                    style: TextStyle(
                      color: const Color(0xFF0F172A),
                      fontSize: widget.isSmall ? 10.5 : 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  SizedBox(width: widget.isSmall ? 5 : 8),
                  AnimatedPadding(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutCubic,
                    padding: EdgeInsets.only(left: _isHovered ? 4 : 0),
                    child: Icon(
                      widget.icon,
                      size: widget.isSmall ? 12 : 14,
                      color: const Color(0xFF0F172A),
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
}

/// Abstract Background Artwork 1: Flowing Financial Graph & Receipt Docs
class _TaxGraphArt extends StatelessWidget {
  const _TaxGraphArt();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _TaxPainter(),
    );
  }
}

class _TaxPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withAlpha(15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final path = Path();
    path.moveTo(size.width * 0.45, size.height * 0.85);
    path.cubicTo(
      size.width * 0.60,
      size.height * 0.90,
      size.width * 0.70,
      size.height * 0.35,
      size.width * 0.95,
      size.height * 0.15,
    );

    canvas.drawPath(path, paint);

    final docRect = RRect.fromLTRBR(
      size.width * 0.72,
      size.height * 0.20,
      size.width * 0.92,
      size.height * 0.75,
      const Radius.circular(10),
    );

    final fillPaint = Paint()
      ..color = Colors.white.withAlpha(10)
      ..style = PaintingStyle.fill;

    canvas.drawRRect(docRect, fillPaint);
    canvas.drawRRect(docRect, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Abstract Background Artwork 2: Express Motor Timeline & Vectors
class _MotorTimelineArt extends StatelessWidget {
  const _MotorTimelineArt();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _MotorPainter(),
    );
  }
}

class _MotorPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF34D399).withAlpha(20)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    final path = Path();
    path.moveTo(size.width * 0.50, size.height * 0.90);
    path.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.50,
      size.width * 0.98,
      size.height * 0.25,
    );

    canvas.drawPath(path, paint);

    final circlePaint = Paint()
      ..color = const Color(0xFF34D399).withAlpha(15)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.40),
      35,
      circlePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Abstract Background Artwork 3: Cyber Security Shield Grid
class _CyberShieldArt extends StatelessWidget {
  const _CyberShieldArt();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _CyberPainter(),
    );
  }
}

class _CyberPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF38BDF8).withAlpha(20)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final shieldPath = Path();
    final cx = size.width * 0.82;
    final cy = size.height * 0.50;

    shieldPath.moveTo(cx - 30, cy - 35);
    shieldPath.lineTo(cx + 30, cy - 35);
    shieldPath.lineTo(cx + 30, cy + 5);
    shieldPath.quadraticBezierTo(cx, cy + 45, cx - 30, cy + 5);
    shieldPath.close();

    canvas.drawPath(shieldPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Abstract Background Artwork 4: Health Biometric Wave
class _HealthGraphArt extends StatelessWidget {
  const _HealthGraphArt();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _HealthPainter(),
    );
  }
}

class _HealthPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF2DD4BF).withAlpha(20)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final wavePath = Path();
    wavePath.moveTo(size.width * 0.40, size.height * 0.65);
    wavePath.lineTo(size.width * 0.60, size.height * 0.65);
    wavePath.lineTo(size.width * 0.65, size.height * 0.35);
    wavePath.lineTo(size.width * 0.72, size.height * 0.85);
    wavePath.lineTo(size.width * 0.78, size.height * 0.50);
    wavePath.lineTo(size.width * 0.95, size.height * 0.65);

    canvas.drawPath(wavePath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
