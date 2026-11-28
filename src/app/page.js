import Link from "next/link";
import Brand from "@/components/Brand";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#f4f7f4] px-5 py-12 text-center text-[#1f3128]">
      <Brand />
      <section className="w-full max-w-xl rounded-2xl border border-[#e4e9e5] bg-white p-8 shadow-[0_1px_2px_rgba(31,49,40,0.05),0_6px_20px_rgba(31,49,40,0.06)] sm:p-12">
        <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#73877b]">VOTRE ESPACE DE TRAVAIL</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Bienvenue chez Calma</h1>
        <p className="mb-8 text-[#6b7a72]">Trouvez une salle disponible et gérez vos réservations en quelques clics.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/rooms" className="rounded-xl bg-[#2f6b53] px-5 py-3 text-sm font-semibold text-white hover:bg-[#245641]">Rechercher une salle</Link>
          <Link href="/reservations" className="rounded-xl border border-[#dce5de] px-5 py-3 text-sm font-semibold text-[#245641] hover:bg-[#edf4ef]">Mes réservations</Link>
        </div>
      </section>
    </main>
  );
}
