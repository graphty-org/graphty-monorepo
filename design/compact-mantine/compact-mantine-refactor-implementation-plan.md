# Implementation Plan for Compact Mantine Theme Refactor

## Overview

This plan outlines the refactor of `@graphty/compact-mantine` from a custom `size="compact"` pattern to a Mantine-idiomatic approach using `defaultProps` with `size="sm"` as the default. The refactor separates dimensional concerns (size) from visual styling (borderless, semantic backgrounds), making the theme more composable and aligned with Mantine best practices.

**Key Changes:**
- Remove custom `size="compact"` handling
- Use `defaultProps: { size: "sm" }` for all components
- Override Mantine's global tokens (`fontSizes`, `spacing`, `radius`) for compact defaults
- Extract visual styles into static style objects applied via `styles`
- Remove conditional `if (props.size === "compact")` logic

## Phase Breakdown

### Phase 1: Global Token System & Theme Foundation
**Objective**: Establish the compact token system and update theme structure without breaking existing components

**Duration**: 1-2 days

**Tests to Write First**:

- `tests/theme/tokens.test.ts`: Verify token values and structure
  ```typescript
  import { describe, expect, it } from "vitest";
  import { compactTheme } from "../../src";

  describe("Compact Token System", () => {
    it("overrides fontSizes with compact values", () => {
      expect(compactTheme.fontSizes?.sm).toBe("11px");
      expect(compactTheme.fontSizes?.xs).toBe("10px");
    });

    it("overrides spacing with tighter values", () => {
      expect(compactTheme.spacing?.xs).toBe("4px");
      expect(compactTheme.spacing?.sm).toBe("6px");
    });

    it("overrides radius with compact values", () => {
      expect(compactTheme.radius?.sm).toBe("4px");
    });
  });
  ```

- `tests/theme/theme.test.ts`: Update to verify new token structure
  ```typescript
  it("exports fontSizes, spacing, and radius overrides", () => {
    expect(compactTheme.fontSizes).toBeDefined();
    expect(compactTheme.spacing).toBeDefined();
    expect(compactTheme.radius).toBeDefined();
  });
  ```

**Implementation**:

- `src/theme/tokens.ts`: Define compact token values
  ```typescript
  export const compactFontSizes = {
    xs: "10px",
    sm: "11px",   // Our compact default
    md: "13px",
    lg: "14px",
    xl: "16px",
  };

  export const compactSpacing = {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  };

  export const compactRadius = {
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  };
  ```

- `src/theme/index.ts`: Update to include token overrides
  ```typescript
  export const compactTheme = createTheme({
    colors: compactColors,
    fontSizes: compactFontSizes,
    spacing: compactSpacing,
    radius: compactRadius,
    components: { ... },
  });
  ```

**Dependencies**:
- External: None (uses existing `@mantine/core`)
- Internal: None (foundation phase)

**Verification**:
1. Run: `cd compact-mantine && npm test -- --run tests/theme/tokens.test.ts`
2. Expected output: All token tests pass
3. Run: `cd compact-mantine && npm run storybook`
4. Navigate to any component story and verify it still renders (backward compatible)

---

### Phase 2: Input Components Migration
**Objective**: Migrate all input components to use `defaultProps` with `size="sm"` and static styles

**Duration**: 2-3 days

**Tests to Write First**:

- `tests/theme/inputs-refactor.test.ts`: Verify default props behavior
  ```typescript
  import { describe, expect, it } from "vitest";
  import { inputComponentExtensions } from "../../src/theme/components/inputs";

  describe("Input Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
      it("TextInput defaults to size sm", () => {
        const extension = inputComponentExtensions.TextInput;
        expect(extension.defaultProps?.size).toBe("sm");
      });

      it("TextInput defaults to variant filled", () => {
        const extension = inputComponentExtensions.TextInput;
        expect(extension.defaultProps?.variant).toBe("filled");
      });

      it("all input components default to size sm", () => {
        const inputComponents = [
          "TextInput", "NumberInput", "Select", "Textarea",
          "PasswordInput", "Autocomplete", "ColorInput",
          "MultiSelect", "TagsInput", "PillsInput", "FileInput", "JsonInput"
        ];

        for (const name of inputComponents) {
          const ext = inputComponentExtensions[name];
          expect(ext.defaultProps?.size, `${name} should default to sm`).toBe("sm");
        }
      });
    });

    describe("styles are static", () => {
      it("TextInput uses static styles (not function)", () => {
        const extension = inputComponentExtensions.TextInput;
        // After refactor, styles should be an object, not a function
        expect(typeof extension.styles).toBe("object");
      });
    });
  });
  ```

