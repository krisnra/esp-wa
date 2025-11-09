import React from "react";

export function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return (
    <th
      className="px-3 py-2 text-left font-semibold"
      style={w ? { width: w } : undefined}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 align-top ${mono ? "font-mono" : ""} ${
        className ?? ""
      }`}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </td>
  );
}

export function Badge({ on }: { on?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${
        on
          ? "bg-emerald-900/30 text-emerald-300"
          : "bg-slate-800 text-slate-300"
      }`}
    >
      {on ? "Enabled" : "Disabled"}
    </span>
  );
}
