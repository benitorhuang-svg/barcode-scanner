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
    this.notify();
    return entry;
  }

  remove(id: number): void {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return;

    this.entries = this.entries.filter((e) => e.id !== id);
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
