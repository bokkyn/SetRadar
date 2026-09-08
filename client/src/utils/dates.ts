export type ShootStatus = "upcoming" | "today" | "filmed" | "cancelled" | "postponed";

export function shootStatus(isoDate: string, override?: ShootStatus): ShootStatus {
  if (override === "cancelled" || override === "postponed") return override;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(isoDate);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day.getTime() === today.getTime()) return "today";
  return day.getTime() < today.getTime() ? "filmed" : "upcoming";
}

export function isPastShoot(isoDate: string): boolean {
  return shootStatus(isoDate) === "filmed";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatShootDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatShootDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export const shootStatusLabel: Record<ShootStatus, string> = {
  upcoming: "Upcoming",
  today: "Today",
  filmed: "Filmed",
  cancelled: "Cancelled",
  postponed: "Postponed",
};
