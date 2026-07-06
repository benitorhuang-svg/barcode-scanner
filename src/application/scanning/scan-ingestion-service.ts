import type {
  ScanEntry,
  ScanEntryInput,
  ScanResult,
} from '../../domain/scanning/scan-result';
import { scanStore } from './scan-store';

interface IngestScanOptions {
  filterDuplicates: boolean;
}

export type IngestScanResultOutcome =
  | { status: 'added'; result: ScanResult; entry: ScanEntry }
  | { status: 'duplicate'; result: ScanResult };

export interface IngestScanBatchOutcome {
  results: readonly ScanResult[];
  addedEntries: readonly ScanEntry[];
  addedCount: number;
  duplicateCount: number;
  firstResult: ScanResult | null;
}

export function ingestScanResult(
  result: ScanResult,
  options: IngestScanOptions,
): IngestScanResultOutcome {
  if (options.filterDuplicates && scanStore.hasDuplicate(result.text)) {
    return { status: 'duplicate', result };
  }

  return {
    status: 'added',
    result,
    entry: scanStore.add(result.format, result.text),
  };
}

export function ingestScanResults(
  results: readonly ScanResult[],
  options: IngestScanOptions,
): IngestScanBatchOutcome {
  const seenInBatch = new Set<string>();
  const entriesToAdd: ScanEntryInput[] = [];
  let duplicateCount = 0;

  for (const result of results) {
    const isDuplicate =
      options.filterDuplicates &&
      (scanStore.hasDuplicate(result.text) || seenInBatch.has(result.text));

    if (isDuplicate) {
      duplicateCount += 1;
      continue;
    }

    seenInBatch.add(result.text);
    entriesToAdd.push({ format: result.format, value: result.text });
  }

  const addedEntries = scanStore.addMany(entriesToAdd);

  return {
    results,
    addedEntries,
    addedCount: addedEntries.length,
    duplicateCount,
    firstResult: results[0] ?? null,
  };
}
