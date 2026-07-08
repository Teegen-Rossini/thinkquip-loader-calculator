import { PREPARED_BY } from '../data/machinesConfig';
import { ALL_MODELS } from '../data/machinesRepo';

// The landing hero image: the first electric model on file.
const HERO_MODEL = ALL_MODELS.find((m) => m.type === 'electric') ?? ALL_MODELS[0];
import {
  InputsIcon, ComparisonIcon, CostOverTimeIcon, SpecSheetIcon,
  ShieldIcon, LifecycleIcon, ConfidenceIcon, ResearchIcon, ArrowRightIcon,
  BrochureIcon,
} from './icons';
import './Dashboard.css';

const HOW_IT_WORKS = [
  { Icon: InputsIcon, title: 'Inputs', body: 'Enter your operating assumptions and energy prices.' },
  { Icon: ComparisonIcon, title: 'Comparison', body: 'See side-by-side machine comparison and key highlights.' },
  { Icon: CostOverTimeIcon, title: 'Cost Over Time', body: 'View total cost over time with escalation and lifecycle events.' },
  { Icon: SpecSheetIcon, title: 'Spec Sheet', body: 'See detailed machine specifications and the full cost breakdown.' },
  { Icon: ConfidenceIcon, title: 'Calculations', body: 'Follow every step of the maths behind the figures.' },
  { Icon: BrochureIcon, title: 'Personalised Brochure', body: 'Print or save your personalised results to PDF.' },
];

const FEATURES = [
  { Icon: ShieldIcon, title: 'Accurate Cost Model', body: 'Real-world escalation over operating hours' },
  { Icon: LifecycleIcon, title: 'Lifecycle Planning', body: 'Battery replacement and routine service' },
  { Icon: ConfidenceIcon, title: 'Transparent Maths', body: 'Every step shown on the Calculations tab' },
  { Icon: ResearchIcon, title: 'Research Based', body: 'SANY data and transparent assumptions' },
];

// The two parties on a quote: "Prepared For" (the customer — editable inputs)
// and "Prepared By" (the salesman — fixed PREPARED_BY values, never editable).
const CUSTOMER_FIELDS = [
  { key: 'preparedForName', label: 'Name', placeholder: 'Customer Name', type: 'text' },
  { key: 'preparedForCell', label: 'Cell', placeholder: 'Customer Cell', type: 'tel' },
  { key: 'preparedForEmail', label: 'Email', placeholder: 'Customer Email', type: 'email' },
];

export default function Dashboard({ onStart, inputs, onUpdate }) {
  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <div className="dashboard__copy">
          <span className="dashboard__eyebrow">Welcome to the</span>
          <h1 className="dashboard__headline">
            SANY Fleet Savings<br /><span className="dashboard__headline-accent">Calculator</span>
          </h1>
          <p className="dashboard__subhead">
            Compare the SANY SW956E electric vs SYL956H5 diesel wheel loader over 15,000 operating hours.
          </p>

          <div className="dashboard__tiles">
            {HOW_IT_WORKS.map(({ Icon, title, body }) => (
              <div className="dashboard__tile" key={title}>
                <Icon className="dashboard__tile-icon" />
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
            ))}
          </div>

          <div className="dashboard__quote">
            <section className="dashboard__party">
              <h4 className="dashboard__party-title">Prepared For</h4>
              <div className="dashboard__party-fields">
                {CUSTOMER_FIELDS.map(({ key, label, placeholder, type }) => (
                  <label className="dashboard__party-field" key={key}>
                    <span className="dashboard__party-field-label">{label}</span>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={inputs[key]}
                      onChange={(e) => onUpdate({ [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="dashboard__party">
              <h4 className="dashboard__party-title">Prepared By</h4>
              <div className="dashboard__party-fields">
                {[['Name', PREPARED_BY.name], ['Cell', PREPARED_BY.cell], ['Email', PREPARED_BY.email]].map(([label, value]) => (
                  <div className="dashboard__party-field" key={label}>
                    <span className="dashboard__party-field-label">{label}</span>
                    <span className="dashboard__party-field-fixed">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard__party dashboard__party--date">
              <h4 className="dashboard__party-title">Quote Date</h4>
              <label className="dashboard__party-field">
                <span className="dashboard__party-field-label">Date</span>
                <input
                  type="date"
                  value={inputs.quoteDate}
                  onChange={(e) => onUpdate({ quoteDate: e.target.value })}
                />
              </label>
            </section>
          </div>

          <button type="button" className="btn-cta dashboard__start" onClick={onStart}>
            Start Calculation <ArrowRightIcon />
          </button>
        </div>

        <div className="dashboard__hero-image">
          <img src={HERO_MODEL.photo} alt={HERO_MODEL.displayName} />
        </div>
      </div>

      <div className="dashboard__footer">
        {FEATURES.map(({ Icon, title, body }) => (
          <div className="dashboard__feature" key={title}>
            <Icon className="dashboard__feature-icon" />
            <div>
              <h5>{title}</h5>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
