import type { BrainSurface } from '../types';

const TABS: Array<{ value: BrainSurface; label: string }> = [
  { value: 'brain', label: 'Brain' },
  { value: 'diary', label: 'Diary' },
  { value: 'inspector', label: 'Inspector' },
];

export function MobileBottomNav({
  value,
  onChange,
  inspectorLabel,
}: {
  value: BrainSurface;
  onChange: (value: BrainSurface) => void;
  inspectorLabel: string;
}) {
  return (
    <nav className="bottom-nav" aria-label="Navegação inferior">
      {TABS.map((tab) => {
        const active = value === tab.value;
        const label = tab.value === 'inspector' ? inspectorLabel : tab.label;
        return (
          <button
            key={tab.value}
            type="button"
            className={`bottom-nav__button ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(tab.value)}
          >
            <span className="bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
