import type { ReactNode } from 'react';

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClassNames('section-header', className)}>
      <div className="section-header__copy">
        {eyebrow ? <p className="section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="section-header__title">{title}</h2>
        {description ? <p className="section-header__description">{description}</p> : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: 'default' | 'accent' | 'calm';
}) {
  return (
    <article className={joinClassNames('metric-tile', `metric-tile--${tone}`)}>
      <span className="metric-tile__label">{label}</span>
      <strong className="metric-tile__value">{value}</strong>
      {note ? <span className="metric-tile__note">{note}</span> : null}
    </article>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'warning' | 'danger' | 'accent';
}) {
  return <span className={joinClassNames('status-pill', `status-pill--${tone}`)}>{label}</span>;
}

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state" role="status" aria-live="polite">
      {eyebrow ? <p className="empty-state__eyebrow">{eyebrow}</p> : null}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </section>
  );
}

export function ChipButton({
  active,
  label,
  onClick,
  title,
}: {
  active?: boolean;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={joinClassNames('chip-button', active && 'is-active')}
      aria-pressed={Boolean(active)}
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  );
}

export function TextBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="text-block">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </div>
  );
}
