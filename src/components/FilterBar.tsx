import type { ImportanceLevel, MemoryCategory, MemoryFilters, PeriodFilter } from '../types';
import { ChipButton, SectionHeader } from './common';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

function renderLabel(label: string, count?: number): string {
  return typeof count === 'number' ? `${label} (${count})` : label;
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
    <div className="filters-panel__group">
      <p className="filters-panel__label">{label}</p>
      <div className="filters-panel__chips" role="group" aria-label={label}>
        {options.map((option) => (
          <ChipButton
            key={option.value}
            active={value === option.value}
            label={renderLabel(option.label, option.count)}
            onClick={() => onPick(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export function FilterBar({
  filters,
  categoryOptions,
  importanceOptions,
  sourceOptions,
  periodOptions,
  entityOptions,
  tagOptions,
  onChange,
  onClear,
}: {
  filters: MemoryFilters;
  categoryOptions: FilterOption[];
  importanceOptions: FilterOption[];
  sourceOptions: FilterOption[];
  periodOptions: FilterOption[];
  entityOptions: FilterOption[];
  tagOptions: FilterOption[];
  onChange: (patch: Partial<MemoryFilters>) => void;
  onClear: () => void;
}) {
  return (
    <section className="filters-panel" aria-label="Filtros e recortes">
      <SectionHeader
        eyebrow="Recortes"
        title="Explorar por filtros"
        description="Combine categoria, importância, origem, período, tag e entidade."
        action={
          <button type="button" className="filters-panel__clear" onClick={onClear}>
            Limpar filtros
          </button>
        }
      />

      <div className="filters-panel__layout">
        <FilterGroup label="Categoria" options={categoryOptions} value={filters.category} onPick={(category) => onChange({ category: category as MemoryCategory | 'all' })} />
        <FilterGroup label="Importância" options={importanceOptions} value={filters.importance} onPick={(importance) => onChange({ importance: importance as ImportanceLevel | 'all' })} />
        <FilterGroup label="Origem" options={sourceOptions} value={filters.source} onPick={(source) => onChange({ source })} />
        <FilterGroup label="Período" options={periodOptions} value={filters.period} onPick={(period) => onChange({ period: period as PeriodFilter })} />
        <FilterGroup label="Entidades" options={entityOptions} value={filters.entity} onPick={(entity) => onChange({ entity })} />
        <FilterGroup label="Tags" options={tagOptions} value={filters.tag} onPick={(tag) => onChange({ tag })} />
      </div>
    </section>
  );
}
