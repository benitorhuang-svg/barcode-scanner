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
      id: Date.now(),
      time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      format,
      value,
    };
    this.entries.unshift(entry);
    this.notify();
    return entry;
  }

  remove(id: number): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.notify();
  }

  clear(): void {
    this.entries = [];
    this.notify();
  }

  getAll(): readonly ScanEntry[] {
    return this.entries;
  }

  get count(): number {
    return this.entries.length;
  }

  hasDuplicate(value: string): boolean {
    return this.entries.some((e) => e.value === value);
  }
}

/** Singleton store instance */
export const scanStore = new ScanStore();
