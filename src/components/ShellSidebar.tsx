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
}: {
  surface: BrainSurface;
  onSurfaceChange: (value: BrainSurface) => void;
  syncLabel: string;
  totalCount: number;
  visibleCount: number;
  relationCount: number;
}) {
  return (
    <aside className="shell-sidebar">
      <div className="shell-sidebar__brand">
        <p className="shell-sidebar__eyebrow">Lurdex</p>
        <h2>memory-lp</h2>
        <p className="shell-sidebar__subtitle">visão de cérebro, diário e inspeção</p>
      </div>

      <ViewSwitcher value={surface} onChange={onSurfaceChange} compact />

      <div className="shell-sidebar__metrics">
        <div>
          <span className="shell-sidebar__metric-label">Totais</span>
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
        <p>Atualização automática a partir do snapshot exportado.</p>
      </div>

      <div className="shell-sidebar__note">
        <p>Use Brain para explorar a malha relacional, Diary para navegar cronologicamente e Inspector para abrir a anatomia de cada memória.</p>
      </div>
    </aside>
  );
}
