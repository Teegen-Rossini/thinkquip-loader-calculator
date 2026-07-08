import { ELECTRIC_MACHINE } from '../data/machinesConfig';
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
  { Icon: ConfidenceIcon, title: 'Calculations', body: 'Follow every step of the maths behind the figures.' },
  { Icon: SpecSheetIcon, title: 'Spec Sheet', body: 'Download a detailed spec sheet and full cost breakdown.' },
  { Icon: BrochureIcon, title: 'Personalised Brochure', body: 'Print or save your personalised results to PDF.' },
];

const FEATURES = [
  { Icon: ShieldIcon, title: 'Accurate Cost Model', body: 'Real-world escalation over operating hours' },
  { Icon: LifecycleIcon, title: 'Lifecycle Planning', body: 'Battery replacement and routine service' },
  { Icon: ConfidenceIcon, title: 'Transparent Maths', body: 'Every step shown on the Calculations tab' },
  { Icon: ResearchIcon, title: 'Research Based', body: 'SANY data and transparent assumptions' },
];

export default function Dashboard({ onStart }) {
  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <div className="dashboard__copy">
          <span className="dashboard__eyebrow">Welcome to the</span>
          <h1 className="dashboard__headline">
            SANY Fleet Savings<br /><span className="dashboard__headline-accent">Calculator</span>
          </h1>
          <p className="dashboard__subhead">
            Compare the SANY SW956E electric vs SYL956H5 diesel wheel loader over 20,000 operating hours.
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

          <button type="button" className="btn-cta dashboard__start" onClick={onStart}>
            Start Calculation <ArrowRightIcon />
          </button>
        </div>

        <div className="dashboard__hero-image">
          <img src={ELECTRIC_MACHINE.photo} alt="SANY SW956E electric wheel loader" />
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
