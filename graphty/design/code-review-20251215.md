# Code Review Report - 12/15/2025

## Executive Summary
- **Files reviewed**: 34
- **Critical issues**: 0
- **High priority issues**: 5
- **Medium priority issues**: 8
- **Low priority issues**: 6

### File Inventory

#### Production Code (src/)
- `src/App.tsx` - Main application component
- `src/main.tsx` - Application entry point
- `src/index.css` - Global styles
- `src/components/index.ts` - Component exports
- `src/components/Graphty.tsx` - Graph visualization wrapper
- `src/components/GraphtyEnhanced.tsx` - Enhanced graph component
- `src/components/LoadDataModal.tsx` - Data loading modal
- `src/components/layout/AppLayout.tsx` - Main layout container
- `src/components/layout/RightSidebar.tsx` - Right sidebar panel
- `src/components/layout/LeftSidebar.tsx` - Left sidebar panel
- `src/components/layout/TopMenuBar.tsx` - Top navigation bar
- `src/components/layout/BottomToolbar.tsx` - Bottom toolbar
- `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx` - Style layer properties
- `src/components/sidebar/panels/GraphPropertiesPanel.tsx` - Graph properties panel
- `src/components/sidebar/controls/ControlSection.tsx` - Section container
- `src/components/sidebar/controls/ControlGroup.tsx` - Group container
- `src/components/sidebar/controls/ControlSubGroup.tsx` - Subgroup container
- `src/components/sidebar/controls/StyleColorInput.tsx` - Color input control
- `src/components/sidebar/controls/StyleNumberInput.tsx` - Number input control
- `src/components/sidebar/controls/StyleSelect.tsx` - Select control
- `src/components/sidebar/controls/StatRow.tsx` - Statistics row
- `src/components/sidebar/controls/CompactColorInput.tsx` - Compact color input
- `src/components/sidebar/controls/RichTextStyleEditor.tsx` - Rich text editor
- `src/components/sidebar/controls/EffectToggle.tsx` - Effect toggle control
- `src/components/sidebar/controls/GradientEditor.tsx` - Gradient editor
- `src/components/sidebar/node-controls/NodeColorControl.tsx` - Node color control
- `src/components/sidebar/node-controls/NodeShapeControl.tsx` - Node shape control
- `src/components/sidebar/node-controls/NodeEffectsControl.tsx` - Node effects control
- `src/components/sidebar/node-controls/NodeLabelControl.tsx` - Node label control
- `src/components/sidebar/node-controls/NodeTooltipControl.tsx` - Node tooltip control
- `src/components/sidebar/edge-controls/EdgeLineControl.tsx` - Edge line control
- `src/components/sidebar/edge-controls/EdgeArrowControl.tsx` - Edge arrow control
- `src/components/sidebar/edge-controls/EdgeLabelControl.tsx` - Edge label control
- `src/components/sidebar/edge-controls/EdgeTooltipControl.tsx` - Edge tooltip control
- `src/components/demo/CompactComponentsDemo.tsx` - Demo component

#### Type Definitions
- `src/types/style-layer.ts` - Style layer type definitions
- `src/types/selection.ts` - Selection type definitions

#### Constants and Utilities
- `src/constants/style-options.ts` - Style option constants
- `src/constants/style-defaults.ts` - Default style values
- `src/utils/style-defaults.ts` - Style default utilities
- `src/utils/graphLoader.ts` - Graph loading utilities

#### Hooks
- `src/hooks/useGraphInfo.ts` - Graph info hook
- `src/hooks/useGraphtyData.ts` - Graph data hook

---

## Critical Issues (Fix Immediately)

*No critical issues found.*

---

## High Priority Issues (Fix Soon)

### 1. Duplicate Type Definitions: ColorConfig and ColorStop
- **Files**:
  - `src/types/style-layer.ts:4-40`
  - `src/components/sidebar/node-controls/NodeColorControl.tsx:7-28`
  - `src/components/sidebar/controls/GradientEditor.tsx:5-8`
