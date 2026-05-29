import type { BrainSurface } from '../types';
import { StatusPill } from './common';
import { ViewSwitcher } from './ViewSwitcher';

export function TopBar({
  surface,
  onSurfaceChange,
  query,
  onQueryChange,
  syncLabel,
  syncTone,
  totalCount,
  visibleCount,
  selectedTitle,
}: {
  surface: BrainSurface;
  onSurfaceChange: (value: BrainSurface) => void;
  query: string;
  onQueryChange: (value: string) => void;
  syncLabel: string;
  syncTone: 'neutral' | 'good' | 'warning' | 'danger' | 'accent';
  totalCount: number;
  visibleCount: number;
  selectedTitle: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <p className="topbar__eyebrow">Lurdex</p>
        <h1>Memory Console</h1>
        <p className="topbar__subtitle">Brain, Diary e Inspector em uma leitura operacional do acervo</p>
      </div>

      <label className="topbar__search search-field" htmlFor="global-search">
        <span>Buscar no acervo</span>
        <input
          id="global-search"
          type="search"
          placeholder="Título, conteúdo, data, tag ou entidade"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="topbar__meta">
        <StatusPill label={syncLabel} tone={syncTone} />
        <div className="topbar__counts" aria-label="Resumo do acervo">
          <span>
            <strong>{visibleCount}</strong> visíveis
          </span>
          <span>
            <strong>{totalCount}</strong> totais
          </span>
        </div>
        <p className="topbar__selected" aria-live="polite">
          {selectedTitle}
        </p>
      </div>

      <ViewSwitcher value={surface} onChange={onSurfaceChange} />
    </header>
  );
}
