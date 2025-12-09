# Properties Sidebar Design Specification

This document defines the design for a context-sensitive properties sidebar that changes based on what is currently selected in the application.

## Overview

The properties sidebar displays different content depending on the current selection state:

| Selection State | Sidebar Content |
|----------------|-----------------|
| Nothing selected (default) | **Graph Properties** - data files, node count, edge count |
| Style layer selected | **Style Layer Properties** - node and edge style controls |
| Node selected (future) | Node data and style overrides |
| Edge selected (future) | Edge data and style overrides |

---

## Selection State Architecture

```typescript
type SelectionType = "none" | "style-layer" | "node" | "edge";

interface SelectionState {
  type: SelectionType;
  // For style-layer selection
  layerId?: string;
  // For node/edge selection (future)
  nodeId?: string;
  edgeId?: string;
}
```

The `RightSidebar` component receives the current selection state and renders the appropriate panel:

```tsx
function RightSidebar({ selection, graphInfo, layers, onLayerUpdate }) {
  switch (selection.type) {
    case "none":
      return <GraphPropertiesPanel graphInfo={graphInfo} />;
    case "style-layer":
      return (
        <StyleLayerPropertiesPanel
          layer={layers.find(l => l.id === selection.layerId)}
          onUpdate={onLayerUpdate}
        />
      );
    // Future cases...
  }
}
```

---

## Panel 1: Graph Properties (Default State)

Displayed when nothing is selected. Shows information about the loaded graph data.

### Visual Design

```
┌─────────────────────────────────────────────────┐
│  [📊] Graph Properties                          │
├─────────────────────────────────────────────────┤
│  ─────────────────────────────────────────────  │
│  DATA SOURCES                                   │
│                                                 │
│  [📄] karate-club.json              [×]        │
│  [📄] social-network.csv            [×]        │
│                                                 │
│  ─────────────────────────────────────────────  │
│  STATISTICS                                     │
│                                                 │
│  Nodes          1,247                          │
│  Edges          3,891                          │
│  Components     3                               │
│  Density        0.0025                          │
│                                                 │
│  ─────────────────────────────────────────────  │
│  GRAPH TYPE                                     │
│                                                 │
│  ○ Directed                                     │
│  ● Undirected                                   │
│  □ Weighted                                     │
│  □ Allow self-loops                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Component Structure

```tsx
<SidebarPanel>
  <SidebarHeader icon={<IconChartBar />} title="Graph Properties" />

  <ControlGroup name="Data Sources" actions={<AddDataButton />}>
    <DataSourceList
      sources={graphInfo.dataSources}
      onRemove={handleRemoveSource}
    />
  </ControlGroup>

  <ControlGroup name="Statistics">
    <StatRow label="Nodes" value={graphInfo.nodeCount} />
    <StatRow label="Edges" value={graphInfo.edgeCount} />
    <StatRow label="Components" value={graphInfo.componentCount} />
    <StatRow label="Density" value={graphInfo.density.toFixed(4)} />
  </ControlGroup>

  <ControlGroup name="Graph Type">
    <Radio.Group value={graphInfo.directed ? "directed" : "undirected"}>
      <Radio value="directed" label="Directed" />
      <Radio value="undirected" label="Undirected" />
    </Radio.Group>
    <Checkbox label="Weighted" checked={graphInfo.weighted} />
    <Checkbox label="Allow self-loops" checked={graphInfo.allowSelfLoops} />
  </ControlGroup>
</SidebarPanel>
```

### Props Interface

```typescript
interface GraphInfo {
  dataSources: DataSourceInfo[];
  nodeCount: number;
  edgeCount: number;
  componentCount: number;
  density: number;
  directed: boolean;
  weighted: boolean;
  allowSelfLoops: boolean;
}

