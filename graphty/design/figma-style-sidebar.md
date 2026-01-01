# Figma-Style Sidebar Design Specification

This document captures the design analysis and implementation approach for creating a Figma-style properties sidebar in our React application using Mantine components.

## Reference Image

![Figma Sidebar Reference](../tmp/figma-sidebar.png)

The reference image shows Figma's right-side Design Panel (properties sidebar) displaying properties for a selected element.

---

## Visual Analysis

### Overall Panel Structure

| Property                 | Value                             |
| ------------------------ | --------------------------------- |
| Panel width              | ~240-280px                        |
| Background color         | Dark gray (#2C2C2C)               |
| Horizontal padding       | 16px                              |
| Vertical section spacing | 8px between separator and content |

### Color Palette

| Purpose                  | Hex Value | Usage                                   |
| ------------------------ | --------- | --------------------------------------- |
| Panel background         | `#2C2C2C` | Main sidebar background                 |
| Input background         | `#1E1E1E` | Text inputs, number inputs, dropdowns   |
| Input background (hover) | `#252525` | Hover state for inputs                  |
| Text primary             | `#FFFFFF` | Input values, main content              |
| Text secondary           | `#888888` | Labels, section headers, muted text     |
| Text tertiary            | `#666666` | Placeholders, disabled text             |
| Separator line           | `#404040` | Horizontal dividers between sections    |
| Accent/Selection         | `#0D99FF` | Selected rows, focus states, checkboxes |
| Icon default             | `#999999` | Action icons in normal state            |
| Icon hover               | `#CCCCCC` | Action icons on hover                   |

### Typography

| Element         | Size | Weight        | Color     | Transform |
| --------------- | ---- | ------------- | --------- | --------- |
| Section header  | 11px | 500 (medium)  | `#888888` | uppercase |
| Control label   | 11px | 400 (regular) | `#888888` | none      |
| Input value     | 12px | 400 (regular) | `#FFFFFF` | none      |
| Hex color value | 12px | 400 (regular) | `#FFFFFF` | uppercase |

- **Font family**: System font stack (SF Pro on macOS, Segoe UI on Windows) or Inter
- **Letter spacing**: 0.5px on uppercase section headers
- **Line height**: ~1.4 for readability

### Spacing System

All spacing follows a 4px base unit:

| Token | Value | Usage                                  |
| ----- | ----- | -------------------------------------- |
| `xs`  | 4px   | Gap between icons, tight spacing       |
| `sm`  | 8px   | Gap between controls, standard spacing |
| `md`  | 16px  | Panel padding, section padding         |
| `lg`  | 24px  | Large gaps (rarely used)               |

### Border Radius

| Element             | Radius |
| ------------------- | ------ |
| Inputs              | 4px    |
| Color swatches      | 4px    |
| Checkboxes          | 2-3px  |
| Selection highlight | 4px    |
| Action icon hover   | 4px    |

### Component Dimensions

| Element            | Dimensions                         |
| ------------------ | ---------------------------------- |
| Control row height | 32px                               |
| Input height       | 28px                               |
| Action icon        | 24×24px (hit area), 12-14px (icon) |
| Color swatch       | 20×20px                            |
| Checkbox           | 16×16px                            |

---

## Section-by-Section Breakdown

### Section Headers

```
┌─────────────────────────────────────────────────┐
│ ─────────────────────────────────────────────── │  ← 1px separator, #404040
│  SECTION NAME                    [⊞] [+]       │  ← header row
└─────────────────────────────────────────────────┘
```

- **Separator**: 1px solid line, extends full panel width (ignores padding)
- **Header text**: Uppercase, 11px, weight 500, color `#888888`
- **Action buttons**: Right-aligned, 4px gap between icons
- **Vertical padding**: 12px top, 8px bottom

### Layout Section

Contains:

1. **Resizing row**: "W" and "H" dimension inputs side by side
    - Input has letter prefix ("W" or "H") in muted gray inside the field
    - Dropdown chevron indicates it's interactive
    - ~8px gap between the two inputs
    - Constraint icon on far right

2. **Clip content**: Checkbox with label
    - 16×16px checkbox
    - 8px gap to label text
    - Entire row is clickable

### Appearance Section

Contains:

1. **Header icons**: Three icon buttons (blend mode, visibility, fill/stroke toggle)
2. **Opacity input**: Icon prefix (keyboard icon), value "100%"
3. **Corner radius input**: Icon prefix (corner bracket), value "0"
4. **Constraint icon**: Four-corner bracket for linked/independent corners

### Fill Section

Property row structure:

```
[■ swatch] [FFFFFF] [100] [%] [👁] [−]
```

- **Color swatch**: 20×20px, 4px radius, 1px border `rgba(255,255,255,0.1)`
- **Hex value**: Editable text input, ~80px width
- **Opacity**: Number input, ~40px width
- **Percent label**: Static "%" text
- **Visibility toggle**: Eye icon, 24×24px
- **Remove button**: Minus icon, 24×24px

**Selected state**: Full-width blue background (`#0D99FF`) with 4px radius, text remains white

### Stroke Section

- Empty state shows only header with "+" action button
- When populated, uses same PropertyRow structure as Fill

### Effects Section

Similar to Fill, but with:

- **Checkbox**: Optional enable/disable toggle on the left
- **Effect type dropdown**: "Drop shadow" with chevron
- Effect-specific properties would expand below

### Selection Colors Section

Shows colors used in current selection:

- Color swatch + hex value + opacity for each color
- No action buttons (informational only)
- Scrollable if many colors

---

## Component Architecture

### Component Hierarchy

```
<SidebarPanel>
  <ControlSection name="Node Properties" icon={<IconCircle />}>
    <ControlGroup name="Layout" actions={...}>
      <DimensionInputPair />
      <CheckboxControl label="Clip content" />
    </ControlGroup>

    <ControlGroup name="Appearance" actions={...}>
      <InputPair>
        <IconInput icon={opacity} value="100%" />
        <IconInput icon={corner} value="0" />
      </InputPair>
    </ControlGroup>

    <ControlGroup name="Fill" actions={...}>
      <PropertyRow color="#FFFFFF" opacity={100} selected />
    </ControlGroup>
  </ControlSection>

  <ControlSection name="Edge Properties" icon={<IconLine />}>
    <ControlGroup name="Stroke" actions={...}>
      <PropertyRow color="#888888" opacity={100} />
    </ControlGroup>

    <ControlGroup name="Style" actions={...}>
      <Select data={['Solid', 'Dashed', 'Dotted']} />
    </ControlGroup>

    <ControlGroup name="Effects" actions={...}>
      <PropertyRow type="dropdown" value="Drop shadow" />
    </ControlGroup>
  </ControlSection>
</SidebarPanel>
```

### Core Components

#### 1. ControlSection

Top-level accordion container that groups related ControlGroups. Used to organize properties by entity type (e.g., Node Properties, Edge Properties) and allow users to focus on one section at a time.

**Visual Design:**

```
┌─────────────────────────────────────────────────┐
│  [▼] [◯] Node Properties              [⋮] [+]  │  ← section header (clickable)
├─────────────────────────────────────────────────┤
│                                                 │
│  ─────────────────────────────────────────────  │  ← ControlGroup separator
│  LAYOUT                              [+]       │
│  [W 400 ▾] [H 26 ▾]                   [⊡]     │
│                                                 │
│  ─────────────────────────────────────────────  │
│  APPEARANCE                                     │
│  [⌨ 100%] [⌜⌝ 0]                              │
│                                                 │
│  ─────────────────────────────────────────────  │
│  FILL                                [⊞] [+]   │
│  [■] FFFFFF  100%  [👁] [−]                    │
│                                                 │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  [▶] [―] Edge Properties              [⋮] [+]  │  ← collapsed section
└─────────────────────────────────────────────────┘
```

**Header Styling:**

- **Background**: Slightly elevated from panel (`#353535`, dark[6])
- **Height**: 40px
- **Padding**: 8px horizontal, centered vertically
- **Border radius**: 4px (top corners only when expanded, all corners when collapsed)
- **Chevron**: 16px, rotates 90° when collapsed → expanded
- **Icon**: Optional 16px icon representing the section type
- **Title**: 13px, weight 500, color `#FFFFFF` (brighter than ControlGroup headers)
- **Actions**: Right-aligned, same as ControlGroup actions

**Behavior:**

- Clicking header toggles expanded/collapsed state
- Only one section can be expanded at a time (accordion behavior) - optional, configurable
- Smooth height animation on expand/collapse (200ms ease-out)
- Collapsed state shows only header
- Expanded state reveals all child ControlGroups

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Section title (sentence case, not uppercase) |
| `icon` | `ReactNode` | Optional icon displayed before title |
| `actions` | `ReactNode` | Optional action buttons for header |
| `children` | `ReactNode` | ControlGroups within the section |
| `defaultExpanded` | `boolean` | Initial expanded state (default: true) |
| `expanded` | `boolean` | Controlled expanded state |
| `onExpandedChange` | `(expanded: boolean) => void` | Callback when expanded state changes |

**Structure:**

- Header with chevron, icon, title, and actions
- Collapsible content area containing ControlGroups
- No separator above first ControlGroup (section header serves as visual separator)

#### 2. ControlGroup

Container for a section of related controls.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Section header text (displayed uppercase) |
| `actions` | `ReactNode` | Optional action buttons for header |
| `children` | `ReactNode` | Controls within the group |
| `collapsible` | `boolean` | Whether section can be collapsed |
| `defaultExpanded` | `boolean` | Initial expanded state |

**Structure:**

- Top separator (full-width)
- Header row with name and actions
- Content area with children
- Handles empty state (header only)

#### 2. PropertyRow

Row displaying a property with color/value and actions.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `color` | `string` | Hex color value |
| `opacity` | `number` | Opacity 0-100 |
| `selected` | `boolean` | Whether row is selected |
| `visible` | `boolean` | Visibility state |
| `onColorChange` | `(color: string) => void` | Color change handler |
| `onOpacityChange` | `(opacity: number) => void` | Opacity change handler |
| `onVisibilityToggle` | `() => void` | Toggle visibility |
| `onRemove` | `() => void` | Remove this property |

#### 3. DimensionInputPair

Paired width/height inputs with optional constraint lock.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `width` | `number` | Width value |
| `height` | `number` | Height value |
| `locked` | `boolean` | Whether proportions are constrained |
| `onWidthChange` | `(w: number) => void` | Width change handler |
| `onHeightChange` | `(h: number) => void` | Height change handler |
| `onLockToggle` | `() => void` | Toggle constraint |

#### 4. IconInput

Input with icon prefix inside the field.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `icon` | `ReactNode` | Icon component |
| `value` | `string \| number` | Input value |
| `suffix` | `string` | Optional suffix (e.g., "%") |
| `onChange` | `(value: string) => void` | Change handler |

---

## Implementation Approach

### Strategy: Theme-First with Structural Components

We use Mantine's theming system to apply Figma-like styling globally, then create lightweight structural components that compose standard Mantine primitives.

**Rationale:**

1. **Consistency**: All Mantine components (TextInput, ActionIcon, etc.) automatically inherit Figma styling
2. **Minimal custom code**: Components focus on structure/behavior, not fighting default styles
3. **Familiar API**: Developers use standard Mantine props
4. **Maintainability**: Style changes happen in one place (theme)
5. **Flexibility**: Can still override styles per-component when needed

### Mantine Component Mapping

| Our Design        | Mantine Component       | Customization                             |
| ----------------- | ----------------------- | ----------------------------------------- |
| ControlSection    | `Accordion`             | Theme styles for header, chevron, content |
| Text input        | `TextInput`             | Theme styles + `leftSection` for prefix   |
| Number input      | `NumberInput`           | Theme styles                              |
| Dropdown          | `Select`                | Theme styles                              |
| Checkbox          | `Checkbox`              | Theme styles                              |
| Icon button       | `ActionIcon`            | Theme styles (variant="subtle")           |
| Color swatch      | `ColorSwatch`           | Mostly default, custom border             |
| Separator         | `Divider`               | Theme color                               |
| Layout containers | `Group`, `Stack`, `Box` | Spacing from theme                        |
| Panel container   | `Paper`                 | Background from theme                     |

### Theme Definition

```tsx
// src/theme/figma.ts
import { createTheme, MantineColorsTuple } from "@mantine/core";

const figmaDark: MantineColorsTuple = [
    "#FFFFFF", // 0 - text primary
    "#CCCCCC", // 1 - text/icon hover
    "#999999", // 2 - icon default
    "#888888", // 3 - text secondary/labels
    "#666666", // 4 - text tertiary/placeholder
    "#404040", // 5 - separator, hover backgrounds
    "#353535", // 6 - elevated surface
    "#2C2C2C", // 7 - panel background
    "#1E1E1E", // 8 - input background
    "#141414", // 9 - deepest background
];

export const figmaTheme = createTheme({
    primaryColor: "blue",
    primaryShade: 6,

    colors: {
        dark: figmaDark,
        blue: [
            "#E7F5FF",
            "#D0EBFF",
            "#A5D8FF",
            "#74C0FC",
            "#4DABF7",
            "#339AF0",
            "#0D99FF",
            "#1C7ED6",
            "#1971C2",
            "#1864AB",
        ],
    },

    defaultRadius: "sm",
    radius: { sm: "4px", md: "6px" },

    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px" },

    fontSizes: {
        xs: "11px",
        sm: "12px",
        md: "13px",
    },

    components: {
        TextInput: {
            defaultProps: { variant: "filled" },
            styles: (theme) => ({
                input: {
                    backgroundColor: theme.colors.dark[8],
                    border: "none",
                    color: theme.colors.dark[0],
                    height: 28,
                    minHeight: 28,
                    "&::placeholder": { color: theme.colors.dark[4] },
                    "&:focus": {
                        border: `1px solid ${theme.colors.blue[6]}`,
                    },
                },
                label: {
                    color: theme.colors.dark[3],
                    fontSize: theme.fontSizes.xs,
                    fontWeight: 400,
                    marginBottom: 4,
                },
            }),
        },

        NumberInput: {
            defaultProps: { variant: "filled" },
            styles: (theme) => ({
                input: {
                    backgroundColor: theme.colors.dark[8],
                    border: "none",
                    color: theme.colors.dark[0],
                    height: 28,
                    minHeight: 28,
                },
            }),
        },

        Select: {
            defaultProps: { variant: "filled" },
            styles: (theme) => ({
                input: {
                    backgroundColor: theme.colors.dark[8],
                    border: "none",
                    color: theme.colors.dark[0],
                    height: 28,
                    minHeight: 28,
                },
            }),
        },

        Checkbox: {
            styles: (theme) => ({
                input: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.dark[4],
                    borderRadius: 2,
                    "&:checked": {
                        backgroundColor: theme.colors.blue[6],
                        borderColor: theme.colors.blue[6],
                    },
                },
                label: {
                    color: theme.colors.dark[0],
                    fontSize: theme.fontSizes.sm,
                },
            }),
        },

        ActionIcon: {
            defaultProps: { variant: "subtle", color: "gray" },
            styles: (theme) => ({
                root: {
                    color: theme.colors.dark[2],
                    "&:hover": {
                        backgroundColor: theme.colors.dark[5],
                        color: theme.colors.dark[1],
                    },
                },
            }),
        },

        Divider: {
            styles: (theme) => ({
                root: {
                    borderColor: theme.colors.dark[5],
                },
            }),
        },

        Paper: {
            styles: (theme) => ({
                root: {
                    backgroundColor: theme.colors.dark[7],
                },
            }),
        },

        ScrollArea: {
            styles: (theme) => ({
                scrollbar: {
                    '&[data-orientation="vertical"]': { width: 8 },
                    backgroundColor: "transparent",
                },
                thumb: {
                    backgroundColor: theme.colors.dark[5],
                },
            }),
        },

        Accordion: {
            styles: (theme) => ({
                root: {
                    // No gaps between accordion items
                },
                item: {
                    borderBottom: "none",
                    backgroundColor: "transparent",
                    "&[data-active]": {
                        backgroundColor: "transparent",
                    },
                },
                control: {
                    backgroundColor: theme.colors.dark[6],
                    padding: "8px 12px",
                    minHeight: 40,
                    borderRadius: 4,
                    "&:hover": {
                        backgroundColor: theme.colors.dark[5],
                    },
                    "&[data-active]": {
                        borderRadius: "4px 4px 0 0",
                    },
                },
                chevron: {
                    color: theme.colors.dark[2],
                    width: 16,
                    height: 16,
                    "&[data-rotate]": {
                        transform: "rotate(90deg)",
                    },
                },
                label: {
                    color: theme.colors.dark[0],
                    fontSize: theme.fontSizes.md,
                    fontWeight: 500,
                    padding: 0,
                },
                icon: {
                    color: theme.colors.dark[2],
                    marginRight: 8,
                },
                panel: {
                    backgroundColor: theme.colors.dark[7],
                    padding: 0,
                    borderRadius: "0 0 4px 4px",
                },
                content: {
                    padding: 0,
                },
            }),
        },
    },
});
```

### Component Implementation

With the theme applied, components become lightweight structural wrappers:

```tsx
// src/components/sidebar/ControlSection.tsx
import { Accordion, Group, Box } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { ReactNode } from "react";

interface ControlSectionProps {
    name: string;
    icon?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    defaultExpanded?: boolean;
}

export function ControlSection({ name, icon, actions, children, defaultExpanded = true }: ControlSectionProps) {
    return (
        <Accordion
            defaultValue={defaultExpanded ? name : null}
            chevron={<IconChevronRight size={16} />}
            chevronPosition="left"
            styles={{
                chevron: {
                    transform: "rotate(0deg)",
                    "&[data-rotate]": {
                        transform: "rotate(90deg)",
                    },
                },
            }}
        >
            <Accordion.Item value={name}>
                <Box style={{ position: "relative" }}>
                    <Accordion.Control icon={icon}>{name}</Accordion.Control>
                    {actions && (
                        <Group
                            gap="xs"
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        >
                            {actions}
                        </Group>
                    )}
                </Box>
                <Accordion.Panel>{children}</Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
}
```

```tsx
// src/components/sidebar/ControlGroup.tsx
import { Box, Divider, Group, Text, Stack } from "@mantine/core";
import { ReactNode } from "react";

interface ControlGroupProps {
    name: string;
    actions?: ReactNode;
    children?: ReactNode;
}

export function ControlGroup({ name, actions, children }: ControlGroupProps) {
    return (
        <Box>
            <Divider />
            <Group justify="space-between" py="sm" px="md">
                <Text size="xs" fw={500} c="dark.3" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                    {name}
                </Text>
                {actions && <Group gap="xs">{actions}</Group>}
            </Group>
            {children && (
                <Stack gap="sm" px="md" pb="sm">
                    {children}
                </Stack>
            )}
        </Box>
    );
}
```

```tsx
// src/components/sidebar/PropertyRow.tsx
import { Group, ColorSwatch, TextInput, ActionIcon } from "@mantine/core";
import { IconEye, IconEyeOff, IconMinus } from "@tabler/icons-react";

interface PropertyRowProps {
    color: string;
    opacity: number;
    selected?: boolean;
    visible?: boolean;
    onColorChange?: (color: string) => void;
    onOpacityChange?: (opacity: number) => void;
    onVisibilityToggle?: () => void;
    onRemove?: () => void;
}

export function PropertyRow({
    color,
    opacity,
    selected = false,
    visible = true,
    onColorChange,
    onOpacityChange,
    onVisibilityToggle,
    onRemove,
}: PropertyRowProps) {
    return (
        <Group
            gap="sm"
            px="sm"
            py={4}
            style={{
                backgroundColor: selected ? "#0D99FF" : "transparent",
                borderRadius: 4,
                marginLeft: -8,
                marginRight: -8,
            }}
        >
            <ColorSwatch color={color} size={20} style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
            <TextInput
                value={color.replace("#", "").toUpperCase()}
                onChange={(e) => onColorChange?.(`#${e.target.value}`)}
                w={72}
                styles={{ input: { fontFamily: "monospace" } }}
            />
            <Group gap={4}>
                <TextInput
                    value={opacity}
                    onChange={(e) => onOpacityChange?.(Number(e.target.value))}
                    w={40}
                    styles={{ input: { textAlign: "right" } }}
                />
                <Text size="xs" c="dark.3">
                    %
                </Text>
            </Group>
            <ActionIcon onClick={onVisibilityToggle}>
                {visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
            </ActionIcon>
            <ActionIcon onClick={onRemove}>
                <IconMinus size={14} />
            </ActionIcon>
        </Group>
    );
}
```

### File Structure

```
src/
├── theme/
│   └── figma.ts               # Figma theme definition
│
├── components/
│   └── sidebar/
│       ├── index.ts           # Public exports
│       ├── ControlSection.tsx # Accordion section (Node/Edge properties)
│       ├── ControlGroup.tsx   # Group within a section
│       ├── PropertyRow.tsx    # Fill/Effect/Color row
│       ├── DimensionInput.tsx # W/H paired inputs
│       ├── IconInput.tsx      # Input with icon prefix
│       └── SidebarPanel.tsx   # Main sidebar container
│
└── App.tsx                    # Applies theme via MantineProvider
```

### Usage Example

```tsx
// App.tsx
import { MantineProvider } from "@mantine/core";
import { figmaTheme } from "./theme/figma";
import { PropertiesPanel } from "./components/sidebar";

