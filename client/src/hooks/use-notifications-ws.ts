import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useNotificationsWebSocket(userId: string | undefined) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const connect = useCallback(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'subscribe', userId }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            setHasNewNotification(true);
            queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      socket.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  }, [userId, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const clearNewNotification = useCallback(() => {
    setHasNewNotification(false);
  }, []);

  return { hasNewNotification, clearNewNotification };
}
