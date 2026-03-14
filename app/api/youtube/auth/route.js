import { getGoogleClientCredentials, SCOPES } from "@/lib/youtube-auth";

export async function GET(request) {
  const { client_id, auth_uri } = getGoogleClientCredentials();
  const host =
    request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/youtube/callback`;

  const params = new URLSearchParams({
    client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `${auth_uri}?${params.toString()}`;
  return Response.redirect(authUrl);
}
