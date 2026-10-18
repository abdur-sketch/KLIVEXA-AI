import { AppShell } from "@/components/app-shell";
import { requirePageSession } from "@/server/session";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePageSession();
  return <AppShell user={user}>{children}</AppShell>;
}
