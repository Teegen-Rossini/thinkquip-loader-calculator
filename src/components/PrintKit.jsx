/**
 * Shared primitives for the printed brochure. Pure presentational pieces —
 * every page of the print output is composed from these so the whole
 * document shares one design system (modelled on ThinkQuip's physical SANY
 * spec sheets): turquoise section bands, two-column ruled spec rows, brand
 * page header, ThinkQuip footer with page numbers, and printable
 * confidence dots.
 */
import { THINKQUIP_LOGO, COMPANY } from '../data/machinesConfig';

/** One fixed A4 page. Footer (logo · address · site · Page X of Y) is pinned
 *  to the bottom; content that overflows is clipped rather than spilling into
 *  an unnumbered page. */
export function PrintPage({ pageNumber, pageCount, isLast, className = '', children, footer = true }) {
  return (
    <section className={`print-page${isLast ? ' print-page--last' : ''} ${className}`}>
      <div className="print-page__content">{children}</div>
      {footer && (
        <footer className="print-page__footer">
          <img src={THINKQUIP_LOGO} alt="ThinkQuip" className="print-page__footer-logo" />
          <span>{COMPANY.address}</span>
          <span className="print-page__footer-dot" aria-hidden="true" />
          <span>{COMPANY.website}</span>
          <span className="print-page__footer-page num">Page {pageNumber} of {pageCount}</span>
        </footer>
      )}
    </section>
  );
}

/** Brand page header: logo + machine/section name in large type, with the
 *  model code in a lighter weight beside it. */
export function PageHeader({ logo, logoAlt = '', title, code, accent }) {
  return (
    <div className="print-header" style={accent ? { borderBottomColor: accent } : undefined}>
      {logo && <img src={logo} alt={logoAlt} className="print-header__logo" />}
      <h1 className="print-header__title">
        {title}
        {code && <span className="print-header__code"> {code}</span>}
      </h1>
    </div>
  );
}

/** Solid turquoise section band with a white bold-italic title. */
export function Band({ children }) {
  return <h2 className="print-band">{children}</h2>;
}

/** Small printable confidence dot: solid turquoise (confirmed), amber
 *  outline (estimate), solid grey (pending dealer quote). */
export function Dot({ confidence = 'confirmed' }) {
  return <span className={`print-dot print-dot--${confidence}`} aria-hidden="true" />;
}

/** A spec value with its confidence dot. Unconfirmed values NEVER print a
 *  number — they print "Pending dealer quote" in grey italic. */
export function SpecValue({ value, confidence = 'confirmed' }) {
  const pending = confidence === 'unconfirmed' || value == null || value === '';
  return (
    <span className={`print-value num${pending ? ' print-value--pending' : ''}`}>
      {/* dot and value are adjacent — no whitespace — so the dot never orphans on its own line */}
      <Dot confidence={pending ? 'unconfirmed' : confidence} />{pending ? 'Pending dealer quote' : value}
    </span>
  );
}

/** Two-column spec rows — label left, value right, thin rules between rows.
 *  rows: [{ label, value, confidence }] */
export function SpecRows({ rows }) {
  return (
    <div className="print-rows">
      {rows.map((row) => (
        <div className="print-row" key={row.label}>
          <span className="print-row__label">{row.label}</span>
          <SpecValue value={row.value} confidence={row.confidence} />
        </div>
      ))}
    </div>
  );
}

/** One-line confidence legend for the bottom of each spec page. */
export function DotLegend() {
  return (
    <p className="print-legend">
      <Dot confidence="confirmed" /> Confirmed — factory / published data
      <Dot confidence="estimate" /> Estimate — confirm before final proposal
      <Dot confidence="unconfirmed" /> Pending dealer quote — no figure printed
    </p>
  );
}
