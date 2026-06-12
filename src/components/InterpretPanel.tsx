import { useState } from 'react';

interface Props {
  loading: boolean;
  onInterpret: (text: string) => void;
  itemCount: number;
}

const EXAMPLES = [
  '5 rolls white class 1 prismatic 1200mm, 3 rolls yellow 750mm',
  '10x Orafol IIIb yellow 1220mm, 5x white 762mm',
  '2 rolls application tape 1220mm, Spandex medium tack',
  'Laws Laser cutting A3 sheet, qty 20',
];

export default function InterpretPanel({ loading, onInterpret, itemCount }: Props) {
  const [input, setInput] = useState('');

  const submit = () => {
    const t = input.trim();
    if (!t || loading) return;
    onInterpret(t);
  };

  return (
    <div className="interpret-panel">
      <div className="interpret-body">
        <h2 className="interpret-title">What do you need to order?</h2>
        <p className="interpret-sub">
          Type items in plain language, item codes, or a mix. List multiple items separated by commas or new lines.
        </p>

        <textarea
          className="interpret-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder="e.g. 5 rolls 3M white prismatic 762mm, 2 rolls Orafol yellow 1220mm class IIIb, application tape 1200mm"
          rows={5}
          disabled={loading}
        />

        <div className="interpret-actions">
          <button className="btn-interpret" onClick={submit} disabled={loading || !input.trim()}>
            {loading ? (
              <><span className="spinner" /> Interpreting…</>
            ) : (
              <>Interpret →</>
            )}
          </button>
          {itemCount > 0 && (
            <span className="interpret-status">
              ✓ {itemCount} item{itemCount !== 1 ? 's' : ''} in current order
            </span>
          )}
        </div>

        <div className="interpret-examples">
          <span className="examples-label">Try:</span>
          {EXAMPLES.map(ex => (
            <button key={ex} className="example-chip" onClick={() => setInput(ex)} disabled={loading}>
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
