"use client";

import { useEffect, useState, useRef } from "react";
import { TelemetryEvent } from "@/types/patient";

export function useTelemetrySSE() {
  const [telemetry, setTelemetry] = useState<TelemetryEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncTimeAgo, setSyncTimeAgo] = useState("2m ago");
  const [latestAlert, setLatestAlert] = useState<string | null>(null);
  const lastSyncRef = useRef<number>(Date.now() - 120000);

  useEffect(() => {
    // Update relative time display
    const interval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastSyncRef.current) / 1000);
      if (diffSec < 60) {
        setSyncTimeAgo(`${diffSec}s ago`);
      } else if (diffSec < 3600) {
        setSyncTimeAgo(`${Math.floor(diffSec / 60)}m ago`);
      } else {
        setSyncTimeAgo(`${Math.floor(diffSec / 3600)}h ago`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/telemetry/stream");

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: TelemetryEvent = JSON.parse(event.data);
          setTelemetry(data);
          setIsConnected(true);
          lastSyncRef.current = Date.now();
          setSyncTimeAgo("just now");
          if (data.alert) {
            setLatestAlert(data.alert);
          }
        } catch {
          // ignore parse error
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return {
    telemetry,
    isConnected,
    syncTimeAgo,
    latestAlert,
    clearAlert: () => setLatestAlert(null),
  };
}
