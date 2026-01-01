# Implementation Plan for Code Review Remediation (2025-12-19)

## Overview

This implementation plan addresses the issues identified in the code review dated 2025-12-19. The plan is organized into 5 phases that progressively fix theme compliance issues, reduce code duplication, and improve maintainability. Each phase delivers independently testable improvements and builds on previous phases.

## Phase Breakdown

### Phase 1: Theme Variable Fixes (High Priority)

**Objective**: Fix all hardcoded color values that break dark/light mode theming. This addresses all 4 high-priority issues from the code review.

**Tests to Write First**:

- `src/components/__tests__/theme-compliance.test.tsx`: Extend existing tests to verify semantic CSS variables
    ```typescript
    // Example test case - verify no dark-mode-only variables in components
    describe('Modal theme compliance', () => {
      it('uses semantic color variables instead of dark-X colors', () => {
        render(<RunLayoutsModal opened={true} onClose={jest.fn()} onApply={jest.fn()} is2DMode={false} />);
        const modal = screen.getByRole('dialog');
        const styles = getComputedStyle(modal);
        // Verify body uses --mantine-color-body not --mantine-color-dark-7
        expect(modal).not.toHaveStyle({ backgroundColor: 'var(--mantine-color-dark-7)' });
      });
    });
    ```

**Implementation**:

1. `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx:291`
    - Change: `color: "#ffffff"` → `color: "var(--mantine-color-text)"`

2. `src/components/RunLayoutsModal.tsx:153-169`
    - Change all `var(--mantine-color-dark-X)` to semantic equivalents:
        - `dark-7` → `var(--mantine-color-body)`
        - `dark-5` → `var(--mantine-color-default-border)`
        - `gray-1` → `var(--mantine-color-text)`
        - `gray-3` → `var(--mantine-color-dimmed)`

3. `src/components/ErrorFallback.tsx:15`
    - Change: `var(--mantine-color-dark-8)` → `var(--mantine-color-body)`

4. `src/components/sidebar/node-controls/NodeShapeControl.tsx:7-10`
    - Remove duplicate `ShapeConfig` interface
    - Add import: `import type {ShapeConfig} from "../../../types/style-layer";`

**Dependencies**:

- External: None
- Internal: None

**Verification**:

1. Run: `npm run test:ci -- --testPathPattern="theme-compliance"`
2. Run: `npm run storybook` and toggle between light/dark mode
3. Expected: All modals and panels render correctly in both themes

---

### Phase 2: Create Shared Utilities

**Objective**: Create reusable hooks and constants to reduce code duplication. This creates the foundation for subsequent phases.

**Tests to Write First**:

- `src/hooks/__tests__/useLocalValue.test.ts`: Test the new local value hook

    ```typescript
    describe("useLocalValue", () => {
        it("syncs local state with external prop changes", () => {
            const { result, rerender } = renderHook(({ value }) => useLocalValue(value, 10), {
                initialProps: { value: 5 },
            });

            expect(result.current.localValue).toBe(5);

            rerender({ value: 15 });
            expect(result.current.localValue).toBe(15);
        });

        it("returns parsed numeric value on commit", () => {
            const { result } = renderHook(() => useLocalValue(5, 5));

            act(() => {
                result.current.setLocalValue("10.5");
            });

            const committed = result.current.commitValue();
            expect(committed).toBe(10.5);
        });

        it("returns fallback for invalid input", () => {
            const { result } = renderHook(() => useLocalValue(5, 5));

            act(() => {
                result.current.setLocalValue("invalid");
            });

            const committed = result.current.commitValue();
            expect(committed).toBe(5); // fallback
        });
    });
    ```

- `src/constants/__tests__/colors.test.ts`: Test color constants
    ```typescript
    describe("SWATCH_COLORS", () => {
        it("contains valid hex colors", () => {
            SWATCH_COLORS.forEach((color) => {
                expect(color).toMatch(/^#[0-9A-Fa-f]{6,8}$/);
            });
        });
    });
    ```

**Implementation**:

1. `src/hooks/useLocalValue.ts` (New file):

    ```typescript
    import { useEffect, useState } from "react";

    export interface UseLocalValueResult {
        localValue: string | number;
        setLocalValue: (value: string | number) => void;
        commitValue: () => number;
    }

    /**
     * Hook for managing local input state that syncs with external prop.
     * Useful for NumberInput blur-on-commit pattern.
     */
    export function useLocalValue(externalValue: number, fallbackValue: number): UseLocalValueResult {
        const [localValue, setLocalValue] = useState<string | number>(externalValue);

        useEffect(() => {
            setLocalValue(externalValue);
        }, [externalValue]);

        const commitValue = (): number => {
            return typeof localValue === "string" ? parseFloat(localValue) || fallbackValue : localValue;
        };

        return { localValue, setLocalValue, commitValue };
    }
    ```

