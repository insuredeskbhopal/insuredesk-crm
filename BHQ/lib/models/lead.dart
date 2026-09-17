enum LeadStage { newLead, contacted, quoteSent, negotiation, closedWon, closedLost }

class Lead {
  final String id;
  final String name;
  final String company;
  final String phone;
  final String email;
  final String value;
  final String productType;
  final LeadStage stage;
  final int leadScore;
  final String source;
  final String assignedTo;

  const Lead({
    required this.id,
    required this.name,
    required this.company,
    required this.phone,
    required this.email,
    required this.value,
    required this.productType,
    required this.stage,
    required this.leadScore,
    required this.source,
    required this.assignedTo,
  });

  static const List<Lead> emptyList = [];
}
