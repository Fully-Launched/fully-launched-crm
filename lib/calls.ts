// Cal.com call history (migration 012). Rows are written only by the Cal.com
// webhook (app/api/webhooks/calcom); the app reads them.

export type CallStatus = "booked" | "cancelled" | "rescheduled";
export type CallMatch = "metadata" | "email" | "manual" | "none";

export type Call = {
  id: string;
  cal_uid: string;
  team_member_id: string | null;
  booked_by: string | null;
  organizer_email: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  title: string | null;
  start_time: string;
  end_time: string | null;
  status: CallStatus;
  rescheduled_to_uid: string | null;
  matched_by: CallMatch;
  created_at: string;
  updated_at: string;
};

// What the UI shows. "Completed" isn't stored: it's a booked call whose start
// time has passed (Cal.com's MEETING_ENDED only fires for Cal Video).
export type CallDisplayStatus =
  | "Upcoming"
  | "Completed"
  | "Cancelled"
  | "Rescheduled";

export function callDisplayStatus(
  call: Pick<Call, "status" | "start_time">,
  now: number = Date.now()
): CallDisplayStatus {
  if (call.status === "cancelled") return "Cancelled";
  if (call.status === "rescheduled") return "Rescheduled";
  return Date.parse(call.start_time) >= now ? "Upcoming" : "Completed";
}

// Upcoming calls first (soonest first), then everything else, newest first.
export function sortCallsForHistory<T extends Pick<Call, "status" | "start_time">>(
  calls: T[],
  now: number = Date.now()
): T[] {
  const upcoming = calls
    .filter((c) => callDisplayStatus(c, now) === "Upcoming")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const rest = calls
    .filter((c) => callDisplayStatus(c, now) !== "Upcoming")
    .sort((a, b) => b.start_time.localeCompare(a.start_time));
  return [...upcoming, ...rest];
}
