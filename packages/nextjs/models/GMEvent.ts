// packages/nextjs/models/GMEvent.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IGMEvent extends Document {
  user: string;
  recipient: string;
  blockNumber: number;
  timestamp: number;
  lastGM: number;
  createdAt: Date;
  updatedAt: Date;
}

const GMEventSchema: Schema = new Schema(
  {
    user: { type: String, required: true, index: true },
    recipient: { type: String, required: true },
    blockNumber: { type: Number, required: true, index: true },
    timestamp: { type: Number, required: true },
    lastGM: { type: Number, required: true }, // Added to store lastGM from contract
  },
  { timestamps: true },
);

export default mongoose.models.GMEvent || mongoose.model<IGMEvent>("GMEvent", GMEventSchema);
