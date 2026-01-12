# Code Review Report - 1/8/2026

## Executive Summary

- **Files reviewed**: 57 source files (all production code in compact-mantine/src/)
- **Critical issues**: 0
- **High priority issues**: 3
- **Medium priority issues**: 11
- **Low priority issues**: 6

The compact-mantine package is well-architected with good separation of concerns. The theme system follows Mantine best practices with CSS variables and component extensions. No security vulnerabilities or critical bugs were identified. The main areas for improvement are light mode support consistency, some potential performance optimizations, and minor code quality improvements.

---

## Best Practices Reference

### React Best Practices (2025-2026)

1. **Avoid `React.FC`** - Use explicit prop interfaces instead (✅ followed)
2. **Use `ComponentProps<'element'>` for native elements** - Inherit valid props from HTML elements
3. **Prefer composition over inheritance** - Use compound components, render props (✅ excellent use in Popout)
4. **Single responsibility principle** - One component, one purpose (✅ followed)
5. **Local state first** - Only use Context when needed (✅ appropriate Context usage)
6. **Memoize judiciously** - Apply `useMemo`/`useCallback` only when measurable benefit (✅ good usage)
7. **Accurate dependency arrays** - Include all dependencies in hooks (✅ followed)
8. **Avoid unnecessary effects** - Don't use `useEffect` for computable values (✅ mostly followed)
9. **Use proper `key` props** - Stable unique identifiers, not array indices (✅ using `id` field)
10. **Type events explicitly** - Use specific event types (✅ followed)

### Mantine Theming Best Practices

1. **Use `createTheme()`** - Provides type safety (✅ followed)
2. **Store theme outside components** - Prevents re-renders (✅ followed in `theme/index.ts`)
3. **Prefer `classNames` over `styles` prop** - Better performance for static styles
4. **Use CSS variables for theming** - Better light/dark mode support (⚠️ partial)
5. **Use `virtualColor()` for scheme-aware colors** - Different values for light/dark (❌ not used)
6. **Define component defaults at theme level** - Consistency (✅ excellent)
7. **All custom colors need 10 shades** - Mantine requirement (✅ followed)
8. **Avoid hardcoded colors** - Use CSS variables instead (⚠️ some hardcoded values)

---

## High Priority Issues (Fix Soon)

### 1. Light Mode Support Not Fully Tested/Verified

- **Files**: `src/theme/styles/controls.ts:72-73`, multiple style files
- **Description**: The SegmentedControl indicator uses a hardcoded dark mode color (`var(--mantine-color-dark-6)`) that won't work correctly in light mode. Other styles may have similar issues.

**Example**: `src/theme/styles/controls.ts:72-73`
```typescript
// Problem: Hardcoded for dark mode only
export const compactSegmentedControlIndicatorStyles = {
    backgroundColor: "var(--mantine-color-dark-6)",
};
```

**Fix**:
```typescript
// Use light-dark() for automatic color scheme adaptation
export const compactSegmentedControlIndicatorStyles = {
    backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))",
};
```

**Affected files to audit**:
- `src/theme/styles/controls.ts` - SegmentedControl indicator
- `src/components/popout/PopoutPanel.tsx:195` - Border color uses `light-dark()` correctly
- `src/components/ControlGroup.tsx:25` - `color="gray.7"` hardcoded
- `src/components/ControlSection.tsx:32` - `color="gray.7"` hardcoded

### 2. useActualColorScheme Hardcodes Default to "dark"

- **Files**: `src/hooks/useActualColorScheme.ts:8-10`
- **Description**: The hook hardcodes "dark" as the fallback when the color scheme is "auto". This means if the system preference can't be determined, it always falls back to dark mode, which may not be the desired behavior for all applications.

**Example**: `src/hooks/useActualColorScheme.ts:8-10`
```typescript
export function useActualColorScheme(): "light" | "dark" {
    return useComputedColorScheme("dark"); // Hardcoded "dark" fallback
}
```

**Fix**: Consider making the fallback configurable or document the behavior:
```typescript
/**
 * Hook to get the actual resolved color scheme.
 * Resolves "auto" to the actual light/dark value based on system preference.
 * Falls back to "dark" if system preference cannot be determined.
 * @param fallback - Fallback color scheme (default: "dark")
 * @returns "light" | "dark"
 */
export function useActualColorScheme(fallback: "light" | "dark" = "dark"): "light" | "dark" {
    return useComputedColorScheme(fallback);
}
```

### 3. GradientEditor Calls onChange Multiple Times Per Update

- **Files**: `src/components/GradientEditor.tsx:47-58, 61-64, 66-75`
- **Description**: Each handler function calls both `handleStopsChange()` (from useUncontrolled) AND `onChange()` directly. The useUncontrolled hook already calls the onChange callback internally, resulting in potential double-invocation.

