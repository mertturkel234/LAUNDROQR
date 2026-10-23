import 'models.dart';

class ResidentRepository {
  final String currentUserId;
  final String currentOrganizationId;
  final String currentOrganizationName;
  bool _inFlightRequest = false;

  final List<MachineModel> _machines = [];
  final List<SessionModel> _sessions = [];
  final List<MaintenanceTicketModel> _tickets = [];
  final NotificationPreferenceModel notificationPreferences =
      NotificationPreferenceModel();
  double _walletBalanceTry = 150.00;

  double get walletBalanceTry => _walletBalanceTry;

  void addWalletFunds({required double amountTry, required String provider}) {
    if (amountTry <= 0 || amountTry > 5000) {
      throw ArgumentError('Yüklenecek tutar 1 TL ile 5000 TL arasında olmalıdır.');
    }
    _walletBalanceTry += amountTry;
  }

  ResidentRepository({
    this.currentUserId = 'u1111111-1111-4111-8111-111111111103',
    this.currentOrganizationId = '11111111-1111-4111-8111-111111111111',
    this.currentOrganizationName = 'Boğaziçi Üniversitesi Kuzey Yurdu (Demo)',
  }) {
    _seedInitialData();
  }

  void _seedInitialData() {
    final nowUtc = DateTime.now().toUtc();
    _machines.addAll([
      MachineModel(
        id: 'd1111111-1111-4111-8111-111111111101',
        organizationId: '11111111-1111-4111-8111-111111111111',
        laundryRoomId: 'c1111111-1111-4111-8111-111111111111',
        laundryRoomName: '1. Blok Zemin Çamaşırhane',
        name: 'Çamaşır Makinesi #1',
        machineNumber: 1,
        isDryer: false,
        brandModel: 'Beko ProSmart 9kg',
        status: MachineStatus.available,
        statusSource: StatusSourceType.userReport,
        defaultDurationMinutes: 45,
        qrCodeId: 'e1111111-1111-4111-8111-111111111101',
      ),
      MachineModel(
        id: 'd1111111-1111-4111-8111-111111111102',
        organizationId: '11111111-1111-4111-8111-111111111111',
        laundryRoomId: 'c1111111-1111-4111-8111-111111111111',
        laundryRoomName: '1. Blok Zemin Çamaşırhane',
        name: 'Çamaşır Makinesi #2',
        machineNumber: 2,
        isDryer: false,
        brandModel: 'Beko ProSmart 9kg',
        status: MachineStatus.inUse,
        statusSource: StatusSourceType.software,
        defaultDurationMinutes: 45,
        qrCodeId: 'e1111111-1111-4111-8111-111111111102',
      ),
      MachineModel(
        id: 'd1111111-1111-4111-8111-111111111103',
        organizationId: '11111111-1111-4111-8111-111111111111',
        laundryRoomId: 'c1111111-1111-4111-8111-111111111111',
        laundryRoomName: '1. Blok Zemin Çamaşırhane',
        name: 'Çamaşır Makinesi #3',
        machineNumber: 3,
        isDryer: false,
        brandModel: 'Bosch Serie 6 10kg',
        status: MachineStatus.cycleComplete,
        statusSource: StatusSourceType.software,
        defaultDurationMinutes: 50,
        qrCodeId: 'e1111111-1111-4111-8111-111111111103',
        notes: 'Tahmini süre doldu; çamaşırların alındığı henüz onaylanmadı.',
      ),
      MachineModel(
        id: 'd1111111-1111-4111-8111-111111111104',
        organizationId: '11111111-1111-4111-8111-111111111111',
        laundryRoomId: 'c1111111-1111-4111-8111-111111111111',
        laundryRoomName: '1. Blok Zemin Çamaşırhane',
        name: 'Kurutma Makinesi #1',
        machineNumber: 4,
        isDryer: true,
        brandModel: 'Bosch HeatPump 9kg',
        status: MachineStatus.outOfService,
        statusSource: StatusSourceType.admin,
        defaultDurationMinutes: 60,
        qrCodeId: 'e1111111-1111-4111-8111-111111111104',
        isActive: false,
        notes: 'Filtre sensörü arızası nedeniyle bakımda.',
      ),
      // Cross-tenant machine to verify organization boundary enforcement
      MachineModel(
        id: 'd2222222-2222-4222-8222-222222222201',
        organizationId: '22222222-2222-4222-8222-222222222222',
        laundryRoomId: 'c2222222-2222-4222-8222-222222222221',
        laundryRoomName: 'Ankara KYK A Blok Çamaşırhane',
        name: 'KYK Çamaşır Makinesi #1',
        machineNumber: 1,
        isDryer: false,
        brandModel: 'Arçelik Endüstriyel 12kg',
        status: MachineStatus.available,
        statusSource: StatusSourceType.software,
        defaultDurationMinutes: 40,
        qrCodeId: 'e2222222-2222-4222-8222-222222222201',
      ),
    ]);

    _sessions.add(
      SessionModel(
        id: 'a1111111-1111-4111-8111-111111111101',
        organizationId: currentOrganizationId,
        machineId: 'd1111111-1111-4111-8111-111111111102',
        machineName: 'Çamaşır Makinesi #2',
        userId: currentUserId,
        programName: 'Pamuklu 40°C Standart',
        status: 'active',
        estimatedDurationMinutes: 45,
        startedAtUtc: nowUtc.subtract(const Duration(minutes: 20)),
        estimatedEndAtUtc: nowUtc.add(const Duration(minutes: 25)),
      ),
    );
  }

