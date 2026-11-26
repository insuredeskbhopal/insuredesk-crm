import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

class ApiService {
  /// The official Bima Headquarter production backend
  static const String defaultBaseUrl = String.fromEnvironment(
    'BHQ_API_BASE_URL',
    defaultValue: 'https://www.bimaheadquarter.com',
  );
  static String baseUrl = defaultBaseUrl;

  /// Ensures the API base URL is initialized to the official production server or local dev
  static Future<void> ensureReachableHost() async {
    if (baseUrl.trim().isEmpty) {
      baseUrl = defaultBaseUrl;
    }
    // When running Flutter web locally, route to active dev server at 127.0.0.1:3000 only if active
    if (kIsWeb) {
      if (Uri.base.host.endsWith('bimaheadquarter.com')) {
        baseUrl = Uri.base.origin;
      } else if (Uri.base.host == 'localhost' || Uri.base.host == '127.0.0.1') {
        try {
          final res = await http
              .get(Uri.parse('http://127.0.0.1:3000/api/app/version'))
              .timeout(const Duration(milliseconds: 500));
          if (res.statusCode == 200) {
            baseUrl = 'http://127.0.0.1:3000';
            return;
          }
        } catch (_) {}
        // Fallback to official production backend if local dev server is not running
        baseUrl = defaultBaseUrl;
      }
    }
  }

  static const String _tokenKey = 'bhq_auth_token';
  static const String _userKey = 'bhq_auth_user';
  static const String _customerIdKey = 'bhq_auth_customer_id';

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // ── Session & Storage Helpers (Keystore / Keychain) ────────────────

  static Future<void> saveSession({
    required String token,
    required Map<String, dynamic> user,
    String? customerId,
  }) async {
    // Encrypted hardware keystore / keychain (Banking & IRDAI Grade)
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
      if (customerId != null && customerId.isNotEmpty) {
        await _secureStorage.write(key: _customerIdKey, value: customerId);
      }
    } catch (_) {}

