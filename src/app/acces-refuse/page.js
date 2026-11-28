import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import LogoutButton from "@/components/auth/LogoutButton";
import Brand from "@/components/Brand";
import { getCurrentUser } from "@/features/auth/utils/session";
import { getHomePathForRole, LOGIN_PATH } from "@/features/auth/roles";

export const metadata = {
  title: "Accès refusé | Calma Workspace",
};

// Affichée quand un utilisateur connecté ouvre une page réservée à un autre rôle.
export default async function AccessDeniedPage() {
  const user = await getCurrentUser();
  const homePath = user ? getHomePathForRole(user.role) : LOGIN_PATH;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f4f7f4] px-4 py-12 text-[#1f3128]">
      <section className="w-full max-w-md rounded-2xl border border-[#e4e9e5] bg-white p-8 text-center shadow-[0_1px_2px_rgba(31,49,40,0.05),0_4px_14px_rgba(31,49,40,0.06)]">
        <div className="mb-7 flex justify-center"><Brand className="calmaBrandCentered" /></div>
        <ShieldAlert size={36} className="mx-auto mb-4 text-[#a2473e]" aria-hidden="true" />
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Accès refusé</h1>
        <p className="mb-6 text-sm text-[#4a5b52]">
          Votre compte n&apos;a pas les droits nécessaires pour ouvrir cette page.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href={homePath}
            className="rounded-xl bg-[#2f6b53] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#245641]"
          >
            {user ? "Retour à mon espace" : "Se connecter"}
          </Link>
          {user ? (
            <LogoutButton
              label="Changer de compte"
              className="flex items-center gap-1.5 text-sm font-medium text-[#4a5b52] hover:text-[#1f3128]"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
