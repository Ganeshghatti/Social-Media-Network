import { connectDB } from "@/lib/db";
import YouTubeChannel from "@/models/YouTubeChannel";

export async function GET() {
  try {
    await connectDB();
    const channels = await YouTubeChannel.find(
      {},
      { channelId: 1, title: 1, thumbnailUrl: 1, _id: 0 }
    );
    return Response.json(channels);
  } catch (err) {
    console.error("Fetch channels error:", err);
    return Response.json(
      { error: err.message || "Failed to fetch channels" },
      { status: 500 }
    );
  }
}
