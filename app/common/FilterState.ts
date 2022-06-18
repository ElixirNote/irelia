import { CellValue } from "app/common/DocActions";

// Filter object as stored in the db
export interface FilterSpec {
  included?: CellValue[];
  excluded?: CellValue[];
  min?: number;
  max?: number;
}


export type FilterState = ByValueFilterState | RangeFilterState

// A more efficient representation of filter state for a column than FilterSpec.
interface ByValueFilterState {
  include: boolean;
  values: Set<CellValue>;
}

interface RangeFilterState {
  min?: number;
  max?: number;
}

// Creates a FilterState. Accepts spec as a json string or a FilterSpec.
export function makeFilterState(spec: string | FilterSpec): FilterState {
  if (typeof (spec) === 'string') {
    return makeFilterState((spec && JSON.parse(spec)) || {});
  }
  if (spec.min !== undefined || spec.max !== undefined) {
    return {min: spec.min, max: spec.max};
  }
  return {
    include: Boolean(spec.included),
    values: new Set(spec.included || spec.excluded || []),
  };
}

// Returns true if state and spec are equivalent, false otherwise.
export function isEquivalentFilter(state: FilterState, spec: FilterSpec): boolean {
  const other = makeFilterState(spec);
  if (!isRangeFilter(state) && !isRangeFilter(other)) {
    if (state.include !== other.include) { return false; }
    if (state.values.size !== other.values.size) { return false; }
    if (other.values) {
      for (const val of other.values) { if (!state.values.has(val)) { return false; } }
    }
  } else {
    if (isRangeFilter(state) && isRangeFilter(other)) {
      if (state.min !== other.min || state.max !== other.max) { return false; }
    } else {
      return false;
    }
  }
  return true;
}

export function isRangeFilter(state: FilterState): state is RangeFilterState {
  const {min, max} = state as any;
  return min !== undefined || max !== undefined;
}
