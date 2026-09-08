import { useEffect, useState } from "react";
import Logo from "./Logo";
import Button from "../ui/Button";
import { useRouter } from "../../app/router";
import { useAuth } from "../../app/auth";
import { initials } from "../../utils/formatting";

export default function Navbar() {
  const { navigate } = useRouter();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const publicLinks = [
    { label: "Discover", onClick: () => navigate({ name: "home" }) },
    { label: "Research", onClick: () => navigate({ name: "research" }) },
    { label: "How it works", onClick: () => navigate({ name: "how" }) },
  ];
  const authedLinks = [
    { label: "Projects", onClick: () => navigate({ name: "projects" }) },
    { label: "Research", onClick: () => navigate({ name: "research" }) },
    { label: "Compare", onClick: () => navigate({ name: "comparison" }) },
    { label: "How it works", onClick: () => navigate({ name: "how" }) },
  ];
  const links = user ? authedLinks : publicLinks;

  const handleSignOut = () => {
    signOut();
    navigate({ name: "home" });
    setMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? "border-line bg-ink-950/90 backdrop-blur-md"
          : "border-transparent bg-ink-950/40 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <button
          onClick={() => navigate({ name: "home" })}
          aria-label="SetRadar home"
        >
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={l.onClick}
              className="rounded-lg px-3 py-2 text-sm text-fog-300 transition-colors hover:text-white"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <button
                onClick={() => navigate({ name: "profile" })}
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ink-800 font-mono text-xs text-amber-signal"
                aria-label="Profile"
              >
                {initials(user.name)}
              </button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ name: "signin" })}
              >
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate({ name: "signup" })}>
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-fog-300 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M2 5h14M2 9h14M2 13h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-ink-900 px-5 py-3 md:hidden">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => {
                l.onClick();
                setMenuOpen(false);
              }}
              className="block w-full py-2.5 text-left text-sm text-fog-300"
            >
              {l.label}
            </button>
          ))}
          <div className="mt-2 flex gap-2 border-t border-line pt-3">
            {user ? (
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  navigate({ name: "signup" });
                  setMenuOpen(false);
                }}
              >
                Get started
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
