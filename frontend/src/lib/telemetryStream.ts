import type { TelemetryEvent } from "../types/patient";

export function createDemoTelemetryStream(signal?: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let abort: (() => void) | undefined;
  const cleanup = () => {
    clearInterval(interval);
    if (abort) signal?.removeEventListener("abort", abort);
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const send = () => {
        const payload: TelemetryEvent = {
          event: "telemetry_pulse",
          source: "demo",
          timestamp: new Date().toISOString(),
          sync_seconds_ago: 0,
          ward_id: "DEMO WARD 4B",
          active_patients: 48,
          high_risk_count: 11,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      abort = () => {
        cleanup();
        controller.close();
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
      send();
      interval = setInterval(send, 3000);
    },
    cancel() {
      cleanup();
    },
  });
}
