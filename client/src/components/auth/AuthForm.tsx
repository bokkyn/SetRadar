import { useState } from "react";
import Button from "../ui/Button";
import { Input, Label, Select } from "../ui/Field";

export const ROLES = [
  "Producer",
  "Director",
  "Filmmaker",
  "Student",
  "YouTuber / Creator",
  "Videographer",
  "Other",
];

export interface AuthSubmit {
  name: string;
  email: string;
  role: string;
}

/**
 * Shared sign-in form - used on the full Sign In page and inside the
 * deferred-action prompt so both collect the same details in one style.
 */
export default function AuthForm({
  onSubmit,
  submitLabel = "Sign in",
  mode = "signup",
}: {
  onSubmit: (u: AuthSubmit & { password: string }) => void | Promise<void>;
  submitLabel?: string;
  mode?: "signin" | "signup";
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [submitting, setSubmitting] = useState(false);

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.trim().length > 0 &&
    (mode === "signin" || password.trim().length >= 6) &&
    (mode === "signin" || name.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    Promise.resolve(
      onSubmit({ name: name.trim(), email: email.trim(), password, role }),
    ).finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <Label htmlFor="af-name">Name</Label>
          <Input
            id="af-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ivan KovaÄŤ"
            autoComplete="name"
          />
        </div>
      )}
      <div>
        <Label htmlFor="af-email">Email</Label>
        <Input
          id="af-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="af-pass">Password</Label>
        <Input
          id="af-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="â€˘â€˘â€˘â€˘â€˘â€˘â€˘â€˘"
          autoComplete="current-password"
          minLength={6}
        />
      </div>
      {mode === "signup" && (
        <div>
          <Label htmlFor="af-role">What are you?</Label>
          <Select
            id="af-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </div>
      )}
      <Button size="md" className="w-full" disabled={!valid || submitting}>
        {submitting ? "Please wait..." : submitLabel}
      </Button>
    </form>
  );
}
