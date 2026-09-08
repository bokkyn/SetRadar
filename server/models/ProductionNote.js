import mongoose from "mongoose";

const productionNoteSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    locationId: { type: String, required: true },
    userId: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, default: "general" }, 
    attachments: [
      {
        url: String,
        type: String,
        name: String,
      },
    ],
  },
  { timestamps: true, strict: false },
);

export const ProductionNote = mongoose.model(
  "ProductionNote",
  productionNoteSchema,
);
