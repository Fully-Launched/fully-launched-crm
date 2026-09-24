import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Cal.com webhook helpers (app/api/webhooks/calcom).
//
// Payload shape is Cal.com's standard webhook format:
//   { triggerEvent, createdAt, payload: { uid, title, startTime, endTime,
//     organizer: { email, name }, attendees: [{ email, name }], metadata, ... } }
// Field names here follow Cal.com's docs but haven't been checked against a
// live delivery yet — the first test booking should be compared against this
// (especially metadata and the reschedule fields).

export type CalcomTrigger =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED";

export type CalcomBooking = {
  trigger: CalcomTrigger;
  uid: string;
  title: string | null;
  startTime: string;
  endTime: string | null;
  organizerEmail: string | null;
  attendeeName: string | null;
  attendeeEmails: string[];
  metadataProjectId: string | null;
  metadataBookedBy: string | null;
  // On BOOKING_RESCHEDULED: the uid of the booking this one replaces.
  previousUid: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

// X-Cal-Signature-256: hex HMAC-SHA256 of the raw body with the webhook secret.
export function verifyCalcomSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function uuid(v: unknown): string | null {
  const s = str(v);
  return s && UUID.test(s) ? s : null;
}

// Returns null for events we don't handle (including Cal.com's PING test) or
// payloads missing the essentials.
export function parseCalcomEvent(body: unknown): CalcomBooking | null {
  if (!body || typeof body !== "object") return null;
  const { triggerEvent, payload } = body as {
    triggerEvent?: unknown;
    payload?: Record<string, unknown>;
  };
  if (
    triggerEvent !== "BOOKING_CREATED" &&
    triggerEvent !== "BOOKING_RESCHEDULED" &&
    triggerEvent !== "BOOKING_CANCELLED"
  ) {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;

  const uid = str(payload.uid);
  const startTime = str(payload.startTime);
  if (!uid || !startTime || Number.isNaN(Date.parse(startTime))) return null;

  const organizer = (payload.organizer ?? {}) as Record<string, unknown>;
  const attendees = Array.isArray(payload.attendees)
    ? (payload.attendees as Record<string, unknown>[])
    : [];
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;

  return {
    trigger: triggerEvent,
    uid,
    title: str(payload.title),
    startTime,
    endTime: str(payload.endTime),
    organizerEmail: str(organizer.email),
    attendeeName: str(attendees[0]?.name),
    attendeeEmails: attendees
      .map((a) => normalizeEmail(str(a.email)))
      .filter(Boolean),
    metadataProjectId: uuid(metadata.project_id),
    metadataBookedBy: uuid(metadata.booked_by),
    // Cal.com has used both names for the original booking's uid.
    previousUid: str(payload.rescheduleUid) ?? str(payload.fromReschedule),
  };
}