function App() {
    return (
        <MantineProvider theme={figmaTheme} defaultColorScheme="dark">
            <AppShell>
                <AppShell.Aside>
                    <PropertiesPanel />
                </AppShell.Aside>
                {/* ... */}
            </AppShell>
        </MantineProvider>
    );
}
```

```tsx
// PropertiesPanel.tsx
import { Paper, ScrollArea, Stack, ActionIcon, Checkbox, Select } from "@mantine/core";
import { IconPlus, IconGrid, IconCircle, IconLine } from "@tabler/icons-react";
import { ControlSection, ControlGroup, PropertyRow, DimensionInput } from "./";

export function PropertiesPanel() {
    return (
        <Paper h="100%">
            <ScrollArea h="100%">
                <Stack gap="xs" p="xs">
                    {/* Node Properties Section */}
                    <ControlSection
                        name="Node Properties"
                        icon={<IconCircle size={16} />}
                        actions={
                            <ActionIcon>
                                <IconPlus size={14} />
                            </ActionIcon>
                        }
                        defaultExpanded={true}
                    >
                        <ControlGroup name="Layout">
                            <DimensionInput width={400} height={26} />
                            <Checkbox label="Clip content" />
                        </ControlGroup>

                        <ControlGroup
                            name="Fill"
                            actions={
                                <>
                                    <ActionIcon>
                                        <IconGrid size={14} />
                                    </ActionIcon>
                                    <ActionIcon>
                                        <IconPlus size={14} />
                                    </ActionIcon>
                                </>
                            }
                        >
                            <PropertyRow color="#FFFFFF" opacity={100} selected />
                        </ControlGroup>

                        <ControlGroup
                            name="Effects"
                            actions={
                                <>
                                    <ActionIcon>
                                        <IconGrid size={14} />
                                    </ActionIcon>
                                    <ActionIcon>
                                        <IconPlus size={14} />
                                    </ActionIcon>
                                </>
                            }
                        >
                            <PropertyRow color="#000000" opacity={25} />
                        </ControlGroup>
                    </ControlSection>

                    {/* Edge Properties Section */}
                    <ControlSection name="Edge Properties" icon={<IconLine size={16} />} defaultExpanded={false}>
                        <ControlGroup
                            name="Stroke"
                            actions={
                                <ActionIcon>
                                    <IconPlus size={14} />
                                </ActionIcon>
                            }
                        >
                            <PropertyRow color="#888888" opacity={100} />
                        </ControlGroup>

                        <ControlGroup name="Style">
                            <Select data={["Solid", "Dashed", "Dotted"]} defaultValue="Solid" />
                        </ControlGroup>

                        <ControlGroup name="Arrow">
                            <Select data={["None", "Arrow", "Circle", "Diamond"]} defaultValue="Arrow" />
                        </ControlGroup>
                    </ControlSection>
                </Stack>
            </ScrollArea>
        </Paper>
    );
}
```

---

## Design Decisions & Rationale

### Why Theme-First?

1. **Single source of truth**: All color, spacing, and typography values defined once
2. **Automatic inheritance**: New components get Figma styling without extra work
3. **Reduced component complexity**: Components handle structure, theme handles appearance
4. **Easy to evolve**: Can adjust entire app appearance by modifying theme

### Why Thin Wrapper Components?

1. **Domain-specific API**: `<ControlGroup>` is more meaningful than nested `<Box>` + `<Divider>` + `<Group>`
2. **Encapsulated patterns**: Common layouts (header + actions + content) captured once
3. **Type safety**: Props are specific to use case
4. **Testability**: Easier to test focused components

### ControlSection vs ControlGroup

These serve different purposes in the hierarchy:

| Aspect        | ControlSection                 | ControlGroup                     |
| ------------- | ------------------------------ | -------------------------------- |
| Purpose       | Top-level category (Node/Edge) | Property grouping (Fill, Stroke) |
| Collapsible   | Yes (accordion)                | Optional                         |
| Header style  | Prominent, elevated background | Subtle, uppercase label          |
| Typography    | 13px, sentence case, white     | 11px, uppercase, gray            |
| Visual weight | High (draws attention)         | Low (secondary to content)       |
| Nesting       | Contains ControlGroups         | Contains controls                |

This two-tier hierarchy allows users to:

1. Focus on one entity type at a time (expand Node, collapse Edge)
2. See all related properties within that entity (Layout, Fill, Stroke grouped together)

### Separator Placement

Separators appear **before** each ControlGroup header (at the top), not after. This means:

- First ControlGroup in a section has a separator above it
- Last ControlGroup has no separator below it
- ControlSection header serves as the visual boundary for its contents
- Matches Figma's visual pattern

### Selection State

Selection highlight extends with negative margin to appear full-width despite content padding. This maintains the visual effect of Figma's selection while keeping consistent internal padding.

### Accordion Behavior Options

The ControlSection component supports two accordion modes:

1. **Independent mode** (default): Each section can be expanded/collapsed independently
    - Better for power users who want multiple sections visible
    - Use separate `<ControlSection>` components

2. **Exclusive mode**: Only one section expanded at a time
    - Better for focused workflows
    - Wrap multiple items in a single `<Accordion>` with `multiple={false}`

```tsx
// Independent mode (default)
<Stack>
  <ControlSection name="Node Properties" />
  <ControlSection name="Edge Properties" />