- Update `tests/theme/inputs-integration.test.tsx`: Test that default size applies without explicit prop
  ```typescript
  describe("TextInput with default size", () => {
    it("renders with sm size when no size prop provided", () => {
      const { container } = render(
        <MantineProvider theme={compactTheme}>
          <TextInput label="Default Size" />
        </MantineProvider>,
      );
      expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
    });

    it("can override to larger size", () => {
      const { container } = render(
        <MantineProvider theme={compactTheme}>
          <TextInput size="md" label="Medium Size" />
        </MantineProvider>,
      );
      expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
    });
  });
  ```

**Implementation**:

- `src/theme/styles/inputs.ts`: Extract static visual styles
  ```typescript
  export const compactInputStyles = {
    label: {
      fontSize: 11,
      color: "var(--mantine-color-dimmed)",
      marginBottom: 1,
      lineHeight: 1.2,
    },
    input: {
      paddingLeft: 8,
      paddingRight: 8,
      border: "none",
      backgroundColor: "var(--mantine-color-default)",
    },
  };

  export const compactDropdownStyles = {
    dropdown: {
      padding: 4,
      border: "none",
      boxShadow: "var(--mantine-shadow-md)",
    },
    option: {
      fontSize: 11,
      padding: "4px 8px",
      borderRadius: 4,
    },
  };
  ```

- `src/theme/components/inputs.ts`: Refactor to use defaultProps
  ```typescript
  import { compactInputStyles, compactDropdownStyles } from "../styles/inputs";

  export const inputComponentExtensions = {
    TextInput: TextInput.extend({
      defaultProps: {
        size: "sm",
        variant: "filled",
      },
      styles: compactInputStyles,
    }),

    NumberInput: NumberInput.extend({
      defaultProps: {
        size: "sm",
        variant: "filled",
      },
      styles: {
        ...compactInputStyles,
        control: {
          borderColor: "transparent",
        },
      },
    }),

    Select: Select.extend({
      defaultProps: {
        size: "sm",
        variant: "filled",
        comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
      },
      styles: {
        ...compactInputStyles,
        ...compactDropdownStyles,
      },
    }),
    // ... etc for all 14 input components
  };
  ```

**Dependencies**:
- External: None
- Internal: Phase 1 (token system)

**Verification**:
1. Run: `cd compact-mantine && npm test -- --run tests/theme/inputs`
2. Expected output: All input tests pass
3. Run Storybook: `pnpm run storybook:graphty` (port 9035)
4. Navigate to Input components, verify:
   - Inputs render at compact size by default (no `size` prop needed)
   - Visual styling (borderless, semantic bg) is applied
   - Can override to larger sizes with `size="md"` or `size="lg"`

---

### Phase 3: Button & Control Components Migration
**Objective**: Migrate Button, ActionIcon, CloseButton, Switch, Slider, Checkbox, Radio, SegmentedControl

**Duration**: 1-2 days

**Tests to Write First**:

- `tests/theme/buttons-refactor.test.ts`:
  ```typescript
  describe("Button Component Extensions (Refactored)", () => {
    it("Button defaults to size sm", () => {
      const extension = buttonComponentExtensions.Button;
      expect(extension.defaultProps?.size).toBe("sm");
    });

    it("ActionIcon defaults to size sm and variant subtle", () => {
      const extension = buttonComponentExtensions.ActionIcon;
      expect(extension.defaultProps?.size).toBe("sm");
      expect(extension.defaultProps?.variant).toBe("subtle");
    });

    it("CloseButton defaults to size xs", () => {
      const extension = buttonComponentExtensions.CloseButton;
      expect(extension.defaultProps?.size).toBe("xs");
    });
  });
  ```

- `tests/theme/controls-refactor.test.ts`:
  ```typescript
  describe("Control Component Extensions (Refactored)", () => {
    it("Switch defaults to size sm", () => {
      const extension = controlComponentExtensions.Switch;
      expect(extension.defaultProps?.size).toBe("sm");
    });

    it("Checkbox defaults to size sm", () => {
      const extension = controlComponentExtensions.Checkbox;
      expect(extension.defaultProps?.size).toBe("sm");
    });

    it("Slider defaults to size sm", () => {
      const extension = controlComponentExtensions.Slider;
      expect(extension.defaultProps?.size).toBe("sm");
    });
  });
  ```

