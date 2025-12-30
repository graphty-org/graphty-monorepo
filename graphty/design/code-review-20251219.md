# Code Review Report - 12/19/2025

## Executive Summary
- **Files reviewed**: 52 production files, 25+ test files
- **Critical issues**: 0
- **High priority issues**: 4
- **Medium priority issues**: 12
- **Low priority issues**: 8

The graphty React application is well-structured with good separation of concerns. The codebase demonstrates consistent patterns and good React practices. However, there are opportunities to improve Mantine theming compliance, reduce code duplication, and address some LLM-generated code patterns.

---

## File Inventory

### Production Code (src/)
| Category | Files |
|----------|-------|
| Components | 40+ files |
| Hooks | 1 file |
| Types | 4 files |
| Utils | 5 files |
| Constants | 2 files |
| Lib | 1 file |

### Test Code
| Category | Files |
|----------|-------|
| Component tests | 20+ files |
| Integration tests | 5+ files |
| Regression tests | 5+ files |

### Configuration
- `vite.config.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json`

---

## Critical Issues (Fix Immediately)

None identified. The codebase has no security vulnerabilities, data loss risks, or correctness issues that require immediate attention.

---

## High Priority Issues (Fix Soon)

### 1. Hardcoded Color Value in StyleLayerPropertiesPanel
- **Files**: `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx:291`
- **Description**: Uses hardcoded color `#ffffff` instead of Mantine CSS variable, breaking dark/light mode theming.
- **Example**:
```tsx
// Line 291
style={{fontSize: "12px", fontWeight: 500, color: "#ffffff", lineHeight: 1.2}}
```
- **Fix**:
```tsx
style={{fontSize: "12px", fontWeight: 500, color: "var(--mantine-color-text)", lineHeight: 1.2}}
```

### 2. Hardcoded Dark Theme Colors in RunLayoutsModal
- **Files**: `src/components/RunLayoutsModal.tsx:155-169`
- **Description**: Modal uses `var(--mantine-color-dark-7)`, `var(--mantine-color-dark-5)`, etc. instead of semantic color variables. This breaks light mode support.
- **Example**:
```tsx
styles={{
    header: {
        backgroundColor: "var(--mantine-color-dark-7)",
        borderBottom: "1px solid var(--mantine-color-dark-5)",
    },
    body: {
        backgroundColor: "var(--mantine-color-dark-7)",
    },
    // ...
}}
```
- **Fix**:
```tsx
styles={{
    header: {
        backgroundColor: "var(--mantine-color-body)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
    },
    body: {
        backgroundColor: "var(--mantine-color-body)",
    },
    // ...
}}
```

### 3. Hardcoded Color in ErrorFallback
- **Files**: `src/components/ErrorFallback.tsx:15`
- **Description**: Uses `var(--mantine-color-dark-8)` which doesn't exist in light mode.
- **Example**:
```tsx
backgroundColor: "var(--mantine-color-dark-8)",
```
- **Fix**:
```tsx
backgroundColor: "var(--mantine-color-body)",
```

### 4. Duplicate Type Definition in NodeShapeControl
- **Files**: `src/components/sidebar/node-controls/NodeShapeControl.tsx:7-10`
- **Description**: Defines `ShapeConfig` locally instead of importing from `types/style-layer.ts` where it's already defined.
- **Example**:
```tsx
// Local definition - should be removed
export interface ShapeConfig {
    type: string;
    size: number;
}
```
- **Fix**:
```tsx
import type {ShapeConfig} from "../../../types/style-layer";
```

---

## Medium Priority Issues (Technical Debt)

