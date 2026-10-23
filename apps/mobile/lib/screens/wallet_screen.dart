import 'package:flutter/material.dart';
import '../core/resident_repository.dart';

/// Phase 9: Resident Wallet & Sandbox Payment Gateway Screen (Iyzico / Stripe Test Mode).
class WalletScreen extends StatefulWidget {
  final ResidentRepository repository;
  final VoidCallback onBalanceChanged;

  const WalletScreen({
    super.key,
    required this.repository,
    required this.onBalanceChanged,
  });

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  double _selectedTopUpAmount = 100.0;
  String _selectedGateway = 'Iyzico (Test / Sandbox)';
  String? _statusMessage;

  void _handleAddFunds() {
    widget.repository.addWalletFunds(
      amountTry: _selectedTopUpAmount,
      provider: _selectedGateway,
    );
    setState(() {
      _statusMessage =
          '$_selectedGateway üzerinden ₺${_selectedTopUpAmount.toStringAsFixed(2)} test bakiyesi yüklendi.';
    });
    widget.onBalanceChanged();
  }

  @override
  Widget build(BuildContext context) {
    final balance = widget.repository.walletBalanceTry;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: const Color(0xFF1E3A8A),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'LaundroQR Öğrenci Cüzdanı',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 6),
                Text(
                  '₺${balance.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Test / Sandbox Modu — Gerçek kart tahsilatı yapılmaz.',
                  style: TextStyle(color: Colors.amberAccent, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (_statusMessage != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFD1FAE5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _statusMessage!,
              style: const TextStyle(
                color: Color(0xFF065F46),
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        const Text(
          'Bakiye Yükle (Simülasyon)',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: [50.0, 100.0, 200.0, 500.0].map((amount) {
            final isSelected = _selectedTopUpAmount == amount;
            return ChoiceChip(
              label: Text('₺${amount.toInt()}'),
              selected: isSelected,
              onSelected: (_) => setState(() => _selectedTopUpAmount = amount),
            );
          }).toList(),
        ),
        const SizedBox(height: 14),
        InputDecorator(
          decoration: const InputDecoration(
            labelText: 'Ödeme Altyapısı (Sandbox)',
            border: OutlineInputBorder(),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedGateway,
              isDense: true,
              isExpanded: true,
              items: const [
                DropdownMenuItem(
                  value: 'Iyzico (Test / Sandbox)',
                  child: Text('Iyzico (Test / Sandbox)'),
                ),
                DropdownMenuItem(
                  value: 'Stripe (Test / Sandbox)',
                  child: Text('Stripe (Test / Sandbox)'),
                ),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _selectedGateway = val);
              },
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          key: const Key('wallet_add_funds_btn'),
          onPressed: _handleAddFunds,
          icon: const Icon(Icons.account_balance_wallet_outlined),
          label: Text(
            '₺${_selectedTopUpAmount.toStringAsFixed(0)} Bakiye Yükle (Simülasyon)',
          ),
        ),
      ],
    );
  }
}
