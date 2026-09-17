import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String defaultBaseUrl = String.fromEnvironment(
    'BHQ_API_BASE_URL',
    defaultValue: 'https://www.bimaheadquarter.com',
  );
  static String baseUrl = defaultBaseUrl;

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
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
      if (customerId != null && customerId.isNotEmpty) {
        await _secureStorage.write(key: _customerIdKey, value: customerId);
      }
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
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

    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
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

  static Future<Map<String, String>> _getHeaders({bool requireAuth = true}) async {
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
    return Uri.parse('$baseUrl$cleanPath').replace(queryParameters: queryParams);
  }

  // ── Auth APIs ─────────────────────────────────────────────────────

  /// Client ID + 6-digit MPIN Login
  static Future<Map<String, dynamic>> login({
    required String customerId,
    required String mpin,
  }) async {
    final uri = _buildUri('/api/auth/client/login');
    final response = await http.post(
      uri,
      headers: await _getHeaders(requireAuth: false),
      body: jsonEncode({
        'customerId': customerId.trim(),
        'mpin': mpin.trim(),
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
      throw Exception(data['error'] ?? 'Invalid Client ID or MPIN.');
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
      throw Exception('Unable to load policies from CRM server.');
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
      throw Exception('Unable to load claims from CRM server.');
    }
  }

  /// Files a new claim directly into CRM database
  static Future<Map<String, dynamic>> fileClaim({
    required String policyNumber,
    required double claimAmount,
    String? garageOrHospital,
    String? remarks,
  }) async {
    final uri = _buildUri('/api/client/claims');
    final response = await http.post(
      uri,
      headers: await _getHeaders(),
      body: jsonEncode({
        'policyNo': policyNumber.trim(),
        'claimType': 'Comprehensive Claim',
        'claimDescription': remarks?.trim().isNotEmpty == true
            ? remarks!.trim()
            : 'Claim filed from BimaHQ Mobile Portal',
        'hospitalOrWorkshop': garageOrHospital?.trim() ?? '',
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
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
      return {};
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
    final effectiveType = requestType ?? category ?? 'GENERAL_SUPPORT';
    final effectiveSubject = subject ?? title ?? 'Support Ticket';
    final uri = _buildUri('/api/client/service-requests');
    final response = await http.post(
      uri,
      headers: await _getHeaders(),
      body: jsonEncode({
        'requestType': effectiveType,
        'subject': effectiveSubject.trim(),
        'details': description.trim(),
        if (policyNumber != null && policyNumber.isNotEmpty) 'policyNo': policyNumber.trim(),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
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
  static Future<String> getPolicyDocumentUrl(String policyId, {String kind = 'policy'}) async {
    final token = await getToken();
    final base = baseUrl.replaceAll(RegExp(r'/+$'), '');
    if (token == null) throw Exception('Not authenticated');
    return '$base/api/client/policies/$policyId/document?kind=$kind&token=${Uri.encodeComponent(token)}';
  }
}