- **Description**: `ColorConfig`, `SolidColorConfig`, `GradientColorConfig`, `RadialColorConfig`, and `ColorStop` are defined multiple times across different files. This creates maintenance burden and potential for type mismatches.
- **Example**: `src/components/sidebar/node-controls/NodeColorControl.tsx:7-28`
```typescript
export type ColorMode = "solid" | "gradient" | "radial";

export interface SolidColorConfig {
    mode: "solid";
    color: string;
    opacity: number;
}

export interface GradientColorConfig {
    mode: "gradient";
    stops: ColorStop[];
    direction: number;
    opacity: number;
}
// ... duplicated from types/style-layer.ts
```
- **Fix**: Import types from `src/types/style-layer.ts` instead of redefining them:
```typescript
import type {
    ColorMode,
    ColorConfig,
    SolidColorConfig,
    GradientColorConfig,
    RadialColorConfig,
    ColorStop
} from "../../../types/style-layer";
```

### 2. Duplicate Default Values in Two Files
- **Files**:
  - `src/utils/style-defaults.ts`
  - `src/constants/style-defaults.ts`
- **Description**: Two separate files define default style values with overlapping but inconsistent data. For example:
  - `utils/style-defaults.ts` defines `DEFAULT_SHAPE.type = "icosphere"`
  - `constants/style-defaults.ts` defines `NODE_DEFAULTS.shapeType = "sphere"`
  - Color defaults differ (`#6366F1` vs `#5B8FF9`)
- **Example**: `src/constants/style-defaults.ts:12-15`
```typescript
export const NODE_DEFAULTS = {
    shapeType: "sphere",  // Different from utils/style-defaults.ts
    size: 1.0,
} as const;
```
- **Fix**: Consolidate into a single source of truth for defaults. Either:
  1. Remove `constants/style-defaults.ts` and use only `utils/style-defaults.ts`, or
  2. Have `constants/style-defaults.ts` derive values from `utils/style-defaults.ts`

