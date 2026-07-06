import type { ScanEntry, ScanEntryInput } from '../../domain/scanning/scan-result';

export type { ScanEntry, ScanEntryInput };

export type StoreChange =
  | { type: 'add'; entry: ScanEntry }
  | { type: 'addMany'; entries: readonly ScanEntry[] }
  | { type: 'remove'; id: number }
  | { type: 'clear' };

type Listener = (change: StoreChange) => void;

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

  add(format: string, value: string): ScanEntry {
    const entry = this.unshiftEntry({ format, value });
    this.evictOverflow();
    this.notify({ type: 'add', entry });
    return entry;
  }

  addMany(items: readonly ScanEntryInput[]): ScanEntry[] {
    if (items.length === 0) return [];

    const entries = items.map((item) => this.unshiftEntry(item));
    this.evictOverflow();
    this.notify({ type: 'addMany', entries });
    return entries;
  }

  remove(id: number): void {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index === -1) return;

    const entry = this.entries[index];
    this.entries.splice(index, 1);
    this.decrementValue(entry.value);
    this.notify({ type: 'remove', id });
  }

  clear(): void {
    this.entries = [];
    this.valueCounts.clear();
    this.notify({ type: 'clear' });
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

  private notify(change: StoreChange): void {
    this.listeners.forEach((listener) => listener(change));
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

  private unshiftEntry(input: ScanEntryInput): ScanEntry {
    const entry: ScanEntry = {
      id: this.nextId++,
      time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      format: input.format,
      value: input.value,
    };

    this.entries.unshift(entry);
    this.valueCounts.set(
      input.value,
      (this.valueCounts.get(input.value) ?? 0) + 1,
    );
    return entry;
  }

  private evictOverflow(): void {
    while (this.entries.length > MAX_ENTRIES) {
      const evicted = this.entries.pop();
      if (evicted) this.decrementValue(evicted.value);
    }
  }
}

export const scanStore = new ScanStore();
