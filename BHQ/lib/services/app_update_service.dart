import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import 'api_service.dart';

class AppUpdateInfo {
  final String latestVersion;
  final int versionCode;
  final String minSupportedVersion;
  final bool forceUpdate;
  final String title;
  final List<String> releaseNotes;
  final String downloadUrl;
  final String releaseDate;
  final String fileSizeMb;

  const AppUpdateInfo({
    required this.latestVersion,
    required this.versionCode,
    required this.minSupportedVersion,
    required this.forceUpdate,
    required this.title,
    required this.releaseNotes,
    required this.downloadUrl,
    required this.releaseDate,
    required this.fileSizeMb,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    List<String> notes = [];
    if (json['releaseNotes'] is List) {
      notes = (json['releaseNotes'] as List).map((e) => e.toString()).toList();
    } else if (json['releaseNotes'] is String) {
      notes = [json['releaseNotes'].toString()];
    }

    return AppUpdateInfo(
      latestVersion: (json['latestVersion'] ?? '1.0.0').toString(),
      versionCode: int.tryParse(json['versionCode']?.toString() ?? '1') ?? 1,
      minSupportedVersion: (json['minSupportedVersion'] ?? '1.0.0').toString(),
      forceUpdate: json['forceUpdate'] == true,
      title: (json['title'] ?? 'New Update Available').toString(),
      releaseNotes: notes,
      downloadUrl: (json['downloadUrl'] ?? 'https://www.bimaheadquarter.com').toString(),
      releaseDate: (json['releaseDate'] ?? '').toString(),
      fileSizeMb: (json['fileSizeMb'] ?? '28 MB').toString(),
    );
  }
}

class AppUpdateService {
  // Current installed version in the app
  static const String currentVersion = '1.0.0';
  static const int currentVersionCode = 1;

  static bool _hasPromptedThisSession = false;

  /// Checks for available in-app updates from the CRM server.
  /// If [silent] is true, no toast is shown when already up-to-date or on network error.
  static Future<void> checkForUpdate(BuildContext context, {bool silent = true}) async {
    if (silent && _hasPromptedThisSession) return;

    try {
      final uri = Uri.parse('${ApiService.baseUrl}/api/app/version');
      final res = await http.get(uri).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) {
          final info = AppUpdateInfo.fromJson(data);

          final isUpdateAvailable = info.versionCode > currentVersionCode ||
              _isNewerVersion(info.latestVersion, currentVersion);

          if (isUpdateAvailable) {
            _hasPromptedThisSession = true;
            if (context.mounted) {
              showUpdateDialog(context, info);
            }
            return;
          }
        }
      }

      // If manual check and no update
      if (!silent && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                const Gap(10),
                Text('You are on the latest version (v$currentVersion)'),
              ],
            ),
            backgroundColor: const Color(0xFF059669),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      if (!silent && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not check for updates: ${e.toString().replaceAll("Exception:", "").trim()}'),
            backgroundColor: const Color(0xFFD97706),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  static bool _isNewerVersion(String latest, String current) {
    try {
      final latestParts = latest.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      final currentParts = current.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      for (int i = 0; i < latestParts.length && i < currentParts.length; i++) {
        if (latestParts[i] > currentParts[i]) return true;
        if (latestParts[i] < currentParts[i]) return false;
      }
      return latestParts.length > currentParts.length;
    } catch (_) {
      return latest != current;
    }
  }

  /// Displays the in-app self-update modal
  static void showUpdateDialog(BuildContext context, AppUpdateInfo info) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      barrierDismissible: !info.forceUpdate,
      builder: (ctx) => PopScope(
        canPop: !info.forceUpdate,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
          titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          contentPadding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
          actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF7C3AED)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withAlpha(80),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.system_update_alt_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const Gap(12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      info.title,
                      style: TextStyle(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    const Gap(3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withAlpha(isDark ? 40 : 20),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'v${info.latestVersion}',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF059669),
                            ),
                          ),
                        ),
                        const Gap(6),
                        Text(
                          'Size: ${info.fileSizeMb}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Divider(
                  height: 16,
                  color: isDark ? Colors.white12 : Colors.black12,
                ),
                const Gap(4),
                Text(
                  "What's New in this Version:",
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white70 : const Color(0xFF334155),
                  ),
                ),
                const Gap(8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    children: info.releaseNotes.map((note) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Icon(
                                Icons.check_circle_rounded,
                                size: 14,
                                color: Color(0xFF2563EB),
                              ),
                            ),
                            const Gap(8),
                            Expanded(
                              child: Text(
                                note,
                                style: TextStyle(
                                  fontSize: 12,
                                  height: 1.35,
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
                if (info.forceUpdate) ...[
                  const Gap(10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626).withAlpha(isDark ? 35 : 15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFFDC2626).withAlpha(isDark ? 70 : 30),
                      ),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, size: 16, color: Color(0xFFDC2626)),
                        Gap(8),
                        Expanded(
                          child: Text(
                            'This update is required to ensure continuous service.',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFDC2626),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            if (!info.forceUpdate)
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Later',
                  style: TextStyle(
                    color: isDark ? Colors.white60 : const Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.download_rounded, size: 17),
              label: const Text(
                'Update Now',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
              onPressed: () async {
                final uri = Uri.parse(info.downloadUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Cannot launch download link: ${info.downloadUrl}')),
                    );
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