### 1. Inconsistent fontSize Values (Theme Best Practice)
- **Files**: Multiple sidebar components
- **Description**: Hardcoded pixel values like `fontSize: "11px"`, `fontSize: "9px"`, `fontSize: "10px"`, `fontSize: "12px"` instead of using Mantine's `size` prop or theme spacing.
- **Affected Files**:
  - `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx` (lines 281, 291, 309, 370)
  - `src/components/sidebar/panels/GraphPropertiesPanel.tsx` (lines 59, 70)
  - `src/components/sidebar/controls/StatRow.tsx` (lines 18, 21)
  - `src/components/sidebar/controls/CompactCheckbox.tsx` (line 13)
  - `src/components/layout/RightSidebar.tsx` (lines 56, 102)
- **Recommendation**: Create a theme extension with custom size variants or use Mantine's built-in sizes consistently.

### 2. Thin Wrapper Components with Nearly Identical Code
- **Files**:
  - `src/components/sidebar/node-controls/NodeLabelControl.tsx`
  - `src/components/sidebar/edge-controls/EdgeLabelControl.tsx`
  - `src/components/sidebar/node-controls/NodeTooltipControl.tsx`
  - `src/components/sidebar/edge-controls/EdgeTooltipControl.tsx`
- **Description**: These four files are nearly identical thin wrappers around `RichTextStyleEditor`. They differ only in the `label` prop value.
- **Recommendation**: Consider a single `LabelControl` component with a `type` prop, or remove these wrappers entirely and use `RichTextStyleEditor` directly.

### 3. Similar NumberInput Pattern Repeated
- **Files**:
  - `src/components/sidebar/edge-controls/EdgeLineControl.tsx`
  - `src/components/sidebar/edge-controls/EdgeArrowControl.tsx`
  - `src/components/sidebar/node-controls/NodeShapeControl.tsx`
- **Description**: All three files use the same pattern of local state for NumberInput with blur-on-commit logic. This is a common LLM code duplication pattern.
- **Example Pattern**:
```tsx
const [localSize, setLocalSize] = useState<string | number>(value.size);

useEffect(() => {
    setLocalSize(value.size);
}, [value.size]);

const handleSizeBlur = (): void => {
    const size = typeof localSize === "string" ? parseFloat(localSize) || value.size : localSize;
    if (size !== value.size) {
        onChange({...value, size});
    }
};
```
- **Recommendation**: Extract a `useLocalValue` hook or create a `DebouncedNumberInput` component.

### 4. Inline Styles Should Use Mantine's Style Props
- **Files**: Multiple components
- **Description**: Many components use inline `style={{}}` objects instead of Mantine's style props (`p`, `m`, `gap`, etc.).
- **Example** (`src/components/data-view/ViewDataModal.tsx:108-113`):
```tsx
<div
    style={{
        maxHeight: "400px",
        overflow: "auto",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "2px",
    }}
>
```
- **Recommendation**: Use Mantine's `Box` component with style props or `ScrollArea`.

### 5. Hardcoded Padding/Margin Values
- **Files**: Multiple files
- **Description**: Hardcoded values like `padding: "20px"`, `padding: "40px 20px"`, `marginBottom: "12px"` instead of using Mantine spacing theme tokens.
- **Affected Files**:
  - `src/components/LoadDataModal.tsx` (lines 322, 386-392, 406)
  - `src/components/data-view/DataAccordion.tsx` (lines 86, 119, 135-136)
  - `src/components/RunLayoutsModal.tsx` (line 160)
- **Recommendation**: Use `var(--mantine-spacing-md)`, `var(--mantine-spacing-lg)`, or Mantine's style props.

### 6. Constants File Has "icosphere" but NODE_SHAPE_OPTIONS Doesn't
- **Files**:
  - `src/constants/style-options.ts`
  - `src/utils/style-defaults.ts`
- **Description**: `DEFAULT_SHAPE.type` is "icosphere" but "icosphere" is not in `NODE_SHAPE_OPTIONS`. Should be "geodesic" or "icosahedron".
- **Impact**: User can't select the default shape in the UI dropdown.
- **Fix**: Add "icosphere" to NODE_SHAPE_OPTIONS or change DEFAULT_SHAPE to use an existing shape.