    // Only non-sensitive display profile is cached for offline header
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user));
    if (customerId != null && customerId.isNotEmpty) {
      await prefs.setString(_customerIdKey, customerId);
    }
  }

  static Future<String?> getToken() async {
    try {
      final secureToken = await _secureStorage.read(key: _tokenKey);
      if (secureToken != null && secureToken.isNotEmpty) return secureToken;
    } catch (_) {}
    return null;
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString(_userKey);
    if (userStr == null || userStr.isEmpty) return null;
    try {
      return jsonDecode(userStr) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<String?> getSavedCustomerId() async {
    try {
      final secureId = await _secureStorage.read(key: _customerIdKey);
      if (secureId != null && secureId.isNotEmpty) return secureId;
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_customerIdKey);
  }

  /// Explicit user logout
  static Future<void> clearSession() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
      await _secureStorage.delete(key: _customerIdKey);
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    await prefs.remove(_customerIdKey);
  }

  // ── Generic HTTP Methods with Bearer Header ───────────────────────

  static Future<Map<String, String>> _getHeaders({
    bool requireAuth = true,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requireAuth) {
      final token = await getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse(
      '$baseUrl$cleanPath',
    ).replace(queryParameters: queryParams);
  }

  // ── Auth APIs ─────────────────────────────────────────────────────

  /// Client ID + 6-digit MPIN Login
  static Future<Map<String, dynamic>> login({
    required String customerId,
    required String mpin,
  }) async {
    await ensureReachableHost();
    try {
      return await _executeLogin(customerId: customerId, mpin: mpin);
    } catch (err) {
      // If local dev server failed to connect, seamlessly retry against production backend
      if (kIsWeb && baseUrl != defaultBaseUrl) {
        baseUrl = defaultBaseUrl;
        return await _executeLogin(customerId: customerId, mpin: mpin);
      }
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> _executeLogin({
    required String customerId,
    required String mpin,
  }) async {
    final uri = _buildUri('/api/auth/client/login');
    final response = await http.post(
      uri,
      headers: await _getHeaders(requireAuth: false),
      body: jsonEncode({'customerId': customerId.trim(), 'mpin': mpin.trim()}),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      final token = data['token'] as String? ?? '';
      final user = data['user'] as Map<String, dynamic>? ?? {};
      if (token.isNotEmpty) {
        await saveSession(token: token, user: user, customerId: customerId);
      }
      return data;
    } else {
      throw Exception(data['error'] ?? 'Invalid Client ID or MPIN.');
    }
  }

  /// Request verification OTP for self-service MPIN setup / reset
  static Future<Map<String, dynamic>> sendClientOtp(String phone) async {
    final uri = _buildUri('/api/auth/client/otp/send');
    final response = await http.post(
      uri,
      headers: await _getHeaders(requireAuth: false),
      body: jsonEncode({'phone': phone.trim()}),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    } else {
      throw Exception(data['error'] ?? 'Failed to send verification code.');
    }
  }

  /// Verify OTP and set new 4 to 6-digit MPIN securely
  static Future<Map<String, dynamic>> verifyOtpAndSetMpin({
    required String phone,
    required String otp,
    required String newMpin,
  }) async {
    final uri = _buildUri('/api/auth/client/otp/verify');
    final response = await http.post(
      uri,
      headers: await _getHeaders(requireAuth: false),
      body: jsonEncode({
        'phone': phone.trim(),
        'otp': otp.trim(),
        'newMpin': newMpin.trim(),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      final token = data['token'] as String? ?? '';
      final user = data['user'] as Map<String, dynamic>? ?? {};
      if (token.isNotEmpty) {
        await saveSession(token: token, user: user, customerId: phone.trim());
      }
      return data;
    } else {
      throw Exception(data['error'] ?? 'Verification failed.');
    }
  }

  /// Google Account + MPIN Login
  static Future<Map<String, dynamic>> googleLogin({
    required String accessToken,
    String? customerId,
    String? mpin,
  }) async {
    final uri = _buildUri('/api/auth/client/google-mpin-login');
    final response = await http.post(
      uri,
      headers: await _getHeaders(requireAuth: false),
      body: jsonEncode({
        'accessToken': accessToken,
        if (customerId != null) 'customerId': customerId.trim(),
        if (mpin != null) 'mpin': mpin.trim(),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      final token = data['token'] as String? ?? '';
      final user = data['user'] as Map<String, dynamic>? ?? {};
      if (token.isNotEmpty) {
        await saveSession(token: token, user: user, customerId: customerId);
      }
      return data;
    } else {
      throw Exception(data['error'] ?? 'Google verification failed.');
    }
  }

  /// Google Email/Name + Client ID + MPIN Login
  static Future<Map<String, dynamic>> loginWithGoogleMpin({
    required String customerId,
    required String mpin,
    required String googleEmail,
    required String googleName,
  }) async {
    final uri = _buildUri('/api/auth/client/google-mpin-login');
    final response = await http.post(
      uri,
      headers: await _getHeaders(requireAuth: false),
      body: jsonEncode({
        'customerId': customerId.trim(),
        'mpin': mpin.trim(),
        'googleEmail': googleEmail.trim(),
        'googleName': googleName.trim(),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      final token = data['token'] as String? ?? '';
      final user = data['user'] as Map<String, dynamic>? ?? {};
      if (token.isNotEmpty) {
        await saveSession(token: token, user: user, customerId: customerId);
      }
      return data;
    } else {
      throw Exception(data['error'] ?? 'Google account verification failed.');
    }
  }

  // ── Live Data APIs ────────────────────────────────────────────────

  /// Fetches active policies from PostgreSQL database
  static Future<List<Map<String, dynamic>>> getPolicies() async {
    final uri = _buildUri('/api/client/policies');
    final response = await http.get(uri, headers: await _getHeaders());

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (data['success'] == true && data['policies'] is List) {
        return (data['policies'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      throw Exception('Unable to load policies. Please try again.');
    }
  }

  /// Fetches claims history from PostgreSQL database
  static Future<List<Map<String, dynamic>>> getClaims() async {
    final uri = _buildUri('/api/client/claims');
    final response = await http.get(uri, headers: await _getHeaders());

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (data['success'] == true && data['claims'] is List) {
        return (data['claims'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      throw Exception('Unable to load claims. Please try again.');
    }
  }

  /// Files a new claim directly into CRM database with optional damage photos/documents
  static Future<Map<String, dynamic>> fileClaim({
    required String policyNumber,
    required double claimAmount,
    String? garageOrHospital,
    String? remarks,
    List<Map<String, dynamic>>? attachments,
  }) async {
    final descParts = <String>[];
    if (remarks != null && remarks.trim().isNotEmpty)
      descParts.add(remarks.trim());
    if (claimAmount > 0)
      descParts.add('Estimated Amount: ₹${claimAmount.toStringAsFixed(0)}');
    if (garageOrHospital != null && garageOrHospital.trim().isNotEmpty)
      descParts.add('Hospital/Workshop: ${garageOrHospital.trim()}');

    final fullDescription = descParts.isNotEmpty
        ? descParts.join(' • ')
        : 'Claim filed from BimaHQ Mobile Portal';

    final uri = _buildUri('/api/client/claims');
    final response = await http.post(
      uri,
      headers: await _getHeaders(),
      body: jsonEncode({
        'policyNo': policyNumber.trim(),
        'claimType': 'Comprehensive Claim',
        'claimDescription': fullDescription,
        'hospitalOrWorkshop': garageOrHospital?.trim() ?? '',
        if (attachments != null && attachments.isNotEmpty)
          'attachments': attachments,
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if ((response.statusCode == 200 || response.statusCode == 201) &&
        data['success'] == true) {
      return data;
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      throw Exception(data['error'] ?? 'Failed to submit claim.');
    }
  }

  /// Fetches customer profile details from CRM
  static Future<Map<String, dynamic>> getProfile() async {
    final uri = _buildUri('/api/client/profile');
    final response = await http.get(uri, headers: await _getHeaders());

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return data['profile'] ?? data['customer'] ?? {};
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      throw Exception('Unable to load profile. Please try again.');
    }
  }

  /// Submits a support / service request ticket to CRM
  static Future<Map<String, dynamic>> submitServiceRequest({
    String? requestType,
    String? category,
    String? subject,
    String? title,
    required String description,
    String? policyNumber,
  }) async {
    const allowedTypes = {
      'NEW_POLICY_QUOTE',
      'RENEWAL_QUOTE',
      'POLICY_RENEWAL',
      'SUPPORT',
      'VEHICLE_CORRECTION',
      'NOMINEE_CHANGE',
      'CONTACT_CHANGE',
    };
    final candidateType = (requestType ?? category ?? 'SUPPORT')
        .trim()
        .toUpperCase();
    final effectiveType = allowedTypes.contains(candidateType)
        ? candidateType
        : 'SUPPORT';
    final effectiveSubject = subject ?? title ?? 'Support Ticket';
    final uri = _buildUri('/api/client/service-requests');
    final response = await http.post(
      uri,
      headers: await _getHeaders(),
      body: jsonEncode({
        'requestType': effectiveType,
        'subject': effectiveSubject.trim(),
        'details': description.trim(),
        if (policyNumber != null && policyNumber.isNotEmpty)
          'policyNo': policyNumber.trim(),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if ((response.statusCode == 200 || response.statusCode == 201) &&
        data['success'] == true) {
      return data;
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      throw Exception(data['error'] ?? 'Failed to submit service request.');
    }
  }

  /// Fetches real service requests & support tickets from CRM
  static Future<List<Map<String, dynamic>>> getServiceRequests() async {
    final uri = _buildUri('/api/client/service-requests');
    final response = await http.get(uri, headers: await _getHeaders());

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (data['success'] == true && data['requests'] is List) {
        return (data['requests'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      return [];
    }
  }

  /// Fetches real client alerts and notifications from CRM
  static Future<List<Map<String, dynamic>>> getNotifications() async {
    final uri = _buildUri('/api/client/notifications');
    final response = await http.get(uri, headers: await _getHeaders());

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (data['success'] == true && data['notifications'] is List) {
        return (data['notifications'] as List).cast<Map<String, dynamic>>();
      }
      return [];
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      return [];
    }
  }

  /// Marks notifications as read on the backend CRM
  static Future<void> markNotificationsRead({
    String? notificationId,
    bool markAllRead = false,
    List<String>? notificationIds,
  }) async {
    try {
      final uri = _buildUri('/api/client/notifications');
      final payload = <String, dynamic>{'markAllRead': markAllRead};
      if (notificationId != null) payload['notificationId'] = notificationId;
      if (notificationIds != null) payload['notificationIds'] = notificationIds;
      await http.post(
        uri,
        headers: await _getHeaders(),
        body: jsonEncode(payload),
      );
    } catch (_) {}
  }

  /// Changes the customer's 6-digit MPIN in the CRM
  static Future<Map<String, dynamic>> changeMpin({
    required String currentMpin,
    required String newMpin,
  }) async {
    final uri = _buildUri('/api/client/security/mpin');
    final response = await http.post(
      uri,
      headers: await _getHeaders(),
      body: jsonEncode({
        'currentMpin': currentMpin.trim(),
        'newMpin': newMpin.trim(),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please log in again.');
    } else {
      throw Exception(data['error'] ?? 'Failed to change MPIN.');
    }
  }

  /// Returns an authenticated URL to download the original policy PDF.
  /// [kind] = "policy" | "certificate" | "receipt"
  /// Checks if a policy document is available for download (HTTP HEAD via Bearer auth).
  static Future<bool> isDocumentAvailable(
    String policyId, {
    String kind = 'policy',
  }) async {
    try {
      final uri = _buildUri('/api/client/policies/$policyId/document', {
        'kind': kind,
      });
      final response = await http.head(
        uri,
        headers: await _getHeaders(requireAuth: true),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetches raw bytes of policy document using authenticated Bearer header.
  static Future<Uint8List> fetchPolicyDocumentBytes(
    String policyId, {
    String kind = 'policy',
  }) async {
    final uri = _buildUri('/api/client/policies/$policyId/document', {
      'kind': kind,
    });
    final headers = await _getHeaders(requireAuth: true);
    final response = await http.get(uri, headers: headers);
    if (response.statusCode == 200) {
      return response.bodyBytes;
    } else if (response.statusCode == 404) {
      throw Exception('DOCUMENT_NOT_FOUND');
    } else if (response.statusCode == 401) {
      throw Exception('UNAUTHORIZED');
    } else {
      throw Exception('Failed to load document (${response.statusCode})');
    }
  }

  /// Downloads or opens a policy PDF, certificate, or receipt securely.
  /// Fetches document bytes with Bearer authentication and displays in-app.
  static Future<void> downloadDocument(
    BuildContext context,
    String policyId, {
    String kind = 'policy',
    String? title,
  }) async {
    final messenger = ScaffoldMessenger.of(context);

    try {
      messenger.showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              ),
              SizedBox(width: 12),
              Text('Fetching secured policy document...'),
            ],
          ),
          duration: Duration(seconds: 15),
          backgroundColor: Color(0xFF1D4ED8),
        ),
      );

      bool launched = false;

      // 1. Try single-use 60-second secured download ticket
      try {
        final ticketUri = _buildUri('/api/client/policies/$policyId/document');
        final ticketRes = await http.post(
          ticketUri,
          headers: await _getHeaders(requireAuth: true),
        );
        if (ticketRes.statusCode == 200) {
          final ticketData = jsonDecode(ticketRes.body) as Map<String, dynamic>;
          final ticket = ticketData['ticket'] as String?;
          if (ticket != null && ticket.isNotEmpty) {
            final viewUri = _buildUri(
              '/api/client/policies/$policyId/document',
              {'ticket': ticket, 'kind': kind},
            );
            launched = await launchUrl(
              viewUri,
              mode: LaunchMode.externalApplication,
            );
            if (!launched) {
              launched = await launchUrl(
                viewUri,
                mode: LaunchMode.platformDefault,
              );
            }
          }
        }
      } catch (_) {}

      // 2. Fallback: stream authenticated raw bytes into in-memory data URI
      if (!launched) {
        final bytes = await fetchPolicyDocumentBytes(policyId, kind: kind);
        if (bytes.isNotEmpty) {
          final dataUri = Uri.dataFromBytes(bytes, mimeType: 'application/pdf');
          try {
            launched = await launchUrl(
              dataUri,
              mode: LaunchMode.externalApplication,
            );
          } catch (_) {}
          if (!launched) {
            try {
              launched = await launchUrl(
                dataUri,
                mode: LaunchMode.platformDefault,
              );
            } catch (_) {}
          }
        }
      }

      messenger.hideCurrentSnackBar();

      if (launched && context.mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Document opened securely.'),
            backgroundColor: Color(0xFF059669),
            duration: Duration(seconds: 2),
          ),
        );
      } else if (!launched && context.mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Could not open document viewer on this device.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      messenger.hideCurrentSnackBar();
      if (!context.mounted) return;
      final msg = e.toString().replaceAll('Exception:', '').trim();
      if (msg == 'DOCUMENT_NOT_FOUND') {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              title != null
                  ? 'No PDF uploaded yet for policy $title. Please contact your advisor.'
                  : 'No PDF document uploaded for this policy yet. Please contact your advisor.',
            ),
            backgroundColor: const Color(0xFFD97706),
            duration: const Duration(seconds: 4),
          ),
        );
      } else if (msg == 'UNAUTHORIZED') {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Session expired. Please log in again.'),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text('Could not load document: $msg'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
