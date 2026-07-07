import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { ScanHistory } from '@/domain/scanning/ScanHistory';
import { ScanRecord } from '@/domain/scanning/ScanRecord';
import { BarcodeData } from '@/domain/scanning/BarcodeData';
import type { ScanRepositoryPort } from '@/application/scanning/ports/ScanRepositoryPort';

interface ScanDB extends DBSchema {
  scans: {
    key: string;
    value: {
      id: string;
      text: string;
      format: string;
      timestamp: number;
    };
    indexes: { 'by-time': number };
  };
}

export class IndexedDbScanRepository implements ScanRepositoryPort {
  private history: ScanHistory;
  private dbPromise: Promise<IDBPDatabase<ScanDB>>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.history = new ScanHistory();
    this.dbPromise = openDB<ScanDB>('barcode-scanner-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('scans')) {
          const store = db.createObjectStore('scans', { keyPath: 'id' });
          store.createIndex('by-time', 'timestamp');
        }
      },
    });

  }

  async init(): Promise<void> {
    try {
      const db = await this.dbPromise;
      const allRecords = await db.getAllFromIndex('scans', 'by-time');
      
      // Convert to domain entities and sort newest first
      const records = allRecords
        .map(r => {
          const barcode = new BarcodeData(r.text, r.format);
          return new ScanRecord(barcode, r.id, new Date(r.timestamp));
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
      this.history = new ScanHistory(records);
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to init IndexedDB Scan Repository:', err);
    }
  }

  save(record: ScanRecord): void {
    this.history.addRecord(record);
    this.notifyListeners();

    this.dbPromise.then(db => {
      db.put('scans', {
        id: record.id,
        text: record.barcode.text,
        format: record.barcode.format,
        timestamp: record.timestamp.getTime(),
      });
    }).catch(console.error);
  }

  getAll(): ReadonlyArray<ScanRecord> {
    return this.history.getAll();
  }

  clear(): void {
    this.history.clear();
    this.notifyListeners();
    
    this.dbPromise.then(db => {
      db.clear('scans');
    }).catch(console.error);
  }

  get count(): number {
    return this.history.count;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}
