import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeEmail,
  parseCalcomEvent,
  verifyCalcomSignature,
  type CalcomBooking,
} from "@/lib/calcom";
import type { CallMatch } from "@/lib/calls";

// Cal.com webhook — one endpoint shared by every team member's (free,
// individual) Cal.com account, all configured with the same secret.
// Excluded from the auth middleware (middleware.ts matcher), so the signature
// check is the only thing authenticating the caller: nothing is read or
// written before it passes.
//
// BOOKING_CREATED     -> upsert the call, link it to its project(s)
// BOOKING_RESCHEDULED -> same for the new booking; the old one is marked
//                        "rescheduled" and its project links carry over
// BOOKING_CANCELLED   -> status "cancelled" (kept in history)
//
// Matching: metadata[project_id] from the app's pre-filled links, else the
// attendee email against projects.email in every stage — linking the call to
// all matches (one contact can have several projects). No match -> stored
// unlinked and shown on the Dashboard's Unmatched Calls card.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

async function matchProjects(
  supabase: Admin,
  booking: CalcomBooking
): Promise<{ projectIds: string[]; matchedBy: CallMatch }> {
  if (booking.metadataProjectId) {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("id", booking.metadataProjectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return { projectIds: [data.id], matchedBy: "metadata" };
  }

  if (booking.attendeeEmails.length > 0) {
    // Compared in JS (trimmed, case-insensitive) rather than with ilike,
    // where "_" in an email would act as a wildcard.
    const { data, error } = await supabase
      .from("projects")
      .select("id, email")
      .not("email", "is", null);
    if (error) throw new Error(error.message);
    const wanted = new Set(booking.attendeeEmails);
    const projectIds = (data ?? [])
      .filter((p) => wanted.has(normalizeEmail(p.email)))
      .map((p) => p.id as string);
    if (projectIds.length > 0) return { projectIds, matchedBy: "email" };
  }

  return { projectIds: [], matchedBy: "none" };
}

async function teamMemberIdByEmail(
  supabase: Admin,
  email: string | null
): Promise<string | null> {
  if (!email) return null;
  const { data, error } = await supabase.from("team_members").select("id, email");
  if (error) throw new Error(error.message);
  return (
    data?.find((m) => normalizeEmail(m.email) === normalizeEmail(email))?.id ??
    null
  );
}

async function existingTeamMember(
  supabase: Admin,
  id: string | null
): Promise<string | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function linkProjects(supabase: Admin, callId: string, projectIds: string[]) {
  if (projectIds.length === 0) return;
  const { error } = await supabase
    .from("call_projects")
    .upsert(
      projectIds.map((project_id) => ({ call_id: callId, project_id })),
      { onConflict: "call_id,project_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

async function handleBooking(booking: CalcomBooking) {
  const supabase = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("calls")
    .select("id, status, matched_by")
    .eq("cal_uid", booking.uid)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const [match, teamMemberId, bookedBy] = await Promise.all([
    matchProjects(supabase, booking),
    teamMemberIdByEmail(supabase, booking.organizerEmail),
    existingTeamMember(supabase, booking.metadataBookedBy),
  ]);

  // A reschedule carries the old booking's project links (including manual
  // assignments) over to the new one, and marks the old one.
  let carried: { projectIds: string[]; matchedBy: CallMatch | null } = {
    projectIds: [],
    matchedBy: null,
  };
  if (booking.trigger === "BOOKING_RESCHEDULED" && booking.previousUid) {
    const { data: old, error } = await supabase
      .from("calls")
      .update({
        status: "rescheduled",
        rescheduled_to_uid: booking.uid,
        updated_at: new Date().toISOString(),
      })
      .eq("cal_uid", booking.previousUid)
      .select("id, matched_by, call_projects(project_id)")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (old) {
      carried = {
        projectIds: ((old.call_projects ?? []) as { project_id: string }[]).map(
          (l) => l.project_id
        ),
        matchedBy: old.matched_by as CallMatch,
      };
    }
  }

  const projectIds = Array.from(new Set([...match.projectIds, ...carried.projectIds]));
  const matchedBy: CallMatch =
    match.matchedBy !== "none"
      ? match.matchedBy
      : carried.projectIds.length > 0 && carried.matchedBy
        ? carried.matchedBy
        : (existing?.matched_by as CallMatch | undefined) ?? "none";

  // Status: a cancel always wins; a (re)delivered BOOKING_CREATED never
  // un-cancels or un-reschedules a call that's already moved on.
  const status =
    booking.trigger === "BOOKING_CANCELLED"
      ? "cancelled"
      : existing && existing.status !== "booked"
        ? existing.status
        : "booked";

  const { data: call, error: upsertError } = await supabase
    .from("calls")
    .upsert(
      {
        cal_uid: booking.uid,
        team_member_id: teamMemberId,
        // Keep an earlier booked_by if this delivery doesn't carry one.
        ...(bookedBy ? { booked_by: bookedBy } : {}),
        organizer_email: booking.organizerEmail,
        attendee_name: booking.attendeeName,
        attendee_email: booking.attendeeEmails[0] ?? null,
        title: booking.title,
        start_time: booking.startTime,
        end_time: booking.endTime,
        status,
        matched_by: matchedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cal_uid" }
    )
    .select("id")
    .single();
  if (upsertError) throw new Error(upsertError.message);

  // Links are only ever added here, never removed, so manual assignments
  // survive later deliveries.
  await linkProjects(supabase, call.id, projectIds);
}

export async function POST(request: Request) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CALCOM_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Signature is over the raw, unparsed body.
  const rawBody = await request.text();
  if (
    !verifyCalcomSignature(
      rawBody,
      request.headers.get("x-cal-signature-256"),
      secret
    )
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const booking = parseCalcomEvent(body);
  // PING (Cal.com's "test" button) and unhandled events: acknowledge.
  if (!booking) return Response.json({ received: true });

  try {
    await handleBooking(booking);
  } catch (e) {
    console.error("Cal.com webhook handler failed", booking.trigger, booking.uid, e);
    // 500 -> Cal.com retries the delivery.
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
  return Response.json({ received: true });
}
