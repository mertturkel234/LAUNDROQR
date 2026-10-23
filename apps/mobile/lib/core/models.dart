enum MachineStatus {
  available,
  inUse,
  cycleComplete,
  outOfService;

  String get label {
    switch (this) {
      case MachineStatus.available:
        return 'Müsait (Bildirilen)';
      case MachineStatus.inUse:
        return 'Kullanımda (Tahmini Süre)';
      case MachineStatus.cycleComplete:
        return 'Döngü Tamamlandı (Boşaltma Bekliyor)';
      case MachineStatus.outOfService:
        return 'Bakımda / Arızalı';
    }
  }

  String get honestyNotice {
    switch (this) {
      case MachineStatus.available:
        return 'Yazılım kaydına göre müsaittir. Fiziksel sensör doğrulaması yoktur.';
      case MachineStatus.inUse:
        return 'Kalan süre yazılım zamanlayıcısına dayalı tahmindir; fiziksel çalışmayı garanti etmez.';
      case MachineStatus.cycleComplete:
        return 'ÖNEMLİ: Tahmini süre doldu ancak makinenin fiziksel olarak boşaltıldığı henüz onaylanmadı.';
      case MachineStatus.outOfService:
        return 'Arıza veya bakım nedeniyle geçici olarak kullanım dışıdır.';
    }
  }
}

enum StatusSourceType {
  software,
  userReport,
  sensor,
  admin;

  String get label {
    switch (this) {
      case StatusSourceType.software:
        return 'Tahmini (Yazılım Zamanlayıcısı)';
      case StatusSourceType.userReport:
        return 'Kullanıcı Bildirimi (Fiziksel Doğrulanmadı)';
      case StatusSourceType.sensor:
        return 'Donanım Sensörü Doğrulamalı';
      case StatusSourceType.admin:
        return 'Görevli / Yönetici Kaydı';
    }
  }
}

class MachineModel {
  final String id;
  final String organizationId;
  final String laundryRoomId;
  final String laundryRoomName;
  final String name;
  final int machineNumber;
  final bool isDryer;
  final String brandModel;
  MachineStatus status;
  StatusSourceType statusSource;
  final int defaultDurationMinutes;
  final String qrCodeId;
  bool isActive;
  String? notes;

  MachineModel({
    required this.id,
    required this.organizationId,
    required this.laundryRoomId,
    required this.laundryRoomName,
    required this.name,
    required this.machineNumber,
    required this.isDryer,
    required this.brandModel,
    required this.status,
    required this.statusSource,
    required this.defaultDurationMinutes,
    required this.qrCodeId,
    this.isActive = true,
    this.notes,
  });
}

class SessionModel {
  final String id;
  final String organizationId;
  final String machineId;
  final String machineName;
  final String userId;
  final String programName;
  String status; // 'active' | 'completed' | 'cancelled'
  final int estimatedDurationMinutes;
  final DateTime startedAtUtc;
  final DateTime estimatedEndAtUtc;
  DateTime? completedAtUtc;

  SessionModel({
    required this.id,
    required this.organizationId,
    required this.machineId,
    required this.machineName,
    required this.userId,
    required this.programName,
    required this.status,
    required this.estimatedDurationMinutes,
    required this.startedAtUtc,
    required this.estimatedEndAtUtc,
    this.completedAtUtc,
  });

  int remainingMinutes(DateTime serverNowUtc) {
    final diffSeconds = estimatedEndAtUtc.difference(serverNowUtc).inSeconds;
    if (diffSeconds <= 0) return 0;
    return (diffSeconds / 60).ceil();
  }

  double progressFraction(DateTime serverNowUtc) {
    final totalSeconds =
        estimatedEndAtUtc.difference(startedAtUtc).inSeconds.clamp(1, 86400);
    final elapsedSeconds =
        serverNowUtc.difference(startedAtUtc).inSeconds.clamp(0, totalSeconds);
    return elapsedSeconds / totalSeconds;
  }
}

class MaintenanceTicketModel {
  final String id;
  final String machineId;
  final String machineName;
  final String title;
  final String description;
  final String status;
  final DateTime createdAtUtc;

  MaintenanceTicketModel({
    required this.id,
    required this.machineId,
    required this.machineName,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAtUtc,
  });
}

class NotificationPreferenceModel {
  bool pushEnabled;
  int notifyBeforeEndMinutes;
  bool notifyOnCycleComplete;
  bool notifyOnMaintenance;

  NotificationPreferenceModel({
    this.pushEnabled = true,
    this.notifyBeforeEndMinutes = 5,
    this.notifyOnCycleComplete = true,
    this.notifyOnMaintenance = true,
  });
}

class QrValidator {
  static final RegExp _uuidRegExp = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  static bool isValidQrUuid(String rawInput) {
    return _uuidRegExp.hasMatch(rawInput.trim());
  }
}
