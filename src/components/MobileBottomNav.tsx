import type { BrainSurface } from '../types';

export function MobileBottomNav({
  surface,
  onSurfaceChange,
  onOpenInspector,
  inspectorAvailable,
  inspectorOpen,
}: {
  surface: BrainSurface;
  onSurfaceChange: (value: BrainSurface) => void;
  onOpenInspector: () => void;
  inspectorAvailable: boolean;
  inspectorOpen: boolean;
}) {
  return (
    <nav className="bottom-nav" aria-label="Navegação rápida">
      <button
        type="button"
        className={`bottom-nav__button ${surface === 'brain' ? 'is-active' : ''}`}
        aria-current={surface === 'brain' ? 'page' : undefined}
        onClick={() => onSurfaceChange('brain')}
      >
        Brain
      </button>
      <button
        type="button"
        className={`bottom-nav__button ${surface === 'diary' ? 'is-active' : ''}`}
        aria-current={surface === 'diary' ? 'page' : undefined}
        onClick={() => onSurfaceChange('diary')}
      >
        Diary
      </button>
      <button
        type="button"
        className={`bottom-nav__button ${inspectorOpen ? 'is-active' : ''} ${inspectorAvailable ? '' : 'is-disabled'}`}
        onClick={onOpenInspector}
        disabled={!inspectorAvailable}
      >
        Detalhe
      </button>
    </nav>
  );
}
