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

import { useCallback, useEffect, useRef, useState } from "react";
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
  | "stream_failed" // Client stream connection closed, dropped, or timed out (1 min limit)
  | "processing_failed" // Microservice explicitly sent a terminal { status: "failed" } frame
  | "failed" // Generic backward-compatible failure
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
  isStreamFailed: boolean;
  isProcessingFailed: boolean;
  isFailed: boolean;
  retryStream: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set<string>(["completed", "failed"]);
const CONNECTION_TIMEOUT_MS = 60 * 1000; // 1 minute limit to establish/re-establish connection
const CLIENT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes wall-clock cap

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

export function useJobStatus(
  jobId: string | null | undefined,
  apiBaseUrl: string = ""
): UseJobStatusResult {
  const [status, setStatus] = useState<JobStatusState>("idle");
  const [event, setEvent] = useState<JobStatusEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectKey, setConnectKey] = useState<number>(0);

  const esRef = useRef<EventSource | null>(null);
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const retryStream = useCallback(() => {
    setConnectKey((k) => k + 1);
  }, []);

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

    // Clean up any existing connection & timers
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    const es = new EventSource(url);
    esRef.current = es;

    // 1-minute connection limit guard:
    // If the stream fails to connect or establish within 1 minute, explicitly close and fail as stream_failed
    connectionTimerRef.current = setTimeout(() => {
      if (es.readyState !== EventSource.OPEN) {
        es.close();
        setStatus("stream_failed");
        setError(
          "Real-time stream failed to establish a connection within 1 minute. Background analysis may still be running on the server."
        );
      }
    }, CONNECTION_TIMEOUT_MS);

    // Overall job duration cap
    maxDurationTimerRef.current = setTimeout(() => {
      es.close();
      setStatus("timeout");
      setError(
        `No completion event received within ${
          CLIENT_TIMEOUT_MS / 60000
        } minutes.`
      );
    }, CLIENT_TIMEOUT_MS);

    es.onopen = () => {
      // Connection successfully opened
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
        connectionTimerRef.current = null;
      }
    };

    es.onmessage = (messageEvent: MessageEvent) => {
      // Any received frame confirms connection is alive
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
        connectionTimerRef.current = null;
      }

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

      if (incomingStatus === "completed") {
        setStatus("completed");
        es.close();
        if (connectionTimerRef.current)
          clearTimeout(connectionTimerRef.current);
        if (maxDurationTimerRef.current)
          clearTimeout(maxDurationTimerRef.current);
        return;
      }

      if (incomingStatus === "failed") {
        setStatus("processing_failed");
        setError(
          parsed.error ??
            "Video analysis could not be completed by the service. Please try again."
        );
        es.close();
        if (connectionTimerRef.current)
          clearTimeout(connectionTimerRef.current);
        if (maxDurationTimerRef.current)
          clearTimeout(maxDurationTimerRef.current);
        return;
      }

      if (TERMINAL_STATUSES.has(incomingStatus)) {
        setStatus(incomingStatus as "completed" | "failed");
        es.close();
        if (connectionTimerRef.current)
          clearTimeout(connectionTimerRef.current);
        if (maxDurationTimerRef.current)
          clearTimeout(maxDurationTimerRef.current);
      }
    };

    es.onerror = () => {
      // If permanently closed (e.g. server closed connection or network blocked)
      if (es.readyState === EventSource.CLOSED) {
        if (connectionTimerRef.current)
          clearTimeout(connectionTimerRef.current);
        if (maxDurationTimerRef.current)
          clearTimeout(maxDurationTimerRef.current);
        setStatus("stream_failed");
        setError(
          "Real-time stream was closed. Background processing may still be running on the server."
        );
        return;
      }

      // If in CONNECTING state (browser attempting to reconnect):
      // Enforce the 1-minute limit so it doesn't try forever
      if (!connectionTimerRef.current) {
        connectionTimerRef.current = setTimeout(() => {
          if (es.readyState !== EventSource.OPEN) {
            es.close();
            setStatus("stream_failed");
            setError(
              "Real-time stream failed to establish a connection within 1 minute. Background analysis may still be running on the server."
            );
          }
        }, CONNECTION_TIMEOUT_MS);
      }
    };

    return () => {
      es.close();
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      if (maxDurationTimerRef.current)
        clearTimeout(maxDurationTimerRef.current);
      esRef.current = null;
    };
  }, [jobId, apiBaseUrl, connectKey]);

  return {
    status,
    event,
    error,
    isConnecting: status === "connecting",
    isQueued: status === "queued",
    isProcessing: status === "processing",
    isCompleted: status === "completed",
    isStreamFailed: status === "stream_failed",
    isProcessingFailed: status === "processing_failed",
    isFailed:
      status === "stream_failed" ||
      status === "processing_failed" ||
      status === "failed" ||
      status === "timeout",
    retryStream,
  };
}

export default useJobStatus;
