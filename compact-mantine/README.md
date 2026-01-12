# @graphty/compact-mantine

[![npm version](https://img.shields.io/npm/v/@graphty/compact-mantine.svg)](https://www.npmjs.com/package/@graphty/compact-mantine)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/compact-mantine/)

A Mantine theme and component library optimized for dense, compact UIs. All components default to compact sizing automatically using Mantine's `defaultProps` system.

## Features

- **Compact by Default**: All components render at compact size without explicit props
- **Mantine-Idiomatic**: Uses `defaultProps` with `size="sm"` as default
- **Global Token Overrides**: Smaller font sizes, tighter spacing, compact radii
- **Visual Styling**: Borderless inputs, semantic color backgrounds
- **Fully Customizable**: Spread the theme to add your own customizations

## Installation

```bash
npm install @graphty/compact-mantine @mantine/core @mantine/hooks
```

## Quick Start

```tsx
import { MantineProvider, TextInput, Button } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

function App() {
    return (
        <MantineProvider theme={compactTheme}>
            {/* Components use compact sizing automatically */}
            <TextInput label="Name" />
            <Button>Submit</Button>
        </MantineProvider>
    );
}
```

## Usage

### Default Compact Sizing

No size prop needed - components render compact by default:

```tsx
// All of these use compact sizing automatically
<TextInput label="Name" />
<NumberInput label="Amount" />
<Select label="Country" data={countries} />
<Button>Submit</Button>
<Checkbox label="I agree" />
<Switch label="Enable notifications" />
```

### Override to Larger Sizes

When you need larger components, use the standard Mantine size prop:

```tsx
// Override to larger sizes when needed
<TextInput size="md" label="Medium Input" />
<TextInput size="lg" label="Large Input" />
<Button size="lg">Large Button</Button>
```

### Theme Customization

Spread the compact theme to add your own customizations:

```tsx
import { MantineProvider } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

const customTheme = {
    ...compactTheme,
    primaryColor: 'teal',
    other: {
        myCustomProperty: true,
    },
};

function App() {
    return (
        <MantineProvider theme={customTheme}>
            {/* Still compact by default with your customizations */}
            <Button>Teal Button</Button>
        </MantineProvider>
    );
}
```

### Compact Region in Larger UI

Use nested `MantineProvider` to create compact regions within a regular-sized UI:

```tsx
import { MantineProvider, TextInput, Button } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

function App() {
    return (
        <MantineProvider>
            {/* Regular Mantine UI */}
            <TextInput label="Regular Size" />

            {/* Compact region */}
            <MantineProvider theme={compactTheme}>
                <div className="settings-panel">
                    <TextInput label="Compact Input" />
                    <Button>Compact Button</Button>
                </div>
            </MantineProvider>
        </MantineProvider>
    );
}
```

## Global Token Overrides

The compact theme overrides Mantine's global tokens:

| Token | Values |
|-------|--------|
| **fontSizes** | xs=10px, sm=11px, md=13px, lg=14px, xl=16px |
| **spacing** | xs=4px, sm=6px, md=8px, lg=12px, xl=16px |
| **radius** | xs=2px, sm=4px, md=6px, lg=8px, xl=12px |

## Exports

### Theme

```tsx
import { compactTheme, compactColors, compactDarkColors } from '@graphty/compact-mantine';
```

- `compactTheme` - Complete Mantine theme with compact defaults
- `compactColors` - Color palette including dark colors
- `compactDarkColors` - Dark color palette array

### Components

```tsx
import {
    CompactColorInput,
    ControlGroup,
    ControlSection,
    ControlSubGroup,
    EffectToggle,
    GradientEditor,
    Popout,
    PopoutManager,
    StatRow,
    StyleNumberInput,
    StyleSelect,
} from '@graphty/compact-mantine';
```

### Hooks

```tsx
import { useActualColorScheme } from '@graphty/compact-mantine';
```

## Affected Components (43 total)

### Input Components (14)
TextInput, NumberInput, Select, Textarea, PasswordInput, Autocomplete, MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, ColorInput, NativeSelect, InputWrapper

### Button Components (3)
Button, ActionIcon, CloseButton

### Control Components (6)
Switch, Checkbox, Radio, Slider, RangeSlider, SegmentedControl

### Display Components (7)
Badge, Text, Avatar, ThemeIcon, Indicator, Kbd, Pill

### Navigation Components (6)
Tabs, NavLink, Pagination, Stepper, Anchor, Burger

### Feedback Components (3)
Loader, Progress, RingProgress

### Overlay Components (4)
Menu, Tooltip, Popover, HoverCard

## Migration from size="compact"

If you're migrating from the previous `size="compact"` pattern:

1. Remove all `size="compact"` props - components are now compact by default
2. Add `size="md"` or `size="lg"` where you previously relied on Mantine's default sizing

See the [Migration Guide](./stories/docs/Migration.mdx) for detailed instructions.

## License

MIT
