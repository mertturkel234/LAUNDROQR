export type OrganizationType = "university" | "kyk" | "private";

export type MembershipRole =
  | "platform_admin"
  | "organization_admin"
  | "laundry_staff"
  | "resident";

export type MembershipStatus = "active" | "suspended" | "revoked";

export type MachineType = "washer" | "dryer";

export type MachineStatus =
  | "available"
  | "in_use"
  | "cycle_complete"
  | "out_of_service";

export type StatusSourceType =
  | "software"
  | "user_report"
  | "sensor"
  | "admin"
  | "system";

export type SessionStatus = "active" | "completed" | "cancelled" | "expired";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Building {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string | null;
  floor_count: number | null;
  is_active: boolean;
}

export interface LaundryRoom {
  id: string;
  organization_id: string;
  building_id: string;
  name: string;
  floor: number;
  operating_hours: string;
  notes: string | null;
  is_active: boolean;
}

export interface Machine {
  id: string;
  organization_id: string;
  laundry_room_id: string;
  name: string;
  machine_number: number;
  machine_type: MachineType;
  brand: string | null;
  model: string | null;
  status: MachineStatus;
  status_source: StatusSourceType;
  default_duration_minutes: number;
  qr_code_id: string;
  qr_rotated_at: string;
  is_active: boolean;
  notes: string | null;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  building_id: string | null;
  full_name: string;
  email: string;
  room_number: string | null;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
}

export interface MachineSession {
  id: string;
  organization_id: string;
  laundry_room_id: string;
  machine_id: string;
  user_id: string;
  user_name?: string;
  machine_name?: string;
  program_name: string;
  status: SessionStatus;
  estimated_duration: number;
  started_at: string;
  estimated_end_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface MaintenanceTicket {
  id: string;
  organization_id: string;
  machine_id: string;
  machine_name?: string;
  reported_by: string;
  reporter_name?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  organization_id: string;
  actor_id: string;
  actor_name?: string;
  actor_role: MembershipRole;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export const MACHINE_STATUS_META: Record<
  MachineStatus,
  {
    label: string;
    description: string;
    honestyNotice: string;
    badgeClass: string;
  }
> = {
  available: {
    label: "Müsait (Bildirilen)",
    description: "Yeni kullanım seansı başlatılabilir.",
    honestyNotice:
      "Yazılım kaydına göre müsaittir. Fiziksel sensör doğrulaması yoktur.",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  in_use: {
    label: "Kullanımda (Tahmini Süre)",
    description: "Aktif bir yazılım seansı devam ediyor.",
    honestyNotice:
      "Kalan süre yazılım zamanlayıcısına dayalı tahmindir; fiziksel çalışmayı garanti etmez.",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  cycle_complete: {
    label: "Döngü Tamamlandı (Boşaltma Bekliyor)",
    description:
      "Tahmini yıkama süresi doldu ancak makinenin fiziksel olarak boşaltıldığı henüz onaylanmadı.",
    honestyNotice:
      "ÖNEMLİ: Bu durum makinenin fiziksel olarak boş olduğu anlamına GELMEZ. Çamaşırlar alındığında 'Makine Boşaltıldı' onayı verilmelidir.",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  out_of_service: {
    label: "Bakımda / Arızalı",
    description: "Makine geçici olarak kullanım dışıdır.",
    honestyNotice: "Personel veya arıza bildirimi ile devre dışı bırakıldı.",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
  },
};

export const STATUS_SOURCE_LABELS: Record<
  StatusSourceType,
  { label: string; isSensorVerified: boolean }
> = {
  software: {
    label: "Tahmini (Yazılım Zamanlayıcısı)",
    isSensorVerified: false,
  },
  user_report: {
    label: "Kullanıcı Bildirimi (Fiziksel Doğrulanmadı)",
    isSensorVerified: false,
  },
  admin: {
    label: "Görevli / Yönetici Kaydı",
    isSensorVerified: false,
  },
  system: {
    label: "Sistem Otomatik Kaydı",
    isSensorVerified: false,
  },
  sensor: {
    label: "Donanım Sensörü Doğrulamalı",
    isSensorVerified: true,
  },
};

export const ROLE_LABELS: Record<MembershipRole, string> = {
  platform_admin: "Platform Süper Yöneticisi",
  organization_admin: "Yurt / Kurum Yöneticisi",
  laundry_staff: "Çamaşırhane Görevlisi",
  resident: "Yurt Sakini (Öğrenci)",
};
