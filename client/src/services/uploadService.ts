// typescript/uploadService.ts
/**
 * Sports Reels — Large-file multipart upload & match event retrieval service.
 *
 * Implements the complete client-to-backend flow:
 *   1. POST /api/v1/upload/initiate  → get upload_id + presigned part URLs (job_type: "analysis")
 *   2. PUT each chunk directly to Cloudflare R2 with automatic retries on network drops
 *   3. POST /api/v1/upload/complete  → assemble video & dispatch processing pipeline
 *   4. GET  /api/v1/videos/{video_id}/event_tags → fetch match timeline (cache HIT/MISS aware)
 *   5. PATCH /api/v1/event_tags/{tag_id} → submit QA corrections and invalidate cache
 *
 * Design constraints:
 * - Chunk size: 10 MB (safe for Cloudflare R2 multipart).
 * - Automatic exponential backoff retry for failed chunks if connection drops.
 * - Raw passthrough and typed cache headers (X-Cache-Status) support.
 * - Preserves exact R2 ETags (including quotation marks).
 * - No external dependencies — relies entirely on standard browser Fetch API.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CHUNK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_CONCURRENT_UPLOADS = 4; // Upload up to 4 chunks in parallel
export const DEFAULT_CHUNK_MAX_RETRIES = 4; // Retry up to 4 times per chunk on network drop
export const DEFAULT_CHUNK_RETRY_DELAY_MS = 1000; // Base delay for exponential backoff

// ---------------------------------------------------------------------------
// Types — mirroring FastAPI Backend Schemas
// ---------------------------------------------------------------------------

export type JobType = "analysis" | "storage" | "player_analysis";

export interface PresignedPart {
  part_number: number;
  url: string;
  expires_at: string; // ISO-8601 UTC
}

export interface InitiateUploadResponse {
  upload_id: string;
  video_key: string;
  parts: PresignedPart[];
  total_chunks: number;
  initiated_at: string;
  video_id?: string;
}

export interface CompletedPart {
  PartNumber: number;
  ETag: string;
}

export interface AssemblyJobPayload {
  video_id: string;
  job_id: string;
  video_key: string;
  upload_id: string;
  webhook_url?: string;
  status: string;
  assembled_at: string;
  processing_hint?: string;
}

export interface CompleteUploadResponse {
  message: string;
  job: AssemblyJobPayload;
}

export interface UploadResult {
  job: AssemblyJobPayload;
}

export interface ChunkRetryState {
  partNumber: number;
  attempt: number;
  maxAttempts: number;
  error: string;
  nextRetryDelayMs: number;
}

export interface UploadProgress {
  percentage: number;
  completedChunks: number;
  totalChunks: number;
  activeChunk?: number;
  retryState?: ChunkRetryState | null;
  statusText: string;
}

// ---- Event Tags Types ----

export interface StructuredEventPayload {
  event_type: string;
  initiator_jersey?: number | null;
  receiver_or_target_jersey?: number | null;
  marker_jersey?: number | null;
  pitch_zone?: string;
  phase?: string;
  outcome?: string;
  [key: string]: any;
}

export interface MatchTag {
  id: string;
  // match_id: string; // Corresponds to video_id
  video_id: string;
  timestamp_str: string;
  // timestamp?: string;
  match_time_sec: number;
  video_time_sec: number;
  player_id?: string | null;
  sport_code?: string;
  data_point_category: string;
  model_confidence_score: number;
  structured_payload: StructuredEventPayload;
  natural_language_output: string;
  is_verified: boolean;
  corrected_payload?: Record<string, any> | null;
  [key: string]: any;
}

export interface MatchTimelineResponse {
  // match_id: string;
  video_id: string;
  total_events: number;
  events: MatchTag[];
}

export interface EventTagFilters {
  player_id?: string;
  event_type?: string;
  data_point_category?: string;
  verified_only?: boolean;
}

export interface FetchEventTagsResult {
  timeline: MatchTimelineResponse;
  cacheStatus: "HIT" | "MISS" | null;
  cacheControl: string | null;
}

// ---------------------------------------------------------------------------
// Typed Error Classes
// ---------------------------------------------------------------------------

export class UploadInitiationError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "UploadInitiationError";
  }
}

export class ChunkUploadError extends Error {
  constructor(
    message: string,
    public readonly partNumber: number,
    public readonly attemptsMade: number,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ChunkUploadError";
  }
}

export class UploadCompletionError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "UploadCompletionError";
  }
}

export class TagRetrievalError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "TagRetrievalError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes URL path resolution so endpoints like /api/v1/upload/... are always
 * constructed cleanly regardless of whether apiBaseUrl has a trailing slash or path.
 */