**Example**: `src/components/GradientEditor.tsx:47-52`
```typescript
const handleStopColorChange = (index: number, color: string): void => {
    const newStops = [..._stops];
    newStops[index] = { ...newStops[index], color };
    handleStopsChange(newStops);  // This already calls onChange via useUncontrolled
    onChange?.(newStops, _direction);  // Duplicate call!
};
```

**Fix**: Remove the duplicate `onChange` calls since `useUncontrolled` already handles them:
```typescript
const handleStopColorChange = (index: number, color: string): void => {
    const newStops = [..._stops];
    newStops[index] = { ...newStops[index], color };
    handleStopsChange(newStops);  // useUncontrolled calls onChange internally
};
```

**Note**: This requires verifying that the `useUncontrolled` setup correctly passes the combined value (stops + direction) to the parent. The current setup has separate `useUncontrolled` hooks for stops and direction, which may not work as expected for the combined `onChange` signature.

---

## Medium Priority Issues (Technical Debt)

### 4. ControlSection Header Click Should Be a Button for Accessibility

- **Files**: `src/components/ControlSection.tsx:34`
- **Description**: The header row uses a `<Group>` with `onClick` and `cursor: pointer` but is not a proper button. Screen readers won't announce it as interactive.

**Example**: `src/components/ControlSection.tsx:34`
```typescript
<Group justify="space-between" py={8} px={8} style={{ cursor: "pointer" }} onClick={toggle}>
```

**Fix**: Wrap the header content with a proper button element or use `role="button"` with keyboard handling:
```typescript
<Group
    justify="space-between"
    py={8}
    px={8}
    style={{ cursor: "pointer" }}
    onClick={toggle}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}
>
```

### 5. ControlSubGroup Uses Non-Semantic Conditional Rendering for Collapse

- **Files**: `src/components/ControlSubGroup.tsx:39-43`
- **Description**: Uses conditional rendering (`{opened && ...}`) instead of Mantine's `<Collapse>` component. This loses animation and is inconsistent with ControlSection which uses Collapse.

**Example**: `src/components/ControlSubGroup.tsx:39-43`
```typescript
{/* Conditionally rendered content area with indent */}
{opened && (
    <Box pl="md">
        <Stack gap={4}>{children}</Stack>
    </Box>
)}
```

**Fix**: Use Collapse for consistency and animation:
```typescript
<Collapse in={opened}>
    <Box pl="md">
        <Stack gap={4}>{children}</Stack>
    </Box>
</Collapse>
```

### 6. PopoutManagerProvider Has Complex Nested Loops

- **Files**: `src/components/popout/PopoutContext.tsx:138-189`
- **Description**: The `register` function has deeply nested loops and complex sibling/descendant closing logic that's difficult to follow and maintain. This could also have O(n²) performance with many popouts.

**Recommendation**: Consider refactoring into smaller helper functions:
- `findSiblings(parentId)`
- `findDescendants(popoutId)`
- `closePopoutsInOrder(ids[])`

### 7. StyleNumberInput Has Redundant State Sync

- **Files**: `src/components/StyleNumberInput.tsx:53-59`
- **Description**: Uses both `useUncontrolled` and a separate `useState` + `useEffect` for local state. This pattern is correct for preventing focus loss during typing, but the effect dependency on `_value` could cause unnecessary re-syncs.

**Example**: `src/components/StyleNumberInput.tsx:53-59`
```typescript
const [localValue, setLocalValue] = useState<string | number>(displayValue);

useEffect(() => {
    setLocalValue(_value ?? defaultValue);
}, [_value, defaultValue]);
```

**Recommendation**: Consider using `useRef` to track if the update came from internal change vs external prop change to avoid the sync effect.

### 8. PopoutPanel Effect Has Missing Dependency

- **Files**: `src/components/popout/PopoutPanel.tsx:119-162`
- **Description**: The effect that calculates initial position has `anchorContext` used inside but not in dependency array. This could cause stale closure issues if the anchor context changes.

**Example**: `src/components/popout/PopoutPanel.tsx:126-131`
```typescript
useEffect(() => {
    if (isOpen) {
        let anchorElement = anchorRef?.current ?? null;
        if (!anchorElement && anchorContext?.anchorRef.current) {
            anchorElement = anchorContext.anchorRef.current;
        }
        // ...
    }
}, [isOpen, width, height, gap, triggerRef, anchorRef, placement, alignment, ...]);
// anchorContext is missing from deps!
```

**Fix**: Add `anchorContext` to the dependency array:
```typescript
}, [isOpen, width, height, gap, triggerRef, anchorRef, placement, alignment, resetDragOffset, isTabs, defaultTabId, parentId, anchorContext]);
```

