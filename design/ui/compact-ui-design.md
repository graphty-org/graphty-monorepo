# Compact UI Design System

This document defines Graphty's approach to UI density, specifically how we use Mantine's theming system to create a consistent compact style for data-dense interfaces like the properties sidebar.

---

## Table of Contents

1. [End Goal](#end-goal)
2. [Background: How We Got Here](#background-how-we-got-here)
3. [Design Principles: Global vs. Local](#design-principles-global-vs-local)
4. [The Compact Size System](#the-compact-size-system)
5. [Current State Analysis](#current-state-analysis)
6. [Implementation Plan](#implementation-plan)
7. [References](#references)

---

## End Goal

### Vision

Graphty should have a unified styling approach where **UI density is controlled through Mantine's native `size` prop**, not through inline style overrides. Different areas of the application require different densities:

| Context            | Density     | Mantine Size     | Use Case                  |
| ------------------ | ----------- | ---------------- | ------------------------- |
| Modals & Dialogs   | Default     | `md` (36px)      | Focused tasks, user input |
| Main UI            | Comfortable | `sm` (32px)      | General interaction       |
| Properties Sidebar | Compact     | `compact` (24px) | Data-dense, many controls |
| Toolbars           | Variable    | `xs`-`lg`        | Icon-focused actions      |

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MantineProvider                          │
│                              theme                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Global Theme Config                       ││
│  │  • colors (dark palette)                                     ││
│  │  • fontFamily                                                ││
│  │  • defaultRadius                                             ││
│  │  • spacing scale                                             ││
│  │  • components with custom "compact" size                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Left Panel  │  │    Main      │  │    Properties Panel    │ │
│  │  size="sm"   │  │  size="md"   │  │    size="compact"      │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Success Criteria

1. **No inline style overrides for sizing** - All sizing uses `size` prop
2. **Single source of truth** - Compact dimensions defined once in theme
3. **Semantic clarity** - `size="compact"` clearly expresses intent
4. **Mantine-native patterns** - Uses `vars` resolver, not CSS hacks
5. **Consistent density** - All sidebar controls share the same compact feel

---

## Background: How We Got Here

### Phase 1: Initial Implementation

We implemented a Figma-style properties sidebar with compact controls (24px height inputs). The initial approach used inline styles:

```tsx
// ❌ Initial approach - inline styles on every component
<TextInput
    styles={{
        input: {
            height: "24px",
            fontSize: "11px",
            backgroundColor: "var(--mantine-color-dark-8)",
        },
    }}
/>
```

**Problems identified:**

- Styles duplicated across multiple components
- Fighting Mantine's default styling
- No consistency with rest of app
- Poor maintainability

### Phase 2: Centralized Tokens

We refactored to centralize styles in `sidebar-styles.ts`:

```tsx
// ⚠️ Better, but still not Mantine-native
export const inputStyles = {
  root: { "--input-height": "24px", "--input-fz": "11px" },
  input: { backgroundColor: "var(--mantine-color-dark-8)", ... }
};

// Used as:
<TextInput styles={inputStyles} />
```

**Improvements:**

- DRY - styles defined once
- Tokens centralized

**Remaining problems:**

- Still using `styles` prop (Mantine recommends `classNames`)
- Not integrated with app theme
- Sidebar styling completely disconnected from rest of app

### Phase 3: Research & Design (Current)

Research into Mantine best practices and Material Design density guidelines revealed:

1. **Mantine's `styles` prop is discouraged** for primary styling ([Styles API docs](https://mantine.dev/styles/styles-api/))
2. **Density should be a design system concept**, not ad-hoc overrides ([Material Design](https://m3.material.io/foundations/layout/understanding-layout/density))
3. **Custom sizes can be added to theme** via CSS variables resolver ([Mantine docs](https://mantine.dev/styles/variants-sizes/))

This design document captures the path forward.

---

## Design Principles: Global vs. Local

### The Token Hierarchy

Following industry best practices for design tokens:

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 1: Global Tokens                     │
│                   (Primitive/Base values)                    │
│                                                              │
│  Colors:     dark-0 through dark-9, blue-0 through blue-9   │
│  Spacing:    4px, 8px, 12px, 16px, 24px, 32px               │
│  Typography: 10px, 11px, 12px, 13px, 14px                   │
│  Radii:      2px, 4px, 8px                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TIER 2: Semantic Tokens                    │
│                  (Purpose-driven aliases)                    │
│                                                              │
│  surface-primary    → dark-7                                │
│  surface-input      → dark-8                                │
│  text-primary       → dark-0                                │
│  text-secondary     → dark-2                                │
│  separator          → dark-5                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 TIER 3: Component Tokens                     │
│                   (Size/variant specific)                    │
│                                                              │
│  input-height-md      → 36px                                │
│  input-height-sm      → 32px                                │
│  input-height-xs      → 28px                                │
│  input-height-compact → 24px   ← NEW                        │
└─────────────────────────────────────────────────────────────┘
```

### What Should Be Global

These properties ensure visual consistency across the entire application:

| Property             | Rationale                                                 |
| -------------------- | --------------------------------------------------------- |
| **Color palette**    | Brand identity, accessibility compliance, dark/light mode |
| **Font family**      | Reading consistency, brand voice                          |
| **Border radius**    | Visual language, perceived "softness"                     |
| **Focus states**     | Accessibility, interaction feedback                       |
| **Hover states**     | Consistent interaction patterns                           |
| **Spacing scale**    | Visual rhythm, alignment grid                             |
| **Animation timing** | Perceived responsiveness                                  |

### What Should Be Contextual

These properties vary based on the UI context:

| Property                | Contexts                                                 | Rationale                   |
| ----------------------- | -------------------------------------------------------- | --------------------------- |
| **Density/Size**        | Sidebar (compact), Modals (default), Forms (comfortable) | Data density varies by task |
| **Layout direction**    | Toolbars (horizontal), Panels (vertical)                 | Spatial constraints         |
| **Information density** | Tables (high), Cards (low)                               | Scanability vs. focus       |

### The Key Insight

**Density is not about breaking consistency—it's about appropriate consistency.**

A properties panel with 15 controls needs compact sizing to be usable. A login form with 2 fields needs comfortable sizing to feel welcoming. Both should use the _same design system_ with _different density settings_.

Material Design expresses this as: "The more dense your components become, the larger your margins and gutter widths should be to keep your UI legible."

---

## The Compact Size System

### Size Scale

Mantine's default sizes and our addition:

| Size          | Input Height | Font Size | Touch Target | Use Case                |
| ------------- | ------------ | --------- | ------------ | ----------------------- |
| `xs`          | 28px         | 12px      | 28px         | Small inline controls   |
| `sm`          | 32px         | 13px      | 32px         | Secondary forms         |
| `md`          | 36px         | 14px      | 36px         | Primary forms (default) |
| `lg`          | 42px         | 16px      | 42px         | Prominent CTAs          |
| `xl`          | 50px         | 18px      | 50px         | Hero sections           |
| **`compact`** | **24px**     | **11px**  | **24px**     | **Data-dense panels**   |

### Components Requiring Compact Size

The following Mantine components need the `compact` size variant:

#### Input Components

- `TextInput` - Text entry fields
- `NumberInput` - Numeric entry with optional controls
- `NativeSelect` - Native browser select dropdown
- `Select` - Custom styled dropdown
- `Textarea` - Multi-line text (may need special handling)
- `PasswordInput` - Password fields
- `Autocomplete` - Searchable select

#### Control Components

- `SegmentedControl` - Toggle between options
- `Checkbox` - Boolean selection
- `Switch` - Toggle switches
- `Radio` - Single selection from group
- `Slider` - Range selection

#### Button Components

- `Button` - Action buttons (for inline use)
- `ActionIcon` - Icon-only buttons

#### Display Components

- `Badge` - Status indicators
- `Pill` - Removable tags

### Compact Size Specifications

```css
/* Input Components (TextInput, NumberInput, NativeSelect) */
--input-size: 24px;
--input-fz: 11px;
--input-padding-x: 8px;
--input-bg: var(--mantine-color-dark-8);
--input-bd: none;

/* SegmentedControl */
--sc-font-size: 10px;
--sc-padding: 4px 8px;

/* Checkbox */
--checkbox-size: 16px;

/* Switch */
--switch-height: 16px;
--switch-width: 28px;
--switch-thumb-size: 12px;

/* Slider */
--slider-size: 4px; /* track height */
--slider-thumb-size: 12px;

/* Button */
--button-height: 24px;
--button-fz: 11px;
--button-padding-x: 8px;

/* ActionIcon */
--ai-size: 24px;
```

**Note:** These CSS variables are set via Mantine's `vars` resolver in `theme.components`.
Checkbox and Switch labels use InlineInput internally, which doesn't expose label font
size via CSS variables.

---

## Current State Analysis

### Theme Configuration (`src/main.tsx`)

```tsx
// Current state - minimal theme
const theme = createTheme({
    colors: {
        dark: [
            "#d5d7da",
            "#a3a8b1",
            "#7a828e",
            "#5f6873",
            "#48525c",
            "#374047",
            "#2a3035",
            "#1f2428",
            "#161b22",
            "#0d1117",
        ],
    },
});
```

**Missing:**

- No component-level customizations
- No custom sizes defined
- No default props configured

### Sidebar Components

#### `NodeShapeControl.tsx`

```tsx
// Current: Uses shared inputStyles + selectStyles
<NativeSelect
  styles={selectStyles}
  rightSection={<ChevronDownIcon />}
/>
<NumberInput
  styles={inputStyles}
  hideControls
/>
```

#### `NodeColorControl.tsx`

```tsx
// Current: Uses shared inputStyles + labelStyle
<SegmentedControl
  size="xs"  // Using xs, but custom styles override
  styles={segmentedControlStyles}
/>
<TextInput
  styles={{
    ...inputStyles,
    root: {...inputStyles.root, width: "72px"},
  }}
/>
```

#### `ControlGroup.tsx`

```tsx
// Current: Uses SIDEBAR_TOKENS for spacing
<Divider color={SIDEBAR_TOKENS.separatorColor} />
<Text style={{
  fontSize: SIDEBAR_TOKENS.sectionHeaderFontSize,
  // ...
}} />
```

### Files to Modify

| File                          | Current Approach            | Target Approach                                 |
| ----------------------------- | --------------------------- | ----------------------------------------------- |
| `src/main.tsx`                | Minimal theme (colors only) | Add component `vars` resolvers for compact size |
| `src/types/mantine.d.ts`      | Does not exist              | Create for TypeScript "compact" size support    |
| `src/test/test-providers.tsx` | Minimal theme               | Mirror main.tsx theme config                    |

### Files to Update

| File                                                          | Current Approach             | Target Approach                                |
| ------------------------------------------------------------- | ---------------------------- | ---------------------------------------------- |
| `src/components/sidebar/node-controls/NodeShapeControl.tsx`   | `styles={selectStyles}`      | `size="compact"` prop only                     |
| `src/components/sidebar/node-controls/NodeColorControl.tsx`   | `styles={inputStyles}`       | `size="compact"` prop only                     |
| `src/components/sidebar/controls/ControlGroup.tsx`            | Uses `SIDEBAR_TOKENS`        | Mantine props directly (`mt`, `py`, `c`, etc.) |
| `src/components/sidebar/controls/GradientEditor.tsx`          | Mixed `size="xs"` and custom | `size="compact"` consistently                  |
| `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx` | Mixed approaches             | `size="compact"` for inputs                    |

### Files to Delete

| File                                              | Reason                                  |
| ------------------------------------------------- | --------------------------------------- |
| `src/components/sidebar/styles/sidebar-styles.ts` | Tokens absorbed by theme or unnecessary |
| `src/components/sidebar/styles/index.ts`          | No longer needed                        |
| `src/components/sidebar/icons/SidebarIcons.tsx`   | Move to shared location or inline       |
| `src/components/sidebar/icons/index.ts`           | No longer needed                        |

---

## Implementation Plan

This plan uses incremental phases with verification gates. Each phase must pass its gate before proceeding.

---

### Phase 1: Theme Foundation (Validate Approach)

**Goal:** Add compact size to ONE component and verify it works before expanding.

**Files to modify:**

- `src/main.tsx` - Add TextInput compact size only

**Changes:**

```tsx
import { createTheme, TextInput } from "@mantine/core";

const theme = createTheme({
    colors: {
        dark: [
            /* existing palette */
        ],
    },

    components: {
        TextInput: TextInput.extend({
            vars: (theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--input-height": "24px",
                            "--input-fz": "11px",
                            "--input-padding-x": "8px",
                        },
                    };
                }
                return { root: {} };
            },
        }),
    },
});
```

**Verification:**

1. Temporarily add `size="compact"` to one TextInput in sidebar
2. Take screenshot
3. Compare input height - must be 24px
4. Check font size - must be 11px

**Gate:** Does TextInput with `size="compact"` render at 24px height?

- ✅ Yes → Proceed to Phase 2
- ❌ No → Debug CSS variables, check Mantine docs

---

### Phase 2: Expand Theme to All Input Components

**Goal:** Add compact size to all input-type components.

**Files to modify:**

- `src/main.tsx` - Add NumberInput, NativeSelect, SegmentedControl
- `src/types/mantine.d.ts` - Create TypeScript augmentation

**Theme additions:**

```tsx
import { createTheme, TextInput, NumberInput, NativeSelect, SegmentedControl } from "@mantine/core";

const theme = createTheme({
    // ... colors ...

    components: {
        TextInput: TextInput.extend({
            vars: (theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--input-height": "24px",
                            "--input-fz": "11px",
                            "--input-padding-x": "8px",
                        },
                    };
                }
                return { root: {} };
            },
        }),

        NumberInput: NumberInput.extend({
            vars: (theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--input-height": "24px",
                            "--input-fz": "11px",
                            "--input-padding-x": "8px",
                        },
                    };
                }
                return { root: {} };
            },
        }),

        NativeSelect: NativeSelect.extend({
            vars: (theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--input-height": "24px",
                            "--input-fz": "11px",
                            "--input-padding-x": "8px",
                        },
                    };
                }
                return { root: {} };
            },
        }),

        SegmentedControl: SegmentedControl.extend({
            vars: (theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--sc-font-size": "10px",
                            "--sc-padding": "4px 8px",
                        },
                    };
                }
                return { root: {} };
            },
        }),
    },
});
```

**Type augmentation (`src/types/mantine.d.ts`):**

```tsx
import "@mantine/core";

