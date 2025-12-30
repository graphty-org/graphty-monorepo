# Progressive Disclosure Design for Graphty Properties Sidebar

## Overview

This document outlines research into Figma's property panel organization patterns and proposes solutions for reducing visual clutter in Graphty's properties sidebar, particularly for complex features like labels and tooltips.

---

## Part 1: Figma Research

### 1.1 Figma UI3 Design Philosophy

At Config 2024, Figma introduced UI3, a major redesign of their interface. Key principles:

- **"Keep designers in the flow by minimizing distractions and placing their work center stage"**
- **"Speed is a feature"** - They reversed the floating panel decision after learning it slowed users down
- **"Craft and flow don't have easy metrics, so you have to listen to users a lot"**
- Properties are now grouped to match modern workflows
- The properties panel is resizable for flexibility

**Source**: [Figma on Figma: Our Approach to Designing UI3](https://www.figma.com/blog/our-approach-to-designing-ui3/)

### 1.2 Right Sidebar Structure

Figma's right sidebar has two main tabs based on context:

**With Edit Access:**
- **Design tab**: Editable properties for selected layers
- **Prototype tab**: Prototyping and interaction settings

**With View-Only Access:**
- **Comment tab**: Collaboration comments
- **Properties tab**: Read-only inspection

**Source**: [Design, prototype, and explore layer properties in the right sidebar](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar)

### 1.3 Property Grouping Categories

When a layer is selected, Figma organizes properties into logical sections:

1. **Header row** - Quick actions (mask, create component, boolean operations)
2. **Layout** - Width, height, constraints, auto layout
3. **Alignment & Position** - Rotation, coordinates
4. **Corner radius** - Border radius adjustments
5. **Fill** - Background colors and images
6. **Stroke** - Border styling
7. **Effects** - Shadows, blur, etc.
8. **Export** - Export configurations

**Key insight**: The "Layout" label dynamically changes to "Auto layout" when that feature is enabled, revealing additional properties.

### 1.4 Typography Property Organization

Figma uses a **two-tier system** for text properties:

#### Tier 1: Inline in Sidebar (Always Visible)
The Typography section shows the most common controls:
- Font family
- Font weight/style
- Font size
- Line height
- Letter spacing
- Text alignment (horizontal & vertical)

#### Tier 2: Type Settings Pop-out Panel
Clicking the settings icon (⚙️) opens a dedicated panel with **tabs**:

**Basics Tab:**
- Horizontal alignment options
- Text decoration (strikethrough, underline)
- Letter case transformations
- Vertical trim toggle
- List creation (numbered/bulleted)
- Paragraph spacing
- Text truncation and max lines

**Details Tab:**
- Indentation controls (paragraph indent, hanging quotes, hanging lists)
- Letter case with case-sensitive forms
- Number properties (style, position, fractions, slashed zero)
- OpenType feature adjustments (font-specific)

**Variable Tab** (for variable fonts):
- Weight, width, optical size, slant adjustments

**Source**: [Explore text properties](https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties)

### 1.5 Progressive Disclosure Principles

Progressive disclosure in UI design:

1. **Guides users through multi-step processes** by providing the right amount of information at each step
2. **Prioritizes what to include** vs exclude - too many features can be overwhelming
3. **Promotes intuitive navigation** through strategic data organization
4. **Groups content into manageable sections** revealed on user request

**Key quote**: "It's about carefully grouping content into manageable sections and revealing them only when the user requests them."

**Source**: [Progressive Disclosure Examples](https://medium.com/@Flowmapp/progressive-disclosure-10-great-examples-to-check-5e54c5e0b5b6)

### 1.6 Accordion/Collapsible Patterns

Figma and the design community use accordions for:

- **Accordion UI Elements**: Headers, icons (expand/collapse indicators), and panels
- **Headers** should contain titles sufficient to describe content
- **Icons** indicate collapsed/expanded state
- **Panels** contain the detailed content

Best practices:
- Use when displaying content in a space-saving manner
- Hide secondary information to reduce visual clutter
- Common in accordion-style menus and expandable sections

**Source**: [Accordion Design Variations](https://www.figma.com/community/file/1411437020002656213/accordion-design-variations)

---

## Part 2: Current Graphty Sidebar Analysis

### 2.1 Current Structure

```
Node Properties
├── Node Selector (text input)
├── Shape
│   ├── Shape Type (dropdown)
│   └── Size (number input)
├── Color
│   ├── Color Mode (radio: Solid/Gradient/Radial)
│   └── Color swatch + hex + opacity
├── Effects
│   ├── ☑ Glow
│   ├── ☑ Outline
│   ├── ☑ Wireframe
│   └── ☑ Flat Shaded
├── Label
│   ├── ☑ Enabled
│   └── [When enabled, expands to show ~15 controls]
│       ├── Text
│       ├── Location
│       ├── Font Family, Font Size
│       ├── Font Weight, Font Color
│       ├── Position, Offset
│       ├── ☑ Billboard
│       ├── ☑ Background
│       ├── ▶ Text Effects (collapsed)
│       ├── ▶ Animation (collapsed)
│       └── ▶ Advanced (collapsed)
└── Tooltip
    ├── ☑ Enabled
    └── [Same structure as Label when enabled]

Edge Properties (collapsible section)
├── Edge Selector
├── Line (Type, Width, Color)
├── Arrow Head (Type, Size, Color)
├── Arrow Tail (Type, Size, Color)
├── Label (☑ Enabled + controls)
└── Tooltip (☑ Enabled + controls)
```

### 2.2 Current Problems

1. **Visual Clutter**: When Label is enabled, 15+ controls appear immediately
2. **Deep Nesting**: Multiple levels of collapsible sections within Label
3. **Repetition**: Label and Tooltip have identical structures
4. **Inconsistent Patterns**: Some features use checkboxes, others use collapsible headers
5. **No Pop-outs**: All controls are inline, making the sidebar very long

---

## Part 3: Proposed Solutions

### 3.1 Option A: Figma-Style Pop-out Panel

**Pattern**: Essential controls inline, advanced controls in a pop-out panel accessed via ⚙️ icon.

```
Label
├── ☑ Enabled
├── Text: [________________]
├── Font: [Arial ▼]  Size: [48]
├── Color: [■ #FFFFFF]
└── [⚙️] → Opens "Label Settings" pop-out
```

**Pop-out Panel Structure**:
```
┌─────────────────────────────────┐
│ Label Settings               ✕ │
├─────────────────────────────────┤
│ [Position] [Style] [Advanced]   │
├─────────────────────────────────┤
│ POSITION TAB:                   │
│ ├── Position: [Above ▼]        │
│ ├── Offset: [0]                │
│ ├── ☑ Billboard                │
│ └── Location: [Static ▼]       │
├─────────────────────────────────┤
│ STYLE TAB:                      │
│ ├── Font Weight: [Normal ▼]    │
│ ├── Background                  │
│ │   ├── ☑ Enabled              │
│ │   └── [controls...]          │
│ ├── Text Outline               │
│ │   ├── ☑ Enabled              │
│ │   └── [controls...]          │
│ └── Text Shadow                │
│     ├── ☑ Enabled              │
│     └── [controls...]          │
├─────────────────────────────────┤
│ ADVANCED TAB:                   │
│ ├── Resolution: [64]           │
│ ├── ☑ Depth Fade               │
│ └── Animation: [None ▼]        │
└─────────────────────────────────┘
```

**Pros**:
- Follows Figma's established pattern
- Dramatically reduces sidebar clutter
- Clear separation of essential vs advanced
- Tabbed organization for related features

**Cons**:
- Requires implementing pop-out/popover component
- Extra click to access advanced features
- Need to manage pop-out positioning and state

### 3.2 Option B: Tiered Collapsible Sections

**Pattern**: Use consistent collapsible sections with smart defaults.

```
Label
├── ☑ Enabled
├── Text: [________________]
├── Font: [Arial ▼]  Size: [48]  Color: [■]
│
├── ▶ Position (collapsed by default)
│   ├── Position: [Above ▼]
│   ├── Offset: [0]
│   └── ☑ Billboard
│
├── ▶ Background (collapsed by default)
│   └── [controls when expanded]
│
├── ▶ Effects (collapsed by default)
│   ├── Outline controls
│   └── Shadow controls
│
└── ▶ Advanced (collapsed by default)
    └── [controls when expanded]
```

**Pros**:
- Uses existing `ControlSubGroup` component
- No new component types needed
- All options visible in hierarchy

**Cons**:
- Still shows many collapsed headers
- Doesn't match Figma's pattern as closely
- More scrolling required

### 3.3 Option C: Hybrid Approach

**Pattern**: Inline essentials + single "More Options" expandable section + pop-out for rarely-used features.

```
Label
├── ☑ Enabled
├── Text: [________________]
├── Font: [Arial ▼]  Size: [48]  Color: [■]
├── Position: [Above ▼]  [⚙️]
│
└── ▶ More Options
    ├── ☑ Background → [expands inline]
    ├── ☑ Text Outline → [expands inline]
    └── ☑ Text Shadow → [expands inline]
```

Where [⚙️] next to Position opens a small pop-out for:
- Offset, Billboard, Location, Animation, Resolution, Depth Fade

**Pros**:
- Balances discoverability with simplicity
- Less implementation complexity than full pop-out
- Most controls still accessible inline

**Cons**:
- Hybrid patterns can be confusing
- Two different interaction patterns to learn

### 3.4 Recommended Approach: Option A (Figma-Style Pop-out)

**Rationale**:
1. **Proven pattern** - Figma has validated this with millions of users
2. **Maximum clutter reduction** - Only 4 essential controls visible
3. **Scalable** - Easy to add features to pop-out without sidebar impact
4. **Professional appearance** - Matches industry-standard design tools
5. **Clear mental model** - "Basic stuff here, advanced stuff in settings"

---

## Part 4: Implementation Details

### 4.1 Component Requirements

| Component | Purpose | Mantine Equivalent |
|-----------|---------|-------------------|
| PopoverPanel | Floating settings panel | `Popover` or `Modal` |
| TabGroup | Organize pop-out content | `Tabs` |
| SettingsButton | Trigger for pop-out | `ActionIcon` with gear icon |
| CollapsibleSection | Inline expandable areas | Existing `ControlSubGroup` |

### 4.2 Property Tier Assignment

| Tier | Location | Properties | Clicks to Access |
|------|----------|-----------|------------------|
| Essential | Inline | Text, Font, Size, Color | 0 |
| Common | Pop-out > Position tab | Position, Offset, Billboard, Location | 1 |
| Style | Pop-out > Style tab | Weight, Background, Outline, Shadow | 1 |
| Advanced | Pop-out > Advanced tab | Resolution, Depth Fade, Animation | 1 |

### 4.3 Responsive Behavior

- Pop-out should position intelligently (avoid going off-screen)
- On narrow screens, pop-out could become a slide-out panel
- Consider `Drawer` component for mobile

### 4.4 State Management

- Pop-out open/closed state should be local (not persisted)
- Active tab within pop-out could be remembered per-session
- Consider keyboard shortcuts (e.g., Escape to close)

---

## Part 5: References

### Figma Documentation
- [Design, prototype, and explore layer properties](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar)
- [Explore text properties](https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties)
- [Navigating UI3: Figma's new UI](https://help.figma.com/hc/en-us/articles/23954856027159-Navigating-UI3-Figma-s-new-UI)
- [Create and apply text styles](https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles)

### Design Philosophy
- [Figma on Figma: Our Approach to Designing UI3](https://www.figma.com/blog/our-approach-to-designing-ui3/)
- [Typography systems in Figma](https://www.figma.com/best-practices/typography-systems-in-figma/)

### UI Patterns
- [Progressive Disclosure Examples](https://medium.com/@Flowmapp/progressive-disclosure-10-great-examples-to-check-5e54c5e0b5b6)
- [Progressive Disclosure - The Decision Lab](https://thedecisionlab.com/reference-guide/design/progressive-disclosure)
- [Accordion Design Variations](https://www.figma.com/community/file/1411437020002656213/accordion-design-variations)
- [Expand Collapse UI Design Guide](https://pixso.net/tips/expand-collapse-ui-design/)

### Figma Community Resources
- [Collapsible Panel Component](https://www.figma.com/community/file/1431884911958753664/collapsible-panel)
- [Figma Design Principles](https://www.figma.com/community/file/817913152610525667/figma-design-principles)

---

## Part 6: Optional Features Pattern

### 6.1 Figma's Two Distinct Patterns

Figma uses **two different patterns** for optional features, depending on the use case:

#### Pattern A: Plus/Minus (+/-) with Eye Icon
**Used for**: Features that can have **multiple instances** (fills, strokes, effects/shadows)

```
Fill
├── [+ button] Add new fill
│
├── [eye icon] [color swatch] [opacity] [- button]  ← Fill 1
├── [eye icon] [color swatch] [opacity] [- button]  ← Fill 2
└── [eye icon] [color swatch] [opacity] [- button]  ← Fill 3
```

**Interaction**:
- **+ (Plus)**: Adds a new instance (e.g., another fill, another shadow)
- **- (Minus)**: Removes the instance entirely
- **Eye icon**: Toggles visibility without removing (non-destructive hide)
- **Drag handle**: Reorders multiple instances

**Source**: [Guide to fills](https://help.figma.com/hc/en-us/articles/360041003694-Guide-to-fills)

#### Pattern B: Toggle Switch
**Used for**: Features that are **boolean on/off** (single instance, layer visibility)

```
Properties
├── Has Icon    [====○]  ← Toggle switch (off)
├── Show Badge  [●====]  ← Toggle switch (on)
└── Rounded     [●====]  ← Toggle switch (on)
```

**Interaction**:
- Click to toggle between on/off states
- When off, dependent controls may be hidden or disabled
- No "remove" concept - the property always exists, just enabled or disabled

**Key insight**: "Properties with only 2 values: true and false (or off and on) are called a boolean. They'll give us a toggle switch instead of a menu."

**Source**: [Figma Component Properties Guide](https://www.thedesignership.com/blog/figma-component-properties-guide)

### 6.2 Figma Does NOT Use Checkboxes

Importantly, **Figma does not use checkboxes** in their properties panel. They use:

1. **Toggle switches** for boolean properties
2. **Eye icons** for visibility toggles
3. **+/- buttons** for adding/removing instances

This is a deliberate design choice - toggle switches are more visually scannable and take up consistent space regardless of label length.

### 6.3 When to Use Each Pattern

| Pattern | Use When | Example |
|---------|----------|---------|
| **+/- with Eye** | Multiple instances possible | Multiple fills, multiple shadows, multiple effects |
| **Toggle Switch** | Single on/off feature | "Has Icon", "Billboard mode", layer visibility |
| **Section Header Toggle** | Feature with child properties | "Auto layout" (expands to show child controls) |

### 6.4 Effects Panel Deep Dive

Figma's Effects section demonstrates the +/- pattern:

```
Effects                              [+]
├── [eye] Drop shadow   [settings ⚙️] [-]
├── [eye] Inner shadow  [settings ⚙️] [-]
└── [eye] Layer blur    [settings ⚙️] [-]
```

**Key behaviors**:
- Clicking **+** opens a dropdown to select effect type (Drop shadow, Inner shadow, Layer blur, Background blur, Noise, Texture, Glass)
- Each effect has its own **eye icon** for visibility
- Each effect has a **settings icon** (⚙️) that opens a popover with detailed controls
- **-** removes that specific effect
- Supports up to 8 shadows, 2 noise effects, 1 blur, 1 texture, 1 glass

**Source**: [Apply effects to layers](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers)

### 6.5 Comparison to Current Graphty Implementation

| Graphty Current | Figma Equivalent | Recommendation |
|-----------------|------------------|----------------|
| `☑ Enabled` checkbox for Label | Toggle switch | **Switch to toggle** |
| `☑ Glow` checkbox | +/- pattern OR toggle | **See section 6.6** |
| `☑ Outline` checkbox | +/- pattern OR toggle | **See section 6.6** |
| `☑ Background` checkbox | Toggle switch | **Switch to toggle** |
| `☑ Billboard` checkbox | Toggle switch | **Switch to toggle** |

### 6.6 Recommendation for Graphty Effects

Our "Effects" section has: Glow, Outline, Wireframe, Flat Shaded

**Analysis**:
- These are **not** multiple-instance features (you can't have 3 glows)
- They are **boolean on/off** features
- However, Glow and Outline have **child properties** when enabled (color, strength/width)

**Recommended Pattern**: **Toggle Switch with Conditional Expansion**

```
Effects
├── Glow        [●====]  ← Toggle on
│   ├── Color: [■ #FFFFFF]
│   └── Strength: [0.5]
│
├── Outline     [====○]  ← Toggle off (no children shown)
│
├── Wireframe   [====○]  ← Toggle off
│
└── Flat Shaded [====○]  ← Toggle off
```

**Alternative**: If we want to match Figma's Effects pattern more closely:

```
Effects                              [+]
├── [eye] Glow      [settings ⚙️] [-]
└── [eye] Outline   [settings ⚙️] [-]

[+ dropdown options: Glow, Outline, Wireframe, Flat Shaded]
```

But this adds complexity for features that are simple on/off toggles. **The toggle switch pattern is simpler and sufficient for our use case.**

---

## Part 7: Final Recommendations

### 7.1 Replace Checkboxes with Toggle Switches

**Before** (current):
```
☑ Enabled
☑ Billboard
☑ Background
```

**After** (recommended):
```
Enabled     [●====]
Billboard   [●====]
Background  [====○]
```

**Benefits**:
- Matches Figma's design language
- More visually scannable
- Clearer on/off state indication
- Professional appearance

**Implementation**: Use Mantine's `Switch` component instead of `Checkbox`

### 7.2 Effects Section Options

**Option A: Toggle Switches (Simpler)**
```
Effects
├── Glow        [●====]  → expands to show Color, Strength
├── Outline     [====○]
├── Wireframe   [====○]
└── Flat Shaded [====○]
```

**Option B: +/- Pattern (More Figma-like)**
```
Effects                    [+]
├── [eye] Glow    [⚙️] [-]
└── [eye] Outline [⚙️] [-]
```

**Recommendation**: **Option A** - Toggle switches are simpler and our effects don't benefit from the multi-instance pattern.

### 7.3 Label/Tooltip Section

Combine the progressive disclosure (Part 3) with toggle switches:

```
Label
├── [Toggle: ●====] Enabled
├── Text: [________________]
├── Font: [Arial ▼]  Size: [48]
├── Color: [■ #FFFFFF]
└── [⚙️ Settings] → Opens popover with:
    ├── Position tab (Position, Offset, Billboard, Location)
    ├── Style tab (Weight, Background toggle + controls, Outline toggle + controls, Shadow toggle + controls)
    └── Advanced tab (Resolution, Depth Fade toggle, Animation)
```

### 7.4 Implementation Priority

1. **Phase 1**: Replace checkboxes with toggle switches (low effort, high impact)
2. **Phase 2**: Implement settings popover for Label/Tooltip advanced options
3. **Phase 3**: Consider +/- pattern if we add multi-instance features in the future

---

## Part 8: Additional References

### Optional Features & Toggle Patterns
- [Apply and adjust stroke properties](https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties)
- [Apply effects to layers](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers)
- [Toggle visibility to hide layers](https://help.figma.com/hc/en-us/articles/360041112614-Toggle-visibility-to-hide-layers)
- [Explore component properties](https://help.figma.com/hc/en-us/articles/5579474826519-Explore-component-properties)
- [Figma Component Properties Guide](https://www.thedesignership.com/blog/figma-component-properties-guide)

### UI Component Resources
- [Toggles, Switches & Checkboxes UI Kit](https://www.figma.com/community/file/1317167172273052708/toggles-switches-checkboxes-ui-kit)
- [Figma toggle components - Untitled UI](https://www.untitledui.com/components/toggles)
- [Toggle Switch Variants](https://www.figma.com/community/file/1197516601322622426/toggle-switch-variants-and-components)