2. `src/constants/colors.ts` (New file):

    ```typescript
    /**
     * Standard color swatches for color pickers throughout the application.
     * Used by CompactColorInput, StyleColorInput, and GradientEditor.
     */
    export const SWATCH_COLORS = ["#5B8FF9", "#FF6B6B", "#61D095", "#F7B731", "#9B59B6"] as const;

    /**
     * Swatches with alpha channel for HEXA color pickers.
     */
    export const SWATCH_COLORS_HEXA = [
        "#5B8FF9FF",
        "#FF6B6BFF",
        "#61D095FF",
        "#F7B731FF",
        "#9B59B6FF",
        "#5B8FF980",
        "#FF6B6B80",
        "#61D09580",
        "#F7B73180",
        "#9B59B680",
    ] as const;

    /**
     * Default color for new gradient stops.
     */
    export const DEFAULT_GRADIENT_STOP_COLOR = "#888888";
    ```

3. `src/utils/modal-styles.ts` (New file):

    ```typescript
    import type { MantineStyleProp } from "@mantine/core";

    /**
     * Standard modal styles for consistent theming across all modals.
     */
    export const standardModalStyles = {
        header: {
            backgroundColor: "var(--mantine-color-body)",
            borderBottom: "1px solid var(--mantine-color-default-border)",
        },
        body: {
            backgroundColor: "var(--mantine-color-body)",
            padding: "var(--mantine-spacing-md)",
        },
        content: {
            backgroundColor: "var(--mantine-color-body)",
        },
        title: {
            fontWeight: 500,
        },
    } as const;
    ```

4. Update `src/hooks/index.ts`:

    ```typescript
    export { useLocalValue } from "./useLocalValue";
    // ... existing exports
    ```

5. Add "icosphere" to `src/constants/style-options.ts`:
    ```typescript
    // In the "Spherical" group, add:
    {value: "icosphere", label: "Icosphere"},
    ```

**Dependencies**:

- External: None
- Internal: None

**Verification**:

1. Run: `npm run test:ci -- --testPathPattern="useLocalValue|colors"`
2. Run: `npm run typecheck`
3. Expected: All new tests pass, no type errors

---

### Phase 3: Apply Shared Utilities to Components

**Objective**: Refactor existing components to use the new shared utilities from Phase 2, reducing code duplication.

**Tests to Write First**:

- Existing tests should continue to pass. No new tests needed as this is a refactor.
- Run: `npm run test:ci -- --testPathPattern="EdgeLineControl|EdgeArrowControl|NodeShapeControl"`

**Implementation**:

1. `src/components/sidebar/edge-controls/EdgeLineControl.tsx`:
    - Replace local state pattern with `useLocalValue` hook
    - Before:
        ```typescript
        const [localWidth, setLocalWidth] = useState<string | number>(value.width);
        useEffect(() => {
            setLocalWidth(value.width);
        }, [value.width]);
        const handleWidthBlur = (): void => {
            const width = typeof localWidth === "string" ? parseFloat(localWidth) || value.width : localWidth;
            // ...
        };
        ```
    - After:

        ```typescript
        import { useLocalValue } from "../../../hooks";

        const {
            localValue: localWidth,
            setLocalValue: setLocalWidth,
            commitValue: commitWidth,
        } = useLocalValue(value.width, value.width);

        const handleWidthBlur = (): void => {
            const width = commitWidth();
            if (width !== value.width) {
                onChange({ ...value, width });
            }
        };
        ```

2. `src/components/sidebar/edge-controls/EdgeArrowControl.tsx`:
    - Apply same pattern as EdgeLineControl

3. `src/components/sidebar/node-controls/NodeShapeControl.tsx`:
    - Apply same pattern for size input

4. `src/components/sidebar/controls/CompactColorInput.tsx`:
    - Replace inline swatches with imported constant:

    ```typescript
    import { SWATCH_COLORS_HEXA } from "../../../constants/colors";
    // ...
    swatches = { SWATCH_COLORS_HEXA };
    ```

5. `src/components/sidebar/controls/StyleColorInput.tsx`:
    - Same swatch replacement

6. `src/components/sidebar/controls/GradientEditor.tsx:50`:
    - Replace hardcoded `#888888` with:
    ```typescript
    import { DEFAULT_GRADIENT_STOP_COLOR } from '../../../constants/colors';
    // ...
    color: DEFAULT_GRADIENT_STOP_COLOR,
    ```

**Dependencies**:

- External: None
- Internal: Phase 2 (shared utilities must exist)

**Verification**:

1. Run: `npm run test:ci`
2. Run: `npm run lint`
3. Run: `npm run storybook` and verify color inputs work correctly
4. Expected: All tests pass, no lint errors, UI behaves identically

---

### Phase 4: Modal Styling Consolidation

**Objective**: Apply shared modal styles to all modals, eliminating repeated styling code.

**Tests to Write First**:

