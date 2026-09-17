import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/policy.dart';
import '../models/claim.dart';
import 'api_service.dart';

/// Provider for live policies fetched directly from PostgreSQL database
final livePoliciesProvider = FutureProvider<List<Policy>>((ref) async {
  try {
    final rawPolicies = await ApiService.getPolicies();
    return rawPolicies
        .where((p) {
          final fileName = (p['pdfFileName'] ?? '').toString().toLowerCase();
          final sourceFile = (p['sourceFile'] ?? '').toString().toLowerCase();
          final isExcel = fileName.endsWith('.xlsx') ||
              fileName.endsWith('.xls') ||
              fileName == 'generic_renewal_template.xlsx' ||
              sourceFile.endsWith('.xlsx') ||
              sourceFile.endsWith('.xls');
          return !isExcel;
        })
        .map((p) => Policy.fromJson(p))
        .toList();
  } catch (err) {
    return <Policy>[];
  }
});

/// Provider for live claims filed by the client
final liveClaimsProvider = FutureProvider<List<Claim>>((ref) async {
  try {
    final rawClaims = await ApiService.getClaims();
    return rawClaims.map((c) => Claim.fromJson(c)).toList();
  } catch (err) {
    return <Claim>[];
  }
});

/// Provider for live customer profile details
final liveProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    final profile = await ApiService.getProfile();
    return profile;
  } catch (_) {
    return <String, dynamic>{};
  }
});

/// Provider for live service requests & support tickets from CRM
final liveServiceRequestsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  try {
    final requests = await ApiService.getServiceRequests();
    return requests;
  } catch (_) {
    return <Map<String, dynamic>>[];
  }
});

/// Provider for live client notifications & alerts from CRM
final liveNotificationsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  try {
    final notifications = await ApiService.getNotifications();
    return notifications;
  } catch (_) {
    return <Map<String, dynamic>>[];
  }
});
