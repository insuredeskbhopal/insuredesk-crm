import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/policy.dart';
import '../models/claim.dart';
import 'api_service.dart';

/// Provider for live policies fetched directly from PostgreSQL database
final livePoliciesProvider = FutureProvider<List<Policy>>((ref) async {
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
});

/// Provider for live claims filed by the client
final liveClaimsProvider = FutureProvider<List<Claim>>((ref) async {
  final rawClaims = await ApiService.getClaims();
  return rawClaims.map((c) => Claim.fromJson(c)).toList();
});

/// Provider for live customer profile details
final liveProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ApiService.getProfile();
});

/// Provider for live service requests & support tickets from CRM
final liveServiceRequestsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ApiService.getServiceRequests();
});

/// Provider for live client notifications & alerts from CRM
final liveNotificationsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ApiService.getNotifications();
});