export function buildApiUrl(apiBaseUrl: string, endpointPath: string): string {
  const base = (apiBaseUrl || "").trim().replace(/\/+$/, "");
  const path = endpointPath.replace(/^\/+/, "");

  // If path already starts with api/v1 and base ends with /api/v1, avoid duplication
  if (base.endsWith("/api/v1") && path.startsWith("api/v1/")) {
    return `${base}/${path.substring("api/v1/".length)}`;
  }
  if (base.endsWith("/api") && path.startsWith("api/")) {
    return `${base}/${path.substring("api/".length)}`;
  }

  return base ? `${base}/${path}` : `/${path}`;
}

/**
 * Split a File into an ordered array of Blob slices (default 10 MB each).
 */
export function sliceFileIntoChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE_BYTES,
): Blob[] {
  const chunks: Blob[] = [];
  let offset = 0;
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
}

/**
 * Pause execution for ms milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run tasks with a concurrency limit.
 */
async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Step 1 — Initiate Upload
// ---------------------------------------------------------------------------

async function initiateUpload(
  apiBaseUrl: string,
  filename: string,
  totalChunks: number,
  contentType: string = "video/mp4",
  jobType: JobType = "analysis",
  storageData?: Record<string, any>,
): Promise<InitiateUploadResponse> {
  const url = buildApiUrl(apiBaseUrl, "api/videos/initiate-upload");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        total_chunks: totalChunks,
        job_type: jobType,
        content_type: contentType || "video/mp4",
        storage_data: storageData ?? null,
      }),
      credentials: "include",
    });
  } catch (netErr) {
    throw new UploadInitiationError(
      "Unable to connect to the server. Please check your network connection.",
    );
  }

  if (!response.ok) {
    throw new UploadInitiationError(
      "Failed to initiate video upload. Please try again.",
      response.status,
    );
  }

  return response.json() as Promise<InitiateUploadResponse>;
}

// ---------------------------------------------------------------------------
// Step 2 — Upload Chunk with Automatic Retries
// ---------------------------------------------------------------------------

