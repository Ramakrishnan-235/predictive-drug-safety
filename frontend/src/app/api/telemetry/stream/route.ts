export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  // Try connecting to Python FastAPI backend if reachable
  let pythonStream: ReadableStream | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("http://127.0.0.1:8000/api/telemetry/stream", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok && res.body) {
      pythonStream = res.body;
    }
  } catch {
    // Fall back to Next.js native SSE telemetry generator
  }

  if (pythonStream) {
    return new Response(pythonStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Next.js native SSE stream
  let tick = 0;
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        tick++;
        const payload = {
          event: "telemetry_pulse",
          timestamp: new Date().toISOString(),
          sync_seconds_ago: (tick * 3) % 60,
          ward_id: "ACUTE CARE UNIT 4B",
          active_patients: 48,
          high_risk_count: 11,
          alert:
            tick % 6 === 0
              ? "Patient #MRN-88421 bed sensor armed (Bed 402-A)"
              : tick % 4 === 0
              ? "Vital signs updated for Bed 404-B"
              : undefined,
        };

        const message = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(message));
      }, 3000);

      // Initial immediate event
      const initialPayload = {
        event: "telemetry_pulse",
        timestamp: new Date().toISOString(),
        sync_seconds_ago: 0,
        ward_id: "ACUTE CARE UNIT 4B",
        active_patients: 48,
        high_risk_count: 11,
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`)
      );

      return () => {
        clearInterval(interval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
