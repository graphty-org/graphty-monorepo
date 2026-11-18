# Which one should I use?

Some components overlap, and a few sit beside a Mantine component that looks as though it would
do. This table names the one to reach for, and what it is being chosen over where that choice is
not obvious. Storybook's
[Choosing a component](https://graphty.app/storybook/compact-mantine/?path=/docs/introduction-choosing-a-component--docs)
page has the full list, group by group.

| If you have                                                           | Use                                                                                                       | Instead of                                                                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A name and a reading on one line                                      | `DataRow`, with the reading already formatted by `useNumberFormatter()`                                   | `Tree` or `PageList`, which are for objects the reader selects, renames or moves                                    |
| A list of objects to select, rename or reorder                        | `Tree` (nested, or flat when no item has `children`) or `PageList`                                        | `DataRow`, which lost its listbox props in 0.9                                                                      |
| A group of controls that folds away                                   | `ControlSection`                                                                                          | --                                                                                                                  |
| A group of controls that must not fold, or sits in a padded container | `ControlGroup`                                                                                            | --                                                                                                                  |
| Two or more checkboxes on their own lines                             | `ToggleRow`s inside a `ToggleRowGroup`                                                                    | Mantine `Checkbox` with a label, which is sized for a form                                                          |
| A checkbox that reveals the settings it turns on                      | `ToggleWithContent`                                                                                       | --                                                                                                                  |
| A dropdown in a panel row                                             | `PanelField` with `kind="select"`                                                                         | --                                                                                                                  |
| A number or a dropdown with a default the reader can override         | `PanelField` showing the default, with a `ResetButton` in the `FieldRow` trailing slot once it is changed | a hand-made reset button                                                                                            |
| A value typed freely, with presets                                    | `ComboInput`                                                                                              | `Select` (fixed choices) or `Autocomplete` (suggestions, no chevron)                                                |
| Two to six drawable options in a panel row                            | `SegmentedControl` with a glyph and a `VisuallyHidden` word per segment, beside a `TrailingSlot`          | `IconGroupRow`, removed in 0.9                                                                                      |
| An icon button that stays pressed                                     | `ToggleIconButton`                                                                                        | `ActionIcon`, which is an action, not an on/off state                                                               |
| An icon button that opens a pop-out                                   | `PopoutButton`, inside `Popout.Trigger`                                                                   | `AdvancedButton`, which is for a row's or a section's advanced settings and does not light up while a panel is open |
| A floating panel that can be dragged and nest                         | `Popout`                                                                                                  | Mantine `Popover`: one-off, not draggable, no nesting                                                               |
| An explanation bubble                                                 | `InfoCircle`                                                                                              | a `Tooltip`, which closes when the pointer leaves                                                                   |
| A color with its opacity                                              | `CompactColorInput`                                                                                       | Mantine `ColorInput`, which has no opacity field and no Figma picker                                                |

A lone boolean is not a row: put it in the trailing slot of the row it modifies, or make it one
segment of a `SegmentedControl`. `ToggleRowGroup` warns in development when given only one child,
for exactly this reason.

## Use these instead of Mantine's {#use-these-instead-of-mantines}

Where this package has its own component for a job a stock Mantine component also does, use
this package's. The theme leaves Mantine's `ColorInput` and `ColorPicker` unstyled, so they render
exactly as Mantine documents them. It styles Mantine's `SegmentedControl`, `Slider`, `RangeSlider`
and `ScrollArea` too, but this package's components of those names, which take the same props, add
what Mantine's leave out for keyboard and screen reader users:

| Mantine component  | Use instead                                                                  | What it adds                                                                       |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `ColorInput`       | `CompactColorInput`                                                          | the compact, Figma-matched look                                                    |
| `ColorPicker`      | `CompactColorInput`, or `ColorPickerPanel` for the picker on its own surface | the compact, Figma-matched look                                                    |
| `SegmentedControl` | `SegmentedControl`                                                           | the name and description of an `Input.Wrapper` around it                           |
| `Slider`           | `Slider`                                                                     | `aria-valuetext` given through `thumbProps`, and a small `step` keeps its decimals |
| `RangeSlider`      | `RangeSlider`                                                                | the same as `Slider`, and Home and End move the focused thumb                      |
| `ScrollArea`       | `ScrollArea`                                                                 | `focusableViewport`, a Tab stop for a scroller with nothing focusable inside       |

Every component puts its own name, in kebab case, on a root `data-testid` --
`advanced-button`, `metric-row`, `popout-panel` -- so a test can find any of
them the same way.
