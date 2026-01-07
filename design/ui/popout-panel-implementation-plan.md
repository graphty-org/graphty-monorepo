# Implementation Plan for Pop-out Panel Component

## Overview

**Target Package**: `@graphty/compact-mantine` (located at `compact-mantine/`)

This plan implements a reusable Pop-out Panel component for the compact-mantine UI library, following Figma's floating panel pattern. The component provides draggable floating panels that support nested hierarchies, progressive disclosure of settings, and multi-instance management. The implementation leverages `@zag-js/floating-panel` for core drag behavior while building custom coordination logic for hierarchy-aware interactions.

**Key Principle**: Each phase delivers a working Storybook demo that humans can use to verify the implementation is on track.

---

## Testing Strategy

### Test Categories and Their Purpose

| Category | Tool | Purpose | When to Use |
|----------|------|---------|-------------|
| **Unit Tests** | Vitest (Node) | Pure logic, utilities, context behavior | Position calculation, hierarchy tracking, state management |
| **Component Tests** | Vitest + Testing Library | Render behavior, props, basic interactions | Open/close, header rendering, content display |
| **Interaction Tests** | Storybook Play Functions | Complex user interactions, visual verification | Drag, click-outside, Escape key, z-index changes |
| **Visual Regression** | Chromatic | Catch unintended visual changes | All stories automatically via CI |
| **Browser Tests** | Vitest + Playwright | Edge cases requiring real browser | Portal positioning, focus management, pointer capture |

### Interactive Behavior Testing Approach

**Storybook Play Functions + Chromatic** (Primary):
- ESC key handling
- Click-outside closing
- Tab switching
- Drag and position reset
- Z-index bring-to-front

Play functions are preferred because:
1. Tests run in real browser (Chromatic)
2. Visual regression catches styling issues
3. Tests are co-located with stories for discoverability
4. Can be run locally during development

**Browser Tests (Vitest + Playwright)** (Secondary):
- Complex focus management scenarios
- Nested popout hierarchy edge cases
- Pointer capture during drag
- Portal positioning across different viewport sizes

Browser tests are used when:
1. Test requires precise timing control
2. Test needs to verify DOM structure in portal
3. Test involves multiple windows/iframes
4. Play function limitations prevent testing

### Test File Organization

All tests are located in the `@graphty/compact-mantine` package:

```
compact-mantine/
├── src/components/popout/
│   ├── Popout.stories.tsx            # Stories with play functions
│   └── ... (component files)
└── tests/popout/
    ├── Popout.test.tsx               # Component tests (Vitest + RTL)
    ├── PopoutManager.test.tsx        # Context/state tests
    ├── PopoutHeader.test.tsx         # Header tests
    ├── position.test.ts              # Pure function unit tests
    └── Popout.browser.test.tsx       # Browser tests (Playwright)
```

---

## Storybook Stories Overview

Stories are located at: `compact-mantine/src/components/popout/Popout.stories.tsx`

We maintain **3 primary stories** that evolve across phases, plus **1 integration example** added at the end:

| Story | Phase Introduced | Purpose |
|-------|------------------|---------|
| **Basic** | Phase 1 | Single panel with title header; evolves to include drag, actions |
| **Tabbed** | Phase 3 | Panel with tabbed header; demonstrates tab switching |
| **Kitchen Sink** | Phase 4 | Multiple panels, z-index, nesting; tests complex interactions |
| **Label Settings Example** | Phase 7 | Real-world integration pattern |

Each phase adds features to existing stories rather than creating new ones.

---

## Phase Breakdown

### Phase 1: MVP Panel with Storybook

**Objective**: Create a minimal pop-out panel that opens from a trigger, displays content, and closes. Deliver a working Storybook story for human verification.

**Duration**: 2-3 days

**Files to Create** (in `compact-mantine/`):

| File | Purpose |
|------|---------|
| `src/components/popout/Popout.tsx` | Compound component root |
| `src/components/popout/PopoutContext.tsx` | React context for local and manager state |
| `src/components/popout/PopoutManager.tsx` | Context provider for coordination |
| `src/components/popout/PopoutTrigger.tsx` | Trigger wrapper component |
| `src/components/popout/PopoutPanel.tsx` | Floating panel with portal |
| `src/components/popout/PopoutHeader.tsx` | Title header (tabs in Phase 3) |
| `src/components/popout/PopoutContent.tsx` | Content container |
| `src/components/popout/index.ts` | Public exports for popout module |
| `src/components/popout/Popout.stories.tsx` | Basic story |
| `src/types/popout.ts` | TypeScript interfaces |
| `src/constants/popout.ts` | Z-index base, gaps |
| `tests/popout/Popout.test.tsx` | Component tests |
| `tests/popout/position.test.ts` | Position calculation unit tests |

