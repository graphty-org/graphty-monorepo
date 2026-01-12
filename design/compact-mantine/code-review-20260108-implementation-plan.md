# Implementation Plan for Code Review Fixes (compact-mantine)

## Overview

This implementation plan addresses 20 issues identified in the January 8, 2026 code review of the compact-mantine package. The fixes are organized into 5 phases, progressing from critical light/dark mode support to dead code cleanup. Each phase delivers testable functionality that can be verified visually in Storybook and through automated tests.

**Total Issues**: 20 (3 High, 11 Medium, 6 Low Priority)

---

## Phase Breakdown

### Phase 1: Light/Dark Mode Color Scheme Support (MVP)
**Objective**: Fix all hardcoded dark mode colors so the package works correctly in both light and dark themes
**Duration**: 1-2 days

This is the highest priority phase as it addresses a fundamental theming issue affecting all users who want light mode support.

**Tests to Write First**:

Create `compact-mantine/tests/theme/light-dark-mode.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider, useComputedColorScheme } from "@mantine/core";
import { compactTheme } from "../../src/theme";
import { ControlSection, ControlGroup, ControlSubGroup } from "../../src/components";

describe("Light/Dark Mode Support", () => {
    describe("SegmentedControl", () => {
        it("uses light-dark() CSS function for indicator background", () => {
            // Verify CSS output uses light-dark() function
        });
    });

    describe("ControlGroup", () => {
        it("renders readable text color in light mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="light">
                    <ControlGroup title="Test Group" />
                </MantineProvider>
            );
            // Verify color scheme adaptation
        });

        it("renders readable text color in dark mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="dark">
                    <ControlGroup title="Test Group" />
                </MantineProvider>
            );
            // Verify color scheme adaptation
        });
    });

    describe("ControlSection", () => {
        it("adapts text color to color scheme", () => {
            // Similar tests for ControlSection
        });
    });
});
```

Create visual regression story `compact-mantine/src/components/LightDarkMode.stories.tsx`:
```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { MantineProvider } from "@mantine/core";
import { compactTheme } from "../theme";
import { ControlGroup, ControlSection, ControlSubGroup } from "./index";
import { SegmentedControl } from "@mantine/core";

export default {
    title: "Theme/Light-Dark Mode",
} satisfies Meta;

export const LightMode: StoryObj = {
    render: () => (
        <MantineProvider theme={compactTheme} defaultColorScheme="light">
            <Stack gap="md">
                <ControlGroup title="Control Group Header" />
                <ControlSection title="Collapsible Section">
                    <Text>Content inside section</Text>
                </ControlSection>
                <SegmentedControl data={["Option 1", "Option 2", "Option 3"]} />
            </Stack>
        </MantineProvider>
    ),
};

export const DarkMode: StoryObj = {
    render: () => (
        <MantineProvider theme={compactTheme} defaultColorScheme="dark">
            {/* Same components as above */}
        </MantineProvider>
    ),
};

export const SideBySide: StoryObj = {
    render: () => (
        <Group>
            {/* Light and dark side by side for comparison */}
        </Group>
    ),
};
```

**Implementation**:

1. **`src/theme/styles/controls.ts`** (Issue #1):
   - Line 72-73: Replace hardcoded dark mode color with `light-dark()` CSS function
   ```typescript
   // Before
   export const compactSegmentedControlIndicatorStyles = {
       backgroundColor: "var(--mantine-color-dark-6)",
   };

   // After
   export const compactSegmentedControlIndicatorStyles = {
       backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))",
   };
   ```

2. **`src/components/ControlGroup.tsx`** (Issue #1):
   - Line 25: Replace `color="gray.7"` with scheme-aware color
   ```typescript
   // Before
   <Text size="xs" fw={600} c="gray.7">

   // After
   <Text size="xs" fw={600} c="dimmed">
   // Or use: c="light-dark(gray.7, gray.5)" via style prop if dimmed isn't right
   ```

3. **`src/components/ControlSection.tsx`** (Issue #1):
   - Line 32: Same fix as ControlGroup
   ```typescript
   // Before
   <Text size="xs" fw={500} c="gray.7">

   // After
   <Text size="xs" fw={500} c="dimmed">
   ```

4. **`src/components/popout/examples/LabelSettingsPopout.tsx`** (Issue #13):
   - Line 241: Replace hardcoded color with scheme-aware alternative
   ```typescript
   // Before
   backgroundColor: "var(--mantine-color-gray-light)",

   // After
   backgroundColor: "var(--mantine-color-default)",
   // Or: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
   ```

**Dependencies**:
- External: None (uses existing Mantine CSS functions)
- Internal: None (foundation layer changes)

**Verification**:
1. Run: `cd compact-mantine && npm run storybook`
2. Navigate to "Theme/Light-Dark Mode" story
3. Toggle between light and dark modes using Storybook toolbar
4. **Expected**: All text readable, SegmentedControl indicator visible in both modes
5. Run: `npm test -- --run light-dark-mode`
6. **Expected**: All tests pass

---

### Phase 2: Critical Bug Fixes (High Priority Logic Issues)
**Objective**: Fix the GradientEditor double onChange bug and useActualColorScheme hardcoded fallback
**Duration**: 1-2 days

**Tests to Write First**:

Create/update `compact-mantine/tests/components/GradientEditor.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GradientEditor } from "../../src/components/GradientEditor";

describe("GradientEditor", () => {
    describe("onChange callback (Issue #3)", () => {
        it("calls onChange exactly once when stop color changes", () => {
            const onChange = vi.fn();
            render(
                <GradientEditor
                    stops={[{ color: "#ff0000", position: 0 }, { color: "#0000ff", position: 100 }]}
                    onChange={onChange}
                />
            );

            // Trigger color change
            const colorInput = screen.getAllByRole("textbox")[0];
            fireEvent.change(colorInput, { target: { value: "#00ff00" } });

            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("calls onChange exactly once when stop position changes", () => {
            const onChange = vi.fn();
            // Similar test for position changes
        });

        it("calls onChange exactly once when direction changes", () => {
            const onChange = vi.fn();
            // Similar test for direction changes
        });

        it("calls onChange exactly once when adding a stop", () => {
            const onChange = vi.fn();
            // Test addStop handler
        });

        it("calls onChange exactly once when removing a stop", () => {
            const onChange = vi.fn();
            // Test removeStop handler
        });
    });

    describe("controlled mode", () => {
        it("reflects external value changes", () => {
            // Verify controlled behavior works
        });
    });

    describe("uncontrolled mode", () => {
        it("maintains internal state with defaultStops", () => {
            // Verify uncontrolled behavior works
        });
    });
});
```

Update `compact-mantine/tests/hooks/useActualColorScheme.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { useActualColorScheme } from "../../src/hooks/useActualColorScheme";

describe("useActualColorScheme (Issue #2)", () => {
    it("returns 'dark' when color scheme is 'dark'", () => {
        const wrapper = ({ children }) => (
            <MantineProvider defaultColorScheme="dark">{children}</MantineProvider>
        );
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("dark");
    });

    it("returns 'light' when color scheme is 'light'", () => {
        const wrapper = ({ children }) => (
            <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
        );
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("light");
    });

    it("uses provided fallback when color scheme is auto", () => {
        const wrapper = ({ children }) => (
            <MantineProvider defaultColorScheme="auto">{children}</MantineProvider>
        );
        const { result: darkResult } = renderHook(() => useActualColorScheme("dark"), { wrapper });
        expect(darkResult.current).toBe("dark");

        const { result: lightResult } = renderHook(() => useActualColorScheme("light"), { wrapper });
        expect(lightResult.current).toBe("light");
    });

    it("defaults to 'dark' fallback when no argument provided", () => {
        const wrapper = ({ children }) => (
            <MantineProvider defaultColorScheme="auto">{children}</MantineProvider>
        );
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("dark");
    });
});
```

**Implementation**:

1. **`src/hooks/useActualColorScheme.ts`** (Issue #2):
   - Make fallback configurable with documented default
   ```typescript
   import { useComputedColorScheme } from "@mantine/core";

   /**
    * Hook to get the actual resolved color scheme.
    * Resolves "auto" to the actual light/dark value based on system preference.
    *
    * @param fallback - Fallback color scheme when system preference cannot be determined.
    *                   Defaults to "dark" for consistency with existing behavior.
    * @returns "light" | "dark" - The resolved color scheme
    *
    * @example
    * // Use default fallback (dark)
    * const scheme = useActualColorScheme();
    *
    * // Use custom fallback
    * const scheme = useActualColorScheme("light");
    */
   export function useActualColorScheme(
       fallback: "light" | "dark" = "dark"
   ): "light" | "dark" {
       return useComputedColorScheme(fallback);
   }
   ```

2. **`src/components/GradientEditor.tsx`** (Issue #3):
   - Remove duplicate onChange calls from all handlers
   - The `handleStopsChange` from `useUncontrolled` already calls `onChange` internally

   **Lines 47-52** (handleStopColorChange):
   ```typescript
   // Before
   const handleStopColorChange = (index: number, color: string): void => {
       const newStops = [..._stops];
       newStops[index] = { ...newStops[index], color };
       handleStopsChange(newStops);
       onChange?.(newStops, _direction);  // REMOVE THIS LINE
   };

   // After
   const handleStopColorChange = (index: number, color: string): void => {
       const newStops = [..._stops];
       newStops[index] = { ...newStops[index], color };
       handleStopsChange(newStops);
       // Note: useUncontrolled's onChange is called via handleStopsChange
   };
   ```

   **Lines 54-58** (handleStopPositionChange): Remove duplicate `onChange` call

   **Lines 61-64** (handleDirectionChange): Remove duplicate `onChange` call

   **Lines 66-75** (handleAddStop, handleRemoveStop): Remove duplicate `onChange` calls

   **Important Note**: Review the `useUncontrolled` setup to ensure it correctly calls `onChange` with both `stops` and `direction`. The current implementation has separate `useUncontrolled` hooks which may need coordination.

**Dependencies**:
- External: None
- Internal: None (isolated changes)

**Verification**:
1. Run: `npm test -- --run GradientEditor`
2. **Expected**: All tests pass, onChange called exactly once per action
3. Run: `npm test -- --run useActualColorScheme`
4. **Expected**: All tests pass
5. Run: `npm run storybook`
6. Navigate to GradientEditor story
7. Open browser DevTools Console
8. Add `console.log` wrapper to onChange in story
9. **Expected**: Single log per interaction (not double)

---

### Phase 3: Accessibility Improvements
**Objective**: Fix keyboard navigation and semantic markup for collapsible components
**Duration**: 1-2 days

**Tests to Write First**:

Update `compact-mantine/tests/components/ControlSection.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControlSection } from "../../src/components/ControlSection";

describe("ControlSection", () => {
    describe("Accessibility (Issue #4)", () => {
        it("header has role='button' for screen readers", () => {
            render(<ControlSection title="Test">Content</ControlSection>);
            const header = screen.getByRole("button", { name: /test/i });
            expect(header).toBeInTheDocument();
        });

        it("header is focusable with tabIndex", () => {
            render(<ControlSection title="Test">Content</ControlSection>);
            const header = screen.getByRole("button");
            expect(header).toHaveAttribute("tabindex", "0");
        });

        it("toggles on Enter key press", async () => {
            const user = userEvent.setup();
            render(<ControlSection title="Test">Content</ControlSection>);

            const header = screen.getByRole("button");
            await user.tab(); // Focus the header
            await user.keyboard("{Enter}");

            // Verify content visibility changed
        });

        it("toggles on Space key press", async () => {
            const user = userEvent.setup();
            render(<ControlSection title="Test">Content</ControlSection>);

            const header = screen.getByRole("button");
            await user.tab();
            await user.keyboard(" ");

            // Verify content visibility changed
        });

        it("has appropriate aria-expanded attribute", () => {
            render(<ControlSection title="Test" defaultOpened>Content</ControlSection>);
            const header = screen.getByRole("button");
            expect(header).toHaveAttribute("aria-expanded", "true");
        });
    });
});
```

Update `compact-mantine/tests/components/ControlSubGroup.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ControlSubGroup } from "../../src/components/ControlSubGroup";

describe("ControlSubGroup", () => {
    describe("Animation (Issue #5)", () => {
        it("uses Collapse component for animated content reveal", () => {
            const { container } = render(
                <ControlSubGroup title="Test" defaultOpened>
                    <div data-testid="content">Content</div>
                </ControlSubGroup>
            );

            // Verify Collapse component is used (check for Mantine's collapse wrapper)
            const collapse = container.querySelector("[data-mantine-component='Collapse']");
            expect(collapse).toBeInTheDocument();
        });

        it("animates content when toggling", async () => {
            // Animation timing test if needed
        });
    });

    describe("Accessibility", () => {
        it("header has role='button' for screen readers", () => {
            render(<ControlSubGroup title="Test">Content</ControlSubGroup>);
            const header = screen.getByRole("button", { name: /test/i });
            expect(header).toBeInTheDocument();
        });
    });
});
```

**Implementation**:

1. **`src/components/ControlSection.tsx`** (Issue #4):
   - Add `role="button"`, `tabIndex={0}`, keyboard handlers, ARIA attributes

   **Line 34** (Group element):
   ```typescript
   // Before
   <Group justify="space-between" py={8} px={8} style={{ cursor: "pointer" }} onClick={toggle}>

   // After
   <Group
       justify="space-between"
       py={8}
       px={8}
       style={{ cursor: "pointer" }}
       onClick={toggle}
       role="button"
       tabIndex={0}
       aria-expanded={opened}
       aria-controls={`control-section-${id}`}
       onKeyDown={(e: React.KeyboardEvent) => {
           if (e.key === "Enter" || e.key === " ") {
               e.preventDefault();
               toggle();
           }
       }}
   >
   ```

   Also add an `id` prop for accessibility association:
   ```typescript
   interface ControlSectionProps {
       // ... existing props
       id?: string;
   }
   ```

   And use it on the Collapse content:
   ```typescript
   <Collapse in={opened} id={`control-section-${id}`}>
   ```

2. **`src/components/ControlSubGroup.tsx`** (Issues #4 & #5):
   - Replace conditional rendering with `<Collapse>` component
   - Add accessibility attributes to header

   **Lines 39-43**:
   ```typescript
   // Before
   {opened && (
       <Box pl="md">
           <Stack gap={4}>{children}</Stack>
       </Box>
   )}

   // After
   import { Collapse } from "@mantine/core";

   <Collapse in={opened}>
       <Box pl="md">
           <Stack gap={4}>{children}</Stack>
       </Box>
   </Collapse>
   ```

   **Header accessibility** (add to existing Group):
   ```typescript
   <Group
       gap={4}
       align="center"
       style={{ cursor: "pointer" }}
       onClick={toggle}
       role="button"
       tabIndex={0}
       aria-expanded={opened}
       onKeyDown={(e: React.KeyboardEvent) => {
           if (e.key === "Enter" || e.key === " ") {
               e.preventDefault();
               toggle();
           }
       }}
   >
   ```

**Dependencies**:
- External: `@mantine/core` (Collapse component - already a dependency)
- Internal: Phase 1 (color scheme fixes should be applied first)

**Verification**:
1. Run: `npm test -- --run ControlSection`
2. Run: `npm test -- --run ControlSubGroup`
3. **Expected**: All tests pass
4. Run: `npm run storybook`
5. Navigate to ControlSection and ControlSubGroup stories
6. **Keyboard test**: Use Tab to focus headers, press Enter/Space to toggle
7. **Screen reader test**: Use VoiceOver or NVDA to verify announcements
8. **Visual test**: Verify ControlSubGroup now animates smoothly (no abrupt show/hide)

---

### Phase 4: React Hooks & Performance Fixes
**Objective**: Fix useEffect dependencies, refactor complex logic, and address potential performance issues
**Duration**: 1-2 days

**Tests to Write First**:

Update `compact-mantine/tests/components/popout/PopoutPanel.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PopoutPanel } from "../../../src/components/popout/PopoutPanel";
import { PopoutAnchorContext } from "../../../src/components/popout/PopoutContext";

describe("PopoutPanel", () => {
    describe("useEffect dependencies (Issue #8)", () => {
        it("recalculates position when anchorContext changes", async () => {
            const anchorRef1 = { current: document.createElement("div") };
            const anchorRef2 = { current: document.createElement("div") };

            // Set up different positions for each anchor
            // ... mock getBoundingClientRect

            const { rerender } = render(
                <PopoutAnchorContext.Provider value={{ anchorRef: anchorRef1 }}>
                    <PopoutPanel isOpen>Content</PopoutPanel>
                </PopoutAnchorContext.Provider>
            );

            // Capture initial position

            rerender(
                <PopoutAnchorContext.Provider value={{ anchorRef: anchorRef2 }}>
                    <PopoutPanel isOpen>Content</PopoutPanel>
                </PopoutAnchorContext.Provider>
            );

            // Verify position recalculated
        });
    });
});
```

Create/update `compact-mantine/tests/components/popout/PopoutContext.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePopoutManager, PopoutManagerProvider } from "../../../src/components/popout/PopoutContext";

describe("PopoutManagerProvider", () => {
    describe("register function refactoring (Issue #6)", () => {
        it("closes sibling popouts when opening new one", () => {
            // Test sibling closing behavior
        });

        it("closes descendant popouts when parent closes", () => {
            // Test descendant closing behavior
        });

        it("handles deeply nested popout hierarchies efficiently", () => {
            // Performance test with many popouts
            const wrapper = ({ children }) => (
                <PopoutManagerProvider>{children}</PopoutManagerProvider>
            );

            const { result } = renderHook(() => usePopoutManager(), { wrapper });

            // Register 100 popouts in a hierarchy
            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                act(() => {
                    result.current.register(`popout-${i}`, {
                        parentId: i > 0 ? `popout-${Math.floor(i/2)}` : undefined,
                    });
                });
            }
            const duration = performance.now() - start;

            // Should complete in reasonable time (not O(n²))
            expect(duration).toBeLessThan(100); // ms
        });
    });
});
```

Update `compact-mantine/tests/components/StyleNumberInput.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StyleNumberInput } from "../../src/components/StyleNumberInput";

describe("StyleNumberInput", () => {
    describe("state sync (Issue #7)", () => {
        it("syncs external value changes correctly", () => {
            const { rerender } = render(<StyleNumberInput value={10} />);
            expect(screen.getByRole("textbox")).toHaveValue("10");

            rerender(<StyleNumberInput value={20} />);
            expect(screen.getByRole("textbox")).toHaveValue("20");
        });

        it("maintains focus during typing without value reset", async () => {
            const onChange = vi.fn();
            render(<StyleNumberInput value={10} onChange={onChange} />);

            const input = screen.getByRole("textbox");
            fireEvent.focus(input);
            fireEvent.change(input, { target: { value: "1" } });

            // Value should remain "1" (not reset to "10") during typing
            expect(input).toHaveValue("1");
        });
    });
});
```

**Implementation**:

1. **`src/components/popout/PopoutPanel.tsx`** (Issue #8):
   - Add `anchorContext` to useEffect dependency array

   **Lines 119-162** (useEffect):
   ```typescript
   // Add anchorContext to dependencies
   useEffect(() => {
       if (isOpen) {
           let anchorElement = anchorRef?.current ?? null;
           if (!anchorElement && anchorContext?.anchorRef.current) {
               anchorElement = anchorContext.anchorRef.current;
           }
           // ... rest of positioning logic
       }
   }, [
       isOpen,
       width,
       height,
       gap,
       triggerRef,
       anchorRef,
       placement,
       alignment,
       resetDragOffset,
       isTabs,
       defaultTabId,
       parentId,
       anchorContext, // ADD THIS
   ]);
   ```

2. **`src/components/popout/PopoutContext.tsx`** (Issue #6):
   - Refactor `register` function into smaller helper functions

   **Lines 138-189** (register function):
   ```typescript
   // Add helper functions before the register function

   /**
    * Find all popout IDs that are siblings of the given parent
    */
   function findSiblings(
       popouts: Map<string, PopoutState>,
       parentId: string | undefined
   ): string[] {
       const siblings: string[] = [];
       for (const [id, state] of popouts) {
           if (state.parentId === parentId) {
               siblings.push(id);
           }
       }
       return siblings;
   }

   /**
    * Find all descendant popout IDs (recursive)
    */
   function findDescendants(
       popouts: Map<string, PopoutState>,
       popoutId: string
   ): string[] {
       const descendants: string[] = [];
       const queue = [popoutId];

       while (queue.length > 0) {
           const current = queue.shift()!;
           for (const [id, state] of popouts) {
               if (state.parentId === current && !descendants.includes(id)) {
                   descendants.push(id);
                   queue.push(id);
               }
           }
       }
       return descendants;
   }

   /**
    * Close multiple popouts in the correct order (children first)
    */
   function closePopoutsInOrder(
       popouts: Map<string, PopoutState>,
       ids: string[]
   ): void {
       // Sort by depth (deepest first) to close children before parents
       const sorted = [...ids].sort((a, b) => {
           const depthA = getDepth(popouts, a);
           const depthB = getDepth(popouts, b);
           return depthB - depthA;
       });

       for (const id of sorted) {
           const state = popouts.get(id);
           if (state?.isOpen) {
               state.close();
           }
       }
   }

   function getDepth(popouts: Map<string, PopoutState>, id: string): number {
       let depth = 0;
       let current = popouts.get(id);
       while (current?.parentId) {
           depth++;
           current = popouts.get(current.parentId);
       }
       return depth;
   }

   // Then refactor register to use these helpers
   const register = useCallback((id: string, options: RegisterOptions) => {
       setPopouts(prev => {
           const newPopouts = new Map(prev);

           if (options.closeOnOpen) {
               // Close siblings
               const siblings = findSiblings(newPopouts, options.parentId);
               closePopoutsInOrder(newPopouts, siblings.filter(s => s !== id));
           }

           // Register the new popout
           newPopouts.set(id, {
               id,
               isOpen: true,
               parentId: options.parentId,
               close: options.onClose,
           });

           return newPopouts;
       });
   }, []);
   ```

3. **`src/components/StyleNumberInput.tsx`** (Issue #7):
   - Consider using useRef to track update source and avoid unnecessary sync

   **Lines 53-59**:
   ```typescript
   // Option 1: Add a ref to track if update is internal
   const isInternalChange = useRef(false);

   const [localValue, setLocalValue] = useState<string | number>(displayValue);

   useEffect(() => {
       // Only sync if the change came from external prop update
       if (!isInternalChange.current) {
           setLocalValue(_value ?? defaultValue);
       }
       isInternalChange.current = false;
   }, [_value, defaultValue]);

   // In change handler:
   const handleChange = (newValue: string | number) => {
       isInternalChange.current = true;
       setLocalValue(newValue);
       // ... rest of handler
   };
   ```

**Dependencies**:
- External: None
- Internal: Phase 1-3 should be complete

**Verification**:
1. Run: `npm test -- --run PopoutPanel`
2. Run: `npm test -- --run PopoutContext`
3. Run: `npm test -- --run StyleNumberInput`
4. **Expected**: All tests pass
5. Run: `npm run storybook`
6. Navigate to Popout stories
7. Open nested popouts, verify correct closing behavior
8. Test StyleNumberInput: type rapidly, ensure no flickering or value reset

---

### Phase 5: Code Cleanup & Dead Code Removal
**Objective**: Remove unused exports, clean up dead code, and extract magic numbers to constants
**Duration**: 1 day

**Tests to Write First**:

Create `compact-mantine/tests/exports.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import * as exports from "../src/index";
import * as themeExports from "../src/theme";
import * as constantsExports from "../src/constants";
import * as utilsExports from "../src/utils";

describe("Package exports", () => {
    describe("Main exports", () => {
        it("exports compactTheme", () => {
            expect(exports.compactTheme).toBeDefined();
        });

        it("does NOT export unused utilities", () => {
            // Verify removed items are not exported
            expect((exports as any).SWATCH_COLORS).toBeUndefined();
            expect((exports as any).compactTextVars).toBeUndefined();
            expect((exports as any).FLOATING_UI_Z_INDEX).toBeUndefined();
            expect((exports as any).compactInputVarsFn).toBeUndefined();
        });
    });

    describe("Theme exports", () => {
        it("uses mergeExtensions for component composition", () => {
            // Verify theme is properly assembled
            expect(themeExports.compactTheme.components).toBeDefined();
        });
    });
});
```

**Implementation**:

1. **`src/theme/styles/display.ts`** (Issue #9):
   - Remove `compactTextVars` or add comment explaining its purpose
   ```typescript
   // Option A: Remove if truly unused
   // Delete lines 28-32

   // Option B: Document for custom usage
   /**
    * Text CSS variables available for custom implementations.
    * Not used by default theme but exported for advanced customization.
    * @deprecated Consider removing in next major version if unused.
    */
   export const compactTextVars = { ... };
   ```

2. **`src/constants/colors.ts`** (Issue #10):
   - Remove `SWATCH_COLORS` or document its purpose
   ```typescript
   // If only SWATCH_COLORS_HEXA is used, remove SWATCH_COLORS
   // Before
   export const SWATCH_COLORS = ["red", "pink", ...];
   export const SWATCH_COLORS_HEXA = ["#e03131", ...];

   // After
   // Remove SWATCH_COLORS, keep only SWATCH_COLORS_HEXA
   export const SWATCH_COLORS_HEXA = ["#e03131", ...];
   ```

3. **`src/constants/popout.ts`** (Issue #14):
   - Either use `FLOATING_UI_Z_INDEX` in relevant components or remove it
   ```typescript
   // Option A: Use it in PopoutPanel
   // In PopoutPanel.tsx:
   import { FLOATING_UI_Z_INDEX } from "../constants/popout";
   // Use for floating elements inside popouts

   // Option B: Remove if not needed
   // Delete FLOATING_UI_Z_INDEX from popout.ts
   ```

4. **`src/theme/styles/inputs.ts`** (Issue #16):
   - Remove `compactInputVarsFn` and `compactInputVarsNoHeightFn` if unused
   ```typescript
   // Delete lines 41-51 if these functions are not used
   ```

5. **`src/utils/merge-extensions.ts`** (Issue #12):
   - Either use `mergeExtensions` in theme/index.ts OR remove it

   **Option A: Use it (recommended for type safety)**:
   ```typescript
   // In src/theme/index.ts
   import { mergeExtensions7 } from "../utils/merge-extensions";

   // Before
   components: {
       ...inputExtensions,
       ...buttonExtensions,
       ...controlExtensions,
       ...displayExtensions,
       ...feedbackExtensions,
       ...navigationExtensions,
       ...overlayExtensions,
   }

   // After
   components: mergeExtensions7(
       inputExtensions,
       buttonExtensions,
       controlExtensions,
       displayExtensions,
       feedbackExtensions,
       navigationExtensions,
       overlayExtensions,
   )
   ```

   **Option B: Remove the utility**:
   - Delete `src/utils/merge-extensions.ts`
   - Update `src/utils/index.ts` to remove export

6. **Extract magic numbers** (Issue #15):
   - Create shared spacing constants
   ```typescript
   // In src/constants/spacing.ts (if not already there)
   export const SPACING = {
       COMPACT_HEIGHT: 24,      // px - standard compact input height
       COMPACT_FONT_SIZE: 11,   // px - standard compact font size
       CONTROL_PADDING: 8,      // px - padding for control elements
       SECTION_GAP: 4,          // px - gap between items in sections
   } as const;

   // Then use in style files:
   // Before: height: "24px"
   // After: height: `${SPACING.COMPACT_HEIGHT}px`
   ```

**Dependencies**:
- External: None
- Internal: All previous phases should be complete

**Verification**:
1. Run: `npm test -- --run exports`
2. **Expected**: All tests pass, no unused exports
3. Run: `npm run lint`
4. **Expected**: No unused export warnings
5. Run: `npm run build`
6. **Expected**: Build succeeds, bundle size slightly smaller
7. Run: `npm run storybook`
8. **Expected**: All components still work correctly

---

## Common Utilities Needed

| Utility | Purpose | Used In |
|---------|---------|---------|
| `findSiblings()` | Find sibling popouts | PopoutContext (Phase 4) |
| `findDescendants()` | Find child popouts recursively | PopoutContext (Phase 4) |
| `closePopoutsInOrder()` | Close popouts depth-first | PopoutContext (Phase 4) |
| `SPACING` constants | Centralized magic numbers | All style files (Phase 5) |

---

## External Libraries Assessment

No new external libraries are needed. All fixes use existing dependencies:

| Task | Existing Solution |
|------|-------------------|
| Light/dark mode | Mantine's `light-dark()` CSS function |
| Collapse animation | `@mantine/core` Collapse component |
| Color scheme detection | `useComputedColorScheme` from Mantine |
| Keyboard handling | Native React keyboard events |

---

## Risk Mitigation

| Potential Risk | Mitigation Strategy |
|----------------|---------------------|
| Light mode colors look wrong | Create side-by-side Storybook story for visual QA |
| GradientEditor onChange breaks consumers | Write comprehensive tests first, document behavior |
| Accessibility changes break existing behavior | Test with real screen readers (VoiceOver, NVDA) |
| PopoutContext refactor introduces bugs | Maintain exact same behavior, just cleaner code |
| Removing unused exports breaks external consumers | Check if package is published; if so, deprecate first |
| mergeExtensions compile errors | Test type inference before committing |

---

## Testing Strategy Summary

| Phase | Unit Tests | Integration Tests | Visual Tests | Manual Tests |
|-------|------------|-------------------|--------------|--------------|
| 1 | Color variable output | Theme integration | Storybook light/dark | Toggle color scheme |
| 2 | onChange call counts | Controlled/uncontrolled | GradientEditor story | Console.log verification |
| 3 | ARIA attributes, keyboard | Focus management | Storybook interactions | Screen reader testing |
| 4 | Hook dependencies | Popout hierarchy | Nested popouts | Performance profiling |
| 5 | Export validation | Build verification | N/A | Bundle size check |

---

## Implementation Checklist

### Phase 1: Light/Dark Mode ☐
- [ ] Create light-dark-mode.test.tsx
- [ ] Create LightDarkMode.stories.tsx
- [ ] Fix controls.ts line 72
- [ ] Fix ControlGroup.tsx line 25
- [ ] Fix ControlSection.tsx line 32
- [ ] Fix LabelSettingsPopout.tsx line 241
- [ ] Verify in Storybook
- [ ] Run all tests

### Phase 2: Critical Bug Fixes ☐
- [ ] Update GradientEditor.test.tsx
- [ ] Update useActualColorScheme.test.ts
- [ ] Fix useActualColorScheme.ts
- [ ] Fix GradientEditor.tsx (5 handlers)
- [ ] Verify onChange behavior
- [ ] Run all tests

### Phase 3: Accessibility ☐
- [ ] Update ControlSection.test.tsx
- [ ] Update ControlSubGroup.test.tsx
- [ ] Add keyboard handlers to ControlSection
- [ ] Add ARIA attributes to ControlSection
- [ ] Add Collapse to ControlSubGroup
- [ ] Add accessibility to ControlSubGroup header
- [ ] Test with screen reader
- [ ] Run all tests

### Phase 4: React Hooks & Performance ☐
- [ ] Update PopoutPanel.test.tsx
- [ ] Update PopoutContext.test.tsx
- [ ] Update StyleNumberInput.test.tsx
- [ ] Fix PopoutPanel useEffect deps
- [ ] Refactor PopoutContext register
- [ ] Improve StyleNumberInput state sync
- [ ] Performance test
- [ ] Run all tests

### Phase 5: Code Cleanup ☐
- [ ] Create exports.test.ts
- [ ] Remove/document compactTextVars
- [ ] Remove/document SWATCH_COLORS
- [ ] Remove/document FLOATING_UI_Z_INDEX
- [ ] Remove/document compactInputVarsFn
- [ ] Use or remove mergeExtensions
- [ ] Extract magic numbers
- [ ] Verify build and bundle size
- [ ] Run all tests

---

*Implementation plan created: January 8, 2026*
*Based on code review: code-review-20260108.md*