async function uploadChunkWithRetry(
  url: string,
  chunk: Blob,
  partNumber: number,
  maxRetries: number = DEFAULT_CHUNK_MAX_RETRIES,
  baseDelayMs: number = DEFAULT_CHUNK_RETRY_DELAY_MS,
  onRetry?: (state: ChunkRetryState) => void,
): Promise<CompletedPart> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: chunk,
        // Notice: Do NOT add Content-Type header here; R2 presigned URLs encode it
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "(no body)");
        // 5xx errors or 429 rate-limiting warrant retry; 400/403 are fatal configuration issues
        if (response.status >= 500 || response.status === 429) {
          throw new Error(`Temporary server error. Retrying...`);
        }
        throw new ChunkUploadError(
          `Chunk upload failed [HTTP ${response.status}].`,
          partNumber,
          attempt,
          response.status,
        );
      }

      // Preserve raw ETag exactly as returned by R2
      const rawETag =
        response.headers.get("ETag") ??
        response.headers.get("etag") ??
        response.headers.get("x-amz-etag");

      if (!rawETag) {
        throw new Error(
          `Missing upload verification header for segment ${partNumber}.`,
        );
      }

      return { PartNumber: partNumber, ETag: rawETag };
    } catch (err) {
      const isFatal =
        err instanceof ChunkUploadError &&
        err.statusCode &&
        err.statusCode < 500 &&
        err.statusCode !== 429;
      const hasRetriesLeft = attempt <= maxRetries;

      if (isFatal || !hasRetriesLeft) {
        if (err instanceof ChunkUploadError) {
          throw err;
        }
        throw new ChunkUploadError(
          `Upload interrupted for segment ${partNumber}. Please check your connection.`,
          partNumber,
          attempt,
        );
      }

      // Exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 200);
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;

      onRetry?.({
        partNumber,
        attempt,
        maxAttempts: maxRetries + 1,
        error: err instanceof Error ? err.message : String(err),
        nextRetryDelayMs: delay,
      });

      await sleep(delay);
    }
  }

  throw new ChunkUploadError(
    `Upload interrupted for segment ${partNumber}. Please check your connection.`,
    partNumber,
    attempt,
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Complete Upload
// ---------------------------------------------------------------------------

async function completeUpload(
  apiBaseUrl: string,
  uploadId: string,
  videoId: string = "",
  videoKey: string,
  parts: CompletedPart[],
  jobType: JobType = "analysis",
  storageData?: Record<string, any>,
): Promise<CompleteUploadResponse> {
  const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
  // const url = buildApiUrl(apiBaseUrl, "api/v1/upload/complete");
  const url = buildApiUrl(
    apiBaseUrl,
    `api/videos/${encodeURIComponent(videoId)}/complete`,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_id: uploadId,
        video_key: videoKey,
        parts: sortedParts,
        job_type: jobType,
        storage_data: storageData ?? null,
      }),
      credentials: "include",
    });
  } catch (netErr) {
    throw new UploadCompletionError(
      "Unable to connect to the server. Please check your network connection.",
    );
  }

  if (!response.ok) {
    throw new UploadCompletionError(
      "Failed to finalize video upload. Please try again.",
      response.status,
    );
  }

  return response.json() as Promise<CompleteUploadResponse>;
}

// ---------------------------------------------------------------------------
// Step 4 — Retrieve Match Event Tags (Cache-Aside Aware)
// ---------------------------------------------------------------------------

/**
 * Normalizes seconds (e.g. 74.5) to HH:MM:SS format string.
 */
