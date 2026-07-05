# TypeScript 規範 (TypeScript Rules)
- **必須採用嚴謹的型別定義 (Strict Typing)**：撰寫 TypeScript 時，必須盡可能使用明確的型別，不得偷懶。
- **禁用 `any`**：除非萬不得已，否則絕不使用 `any` 型別。如果遇到動態引入或不明確的型別，應該使用 `unknown` 並進行型別縮小 (Type Narrowing)，或是匯入官方的 Type 定義。
- **禁止使用 `eslint-disable` 掩蓋錯誤**：嚴禁使用 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 等方式來關閉 ESLint 檢查，必須從根本解決型別報錯。
- **清理未使用的變數**：沒有用到的變數（例如 `catch (err)` 裡的 `err`）必須移除或是以 `_` 前綴處理，以符合最嚴格的 Linting 規範。