**Update** (in `compact-mantine/`):

| File | Change |
|------|--------|
| `src/index.ts` | Add Popout exports |
| `src/types/index.ts` | Re-export popout types |
| `src/constants/index.ts` | Re-export popout constants |

**Story to Create** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

```typescript
export const Basic: Story = {
    render: () => (
        <PopoutManager>
            <Box style={{ display: "flex", justifyContent: "flex-end", padding: 100 }}>
                <Popout>
                    <Popout.Trigger>
                        <ActionIcon variant="subtle"><Settings size={16} /></ActionIcon>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={280}
                        header={{ variant: "title", title: "Settings" }}
                    >
                        <Popout.Content>
                            <Text size="sm">Panel content goes here</Text>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Box>
        </PopoutManager>
    ),
};
```

**Tests to Write** (`compact-mantine/tests/popout/`):

- `Popout.test.tsx`: Component tests
  ```typescript
  describe("Popout", () => {
      it("renders trigger element");
      it("opens panel when trigger is clicked");
      it("closes panel when close button is clicked");
      it("positions panel to the left of trigger");
      it("renders with specified width");
  });
  ```

- `position.test.ts`: Unit tests for position calculation
  ```typescript
  describe("calculatePopoutPosition", () => {
      it("positions panel to the left of trigger with 8px gap");
      it("aligns top of panel with top of trigger");
  });
  ```

**Play Function** (in `Popout.stories.tsx`):
```typescript
Basic.play = async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button"));
    expect(canvas.getByRole("dialog")).toBeVisible();
    await userEvent.click(canvas.getByLabelText("Close panel"));
    expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
};
```

**Dependencies**:

- External: None yet (Zag.js added in Phase 2)
- Internal: Mantine components (peer dep), lucide-react (dev dep)

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. Start Storybook: `pnpm --filter @graphty/compact-mantine storybook`
3. Navigate to Components > Popout > Basic
4. Click the settings icon trigger
5. **Expected**: Panel appears to the left, close button works

---

### Phase 2: Drag Behavior

**Objective**: Panel can be dragged. Position resets on reopen. Integrate Zag.js.

**Duration**: 1-2 days

**Files to Create** (`compact-mantine/`):

| File | Purpose |
|------|---------|
| `src/components/popout/hooks/useFloatingPanel.ts` | Zag.js wrapper hook |

**Files to Update** (`compact-mantine/`):

| File | Change |
|------|--------|
| `src/components/popout/PopoutPanel.tsx` | Integrate drag handlers |
| `src/components/popout/Popout.stories.tsx` | Add drag tests to Basic play function |
| `tests/popout/Popout.test.tsx` | Add drag behavior tests |

**Tests to Create** (`compact-mantine/tests/popout/`):

| File | Purpose |
|------|---------|
| `Popout.browser.test.tsx` | Browser tests for pointer capture |

**Story Updates** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

- Update **Basic** story play function to test drag and position reset

**Tests to Write**:

- `tests/popout/Popout.test.tsx`: Add drag tests
  ```typescript
  describe("Popout drag behavior", () => {
      it("does not start drag from text input");
      it("does not start drag from textarea");
      it("allows button clicks without dragging");
  });
  ```

- `tests/popout/Popout.browser.test.tsx`: Browser tests
  ```typescript
  describe("Popout drag (browser)", () => {
      it("maintains drag when pointer leaves panel");
      it("ends drag on pointer up outside panel");
  });
  ```

**Dependencies**:

- External: `@zag-js/floating-panel@>=0.82.2`, `@zag-js/react@>=0.82.2`
- Internal: Phase 1 components

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. In Storybook Basic story, drag the panel
3. **Expected**: Panel moves smoothly
4. Close and reopen
5. **Expected**: Panel returns to original position

---

### Phase 3: Tabbed Header

**Objective**: Support tabbed header variant. Tab state resets on reopen.

**Duration**: 1-2 days

**Files to Create** (`compact-mantine/`):

| File | Purpose |
|------|---------|
| `src/components/popout/PopoutTabs.tsx` | Tab list and content switcher |

**Files to Update** (`compact-mantine/`):

| File | Change |
|------|--------|
| `src/components/popout/PopoutHeader.tsx` | Support tabs variant |
| `src/components/popout/Popout.stories.tsx` | Add Tabbed story, update Basic with actions |
| `src/types/popout.ts` | Add tab-related types |

**Tests to Create** (`compact-mantine/tests/popout/`):

