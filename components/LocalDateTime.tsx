"use client";

import { useEffect, useState } from "react";

const FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

// Formats a timestamp in the viewer's own timezone. Formatting during server
// rendering would use the server's timezone (UTC on Vercel), so the text is
// filled in after mount; the ISO value is in the <time> element meanwhile.
export default function LocalDateTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(new Intl.DateTimeFormat("en-US", FORMAT).format(new Date(iso)));
  }, [iso]);
  return (
    <time dateTime={iso} className="whitespace-nowrap">
      {text ?? "…"}
    </time>
  );
}
