import { z } from "zod";
import {
  MachineStatus,
  MembershipRole,
  SessionStatus,
} from "@/lib/domain/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const startSessionSchema = z.object({
  qrCodeId: z
    .string()
    .trim()
    .regex(UUID_REGEX, "Geçersiz QR kod kimliği (UUID formatı bekleniyor)."),
  estimatedDuration: z
    .number()
    .int("Süre tam sayı olmalıdır.")
    .min(10, "Tahmini süre en az 10 dakika olmalıdır.")
    .max(240, "Tahmini süre en fazla 240 dakika olabilir."),
  programName: z
    .string()
    .trim()
    .min(2, "Program adı en az 2 karakter olmalıdır.")
    .max(80, "Program adı çok uzun."),
});

export const createMachineSchema = z.object({
  laundryRoomId: z.string().regex(UUID_REGEX, "Geçerli bir çamaşırhane seçin."),
  name: z
    .string()
    .trim()
    .min(2, "Makine adı en az 2 karakter olmalıdır.")
    .max(60, "Makine adı en fazla 60 karakter olabilir."),
  machineNumber: z
    .number()
    .int()
    .min(1, "Makine numarası 1 veya daha büyük olmalıdır.")
    .max(999),
  machineType: z.enum(["washer", "dryer"]),
  brand: z.string().trim().max(40).optional(),
  model: z.string().trim().max(40).optional(),
  defaultDurationMinutes: z.number().int().min(10).max(240),
});

export const createMaintenanceTicketSchema = z.object({
  machineId: z.string().regex(UUID_REGEX, "Geçerli bir makine seçin."),
  title: z
    .string()
    .trim()
    .min(4, "Arıza başlığı en az 4 karakter olmalıdır.")
    .max(100),
  description: z
    .string()
    .trim()
    .min(5, "Açıklama en az 5 karakter olmalıdır.")
    .max(500),
  priority: z.enum(["low", "medium", "high", "critical"]),
  markOutOfService: z.boolean().default(false),
});

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

/**
 * Determines whether a user role has access to the web administration panel.
 * Residents must NEVER access administrative views or server actions.
 */
export function canAccessAdminPanel(role: MembershipRole): boolean {
  return (
    role === "platform_admin" ||
    role === "organization_admin" ||
    role === "laundry_staff"
  );
}

/**
 * Determines whether an actor role is allowed to assign or modify memberships.
 * Prevents self-escalation and unauthorized role grants.
 */
export function canManageMemberships(
  actorRole: MembershipRole,
  targetRole: MembershipRole
): boolean {
  if (actorRole === "platform_admin") {
    return true;
  }
  if (actorRole === "organization_admin") {
    // Organization admins cannot grant platform_admin
    return targetRole !== "platform_admin";
  }
  return false;
}

/**
 * Determines whether a role can rotate QR codes or edit machine inventory.
 */
export function canManageMachines(role: MembershipRole): boolean {
  return (
    role === "platform_admin" ||
    role === "organization_admin" ||
    role === "laundry_staff"
  );
}

/**
 * Validates legal machine state transitions and role authorization.
 */
export function isLegalMachineTransition(
  fromStatus: MachineStatus,
  toStatus: MachineStatus,
  actorRole: MembershipRole
): { allowed: boolean; reason?: string } {
  if (fromStatus === toStatus) {
    return { allowed: false, reason: "Makine zaten bu durumda." };
  }

  // Out of service transitions
  if (toStatus === "out_of_service") {
    return { allowed: true };
  }

  if (fromStatus === "out_of_service" && toStatus === "available") {
    if (!canManageMachines(actorRole)) {
      return {
        allowed: false,
        reason:
          "Bakımdaki bir makineyi yalnızca yetkili personel veya yönetici tekrar kullanıma açabilir.",
      };
    }
    return { allowed: true };
  }

  if (fromStatus === "available" && toStatus === "in_use") {
    return { allowed: true };
  }

  if (
    fromStatus === "in_use" &&
    (toStatus === "cycle_complete" || toStatus === "available")
  ) {
    return { allowed: true };
  }

  if (fromStatus === "cycle_complete" && toStatus === "available") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Geçersiz durum geçişi: ${fromStatus} -> ${toStatus}.`,
  };
}

/**
 * Calculates remaining minutes and progress percentage using authoritative server timestamps.
 */
export function calculateRemainingTime(
  startedAtIso: string,
  estimatedEndAtIso: string,
  serverNowIso: string = new Date().toISOString()
): {
  remainingSeconds: number;
  remainingMinutesCeiling: number;
  progressPercent: number;
  isExpired: boolean;
} {
  const startMs = new Date(startedAtIso).getTime();
  const endMs = new Date(estimatedEndAtIso).getTime();
  const nowMs = new Date(serverNowIso).getTime();

  const totalMs = Math.max(1000, endMs - startMs);
  const elapsedMs = Math.max(0, nowMs - startMs);
  const remainingMs = Math.max(0, endMs - nowMs);

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedMs / totalMs) * 100))
  );

  return {
    remainingSeconds: Math.floor(remainingMs / 1000),
    remainingMinutesCeiling: Math.ceil(remainingMs / 60000),
    progressPercent,
    isExpired: remainingMs <= 0,
  };
}

/**
 * Checks whether a session state transition is valid.
 */
export function canTransitionSession(
  currentStatus: SessionStatus,
  nextStatus: SessionStatus
): boolean {
  if (currentStatus !== "active") {
    return false;
  }
  return (
    nextStatus === "completed" ||
    nextStatus === "cancelled" ||
    nextStatus === "expired"
  );
}
