"use client";

import clsx from "clsx";

export function ModeToggle({
  value,
  onChange,
}: {
  value: "view" | "write";
  onChange: (v: "view" | "write") => void;
}) {
  const options = [
    { value: "view" as const, label: "View" },
    { value: "write" as const, label: "Write" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Document mode"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "pressable rounded-[5px] px-3 py-1 text-[11px] font-medium transition-colors duration-150",
              active ? "bg-accent text-surface" : "text-ink-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
