/**
 * Shared primitives for the printed brochure. Pure presentational pieces —
 * every page of the print output is composed from these so the whole
 * document shares one design system (modelled on ThinkQuip's physical SANY
 * spec sheets): turquoise section bands, two-column ruled spec rows, brand
 * page header, and a ThinkQuip footer with page numbers.
 */
import { THINKQUIP_LOGO_TURQUOISE, COMPANY } from '../data/machinesConfig';

/** One fixed A4 page. Footer (logo · address · site · Page X of Y) is pinned
 *  to the bottom; content that overflows is clipped rather than spilling into
 *  an unnumbered page. */
export function PrintPage({ pageNumber, pageCount, isLast, className = '', children, footer = true }) {
  return (
    <section className={`print-page${isLast ? ' print-page--last' : ''} ${className}`}>
      <div className="print-page__content">{children}</div>
      {footer && (
        <footer className="print-page__footer">
          <img src={THINKQUIP_LOGO_TURQUOISE} alt="ThinkQuip" className="print-page__footer-logo" />
          <span>{COMPANY.address}</span>
          <span className="print-page__footer-dot" aria-hidden="true" />
          <span>{COMPANY.website}</span>
          <span className="print-page__footer-page num">Page {pageNumber} of {pageCount}</span>
        </footer>
      )}
    </section>
  );
}

/** Brand page header: machine/section name in large type with the model code
 *  in a lighter weight beside it. The ThinkQuip logo sits on the LEFT of the
 *  title; the SANY logo (spec sheets, logoRight) sits on the RIGHT edge. */
export function PageHeader({ logo, logoAlt = '', title, code, accent, logoRight = false }) {
  return (
    <div className="print-header" style={accent ? { borderBottomColor: accent } : undefined}>
      {logo && !logoRight && <img src={logo} alt={logoAlt} className="print-header__logo" />}
      <h1 className="print-header__title">
        {title}
        {code && <span className="print-header__code"> {code}</span>}
      </h1>
      {logo && logoRight && <img src={logo} alt={logoAlt} className="print-header__logo print-header__logo--right" />}
    </div>
  );
}

/** Solid turquoise section band with a white bold-italic title. */
export function Band({ children }) {
  return <h2 className="print-band">{children}</h2>;
}

/** A right-aligned spec value. */
export function SpecValue({ value }) {
  return <span className="print-value num">{value}</span>;
}

/** Two-column spec rows — label left, value right, thin rules between rows.
 *  rows: [{ label, value, emph? }] — emph renders the row as the block's
 *  tallied total (tinted, ruled top, bold value). */
export function SpecRows({ rows }) {
  return (
    <div className="print-rows">
      {rows.map((row) => (
        <div className={`print-row${row.emph ? ' print-row--emph' : ''}`} key={row.label}>
          <span className="print-row__label">{row.label}</span>
          <SpecValue value={row.value} />
        </div>
      ))}
    </div>
  );
}
