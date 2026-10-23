-- =============================================================================
-- LAUNDROQR — DEMO / PILOT SEED DATA (NON-PRODUCTION)
-- =============================================================================
-- UYARI: Bu dosya yalnızca geliştirme, test ve yerel demo ortamları içindir.
-- Gerçek öğrenci verisi veya gerçek kimlik bilgisi İÇERMEZ.
-- =============================================================================

BEGIN;

-- 1. Demo Organizations (2 separate tenants to verify RLS isolation)
INSERT INTO public.organizations (id, name, slug, type, contact_email, is_active)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Boğaziçi Üniversitesi Kuzey Yurdu (Demo)', 'boun-kuzey-demo', 'university', 'yurt-demo@boun.edu.tr', true),
  ('22222222-2222-4222-8222-222222222222', 'Ankara KYK Kız Öğrenci Yurdu (Demo)', 'ankara-kyk-demo', 'kyk', 'demo@kyk.gov.tr', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Buildings
INSERT INTO public.buildings (id, organization_id, name, code, address, floor_count, is_active)
VALUES
  ('b1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '1. Kuzey Blok', 'KB-1', 'Kuzey Kampüs Beşiktaş / İstanbul', 5, true),
  ('b1111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', '2. Kuzey Blok', 'KB-2', 'Kuzey Kampüs Beşiktaş / İstanbul', 6, true),
  ('b2222222-2222-4222-8222-222222222221', '22222222-2222-4222-8222-222222222222', 'A Blok', 'A-BLOK', 'Çankaya / Ankara', 8, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Laundry Rooms
INSERT INTO public.laundry_rooms (id, organization_id, building_id, name, floor, operating_hours, notes, is_active)
VALUES
  ('c1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', '1. Blok Zemin Çamaşırhane', 0, '07:00 - 23:30', 'Lütfen döngü bitiminde çamaşırlarınızı 15 dk içinde alınız.', true),
  ('c1111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111112', '2. Blok Bodrum Çamaşırhane', -1, '08:00 - 23:00', 'Kurutma makineleri sağ koridordadır.', true),
  ('c2222222-2222-4222-8222-222222222221', '22222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222221', 'A Blok Ana Çamaşırhane', 0, '06:30 - 23:00', 'KYK Demo Çamaşırhanesi', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Demo Machines (with Phase 7 IoT machine_ip and mac_address columns)
INSERT INTO public.machines (
  id, organization_id, laundry_room_id, name, machine_number, machine_type,
  brand, model, status, status_source, default_duration_minutes, qr_code_id,
  machine_ip, mac_address, is_active, notes
)
VALUES
  ('d1111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Çamaşır Makinesi #1', 1, 'washer', 'Beko', 'ProSmart 9kg', 'available', 'user_report', 45, 'e1111111-1111-4111-8111-111111111101', '192.168.10.101', 'AA:BB:CC:11:22:01', true, 'Hızlı yıkama 30 dk destekler.'),
  ('d1111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Çamaşır Makinesi #2', 2, 'washer', 'Beko', 'ProSmart 9kg', 'in_use', 'software', 45, 'e1111111-1111-4111-8111-111111111102', '192.168.10.102', 'AA:BB:CC:11:22:02', true, NULL),
  ('d1111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Çamaşır Makinesi #3', 3, 'washer', 'Bosch', 'Serie 6 10kg', 'cycle_complete', 'software', 50, 'e1111111-1111-4111-8111-111111111103', '192.168.10.103', 'AA:BB:CC:11:22:03', true, 'Tahmini süre doldu; fiziksel olarak boşaltıldığı henüz onaylanmadı.'),
  ('d1111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Kurutma Makinesi #1', 4, 'dryer', 'Bosch', 'HeatPump 9kg', 'out_of_service', 'admin', 60, 'e1111111-1111-4111-8111-111111111104', '192.168.10.104', 'AA:BB:CC:11:22:04', false, 'Filtre sensörü arızası - teknik servis bekleniyor.'),
  ('d1111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111112', 'Kurutma Makinesi #2', 1, 'dryer', 'Beko', 'EcoDry 8kg', 'available', 'software', 60, 'e1111111-1111-4111-8111-111111111105', '192.168.10.105', 'AA:BB:CC:11:22:05', true, NULL),
  ('d2222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222221', 'KYK Çamaşır Makinesi #1', 1, 'washer', 'Arçelik', 'Endüstriyel 12kg', 'available', 'software', 40, 'e2222222-2222-4222-8222-222222222201', '10.10.20.101', 'BB:CC:DD:22:33:01', true, NULL)
ON CONFLICT (id) DO UPDATE SET
  machine_ip = EXCLUDED.machine_ip,
  mac_address = EXCLUDED.mac_address;

COMMIT;
