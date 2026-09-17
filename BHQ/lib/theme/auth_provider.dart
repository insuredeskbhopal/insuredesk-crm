import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

/// Models the active user session details.
class AuthUser {
  final String clientId;
  final String name;
  final String email;
  final String accountNo;
  final String avatarInitials;
  final bool isGoogleLinked;

  const AuthUser({
    required this.clientId,
    required this.name,
    required this.email,
    required this.accountNo,
    required this.avatarInitials,
    this.isGoogleLinked = false,
  });
}

/// State representing the authentication module.
class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? errorMessage;
  final String? successMessage;
  final AuthUser? user;
  final String loginMode; // "regular" or "google"
  final String? pendingGoogleEmail;
  final String? pendingGoogleName;
  final bool rememberDevice;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.errorMessage,
    this.successMessage,
    this.user,
    this.loginMode = 'regular',
    this.pendingGoogleEmail,
    this.pendingGoogleName,
    this.rememberDevice = true,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? errorMessage,
    String? successMessage,
    AuthUser? user,
    String? loginMode,
    String? pendingGoogleEmail,
    String? pendingGoogleName,
    bool? rememberDevice,
    bool clearError = false,
    bool clearSuccess = false,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
      user: user ?? this.user,
      loginMode: loginMode ?? this.loginMode,
      pendingGoogleEmail: pendingGoogleEmail ?? this.pendingGoogleEmail,
      pendingGoogleName: pendingGoogleName ?? this.pendingGoogleName,
      rememberDevice: rememberDevice ?? this.rememberDevice,
    );
  }
}

/// AuthStateNotifier manages authentication logic.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _tryAutoLogin();
  }

  /// Automatically restores saved session if available
  Future<void> _tryAutoLogin() async {
    try {
      final token = await ApiService.getToken();
      final userMap = await ApiService.getUser();
      if (token != null && token.isNotEmpty && userMap != null) {
        final name = userMap['name'] ?? 'Client';
        final initials = name.toString().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();
        final user = AuthUser(
          clientId: userMap['customerId'] ?? userMap['id'] ?? '',
          name: name,
          email: userMap['email'] ?? '',
          accountNo: userMap['customerId'] ?? '',
          avatarInitials: initials.isEmpty ? 'CL' : initials,
        );
        state = state.copyWith(isAuthenticated: true, user: user);
      }
    } catch (_) {}
  }

  /// Toggle "Remember this device"
  void toggleRememberDevice(bool value) {
    state = state.copyWith(rememberDevice: value);
  }

  /// Clear banners
  void clearBanners() {
    state = state.copyWith(clearError: true, clearSuccess: true);
  }

  /// Reset back to regular login mode
  void resetToRegularMode() {
    state = const AuthState();
  }

  /// Mode A: Authenticate with Client ID & MPIN against live CRM backend
  Future<bool> loginWithCredentials(String clientId, String mpin) async {
    state = state.copyWith(isLoading: true, clearError: true, clearSuccess: true);

    final cleanId = clientId.trim();
    final cleanMpin = mpin.trim();

    if (cleanId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Please enter your Registered Mobile Number or Client ID.',
      );
      return false;
    }

    if (cleanMpin.length < 4 || cleanMpin.length > 6) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Client MPIN must be a 6-digit numeric code.',
      );
      return false;
    }

    try {
      final response = await ApiService.login(customerId: cleanId, mpin: cleanMpin);
      final userMap = response['user'] as Map<String, dynamic>? ?? {};
      final name = userMap['name'] ?? 'Client';
      final initials = name.toString().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();

      final authenticatedUser = AuthUser(
        clientId: userMap['customerId'] ?? userMap['id'] ?? cleanId,
        name: name,
        email: userMap['email'] ?? '',
        accountNo: userMap['customerId'] ?? userMap['id'] ?? cleanId,
        avatarInitials: initials.isEmpty ? 'CL' : initials,
        isGoogleLinked: false,
      );

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: authenticatedUser,
        successMessage: 'Credentials verified successfully! Directing to client workspace...',
      );
      return true;
    } catch (err) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: err.toString().replaceAll('Exception:', '').trim(),
      );
      return false;
    }
  }

  /// Trigger Google Sign In Flow (requires Client ID + MPIN pairing)
  Future<void> initiateGoogleSignIn(String selectedEmail, String selectedName) async {
    state = state.copyWith(
      isLoading: false,
      loginMode: 'google',
      pendingGoogleEmail: selectedEmail,
      pendingGoogleName: selectedName,
      clearError: true,
      clearSuccess: true,
    );
  }

  /// Link Google Account with Client ID + MPIN via live CRM API
  Future<bool> linkAndAuthenticateGoogle(String clientId, String mpin) async {
    state = state.copyWith(isLoading: true, clearError: true, clearSuccess: true);

    final cleanId = clientId.trim();
    final cleanMpin = mpin.trim();

    if (cleanId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Please enter your Registered Mobile Number or Client ID.',
      );
      return false;
    }

    if (cleanMpin.length < 4 || cleanMpin.length > 6) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Client MPIN must be a 6-digit numeric code.',
      );
      return false;
    }

    try {
      final response = await ApiService.loginWithGoogleMpin(
        customerId: cleanId,
        mpin: cleanMpin,
        googleEmail: state.pendingGoogleEmail ?? '',
        googleName: state.pendingGoogleName ?? '',
      );
      final userMap = response['user'] as Map<String, dynamic>? ?? {};
      final name = userMap['name'] ?? state.pendingGoogleName ?? 'Client';
      final initials = name.toString().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();

      final user = AuthUser(
        clientId: userMap['customerId'] ?? userMap['id'] ?? cleanId,
        name: name,
        email: state.pendingGoogleEmail ?? userMap['email'] ?? '',
        accountNo: userMap['customerId'] ?? userMap['id'] ?? cleanId,
        avatarInitials: initials.isEmpty ? 'CL' : initials,
        isGoogleLinked: true,
      );

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: user,
        successMessage: 'Google Account paired successfully! Entering workspace...',
      );
      return true;
    } catch (err) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: err.toString().replaceAll('Exception:', '').trim(),
      );
      return false;
    }
  }

  /// Logout action
  void logout() {
    ApiService.clearSession();
    state = const AuthState();
  }
}

/// Riverpod Auth Provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
