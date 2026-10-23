import { NextRequest, NextResponse } from "next/server";
import { LaundroOperationalEngine, ActorContext } from "@/lib/store/operational-store";
import { MembershipRole } from "@/lib/domain/types";

const serverEngine = new LaundroOperationalEngine();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = (body.actorRole as MembershipRole) || "resident";
    const actor: ActorContext = {
      userId: body.actorUserId || "u1111111-1111-4111-8111-111111111101",
      fullName: body.actorName || "Yönetici",
      email: body.actorEmail || "admin@boun-demo.edu.tr",
      organizationId:
        body.organizationId || "11111111-1111-4111-8111-111111111111",
      role,
    };

    const updated = serverEngine.rotateMachineQr(
      actor,
      String(body.machineId ?? ""),
      String(body.reason ?? "Güvenlik amaçlı QR kod yenileme")
    );

    return NextResponse.json({ ok: true, machine: updated }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "QR kod yenilenemedi.";
    const status = message.includes("YETKİSİZ") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
