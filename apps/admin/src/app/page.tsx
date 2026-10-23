"use client";

import React, { useState, useMemo } from "react";
import {
  MACHINE_STATUS_META,
  STATUS_SOURCE_LABELS,
  ROLE_LABELS,
  MachineStatus,
  MembershipRole,
  TicketPriority,
  TicketStatus,
} from "@/lib/domain/types";
import {
  canAccessAdminPanel,
  canManageMemberships,
  calculateRemainingTime,
} from "@/lib/domain/state-machine";
import {
  ActorContext,
  LaundroOperationalEngine,
  createInitialSeedState,
} from "@/lib/store/operational-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type AdminTab =
  | "dashboard"
  | "facilities"
  | "machines"
  | "sessions"
  | "maintenance"
  | "memberships"
  | "audit";

const PRESET_ACTORS: Record<string, ActorContext> = {
  boun_admin: {
    userId: "u1111111-1111-4111-8111-111111111101",
    fullName: "Mert Türkel (Yurt Yöneticisi)",
    email: "mert.admin@boun-demo.edu.tr",
    organizationId: "11111111-1111-4111-8111-111111111111",
    role: "organization_admin",
  },
  boun_staff: {
    userId: "u1111111-1111-4111-8111-111111111102",
    fullName: "Ahmet Yılmaz (Çamaşırhane Görevlisi)",
    email: "ahmet.gorevli@boun-demo.edu.tr",
    organizationId: "11111111-1111-4111-8111-111111111111",
    role: "laundry_staff",
  },
  boun_resident: {
    userId: "u1111111-1111-4111-8111-111111111103",
    fullName: "Zeynep Kaya (Öğrenci - Oda 304)",
    email: "zeynep.kaya@boun-demo.edu.tr",
    organizationId: "11111111-1111-4111-8111-111111111111",
    role: "resident",
  },
  kyk_admin: {
    userId: "u2222222-2222-4222-8222-222222222201",
    fullName: "Selin Demir (Ankara KYK Yöneticisi)",
    email: "selin.admin@kyk-demo.gov.tr",
    organizationId: "22222222-2222-4222-8222-222222222222",
    role: "organization_admin",
  },
};

