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
  });

  factory Policy.fromJson(Map<String, dynamic> json) {
    final payload = (json['reviewedData'] is Map<String, dynamic>)
        ? json['reviewedData'] as Map<String, dynamic>
        : ((json['data'] is Map<String, dynamic>)
            ? json['data'] as Map<String, dynamic>
            : json);

    final company = payload['insuranceCompany'] ??
        payload['selectedCompany'] ??
        json['insuranceCompany'] ??
        json['selectedCompany'] ??
        'Insurance Policy';
    final policyNum = payload['policyNumber'] ??
        json['policyNumber'] ??
        payload['id'] ??
        json['id'] ??
        '-';
    final policyType = payload['policyType'] ??
        payload['selectedPolicyType'] ??
        json['policyType'] ??
        json['selectedPolicyType'] ??
        'General Insurance';
    final premium = payload['totalPremium'] ??
        payload['premium'] ??
        json['totalPremium'] ??
        json['premium'] ??
        '0';
    final expiry = payload['expiryDate'] ??
        payload['policyExpiryDate'] ??
        payload['renewalDate'] ??
        json['expiryDate'] ??
        json['policyExpiryDate'] ??
        json['renewalDate'] ??
        '';
    final vehicle = payload['vehicleNumber'] ??
        payload['registrationNumber'] ??
        payload['makeModel'] ??
        json['vehicleNumber'] ??
        json['registrationNumber'] ??
        json['makeModel'] ??
        '';
    final sumIns = payload['sumInsured'] ?? json['sumInsured'] ?? '';
    final active = payload['isActivePolicy'] ?? json['isActivePolicy'] ?? true;
    final renewalStatus = payload['renewalStatus'] ?? json['renewalStatus'] ?? 'ACTIVE';

    IconData iconData = Icons.shield_rounded;
    PolicyTone policyTone = PolicyTone.primary;
    final lowerType = policyType.toString().toLowerCase();

    if (lowerType.contains('motor') || lowerType.contains('car') || lowerType.contains('vehicle') || lowerType.contains('two wheeler')) {
      iconData = Icons.directions_car_rounded;
      policyTone = PolicyTone.amber;
    } else if (lowerType.contains('health') || lowerType.contains('mediclaim')) {
      iconData = Icons.favorite_rounded;
      policyTone = PolicyTone.accent;
    } else if (lowerType.contains('fire') || lowerType.contains('property') || lowerType.contains('warehouse')) {
      iconData = Icons.business_rounded;
      policyTone = PolicyTone.primary;
    } else if (lowerType.contains('travel')) {
      iconData = Icons.flight_rounded;
      policyTone = PolicyTone.accent;
    }

    String statusText = active ? 'Active' : 'Expired';
    if (renewalStatus == 'DUE' || renewalStatus == 'PENDING') {
      statusText = 'Due for Renewal';
      policyTone = PolicyTone.amber;
    }

    String subtitleText = 'Policy #$policyNum';
    if (vehicle.toString().isNotEmpty) {
      subtitleText += ' • $vehicle';
    } else {
      subtitleText += ' • $policyType';
    }

    return Policy(
      id: (json['id'] ?? policyNum).toString(),
      name: '$company $policyType',
      subtitle: subtitleText,
      price: '₹$premium/yr',
      status: statusText,
      icon: iconData,
      tone: policyTone,
      policyNumber: policyNum.toString(),
      expiryDate: expiry.toString(),
      vehicleNumber: vehicle.toString(),
      sumInsured: sumIns.toString(),
    );
  }
}