**Implementation**:

- `src/theme/styles/buttons.ts`: Extract button visual styles
  ```typescript
  export const compactButtonStyles = {
    root: {
      // Button-specific compact styling
    },
  };

  export const compactActionIconStyles = {
    root: {
      // ActionIcon-specific styling
    },
  };
  ```

- `src/theme/components/buttons.ts`: Refactor
  ```typescript
  export const buttonComponentExtensions = {
    Button: Button.extend({
      defaultProps: {
        size: "sm",
      },
    }),

    ActionIcon: ActionIcon.extend({
      defaultProps: {
        size: "sm",
        variant: "subtle",
      },
    }),

    CloseButton: CloseButton.extend({
      defaultProps: {
        size: "xs",
      },
    }),
  };
  ```

- `src/theme/components/controls.ts`: Refactor
  ```typescript
  export const controlComponentExtensions = {
    Switch: Switch.extend({
      defaultProps: { size: "sm" },
    }),

    Checkbox: Checkbox.extend({
      defaultProps: { size: "sm" },
    }),

    Slider: Slider.extend({
      defaultProps: { size: "sm" },
    }),

    Radio: Radio.extend({
      defaultProps: { size: "sm" },
    }),

    SegmentedControl: SegmentedControl.extend({
      defaultProps: { size: "sm" },
    }),

    RangeSlider: RangeSlider.extend({
      defaultProps: { size: "sm" },
    }),
  };
  ```

**Dependencies**:
- External: None
- Internal: Phase 1 (token system)

**Verification**:
1. Run: `cd compact-mantine && npm test -- --run tests/theme/buttons tests/theme/controls`
2. Run Storybook and verify:
   - Buttons render compact by default
   - Switches, Checkboxes, Sliders render compact by default
   - All components can be overridden to larger sizes

---

### Phase 4: Display & Navigation Components Migration
**Objective**: Migrate Badge, Text, Avatar, Indicator, ThemeIcon, Kbd, Pill, Tabs, NavLink, Pagination, Stepper, Anchor, Burger

**Duration**: 1-2 days

**Tests to Write First**:

- `tests/theme/display-refactor.test.ts`:
  ```typescript
  describe("Display Component Extensions (Refactored)", () => {
    it("Badge defaults to size sm", () => {
      const extension = displayComponentExtensions.Badge;
      expect(extension.defaultProps?.size).toBe("sm");
    });

    it("Text does not set default size (uses inherited fontSize)", () => {
      const extension = displayComponentExtensions.Text;
      // Text inherits from global fontSizes, no default needed
      expect(extension.defaultProps?.size).toBeUndefined();
    });

    it("Avatar defaults to size sm", () => {
      const extension = displayComponentExtensions.Avatar;
      expect(extension.defaultProps?.size).toBe("sm");
    });
  });
  ```

- `tests/theme/navigation-refactor.test.ts`:
  ```typescript
  describe("Navigation Component Extensions (Refactored)", () => {
    it("Tabs defaults to size sm", () => {
      const extension = navigationComponentExtensions.Tabs;
      expect(extension.defaultProps?.size).toBe("sm");
    });

    it("NavLink defaults to size sm", () => {
      const extension = navigationComponentExtensions.NavLink;
      expect(extension.defaultProps?.size).toBe("sm");
    });
  });
  ```

**Implementation**:

- `src/theme/components/display.ts`: Refactor
  ```typescript
  export const displayComponentExtensions = {
    Badge: Badge.extend({
      defaultProps: { size: "sm" },
    }),

    Text: Text.extend({
      // No defaultProps - uses global fontSizes
    }),

    Avatar: Avatar.extend({
      defaultProps: { size: "sm" },
    }),

    ThemeIcon: ThemeIcon.extend({
      defaultProps: { size: "sm" },
    }),

    Indicator: Indicator.extend({
      defaultProps: { size: "sm" },
    }),

    Kbd: Kbd.extend({
      defaultProps: { size: "sm" },
    }),

    Pill: Pill.extend({
      defaultProps: { size: "sm" },
    }),
  };
  ```

