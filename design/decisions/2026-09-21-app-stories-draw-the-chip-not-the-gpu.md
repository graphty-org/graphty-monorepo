# The app's acceleration stories draw the chip from a fixed status; the real GPU is the element's story

Date: 2026-09-21 (the decision); written 2026-09-22 with the phase it belongs to.
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 9.4 item 8 (the real-GPU stories "under a `gpu`
tag" in the graphty app), the W2 row of 9.8, and the stories clause of the P12 row at `:4219`. Those
sections are NOT edited; this record supersedes them.

## The decision

The graphty app's Storybook gets two stories, `On` and `DeviceLost`, that render the real status bar
from a FIXED `AccelerationStatus` object -- the same document graphty-element publishes, written by
hand in the story file. They mount no element, load no GPU package and touch no adapter, they carry
no `gpu` tag, and Chromatic snapshots both in light and dark.

The story that exercises a real GPU lives in graphty-element's Storybook instead
(`graphty-element/stories/LayoutGpu.stories.ts`: two fake-accelerator stories that Chromatic
snapshots, and `ForceAtlas2WebGpu`, which asks for real hardware and sets `disableSnapshot`).

The app's own check against real hardware is not a story at all: it is the running application on
the dev server, screenshotted through Playwright and questioned through an image model, recorded in
`graphty/docs/decisions/G12.md`.

## Why

A page can define a custom element name once. `graphty/src/stories/Graphty.stories.tsx` defines
`graphty-element` at module scope as a grey placeholder box, and Storybook loads every story module
into one page -- so no story in the app's Storybook can mount the real element, whatever it is
tagged. Putting a real-GPU story there would mean deleting the mock and with it the wrapper stories
that depend on it.

It would also be a second copy of a story that already exists. WebGPU detection, construction and
recovery moved into graphty-element (`2026-09-19-graphty-element-owns-webgpu.md`), so the element's
Storybook is where a real accelerator has something to drive. The app's half of this phase is
presentation: a chip and a toast, both derived from one published document by one pure function. A
fixed document exercises every word of them.

And the `gpu` tag was there to SKIP a story where there is no real adapter -- on a software
renderer, on Chromatic, in CI. A story with no adapter to skip needs no tag, and a tag that never
skips anything is a filter the next reader has to disprove.

## What we are giving up, and why it is acceptable

A fixed-status story cannot catch a change in what the element PUBLISHES. If a future element
renames a state or stops filling `vendor`, these two stories stay green while the running app draws
the wrong words, and the mismatch surfaces only in the app's live check or in a reader's report.

That is acceptable because the type is the link: the stories' fixed objects are typed
`AccelerationStatus`, imported from `@graphty/graphty-element/session`, so a renamed or retired
member is a compile error in `graphty:lint` rather than a silent drift. What the type cannot catch
-- a state the element newly emits, or a field it stops populating -- is exactly what the live check
on the running app is for, and what the element's own story covers on its side.

## What would reverse this

- the app's Storybook loses its mock registrar (the wrapper stories go, or Storybook grows
  per-story isolation), AND a reader's question turns out to need a real element in the app's
  boards rather than in the element's; or
- the chip's words stop being a pure function of one published document -- if the app ever has to
  combine two sources to say what it says, a fixed object stops standing for the real thing.

## What still exists

Design 9.4's other items and the whole of the element's story work: `LayoutGpu.stories.ts`, its two
snapshotted fake-accelerator boards and its real-hardware board, and the visual routine that checks
them (`graphty-element/docs/decisions/G6.md` items 9 and 10). The app's Chromatic job, `chromatic-app`,
is unchanged and still runs with `exitZeroOnChanges: false`.