export default function LaundroAdminPage() {
  const [engine] = useState(() => new LaundroOperationalEngine(createInitialSeedState()));
  const [version, setVersion] = useState(0);
  const [selectedActorKey, setSelectedActorKey] = useState<string>("boun_admin");
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Selected Building / Room filters
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ALL");

  // QR Rotation Confirmation State
  const [qrRotateTargetId, setQrRotateTargetId] = useState<string | null>(null);
  const [qrRotateReason, setQrRotateReason] = useState<string>(
    "Yıpranmış etiket yenilemesi / güvenlik rotasyonu"
  );

  // New Machine Form State
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineNumber, setNewMachineNumber] = useState(5);
  const [newMachineType, setNewMachineType] = useState<"washer" | "dryer">("washer");
  const [newMachineRoomId, setNewMachineRoomId] = useState(
    "c1111111-1111-4111-8111-111111111111"
  );
  const newMachineDuration = 45;

  // QR Session Simulator State
  const [qrInputId, setQrInputId] = useState(
    "e1111111-1111-4111-8111-111111111101"
  );
  const [sessionProgram, setSessionProgram] = useState("Pamuklu 40°C Standart");
  const [sessionDuration, setSessionDuration] = useState(45);

  // Maintenance Form State
  const [ticketMachineId, setTicketMachineId] = useState(
    "d1111111-1111-4111-8111-111111111101"
  );
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>("medium");
  const [ticketMarkOos, setTicketMarkOos] = useState(true);

  const actor = PRESET_ACTORS[selectedActorKey];
  const liveSupabase = isSupabaseConfigured();

  // Trigger re-read of tenant-scoped snapshot whenever version or actor changes
  const snapshot = useMemo(() => {
    void version;
    return engine.getTenantSnapshot(actor);
  }, [engine, actor, version]);

  const refresh = () => setVersion((v) => v + 1);

  const notify = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
  };

  // Filtered machines
  const visibleMachines = useMemo(() => {
    if (selectedRoomId === "ALL") return snapshot.machines;
    return snapshot.machines.filter((m) => m.laundry_room_id === selectedRoomId);
  }, [snapshot.machines, selectedRoomId]);

  // Operational metrics
  const stats = useMemo(() => {
    const total = snapshot.machines.length;
    const available = snapshot.machines.filter((m) => m.status === "available").length;
    const inUse = snapshot.machines.filter((m) => m.status === "in_use").length;
    const cycleComplete = snapshot.machines.filter(
      (m) => m.status === "cycle_complete"
    ).length;
    const outOfService = snapshot.machines.filter(
      (m) => m.status === "out_of_service"
    ).length;
    const openTickets = snapshot.tickets.filter(
      (t) => t.status === "open" || t.status === "in_progress"
    ).length;
    return { total, available, inUse, cycleComplete, outOfService, openTickets };
  }, [snapshot.machines, snapshot.tickets]);

  // Handlers
  const handleStartSessionByQr = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = engine.startSessionByQr(actor, {
        qrCodeId: qrInputId,
        estimatedDuration: Number(sessionDuration),
        programName: sessionProgram,
      });
      refresh();
      notify(
        "success",
        `Seans başarıyla başlatıldı (${created.machine_name}). Tahmini süre: ${created.estimated_duration} dk.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Seans başlatılamadı."
      );
    }
  };

  const handleFinishSession = (
    sessionId: string,
    action: "complete" | "complete_and_unload" | "cancel"
  ) => {
    try {
      engine.finishSession(actor, sessionId, action);
      refresh();
      notify("success", `Seans durumu güncellendi (${action}).`);
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Seans güncellenemedi."
      );
    }
  };

  const handleConfirmUnloaded = (machineId: string) => {
    try {
      const m = engine.confirmMachineUnloaded(actor, machineId);
      refresh();
      notify(
        "success",
        `${m.name} boşaltıldı olarak onaylandı ve 'Müsait' durumuna geçirildi.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "İşlem tamamlanamadı."
      );
    }
  };

  const handleConfirmQrRotate = () => {
    if (!qrRotateTargetId) return;
    try {
      const updated = engine.rotateMachineQr(
        actor,
        qrRotateTargetId,
        qrRotateReason
      );
      setQrRotateTargetId(null);
      refresh();
      notify(
        "success",
        `${updated.name} için yeni QR Kod Kimliği oluşturuldu: ${updated.qr_code_id}. Eski QR kodu geçersiz kılındı.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "QR kod yenilenemedi."
      );
    }
  };

  const handleCreateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = engine.createMachine(actor, {
        laundryRoomId: newMachineRoomId,
        name: newMachineName,
        machineNumber: Number(newMachineNumber),
        machineType: newMachineType,
        defaultDurationMinutes: Number(newMachineDuration),
      });
      setNewMachineName("");
      setNewMachineNumber((n) => n + 1);
      refresh();
      notify("success", `Yeni makine eklendi: ${created.name}`);
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Makine eklenemedi."
      );
    }
  };

  const handleStaffStatusChange = (
    machineId: string,
    targetStatus: MachineStatus
  ) => {
    try {
      const m = engine.updateMachineStatusByStaff(actor, machineId, targetStatus);
      refresh();
      notify("success", `${m.name} durumu '${targetStatus}' olarak güncellendi.`);
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Makine durumu değiştirilemedi."
      );
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ticket = engine.reportMaintenanceTicket(actor, {
        machineId: ticketMachineId,
        title: ticketTitle,
        description: ticketDesc,
        priority: ticketPriority,
        markOutOfService: ticketMarkOos,
      });
      setTicketTitle("");
      setTicketDesc("");
      refresh();
      notify("success", `Arıza kaydı oluşturuldu: ${ticket.title}`);
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Arıza kaydı oluşturulamadı."
      );
    }
  };

  const handleUpdateTicket = (
    ticketId: string,
    nextStatus: TicketStatus,
    restoreMachine: boolean
  ) => {
    try {
      engine.updateMaintenanceTicketStatus(
        actor,
        ticketId,
        nextStatus,
        "Teknik ekip tarafından kontrol edildi ve çözüldü.",
        restoreMachine
      );
      refresh();
      notify("success", "Bakım bileti güncellendi.");
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Bilet güncellenemedi."
      );
    }
  };

  const handleRoleUpdate = (membershipId: string, newRole: MembershipRole) => {
    try {
      const updated = engine.updateMemberRole(actor, membershipId, newRole);
      refresh();
      notify(
        "success",
        `${updated.full_name} kullanıcısının rolü '${ROLE_LABELS[newRole]}' olarak güncellendi.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "Rol güncellenemedi."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Honesty & Connection Banner */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-2.5 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <span>
              <strong>Şeffaflık Bildirimi:</strong> QR kod ve yazılım zamanlayıcısı fiziksel makinenin çalışmasını veya boşaltıldığını tek başına doğrulayamaz. Durumlar{" "}
              <span className="underline">Tahmini</span> veya{" "}
              <span className="underline">Kullanıcı Bildirimi</span> olarak açıkça etiketlenir.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-medium ${
                liveSupabase
                  ? "bg-emerald-700 text-white"
                  : "bg-amber-600/90 text-white"
              }`}
            >
              {liveSupabase
                ? "Veri Kaynağı: Canlı Supabase"
                : "Veri Kaynağı: İzole Demo / Önizleme Modu (Üretim Verisi Değil)"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header & Role/Tenant Switcher */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                LQ
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  LaundroQR Kurumsal Yönetim Paneli
                </h1>
                <p className="text-xs text-slate-500">
                  Aktif Kurum:{" "}
                  <strong className="text-slate-700">
                    {snapshot.organization?.name ?? "Bilinmeyen Kurum"}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Actor / Role / Tenant Switcher for RBAC & RLS Testing */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <label
              htmlFor="actor-select"
              className="text-xs font-semibold text-slate-700"
            >
              Test Oturumu (RBAC & RLS İzolasyonu):
            </label>
            <select
              id="actor-select"
              value={selectedActorKey}
              onChange={(e) => {
                setSelectedActorKey(e.target.value);
                setSelectedRoomId("ALL");
                setFeedback(null);
              }}
              className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="boun_admin">
                [Org Admin] Mert Türkel — Boğaziçi Kuzey Yurdu
              </option>
              <option value="boun_staff">
                [Staff] Ahmet Yılmaz — Boğaziçi Kuzey Yurdu
              </option>
              <option value="boun_resident">
                [Resident / Yetkisiz Testi] Zeynep Kaya — Boğaziçi Kuzey Yurdu
              </option>
              <option value="kyk_admin">
                [Başka Kiracı / Tenant 2] Selin Demir — Ankara KYK Yurdu
              </option>
            </select>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">
              Rol: {ROLE_LABELS[actor.role]}
            </span>
          </div>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-4">
          <div
            role="alert"
            className={`p-3.5 rounded-lg border flex items-center justify-between text-sm ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold underline ml-4"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Authorization Gate: Residents cannot access the Admin Panel */}
      {!canAccessAdminPanel(actor.role) ? (
        <main className="max-w-4xl mx-auto w-full px-4 py-12 flex-1">
          <div className="bg-white border-2 border-rose-200 rounded-xl p-8 shadow-sm">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-4">
              HTTP 403 — YETKİSİZ ERİŞİM ENGELLENDİ
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Yönetim Paneline Erişim Yetkiniz Yok
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              Şu anda <strong>{actor.fullName}</strong> ({ROLE_LABELS[actor.role]}) oturumu ile bağlısınız. Yurt sakinleri kurumsal yönetim ekranlarına, üye listelerine veya QR kod rotasyon işlemlerine erişemez.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">
                Öğrenci (Resident) Olarak Yapabilecekleriniz:
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Yurt sakinleri Flutter mobil uygulamasını kullanarak QR kod okutup seans başlatabilir veya arıza bildirebilir. Aşağıdaki hızlı test aracından öğrenci yetkisiyle QR seans başlatmayı deneyebilirsiniz:
              </p>
              <form
                onSubmit={handleStartSessionByQr}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                <input
                  type="text"
                  value={qrInputId}
                  onChange={(e) => setQrInputId(e.target.value)}
                  placeholder="Makine QR UUID"
                  className="text-xs border border-slate-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={sessionProgram}
                  onChange={(e) => setSessionProgram(e.target.value)}
                  placeholder="Program"
                  className="text-xs border border-slate-300 rounded px-3 py-2"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded px-4 py-2"
                >
                  QR ile Öğrenci Seansı Başlat
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={() => setSelectedActorKey("boun_admin")}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
            >
              Yurt Yöneticisi (organization_admin) Oturumuna Dön
            </button>
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
          {/* Navigation Tabs */}
          <nav
            aria-label="Yönetim Menüsü"
            className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6"
          >
            {(
              [
                { id: "dashboard", label: "1. Genel Bakış & İstatistikler" },
                { id: "facilities", label: "2. Binalar & Çamaşırhaneler" },
                { id: "machines", label: "3. Makine Envanteri & QR Kodlar" },
                { id: "sessions", label: "4. Aktif & Geçmiş Seanslar" },
                { id: "maintenance", label: "5. Arıza & Bakım Biletleri" },
                { id: "memberships", label: "6. Üyelikler & Rol Yönetimi" },
                { id: "audit", label: "7. Denetim Kayıtları (Audit)" },
              ] as { id: AdminTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* TAB 1: DASHBOARD SUMMARY & OPERATIONAL STATISTICS */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500">Toplam Makine</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <p className="text-xs text-emerald-800 font-medium">
                    Müsait (Bildirilen)
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">
                    {stats.available}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium">
                    Kullanımda (Tahmini)
                  </p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {stats.inUse}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-900 font-medium">
                    Boşaltma Bekleyen
                  </p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">
                    {stats.cycleComplete}
                  </p>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                  <p className="text-xs text-rose-800 font-medium">
                    Bakımda / Arızalı
                  </p>
                  <p className="text-2xl font-bold text-rose-900 mt-1">
                    {stats.outOfService}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500">Açık Arıza Kaydı</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.openTickets}
                  </p>
                </div>
              </div>

              {/* Quick Overview of Machines & Honest Status Labels */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Canlı Makine Durum Özeti ({snapshot.organization?.name})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Her makinenin durumu ve bilginin kaynağı (Yazılım Tahmini / Kullanıcı Bildirimi / Görevli Kaydı) aşağıda açıkça gösterilir.
                    </p>
                  </div>
                  <select
                    aria-label="Çamaşırhane Filtresi"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="ALL">Tüm Çamaşırhaneler</option>
                    {snapshot.laundryRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleMachines.map((m) => {
                    const meta = MACHINE_STATUS_META[m.status];
                    const sourceMeta = STATUS_SOURCE_LABELS[m.status_source];
                    return (
                      <div
                        key={m.id}
                        className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/60"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                {m.machine_type === "washer"
                                  ? "Çamaşır Makinesi"
                                  : "Kurutma Makinesi"}{" "}
                                #{m.machine_number}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900">
                                {m.name}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {m.brand} {m.model} • Varsayılan:{" "}
                                {m.default_duration_minutes} dk
                              </p>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                            <p className="font-medium text-slate-700">
                              Doğrulama Kaynağı:{" "}
                              <span className="font-bold text-slate-900">
                                {sourceMeta.label}
                              </span>
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              {meta.honestyNotice}
                            </p>
                            {m.notes && (
                              <p className="text-amber-800 bg-amber-50 px-2 py-1 rounded text-[11px] mt-1">
                                Not: {m.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[180px]">
                            QR: {m.qr_code_id.slice(0, 13)}...
                          </span>
                          {m.status === "cycle_complete" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmUnloaded(m.id)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg"
                            >
                              Boşaltıldı Onayla → Müsait
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUILDINGS & LAUNDRY ROOMS */}
          {activeTab === "facilities" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Yurt Binaları / Bloklar
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Organizasyona bağlı aktif öğrenci blokları.
                </p>
                <div className="space-y-3">
                  {snapshot.buildings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {b.name}{" "}
                          <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {b.code}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {b.address} • {b.floor_count} Kat
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Çamaşırhane Odaları
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Blokların altındaki çamaşırhane birimleri ve çalışma saatleri.
                </p>
                <div className="space-y-3">
                  {snapshot.laundryRooms.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">
                          {r.name}
                        </p>
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Saatler: {r.operating_hours}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Kat: {r.floor} • {r.notes ?? "Ek not yok"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MACHINE INVENTORY & QR MANAGEMENT */}
          {activeTab === "machines" && (
            <div className="space-y-6">
              {/* Create Machine Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Yeni Makine Ekle
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Yeni eklenen her makine için otomatik olarak kriptografik UUID v4 QR kimliği üretilir.
                </p>
                <form
                  onSubmit={handleCreateMachine}
                  className="grid grid-cols-1 md:grid-cols-6 gap-3"
                >
                  <select
                    value={newMachineRoomId}
                    onChange={(e) => setNewMachineRoomId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2 md:col-span-2"
                  >
                    {snapshot.laundryRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    placeholder="Makine Adı (örn. Çamaşır #5)"
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={newMachineNumber}
                    onChange={(e) => setNewMachineNumber(Number(e.target.value))}
                    placeholder="No"
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <select
                    value={newMachineType}
                    onChange={(e) =>
                      setNewMachineType(e.target.value as "washer" | "dryer")
                    }
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="washer">Çamaşır Makinesi</option>
                    <option value="dryer">Kurutma Makinesi</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2"
                  >
                    Makine Ekle
                  </button>
                </form>
              </div>

              {/* QR Rotation Confirmation Dialog */}
              {qrRotateTargetId && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-amber-950 mb-1">
                    Onay Gerekiyor: Makine QR Kodunu Yenile (Rotate QR)
                  </h3>
                  <p className="text-xs text-amber-900 mb-3">
                    Bu işlem makinenin mevcut QR kod kimliğini derhal geçersiz kılar ve yeni bir UUID üretir. Fiziksel makine üzerindeki etiketi yenilemeniz gerekecektir. İşlem denetim kaydına (audit_logs) yazılır.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={qrRotateReason}
                      onChange={(e) => setQrRotateReason(e.target.value)}
                      className="text-xs border border-amber-400 rounded px-3 py-1.5 bg-white flex-1 min-w-[240px]"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmQrRotate}
                      className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
                    >
                      Evet, QR Kimliğini Yenile
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrRotateTargetId(null)}
                      className="bg-white border border-slate-300 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}

              {/* Machine Inventory Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-3.5">Makine</th>
                      <th className="p-3.5">Durum & Kaynak</th>
                      <th className="p-3.5">QR Kod Kimliği (UUID)</th>
                      <th className="p-3.5">Yönetici Müdahalesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {snapshot.machines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{m.name}</p>
                          <p className="text-slate-500">
                            {m.brand} {m.model} • {m.default_duration_minutes} dk
                          </p>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-semibold border ${
                              MACHINE_STATUS_META[m.status].badgeClass
                            }`}
                          >
                            {MACHINE_STATUS_META[m.status].label}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Kaynak: {STATUS_SOURCE_LABELS[m.status_source].label}
                          </p>
                        </td>
                        <td className="p-3.5 font-mono">
                          <p className="text-slate-800 select-all">{m.qr_code_id}</p>
                          <button
                            type="button"
                            onClick={() => setQrRotateTargetId(m.id)}
                            className="text-[11px] text-blue-600 hover:underline font-sans font-semibold mt-1"
                          >
                            QR Kodu Güvenli Yenile (Rotate)
                          </button>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {m.status !== "available" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStaffStatusChange(m.id, "available")
                                }
                                className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold hover:bg-emerald-200"
                              >
                                Müsait Yap
                              </button>
                            )}
                            {m.status !== "out_of_service" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStaffStatusChange(m.id, "out_of_service")
                                }
                                className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 font-semibold hover:bg-rose-200"
                              >
                                Bakıma Al
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE & HISTORICAL SESSIONS */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              {/* QR Session Start & Concurrency Test Box */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  QR Kod ile Seans Başlatma ve Eşzamanlılık (Race Condition) Testi
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Aynı makine QR koduna ikinci kez seans başlatmayı denediğinizde atomik durum kilidi isteği reddeder.
                </p>
                <form
                  onSubmit={handleStartSessionByQr}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3"
                >
                  <select
                    value={qrInputId}
                    onChange={(e) => setQrInputId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  >
                    {snapshot.machines.map((m) => (
                      <option key={m.id} value={m.qr_code_id}>
                        {m.name} ({m.status}) — QR: {m.qr_code_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={sessionProgram}
                    onChange={(e) => setSessionProgram(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2"
                  >
                    Atomik Seans Başlat
                  </button>
                </form>
              </div>

              {/* Sessions List */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-4">
                  Aktif ve Geçmiş Seans Kayıtları
                </h2>
                <div className="space-y-3">
                  {snapshot.sessions.map((s) => {
                    const timing = calculateRemainingTime(
                      s.started_at,
                      s.estimated_end_at
                    );
                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                s.status === "active"
                                  ? "bg-blue-100 text-blue-800"
                                  : s.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {s.status === "active"
                                ? "Aktif Seans"
                                : s.status === "completed"
                                ? "Tamamlandı"
                                : "İptal Edildi"}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900">
                              {s.machine_name ?? s.machine_id}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Kullanıcı: <strong>{s.user_name ?? s.user_id}</strong>{" "}
                            • Program: {s.program_name} ({s.estimated_duration} dk)
                          </p>
                          {s.status === "active" && (
                            <p className="text-xs text-blue-800 font-medium mt-1">
                              Tahmini Kalan Süre (Sunucu Zamanlı):{" "}
                              <strong>{timing.remainingMinutesCeiling} dk</strong>{" "}
                              (İlerleme: %{timing.progressPercent})
                            </p>
                          )}
                        </div>

                        {s.status === "active" && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleFinishSession(s.id, "complete")}
                              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg"
                            >
                              Döngü Bitti İşaretle (Boşaltma Bekliyor)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleFinishSession(s.id, "complete_and_unload")
                              }
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg"
                            >
                              Tamamla ve Boşaltıldı Onayla
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFinishSession(s.id, "cancel")}
                              className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold px-3 py-1.5 rounded-lg"
                            >
                              İptal Et
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MAINTENANCE TICKETS */}
          {activeTab === "maintenance" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Yeni Arıza veya Bakım Kaydı Oluştur
                </h2>
                <form
                  onSubmit={handleCreateTicket}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"
                >
                  <select
                    value={ticketMachineId}
                    onChange={(e) => setTicketMachineId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  >
                    {snapshot.machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.status})
                      </option>
                    ))}
                  </select>
                  <select
                    value={ticketPriority}
                    onChange={(e) =>
                      setTicketPriority(e.target.value as TicketPriority)
                    }
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="low">Düşük Öncelik</option>
                    <option value="medium">Orta Öncelik</option>
                    <option value="high">Yüksek Öncelik</option>
                    <option value="critical">Kritik (Acil Müdahale)</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    placeholder="Arıza başlığı (örn. Su tahliye hatası)"
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2 md:col-span-2"
                  />
                  <textarea
                    required
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Detaylı arıza açıklaması..."
                    rows={2}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2 md:col-span-2"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={ticketMarkOos}
                      onChange={(e) => setTicketMarkOos(e.target.checked)}
                    />
                    Makineyi otomatik olarak &apos;Bakımda / Arızalı&apos; (out_of_service) durumuna geçir
                  </label>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg px-4 py-2 justify-self-end"
                  >
                    Arıza Kaydı Aç
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  Bakım Biletleri Listesi
                </h2>
                {snapshot.tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 mr-2">
                        {t.priority}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        Durum: {t.status}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {t.machine_name} — {t.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {t.description}
                      </p>
                      {t.resolution_note && (
                        <p className="text-xs text-emerald-800 mt-1">
                          Çözüm Notu: {t.resolution_note}
                        </p>
                      )}
                    </div>
                    {t.status !== "resolved" && t.status !== "closed" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateTicket(t.id, "resolved", true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg"
                      >
                        Onarımı Tamamla & Makineyi Müsait Yap
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MEMBERSHIPS & ROLE MANAGEMENT */}
          {activeTab === "memberships" && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Organizasyon Üyelikleri ve Rol Yönetimi
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Yalnızca <strong>organization_admin</strong> rol ataması yapabilir. Görevliler (laundry_staff) kendi yetkilerini yükseltemez.
              </p>

              {!canManageMemberships(actor.role, "resident") && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900">
                  Şu anda <strong>{ROLE_LABELS[actor.role]}</strong> rolündesiniz. Üye listesini görüntüleyebilirsiniz ancak rol değişikliği yapamazsınız.
                </div>
              )}

              <div className="space-y-3">
                {snapshot.memberships.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {mem.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mem.email} • Oda/Birim: {mem.room_number ?? "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`${mem.full_name} rol seçimi`}
                        value={mem.role}
                        disabled={!canManageMemberships(actor.role, "resident")}
                        onChange={(e) =>
                          handleRoleUpdate(
                            mem.id,
                            e.target.value as MembershipRole
                          )
                        }
                        className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white disabled:bg-slate-100"
                      >
                        <option value="resident">Yurt Sakini (resident)</option>
                        <option value="laundry_staff">
                          Çamaşırhane Görevlisi (laundry_staff)
                        </option>
                        <option value="organization_admin">
                          Kurum Yöneticisi (organization_admin)
                        </option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Güvenlik ve Operasyon Denetim Kayıtları (Audit Logs)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Kritik yönetici işlemleri, QR rotasyonları ve durum geçişleri gizli veri içermeden kayıt altına alınır.
              </p>
              {snapshot.auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Denetim kayıtlarını görüntülemek için Kurum Yöneticisi (organization_admin) yetkisi gereklidir.
                </p>
              ) : (
                <div className="space-y-2">
                  {snapshot.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono font-bold text-blue-800 mr-2">
                          {log.action}
                        </span>
                        <span className="text-slate-700">
                          Yapan: <strong>{log.actor_name}</strong> ({log.actor_role})
                        </span>
                        <p className="text-[11px] font-mono text-slate-500 mt-1">
                          Detay: {JSON.stringify(log.metadata)}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.occurred_at).toLocaleTimeString("tr-TR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