export function formatSecondsToTimestamp(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Normalizes an individual match tag from either a raw Redis cache hit (unserialized)
 * or a PostgreSQL database query response.
 */
export function normalizeMatchTag(
  rawTag: any,
  index: number,
  videoId: string,
): MatchTag {
  if (!rawTag || typeof rawTag !== "object") {
    return {
      id: `tag-${videoId}-${index}`,
      // match_id: videoId,
      video_id: videoId,
      timestamp_str: "00:00:00",
      // timestamp: "00:00:00",
      match_time_sec: 0,
      video_time_sec: 0,
      data_point_category: "general",
      model_confidence_score: 1.0,
      structured_payload: { event_type: "event" },
      natural_language_output: "",
      is_verified: false,
      corrected_payload: null,
    };
  }

  const matchTimeSec =
    typeof rawTag.match_time_sec === "number" ? rawTag.match_time_sec : 0;

  const videoTimeSec =
    typeof rawTag.video_time_sec === "number" ? rawTag.video_time_sec : 0;

  const timestampStr =
    rawTag.timestamp_str ||
    // rawTag.timestamp ||
    formatSecondsToTimestamp(matchTimeSec);

  const tagId =
    rawTag.id != null && String(rawTag.id).trim() !== ""
      ? String(rawTag.id)
      : rawTag._id != null && String(rawTag._id).trim() !== ""
        ? String(rawTag._id)
        : `tag-${videoId}-${index}-${Math.round(matchTimeSec)}`;

  const matchId = rawTag.match_id || rawTag.video_id || videoId;

  return {
    ...rawTag,
    id: tagId,
    // match_id: matchId,
    video_id: matchId,
    timestamp_str: timestampStr,
    // timestamp: timestampStr,
    match_time_sec: matchTimeSec,
    video_time_sec: videoTimeSec,
    player_id: rawTag.player_id ?? null,
    sport_code: rawTag.sport_code ?? "FB-CODE",
    data_point_category: rawTag.data_point_category || "general",
    model_confidence_score:
      typeof rawTag.model_confidence_score === "number"
        ? rawTag.model_confidence_score
        : 1.0,
    structured_payload:
      rawTag.structured_payload && typeof rawTag.structured_payload === "object"
        ? rawTag.structured_payload
        : {
            event_type: rawTag.event_type || "event",
            outcome: rawTag.outcome || "outcome",
          },
    natural_language_output: rawTag.natural_language_output || "",
    is_verified: Boolean(rawTag.is_verified),
    corrected_payload: rawTag.corrected_payload ?? null,
  };
}

/**
 * Fetch the match timeline tags for a video from the FastAPI backend.
 *
 * Fast path:
 *   If no filters are applied, the backend returns the raw cached JSON from Redis
 *   with header `X-Cache-Status: HIT` (sub-15ms latency).
 *   On cache HIT, the returned body is the raw unserialized array of tags.
 *
 * Filtered path / Cache MISS:
 *   If query filters are supplied or cache has expired, queries PostgreSQL directly
 *   and returns a structured MatchTimelineResponse object with header `X-Cache-Status: MISS`.
 */
export async function fetchEventTags(
  videoId: string,
  options?: {
    apiBaseUrl?: string;
    filters?: EventTagFilters;
  },
): Promise<FetchEventTagsResult> {
  const apiBaseUrl = options?.apiBaseUrl ?? "";
  const filters = options?.filters;

  let endpoint = `api/videos/${encodeURIComponent(videoId)}/event_tags`;

  if (filters) {
    const queryParams = new URLSearchParams();
    if (filters.player_id) queryParams.set("player_id", filters.player_id);
    if (filters.event_type) queryParams.set("event_type", filters.event_type);
    if (filters.data_point_category)
      queryParams.set("data_point_category", filters.data_point_category);
    if (typeof filters.verified_only === "boolean") {
      queryParams.set("verified_only", String(filters.verified_only));
    }
    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }

  const url = buildApiUrl(apiBaseUrl, endpoint);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
  } catch (netErr) {
    throw new TagRetrievalError(
      "Unable to connect to the server. Please check your network connection.",
    );
  }

  if (!response.ok) {
    throw new TagRetrievalError(
      "Failed to retrieve event tags. Please try again.",
      response.status,
    );
  }

  const cacheStatusHeader = response.headers.get("X-Cache-Status") as
    | "HIT"
    | "MISS"
    | null;
  const cacheControlHeader = response.headers.get("Cache-Control");
  const rawData: any = await response.json();

  let timeline: MatchTimelineResponse;

  // Handle both:
  // 1. Cache HIT: Backend returns raw passthrough JSON from Redis without deserialisation wrapper (MatchTag[] array).
  // 2. Cache MISS / Filtered: Backend returns serialized MatchTimelineResponse object with { video_id/match_id, total_events, events }.
  if (Array.isArray(rawData)) {
    const events = rawData.map((tag: any, idx: number) =>
      normalizeMatchTag(tag, idx, videoId),
    );
    timeline = {
      // match_id: videoId,
      video_id: videoId,
      total_events: events.length,
      events,
    };
  } else if (rawData && typeof rawData === "object") {
    const rawEvents: any[] = Array.isArray(rawData.events)
      ? rawData.events
      : Array.isArray(rawData.timeline)
        ? rawData.timeline
        : [];

    const events = rawEvents.map((tag: any, idx: number) =>
      normalizeMatchTag(tag, idx, videoId),
    );

    const totalEvents =
      typeof rawData.total_events === "number"
        ? rawData.total_events
        : events.length;

    const matchId = rawData.match_id || rawData.video_id || videoId;

    timeline = {
      // match_id: matchId,
      video_id: matchId,
      total_events: totalEvents,
      events,
    };
  } else {
    timeline = {
      // match_id: videoId,
      video_id: videoId,
      total_events: 0,
      events: [],
    };
  }

  return {
    timeline,
    cacheStatus: cacheStatusHeader,
    cacheControl: cacheControlHeader,
  };
}

// ---------------------------------------------------------------------------
// Step 5 — Submit QA Correction for an Event Tag
// ---------------------------------------------------------------------------

/**
 * Allows human annotators/scouts to submit a correction for an event tag.
 * Automatically invalidates the match timeline cache.
 */