| File | Purpose |
|------|---------|
| `PopoutHeader.test.tsx` | Header component tests |

**Story to Create** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

- Add **Tabbed** story with tab switching and play function

**Story Updates**:

- Update **Basic** story to include header actions

**Tests to Write** (`compact-mantine/tests/popout/PopoutHeader.test.tsx`):
```typescript
describe("PopoutHeader", () => {
    it("renders title variant with title text");
    it("renders tabs variant with tab buttons");
    it("switches tab content on click");
    it("renders action buttons");
});
```

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. In Storybook Tabbed story, click through tabs
3. **Expected**: Content changes, active tab highlighted
4. Close and reopen
5. **Expected**: First tab selected

---

### Phase 4: Multiple Panels and Z-Index

**Objective**: Multiple panels can be open. Clicking brings panel to front.

**Duration**: 1-2 days

**Files to Update** (`compact-mantine/`):

| File | Change |
|------|--------|
| `src/components/popout/PopoutContext.tsx` | Add z-index and focus tracking |
| `src/components/popout/PopoutManager.tsx` | Implement bringToFront |
| `src/components/popout/PopoutPanel.tsx` | Apply z-index, handle click for focus |
| `src/components/popout/Popout.stories.tsx` | Add Kitchen Sink story |

**Tests to Create** (`compact-mantine/tests/popout/`):

| File | Purpose |
|------|---------|
| `PopoutManager.test.tsx` | Context/state tests |

**Story to Create** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

- Add **Kitchen Sink** story with multiple panels and z-index play function

**Tests to Write** (`compact-mantine/tests/popout/PopoutManager.test.tsx`):
```typescript
describe("PopoutManager z-index", () => {
    it("assigns incrementing z-index to open popouts");
    it("brings clicked popout to front");
    it("tracks focused popout");
});
```

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. In Kitchen Sink story, open both panels
3. **Expected**: Panel B is on top
4. Click Panel A
5. **Expected**: Panel A moves to front

---

### Phase 5: Click-Outside and Escape Key

**Objective**: Click outside closes panels. Escape closes focused panel.

**Duration**: 2 days

**Files to Create** (`compact-mantine/`):

| File | Purpose |
|------|---------|
| `src/components/popout/hooks/useClickOutside.ts` | Global click listener |
| `src/components/popout/hooks/useEscapeKey.ts` | Keyboard listener |

**Files to Update** (`compact-mantine/`):

| File | Change |
|------|--------|
| `src/components/popout/PopoutManager.tsx` | Wire up close hooks |
| `src/components/popout/Popout.stories.tsx` | Add ESC/click-outside tests to Kitchen Sink |
| `tests/popout/PopoutManager.test.tsx` | Add close behavior tests |

**Story Updates** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

- Update **Kitchen Sink** play function with Escape and click-outside tests

**Tests to Write** (`compact-mantine/tests/popout/PopoutManager.test.tsx`):
```typescript
describe("PopoutManager close behavior", () => {
    it("closes popout on Escape key");
    it("closes popout when clicking outside");
    it("does not close when clicking inside popout");
});
```

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. In Kitchen Sink, open a panel and press Escape
3. **Expected**: Panel closes
4. Open a panel and click outside
5. **Expected**: Panel closes

---

### Phase 6: Nested Popouts

**Objective**: Popouts can open from within other popouts with proper hierarchy.

**Duration**: 2-3 days

**Files to Update** (`compact-mantine/`):

| File | Change |
|------|--------|
| `src/components/popout/Popout.tsx` | Detect nested context |
| `src/components/popout/PopoutPanel.tsx` | Register parent relationship |
| `src/components/popout/PopoutManager.tsx` | Hierarchy tracking, cascading close |
| `src/components/popout/hooks/useClickOutside.ts` | Hierarchy-aware detection |
| `src/components/popout/Popout.stories.tsx` | Add nested demo to Kitchen Sink |
| `tests/popout/PopoutManager.test.tsx` | Add hierarchy tests |
| `tests/popout/position.test.ts` | Add nested position tests |

**Story Updates** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

- Update **Kitchen Sink** to include nested popout demo with play function tests

**Tests to Write**:

- `tests/popout/PopoutManager.test.tsx`:
  ```typescript
  describe("PopoutManager hierarchy", () => {
      it("tracks parent-child relationships");
      it("closes descendants when parent closes");
      it("click in child does not close parent");
      it("Escape in child only closes child");
  });
  ```

- `tests/popout/position.test.ts`:
  ```typescript
  describe("calculatePopoutPosition nested", () => {
      it("uses 4px gap for nested panels");
      it("positions relative to parent panel edge");
  });
  ```

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. In Kitchen Sink, click "Nested Demo" then "Open Child"
3. **Expected**: Child appears to left of parent
4. Press Escape
5. **Expected**: Only child closes
6. Reopen child, close parent via X
7. **Expected**: Both close

