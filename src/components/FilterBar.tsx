import type { ImportanceLevel, MemoryCategory, MemoryFilters, PeriodFilter } from '../types';
import { ChipButton, StatusPill } from './common';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

function FilterGroup({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onPick: (value: string) => void;
}) {
  return (
    <section className="filters-drawer__group" aria-label={label}>
      <p className="filters-drawer__label">{label}</p>
      <div className="filters-drawer__chips">
        {options.map((option) => (
          <ChipButton
            key={option.value}
            active={value === option.value}
            label={typeof option.count === 'number' ? `${option.label} · ${option.count}` : option.label}
            onClick={() => onPick(option.value)}
          />
        ))}
      </div>
    </section>
  );
}

export function FilterToolbar({
  activeLabels,
  onOpenFilters,
  onClear,
}: {
  activeLabels: string[];
  onOpenFilters: () => void;
  onClear: () => void;
}) {
  return (
    <div className="filters-toolbar" aria-label="Resumo dos filtros">
      <div className="filters-toolbar__copy">
        <p className="filters-toolbar__eyebrow">Filtros</p>
        <p className="filters-toolbar__title">Recortes ativos</p>
      </div>

      <div className="filters-toolbar__chips" aria-label="Filtros ativos">
        {activeLabels.length ? (
          activeLabels.map((label) => <StatusPill key={label} label={label} tone="accent" />)
        ) : (
          <StatusPill label="Tudo visível" tone="neutral" />
        )}
      </div>

      <div className="filters-toolbar__actions">
        <button type="button" className="toolbar-button" onClick={onOpenFilters}>
          Filtros
        </button>
        {activeLabels.length ? (
          <button type="button" className="toolbar-button toolbar-button--ghost" onClick={onClear}>
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FilterDrawer({
  open,
  mobile,
  filters,
  categoryOptions,
  importanceOptions,
  sourceOptions,
  periodOptions,
  entityOptions,
  tagOptions,
  onChange,
  onClear,
  onClose,
}: {
  open: boolean;
  mobile: boolean;
  filters: MemoryFilters;
  categoryOptions: FilterOption[];
  importanceOptions: FilterOption[];
  sourceOptions: FilterOption[];
  periodOptions: FilterOption[];
  entityOptions: FilterOption[];
  tagOptions: FilterOption[];
  onChange: (patch: Partial<MemoryFilters>) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className={`filters-drawer ${mobile ? 'filters-drawer--mobile' : 'filters-drawer--desktop'}`} role="dialog" aria-modal="true" aria-label="Filtros avançados">
      <button type="button" className="filters-drawer__backdrop" aria-label="Fechar filtros" onClick={onClose} />

      <aside className="filters-drawer__panel">
        <div className="filters-drawer__header">
          <div>
            <p className="filters-drawer__eyebrow">Filtros avançados</p>
            <h2>Refinar o recorte</h2>
            <p className="filters-drawer__description">Toque nos chips para combinar busca, categoria, importância, origem, período, entidade e tag.</p>
          </div>
          <div className="filters-drawer__header-actions">
            <button type="button" className="toolbar-button" onClick={onClear}>
              Limpar
            </button>
            <button type="button" className="toolbar-button toolbar-button--ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        <div className="filters-drawer__grid">
          <FilterGroup label="Categoria" options={categoryOptions} value={filters.category} onPick={(category) => onChange({ category: category as MemoryCategory | 'all' })} />
          <FilterGroup label="Importância" options={importanceOptions} value={filters.importance} onPick={(importance) => onChange({ importance: importance as ImportanceLevel | 'all' })} />
          <FilterGroup label="Origem" options={sourceOptions} value={filters.source} onPick={(source) => onChange({ source })} />
          <FilterGroup label="Período" options={periodOptions} value={filters.period} onPick={(period) => onChange({ period: period as PeriodFilter })} />
          <FilterGroup label="Entidades" options={entityOptions} value={filters.entity} onPick={(entity) => onChange({ entity })} />
          <FilterGroup label="Tags" options={tagOptions} value={filters.tag} onPick={(tag) => onChange({ tag })} />
        </div>
      </aside>
    </div>
  );
}