// comeback
export async function patchEventTagQA(
  tagId: string,
  correction: {
    corrected_payload: Record<string, any>;
    is_verified?: boolean;
  },
  apiBaseUrl: string = "",
): Promise<MatchTag> {
  const url = buildApiUrl(
    apiBaseUrl,
    `api/event_tags/${encodeURIComponent(tagId)}`,
  );

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      corrected_payload: correction.corrected_payload,
      is_verified: correction.is_verified ?? true,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to save tag correction. Please try again.");
  }

  return response.json() as Promise<MatchTag>;
}

// ---------------------------------------------------------------------------
// Step 6 — Verify All Tags for a Video
// ---------------------------------------------------------------------------

export interface VerifyTagsResponse {
  video_id: string;
  status: "VERIFIED";
  verified_at: string; // ISO-8601 UTC
}

/**
 * Mark every AI-generated event tag for a video as verified.
 *
 * Corresponds to POST /api/v1/videos/{video_id}/verify_tags.
 * Sets Video.is_tags_verified = True on the backend, which unlocks the export
 * endpoint.  The video_id here is the title / job_id string (the key the
 * backend looks up the Video row by).
 */
export async function verifyVideoTags(
  videoId: string,
  apiBaseUrl: string = "",
): Promise<VerifyTagsResponse> {
  const url = buildApiUrl(
    apiBaseUrl,
    `api/videos/${encodeURIComponent(videoId)}/verify_tags`,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  } catch (netErr) {
    throw new TagRetrievalError(
      "Unable to connect to the server. Please check your network connection.",
    );
  }

  if (!response.ok) {
    throw new TagRetrievalError(
      "Tag verification failed. Please try again.",
      response.status,
    );
  }

  return response.json() as Promise<VerifyTagsResponse>;
}

// ---------------------------------------------------------------------------
// Step 7 — Export Match Tags (CSV / XLSX / XML)
// ---------------------------------------------------------------------------

export type ExportFormat = "csv" | "xlsx" | "xml";

/**
 * Download all verified match event tags in the requested format.
 *
 * Corresponds to GET /api/v1/matches/{video_id}/export?format={csv|xlsx|xml}.
 * The backend requires Video.is_tags_verified === True (returns 403 otherwise).
 *
 * Triggers a browser file download by fetching the response as a Blob and
 * creating a temporary object URL — works without popup blockers.
 */
