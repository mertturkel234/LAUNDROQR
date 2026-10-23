import 'package:flutter/material.dart';
import 'core/models.dart';
import 'core/resident_repository.dart';

void main() {
  runApp(const LaundroQrMobileApp());
}

class LaundroQrMobileApp extends StatelessWidget {
  final ResidentRepository? repository;

  const LaundroQrMobileApp({super.key, this.repository});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LaundroQR Yurt Sakini',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1D4ED8)),
        useMaterial3: true,
      ),
      home: ResidentHomeScreen(
        repository: repository ?? ResidentRepository(),
      ),
    );
  }
}

class ResidentHomeScreen extends StatefulWidget {
  final ResidentRepository repository;

  const ResidentHomeScreen({super.key, required this.repository});

  @override
  State<ResidentHomeScreen> createState() => _ResidentHomeScreenState();
}

class _ResidentHomeScreenState extends State<ResidentHomeScreen> {
  int _selectedIndex = 0;
  String? _bannerMessage;
  bool _isErrorBanner = false;

  // QR Scan / Start Session Form Controllers
  final TextEditingController _qrController = TextEditingController(
    text: 'e1111111-1111-4111-8111-111111111101',
  );
  final TextEditingController _programController = TextEditingController(
    text: 'Pamuklu 40°C Standart',
  );
  int _selectedDuration = 45;

  // Maintenance Form Controllers
  String? _selectedTicketMachineId;
  final TextEditingController _ticketTitleController = TextEditingController();
  final TextEditingController _ticketDescController = TextEditingController();
  bool _markOutOfService = true;

  @override
  void initState() {
    super.initState();
    final machines = widget.repository.getAuthorizedMachines();
    if (machines.isNotEmpty) {
      _selectedTicketMachineId = machines.first.id;
    }
  }

  void _showFeedback(String message, {bool isError = false}) {
    setState(() {
      _bannerMessage = message;
      _isErrorBanner = isError;
    });
  }

