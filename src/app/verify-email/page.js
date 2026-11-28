import Link from "next/link";

import Brand from "@/components/Brand";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

export const metadata = {
  title: "Vérifier votre adresse e-mail | Calma Workspace",
};

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f4f7f4] px-4 py-12 font-[system-ui,-apple-system,'Segoe_UI',Roboto,Arial,sans-serif] text-[#1f3128]">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand className="calmaBrandCentered" /></div>

        <section className="rounded-2xl border border-[#e4e9e5] bg-white p-6 shadow-[0_1px_2px_rgba(31,49,40,0.05),0_4px_14px_rgba(31,49,40,0.06)] sm:p-8">
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Vérifiez votre adresse e-mail</h1>
          <p className="mb-6 text-sm text-[#6b7a72]">
            Saisissez le code à 6 chiffres envoyé lors de la création de votre compte.
          </p>
          <VerifyEmailForm initialEmail={email} />
          <p className="mt-5 text-center text-sm text-[#6b7a72]">
            Vous n&apos;avez pas encore de compte ?{" "}
            <Link href="/register" className="font-semibold text-[#2f6b53] hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
