import { getConfigValue } from "@/lib/config/appConfig";
import LoginPageClient from "./LoginPageClient";

export default async function LoginPage() {
  const azureTenantId = await getConfigValue("azure_tenant_id");

  return <LoginPageClient azureTenantId={azureTenantId || undefined} />;
}
