import type { BrainSurface } from '../types';

const TAB_LABELS: Record<BrainSurface, string> = {
  brain: 'Brain',
  diary: 'Diary',
  inspector: 'Inspector',
};

export function ViewSwitcher({
  value,
  onChange,
  compact = false,
}: {
  value: BrainSurface;
  onChange: (value: BrainSurface) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'view-switcher view-switcher--compact' : 'view-switcher'} role="group" aria-label="Navegação principal">
      {(Object.keys(TAB_LABELS) as BrainSurface[]).map((key) => (
        <button
          key={key}
          type="button"
          className={`view-switcher__button ${value === key ? 'is-active' : ''}`}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {TAB_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
