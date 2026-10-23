import { NextRequest, NextResponse } from "next/server";
import { LaundroOperationalEngine, ActorContext } from "@/lib/store/operational-store";
import { MembershipRole } from "@/lib/domain/types";

const serverEngine = new LaundroOperationalEngine();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = (body.actorRole as MembershipRole) || "resident";
    const actor: ActorContext = {
      userId: body.actorUserId || "u1111111-1111-4111-8111-111111111103",
      fullName: body.actorName || "Yurt Sakini",
      email: body.actorEmail || "resident@boun-demo.edu.tr",
      organizationId:
        body.organizationId || "11111111-1111-4111-8111-111111111111",
      role,
    };

    const session = serverEngine.startSessionByQr(actor, {
      qrCodeId: String(body.qrCodeId ?? ""),
      estimatedDuration: Number(body.estimatedDuration ?? 45),
      programName: String(body.programName ?? "Standart Yıkama (40°C)"),
    });

    return NextResponse.json({ ok: true, session }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Seans başlatılamadı.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
