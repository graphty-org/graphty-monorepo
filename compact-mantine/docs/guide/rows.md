# Panels and rows

The containers a property panel is built from, and the row layout every other component agrees
with. [Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-overview--docs)

| Component                                                                                                                     | Reach for it when                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`ControlSection`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-controlsection--docs) | a run of controls needs a name, a rule and a chevron that folds it away. The workhorse container for a property panel. It can show a dot when something inside it is non-default, an empty state with a single "+", an explanation bubble, buttons of its own in the header, and a one-line `summary` of what it holds while it is closed. |
| [`ControlGroup`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-controlgroup--docs)     | the same, but it must never fold, or it sits in a padded container such as a pop-out.                                                                                                                                                                                                                                                      |
| [`FieldRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-fieldrow--docs)             | one or two fields share a line. It owns the widths and the gaps, so a column of rows lines up.                                                                                                                                                                                                                                             |
| [`CompoundRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-compoundrow--docs)       | two or three values are one thing seen several ways -- a color and its opacity, a width and its unit -- and must read as one control.                                                                                                                                                                                                      |
| [`TrailingSlot`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-trailingslot--docs)     | you are laying out a row by hand and need the fixed 24px slot every row ends with.                                                                                                                                                                                                                                                         |
| [`ResetButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-select--docs)                     | a row's value has a default the reader overrides. A 24px reset for the trailing slot, drawn once the reader has set a value of their own; pressing it goes back to the default.                                                                                                                                                            |
| [`ResizeHandle`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-panels-and-rows-resizehandle--docs)     | a panel's edge can be dragged: pointer, arrow keys, or a double-click back to the default size.                                                                                                                                                                                                                                            |

## The other row types

Every row is 32px tall, starts at the panel's 16px inset and ends in a 24px trailing slot, so rows
of different types stack into one even column. The rows that hold something other than fields
live with their group:

| Row                            | Holds                                  | Listed under                              |
| ------------------------------ | -------------------------------------- | ----------------------------------------- |
| `ToggleRow`, `ToggleRowGroup`  | a yes or no                            | [Selection](./components#selection)       |
| `DataRow`, `DataRowHeader`     | a name and a reading                   | [Data display](./components#data-display) |
| `MetricRow`                    | a reading with its percentile and rank | [Data display](./components#data-display) |
| `HistogramRow`, `SparklineRow` | a distribution, a series               | [Data display](./components#data-display) |
| `ActionRow`                    | a state and the verbs beside it        | [Data display](./components#data-display) |
| `RampRow`                      | a size wedge or a color ramp           | [Color](./color)                          |

[The panel grid](./panel-grid) has the numbers they share, for a row of your own.

## A worked example

A complete section of a property panel. The scale is a themed Mantine `SegmentedControl` whose
segments are drawings with a visually hidden word, the recipe that replaced `IconGroupRow`.

<<< ../examples/node-size-section.tsx

## Showing a word beside every drawing

An icon-first panel needs a way out for readers who do not yet know the
drawings, and `PanelLabelsProvider` is it. It carries one preference -- off by
default -- to every component below it, and each one degrades in its own way: a
field grows its label word beside its glyph, and a row holding a pair of fields
becomes two single rows, each with its word in a 76px column. A pair never
becomes a two-line stack.

```tsx
<PanelLabelsProvider showLabels={settings.showLabelsOnControls}>
    <NodeSizeSection />
</PanelLabelsProvider>
```

Read the preference anywhere below with `usePanelLabels()`. Offering it as a
user setting is recommended; nothing in the library requires it.
