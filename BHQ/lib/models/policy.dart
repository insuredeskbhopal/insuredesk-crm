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

    String statusText = active ? 'Active' : 'Expired';
    if (renewalStatus == 'DUE' || renewalStatus == 'PENDING') {
      statusText = 'Due for Renewal';
      policyTone = PolicyTone.amber;
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
