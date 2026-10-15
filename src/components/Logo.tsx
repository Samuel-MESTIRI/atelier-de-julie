// Logo d'exemple (brin de feuillage + nom). À remplacer par le vrai logo de Julie :
// déposer le fichier dans /public et remplacer le <svg> par une balise <img>.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#dfe5d7" />
        <path d="M20 32 C20 24 20 16 21 8" stroke="#5b6b4f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M20.4 14 C16 13 13 10 12.5 7 C16.5 7.5 19.5 10 20.4 14Z" fill="#8a9a7b" />
        <path d="M20.6 19 C25 18 28 15 28.5 12 C24.5 12.5 21.5 15 20.6 19Z" fill="#8a9a7b" />
        <path d="M20.2 25 C15.8 24 12.8 21 12.3 18 C16.3 18.5 19.3 21 20.2 25Z" fill="#8a9a7b" />
      </svg>
      <span className="font-serif text-xl leading-none text-ink">
        L&apos;Atelier <span className="italic text-sage-dark">de Julie</span>
      </span>
    </span>
  );
}
