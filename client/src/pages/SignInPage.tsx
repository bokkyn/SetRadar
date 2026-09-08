import { useState } from "react";
import AuthForm from "../components/auth/AuthForm";
import { useAuth } from "../app/auth";
import { useRouter } from "../app/router";

export default function SignInPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-5 py-14">
      <div className="rounded-2xl border border-line bg-ink-850 p-6 shadow-2xl sm:p-8">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
          Welcome to SetRadar
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-fog-500">
          Sign in to save locations, build projects, and keep your research
          history.
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-status-restricted/40 bg-status-restricted/10 p-3 text-sm text-status-restricted">
            {error}
          </p>
        )}

        <div className="mt-6">
          <AuthForm
            submitLabel="Sign in"
            mode="signin"
            onSubmit={async (u) => {
              setError("");
              try {
                await signIn(u.email, u.password);
                navigate({ name: "profile" });
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Could not sign in.",
                );
              }
            }}
          />
        </div>

        <button
          onClick={() => navigate({ name: "signup" })}
          className="mt-5 w-full text-center text-xs text-fog-600 transition-colors hover:text-fog-300"
        >
          Need an account? Get started
        </button>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wider text-fog-600">
        Prototype account stored in local JSON Server
      </p>
    </div>
  );
}