- `src/theme/components/navigation.ts`: Refactor
  ```typescript
  export const navigationComponentExtensions = {
    Tabs: Tabs.extend({
      defaultProps: { size: "sm" },
    }),

    NavLink: NavLink.extend({
      defaultProps: { size: "sm" },
    }),

    Pagination: Pagination.extend({
      defaultProps: { size: "sm" },
    }),

    Stepper: Stepper.extend({
      defaultProps: { size: "sm" },
    }),

    Anchor: Anchor.extend({
      defaultProps: { size: "sm" },
    }),

    Burger: Burger.extend({
      defaultProps: { size: "sm" },
    }),
  };
  ```

**Dependencies**:
- External: None
- Internal: Phase 1 (token system)

**Verification**:
1. Run: `cd compact-mantine && npm test -- --run tests/theme/display tests/theme/navigation`
2. Run Storybook and verify all display/navigation components render compact by default

---

### Phase 5: Feedback & Overlay Components Migration
**Objective**: Migrate Loader, Progress, RingProgress, Menu, Tooltip, Popover, HoverCard

**Duration**: 1 day

**Tests to Write First**:

- `tests/theme/feedback-refactor.test.ts`:
  ```typescript
  describe("Feedback Component Extensions (Refactored)", () => {
    it("Loader defaults to size sm", () => {
      const extension = feedbackComponentExtensions.Loader;
      expect(extension.defaultProps?.size).toBe("sm");
    });

    it("Progress defaults to size sm", () => {
      const extension = feedbackComponentExtensions.Progress;
      expect(extension.defaultProps?.size).toBe("sm");
    });
  });
  ```

- `tests/theme/overlays-refactor.test.ts`:
  ```typescript
  describe("Overlay Component Extensions (Refactored)", () => {
    it("Menu maintains zIndex default", () => {
      const extension = overlayComponentExtensions.Menu;
      expect(extension.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
    });

    it("Tooltip maintains zIndex default", () => {
      const extension = overlayComponentExtensions.Tooltip;
      expect(extension.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
    });
  });
  ```

**Implementation**:

- `src/theme/components/feedback.ts`: Refactor
  ```typescript
  export const feedbackComponentExtensions = {
    Loader: Loader.extend({
      defaultProps: { size: "sm" },
    }),

    Progress: Progress.extend({
      defaultProps: { size: "sm" },
    }),

    // RingProgress uses numeric size - document recommended usage
    RingProgress: RingProgress.extend({
      // Use size={48} in components for compact sizing
    }),
  };
  ```

- `src/theme/components/overlays.ts`: Keep z-index defaults (already using defaultProps)

**Dependencies**:
- External: None
- Internal: Phase 1 (token system)

**Verification**:
1. Run: `cd compact-mantine && npm test -- --run tests/theme/feedback tests/theme/overlays`
2. Run Storybook and verify feedback components render compact by default

---

### Phase 6: Clean Up & Backward Compatibility
**Objective**: Remove deprecated `size="compact"` code paths, update documentation, create migration script

**Duration**: 1-2 days

**Tests to Write First**:

- `tests/theme/migration.test.ts`: Verify breaking changes are properly handled
  ```typescript
  describe("Migration from size='compact'", () => {
    it("size='compact' is no longer recognized (renders with custom size)", () => {
      const { container } = render(
        <MantineProvider theme={compactTheme}>
          <TextInput size="compact" label="Legacy" />
        </MantineProvider>,
      );
      // Should render but with data-size="compact" (custom, not styled)
      expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
    });

    it("components render correctly without explicit size prop", () => {
      const { container } = render(
        <MantineProvider theme={compactTheme}>
          <TextInput label="New Default" />
        </MantineProvider>,
      );
      expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
    });
  });
  ```

- `tests/theme/compact-css-regression.test.tsx`: Update for new behavior
  ```typescript
  // Update existing tests to verify new default behavior
  // Remove tests that depend on size="compact"
  ```

**Implementation**:

- Remove all `if (props.size === "compact")` conditionals from component extensions
- Update `src/theme/components/*.ts` to remove `vars` functions (use static vars or none)
- Update all Storybook stories to remove `size="compact"` props
- Update README.md with migration guide
- Create `MIGRATION.md` documenting the breaking changes

**Files to Update**:
- `src/theme/components/inputs.ts` - Remove conditional logic
- `src/theme/components/buttons.ts` - Remove conditional logic
- `src/theme/components/controls.ts` - Remove conditional logic
- `src/theme/components/display.ts` - Remove conditional logic
- `src/theme/components/navigation.ts` - Remove conditional logic
- `src/theme/components/feedback.ts` - Remove conditional logic
- All Storybook files - Remove `size="compact"` usage
- All test files - Update to test new behavior

