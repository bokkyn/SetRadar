import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-amber-signal text-ink-950 hover:bg-amber-soft font-semibold shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]",
  secondary: "bg-ink-700 text-fog-100 hover:bg-ink-600 border border-line",
  outline: "border border-line text-fog-100 hover:border-fog-500 hover:text-white",
  ghost: "text-fog-300 hover:text-white hover:bg-ink-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-[15px] rounded-xl",
};

export default function Button({ variant = "primary", size = "md", className = "", children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-amber-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
