# Item 9 review: style channel sections and their order (#789)

Item 9 of `element-api-decisions.md` proposes how graphty-element tells a style editor which
heading each style channel sits under, and in what order. This page is the synthesized verdict
after the blind-author test and four review lenses (personas, evolution, consistency,
security and privacy, performance and implementability).

## Verdict: redesign

The problem is real. Today the graphty app copies the element's section order and heading text
(`graphty/src/utils/channelControls.ts:164-176`: `NODE_GROUPS`, `EDGE_GROUPS`, `groupHeading`),
which is the workaround CLAUDE.md forbids. But the recommended shape would make it worse. It
has five defects:

1. **The thing it freezes is not decided.** Item 9 makes the section names and their order a
   one-way door, with Size as its own section. The tier 1 design, which by its own precedence
   rule (`tier1-design.md:20`) states the decided version, says the opposite:
   - "Nodes: Fill, Shape (shape, size), Effects, Label, Tooltip" (`tier1-design.md:301`);
   - "Open (not decided): Size as its own heading beside Fill. Round 8 kept Size under Shape
     pending a re-test on working wiring" (`tier1-design.md:680-681`).
   The evidence quoted for the change also contradicts itself. The decision record says
   participants "looked for size under Shape and missed it" (`element-api-decisions.md:405`).
   The plan says "12 of 12 clicked Shape first looking for size" (`plan.md:221`), which, read
   plainly, argues for keeping size under Shape. No round 8 record with that count exists under
   `design/`. T9, the task concerned, is recorded as "83% (decided by a mock defect)"
   (`tier1-design.md:51`).
2. **It adds a fourth source of truth.** Three already exist: the channel table order, the
   `group` field and the app copy. Item 9 adds `section`, a hand-numbered `order` and a
   `CHANNEL_SECTIONS` constant. Each can drift from the others, and `group` and `section` use
   different words for the same headings ("color" and "fill"; "text" and "label" plus
   "tooltip").
3. **It changes `channelsFor` silently.** That function is documented "in table order"
   (`channels.ts:908-912`), and it is not only a UI helper. The style interner builds its
   mesh-key sequence from it (`intern.ts:150-169`), and the base style layer's key order comes
   from it (`GraphSession.ts:1385`). A sort chosen for a panel would reorder the renderer's
   hot-path key and saved style documents.
4. **A closed union makes every future section a compile break.** "Treat an unknown section as
   last" helps a runtime loop. It does nothing for a consumer who wrote
   `Record<ChannelSection, string>` or an exhaustive `switch`. With no published title, that
   map is exactly what every consumer has to write (`blind-9.ts:8` shows a raw key as the
   heading).
5. **The example does not compile when copied.** It needs two entry points (`/schema` for
   `CHANNEL_SECTIONS`, `/catalog` for `channelsFor`), never imports `channelsFor`, and calls an
   undefined `renderSection`.

The redesign below solves the same problem with one function, no new descriptor fields and no
closed union. It also turns size placement into a value that can move in a minor release, so
the round 8 re-test can decide it after tier 1 ships.

## Revised shape

Everything lives in `@graphty/graphty-element/catalog`, beside `channelsFor`.

```ts
/** One heading of a style editor. */
export interface ChannelSection {
    /**
     * Identifier: stays the same while the section exists. An open set: a minor release may
     * add a section, and an editor shows a key it does not know like any other, using `title`.
     */
    readonly key: string;
    /** The heading a person reads, in sentence case: "Fill", "Arrows". */
    readonly title: string;
    /** The section's channels, in the order an editor lists them. */
    readonly channels: readonly ChannelDescriptor[];
}

/**
 * The sections of a style editor for one kind of element, in display order. Every channel of
 * the target appears in exactly one section, including channels the renderer cannot draw
 * (`renderable: false`), so an editor can show them disabled with `unsupportedReason`.
 * Which section a channel sits in, and the order, may change in a minor release.
 * The result is frozen and computed once; any target other than "node" or "edge" returns [].
 */
export function channelSectionsFor(target: "node" | "edge"): readonly ChannelSection[];
```

`ChannelDescriptor` gains no field. `group` gets a real `@deprecated` tag that names
`channelSectionsFor` as its replacement, and it is removed in the next major. Until then its
values are unchanged. `channelsFor` is unchanged: table order, as documented.

### Canonical example

