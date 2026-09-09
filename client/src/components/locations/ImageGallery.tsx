import { useState } from "react"

export default function ImageGallery({
  name,
  city,
  images,
}: {
  name: string
  city?: string
  images: string[]
}) {
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    [name, city].filter(Boolean).join(" "),
  )}`
  const availableImages = images.filter((src) => !failed.includes(src))
  const markFailed = (src: string) =>
    setFailed((current) =>
      current.includes(src) ? current : [...current, src],
    )
  if (!availableImages.length) {
    return (
      <div className="flex aspect-[16/7] max-w-lg flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-ink-800 px-4 text-center">
        <span className="text-sm text-fog-500">No verified preview found</span>
        <a
          href={googleImagesUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-fog-300 transition-colors hover:border-amber-signal/50 hover:text-amber-signal"
        >
          Search Google Images
        </a>
      </div>
    )
  }
  const selected = Math.min(active, availableImages.length - 1)
  return (
    <div className="max-w-xl">
      <div className="aspect-[16/7] max-w-lg overflow-hidden rounded-2xl border border-line bg-ink-800">
        <img
          src={availableImages[selected]}
          alt={`${name} view ${selected + 1}`}
          className="h-full w-full object-cover"
          onError={() => markFailed(availableImages[selected])}
        />
      </div>
      <div className="mt-2 grid max-w-lg grid-cols-4 gap-2">
        {availableImages.slice(0, 3).map((src, index) => (
          <button
            key={src}
            onClick={() => setActive(index)}
            className={`h-14 overflow-hidden rounded-lg border transition-all sm:h-16 ${
              index === selected
                ? "border-amber-signal"
                : "border-line opacity-70 hover:opacity-100"
            }`}
          >
            <img
              src={src}
              alt={`${name} thumbnail ${index + 1}`}
              className="h-full w-full object-cover"
              onError={() => markFailed(src)}
            />
          </button>
        ))}
        <a
          href={googleImagesUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-14 items-center justify-center rounded-lg border border-dashed border-line text-center text-[11px] text-fog-500 transition-colors hover:border-amber-signal/50 hover:text-amber-signal sm:h-16"
        >
          More photos · Google Images
        </a>
      </div>
    </div>
  )
}
