import mongoose from "mongoose"

const projectSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },

    title: { type: String, required: true },

    productionType: { type: String, required: true },

    description: String,

    genre: String,

    status: { type: String, default: "draft" },

    totalScenes: { type: Number, default: 0 },

    shortlisted: { type: Number, default: 0 },

    warnings: { type: Number, default: 0 },

 

    locations: { type: [mongoose.Schema.Types.Mixed], default: [] },

    ownerId: { type: String, required: true },
  },

  { timestamps: true, strict: false },
)

export const Project = mongoose.model("Project", projectSchema)
