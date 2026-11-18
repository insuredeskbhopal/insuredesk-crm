import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Apple iOS System Colors & Brand Colors
  static const Color primary = Color(0xFF007AFF); // Apple System Blue
  static const Color primaryLight = Color(0xFF389BFF);
  
  // Vibrant iOS Blue for actions & primary highlights
  static const Color primaryBlue = Color(0xFF007AFF); // Apple System Blue
  static const Color primaryBlueDark = Color(0xFF0A84FF); // iOS Dark Mode Blue

  static const Color accent = Color(0xFF34C759); // Apple System Green
  static const Color accentLight = Color(0xFF30D158); // iOS Dark Mode Green
  static const Color amber = Color(0xFFFF9500); // Apple System Orange
  static const Color amberLight = Color(0xFFFF9F0A); // iOS Dark Mode Orange
  static const Color purple = Color(0xFF5856D6); // Apple System Indigo
  static const Color purpleDark = Color(0xFF5E5CE6); // iOS Dark Mode Indigo
  static const Color appleRed = Color(0xFFFF3B30); // Apple System Red

  // iOS Native Grouped Backgrounds
  static const Color background = Color(0xFFF2F2F7); // Apple iOS Grouped Canvas
  static const Color darkBackground = Color(0xFF000000); // Apple iOS Pure Black Canvas
  static const Color cardLight = Color(0xFFFFFFFF); // Apple Inset Card Light
  static const Color cardDark = Color(0xFF1C1C1E); // Apple Inset Card Dark

  // Glass & Hairline Borders
  static const Color glassBorderLight = Color(0xFFE5E5EA); // iOS Hairline Light
  static const Color glassBorderDark = Color(0xFF2C2C2E); // iOS Hairline Dark
  static const Color glassBgLight = Color(0xD8FFFFFF); // 85% translucent
  static const Color glassBgDark = Color(0xD81C1C1E);

  // Text Colors
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF64748B); // Slate 500

  // Dark Mode Text Colors
  static const Color darkTextPrimary = Colors.white;
  static const Color darkTextSecondary = Color(0xFFCBD5E1); // Slate 300
  static const Color darkTextMuted = Color(0xFF94A3B8); // Slate 400
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primaryBlue,
        secondary: AppColors.accent,
        surface: AppColors.cardLight,
        onSurface: AppColors.textPrimary,
      ),
      dividerColor: AppColors.glassBorderLight,
      textTheme: GoogleFonts.interTextTheme(
        ThemeData.light().textTheme,
      ).copyWith(
        displayLarge: GoogleFonts.inter(
          fontSize: 32,
          fontWeight: FontWeight.w800,
          letterSpacing: -1.0,
          color: AppColors.textPrimary,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
          color: AppColors.textPrimary,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: AppColors.textPrimary,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.normal,
          color: AppColors.textSecondary,
        ),
        labelSmall: GoogleFonts.jetBrainsMono(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.darkBackground,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primaryBlueDark,
        secondary: AppColors.accentLight,
        surface: AppColors.cardDark,
        onSurface: AppColors.darkTextPrimary,
      ),
      dividerColor: AppColors.glassBorderDark,
      textTheme: GoogleFonts.interTextTheme(
        ThemeData.dark().textTheme,
      ).copyWith(
        displayLarge: GoogleFonts.inter(
          fontSize: 32,
          fontWeight: FontWeight.w800,
          letterSpacing: -1.0,
          color: AppColors.darkTextPrimary,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.5,
          color: AppColors.darkTextPrimary,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.darkTextPrimary,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: AppColors.darkTextPrimary,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.normal,
          color: AppColors.darkTextSecondary,
        ),
        labelSmall: GoogleFonts.jetBrainsMono(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
          color: AppColors.darkTextMuted,
        ),
      ),
    );
  }
}
