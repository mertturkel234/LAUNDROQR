import {
  AuditLog,
  Building,
  LaundryRoom,
  Machine,
  MachineSession,
  MachineStatus,
  MaintenanceTicket,
  Membership,
  MembershipRole,
  Organization,
  TicketPriority,
  TicketStatus,
} from "@/lib/domain/types";
import {
  canManageMachines,
  canManageMemberships,
  createMachineSchema,
  createMaintenanceTicketSchema,
  isLegalMachineTransition,
  startSessionSchema,
} from "@/lib/domain/state-machine";

export interface ActorContext {
  userId: string;
  fullName: string;
  email: string;
  organizationId: string;
  role: MembershipRole;
}

export interface OperationalState {
  organizations: Organization[];
  buildings: Building[];
  laundryRooms: LaundryRoom[];
  machines: Machine[];
  memberships: Membership[];
  sessions: MachineSession[];
  tickets: MaintenanceTicket[];
  auditLogs: AuditLog[];
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createInitialSeedState(): OperationalState {
  const now = new Date();
  const twentyMinsAgo = new Date(now.getTime() - 20 * 60000).toISOString();
  const twentyFiveMinsLater = new Date(now.getTime() + 25 * 60000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 120 * 60000).toISOString();
  const seventyFiveMinsAgo = new Date(now.getTime() - 75 * 60000).toISOString();

  return {
    organizations: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Boğaziçi Üniversitesi Kuzey Yurdu (Demo)",
        slug: "boun-kuzey-demo",
        type: "university",
        contact_email: "yurt-demo@boun.edu.tr",
        is_active: true,
        created_at: twoHoursAgo,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Ankara KYK Kız Öğrenci Yurdu (Demo)",
        slug: "ankara-kyk-demo",
        type: "kyk",
        contact_email: "demo@kyk.gov.tr",
        is_active: true,
        created_at: twoHoursAgo,
      },
    ],
    buildings: [
      {
        id: "b1111111-1111-4111-8111-111111111111",
        organization_id: "11111111-1111-4111-8111-111111111111",
        name: "1. Kuzey Blok",
        code: "KB-1",
        address: "Kuzey Kampüs Beşiktaş / İstanbul",
        floor_count: 5,
        is_active: true,
      },
      {
        id: "b1111111-1111-4111-8111-111111111112",
        organization_id: "11111111-1111-4111-8111-111111111111",
        name: "2. Kuzey Blok",
        code: "KB-2",
        address: "Kuzey Kampüs Beşiktaş / İstanbul",
        floor_count: 6,
        is_active: true,
      },
      {
        id: "b2222222-2222-4222-8222-222222222221",
        organization_id: "22222222-2222-4222-8222-222222222222",
        name: "A Blok",
        code: "A-BLOK",
        address: "Çankaya / Ankara",
        floor_count: 8,
        is_active: true,
      },
    ],
    laundryRooms: [
      {
        id: "c1111111-1111-4111-8111-111111111111",
        organization_id: "11111111-1111-4111-8111-111111111111",
        building_id: "b1111111-1111-4111-8111-111111111111",
        name: "1. Blok Zemin Çamaşırhane",
        floor: 0,
        operating_hours: "07:00 - 23:30",
        notes: "Döngü bitiminde çamaşırlarınızı 15 dk içinde alınız.",
        is_active: true,
      },
      {
        id: "c1111111-1111-4111-8111-111111111112",
        organization_id: "11111111-1111-4111-8111-111111111111",
        building_id: "b1111111-1111-4111-8111-111111111112",
        name: "2. Blok Bodrum Çamaşırhane",
        floor: -1,
        operating_hours: "08:00 - 23:00",
        notes: "Kurutma makineleri sağ koridordadır.",
        is_active: true,
      },
      {
        id: "c2222222-2222-4222-8222-222222222221",
        organization_id: "22222222-2222-4222-8222-222222222222",
        building_id: "b2222222-2222-4222-8222-222222222221",
        name: "A Blok Ana Çamaşırhane",
        floor: 0,
        operating_hours: "06:30 - 23:00",
        notes: "KYK Demo Çamaşırhanesi",
        is_active: true,
      },
    ],
    machines: [
      {
        id: "d1111111-1111-4111-8111-111111111101",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111111",
        name: "Çamaşır Makinesi #1",
        machine_number: 1,
        machine_type: "washer",
        brand: "Beko",
        model: "ProSmart 9kg",
        status: "available",
        status_source: "user_report",
        default_duration_minutes: 45,
        qr_code_id: "e1111111-1111-4111-8111-111111111101",
        qr_rotated_at: twoHoursAgo,
        machine_ip: "192.168.10.101",
        mac_address: "AA:BB:CC:11:22:01",
        is_active: true,
        notes: "Hızlı yıkama 30 dk destekler.",
        updated_at: twoHoursAgo,
      },
      {
        id: "d1111111-1111-4111-8111-111111111102",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111111",
        name: "Çamaşır Makinesi #2",
        machine_number: 2,
        machine_type: "washer",
        brand: "Beko",
        model: "ProSmart 9kg",
        status: "in_use",
        status_source: "software",
        default_duration_minutes: 45,
        qr_code_id: "e1111111-1111-4111-8111-111111111102",
        qr_rotated_at: twoHoursAgo,
        machine_ip: "192.168.10.102",
        mac_address: "AA:BB:CC:11:22:02",
        is_active: true,
        notes: null,
        updated_at: twentyMinsAgo,
      },
      {
        id: "d1111111-1111-4111-8111-111111111103",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111111",
        name: "Çamaşır Makinesi #3",
        machine_number: 3,
        machine_type: "washer",
        brand: "Bosch",
        model: "Serie 6 10kg",
        status: "cycle_complete",
        status_source: "software",
        default_duration_minutes: 50,
        qr_code_id: "e1111111-1111-4111-8111-111111111103",
        qr_rotated_at: twoHoursAgo,
        machine_ip: "192.168.10.103",
        mac_address: "AA:BB:CC:11:22:03",
        is_active: true,
        notes: "Tahmini süre doldu; fiziksel olarak boşaltıldığı henüz onaylanmadı.",
        updated_at: seventyFiveMinsAgo,
      },
      {
        id: "d1111111-1111-4111-8111-111111111104",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111111",
        name: "Kurutma Makinesi #1",
        machine_number: 4,
        machine_type: "dryer",
        brand: "Bosch",
        model: "HeatPump 9kg",
        status: "out_of_service",
        status_source: "admin",
        default_duration_minutes: 60,
        qr_code_id: "e1111111-1111-4111-8111-111111111104",
        qr_rotated_at: twoHoursAgo,
        is_active: false,
        notes: "Filtre sensörü arızası - teknik servis bekleniyor.",
        updated_at: twoHoursAgo,
      },
      {
        id: "d1111111-1111-4111-8111-111111111105",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111112",
        name: "Kurutma Makinesi #2",
        machine_number: 1,
        machine_type: "dryer",
        brand: "Beko",
        model: "EcoDry 8kg",
        status: "available",
        status_source: "software",
        default_duration_minutes: 60,
        qr_code_id: "e1111111-1111-4111-8111-111111111105",
        qr_rotated_at: twoHoursAgo,
        is_active: true,
        notes: null,
        updated_at: twoHoursAgo,
      },
      {
        id: "d2222222-2222-4222-8222-222222222201",
        organization_id: "22222222-2222-4222-8222-222222222222",
        laundry_room_id: "c2222222-2222-4222-8222-222222222221",
        name: "KYK Çamaşır Makinesi #1",
        machine_number: 1,
        machine_type: "washer",
        brand: "Arçelik",
        model: "Endüstriyel 12kg",
        status: "available",
        status_source: "software",
        default_duration_minutes: 40,
        qr_code_id: "e2222222-2222-4222-8222-222222222201",
        qr_rotated_at: twoHoursAgo,
        is_active: true,
        notes: null,
        updated_at: twoHoursAgo,
      },
    ],
    memberships: [
      {
        id: "f1111111-1111-4111-8111-111111111101",
        user_id: "u1111111-1111-4111-8111-111111111101",
        organization_id: "11111111-1111-4111-8111-111111111111",
        building_id: "b1111111-1111-4111-8111-111111111111",
        full_name: "Mert Türkel (Yurt Yöneticisi)",
        email: "mert.admin@boun-demo.edu.tr",
        room_number: "İdari Ofis 101",
        role: "organization_admin",
        status: "active",
        created_at: twoHoursAgo,
      },
      {
        id: "f1111111-1111-4111-8111-111111111102",
        user_id: "u1111111-1111-4111-8111-111111111102",
        organization_id: "11111111-1111-4111-8111-111111111111",
        building_id: "b1111111-1111-4111-8111-111111111111",
        full_name: "Ahmet Yılmaz (Çamaşırhane Görevlisi)",
        email: "ahmet.gorevli@boun-demo.edu.tr",
        room_number: "Teknik Servis",
        role: "laundry_staff",
        status: "active",
        created_at: twoHoursAgo,
      },
      {
        id: "f1111111-1111-4111-8111-111111111103",
        user_id: "u1111111-1111-4111-8111-111111111103",
        organization_id: "11111111-1111-4111-8111-111111111111",
        building_id: "b1111111-1111-4111-8111-111111111111",
        full_name: "Zeynep Kaya (Öğrenci - Oda 304)",
        email: "zeynep.kaya@boun-demo.edu.tr",
        room_number: "KB1-304",
        role: "resident",
        status: "active",
        created_at: twoHoursAgo,
      },
      {
        id: "f2222222-2222-4222-8222-222222222201",
        user_id: "u2222222-2222-4222-8222-222222222201",
        organization_id: "22222222-2222-4222-8222-222222222222",
        building_id: "b2222222-2222-4222-8222-222222222221",
        full_name: "Selin Demir (Ankara KYK Yöneticisi)",
        email: "selin.admin@kyk-demo.gov.tr",
        room_number: "Yönetim",
        role: "organization_admin",
        status: "active",
        created_at: twoHoursAgo,
      },
    ],
    sessions: [
      {
        id: "a1111111-1111-4111-8111-111111111101",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111111",
        machine_id: "d1111111-1111-4111-8111-111111111102",
        user_id: "u1111111-1111-4111-8111-111111111103",
        user_name: "Zeynep Kaya (Öğrenci - Oda 304)",
        machine_name: "Çamaşır Makinesi #2",
        program_name: "Pamuklu 40°C Standart",
        status: "active",
        estimated_duration: 45,
        started_at: twentyMinsAgo,
        estimated_end_at: twentyFiveMinsLater,
        completed_at: null,
        cancelled_at: null,
        cancellation_reason: null,
      },
      {
        id: "a1111111-1111-4111-8111-111111111102",
        organization_id: "11111111-1111-4111-8111-111111111111",
        laundry_room_id: "c1111111-1111-4111-8111-111111111111",
        machine_id: "d1111111-1111-4111-8111-111111111103",
        user_id: "u1111111-1111-4111-8111-111111111103",
        user_name: "Zeynep Kaya (Öğrenci - Oda 304)",
        machine_name: "Çamaşır Makinesi #3",
        program_name: "Sentetik Hızlı 30°C",
        status: "completed",
        estimated_duration: 45,
        started_at: twoHoursAgo,
        estimated_end_at: seventyFiveMinsAgo,
        completed_at: seventyFiveMinsAgo,
        cancelled_at: null,
        cancellation_reason: null,
      },
    ],
    tickets: [
      {
        id: "91111111-1111-4111-8111-111111111101",
        organization_id: "11111111-1111-4111-8111-111111111111",
        machine_id: "d1111111-1111-4111-8111-111111111104",
        machine_name: "Kurutma Makinesi #1",
        reported_by: "u1111111-1111-4111-8111-111111111103",
        reporter_name: "Zeynep Kaya (Öğrenci - Oda 304)",
        title: "Kurutma makinesi ısıtmıyor ve E04 hatası veriyor",
        description:
          "Program başladıktan 10 dakika sonra filtre uyarısı verip duruyor.",
        priority: "high",
        status: "in_progress",
        resolved_by: null,
        resolved_at: null,
        resolution_note: "Teknik servis kaydı açıldı, filtre sensörü değişecek.",
        created_at: twoHoursAgo,
      },
    ],
    auditLogs: [
      {
        id: 1,
        organization_id: "11111111-1111-4111-8111-111111111111",
        actor_id: "u1111111-1111-4111-8111-111111111101",
        actor_name: "Mert Türkel (Yurt Yöneticisi)",
        actor_role: "organization_admin",
        action: "machine.status_changed",
        entity_type: "machine",
        entity_id: "d1111111-1111-4111-8111-111111111104",
        metadata: {
          from: "available",
          to: "out_of_service",
          reason: "E04 filtre sensörü arızası",
        },
        occurred_at: twoHoursAgo,
      },
    ],
  };
}

