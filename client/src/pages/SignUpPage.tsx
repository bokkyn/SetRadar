import { useState } from "react";
import AuthForm from "../components/auth/AuthForm";
import { useAuth } from "../app/auth";
import { useRouter } from "../app/router";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const { navigate } = useRouter();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-5 py-14">
      <div className="rounded-2xl border border-line bg-ink-850 p-6 shadow-2xl sm:p-8">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
          Start your SetRadar workspace
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          Create account
        </h1>
        <p className="mt-2 text-sm text-fog-500">
          Save locations, build projects, and keep your research in one place.
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-status-restricted/40 bg-status-restricted/10 p-3 text-sm text-status-restricted">
            {error}
          </p>
        )}
        <div className="mt-6">
          <AuthForm
            submitLabel="Create account"
            mode="signup"
            onSubmit={async (user) => {
              setError("");
              try {
                await signUp(user);
                navigate({ name: "profile" });
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not create your account.",
                );
              }
            }}
          />
        </div>
        <button
          onClick={() => navigate({ name: "signin" })}
          className="mt-5 w-full text-center text-xs text-fog-600 transition-colors hover:text-fog-300"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}
