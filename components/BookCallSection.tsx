import type { Project, TeamMember } from "@/lib/types";
import { bookingUrl } from "@/lib/booking";

// "Book a call" on the Manage Project page: everyone with a Cal.com link,
// the project's Owners first. Links are pre-filled with the client's name and
// email plus metadata[project_id] / metadata[booked_by], so the Cal.com
// webhook can file the call under this project.
export default function BookCallSection({
  project,
  teamMembers,
  currentMemberId,
}: {
  project: Pick<Project, "id" | "owner" | "contact_name" | "email">;
  teamMembers: TeamMember[];
  currentMemberId: string | null;
}) {
  const bookable = teamMembers
    .map((m) => ({
      member: m,
      url: m.booking_link
        ? bookingUrl(m.booking_link, {
            name: project.contact_name,
            email: project.email,
            projectId: project.id,
            bookedBy: currentMemberId,
          })
        : null,
      isOwner: project.owner.includes(m.id),
    }))
    .filter((b): b is typeof b & { url: string } => b.url !== null)
    .sort(
      (a, b) =>
        Number(b.isOwner) - Number(a.isOwner) ||
        a.member.name.localeCompare(b.member.name)
    );

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">Book a call</h2>
      {bookable.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">
          No booking links yet — an Admin adds them on the Team page.
        </p>
      ) : (
        <>
          {!project.email && (
            <p className="mt-2 text-xs text-neutral-500">
              This project has no contact email, so the booking form won&apos;t
              be pre-filled — the call is still filed here from the link.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {bookable.map(({ member, url, isOwner }) => (
              <a
                key={member.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Book with {member.name}
                {isOwner && (
                  <span className="ml-1.5 text-xs font-normal text-neutral-400">
                    Owner
                  </span>
                )}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
