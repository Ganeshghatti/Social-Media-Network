import { readFileSync } from "fs";
import { join } from "path";

let clientCreds = null;

export function getGoogleClientCredentials() {
  if (clientCreds) return clientCreds;
  const path = join(
    process.cwd(),
    "client_secret_1017602456506-qch3qkd6gn6vlbh743mc5cmgoqo9vji9.apps.googleusercontent.com.json"
  );
  const raw = readFileSync(path, "utf-8");
  const data = JSON.parse(raw);
  clientCreds = data.web;
  return clientCreds;
}

export const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];
