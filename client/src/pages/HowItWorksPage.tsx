import { useEffect } from "react";
import Button from "../components/ui/Button";
import StatusBadge from "../components/ui/StatusBadge";
import { useRouter } from "../app/router";

function Section({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-14">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
          {eyebrow}
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "01",
    t: "Describe the scene",
    d: "SetRadar combines natural language with a few structured controls - location, radius, project type, and optional scene type.",
    ex: "â€śAbandoned industrial interior near Zagreb for a night shoot.â€ť",
  },
  {
    n: "02",
    t: "Find candidate locations",
    d: "The system returns concrete places rather than generic search categories - each mapped and scored.",
    ex: "5 candidate locations near Zagreb, within 45 minutes.",
  },
  {
    n: "03",
    t: "Evaluate the production",
    d: "The goal isn't just a place that looks right - it's whether the production can realistically shoot there.",
    ex: "Shootability 88 Â· Permit Verify Â· Vehicle access Available Â· Golden hour 18:12",
  },
  {
    n: "04",
    t: "Build the project",
    d: "Save promising locations, assign scenes, plan shoot dates, and compare candidates within the same production.",
    ex: "Location + Scene 12 + Oct 12 + 17:00â€“20:00 + warnings",
  },
];

export default function HowItWorksPage() {
  const { route, navigate } = useRouter();
  const section = route.name === "how" ? route.section : undefined;


  useEffect(() => {
    if (!section) return;
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
          From scene idea to shoot-ready location.
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-fog-400">
          SetRadar helps filmmakers discover real-world locations, evaluate
          production constraints, and organize them into projects.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => navigate({ name: "home" })}>
            Start scouting
          </Button>
        </div>
      </section>

      {/* Four-step workflow */}
      <Section eyebrow="The workflow" title="Four steps, one production">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col rounded-xl border border-line bg-ink-850 p-5"
            >
              <div className="font-mono text-sm text-amber-signal">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {s.t}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-fog-400">
                {s.d}
              </p>
              <p className="mt-4 rounded-lg border border-line bg-ink-900 p-3 font-mono text-[12px] leading-relaxed text-fog-300">
                {s.ex}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Research modes */}
      <Section
        eyebrow="Research modes"
        title="Different questions, one location workflow"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "01",
              "Location Scout",
              "Describe a scene and find real candidate locations with practical details such as access, travel, permits, weather and sources.",
            ],
            [
              "02",
              "City Lookalike",
              "Find areas in a target city that share the visual language of another city, decade or reference place.",
            ],
            [
              "03",
              "History Check",
              "Test whether a location fits a story period and separate supported historical details from facts that still need verification.",
            ],
            [
              "04",
              "Films in City",
              "Discover films actually shot in or around a city, with filming evidence and location inspiration for your own production.",
            ],
          ].map(([n, title, description]) => (
            <div
              key={title}
              className="rounded-xl border border-line bg-ink-850 p-5"
            >
              <div className="font-mono text-sm text-amber-signal">{n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">
                {description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-fog-300">
          Use the mode that matches your question, then carry useful findings
          into a project when you are ready.
        </p>
      </Section>

      {/* Generic search vs SetRadar */}
      <Section eyebrow="The difference" title="Generic search vs SetRadar">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <h3 className="font-mono text-[12px] uppercase tracking-wider text-fog-500">
              Generic search
            </h3>
            <p className="mt-3 rounded-lg border border-line bg-ink-900 p-3 font-mono text-[13px] text-fog-300">
              "Abandoned factories near Zagreb"
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fog-400">
              {["Search results", "Images", "Generic pages"].map((x) => (
                <li key={x}>Â· {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-signal/25 bg-ink-850 p-6">
            <h3 className="font-mono text-[12px] uppercase tracking-wider text-amber-signal">
              SetRadar
            </h3>
            <p className="mt-3 rounded-lg border border-line bg-ink-900 p-3 font-mono text-[13px] text-fog-200">
              "Abandoned industrial location for a night sci-fi scene, within 45
              minutes, van available"
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-fog-300">
              {[
                "Concrete locations",
                "Why they fit",
                "Distance",
                "Travel time",
                "Access",
                "Parking",
                "Permit status",
                "Weather & sun",
                "Shootability",
                "Sources",
              ].map((x) => (
                <li key={x}>Â· {x}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-5 text-center font-display text-lg text-fog-200">
          SetRadar connects creative requirements with production reality.
        </p>
      </Section>

      {/* Creative vs practical */}
      <Section eyebrow="The core idea" title="Creative fit Ă— practical fit">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              Creative fit
            </h3>
            <p className="mt-1 text-sm text-fog-500">
              Does this place look right?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Architecture", "Atmosphere", "Scene type", "Visual match"].map(
                (x) => (
                  <span
                    key={x}
                    className="rounded-full border border-line bg-ink-900 px-3 py-1 text-[13px] text-fog-300"
                  >
                    {x}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              Practical fit
            </h3>
            <p className="mt-1 text-sm text-fog-500">
              Can we actually shoot here?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Access",
                "Parking",
                "Permit",
                "Weather",
                "Timing",
                "Travel",
              ].map((x) => (
                <span
                  key={x}
                  className="rounded-full border border-line bg-ink-900 px-3 py-1 text-[13px] text-fog-300"
                >
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Locations vs scenes */}
      <Section eyebrow="Terminology" title="Locations hold scenes">
        <div className="rounded-xl border border-line bg-ink-850 p-6">
          <div className="font-mono text-[11px] uppercase tracking-wider text-fog-500">
            Location
          </div>
          <div className="font-display text-lg font-semibold text-white">
            Zagreb Railway Station
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              [12, "Main hall"],
              [18, "Platform"],
              [24, "Exterior"],
              [31, "Night sequence"],
            ].map(([n, t]) => (
              <div
                key={n as number}
                className="flex items-center gap-3 rounded-lg border border-line bg-ink-900 p-3"
              >
                <span className="font-mono text-sm text-amber-signal">
                  Scene {n}
                </span>
                <span className="text-sm text-fog-300">{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-fog-400">
            SetRadar separates physical locations from scenes. One real-world
            location can host multiple scenes.
          </p>
        </div>
      </Section>

      {/* Shootability + conflict */}
      <Section
        id="shootability"
        eyebrow="Evaluation"
        title="Shootability & conflict detection"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-amber-signal">
                88
              </span>
              <span className="text-fog-500">/ 100</span>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Location fit", 94],
                ["Access", 90],
                ["Timing", 95],
                ["Weather", 82],
                ["Permits", 70],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center gap-3">
                  <span className="w-24 text-[13px] text-fog-400">{k}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-amber-signal/80"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[13px] text-fog-100">
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-fog-400">
              The score is a planning aid, not a guarantee.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-status-restricted/30 bg-status-restricted/5 p-4">
              <div className="font-mono text-[11px] uppercase tracking-wider text-status-restricted">
                Warning
              </div>
              <p className="mt-1 text-sm text-fog-200">
                Your planned shoot extends 30 minutes beyond the listed access
                window (closes 20:00, wrap 20:30).
              </p>
            </div>
            <div className="rounded-xl border border-status-verify/30 bg-status-verify/5 p-4">
              <div className="font-mono text-[11px] uppercase tracking-wider text-status-verify">
                Travel conflict
              </div>
              <p className="mt-1 text-sm text-fog-200">
                Only 30 minutes are available between scenes, but the estimated
                travel time is 42 minutes.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Weather & sun */}
      <Section id="weather-and-sun" eyebrow="Timing" title="Weather & sun">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              Tied to date and time
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog-400">
              Weather and light aren't fixed properties of a place - they depend
              on when you shoot. Assign a scene a shoot date and time and
              SetRadar shows the forecast and sun timeline for that window. Past
              shoots switch to "Filmed" and stop showing an active forecast.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Temperature", "14Â°C"],
                ["Rain", "20%"],
                ["Wind", "12 km/h"],
                ["Visibility", "18 km"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg border border-line bg-ink-900 px-3 py-2"
                >
                  <span className="text-[13px] text-fog-500">{k}</span>
                  <span className="font-mono text-[13px] text-fog-100">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              Golden hour drives the schedule
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog-400">
              The sun timeline marks shoot start, golden hour, sunset and blue
              hour so you can plan around the light - and flags a better window
              when the planned time fights it.
            </p>
            <div className="mt-4 space-y-2">
              {[
                ["17:00", "Shoot begins"],
                ["18:12", "Golden hour"],
                ["18:47", "Sunset"],
                ["19:20", "Blue hour"],
              ].map(([t, l]) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="font-mono text-[13px] text-amber-signal">
                    {t}
                  </span>
                  <span className="text-[13px] text-fog-300">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Production rules & permits */}
      <Section
        id="production-rules"
        eyebrow="Rules"
        title="Production rules & permits"
      >
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <p className="text-sm leading-relaxed text-fog-400">
              Every candidate carries the production rules a location manager
              needs - permit requirements, access windows, drone rules and
              private-property status. Use these findings to focus the next
              verification call with the owner or relevant authority.
            </p>
            <div className="mt-4 space-y-3">
              {[
                ["Permit required", "verify", "Municipal film office"],
                ["Access window", "likely", "07:00â€“20:00, gated after hours"],
                ["Drone use", "restricted", "Controlled airspace nearby"],
                ["Private property", "likely", "Owner permission needed"],
              ].map(([label, status, detail]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-line/60 pb-3"
                >
                  <div>
                    <div className="text-sm text-fog-200">{label}</div>
                    <div className="font-mono text-[11px] text-fog-600">
                      {detail}
                    </div>
                  </div>
                  <StatusBadge
                    status={status as "verify" | "likely" | "restricted"}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="self-center text-fog-300">
            Rules that carry legal or financial risk are never presented as
            settled. A "No permit preferred" search simply favours locations
            where you're less likely to need one - it doesn't remove the need to
            confirm.
          </p>
        </div>
      </Section>

      {/* Logistics */}
      <Section id="logistics" eyebrow="On the ground" title="Logistics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Distance", "18 km", "From your search origin."],
            [
              "Travel time",
              "34 min",
              "Real driving time, not a straight line.",
            ],
            [
              "Vehicle access",
              "To the door",
              "Whether trucks and vans can reach the set.",
            ],
            [
              "Load-in",
              "40 m walk",
              "Distance crew carry equipment from parking.",
            ],
          ].map(([k, v, d]) => (
            <div
              key={k}
              className="rounded-xl border border-line bg-ink-850 p-5"
            >
              <div className="font-mono text-[11px] uppercase tracking-wider text-fog-500">
                {k}
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-white">
                {v}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-fog-400">
                {d}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-fog-300">
          Logistics decide whether a great-looking location is actually
          shootable with your crew, vehicles and gear - so they sit next to the
          creative match, not buried below it.
        </p>
      </Section>

      {/* Philosophy - a tool, not the filmmaker */}
      <Section eyebrow="Where it fits" title="A tool, not the filmmaker">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-amber-signal/25 bg-ink-850 p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              It's here to speed you up
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog-400">
              SetRadar takes the slow, repetitive part off your plate -
              searching, cross-checking, and pulling together the production
              facts a scout would spend days chasing. That's so your time and
              energy go where they matter: the creative call. The eye, the taste
              and the story stay yours. A tool should make you faster, not more
              generic.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-ink-850 p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              And it can be wrong
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog-400">
              Automated research misses things and gets things wrong. Permits
              change, access windows shift, a place looks different in person.
              That's why findings carry a confidence state and a source - treat
              them as strong leads to verify, never as final answers. When it
              matters, confirm with the owner or authority before you commit.
            </p>
          </div>
        </div>
      </Section>

      {/* End-to-end example */}
      <Section eyebrow="End to end" title="One realistic scenario">
        <div className="mx-auto max-w-3xl">
          <ol className="space-y-3">
            {[
              "A filmmaker needs an abandoned industrial location near Zagreb for a sci-fi night sequence.",
              "They set a 25 km radius and Feature Film project type, with an Industrial scene type in advanced settings.",
              "SetRadar returns 5 locations. They open Former Gredelj Railway Complex (shootability 88).",
              "They add it to Midnight Signal and attach Scene 12.",
              "They schedule October 12, 17:00â€“20:00 - SetRadar shows golden hour, sunset, weather, access and permit verification.",
              "They compare it against Zagreb Fair Pavilion within the same project and decide.",
            ].map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-line bg-ink-850 p-3"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-amber-signal/40 font-mono text-[11px] text-amber-signal">
                  {i + 1}
                </span>
                <span className="text-sm text-fog-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => navigate({ name: "home" })}>
            Start scouting
          </Button>
        </div>
      </Section>
    </div>
  );
}
