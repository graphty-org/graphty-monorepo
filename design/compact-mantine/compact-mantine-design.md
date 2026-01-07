# compact-mantine Package Design

## Executive Summary

This document outlines the design for extracting the Mantine theme and custom components from `@graphty/graphty` into a standalone redistributable npm package called `compact-mantine`. The package will provide a "compact" size variant for Mantine components, optimized for dense UIs like sidebars, property panels, and tool palettes.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Package Structure](#2-package-structure)
3. [Theme Distribution](#3-theme-distribution)
4. [Components](#4-components)
5. [Testing Strategy](#5-testing-strategy)
6. [API Design](#6-api-design)
7. [Build & Distribution](#7-build--distribution)
8. [Migration Plan](#8-migration-plan)
9. [Open Questions](#9-open-questions)

---

## 1. Overview

### 1.1 Problem Statement

The graphty app has developed a comprehensive Mantine theme with a "compact" size variant and several custom components. These are:
- Highly reusable across projects needing dense UIs
- Currently tightly coupled to graphty
- Difficult to share with other projects in the monorepo or externally

### 1.2 Goals

1. **Redistribution**: Create a standalone npm package that can be published to npm
2. **Reusability**: Allow any Mantine-based React project to use the compact theme
3. **Consistency**: Maintain visual consistency with current graphty implementation
4. **Quality**: Comprehensive testing for theme variants and components
5. **Documentation**: Clear API documentation with examples

### 1.3 Non-Goals

- Replacing Mantine's default theme (this is an add-on)
- Supporting Mantine versions < 7.0 or < 8.0 (TBD based on compatibility testing)
- Including graphty-specific business logic or domain components

---

## 2. Package Structure

### 2.1 Recommended Directory Structure

```
compact-mantine/
├── src/
│   ├── index.ts                    # Main barrel export
│   ├── theme/
│   │   ├── index.ts                # Theme exports
│   │   ├── compactTheme.ts         # Main theme configuration
│   │   ├── colors.ts               # Color palette definitions
│   │   ├── components/             # Component theme extensions
│   │   │   ├── index.ts
│   │   │   ├── inputs.ts           # TextInput, NumberInput, Select, etc.
│   │   │   ├── buttons.ts          # Button, ActionIcon
│   │   │   ├── controls.ts         # Checkbox, Switch, Slider, Radio
│   │   │   └── display.ts          # Badge, Pill
│   │   └── cssVariablesResolver.ts # Custom CSS variables (optional)
│   │
│   ├── components/
│   │   ├── index.ts                # Component exports
│   │   ├── ControlSection.tsx      # Collapsible section
│   │   ├── ControlSubGroup.tsx     # Nested collapsible group
│   │   ├── ControlGroup.tsx        # Group container
│   │   ├── CompactColorInput.tsx   # Color picker with opacity
│   │   ├── StyleColorInput.tsx     # Color with default/explicit state
│   │   ├── StyleNumberInput.tsx    # Number with default/explicit state
│   │   ├── StyleSelect.tsx         # Select with default/explicit state
│   │   ├── EffectToggle.tsx        # Checkbox with collapsible children
│   │   ├── GradientEditor.tsx      # Gradient stop editor
│   │   └── StatRow.tsx             # Label/value pair display
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   └── useActualColorScheme.ts # Detects actual light/dark mode
│   │
│   ├── constants/
│   │   ├── index.ts
│   │   ├── colors.ts               # Swatch colors, default colors
│   │   └── spacing.ts              # Mantine spacing constants
│   │
│   ├── utils/
│   │   ├── index.ts
│   │   └── color-utils.ts          # HEXA parsing, opacity conversion
│   │
│   └── types/
│       ├── index.ts
│       └── compact-mantine.d.ts    # TypeScript declarations
│
├── stories/                        # Storybook stories
│   ├── Theme.stories.tsx
│   ├── Components.stories.tsx
│   └── ...
│
├── tests/
│   ├── theme/
│   │   ├── theme-compliance.test.tsx
│   │   └── compact-css-regression.test.tsx
│   └── components/
│       └── *.test.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .storybook/
│   ├── main.ts
│   └── preview.tsx
├── README.md
├── CHANGELOG.md
└── LICENSE
```

### 2.2 Monorepo Integration

The package will be added to the graphty-monorepo as a new workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - 'algorithms'
  - 'layout'
  - 'graphty-element'
  - 'graphty'
  - 'compact-mantine'  # New package
```

---

## 3. Theme Distribution

### 3.1 Theme Architecture

The theme is built using Mantine's `createTheme()` API with custom "compact" size variants for 19 components.

#### 3.1.1 Core Theme Object

```typescript
// src/theme/compactTheme.ts
import { createTheme } from '@mantine/core';
import { inputComponentExtensions } from './components/inputs';
import { buttonComponentExtensions } from './components/buttons';
import { controlComponentExtensions } from './components/controls';
import { displayComponentExtensions } from './components/display';
import { compactColors } from './colors';

export const compactTheme = createTheme({
    colors: compactColors,
    components: {
        ...inputComponentExtensions,
        ...buttonComponentExtensions,
        ...controlComponentExtensions,
        ...displayComponentExtensions,
    },
});
```

#### 3.1.2 Component Extensions Pattern

Each component is extended using Mantine's `Component.extend()` API:

```typescript
// src/theme/components/inputs.ts
import { TextInput, NumberInput, Select, ... } from '@mantine/core';

const compactInputVars = {
    root: {},
    wrapper: {
        '--input-size': '24px',
        '--input-fz': '11px',
        '--input-bg': 'var(--mantine-color-default)',
        '--input-bd': 'none',
    },
};

const compactInputStyles = {
    label: {
        fontSize: 11,
        color: 'var(--mantine-color-dimmed)',
        marginBottom: 1,
        lineHeight: 1.2,
    },
    input: {
        paddingLeft: 8,
        paddingRight: 8,
        border: 'none',
    },
};

export const inputComponentExtensions = {
    TextInput: TextInput.extend({
        vars: (_theme, props) =>
            props.size === 'compact' ? compactInputVars : { root: {}, wrapper: {} },
        styles: (_theme, props) =>
            props.size === 'compact' ? compactInputStyles : {},
    }),
    // ... NumberInput, Select, etc.
};
```

### 3.2 Color Palette

The theme includes a custom dark color palette:

```typescript
// src/theme/colors.ts
export const compactColors = {
    dark: [
        '#d5d7da',  // 0 - lightest
        '#a3a8b1',  // 1
        '#7a828e',  // 2 - dimmed text
        '#5f6873',  // 3
        '#48525c',  // 4
        '#374047',  // 5
        '#2a3035',  // 6 - input background
        '#1f2428',  // 7
        '#161b22',  // 8
        '#0d1117',  // 9 - darkest
    ],
};
```

### 3.3 Theme Merging

Consumers can merge the compact theme with their own customizations:

```typescript
import { mergeThemeOverrides } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

const customTheme = createTheme({
    primaryColor: 'brand',
    colors: {
        brand: [...myBrandColors],
    },
});

const mergedTheme = mergeThemeOverrides(compactTheme, customTheme);
```

### 3.4 Import API

```typescript
// Basic usage
import { compactTheme } from '@graphty/compact-mantine';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

function App() {
    return (
        <MantineProvider theme={compactTheme}>
            {/* Your app */}
        </MantineProvider>
    );
}
```

---

## 4. Components

### 4.1 Component Inventory

Based on analysis of graphty, the following components should be included:

#### 4.1.1 Layout Components

| Component | Description | Props |
|-----------|-------------|-------|
| `ControlSection` | Collapsible section with header | `label`, `defaultOpen`, `hasConfiguredValues`, `children` |
| `ControlSubGroup` | Nested collapsible group | `label`, `defaultOpen`, `children` |
| `ControlGroup` | Non-collapsible group container | `children` |

#### 4.1.2 Input Components

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `CompactColorInput` | Color picker with opacity | Swatch, hex input, opacity slider, HEXA support |
| `StyleColorInput` | Color with default/explicit state | Italic styling for defaults, reset button |
| `StyleNumberInput` | Number with default/explicit state | Min/max/step, suffix, reset button |
| `StyleSelect` | Select with default/explicit state | Reset button, dropdown options |

#### 4.1.3 Effect Components

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `EffectToggle` | Checkbox with expandable content | Shows children when checked |
| `GradientEditor` | Multi-stop gradient editor | Add/remove stops, direction control |

#### 4.1.4 Display Components

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `StatRow` | Label/value pair | For read-only stats display |

### 4.2 Component Design Patterns

#### 4.2.1 Default vs Explicit Value Pattern

Several components distinguish between default values (from parent/system) and explicitly set values:

```typescript
interface StyleInputProps<T> {
    /** Current value - undefined means using default */
    value: T | undefined;
    /** Default value to show when value is undefined */
    defaultValue: T;
    /** Called when value changes */
    onChange: (value: T | undefined) => void;
}
```

Visual indicators:
- **Default state**: Italic text, dimmed color, no reset button
- **Explicit state**: Normal text, standard color, reset button shown

#### 4.2.2 Semantic Color Variables

All components use Mantine's semantic color variables for light/dark mode compatibility:

```typescript
// CORRECT - works in both modes
'var(--mantine-color-default)'      // Background
'var(--mantine-color-dimmed)'       // Muted text
'var(--mantine-color-default-border)' // Borders

// INCORRECT - only works in dark mode
'var(--mantine-color-dark-7)'       // Hardcoded dark color
```

### 4.3 Components NOT Included

The following graphty components are too domain-specific:

- `NodeColorControl`, `EdgeLineControl` - Graph-specific
- `AiChatDialog`, `AiSettingsModal` - AI integration
- `DataGrid`, `DataAccordion` - Data viewing (could be separate package)
- `Graphty.tsx` - graphty-element wrapper

### 4.4 Potential Future Components

Based on `progressive-disclosure-design.md`:

| Component | Description | Priority |
|-----------|-------------|----------|
| `PopoverPanel` | Floating settings panel (Figma-style) | High |
| `SettingsButton` | Trigger for popover (gear icon) | High |
| `TabGroup` | Organize popover content | Medium |
| `ToggleSwitch` | Figma-style toggle (replacing checkboxes) | Medium |

---

## 5. Testing Strategy

### 5.1 Testing Levels

#### 5.1.1 Unit Tests (Theme)

**Purpose**: Verify theme configuration is correct

```typescript
// tests/theme/theme-compliance.test.tsx
describe('theme compliance', () => {
    it('should not use hardcoded dark-N colors', () => {
        const themeStr = JSON.stringify(compactTheme);
        expect(themeStr).not.toMatch(/--mantine-color-dark-[0-9]/);
    });

    it('should use semantic color variables', () => {
        // Verify --mantine-color-default, --mantine-color-dimmed, etc.
    });
});
```

#### 5.1.2 CSS Regression Tests

**Purpose**: Verify computed CSS values match design spec

```typescript
// tests/theme/compact-css-regression.test.tsx
describe('Compact CSS Regression', () => {
    describe('TextInput', () => {
        it('has correct compact height (24px)', () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" />
                </MantineProvider>
            );
            const input = screen.getByRole('textbox');
            expect(getComputedStyle(input).height).toBe('24px');
        });
    });
});
```

#### 5.1.3 Component Tests

**Purpose**: Verify component behavior and accessibility

```typescript
// tests/components/StyleNumberInput.test.tsx
describe('StyleNumberInput', () => {
    it('shows italic styling when using default value', () => {
        render(<StyleNumberInput value={undefined} defaultValue={10} onChange={vi.fn()} />);
        const input = screen.getByRole('spinbutton');
        expect(getComputedStyle(input).fontStyle).toBe('italic');
    });

    it('shows reset button only when explicit value is set', () => {
        const { rerender } = render(<StyleNumberInput value={undefined} defaultValue={10} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();

        rerender(<StyleNumberInput value={20} defaultValue={10} onChange={vi.fn()} />);
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
});
```

### 5.2 Light/Dark Mode Testing

**Purpose**: Verify components work in both color schemes

```typescript
describe('light/dark mode', () => {
    it.each(['light', 'dark'] as const)('renders correctly in %s mode', (colorScheme) => {
        render(
            <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                <TextInput size="compact" label="Test" />
            </MantineProvider>
        );
        // Verify no errors, correct color application
    });
});
```

### 5.3 Visual Regression Testing

**Approach**: Storybook + Chromatic

#### 5.3.1 Storybook Configuration

```typescript
// .storybook/preview.tsx
const preview: Preview = {
    decorators: [
        (Story, context) => {
            const colorScheme = getColorScheme(context.globals);
            return (
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <Story />
                </MantineProvider>
            );
        },
    ],
    parameters: {
        chromatic: {
            modes: {
                light: { colorScheme: 'light' },
                dark: { colorScheme: 'dark' },
            },
        },
    },
};
```

#### 5.3.2 Story Structure

```typescript
// stories/CompactInputs.stories.tsx
export default {
    title: 'Compact/Inputs',
    component: TextInput,
};

export const TextInputCompact: Story = {
    args: {
        size: 'compact',
        label: 'Label',
        placeholder: 'Placeholder',
    },
};

export const TextInputCompactStates: Story = {
    render: () => (
        <Stack>
            <TextInput size="compact" label="Empty" />
            <TextInput size="compact" label="Filled" value="Value" />
            <TextInput size="compact" label="Disabled" disabled />
            <TextInput size="compact" label="Error" error="Error message" />
        </Stack>
    ),
};
```

### 5.4 Interaction Testing

**Purpose**: Verify interactive behaviors

```typescript
// tests/components/CompactColorInput.test.tsx
describe('CompactColorInput interactions', () => {
    it('opens color picker on swatch click', async () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: /color swatch/i }));
        expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('updates color on picker change', async () => {
        const onChange = vi.fn();
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={onChange} />);
        // ... interact with color picker
        expect(onChange).toHaveBeenCalledWith('#00ff00');
    });
});
```

### 5.5 Test Matrix

| Test Type | Theme | Components | Light/Dark | Interactions |
|-----------|-------|------------|------------|--------------|
| Unit | ✅ | ✅ | ✅ | - |
| CSS Regression | ✅ | ✅ | ✅ | - |
| Storybook | ✅ | ✅ | ✅ | - |
| Chromatic | ✅ | ✅ | ✅ | - |
| Integration | - | ✅ | ✅ | ✅ |

### 5.6 Coverage Targets

- Lines: 80%
- Branches: 75%
- Functions: 80%
- Statements: 80%

---

## 6. API Design

### 6.1 Primary Exports

```typescript
// src/index.ts

// Theme exports
export { compactTheme } from './theme';
export { compactColors } from './theme/colors';

// Component exports
export { ControlSection } from './components/ControlSection';
export { ControlSubGroup } from './components/ControlSubGroup';
export { ControlGroup } from './components/ControlGroup';
export { CompactColorInput } from './components/CompactColorInput';
export { StyleColorInput } from './components/StyleColorInput';
export { StyleNumberInput } from './components/StyleNumberInput';
export { StyleSelect } from './components/StyleSelect';
export { EffectToggle } from './components/EffectToggle';
export { GradientEditor } from './components/GradientEditor';
export { StatRow } from './components/StatRow';

// Hook exports
export { useActualColorScheme } from './hooks/useActualColorScheme';

// Constant exports
export { SWATCH_COLORS, SWATCH_COLORS_HEXA, MANTINE_SPACING } from './constants';

// Type exports
export type {
    CompactColorInputProps,
    StyleColorInputProps,
    StyleNumberInputProps,
    StyleSelectProps,
    ControlSectionProps,
    GradientEditorProps,
    ColorStop,
} from './types';
```

### 6.2 Usage Examples

#### 6.2.1 Basic Theme Usage

```tsx
import { MantineProvider, TextInput, Button, Switch } from '@mantine/core';
import '@mantine/core/styles.css';
import { compactTheme } from '@graphty/compact-mantine';

function App() {
    return (
        <MantineProvider theme={compactTheme} defaultColorScheme="dark">
            <TextInput size="compact" label="Name" />
            <Button size="compact">Save</Button>
            <Switch size="compact" label="Enable" />
        </MantineProvider>
    );
}
```

#### 6.2.2 Using Custom Components

```tsx
import { MantineProvider } from '@mantine/core';
import {
    compactTheme,
    ControlSection,
    StyleNumberInput,
    StyleColorInput,
    EffectToggle,
} from '@graphty/compact-mantine';

function PropertiesPanel() {
    const [size, setSize] = useState<number | undefined>(undefined);
    const [color, setColor] = useState<string | undefined>(undefined);
    const [glowEnabled, setGlowEnabled] = useState(false);
    const [glowColor, setGlowColor] = useState('#ffffff');

    return (
        <MantineProvider theme={compactTheme}>
            <ControlSection label="Shape" defaultOpen>
                <StyleNumberInput
                    label="Size"
                    value={size}
                    defaultValue={1.0}
                    onChange={setSize}
                    min={0.1}
                    max={10}
                    step={0.1}
                />
            </ControlSection>

            <ControlSection label="Color" defaultOpen>
                <StyleColorInput
                    label="Fill Color"
                    value={color}
                    defaultValue="#5B8FF9"
                    onChange={setColor}
                />
            </ControlSection>

            <ControlSection label="Effects" defaultOpen={false}>
                <EffectToggle
                    label="Glow"
                    checked={glowEnabled}
                    onChange={setGlowEnabled}
                >
                    <StyleColorInput
                        label="Glow Color"
                        value={glowColor}
                        defaultValue="#ffffff"
                        onChange={setGlowColor}
                    />
                </EffectToggle>
            </ControlSection>
        </MantineProvider>
    );
}
```

#### 6.2.3 Merging with Custom Theme

```tsx
import { createTheme, mergeThemeOverrides, MantineProvider } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

const brandTheme = createTheme({
    primaryColor: 'brand',
    colors: {
        brand: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff',
                '#1890ff', '#096dd9', '#0050b3', '#003a8c', '#002766'],
    },
});

const mergedTheme = mergeThemeOverrides(compactTheme, brandTheme);

function App() {
    return (
        <MantineProvider theme={mergedTheme}>
            {/* Your app */}
        </MantineProvider>
    );
}
```

---

## 7. Build & Distribution

### 7.1 Package Configuration

```json
{
  "name": "@graphty/compact-mantine",
  "version": "1.0.0",
  "description": "Compact size variants for Mantine UI components",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": [
    "dist"
  ],
  "sideEffects": false,
  "peerDependencies": {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@mantine/core": "^8.3.10",
    "@mantine/hooks": "^8.3.10",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@storybook/react-vite": "^8.0.0",
    "lucide-react": "^0.525.0"
  },
  "scripts": {
    "build": "vite build",
    "build:types": "tsc --emitDeclarationOnly",
    "test": "vitest",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage",
    "storybook": "storybook dev -p 9060",
    "build-storybook": "storybook build",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "keywords": [
    "mantine",
    "react",
    "ui",
    "theme",
    "compact",
    "sidebar",
    "property-panel"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/graphty-org/graphty-monorepo.git",
    "directory": "compact-mantine"
  }
}
```

### 7.2 Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true,
        }),
    ],
    build: {
        lib: {
            entry: 'src/index.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                '@mantine/core',
                '@mantine/hooks',
                'lucide-react',
            ],
        },
    },
});
```

### 7.3 TypeScript Configuration

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationDir": "dist",
    "emitDeclarationOnly": false,
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

### 7.4 Nx Integration

```json
// compact-mantine/project.json
{
  "name": "compact-mantine",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "configFile": "compact-mantine/vite.config.ts"
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "configFile": "compact-mantine/vitest.config.ts"
      }
    },
    "storybook": {
      "executor": "@storybook/core/serve",
      "options": {
        "port": 9060,
        "configDir": "compact-mantine/.storybook"
      }
    }
  }
}
```

---

## 8. Migration Plan

### 8.1 Phase 1: Setup Package (1-2 days)

1. Create `compact-mantine/` directory structure
2. Set up build configuration (Vite, TypeScript)
3. Set up test configuration (Vitest)
4. Set up Storybook
   - **Copy existing configs** from `graphty/.storybook/` or `graphty-element/.storybook/`
   - Use `.env` file for port configuration (e.g., `STORYBOOK_PORT=9060`)
   - Reference working configs in `algorithms/`, `layout/`, `graphty/`, `graphty-element/`

### 8.2 Phase 2: Extract Theme (1-2 days)

1. Copy `theme.ts` from graphty
2. Split into modular files (`colors.ts`, `components/*.ts`)
3. Create barrel exports
4. Add unit tests for theme compliance

### 8.3 Phase 3: Extract Components (2-3 days)

1. Copy control components from graphty
2. Update imports (constants, types, utils)
3. Add component tests
4. Create Storybook stories

### 8.4 Phase 4: Testing (1-2 days)

1. Add CSS regression tests
2. Add light/dark mode tests
3. Add interaction tests
4. Set up Chromatic for visual regression

### 8.5 Phase 5: Documentation (1 day)

1. Write README.md with usage examples
2. Add JSDoc comments to all exports
3. Create Storybook documentation

### 8.6 Phase 6: Migrate graphty (1 day)

1. Add `@graphty/compact-mantine` as dependency to graphty
2. Update imports in graphty
3. Remove duplicated code from graphty
4. Verify all tests pass

### 8.7 Phase 7: CSS Module Refactor (1-2 days)

Refactor custom components from inline styles to CSS modules for better performance.

**Components to refactor:**

| Component | Current Approach | Refactor Target |
|-----------|------------------|-----------------|
| `ControlSection` | Inline `style` props | `ControlSection.module.css` |
| `ControlSubGroup` | Inline `style` props | `ControlSubGroup.module.css` |
| `ControlGroup` | Inline `style` props | `ControlGroup.module.css` |
| `CompactColorInput` | Inline `style` props | `CompactColorInput.module.css` |
| `GradientEditor` | Inline `style` props | `GradientEditor.module.css` |
| `DataAccordion`* | Inline `style` props | (if included later) |

**Keep inline for dynamic styles:**
- `StyleNumberInput`: Italic/dimmed for default values (state-dependent)
- `StyleColorInput`: Italic/dimmed for default values (state-dependent)
- `StyleSelect`: Italic/dimmed for default values (state-dependent)

**Steps:**
1. Create `.module.css` files for each component
2. Extract static styles (padding, margins, backgrounds)
3. Keep dynamic styles inline (conditional based on props/state)
4. Verify visual regression tests pass
5. Update Storybook stories

**Example refactor:**

```typescript
// BEFORE: ControlSection.tsx
<Box
    style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        cursor: 'pointer',
        backgroundColor: 'var(--mantine-color-default-hover)',
    }}
>
```

```css
/* AFTER: ControlSection.module.css */
.header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    background-color: var(--mantine-color-default-hover);
}
```

```typescript
// AFTER: ControlSection.tsx
import classes from './ControlSection.module.css';
<Box className={classes.header}>
```

---

## 9. Decisions

### 9.1 Package Naming: `@graphty/compact-mantine`

Scoped under `@graphty` for monorepo consistency.

### 9.2 Mantine Version Support: 8.x Only

- graphty currently uses `@mantine/core": "^8.1.3"`
- Mantine 8.0.0 was released May 2025; most new projects use v8
- Migration from v7 is straightforward if needed
- Supporting both adds complexity for minimal benefit

```json
"peerDependencies": {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0"
}
```

### 9.3 Component Scope: Exclude Data Components

`DataGrid` and `DataAccordion` will **not** be included in this package because:
- They have an external dependency (`@redheadphone/react-json-grid`)
- They can still use the compact theme when the consumer wraps their app in `MantineProvider`
- They could become a separate `@graphty/data-view` package later

The JSON grid themes (`mantineJsonGridDarkTheme/LightTheme`) will also be excluded.

### 9.4 Default Color Scheme: Consumer-Controlled

The theme will **not** set a default color scheme. Consumers control it via `MantineProvider`:

```tsx
// Dark mode (explicit)
<MantineProvider theme={compactTheme} defaultColorScheme="dark">

// Light mode (explicit)
<MantineProvider theme={compactTheme} defaultColorScheme="light">

// System preference (auto)
<MantineProvider theme={compactTheme} defaultColorScheme="auto">
```

---

## 10. CSS Styling Approach

### 10.1 Best Practices (Per Mantine Docs)

According to [Mantine's styles performance documentation](https://mantine.dev/styles/styles-performance/):

| Approach | Performance | Use Case |
|----------|-------------|----------|
| **CSS Modules** | Best | Primary styling method - generates static CSS |
| **Inline Styles** | Good | 1-3 styles per component |
| **Style Props** | Limited | Quick prototyping only |
| **Responsive Props** | Poor at scale | Avoid with many components |

**Key insight**: "CSS modules is the most performant way to apply styles – this approach generates static CSS that is never re-evaluated."

### 10.2 Recommended Approach for compact-mantine

**Hybrid approach**:
1. **Theme extensions** use CSS variables via `vars` prop (already doing this)
2. **Custom components** should use CSS modules for static styles
3. **Dynamic styles** (like "default vs explicit" indicator) use inline `styles` prop

**Current theme example** (good pattern):
```typescript
TextInput.extend({
    vars: (_theme, props) => {
        if (props.size === "compact") {
            return {
                wrapper: {
                    "--input-size": "24px",      // CSS variable
                    "--input-fz": "11px",        // CSS variable
                    "--input-bg": "var(--mantine-color-default)", // Semantic
                },
            };
        }
    },
});
```

**Refactor opportunity** for custom components:
```typescript
// BEFORE (inline styles)
<Box style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>

// AFTER (CSS module)
import classes from './ControlSection.module.css';
<Box className={classes.header}>
```

```css
/* ControlSection.module.css */
.header {
    background-color: var(--mantine-color-default-hover);
    padding: 8px 12px;
    cursor: pointer;
}
```

### 10.3 CSS Layers for Override Control

Mantine supports [CSS layers](https://mantine.dev/styles/css-modules/) for style precedence:

```css
/* Ensure consumer styles override Mantine */
@import '@mantine/core/styles.layer.css';

@layer compact-mantine {
    .compact-input {
        /* These will override Mantine defaults */
    }
}
```

---

## 11. Color Scheme Modularity

### 11.1 Current State Assessment

The current theme uses **semantic color variables** which is good for customization:

```typescript
// ✅ GOOD - Uses semantic variables (auto light/dark)
"--input-bg": "var(--mantine-color-default)"
"color": "var(--mantine-color-dimmed)"

// ✅ GOOD - Custom dark palette can be overridden
colors: {
    dark: ["#d5d7da", "#a3a8b1", ...]
}
```

### 11.2 Recoloring Options for Consumers

**Option 1: Merge with custom colors**
```typescript
import { mergeThemeOverrides, createTheme } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

const brandTheme = createTheme({
    primaryColor: 'brand',
    colors: {
        brand: ['#e6f7ff', '#bae7ff', ...], // Custom brand colors
        dark: ['#f5f5f5', '#e8e8e8', ...],  // Override dark palette
    },
});

const theme = mergeThemeOverrides(compactTheme, brandTheme);
```

**Option 2: CSS variable overrides**
```css
:root {
    /* Override Mantine's semantic colors */
    --mantine-color-default: #your-color;
    --mantine-color-dimmed: #your-dimmed-color;
    --mantine-color-default-hover: #your-hover-color;
}
```

**Option 3: cssVariablesResolver**
```typescript
import { compactTheme } from '@graphty/compact-mantine';

const resolver: CSSVariablesResolver = (theme) => ({
    variables: {},
    light: {
        '--mantine-color-default': '#ffffff',
        '--mantine-color-dimmed': '#868e96',
    },
    dark: {
        '--mantine-color-default': '#25262b',
        '--mantine-color-dimmed': '#909296',
    },
});

<MantineProvider theme={compactTheme} cssVariablesResolver={resolver}>
```

### 11.3 Design Decision: Export Colors Separately

Export the color palette for easy customization:

```typescript
// src/theme/colors.ts
export const compactDarkColors = {
    dark: ['#d5d7da', '#a3a8b1', '#7a828e', ...],
};

// Consumer can create their own
import { compactDarkColors } from '@graphty/compact-mantine';

const myTheme = createTheme({
    colors: {
        ...compactDarkColors,
        primary: myBrandColors,
    },
});
```

---

## 12. Storybook Testing Strategy

### 12.1 State Variations

Use Storybook's story composition to test all component states:

```typescript
// stories/CompactInputs.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TextInput } from '@mantine/core';

const meta: Meta<typeof TextInput> = {
    title: 'Compact/Inputs/TextInput',
    component: TextInput,
    args: {
        size: 'compact',
        label: 'Label',
    },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

// Individual states
export const Empty: Story = {};

export const Filled: Story = {
    args: { value: 'Some value' },
};

export const Disabled: Story = {
    args: { disabled: true, value: 'Disabled' },
};

export const WithError: Story = {
    args: { error: 'This field is required' },
};

export const Focused: Story = {
    args: { autoFocus: true },
};

// All states in one view (for visual comparison)
export const AllStates: Story = {
    render: () => (
        <Stack>
            <TextInput size="compact" label="Empty" />
            <TextInput size="compact" label="Filled" value="Value" />
            <TextInput size="compact" label="Disabled" disabled />
            <TextInput size="compact" label="Error" error="Required" />
        </Stack>
    ),
};
```

### 12.2 Light/Dark Theme Testing

**Configuration in `.storybook/preview.tsx`:**

```typescript
import { MantineProvider } from '@mantine/core';
import { compactTheme } from '../src';

function getColorScheme(globals: Record<string, unknown>): 'light' | 'dark' {
    return globals.theme === 'light' ? 'light' : 'dark';
}

const preview: Preview = {
    globalTypes: {
        theme: {
            description: 'Color scheme',
            toolbar: {
                title: 'Theme',
                icon: 'mirror',
                items: [
                    { value: 'light', title: 'Light', icon: 'sun' },
                    { value: 'dark', title: 'Dark', icon: 'moon' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: 'dark',
    },
    decorators: [
        (Story, context) => {
            const colorScheme = getColorScheme(context.globals);
            return (
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <Story />
                </MantineProvider>
            );
        },
    ],
};
```

### 12.3 Interactive States (Accordion, Checkbox, etc.)

Use [play functions](https://storybook.js.org/docs/writing-tests/interaction-testing) for interactive testing:

```typescript
// stories/ControlSection.stories.tsx
import { expect, userEvent, within } from '@storybook/test';

export const OpenClose: Story = {
    args: {
        label: 'Section',
        defaultOpen: false,
        children: <Text>Content</Text>,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Initially closed
        expect(canvas.queryByText('Content')).not.toBeVisible();

        // Click to open
        const header = canvas.getByText('Section');
        await userEvent.click(header);

        // Now visible
        expect(canvas.getByText('Content')).toBeVisible();

        // Click to close
        await userEvent.click(header);
        expect(canvas.queryByText('Content')).not.toBeVisible();
    },
};

// Checkbox interaction
export const CheckUncheck: Story = {
    render: () => {
        const [checked, setChecked] = useState(false);
        return (
            <EffectToggle
                label="Enable"
                checked={checked}
                onChange={setChecked}
            >
                <Text>Visible when checked</Text>
            </EffectToggle>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const checkbox = canvas.getByRole('checkbox');

        // Initially unchecked
        expect(checkbox).not.toBeChecked();
        expect(canvas.queryByText('Visible when checked')).not.toBeInTheDocument();

        // Check it
        await userEvent.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(canvas.getByText('Visible when checked')).toBeVisible();
    },
};
```

---

## 13. Chromatic Visual Testing

### 13.1 Overview

[Chromatic](https://www.chromatic.com/storybook) provides visual regression testing by capturing snapshots of every story and comparing them across builds.

### 13.2 Setup

**Install Chromatic:**
```bash
pnpm add -D chromatic
```

**Add to CI (`.github/workflows/chromatic.yml`):**
```yaml
name: Chromatic

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          workingDir: compact-mantine
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook
```

### 13.3 Modes Configuration

[Story Modes](https://www.chromatic.com/docs/modes/) allow testing the same story in multiple configurations (light/dark, viewport sizes):

**Create `.storybook/modes.ts`:**
```typescript
export const allModes = {
    'light': {
        theme: 'light',
        backgrounds: { value: '#ffffff' },
    },
    'dark': {
        theme: 'dark',
        backgrounds: { value: '#1a1b1e' },
    },
    'light mobile': {
        theme: 'light',
        viewport: 'mobile',
    },
    'dark desktop': {
        theme: 'dark',
        viewport: 'desktop',
    },
} as const;
```

**Apply modes in `.storybook/preview.tsx`:**
```typescript
import { allModes } from './modes';

const preview: Preview = {
    parameters: {
        chromatic: {
            modes: {
                light: allModes['light'],
                dark: allModes['dark'],
            },
        },
    },
};
```

### 13.4 Per-Story Mode Configuration

Override modes for specific stories:

```typescript
// For a color picker, test both themes
export const ColorPickerOpen: Story = {
    parameters: {
        chromatic: {
            modes: {
                light: allModes['light'],
                dark: allModes['dark'],
            },
        },
    },
    play: async ({ canvasElement }) => {
        // Open the color picker for visual snapshot
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /color swatch/i }));
    },
};
```

### 13.5 Delay for Animations

For components with animations:

```typescript
export const AccordionOpen: Story = {
    parameters: {
        chromatic: {
            delay: 300, // Wait for animation
        },
    },
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText('Section'));
    },
};
```

### 13.6 Testing Matrix

| Component | States to Test | Modes |
|-----------|----------------|-------|
| TextInput | empty, filled, disabled, error, focused | light, dark |
| NumberInput | empty, filled, with-suffix, disabled | light, dark |
| Checkbox | unchecked, checked, disabled | light, dark |
| Switch | off, on, disabled | light, dark |
| ControlSection | collapsed, expanded | light, dark |
| CompactColorInput | closed, picker-open | light, dark |
| StyleNumberInput | default-value, explicit-value | light, dark |
| GradientEditor | 2-stops, 5-stops | light, dark |

---

## 14. Decisions Made

### 14.1 CSS Module Migration

✅ **Decision**: Add as Phase 7 after initial release. Refactor incrementally with visual regression testing.

### 14.2 Storybook Configuration

✅ **Decision**:
- Copy working Storybook configs from existing packages (`graphty/.storybook/`, etc.)
- Use `.env` file for port: `STORYBOOK_PORT=9060`
- Follow the 9000-9099 port convention

---

## 15. Remaining Open Questions

(None at this time)

---

## References

### Mantine Documentation

- [Theme Object](https://mantine.dev/theming/theme-object/)
- [MantineProvider](https://mantine.dev/theming/mantine-provider/)
- [Styles API](https://mantine.dev/styles/styles-api/)
- [Variants and Sizes](https://mantine.dev/styles/variants-sizes/)
- [Default Props](https://mantine.dev/theming/default-props/)
- [Styles Performance](https://mantine.dev/styles/styles-performance/)
- [CSS Modules](https://mantine.dev/styles/css-modules/)

### Storybook & Chromatic

- [Storybook Interaction Testing](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Chromatic Visual Testing](https://www.chromatic.com/storybook)
- [Chromatic Story Modes](https://www.chromatic.com/docs/modes/)
- [Chromatic Themes](https://docs.chromatic.com/docs/themes/)

### Example Packages

- [mantine-react-table](https://github.com/KevinVandy/mantine-react-table) - Component library with peer dependencies
- [manthemes](https://github.com/manthemes-dev/manthemes) - Theme collection (archived)
- [MantineHub Theme Builder](https://github.com/RubixCube-Innovations/mantine-theme-builder) - Theme generation tool

### Internal References

- `graphty/src/theme.ts` - Current theme implementation
- `graphty/src/components/sidebar/controls/` - Current custom components
- `design/ui/progressive-disclosure-design.md` - UI design patterns
