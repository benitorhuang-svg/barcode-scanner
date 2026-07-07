# DDD 重構完成紀錄

日期：2026-07-07

## 完成範圍

- Phase 1：抽出 application ports
  - `ScanRepositoryPort`
  - `BarcodeDecoderPort`
  - `WebcamFrameSourcePort`
  - `ImageScannerPort`
  - `AudioFeedbackPort`
  - `ClipboardPort`
  - `DownloadPort`
  - `ClockPort`
  - Generation renderer/download/image-loader ports

- Phase 2：統一掃描 ingestion
  - 新增 `IngestScanResultUseCase`
  - Webcam 掃描與圖片掃描共用相同的去重、建檔與 repository 寫入流程
  - `paste-ui.ts` 不再直接建立 `BarcodeData`、`ScanRecord` 或呼叫 repository

- Phase 3：匯出規則 domain 化
  - `ExportAppService` 改為透過 `ClipboardPort` / `DownloadPort` 執行副作用
  - CSV BOM、header、escape、payload 建立集中於 `src/domain/scanning/scan-export.ts`

- Phase 4：產生器 application service
  - 新增 `BarcodeGeneratorAppService`
  - `generator-ui.ts` 不再直接呼叫 infrastructure renderer/download/image-loader
  - renderer、download、image loader 改由 composition root 注入

- Phase 5：收斂事件與 UI 邊界
  - 移除 static `DomainEvents`
  - `ScanHistory` 不再觸發全域事件
  - repository 在 `save()` / `clear()` 後自行通知 subscribers
  - 最新掃描 banner 與 flash feedback 由 `results-ui.ts` 透過 repository subscription 驅動

- Legacy 邊界清理
  - 刪除 `src/core/*`
  - 將支援格式清單移到 `src/domain/scanning/supported-barcode-formats.ts`
  - 將圖片掃描、format mapping、beep 實作移到 `src/infrastructure/*`

- UTF-8 文案檢查
  - 使用 Node UTF-8 讀取確認 `README.md`、`index.html`、`vite.config.ts` 與主要 UI 文案沒有 replacement/private-use mojibake
  - 修正圖片掃描 helper 中實際損壞的中文錯誤訊息
  - 更新 README 中已過期的 `src/core` 結構說明

- Playwright smoke test
  - 新增 `@playwright/test`
  - 新增 `playwright.config.ts`
  - 新增 `e2e/app.smoke.spec.ts`
  - 覆蓋 tab 切換、圖片 QR 掃描、CSV 下載、QR 產生器預覽

## 測試覆蓋

- `src/application/scanning/use-cases/__tests__/IngestScanResult.test.ts`
- `src/application/scanning/__tests__/WebcamScannerAppService.test.ts`
- `src/application/scanning/__tests__/ImageScannerAppService.test.ts`
- `src/application/generation/__tests__/BarcodeGeneratorAppService.test.ts`
- `src/domain/scanning/__tests__/scan-export.test.ts`
- `e2e/app.smoke.spec.ts`

## 驗證指令

```bash
npm.cmd run lint -- --fix
npm.cmd run lint
npm.cmd run type-check
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
```

## 完成標準

- `domain` 不依賴 UI、application、infrastructure、browser API、DOM、RxJS、IndexedDB 或 worker。
- `application` 不依賴 infrastructure concrete class。
- `ui` 不直接依賴 infrastructure 或 legacy `src/core`。
- `src/core/*` 已移除。
- static `DomainEvents` 已移除。
- Application service、domain policy 與 Playwright smoke test 均已補上。
