import Mark from "@/components/Mark";
import { BRAND, FOOTER } from "@/lib/content";

/**
 * Footer. Every link here resolves to something that exists on the page or to a
 * real mailbox — no decorative "Company / Careers / Press" dead ends.
 */
export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__top">
          <div>
            <span className="footer__mark">
              <Mark size={20} />
              {BRAND.name}
            </span>
            <p className="footer__blurb">
              Dispatch operations for cloud kitchens. {BRAND.location}.
            </p>
          </div>

          {FOOTER.columns.map((column) => (
            <div className="footer__col" key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <span className="tag">
            <span className="tag__dot" aria-hidden="true" />
            {FOOTER.status}
          </span>
          <span>
            © {year} {BRAND.legal} · {BRAND.contact}
          </span>
        </div>

        <p className="footer__fine">{FOOTER.finePrint}</p>
      </div>
    </footer>
  );
}
