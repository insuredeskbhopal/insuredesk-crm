import 'dart:ui';
import 'package:flutter/material.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double blur;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.borderRadius = 20,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.blur = 20,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final defaultGradient = backgroundColor != null
        ? LinearGradient(colors: [backgroundColor!, backgroundColor!])
        : LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    const Color(0xFF1E293B).withValues(alpha: 0.82),
                    const Color(0xFF0F172A).withValues(alpha: 0.72),
                  ]
                : [
                    Colors.white.withValues(alpha: 0.88),
                    Colors.white.withValues(alpha: 0.70),
                  ],
          );

    final defaultBorderColor = borderColor ??
        (isDark
            ? Colors.white.withValues(alpha: 0.16)
            : Colors.white.withValues(alpha: 0.80));

    Widget content = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          // Ambient soft colored glow
          BoxShadow(
            color: const Color(0xFF007AFF).withValues(alpha: isDark ? 0.08 : 0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          // Occlusion shadow
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.07),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              gradient: defaultGradient,
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: defaultBorderColor,
                width: 1.0,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: content,
        ),
      );
    }

    return content;
  }
}
