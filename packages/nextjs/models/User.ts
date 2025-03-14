// models/User.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  address: string;
  username: string;
  discordId?: string;
  discordUsername?: string;
  twitterId?: string;
  twitterUsername?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    address: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    discordId: { type: String },
    discordUsername: { type: String },
    twitterId: { type: String },
    twitterUsername: { type: String },
    bio: { type: String },
  },
  { timestamps: true },
);

// This prevents duplicate error in development
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