/**
 * Tenant-isolated & RBAC-enforced Operational Store.
 * Mirrors PostgreSQL RLS + RPC rules for deterministic verification and UI operations.
 */
export class LaundroOperationalEngine {
  private state: OperationalState;

  constructor(initialState?: OperationalState) {
    this.state = initialState ?? createInitialSeedState();
  }

  private assertTenantAccess(actor: ActorContext, targetOrgId: string): void {
    if (actor.role === "platform_admin") return;
    if (actor.organizationId !== targetOrgId) {
      throw new Error(
        "GÜVENLİK İHLALİ ENGELLENDİ (RLS): Farklı bir organizasyonun verilerine erişemezsiniz."
      );
    }
  }

  public getTenantSnapshot(actor: ActorContext): {
    organization: Organization | undefined;
    buildings: Building[];
    laundryRooms: LaundryRoom[];
    machines: Machine[];
    memberships: Membership[];
    sessions: MachineSession[];
    tickets: MaintenanceTicket[];
    auditLogs: AuditLog[];
  } {
    const orgId = actor.organizationId;
    return {
      organization: this.state.organizations.find((o) => o.id === orgId),
      buildings: this.state.buildings.filter((b) => b.organization_id === orgId),
      laundryRooms: this.state.laundryRooms.filter(
        (r) => r.organization_id === orgId
      ),
      machines: this.state.machines.filter((m) => m.organization_id === orgId),
      memberships:
        actor.role === "resident"
          ? this.state.memberships.filter(
              (m) => m.organization_id === orgId && m.user_id === actor.userId
            )
          : this.state.memberships.filter((m) => m.organization_id === orgId),
      sessions: this.state.sessions.filter((s) => s.organization_id === orgId),
      tickets: this.state.tickets.filter((t) => t.organization_id === orgId),
      auditLogs:
        actor.role === "organization_admin" || actor.role === "platform_admin"
          ? this.state.auditLogs.filter((a) => a.organization_id === orgId)
          : [],
    };
  }