---

### Phase 7: Accessibility and Integration Example

**Objective**: Add ARIA attributes, keyboard navigation, and a real-world integration example.

**Duration**: 1-2 days

**Files to Create** (`compact-mantine/`):

| File | Purpose |
|------|---------|
| `src/components/popout/examples/LabelSettingsPopout.tsx` | Real-world integration example |

**Files to Update** (`compact-mantine/`):

| File | Change |
|------|--------|
| `src/components/popout/PopoutPanel.tsx` | Add ARIA attributes, focus management |
| `src/components/popout/PopoutTrigger.tsx` | Add aria-expanded, aria-controls |
| `src/components/popout/PopoutHeader.tsx` | Add ARIA to close button, tabs |
| `src/components/popout/Popout.stories.tsx` | Add LabelSettingsExample, a11y tests to all stories |
| `tests/popout/Popout.test.tsx` | Add accessibility tests |
| `tests/popout/Popout.browser.test.tsx` | Add focus management tests |

**Story to Add** (`compact-mantine/src/components/popout/Popout.stories.tsx`):

- Add **Label Settings Example** story

**Story Updates**:

- Update all stories to verify accessibility in play functions

**Tests to Write**:

- `tests/popout/Popout.test.tsx`:
  ```typescript
  describe("Popout accessibility", () => {
      it("panel has role=dialog and aria-modal=false");
      it("trigger has aria-expanded and aria-controls");
      it("close button has aria-label");
      it("focus moves to panel on open");
      it("focus returns to trigger on close");
  });
  ```

- `tests/popout/Popout.browser.test.tsx`:
  ```typescript
  describe("Popout focus (browser)", () => {
      it("Tab cycles through interactive elements");
      it("does not trap focus (non-modal)");
  });
  ```

**Verification**:

1. Run tests: `pnpm --filter @graphty/compact-mantine test:run`
2. Test with keyboard only (Tab, Escape, Enter)
3. **Expected**: All interactions work without mouse
4. Test with screen reader
5. **Expected**: Panel announces as dialog, title read

---

## File Structure Summary

All files are in the `compact-mantine/` package:

```
compact-mantine/
├── src/
│   ├── index.ts                          # Add Popout exports
│   ├── types/
│   │   ├── index.ts                      # Re-export popout types
│   │   └── popout.ts                     # Popout TypeScript interfaces
│   ├── constants/
│   │   ├── index.ts                      # Re-export popout constants
│   │   └── popout.ts                     # Z-index base, gaps
│   └── components/
│       └── popout/
│           ├── index.ts                  # Public exports for popout module
│           ├── Popout.tsx                # Compound component root
│           ├── PopoutContext.tsx         # React context
│           ├── PopoutManager.tsx         # Context provider
│           ├── PopoutTrigger.tsx         # Trigger wrapper
│           ├── PopoutPanel.tsx           # Floating panel (portal)
│           ├── PopoutHeader.tsx          # Header (title/tabs)
│           ├── PopoutTabs.tsx            # Tab list and content (Phase 3)
│           ├── PopoutContent.tsx         # Content container
│           ├── Popout.stories.tsx        # Stories with play functions
│           ├── hooks/
│           │   ├── useFloatingPanel.ts   # Zag.js wrapper (Phase 2)
│           │   ├── useClickOutside.ts    # Click outside detection (Phase 5)
│           │   └── useEscapeKey.ts       # Escape key handling (Phase 5)
│           └── examples/
│               └── LabelSettingsPopout.tsx  # Integration example (Phase 7)
└── tests/
    └── popout/
        ├── Popout.test.tsx               # Component tests
        ├── PopoutManager.test.tsx        # Context/state tests (Phase 4)
        ├── PopoutHeader.test.tsx         # Header tests (Phase 3)
        ├── position.test.ts              # Position calculation unit tests
        └── Popout.browser.test.tsx       # Browser tests (Phase 2)
```

## Stories Evolution Summary

Stories location: `compact-mantine/src/components/popout/Popout.stories.tsx`

| Phase | Basic | Tabbed | Kitchen Sink | Label Settings |
|-------|-------|--------|--------------|----------------|
| 1 | Create (open/close) | - | - | - |
| 2 | Add drag tests | - | - | - |
| 3 | Add header actions | Create (tabs) | - | - |
| 4 | - | - | Create (multi-panel, z-index) | - |
| 5 | - | - | Add ESC/click-outside tests | - |
| 6 | - | - | Add nested popout demo | - |
| 7 | Add a11y tests | Add a11y tests | Add a11y tests | Create |

