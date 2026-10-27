"use client";

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { RealtimeEvent } from "@/lib/types";

let pusherClientSingleton: Pusher | null = null;

function getPusherClient(): Pusher | null {
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!pusherKey) return null;

  if (!pusherClientSingleton) {
    pusherClientSingleton = new Pusher(pusherKey, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
      authEndpoint: "/api/realtime/pusher-auth",
    });
  }
  return pusherClientSingleton;
}

export function useRealtimeSubscription(
  channelName: string,
  onEvent: (event: RealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(() => {
    if (typeof window === "undefined") return false;
    return getPusherClient()?.connection?.state === "connected";
  });
  const transport: "pusher" | "sse" | "unavailable" = process.env.NEXT_PUBLIC_PUSHER_KEY
    ? "pusher"
    : process.env.NODE_ENV === "production"
      ? "unavailable"
      : "sse";
  const onEventRef = useRef(onEvent);
  
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!channelName || transport === "unavailable") return;

    const pusher = getPusherClient();

    if (pusher) {
      // 1. Pusher subscription on private channel
      const pusherChannelName = channelName.startsWith("private-") ? channelName : `private-${channelName}`;
      const channel = pusher.subscribe(pusherChannelName);

      channel.bind_global((eventName: string, data: unknown) => {
        if (eventName.startsWith("pusher:")) return;
        onEventRef.current({
          type: eventName as RealtimeEvent["type"],
          payload: data,
        } as RealtimeEvent);
      });

      const onConnected = () => setIsConnected(true);
      const onDisconnected = () => setIsConnected(false);
      pusher.connection.bind("connected", onConnected);
      pusher.connection.bind("disconnected", onDisconnected);

      return () => {
        channel.unbind_all();
        pusher.connection.unbind("connected", onConnected);
        pusher.connection.unbind("disconnected", onDisconnected);
        pusher.unsubscribe(pusherChannelName);
      };
    } else {
      // 2. Server-Sent Events (SSE) real-time transport
      let eventSource: EventSource | null = null;

      try {
        eventSource = new EventSource(`/api/realtime/sse?channel=${encodeURIComponent(channelName)}`);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "connected") return;
            onEventRef.current(data as RealtimeEvent);
          } catch {
            // Heartbeat or parse error
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
        };
      } catch (err) {
        console.warn("[Realtime Client] SSE init failed:", err);
      }

      return () => {
        if (eventSource) {
          eventSource.close();
          setIsConnected(false);
        }
      };
    }
  }, [channelName, transport]);

  return { isConnected, transport };
}