### 7. Swatches Defined Multiple Times
- **Files**:
  - `src/components/sidebar/controls/CompactColorInput.tsx` (lines 162-171)
  - `src/components/sidebar/controls/StyleColorInput.tsx` (lines 114-121)
  - `src/components/demo/CompactComponentsDemo.tsx` (lines 365-374)
- **Description**: Color swatches are defined inline in multiple places instead of being shared from a constants file.
- **Recommendation**: Create a `SWATCH_COLORS` constant in `src/constants/colors.ts`.

### 8. GradientEditor Uses Hardcoded Color
- **Files**: `src/components/sidebar/controls/GradientEditor.tsx:50`
- **Description**: New color stops use `#888888` instead of a themed color.
- **Fix**: Use a default from a constants file or use a Mantine color variable.

### 9. CLAUDE.md is Minimal
- **Files**: `CLAUDE.md`
- **Description**: The project's CLAUDE.md is very brief and doesn't describe the architecture, component structure, or key patterns. The parent monorepo CLAUDE.md is comprehensive but the package-specific one lacks detail.
- **Recommendation**: Add sections describing:
  - Component architecture (layout components, sidebar structure, data-view components)
  - State management patterns (props drilling, context usage)
  - Styling conventions (compact sizing, Mantine integration)
  - Key design decisions

### 10. opacity Scale Inconsistency
- **Files**:
  - `src/utils/style-defaults.ts` (DEFAULT_EDGE_LINE, DEFAULT_ARROW_HEAD, etc.)
  - `src/components/sidebar/edge-controls/EdgeLineControl.tsx`
- **Description**: Some defaults use 0-100 scale for opacity (`opacity: 100`) while the color controls expect 0-1 scale. The code handles conversion but it's inconsistent.
- **Recommendation**: Standardize on one scale throughout the codebase.

### 11. handleClose Wrapper in RunLayoutsModal
- **Files**: `src/components/RunLayoutsModal.tsx:116-118`
- **Description**: Unnecessary wrapper function that just calls `onClose()`.
```tsx
const handleClose = useCallback(() => {
    onClose();
}, [onClose]);
```
- **Recommendation**: Use `onClose` directly.

### 12. Modal Styles Repeated Across Files
- **Files**:
  - `src/components/LoadDataModal.tsx` (lines 314-329)
  - `src/components/data-view/ViewDataModal.tsx` (lines 50-65)
  - `src/components/RunLayoutsModal.tsx` (lines 154-169)
- **Description**: Same modal styling patterns repeated in each modal component.
- **Recommendation**: Create a shared `modalStyles` object or a `StyledModal` wrapper component.

---

## Low Priority Issues (Nice to Have)

### 1. TODO Comments in Code
Several components have TODO comments that should be tracked in an issue tracker:
- `NodeLabelControl.tsx` (lines 15-20)
- `EdgeLabelControl.tsx` (lines 15-20)
- `NodeTooltipControl.tsx` (lines 15-20)
- `EdgeTooltipControl.tsx` (lines 15-20)

### 2. Unused Label Prop
- `src/components/sidebar/edge-controls/EdgeArrowControl.tsx` passes `label` prop but constructs label strings inline (`${label} Type`, `${label} Size`, `${label} Color`).

### 3. Graph.tsx Fallback Color
- `src/components/Graphty.tsx:96` uses hardcoded fallback color `#5b8ff9` which should be a constant.

### 4. MutationObserver in DataGrid
- `src/components/data-view/DataGrid.tsx:71-82` creates a MutationObserver for color scheme detection. This is a workaround that could be simplified if Mantine's color scheme context was used consistently.

### 5. Deprecated Theme Export
- `src/components/data-view/mantineTheme.ts:41` exports a deprecated `mantineJsonGridTheme`. Should be removed in a future version.

