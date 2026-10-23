import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  canAccessAdminPanel,
  canManageMachines,
  canManageMemberships,
  calculateRemainingTime,
  isLegalMachineTransition,
  isValidUuid,
} from "@/lib/domain/state-machine";
import {
  ActorContext,
  LaundroOperationalEngine,
  createInitialSeedState,
} from "@/lib/store/operational-store";
import LaundroAdminPage from "@/app/page";

const bounAdmin: ActorContext = {
  userId: "u1111111-1111-4111-8111-111111111101",
  fullName: "Mert Türkel",
  email: "mert@boun-demo.edu.tr",
  organizationId: "11111111-1111-4111-8111-111111111111",
  role: "organization_admin",
};

const bounStaff: ActorContext = {
  userId: "u1111111-1111-4111-8111-111111111102",
  fullName: "Ahmet Yılmaz",
  email: "ahmet@boun-demo.edu.tr",
  organizationId: "11111111-1111-4111-8111-111111111111",
  role: "laundry_staff",
};

const bounResident: ActorContext = {
  userId: "u1111111-1111-4111-8111-111111111103",
  fullName: "Zeynep Kaya",
  email: "zeynep@boun-demo.edu.tr",
  organizationId: "11111111-1111-4111-8111-111111111111",
  role: "resident",
};

const kykAdmin: ActorContext = {
  userId: "u2222222-2222-4222-8222-222222222201",
  fullName: "Selin Demir",
  email: "selin@kyk-demo.gov.tr",
  organizationId: "22222222-2222-4222-8222-222222222222",
  role: "organization_admin",
};

