import { ClientSecretCredential } from "@azure/identity";
import { Client, type AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { getAppConfig, type AppConfig } from "../config/appConfig";

/**
 * Creates an app-only Microsoft Graph client using client credentials (MSAL).
 * Used by Netlify functions for directory sync and SharePoint export.
 * Reads Azure credentials from DB config (falls back to env vars).
 */
export async function createGraphClient(cfg?: AppConfig): Promise<Client> {
  const config = cfg ?? await getAppConfig();
  const credential = new ClientSecretCredential(
    config.azureTenantId,
    config.azureClientId,
    config.azureClientSecret
  );

  const authProvider: AuthenticationProvider = {
    async getAccessToken(): Promise<string> {
      const token = await credential.getToken("https://graph.microsoft.com/.default");
      if (!token) throw new Error("Failed to acquire Graph API token");
      return token.token;
    },
  };

  return Client.initWithMiddleware({ authProvider });
}

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  jobTitle: string | null;
  department: string | null;
  userPrincipalName: string;
  accountEnabled: boolean;
  manager?: { id: string; displayName: string; mail: string };
}

export interface GraphGroup {
  id: string;
  displayName: string;
  members: Array<{ id: string }>;
}

/**
 * Fetches all users from Entra ID with their manager.
 */
export async function fetchAllUsers(client: Client): Promise<GraphUser[]> {
  const users: GraphUser[] = [];
  let nextLink: string | null =
    "/users?$select=id,displayName,mail,jobTitle,department,userPrincipalName,accountEnabled&$expand=manager($select=id,displayName,mail)&$top=999";

  while (nextLink) {
    const res = await client.api(nextLink).get();
    for (const u of res.value ?? []) {
      users.push({
        id: u.id,
        displayName: u.displayName,
        mail: u.mail ?? u.userPrincipalName,
        jobTitle: u.jobTitle,
        department: u.department,
        userPrincipalName: u.userPrincipalName,
        accountEnabled: u.accountEnabled,
        manager: u.manager
          ? { id: u.manager.id, displayName: u.manager.displayName, mail: u.manager.mail }
          : undefined,
      });
    }
    nextLink = res["@odata.nextLink"] ?? null;
  }

  return users;
}

/**
 * Fetches members of a specific Entra group.
 */
export async function fetchGroupMembers(
  client: Client,
  groupId: string
): Promise<string[]> {
  const memberIds: string[] = [];
  let nextLink: string | null = `/groups/${groupId}/members?$select=id&$top=999`;

  while (nextLink) {
    const res = await client.api(nextLink).get();
    memberIds.push(...(res.value ?? []).map((m: any) => m.id as string));
    nextLink = res["@odata.nextLink"] ?? null;
  }

  return memberIds;
}

/**
 * Fetches a user's profile photo as binary data.
 * Returns null if the user has no photo (404).
 */
export async function fetchUserPhoto(
  client: Client,
  userId: string
): Promise<ArrayBuffer | null> {
  try {
    const res = await client.api(`/users/${userId}/photo/$value`).get();
    return res as ArrayBuffer;
  } catch (err: any) {
    if (err?.statusCode === 404) return null;
    return null; // Non-fatal: skip photo on error
  }
}

/**
 * Uploads a file to SharePoint document library.
 * Uses a PUT request for idempotent upload (overwrites existing file).
 */
export async function uploadToSharePoint(
  client: Client,
  siteId: string,
  driveId: string,
  folderPath: string,
  filename: string,
  content: Buffer | string
): Promise<{ id: string; webUrl: string }> {
  const encodedPath = encodeURIComponent(`${folderPath}/${filename}`).replace(/%2F/g, "/");
  const result = await client
    .api(`/sites/${siteId}/drives/${driveId}/root:/${encodedPath}:/content`)
    .header("Content-Type", "text/csv")
    .put(content);

  return { id: result.id, webUrl: result.webUrl };
}
