import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getPageSession } from "@/server/session";

export default async function RegisterPage() {
  if (await getPageSession()) redirect("/");
  return <AuthForm mode="register" />;
}
