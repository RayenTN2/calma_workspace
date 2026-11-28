import Link from "next/link";

export default function Brand({ className = "" }) {
  return (
    <Link className={`calmaBrand ${className}`.trim()} href="/" aria-label="Calma Workspace, accueil">
      <span className="calmaBrandMark" aria-hidden="true">c</span>
      <span className="calmaBrandName">calma<span>workspace</span></span>
    </Link>
  );
}
