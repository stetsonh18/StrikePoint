export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

/**
 * Sort array of objects by a key
 */
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig<T> | null
): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return data;
  }

  const sorted = [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key);
    const bValue = getNestedValue(b, sortConfig.key);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue<T>(obj: T, path: string | keyof T): unknown {
  if (typeof path === 'string' && path.includes('.')) {
    return path.split('.').reduce<unknown>((current, prop) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[prop];
      }
      return undefined;
    }, obj as unknown);
  }

  const key = typeof path === 'string' ? path : String(path);
  if (obj && typeof obj === 'object') {
    return (obj as Record<string, unknown>)[key];
  }

  return undefined;
}

/**
 * Toggle sort direction
 */
export function toggleSort<T>(
  currentSort: SortConfig<T> | null,
  key: keyof T | string
): SortConfig<T> | null {
  if (currentSort?.key === key) {
    // Cycle through: asc -> desc -> null
    if (currentSort.direction === 'asc') {
      return { key, direction: 'desc' };
    } else if (currentSort.direction === 'desc') {
      return null; // Clear sort
    }
  }
  return { key, direction: 'asc' };
}

/**
 * Get sort icon based on direction
 */
export function getSortIcon(direction: SortDirection): '↑' | '↓' | '⇅' {
  if (direction === 'asc') return '↑';
  if (direction === 'desc') return '↓';
  return '⇅';
}

