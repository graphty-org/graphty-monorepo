# Pop-outs

A pop-out is a panel that opens beside a control, can be dragged, and can contain pop-outs of its
own. [Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-overview--docs)

**Put one `PopoutManager` high in your tree, above anything that opens a pop-out.** It owns the
shared floating layer: the stacking order, the portal the panels render into, and the dismissal
rules they all obey. Without it, anything that opens a pop-out throws
`usePopoutManagerContext must be used within a PopoutManager` on first render.
`CompactColorInput` uses a pop-out internally, so it needs one too. (`InfoCircle` is the
exception: it supplies its own if there is none.)

<<< ../examples/popout.tsx

| Component                                                                                                          | What it is                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PopoutManager`                                                                                                    | The shared floating layer. Required, once, near the root.                                                                                                                                                                                                  |
| [`Popout`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-popout--docs)             | One pop-out: `Popout.Trigger` wraps the element that opens it, `Popout.Panel` is the panel (a width, an optional header or tab strip, its content), and `Popout.Anchor` wraps a sidebar so every panel opened inside it lines up with that sidebar's edge. |
| [`PopoutButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-popoutbutton--docs) | An icon button that stays lit while its panel is open.                                                                                                                                                                                                     |
| [`InfoCircle`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-infocircle--docs)     | A circled "i" that reveals an explanation on hover, focus or tap.                                                                                                                                                                                          |
| `usePopoutManager`                                                                                                 | A hook returning `closeAll()` and `hasOpenPopouts()`, for closing every pop-out from a route a click-outside does not cover: a keyboard shortcut, a command palette row, a full-page sheet.                                                                |
| `PopoutRegion`, `usePopoutRegion`                                                                                  | `PopoutRegion id="..."` names a part of your shell (a panel, an inspector); `usePopoutRegion()` reads that name from anywhere inside it, including a pop-out opened there. It does not change which pop-outs may be open together.                         |

The rules a `PopoutManager` enforces, so you do not have to: Escape closes the innermost panel; a
click outside closes everything; only one root pop-out is open at a time; closing a panel closes
everything opened from it; focus returns to the trigger. Where a panel opens is set by two
props on `Popout.Panel`: `anchorX` decides which edge it lines up with (`"panel"`, `"trigger"`,
`"parent"`, or a ref of your own) and `anchorY` how far down it opens.
