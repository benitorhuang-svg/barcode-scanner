/**
 * Scan Store — centralized state management for scan results.
 * Single source of truth for all scanned barcode data.
 */

export interface ScanEntry {
  id: number;
  time: string;
  format: string;
  value: string;
}

type Listener = () => void;

/** Maximum number of scan entries to retain in memory. */
const MAX_ENTRIES = 500;

class ScanStore {
  private entries: ScanEntry[] = [];
  private nextId = 1;
  private valueCounts: Map<string, number> = new Map();
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  add(format: string, value: string): ScanEntry {
    const entry: ScanEntry = {
      id: this.nextId++,
      time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      format,
      value,
    };
    this.entries.unshift(entry);
    this.valueCounts.set(value, (this.valueCounts.get(value) ?? 0) + 1);

    // Evict oldest entries when exceeding capacity
    while (this.entries.length > MAX_ENTRIES) {
      const evicted = this.entries.pop();
      if (evicted) this.decrementValue(evicted.value);
    }

    this.notify();
    return entry;
  }

  remove(id: number): void {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index === -1) return;

    const entry = this.entries[index];
    this.entries.splice(index, 1);
    this.decrementValue(entry.value);
    this.notify();
  }

  clear(): void {
    this.entries = [];
    this.valueCounts.clear();
    this.notify();
  }

  getAll(): readonly ScanEntry[] {
    return this.entries;
  }

  get count(): number {
    return this.entries.length;
  }

  hasDuplicate(value: string): boolean {
    return this.valueCounts.has(value);
  }

  private decrementValue(value: string): void {
    const count = this.valueCounts.get(value);
    if (!count) return;

    if (count === 1) {
      this.valueCounts.delete(value);
    } else {
      this.valueCounts.set(value, count - 1);
    }
  }
}

/** Singleton store instance */
export const scanStore = new ScanStore();

