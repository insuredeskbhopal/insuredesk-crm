enum CustomerStatus { active, vip, lead, churnRisk }

class Customer {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String city;
  final int activePoliciesCount;
  final String totalSumInsured;
  final String annualPremium;
  final CustomerStatus status;
  final String avatarUrl;
  final String lastContact;

  const Customer({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.city,
    required this.activePoliciesCount,
    required this.totalSumInsured,
    required this.annualPremium,
    required this.status,
    required this.avatarUrl,
    required this.lastContact,
  });

  static const List<Customer> emptyList = [];
}
