import { useRef } from "react";
import LocationScout from "../components/scout/LocationScout";
import Button from "../components/ui/Button";
import { getLocationById } from "../data/mockLocations";
import { useRouter } from "../app/router";
import { useAuth } from "../app/auth";
import { useParallax } from "../utils/useParallax";
import { formatDistance } from "../utils/formatting";

const preview = getLocationById("brooklyn-navy-yard")!;

const STEPS = [
  {
    n: "01",
    t: "Describe the scene",
    d: "Natural language plus a few structured controls.",
  },
  {
    n: "02",
    t: "Find candidate locations",
    d: "Concrete places, mapped and scored for shootability.",
  },
  {
    n: "03",
    t: "Evaluate the production",
    d: "Weather, sun, permits and conflicts in one place.",
  },
  {
    n: "04",
    t: "Build the project",
    d: "Save locations, assign scenes, plan the shoot.",
  },
];

export default function HomePage() {
  const { preferences } = useAuth();
  const scoutRef = useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();
  const bg = useParallax(0.18);
  const focusScout = () =>
    scoutRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <>
      {/* Hero + Scout */}
      <section className="relative overflow-hidden border-b border-line">
        {/* Restrained cinematic ground: one darkened photograph, low contrast,
            with a subtle parallax and vignette - no purple/blue AI gradient. */}
        <div
          ref={bg.ref}
          style={bg.style}
          className="absolute inset-0 -z-10 h-[130%]"
        >
          <img
            src="https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=1900&h=1300&fit=crop&auto=format"
            alt=""
            aria-hidden
            className="h-full w-full object-cover opacity-[0.14]"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 90% at 50% -10%, transparent 40%, var(--color-ink-950) 100%)",
          }}
        />

        <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-500">
              Location discovery for filmmakers
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Discover the right places to bring your scenes to life.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-fog-400">
              Describe the scene you're looking for and SetRadar researches
              real-world locations that could bring it to life - with maps,
              images, production details, weather, access, and sources.
            </p>
          </div>

          <div className="mx-auto mt-9 max-w-3xl">
            <LocationScout ref={scoutRef} />
          </div>
        </div>
      </section>

      {/* Example result preview - whole card is clickable */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="mb-6">
          <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
            Example result
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">
            From a sentence to a real place
          </h2>
        </div>
        <div
          onClick={() => navigate({ name: "location", id: preview.id })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === "Enter" && navigate({ name: "location", id: preview.id })
          }
          className="grid cursor-pointer items-center gap-6 rounded-2xl border border-line bg-ink-850 p-5 outline-none transition-colors hover:border-fog-600/50 focus-visible:ring-2 focus-visible:ring-amber-signal/60 lg:grid-cols-2"
        >
          <div className="overflow-hidden rounded-xl">
            <img
              src={preview.images[0]}
              alt={preview.name}
              className="aspect-16/10 w-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              {preview.name}
            </h3>
            <p className="mt-1 text-sm text-fog-500">
              {preview.city}, {preview.region} ?{" "}
              {formatDistance(preview.logistics.distanceKm, preferences.units)}{" "}
              · {preview.logistics.travelMinutes} min
            </p>
            <p className="mt-4 leading-relaxed text-fog-300">
              {preview.whyItMatches}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-signal/30 bg-amber-signal/5 px-3 py-2">
              <span className="font-display text-2xl font-bold text-amber-signal">
                {preview.shootability}
              </span>
              <span className="text-sm text-fog-400">shootability score</span>
            </div>
          </div>
        </div>
      </section>

      {/* Creativity note */}
      <section className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="rounded-2xl border border-amber-signal/25 bg-ink-900/40 px-6 py-8 text-center">
          <p className="mx-auto max-w-2xl font-display text-lg leading-relaxed text-fog-200">
            SetRadar handles the legwork - the searching, the cross-checking,
            the production detail - so your time goes to the creative call.
            <span className="mt-3 block font-display text-amber-signal">
              The eye, the taste and the story stay yours.
            </span>
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-white">
            Production workflow
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: "how" })}
          >
            How it works →
          </Button>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-line bg-ink-850 p-6"
            >
              <div className="font-mono text-sm text-amber-signal">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {s.t}
              </h3>
              <p className="mt-1.5 text-sm text-fog-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-8">
        <div className="rounded-2xl border border-line bg-ink-850 p-10 text-center">
          <h2 className="mx-auto max-w-xl font-display text-3xl font-bold text-white">
            Type a scene. Get real places you could actually shoot it.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-fog-400">
            No account needed to run your first search.
          </p>
          <Button size="lg" className="mt-6" onClick={focusScout}>
            Start scouting
          </Button>
        </div>
      </section>
    </>
  );
}
