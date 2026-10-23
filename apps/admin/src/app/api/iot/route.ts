import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createInitialSeedState } from "@/lib/store/operational-store";

const iotWebhookSchema = z.object({
  machine_id: z
    .string()
    .uuid("Geçersiz machine_id (UUID formatı bekleniyor)."),
  action: z.enum(["start", "stop"], {
    errorMap: () => ({
      message: "Geçersiz eylem: yalnızca 'start' veya 'stop' desteklenir.",
    }),
  }),
  protocol: z.enum(["http", "mqtt"]).optional().default("mqtt"),
  device_nonce: z.string().optional(),
});

/**
 * Phase 7: IoT & Hardware Relay Webhook Endpoint (/api/iot)
 * Simulates dispatching a start/stop relay trigger to an ESP32/Arduino smart plug
 * via HTTP or MQTT while preserving honest telemetry audit metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = iotWebhookSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues.map((i) => i.message).join(" "),
        },
        { status: 400 }
      );
    }

    const { machine_id, action, protocol, device_nonce } = parsed.data;
    const state = createInitialSeedState();
    const machine = state.machines.find((m) => m.id === machine_id);

    const targetIp = machine?.machine_ip ?? "192.168.10.101";
    const targetMac = machine?.mac_address ?? "AA:BB:CC:11:22:01";
    const relayState = action === "start" ? "RELAY_ON" : "RELAY_OFF";

    return NextResponse.json(
      {
        ok: true,
        simulation: true,
        honesty_notice:
          "Bu uç nokta ESP32/Arduino röle tetiklemesini simüle eder; fiziksel elektrik hattına gerçek komut gönderilmedi.",
        dispatch: {
          machine_id,
          machine_name: machine?.name ?? "Bilinmeyen Makine",
          action,
          relay_state: relayState,
          protocol,
          target_ip: targetIp,
          mac_address: targetMac,
          mqtt_topic: `laundroqr/machines/${machine_id}/relay/cmd`,
          device_nonce: device_nonce ?? `nonce-${Date.now()}`,
          dispatched_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "IoT webhook isteği işlenemedi.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
