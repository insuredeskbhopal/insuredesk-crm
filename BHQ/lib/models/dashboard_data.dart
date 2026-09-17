import 'package:flutter/material.dart';
import 'policy.dart';

class KpiMetric {
  final String label;
  final String value;
  final String note;
  final PolicyTone tone;
  final IconData? icon;

  const KpiMetric({
    required this.label,
    required this.value,
    required this.note,
    required this.tone,
    this.icon,
  });
}

class ActivityItem {
  final String title;
  final String meta;
  final PolicyTone tone;
  final IconData icon;

  const ActivityItem({
    required this.title,
    required this.meta,
    required this.tone,
    required this.icon,
  });
}
