import { useEffect, useState } from "react"
import Modal from "../ui/Modal"
import Button from "../ui/Button"
import { Input, Label, Select } from "../ui/Field"
import { useProjects } from "../../app/projects"
import { useRouter } from "../../app/router"
import type { ProductionType } from "../../types/project"
import type { Location } from "../../types/location"

const TYPES: ProductionType[] = [
  "Feature Film",
  "Short Film",
  "Documentary",
  "Commercial",
  "Music Video",
  "TV / Streaming",
  "Student Film",
]

export default function AddToProjectModal({
  open,
  onClose,
  location,
}: {
  open: boolean
  onClose: () => void
  location: Location
}) {
  const { projects, addLocation, createProject } = useProjects()
  const { navigate } = useRouter()
  const [mode, setMode] = useState<"select" | "create">(
    projects.length ? "select" : "create",
  )
  const [selected, setSelected] = useState(projects[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [type, setType] = useState<ProductionType>("Feature Film")

  useEffect(() => {
    if (!open) return
    setMode(projects.length ? "select" : "create")
    setSelected((current) => current || projects[0]?.id || "")
  }, [open, projects])

  const submit = async () => {
    let projectId = selected
    if (mode === "create" || !projectId) {
      if (!title.trim()) return
      projectId = (await createProject(title.trim(), type)).id
    }
    addLocation(projectId, location)
    onClose()
    if (localStorage.getItem("setradar-last-research-result")) {
      window.history.back()
    } else {
      navigate({ name: "project", id: projectId })
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="atp-title">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
        Add to project
      </div>
      <h2 id="atp-title" className="font-display text-xl font-bold text-white">
        {location.name}
      </h2>

      <div className="mt-4 flex gap-1 rounded-lg border border-line bg-ink-900 p-1">
        {(["select", "create"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-sm capitalize ${
              mode === m ? "bg-ink-700 text-white" : "text-fog-400"
            }`}
          >
            {m === "select" ? "Existing project" : "New project"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {mode === "select" ? (
          <div>
            <Label htmlFor="atp-project">Select project</Label>
            <Select
              id="atp-project"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} Â· {p.productionType}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="atp-title-in">Project title</Label>
              <Input
                id="atp-title-in"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midnight Signal"
              />
            </div>
            <div>
              <Label htmlFor="atp-type">Production type</Label>
              <Select
                id="atp-type"
                value={type}
                onChange={(e) => setType(e.target.value as ProductionType)}
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
          </>
        )}
        <Button className="w-full" onClick={submit}>
          Add location
        </Button>
      </div>
    </Modal>
  )
}
