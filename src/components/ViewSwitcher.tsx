import type { BrainSurface } from '../types';

const TAB_LABELS: Record<BrainSurface, string> = {
  brain: 'Brain',
  diary: 'Diary',
};

export function ViewSwitcher({
  value,
  onChange,
  compact = false,
  className,
}: {
  value: BrainSurface;
  onChange: (value: BrainSurface) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        'view-switcher',
        compact ? 'view-switcher--compact' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="tablist"
      aria-label="Visões principais"
    >
      {(Object.keys(TAB_LABELS) as BrainSurface[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            className={`view-switcher__button ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(key)}
          >
            {TAB_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
