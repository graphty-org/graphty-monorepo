# Blind author: style channel sections and their order (#789)

A third-party developer who has read only the published guide pages
(`graphty-element/docs/guide/`) and the "Recommended" text of section 9 in
`element-api-decisions.md` (taken as the docs page) wrote the example below for the most common
task: draw a node style panel with one heading per section and the channels under it in the
element's order.

## The example

`design/ui/tier1-real-app/review/blind-9.ts` (16 lines):

```ts
import { channelsFor } from "@graphty/graphty-element/catalog";
import { CHANNEL_SECTIONS } from "@graphty/graphty-element/schema";

const panel = document.querySelector("#style-panel")!;
const nodeChannels = channelsFor("node");
for (const section of CHANNEL_SECTIONS.node) {
    const heading = document.createElement("h3");
    heading.textContent = section; // "fill", "size", ... -- no display name is published
    panel.append(heading);
    for (const channel of nodeChannels.filter((c) => c.section === section)) {
        const row = document.createElement("label");
        row.textContent = channel.shortName;
        panel.append(row);
    }
}
```

## Did it compile

Yes, with zero errors (`tsc --noEmit`, strict, exit 0). The stub is in
`tmp/api-review/blind-9/`: `stub/schema.d.ts` re-exports the built `dist/schema.d.ts` and adds
`ChannelSection` and `CHANNEL_SECTIONS`; `stub/catalog.d.ts` re-exports `dist/catalog.d.ts` and
augments `ChannelDescriptor` with `section` and `order`. A probe file (`probe.ts`, also clean)
shows what the types do not catch; see "Type gaps" below.

It compiling is weak evidence. The example is short because the newcomer still has to write the
section titles, and the types accept several wrong programs (listed below).

## Where I had to guess

1. **Which entry point holds what.** The published guide (`styling.md`, "Drawing a style
   editor") imports `channelsFor` and `CHANNEL_DESCRIPTORS` from `/catalog`. Section 9 puts
   `CHANNEL_SECTIONS` in `/schema`. One editor now needs two entry points for one concern, and the
   section's own snippet calls `channelsFor` without importing it, so a newcomer copying the
   snippet gets "cannot find name channelsFor" and has to guess where it lives. Both entry points
   are Node-safe, so "Node-safe" does not justify the split.
2. **Where the `ChannelSection` type is exported.** The doc declares it but never says which
   entry point exports it. I guessed `/schema` next to `CHANNEL_SECTIONS`. The guide already
   exports a sibling type, `ChannelGroup`, from `/catalog` (built `dist/catalog.d.ts:42`), so
   `/catalog` is just as plausible.
3. **What to show as the heading.** Sections are lowercase keys ("fill", "arrows"). Channels come
   with `plainName` and `shortName` in sentence case; sections come with nothing. Every consumer
   writes `{ fill: "Fill", size: "Size", ... }`, which restates element knowledge -- the copying
   the `/schema` entry point exists to prevent. A raw `section` in a heading is what a hurried
   author ships (my example does).
4. **Which section each channel is in.** The doc names eight sections but does not map the 34
   channels in the guide's tables onto them. I cannot tell from the docs where these go:
   `node.opacity` (fill or effects?), `node.outline` (fill or effects?), `node.wireframe` and
   `node.flat` (shape or effects?), `edge.color`, `edge.width`, `edge.opacity` (there is no edge
   "fill" or "size" section, so presumably "line" -- but node size got its own section because
   people look for size, and edge width does not), `edge.arrowHeadSize` ("arrows" or "size"?),
   `edge.arrowHeadText` / `arrowTailText` ("arrows" or "label"?), `edge.animationSpeed`,
   `edge.curvature`, `edge.patternCount`.
5. **What happens to a section I do not know.** The Recommended text says nothing about it. The
   rule "treat an unknown section as last" lives only in the One-way door paragraph, which is not
   docs. My example iterates `CHANNEL_SECTIONS` and filters, so a channel whose section is missing
   from the table it was published with is silently never drawn. A consumer that hard-codes
   section names (likely, see item 3) drops every channel in a section added by a later minor.
6. **Whether `channelsFor` order changed.** The built doc comment says `channelsFor` returns
   channels "in table order" (`dist/src/session/styles/channels.d.ts`, `channelsFor`). Section 9
   says it now returns them sorted by section then `order`. Existing consumers that rely on table
   order get a silent reorder; the docs page does not say this is a change.
7. **What `order` is for.** If `channelsFor` already sorts, `order` is redundant for every reader
   I can think of. I did not use it. It is a second published number with no documented range,
   uniqueness or tie rule.
8. **`group` versus `section`.** The guide teaches `channel.group` (values `shape`, `color`,
   `effects`, `text`, `line`, `arrows`). Section 9 adds `section` (values `fill`, `size`, `shape`,
   `effects`, `label`, `tooltip`, `line`, `arrows`) and deprecates `group` "in the next grouped
   major". Two near-identical fields with overlapping but different vocabularies ("color" vs
   "fill", "text" vs "label" plus "tooltip") will both appear in autocomplete. Nothing in the
   built type marks `group` deprecated yet, so the guide's existing example keeps teaching it.

## Names that misled me

- **`ChannelSection` union comments.** `| "tooltip" // node, in this order` and
  `| "arrows"; // edge: line, arrows, label` suggest the union carries order. A union has no
  order; only `CHANNEL_SECTIONS` does. The comment also reveals "label" is shared between node and
  edge, which the type cannot express.
- **`fill`.** For a node, "fill" holds `node.color`. For an edge there is no fill, and the guide
  calls the property "color" everywhere (`node.color`, `edge.color`, `group: "color"`). A
  newcomer looking for color under "fill" is the same mismatch the size move was meant to fix.
- **"section" versus "group".** Both mean "which part of the editor"; neither name says which one
  is current.
- **`order`.** Reads like the section's order, not the channel's order within the section; the
  only explanation is a code comment.

## Internal concepts I had to name

- `CHANNEL_SECTIONS` -- a constant whose only purpose is ordering a panel the element does not
  draw. Acceptable for an editor author, but it is a second table beside `CHANNEL_DESCRIPTORS`
  that must stay in step with it.
- The section keys themselves, as heading text, because no display name ships.
- The `/schema` entry point, for one constant whose companions live in `/catalog`.

## Type gaps (probe.ts compiles all of these)

- `CHANNEL_SECTIONS.edge.includes("fill")` and
  `channelsFor("edge").filter((c) => c.section === "fill")` type-check. `ChannelSection` is one
  union for both targets, so nothing stops an edge panel asking for node sections. A pair of
  unions (`NodeChannelSection`, `EdgeChannelSection`) or a `ChannelDescriptor` generic on target
  would catch it.
- `channel.group` still compiles beside `channel.section` with no deprecation warning.
- A misspelled section literal is caught (the one thing the union does well).

## What would make the simple path simple

- Ship the grouping, not the ingredients: `channelSectionsFor("node")` returning
  `{ section, title, channels }[]` in order, with `title` in the same register as `shortName`.
  The example then has no filter, no title map and no unknown-section rule to remember, and fits
  in about eight lines. (This puts English text in the element API, the concern raised against
  items 6 and 8; but `plainName` and `shortName` already ship English for every channel, so a
  section title is consistent with the published descriptor, and leaving it out forces every
  consumer to write its own.)
- Keep it in `/catalog` beside `channelsFor`.
- Publish the channel-to-section table in the docs, and state the unknown-section rule in the
  docs text itself.
- Leave `channelsFor` in table order (or document the reorder as a change).

See `tmp/api-review/blind-9/` for the stub and probe.