This is 15 lines. It was checked with `tsc --strict --noUncheckedIndexedAccess` against the
built graphty-element types plus a stub of the signature above, and compiled with zero errors
(`tmp/api-review/synth-9/example.ts`, `stub/catalog.d.ts`, `tsconfig.json`).

```ts
import { channelSectionsFor } from "@graphty/graphty-element/catalog";

const panel = document.querySelector("#style-panel")!;

for (const section of channelSectionsFor("node")) {
    const heading = document.createElement("h3");
    heading.textContent = section.title;
    panel.append(heading);
    for (const channel of section.channels) {
        const row = document.createElement("label");
        row.textContent = channel.shortName;
        row.title = channel.unsupportedReason ?? "";
        panel.append(row);
    }
}
```

The probe (`tmp/api-review/synth-9/probe.ts`) checks three more things, all as intended:

- A translated heading map, `Record<string, string>` keyed by `section.key`, compiles and keeps
  compiling when a section is added.
- `push` on the result is a type error.
- `channelSectionsFor("labelStyle")` is a type error.

### Sections shipped with tier 1

This follows `tier1-design.md:301`, the standing decision. Size stays under Shape until the
re-test.

| Target | key | title | channels, in order |
|---|---|---|---|
| node | fill | Fill | node.color, node.opacity |
| node | shape | Shape | node.shape, node.size |
| node | effects | Effects | node.outline, node.glow, node.glowStrength, node.wireframe, node.flat, node.marker |
| node | label | Label | node.label, node.labelStyle |
| node | tooltip | Tooltip | node.tooltip, node.tooltipStyle |
| edge | line | Line | edge.color, edge.width, edge.opacity, edge.style, edge.patternCount, edge.curvature, edge.animationSpeed |
| edge | arrows | Arrows | the six edge.arrowHead* channels, then the six edge.arrowTail* channels (type, size, color, opacity, caption, caption style) |
| edge | label | Label | edge.label, edge.labelStyle |

Edges have no tooltip channel, so they have no Tooltip section. Arrow captions sit under
Arrows, not Label. A consumer that wants every text-bearing channel filters on
`accepts === "text"`. If the re-test moves Size, the change is one row in this table and a
minor release.

### Implementation notes (binding on the element change)

- Keep one table in `channels.ts`: section key, title, and channel names in display order.
  Build the frozen result once when the module loads, the way `intern.ts:166` builds
  `MESH_CHANNELS`.
- Add a test that every channel of each target appears in exactly one section.
- Do not sort inside `channelsFor`, and do not reorder the `DECLARED` table to suit the panel.
  The interner's sequence stays independent of presentation.
- Freeze the section objects and both arrays. Also freeze each descriptor in
  `CHANNEL_DESCRIPTORS` (`channels.ts:869`): today a consumer's in-place mutation reaches the
  element's own reads.
- Check the target by value (`target === "node" || target === "edge"`), never by indexing an
  object. A target read from a project file's "app" slot can be "constructor".
- Re-export `channelsFor` and `channelSectionsFor` from `bundle.ts`, the way it already
  re-exports `GraphtyLogger`. `index.ts` does not export them, so a page with no build step
  cannot reach either today.
- In the guide, `styling.md:234-240` teaches `channelsFor` plus `channel.group`. Replace that
  with the example above and the section table, and add a test that the table in the docs
  matches the code.
- In the app, the plan's Style tab task deletes `NODE_GROUPS`, `EDGE_GROUPS`, `groupHeading` and
  `channelsIn` from `graphty/src/utils/channelControls.ts`, plus their uses in
  `StyleLayerPropertiesPanel.tsx:53-56,344-358`. It also deletes `CHANNEL_ORDER` if nothing else
  reads it. Without this, tier 1 ships two orderings.
- Fix `tier1-design.md:301-303`. The "[element: ... temporary stand-in]" note goes, and the
  section list points here. Fix `plan.md:219-223` and `element-api-decisions.md:401-448` to
  match this shape and to keep Size under Shape.

## What changed and why

