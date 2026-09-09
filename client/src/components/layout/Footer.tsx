import Logo from "./Logo"
import { useRouter } from "../../app/router"
import type { Route } from "../../app/router"

export default function Footer() {
  const { navigate } = useRouter()

  const cols: { title: string links: { label: string route: Route }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Location Scout", route: { name: "home" } },
        { label: "City Lookalike", route: { name: "research" } },
        { label: "Films in a City", route: { name: "research" } },
        { label: "History Check", route: { name: "research" } },
      ],
    },
    {
      title: "Workflow",
      links: [
        {
          label: "Shootability",
          route: { name: "how", section: "shootability" },
        },
        {
          label: "Weather & sun",
          route: { name: "how", section: "weather-and-sun" },
        },
        {
          label: "Permits",
          route: { name: "how", section: "production-rules" },
        },
        { label: "Logistics", route: { name: "how", section: "logistics" } },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "How it works", route: { name: "how" } },
        {
          label: "Example location",
          route: { name: "location", id: "brooklyn-navy-yard" },
        },
      ],
    },
  ]

  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-fog-500">
            Turn a scene description into real-world locations - with maps,
            production intelligence, and sources.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-600">
              {c.title}
            </h4>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.route)}
                    className="text-sm text-fog-300 transition-colors hover:text-white"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center font-mono text-[11px] uppercase tracking-wider text-fog-600">
        · 2026 SetRadar
      </div>
    </footer>
  )
}