**Dependencies**:
- External: None
- Internal: Phases 2-5 (all components migrated)

**Verification**:
1. Run full test suite: `cd compact-mantine && npm run test:run`
2. Run lint: `cd compact-mantine && npm run lint`
3. Run build: `cd compact-mantine && npm run build`
4. Run Storybook and manually verify all component stories
5. Expected: All tests pass, no `size="compact"` references remain in codebase

---

### Phase 7: Documentation & Storybook Enhancement
**Objective**: Create comprehensive documentation showing the new API, update Storybook with size comparison stories

**Duration**: 1 day

**Tests to Write First**:

- `tests/theme/api.test.ts`: Verify public API exports
  ```typescript
  describe("Public API", () => {
    it("exports compactTheme", () => {
      expect(compactTheme).toBeDefined();
    });

    it("exports compactColors", () => {
      expect(compactColors).toBeDefined();
    });

    it("compactTheme can be spread for customization", () => {
      const custom = {
        ...compactTheme,
        primaryColor: "teal",
      };
      expect(custom.primaryColor).toBe("teal");
      expect(custom.fontSizes).toEqual(compactTheme.fontSizes);
    });
  });
  ```

**Implementation**:

- Create Storybook stories showing size comparisons:
  - `stories/theme/SizeComparison.stories.tsx`
  - Shows same component at xs, sm (default), md, lg sizes
  - Demonstrates override behavior

- Update package README with:
  - New usage examples (no `size` prop needed)
  - Customization via spread
  - Nested MantineProvider for compact regions

- Create `stories/docs/Migration.mdx` Storybook doc page

**Dependencies**:
- External: None
- Internal: Phase 6 (cleanup complete)

**Verification**:
1. Run Storybook and verify all documentation stories render
2. Review documentation for completeness
3. Verify examples in README work as documented

---

## Common Utilities Needed

- **Token Constants** (`src/theme/tokens.ts`): Centralized compact token values used across all components
- **Shared Input Styles** (`src/theme/styles/inputs.ts`): Visual styles for borderless inputs with semantic backgrounds
- **Shared Dropdown Styles** (`src/theme/styles/dropdowns.ts`): Styles for Select, Autocomplete, MultiSelect dropdowns

## External Libraries Assessment

- **No new libraries needed**: The refactor uses existing Mantine APIs (`createTheme`, `defaultProps`, `styles`)
- **Consider `@mantine/form`**: If adding form validation examples in Phase 7, may want to show integration

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing apps using `size="compact"`** | Document migration path clearly; Phase 6 includes migration tests and guide |
| **Visual regression in styled components** | Integration tests render actual components; Storybook visual comparison |
| **Token values don't match existing compact size** | Compare pixel values in Phase 1 tests; adjust tokens if needed |
| **Components that don't support `size` prop** | Identify in Phase 4-5; use `styles` or `vars` for these |
| **Nested MantineProvider theme merging issues** | Test nested provider behavior in Phase 7 |

## Success Criteria

1. **All tests pass** after each phase
2. **No `if (props.size === "compact")` logic** remains in codebase after Phase 6
3. **All components default to compact sizing** without explicit props
4. **Storybook renders all components** at compact size by default
5. **Build succeeds** with no TypeScript errors
6. **Lint passes** with no warnings
7. **Migration guide** clearly documents breaking changes
8. **API is minimal**: Single `compactTheme` export, customize via spread

## Component Count Summary

| Category | Components | Phase |
|----------|------------|-------|
| Inputs | 14 (TextInput, NumberInput, Select, etc.) | Phase 2 |
| Buttons | 3 (Button, ActionIcon, CloseButton) | Phase 3 |
| Controls | 6 (Switch, Checkbox, Slider, Radio, etc.) | Phase 3 |
| Display | 7 (Badge, Text, Avatar, ThemeIcon, etc.) | Phase 4 |
| Navigation | 6 (Tabs, NavLink, Pagination, etc.) | Phase 4 |
| Feedback | 3 (Loader, Progress, RingProgress) | Phase 5 |
| Overlays | 4 (Menu, Tooltip, Popover, HoverCard) | Phase 5 |
| **Total** | **43 components** | |

## Appendix: Size Mapping Reference