### 9. Unused compactTextVars Export

- **Files**: `src/theme/styles/display.ts:28-32`
- **Description**: `compactTextVars` is defined but never used. The Text component extension in `src/theme/components/display.ts` doesn't apply any vars, intentionally relying on global fontSizes.

**Recommendation**: Either remove the unused export or add a comment explaining it's available for custom usage.

### 10. SWATCH_COLORS Constant Unused

- **Files**: `src/constants/colors.ts:5`
- **Description**: `SWATCH_COLORS` is exported but only `SWATCH_COLORS_HEXA` is used in CompactColorInput.

**Recommendation**: Either remove the unused constant or document intended usage.

### 11. Potential Memory Leak in useClickOutside

- **Files**: `src/components/popout/hooks/useClickOutside.ts:37-89`
- **Description**: The hook attaches a `mousedown` listener to `document` but the callback function is not memoized, which could cause unnecessary listener churn if the parent component re-renders frequently.

**Recommendation**: The current implementation is fine since the effect cleanup properly removes the old listener. However, if performance issues arise, consider ensuring the callback is memoized at the call site.

### 12. mergeExtensions Utilities Are Exported But Unused

- **Files**: `src/utils/merge-extensions.ts`, `src/utils/index.ts`
- **Description**: The `mergeExtensions`, `mergeExtensions3`, `mergeExtensions4`, and `mergeExtensions7` functions are cleverly designed to prevent duplicate component keys at compile time. However, `theme/index.ts` uses spread operators instead.

**Example**: `src/utils/merge-extensions.ts`
```typescript
// Clever type safety for preventing duplicate keys
type NoOverlap<T, U> = keyof T & keyof U extends never ? U : never;
export function mergeExtensions<A extends object, B extends object>(
    a: A,
    b: NoOverlap<A, B>,
): A & B { ... }
```

But in `theme/index.ts`:
```typescript
// Uses spread operator instead of mergeExtensions
components: {
    ...inputExtensions,
    ...buttonExtensions,
    ...controlExtensions,
    ...
}
```

**Recommendation**: Either use the `mergeExtensions7` function in theme/index.ts for compile-time safety against duplicate component names, or remove the unused utilities.

### 13. LabelSettingsPopout Example Uses Hardcoded Color

- **Files**: `src/components/popout/examples/LabelSettingsPopout.tsx:241`
- **Description**: The example uses `var(--mantine-color-gray-light)` which may not render correctly in all color schemes.

**Example**: `src/components/popout/examples/LabelSettingsPopout.tsx:241`
```typescript
backgroundColor: "var(--mantine-color-gray-light)",
```

**Fix**: Use a more explicit light-dark approach or Mantine's built-in surface colors:
```typescript
backgroundColor: "var(--mantine-color-default)",
// or
backgroundColor: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
```

### 14. FLOATING_UI_Z_INDEX Constant Defined But Unused

- **Files**: `src/constants/popout.ts:12`
- **Description**: `FLOATING_UI_Z_INDEX = 1100` is defined and documented but never used in the codebase.

**Recommendation**: Either use this constant in components that render floating UI elements inside popouts, or remove it.

---

## Low Priority Issues (Nice to Have)

### 15. Magic Numbers in Styles

- **Files**: Multiple style files
- **Description**: Various pixel values like `24px`, `11px`, `8` are repeated. Consider extracting to shared constants.

### 16. compactInputVarsFn and compactInputVarsNoHeightFn Are Unused

- **Files**: `src/theme/styles/inputs.ts:41-51`
- **Description**: These helper functions wrap the vars objects but are not used by any component extensions.

### 17. Type Assertion in PopoutTrigger Could Be Improved

- **Files**: `src/components/popout/PopoutTrigger.tsx:41-48`
- **Description**: Uses explicit type assertion for child props. Consider using a more type-safe approach with generics.

### 18. No JSDoc on Some Utility Functions

- **Files**: Various utility files
- **Description**: Some internal helper functions lack JSDoc comments for consistency.

### 19. Consider Using CSS Modules for Complex Styles

- **Files**: `src/theme/styles/*`
- **Description**: Following Mantine best practices, CSS Modules would provide better performance than inline styles for static values. However, this is a minor optimization given the current code size.

### 20. PopoutAnchor/PopoutButton forwardRef Pattern Could Be More Type-Safe

- **Files**: `src/components/popout/PopoutAnchor.tsx:78`, `src/components/popout/PopoutButton.tsx:33`
- **Description**: Both components clone children or use forwardRef with explicit type assertions. Consider creating wrapper types for better inference.

---

## Positive Findings

### Excellent Patterns to Replicate

