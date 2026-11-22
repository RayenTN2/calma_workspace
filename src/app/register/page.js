import { redirect } from "next/navigation";

import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/features/auth/utils/session";
import { getHomePathForRole } from "@/features/auth/roles";

export const metadata = {
  title: "Inscription | Calma Workspace",
};

export default async function RegisterPage() {
  // Déjà connecté : inutile d'afficher le formulaire d'inscription.
  const user = await getCurrentUser();
  if (user) {
    redirect(getHomePathForRole(user.role));
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f4f7f4] px-4 py-12 font-[system-ui,-apple-system,'Segoe_UI',Roboto,Arial,sans-serif] text-[#1f3128]">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5 text-[19px] font-bold tracking-tight text-[#294537]">
          <span
            aria-hidden="true"
            className="grid h-[34px] w-[34px] place-items-center rounded-[11px_11px_11px_3px] bg-[#2f6b53] font-serif text-2xl font-normal text-white"
          >
            C
          </span>
          <span>
            Calma <span className="font-normal">Workspace</span>
          </span>
        </div>

        <section className="rounded-2xl border border-[#e4e9e5] bg-white p-6 shadow-[0_1px_2px_rgba(31,49,40,0.05),0_4px_14px_rgba(31,49,40,0.06)] sm:p-8">
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Inscription</h1>
          <p className="mb-6 text-sm text-[#6b7a72]">
            Créez votre compte pour réserver votre espace de travail.
          </p>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