describe("LaundroQR Domain & Security Rules", () => {
  it("T-AUTH-01: enforces RBAC for Admin Panel access and role management", () => {
    expect(canAccessAdminPanel("platform_admin")).toBe(true);
    expect(canAccessAdminPanel("organization_admin")).toBe(true);
    expect(canAccessAdminPanel("laundry_staff")).toBe(true);
    expect(canAccessAdminPanel("resident")).toBe(false);

    expect(canManageMachines("resident")).toBe(false);
    expect(canManageMachines("laundry_staff")).toBe(true);

    // Organization admin cannot grant platform_admin
    expect(canManageMemberships("organization_admin", "laundry_staff")).toBe(
      true
    );
    expect(canManageMemberships("organization_admin", "platform_admin")).toBe(
      false
    );
    expect(canManageMemberships("laundry_staff", "resident")).toBe(false);
    expect(canManageMemberships("resident", "organization_admin")).toBe(false);
  });

  it("T-STATE-01: validates legal machine state transitions and blocks resident recovery from out_of_service", () => {
    expect(
      isLegalMachineTransition("available", "in_use", "resident").allowed
    ).toBe(true);
    expect(
      isLegalMachineTransition("cycle_complete", "available", "resident").allowed
    ).toBe(true);
    expect(
      isLegalMachineTransition("out_of_service", "available", "resident").allowed
    ).toBe(false);
    expect(
      isLegalMachineTransition("out_of_service", "available", "laundry_staff")
        .allowed
    ).toBe(true);
  });

  it("T-TIME-01: calculates server-authoritative remaining time accurately", () => {
    const start = "2026-10-23T14:00:00.000Z";
    const end = "2026-10-23T14:45:00.000Z";
    const nowMid = "2026-10-23T14:15:00.000Z";

    const mid = calculateRemainingTime(start, end, nowMid);
    expect(mid.remainingMinutesCeiling).toBe(30);
    expect(mid.progressPercent).toBe(33);
    expect(mid.isExpired).toBe(false);

    const expired = calculateRemainingTime(
      start,
      end,
      "2026-10-23T14:50:00.000Z"
    );
    expect(expired.remainingSeconds).toBe(0);
    expect(expired.isExpired).toBe(true);
  });

  it("T-RLS-01: enforces strict tenant isolation between organizations", () => {
    const engine = new LaundroOperationalEngine(createInitialSeedState());
    const bounSnap = engine.getTenantSnapshot(bounAdmin);
    const kykSnap = engine.getTenantSnapshot(kykAdmin);

    expect(
      bounSnap.machines.every(
        (m) => m.organization_id === bounAdmin.organizationId
      )
    ).toBe(true);
    expect(
      kykSnap.machines.every(
        (m) => m.organization_id === kykAdmin.organizationId
      )
    ).toBe(true);

    // Cross-tenant QR scan attempt must be blocked
    const kykMachineQr = "e2222222-2222-4222-8222-222222222201";
    expect(() =>
      engine.startSessionByQr(bounResident, {
        qrCodeId: kykMachineQr,
        estimatedDuration: 40,
        programName: "Standart",
      })
    ).toThrow(/GÜVENLİK İHLALİ ENGELLENDİ/);
  });

  it("T-CONC-01: prevents concurrent conflicting sessions on the same machine and validates QR rotation", () => {
    const engine = new LaundroOperationalEngine(createInitialSeedState());
    const machine1Qr = "e1111111-1111-4111-8111-111111111101";

    // First resident starts session on available Machine #1
    const session = engine.startSessionByQr(bounResident, {
      qrCodeId: machine1Qr,
      estimatedDuration: 30,
      programName: "Hızlı Yıkama 30°C",
    });
    expect(session.status).toBe("active");

    // Second concurrent attempt on Machine #1 MUST be rejected
    expect(() =>
      engine.startSessionByQr(bounAdmin, {
        qrCodeId: machine1Qr,
        estimatedDuration: 30,
        programName: "Hızlı Yıkama 30°C",
      })
    ).toThrow(/müsait değil/);

    // Complete cycle -> transitions to cycle_complete (NOT available automatically!)
    engine.finishSession(bounResident, session.id, "complete");
    const afterComplete = engine
      .getTenantSnapshot(bounAdmin)
      .machines.find((m) => m.id === "d1111111-1111-4111-8111-111111111101");
    expect(afterComplete?.status).toBe("cycle_complete");

    // Confirm unloaded -> returns to available
    engine.confirmMachineUnloaded(
      bounResident,
      "d1111111-1111-4111-8111-111111111101"
    );
    const afterUnload = engine
      .getTenantSnapshot(bounAdmin)
      .machines.find((m) => m.id === "d1111111-1111-4111-8111-111111111101");
    expect(afterUnload?.status).toBe("available");

    // Resident cannot rotate QR code
    expect(() =>
      engine.rotateMachineQr(
        bounResident,
        "d1111111-1111-4111-8111-111111111101",
        "Yetkisiz deneme"
      )
    ).toThrow(/YETKİSİZ İŞLEM/);

    // Staff can rotate QR code and old QR becomes invalid
    const rotated = engine.rotateMachineQr(
      bounStaff,
      "d1111111-1111-4111-8111-111111111101",
      "Etiket yenilendi"
    );
    expect(isValidUuid(rotated.qr_code_id)).toBe(true);
    expect(rotated.qr_code_id).not.toBe(machine1Qr);

    // Old QR code must now be rejected
    expect(() =>
      engine.startSessionByQr(bounResident, {
        qrCodeId: machine1Qr,
        estimatedDuration: 30,
        programName: "Deneme",
      })
    ).toThrow(/Geçersiz veya süresi dolmuş QR kodu/);
  });

  it("T-UI-01: renders honest estimation notices and blocks resident role from Admin UI", () => {
    render(<LaundroAdminPage />);
    expect(
      screen.getByText(/LaundroQR Kurumsal Yönetim Paneli/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Şeffaflık Bildirimi:/i)).toBeInTheDocument();

    // Switch to Resident role and verify 403 gate renders
    const roleSelect = screen.getByLabelText(/Test Oturumu/i);
    fireEvent.change(roleSelect, { target: { value: "boun_resident" } });
    expect(
      screen.getByText(/HTTP 403 — YETKİSİZ ERİŞİM ENGELLENDİ/i)
    ).toBeInTheDocument();
  });
});