### 3. Hardcoded Color Values Not Using Mantine Best Practices
- **Files**: Multiple sidebar control components and `src/main.tsx` theme extensions
- **Description**: Several components use hardcoded Mantine color references like `c="dark.2"` and `c="gray.4"` instead of semantic theme colors. Per [Mantine's official theming documentation](https://mantine.dev/theming/color-schemes/), this breaks light mode support because these colors don't adapt to the color scheme.
- **Example**: `src/components/sidebar/node-controls/NodeColorControl.tsx:118`
```typescript
<Text size="xs" c="dark.2" mb={1} lh={1.2}>Color Mode</Text>
```
- **Example**: `src/components/sidebar/controls/GradientEditor.tsx:66`
```typescript
<Text size="xs" c="gray.4">
    Color Stops
</Text>
```
- **Example**: `src/main.tsx:75` (theme extensions also hardcode dark colors)
```typescript
"--input-bg": "var(--mantine-color-dark-8)",
color: "var(--mantine-color-dark-2)",
```
- **Fix**: Use Mantine's semantic CSS variables that automatically adapt to color scheme:

| Instead of | Use | Description |
|------------|-----|-------------|
| `c="dark.2"` | `c="dimmed"` | Secondary/muted text |
| `c="dark.0"` / `c="gray.1"` | `c="text"` or CSS `var(--mantine-color-text)` | Primary text |
| `--mantine-color-dark-7` | `var(--mantine-color-body)` | Page background |
| `--mantine-color-dark-5` | `var(--mantine-color-default-border)` | Borders |
| `--mantine-color-dark-6` | `var(--mantine-color-default)` | Component backgrounds |
| `--mantine-color-dark-8` | `var(--mantine-color-default)` | Input backgrounds |

```typescript
// Component fix
<Text size="xs" c="dimmed" mb={1} lh={1.2}>Color Mode</Text>

// Theme extension fix in main.tsx
"--input-bg": "var(--mantine-color-default)",
color: "var(--mantine-color-dimmed)",
```

### 4. No Light Mode Support (Violates Mantine Best Practices)
- **Files**:
  - `src/main.tsx` - Theme extensions hardcode dark colors
  - `src/components/demo/CompactComponentsDemo.tsx`
  - Various sidebar components
- **Description**: The application exclusively uses dark theme colors with hardcoded dark color values. Per [Mantine's CSS Variables documentation](https://mantine.dev/styles/css-variables/), Mantine provides semantic CSS variables that automatically adapt to light/dark schemes, but the codebase doesn't use them.
- **Research Finding**: Mantine best practices recommend:
  1. Use `defaultColorScheme` prop on `MantineProvider` (✅ already done)
  2. Use semantic CSS variables like `--mantine-color-body`, `--mantine-color-text`, `--mantine-color-dimmed` (❌ not done)
  3. Use `useComputedColorScheme()` hook for toggle logic (not `colorScheme` which can be `"auto"`)
  4. Consider `virtualColor()` for colors that should differ between schemes
- **Example**: `src/components/demo/CompactComponentsDemo.tsx:101`
```typescript
<Box style={{height: "100vh", overflow: "auto", backgroundColor: "var(--mantine-color-dark-7)"}}>
```
- **Example**: `src/main.tsx:75` (theme extensions break light mode)
```typescript
TextInput: TextInput.extend({
    vars: (_theme, props) => {
        if (props.size === "compact") {
            return {
                wrapper: {
                    "--input-bg": "var(--mantine-color-dark-8)",  // ❌ Breaks light mode
                },
            };
        }
    },
    styles: (_theme, props) => {
        if (props.size === "compact") {
            return {
                label: {
                    color: "var(--mantine-color-dark-2)",  // ❌ Breaks light mode
                },
            };
        }
    },
}),
```
- **Fix**:
  1. Update theme extensions in `main.tsx` to use semantic variables:
```typescript
TextInput: TextInput.extend({
    vars: (_theme, props) => {
        if (props.size === "compact") {
            return {
                wrapper: {
                    "--input-size": "24px",
                    "--input-fz": "11px",
                    "--input-bg": "var(--mantine-color-default)",  // ✅ Adapts to scheme
                    "--input-bd": "none",
                },
            };
        }
        return {root: {}, wrapper: {}};
    },
    styles: (_theme, props) => {
        if (props.size === "compact") {
            return {
                label: {
                    fontSize: 11,
                    color: "var(--mantine-color-dimmed)",  // ✅ Adapts to scheme
                    marginBottom: 1,
                    lineHeight: 1.2,
                },
            };
        }
        return {};
    },
}),
```
  2. Replace hardcoded colors in components:
```typescript
// Before
<Box style={{backgroundColor: "var(--mantine-color-dark-7)"}}>

// After
<Box style={{backgroundColor: "var(--mantine-color-body)"}}>
```
  3. Optionally add a color scheme toggle using `useComputedColorScheme()`:
```typescript
import { useMantineColorScheme, useComputedColorScheme } from '@mantine/core';

function ColorSchemeToggle() {
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('dark');

    return (
        <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle color scheme"
        >
            {computedColorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </ActionIcon>
    );
}
```

### 5. Inconsistent Checkbox Styling Pattern
- **Files**:
  - `src/components/sidebar/controls/RichTextStyleEditor.tsx`
  - `src/components/sidebar/controls/EffectToggle.tsx`
  - `src/components/sidebar/node-controls/NodeEffectsControl.tsx`
- **Description**: Checkbox components have inline styles duplicated across multiple files with identical styling for `fontSize` and `paddingLeft`. This pattern is repeated at least 6 times.
- **Example**: `src/components/sidebar/controls/RichTextStyleEditor.tsx:278-280`
```typescript
<Checkbox
    label="Enabled"
    checked={value.enabled}
    onChange={(e) => { handleEnabledChange(e.currentTarget.checked); }}
    size="xs"
    styles={{
        label: {fontSize: "11px", paddingLeft: "4px"},
    }}
/>
```
- **Fix**: Create a shared component or use Mantine theme to define consistent checkbox styling:
```typescript
// Option 1: Create a shared component
export function CompactCheckbox(props: CheckboxProps) {
    return (
        <Checkbox
            size="xs"
            styles={{
                label: { fontSize: "11px", paddingLeft: "4px" },
            }}
            {...props}
        />
    );
}

// Option 2: Define in theme
const theme = createTheme({
    components: {
        Checkbox: {
            styles: (theme, { size }) => size === 'xs' ? {
                label: { fontSize: "11px", paddingLeft: "4px" }
            } : {}
        }
    }
});
```

---

## Medium Priority Issues (Technical Debt)

### 1. Unused `label` Prop in RichTextStyleEditor
- **Files**: `src/components/sidebar/controls/RichTextStyleEditor.tsx:17-22`
- **Description**: The `label` prop is defined in the interface and documented for "testing/identification" but is never used in the component rendering.
- **Example**:
```typescript
interface RichTextStyleEditorProps {
    /** Label for this editor (used for testing/identification) */
    label: string;  // Never used in the component
    value: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}

export function RichTextStyleEditor({
    value,  // label is destructured away
    onChange,
}: RichTextStyleEditorProps): React.JSX.Element {
```
- **Fix**: Either use the label prop for aria-label or data-testid, or remove it if not needed:
```typescript
export function RichTextStyleEditor({
    label,
    value,
    onChange,
}: RichTextStyleEditorProps): React.JSX.Element {
    return (
        <Stack gap={4} data-testid={`rich-text-editor-${label}`}>
```

### 2. Hardcoded Pixel Values in Inline Styles
- **Files**: Multiple components
- **Description**: Many components use hardcoded pixel values in inline styles rather than Mantine spacing/sizing tokens. This reduces consistency and maintainability.
- **Example**: `src/components/sidebar/controls/GradientEditor.tsx:93`
```typescript
<Box style={{width: "80px"}}>
```
- **Example**: `src/components/demo/CompactComponentsDemo.tsx:259-262`
```typescript
leftSectionWidth={24}
// ...
styles={{input: {paddingLeft: 28}}}
```
- **Fix**: Use Mantine spacing tokens or CSS variables:
```typescript
// Use rem or Mantine spacing
<Box w="5rem">  // or w={80} which Mantine converts

// For input sections, use consistent values
leftSectionWidth={rem(24)}
```

### 3. Wrapper Components with No Added Functionality
- **Files**:
  - `src/components/sidebar/node-controls/NodeLabelControl.tsx`
  - `src/components/sidebar/node-controls/NodeTooltipControl.tsx`
  - `src/components/sidebar/edge-controls/EdgeLabelControl.tsx`
  - `src/components/sidebar/edge-controls/EdgeTooltipControl.tsx`
- **Description**: These four components are simple pass-through wrappers around `RichTextStyleEditor` that add no functionality. The JSDoc says they provide "node-specific" or "edge-specific" configuration, but they just pass props through.
- **Example**: `src/components/sidebar/node-controls/NodeLabelControl.tsx:15-22`
```typescript
export function NodeLabelControl({value, onChange}: NodeLabelControlProps): React.JSX.Element {
    return (
        <RichTextStyleEditor
            label="Node Label"
            value={value}
            onChange={onChange}
        />
    );
}
```
- **Fix**: Consider whether these wrapper components are needed. If they're intended for future customization, add a TODO comment. Otherwise, use `RichTextStyleEditor` directly with the label prop.

### 4. Empty Callback Functions for Unused Opacity
- **Files**:
  - `src/components/sidebar/controls/RichTextStyleEditor.tsx:29-32`
  - `src/components/sidebar/node-controls/NodeEffectsControl.tsx:199-201, 249-251`
- **Description**: Empty no-op functions are passed as callbacks for `onOpacityChange` when opacity control is not needed. While documented, this suggests the `CompactColorInput` API could be improved.
- **Example**: `src/components/sidebar/controls/RichTextStyleEditor.tsx:29-32`
```typescript
const noOpOpacity = (): void => {
    // Intentionally empty - opacity is fixed at 100% for text colors
};
// Later used as:
onOpacityChange={noOpOpacity}
```
- **Fix**: Make `onOpacityChange` optional in `CompactColorInput`:
```typescript
interface CompactColorInputProps {
    // ...
    onOpacityChange?: (opacity: number) => void;  // Make optional
}

// In CompactColorInput implementation:
if (onOpacityChange) {
    onOpacityChange(newOpacity);
}
```

### 5. Inconsistent Gap Values Across Components
- **Files**: Multiple sidebar control components
- **Description**: Different gap values are used across similar components: `gap={4}`, `gap={8}`, `gap="xs"`, `gap="md"`. This creates inconsistent visual spacing.
- **Example**:
  - `EffectToggle.tsx:18`: `<Stack gap={4}>`
  - `NodeEffectsControl.tsx:118`: `<Stack gap={8}>`
  - `GradientEditor.tsx:64`: `<Stack gap="xs">`
- **Fix**: Standardize on either numeric or Mantine spacing tokens:
```typescript
// Standardize on Mantine tokens
<Stack gap="xs">  // 4px in compact spacing
<Stack gap="sm">  // 8px in compact spacing

// Or define constants
const CONTROL_GAP = 4;
const SECTION_GAP = 8;
```

### 6. React Import Style Inconsistency
- **Files**: Various components
- **Description**: Some components import React namespace (`import React from "react"`) while also using `useState`, `useEffect`, etc. directly. This is inconsistent.
- **Example**: `src/components/sidebar/node-controls/NodeShapeControl.tsx:3`
```typescript
import React, {useEffect, useState} from "react";
// Later uses React.ChangeEvent but doesn't need React namespace for JSX
```
- **Fix**: Be consistent - either use namespace imports throughout or named imports throughout:
```typescript
// Option 1: Named imports only (modern style)
import { useEffect, useState, type ChangeEvent } from "react";

// Option 2: Namespace import (if needed for React.JSX.Element)
import type React from "react";
import { useEffect, useState } from "react";
```

### 7. Missing Return Type Annotations on Handler Functions
- **Files**: Multiple components
- **Description**: Most handler functions have `: void` return type annotations, but some inline handlers in JSX don't have explicit types.
- **Example**: `src/components/demo/CompactComponentsDemo.tsx:151-153`
```typescript
onChange={(e) => {  // No type annotation
    setTextValue(e.currentTarget.value);
}}
```
- **Fix**: This is acceptable for inline handlers where TypeScript can infer the type. No action required, but for consistency consider extracting handlers to named functions with explicit types.

### 8. GradientEditor Uses Index as React Key
- **Files**: `src/components/sidebar/controls/GradientEditor.tsx:82`
- **Description**: Using array index as a React key can cause issues when items are reordered or removed.
- **Example**:
```typescript
{stops.map((stop, index) => (
    <Group key={index} gap="xs" align="flex-end">
```
- **Fix**: Use a stable identifier. Since color stops don't have unique IDs, consider generating them:
```typescript
// Option 1: Create stable IDs when stops are created
interface ColorStop {
    id: string;  // Add unique ID
    offset: number;
    color: string;
}

// Option 2: Create composite key (less ideal but better than index)
{stops.map((stop, index) => (
    <Group key={`${stop.offset}-${stop.color}`} gap="xs" align="flex-end">
```

---

## Low Priority Issues (Nice to Have)

### 1. Magic Numbers in Style Calculations
- **Files**: `src/components/demo/CompactComponentsDemo.tsx:79-90`
- **Description**: HEXA color parsing uses magic numbers (255, 100) without constants or comments explaining the calculation.
- **Example**:
```typescript
const alpha = Math.round((parseInt(alphaHex, 16) / 255) * 100);
```
- **Fix**: Add constants or comments:
```typescript
const MAX_ALPHA_HEX = 255;
const MAX_OPACITY_PERCENT = 100;
const alpha = Math.round((parseInt(alphaHex, 16) / MAX_ALPHA_HEX) * MAX_OPACITY_PERCENT);
```

### 2. Inconsistent Use of Spread Operator with Spaces
- **Files**: Multiple components
- **Description**: The spread operator is used with spaces (`... value`) instead of the standard style (`...value`).
- **Example**: `src/components/sidebar/controls/RichTextStyleEditor.tsx:46`
```typescript
onChange({... value, enabled});  // Non-standard spacing
```
- **Fix**: Configure ESLint/Prettier to enforce consistent spacing:
```typescript
onChange({...value, enabled});  // Standard style
```

### 3. Missing aria-label on Some Interactive Elements
- **Files**: Various components
- **Description**: Some interactive elements like action icons and inputs are missing `aria-label` attributes for accessibility.
- **Example**: `src/components/demo/CompactComponentsDemo.tsx:273-275`
```typescript
<ActionIcon size="compact" variant="subtle">
    <Link2 size={14} />  // No aria-label
</ActionIcon>
```
- **Fix**: Add descriptive aria-labels:
```typescript
<ActionIcon size="compact" variant="subtle" aria-label="Link dimensions">
    <Link2 size={14} />
</ActionIcon>
```

### 4. Demo Component Helper Functions Could Be Extracted
- **Files**: `src/components/demo/CompactComponentsDemo.tsx:927-969`
- **Description**: `Section`, `Grid`, and `GridItem` helper components are defined at the bottom of a large file. They could be extracted for reuse.
- **Fix**: Move to a separate file if reuse is anticipated, or leave as-is since they're demo-specific.

### 5. Commented Code Pattern for noOpOpacity
- **Files**: `src/components/sidebar/controls/RichTextStyleEditor.tsx:29-32`
- **Description**: The `noOpOpacity` function has a comment explaining it's intentionally empty. While good documentation, this suggests an API improvement opportunity.
- **Fix**: Already covered in Medium Priority #4. Refactor `CompactColorInput` to make opacity optional.

### 6. Type Casting in MantineSize for Pill
- **Files**: `src/components/demo/CompactComponentsDemo.tsx:750-752`
- **Description**: Pill component requires casting size to `MantineSize` to use compact size.
- **Example**:
```typescript
<Pill size={"compact" as MantineSize}>Tag 1</Pill>
```
- **Fix**: This appears to be a limitation of Mantine's type definitions. If compact size is properly configured in the theme, consider opening an issue with Mantine or extending the type definitions locally.

---

## Positive Findings

1. **Strong TypeScript Usage**: All components have proper TypeScript interfaces and type annotations. No `any` types in production code.

2. **Consistent Component Structure**: Components follow a consistent pattern with:
   - Interface definitions at the top
   - JSDoc comments explaining purpose
   - Proper separation of handlers and rendering

3. **Good Use of Mantine's Compact Size**: The custom `compact` size is consistently applied across input components, creating a cohesive dense UI.

4. **Local State Pattern for Inputs**: Number inputs and text inputs properly use local state with `onBlur` to prevent losing focus during typing. This is a good UX pattern.
   - Example: `NodeShapeControl.tsx` uses `localSize` state synced on blur

5. **Comprehensive Type Definitions**: `src/types/style-layer.ts` provides thorough type definitions matching graphty-element's schema.

6. **Well-Documented Default Values**: `src/utils/style-defaults.ts` includes detailed comments explaining where default values come from and any differences from graphty-element.

7. **Proper Validation in graphLoader**: `validateGraphData` properly type guards the data with runtime checks before returning typed data.

8. **Accessible Gradient Editor**: `GradientEditor.tsx` includes proper aria-labels for all interactive elements.

---

## Recommendations

### 1. Fix Light Mode Support Following Mantine Best Practices (High Impact)
Based on research of [Mantine's official documentation](https://mantine.dev/theming/color-schemes/), the codebase violates several best practices. This is the highest priority fix:

**Step 1: Update `src/main.tsx` theme extensions**
Replace all `--mantine-color-dark-*` references with semantic variables:
- `--mantine-color-dark-8` → `--mantine-color-default`
- `--mantine-color-dark-2` → `--mantine-color-dimmed`

**Step 2: Audit and replace component color props**
Search for and replace:
- `c="dark.2"` → `c="dimmed"`
- `c="dark.0"` → (remove, use default text color)
- `c="gray.4"` → `c="dimmed"`

**Step 3: Replace inline style colors**
- `backgroundColor: "var(--mantine-color-dark-7)"` → `backgroundColor: "var(--mantine-color-body)"`
- `borderColor: "var(--mantine-color-dark-5)"` → `borderColor: "var(--mantine-color-default-border)"`

**Step 4: Add optional color scheme toggle**
Use `useComputedColorScheme()` (not `colorScheme` which can be `"auto"`).

### 2. Consolidate Duplicate Types (High Impact)
Merge duplicate type definitions into `src/types/style-layer.ts` and import from there. This is the highest impact change as it affects multiple files and prevents future type drift.

### 3. Create Shared Control Styles (High Impact)
Create a theme extension or shared component library for the repeated checkbox/control styling patterns. This will reduce code duplication and ensure visual consistency.

### 4. Consolidate Default Value Files (Medium Impact)
Merge `src/constants/style-defaults.ts` and `src/utils/style-defaults.ts` into a single authoritative source.

### 5. Make CompactColorInput Opacity Optional (Low Impact)
Refactor `CompactColorInput` to make `onOpacityChange` optional, eliminating the need for no-op callbacks.

### 6. Standardize Spacing Values (Low Impact)
Create spacing constants or consistently use Mantine tokens across all sidebar components.

---

## Appendix A: Mantine Theming Best Practices Reference

This appendix summarizes the official Mantine best practices for theming, based on research of the official documentation.

### What You're Doing Right ✅

| Best Practice | Status |
|---------------|--------|
| Using `MantineProvider` with `defaultColorScheme` | ✅ Yes (`main.tsx:539`) |
| Custom theme via `createTheme()` | ✅ Yes |
| Component extensions for custom sizes | ✅ Excellent pattern for `compact` size |
| Custom dark palette colors | ✅ Yes |

### What Needs Improvement ❌

| Best Practice | Status |
|---------------|--------|
| Use semantic CSS variables (`--mantine-color-body`, etc.) | ❌ Uses hardcoded `dark-*` |
| Use `c="dimmed"` instead of `c="dark.2"` | ❌ Hardcodes dark palette |
| Theme extensions use scheme-adaptive colors | ❌ Hardcodes dark colors |
| Color scheme toggle uses `useComputedColorScheme()` | N/A - No toggle exists |

### Mantine Semantic CSS Variables Quick Reference

| Semantic Variable | Description | Replaces |
|-------------------|-------------|----------|
| `--mantine-color-body` | Page background | `--mantine-color-dark-7` |
| `--mantine-color-text` | Primary text | `--mantine-color-dark-0` |
| `--mantine-color-dimmed` | Secondary/muted text | `--mantine-color-dark-2` |
| `--mantine-color-bright` | Bright text | - |
| `--mantine-color-anchor` | Link color | - |
| `--mantine-color-default` | Component background | `--mantine-color-dark-6`, `dark-8` |
| `--mantine-color-default-hover` | Hover state | - |
| `--mantine-color-default-color` | Component text | - |
| `--mantine-color-default-border` | Borders | `--mantine-color-dark-5` |
| `--mantine-color-placeholder` | Input placeholders | - |
| `--mantine-color-error` | Error messages | - |

### Color Prop Quick Reference

| Instead of | Use |
|------------|-----|
| `c="dark.0"` | Remove (default) or `c="text"` |
| `c="dark.2"` | `c="dimmed"` |
| `c="gray.4"` | `c="dimmed"` |
| `c="gray.5"` | `c="dimmed"` |

### Official Documentation Links

- [Color Schemes](https://mantine.dev/theming/color-schemes/) - Native dark theme support
- [CSS Variables](https://mantine.dev/styles/css-variables/) - Available semantic variables
- [Colors](https://mantine.dev/theming/colors/) - Color system and `virtualColor()`
- [PostCSS Preset](https://mantine.dev/styles/postcss-preset/#light-dark-and-alpha-functions) - `light-dark()` CSS function

---

## Summary

The codebase is well-structured with good TypeScript practices and consistent component patterns. The main issues are:
1. **Light mode is broken** due to hardcoded dark theme colors in both theme extensions and components (violates Mantine best practices)
2. Code duplication across type definitions and default values
3. Inconsistent styling patterns that could benefit from shared components

No security vulnerabilities, data loss risks, or critical correctness issues were found. The code quality is generally high with room for improvement in adopting Mantine's semantic theming system.
