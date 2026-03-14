import { Readable } from "stream";
import { connectDB } from "@/lib/db";
import { getGoogleClientCredentials } from "@/lib/youtube-auth";
import YouTubeChannel from "@/models/YouTubeChannel";
import { google } from "googleapis";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video");
    const title = formData.get("title")?.toString() || "Untitled";
    const description = formData.get("description")?.toString() || "";
    const privacyStatus = formData.get("privacy")?.toString() || "private";
    const channelIdsRaw = formData.get("channelIds");

    if (!videoFile || !(videoFile instanceof Blob)) {
      return Response.json(
        { error: "Video file is required" },
        { status: 400 }
      );
    }

    const channelIds = channelIdsRaw
      ? JSON.parse(channelIdsRaw.toString())
      : [];
    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      return Response.json(
        { error: "Select at least one channel" },
        { status: 400 }
      );
    }

    await connectDB();
    const channels = await YouTubeChannel.find({
      channelId: { $in: channelIds },
    });

    if (channels.length !== channelIds.length) {
      return Response.json(
        { error: "One or more channels not found or not connected" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const { client_id, client_secret } = getGoogleClientCredentials();

    const results = [];

    for (const ch of channels) {
      const mediaBody = Readable.from(buffer);
      try {
        const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
        oauth2Client.setCredentials({
          access_token: ch.accessToken,
          refresh_token: ch.refreshToken,
        });

        if (ch.tokenExpiry && new Date() >= ch.tokenExpiry) {
          const { credentials } = await oauth2Client.refreshAccessToken();
          ch.accessToken = credentials.access_token;
          ch.tokenExpiry = credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null;
          await ch.save();
        }

        const youtube = google.youtube({ version: "v3", auth: oauth2Client });

        const response = await youtube.videos.insert({
          part: ["snippet", "status"],
          requestBody: {
            snippet: {
              title,
              description,
              categoryId: "22", // People & Blogs
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: false,
            },
          },
          media: {
            body: mediaBody,
            mimeType: videoFile.type || "video/mp4",
          },
        });

        results.push({
          channelId: ch.channelId,
          title: ch.title,
          success: true,
          videoId: response.data.id,
        });
      } catch (err) {
        results.push({
          channelId: ch.channelId,
          title: ch.title,
          success: false,
          error: err.message || "Upload failed",
        });
      }
    }

    return Response.json({ results });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
