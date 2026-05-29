import type { BrainSurface } from '../types';
import { StatusPill } from './common';
import { ViewSwitcher } from './ViewSwitcher';

export function ShellSidebar({
  surface,
  onSurfaceChange,
  syncLabel,
  totalCount,
  visibleCount,
  relationCount,
  selectedTitle,
}: {
  surface: BrainSurface;
  onSurfaceChange: (value: BrainSurface) => void;
  syncLabel: string;
  totalCount: number;
  visibleCount: number;
  relationCount: number;
  selectedTitle: string;
}) {
  return (
    <aside className="shell-sidebar" aria-label="Visão geral do acervo">
      <div className="shell-sidebar__brand">
        <p className="shell-sidebar__eyebrow">Memory Brain & Diary Viewer</p>
        <h2>Memory</h2>
        <p className="shell-sidebar__subtitle">Exploração relacional do acervo da Lurdex.</p>
      </div>

      <ViewSwitcher value={surface} onChange={onSurfaceChange} compact className="shell-sidebar__switcher" />

      <div className="shell-sidebar__stats">
        <div>
          <span className="shell-sidebar__metric-label">Total</span>
          <strong>{totalCount}</strong>
        </div>
        <div>
          <span className="shell-sidebar__metric-label">Visíveis</span>
          <strong>{visibleCount}</strong>
        </div>
        <div>
          <span className="shell-sidebar__metric-label">Relações</span>
          <strong>{relationCount}</strong>
        </div>
      </div>

      <div className="shell-sidebar__status">
        <StatusPill label={syncLabel} tone="accent" />
        <p>Snapshot validado e pronto para leitura.</p>
      </div>

      <div className="shell-sidebar__selection">
        <p className="shell-sidebar__selection-label">Foco atual</p>
        <strong>{selectedTitle}</strong>
      </div>
    </aside>
  );
}