</Stack>

// Exclusive mode
<Accordion>
  <ControlSection name="Node Properties" />
  <ControlSection name="Edge Properties" />
</Accordion>
```

---

## Future Considerations

### Light Theme

The current design is dark-mode only. A light theme variant could be created by defining a `figmaLight` color tuple and swapping themes via `MantineProvider`'s `colorScheme` prop.

### Animation

Figma uses subtle animations for:

- Expanding/collapsing sections (ControlSection accordion)
- Selection state changes
- Hover transitions

These could be added via CSS transitions or Mantine's Transition component. The Accordion component already supports `transitionDuration` prop.

### Accessibility

Current design prioritizes visual fidelity. Ensure:

- Sufficient color contrast ratios (WCAG AA)
- Keyboard navigation support (accordion items should be navigable with arrow keys)
- Screen reader labels for icon-only buttons
- Focus indicators visible against dark background
- ARIA labels on ControlSection headers for context

### Responsive Behavior

Sidebar width is typically fixed in Figma. If responsive behavior is needed:

- Minimum width: ~200px (inputs start to cramp)
- Maximum width: ~320px (wastes space)
- Consider collapsing ControlSections automatically on narrow viewports
- Mobile: Consider bottom sheet instead of sidebar

### State Persistence

For better UX, consider persisting:

- Which ControlSections are expanded/collapsed (localStorage)
- Last selected property rows
- Scroll position within the sidebar

### Dynamic Sections

The ControlSection design supports dynamic content scenarios:

- Sections that appear/disappear based on selection (e.g., Edge Properties only visible when an edge is selected)
- Empty states within sections ("Select a node to view properties")
- Loading states while fetching property data

### Multi-Selection

When multiple items are selected:

- Show "Mixed" for properties with different values
- Allow batch editing (change applies to all selected items)
- Consider visual indicator in ControlSection header showing selection count

---

## References

- [Mantine Documentation](https://mantine.dev/)
- [Mantine Theming](https://mantine.dev/theming/theme-object/)
- [Mantine Accordion](https://mantine.dev/core/accordion/)
- [Tabler Icons](https://tabler.io/icons) (recommended icon set)
- Reference screenshot: `tmp/figma-sidebar.png`