  public startSessionByQr(
    actor: ActorContext,
    input: { qrCodeId: string; estimatedDuration: number; programName: string }
  ): MachineSession {
    const parsed = startSessionSchema.parse(input);
    const machine = this.state.machines.find(
      (m) => m.qr_code_id.toLowerCase() === parsed.qrCodeId.toLowerCase()
    );

    if (!machine) {
      throw new Error("Geçersiz veya süresi dolmuş QR kodu (INVALID_QR_CODE).");
    }

    this.assertTenantAccess(actor, machine.organization_id);

    if (!machine.is_active || machine.status === "out_of_service") {
      throw new Error(
        "Bu makine şu anda kullanım dışı veya bakımda (MACHINE_OUT_OF_SERVICE)."
      );
    }

    // Atomic active session check (mirrors uq_one_active_session_per_machine)
    const existingActive = this.state.sessions.find(
      (s) => s.machine_id === machine.id && s.status === "active"
    );
    if (existingActive || machine.status !== "available") {
      throw new Error(
        `Makine şu anda müsait değil (Mevcut durum: ${machine.status}). Eşzamanlı seans başlatılamaz.`
      );
    }

    const activeUserSessions = this.state.sessions.filter(
      (s) =>
        s.user_id === actor.userId &&
        s.organization_id === machine.organization_id &&
        s.status === "active"
    );
    if (activeUserSessions.length >= 2) {
      throw new Error(
        "Adil kullanım kuralı gereği aynı anda en fazla 2 aktif seans başlatabilirsiniz."
      );
    }

    const now = new Date();
    const endAt = new Date(now.getTime() + parsed.estimatedDuration * 60000);

    const newSession: MachineSession = {
      id: generateUuid(),
      organization_id: machine.organization_id,
      laundry_room_id: machine.laundry_room_id,
      machine_id: machine.id,
      user_id: actor.userId,
      user_name: actor.fullName,
      machine_name: machine.name,
      program_name: parsed.programName,
      status: "active",
      estimated_duration: parsed.estimatedDuration,
      started_at: now.toISOString(),
      estimated_end_at: endAt.toISOString(),
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    };

    machine.status = "in_use";
    machine.status_source = "software";
    machine.updated_at = now.toISOString();

    this.state.sessions.unshift(newSession);
    this.appendAudit(
      actor,
      "session.started",
      "machine_session",
      newSession.id,
      {
        machine_id: machine.id,
        machine_name: machine.name,
        estimated_duration: parsed.estimatedDuration,
      }
    );

    return newSession;
  }