## Commands Reference

| Task | Command |
|------|---------|
| Run tests | `pnpm --filter @graphty/compact-mantine test:run` |
| Run tests (watch) | `pnpm --filter @graphty/compact-mantine test` |
| Start Storybook | `pnpm --filter @graphty/compact-mantine storybook` |
| Build package | `pnpm --filter @graphty/compact-mantine build` |
| Lint | `pnpm --filter @graphty/compact-mantine lint` |

## Visual Styling Guidelines

### Research Findings

Based on research into best practices from Radix UI, Material Design 3, Josh W. Comeau's shadow design articles, and accessibility guidelines, floating panels require careful styling to remain discernible against similar-colored backgrounds.

#### Key Pattern: The 1px Ring

**Radix UI's approach**: Every shadow definition includes a subtle 1px ring as the first layer:

```css
/* Radix shadow token example */
box-shadow:
  0 0 0 1px var(--gray-a3),           /* 1px ring for edge definition */
  0px 3px 7px -3px var(--gray-a5),    /* ambient shadow */
  0px 6px 12px -4px var(--gray-a4);   /* key light shadow */
```

This 1px ring ensures edge definition even when:
- The panel is on a same-colored background
- Shadows are too subtle to see
- Windows High Contrast Mode removes box-shadows (the ring acts as a fallback)

#### Recommended Styling

For the PopoutPanel component:

| Property | Value | Rationale |
|----------|-------|-----------|
| `shadow` | `"xl"` | Stronger shadow provides depth perception |
| `withBorder` | `true` | Adds 1px border for edge definition |
| Border color | `var(--mantine-color-default-border)` | Theme-aware, subtle |

**Alternative: Custom Shadow with Ring**

If more control is needed, use a custom style combining Mantine's shadow with a ring:

```typescript
style={{
  boxShadow: `
    0 0 0 1px var(--mantine-color-default-border),
    var(--mantine-shadow-xl)
  `,
}}
```

#### Accessibility Considerations

- **Windows High Contrast Mode**: Removes all box-shadows. The border/ring provides a fallback.
- **WCAG**: The 1px ring helps meet contrast requirements for UI component boundaries.
- **Dark mode**: Use CSS variables to ensure border colors adapt to the theme.

#### Story Variants for Verification

Add story variants to test visibility on different backgrounds:
- Light background (default Mantine body color)
- Similar gray background (stress test)
- Dark background (dark theme)

---

## External Libraries Assessment

| Task | Library | Rationale |
|------|---------|-----------|
| Drag behavior | `@zag-js/floating-panel` | Figma-inspired, state machine robustness, active maintenance |
| React bindings | `@zag-js/react` | Required for floating-panel |
| Position calculation | None (custom) | Simple getBoundingClientRect; no collision detection needed (R16) |
| Portal rendering | React.createPortal | Built-in |
| Z-index/hierarchy | Custom | No library handles our requirements |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Zag.js learning curve | Phase 2 dedicated to integration; start simple |
| Play function limitations | Fall back to browser tests for complex pointer interactions |
| Nested complexity | Build on solid hierarchy foundation from earlier phases |
| Security vulnerability | Pin @zag-js/core to >=0.82.2 (CVE-2024-57079 fix) |

## Requirements Traceability

| Requirement | Phase | Verification Method |
|-------------|-------|---------------------|
| R1: Initial Alignment | 1 | Unit test + Story play function |
| R2: Nested Stacking | 6 | Story play function |
| R3: Variable Width | 1 | Story visual |
| R4: Multiple Open | 4 | Story play function |
| R5: Independent Dragging | 2 | Story play function |
| R6: Drag Reset on Reopen | 2 | Story play function |
| R7: No Responsive Adaptation | 1 | Implicit (no responsive code) |
| R8: No Tab State Persistence | 3 | Story play function |
| R9: Simple Header Variant | 1 | Story visual |
| R10: Tabbed Header Variant | 3 | Story visual + play function |
| R11: Flexible Trigger Elements | 1 | Story visual |
| R12: Optional Tabs | 3 | Story visual |
| R13: Drag Handle Area | 2 | Component test |
| R14: Click Outside Closes | 5 | Story play function |
| R15: Z-Index on Focus | 4 | Story play function |
| R16: Screen Bounds | 2 | Implicit (no constraints) |
| R17: Instant Open/Close | 1 | Story visual (Chromatic) |
| R18: No Backdrop | 1 | Story visual (Chromatic) |
| R19: Escape Key Behavior | 5 | Story play function |
