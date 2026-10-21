import Pusher from "pusher";
import { EventEmitter } from "events";
import { RealtimeEvent } from "@/lib/types";

// In-memory event bus for local SSE subscribers
class RealtimeBus extends EventEmitter {}
const globalRealtimeBus = globalThis as unknown as {
  realtimeBus: RealtimeBus | undefined;
};

export const realtimeBus = globalRealtimeBus.realtimeBus ?? new RealtimeBus();
realtimeBus.setMaxListeners(500);
if (process.env.NODE_ENV !== "production") {
  globalRealtimeBus.realtimeBus = realtimeBus;
}

// Optional Pusher Server instance
let pusherServerInstance: Pusher | null = null;
export function getPusherServer(): Pusher | null {
  if (pusherServerInstance) return pusherServerInstance;
  if (
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET
  ) {
    try {
      pusherServerInstance = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
        useTLS: true,
      });
    } catch (err) {
      console.warn("[Realtime] Pusher init error:", err);
    }
  }
  return pusherServerInstance;
}

export async function broadcastRealtimeEvent(
  channel: string,
  event: RealtimeEvent
): Promise<void> {
  // 1. Emit ONLY to tenant-specific channel (dropped global broadcast to prevent cross-tenant data leaks)
  realtimeBus.emit(channel, event);

  // 2. Trigger Pusher private channel if configured
  const pusher = getPusherServer();
  if (pusher) {
    try {
      // Support both explicit private- prefixed channels and standard channels
      const privateChannel = channel.startsWith("private-") ? channel : `private-${channel}`;
      await pusher.trigger(privateChannel, event.type, event.payload);
    } catch (err) {
      console.warn("[Realtime] Pusher dispatch error:", err);
    }
  }
}