  @override
  Widget build(BuildContext context) {
    final machines = widget.repository.getAuthorizedMachines();
    final sessions = widget.repository.getUserSessions();
    final activeSessions =
        sessions.where((s) => s.status == 'active').toList();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'LaundroQR — Yurt Sakini',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              widget.repository.currentOrganizationName,
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Honest Limitation Banner
          Container(
            width: double.infinity,
            color: const Color(0xFFFEF3C7),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: const Text(
              'Şeffaflık Notu: QR kod ve yazılım sayacı fiziksel makinenin çalıştığını veya boş olduğunu doğrulayamaz. Süreler tahmini olarak hesaplanır.',
              style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
            ),
          ),
          if (_bannerMessage != null)
            Container(
              width: double.infinity,
              color: _isErrorBanner
                  ? const Color(0xFFFEE2E2)
                  : const Color(0xFFD1FAE5),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _bannerMessage!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _isErrorBanner
                            ? const Color(0xFF991B1B)
                            : const Color(0xFF065F46),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _bannerMessage = null),
                    child: const Text('Kapat'),
                  ),
                ],
              ),
            ),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                _buildMachinesTab(machines, activeSessions),
                _buildQrScannerTab(machines),
                _buildSessionsTab(sessions),
                _buildMaintenanceTab(machines),
                _buildProfileTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.local_laundry_service_outlined),
            label: 'Makineler',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner),
            label: 'QR Başlat',
          ),
          NavigationDestination(
            icon: Icon(Icons.timer_outlined),
            label: 'Seanslarım',
          ),
          NavigationDestination(
            icon: Icon(Icons.build_outlined),
            label: 'Arıza Bildir',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            label: 'Ayarlar',
          ),
        ],
      ),
    );
  }

  Widget _buildMachinesTab(
    List<MachineModel> machines,
    List<SessionModel> activeSessions,
  ) {
    final nowUtc = DateTime.now().toUtc();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (activeSessions.isNotEmpty) ...[
          const Text(
            'Aktif Seansınız (Sunucu Zaman Damgalı)',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ...activeSessions.map((session) {
            final rem = session.remainingMinutes(nowUtc);
            return Card(
              color: const Color(0xFFEFF6FF),
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${session.machineName} — ${session.programName}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tahmini Kalan Süre: $rem dakika',
                      style: const TextStyle(
                        color: Color(0xFF1D4ED8),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: session.progressFraction(nowUtc),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      children: [
                        ElevatedButton(
                          onPressed: () {
                            try {
                              widget.repository.completeOrCancelSession(
                                sessionId: session.id,
                                markUnloadedImmediately: true,
                                cancel: false,
                              );
                              _showFeedback(
                                'Seans tamamlandı ve makine boşaltıldı olarak işaretlendi.',
                              );
                            } catch (e) {
                              _showFeedback(e.toString(), isError: true);
                            }
                          },
                          child: const Text('Çamaşırları Aldım (Boşalttım)'),
                        ),
                        OutlinedButton(
                          onPressed: () {
                            try {
                              widget.repository.completeOrCancelSession(
                                sessionId: session.id,
                                markUnloadedImmediately: false,
                                cancel: true,
                              );
                              _showFeedback('Seans iptal edildi.');
                            } catch (e) {
                              _showFeedback(e.toString(), isError: true);
                            }
                          },
                          child: const Text('İptal Et'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
          const Divider(height: 24),
        ],
        const Text(
          'Çamaşırhane Makineleri',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        ...machines.map((machine) {
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          machine.name,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Chip(
                        label: Text(
                          machine.status.label,
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${machine.laundryRoomName} • ${machine.brandModel}',
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Kaynak: ${machine.statusSource.label}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    machine.status.honestyNotice,
                    style: const TextStyle(fontSize: 11, color: Colors.black87),
                  ),
                  if (machine.status == MachineStatus.cycleComplete) ...[
                    const SizedBox(height: 10),
                    ElevatedButton.icon(
                      onPressed: () {
                        try {
                          widget.repository.confirmMachineUnloaded(machine.id);
                          _showFeedback(
                            '${machine.name} boşaltıldı olarak bildirildi ve Müsait durumuna geçti.',
                          );
                        } catch (e) {
                          _showFeedback(e.toString(), isError: true);
                        }
                      },
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('Makine Boşaltıldı Olarak Onayla'),
                    ),
                  ],
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildQrScannerTab(List<MachineModel> machines) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'QR Kod ile Makine Doğrula ve Seans Başlat',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Makine üzerindeki QR etiketi okutun veya test için makine QR UUID kodunu seçin. QR okutmak tek başına makinenin fiziksel olarak çalıştığını kanıtlamaz.',
          style: TextStyle(fontSize: 12, color: Colors.black54),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('qr_input_field'),
          controller: _qrController,
          decoration: const InputDecoration(
            labelText: 'Makine QR Kod Kimliği (UUID)',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: machines.map((m) {
            return ActionChip(
              label: Text('${m.name} QR Seç'),
              onPressed: () {
                setState(() {
                  _qrController.text = m.qrCodeId;
                  _selectedDuration = m.defaultDurationMinutes;
                });
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _programController,
          decoration: const InputDecoration(
            labelText: 'Program Adı',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<int>(
          value: _selectedDuration,
          decoration: const InputDecoration(
            labelText: 'Tahmini Döngü Süresi (Dakika)',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 30, child: Text('30 Dakika (Hızlı)')),
            DropdownMenuItem(value: 45, child: Text('45 Dakika (Standart)')),
            DropdownMenuItem(value: 60, child: Text('60 Dakika (Yoğun / Kurutma)')),
          ],
          onChanged: (val) {
            if (val != null) setState(() => _selectedDuration = val);
          },
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          key: const Key('start_session_btn'),
          onPressed: () {
            try {
              final session = widget.repository.startSessionByQr(
                rawQrCode: _qrController.text,
                durationMinutes: _selectedDuration,
                programName: _programController.text,
              );
              _showFeedback(
                '${session.machineName} için seans başlatıldı (${session.estimatedDurationMinutes} dk).',
              );
              setState(() => _selectedIndex = 0);
            } catch (e) {
              _showFeedback(e.toString(), isError: true);
            }
          },
          icon: const Icon(Icons.play_arrow),
          label: const Text('Seansı Başlat'),
        ),
      ],
    );
  }

  Widget _buildSessionsTab(List<SessionModel> sessions) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Seans Geçmişim',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ...sessions.map((s) {
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              title: Text('${s.machineName} — ${s.programName}'),
              subtitle: Text(
                'Durum: ${s.status} • Tahmini Süre: ${s.estimatedDurationMinutes} dk',
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildMaintenanceTab(List<MachineModel> machines) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Makine Arızası Bildir',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _selectedTicketMachineId,
          decoration: const InputDecoration(
            labelText: 'Arızalı Makine',
            border: OutlineInputBorder(),
          ),
          items: machines.map((m) {
            return DropdownMenuItem(value: m.id, child: Text(m.name));
          }).toList(),
          onChanged: (val) => setState(() => _selectedTicketMachineId = val),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _ticketTitleController,
          decoration: const InputDecoration(
            labelText: 'Arıza Başlığı (örn. Su boşaltmıyor)',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _ticketDescController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Detaylı Açıklama',
            border: OutlineInputBorder(),
          ),
        ),
        CheckboxListTile(
          value: _markOutOfService,
          onChanged: (val) => setState(() => _markOutOfService = val ?? true),
          title: const Text('Makine çalışamayacak durumda (Bakıma Al)'),
        ),
        FilledButton(
          onPressed: () {
            if (_selectedTicketMachineId == null) return;
            try {
              final ticket = widget.repository.submitMaintenanceTicket(
                machineId: _selectedTicketMachineId!,
                title: _ticketTitleController.text,
                description: _ticketDescController.text,
                markOutOfService: _markOutOfService,
              );
              _ticketTitleController.clear();
              _ticketDescController.clear();
              _showFeedback('Arıza kaydı iletildi: ${ticket.title}');
            } catch (e) {
              _showFeedback(e.toString(), isError: true);
            }
          },
          child: const Text('Arıza Bildirimini Gönder'),
        ),
      ],
    );
  }

  Widget _buildProfileTab() {
    final prefs = widget.repository.notificationPreferences;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Profil ve Bildirim Tercihleri',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Not: Push bildirimlerinin teslim zamanı işletim sistemi ve bildirim sağlayıcısına (FCM) bağlıdır; saniyesi saniyesine kesin teslimat garanti edilmez.',
          style: TextStyle(fontSize: 12, color: Colors.black54),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          title: const Text('Anlık Bildirimleri (Push) Etkinleştir'),
          value: prefs.pushEnabled,
          onChanged: (val) => setState(() => prefs.pushEnabled = val),
        ),
        SwitchListTile(
          title: const Text('Tahmini Döngü Bitiminde Bildir'),
          value: prefs.notifyOnCycleComplete,
          onChanged: (val) => setState(() => prefs.notifyOnCycleComplete = val),
        ),
        SwitchListTile(
          title: const Text('Bakım ve Arıza Güncellemelerini Bildir'),
          value: prefs.notifyOnMaintenance,
          onChanged: (val) => setState(() => prefs.notifyOnMaintenance = val),
        ),
      ],
    );
  }
}
