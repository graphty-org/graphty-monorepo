# Handling events

Two shapes, used consistently across the library.

**A value change gives you the value first and the event second, and the event
is optional:**

```tsx
<ToggleRow label="Labels" onChange={(checked, event) => setLabels(checked)} />
<PanelField label="Radius" kind="number" onChange={(value) => setRadius(value)} />
```

That matches Mantine, and it means a change made in code is expressible as
`onChange(next)` with no event to fabricate.

**An activation gives you the event, never a bare callback,** so you can read
modifier keys, call `preventDefault()`, or find the element that was activated:

```tsx
<AdvancedButton
    label="Advanced"
    onClick={(event) => {
        if (event.shiftKey) {
            openInNewPanel();
        } else {
            open();
        }
    }}
/>
```

Rows whose selection behavior depends on how they were activated -- `DataRow`,
`MetricRow`, `ActionRow` and `DataTable`'s rows -- get a second argument saying
so, rather than making you sniff the event:

```tsx
<DataRow
    name="Mr_Whiskers"
    value="12"
    onClick={(event, meta) => {
        openNode(id, { inNewPanel: meta.source === "pointer" && event.shiftKey });
    }}
/>
```

**A drag reports its start, its changes and its end,** so you can open and close
one undo transaction around the whole gesture:

```tsx
<PanelField
    label="Radius"
    glyph="width"
    kind="number"
    onScrubStart={() => beginUndo()}
    onScrub={(delta) => setRadius((r) => r + delta)}
    onScrubEnd={() => commitUndo()}
/>
```

**Anything that opens and closes** takes `opened`, `defaultOpened` and
`onOpenChange(opened, event?)`: `ControlSection`, `InfoCircle` and the
whole `Popout` family. Supply `opened` to drive it from
your own state, or leave it out and let the component remember.

**Anything whose content arrives later** takes `busy` and `live`:
`HistogramRow`, `SparklineRow`, `MetricRow`, `CompoundRow`, `RampRow`,
`ProseBlock` and `ActionRow`. Supplying `busy` at all -- true or false -- is how
you say the content is fed by something that finishes later, and that is what
makes a screen reader announce it; `live` sets the politeness and defaults to
`"polite"` once `busy` is given.

```tsx
<MetricRow name="Betweenness" busy={isRunning} percentile={98} value="0.31" />
```

Pass `busy` for the whole life of the component rather than only while the run
is in flight: a live region has to be in the document before the change it
announces.

Every component that holds a value works controlled (`value` plus `onChange`)
or uncontrolled (`defaultValue`), and `onFocus` and `onBlur` are always
forwarded.

## The shared prop names

A handful of names appear on most components, and each one means exactly one
thing everywhere.

| Prop                                        | What it always means                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`                                     | What the thing is called. It is always the accessible name; whether it is also drawn depends on the component and on the [`showLabels` preference](./rows#showing-a-word-beside-every-drawing). A chart row's (`HistogramRow`, `MetricRow`, `SparklineRow`) label is never drawn, `PanelField`'s is drawn only with the preference on, `ControlSection`'s always is. |
| `value` / `defaultValue` / `onChange`       | The state a control holds. Supply `value` with `onChange` to drive it yourself, or `defaultValue` to let it remember. On the display-only rows -- `DataRow` and `MetricRow` -- `value` is the reading drawn on the row and there is no `onChange`.                                                                                                                   |
| `trailing`                                  | The row's occasional control, in the fixed 24px slot every row ends with. Always a node, always the last thing in the row.                                                                                                                                                                                                                                           |
| `actions`                                   | Buttons that belong to a container rather than to a row: a section header's, a pop-out panel's, an action row's cluster.                                                                                                                                                                                                                                             |
| `disabled`                                  | The control is present but cannot be used: dimmed, skipped by Tab, announced as unavailable.                                                                                                                                                                                                                                                                         |
| `selected` / `selectedIds`                  | Which row of a list the reader has picked. Not the same as a control's own value.                                                                                                                                                                                                                                                                                    |
| `busy` / `live`                             | The content arrives from something that finishes later. See [Handling events](#handling-events).                                                                                                                                                                                                                                                                     |
| `opened` / `defaultOpened` / `onOpenChange` | Anything that opens and closes.                                                                                                                                                                                                                                                                                                                                      |
