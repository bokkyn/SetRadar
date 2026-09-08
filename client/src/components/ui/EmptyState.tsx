import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-ink-900/40 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-fog-600">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-fog-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-fog-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
