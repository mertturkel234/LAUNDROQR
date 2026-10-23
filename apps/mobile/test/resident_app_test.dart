import 'package:flutter_test/flutter_test.dart';
import 'package:laundroqr_mobile/core/models.dart';
import 'package:laundroqr_mobile/core/resident_repository.dart';
import 'package:laundroqr_mobile/main.dart';

void main() {
  group('LaundroQR Mobile Resident Tests', () {
    test('T-MOB-01: validates QR UUID format and rejects cross-tenant or invalid QR codes', () {
      expect(
        QrValidator.isValidQrUuid('e1111111-1111-4111-8111-111111111101'),
        isTrue,
      );
      expect(QrValidator.isValidQrUuid('invalid-qr-code'), isFalse);

      final repo = ResidentRepository();

      // Cross-tenant QR (belongs to Ankara KYK, user is in Bogazici) must be rejected
      expect(
        () => repo.startSessionByQr(
          rawQrCode: 'e2222222-2222-4222-8222-222222222201',
          durationMinutes: 45,
          programName: 'Standart',
        ),
        throwsStateError,
      );
    });

    test('T-MOB-02: enforces cycle_complete honesty lifecycle before machine becomes available', () {
      final repo = ResidentRepository();

      // Start session on Machine #1 (available)
      final session = repo.startSessionByQr(
        rawQrCode: 'e1111111-1111-4111-8111-111111111101',
        durationMinutes: 30,
        programName: 'Hızlı 30',
      );
      expect(session.status, equals('active'));

      // Complete cycle without unloading -> status is cycleComplete (not available!)
      repo.completeOrCancelSession(
        sessionId: session.id,
        markUnloadedImmediately: false,
        cancel: false,
      );

      final machineAfterCycle = repo
          .getAuthorizedMachines()
          .firstWhere((m) => m.id == 'd1111111-1111-4111-8111-111111111101');
      expect(machineAfterCycle.status, equals(MachineStatus.cycleComplete));

      // Confirm unloaded -> returns to available
      repo.confirmMachineUnloaded('d1111111-1111-4111-8111-111111111101');
      expect(machineAfterCycle.status, equals(MachineStatus.available));
    });

    testWidgets('T-MOB-03: renders honesty banner and machine statuses in Resident App', (WidgetTester tester) async {
      await tester.pumpWidget(const LaundroQrMobileApp());
      expect(find.textContaining('Şeffaflık Notu:'), findsOneWidget);
      expect(find.text('Çamaşır Makinesi #1'), findsOneWidget);
    });
  });
}