  List<MachineModel> getAuthorizedMachines() {
    return _machines
        .where((m) => m.organizationId == currentOrganizationId)
        .toList();
  }

  List<SessionModel> getUserSessions() {
    return _sessions
        .where((s) =>
            s.organizationId == currentOrganizationId &&
            s.userId == currentUserId)
        .toList();
  }

  List<MaintenanceTicketModel> getTickets() {
    return List.unmodifiable(_tickets);
  }

  SessionModel startSessionByQr({
    required String rawQrCode,
    required int durationMinutes,
    required String programName,
  }) {
    if (_inFlightRequest) {
      throw StateError(
        'İşleminiz devam ediyor, lütfen art arda tıklamayınız (DUPLICATE_REQUEST).',
      );
    }

    _inFlightRequest = true;
    try {
      final cleanQr = rawQrCode.trim();
      if (!QrValidator.isValidQrUuid(cleanQr)) {
        throw ArgumentError(
          'Geçersiz QR kod formatı. Lütfen makine üzerindeki LaundroQR etiketini okutun.',
        );
      }

      final machineIndex = _machines.indexWhere(
        (m) => m.qrCodeId.toLowerCase() == cleanQr.toLowerCase(),
      );
      if (machineIndex == -1) {
        throw StateError(
          'Bu QR koduna ait kayıtlı bir makine bulunamadı veya QR kod yenilenmiş.',
        );
      }

      final machine = _machines[machineIndex];
      if (machine.organizationId != currentOrganizationId) {
        throw StateError(
          'YETKİSİZ ERİŞİM: Bu makine kayıtlı olduğunuz yurda ait değil.',
        );
      }

      if (!machine.isActive || machine.status == MachineStatus.outOfService) {
        throw StateError(
          'Bu makine şu anda arızalı veya bakımda olduğu için kullanılamaz.',
        );
      }

      if (machine.status != MachineStatus.available) {
        throw StateError(
          'Makine şu anda müsait değil (${machine.status.label}). Lütfen önce boşaltıldığından emin olun.',
        );
      }

      final activeCount = _sessions
          .where((s) => s.userId == currentUserId && s.status == 'active')
          .length;
      if (activeCount >= 2) {
        throw StateError(
          'Adil kullanım kuralı gereği aynı anda en fazla 2 aktif seans başlatabilirsiniz.',
        );
      }

      final nowUtc = DateTime.now().toUtc();
      final session = SessionModel(
        id: 'sess-${nowUtc.microsecondsSinceEpoch}',
        organizationId: currentOrganizationId,
        machineId: machine.id,
        machineName: machine.name,
        userId: currentUserId,
        programName: programName.trim().isEmpty
            ? 'Standart Yıkama (40°C)'
            : programName.trim(),
        status: 'active',
        estimatedDurationMinutes: durationMinutes,
        startedAtUtc: nowUtc,
        estimatedEndAtUtc: nowUtc.add(Duration(minutes: durationMinutes)),
      );

      machine.status = MachineStatus.inUse;
      machine.statusSource = StatusSourceType.software;
      _sessions.insert(0, session);
      return session;
    } finally {
      _inFlightRequest = false;
    }
  }

