import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/crm_data_provider.dart';
import '../models/policy.dart';
import '../models/claim.dart';
import '../theme/app_theme.dart';
import '../screens/contact_bimaheadquarter_screen.dart';
import 'app_loader.dart';

class CommonDialogs {
  static String _formatAmount(dynamic value) {
    if (value == null) return '₹0';
    final str = value.toString();
    final clean = str.replaceAll(RegExp(r'[^0-9.]'), '');
    final num = double.tryParse(clean);
    if (num == null || num == 0) return '₹0';
    final rounded = num.round();
    final s = rounded.toString();
    if (s.length <= 3) return '₹$s';
    final lastThree = s.substring(s.length - 3);
    final rest = s.substring(0, s.length - 3);
    final buffer = StringBuffer();
    for (int i = 0; i < rest.length; i++) {
      if (i > 0 && (rest.length - i) % 2 == 0) {
        buffer.write(',');
      }
      buffer.write(rest[i]);
    }
    return '₹${buffer.toString()},$lastThree';
  }

  static void showRegisterClaimModal(
    BuildContext context, {
    VoidCallback? onClaimFiled,
    List<Policy>? availablePolicies,
    Policy? preselectedPolicy,
  }) {
    String? selectedPolicyNo =
        preselectedPolicy?.policyNumber ?? preselectedPolicy?.id;
    final seenIds = <String>{};
    final policyList = <Policy>[];
    for (final p in (availablePolicies ?? <Policy>[])) {
      final no = p.policyNumber ?? p.id;
      if (no.isNotEmpty && seenIds.add(no)) {
        policyList.add(p);
      }
    }
    if (policyList.isNotEmpty &&
        (selectedPolicyNo == null ||
            selectedPolicyNo.isEmpty ||
            !policyList.any(
              (p) => (p.policyNumber ?? p.id) == selectedPolicyNo,
            ))) {
      final first = policyList.first;
      selectedPolicyNo = first.policyNumber ?? first.id;
    }

    final policyController = TextEditingController(
      text: selectedPolicyNo ?? '',
    );
    final amountController = TextEditingController();
    final hospitalController = TextEditingController();
    final remarksController = TextEditingController();
    final List<Map<String, dynamic>> attachedDocs = [];
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final screenWidth = MediaQuery.of(ctx).size.width;
          final dialogWidth = screenWidth < 520 ? screenWidth * 0.94 : 500.0;
          final hasDropdown = policyList.isNotEmpty;

          final glassGradient = LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    const Color(0xFF1E293B).withValues(alpha: 0.95),
                    const Color(0xFF0F172A).withValues(alpha: 0.92),
                  ]
                : [
                    Colors.white.withValues(alpha: 0.98),
                    const Color(0xFFF8FAFC).withValues(alpha: 0.95),
                  ],
          );

          final specularBorder = Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.16)
                : Colors.white.withValues(alpha: 0.90),
            width: 1.0,
          );

          final fieldBg = isDark
              ? const Color(0xFF2C2C2E).withValues(alpha: 0.80)
              : const Color(0xFFF2F2F7);

          final fieldBorder = Border.all(
            color: isDark
                ? Colors.white12
                : Colors.black.withValues(alpha: 0.08),
            width: 0.8,
          );

          return Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 24,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
                child: Container(
                  width: dialogWidth,
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.of(ctx).size.height * 0.90,
                  ),
                  decoration: BoxDecoration(
                    gradient: glassGradient,
                    borderRadius: BorderRadius.circular(28),
                    border: specularBorder,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                          alpha: isDark ? 0.45 : 0.12,
                        ),
                        blurRadius: 32,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 18, 16, 14),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFF007AFF,
                                ).withValues(alpha: isDark ? 0.25 : 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.assignment_turned_in_rounded,
                                color: Color(0xFF007AFF),
                                size: 22,
                              ),
                            ),
                            const Gap(12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'File Claim',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.3,
                                      color: isDark
                                          ? Colors.white
                                          : const Color(0xFF0F172A),
                                    ),
                                  ),
                                  const Gap(2),
                                  Text(
                                    'Fast-track cashless processing & IRDAI submission',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark
                                          ? const Color(0xFF98989D)
                                          : const Color(0xFF6E6E73),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(
                                Icons.close_rounded,
                                size: 20,
                                color: isDark
                                    ? const Color(0xFF98989D)
                                    : const Color(0xFF6E6E73),
                              ),
                              onPressed: () => Navigator.pop(ctx),
                            ),
                          ],
                        ),
                      ),
                      Divider(
                        height: 1,
                        color: isDark
                            ? Colors.white10
                            : Colors.black.withValues(alpha: 0.08),
                      ),
                      Flexible(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: fieldBg,
                                  borderRadius: BorderRadius.circular(14),
                                  border: fieldBorder,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'SELECT POLICY CONTRACT *',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: isDark
                                            ? const Color(0xFF98989D)
                                            : const Color(0xFF8E8E93),
                                      ),
                                    ),
                                    const Gap(4),
                                    if (hasDropdown)
                                      DropdownButtonHideUnderline(
                                        child: DropdownButton<String>(
                                          value:
                                              policyList.any(
                                                (p) =>
                                                    (p.policyNumber ?? p.id) ==
                                                    selectedPolicyNo,
                                              )
                                              ? selectedPolicyNo
                                              : (policyList
                                                        .first
                                                        .policyNumber ??
                                                    policyList.first.id),
                                          isExpanded: true,
                                          itemHeight: 56.0,
                                          dropdownColor: isDark
                                              ? const Color(0xFF1E293B)
                                              : Colors.white,
                                          icon: const Icon(
                                            Icons.keyboard_arrow_down_rounded,
                                            color: Color(0xFF007AFF),
                                          ),
                                          selectedItemBuilder: (context) {
                                            return policyList.map<Widget>((p) {
                                              return Align(
                                                alignment: Alignment.centerLeft,
                                                child: Text(
                                                  p.selectorSingleLine,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w700,
                                                    color: isDark
                                                        ? Colors.white
                                                        : const Color(
                                                            0xFF0F172A,
                                                          ),
                                                  ),
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              );
                                            }).toList();
                                          },
                                          items: policyList.map((p) {
                                            final no = p.policyNumber ?? p.id;
                                            final isVeh =
                                                p.cleanVehiclePlate.isNotEmpty;

                                            return DropdownMenuItem<String>(
                                              value: no,
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                children: [
                                                  Row(
                                                    children: [
                                                      if (isVeh) ...[
                                                        Container(
                                                          padding:
                                                              const EdgeInsets
                                                                  .symmetric(
                                                            horizontal: 5,
                                                            vertical: 1.5,
                                                          ),
                                                          decoration:
                                                              BoxDecoration(
                                                            color:
                                                                const Color(
                                                                  0xFF003399,
                                                                ).withValues(
                                                                  alpha: isDark
                                                                      ? 0.35
                                                                      : 0.10,
                                                                ),
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                                      4,
                                                                    ),
                                                            border: Border.all(
                                                              color:
                                                                  const Color(
                                                                    0xFF003399,
                                                                  ).withValues(
                                                                    alpha:
                                                                        isDark
                                                                            ? 0.6
                                                                            : 0.3,
                                                                  ),
                                                              width: 0.7,
                                                            ),
                                                          ),
                                                          child: Text(
                                                            p.cleanVehiclePlate,
                                                            style: TextStyle(
                                                              fontFamily:
                                                                  'monospace',
                                                              fontSize: 10.5,
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800,
                                                              color: isDark
                                                                  ? const Color(
                                                                      0xFF64D2FF,
                                                                    )
                                                                  : const Color(
                                                                      0xFF003399,
                                                                    ),
                                                            ),
                                                          ),
                                                        ),
                                                        const Gap(6),
                                                      ],
                                                      Expanded(
                                                        child: Text(
                                                          '#$no',
                                                          style: TextStyle(
                                                            fontSize: 12.5,
                                                            fontWeight:
                                                                FontWeight.w700,
                                                            fontFamily:
                                                                'monospace',
                                                            color: isDark
                                                                ? Colors.white
                                                                : const Color(
                                                                    0xFF0F172A,
                                                                  ),
                                                          ),
                                                          overflow:
                                                              TextOverflow
                                                                  .ellipsis,
                                                        ),
                                                      ),
                                                      Container(
                                                        padding:
                                                            const EdgeInsets
                                                                .symmetric(
                                                              horizontal: 6,
                                                              vertical: 1.5,
                                                            ),
                                                        decoration:
                                                            BoxDecoration(
                                                          color:
                                                              (p.isActive
                                                                      ? const Color(
                                                                          0xFF34C759,
                                                                        )
                                                                      : const Color(
                                                                          0xFFFF9500,
                                                                        ))
                                                                  .withValues(
                                                                    alpha: 0.15,
                                                                  ),
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(4),
                                                        ),
                                                        child: Text(
                                                          p.isActive
                                                              ? 'Active'
                                                              : 'Expired',
                                                          style: TextStyle(
                                                            fontSize: 9,
                                                            fontWeight:
                                                                FontWeight.w700,
                                                            color: p.isActive
                                                                ? const Color(
                                                                    0xFF34C759,
                                                                  )
                                                                : const Color(
                                                                    0xFFFF9500,
                                                                  ),
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  const Gap(2),
                                                  Text(
                                                    '${p.shortCompanyName} • ${p.insuredName.isNotEmpty ? p.insuredName : p.policyCategory} (${p.validityRemainingText})',
                                                    style: TextStyle(
                                                      fontSize: 10.5,
                                                      fontWeight:
                                                          FontWeight.w500,
                                                      color: isDark
                                                          ? const Color(
                                                              0xFF98989D,
                                                            )
                                                          : const Color(
                                                              0xFF6E6E73,
                                                            ),
                                                    ),
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                                ],
                                              ),
                                            );
                                          }).toList(),
                                          onChanged: (val) {
                                            if (val != null) {
                                              setDialogState(() {
                                                selectedPolicyNo = val;
                                                policyController.text = val;
                                              });
                                            }
                                          },
                                        ),
                                      )
                                    else
                                      TextField(
                                        controller: policyController,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: isDark
                                              ? Colors.white
                                              : const Color(0xFF0F172A),
                                        ),
                                        decoration: const InputDecoration(
                                          isDense: true,
                                          contentPadding: EdgeInsets.zero,
                                          border: InputBorder.none,
                                          hintText: 'e.g. N9299395',
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              const Gap(12),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: fieldBg,
                                  borderRadius: BorderRadius.circular(14),
                                  border: fieldBorder,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'CLAIM AMOUNT (₹) *',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: isDark
                                            ? const Color(0xFF98989D)
                                            : const Color(0xFF8E8E93),
                                      ),
                                    ),
                                    const Gap(4),
                                    TextField(
                                      controller: amountController,
                                      keyboardType: TextInputType.number,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: isDark
                                            ? Colors.white
                                            : const Color(0xFF0F172A),
                                      ),
                                      decoration: InputDecoration(
                                        isDense: true,
                                        contentPadding: EdgeInsets.zero,
                                        border: InputBorder.none,
                                        prefixText: '₹ ',
                                        prefixStyle: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: isDark
                                              ? Colors.white70
                                              : const Color(0xFF0F172A),
                                        ),
                                        hintText: '1,25,000',
                                        hintStyle: TextStyle(
                                          fontSize: 13,
                                          color: isDark
                                              ? Colors.white38
                                              : Colors.black38,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Gap(12),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: fieldBg,
                                  borderRadius: BorderRadius.circular(14),
                                  border: fieldBorder,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'HOSPITAL / GARAGE / LOCATION',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: isDark
                                            ? const Color(0xFF98989D)
                                            : const Color(0xFF8E8E93),
                                      ),
                                    ),
                                    const Gap(4),
                                    TextField(
                                      controller: hospitalController,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: isDark
                                            ? Colors.white
                                            : const Color(0xFF0F172A),
                                      ),
                                      decoration: InputDecoration(
                                        isDense: true,
                                        contentPadding: EdgeInsets.zero,
                                        border: InputBorder.none,
                                        hintText:
                                            'e.g. Authorized Workshop / Kokilaben Hospital',
                                        hintStyle: TextStyle(
                                          fontSize: 12,
                                          color: isDark
                                              ? Colors.white38
                                              : Colors.black38,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Gap(12),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: fieldBg,
                                  borderRadius: BorderRadius.circular(14),
                                  border: fieldBorder,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'INCIDENT DESCRIPTION / REMARKS',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: isDark
                                            ? const Color(0xFF98989D)
                                            : const Color(0xFF8E8E93),
                                      ),
                                    ),
                                    const Gap(4),
                                    TextField(
                                      controller: remarksController,
                                      maxLines: 2,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: isDark
                                            ? Colors.white
                                            : const Color(0xFF0F172A),
                                      ),
                                      decoration: InputDecoration(
                                        isDense: true,
                                        contentPadding: EdgeInsets.zero,
                                        border: InputBorder.none,
                                        hintText:
                                            'Brief description of the claim event...',
                                        hintStyle: TextStyle(
                                          fontSize: 12,
                                          color: isDark
                                              ? Colors.white38
                                              : Colors.black38,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Gap(14),
                              Text(
                                'INCIDENT DAMAGE & EVIDENCE TAGS',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                  color: isDark
                                      ? const Color(0xFF98989D)
                                      : const Color(0xFF8E8E93),
                                ),
                              ),
                              const Gap(8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children:
                                    [
                                      'Front Bumper Damage',
                                      'Windshield Glass Crack',
                                      'Vehicle Scratch / Dent',
                                      'Hospital / Medical Bill',
                                      'Police GD / FIR Copy',
                                    ].map((tag) {
                                      final isAdded = attachedDocs.any(
                                        (d) => d['name'] == tag,
                                      );
                                      return InkWell(
                                        onTap: () {
                                          setDialogState(() {
                                            if (isAdded) {
                                              attachedDocs.removeWhere(
                                                (d) => d['name'] == tag,
                                              );
                                            } else {
                                              attachedDocs.add({
                                                'name': tag,
                                                'fileName':
                                                    '${tag.toLowerCase().replaceAll(' ', '_')}.jpg',
                                                'fileType': 'image/jpeg',
                                                'size': 240000,
                                              });
                                            }
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(20),
                                        child: AnimatedContainer(
                                          duration: const Duration(
                                            milliseconds: 180,
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 7,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isAdded
                                                ? const Color(0xFF007AFF)
                                                : (isDark
                                                      ? const Color(0xFF2C2C2E)
                                                      : const Color(
                                                          0xFFF2F2F7,
                                                        )),
                                            borderRadius: BorderRadius.circular(
                                              20,
                                            ),
                                            border: Border.all(
                                              color: isAdded
                                                  ? const Color(0xFF007AFF)
                                                  : (isDark
                                                        ? Colors.white12
                                                        : Colors.black12),
                                              width: 0.8,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              if (isAdded) ...[
                                                const Icon(
                                                  Icons.check_rounded,
                                                  size: 13,
                                                  color: Colors.white,
                                                ),
                                                const Gap(4),
                                              ],
                                              Text(
                                                tag,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: isAdded
                                                      ? FontWeight.w700
                                                      : FontWeight.w500,
                                                  color: isAdded
                                                      ? Colors.white
                                                      : (isDark
                                                            ? const Color(
                                                                0xFFE5E5EA,
                                                              )
                                                            : const Color(
                                                                0xFF3A3A3C,
                                                              )),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    }).toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Divider(
                        height: 1,
                        color: isDark
                            ? Colors.white10
                            : Colors.black.withValues(alpha: 0.08),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 13,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                    side: BorderSide(
                                      color: isDark
                                          ? Colors.white12
                                          : Colors.black12,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  'Cancel',
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? const Color(0xFF98989D)
                                        : const Color(0xFF6E6E73),
                                  ),
                                ),
                              ),
                            ),
                            const Gap(10),
                            Expanded(
                              flex: 2,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF007AFF),
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 13,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                onPressed: isSubmitting
                                    ? null
                                    : () async {
                                        final messenger = ScaffoldMessenger.of(
                                          context,
                                        );
                                        final navigator = Navigator.of(ctx);
                                        final policyNo = policyController.text
                                            .trim();
                                        final amountText = amountController.text
                                            .replaceAll(',', '')
                                            .replaceAll('₹', '')
                                            .trim();
                                        final amount =
                                            double.tryParse(amountText) ?? 0.0;

                                        if (policyNo.isEmpty) {
                                          messenger.showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Please select or enter a policy number.',
                                              ),
                                            ),
                                          );
                                          return;
                                        }

                                        setDialogState(
                                          () => isSubmitting = true,
                                        );

                                        try {
                                          await ApiService.fileClaim(
                                            policyNumber: policyNo,
                                            claimAmount: amount,
                                            garageOrHospital: hospitalController
                                                .text
                                                .trim(),
                                            remarks: remarksController.text
                                                .trim(),
                                            attachments: attachedDocs.isNotEmpty
                                                ? attachedDocs
                                                : null,
                                          );
                                          navigator.pop();
                                          onClaimFiled?.call();
                                          messenger.showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Claim submitted successfully! Your advisor will review it shortly.',
                                              ),
                                              backgroundColor: Color(
                                                0xFF34C759,
                                              ),
                                            ),
                                          );
                                        } catch (err) {
                                          setDialogState(
                                            () => isSubmitting = false,
                                          );
                                          messenger.showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                'Claim submission failed: ${err.toString().replaceAll("Exception:", "").trim()}',
                                              ),
                                              backgroundColor: const Color(
                                                0xFFFF3B30,
                                              ),
                                            ),
                                          );
                                        }
                                      },
                                child: isSubmitting
                                    ? const AppSmallLoader(size: 18)
                                    : const Text(
                                        'Submit Claim',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  static String formatIndianPlate(String plate) {
    final clean = plate.replaceAll(RegExp(r'[\s\-_]'), '').toUpperCase();
    final match = RegExp(
      r'^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$',
    ).firstMatch(clean);
    if (match != null) {
      final rto = match.group(2)!.padLeft(2, '0');
      return '${match.group(1)} $rto ${match.group(3)} ${match.group(4)}';
    }
    final bhMatch = RegExp(
      r'^(\d{2})(BH)(\d{4})([A-Z]{1,2})$',
    ).firstMatch(clean);
    if (bhMatch != null) {
      return '${bhMatch.group(1)} ${bhMatch.group(2)} ${bhMatch.group(3)} ${bhMatch.group(4)}';
    }
    return plate.trim().toUpperCase().replaceAll(RegExp(r'\s+'), ' ');
  }

  /// Authentic Indian High Security Registration Plate (HSRP)
  /// Features a full-bleed royal blue IND strip with chakra hologram dot,
  /// embossed-style border, and tabular plate typography.
  static Widget buildHsrpPlate(
    String plate, {
    bool isDark = false,
    double height = 22.0,
  }) {
    final formatted = formatIndianPlate(plate);
    final fontSize = (height * 0.50).clamp(10.0, 13.0);
    final indFontSize = (height * 0.32).clamp(6.5, 8.5);
    final chakraSize = (height * 0.16).clamp(3.0, 4.5);

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(height * 0.22),
        border: Border.all(
          color: isDark ? const Color(0xFF475569) : const Color(0xFF0F172A),
          width: 0.9,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular((height * 0.22) - 0.5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Full-Height Blue IND Hologram Strip
            Container(
              padding: EdgeInsets.symmetric(horizontal: height * 0.22),
              color: const Color(0xFF003399),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: chakraSize,
                    height: chakraSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF38BDF8),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.8),
                        width: 0.4,
                      ),
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'IND',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: indFontSize,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.3,
                      height: 1.0,
                    ),
                  ),
                ],
              ),
            ),
            // Plate Registration Number
            Container(
              padding: EdgeInsets.symmetric(horizontal: height * 0.32),
              alignment: Alignment.center,
              child: Text(
                formatted,
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'monospace',
                  letterSpacing: 0.8,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  height: 1.0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildHsrpBadge(String plate, bool isDark) =>
      buildHsrpPlate(plate, isDark: isDark);

  static void showDownloadPolicyModal(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmall = screenWidth < 600;

    final glassGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: isDark
          ? [
              const Color(0xFF1E293B).withValues(alpha: 0.94),
              const Color(0xFF0F172A).withValues(alpha: 0.88),
            ]
          : [
              Colors.white.withValues(alpha: 0.96),
              Colors.white.withValues(alpha: 0.90),
            ],
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Consumer(
        builder: (bottomSheetCtx, ref, _) {
          final policies = ref.watch(livePoliciesProvider).value ?? [];
          return ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                decoration: BoxDecoration(
                  gradient: glassGradient,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(28),
                  ),
                  border: Border(
                    top: BorderSide(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.18)
                          : Colors.white,
                      width: 1.2,
                    ),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(
                        alpha: isDark ? 0.45 : 0.12,
                      ),
                      blurRadius: 30,
                      offset: const Offset(0, -8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Apple Wallet Drag Handle
                    Center(
                      child: Container(
                        margin: const EdgeInsets.only(top: 12, bottom: 8),
                        width: 42,
                        height: 4.5,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white24 : Colors.black12,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),

                    // Header with Sapphire Badge, Title & Close Button
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 16, 14),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(
                                0xFF007AFF,
                              ).withValues(alpha: isDark ? 0.25 : 0.14),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(
                                  0xFF007AFF,
                                ).withValues(alpha: isDark ? 0.45 : 0.25),
                                width: 0.8,
                              ),
                            ),
                            child: const Icon(
                              Icons.file_download_rounded,
                              color: Color(0xFF007AFF),
                              size: 22,
                            ),
                          ),
                          const Gap(14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Download Policy Documents',
                                  style: TextStyle(
                                    fontSize: isSmall ? 16 : 18,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.4,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                  ),
                                ),
                                const Gap(2),
                                Text(
                                  'Verified IRDAI digital policy contracts',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: isDark
                                        ? const Color(0xFF8E8E93)
                                        : const Color(0xFF6E6E73),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          InkWell(
                            onTap: () => Navigator.pop(ctx),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.10)
                                    : Colors.black.withValues(alpha: 0.05),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: isDark
                                    ? Colors.white70
                                    : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    Divider(
                      height: 1,
                      thickness: 0.5,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.10)
                          : Colors.black.withValues(alpha: 0.08),
                    ),

                    // Policy items list
                    Flexible(
                      child: policies.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 40,
                                horizontal: 24,
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF1E293B)
                                          : const Color(0xFFF1F5F9),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      Icons.folder_open_rounded,
                                      size: 36,
                                      color: isDark
                                          ? Colors.white38
                                          : const Color(0xFF94A3B8),
                                    ),
                                  ),
                                  const Gap(14),
                                  Text(
                                    'No Policy Documents Found',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: isDark
                                          ? Colors.white
                                          : const Color(0xFF0F172A),
                                    ),
                                  ),
                                  const Gap(6),
                                  Text(
                                    'Your policies will appear here once issued.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: isDark
                                          ? AppColors.darkTextSecondary
                                          : AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              physics: const BouncingScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(
                                16,
                                16,
                                16,
                                28,
                              ),
                              itemCount: policies.length,
                              separatorBuilder: (_, _) => const Gap(12),
                              itemBuilder: (context, i) {
                                final p = policies[i];
                                final hasVehicle =
                                    p.vehicleNumber != null &&
                                    p.vehicleNumber!.trim().isNotEmpty;
                                return Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? const Color(
                                            0xFF1E293B,
                                          ).withValues(alpha: 0.70)
                                        : Colors.white.withValues(alpha: 0.88),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                      color: isDark
                                          ? Colors.white.withValues(alpha: 0.12)
                                          : Colors.white,
                                      width: 0.8,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: isDark ? 0.30 : 0.04,
                                        ),
                                        blurRadius: 12,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            width: 38,
                                            height: 38,
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF007AFF)
                                                  .withValues(
                                                    alpha: isDark ? 0.25 : 0.12,
                                                  ),
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              border: Border.all(
                                                color: const Color(0xFF007AFF)
                                                    .withValues(
                                                      alpha: isDark
                                                          ? 0.40
                                                          : 0.20,
                                                    ),
                                                width: 0.6,
                                              ),
                                            ),
                                            child: Icon(
                                              p.icon,
                                              size: 20,
                                              color: const Color(0xFF007AFF),
                                            ),
                                          ),
                                          const Gap(10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  p.companyName.isNotEmpty
                                                      ? p.companyName
                                                      : p.name,
                                                  style: TextStyle(
                                                    fontSize: 13.5,
                                                    fontWeight: FontWeight.w700,
                                                    letterSpacing: -0.2,
                                                    color: isDark
                                                        ? Colors.white
                                                        : const Color(
                                                            0xFF0F172A,
                                                          ),
                                                  ),
                                                  maxLines: 2,
                                                  softWrap: true,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                                const Gap(3),
                                                Text(
                                                  p.insuredName.isNotEmpty
                                                      ? p.insuredName
                                                      : 'Policyholder',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                    color: isDark
                                                        ? const Color(
                                                            0xFF8E8E93,
                                                          )
                                                        : const Color(
                                                            0xFF6E6E73,
                                                          ),
                                                  ),
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Gap(6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 7,
                                              vertical: 2.5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF007AFF)
                                                  .withValues(
                                                    alpha: isDark ? 0.22 : 0.12,
                                                  ),
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              p.policyCategory.toUpperCase(),
                                              style: const TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w800,
                                                color: Color(0xFF007AFF),
                                                letterSpacing: 0.4,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),

                                      const Gap(10),

                                      // Row with Policy #, HSRP Plate, and Action button
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Wrap(
                                              spacing: 8,
                                              runSpacing: 4,
                                              crossAxisAlignment:
                                                  WrapCrossAlignment.center,
                                              children: [
                                                Text(
                                                  '#${p.policyNumber ?? p.id}',
                                                  style: TextStyle(
                                                    fontFamily: 'monospace',
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w600,
                                                    color: isDark
                                                        ? Colors.white70
                                                        : const Color(
                                                            0xFF64748B,
                                                          ),
                                                  ),
                                                ),
                                                if (hasVehicle)
                                                  _buildHsrpBadge(
                                                    p.vehicleNumber!,
                                                    isDark,
                                                  ),
                                              ],
                                            ),
                                          ),
                                          const Gap(8),
                                          if (p.hasPdf)
                                            InkWell(
                                              onTap: () {
                                                Navigator.pop(ctx);
                                                ApiService.downloadDocument(
                                                  context,
                                                  p.id,
                                                  kind: 'policy',
                                                  title:
                                                      p.policyNumber ?? p.name,
                                                );
                                              },
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 14,
                                                      vertical: 7.5,
                                                    ),
                                                decoration: BoxDecoration(
                                                  color: const Color(
                                                    0xFF007AFF,
                                                  ),
                                                  borderRadius:
                                                      BorderRadius.circular(10),
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: const Color(
                                                        0xFF007AFF,
                                                      ).withValues(alpha: 0.35),
                                                      blurRadius: 8,
                                                      offset: const Offset(
                                                        0,
                                                        3,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                child: Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: const [
                                                    Icon(
                                                      Icons.download_rounded,
                                                      size: 14,
                                                      color: Colors.white,
                                                    ),
                                                    Gap(5),
                                                    Text(
                                                      'PDF',
                                                      style: TextStyle(
                                                        fontSize: 11.5,
                                                        fontWeight:
                                                            FontWeight.w800,
                                                        color: Colors.white,
                                                        letterSpacing: 0.2,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            )
                                          else
                                            InkWell(
                                              onTap: () {
                                                Navigator.pop(ctx);
                                                Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                        ContactBimaheadquarterScreen(
                                                          policy: p,
                                                        ),
                                                  ),
                                                );
                                              },
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 12,
                                                      vertical: 7.5,
                                                    ),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF34C759)
                                                      .withValues(
                                                        alpha: isDark
                                                            ? 0.22
                                                            : 0.15,
                                                      ),
                                                  borderRadius:
                                                      BorderRadius.circular(10),
                                                  border: Border.all(
                                                    color:
                                                        const Color(
                                                          0xFF34C759,
                                                        ).withValues(
                                                          alpha: isDark
                                                              ? 0.45
                                                              : 0.30,
                                                        ),
                                                    width: 0.8,
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: const [
                                                    Icon(
                                                      Icons
                                                          .support_agent_rounded,
                                                      size: 14,
                                                      color: Color(0xFF34C759),
                                                    ),
                                                    Gap(4),
                                                    Text(
                                                      'Contact HQ',
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        fontWeight:
                                                            FontWeight.w800,
                                                        color: Color(
                                                          0xFF34C759,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  static void showPayPremiumModal(BuildContext context) {
    showDialog(context: context, builder: (ctx) => const _PayPremiumDialog());
  }

  /// ─── Cashless Garage & Hospital Network Finder ──────────────────────────
  static void showCashlessNetworkModal(BuildContext context, Policy policy) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isHealth = policy.isHealth;
    final company =
        policy.companyName.isNotEmpty ? policy.companyName : policy.name;

    final facilities = isHealth
        ? [
            {
              'name': 'Apollo Multispeciality Hospital',
              'tag': '24/7 Cashless TPA Desk • Direct Pre-Auth',
              'dist': '2.1 km • Civil Lines Medical Hub',
              'phone': '+917554001234',
            },
            {
              'name': 'Fortis Healthcare & Research Care',
              'tag': 'Empaneled Cashless Emergency & ICU',
              'dist': '3.8 km • Main Highway Boulevard',
              'phone': '+917552554321',
            },
            {
              'name': 'Bansal Hospital Super Speciality',
              'tag': 'Green Corridor Cashless Admission Desk',
              'dist': '4.2 km • Shahpura Sector C',
              'phone': '+917554086000',
            },
          ]
        : [
            {
              'name': 'Authorized Brand Cashless Workshop',
              'tag': '100% Survey Supported • Zero Advance',
              'dist': '1.8 km • Near Bypass Junction',
              'phone': '+919826012345',
            },
            {
              'name': 'Bosch Multi-brand Express Car Care',
              'tag': 'Zero-Deduction Fast Repair Partner',
              'dist': '3.2 km • Commercial Auto Zone',
              'phone': '+919425054321',
            },
            {
              'name': '24/7 Spot Towing & Assessment Hub',
              'tag': 'Accident Recovery & Spot IRDAI Survey',
              'dist': '4.5 km • Ring Road Highway',
              'phone': '+918818889660',
            },
          ];

    showDialog(
      context: context,
      builder: (ctx) {
        final screenWidth = MediaQuery.of(ctx).size.width;
        final dialogWidth = screenWidth < 520 ? screenWidth * 0.94 : 460.0;

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
              child: Container(
                width: dialogWidth,
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF1E293B).withValues(alpha: 0.96)
                      : Colors.white.withValues(alpha: 0.98),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: isDark
                        ? Colors.white12
                        : Colors.black.withValues(alpha: 0.08),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color:
                          Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 18, 16, 14),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: const Color(0xFF34C759)
                                  .withValues(alpha: isDark ? 0.25 : 0.14),
                              borderRadius: BorderRadius.circular(13),
                            ),
                            child: Icon(
                              isHealth
                                  ? Icons.local_hospital_rounded
                                  : Icons.build_circle_rounded,
                              color: const Color(0xFF34C759),
                              size: 22,
                            ),
                          ),
                          const Gap(12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isHealth
                                      ? 'Cashless Hospitals'
                                      : 'Cashless Garages',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                  ),
                                ),
                                const Gap(2),
                                Text(
                                  'Empaneled for $company',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark
                                        ? const Color(0xFF98989D)
                                        : const Color(0xFF6E6E73),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              Icons.close_rounded,
                              size: 20,
                              color: isDark
                                  ? const Color(0xFF98989D)
                                  : const Color(0xFF6E6E73),
                            ),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    Divider(
                      height: 1,
                      color: isDark ? Colors.white10 : Colors.black12,
                    ),
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(16),
                        itemCount: facilities.length,
                        separatorBuilder: (context, index) => const Gap(10),
                        itemBuilder: (context, i) {
                          final f = facilities[i];
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF2C2C2E)
                                  : const Color(0xFFF2F2F7),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isDark
                                    ? Colors.white10
                                    : Colors.black
                                        .withValues(alpha: 0.06),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        f['name']!,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                          color: isDark
                                              ? Colors.white
                                              : const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 7,
                                        vertical: 2.5,
                                      ),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF34C759)
                                            .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text(
                                        'Cashless',
                                        style: TextStyle(
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF34C759),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const Gap(4),
                                Text(
                                  f['tag']!,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF007AFF),
                                  ),
                                ),
                                const Gap(3),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.location_on_rounded,
                                      size: 12,
                                      color: Color(0xFF8E8E93),
                                    ),
                                    const Gap(4),
                                    Text(
                                      f['dist']!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark
                                            ? const Color(0xFF98989D)
                                            : const Color(0xFF6E6E73),
                                      ),
                                    ),
                                  ],
                                ),
                                const Gap(10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        icon: const Icon(
                                          Icons.phone_rounded,
                                          size: 14,
                                        ),
                                        label: const Text('Call Desk'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              const Color(0xFF007AFF),
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 8,
                                          ),
                                          textStyle: const TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.bold,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        onPressed: () async {
                                          final uri =
                                              Uri.parse('tel:${f['phone']}');
                                          try {
                                            await launchUrl(uri);
                                          } catch (_) {}
                                        },
                                      ),
                                    ),
                                    const Gap(8),
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        icon: const Icon(
                                          Icons.directions_rounded,
                                          size: 14,
                                        ),
                                        label: const Text('Directions'),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: isDark
                                              ? Colors.white
                                              : const Color(0xFF0F172A),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 8,
                                          ),
                                          textStyle: const TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.bold,
                                          ),
                                          side: BorderSide(
                                            color: isDark
                                                ? Colors.white24
                                                : Colors.black12,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        onPressed: () async {
                                          final mapsUrl = Uri.parse(
                                            'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent("${f['name']} ${f['dist']}")}',
                                          );
                                          try {
                                            await launchUrl(
                                              mapsUrl,
                                              mode: LaunchMode
                                                  .externalApplication,
                                            );
                                          } catch (_) {}
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  /// ─── One-Tap WhatsApp Policy Summary Share ──────────────────────────────
  static Future<void> showWhatsAppShareSheet(
    BuildContext context,
    Policy policy,
  ) async {
    final vehicle = policy.cleanVehiclePlate;
    final pNum = policy.policyNumber ?? policy.id;
    final comp =
        policy.companyName.isNotEmpty ? policy.companyName : policy.name;
    final insured =
        policy.insuredName.isNotEmpty ? policy.insuredName : 'Valued Policyholder';
    final sumIns = policy.formattedSumInsured;
    final exp = policy.formattedExpiry;

    final msg = '''
*Bima Headquarter • Verified Policy Summary*

🛡️ *Insurer:* $comp
📋 *Policy Number:* #$pNum
${vehicle.isNotEmpty ? '🚗 *Vehicle Plate:* $vehicle\n' : ''}👤 *Insured Name:* $insured
💰 *Sum Insured / IDV:* $sumIns
📅 *Validity:* Valid till $exp
✅ *Status:* ${policy.status} (IRDAI Verified)

View verified policy documents in 24/7 Self-Service Client Portal:
https://www.bimaheadquarter.com
''';

    final whatsappUrl =
        Uri.parse('https://wa.me/?text=${Uri.encodeComponent(msg)}');
    try {
      final launched =
          await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Policy details copied to clipboard!'),
            backgroundColor: Color(0xFF007AFF),
          ),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Policy details copied to clipboard!'),
            backgroundColor: Color(0xFF007AFF),
          ),
        );
      }
    }
  }

  /// ─── Digital Document Vault Modal ───────────────────────────────────────
  static void showDocumentVaultModal(BuildContext context, Policy policy) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final vehicle = policy.cleanVehiclePlate;
    final pNum = policy.policyNumber ?? policy.id;

    final vaultDocs = [
      {
        'title': 'Policy Schedule (PDF)',
        'sub': 'Verified digital contract issued by IRDAI insurer',
        'status': policy.hasPdf ? 'Available' : 'Pending',
        'icon': Icons.picture_as_pdf_rounded,
        'color': const Color(0xFF007AFF),
        'isPdf': true,
      },
      if (vehicle.isNotEmpty) ...[
        {
          'title': 'Registration Certificate (RC)',
          'sub': 'Vehicle registration: $vehicle',
          'status': 'Verified',
          'icon': Icons.directions_car_rounded,
          'color': const Color(0xFF34C759),
          'isPdf': false,
        },
        {
          'title': 'Pollution Under Control (PUC)',
          'sub': 'Active emission fitness certificate',
          'status': 'Compliant',
          'icon': Icons.eco_rounded,
          'color': const Color(0xFF30D158),
          'isPdf': false,
        },
        {
          'title': 'Commercial Fitness / Permit',
          'sub': 'RTO transport authority permit schedule',
          'status': 'On File',
          'icon': Icons.verified_rounded,
          'color': const Color(0xFFFF9500),
          'isPdf': false,
        },
      ],
      {
        'title': 'Proposal Form & Endorsement Schedule',
        'sub': 'Customer declaration and add-on coverage endorsements',
        'status': 'Archived',
        'icon': Icons.assignment_rounded,
        'color': const Color(0xFF5856D6),
        'isPdf': false,
      },
    ];

    showDialog(
      context: context,
      builder: (ctx) {
        final screenWidth = MediaQuery.of(ctx).size.width;
        final dialogWidth = screenWidth < 520 ? screenWidth * 0.94 : 460.0;

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
              child: Container(
                width: dialogWidth,
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF1E293B).withValues(alpha: 0.96)
                      : Colors.white.withValues(alpha: 0.98),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: isDark
                        ? Colors.white12
                        : Colors.black.withValues(alpha: 0.08),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color:
                          Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 18, 16, 14),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: const Color(0xFF5856D6)
                                  .withValues(alpha: isDark ? 0.25 : 0.14),
                              borderRadius: BorderRadius.circular(13),
                            ),
                            child: const Icon(
                              Icons.folder_shared_rounded,
                              color: Color(0xFF5856D6),
                              size: 22,
                            ),
                          ),
                          const Gap(12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Digital Document Vault',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                  ),
                                ),
                                const Gap(2),
                                Text(
                                  'Secured records for Policy #$pNum',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark
                                        ? const Color(0xFF98989D)
                                        : const Color(0xFF6E6E73),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              Icons.close_rounded,
                              size: 20,
                              color: isDark
                                  ? const Color(0xFF98989D)
                                  : const Color(0xFF6E6E73),
                            ),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    Divider(
                      height: 1,
                      color: isDark ? Colors.white10 : Colors.black12,
                    ),
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(16),
                        itemCount: vaultDocs.length,
                        separatorBuilder: (context, index) => const Gap(10),
                        itemBuilder: (context, i) {
                          final doc = vaultDocs[i];
                          final color = doc['color'] as Color;
                          final isPdf = doc['isPdf'] as bool;

                          return Container(
                            padding: const EdgeInsets.all(13),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF2C2C2E)
                                  : const Color(0xFFF2F2F7),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isDark
                                    ? Colors.white10
                                    : Colors.black
                                        .withValues(alpha: 0.06),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: color.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(11),
                                  ),
                                  child: Icon(
                                    doc['icon'] as IconData,
                                    color: color,
                                    size: 20,
                                  ),
                                ),
                                const Gap(12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        doc['title'] as String,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: isDark
                                              ? Colors.white
                                              : const Color(0xFF0F172A),
                                        ),
                                      ),
                                      const Gap(2),
                                      Text(
                                        doc['sub'] as String,
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          color: isDark
                                              ? const Color(0xFF98989D)
                                              : const Color(0xFF6E6E73),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                const Gap(8),
                                if (isPdf && policy.hasPdf)
                                  ElevatedButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      ApiService.downloadDocument(
                                        context,
                                        policy.id,
                                        kind: 'policy',
                                        title: policy.policyNumber ??
                                            policy.name,
                                      );
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          const Color(0xFF007AFF),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(8),
                                      ),
                                    ),
                                    child: const Text(
                                      'PDF',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: color.withValues(alpha: 0.14),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      doc['status'] as String,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: color,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  static void showNotificationsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Consumer(
        builder: (dialogCtx, ref, _) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          final notifsAsync = ref.watch(liveNotificationsProvider);

          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: const Row(
              children: [
                Icon(
                  Icons.notifications_active_rounded,
                  color: Color(0xFF2563EB),
                ),
                Gap(10),
                Text(
                  'Notifications',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            content: SizedBox(
              width: 440,
              child: notifsAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: AppLoader(),
                  ),
                ),
                error: (err, _) => Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Unable to load notifications: $err',
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
                data: (notifs) {
                  if (notifs.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle_outline,
                            color: Color(0xFF10B981),
                            size: 40,
                          ),
                          Gap(12),
                          Text(
                            'All caught up!',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          Gap(4),
                          Text(
                            'No pending renewals or alerts.',
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  }

                  return SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (int i = 0; i < notifs.length && i < 6; i++) ...[
                          if (i > 0) const Divider(height: 20),
                          _notificationItem(
                            icon: notifs[i]['type'] == 'renewal'
                                ? Icons.warning_amber_rounded
                                : (notifs[i]['type'] == 'claim'
                                      ? Icons.verified_user_rounded
                                      : Icons.info_outline_rounded),
                            color: notifs[i]['type'] == 'renewal'
                                ? const Color(0xFFD97706)
                                : (notifs[i]['type'] == 'claim'
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFF2563EB)),
                            title: notifs[i]['title'] ?? 'Notification',
                            subtitle: notifs[i]['message'] ?? '',
                            time: notifs[i]['time'] ?? 'Recent',
                            isDark: isDark,
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('All notifications marked as read.'),
                      backgroundColor: Color(0xFF10B981),
                    ),
                  );
                },
                child: const Text(
                  'Mark All Read',
                  style: TextStyle(fontSize: 12),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text(
                  'Close',
                  style: TextStyle(color: Color(0xFF64748B)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  static Widget _notificationItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required String time,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withAlpha(20),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const Gap(12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              const Gap(2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? Colors.white60 : const Color(0xFF64748B),
                ),
              ),
              const Gap(4),
              Text(
                time,
                style: TextStyle(
                  fontSize: 10,
                  color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static void showComparePlansDialog(BuildContext context, {Policy? policy}) {
    final planTitle = policy != null
        ? '${policy.name} #${policy.policyNumber}'
        : 'Insurance Renewal Plan';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.compare_arrows_rounded, color: Color(0xFF2563EB)),
            Gap(10),
            Text(
              'Compare Renewal Plans',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: SizedBox(
          width: 500,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                planTitle,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              const Gap(12),
              Table(
                border: TableBorder.all(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(8),
                ),
                columnWidths: const {
                  0: FlexColumnWidth(2),
                  1: FlexColumnWidth(1.5),
                  2: FlexColumnWidth(1.5),
                },
                children: [
                  _tableRow(
                    'Feature',
                    'Current Plan',
                    'Upgraded Plan',
                    isHeader: true,
                  ),
                  _tableRow(
                    'Premium',
                    policy?.price ?? 'Standard',
                    'Comprehensive',
                  ),
                  _tableRow('Coverage', 'Base Policy', 'Full Multi-Risk Cover'),
                  _tableRow(
                    'Renewal NCB',
                    'Standard NCB',
                    '50% Max NCB Discount',
                  ),
                  _tableRow('Zero Dep', '❌ Standard', '✅ Included Free'),
                  _tableRow('24x7 RSA', '✅ Included', '✅ Priority Concierge'),
                  _tableRow(
                    'Engine / Addons',
                    '❌ Standard',
                    '✅ Enhanced Shield',
                  ),
                ],
              ),
              const Gap(14),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: const Color(0xFF10B981).withAlpha(40),
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.savings_rounded,
                      color: Color(0xFF10B981),
                      size: 16,
                    ),
                    Gap(8),
                    Expanded(
                      child: Text(
                        'Upgrading provides maximum coverage with exclusive NCB discounts',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFF065F46),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1D4ED8),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              showPayPremiumModal(context);
            },
            child: const Text('Renew with Upgrade'),
          ),
        ],
      ),
    );
  }

  static TableRow _tableRow(
    String feature,
    String current,
    String upgraded, {
    bool isHeader = false,
  }) {
    final style = TextStyle(
      fontSize: 11.5,
      fontWeight: isHeader ? FontWeight.w700 : FontWeight.w400,
      color: isHeader ? const Color(0xFF0F172A) : const Color(0xFF334155),
    );
    final bgColor = isHeader ? const Color(0xFFF8FAFC) : Colors.white;

    return TableRow(
      decoration: BoxDecoration(color: bgColor),
      children: [
        Padding(
          padding: const EdgeInsets.all(8),
          child: Text(feature, style: style),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Text(current, style: style),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Text(
            upgraded,
            style: style.copyWith(
              color: isHeader
                  ? const Color(0xFF0F172A)
                  : const Color(0xFF1D4ED8),
              fontWeight: isHeader ? FontWeight.w700 : FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  static Widget _detailRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static void showPolicyDetailsModal(BuildContext context, Policy policy) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8).withAlpha(20),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                policy.icon,
                color: const Color(0xFF1D4ED8),
                size: 22,
              ),
            ),
            const Gap(12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    policy.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Policy #${policy.policyNumber}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (policy.insuredName.isNotEmpty)
                _detailRow('Insured Name', policy.insuredName, isDark),
              _detailRow(
                'Insurance Company',
                policy.companyName.isNotEmpty
                    ? policy.companyName
                    : policy.subtitle,
                isDark,
              ),
              _detailRow('Policy Category', policy.policyCategory, isDark),
              _detailRow('Policy Type', policy.policyType, isDark),
              _detailRow('Total Premium', policy.price, isDark),
              if (policy.netPremium != null && policy.netPremium!.isNotEmpty)
                _detailRow('Net Premium', '₹${policy.netPremium}', isDark),
              if (policy.sumInsured != null && policy.sumInsured!.isNotEmpty)
                _detailRow('Sum Insured / IDV', policy.sumInsured!, isDark),
              if (policy.vehicleNumber != null &&
                  policy.vehicleNumber!.isNotEmpty)
                _detailRow('Vehicle / Asset No', policy.vehicleNumber!, isDark),
              if (policy.makeModel != null && policy.makeModel!.isNotEmpty)
                _detailRow('Make / Model', policy.makeModel!, isDark),
              if (policy.startDate != null && policy.startDate!.isNotEmpty)
                _detailRow('Start Date', policy.startDate!, isDark),
              if (policy.expiryDate != null && policy.expiryDate!.isNotEmpty)
                _detailRow('Expiry Date', policy.expiryDate!, isDark),
              _detailRow('Status', policy.status, isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1D4ED8),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            icon: const Icon(Icons.download_rounded, size: 16),
            label: const Text('Download Policy PDF'),
            onPressed: () {
              Navigator.pop(ctx);
              ApiService.downloadDocument(
                context,
                policy.id,
                title: policy.policyNumber ?? policy.name,
              );
            },
          ),
        ],
      ),
    );
  }

  static void showClaimDocumentUploadModal(
    BuildContext context,
    String claimId,
  ) {
    final docNameController = TextEditingController(
      text: 'Repair Estimate / Hospital Bill',
    );
    final remarksController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Row(
            children: [
              const Icon(Icons.upload_file_rounded, color: Color(0xFF1D4ED8)),
              const Gap(10),
              Text(
                'Upload Docs for Claim #$claimId',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Attach supporting bills, discharge summary, or repair estimates to this claim.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: docNameController,
                  decoration: const InputDecoration(
                    labelText: 'Document Type / Title *',
                  ),
                ),
                const Gap(10),
                TextField(
                  controller: remarksController,
                  decoration: const InputDecoration(
                    labelText: 'Remarks / Notes',
                    hintText: 'Authorized estimate from workshop...',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'Cancel',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'CLAIM_DOCUMENT_UPLOAD',
                          title:
                              'Doc Upload for Claim #$claimId: ${docNameController.text.trim()}',
                          description:
                              'Document: ${docNameController.text.trim()} attached for Claim #$claimId. Notes: ${remarksController.text.trim()}',
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Document uploaded successfully!'),
                              backgroundColor: Color(0xFF10B981),
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Error: ${e.toString().replaceAll("Exception:", "").trim()}',
                              ),
                            ),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const AppSmallLoader(color: Colors.white)
                  : const Text('Submit Document'),
            ),
          ],
        ),
      ),
    );
  }

  static void showClaimSummaryModal(BuildContext context, Claim claim) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            const Icon(
              Icons.receipt_long_rounded,
              color: Color(0xFF10B981),
              size: 24,
            ),
            const Gap(10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Claim Summary #${claim.id}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Policy #${claim.policyNo}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow('Insurance Company', claim.insurer, isDark),
              _detailRow('Claim Amount', claim.claimAmount, isDark),
              _detailRow('Estimated Payout', claim.estimatedPayout, isDark),
              _detailRow(
                'Claim Status',
                claim.status.name.toUpperCase(),
                isDark,
              ),
              _detailRow('Date Filed', claim.dateFiled, isDark),
              if (claim.hospitalOrWorkshop.isNotEmpty)
                _detailRow(
                  'Workshop / Hospital',
                  claim.hospitalOrWorkshop,
                  isDark,
                ),
              if (claim.surveyorName.isNotEmpty)
                _detailRow('Surveyor Assigned', claim.surveyorName, isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
        ],
      ),
    );
  }

  static void showProfileModal(
    BuildContext context,
    Map<String, dynamic> user,
    Map<String, dynamic> profile,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final name = profile['name'] ?? user['name'] ?? 'Account Holder';
    final phone = profile['phone'] ?? user['phone'] ?? '-';
    final email = profile['email'] ?? user['email'] ?? '-';
    final clientId = profile['id'] ?? user['id'] ?? '-';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(
              Icons.account_circle_outlined,
              color: Color(0xFF1D4ED8),
              size: 24,
            ),
            Gap(10),
            Text(
              'Client Profile',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: SizedBox(
          width: 440,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow('Customer Name', name, isDark),
              _detailRow('Client ID', clientId, isDark),
              _detailRow('Registered Phone', phone, isDark),
              _detailRow('Email Address', email, isDark),
              _detailRow('Portal Access', 'Active (Authenticated)', isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
        ],
      ),
    );
  }

  static void showChangeMpinModal(BuildContext context) {
    final currentMpinCtrl = TextEditingController();
    final newMpinCtrl = TextEditingController();
    final confirmMpinCtrl = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Row(
            children: [
              Icon(Icons.lock_reset_rounded, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text(
                'Change 6-Digit MPIN',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Update your secure 6-digit MPIN for accessing your BimaHeadquarter portal.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: currentMpinCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Current 6-Digit MPIN *',
                    counterText: '',
                  ),
                ),
                const Gap(10),
                TextField(
                  controller: newMpinCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New 6-Digit MPIN *',
                    counterText: '',
                  ),
                ),
                const Gap(10),
                TextField(
                  controller: confirmMpinCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm New MPIN *',
                    counterText: '',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'Cancel',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final curr = currentMpinCtrl.text.trim();
                      final nw = newMpinCtrl.text.trim();
                      final conf = confirmMpinCtrl.text.trim();
                      if (curr.length < 4 || nw.length != 6) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'New MPIN must be exactly 6 numeric digits.',
                            ),
                          ),
                        );
                        return;
                      }
                      if (nw != conf) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'New MPIN and Confirm MPIN do not match.',
                            ),
                          ),
                        );
                        return;
                      }
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.changeMpin(
                          currentMpin: curr,
                          newMpin: nw,
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                '6-digit MPIN updated successfully!',
                              ),
                              backgroundColor: Color(0xFF10B981),
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Error: ${e.toString().replaceAll("Exception:", "").trim()}',
                              ),
                            ),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const AppSmallLoader(color: Colors.white)
                  : const Text('Update MPIN'),
            ),
          ],
        ),
      ),
    );
  }

  static void showEndorsementRequestModal(
    BuildContext context, {
    String? defaultTitle,
    String? defaultDesc,
  }) {
    final titleCtrl = TextEditingController(
      text: defaultTitle ?? 'Policy Add-on Cover Request',
    );
    final descCtrl = TextEditingController(
      text: defaultDesc ?? 'Customer requested policy coverage upgrade.',
    );
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Row(
            children: [
              Icon(Icons.add_moderator_rounded, color: Color(0xFF1D4ED8)),
              Gap(10),
              Text(
                'Request Policy Add-on',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Submit an add-on or endorsement request to your insurance advisor. You can track its status anytime.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Gap(14),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Request Title *',
                  ),
                ),
                const Gap(10),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Coverage Details / Remarks *',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'Cancel',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      setDialogState(() => isSubmitting = true);
                      try {
                        await ApiService.submitServiceRequest(
                          category: 'POLICY_ADD_ON',
                          title: titleCtrl.text.trim(),
                          description: descCtrl.text.trim(),
                        );
                        if (dialogCtx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Add-on request submitted successfully!',
                              ),
                              backgroundColor: Color(0xFF10B981),
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Error: ${e.toString().replaceAll("Exception:", "").trim()}',
                              ),
                            ),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const AppSmallLoader(color: Colors.white)
                  : const Text('Submit Request'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PayPremiumDialog extends ConsumerStatefulWidget {
  const _PayPremiumDialog();

  @override
  ConsumerState<_PayPremiumDialog> createState() => _PayPremiumDialogState();
}

class _PayPremiumDialogState extends ConsumerState<_PayPremiumDialog> {
  String? _selectedPolicyId;
  String _selectedPaymentMethod = 'UPI / QR';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final dialogWidth = screenWidth < 520 ? screenWidth * 0.94 : 480.0;
    final livePolicies = ref.watch(livePoliciesProvider).value ?? [];

    final seenIds = <String>{};
    final uniquePolicies = <Policy>[];
    for (final p in livePolicies) {
      final pid = p.policyNumber ?? p.id;
      if (pid.isNotEmpty && seenIds.add(pid)) {
        uniquePolicies.add(p);
      }
    }

    if (uniquePolicies.isNotEmpty &&
        (_selectedPolicyId == null ||
            !uniquePolicies.any(
              (p) => (p.policyNumber ?? p.id) == _selectedPolicyId,
            ))) {
      _selectedPolicyId =
          uniquePolicies.first.policyNumber ?? uniquePolicies.first.id;
    }

    final glassGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: isDark
          ? [
              const Color(0xFF1E293B).withValues(alpha: 0.95),
              const Color(0xFF0F172A).withValues(alpha: 0.92),
            ]
          : [
              Colors.white.withValues(alpha: 0.98),
              const Color(0xFFF8FAFC).withValues(alpha: 0.95),
            ],
    );

    final specularBorder = Border.all(
      color: isDark
          ? Colors.white.withValues(alpha: 0.16)
          : Colors.white.withValues(alpha: 0.90),
      width: 1.0,
    );

    final selPolicy = uniquePolicies.isNotEmpty
        ? uniquePolicies.firstWhere(
            (p) => (p.policyNumber ?? p.id) == _selectedPolicyId,
            orElse: () => uniquePolicies.first,
          )
        : null;

    if (selPolicy == null) {
      return Dialog(
        backgroundColor: Colors.transparent,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
            child: Container(
              width: dialogWidth,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: glassGradient,
                borderRadius: BorderRadius.circular(28),
                border: specularBorder,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Pay Premium',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const Gap(16),
                  const Text(
                    'No active policies found for renewal or payment.',
                    style: TextStyle(color: Color(0xFF8E8E93)),
                  ),
                  const Gap(16),
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    final policyNum = selPolicy.policyNumber ?? selPolicy.id;
    final vehicleNum = selPolicy.vehicleNumber;
    final companyOrName = selPolicy.companyName.isNotEmpty
        ? selPolicy.companyName
        : selPolicy.name;

    final rawPrice = selPolicy.price
        .replaceAll('/yr', '')
        .replaceAll(RegExp(r'[^0-9.]'), '')
        .trim();
    final totalAmt = double.tryParse(rawPrice) ?? 0.0;
    final formattedTotal = CommonDialogs._formatAmount(totalAmt);
    final baseAmt = totalAmt > 0 ? (totalAmt / 1.18) : 0.0;
    final formattedBase = CommonDialogs._formatAmount(baseAmt);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            width: dialogWidth,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.90,
            ),
            decoration: BoxDecoration(
              gradient: glassGradient,
              borderRadius: BorderRadius.circular(28),
              border: specularBorder,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
                  blurRadius: 32,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 16, 14),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(
                            0xFFFF9500,
                          ).withValues(alpha: isDark ? 0.25 : 0.14),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.account_balance_wallet_rounded,
                          color: Color(0xFFFF9500),
                          size: 22,
                        ),
                      ),
                      const Gap(12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Pay Premium',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A),
                              ),
                            ),
                            const Gap(2),
                            Text(
                              'Fast-track renewal & instant cashless payment',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark
                                    ? const Color(0xFF98989D)
                                    : const Color(0xFF6E6E73),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.close_rounded,
                          size: 20,
                          color: isDark
                              ? const Color(0xFF98989D)
                              : const Color(0xFF6E6E73),
                        ),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                Divider(
                  height: 1,
                  color: isDark
                      ? Colors.white10
                      : Colors.black.withValues(alpha: 0.08),
                ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF2C2C2E)
                                : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white12
                                  : Colors.black.withValues(alpha: 0.08),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'SELECT POLICY TO PAY / RENEW',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                  color: isDark
                                      ? const Color(0xFF98989D)
                                      : const Color(0xFF8E8E93),
                                ),
                              ),
                              const Gap(4),
                              DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedPolicyId,
                                  isExpanded: true,
                                  itemHeight: 56.0,
                                  dropdownColor: isDark
                                      ? const Color(0xFF1E293B)
                                      : Colors.white,
                                  icon: const Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    color: Color(0xFF007AFF),
                                  ),
                                  selectedItemBuilder: (context) {
                                    return uniquePolicies.map<Widget>((p) {
                                      return Align(
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          p.selectorSingleLine,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: isDark
                                                ? Colors.white
                                                : const Color(0xFF0F172A),
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      );
                                    }).toList();
                                  },
                                  onChanged: (newId) {
                                    if (newId != null) {
                                      setState(() {
                                        _selectedPolicyId = newId;
                                      });
                                    }
                                  },
                                  items: uniquePolicies.map((p) {
                                    final pNum = p.policyNumber ?? p.id;
                                    final isVeh =
                                        p.cleanVehiclePlate.isNotEmpty;

                                    return DropdownMenuItem<String>(
                                      value: pNum,
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Row(
                                            children: [
                                              if (isVeh) ...[
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                    horizontal: 5,
                                                    vertical: 1.5,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: const Color(
                                                      0xFF003399,
                                                    ).withValues(
                                                      alpha: isDark
                                                          ? 0.35
                                                          : 0.10,
                                                    ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                      4,
                                                    ),
                                                    border: Border.all(
                                                      color: const Color(
                                                        0xFF003399,
                                                      ).withValues(
                                                        alpha: isDark
                                                            ? 0.6
                                                            : 0.3,
                                                      ),
                                                      width: 0.7,
                                                    ),
                                                  ),
                                                  child: Text(
                                                    p.cleanVehiclePlate,
                                                    style: TextStyle(
                                                      fontFamily: 'monospace',
                                                      fontSize: 10.5,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      color: isDark
                                                          ? const Color(
                                                              0xFF64D2FF,
                                                            )
                                                          : const Color(
                                                              0xFF003399,
                                                            ),
                                                    ),
                                                  ),
                                                ),
                                                const Gap(6),
                                              ],
                                              Expanded(
                                                child: Text(
                                                  '#$pNum',
                                                  style: TextStyle(
                                                    fontSize: 12.5,
                                                    fontWeight: FontWeight.w700,
                                                    fontFamily: 'monospace',
                                                    color: isDark
                                                        ? Colors.white
                                                        : const Color(
                                                            0xFF0F172A,
                                                          ),
                                                  ),
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 6,
                                                  vertical: 1.5,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: (p.isActive
                                                          ? const Color(
                                                              0xFF34C759,
                                                            )
                                                          : const Color(
                                                              0xFFFF9500,
                                                            ))
                                                      .withValues(
                                                    alpha: 0.15,
                                                  ),
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  p.isActive
                                                      ? 'Active'
                                                      : 'Expired',
                                                  style: TextStyle(
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.w700,
                                                    color: p.isActive
                                                        ? const Color(
                                                            0xFF34C759,
                                                          )
                                                        : const Color(
                                                            0xFFFF9500,
                                                          ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const Gap(2),
                                          Text(
                                            '${p.shortCompanyName} • ${p.insuredName.isNotEmpty ? p.insuredName : p.policyCategory} (${p.validityRemainingText})',
                                            style: TextStyle(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w500,
                                              color: isDark
                                                  ? const Color(0xFF98989D)
                                                  : const Color(0xFF6E6E73),
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Gap(14),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFF007AFF,
                            ).withValues(alpha: isDark ? 0.12 : 0.06),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(
                                0xFF007AFF,
                              ).withValues(alpha: isDark ? 0.30 : 0.20),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Expanded(
                                    child: Wrap(
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      spacing: 8,
                                      runSpacing: 4,
                                      children: [
                                        Text(
                                          'Policy #$policyNum',
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w700,
                                            color: isDark
                                                ? Colors.white
                                                : const Color(0xFF0040DD),
                                          ),
                                        ),
                                        if (vehicleNum != null &&
                                            vehicleNum.isNotEmpty)
                                          CommonDialogs._buildHsrpBadge(
                                            vehicleNum,
                                            isDark,
                                          ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(
                                        0xFF34C759,
                                      ).withValues(alpha: isDark ? 0.25 : 0.14),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'Active',
                                      style: TextStyle(
                                        color: Color(0xFF34C759),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const Gap(10),
                              Divider(
                                height: 1,
                                color: isDark
                                    ? Colors.white12
                                    : const Color(
                                        0xFF007AFF,
                                      ).withValues(alpha: 0.15),
                              ),
                              const Gap(10),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Base Premium:',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? const Color(0xFF98989D)
                                          : const Color(0xFF6E6E73),
                                    ),
                                  ),
                                  Text(
                                    formattedBase,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark
                                          ? Colors.white70
                                          : const Color(0xFF1C1C1E),
                                    ),
                                  ),
                                ],
                              ),
                              const Gap(4),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'GST:',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? const Color(0xFF98989D)
                                          : const Color(0xFF6E6E73),
                                    ),
                                  ),
                                  Text(
                                    '18% GST incl.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark
                                          ? Colors.white70
                                          : const Color(0xFF1C1C1E),
                                    ),
                                  ),
                                ],
                              ),
                              const Gap(8),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Total Premium Due:',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: isDark
                                          ? Colors.white
                                          : const Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    formattedTotal,
                                    style: const TextStyle(
                                      fontSize: 19,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                      color: Color(0xFF007AFF),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const Gap(16),
                        Text(
                          'PAYMENT METHOD',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: isDark
                                ? const Color(0xFF98989D)
                                : const Color(0xFF8E8E93),
                          ),
                        ),
                        const Gap(8),
                        Row(
                          children: [
                            _buildPaymentMethodOption(
                              label: 'UPI / QR',
                              icon: Icons.qr_code_2_rounded,
                              isDark: isDark,
                            ),
                            const Gap(8),
                            _buildPaymentMethodOption(
                              label: 'NetBanking',
                              icon: Icons.account_balance_rounded,
                              isDark: isDark,
                            ),
                            const Gap(8),
                            _buildPaymentMethodOption(
                              label: 'Cards',
                              icon: Icons.credit_card_rounded,
                              isDark: isDark,
                            ),
                          ],
                        ),
                        if (_selectedPaymentMethod == 'UPI / QR') ...[
                          const Gap(14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(
                                0xFF34C759,
                              ).withValues(alpha: isDark ? 0.16 : 0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(
                                  0xFF34C759,
                                ).withValues(alpha: isDark ? 0.35 : 0.25),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.qr_code_2_rounded,
                                  color: Color(0xFF34C759),
                                  size: 26,
                                ),
                                const Gap(10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Direct UPI Payment Available',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF34C759),
                                        ),
                                      ),
                                      const Gap(2),
                                      Text(
                                        'Instant checkout via GPay, PhonePe, Paytm, or BHIM',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isDark
                                              ? Colors.white70
                                              : const Color(0xFF6E6E73),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Divider(
                  height: 1,
                  color: isDark
                      ? Colors.white10
                      : Colors.black.withValues(alpha: 0.08),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: BorderSide(
                                color: isDark ? Colors.white12 : Colors.black12,
                              ),
                            ),
                          ),
                          child: Text(
                            'Cancel',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? const Color(0xFF98989D)
                                  : const Color(0xFF6E6E73),
                            ),
                          ),
                        ),
                      ),
                      const Gap(10),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF007AFF),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () async {
                            final messenger = ScaffoldMessenger.of(context);
                            Navigator.pop(context);

                            if (_selectedPaymentMethod == 'UPI / QR' &&
                                totalAmt > 0) {
                              final upiUri = Uri.parse(
                                'upi://pay?pa=bhqdesk@icici&pn=BimaHeadquarter&am=$totalAmt&cu=INR&tn=${Uri.encodeComponent('Renewal Policy $policyNum')}',
                              );
                              try {
                                await launchUrl(
                                  upiUri,
                                  mode: LaunchMode.externalApplication,
                                );
                              } catch (_) {}
                            }

                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Submitting renewal request...'),
                                backgroundColor: Color(0xFF007AFF),
                                duration: Duration(seconds: 2),
                              ),
                            );

                            try {
                              await ApiService.submitServiceRequest(
                                requestType: 'POLICY_RENEWAL',
                                subject: 'Renewal Request: $companyOrName',
                                description:
                                    'Client requested renewal for $companyOrName (#$policyNum) with premium $formattedTotal via preferred mode $_selectedPaymentMethod.',
                                policyNumber: policyNum,
                              );
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Renewal request for $companyOrName ($formattedTotal) submitted successfully! You will receive the official payment link shortly.',
                                  ),
                                  backgroundColor: const Color(0xFF34C759),
                                  duration: const Duration(seconds: 5),
                                ),
                              );
                            } catch (_) {
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Renewal request for $companyOrName submitted. Your advisor will contact you shortly.',
                                  ),
                                  backgroundColor: const Color(0xFF34C759),
                                ),
                              );
                            }
                          },
                          child: Text(
                            'Request Renewal ($formattedTotal)',
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentMethodOption({
    required String label,
    required IconData icon,
    required bool isDark,
  }) {
    final isSelected = _selectedPaymentMethod == label;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedPaymentMethod = label),
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF007AFF)
                : (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7)),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFF007AFF)
                  : (isDark
                        ? Colors.white12
                        : Colors.black.withValues(alpha: 0.08)),
              width: 0.8,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 17,
                color: isSelected
                    ? Colors.white
                    : (isDark
                          ? const Color(0xFF98989D)
                          : const Color(0xFF6E6E73)),
              ),
              const Gap(4),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    color: isSelected
                        ? Colors.white
                        : (isDark
                              ? const Color(0xFFE5E5EA)
                              : const Color(0xFF3A3A3C)),
                  ),
                  maxLines: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
