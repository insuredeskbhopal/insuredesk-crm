enum ClaimStatus { registered, surveyorAssigned, docsUnderReview, approved, cashlessSettled, rejected }

class Claim {
  final String id;
  final String policyNo;
  final String customerName;
  final String insurer;
  final String claimAmount;
  final String estimatedPayout;
  final ClaimStatus status;
  final String hospitalOrWorkshop;
  final String dateFiled;
  final String surveyorName;

  const Claim({
    required this.id,
    required this.policyNo,
    required this.customerName,
    required this.insurer,
    required this.claimAmount,
    required this.estimatedPayout,
    required this.status,
    required this.hospitalOrWorkshop,
    required this.dateFiled,
    required this.surveyorName,
  });

  factory Claim.fromJson(Map<String, dynamic> json) {
    final statusStr = (json['claimStatus'] ?? json['status'] ?? 'REGISTERED').toString().toUpperCase();
    ClaimStatus claimStatus = ClaimStatus.registered;

    if (statusStr.contains('SURVEY') || statusStr.contains('ASSIGNED')) {
      claimStatus = ClaimStatus.surveyorAssigned;
    } else if (statusStr.contains('REVIEW') || statusStr.contains('DOC')) {
      claimStatus = ClaimStatus.docsUnderReview;
    } else if (statusStr.contains('APPROV')) {
      claimStatus = ClaimStatus.approved;
    } else if (statusStr.contains('SETTLE') || statusStr.contains('CASHLESS') || statusStr.contains('CLOSED')) {
      claimStatus = ClaimStatus.cashlessSettled;
    } else if (statusStr.contains('REJECT')) {
      claimStatus = ClaimStatus.rejected;
    }

    final rawAmount = json['claimAmount'] ??
        json['amount'] ??
        (json['metadata'] is Map ? json['metadata']['claimAmount'] : null) ??
        '0';
    final amount = rawAmount.toString();
    final date = json['claimDate'] != null
        ? json['claimDate'].toString().split('T').first
        : (json['createdAt'] != null
            ? json['createdAt'].toString().split('T').first
            : (json['dateFiled'] ?? 'Recent'));

    final claimNumber = json['claimNo'] ?? json['claimNumber'] ?? json['id'] ?? 'CLM-NEW';
    final policyNumber = json['policyNo'] ?? json['policyNumber'] ?? '-';

    return Claim(
      id: claimNumber.toString(),
      policyNo: policyNumber.toString(),
      customerName: (json['customerName'] ?? json['insuredName'] ?? 'Customer').toString(),
      insurer: (json['insuranceCompany'] ?? json['insurer'] ?? 'Bima Headquarter Partner').toString(),
      claimAmount: amount.startsWith('₹') ? amount : '₹$amount',
      estimatedPayout: amount.startsWith('₹') ? amount : '₹$amount',
      status: claimStatus,
      hospitalOrWorkshop: (json['garageOrHospital'] ?? json['hospitalOrWorkshop'] ?? json['claimDescription'] ?? json['description'] ?? 'Network Garage / Hospital').toString(),
      dateFiled: date.toString(),
      surveyorName: (json['surveyorName'] ?? 'Assigned TPA / Surveyor').toString(),
    );
  }
}
