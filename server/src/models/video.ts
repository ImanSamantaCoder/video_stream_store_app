import mongoose, { Document, Schema } from "mongoose";

export interface IVideo extends Document {
  sessionId: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}

const VideoSchema = new Schema<IVideo>({
  sessionId: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, default: 0 },
  mimeType: { type: String, default: "video/webm" },
  createdAt: { type: Date, default: Date.now },
});

export const Video = mongoose.model<IVideo>("Video", VideoSchema);
