// typescript/useJobStatus.ts
/**
 * useJobStatus — React hook for real-time video processing updates via Server-Sent Events (SSE).
 *
 * Usage:
 *   const { status, event, error, isConnecting, isProcessing, isCompleted, isFailed } = useJobStatus(jobId, apiBaseUrl);
 *
 * Connects to:
 *   GET {apiBaseUrl}/api/v1/events/{jobId}
 *
 * Transitions:
 *   "idle" -> "connecting" -> "processing" -> "completed" (or "failed" / "timeout")
 */

import { useEffect, useRef, useState } from "react";
import { buildApiUrl } from "../services/uploadService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatusState =
  | "idle" // No jobId provided, hook is dormant
  | "queued" // Video assembled, event stream opened, queued waiting for worker
  | "connecting" // EventSource opened, connecting
  | "processing" // Server confirmed background worker is transcoding / analyzing
  | "completed" // Terminal: processing finished successfully
  | "failed" // Terminal: processing failed
  | "timeout"; // Terminal: stream exceeded max client duration

export interface JobStatusEvent {
  job_id: string;
  video_id: string;
  job_type: string;
  status: "queued" | "processing" | "completed" | "failed" | string;
  compressed_key?: string;
  analysis_key?: string;
  error?: string;
  [key: string]: any;
}

export interface UseJobStatusResult {
  status: JobStatusState;
  event: JobStatusEvent | null;
  error: string | null;
  isConnecting: boolean;
  isQueued: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set<string>(["completed", "failed"]);
// const CLIENT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes wall-clock cap
const CLIENT_TIMEOUT_MS = 30 * 120 * 1000; // 60 minutes wall-clock cap

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

export function useJobStatus(
  jobId: string | null | undefined,
  apiBaseUrl: string = "",
): UseJobStatusResult {
  const [status, setStatus] = useState<JobStatusState>("idle");
  const [event, setEvent] = useState<JobStatusEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus("idle");
      setEvent(null);
      setError(null);
      return;
    }

    const url = buildApiUrl(apiBaseUrl, `api/v1/events/${jobId}`);
    setStatus("queued");
    setEvent(null);
    setError(null);

    const es = new EventSource(url);
    esRef.current = es;

    // Timeout guard
    timeoutRef.current = setTimeout(() => {
      es.close();
      setStatus("timeout");
      setError(
        `No completion event received within ${CLIENT_TIMEOUT_MS / 60000} minutes.`,
      );
    }, CLIENT_TIMEOUT_MS);

    es.onmessage = (messageEvent: MessageEvent) => {
      let parsed: JobStatusEvent;
      try {
        parsed = JSON.parse(messageEvent.data) as JobStatusEvent;
      } catch {
        // Ignore ping comments or unparseable frames
        return;
      }

      setEvent(parsed);

      const incomingStatus = parsed.status?.toLowerCase();

      // Explicit queued or waiting frame
      if (
        incomingStatus === "queued" ||
        incomingStatus === "pending" ||
        incomingStatus === "waiting"
      ) {
        setStatus("queued");
        return;
      }

      // Transition to processing only when backend event explicitly confirms processing
      if (
        incomingStatus === "processing" ||
        incomingStatus === "transcoding" ||
        incomingStatus === "analyzing"
      ) {
        setStatus("processing");
        return;
      }

      if (TERMINAL_STATUSES.has(incomingStatus)) {
        setStatus(incomingStatus as "completed" | "failed");
        if (incomingStatus === "failed") {
          setError(
            parsed.error ??
              "Video analysis could not be completed. Please try again.",
          );
        }
        es.close();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };

    es.onerror = () => {
      // EventSource handles transient disconnects automatically.
      // If closed permanently, reflect in state.
      if (es.readyState === EventSource.CLOSED) {
        setStatus("failed");
        setError("Real-time connection was lost. Please check your network.");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };

    return () => {
      es.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      esRef.current = null;
    };
  }, [jobId, apiBaseUrl]);

  return {
    status,
    event,
    error,
    isConnecting: status === "connecting",
    isQueued: status === "queued",
    isProcessing: status === "processing",
    isCompleted: status === "completed",
    isFailed: status === "failed" || status === "timeout",
  };
}

export default useJobStatus;
