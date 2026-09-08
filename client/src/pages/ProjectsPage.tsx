import { useState } from "react";
import { useProjects } from "../app/projects";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { Input, Label, Select } from "../components/ui/Field";
import { useRouter } from "../app/router";
import type { ProductionType, Project } from "../types/project";

const TYPES: ProductionType[] = [
  "Feature Film",
  "Short Film",
  "Documentary",
  "Commercial",
  "Music Video",
  "YouTube",
  "Vlog",
  "TV / Streaming",
  "Student Film",
  "Behind the Scenes",
  "Other",
];
const GENRES = [
  "Drama",
  "Thriller",
  "Sci-fi",
  "Comedy",
  "Crime",
  "Romance",
  "Documentary",
  "Horror",
  "Action",
  "Other",
];

type ProjectFormData = {
  title: string;
  productionType: ProductionType;
  genre: string;
  description: string;
};

function ProjectForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Project;
  onCancel: () => void;
  onSave: (data: ProjectFormData) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [productionType, setProductionType] = useState<ProductionType>(
    initial?.productionType ?? "Feature Film",
  );
  const [genre, setGenre] = useState(initial?.genre ?? GENRES[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const valid = title.trim().length > 0;

  return (
    <form
      className="rounded-2xl border border-amber-signal/30 bg-ink-850 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid)
          onSave({
            title: title.trim(),
            productionType,
            genre,
            description: description.trim(),
          });
      }}
    >
      <div className="mb-4 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
        {initial ? "Edit project" : "New project"}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="project-title">Title</Label>
          <Input
            id="project-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Midnight Signal"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="project-type">Production type</Label>
          <Select
            id="project-type"
            value={productionType}
            onChange={(event) =>
              setProductionType(event.target.value as ProductionType)
            }
          >
            {TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="project-genre">Genre</Label>
          <Select
            id="project-genre"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
          >
            {GENRES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="project-description">
            Description{" "}
            <span className="normal-case text-fog-600">(optional)</span>
          </Label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="What is this production about?"
            className="w-full resize-none rounded-lg border border-line bg-ink-900 p-3 text-sm text-fog-100 placeholder:text-fog-600 outline-none focus:border-amber-signal/60"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          {initial ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const { navigate } = useRouter();
  const { projects, createProject, updateProject, deleteProject } =
    useProjects();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
            Workspace
          </div>
          <h1 className="mt-1 font-display text-4xl font-bold text-white">
            Projects
          </h1>
          <p className="mt-2 text-sm text-fog-500">
            Organize locations, scenes, and production decisions.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
        >
          + New project
        </Button>
      </div>
      {creating && (
        <div className="mb-6">
          <ProjectForm
            onCancel={() => setCreating(false)}
            onSave={async (data) => {
              const project = await createProject(
                data.title,
                data.productionType,
                data.genre,
                data.description,
              );
              setCreating(false);
              navigate({ name: "project", id: project.id });
            }}
          />
        </div>
      )}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to start organizing locations and scenes."
          action={
            <Button onClick={() => setCreating(true)}>
              Create your first project
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {projects.map((project) =>
            editingId === project.id ? (
              <ProjectForm
                key={project.id}
                initial={project}
                onCancel={() => setEditingId(null)}
                onSave={(data) => {
                  updateProject(project.id, data);
                  setEditingId(null);
                }}
              />
            ) : (
              <article
                key={project.id}
                className="group rounded-2xl border border-line bg-ink-850 p-5 transition-colors hover:border-fog-600/50"
              >
                <button
                  className="w-full text-left"
                  onClick={() => navigate({ name: "project", id: project.id })}
                >
                  <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
                    {project.productionType} Â· {project.genre}
                  </div>
                  <h2 className="mt-1 font-display text-3xl font-bold text-white group-hover:text-amber-signal">
                    {project.title}
                  </h2>
                  {project.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fog-400">
                      {project.description}
                    </p>
                  )}
                </button>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex gap-4 font-mono text-[11px] uppercase tracking-wider text-fog-600">
                    <span>{project.locations.length} locations</span>
                    <span>{project.totalScenes} scenes</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(project.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-status-restricted hover:bg-status-restricted/10"
                      onClick={() => {
                        if (window.confirm(`Delete ${project.title}?`))
                          deleteProject(project.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}