1. **Compound Component Pattern** (Popout)
   - Clean API: `<Popout><Popout.Trigger>...</Popout.Trigger><Popout.Panel>...</Popout.Panel></Popout>`
   - Proper context usage for state sharing
   - Well-structured type definitions

2. **Theme Architecture**
   - Clear separation: tokens → styles → component extensions → theme
   - Consistent use of CSS variables for runtime customization
   - Good documentation of variable meanings

3. **useUncontrolled Pattern**
   - Consistent controlled/uncontrolled support across all input components
   - Clean API for distinguishing "default" vs "explicit" values

4. **Type Safety**
   - All components have proper TypeScript interfaces
   - Good use of discriminated unions (PopoutHeaderConfig)
   - Exhaustive switch case handling with `never` type

5. **Accessibility**
   - ARIA attributes on popout triggers and panels
   - Proper focus management in PopoutPanel
   - Keyboard support for escape key closing

6. **Code Organization**
   - Clear file structure: components, hooks, types, constants, utils
   - Barrel exports for clean imports
   - Consistent naming conventions

---

## Recommendations

### Immediate Actions

1. **Audit and fix light mode support** - Test all components in light mode and fix hardcoded dark mode colors
2. **Fix GradientEditor double onChange calls** - Remove duplicate invocations
3. **Add missing useEffect dependency** - Add `anchorContext` to PopoutPanel effect

### Short-term Improvements

4. **Improve ControlSection/ControlSubGroup accessibility** - Add proper keyboard navigation
5. **Refactor PopoutManagerProvider register logic** - Break into smaller, testable functions
6. **Remove unused exports** - Clean up compactTextVars, SWATCH_COLORS, var helper functions, FLOATING_UI_Z_INDEX
7. **Use or remove mergeExtensions utilities** - Either leverage for compile-time safety or remove dead code

### Documentation

8. **Document light mode behavior** - Clarify which components support light/dark mode
9. **Document useActualColorScheme fallback behavior** - Make the default clear
10. **Add component usage examples** - Especially for Popout compound component

---

## Component Light/Dark Mode Support Summary

| Component | Light Mode | Dark Mode | Notes |
|-----------|------------|-----------|-------|
| Theme Colors | ✅ | ✅ | Uses Mantine color palette |
| Input Components | ⚠️ | ✅ | Uses `var(--mantine-color-default)` - should work |
| Button Components | ⚠️ | ✅ | Relies on Mantine defaults |
| Control Components | ❌ | ✅ | SegmentedControl indicator hardcoded for dark |
| Display Components | ⚠️ | ✅ | Most rely on Mantine defaults |
| Feedback Components | ⚠️ | ✅ | Progress label hardcoded fontSize |
| Navigation Components | ⚠️ | ✅ | Mostly rely on Mantine defaults |
| Overlay Components | ⚠️ | ✅ | Use Mantine defaults |
| Popout Components | ✅ | ✅ | Uses `light-dark()` CSS function |
| ControlGroup/Section | ❌ | ✅ | `color="gray.7"` hardcoded |
| Custom Components | ⚠️ | ✅ | StyleSelect/NumberInput use dimmed vars |

**Legend**: ✅ = Fully supported, ⚠️ = Likely works but untested, ❌ = Known issues

---

## File Inventory

### Production Code (src/) - 57 Files Reviewed

| Category | Files | Status |
|----------|-------|--------|
| Main Entry | `index.ts` | ✅ Clean |
| Theme Entry | `theme/index.ts`, `theme/colors.ts`, `theme/tokens.ts` | ✅ Clean |
| Theme Components | `theme/components/*.ts` (8 files incl. index) | ✅ Clean |
| Theme Styles | `theme/styles/*.ts` (7 files) | ⚠️ Light mode issues |
| Components | `components/*.tsx` (10 files incl. index) | ⚠️ Minor issues |
| Popout System | `components/popout/*.tsx` (12 files incl. hooks/utils) | ⚠️ Minor issues |
| Popout Examples | `components/popout/examples/*.tsx` (1 file) | ⚠️ Hardcoded color |
| Hooks | `hooks/*.ts` (2 files incl. index) | ⚠️ Hardcoded fallback |
| Utils | `utils/*.ts` (4 files incl. index) | ⚠️ Unused utilities |
| Constants | `constants/*.ts` (4 files incl. index) | ⚠️ Unused exports |
| Types | `types/*.ts` (2 files) | ✅ Clean |

### Test Code (tests/) - Different Standards Apply

Test files were not reviewed in detail as they follow relaxed standards (mocks, test utilities, etc.).

### Configuration

| File | Status |
|------|--------|
| `package.json` | ✅ |
| `tsconfig.json` | ✅ |
| `vite.config.ts` | ✅ |
| `.storybook/*` | ✅ |

---

*Report generated: January 8, 2026*
*Reviewer: Claude Code*