declare module "@mantine/core" {
    export interface MantineSizes {
        compact: string;
    }
}
```

**Verification:**

1. Test each component type with `size="compact"` temporarily
2. Verify 24px height on all input types
3. Build passes with no TypeScript errors

**Gate:** Do all input components support `size="compact"` without type errors?

- ✅ Yes → Proceed to Phase 3
- ❌ No → Fix type augmentation or component vars

---

### Phase 3: Migrate Sidebar Components

**Goal:** Update all sidebar components to use `size="compact"` instead of `styles` prop.

**Files to modify:**

- `src/components/sidebar/node-controls/NodeShapeControl.tsx`
- `src/components/sidebar/node-controls/NodeColorControl.tsx`
- `src/components/sidebar/controls/ControlGroup.tsx`
- `src/components/sidebar/controls/GradientEditor.tsx`
- `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`

**Example changes:**

```tsx
// NodeShapeControl.tsx - Before
<NativeSelect
  styles={selectStyles}
  rightSection={<ChevronDownIcon />}
/>

// NodeShapeControl.tsx - After
<NativeSelect
  size="compact"
  rightSection={<ChevronDownIcon />}
/>
```

```tsx
// NodeColorControl.tsx - Before
<TextInput
  styles={{
    ...inputStyles,
    root: {...inputStyles.root, width: "72px"},
  }}
