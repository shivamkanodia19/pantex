"use client";

import clsx from "clsx";

import type { DocChange } from "@/lib/document-data";

/** Status chip styles shared by Document + Changes. */
export function statusStyles(status: DocChange["status"]) {
  return clsx(
    "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    status === "pending" && "bg-doe-muted text-doe",
    status === "accepted" && "bg-accepted-muted text-accepted",
    status === "edited" && "bg-accent-muted text-accent",
    status === "rejected" && "bg-canvas text-ink-muted",
  );
}