| Current Usage | New Usage |
|---------------|-----------|
| `<TextInput size="compact" />` | `<TextInput />` (sm is default) |
| `<TextInput />` (Mantine default) | `<TextInput size="md" />` |
| `<Button size="compact" />` | `<Button />` (sm is default) |
| `size="xs"` for extra small | `size="xs"` (still available) |

---

## Appendix: CSS Baseline Validation

CSS baselines captured via Playwright MCP from Storybook (`https://dev.ato.ms:9060`). See `tmp/css-baselines.json` for complete values.

### Phase 2 Validation: Input Components (14)

| Component | CSS Variable | Expected Value |
|-----------|-------------|----------------|
| TextInput | `--input-size` | `24px` |
| TextInput | `--input-fz` | `11px` |
| NumberInput | `--input-size` | `24px` |
| NumberInput | `--ni-chevron-size` | `10px` |
| Select | `--input-size` | `24px` |
| Textarea | `--input-fz` | `11px` (no height) |
| PasswordInput | `--input-size` | `24px` |
| Autocomplete | `--input-size` | `24px` |
| MultiSelect | `--combobox-chevron-size` | `12px` |
| TagsInput | `--input-fz` | `11px` (no height) |
| PillsInput | `--input-fz` | `11px` (no height) |
| FileInput | `--input-size` | `24px` |
| JsonInput | `--input-fz` | `11px` (no height) |
| ColorInput | `--input-size` | `24px` |
| InputClearButton | `--cb-size` | `16px` |

**Common computed styles**: height 24px, fontSize 11px, padding 8px, backgroundColor rgb(42, 48, 53)

### Phase 3 Validation: Button & Control Components (9)

| Component | CSS Variable | Expected Value |
|-----------|-------------|----------------|
| Button | `--button-height` | `24px` |
| Button | `--button-fz` | `11px` |
| ActionIcon | `--ai-size` | `24px` |
| CloseButton | `--cb-size` | `16px` |
| Switch | `--switch-height` | `16px` |
| Switch | `--switch-width` | `28px` |
| Checkbox | `--checkbox-size` | `16px` |
| Radio | `--radio-size` | `16px` |
| Slider | `--slider-size` | `4px` |
| Slider | `--slider-thumb-size` | `12px` |
| RangeSlider | Same as Slider (uses `.mantine-Slider-*` classes) |
| SegmentedControl | `--sc-font-size` | `10px` |

### Phase 4 Validation: Display & Navigation Components (13)

| Component | CSS Variable | Expected Value |
|-----------|-------------|----------------|
| Badge | `--badge-height` | `14px` |
| Badge | `--badge-fz` | `9px` |
| Text | `--text-fz` | `11px` |
| Text | `--text-lh` | `1.2` |
| Avatar | `--avatar-size` | `24px` |
| ThemeIcon | `--ti-size` | `24px` |
| Indicator | `--indicator-size` | `8px` |
| Kbd | `--kbd-fz` | `10px` |
| Pill | `--pill-height` | `16px` |
| Tabs | tab fontSize | `11px` |
| Tabs | tab height | `22px` |
| NavLink | label fontSize | `11px` |
| Pagination | `--pagination-control-size` | `24px` |
| Stepper | `--stepper-icon-size` | `24px` |
| Anchor | fontSize | `11px` |
| Burger | `--burger-size` | `18px` |

### Phase 5 Validation: Feedback & Overlay Components (7)

| Component | CSS Variable | Expected Value |
|-----------|-------------|----------------|
| Loader | `--loader-size` | `18px` |
| Progress | `--progress-size` | `4px` |
| RingProgress | `--rp-size` | `calc(3rem * 1)` (48px) |
| Menu | item fontSize | `11px` |
| Tooltip | tooltip fontSize | `11px` |
| Popover | dropdown padding | `8px` |
| HoverCard | dropdown padding | `8px` |

### Regression Test Reference

The following test files verify CSS baselines:
- `tests/theme/css-variables-regression.test.ts` - Tests CSS variable exports
- `tests/theme/css-baseline-verification.test.tsx` - Tests rendered CSS values

**Test patterns**:
```typescript
// Verify CSS variable on element
const vars = inputComponentExtensions.TextInput.vars!();
expect(vars.wrapper["--input-size"]).toBe("24px");

// Verify computed style in DOM
const wrapper = container.querySelector(".mantine-TextInput-wrapper");
const style = getComputedStyle(wrapper);
expect(style.getPropertyValue("--input-size").trim()).toBe("24px");
```
