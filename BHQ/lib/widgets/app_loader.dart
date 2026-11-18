import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'glass_card.dart';

/// Ultra-Premium Apple-Grade Activity & Shimmer Loaders
/// Replaces generic Material CircularProgressIndicator with executive Apple UI.

/// ─── 1. Simple, Clean Normal Buffering Loader ─────────────────────────────
class AppLoader extends StatelessWidget {
  final String? message;
  final String? subtitle;
  final double size;

  const AppLoader({
    super.key,
    this.message,
    this.subtitle,
    this.size = 28.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(
                  const Color(0xFF007AFF),
                ),
              ),
            ),
            if (message != null && message!.isNotEmpty) ...[
              const Gap(14),
              Text(
                message!,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFF98989D) : const Color(0xFF6E6E73),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// ─── 2. Apple Card Policy Skeleton Loader ──────────────────────────────────
/// Renders 3 shimmer placeholder cards mirroring PolicyCard dimensions.
class AppPolicySkeleton extends StatefulWidget {
  final int count;

  const AppPolicySkeleton({super.key, this.count = 3});

  @override
  State<AppPolicySkeleton> createState() => _AppPolicySkeletonState();
}

class _AppPolicySkeletonState extends State<AppPolicySkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _shimmerController;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _shimmerController,
      builder: (context, _) {
        final shimmerGradient = LinearGradient(
          begin: Alignment(-2.0 + (4.0 * _shimmerController.value), -0.3),
          end: Alignment(0.0 + (4.0 * _shimmerController.value), 0.3),
          colors: isDark
              ? [
                  const Color(0xFF1E293B).withValues(alpha: 0.6),
                  const Color(0xFF334155).withValues(alpha: 0.8),
                  const Color(0xFF1E293B).withValues(alpha: 0.6),
                ]
              : [
                  const Color(0xFFF1F5F9),
                  const Color(0xFFE2E8F0),
                  const Color(0xFFF1F5F9),
                ],
        );

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: widget.count,
          separatorBuilder: (_, _) => const Gap(12),
          itemBuilder: (context, index) {
            return GlassCard(
              padding: const EdgeInsets.all(18),
              borderRadius: 22,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Avatar + Title/Sub skeleton + Status pill skeleton
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: shimmerGradient,
                          borderRadius: BorderRadius.circular(13),
                        ),
                      ),
                      const Gap(12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 140,
                              height: 14,
                              decoration: BoxDecoration(
                                gradient: shimmerGradient,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const Gap(6),
                            Container(
                              width: 90,
                              height: 11,
                              decoration: BoxDecoration(
                                gradient: shimmerGradient,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 60,
                        height: 20,
                        decoration: BoxDecoration(
                          gradient: shimmerGradient,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ],
                  ),
                  const Gap(14),
                  Container(
                    height: 0.8,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.04),
                  ),
                  const Gap(14),
                  // Middle Row: Insured Name skeleton + HSRP plate skeleton
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 160,
                        height: 13,
                        decoration: BoxDecoration(
                          gradient: shimmerGradient,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        width: 95,
                        height: 22,
                        decoration: BoxDecoration(
                          gradient: shimmerGradient,
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                    ],
                  ),
                  const Gap(14),
                  // Inset Financial Telemetry Capsule Skeleton
                  Container(
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: shimmerGradient,
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  const Gap(14),
                  // Bottom Actions Skeleton Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 100,
                        height: 16,
                        decoration: BoxDecoration(
                          gradient: shimmerGradient,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        width: 110,
                        height: 32,
                        decoration: BoxDecoration(
                          gradient: shimmerGradient,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

/// ─── 3. Micro Apple-Style Button / Inline Loader ───────────────────────────
class AppSmallLoader extends StatelessWidget {
  final Color? color;
  final double size;

  const AppSmallLoader({
    super.key,
    this.color,
    this.size = 18.0,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CupertinoActivityIndicator(
        radius: size / 2.2,
        color: color ?? Colors.white,
      ),
    );
  }
}
