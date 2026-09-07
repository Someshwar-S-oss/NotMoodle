# Task 1 Implementation Report: Create the <Folder /> Component & Styles

## Status
Completed

## Commit Details
- **Commit SHA:** `cce356a58541db0b3edbed7dc3af6e160090ffd3`
- **Commit Message:** `feat: add React Bits Folder component and styles`
- **Files Committed:**
  - `src/components/Folder.tsx`
  - `src/components/Folder.css`
  - `src/__tests__/Folder.test.tsx`

## Verification Summary
1. **Unit Tests (TDD):**
   - Red phase: Executed test prior to implementation; failed with `Cannot find module '../components/Folder'`.
   - Green phase: All 12 unit tests passing (`src/__tests__/Folder.test.tsx`).
   - Full repository test suite: 8 test suites passed, 67 tests passed, 0 failures (`npm test`).
2. **Production Build:**
   - `npm run build` completed successfully.
   - Zero TypeScript diagnostics / errors.

## Implementation Details
- **`Folder.tsx`**:
  - Defined `FolderProps` interface with `color`, `size`, `items`, `className`, `open`, `onToggle`, and `interactive`.
  - Implemented and exported `darkenColor` utility supporting hex strings with or without hash, 3-digit shorthand, and fraction/percentage darkening.
  - Sliced items to maximum of 3 papers, populating paper elements inside `.folder__back`.
  - Added magnetic coordinate offsets (`--magnet-x`, `--magnet-y`) on mouse movement over papers when folder is open.
  - Provided accessible keyboard handling (`Enter` and `Space` triggers toggle when interactive).
  - Provided controlled/uncontrolled state support via `open` and `internalOpen`.
  - Provided `interactive` flag (default `true`) allowing parent components/links to handle clicks without event interception when set to `false`.
- **`Folder.css`**:
  - Implemented 3D perspective, paper offsets, and open/hover skews.
  - Dynamic CSS variables: `--folder-color`, `--folder-back-color`, `--paper-1`, `--paper-2`, `--paper-3`.
  - Added `@media (prefers-reduced-motion: reduce)` override disabling all animations, 3D transforms, and transitions.