  public finishSession(
    actor: ActorContext,
    sessionId: string,
    action: "complete" | "complete_and_unload" | "cancel",
    reason?: string
  ): MachineSession {
    const session = this.state.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error("Seans bulunamadı (SESSION_NOT_FOUND).");
    }

    this.assertTenantAccess(actor, session.organization_id);

    const isStaffOrAdmin = canManageMachines(actor.role);
    if (session.user_id !== actor.userId && !isStaffOrAdmin) {
      throw new Error(
        "Yetkisiz işlem: Başka bir kullanıcıya ait aktif seansı sonlandıramazsınız."
      );
    }

    if (session.status !== "active") {
      throw new Error("Bu seans zaten sonlandırılmış.");
    }

    const nowIso = new Date().toISOString();
    const machine = this.state.machines.find(
      (m) => m.id === session.machine_id
    );

    if (action === "cancel") {
      session.status = "cancelled";
      session.cancelled_at = nowIso;
      session.cancellation_reason =
        reason ?? "Kullanıcı/Görevli tarafından iptal edildi";
      if (machine && machine.status !== "out_of_service") {
        machine.status = "available";
        machine.status_source = "user_report";
        machine.updated_at = nowIso;
      }
    } else if (action === "complete_and_unload") {
      session.status = "completed";
      session.completed_at = nowIso;
      if (machine && machine.status !== "out_of_service") {
        machine.status = "available";
        machine.status_source = "user_report";
        machine.updated_at = nowIso;
      }
    } else {
      session.status = "completed";
      session.completed_at = nowIso;
      if (machine && machine.status !== "out_of_service") {
        machine.status = "cycle_complete";
        machine.status_source = "software";
        machine.updated_at = nowIso;
      }
    }