interface DataSourceInfo {
  id: string;
  name: string;
  type: "json" | "csv" | "graphml" | "url";
}
```

---

## Panel 2: Style Layer Properties

Displayed when a style layer is selected from the Layers panel. Contains controls for all node and edge style properties.

### High-Level Structure

The panel is divided into two main **ControlSections**:
1. **Node Properties** - All node styling options
2. **Edge Properties** - All edge styling options

Each section contains multiple **ControlGroups** organized by functionality.

### Visual Design Overview

```
┌─────────────────────────────────────────────────┐
│  [🎨] Layer: "Highlight Important"              │
├─────────────────────────────────────────────────┤
│  [▼] [◯] Node Properties              [⋮] [+]  │
├─────────────────────────────────────────────────┤
│  ─────────────────────────────────────────────  │
│  SELECTOR                                       │
│  [importance > 0.8                        ]     │
│                                                 │
│  ─────────────────────────────────────────────  │
│  SHAPE                                          │
│  Type    [Icosphere          ▾]                │
│  Size    [1.0            ]                      │
│                                                 │
│  ─────────────────────────────────────────────  │
│  COLOR                                          │
│  [■] #6366F1  [100%]  [👁] [−]                 │
│  ○ Solid  ○ Gradient  ○ Radial                 │
│                                                 │
│  ─────────────────────────────────────────────  │
│  EFFECTS                                        │
│  □ Glow                                         │
│    Color  [■ #FFFFFF]  Strength [1.0]          │
│  □ Outline                                      │
│    Color  [■ #000000]  Width [1.0]             │
│  □ Wireframe                                    │
│  □ Flat Shaded                                  │
│                                                 │
│  ─────────────────────────────────────────────  │
│  LABEL                                   [+]   │
│  □ Enabled                                      │
│  Text     [Show: {name}              ]          │
│  Location [Top               ▾]                │
│  ... (collapsed by default)                     │
│                                                 │
│  ─────────────────────────────────────────────  │
│  TOOLTIP                                 [+]   │
│  □ Enabled                                      │
│  ... (collapsed by default)                     │
│                                                 │
├─────────────────────────────────────────────────┤
│  [▶] [―] Edge Properties              [⋮] [+]  │
└─────────────────────────────────────────────────┘
```

---

## Node Properties - Detailed Control Groups

### 1. Selector Group

Controls which nodes this style applies to.

```
─────────────────────────────────────────────
SELECTOR
[importance > 0.8                        ]
  JMESPath expression to select nodes
```

| Control | Type | Property Path |
|---------|------|---------------|
| Selector | TextInput | `node.selector` |

### 2. Shape Group

Controls the 3D geometry of nodes.

```
─────────────────────────────────────────────
SHAPE
Type    [Icosphere          ▾]
Size    [1.0            ]
```

| Control | Type | Property Path | Options/Range |
|---------|------|---------------|---------------|
| Type | Select | `node.style.shape.type` | See NodeShapes enum below |
| Size | NumberInput | `node.style.shape.size` | min: 0.1, step: 0.1 |

**NodeShapes Enum (grouped for UX):**

```typescript
const NODE_SHAPE_OPTIONS = [
  // Basic Shapes
  { group: "Basic", value: "sphere", label: "Sphere" },
  { group: "Basic", value: "box", label: "Box" },
  { group: "Basic", value: "cylinder", label: "Cylinder" },
  { group: "Basic", value: "cone", label: "Cone" },
  { group: "Basic", value: "capsule", label: "Capsule" },
  { group: "Basic", value: "torus-knot", label: "Torus Knot" },

  // Platonic Solids
  { group: "Platonic", value: "tetrahedron", label: "Tetrahedron" },
  { group: "Platonic", value: "octahedron", label: "Octahedron" },
  { group: "Platonic", value: "dodecahedron", label: "Dodecahedron" },
  { group: "Platonic", value: "icosahedron", label: "Icosahedron" },

  // Spherical Variants
  { group: "Spherical", value: "icosphere", label: "Icosphere" },
  { group: "Spherical", value: "geodesic", label: "Geodesic" },
  { group: "Spherical", value: "goldberg", label: "Goldberg" },

  // Prisms
  { group: "Prisms", value: "triangular_prism", label: "Triangular Prism" },
  { group: "Prisms", value: "pentagonal_prism", label: "Pentagonal Prism" },
  { group: "Prisms", value: "hexagonal_prism", label: "Hexagonal Prism" },

  // Pyramids
  { group: "Pyramids", value: "square_pyramid", label: "Square Pyramid" },
  { group: "Pyramids", value: "pentagonal_pyramid", label: "Pentagonal Pyramid" },

  // Dipyramids
  { group: "Dipyramids", value: "triangular_dipyramid", label: "Triangular Dipyramid" },
  { group: "Dipyramids", value: "pentagonal_dipyramid", label: "Pentagonal Dipyramid" },
  { group: "Dipyramids", value: "elongated_square_dipyramid", label: "Elongated Square Dipyramid" },
  { group: "Dipyramids", value: "elongated_pentagonal_dipyramid", label: "Elongated Pentagonal Dipyramid" },

  // Complex
  { group: "Complex", value: "rhombicuboctahedron", label: "Rhombicuboctahedron" },
  { group: "Complex", value: "elongated_pentagonal_cupola", label: "Elongated Pentagonal Cupola" },
];
```

### 3. Color Group

Controls node color with support for solid, gradient, and radial gradient.

```
─────────────────────────────────────────────
COLOR
[■] #6366F1  [100%]  [👁] [−]

○ Solid  ○ Gradient  ○ Radial

[Gradient controls shown when gradient selected:]
Direction [45°    ]
Color 1   [■ #FF0000]
Color 2   [■ #0000FF]
          [+ Add Stop]
```

| Control | Type | Property Path | Options/Range |
|---------|------|---------------|---------------|
| Color Type | SegmentedControl | `node.style.texture.color.colorType` | solid, gradient, radial-gradient |
| Color (solid) | ColorInput | `node.style.texture.color` | hex color |
| Opacity | NumberInput | `node.style.texture.color.opacity` | 0-100% |
| Direction (gradient) | NumberInput/Slider | `node.style.texture.color.direction` | 0-360° |
| Gradient Colors | ColorStopList | `node.style.texture.color.colors` | array of hex |

### 4. Texture Group (Optional/Advanced)

Controls image and icon textures.

```
─────────────────────────────────────────────
TEXTURE
Image   [                    ] [📁]
Icon    [search...           ▾]
```

| Control | Type | Property Path |
|---------|------|---------------|
| Image URL | TextInput + FileButton | `node.style.texture.image` |
| Icon | Select/Autocomplete | `node.style.texture.icon` |

### 5. Effects Group

Controls visual effects like glow, outline, wireframe.

```
─────────────────────────────────────────────
EFFECTS
☑ Glow
  Color     [■ #FFFFFF]
  Strength  [━━━━●━━━] 1.5

☐ Outline
  Color     [■ #000000]
  Width     [━━━━●━━━] 2.0

☐ Wireframe
☐ Flat Shaded
```

| Control | Type | Property Path | Options/Range |
|---------|------|---------------|---------------|
| Glow Enabled | Checkbox | `node.style.effect.glow` (presence) | |
| Glow Color | ColorInput | `node.style.effect.glow.color` | hex |
| Glow Strength | Slider/NumberInput | `node.style.effect.glow.strength` | 0-5, step 0.1 |
| Outline Enabled | Checkbox | `node.style.effect.outline` (presence) | |
| Outline Color | ColorInput | `node.style.effect.outline.color` | hex |
| Outline Width | Slider/NumberInput | `node.style.effect.outline.width` | 0-10, step 0.5 |
| Wireframe | Checkbox | `node.style.effect.wireframe` | |
| Flat Shaded | Checkbox | `node.style.effect.flatShaded` | |

### 6. Label Group (Collapsible)

Controls node label text styling. This is a complex group with many options.

```
─────────────────────────────────────────────
LABEL                                  [▾]
☑ Enabled

[Basic]
Text Path   [{name}                    ]
Location    [Top               ▾]

[Font]
Font        [Verdana           ▾]
Size        [48   ]
Weight      [Normal            ▾]
Line Height [1.2  ]
Color       [■ #000000]

[Background]
Color       [■ #FFFFFF]
Padding     [0    ]
Radius      [0    ]

[Position]
Attach To   [Top               ▾]
Offset      [0    ]
Billboard   [All Axes          ▾]

[Outline] (collapsible sub-section)
☐ Enabled
  Width     [2    ]
  Color     [■ #000000]
  Join      [Round             ▾]

[Shadow] (collapsible sub-section)
☐ Enabled
  Color     [■ #000000]
  Blur      [4    ]
  Offset X  [2    ]
  Offset Y  [2    ]

[Animation]
Type        [None              ▾]
Speed       [1.0  ]

[Advanced] (collapsible sub-section)
Resolution     [128  ]
Auto Size      ☑
Depth Fade     ☐
  Near         [10   ]
  Far          [50   ]
```

**Label Property Mapping:**

| Control | Type | Property Path | Options/Range |
|---------|------|---------------|---------------|
| Enabled | Checkbox | `node.style.label.enabled` | |
| Text | TextInput | `node.style.label.text` | |
| Text Path | TextInput | `node.style.label.textPath` | JMESPath |
| Location | Select | `node.style.label.location` | top, top-right, top-left, left, center, right, bottom, bottom-left, bottom-right, automatic |
| Font | Select | `node.style.label.font` | Verdana, Arial, etc. |
| Font Size | NumberInput | `node.style.label.fontSize` | 8-200 |
| Font Weight | Select | `node.style.label.fontWeight` | normal, bold, 100-900 |
| Line Height | NumberInput | `node.style.label.lineHeight` | 0.5-3, step 0.1 |
| Text Color | ColorInput | `node.style.label.textColor` | hex |
| Background Color | ColorInput | `node.style.label.backgroundColor` | hex |
| Background Padding | NumberInput | `node.style.label.backgroundPadding` | 0-50 |
| Corner Radius | NumberInput | `node.style.label.cornerRadius` | 0-50 |
| Text Align | SegmentedControl | `node.style.label.textAlign` | left, center, right |
| Attach Position | Select | `node.style.label.attachPosition` | top, top-left, ... |
| Attach Offset | NumberInput | `node.style.label.attachOffset` | -100 to 100 |
| Billboard Mode | Select | `node.style.label.billboardMode` | 0-7 (mapped to labels) |
| Text Outline | Checkbox | `node.style.label.textOutline` | |
| Outline Width | NumberInput | `node.style.label.textOutlineWidth` | 0-10 |
| Outline Color | ColorInput | `node.style.label.textOutlineColor` | hex |
| Outline Join | Select | `node.style.label.textOutlineJoin` | round, bevel, miter |
| Text Shadow | Checkbox | `node.style.label.textShadow` | |
| Shadow Color | ColorInput | `node.style.label.textShadowColor` | hex |
| Shadow Blur | NumberInput | `node.style.label.textShadowBlur` | 0-20 |
| Shadow Offset X | NumberInput | `node.style.label.textShadowOffsetX` | -20 to 20 |
| Shadow Offset Y | NumberInput | `node.style.label.textShadowOffsetY` | -20 to 20 |
| Animation | Select | `node.style.label.animation` | none, pulse, bounce, shake, glow, fill |
| Animation Speed | NumberInput | `node.style.label.animationSpeed` | 0.1-5 |
| Resolution | NumberInput | `node.style.label.resolution` | 32-512 |
| Auto Size | Checkbox | `node.style.label.autoSize` | |
| Depth Fade Enabled | Checkbox | `node.style.label.depthFadeEnabled` | |
| Depth Fade Near | NumberInput | `node.style.label.depthFadeNear` | 0-1000 |
| Depth Fade Far | NumberInput | `node.style.label.depthFadeFar` | 0-1000 |

### 7. Tooltip Group (Collapsible)

Same structure as Label group - uses RichTextStyle.

```
─────────────────────────────────────────────
TOOLTIP                                [▾]
☐ Enabled
... (same controls as Label)
```

---

## Edge Properties - Detailed Control Groups

### 1. Selector Group

```
─────────────────────────────────────────────
SELECTOR
[weight > 5                          ]
  JMESPath expression to select edges
```

| Control | Type | Property Path |
|---------|------|---------------|
| Selector | TextInput | `edge.selector` |

### 2. Line Group

Controls the edge line appearance.

```
─────────────────────────────────────────────
LINE
Type    [Solid              ▾]
Width   [8.0            ]
Color   [■ darkgrey]  [100%]

☐ Bezier Curves
Animation Speed [0    ] (for patterned lines)
```

| Control | Type | Property Path | Options/Range |
|---------|------|---------------|---------------|
| Type | Select | `edge.style.line.type` | solid, dot, star, box, dash, diamond, dash-dot, sinewave, zigzag |
| Width | NumberInput | `edge.style.line.width` | 0.1-50, step 0.5 |
| Color | ColorInput | `edge.style.line.color` | hex |
| Opacity | NumberInput | `edge.style.line.opacity` | 0-100% |
| Bezier | Checkbox | `edge.style.line.bezier` | |
| Animation Speed | NumberInput | `edge.style.line.animationSpeed` | 0-10, step 0.1 |

**LineType Options:**

```typescript
const LINE_TYPE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dash", label: "Dashed" },
  { value: "dot", label: "Dotted" },
  { value: "dash-dot", label: "Dash-Dot" },
  { value: "star", label: "Star" },
  { value: "box", label: "Box" },
  { value: "diamond", label: "Diamond" },
  { value: "sinewave", label: "Sine Wave" },
  { value: "zigzag", label: "Zigzag" },
];
```

### 3. Arrow Head Group

Controls the arrow at the target end of the edge.

```
─────────────────────────────────────────────
ARROW HEAD
Type    [Normal             ▾]
Size    [1.0            ]
Color   [■ white]  [100%]
```

| Control | Type | Property Path | Options/Range |
|---------|------|---------------|---------------|
| Type | Select | `edge.style.arrowHead.type` | See ArrowType enum |
| Size | NumberInput | `edge.style.arrowHead.size` | 0.1-5, step 0.1 |
| Color | ColorInput | `edge.style.arrowHead.color` | hex |
| Opacity | NumberInput | `edge.style.arrowHead.opacity` | 0-100% |

**ArrowType Options:**

```typescript
const ARROW_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "normal", label: "Normal" },
  { value: "inverted", label: "Inverted" },
  { value: "open-normal", label: "Open Normal" },
  { value: "vee", label: "Vee" },
  { value: "half-open", label: "Half Open" },
  { value: "tee", label: "Tee" },
  { value: "dot", label: "Dot" },
  { value: "sphere-dot", label: "Sphere Dot" },
  { value: "open-dot", label: "Open Dot" },
  { value: "diamond", label: "Diamond" },
  { value: "open-diamond", label: "Open Diamond" },
  { value: "box", label: "Box" },
  { value: "crow", label: "Crow" },
];
```

### 4. Arrow Tail Group

Same structure as Arrow Head group.

```
─────────────────────────────────────────────
ARROW TAIL
Type    [None               ▾]
Size    [1.0            ]
Color   [■ white]  [100%]
```

### 5. Label Group (Collapsible)

Same RichTextStyle structure as node labels.

```
─────────────────────────────────────────────
LABEL                                  [▾]
☐ Enabled
... (same controls as Node Label)
```

### 6. Tooltip Group (Collapsible)

Same RichTextStyle structure.

```
─────────────────────────────────────────────
TOOLTIP                                [▾]
☐ Enabled
... (same controls as Node Tooltip)
```

---

## Component Hierarchy

```
<RightSidebar>
  │
  ├── [selection.type === "none"]
  │   └── <GraphPropertiesPanel>
  │         ├── <SidebarHeader title="Graph Properties" />
  │         ├── <ControlGroup name="Data Sources">
  │         │     └── <DataSourceList />
  │         ├── <ControlGroup name="Statistics">
  │         │     └── <StatRow /> × n
  │         └── <ControlGroup name="Graph Type">
  │               ├── <Radio.Group />
  │               └── <Checkbox /> × n
  │
  └── [selection.type === "style-layer"]
      └── <StyleLayerPropertiesPanel>
            ├── <SidebarHeader title="Layer: {name}" />
            │
            ├── <ControlSection name="Node Properties" icon={<IconCircle />}>
            │     ├── <ControlGroup name="Selector">
            │     │     └── <TextInput />
            │     │
            │     ├── <ControlGroup name="Shape">
            │     │     ├── <Select /> (type)
            │     │     └── <NumberInput /> (size)
            │     │
            │     ├── <ControlGroup name="Color">
            │     │     ├── <PropertyRow /> (color swatch + hex + opacity)
            │     │     ├── <SegmentedControl /> (solid/gradient/radial)
            │     │     └── <GradientEditor /> (conditional)
            │     │
            │     ├── <ControlGroup name="Effects">
            │     │     ├── <EffectRow name="Glow">
            │     │     │     ├── <ColorInput />
            │     │     │     └── <Slider />
            │     │     ├── <EffectRow name="Outline">
            │     │     │     ├── <ColorInput />
            │     │     │     └── <Slider />
            │     │     ├── <Checkbox /> (wireframe)
            │     │     └── <Checkbox /> (flat shaded)
            │     │
            │     ├── <ControlGroup name="Label" collapsible>
            │     │     └── <RichTextStyleEditor />
            │     │
            │     └── <ControlGroup name="Tooltip" collapsible>
            │           └── <RichTextStyleEditor />
            │
            └── <ControlSection name="Edge Properties" icon={<IconLine />}>
                  ├── <ControlGroup name="Selector">
                  │     └── <TextInput />
                  │
                  ├── <ControlGroup name="Line">
                  │     ├── <Select /> (type)
                  │     ├── <NumberInput /> (width)
                  │     ├── <PropertyRow /> (color + opacity)
                  │     ├── <Checkbox /> (bezier)
                  │     └── <NumberInput /> (animation speed)
                  │
                  ├── <ControlGroup name="Arrow Head">
                  │     ├── <Select /> (type)
                  │     ├── <NumberInput /> (size)
                  │     └── <PropertyRow /> (color + opacity)
                  │
                  ├── <ControlGroup name="Arrow Tail">
                  │     └── ... (same as Arrow Head)
                  │
                  ├── <ControlGroup name="Label" collapsible>
                  │     └── <RichTextStyleEditor />
                  │
                  └── <ControlGroup name="Tooltip" collapsible>
                        └── <RichTextStyleEditor />
```

---

## Reusable Control Components

### 1. RichTextStyleEditor

A reusable component for editing RichTextStyle properties (used in Label and Tooltip groups).

```tsx
interface RichTextStyleEditorProps {
  value: Partial<RichTextStyle>;
  onChange: (value: Partial<RichTextStyle>) => void;
  defaultCollapsed?: boolean;
}

function RichTextStyleEditor({ value, onChange, defaultCollapsed = true }: RichTextStyleEditorProps) {
  return (
    <Stack gap="sm">
      <Checkbox
        label="Enabled"
        checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
      />

      {value.enabled && (
        <>
          {/* Basic */}
          <ControlSubGroup name="Basic" defaultExpanded>
            <TextInput label="Text Path" value={value.textPath} ... />
            <Select label="Location" data={LOCATION_OPTIONS} value={value.location} ... />
          </ControlSubGroup>

          {/* Font */}
          <ControlSubGroup name="Font">
            <Select label="Font" data={FONT_OPTIONS} ... />
            <Group>
              <NumberInput label="Size" ... />
              <Select label="Weight" ... />
            </Group>
            <NumberInput label="Line Height" ... />
            <ColorInput label="Color" ... />
          </ControlSubGroup>

          {/* Background */}
          <ControlSubGroup name="Background">
            <ColorInput label="Color" ... />
            <Group>
              <NumberInput label="Padding" ... />
              <NumberInput label="Radius" ... />
            </Group>
          </ControlSubGroup>

          {/* Text Effects */}
          <ControlSubGroup name="Text Effects" defaultCollapsed>
            <EffectToggle name="Outline" enabled={value.textOutline}>
              <NumberInput label="Width" ... />
              <ColorInput label="Color" ... />
              <Select label="Join" ... />
            </EffectToggle>
            <EffectToggle name="Shadow" enabled={value.textShadow}>
              <ColorInput label="Color" ... />
              <NumberInput label="Blur" ... />
              <Group>
                <NumberInput label="Offset X" ... />
                <NumberInput label="Offset Y" ... />
              </Group>
            </EffectToggle>
          </ControlSubGroup>

          {/* Animation */}
          <ControlSubGroup name="Animation" defaultCollapsed>
            <Select label="Type" data={ANIMATION_OPTIONS} ... />
            <NumberInput label="Speed" ... />
          </ControlSubGroup>

          {/* Advanced */}
          <ControlSubGroup name="Advanced" defaultCollapsed>
            <NumberInput label="Resolution" ... />
            <Checkbox label="Auto Size" ... />
            <EffectToggle name="Depth Fade" enabled={value.depthFadeEnabled}>
              <Group>
                <NumberInput label="Near" ... />
                <NumberInput label="Far" ... />
              </Group>
            </EffectToggle>
          </ControlSubGroup>
        </>
      )}
    </Stack>
  );
}
```

### 2. EffectToggle

A checkbox that reveals additional controls when enabled.

```tsx
interface EffectToggleProps {
  name: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}

function EffectToggle({ name, enabled, onEnabledChange, children }: EffectToggleProps) {
  return (
    <Box>
      <Checkbox
        label={name}
        checked={enabled}
        onChange={(e) => onEnabledChange(e.currentTarget.checked)}
      />
      {enabled && (
        <Box pl="lg" pt="xs">
          {children}
        </Box>
      )}
    </Box>
  );
}
```

### 3. GradientEditor

For editing gradient colors.

```tsx
interface GradientEditorProps {
  type: "gradient" | "radial-gradient";
  direction?: number;
  colors: string[];
  onChange: (gradient: AdvancedColorStyle) => void;
}

function GradientEditor({ type, direction, colors, onChange }: GradientEditorProps) {
  return (
    <Stack gap="xs">
      {type === "gradient" && (
        <Slider
          label="Direction"
          min={0}
          max={360}
          value={direction}
          onChange={(v) => onChange({ colorType: type, direction: v, colors })}
        />
      )}
      {colors.map((color, i) => (
        <Group key={i} gap="xs">
          <ColorInput
            value={color}
            onChange={(c) => {
              const newColors = [...colors];
              newColors[i] = c;
              onChange({ colorType: type, direction, colors: newColors });
            }}
          />
          <ActionIcon onClick={() => removeColor(i)}>
            <IconMinus size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Button
        variant="subtle"
        leftSection={<IconPlus size={14} />}
        onClick={addColor}
      >
        Add Color Stop
      </Button>
    </Stack>
  );
}
```

---

## Data Flow

### State Management

```typescript
// In AppLayout.tsx or a context provider

interface StyleLayerState {
  id: string;
  name: string;
  node: {
    selector: string;
    style: Partial<NodeStyleConfig>;
  };
  edge: {
    selector: string;
    style: Partial<EdgeStyleConfig>;
  };
}

// Update handler
const handleStyleLayerUpdate = (
  layerId: string,
  path: string, // e.g., "node.style.shape.type"
  value: unknown
) => {
  setLayers(layers.map(layer => {
    if (layer.id !== layerId) return layer;
    return set(layer, path, value); // Using lodash set or similar
  }));
};
```

### Props Flow

```tsx
<AppLayout>
  <LeftSidebar
    layers={layers}
    selectedLayerId={selectedLayerId}
    onLayerSelect={setSelectedLayerId}
  />

  <RightSidebar
    selection={{
      type: selectedLayerId ? "style-layer" : "none",
      layerId: selectedLayerId,
    }}
    graphInfo={graphInfo}
    layers={layers}
    onLayerUpdate={handleStyleLayerUpdate}
  />
</AppLayout>
```

---

## File Structure

```
src/
├── components/
│   ├── sidebar/
│   │   ├── index.ts
│   │   │
│   │   ├── panels/
│   │   │   ├── GraphPropertiesPanel.tsx
│   │   │   └── StyleLayerPropertiesPanel.tsx
│   │   │
│   │   ├── controls/
│   │   │   ├── ControlSection.tsx      # Accordion section
│   │   │   ├── ControlGroup.tsx        # Section with header
│   │   │   ├── ControlSubGroup.tsx     # Nested collapsible section
│   │   │   ├── PropertyRow.tsx         # Color + hex + opacity row
│   │   │   ├── EffectToggle.tsx        # Checkbox with child controls
│   │   │   ├── GradientEditor.tsx      # Gradient color stops
│   │   │   └── RichTextStyleEditor.tsx # Label/Tooltip editor
│   │   │
│   │   ├── node-controls/
│   │   │   ├── NodeSelectorControl.tsx
│   │   │   ├── NodeShapeControl.tsx
│   │   │   ├── NodeColorControl.tsx
│   │   │   ├── NodeEffectsControl.tsx
│   │   │   ├── NodeLabelControl.tsx
│   │   │   └── NodeTooltipControl.tsx
│   │   │
│   │   └── edge-controls/
│   │       ├── EdgeSelectorControl.tsx
│   │       ├── EdgeLineControl.tsx
│   │       ├── EdgeArrowHeadControl.tsx
│   │       ├── EdgeArrowTailControl.tsx
│   │       ├── EdgeLabelControl.tsx
│   │       └── EdgeTooltipControl.tsx
│   │
│   └── layout/
│       └── RightSidebar.tsx            # Updated to use new panels
│
├── constants/
│   └── style-options.ts                # All enum options for selects
│
└── types/
    └── style-layer.ts                  # TypeScript interfaces
```

---

## Constants File

```typescript
// src/constants/style-options.ts

export const NODE_SHAPE_OPTIONS = [
  { group: "Basic", value: "sphere", label: "Sphere" },
  { group: "Basic", value: "box", label: "Box" },
  // ... all shapes
];

export const ARROW_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "normal", label: "Normal" },
  // ... all arrow types
];

export const LINE_TYPE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dash", label: "Dashed" },
  // ... all line types
];

export const TEXT_LOCATION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "top-right", label: "Top Right" },
  // ... all locations
];

export const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "pulse", label: "Pulse" },
  { value: "bounce", label: "Bounce" },
  { value: "shake", label: "Shake" },
  { value: "glow", label: "Glow" },
  { value: "fill", label: "Fill" },
];

export const FONT_OPTIONS = [
  { value: "Verdana", label: "Verdana" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier New" },
  { value: "monospace", label: "Monospace" },
];

export const FONT_WEIGHT_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "100", label: "Thin (100)" },
  { value: "200", label: "Extra Light (200)" },
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi Bold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extra Bold (800)" },
  { value: "900", label: "Black (900)" },
];

export const BILLBOARD_MODE_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "X Axis" },
  { value: 2, label: "Y Axis" },
  { value: 4, label: "Z Axis" },
  { value: 7, label: "All Axes" },
];
```

---

## Implementation Priority

### Phase 1: Core Structure
1. ✅ Design document (this file)
2. Create `GraphPropertiesPanel` component
3. Create `StyleLayerPropertiesPanel` skeleton
4. Update `RightSidebar` with selection-based rendering

### Phase 2: Basic Node Controls
1. Node Selector control
2. Node Shape control
3. Node Color control (solid only)
4. Node Effects control

### Phase 3: Basic Edge Controls
1. Edge Selector control
2. Edge Line control
3. Edge Arrow Head control
4. Edge Arrow Tail control

### Phase 4: Advanced Features
1. Gradient color support
2. Label controls (RichTextStyleEditor)
3. Tooltip controls

### Phase 5: Polish
1. Keyboard navigation
2. Undo/redo support
3. Preset styles
4. Copy/paste styles between layers

---

## Handling Unset/Sparse Properties

Most style layers will only set a few properties, leaving the rest undefined (inheriting defaults). This section defines how the UI handles the difference between "not set" and "explicitly set to a value."

### Design Principles

1. **Explicit is Different from Default**: Visually distinguish between explicitly set values and default/inherited values
2. **Easy Reset**: Allow users to easily reset explicit values back to default (undefined)
3. **Progressive Disclosure**: Hide complexity until the user needs it
4. **Clear Indicators**: Show at a glance which sections have configured values

### Property Visibility Tiers

| Tier | Entry Point | Unset State | Set State |
|------|-------------|-------------|-----------|
| **Core** | Input always visible | Shows default value, muted/italic style | Shows value, normal style + reset ✕ button |
| **Toggle** | Checkbox always visible | Checkbox unchecked, child controls hidden | Checkbox checked, child controls visible |
| **Conditional** | Parent control visible | Hidden (access via parent) | Visible when parent condition met |

**Key Principle**: Every feature has an always-visible entry point. Child/dependent controls may be hidden, but only when their parent toggle/selector is accessible.

### Visual States for Unset vs Explicit

```
┌─────────────────────────────────────────────────┐
│ EXPLICIT VALUE (user set this)                  │
│ Size    [1.5            ] [×]  ← Reset button   │
│         ↑ Normal text color                     │
│                                                 │
│ UNSET VALUE (using default)                     │
│ Size    [Default: 1.0   ]      ← No reset btn   │
│         ↑ Muted/italic text                     │
└─────────────────────────────────────────────────┘
```

### StyleInput Component Pattern

All style inputs wrap values to handle the explicit/unset distinction:

```tsx
interface StyleInputProps<T> {
  value: T | undefined;      // undefined = not in JSON
  defaultValue: T;           // shown when unset
  onChange: (value: T | undefined) => void;
}

