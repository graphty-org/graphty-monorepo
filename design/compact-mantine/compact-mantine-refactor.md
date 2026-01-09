# Compact Mantine Theme Refactor Design

## Overview

This document outlines a comprehensive refactor of the `@graphty/compact-mantine` theme package to align with Mantine best practices and provide a more ergonomic API for application developers building dense, professional UIs (similar to design tools like Figma, VS Code, or Blender).

## Table of Contents

1. [Research & Background](#research--background)
2. [Current State Analysis](#current-state-analysis)
3. [Design Principles](#design-principles)
4. [Proposed Architecture](#proposed-architecture)
5. [API Design](#api-design)
6. [Implementation Details](#implementation-details)
7. [Migration Guide](#migration-guide)
8. [Testing Strategy](#testing-strategy)
9. [Open Questions](#open-questions)

---

## Research & Background

### Mantine Theming Capabilities

Mantine provides a layered customization system via `createTheme()`:

| Layer | Purpose | Use Case |
|-------|---------|----------|
| `defaultProps` | Set default prop values | Make `size="sm"` the default |
| `vars` | Override CSS variables | Change dimensions (`--button-height`) |
| `styles` | Direct style overrides | Apply specific CSS properties |
| `classNames` | CSS class bindings | Use external CSS/Tailwind |

**Key insight**: The `vars` function receives `(theme, props)` and should return CSS variable overrides. This is the idiomatic way to customize component dimensions.

**Source**: [Mantine Theme Object](https://mantine.dev/theming/theme-object/), [Mantine Styles API](https://mantine.dev/styles/styles-api/)

### Material Design Density Guidelines

Google's Material Design provides well-researched guidance on UI density:

#### Density Scale
- **Default (0)**: Standard spacing, optimized for touch
- **Comfortable (-1 to -2)**: Slightly reduced spacing
- **Compact (-3 to -5)**: Maximum density, each step = 4px reduction

#### When to Use Density
- **DO use for**: Data tables, long forms, sidebars, toolbars, dense information displays
- **DON'T use for**: Dialogs, popovers, date pickers (they don't compete for layout space)

#### Accessibility Requirements
- Maintain 48px minimum touch targets (use external padding if visual size is smaller)
- Increase margins/gutters as component density increases (design equilibrium)

**Source**: [Material UI Density](https://mui.com/material-ui/customization/density/), [Material Design Density](https://m2.material.io/design/layout/applying-density.html), [Using Material Density on the Web](https://medium.com/google-design/using-material-density-on-the-web-59d85f1918f0)

### How Other Libraries Handle Density

#### Material UI (MUI)
```tsx
const theme = createTheme({
  components: {
    MuiButton: { defaultProps: { size: 'small' } },
    MuiTextField: { defaultProps: { margin: 'dense' } },
    MuiTable: { defaultProps: { size: 'small' } },
  },
});
```

#### Ant Design
```tsx
<ConfigProvider componentSize="small">
  {/* All components use small size */}
</ConfigProvider>
```

#### Chakra UI
```tsx
const theme = extendTheme({
  components: {
    Button: { defaultProps: { size: 'sm' } },
  },
});
```

**Pattern**: All major libraries use `defaultProps` to set global size defaults, keeping size orthogonal to visual styling.

---

## Current State Analysis

### Current Implementation

Our current theme uses a custom `size="compact"` that bundles both dimensions AND visual styling:

```tsx
// Current: inputs.ts
const compactInputVars = {
  wrapper: {
    "--input-size": "24px",      // Dimension ✓
    "--input-fz": "11px",        // Dimension ✓
    "--input-bg": "var(--mantine-color-default)", // Visual style ✗
    "--input-bd": "none",        // Visual style ✗
  },
};

const compactInputStyles = {
  label: {
    fontSize: 11,
    color: "var(--mantine-color-dimmed)", // Visual style ✗
  },
  input: {
    border: "none", // Visual style ✗
  },
};
```

### Problems with Current Approach

| Problem | Impact |
|---------|--------|
| **Conflated concerns** | Size includes border/background styling |
| **Non-standard size value** | `size="compact"` isn't a Mantine standard |
| **Requires explicit prop** | Every component needs `size="compact"` |
| **Can't mix sizes** | No way to have compact dimensions with different visual styles |
| **Verbose conditional logic** | Every component checks `if (props.size === "compact")` |

### Current File Structure

```
src/theme/
├── index.ts              # Main theme export
├── colors.ts             # Color definitions
└── components/
    ├── index.ts          # Component exports
    ├── inputs.ts         # Input components (TextInput, Select, etc.)
    ├── buttons.ts        # Button, ActionIcon, CloseButton
    ├── controls.ts       # Switch, Slider, etc.
    ├── display.ts        # Badge, Card, etc.
    ├── feedback.ts       # Alert, Notification, etc.
    └── navigation.ts     # Tabs, NavLink, etc.
```

### Components Currently Themed

**Inputs**: TextInput, NumberInput, Select, Textarea, PasswordInput, Autocomplete, ColorInput, Checkbox, MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, InputClearButton

**Buttons**: Button, ActionIcon, CloseButton

**Controls**: Switch, Slider, SegmentedControl, Chip

**Display**: Badge, Card, Code, Kbd, Table, Text, Title, Tooltip, Avatar, Indicator, ThemeIcon

**Feedback**: Alert, Loader, Progress, RingProgress

**Navigation**: Tabs, NavLink, Pagination, Stepper, Anchor, Burger

---

## Design Principles

### 1. Separation of Concerns

| Concern | Mechanism | Controlled By |
|---------|-----------|---------------|
| **Dimensions** | Global tokens + `vars` | `size` prop or theme defaults |
| **Visual style** | `styles` or `variant` | `variant` prop or theme defaults |
| **Behavior** | `defaultProps` | Individual props |

### 2. Sensible Defaults

Applications should get a complete dense UI experience with zero configuration:

```tsx
// This should "just work" with compact styling
<MantineProvider theme={compactTheme}>
  <TextInput label="Name" />
</MantineProvider>
```

### 3. Escape Hatches

Easy to override defaults when needed:

```tsx
// Override for specific components
<Button size="md" variant="filled">Important Action</Button>
```

### 4. Composability

Support compact regions within non-compact apps via nested `MantineProvider`:

```tsx
<MantineProvider theme={existingTheme}>
  <MainContent />  {/* Normal styling */}
  <MantineProvider theme={compactTheme}>
    <Sidebar />    {/* Compact styling */}
  </MantineProvider>
</MantineProvider>
```

### 5. Mantine Idioms

Use standard Mantine patterns:
- Standard size values (`xs`, `sm`, `md`, `lg`, `xl`)
- Standard variants (`filled`, `outline`, `light`, `subtle`)
- CSS variables for theming
- `defaultProps` for global defaults

---

## Proposed Architecture

### Core Concept: Density + Style Presets

```
┌─────────────────────────────────────────────────────────────┐
│                     compactTheme                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Density Tokens    │    │      Style Preset           │ │
│  │   (fontSizes,       │ +  │   (variants, colors,        │ │
│  │    spacing, etc.)   │    │    visual treatments)       │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                              │                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Component Default Props                     │ │
│  │   (size="sm", variant="subtle", etc.)                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### New File Structure

```
src/
├── index.ts                    # Public API exports
├── theme.ts                    # The compact theme (main export)
├── colors.ts                   # Color definitions
└── components/
    ├── index.ts               # Combined component extensions
    ├── inputs.ts              # Input component extensions
    ├── buttons.ts             # Button component extensions
    ├── controls.ts            # Control component extensions
    ├── display.ts             # Display component extensions
    ├── feedback.ts            # Feedback component extensions
    └── navigation.ts          # Navigation component extensions
```

Simplified structure - no separate tokens, styles, or utils folders. Everything needed is in `theme.ts` and the component extensions.

### Compact Token System

A single, well-tuned set of compact tokens:

```tsx
// tokens/compact.ts

export interface CompactTokens {
  // Component heights
  inputHeight: string;
  buttonHeight: string;
  controlHeight: string;

  // Typography
  fontSize: string;
  labelFontSize: string;

  // Spacing
  inputPaddingX: string;
  inputPaddingY: string;
  gap: string;

  // Icons
  iconSize: string;
  chevronSize: string;
}

export const compactTokens: CompactTokens = {
  inputHeight: "24px",
  buttonHeight: "24px",
  controlHeight: "24px",
  fontSize: "11px",
  labelFontSize: "11px",
  inputPaddingX: "8px",
  inputPaddingY: "4px",
  gap: "4px",
  iconSize: "14px",
  chevronSize: "12px",
};
```

For users who need slightly different sizes on specific components, use Mantine's built-in `size` prop (`xs`, `sm`, `md`, `lg`, `xl`) rather than a separate density system.

### Mantine Token Overrides

Instead of custom `size="compact"`, override Mantine's standard tokens:

```tsx
// themes/compact.ts

import { createTheme } from "@mantine/core";

export const compactTheme = createTheme({
  // Override global tokens to be compact by default
  fontSizes: {
    xs: "10px",
    sm: "11px",   // Our compact size
    md: "13px",
    lg: "14px",
    xl: "16px",
  },

  spacing: {
    xs: "4px",
    sm: "6px",
    md: "8px",    // Tighter than Mantine default
    lg: "12px",
    xl: "16px",
  },

  radius: {
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  },

  // Component defaults
  components: {
    // All inputs default to sm size with filled variant
    TextInput: TextInput.extend({
      defaultProps: {
        size: "sm",
        variant: "filled",
      },
    }),

    // All buttons default to sm size
    Button: Button.extend({
      defaultProps: {
        size: "sm",
      },
    }),

    // etc.
  },
});
```

### Visual Style Separation

Move visual styling to variants or dedicated style functions:

```tsx
// styles/compact.ts

/**
 * Compact visual styles: borderless, semantic backgrounds, subtle shadows
 */
export const compactInputStyles = {
  root: {},
  wrapper: {},
  input: {
    border: "none",
    backgroundColor: "var(--mantine-color-default)",
    "&:focus": {
      outline: "2px solid var(--mantine-color-blue-filled)",
      outlineOffset: "-2px",
    },
  },
  label: {
    color: "var(--mantine-color-dimmed)",
    marginBottom: "2px",
  },
};

export const compactButtonStyles = {
  root: {
    // Compact button styling
  },
};
```

### Component Extension Pattern

```tsx
// components/inputs.ts

import { TextInput, NumberInput, Select } from "@mantine/core";
import { compactInputStyles } from "../styles/compact";

export const inputExtensions = {
  TextInput: TextInput.extend({
    defaultProps: {
      size: "sm",
      variant: "filled",
    },
    styles: () => compactInputStyles,
  }),

  NumberInput: NumberInput.extend({
    defaultProps: {
      size: "sm",
      variant: "filled",
    },
    styles: () => compactInputStyles,
  }),

  Select: Select.extend({
    defaultProps: {
      size: "sm",
      variant: "filled",
    },
    styles: () => compactInputStyles,
  }),

  // ... etc
};
```

---

## API Design

### Primary API: Pre-built Theme

```tsx
// Most common usage - just import and use
import { MantineProvider } from "@mantine/core";
import { compactTheme } from "@graphty/compact-mantine";

function App() {
  return (
    <MantineProvider theme={compactTheme}>
      <MyApplication />
    </MantineProvider>
  );
}
```

### Secondary API: Spread-based Customization

```tsx
// For customizations, use standard JavaScript spread
import { compactTheme } from "@graphty/compact-mantine";

const customTheme = {
  ...compactTheme,
  primaryColor: "teal",
  // Override any Mantine theme property
};

function App() {
  return (
    <MantineProvider theme={customTheme}>
      <MyApplication />
    </MantineProvider>
  );
}
```

### Tertiary API: Compact Region (Manual)

For users who want compact styling in just **part** of their app, use a nested `MantineProvider`:

```tsx
// Existing app with their own theme
import { MantineProvider } from "@mantine/core";
import { compactTheme } from "@graphty/compact-mantine";

function App() {
  return (
    <MantineProvider theme={existingTheme}>
      {/* Normal Mantine styling */}
      <Header />
      <MainContent />

      {/* Only this region uses compact styling */}
      <MantineProvider theme={compactTheme}>
        <Sidebar />
      </MantineProvider>
    </MantineProvider>
  );
}
```

### Per-Component Size Adjustments

For components that need to be slightly larger or smaller than the compact default, use Mantine's built-in `size` prop:

```tsx
// Within a compact-themed app
<Button size="xs">Extra small</Button>
<Button>Default compact</Button>
<Button size="md">Larger button</Button>

<TextInput size="xs" label="Dense input" />
<TextInput label="Default compact" />
<TextInput size="md" label="More spacious" />
```

This avoids the complexity of multiple density systems while giving users escape hatches when needed.

### Use Case Summary

| Use Case | API | Example |
|----------|-----|---------|
| **Entire app is compact** | `compactTheme` | Dense data app, design tool |
| **Customize colors/fonts** | Spread override | `{ ...compactTheme, primaryColor: "violet" }` |
| **Compact region in normal app** | Nested `MantineProvider` | Sidebar, modal, panel |
| **One component larger/smaller** | Mantine `size` prop | `<Button size="xs">` |

### Export Structure

```tsx
// src/index.ts

// Primary export - the theme
export { compactTheme } from "./theme";

// Colors (for advanced users who want to reference them)
export { compactColors } from "./colors";
```

The API is intentionally minimal. Users customize via spread and create regions via nested `MantineProvider`.

---

## Implementation Details

### Phase 1: Token System

1. Define density token interfaces and values
2. Create Mantine token overrides (`fontSizes`, `spacing`, `radius`)
3. Test that standard sizes (`xs`, `sm`, `md`) work correctly

### Phase 2: Separate Visual Styles

1. Extract visual styling from current `vars`/`styles` functions
2. Create `compactInputStyles`, `compactButtonStyles`, etc.
3. Define as static objects (not functions) where possible

### Phase 3: Component Extensions

1. Refactor each component extension to use:
   - `defaultProps` for size/variant defaults
   - `styles` for visual styling (static)
   - `vars` only when dynamic theming needed
2. Remove conditional `if (props.size === "compact")` logic

### Phase 4: Theme Assembly

1. Create `compactTheme` combining global tokens + component extensions
2. Use `light-dark()` CSS for automatic dark mode support
3. Export from `index.ts`

### Component Migration Checklist

For each component:

- [ ] Remove custom `size="compact"` handling
- [ ] Add `defaultProps` with `size: "sm"`
- [ ] Move visual styles to static `styles` object
- [ ] Remove conditional logic from `vars` function
- [ ] Update tests
- [ ] Update Storybook examples

### Size Mapping

| Current | New |
|---------|-----|
| `size="compact"` | `size="sm"` (default) |
| `size="sm"` | `size="xs"` |
| Default | `size="md"` |

---

## Migration Guide

### For Applications Using `size="compact"`

**Before:**
```tsx
<TextInput size="compact" label="Name" />
<Button size="compact">Submit</Button>
```

**After:**
```tsx
// No size prop needed - sm is the default
<TextInput label="Name" />
<Button>Submit</Button>

// Or explicitly:
<TextInput size="sm" label="Name" />
```

### For Applications Mixing Sizes

**Before:**
```tsx
<TextInput size="compact" />  {/* Compact */}
<TextInput />                 {/* Mantine default */}
```

**After:**
```tsx
<TextInput />                 {/* Compact (new default) */}
<TextInput size="md" />       {/* Larger size */}
```

### Breaking Changes

1. **`size="compact"` removed**: Use `size="sm"` instead (or omit for default)
2. **Visual styling always applied**: Previously required explicit `size="compact"`
3. **Token values changed**: `fontSizes.sm` is now `11px` instead of Mantine default

---

## Testing Strategy

### Unit Tests

1. **Token tests**: Verify density tokens produce correct CSS
2. **Component tests**: Each component renders with expected styles
3. **Default props tests**: Verify defaults are applied correctly

### Visual Regression Tests

1. **Storybook snapshots**: Capture all component states
2. **Size comparison**: Compare compact vs Mantine default sizes
3. **Dark mode**: Verify dark theme rendering

### Integration Tests

1. **Theme application**: Verify theme applies to entire app
2. **Nested providers**: Test compact regions via nested MantineProvider
3. **Override behavior**: Test escaping defaults with explicit props

### Accessibility Tests

1. **Touch targets**: Verify 48px minimum (with padding)
2. **Contrast ratios**: Ensure text remains readable
3. **Focus indicators**: Verify visible focus states

---

## Open Questions

### 1. Keep `size="compact"` as Alias?

**Option A**: Remove entirely, use only `size="sm"`
- Pro: Cleaner, follows Mantine conventions
- Con: Breaking change for existing users

**Option B**: Keep as alias that maps to `size="sm"`
- Pro: Backwards compatible
- Con: Non-standard, confusing

**Recommendation**: Option A - clean break, document migration path

### 2. Dark Theme Handling

**Option A**: Single theme with CSS `light-dark()` functions
- Pro: Simpler, one theme export
- Con: Less explicit control

**Option B**: Separate `compactTheme` and `compactDarkTheme`
- Pro: Explicit, easy to understand
- Con: More exports, potential sync issues

**Recommendation**: Option A with `light-dark()` for colors

### 3. Which Components Get Visual Styling?

Should all components get compact styling (borderless, semantic backgrounds), or only inputs/buttons?

**Recommendation**:
- **Full styling**: Inputs, buttons, controls (interactive elements)
- **Minimal styling**: Display components (Badge, Card) - just size adjustments
- **No styling**: Layout components (Stack, Grid) - not applicable

### 4. Popout/Dialog Exception

Per Material Design guidelines, dialogs shouldn't use compact density.

**Options**:
- A) Leave popovers/dialogs at default density
- B) Apply compact everywhere for consistency
- C) Make it configurable

**Recommendation**: Option A - dialogs at default density

---

## Appendix: Component Inventory

### Full Styling (Interactive)

| Component | Size | Variant | Visual Styles |
|-----------|------|---------|---------------|
| TextInput | sm | filled | borderless, semantic bg |
| NumberInput | sm | filled | borderless, semantic bg |
| Select | sm | filled | borderless, semantic bg |
| Textarea | sm | filled | borderless, semantic bg |
| PasswordInput | sm | filled | borderless, semantic bg |
| Autocomplete | sm | filled | borderless, semantic bg |
| MultiSelect | sm | filled | borderless, semantic bg |
| TagsInput | sm | filled | borderless, semantic bg |
| Checkbox | sm | - | compact checkbox |
| Switch | sm | - | compact switch |
| Slider | sm | - | compact slider |
| Button | sm | light | compact button |
| ActionIcon | sm | subtle | compact icon button |

### Size Only (Display)

| Component | Size | Notes |
|-----------|------|-------|
| Badge | sm | Just smaller |
| Text | sm | Just smaller font |
| Title | - | Adjusted scale |
| Tooltip | - | Tighter padding |
| Table | - | Compact rows |

### No Changes (Layout/Utility)

- Stack, Group, Grid, Flex
- Box, Container
- Portal, Transition

---

## Appendix B: Mantine Theme Ecosystem Analysis

This section analyzes existing Mantine theme packages and tools to inform our API design.

### Key Finding

**There are very few pre-built, installable Mantine theme packages.** Most "themes" are either:
- Theme generators/builders (web tools that output code to copy)
- Organization-specific themes (not general-purpose)
- Integration tools (Tailwind, Storybook)
- Archived/unmaintained projects

This represents an opportunity for `@graphty/compact-mantine` to fill a gap in the ecosystem.

### Existing Theme Packages & Tools

#### 1. MantineHub (mantine-theme-builder)
**GitHub**: [RubixCube-Innovations/mantine-theme-builder](https://github.com/RubixCube-Innovations/mantine-theme-builder)
**Stars**: 318 (most popular)
**Type**: Web-based theme generator

**How it works**:
- Visual editor at mantinehub.com
- Select color palettes (Zinc, Slate, Gray, etc.)
- Adjust border radius
- Toggle light/dark mode preview
- **Copy generated theme object** into your project

**Usage** (copy-paste approach):
```tsx
// 1. Generate theme at mantinehub.com
// 2. Copy the generated theme object
// 3. Paste into your project:
import { MantineProvider } from '@mantine/core';
import { yourCustomTheme } from './your-custom-theme';

function App() {
  return (
    <MantineProvider theme={yourCustomTheme}>
      <YourAppComponents />
    </MantineProvider>
  );
}
```

**Key insight**: No npm package - themes are generated and copied manually.

---

#### 2. manthemes
**npm**: [manthemes](https://www.npmjs.com/package/manthemes)
**GitHub**: [manthemes-dev/manthemes](https://github.com/manthemes-dev/manthemes)
**Status**: ⚠️ Archived (July 2024)

**Installation**:
```bash
npm install manthemes
```

**Usage**:
```tsx
import { MantineProvider } from "@mantine/core";
import { retro } from "manthemes/daisyui";

function App() {
  return (
    <MantineProvider theme={retro} withGlobalStyles withNormalizeCSS>
      <YourOutlet />
    </MantineProvider>
  );
}
```

**Available themes**: DaisyUI-inspired themes (retro, nightfox, moonlight, etc.)

**Key insight**: Simple import pattern - `import { themeName } from "manthemes/collection"`. Archived, so no longer maintained.

---

#### 3. Remoraid (mantine-theme-generator)
**GitHub**: [kahvilei/mantine-theme-generator](https://github.com/kahvilei/mantine-theme-generator)
**Stars**: 48
**Type**: Visual theme editor for Mantine v8

**Features**:
- Real-time preview
- Customize colors, typography, spacing, components
- Export to JSON or TypeScript
- Preset themes with thematic naming

**Usage**: Similar to MantineHub - generate and copy.

---

#### 4. tailwind-preset-mantine
**GitHub**: [songkeys/tailwind-preset-mantine](https://github.com/songkeys/tailwind-preset-mantine)
**npm**: [tailwind-preset-mantine](https://www.npmjs.com/package/tailwind-preset-mantine)
**Type**: Tailwind CSS integration

**Installation**:
```bash
npm install tailwind-preset-mantine
```

**Usage**:
```css
@import "tailwind-preset-mantine";
```

**Custom theme integration**:
```bash
# Generate CSS from custom Mantine theme
npx tailwind-preset-mantine theme.js -o theme.css
```

**Key insight**: Bridges Mantine CSS variables with Tailwind utilities. Not a theme itself.

---

#### 5. @rss3/mantine-theme
**npm**: [@rss3/mantine-theme](https://www.npmjs.com/package/@rss3/mantine-theme)
**GitHub**: [RSS3-Network/mantine-theme](https://github.com/RSS3-Network/mantine-theme)
**Type**: Organization-specific theme

**Usage** (presumed):
```tsx
import { MantineProvider } from '@mantine/core';
import { rss3Theme } from '@rss3/mantine-theme';

function App() {
  return (
    <MantineProvider theme={rss3Theme}>
      {/* ... */}
    </MantineProvider>
  );
}
```

**Key insight**: Brand-specific theme for RSS3 apps. Not general-purpose.

---

#### 6. @refinedev/mantine (RefineThemes)
**Docs**: [Refine Mantine Theming](https://refine.dev/core/docs/ui-integrations/mantine/theming/)
**Type**: Part of Refine framework

**Installation** (as part of Refine):
```bash
npm install @refinedev/mantine
```

**Available themes**: Blue, Purple, Magenta, Red, Orange, Yellow

**Usage**:
```tsx
import { Refine } from "@refinedev/core";
import { ThemedLayout, RefineThemes } from "@refinedev/mantine";
import { MantineProvider } from "@mantine/core";

const App = () => (
  <MantineProvider theme={RefineThemes.Blue}>
    <Refine>
      <ThemedLayout>{/* ... */}</ThemedLayout>
    </Refine>
  </MantineProvider>
);
```

**Extending themes**:
```tsx
const customTheme = {
  ...RefineThemes.Blue,
  colors: {
    ...RefineThemes.Blue.colors,
    brand: ["#fff", "#eee", /* ... */],
  },
};
```

**Key insight**: Named theme presets with spread-based customization. Tied to Refine framework.

---

#### 7. mantine-themes (willpinha)
**GitHub**: [willpinha/mantine-themes](https://github.com/willpinha/mantine-themes)
**Status**: ⚠️ Archived (April 2025)

**Approach**: Semantic colors (primary, secondary, tertiary)

**Usage** (copy function approach):
```tsx
import { createMantineTheme } from "./create-mantine-theme.ts";

const theme = createMantineTheme({
  baseHue: 120,
  baseSaturation: 20,
  colors: {
    primary: [...],
    secondary: [...],
    tertiary: [...]
  }
});

<MantineProvider theme={theme}>
  {/* ... */}
</MantineProvider>
```

**Key insight**: Theme factory function with semantic color system. Archived.

---

#### 8. storybook-addon-mantine
**npm**: [storybook-addon-mantine](https://www.npmjs.com/package/storybook-addon-mantine)
**Type**: Storybook integration

**Usage**:
```tsx
// .storybook/preview.js
import { withMantine } from 'storybook-addon-mantine';

export const decorators = [withMantine];
export const parameters = {
  mantine: {
    themes: [
      { id: 'light', name: 'Light', theme: lightTheme },
      { id: 'dark', name: 'Dark', theme: darkTheme },
    ],
  },
};
```

**Key insight**: Theme switching for Storybook development. Not a theme itself.

---

### API Patterns Comparison

| Package | Import Style | Customization | Type |
|---------|--------------|---------------|------|
| **manthemes** | `import { retro } from "manthemes/daisyui"` | None (use as-is) | Pre-built |
| **RefineThemes** | `import { RefineThemes } from "@refinedev/mantine"` | Spread & override | Pre-built |
| **MantineHub** | Copy/paste generated code | Full (before copy) | Generator |
| **tailwind-preset** | CSS import | CLI generation | Integration |
| **mantine-themes** | `createMantineTheme({...})` | Factory function | Factory |

### Lessons for Our Design

#### What Works Well

1. **Simple imports** (manthemes, RefineThemes):
   ```tsx
   import { compactTheme } from "@graphty/compact-mantine";
   ```

2. **Spread-based customization** (RefineThemes):
   ```tsx
   const custom = { ...compactTheme, primaryColor: "violet" };
   ```

3. **Minimal API surface** - fewer exports = easier to understand and maintain

#### What to Avoid

1. **Copy/paste workflows** - Friction for updates, no versioning
2. **Deep nesting** - `manthemes/daisyui/retro` is harder to discover
3. **No defaults** - Requiring configuration for basic usage
4. **Tight framework coupling** - RefineThemes only works with Refine

### Our Competitive Advantage

Our `@graphty/compact-mantine` package fills a gap:

| Feature | MantineHub | manthemes | RefineThemes | **Ours** |
|---------|------------|-----------|--------------|----------|
| npm installable | ❌ | ✅ | ✅ (framework) | ✅ |
| Maintained | ✅ | ❌ Archived | ✅ | ✅ |
| Dense/compact focus | ❌ | ❌ | ❌ | ✅ |
| Zero-config default | N/A | ✅ | ✅ | ✅ |
| Minimal API | N/A | ✅ | ⚠️ | ✅ |
| Framework agnostic | ✅ | ✅ | ❌ | ✅ |

### Recommended API (Based on Research)

```tsx
// Primary: Zero-config import (like manthemes)
import { compactTheme } from "@graphty/compact-mantine";

<MantineProvider theme={compactTheme}>
  {/* Everything compact by default */}
</MantineProvider>

// Secondary: Spread-based override (like RefineThemes)
const customTheme = {
  ...compactTheme,
  primaryColor: "teal",
};

// Tertiary: Compact region in non-compact app (nested MantineProvider)
<MantineProvider theme={existingTheme}>
  <MainContent />
  <MantineProvider theme={compactTheme}>
    <Sidebar />
  </MantineProvider>
</MantineProvider>
```

The API is minimal: one export (`compactTheme`), customize via spread, create regions via standard Mantine nesting.

---

## References

- [Mantine Theme Object](https://mantine.dev/theming/theme-object/)
- [Mantine Styles API](https://mantine.dev/styles/styles-api/)
- [Mantine Variants and Sizes](https://mantine.dev/styles/variants-sizes/)
- [Material UI Density](https://mui.com/material-ui/customization/density/)
- [Material Design Density Guidelines](https://m2.material.io/design/layout/applying-density.html)
- [Using Material Density on the Web](https://medium.com/google-design/using-material-density-on-the-web-59d85f1918f0)
- [Mantine GitHub Discussions](https://github.com/orgs/mantinedev/discussions/7365)
- [MantineHub](https://github.com/RubixCube-Innovations/mantine-theme-builder)
- [manthemes](https://github.com/manthemes-dev/manthemes)
- [Remoraid Theme Generator](https://github.com/kahvilei/mantine-theme-generator)
- [tailwind-preset-mantine](https://github.com/songkeys/tailwind-preset-mantine)
- [Refine Mantine Theming](https://refine.dev/core/docs/ui-integrations/mantine/theming/)
- [mantine-themes (willpinha)](https://github.com/willpinha/mantine-themes)
