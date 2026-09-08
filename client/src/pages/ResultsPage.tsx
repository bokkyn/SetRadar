import type { ResearchResult } from "../types/research";
import LocationCard from "../components/locations/LocationCard";
import { useRouter } from "../app/router";

export default function ResultsPage({ result }: { result: ResearchResult }) {
  const { navigate } = useRouter();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <div className="mb-5">
        <button
          onClick={() => navigate({ name: "home" })}
          className="mb-2 text-sm text-fog-500 hover:text-fog-100"
        >
          â† New search
        </button>
        <div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Locations found
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-fog-500">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.locations.map((l) => (
            <LocationCard
              key={l.id}
              location={l}
              onOpen={() => navigate({ name: "location", id: l.id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
