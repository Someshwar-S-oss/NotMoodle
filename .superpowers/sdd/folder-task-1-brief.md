# Task 1: Create the <Folder /> Component & Styles

## Files
- Create: `src/components/Folder.tsx`
- Create: `src/components/Folder.css`
- Test: `src/__tests__/Folder.test.tsx`

## Requirements
1. **Interfaces & Props (`src/components/Folder.tsx`)**:
   ```typescript
   export interface FolderProps {
     color?: string;
     size?: number;
     items?: React.ReactNode[];
     className?: string;
     open?: boolean;
     onToggle?: (open: boolean) => void;
     interactive?: boolean;
   }
   ```
2. **Implementation Details**:
   - Must be a client component (`"use client"`).
   - Implement `darkenColor(hex: string, percent: number)` utility.
   - Max 3 paper items rendered inside `.folder__back`.
   - Magnetic hover effect on papers when folder is open (`handlePaperMouseMove`, `handlePaperMouseLeave` calculating `--magnet-x` and `--magnet-y`).
   - Accessible keyboard handler on folder (`Enter` or `Space` toggles open state when interactive).
   - If `open` prop is provided, honor it (controlled mode), else fall back to local `[openState, setOpenState]`.
   - Prop `interactive` (default `true`). When set to `false`, folder does not intercept click/keyboard events, allowing parent components/links to handle navigation cleanly.
   - CSS variables:
     `--folder-color: color`, `--folder-back-color: folderBackColor`, `--paper-1`, `--paper-2`, `--paper-3`.
3. **CSS Styles (`src/components/Folder.css`)**:
   - Provide full React Bits 3D perspective, paper positioning, hover/open skew effects, and paper hover scale.
   - Add `@media (prefers-reduced-motion: reduce)` block disabling 3D transforms, skewing, and transitions.
4. **Unit Tests (`src/__tests__/Folder.test.tsx`)**:
   - Test basic rendering with default and custom color (`--folder-color`).
   - Test rendering custom paper items.
   - Test keyboard interaction (`Enter` / `Space`) toggling `aria-expanded`.
   - Test scale transformation (`transform: scale(...)`).
   - Test controlled `open` prop.
5. **Verification**:
   - Run `npx jest src/__tests__/Folder.test.tsx` and `npm run build`.
   - All tests pass, zero TypeScript build errors.
   - Commit with message: `feat: add React Bits Folder component and styles`.
