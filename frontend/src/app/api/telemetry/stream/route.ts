import { API_BASE } from "@/lib/api";
import { createDemoTelemetryStream } from "@/lib/telemetryStream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timeout = setTimeout(abort, 5000);
  try {
    const response = await fetch(`${API_BASE}/telemetry/stream`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const stream = new ReadableStream<Uint8Array>({
        async pull(destination) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              request.signal.removeEventListener("abort", abort);
              destination.close();
            } else destination.enqueue(value);
          } catch (error) {
            request.signal.removeEventListener("abort", abort);
            destination.error(error);
          }
        },
        async cancel() {
          request.signal.removeEventListener("abort", abort);
          controller.abort();
          await reader.cancel();
        },
      });
      return new Response(stream, { headers: streamHeaders });
    }
    await response.body?.cancel();
  } catch {
    // Explicit demo telemetry keeps the preview usable while the API is unavailable.
  } finally {
    clearTimeout(timeout);
  }
  controller.abort();
  request.signal.removeEventListener("abort", abort);
  return new Response(createDemoTelemetryStream(request.signal), { headers: streamHeaders });
}

const streamHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};
