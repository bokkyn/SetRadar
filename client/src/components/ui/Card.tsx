import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export default function Card({ children, interactive, className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-2xl border border-line bg-ink-850 ${
        interactive ? "transition-colors hover:border-fog-600/60 cursor-pointer" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
