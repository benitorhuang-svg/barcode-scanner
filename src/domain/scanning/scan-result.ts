export interface ScanTextResult {
  text: string;
}

export interface ScanResult extends ScanTextResult {
  format: string;
}

export interface ScanEntry {
  id: number;
  time: string;
  format: string;
  value: string;
}

export interface ScanEntryInput {
  format: string;
  value: string;
}

export function normalizeScanText(value: string): string {
  return value.trim();
}

function normalizeComparableText(value: string): string {
  return normalizeScanText(value).replace(/\s+/g, ' ');
}

export function isScanTextFragment(
  candidateValue: string,
  referenceValue: string,
): boolean {
  const candidate = normalizeComparableText(candidateValue);
  const reference = normalizeComparableText(referenceValue);

  return (
    candidate.length > 0 &&
    candidate.length < reference.length &&
    reference.includes(candidate)
  );
}

export function compactScanResults<T extends ScanTextResult>(
  results: readonly T[],
): T[] {
  const uniqueResults: T[] = [];
  const seenTexts = new Set<string>();

  for (const result of results) {
    const text = normalizeScanText(result.text);
    if (!text || seenTexts.has(text)) continue;

    seenTexts.add(text);
    uniqueResults.push({ ...result, text });
  }

  return uniqueResults.filter(
    (candidate) =>
      !uniqueResults.some(
        (reference) =>
          reference !== candidate &&
          isScanTextFragment(candidate.text, reference.text),
      ),
  );
}