/>

// NodeColorControl.tsx - After
<TextInput
  size="compact"
  w={72}
/>
```

```tsx
// ControlGroup.tsx - Before
<Divider color={SIDEBAR_TOKENS.separatorColor} ... />
<Text style={{ fontSize: SIDEBAR_TOKENS.sectionHeaderFontSize, ... }}>

// ControlGroup.tsx - After
<Divider color="dark.4" mt={8} mb={0} />
<Text size="xs" fw={500} c="white">
```

**Verification:**

1. Run `npm run build` - no errors
2. Run `npm test` - all 31 tests pass
3. Take screenshot of sidebar
4. Compare with pre-migration screenshot

**Gate:** Do all tests pass AND visual appearance matches?

- ✅ Yes → Proceed to Phase 4
- ❌ No → Debug failing tests or visual differences

---

### Phase 4: Cleanup and Final Verification

**Goal:** Delete obsolete files and verify nothing breaks.

**Files to delete:**

- `src/components/sidebar/styles/sidebar-styles.ts`
- `src/components/sidebar/styles/index.ts`
- `src/components/sidebar/icons/SidebarIcons.tsx` (relocate ChevronDownIcon if still needed)
- `src/components/sidebar/icons/index.ts`

**Files to update:**

- `src/test/test-providers.tsx` - Mirror theme from main.tsx

**Verification:**

1. Run `npm run build` - no import errors
2. Run `npm test` - all tests pass
3. Final visual comparison screenshot
4. Test in browser manually

**Gate:** Clean build, all tests pass, visual parity confirmed?

- ✅ Yes → Migration complete
- ❌ No → Restore deleted files, debug

---

### Phase 5: Documentation

**Goal:** Update any remaining documentation.

**Tasks:**

- Update component JSDoc comments
- Remove references to deleted files
- Consider adding Storybook stories for compact size

---

### Rollback Plan

If any phase fails and cannot be fixed:

1. **Phase 1-2 failure:** Simply remove theme additions, no component changes made yet
2. **Phase 3 failure:** Revert component changes, keep theme (theme is additive)
3. **Phase 4 failure:** Restore deleted files from git

```bash
# Restore deleted files if needed
git checkout HEAD -- src/components/sidebar/styles/
git checkout HEAD -- src/components/sidebar/icons/
```

---

## Code Examples

### Before vs After Summary

**Delete:** `src/components/sidebar/styles/` directory

The entire `sidebar-styles.ts` file should be deleted. Here's why each token is no longer needed:

#### Tokens Absorbed by Theme Compact Size

| Token                                                   | Now Handled By            |
| ------------------------------------------------------- | ------------------------- |
| `inputHeight`, `inputFontSize`, `inputPadding`          | `size="compact"` in theme |
| `labelFontSize`, `labelMarginBottom`, `labelLineHeight` | `size="compact"` in theme |

#### Tokens That Were Unnecessary (Mantine Defaults)

| Token                     | Reason to Delete                 |
| ------------------------- | -------------------------------- |
| `labelColor: dark-2`      | Mantine's default label color    |
| `labelFontWeight: 400`    | Mantine's default                |
| `inputBackground: dark-8` | Mantine's filled variant default |
| `inputTextColor: gray-0`  | Mantine's default text color     |

#### Tokens Moved to ControlGroup Component

| Token                                              | New Location              |
| -------------------------------------------------- | ------------------------- |
| `sectionHeaderFontSize`, `sectionHeaderFontWeight` | Hardcoded in ControlGroup |
| `separatorColor`, `separatorMarginTop`             | Hardcoded in ControlGroup |
| `sectionPaddingTop`, `sectionPaddingBottom`        | Hardcoded in ControlGroup |

#### Tokens Replaced by Direct Values

| Token           | Replacement                           |
| --------------- | ------------------------------------- |
| `controlGap: 4` | Use `gap={4}` directly on Stack/Group |

**Updated ControlGroup:**

```tsx
// ControlGroup.tsx - self-contained, no external tokens
import { Box, Divider, Group, Stack, Text } from "@mantine/core";

