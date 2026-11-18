import 'package:flutter/material.dart';

enum PolicyTone { accent, primary, amber, muted }

class Policy {
  final String id;
  final String name;
  final String subtitle;
  final String price;
  final String status;
  final IconData icon;
  final PolicyTone tone;
  final String? policyNumber;
  final String? expiryDate;
  final String? vehicleNumber;
  final String? sumInsured;

  // Rich metadata fields
  final String insuredName;
  final String companyName;
  final String policyCategory;
  final String policyType;
  final String? makeModel;
  final String? startDate;
  final String? netPremium;
  final String? contactPerson;
  final String? contactNumber;
  final bool hasPdf;
  final Map<String, dynamic> rawJson;

  // ─── 1. Status & Lifecycle Getters ──────────────────────────────────────────
  bool get isActive =>
      status.toLowerCase() == 'active' ||
      status.toLowerCase().contains('active');

  bool get isExpired =>
      status.toLowerCase() == 'expired' ||
      status.toLowerCase().contains('expired');

  bool get isDueForRenewal =>
      status.toLowerCase().contains('due') ||
      status.toLowerCase().contains('renewal') ||
      status.toLowerCase().contains('pending');

  /// Returns true if this active policy is expiring within [thresholdDays] (default 30)
  bool isExpiringWithinDays([int thresholdDays = 30]) {
    final days = daysUntilExpiry;
    if (days == null) return false;
    return days >= 0 && days <= thresholdDays;
  }

  /// Exact days until expiration (negative if expired, null if no date)
  int? get daysUntilExpiry {
    final exp = parsedExpiryDate;
    if (exp == null) return null;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return exp.difference(today).inDays;
  }

  /// Returns human-readable relative expiration text (e.g. "Expires in 14 days", "Expired 2 months ago")
  String get validityRemainingText {
    final days = daysUntilExpiry;
    if (days == null) return expiryDate ?? 'Active';
    if (days > 365) {
      final years = (days / 365).toStringAsFixed(1);
      return 'Valid for $years yrs';
    } else if (days > 30) {
      final months = (days / 30).round();
      return 'Expires in $months mo';
    } else if (days > 0) {
      return 'Expires in $days days';
    } else if (days == 0) {
      return 'Expires today';
    } else {
      final pastDays = days.abs();
      if (pastDays > 365) return 'Expired ${(pastDays / 365).toStringAsFixed(1)} yrs ago';
      if (pastDays > 30) return 'Expired ${(pastDays / 30).round()} mo ago';
      return 'Expired $pastDays days ago';
    }
  }

  // ─── 2. Date Parsers & Formatted Strings ───────────────────────────────────
  DateTime? get parsedExpiryDate => _parseDate(expiryDate);
  DateTime? get parsedStartDate => _parseDate(startDate);