function StyleNumberInput({ value, defaultValue, onChange }: StyleInputProps<number>) {
  const isExplicit = value !== undefined;

  return (
    <Group gap="xs">
      <NumberInput
        value={isExplicit ? value : defaultValue}
        onChange={(v) => onChange(v as number)}
        styles={{
          input: {
            color: isExplicit ? 'white' : 'var(--mantine-color-dark-3)',
            fontStyle: isExplicit ? 'normal' : 'italic',
          }
        }}
      />
      {isExplicit && (
        <ActionIcon size="xs" onClick={() => onChange(undefined)} title="Reset to default">
          <IconX size={12} />
        </ActionIcon>
      )}
    </Group>
  );
}
```

### Toggle-Activated Features Pattern

For features like effects, labels, and tooltips that are entirely optional:

```tsx
// When unchecked: property is undefined in JSON
// When checked: property is created with default values

function EffectToggle({ config, defaultConfig, onChange, children }) {
  const isEnabled = config !== undefined;

  return (
    <Box>
      <Checkbox
        checked={isEnabled}
        onChange={(e) => onChange(e.currentTarget.checked ? defaultConfig : undefined)}
      />
      {isEnabled && <Box pl="lg">{children}</Box>}
    </Box>
  );
}
```

### Section Indicators

Show which sections have any configured values:

```
┌─────────────────────────────────────────────────┐
│ SHAPE                              ●            │  ← Blue dot = has values
│ Type    [Box                ▾]                  │
│ Size    [2.0            ] [×]                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ EFFECTS                                         │  ← No dot = all defaults
│ ☐ Glow                                          │
│ ☐ Outline                                       │
└─────────────────────────────────────────────────┘
```

### Property Handling Reference

| Property | Entry Point | Unset State | Default Value |
|----------|-------------|-------------|---------------|
| `node.selector` | TextInput (always) | Empty, placeholder text | `""` (match all) |
| `node.style.shape.type` | Select (always) | Shows "Icosphere" muted | `"icosphere"` |
| `node.style.shape.size` | NumberInput (always) | Shows "1.0" muted | `1.0` |
| `node.style.texture.color` | ColorInput (always) | Shows default swatch | `"#6366F1"` |
| `node.style.texture.color.colorType` | SegmentedControl (always) | "Solid" selected | `"solid"` |
| `node.style.texture.color.opacity` | NumberInput (always) | Shows "100%" muted | `1.0` |
| `node.style.texture.color.direction` | Slider (conditional) | Hidden until gradient mode | `0` |
| `node.style.texture.color.colors` | ColorStopList (conditional) | Hidden until gradient mode | `["#000", "#FFF"]` |
| `node.style.texture.image` | Checkbox + TextInput | Input disabled when unchecked | `undefined` |
| `node.style.texture.icon` | Checkbox + Select | Select disabled when unchecked | `undefined` |
| `node.style.effect.glow` | Checkbox (always) | Unchecked, children hidden | `{ color: "#FFF", strength: 1 }` |
| `node.style.effect.glow.color` | ColorInput (child) | Hidden until glow enabled | `"#FFFFFF"` |
| `node.style.effect.glow.strength` | Slider (child) | Hidden until glow enabled | `1.0` |
| `node.style.effect.outline` | Checkbox (always) | Unchecked, children hidden | `{ color: "#000", width: 1 }` |
| `node.style.effect.outline.color` | ColorInput (child) | Hidden until outline enabled | `"#000000"` |
| `node.style.effect.outline.width` | Slider (child) | Hidden until outline enabled | `1.0` |
| `node.style.effect.wireframe` | Checkbox (always) | Unchecked | `false` |
| `node.style.effect.flatShaded` | Checkbox (always) | Unchecked | `false` |
| `node.style.label` | Checkbox (always) | Unchecked, editor hidden | `{ enabled: true, textPath: "{name}" }` |
| `node.style.label.*` | Various (children) | Hidden until label enabled | See RichTextStyle defaults |
| `node.style.tooltip` | Checkbox (always) | Unchecked, editor hidden | `{ enabled: true, textPath: "{name}" }` |
| `edge.selector` | TextInput (always) | Empty, placeholder text | `""` (match all) |
| `edge.style.line.type` | Select (always) | Shows "Solid" muted | `"solid"` |
| `edge.style.line.width` | NumberInput (always) | Shows "8.0" muted | `8.0` |
| `edge.style.line.color` | ColorInput (always) | Shows default swatch | `"darkgrey"` |
| `edge.style.line.opacity` | NumberInput (always) | Shows "100%" muted | `1.0` |
| `edge.style.line.bezier` | Checkbox (always) | Unchecked | `false` |
| `edge.style.line.animationSpeed` | NumberInput (always) | Shows "0" muted | `0` |
| `edge.style.arrowHead.type` | Select (always) | Shows "Normal" muted | `"normal"` |
| `edge.style.arrowHead.size` | NumberInput (conditional) | Hidden when type="none" | `1.0` |
| `edge.style.arrowHead.color` | ColorInput (conditional) | Hidden when type="none" | `"white"` |
| `edge.style.arrowHead.opacity` | NumberInput (conditional) | Hidden when type="none" | `1.0` |
| `edge.style.arrowTail.type` | Select (always) | Shows "None" muted | `"none"` |
| `edge.style.arrowTail.size` | NumberInput (conditional) | Hidden when type="none" | `1.0` |
| `edge.style.arrowTail.color` | ColorInput (conditional) | Hidden when type="none" | `"white"` |
| `edge.style.label` | Checkbox (always) | Unchecked, editor hidden | `{ enabled: true }` |
| `edge.style.tooltip` | Checkbox (always) | Unchecked, editor hidden | `{ enabled: true }` |

### JSON Output Examples

**Minimal layer (only sets color):**
```json
{
  "node": {
    "selector": "type == 'important'",
    "style": {
      "texture": { "color": "#FF0000" }
    }
  }
}
```

**Layer with effects enabled:**
```json
{
  "node": {
    "selector": "",
    "style": {
      "shape": { "type": "box", "size": 2.0 },
      "effect": {
        "glow": { "color": "#FFFF00", "strength": 2.0 }
      }
    }
  }
}
```

**Layer with label (only non-default values stored):**
```json
{
  "node": {
    "selector": "",
    "style": {
      "label": {
        "enabled": true,
        "textPath": "{name}",
        "fontSize": 24,
        "textColor": "#FFFFFF"
      }
    }
  }
}
```

---

## Accessibility Considerations

1. **Keyboard Navigation**
   - All controls accessible via Tab
   - Arrow keys for select dropdowns
   - Enter to confirm, Escape to cancel

2. **Screen Reader Support**
   - Proper ARIA labels on all controls
   - Descriptive labels for icon-only buttons
   - Announce state changes

3. **Color Contrast**
   - All text meets WCAG AA standards
   - Focus indicators visible against dark background

4. **Reduced Motion**
   - Respect `prefers-reduced-motion` for animations

---

## Additional Considerations

### 1. Deselecting a Layer

When the user clicks elsewhere (not on a layer), the selection should clear and show the Graph Properties panel. Options for how to trigger this:
- Click on empty space in the left sidebar
- Click on the graph canvas (if not selecting a node/edge)
- Explicit "deselect" button or keyboard shortcut (Escape)

### 2. Layer Enabling/Disabling

Each style layer could have a master enable/disable toggle:
- Disabled layers still appear in the list but don't affect rendering
- Visual indicator (dimmed, strikethrough, or eye icon) for disabled layers
- Quick way to A/B test style changes

### 3. Style Presets

Future feature: Pre-built style configurations users can apply:
- "Highlight" - Red color, glow effect
- "Dimmed" - Low opacity, gray color
- "Important Node" - Larger size, distinct shape
- "Strong Connection" - Thicker line, bold arrow

### 4. Undo/Redo Support

Style changes should be undoable:
- Track history of style changes per layer
- Keyboard shortcuts: Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo
- Consider grouping rapid changes (e.g., slider drags) into single undo steps

### 5. Copy/Paste Styles

Allow copying style configurations between layers:
- Copy entire node/edge style
- Copy specific groups (e.g., just effects, just color)
- Paste to multiple selected layers

### 6. Real-time Preview

Changes should update the graph immediately:
- No "Apply" button needed
- Consider debouncing rapid changes for performance
- Show loading indicator if updates are slow

### 7. Validation & Error States

Handle invalid inputs gracefully:
- Invalid JMESPath selectors: Show error message, highlight field
- Out-of-range values: Clamp or show warning
- Invalid color formats: Show color picker error state

### 8. Responsive Behavior

The sidebar should work at different widths:
- Minimum width: ~240px (inputs start to cramp)
- Labels may need to truncate or wrap
- Consider collapsible sections for narrow viewports

### 9. Scroll Behavior

When the sidebar content is taller than viewport:
- Smooth scrolling within the panel
- Section headers could be sticky (optional)
- Remember scroll position when switching between layers

### 10. Empty States

Handle cases with no data:
- No layers: "Click + to add a style layer"
- No data sources: "Load data to see graph statistics"
- Layer with no selector matches: "No nodes/edges match this selector"

---

## Open Questions

1. **Should Node and Edge properties be in separate ControlSections (accordion) or always both visible?**
   - Accordion: Cleaner, less scrolling when focused on one
   - Both visible: Easier to compare and set related styles

2. **How should we handle layers that only style nodes OR edges (not both)?**
   - Always show both sections, just leave one empty
   - Show only the relevant section
   - User chooses via toggle/tabs

3. **Should we support "linked" properties?**
   - E.g., arrow head and tail use same color by default
   - "Link" icon to sync them, can be broken for independent values

4. **How detailed should the selector help be?**
   - Just placeholder text with example
   - Inline help tooltip
   - Link to documentation
   - Autocomplete based on available node/edge properties

5. **Should the default values come from graphty-element or be configurable?**
   - Currently hardcoded based on graphty-element defaults
   - Could allow app-level default overrides

---

## References

- [Figma Style Sidebar Design](./figma-style-sidebar.md) - Base component styling
- [graphty-element API](../../packages/graphty-element/README.md) - Style property definitions
- [Mantine Components](https://mantine.dev/) - UI component library
