import type { ReactNode } from 'react';

export type PillTone = 'neutral' | 'good' | 'warning' | 'danger' | 'accent';

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  return <span className={cx('token-pill', `token-pill--${tone}`)}>{label}</span>;
}

export function ChipButton({
  label,
  active = false,
  onClick,
  title,
  disabled = false,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx('chip-button', active && 'is-active')}
      aria-pressed={active}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {label}
    </button>
  );
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

export function LoadingState({ label = 'Abrindo o acervo…' }: { label?: string }) {
  return (
    <section className="empty-state empty-state--loading" aria-busy="true" aria-live="polite">
      <p className="empty-state__eyebrow">Carregando</p>
      <h3 className="empty-state__title">{label}</h3>
      <p className="empty-state__description">Lendo o snapshot, normalizando os dados e montando o índice, a timeline e a leitura.</p>
    </section>
  );
}

export function ErrorState({
  title = 'Não foi possível carregar as memórias',
  description = 'O snapshot não respondeu. Tente novamente em instantes.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="empty-state empty-state--error" role="alert">
      <p className="empty-state__eyebrow">Erro</p>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {onRetry ? (
        <div className="empty-state__action">
          <button type="button" className="ui-button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      ) : null}
    </section>
  );
}