  void completeOrCancelSession({
    required String sessionId,
    required bool markUnloadedImmediately,
    required bool cancel,
  }) {
    final index = _sessions.indexWhere((s) => s.id == sessionId);
    if (index == -1) {
      throw StateError('Seans bulunamadı.');
    }
    final session = _sessions[index];
    if (session.status != 'active') {
      throw StateError('Bu seans zaten sonlandırılmış.');
    }

    final machineIndex =
        _machines.indexWhere((m) => m.id == session.machineId);

    if (cancel) {
      session.status = 'cancelled';
      if (machineIndex != -1 &&
          _machines[machineIndex].status != MachineStatus.outOfService) {
        _machines[machineIndex].status = MachineStatus.available;
        _machines[machineIndex].statusSource = StatusSourceType.userReport;
      }
      return;
    }

    session.status = 'completed';
    session.completedAtUtc = DateTime.now().toUtc();
    if (machineIndex != -1 &&
        _machines[machineIndex].status != MachineStatus.outOfService) {
      if (markUnloadedImmediately) {
        _machines[machineIndex].status = MachineStatus.available;
        _machines[machineIndex].statusSource = StatusSourceType.userReport;
      } else {
        _machines[machineIndex].status = MachineStatus.cycleComplete;
        _machines[machineIndex].statusSource = StatusSourceType.software;
      }
    }
  }

  void confirmMachineUnloaded(String machineId) {
    final machineIndex = _machines.indexWhere(
      (m) => m.id == machineId && m.organizationId == currentOrganizationId,
    );
    if (machineIndex == -1) {
      throw StateError('Makine bulunamadı.');
    }
    final machine = _machines[machineIndex];
    if (machine.status != MachineStatus.cycleComplete) {
      throw StateError(
        'Yalnızca döngüsü tamamlanmış makineler boşaltıldı olarak onaylanabilir.',
      );
    }
    machine.status = MachineStatus.available;
    machine.statusSource = StatusSourceType.userReport;
  }

  MaintenanceTicketModel submitMaintenanceTicket({
    required String machineId,
    required String title,
    required String description,
    required bool markOutOfService,
  }) {
    if (title.trim().length < 4 || description.trim().length < 5) {
      throw ArgumentError('Lütfen geçerli bir arıza başlığı ve açıklaması girin.');
    }
    final machineIndex = _machines.indexWhere(
      (m) => m.id == machineId && m.organizationId == currentOrganizationId,
    );
    if (machineIndex == -1) {
      throw StateError('Makine bulunamadı.');
    }
    final machine = _machines[machineIndex];
    if (markOutOfService) {
      machine.status = MachineStatus.outOfService;
      machine.statusSource = StatusSourceType.userReport;
      machine.isActive = false;
      machine.notes = 'Sakin arıza bildirimi: ${title.trim()}';
    }

    final ticket = MaintenanceTicketModel(
      id: 'tkt-${DateTime.now().microsecondsSinceEpoch}',
      machineId: machine.id,
      machineName: machine.name,
      title: title.trim(),
      description: description.trim(),
      status: 'open',
      createdAtUtc: DateTime.now().toUtc(),
    );
    _tickets.insert(0, ticket);
    return ticket;
  }
}
