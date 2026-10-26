import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface StripCell {
  label: string;
  value: ReactNode;
}

/** Полоса из трёх ячеек с пунктирными разделителями (прототип 05: «Осталось, Трафик, Устройства»). */
export function SummaryStrip({ cells }: { cells: StripCell[] }) {
  return (
    <div className="og-strip" data-testid="og-strip">
      {cells.map((cell) => (
        <div key={cell.label}>
          <div className="og-eyebrow">{cell.label}</div>
          <div className="og-strip-v">{cell.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Блок с пунктирной рамкой и кнопкой «Помощь», ведёт в поддержку. */
export function HelpBlock({
  title,
  text,
  button,
}: {
  title: string;
  text: string;
  button: string;
}) {
  return (
    <div className="og-help" data-testid="og-help">
      <div>
        <b>{title}</b>
        <div className="og-sm">{text}</div>
      </div>
      <Link to="/support" className="og-btn og-btn-sm og-btn-ghost">
        {button}
      </Link>
    </div>
  );
}