### 6. Large CompactComponentsDemo File
- `src/components/demo/CompactComponentsDemo.tsx` (973 lines) is a demonstration file that's quite large. Consider splitting into multiple demo files.

### 7. Magic Numbers in Layout
- `src/components/layout/AppLayout.tsx`, `LeftSidebar.tsx`, `RightSidebar.tsx` use numbers like `250`, `300` for widths. These should be constants.

### 8. Stories Use Hardcoded Colors
- Story files in `src/stories/` use hardcoded hex colors which is acceptable for demonstration purposes.

---

## Positive Findings

1. **Consistent Component Structure**: All sidebar controls follow a consistent pattern with props, handlers, and JSX structure.

2. **Good TypeScript Usage**: Strict typing throughout with no `any` types in production code.

3. **Proper Mantine Integration**: Most components correctly use Mantine's component library and follow its patterns.

4. **Accessibility Considerations**: Components include `aria-label` attributes and keyboard navigation support.

5. **Good Test Coverage**: Comprehensive regression tests for CSS styling ensure compact components maintain visual consistency.

6. **Proper React Patterns**: Correct use of `useCallback`, `useMemo`, `useState`, and `useEffect` hooks.

7. **Semantic CSS Variables**: Many files correctly use `var(--mantine-color-body)`, `var(--mantine-color-default-border)`, and other semantic variables.

8. **Separated Type Definitions**: Types are well-organized in `src/types/` with comprehensive JSDoc documentation.

9. **Constants Organization**: Style options are centralized in `src/constants/style-options.ts` with good documentation.

10. **Error Handling**: Sentry integration with proper initialization checks and graceful degradation.

---

## Recommendations

### Priority 1: Fix Dark/Light Mode Issues
1. Replace all `var(--mantine-color-dark-X)` with semantic variables
2. Remove hardcoded `#ffffff` and other hex colors in production components
3. Test UI in both light and dark modes

### Priority 2: Reduce Code Duplication
1. Create `useLocalValue` hook for NumberInput blur pattern
2. Consolidate modal styling into a shared utility
3. Merge thin wrapper components or remove them
4. Extract swatch colors to a constants file

### Priority 3: Improve Mantine Compliance
1. Replace hardcoded `fontSize: "Xpx"` with Mantine size props
2. Use Mantine spacing tokens instead of hardcoded padding/margin
3. Use `Box` style props instead of inline `style={{}}` objects

### Priority 4: Update Documentation
1. Expand package-level CLAUDE.md with architecture details
2. Track TODO comments as issues
3. Remove deprecated exports

---

## Batch Remediation Guide

### Batch 1: Theme Variables (4 files, ~15 changes)
```bash
# Files to update
src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx
src/components/RunLayoutsModal.tsx
src/components/ErrorFallback.tsx
src/components/Graphty.tsx
```

### Batch 2: Code Deduplication (6 files)
```bash
# Create shared hook
src/hooks/useLocalValue.ts  # New file

# Update consumers
src/components/sidebar/edge-controls/EdgeLineControl.tsx
src/components/sidebar/edge-controls/EdgeArrowControl.tsx
src/components/sidebar/node-controls/NodeShapeControl.tsx
src/components/sidebar/node-controls/NodeEffectsControl.tsx
```

### Batch 3: Modal Styling (3 files)
```bash
# Create shared styles
src/utils/modal-styles.ts  # New file

# Update consumers
src/components/LoadDataModal.tsx
src/components/data-view/ViewDataModal.tsx
src/components/RunLayoutsModal.tsx
```

### Batch 4: Constants Consolidation (3 files)
```bash
# Create new constants file
src/constants/colors.ts  # New file for SWATCH_COLORS

# Update consumers
src/components/sidebar/controls/CompactColorInput.tsx
src/components/sidebar/controls/StyleColorInput.tsx
src/components/demo/CompactComponentsDemo.tsx
```

---

*Report generated on 2025-12-19*
