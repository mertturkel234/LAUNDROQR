import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Phase 8: Firebase Cloud Messaging (FCM) Notification Service Boilerplate.
/// Requests iOS/Android notification permissions and retrieves the device FCM token.
/// Safely handles environments where Firebase native config files are not yet provisioned.
class NotificationService {
  static final NotificationService instance = NotificationService._internal();

  NotificationService._internal();

  String? _lastFcmToken;
  String? get lastFcmToken => _lastFcmToken;

  Future<String?> initializeAndRequestPermission() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }

      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      debugPrint(
        '[LaundroQR FCM] Permission status: ${settings.authorizationStatus}',
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        // ignore: deprecated_member_use
        _lastFcmToken = await messaging.getToken();
        debugPrint('[LaundroQR FCM] Device Token: $_lastFcmToken');
        return _lastFcmToken;
      }
      return null;
    } catch (e) {
      debugPrint(
        '[LaundroQR FCM] Firebase native credentials not configured yet (Safe Fallback): $e',
      );
      return null;
    }
  }
}