export async function exportMatchTags(
  videoId: string,
  format: ExportFormat,
  apiBaseUrl: string = "",
): Promise<void> {
  const endpoint = `api/videos/${encodeURIComponent(videoId)}/export_tags`;

  const url = `${buildApiUrl(apiBaseUrl, endpoint)}?format=${format}`;
  // const url = `http://localhost:8000/api/v1/matches/${videoId}/export?format=${format}`;

  let response: Response;
  try {
    // authenticate
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "*/*" },
      credentials: "include",
    });
  } catch (netErr) {
    throw new TagRetrievalError(
      "Unable to connect to the server. Please check your network connection.",
    );
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new TagRetrievalError(
        "Export is locked — all tags must be verified before exporting.",
        403,
      );
    }
    throw new TagRetrievalError(
      "Export failed. Please try again.",
      response.status,
    );
  }

  // Parse filename from Content-Disposition header, fall back to a safe default
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename=([^\s;"]+)/);
  const filename = filenameMatch
    ? filenameMatch[1]
    : `match_${videoId}_tags.${format}`;

  // Materialise the response body as a Blob and trigger a browser download
  // via a hidden anchor — avoids popup-blocker restrictions from window.open()
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

// ---------------------------------------------------------------------------
// Main Upload Pipeline Orchestrator
// ---------------------------------------------------------------------------

export interface UploadOptions {
  apiBaseUrl?: string;
  jobType?: JobType;
  storageData?: Record<string, any>;
  maxRetriesPerChunk?: number;
  onProgress?: (progress: UploadProgress) => void;
  onChunkRetry?: (state: ChunkRetryState) => void;
}

/**
 * Upload a video in chunks to Cloudflare R2 through the FastAPI backend
 * with automatic retries on connection drops.
 */
export async function uploadLargeVideoToR2(
  file: File,
  webhookUrlOrOptions?: string | UploadOptions,
  onProgressLegacy?: (progress: number) => void,
  apiBaseUrlLegacy: string = "",
): Promise<UploadResult> {
  // Support both legacy positional arguments and modern options object
  let options: UploadOptions = {};
  if (typeof webhookUrlOrOptions === "object" && webhookUrlOrOptions !== null) {
    options = webhookUrlOrOptions;
  } else {
    options = {
      apiBaseUrl: apiBaseUrlLegacy,
      jobType: "analysis",
      onProgress: onProgressLegacy
        ? (p) => onProgressLegacy(p.percentage)
        : undefined,
    };
  }
  // remove complicated logic

  const apiBaseUrl = options.apiBaseUrl ?? "";
  const jobType = options.jobType ?? "analysis";
  const storageData = options.storageData;
  const maxRetries = options.maxRetriesPerChunk ?? DEFAULT_CHUNK_MAX_RETRIES;
  const notifyProgress = options.onProgress ?? (() => {});
  const notifyRetry = options.onChunkRetry;

  const chunks = sliceFileIntoChunks(file);
  const totalChunks = chunks.length;

  if (totalChunks === 0) {
    throw new UploadInitiationError("File is empty — nothing to upload.");
  }

  // ---- Step 1: Initiate ----
  notifyProgress({
    percentage: 0,
    completedChunks: 0,
    totalChunks,
    statusText: `Preparing upload for ${file.name}...`,
  });

  const initResponse = await initiateUpload(
    apiBaseUrl,
    file.name,
    totalChunks,
    file.type || "video/mp4",
    jobType,
    storageData,
  );

  const {
    video_id: videoId,
    upload_id: uploadId,
    video_key: videoKey,
    parts: presignedParts,
  } = initResponse;

  if (presignedParts.length !== totalChunks) {
    throw new UploadInitiationError(
      "Unable to prepare file segments for upload. Please try again.",
    );
  }

  // ---- Step 2: Upload all chunks with concurrency cap & automatic retry ----
  let completedCount = 0;
  const completedParts: CompletedPart[] = [];

  const uploadTasks = presignedParts.map(
    (part) => async (): Promise<CompletedPart> => {
      const chunkIndex = part.part_number - 1;
      const chunk = chunks[chunkIndex];

      const result = await uploadChunkWithRetry(
        part.url,
        chunk,
        part.part_number,
        maxRetries,
        DEFAULT_CHUNK_RETRY_DELAY_MS,
        (retryState) => {
          notifyRetry?.(retryState);
          notifyProgress({
            percentage: Math.round((completedCount / totalChunks) * 85) + 5,
            completedChunks: completedCount,
            totalChunks,
            activeChunk: part.part_number,
            retryState,
            statusText: `Connection interrupted. Retrying upload (attempt ${retryState.attempt}/${retryState.maxAttempts})...`,
          });
        },
      );

      completedCount++;
      const progressPercent =
        Math.round((completedCount / totalChunks) * 85) + 5;

      notifyProgress({
        percentage: progressPercent,
        completedChunks: completedCount,
        totalChunks,
        activeChunk: part.part_number,
        retryState: null,
        statusText: `Uploading video... (${progressPercent}%)`,
      });

      return result;
    },
  );

  const uploadedParts = await runWithConcurrencyLimit(
    uploadTasks,
    MAX_CONCURRENT_UPLOADS,
  );
  completedParts.push(...uploadedParts);

  // ---- Step 3: Complete Multipart Assembly ----
  notifyProgress({
    percentage: 95,
    completedChunks: totalChunks,
    totalChunks,
    statusText: "Finalizing upload and queueing analysis...",
  });

  const completeResponse = await completeUpload(
    apiBaseUrl,
    uploadId,
    videoId,
    videoKey,
    completedParts,
    jobType,
    storageData,
  );

  notifyProgress({
    percentage: 100,
    completedChunks: totalChunks,
    totalChunks,
    statusText: "Video upload complete. Queued for analysis.",
  });

  return { job: completeResponse.job };
}

// ---------------------------------------------------------------------------
// Core Backend Integration: Fetch Processed Videos
// ---------------------------------------------------------------------------

export interface ProcessedVideo {
  id: string; // Database UUID of the video row
  title: string; // Video title / Job identifier
  source?: string; // Video source (e.g. "upload", "s3")
  file_url?: string | null; // Direct streamable URL or Cloudflare R2 key
  duration?: string | null; // Duration string (e.g. "90:00") or seconds
  upload_date?: string | null; // ISO timestamp string
  match_date?: string | null; // Match date string
  competition?: string | null; // Competition name (e.g. "Premier League")
  opponent?: string | null; // Opponent name
  minutes_played?: number | null; // Number of minutes
  processed: boolean; // true for analyzed videos
  is_tags_verified?: boolean; // true if tags verified
  verified_at?: string | null; // Verification timestamp
  verified_by: string | null;
  team_id?: string | null;
  description?: string | null;
  video_type?: string | null;
  [key: string]: any;
}

// ===========================================================================
// CORE BACKEND INTEGRATION POINT: Fetch Processed Videos
// ===========================================================================
/**
 * ---------------------------------------------------------------------------
 * ATTENTION DEVELOPER (CORE BACKEND):
 * ---------------------------------------------------------------------------
 * This function retrieves all processed (analysed) videos where `video.processed === true`.
 *
 * HOW TO PLUG IN YOUR CORE BACKEND:
 * 1. Modify the `endpoint` below if your Core Backend uses a different path:
 *    Default: "api/v1/videos?processed=true"
 * 2. If authentication (JWT / Bearer token / API key) is required by your
 *    Core BE, inject it into the `headers` object below.
 * 3. The parser handles both plain arrays `[ {...}, ... ]` and wrapped responses
 *    `{ videos: [...] }` or `{ data: [...] }`.
 * ---------------------------------------------------------------------------
 */
export async function fetchProcessedVideos(
  coreApiBaseUrl: string = "",
): Promise<ProcessedVideo[]> {
  // --- CORE BE ENDPOINT: Adjust path below to match your Core Backend API ---
  const endpoint = "api/videos?processed=true";
  const url = buildApiUrl(coreApiBaseUrl, endpoint);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // --- ADD CORE BE AUTH HEADERS HERE IF NEEDED ---
        // "Authorization": `Bearer ${yourAuthToken}`,
      },
      credentials: "include",
    });
  } catch (netErr) {
    throw new Error(
      "Unable to connect to the server. Please check your network connection.",
    );
  }

  if (!response.ok) {
    throw new Error("Failed to load processed videos. Please try again.");
  }

  const rawData: any = await response.json();

  // Normalize array from either direct list or standard API response wrappers
  let videoList: any[] = [];
  if (Array.isArray(rawData)) {
    videoList = rawData;
  } else if (rawData && typeof rawData === "object") {
    if (Array.isArray(rawData.videos)) {
      videoList = rawData.videos;
    } else if (Array.isArray(rawData.data)) {
      videoList = rawData.data;
    } else if (Array.isArray(rawData.items)) {
      videoList = rawData.items;
    }
  }

  console.log(videoList);

  // Ensure only processed videos are returned and format fields cleanly
  return videoList
    .filter(
      (v: any) =>
        v &&
        (v.processed === true || v.processed === "true" || v.processed === 1),
    )
    .map((v: any) => ({
      id: String(v.id || v.video_id || v._id || ""),
      title: v.title || v.video_title || v.name || `Video ${v.id || ""}`,
      source: v.source || "upload",
      file_url: v.fileUrl || v.url || v.stream_url || null,
      duration: v.duration ? String(v.duration) : null,
      upload_date: v.uploadDate || v.created_at || null,
      match_date: v.matchDate || null,
      competition: v.competition || null,
      opponent: v.opponent || null,
      minutes_played:
        typeof v.minutesPlayed === "number" ? v.minutes_played : null,
      processed: true,
      is_tags_verified: Boolean(v.is_tags_verified),
      verified_at: v.verified_at || null,
      verified_by: v.verified_by || null,
      team_id: v.teamId || null,
      description: v.description || null,
      video_type: v.video_type || null,
    }));
}
