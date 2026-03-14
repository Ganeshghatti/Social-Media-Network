import { connectDB } from "@/lib/db";
import { getGoogleClientCredentials } from "@/lib/youtube-auth";
import YouTubeChannel from "@/models/YouTubeChannel";
import { google } from "googleapis";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return Response.redirect(
      `${request.nextUrl.origin}/?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return Response.redirect(
      `${request.nextUrl.origin}/?error=Missing authorization code`
    );
  }

  const { client_id, client_secret, token_uri } = getGoogleClientCredentials();
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/youtube/callback`;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const { data } = await youtube.channels.list({
      part: "snippet",
      mine: true,
    });

    const channel = data?.items?.[0];
    if (!channel) {
      return Response.redirect(
        `${request.nextUrl.origin}/?error=No YouTube channel found`
      );
    }

    await connectDB();
    await YouTubeChannel.findOneAndUpdate(
      { channelId: channel.id },
      {
        channelId: channel.id,
        title: channel.snippet?.title || "Unknown",
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
      },
      { upsert: true, new: true }
    );

    return Response.redirect(`${request.nextUrl.origin}/?connected=true`);
  } catch (err) {
    console.error("YouTube OAuth error:", err);
    return Response.redirect(
      `${request.nextUrl.origin}/?error=${encodeURIComponent(err.message || "OAuth failed")}`
    );
  }
}
