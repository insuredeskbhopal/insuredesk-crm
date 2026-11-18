import 'package:flutter/material.dart';
import 'package:gap/gap.dart';

class CommandPaletteItem {
  final String title;
  final String category;
  final IconData icon;
  final int targetPageIndex;
  final String shortcut;

  const CommandPaletteItem({
    required this.title,
    required this.category,
    required this.icon,
    required this.targetPageIndex,
    this.shortcut = '',
  });
}

class CommandPaletteModal extends StatefulWidget {
  final ValueChanged<int> onSelectPage;
  final VoidCallback onClose;

  const CommandPaletteModal({
    super.key,
    required this.onSelectPage,
    required this.onClose,
  });

  static const List<CommandPaletteItem> items = [
    CommandPaletteItem(
      title: 'Home',
      category: 'Navigation',
      icon: Icons.home_outlined,
      targetPageIndex: 0,
      shortcut: 'G H',
    ),
    CommandPaletteItem(
      title: 'My Policies',
      category: 'Navigation',
      icon: Icons.shield_outlined,
      targetPageIndex: 1,
      shortcut: 'G P',
    ),
    CommandPaletteItem(
      title: 'Renewals',
      category: 'Navigation',
      icon: Icons.autorenew_rounded,
      targetPageIndex: 2,
      shortcut: 'G R',
    ),
    CommandPaletteItem(
      title: 'My Claims',
      category: 'Navigation',
      icon: Icons.verified_user_outlined,
      targetPageIndex: 3,
      shortcut: 'G C',
    ),
    CommandPaletteItem(
      title: 'Support',
      category: 'Support',
      icon: Icons.help_outline_rounded,
      targetPageIndex: 4,
      shortcut: 'G S',
    ),
  ];

  @override
  State<CommandPaletteModal> createState() => _CommandPaletteModalState();
}

class _CommandPaletteModalState extends State<CommandPaletteModal> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<CommandPaletteItem> get _filteredItems {
    if (_query.isEmpty) return CommandPaletteModal.items;
    return CommandPaletteModal.items
        .where((item) =>
            item.title.toLowerCase().contains(_query.toLowerCase()) ||
            item.category.toLowerCase().contains(_query.toLowerCase()))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 580,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark ? Colors.white.withAlpha(30) : const Color(0xFFCBD5E1),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(isDark ? 120 : 50),
                blurRadius: 40,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Search Header Input
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                child: Row(
                  children: [
                    const Icon(Icons.search_rounded,
                        color: Color(0xFF2563EB), size: 22),
                    const Gap(12),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        autofocus: true,
                        onChanged: (val) => setState(() => _query = val),
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Type a command, page, or search query...',
                          hintStyle: TextStyle(
                            color: isDark ? Colors.white38 : Colors.black38,
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : Colors.black.withAlpha(10),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'ESC',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white60 : Colors.black54,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              Divider(
                height: 1,
                color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
              ),

              // Command Items List
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 360),
                child: _filteredItems.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          'No matching commands found.',
                          style: TextStyle(
                            color: isDark ? Colors.white38 : Colors.black45,
                            fontSize: 13,
                          ),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: _filteredItems.length,
                        itemBuilder: (context, index) {
                          final item = _filteredItems[index];

                          return InkWell(
                            onTap: () {
                              widget.onClose();
                              widget.onSelectPage(item.targetPageIndex);
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF2563EB).withAlpha(20),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      item.icon,
                                      size: 18,
                                      color: const Color(0xFF2563EB),
                                    ),
                                  ),
                                  const Gap(14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.title,
                                          style: TextStyle(
                                            color: isDark
                                                ? Colors.white
                                                : Colors.black87,
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        Text(
                                          item.category,
                                          style: TextStyle(
                                            color: isDark
                                                ? Colors.white38
                                                : Colors.black45,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (item.shortcut.isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? Colors.white10
                                            : Colors.black.withAlpha(10),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        item.shortcut,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isDark
                                              ? Colors.white60
                                              : Colors.black54,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),

              // Footer Tip
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withAlpha(5) : const Color(0xFFF8FAFC),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(20),
                    bottomRight: Radius.circular(20),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline_rounded,
                        size: 14,
                        color: isDark ? Colors.white38 : Colors.black45),
                    const Gap(6),
                    Text(
                      'Press Ctrl+K anytime to open Command Palette',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.white38 : Colors.black45,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
