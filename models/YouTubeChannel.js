import mongoose from "mongoose";

const YouTubeChannelSchema = new mongoose.Schema(
  {
    channelId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    thumbnailUrl: { type: String },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models?.YouTubeChannel ||
  mongoose.model("YouTubeChannel", YouTubeChannelSchema);
