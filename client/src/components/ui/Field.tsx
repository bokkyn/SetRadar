import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fog-500">
      {children}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-line bg-ink-900 px-3 text-sm text-fog-100 placeholder:text-fog-600 outline-none transition-colors focus:border-amber-signal/60 focus:bg-ink-850 ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`h-10 w-full appearance-none rounded-lg border border-line bg-ink-900 px-3 text-sm text-fog-100 outline-none transition-colors focus:border-amber-signal/60 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
