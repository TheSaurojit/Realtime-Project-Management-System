import Pusher from "pusher";
import { EventEmitter } from "events";
import { RealtimeEvent } from "@/lib/types";

// In-memory event bus is only used by the single-process development SSE fallback.
class RealtimeBus extends EventEmitter {}
const globalRealtimeBus = globalThis as unknown as {
  realtimeBus: RealtimeBus | undefined;
};

export const realtimeBus = globalRealtimeBus.realtimeBus ?? new RealtimeBus();
realtimeBus.setMaxListeners(500);
if (process.env.NODE_ENV !== "production") {
  globalRealtimeBus.realtimeBus = realtimeBus;
}

// Pusher is required in production and optional during local development.
let pusherServerInstance: Pusher | null = null;
export function getPusherServer(): Pusher | null {
  if (pusherServerInstance) return pusherServerInstance;

  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  if (!appId || !key || !secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Production realtime requires PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, and PUSHER_SECRET."
      );
    }
    return null;
  }

  pusherServerInstance = new Pusher({
    appId,
    key,
    secret,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
    useTLS: true,
  });
  return pusherServerInstance;
}

export async function broadcastRealtimeEvent(
  channel: string,
  event: RealtimeEvent
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    // Emit only to tenant-specific channels for local SSE subscribers.
    realtimeBus.emit(channel, event);
  }

  // Production must publish through the shared provider so events reach every instance.
  const pusher = getPusherServer();
  if (pusher) {
    try {
      // Support both explicit private- prefixed channels and standard channels
      const privateChannel = channel.startsWith("private-") ? channel : `private-${channel}`;
      await pusher.trigger(privateChannel, event.type, event.payload);
    } catch (err) {
      console.warn("[Realtime] Pusher dispatch error:", err);
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
    }
  }
}
