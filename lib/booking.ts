// Cal.com booking links (team_members.booking_link).
//
// Links opened from a project are pre-filled so the webhook can match the
// booking without guessing:
// - name / email: Cal.com prefills the booking form with the client's
//   details, so the attendee email matches projects.email.
// - metadata[project_id] / metadata[booked_by]: passed through to the
//   booking and the webhook payload — the primary way a call is matched to
//   its project. Confirm with a real test booking that metadata arrives
//   before relying on it.

export function isValidBookingLink(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function bookingUrl(
  link: string,
  prefill: {
    name?: string | null;
    email?: string | null;
    projectId?: string;
    bookedBy?: string | null;
  } = {}
): string | null {
  if (!isValidBookingLink(link)) return null;
  const url = new URL(link);
  const set = (key: string, value: string | null | undefined) => {
    if (value?.trim()) url.searchParams.set(key, value.trim());
  };
  set("name", prefill.name);
  set("email", prefill.email);
  set("metadata[project_id]", prefill.projectId);
  set("metadata[booked_by]", prefill.bookedBy);
  return url.toString();
}
