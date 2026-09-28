import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/server/auth/identity";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedActor().catch(() => null);
  if (!actor) redirect("/login");
  if (actor.actorType !== "platform") redirect("/students");
  return children;
}
