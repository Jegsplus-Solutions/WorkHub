import { getAppConfig } from "../../../../lib/config/appConfig";

/** Acquire a Graph access token using client credentials flow. */
export async function getGraphAccessToken(): Promise<string> {
  const config = await getAppConfig();
  const url = `https://login.microsoftonline.com/${config.azureTenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.set("client_id", config.azureClientId);
  params.set("client_secret", config.azureClientSecret);
  params.set("grant_type", "client_credentials");
  params.set("scope", "https://graph.microsoft.com/.default");

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}