  static DateTime? _parseDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final clean = raw.trim();
    final direct = DateTime.tryParse(clean);
    if (direct != null) return direct;
    final parts = clean.split(RegExp(r'[-/]'));
    if (parts.length == 3) {
      if (parts[0].length == 4) {
        // YYYY-MM-DD
        return DateTime.tryParse('${parts[0]}-${parts[1].padLeft(2, '0')}-${parts[2].padLeft(2, '0')}');
      } else if (parts[2].length == 4) {
        // DD-MM-YYYY
        return DateTime.tryParse('${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}');
      }
    }
    return null;
  }

  String get formattedExpiry {
    final d = parsedExpiryDate;
    if (d == null) return expiryDate ?? 'N/A';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day.toString().padLeft(2, '0')} ${months[d.month - 1]} ${d.year}';
  }

  String get formattedStartDate {
    final d = parsedStartDate;
    if (d == null) return startDate ?? 'N/A';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day.toString().padLeft(2, '0')} ${months[d.month - 1]} ${d.year}';
  }

  // ─── 3. Financial & Premium Mathematics ─────────────────────────────────────
  double get numericPremium {
    final clean = price.replaceAll('/yr', '').replaceAll(RegExp(r'[^0-9.]'), '');
    return double.tryParse(clean) ?? 0.0;
  }

  double get numericSumInsured {
    final clean = (sumInsured ?? '').replaceAll(RegExp(r'[^0-9.]'), '');
    return double.tryParse(clean) ?? 0.0;
  }

  double get numericNetPremium {
    final clean = (netPremium ?? '').replaceAll(RegExp(r'[^0-9.]'), '');
    final parsed = double.tryParse(clean);
    if (parsed != null && parsed > 0) return parsed;
    // Fallback: Total / 1.18 (excluding 18% GST)
    return numericPremium > 0 ? (numericPremium / 1.18) : 0.0;
  }

  double get gstAmount => (numericPremium - numericNetPremium).clamp(0.0, double.infinity);

  String get formattedSumInsured {
    final val = numericSumInsured;
    if (val <= 0) return sumInsured ?? '₹0';
    if (val >= 10000000) return '₹${(val / 10000000).toStringAsFixed(2)} Cr';
    if (val >= 100000) return '₹${(val / 100000).toStringAsFixed(1)} L';
    return '₹${_formatIndianNumber(val)}';
  }

  String get formattedPremium {
    final val = numericPremium;
    if (val <= 0) return price;
    return '₹${_formatIndianNumber(val)}';
  }

  static String _formatIndianNumber(double val) {
    final s = val.toStringAsFixed(0);
    if (s.length <= 3) return s;
    final lastThree = s.substring(s.length - 3);
    final rest = s.substring(0, s.length - 3);
    final buffer = StringBuffer();
    for (int i = 0; i < rest.length; i++) {
      if (i > 0 && (rest.length - i) % 2 == 0) buffer.write(',');
      buffer.write(rest[i]);
    }
    return '${buffer.toString()},$lastThree';
  }

  // ─── 4. Category & Asset Identification ────────────────────────────────────
  bool get isMotor =>
      policyCategory.toLowerCase() == 'motor' ||
      (vehicleNumber != null && vehicleNumber!.trim().isNotEmpty);

  bool get isHealth => policyCategory.toLowerCase() == 'health';
  bool get isLife => policyCategory.toLowerCase() == 'life';
  bool get isProperty =>
      policyCategory.toLowerCase() == 'warehouse' ||
      policyCategory.toLowerCase() == 'fire' ||
      policyCategory.toLowerCase() == 'property';

  String get cleanVehiclePlate {
    if (vehicleNumber == null || vehicleNumber!.trim().isEmpty) return '';
    return vehicleNumber!.trim().toUpperCase().replaceAll(RegExp(r'\s+'), ' ');
  }

  /// Short insurer brand name for clean mobile display without legal suffixes
  String get shortCompanyName {
    final raw = companyName.isNotEmpty ? companyName : name;
    String clean = raw
        .replaceAll(
          RegExp(
            r'General Insurance (Company )?(Limited|Ltd\.?)',
            caseSensitive: false,
          ),
          '',
        )
        .replaceAll(
          RegExp(
            r'Assurance (Company )?(Limited|Ltd\.?)',
            caseSensitive: false,
          ),
          '',
        )
        .replaceAll(
          RegExp(
            r'Insurance (Company )?(Limited|Ltd\.?)',
            caseSensitive: false,
          ),
          '',
        )
        .replaceAll(RegExp(r'Co\.?\s*Ltd\.?', caseSensitive: false), '')
        .replaceAll(RegExp(r'Limited', caseSensitive: false), '')
        .replaceAll(RegExp(r'\bThe\b', caseSensitive: false), '')
        .trim();

    final lower = clean.toLowerCase();
    if (lower.contains('iffco')) return 'IFFCO Tokio';
    if (lower.contains('tata')) return 'Tata AIG';
    if (lower.contains('new india')) return 'New India';
    if (lower.contains('digit')) return 'Digit';
    if (lower.contains('icici')) return 'ICICI Lombard';
    if (lower.contains('bajaj')) return 'Bajaj Allianz';
    if (lower.contains('hdfc')) return 'HDFC ERGO';
    if (lower.contains('star health')) return 'Star Health';
    if (lower.contains('care')) return 'Care Health';
    if (lower.contains('niva') || lower.contains('max bupa')) return 'Niva Bupa';
    if (lower.contains('national')) return 'National Insurance';
    if (lower.contains('united')) return 'United India';
    if (lower.contains('oriental')) return 'Oriental Insurance';
    if (lower.contains('sbi')) return 'SBI General';
    if (lower.contains('chola')) return 'Cholamandalam';
    if (lower.contains('reliance')) return 'Reliance General';
    if (lower.contains('shriram')) return 'Shriram General';
    if (lower.contains('future')) return 'Future Generali';
    if (lower.contains('universal')) return 'Universal Sompo';
    if (lower.contains('liberty')) return 'Liberty General';
    if (lower.contains('magma') || lower.contains('sanlam')) return 'Magma HDI';
    if (lower.contains('royal')) return 'Royal Sundaram';
    if (lower.contains('kotak')) return 'Kotak General';
    if (lower.contains('zuno') || lower.contains('edelweiss')) return 'Zuno General';

    return clean.isNotEmpty ? clean : raw;
  }

  /// Single line label that prioritizes the vehicle number and policy number
  /// e.g. "MP 04 ZR 6136 • #N9299395 (IFFCO Tokio)"
  String get selectorSingleLine {
    final pNum = policyNumber ?? id;
    final comp = shortCompanyName;
    if (cleanVehiclePlate.isNotEmpty) {
      return '$cleanVehiclePlate • #$pNum ($comp)';
    }
    return '#$pNum • $comp ($policyCategory)';
  }

  // ─── 5. Search & Query Matching ───────────────────────────────────────────
  bool matchesQuery(String query) {
    if (query.trim().isEmpty) return true;
    final q = query.trim().toLowerCase();
    return name.toLowerCase().contains(q) ||
        (policyNumber ?? '').toLowerCase().contains(q) ||
        (vehicleNumber ?? '').toLowerCase().contains(q) ||
        companyName.toLowerCase().contains(q) ||
        insuredName.toLowerCase().contains(q) ||
        (makeModel ?? '').toLowerCase().contains(q) ||
        policyCategory.toLowerCase().contains(q) ||
        policyType.toLowerCase().contains(q);
  }

  // ─── 6. CopyWith & Serialization ──────────────────────────────────────────
  Policy copyWith({
    String? id,
    String? name,
    String? subtitle,
    String? price,
    String? status,
    IconData? icon,
    PolicyTone? tone,
    String? policyNumber,
    String? expiryDate,
    String? vehicleNumber,
    String? sumInsured,
    String? insuredName,
    String? companyName,
    String? policyCategory,
    String? policyType,
    String? makeModel,
    String? startDate,
    String? netPremium,
    String? contactPerson,
    String? contactNumber,
    bool? hasPdf,
    Map<String, dynamic>? rawJson,
  }) {
    return Policy(
      id: id ?? this.id,
      name: name ?? this.name,
      subtitle: subtitle ?? this.subtitle,
      price: price ?? this.price,
      status: status ?? this.status,
      icon: icon ?? this.icon,
      tone: tone ?? this.tone,
      policyNumber: policyNumber ?? this.policyNumber,
      expiryDate: expiryDate ?? this.expiryDate,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      sumInsured: sumInsured ?? this.sumInsured,
      insuredName: insuredName ?? this.insuredName,
      companyName: companyName ?? this.companyName,
      policyCategory: policyCategory ?? this.policyCategory,
      policyType: policyType ?? this.policyType,
      makeModel: makeModel ?? this.makeModel,
      startDate: startDate ?? this.startDate,
      netPremium: netPremium ?? this.netPremium,
      contactPerson: contactPerson ?? this.contactPerson,
      contactNumber: contactNumber ?? this.contactNumber,
      hasPdf: hasPdf ?? this.hasPdf,
      rawJson: rawJson ?? this.rawJson,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'subtitle': subtitle,
      'price': price,
      'status': status,
      'policyNumber': policyNumber,
      'expiryDate': expiryDate,
      'vehicleNumber': vehicleNumber,
      'sumInsured': sumInsured,
      'insuredName': insuredName,
      'companyName': companyName,
      'policyCategory': policyCategory,
      'policyType': policyType,
      'makeModel': makeModel,
      'startDate': startDate,
      'netPremium': netPremium,
      'contactPerson': contactPerson,
      'contactNumber': contactNumber,
      'hasPdf': hasPdf,
    };
  }

  const Policy({
    required this.id,
    required this.name,
    required this.subtitle,
    required this.price,
    required this.status,
    required this.icon,
    required this.tone,
    this.policyNumber,
    this.expiryDate,
    this.vehicleNumber,
    this.sumInsured,
    this.insuredName = '',
    this.companyName = '',
    this.policyCategory = 'General',
    this.policyType = 'Insurance Policy',
    this.makeModel,
    this.startDate,
    this.netPremium,
    this.contactPerson,
    this.contactNumber,
    this.hasPdf = true,
    this.rawJson = const {},
  });

  factory Policy.fromJson(Map<String, dynamic> json) {
    final payload = (json['reviewedData'] is Map<String, dynamic>)
        ? json['reviewedData'] as Map<String, dynamic>
        : ((json['data'] is Map<String, dynamic>)
            ? json['data'] as Map<String, dynamic>
            : json);

    final company = (payload['insuranceCompany'] ??
            payload['selectedCompany'] ??
            json['insuranceCompany'] ??
            json['selectedCompany'] ??
            'Insurance Policy')
        .toString()
        .trim();

    final policyNum = (payload['policyNumber'] ??
            json['policyNumber'] ??
            payload['id'] ??
            json['id'] ??
            '-')
        .toString()
        .trim();

    final pType = (payload['policyType'] ??
            payload['selectedPolicyType'] ??
            json['policyType'] ??
            json['selectedPolicyType'] ??
            'General Insurance')
        .toString()
        .trim();

    final insured = (payload['insuredName'] ??
            json['insuredName'] ??
            payload['customerName'] ??
            json['customerName'] ??
            '')
        .toString()
        .trim();

    final premium = (payload['totalPremium'] ??
            payload['premium'] ??
            json['totalPremium'] ??
            json['premium'] ??
            '0')
        .toString()
        .trim();

    final netPrem = (payload['netPremium'] ??
            json['netPremium'] ??
            '')
        .toString()
        .trim();

    final expiry = (payload['expiryDate'] ??
            payload['policyExpiryDate'] ??
            payload['renewalDate'] ??
            json['expiryDate'] ??
            json['policyExpiryDate'] ??
            json['renewalDate'] ??
            '')
        .toString()
        .trim();

    final start = (payload['startDate'] ??
            payload['policyStartDate'] ??
            json['startDate'] ??
            '')
        .toString()
        .trim();

    final vehicle = (payload['vehicleNumber'] ??
            payload['registrationNumber'] ??
            json['vehicleNumber'] ??
            json['registrationNumber'] ??
            '')
        .toString()
        .trim();

    final mm = (payload['makeModel'] ?? json['makeModel'] ?? '').toString().trim();
    final sumIns = (payload['sumInsured'] ?? payload['idv'] ?? json['sumInsured'] ?? json['idv'] ?? '').toString().trim();
    final contactP = (payload['contactPerson'] ?? json['contactPerson'] ?? '').toString().trim();
    final contactM = (payload['contactNumber'] ?? payload['mobileNumber'] ?? json['contactNumber'] ?? '').toString().trim();

    final active = payload['isActivePolicy'] ?? json['isActivePolicy'] ?? true;
    final renewalStatus = (payload['renewalStatus'] ?? json['renewalStatus'] ?? 'ACTIVE').toString();

    // Check PDF document availability
    final docs = json['documents'];
    bool hasDocument = true;
    if (docs is Map) {
      hasDocument = docs['policyPdf'] == true;
    }

    IconData iconData = Icons.shield_rounded;
    PolicyTone policyTone = PolicyTone.primary;
    String category = 'General';

    final lowerCombined = '$pType $company $vehicle $mm'.toLowerCase();

    if (lowerCombined.contains('motor') ||
        lowerCombined.contains('car') ||
        lowerCombined.contains('two wheeler') ||
        lowerCombined.contains('tw -') ||
        lowerCombined.contains('package policy') ||
        lowerCombined.contains('private car') ||
        lowerCombined.contains('commercial vehicle') ||
        lowerCombined.contains('bike') ||
        lowerCombined.contains('scooter') ||
        vehicle.isNotEmpty) {
      category = 'Motor';
      iconData = Icons.directions_car_rounded;
      policyTone = PolicyTone.amber;
    } else if (lowerCombined.contains('health') || lowerCombined.contains('mediclaim') || lowerCombined.contains('hospital')) {
      category = 'Health';
      iconData = Icons.favorite_rounded;
      policyTone = PolicyTone.accent;
    } else if (lowerCombined.contains('fire') ||
        lowerCombined.contains('property') ||
        lowerCombined.contains('warehouse') ||
        lowerCombined.contains('burglary') ||
        lowerCombined.contains('stock') ||
        lowerCombined.contains('commercial')) {
      category = 'Warehouse';
      iconData = Icons.business_rounded;
      policyTone = PolicyTone.primary;
    } else if (lowerCombined.contains('life') || lowerCombined.contains('term')) {
      category = 'Life';
      iconData = Icons.shield_rounded;
      policyTone = PolicyTone.accent;
    } else if (lowerCombined.contains('travel')) {
      category = 'Travel';
      iconData = Icons.flight_rounded;
      policyTone = PolicyTone.accent;
    }

    // Parse actual expiry date to verify if policy has passed validity
    bool isDateExpired = false;
    if (expiry.isNotEmpty) {
      try {
        DateTime? expDate = DateTime.tryParse(expiry);
        if (expDate == null) {
          final parts = expiry.split(RegExp(r'[-/]'));
          if (parts.length == 3) {
            if (parts[0].length == 4) {
              // YYYY-MM-DD
              expDate = DateTime.tryParse(
                '${parts[0]}-${parts[1].padLeft(2, '0')}-${parts[2].padLeft(2, '0')}',
              );
            } else if (parts[2].length == 4) {
              // DD-MM-YYYY
              expDate = DateTime.tryParse(
                '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}',
              );
            }
          }
        }
        if (expDate != null) {
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);
          if (expDate.isBefore(today)) {
            isDateExpired = true;
          }
        }
      } catch (_) {}
    }

    final bool isTrulyActive = (active == true) && !isDateExpired;

    String statusText;
    if (!isTrulyActive) {
      statusText = 'Expired';
      policyTone = PolicyTone.muted;
    } else if (renewalStatus == 'DUE' || renewalStatus == 'PENDING') {
      statusText = 'Due for Renewal';
      policyTone = PolicyTone.amber;
    } else {
      statusText = 'Active';
    }

    String subtitleText = 'Policy #$policyNum';
    if (vehicle.isNotEmpty) {
      subtitleText += ' • $vehicle';
    } else {
      subtitleText += ' • $pType';
    }

    return Policy(
      id: (json['id'] ?? policyNum).toString(),
      name: '$company $pType',
      subtitle: subtitleText,
      price: '₹$premium/yr',
      status: statusText,
      icon: iconData,
      tone: policyTone,
      policyNumber: policyNum,
      expiryDate: expiry,
      vehicleNumber: vehicle,
      sumInsured: sumIns,
      insuredName: insured,
      companyName: company,
      policyCategory: category,
      policyType: pType,
      makeModel: mm.isNotEmpty ? mm : null,
      startDate: start.isNotEmpty ? start : null,
      netPremium: netPrem.isNotEmpty ? netPrem : null,
      contactPerson: contactP.isNotEmpty ? contactP : null,
      contactNumber: contactM.isNotEmpty ? contactM : null,
      hasPdf: hasDocument,
      rawJson: json,
    );
  }
}
