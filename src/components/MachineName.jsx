import './MachineName.css';

/**
 * A machine's name rendered with an industrial display face, where the leading
 * brand word "SANY" is swapped for the transparent SANY logo mark. Because
 * "SANY" is always the first word, the logo always sits at the same left edge,
 * so stacked names line up. The logo keeps its native aspect ratio and is
 * sized a touch above the model text's cap height so it reads as the brand mark.
 *
 * `as` picks the wrapper tag (e.g. 'h4' for card titles); defaults to a span.
 */
export default function MachineName({ machine, as: Tag = 'span', className = '', size }) {
  const model = (machine.displayName || machine.name || '').replace(/^SANY\s+/i, '');
  const style = size ? { fontSize: size } : undefined;
  return (
    <Tag className={`machine-name ${className}`.trim()} style={style}>
      <img src={machine.logo} alt="SANY" className="machine-name__logo" />
      <span className="machine-name__model">{model}</span>
    </Tag>
  );
}