export function ControlGroup({ label, actions, children }) {
    return (
        <Box>
            <Divider color="dark.4" mt={8} mb={0} />
            <Group justify="space-between" py={8}>
                <Text size="xs" fw={500} c="white">
                    {label}
                </Text>
                {actions && <Group gap={4}>{actions}</Group>}
            </Group>
            <Stack gap={0}>{children}</Stack>
        </Box>
    );
}
```

**Rationale:**

1. **No abstraction for abstraction's sake** - SIDEBAR_TOKENS added indirection without value
2. **Mantine defaults are correct** - We were overriding values to match defaults
3. **ControlGroup owns its layout** - It's sidebar-specific, so layout values belong there
4. **Theme owns component sizing** - The `size="compact"` pattern is the right abstraction

---

## Migration Checklist

**Status: ✅ COMPLETED (2025-12-07)**

### Phase 1: Theme Setup (Input Components)

- [x] Add compact size to TextInput in theme (`vars` resolver)
- [x] Add compact size to NumberInput in theme
- [x] Add compact size to NativeSelect in theme
- [x] Add compact size to SegmentedControl in theme
- [x] Create TypeScript type augmentation for "compact" size (`src/types/mantine.d.ts`)
- [x] Update test-providers.tsx with same theme config

### Phase 2: Theme Setup (Control Components)

- [x] Add compact size to Checkbox in theme (16px size)
- [x] Add compact size to Switch in theme (16px height, 28px width, 12px thumb)
- [x] Add compact size to Slider in theme (4px track, 12px thumb)
- [x] Add compact size to Button in theme (24px height, 11px font, 8px padding)
- [x] Add compact size to ActionIcon in theme (24px size)
- [x] Update test-providers.tsx with same theme config
- [x] Create CompactControlsRegression.test.tsx (9 tests)

**Note:** Checkbox and Switch labels use Mantine's InlineInput internally, which doesn't
expose label font size via CSS variables. Label styling requires `styles` or `classNames` props.

### Component Updates

- [x] Update NodeShapeControl: remove `styles` prop, add `size="compact"`
- [x] Update NodeColorControl: remove `styles` prop, add `size="compact"`
- [x] Update StyleLayerPropertiesPanel inputs: add `size="compact"`
- [x] Update ControlGroup: remove SIDEBAR_TOKENS imports, use Mantine props directly

### Cleanup

- [x] Delete `src/components/sidebar/styles/` directory
- [x] Delete `src/components/sidebar/icons/` directory (using lucide-react ChevronDown instead)
- [x] Remove all `inputStyles`, `selectStyles`, `labelStyle` imports
- [x] Remove all inline `styles={{...}}` overrides for sizing

### Verification

- [x] Run `npm run build` - no TypeScript errors
- [x] Run `npm test` - all 53 tests pass
- [x] Visual verification with Playwright screenshots

---

## References

### Mantine Documentation

- [Styles API](https://mantine.dev/styles/styles-api/) - Why `classNames` > `styles`
- [Styles Performance](https://mantine.dev/styles/styles-performance/) - Inline style caveats
- [Variants and Sizes](https://mantine.dev/styles/variants-sizes/) - Adding custom sizes
- [Theme Object](https://mantine.dev/theming/theme-object/) - Theme configuration
- [Default Props](https://mantine.dev/theming/default-props/) - Component defaults

### Material Design

- [Density Guidelines](https://m3.material.io/foundations/layout/understanding-layout/density) - When to use compact
- [Applying Density](https://m2.material.io/design/layout/applying-density.html) - Implementation guidance

### Design Systems

- [Design Tokens Guide](https://thedesignsystem.guide/design-tokens) - Token hierarchy
- [UXPin Consistency Guide](https://www.uxpin.com/studio/blog/guide-design-consistency-best-practices-ui-ux-designers/) - Global vs local

### Internal Documents

- [Figma Style Sidebar](./figma-style-sidebar.md) - Original design specification
- [Properties Sidebar Implementation](./properties-sidebar-implementation-plan.md) - Implementation phases

---

## Appendix: Visual Comparison

### Before (Inline Styles)

```tsx
// Every component has explicit size overrides
<TextInput
    styles={{
        root: { "--input-height": "24px", "--input-fz": "11px" },
        input: {
            backgroundColor: "var(--mantine-color-dark-8)",
            height: "24px",
            fontSize: "11px",
        },
    }}
/>
```

### After (Theme-Based)

```tsx
// Clean, semantic, maintainable
<TextInput size="compact" />
```

The theme handles all the complexity, and every `size="compact"` component automatically gets consistent styling.