- `src/components/__tests__/modal-styles.test.tsx`:

    ```typescript
    describe('Modal styling consistency', () => {
      it('RunLayoutsModal uses standard modal styles', async () => {
        render(<RunLayoutsModal opened={true} ... />);
        const header = screen.getByRole('dialog').querySelector('.mantine-Modal-header');
        expect(header).toHaveStyle({ backgroundColor: 'var(--mantine-color-body)' });
      });

      it('ViewDataModal uses standard modal styles', async () => {
        render(<ViewDataModal opened={true} ... />);
        // Similar assertions
      });
    });
    ```

**Implementation**:

1. `src/components/RunLayoutsModal.tsx`:

    ```typescript
    import { standardModalStyles } from '../utils/modal-styles';
    // ...
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Run Layout"
      size="md"
      centered
      styles={standardModalStyles}
    >
    ```

    - Also remove unnecessary `handleClose` wrapper (line 116-118), use `onClose` directly

2. `src/components/data-view/ViewDataModal.tsx`:

    ```typescript
    import { standardModalStyles } from "../../utils/modal-styles";
    // ...
    styles = { standardModalStyles };
    ```

3. `src/components/LoadDataModal.tsx`:
    - Already uses semantic variables, but apply standardModalStyles for consistency

**Dependencies**:

- External: None
- Internal: Phase 2 (`modal-styles.ts` must exist)

**Verification**:

1. Run: `npm run test:ci -- --testPathPattern="modal"`
2. Toggle between light/dark mode in Storybook
3. Expected: All modals have consistent styling in both themes

---

### Phase 5: Code Cleanup and Documentation

**Objective**: Address remaining low-priority issues, remove dead code, and update documentation.

**Tests to Write First**:

- No new tests needed. This phase focuses on cleanup that existing tests cover.

**Implementation**:

1. `src/components/Graphty.tsx:96`:
    - Move hardcoded fallback color `#5b8ff9` to constants
    - Add to `src/constants/colors.ts`:
        ```typescript
        export const DEFAULT_GRAPH_NODE_COLOR = "#5B8FF9";
        ```

2. `src/components/data-view/mantineTheme.ts:41`:
    - Remove deprecated `mantineJsonGridTheme` export or add deprecation notice

3. `src/components/layout/AppLayout.tsx`, `LeftSidebar.tsx`, `RightSidebar.tsx`:
    - Add to `src/constants/layout.ts` (New file):
        ```typescript
        export const SIDEBAR_WIDTH = 250;
        export const RIGHT_SIDEBAR_WIDTH = 300;
        ```
    - Update components to use these constants

4. Update `CLAUDE.md` with architecture details:
    - Add section on component structure
    - Document styling conventions
    - Note Mantine integration patterns

5. Create GitHub issues for remaining TODO comments:
    - `NodeLabelControl.tsx:15-20`
    - `EdgeLabelControl.tsx:15-20`
    - `NodeTooltipControl.tsx:15-20`
    - `EdgeTooltipControl.tsx:15-20`

**Dependencies**:

- External: None
- Internal: Phase 2 (colors.ts must exist)

**Verification**:

1. Run: `npm run ready:commit`
2. Verify all lint, build, and test commands pass
3. Expected: Clean codebase ready for production

---

## Common Utilities Summary

| Utility                                | Purpose                      | Used By                                                                 |
| -------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `useLocalValue`                        | Input blur-on-commit pattern | EdgeLineControl, EdgeArrowControl, NodeShapeControl, NodeEffectsControl |
| `standardModalStyles`                  | Consistent modal theming     | RunLayoutsModal, LoadDataModal, ViewDataModal                           |
| `SWATCH_COLORS` / `SWATCH_COLORS_HEXA` | Color picker swatches        | CompactColorInput, StyleColorInput, GradientEditor                      |
| `DEFAULT_GRADIENT_STOP_COLOR`          | New gradient stop color      | GradientEditor                                                          |

---

## External Libraries Assessment

No new external libraries are needed. The existing Mantine library provides all necessary functionality for theming and styling.

---

## Risk Mitigation

| Risk                            | Mitigation                                                 |
| ------------------------------- | ---------------------------------------------------------- |
| Breaking existing functionality | Each phase has verification steps with existing tests      |
| Theme inconsistency             | Visual verification in Storybook for both light/dark modes |
| Type errors from refactoring    | Run `npm run typecheck` after each phase                   |
| Regression in compact sizing    | Existing regression tests cover compact component styles   |

---

## Implementation Notes

1. **Order matters**: Phases must be completed in order as later phases depend on utilities created in Phase 2.

2. **Backwards compatibility**: The `ShapeConfig` removal in Phase 1 is safe because the type is already exported from `types/style-layer.ts`.

3. **No breaking changes**: All changes are internal refactoring; the public API remains unchanged.

4. **Testing strategy**: Existing tests provide good coverage. New tests focus on the new utilities rather than re-testing existing functionality.

---

_Plan created: 2025-12-19_
_Based on: code-review-20251219.md_
