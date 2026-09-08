import { useState } from "react";
import Modal from "../ui/Modal";
import AuthForm from "../auth/AuthForm";
import { useAuth } from "../../app/auth";

export default function AuthPrompt() {
  const { prompt, closePrompt, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [error, setError] = useState("");

  const submit = async (
    user: Parameters<typeof signUp>[0] & { password: string },
  ) => {
    setError("");
    try {
      if (mode === "signin") await signIn(user.email, user.password);
      else await signUp(user);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Authentication failed. Try again.",
      );
    }
  };

  return (
    <Modal open={prompt.open} onClose={closePrompt} labelledBy="auth-title">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
        {mode === "signup" ? "Create a free account" : "Welcome back"}
      </div>
      <h2 id="auth-title" className="font-display text-xl font-bold text-white">
        {prompt.reason || "Save this to your project"}
      </h2>
      <p className="mt-2 text-sm text-fog-500">
        {mode === "signup"
          ? "Create an account to keep your work and continue - we'll pick up right where you left off."
          : "Sign in to keep your work and continue where you left off."}
      </p>
      {error && (
        <p className="mt-4 rounded-lg border border-status-restricted/40 bg-status-restricted/10 p-3 text-sm text-status-restricted">
          {error}
        </p>
      )}
      <div className="mt-5">
        <AuthForm
          mode={mode}
          submitLabel={
            mode === "signup"
              ? "Create account & continue"
              : "Sign in & continue"
          }
          onSubmit={submit}
        />
      </div>
      <button
        onClick={() => {
          setMode((current) => (current === "signup" ? "signin" : "signup"));
          setError("");
        }}
        className="mt-4 w-full text-center text-xs text-fog-500 hover:text-fog-200"
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "Need an account? Create one"}
      </button>
      <button
        onClick={closePrompt}
        className="mt-4 w-full text-center text-xs text-fog-600 hover:text-fog-300"
      >
        Keep exploring without an account
      </button>
    </Modal>
  );
}
