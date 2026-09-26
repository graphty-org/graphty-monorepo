# compact-mantine Storybook: completeness audit before 0.9.0

This checks the compact-mantine Storybook (published at
https://graphty.app/storybook/compact-mantine/) against its plan,
`design/storybook-ia.md`, and against the package's exports in `src/index.ts`. The audit
was run on 2026-09-26 against the working tree of branch `feat/compact-mantine-figma`.

How it was checked:

- A static build (`storybook build`) into `tmp/sb-audit/site`. The build succeeds.
- Every entry of the built `index.json` was rendered in Chromium with Playwright. That is 495
  stories and 117 docs pages, each once with the `theme:light` global and once with
  `theme:dark`, 1224 renders in all. The runner waits for Storybook's `storyFinished` event and
  fails a render on `playFunctionThrewException`, `storyThrewException`, `storyErrored`,
  `unhandledErrorsWhilePlaying`, the error overlay, or a page error. A check that injects a
  throwing play function confirmed that the runner reports the failure.
- Every story with a play function, plus every `States` story, was rendered again with
  `schemes:single`. That is the mode Chromatic captures: one real render per scheme, not the
  two schemes side by side.
- `tools/check-storybook-links.mjs` was run against the build, and every relative
  `?path=/docs/...` link in the stories, the README and the changelog was checked against the
  index.

The scripts are `tmp/sb-audit/run-stories.mjs` and `tmp/sb-audit/inventory.mjs`.

## Result in one paragraph

The new structure is in place and almost complete. There are five roots: Introduction,
Foundations, Components, Patterns and Themed Mantine. Each of the nine Components groups
opens with an Overview page. Every component page except ComboInput sits in its planned
group and follows the page template: a meta description with "When to use it", "Usage",
"Keyboard and accessibility" and "Measurements"; an args-driven `Default` first; a `States`
second with `BOTH_SCHEMES`; and a one-sentence comment on every story. All 1224 renders and
all 79 play functions pass in light and dark, except one ComboInput story that fails
intermittently. Three things still block the merge, and all three were already assigned to
the final integration step:

- the ComboInput page has not moved out of "Figma/";
- the six old overview pages are still published;
- the intermittent ComboInput failure, whose cause is below.

One gap was not in the plan: `PopoutRegion`, `usePopoutRegion` and `usePopoutManager` are
exported, and the graphty app uses two of them, but no page documents them.

## Blockers

### 1. ComboInput is still in the Figma tree

`stories/figma/inputs/ComboInput.stories.tsx` has the title `Figma/Inputs/ComboInput`. It
has none of the template sections, no comment on `Default`, and a `States` story without
`BOTH_SCHEMES`. Two links already point at the page's planned address,
`components-inputs-comboinput--docs`, and both are dead today:

- `compact-mantine/README.md:316`, which `tools/check-storybook-links.mjs` reports, so the
  link check fails;
- `compact-mantine/stories/components/inputs/Overview.mdx:29`.

Fix: step 1 of the integrator's list in `storybook-ia.md`. Move the file to
`stories/components/inputs/ComboInput.stories.tsx` with the title
`Components/Inputs/ComboInput`, write the template description (versus Select and
Autocomplete), and give `States` `BOTH_SCHEMES`. Do this only after the agent editing the
file and `listbox.tsx` has finished.

### 2. The ComboInput story "Open over the field" fails intermittently

The failing story id is `figma-inputs-comboinput--open-over-the-field`. It passes when it
runs alone (6 of 6 runs). It fails in 3 of 4 runs that render the `States` story first:

```
expect(element).toHaveValue(32)  Received: 24   (also seen: Received: 10)
```

What happens: the play function clicks "Open list", waits until the "24" row lies over the
field, then presses ArrowDown and Enter. ComboInput does not set its keyboard highlight when
the list opens. It sets it later, in a `requestAnimationFrame` (`ComboInput.tsx:134`,
`combobox.selectActiveOption()`), and `listbox.tsx:307` walks the highlight again from a
`setTimeout`. With a warm cache the keypresses arrive before either one has run. ArrowDown
then moves from no highlight (Enter commits "10"), or the later reset undoes it (Enter
commits "24").

This is a real race, not flakiness: a fast keyboard user meets the same ordering. The
better fix is in the component: set the highlight on the checked option in the same update
that opens the list. The narrower fix is in the story: wait until `aria-activedescendant`
names the "24" option before pressing ArrowDown. Both files belong to the agent currently
working on `listbox.tsx`.

### 3. The six old overview pages are still published

`stories/docs/*.mdx` still produce these pages:

- "Building a Panel/Overview"
- "Compact Theme/Overview"
- "Editing a Value/Overview"
- "Floating Panels/Overview"
- "Getting Started/Introduction"
- "Showing Data/Overview"

Each one duplicates a new page. "Getting Started/Introduction" competes with "Introduction/
Getting started", and `EditingAValue.mdx` still recommends `IconGroupRow`, which is removed
in 0.9.0. These are the only titles left in the categories the plan removed.

Fix: integrator step 2. Delete `stories/docs/`. Nothing links to these pages.

## Major

### 4. PopoutRegion, usePopoutRegion and usePopoutManager have no documentation

`src/index.ts` exports all three, and the graphty app uses `PopoutRegion` and
`usePopoutManager`. None of them appears in any story, in any page's `subcomponents`, or in
the README. The Popout page lists `Popout.Panel`, `Popout.Trigger`, `Popout.Anchor` and
`PopoutManager` only. The README's table in "Floating panels" also leaves out
`PopoutRegion`, although README item 6 of "Breaking changes in the Figma release" mentions
it.

Fix:

- Add `PopoutRegion` to the Popout page's `subcomponents`.
- Add one story showing what a region is for.
- Add a "reach for it when" line to the Overlays overview and a row to the README table.
- Give the two hooks one sentence each, on the Popout page or in "Events and shared props".

### 5. The Figma comparison gallery still uses the old story ids

`tmp/figma-comparison-build.py` still maps spec sections to ids such as
`compact-theme-mantine-components-actionicon--states` and `figma-*`, and still reads
`stories/figma`. Every one of those ids is gone, so a rebuilt gallery would show empty
cards. The owner's first change moves the Figma comparison into that gallery, so the
gallery has to work.

Fix: integrator step 3 (for example, `figma-chrome-divider--states` becomes
`themed-mantine-surfaces-divider--states`), then rebuild the gallery.

## Minor

6. **Leftover story helpers and an empty folder.** `stories/figma/inputs/StateGrid.ts`,
   `stories/figma/selection/StateGrid.ts`, `stories/figma/chrome/StoryPanel.ts` and
   `stories/figma/color/ForceState.ts` have no importers left; their copies are in
   `stories/helpers/`. `stories/theme/` is empty. Delete them in integrator step 2.
7. **A build warning on every run.** `.storybook/main.ts` still globs
   `../src/**/*.stories.*`, which now matches nothing, so every build prints "WARN No story
   files found for the specified pattern". The plan kept the glob as harmless, but the
   integrator's own check asks for a build with no warnings. Remove the glob.
8. **A broken list in the README's contributing section.** Around line 953 of
   `compact-mantine/README.md`, the paragraph "New components need a story, a test and
   complete prop documentation" is joined onto the last bullet of the story-layout list.
   Start it on a new line after a blank line.
9. **A stale count in the root README.** `README.md:113` says the theme gives "automatic
   compact sizing for 43 Mantine components". The table in `compact-mantine/README.md`
   ("Components the theme restyles") lists 52.
10. **Restyled Mantine components with no page.** The README lists these as restyled, but
    Storybook shows none of them on their own: ColorInput, ColorSwatch, ColorPicker,
    HueSlider, AlphaSlider, Notification, Avatar.Group, Tooltip.Group and InputClearButton.
    NativeSelect has a story on the Select page, and Popover and HoverCard are on the Popout
    page. Either add Themed Mantine pages for the rest, or say in the README which page shows
    each one.
11. **Accessibility violations outside colour contrast.** axe-core, run through addon-a11y
    on every story, reports these. Some are artefacts of rendering a story twice in
    `BOTH_SCHEMES`, such as duplicate landmarks; the rest are real.
    - `aria-required-children`: SplitButton States, Menu States and its three interaction
      stories, HelpButton MenuOpen, QuickActions States and Empty, Toolbar FlyoutOpen, and
      Badge States.
    - `aria-required-parent`: DataRow States and RightToLeft; DataRowHeader States,
      MultipleColumns and RightToLeft; RankChip States and InADataRow. Check that nothing is
      left over from the removed `role="option"` mode.
    - `aria-valid-attr-value`: every QuickActions story, and Tabs States.
    - `label`: every Toolbar story, and SegmentedControl States.
    - `aria-input-field-name`: every Slider and RangeSlider story.
    - `button-name`: Modal Default and States, and Pagination Default and States.
    - `aria-progressbar-name`: Progress Variants and Sections.
    - `aria-allowed-attr`: Badge States.
    - `scrollable-region-focusable`: Select GroupsAndLongLists, Menu LongMenu, and ScrollArea.
    - `landmark-unique` and `landmark-no-duplicate-banner`: ControlSubGroup States and Modal
      States.

    `color-contrast` fires on 305 stories across 95 pages under the default Figma contrast
    mode. That is the documented reason the WCAG AA option exists, but the Accessibility page
    should say so, so that a reader who opens the Accessibility panel is not surprised. The
    full list is in `tmp/sb-audit/full.json`, in the `a11y` field.
12. **Stale comments in the graphty app.** `graphty/src/components/shell/toolbar/ViewModeSegment.tsx:9`
    and `graphty/src/components/shell/panel/AnalyzePanel.tsx:302` still explain why they do not
    use `IconGroupRow`, which no longer exists. The plan records replacing both with
    `SegmentedControl` as a follow-up issue. Make sure that issue is filed.

## What passes

- **Exports.** Every component exported from `src/index.ts` has exactly one page, except the
  gap in item 4. Families share a page through `subcomponents`:
  - Tree and TreeItem
  - PageList and PageRow
  - NavRail and RailButton
  - Toolbar, ToolButton and ToolGroup
  - Toast and ToastProvider
  - ContextMenu and MenuCheckItem on the Menu page
  - StyleSelect and Mantine Select on the Select page
  - FieldGlyph and UiGlyph on Foundations/Glyphs

  `LabelsProvider` and `PanelLabelsProvider` are covered by "Languages and direction" and the
  Panels overview.
- **One home per component.** No two pages declare the same `component`. Apart from items 1
  and 3, no title starts with "Figma/" or sits in a removed category.
- **The five agreed changes, as Storybook shows them:**
  - Select has one page, 14 stories in the planned order.
  - GradientEditor's page shows its built-in ColorPickerPanel, and has `SelectingAStop`,
    `TypingAStopColor` and `InsideColorPickerPanel` stories.
  - IconGroupRow has no page, and SegmentedControl has `PicturesInAPanelRow`.
  - Tree has `FlatReorderableList`, and its Keyboard story covers Alt+ArrowUp/Down.
  - DataRow's page no longer shows selection, double-click or context-menu stories.
  - CHANGELOG-figma.md, the README and "Introduction/Upgrading to 0.9" list the same four
    removed exports: IconGroupRow, IconGroupRowProps, IconGroupOption and DataRowRole. They
    also list the removed DataRow props and the behaviour notes. Those four are the only
    exports removed since master.
- **The page template.** Every Components page has all four description sections, `Default`
  first and `States` second with `BOTH_SCHEMES`. Every story export has a comment. Every
  Themed Mantine page links to mantine.dev. The pages that deviate do so as the plan allows:
  - Menu opens with `ContextMenu`, named that way so sidebar search finds it.
  - QuickActions takes its args from meta.
  - The interaction twins are hidden with `!dev` and `!autodocs`.
- **Rendering.** All 495 stories and 117 docs pages render in light and dark with no errors
  and no console errors. All 79 play functions pass, in both the side-by-side mode and the
  `schemes:single` mode Chromatic uses, except the ComboInput story in item 2.
- **Links.** Of the 177 relative `?path=` links in the stories, README and changelog, and the
  108 absolute links, only the two ComboInput links are dead for compact-mantine. The other
  44 dead links the checker reports point into the graphty-element Storybook, which this
  build does not include.
- **Documentation elsewhere in the repository.** `graphty-element/docs` and `docs/` do not
  link to compact-mantine stories. The root `README.md` links only to the Storybook's front
  page, which is still correct.