    this.appendAudit(
      actor,
      `session.${action}`,
      "machine_session",
      session.id,
      {
        machine_id: session.machine_id,
        new_machine_status: machine?.status,
      }
    );

    return session;
  }

  public confirmMachineUnloaded(
    actor: ActorContext,
    machineId: string
  ): Machine {
    const machine = this.state.machines.find((m) => m.id === machineId);
    if (!machine) {
      throw new Error("Makine bulunamadı.");
    }

    this.assertTenantAccess(actor, machine.organization_id);

    if (machine.status !== "cycle_complete") {
      throw new Error(
        "Yalnızca döngüsü tamamlanmış (cycle_complete) makineler boşaltıldı olarak onaylanabilir."
      );
    }

    machine.status = "available";
    machine.status_source = "user_report";
    machine.updated_at = new Date().toISOString();

    this.appendAudit(actor, "machine.unloaded", "machine", machine.id, {
      machine_name: machine.name,
      status_source: "user_report",
    });

    return machine;
  }

  public rotateMachineQr(
    actor: ActorContext,
    machineId: string,
    reason: string
  ): Machine {
    if (!canManageMachines(actor.role)) {
      throw new Error(
        "YETKİSİZ İŞLEM: QR kod yenileme işlemi yalnızca yönetici veya çamaşırhane görevlisi tarafından yapılabilir."
      );
    }

    const machine = this.state.machines.find((m) => m.id === machineId);
    if (!machine) {
      throw new Error("Makine bulunamadı.");
    }

    this.assertTenantAccess(actor, machine.organization_id);

    const oldQr = machine.qr_code_id;
    const nowIso = new Date().toISOString();
    machine.qr_code_id = generateUuid();
    machine.qr_rotated_at = nowIso;
    machine.updated_at = nowIso;

    this.appendAudit(actor, "machine.qr_rotated", "machine", machine.id, {
      machine_name: machine.name,
      previous_qr_code_id: oldQr,
      new_qr_code_id: machine.qr_code_id,
      reason,
    });

    return machine;
  }

  public createMachine(
    actor: ActorContext,
    input: {
      laundryRoomId: string;
      name: string;
      machineNumber: number;
      machineType: "washer" | "dryer";
      brand?: string;
      model?: string;
      defaultDurationMinutes: number;
    }
  ): Machine {
    if (!canManageMachines(actor.role)) {
      throw new Error(
        "YETKİSİZ İŞLEM: Yeni makine ekleme yetkiniz bulunmamaktadır."
      );
    }

    const parsed = createMachineSchema.parse(input);
    const room = this.state.laundryRooms.find(
      (r) => r.id === parsed.laundryRoomId
    );
    if (!room) {
      throw new Error("Seçilen çamaşırhane bulunamadı.");
    }

    this.assertTenantAccess(actor, room.organization_id);

    const duplicateNumber = this.state.machines.find(
      (m) =>
        m.laundry_room_id === room.id &&
        m.machine_number === parsed.machineNumber
    );
    if (duplicateNumber) {
      throw new Error(
        `Bu çamaşırhanede #${parsed.machineNumber} numaralı makine zaten mevcut.`
      );
    }

    const nowIso = new Date().toISOString();
    const newMachine: Machine = {
      id: generateUuid(),
      organization_id: room.organization_id,
      laundry_room_id: room.id,
      name: parsed.name,
      machine_number: parsed.machineNumber,
      machine_type: parsed.machineType,
      brand: parsed.brand || "Beko",
      model: parsed.model || "Endüstriyel",
      status: "available",
      status_source: "admin",
      default_duration_minutes: parsed.defaultDurationMinutes,
      qr_code_id: generateUuid(),
      qr_rotated_at: nowIso,
      is_active: true,
      notes: null,
      updated_at: nowIso,
    };

    this.state.machines.push(newMachine);
    this.appendAudit(actor, "machine.created", "machine", newMachine.id, {
      name: newMachine.name,
      laundry_room_id: room.id,
    });

    return newMachine;
  }

  public updateMachineStatusByStaff(
    actor: ActorContext,
    machineId: string,
    targetStatus: MachineStatus,
    notes?: string
  ): Machine {
    if (!canManageMachines(actor.role)) {
      throw new Error(
        "YETKİSİZ İŞLEM: Makine durumunu yönetici olarak değiştirme yetkiniz yok."
      );
    }

    const machine = this.state.machines.find((m) => m.id === machineId);
    if (!machine) {
      throw new Error("Makine bulunamadı.");
    }

    this.assertTenantAccess(actor, machine.organization_id);

    const check = isLegalMachineTransition(
      machine.status,
      targetStatus,
      actor.role
    );
    if (!check.allowed) {
      throw new Error(check.reason ?? "Geçersiz durum geçişi.");
    }

    const previous = machine.status;
    machine.status = targetStatus;
    machine.status_source = "admin";
    machine.is_active = targetStatus !== "out_of_service";
    if (notes !== undefined) {
      machine.notes = notes;
    }
    machine.updated_at = new Date().toISOString();

    // If machine moved to out_of_service or available, cancel any lingering active session
    if (targetStatus === "out_of_service" || targetStatus === "available") {
      const activeSession = this.state.sessions.find(
        (s) => s.machine_id === machine.id && s.status === "active"
      );
      if (activeSession) {
        activeSession.status = "cancelled";
        activeSession.cancelled_at = new Date().toISOString();
        activeSession.cancellation_reason =
          "Görevli müdahalesi ile makine durumu sıfırlandı.";
      }
    }

    this.appendAudit(actor, "machine.status_changed", "machine", machine.id, {
      from: previous,
      to: targetStatus,
      notes,
    });

    return machine;
  }

  public reportMaintenanceTicket(
    actor: ActorContext,
    input: {
      machineId: string;
      title: string;
      description: string;
      priority: TicketPriority;
      markOutOfService: boolean;
    }
  ): MaintenanceTicket {
    const parsed = createMaintenanceTicketSchema.parse(input);
    const machine = this.state.machines.find((m) => m.id === parsed.machineId);
    if (!machine) {
      throw new Error("Makine bulunamadı.");
    }

    this.assertTenantAccess(actor, machine.organization_id);

    const nowIso = new Date().toISOString();
    const ticket: MaintenanceTicket = {
      id: generateUuid(),
      organization_id: machine.organization_id,
      machine_id: machine.id,
      machine_name: machine.name,
      reported_by: actor.userId,
      reporter_name: actor.fullName,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      status: "open",
      resolved_by: null,
      resolved_at: null,
      resolution_note: null,
      created_at: nowIso,
    };

    if (parsed.markOutOfService) {
      machine.status = "out_of_service";
      machine.status_source =
        actor.role === "resident" ? "user_report" : "admin";
      machine.is_active = false;
      machine.notes = `Arıza Kaydı: ${parsed.title}`;
      machine.updated_at = nowIso;
    }

    this.state.tickets.unshift(ticket);
    this.appendAudit(
      actor,
      "maintenance_ticket.created",
      "maintenance_ticket",
      ticket.id,
      {
        machine_id: machine.id,
        priority: parsed.priority,
        marked_out_of_service: parsed.markOutOfService,
      }
    );

    return ticket;
  }

  public updateMaintenanceTicketStatus(
    actor: ActorContext,
    ticketId: string,
    nextStatus: TicketStatus,
    resolutionNote: string,
    restoreMachineToAvailable: boolean
  ): MaintenanceTicket {
    if (!canManageMachines(actor.role)) {
      throw new Error(
        "YETKİSİZ İŞLEM: Bakım biletlerini yalnızca personel veya yönetici güncelleyebilir."
      );
    }

    const ticket = this.state.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      throw new Error("Arıza bileti bulunamadı.");
    }

    this.assertTenantAccess(actor, ticket.organization_id);

    const nowIso = new Date().toISOString();
    ticket.status = nextStatus;
    ticket.resolution_note = resolutionNote.trim() || ticket.resolution_note;

    if (nextStatus === "resolved" || nextStatus === "closed") {
      ticket.resolved_by = actor.userId;
      ticket.resolved_at = nowIso;
    }

    if (restoreMachineToAvailable) {
      const machine = this.state.machines.find(
        (m) => m.id === ticket.machine_id
      );
      if (machine) {
        machine.status = "available";
        machine.status_source = "admin";
        machine.is_active = true;
        machine.notes = `Onarım tamamlandı: ${resolutionNote || "Servis onayı"}`;
        machine.updated_at = nowIso;
      }
    }

    this.appendAudit(
      actor,
      "maintenance_ticket.updated",
      "maintenance_ticket",
      ticket.id,
      {
        status: nextStatus,
        restored_machine: restoreMachineToAvailable,
      }
    );

    return ticket;
  }

  public updateMemberRole(
    actor: ActorContext,
    membershipId: string,
    newRole: MembershipRole
  ): Membership {
    const membership = this.state.memberships.find(
      (m) => m.id === membershipId
    );
    if (!membership) {
      throw new Error("Üyelik kaydı bulunamadı.");
    }

    this.assertTenantAccess(actor, membership.organization_id);

    if (!canManageMemberships(actor.role, newRole)) {
      throw new Error(
        "YETKİSİZ İŞLEM: Üye rollerini yalnızca kurum yöneticisi (organization_admin) değiştirebilir ve kendisini platform_admin yapamaz."
      );
    }

    const oldRole = membership.role;
    membership.role = newRole;

    this.appendAudit(actor, "membership.role_updated", "membership", membership.id, {
      target_user: membership.email,
      old_role: oldRole,
      new_role: newRole,
    });

    return membership;
  }

  private appendAudit(
    actor: ActorContext,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>
  ): void {
    this.state.auditLogs.unshift({
      id: this.state.auditLogs.length + 1,
      organization_id: actor.organizationId,
      actor_id: actor.userId,
      actor_name: actor.fullName,
      actor_role: actor.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      occurred_at: new Date().toISOString(),
    });
  }
}
