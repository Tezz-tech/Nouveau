import { Link } from "react-router-dom";
import Container from "@/components/ui/Container";
import { footerColumns, riskDisclosure } from "@/content/site";

export default function Footer() {
  return (
    <footer className="on-dark bg-navy-deep text-paper">
      <Container className="py-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-5 font-text text-caption uppercase tracking-[0.08em] text-slate">
                {col.heading}
              </h2>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-small text-paper/90 transition-colors duration-300 hover:text-gold-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 h-px w-full bg-navy-line" aria-hidden="true" />

        <div className="mt-10 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <span className="font-display text-h3 text-paper">Nouveau</span>
          <p className="max-w-measure text-caption text-slate">
            {riskDisclosure}
          </p>
        </div>

        <p className="mt-10 text-caption text-slate">
          © {new Date().getFullYear()} Nouveau. This site is a design
          demonstration; no forms submit and no accounts are created.
        </p>
      </Container>
    </footer>
  );
}