| Proposed | Revised | Why |
|---|---|---|
| `section` field, `order` field, `CHANNEL_SECTIONS` in `/schema` | one function, `channelSectionsFor`, in `/catalog` | One derived view instead of three stored ones. Array order is the order, so there is no number to renumber and no tie rule. One import, Node-safe like `/schema`. Every lens raised this. |
| Closed `ChannelSection` string union | open `key: string` plus a published `title` | Adding a section can no longer break a consumer's compile. No consumer needs a closed key-to-heading map. |
| `channelsFor` sorted by section | `channelsFor` unchanged | Its documented order feeds the interner and the base layer. |
| Size as its own section | Size under Shape for tier 1 | The design says it is undecided pending a re-test, and the cited count contradicts itself. Membership is now reversible, so the re-test can move it in a minor. |
| No titles (raw keys as headings) | `title` in sentence case | Channels already ship English `plainName` and `shortName`. This is the same convention, not the items 6 and 8 problem. |
| `group` "deprecated", wording unspecified | real `@deprecated` JSDoc naming the replacement; removed in the next major | The blind probe compiled `group` with no warning. |
| Unspecified mapping | a full channel-to-section table, in the docs and tested | Without it, the implementer would be deciding the contract alone. |
| Shared mutable constant | frozen result, checked target | Prevents one consumer's `reverse()` from reordering every panel on the page. Prevents a crash on a hostile key. |

### Findings rejected or deferred, with the reason

- **Separate `NodeChannelSection` and `EdgeChannelSection` unions (consistency, personas).**
  Rejected. The point was to stop `"fill"` being asked of an edge. With the function, a
  consumer never passes a section key in; it iterates what comes back. Typed per-target unions
  would also bring back the closed-union break.
- **Change `group` in place on the held major, PR #676 (evolution).** Rejected for tier 1.
  #676 is held, and tying tier 1 to it couples two unrelated releases. Deprecating `group`
  costs nothing and does not break anything, and the removal rides whichever major comes next.
  The evolution lens's real concern, two permanent near-synonym fields, does not arise: no
  `section` field is added.
- **Name the node color section "color" (consistency, personas).** Rejected. The section holds
  `node.color` and `node.opacity`, so "color" is no more accurate than "fill", and the design's
  heading is "Fill". The key and the title now match each other, and the channel names keep the
  API vocabulary.
- **Return entries with companions now, for compound lines such as color with opacity, glow
  with strength, or pattern with count (evolution).** Deferred. A later optional field on
  `ChannelDescriptor` (for example the channel it accompanies) is additive and breaks nothing,
  so this is not a door that closes now.
- **Separate arrow head and arrow tail sections (evolution).** Deferred. Tier 1 draws one
  Arrows heading, and splitting it later is a membership change, allowed in a minor.
- **Sections for label style fields, #834 (evolution).** Deferred, with a residual risk below.
  Widening `target` later is additive, but the `channels` field holds `ChannelDescriptor`s.
- **The performance cost of a sort (performance).** Moot: nothing is sorted per call.
- **Fix the British spelling "Node Colour" in `plainName` (personas).** Correct, but outside
  this item. It is a published string, so change it in its own commit, not under #789.

## One-way doors

1. The function name `channelSectionsFor` and its entry point, `/catalog` (also re-exported
   from `./bundle`).
2. The result shape `{ key, title, channels }`, and `channels` holding `ChannelDescriptor`.
3. The documented contract:
   - keys are an open set;
   - a key stays stable while its section exists;
   - which section a channel sits in, and the order, may change in a minor release.
4. The section keys themselves are a soft door: consumers may persist them, for example as the
   section that was open. Renaming a key is a breaking change, but adding or removing a section
   is not.

Two-way doors (decided here, reversible): Size placement, the titles, the arrow grouping, and
the timing of `group`'s removal.

## Confidence: medium

High on the shape. Every lens independently converged on one derived function in `/catalog`
with titles and no `order`, and the canonical example compiles at 15 lines with no internal
concept. It is medium overall for two reasons:

- the size placement rests on study evidence that cannot be traced and contradicts itself;
- #834 may need a sibling function rather than reusing this one.

## Residual risks for the owner

- **The round 8 evidence is untraceable.** Neither the "12 of 12" claim nor the T9 result
  justifies freezing anything about Size. The revised shape keeps Size under Shape for tier 1
  and makes moving it a minor release. Someone should still find or rerun the data before the
  re-test is cited again.
- **Label style sections, #834.** `channels: ChannelDescriptor[]` does not fit label style
  fields. #834 will probably need `labelStyleSectionsFor`, or a generic over the descriptor
  type, and its headings ("Outline and shadow", "Effects") will sit beside these. Decide #834's
  shape with this one in view before either ships.
- **English titles.** A localized editor keys its translations on `key`, and keys stay stable
  only while their section exists. If the owner later wants the element to stop shipping
  English headings, removing `title` is a major release.
