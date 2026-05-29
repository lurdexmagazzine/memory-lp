import type { ChangeEvent } from 'react';
import type { BrainSurface } from '../types';
import { StatusPill } from './common';
import { ViewSwitcher } from './ViewSwitcher';

export function TopBar({
  mobile,
  surface,
  onSurfaceChange,
  query,
  onQueryChange,
  syncLabel,
  syncTone,
  totalCount,
  visibleCount,
  selectedTitle,
  activeFilterCount,
  onOpenFilters,
  showSwitcher = true,
}: {
  mobile: boolean;
  surface: BrainSurface;
  onSurfaceChange: (value: BrainSurface) => void;
  query: string;
  onQueryChange: (value: string) => void;
  syncLabel: string;
  syncTone: 'neutral' | 'good' | 'warning' | 'danger' | 'accent';
  totalCount: number;
  visibleCount: number;
  selectedTitle: string;
  activeFilterCount: number;
  onOpenFilters: () => void;
  showSwitcher?: boolean;
}) {
  if (mobile) {
    const mobileSyncLabel = `${syncLabel} · ${visibleCount}/${totalCount}`;

    return (
      <header className="topbar topbar--mobile" aria-label="Cabeçalho do visor">
        <div className="topbar__brand topbar__brand--mobile">
          <div className="topbar__brand-row">
            <h1>Memory</h1>
            <div className="topbar__brand-meta">
              <StatusPill label={mobileSyncLabel} tone={syncTone} />
            </div>
          </div>
        </div>

        <div className="topbar__mobile-actions">
          <label className="search-field topbar__search topbar__search--mobile" htmlFor="global-search">
            <span className="sr-only">Buscar</span>
            <input
              id="global-search"
              type="search"
              placeholder="Buscar por título, tag, entidade ou data"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
            />
          </label>

          <button type="button" className="toolbar-button toolbar-button--ghost topbar__filters-button" onClick={onOpenFilters}>
            Filtros{activeFilterCount ? ` · ${activeFilterCount} ativos` : ''}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar topbar--desktop" aria-label="Cabeçalho do visor">
      <div className="topbar__brand">
        <p className="topbar__eyebrow">Memory Brain & Diary Viewer</p>
        <h1>Memory Brain & Diary Viewer</h1>
        <p className="topbar__subtitle">Brain primeiro. Diary legível. Inspector contextual.</p>
      </div>

      <label className="search-field topbar__search" htmlFor="global-search">
        <span>Buscar</span>
        <input
          id="global-search"
          type="search"
          placeholder="Título, conteúdo, data, tag ou entidade"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="topbar__meta">
        <div className="topbar__status-line">
          <StatusPill label={syncLabel} tone={syncTone} />
          <span className="topbar__counts">
            {visibleCount} de {totalCount}
          </span>
        </div>

        <p className="topbar__selected" aria-live="polite">
          {selectedTitle}
        </p>

        <div className="topbar__actions">
          {showSwitcher ? <ViewSwitcher value={surface} onChange={onSurfaceChange} compact className="topbar__switcher" /> : null}
          <button type="button" className="toolbar-button" onClick={onOpenFilters}>
            Filtros{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>
    </header>
  );
}
