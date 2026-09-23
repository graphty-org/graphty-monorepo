# Capability losses in graphty-element 2.0

Status: open, with the prevention mechanism built. Branch `feat/element-api-2`, compared
against `origin/master` at `9dd4d388` (published as 1.10.0).

The three gates section 2 asks for now exist and run:
`graphty-element/test/contracts/story-roster.test.ts`,
`graphty-element/test/contracts/config-reachability.test.ts` (both in the `default` vitest
project, so both are in the pre-push gate and the `graphty-element-default` CI shard) and
`graphty-element/test/browser/channel-paints.test.ts` (in the `contract` project, so it is in
the pre-push gate too). The published waiver lists they check are
`graphty-element/src/catalog/unreachable.ts`, exported from `./catalog`. The story roster is
`graphty-element/stories/story-roster.json`.

What they found on their first run is in section 3 as rows 35 to 37, and none of the three was
in this register before the gate that caught it existed.

A fourth gate, `graphty-element/test/contracts/waiver-expiry.test.ts` (also `default`), is what
stops a waiver outliving the person who wrote it. An entry in `unreachable.ts` now declares which
of two things it is. A `by-design` waiver records a decision -- a label's world position belongs
to the renderer, a node tooltip is hover-only and a resting frame cannot show one -- and is
permanent. A `defect` waiver records something broken, and carries an owner and an expiry; the day
after that expiry the gate is red, naming the subject, the reason, the date and the two things a
person may do, which are fix it and delete the waiver, or decide it still stands and set a new
date. Before that split the two were the same shape, which is exactly how rows 35 to 37 sat green
in `UNPAINTED_CHANNELS`. Every defect waiver in the file today carries the placeholder owner
`WAIVER_OWNER_UNASSIGNED` and the placeholder expiry `WAIVER_EXPIRY_UNSET` (2026-12-21): nothing
automated may assign this work to a person, so the owner sets the real ones.

This file is the register the 2.0 major did not have. Everything in it was found by reading the
code, not by reading a report: where the four investigations that fed this document disagreed,
the disagreement is settled here against the source, and the settlement is shown.

A capability is in this register when any of these is true:

- a field exists in a style schema and no channel, attribute or method writes it;
- a renderer reads a style property that nothing can set;
- a 1.x feature has no 2.0 equivalent and no recorded decision saying so;
- a public method, event or option exists and nothing reaches it;
- a story or test that demonstrated something was deleted rather than migrated.

---

## 1. Why twenty stories were removed

An agent was told not to weaken tests. Nobody said stories counted. Migrating them was
impossible, so it deleted them, wrote down what it had deleted in three places, and every one of
those three places was somewhere nobody would look.

The longer version, because two parts of it are not what you would guess.

**It was one agent, one pass, and it did not hide anything.** The workflow was named
"retire-the-1x-style-system"; its second phase covered stories, tests and docs. That phase
deleted the seventeen label stories in a single `python3` heredoc whose own comment reads
`# 2. delete the stories whose subject has no channel`, and it named all seventeen in the list it
iterated. The three arrow stories went the same way a few calls earlier, collapsed into one
`ArrowHead` story. It then wrote a header comment into `stories/LabelStyles.stories.ts` -- still
there today, lines 27 to 33 -- saying exactly what had been lost and why, wrote the arrow gap into
the surviving story in the sentence "the renderer still draws an arrow at any size, in any colour;
nothing can ask it to", and listed both losses in its report.

**It was right that the stories could not be migrated.** This is the part the owner's brief and
one of the four investigations got wrong, and it matters because it changes what "restore the
seventeen" costs. Each deleted story existed to demonstrate one label field: a corner radius, a
pointer, a badge, a text shadow. In 2.0 a layer says how a label is drawn through
`node.labelStyle`, whose value type is `LabelStyle` -- nine fields
(`src/catalog/types.ts:367-377`) -- and `richTextOf` (`src/managers/StylePainter.ts:117-149`)
translates seven of those nine into rich-text keys. Not one of the seventeen subjects is among the
seven. The eleven stories that survived are, precisely and without exception, the ones whose
subject IS among the seven. The deletion was drawn along the line where the API stopped being able
to ask the question. A story rewritten against today's API would be a picture of the default.

**The reason for the rule it obeyed, and the rule it did not have.** Every agent in that workflow
was given this, verbatim: "Do not weaken a test to make it pass: never delete an assertion, never
loosen one, never skip a test." Three nouns, all of them "test". The agent obeyed it exactly -- an
independent verifier confirmed no assertion was deleted without replacement -- and then deleted
twenty stories, because nothing said a story was the same kind of thing. Of the forty-three
workflow scripts in this session's archive, the only one that extends the no-weakening rule to
stories is the one that commissioned this investigation, written after the fact.

**Why nobody saw the three written warnings.** This is the real mechanism and it is not a
judgement failure.

- The workflow returned about 41,000 characters across three agent reports. The notification the
  orchestrating session received was truncated at 9,656 characters, mid-sentence, inside the
  FIRST report. The phase-2 report -- the one containing "17 stories removed" -- was not in it at
  all. Searching the entire 92 MB session transcript for that phrase returns nothing.
- The orchestrator then read the verifier's report by hand, in two slices covering characters 0
  to 9,857 of a 14,073-character document. The verifier's finding -- "the capability regression is
  larger than 'some stories were removed'" -- begins at character 11,948.
- The converter the agent wrote to migrate the stories computed a per-file list of every dropped
  field and printed it to stdout: `stories/EdgeStyles.stories.ts LOST: ['arrowHead.color',
  'arrowHead.opacity', 'arrowHead.size']` and, for the label file, all thirty-four field names.
  That is the exact list this register exists to reproduce. It was computed and discarded inside
  the run that caused the loss, because it was printed rather than written to a file.

**Why no gate went red.** Four gates, all blind to an absence by construction. The storybook
vitest project runs the stories that exist, so deleting one removes a test rather than failing
one; the count fell from 150 to 131 and three later reports printed 131 as green, one of them with
the "before" column reading "not measured". Chromatic fails on a CHANGED snapshot
(`.github/workflows/ci.yml:622`), and a deleted story produces no snapshot to diff. The pre-push
gate never runs the storybook project at all. And at the time, `eslint.config.js` globally ignored
`**/stories/**`, so the static gates never read the files either.

**Why the commit says nothing.** `tools/commit-changes.sh` splits a working tree into conventional
commits by directory pathspec, and `graphty-element/stories` sits in the `[tests]` bucket. So
twenty story deletions landed in `ff12a515`, whose subject is "test(graphty-element): drive a
dummy extension through everything a built-in does". No commit message in the forty-one-commit
branch mentions a removed story.

**The gap was known before it was created.** A recon workflow that scoped the removal, the day
before, had already written: "an arrow head in a 1.x layer carries a type, a size, a colour, an
opacity and its own rich-text caption, and the 2.0 channel for it carries only the type". It used
that fact as an argument for refusing to translate 1.x documents. Another workflow hit it
independently. Three agents on three days observed the arrow gap, and none of them turned it into
a work item, because there was nowhere to put one.

So the honest answer is the one the owner offered, plus one correction: an agent was told not to
weaken tests, nobody said stories counted, and migrating them was not merely harder than deleting
them -- it was impossible without first publishing an API that does not exist. The loss was
written down three times and all three copies were somewhere that could not reach a person.

---

## 2. The prevention mechanism

The requirement is a mechanism that makes the failure impossible rather than discouraged. The
failure is not "a story was deleted". A story whose subject has no API really is a picture of the
default, and deleting it can be the right call. The failure is **a capability losing its only
public route with no record of it anywhere a person or a gate will look.**

So the mechanism has to convert an absence into a red test, and the only way to make that test
green has to be writing the loss into a file in the repository. Three pieces, in the order they
should be built.

### 2.1 The story roster -- makes a silent story deletion impossible

BUILT. `graphty-element/stories/story-roster.json` names all 151 stories the package ships, and
`graphty-element/test/contracts/story-roster.test.ts` checks it both ways in 0.4 seconds with no
browser and no Storybook.

Proved rather than assumed, twice. Put `Styles/Label::CornerRadius` and `Styles/Edge::ArrowSize`
back into the roster's `stories` array -- which is the state the tree was in the moment before
the deletion -- and the test names both of them:

```
x the story roster > finds every story it names
  -> These stories are named in stories/story-roster.json and no file declares them. Either the
     story was deleted -- in which case move its id into "retired" with a "why" a reader can act
     on -- or its meta title or its export name changed, which orphans its visual-regression
     baseline and needs the same decision.
     + [ "Styles/Edge::ArrowSize", "Styles/Label::CornerRadius" ]
```

And the id scheme is a real key, not a convention: computing Storybook's own `toId(title,
storyNameFromExport(export))` over every roster entry and comparing it to the live
`index.json` at `https://dev.ato.ms:9026/index.json` gives 151 against 151, with nothing on
either side the other does not have.

The `retired` array is EMPTY today, and that is the outcome rather than an oversight: all twenty
stories removed in `ff12a515` are back on disk, and a retirement entry for a story that exists
fails the test. The history lives here, in this file. The roster's own `note` carries the shape
of an entry so the next person writing one does not have to find an example.

The roster is checked in and has two arrays:

```json
{
  "stories": ["Styles/Label::CornerRadius", "Styles/Edge::ArrowSize"],
  "retired": [
    { "id": "Styles/Edge::ArrowSize", "why": "...", "replacedBy": "Styles/Edge::ArrowHead" }
  ]
}
```

A story's id is `<meta title>::<export name>`, which is what Chromatic keys a baseline on, so a
retitled meta and a renamed export are both caught. The test reads `stories/**/*.stories.ts` off
disk with `node:fs` and a regex for `export const <Name>: Story` plus the file's `title:`, then
asserts four things:

1. every id in `stories` is present on disk, unless it is in `retired` with a non-empty `why`;
2. every id on disk is in `stories` -- so adding a story also edits the roster, which is what
   keeps the roster from rotting into a stale list nobody trusts;
3. no id is in both arrays;
4. every `retired` entry names an id that is genuinely absent.

Both directions, which is exactly the guard commit `ff12a515` built for the test corpus in the
same change set that deleted the stories: "every file on disk named by a manifest, every manifest
entry present on disk". It was applied to fixtures and not to stories.

**What it costs.** `test/integration/story-determinism.test.ts` already walks every story file from
disk and runs regexes over all of them; measured on this machine it takes 318 ms. The roster test
does strictly less work, so call it under 100 ms. It is a Node test with no browser and no
Storybook, so it runs in `tools/prepush.sh` (via `npm run test:prepush`, which runs
`--project=default`) and in the `graphty-element-default` CI shard. Nothing new has to be wired.

**Why this and not the live Storybook index.** Reading `index.json` needs Storybook running, which
makes the check CI-only at best -- and the class of failure being prevented is exactly the one
that only CI-only gates were watching.

**The honest limit.** An agent can add a `retired` entry. That is the design, not a hole: the entry
is a sentence in a file in the repository, so it survives a truncated report, a partial read, a
commit splitter and the owner being asleep. All three of those defeated the warnings that were
actually written last time.

### 2.2 The reachability contract -- would have caught the arrows mechanically

BUILT, and it differs from the design here in one way worth knowing about. The design said to
build the reachable set from `CHANNEL_DESCRIPTORS` by reading each descriptor's `stylePath` plus
the eight rich-text leaves of a label channel. That list of eight would have been a second source
of truth, and it would have been wrong within the hour: the label vocabulary was widened from
seven fields to forty-four while this was being built.

So the test derives reachability by PAINTING instead. Each renderable channel is written twice,
with two different values, through the real `StylePainter`, and the style leaves whose value
follows the channel's are the leaves that channel reaches. A channel that cannot change a field
does not reach it, whatever any table says. The label probe is built from `LABEL_STYLE_FIELDS`,
which is `Object.keys` over an object literal declared `satisfies Record<keyof LabelStyle, 0>` --
so a field added to the published vocabulary is probed for with no edit to the test, and one
removed from it cannot be.

Two consequences of measuring rather than declaring, both of which earn their keep:

- `texture.color.colorType` and `texture.color.value` come out UNREACHABLE although the painter
  writes both. It pins them to a neutral solid so a node's per-instance colour can show, so no
  channel can choose them -- which is exactly why a gradient node fill cannot survive the paint
  path (row 24), and exactly what a restated list would have hidden.
- `node.color` writes nothing into the style at all; its value is diverted into `NodePaint.color`
  beside it. The test sees that divergence in the paint and credits the channel's declared
  `stylePath`, rather than knowing the name "node.color".

The waiver list is published, in the shape the package already uses twice for exactly this
purpose: `UNSERVED_LAYOUT_IDS` (`src/catalog/layouts.ts:533`) and `UNSERVED_FORMAT_IDS`
(`src/catalog/formats.ts:181`) name the capabilities the element does NOT serve, each with a
reason, "rather than left for a consumer to discover by asking for a layout that never answers, or
by never learning a capability exists". That is the same sentence this register exists to make
true for styles.

The test:

1. walks the `NodeStyle` and `EdgeStyle` Zod schemas to leaf dotted paths, unwrapping
   `optional` / `default` / `prefault`;
2. builds the reachable set FROM `CHANNEL_DESCRIPTORS`, never from a restated list: each
   renderable descriptor's `stylePath`, plus the eight rich-text leaves for an
   `accepts: "labelStyle"` descriptor, plus `<root>.enabled` for an `accepts: "text"` one. That
   mirrors `writeChannel` and `richTextOf` exactly, and it must be derived so the test cannot
   drift from the painter;
3. asserts every leaf is reachable or named in `UNREACHABLE_STYLE_FIELDS` with a reason;
4. asserts every waiver names a leaf that still exists and is still unreachable, so a waiver
   cannot outlive the gap it describes.

Adding a schema field with no channel is then a red test naming the field. Publishing a channel
for a waived field is a red test telling you to delete the waiver.

**What it costs.** Pure computation over two Zod schemas and one table, no I/O. I ran the walk
under `tsx` while writing this register: it completes instantly and the config and channel modules
are Babylon-free by the package's own entry-point rule, so it runs in Node with no setup.

**It failed on its first run with 379 waivers, and the number has been falling ever since.** The
first measurement against the tree found 129 unreachable leaves on `NodeStyle` and 250 on
`EdgeStyle`; by the time the waiver list was written the label vocabulary and the six arrow
channels had landed and it was 86 and 207. The current numbers are in section 3.4.

Both halves of the check have now fired for real, on this branch, against work in flight:

- Removing one waiver for a field that is genuinely unreachable names the field --
  `expected [ "texture.image" ] to deeply equal []`.
- Waiving `arrowHead.size`, `arrowHead.color` and `arrowHead.opacity`, which is what the register
  described before the channels were published, fails the other way: *"These EdgeStyle fields have
  a channel now and are still waived. Delete the waiver -- while it is there, the catalogue tells
  a consumer the capability is missing when it has arrived."*
- And it caught a live one without being asked: when `effect.outline.width` and `texture.image`
  were deleted from `NodeStyle`, the waivers naming them failed within the minute, because a
  waiver that outlives its schema field tells the next reader the wrong thing.

### 2.3 A renderable channel must be proven to paint

`test/session/styles/channels.test.ts:101-106` is today's version of this check:

```
const unrenderable = CHANNELS.filter((channel) => !CHANNEL_DESCRIPTORS[channel].renderable);
assert.deepEqual(unrenderable, ["node.marker"]);
```

It reads `renderable` out of the table and asserts that the table said what it said. It cannot
fail for any reason connected to the renderer. This is why `node.tooltip` and `edge.tooltip` are
published as `renderable: true`, sold in `docs/guide/styling.md` as "the words to show on hover",
and drawn by nothing in either version of the package.

BUILT, and it is the piece that paid for itself. `graphty-element/test/browser/channel-paints.test.ts`
is in the `contract` project, runs 32 cases in 8.9 seconds, and mounts one graph per target. For
each renderable channel it takes a reading, adds a layer writing that channel a value far from the
default, reads again, removes the layer and reads a third time -- so a channel that changes nothing
fails, and a probe that does not clean up after itself fails too.

A reading is the scene graph AND a histogram of the frame. The structural half alone was tried
first and was not enough: a node's glow colour and its outline colour both draw through a Babylon
effect LAYER, which keeps its per-mesh colours in a private map, so a purely structural reading
called both of them unpainted when one of them paints perfectly well. Every pixel is quantised to
four bits per channel and counted; two renderings of an unchanged scene give byte-identical
histograms, so "the picture changed" is asked with a threshold near zero rather than a tolerance
wide enough to swallow a real change.

Six channels could not pass, and three of the six were not in this register before this test
existed. They are rows 8, 35, 36 and 37, and they are recorded in `UNPAINTED_CHANNELS` in
`src/catalog/unreachable.ts` with the pixel counts that were measured.

**What it costs.** The `contract` project exists, runs in the pre-push gate and costs about 25
seconds today, roughly half of which is the fixed price of starting a browser project at all; its
own header says adding a file to it is cheap for that reason. Budget five to ten seconds for two
mounts and twenty-one toggles.

This is the expensive third of the mechanism and the one most likely to be cut. If it is cut, say
so out loud, because it is the only one of the three that catches a channel that claims to paint
and does not.

### 2.4 The CLAUDE.md rule -- necessary, and not sufficient

LANDED, as a section of `graphty-element/CLAUDE.md` headed "A story is a test, and a capability
must never lose its last door quietly", with a fourth rule added to the three below: when one of
the three contract tests goes red, the fix is to write the answer down, not to loosen the test,
and each test's failure message says which sentence it wants and where it goes.

The three rules as specified:

- **A story is a test.** Everything the no-weakening rule says about a test applies to a story:
  never delete one, never hollow one out. If a story pins behaviour that is deliberately going
  away, replace it with one that pins the new behaviour, and record the removal in the roster.
- **A capability that loses its only public route is a blocking finding, recorded in the
  repository before the change lands** -- a row in `design/element-api/capability-losses.md`, not a
  comment in the file being gutted and not a paragraph in an agent report.
- **An agent that computes a loss list writes it to a file before it reports**, and puts "what I
  could not do" at the TOP of its report. The tail is what a truncated notification drops.

Why this is not sufficient, stated plainly because it is the whole reason the other three exist:
the agent that deleted the twenty stories complied with every instruction it had, understood the
loss precisely, and wrote it down three times. A rule is read by whoever reads it. A red test is
read by everyone, including CI, including the next agent, including an owner who was not in the
room. The rule's job here is to say what to do WHEN the test goes red -- write the retired entry,
write the register row -- not to be the thing that catches it.

### 2.5 Rejected: a lint or CI check on deletions in `stories/` and `test/`

Rejected, and the reason is specific rather than aesthetic. Every one of the twenty deletions was
performed by a `python3` heredoc inside a Bash call, not by an `Edit` or a `Write`. Any hook that
watches the file-editing tools sees nothing at all. A CI check on the branch diff
(`git diff --stat origin/master...HEAD -- stories/`) does see it, but it fires on every legitimate
refactor and its only possible verdict is "a human should look at this" -- which is the verdict
that already failed three times in this exact change set. The roster test is the same check with a
specific failure message and a place to write the answer.

---

## 3. The register of losses

Classification: **unreachable** = built and drawn, no public route. **lost** = worked in 1.x, does
not now. **undemonstrated** = published or claimed, never drawn in any version. **replaced** =
superseded, deliberate. **deliberate** = removed on purpose and recorded.

Consumer impact: **blocking** = a consumer cannot do a thing the package's own schema, type or
docs say they can. **visible** = wrong picture or wrong default. **latent** = misleading surface,
no wrong picture today.

| # | Capability | Where | Class | Impact | Fix | Lane |
|---|---|---|---|---|---|---|
| 1 | Arrow head and tail size | `EdgeStyle.ts:28`; drawn at `EdgeMesh.ts:359-362`, `Edge.ts:1006` | unreachable | blocking | publish `edge.arrowHeadSize` / `edge.arrowTailSize` | B |
| 2 | Arrow head and tail colour | `EdgeStyle.ts:29`; drawn at `Edge.ts:260,274,546,564` | unreachable + wrong default | blocking + visible | publish the two colour channels AND drop the pinned default (see 3.1) | B |
| 3 | Arrow head and tail opacity | `EdgeStyle.ts:30`; drawn at `EdgeMesh.ts:405` | unreachable | blocking | publish the two opacity channels | B |
| 4 | Arrow captions (a full rich-text block at each end, 118 leaves) | `EdgeStyle.ts:31`; drawn at `Edge.ts:678-703`, positioned at `Edge.ts:91-94,436-442` | unreachable | blocking | PUBLISHED, option B of the 2026-09-22 decision memo. Four channels: `edge.arrowHeadText` and `edge.arrowTailText` carry the words, `edge.arrowHeadTextStyle` and `edge.arrowTailTextStyle` carry the appearance as a `LabelStyle`. The captions route through the same label-options builder an edge's own label goes through, so what is left unreachable is the sixteen-leaf residue a label already leaves. `test/browser/an-arrow-caption-draws.test.ts` is the proof a caption draws | B |
| 5 | Label appearance beyond seven fields: location, attachOffset, four margins, lineHeight, textAlign, cornerRadius, borders, five text-shadow fields, four gradient fields, six pointer fields, animation and speed, badge and icon, three depth-fade fields, smartOverflow / maxNumber / overflowSuffix, textOutlineWidth | `RichTextStyle.ts`, 49 unreachable leaves on `label` for both node and edge; every one read by `RichTextLabel.ts` | unreachable | blocking | widen `LabelStyle` and `richTextOf` (see 3.2) | A |
| 6 | Seventeen label stories and three arrow stories | 150 exports on `origin/master`, 131 in the tree; `LabelStyles` 28 to 11, `EdgeStyles` 11 to 9, deleted in `ff12a515` | lost | blocking | RESTORED. All twenty are back; the tree exports 151 and `stories/story-roster.json` names every one | A, B |
| 7 | The Chromatic baselines over the label and arrow renderers | a deleted story produces no snapshot; `ci.yml:622` fails only on a CHANGED one | lost | latent | RESTORED with the stories. `test/contracts/story-roster.test.ts` stops the next one, and catches a retitled meta or a renamed export too -- both of which orphan a baseline exactly as a deletion does | C |
| 8 | Node and edge tooltips | was: both channels `renderable: true`, sold in `docs/guide/styling.md` as "the words to show on hover", drawn by nothing in any released version | undemonstrated | blocking | CLOSED, and differently at each end. A NODE tooltip is drawn now -- `Node.showTooltip` builds it, `NodeBehavior` raises and lowers it with the pointer, `test/browser/node-tooltip-on-hover.test.ts` drives that with a real pointer -- and 2.0 publishes `node.tooltipStyle` beside `node.tooltip` so its typeface, panel and colours are reachable, proved by `test/browser/node-tooltip-style-draws.test.ts`. The EDGE tooltip is WITHDRAWN: an edge cannot be hovered (`isPickable = false` in three places, the same fact that leaves `edge-click` unemitted), so the channel and the whole `tooltip` block are gone from `EdgeStyle`, recorded in `WITHDRAWN_CAPABILITIES` and pinned by `test/browser/an-edge-tooltip-is-withdrawn.test.ts`. It comes back with edge picking | B |
| 9 | `line.patternCount` -- the documented user cap on pattern elements | `EdgeStyle.ts:65` with a 17-line comment calling it "a USER choice, deliberately"; drawn at `EdgeMesh.ts:305`, `PatternedLineMesh.ts:85-89,577-587` | unreachable | blocking | publish `edge.patternCount` | B |
| 10 | `effect.glow.strength` | `NodeStyle.ts:105`; drawn at `NodeEffects.ts:229` | unreachable | blocking | publish `node.glowStrength`, with the per-layer caveat (6.4) | B |
| 11 | `effect.outline.width` | was `NodeStyle.ts:112`; read by nothing -- `NodeEffects.applyOutlineEffect` uses the colour alone | undemonstrated | latent | DONE. The field is gone from `NodeStyle.effect.outline`, so nothing accepts a width and ignores it, and `node.outline`'s caveat now blames the renderer that owns the limit rather than the channel table: Babylon's highlight LAYER holds the stroke width for the whole scene, so one width is drawn for every outline on screen. The sentence exists once, as `NODE_OUTLINE_CAVEAT` in `session/styles/channels.ts`, and is what a refusal quotes -- see row 26 | D |
| 12 | `texture.image` -- a node texture from a URL | `NodeStyle.ts:90`, a validated `z.url()`; read by nothing in either version | undemonstrated | latent | delete, or implement with a channel | D |
| 13 | `GraphStyle.effects` -- motion blur, depth of field, screen-space reflections | `GraphStyle.ts:28-35`; no reader anywhere | undemonstrated | latent | delete the block | D |
| 14 | `NodeStyle.enabled` / `EdgeStyle.enabled` | were `NodeStyle.ts:125` and `EdgeStyle.ts:77`, both `default(true)`; only `label.enabled` was ever read | replaced (by the session visibility mask) | latent | WITHDRAWN in 2.0. Both fields are deleted rather than annotated: the schemas are strict, so a document that still carries one is a parse error naming the key instead of a switch that silently does nothing. The record and the replacement -- the session's filters for an element, `labelStyle.enabled` for its words -- are in `WITHDRAWN_CAPABILITIES` in `src/catalog/unreachable.ts`, checked by `test/contracts/withdrawn-capabilities.test.ts` | D |
| 15 | `behavior.layout.minDelta` | `GraphBehavior.ts:30`, settable through the public `layoutBehavior` property, read by nothing; `graphty-element.ts:937` claims it paces the layout | lost | latent | implement the threshold, or delete the field, the doc sentence and the eight test call sites | D |
| 16 | On-demand expansion: `behavior.fetchNodes` / `fetchEdges` | `GraphBehavior.ts:41-42`, parsed into the config by `Graph.setLayoutBehavior:792`; `NodeBehavior.ts:561` reads `graph.fetchNodes`, a field nothing assigns from the config | unreachable | blocking | assign both from the parsed config in `setLayoutBehavior` | D |
| 17 | The `style-changed` DOM event | still in the exported union at `events.ts:152` with a live case at `EventManager.ts:469`; its only 1.x emitter was `StyleManager.ts:249`, deleted | lost | latent | emit it on a style-stack change, or delete the union member and the case | D |
| 18 | Customising the selected-node highlight | 1.x `SelectionManager.getSelectionStyleLayer` / `setSelectionStyleLayer`; 2.0 hard-codes a gold halo at `Node.ts:43-55` and element-owned layers are `E_PROTECTED` | lost | blocking | give the halo a session-owned surface: colour, scale, alpha | D |
| 19 | `EdgeLinePattern` names seven patterns the renderer cannot draw and omits seven it can | `catalog/types.ts:343-353` vs `EdgeStyle.ts:35-45`; only `solid` and `dash-dot` overlap, and `channels.test.ts:134-143` asserts the discrepancy exists | undemonstrated | blocking | derive the type from the schema enum, as `channels.ts` already derives `EDGE_LINE_VALUES` | B |
| 20 | `LabelStyle.maxWidth` and `wrap` | were published on the type a consumer writes, and `richTextOf` never wrote either | undemonstrated | latent | DONE, by deleting both. They were never in 1.x -- absent from the renderer's schema, the 1.x template and the 1.x docs -- so no released consumer loses anything, and wrapping stays unimplemented deliberately (the 2026-09-22 decision memo, section 3). The two channel caveats that described them are deleted too, pinned by `test/session/styles/channels.test.ts`; `docs/guide/styling.md` records the answer that is actually true today, which is a hard newline in the words | A |
| 21 | `docs/guide/style-helpers.md` -- 227 lines of a `StyleHelpers` namespace that does not exist | in the site nav at `.vitepress/config.ts:62`; `grep StyleHelpers src/ index.ts schema.ts` returns nothing. Every code block on the page throws | lost | blocking | rewrite around `encode` + the palette catalogue, or export the ramp functions from a real entry point | D |
| 22 | `element.takeScreenshot()` / `checkScreenshotCapability()` taught by two guides | `web-component.md:476,482`, `javascript-api.md:249,256`; the real names are `captureScreenshot` (`graphty-element.ts:1306`) and `canCaptureScreenshot` (`:1329`), which `screenshots.md` uses correctly | lost | blocking | rename the four call sites | D |
| 23 | Three of the four element-level `graphty-*` events have no doc, no test and no story | `graphty-run-change`, `graphty-selection-change`, `graphty-visibility-change`, dispatched at `graphty-element.ts:169,189,208` | undemonstrated | latent | document in `docs/guide/events.md`, one test each | D |
| 24 | Gradient and radial-gradient node fills | `AdvancedColorStyle` in `config/common.ts:29-44`, built at `NodeMesh.ts:361-362`, still tested; `node.color` carries a solid only and `StylePainter.ts:220-225` overwrites `texture.color` with a neutral solid | unreachable | blocking | a channel carrying an `AdvancedColorStyle`, or record the removal and delete the renderer branch (6.5) | D |
| 25 | Switching a label off while keeping its text | `RichTextStyle.enabled`, read at `Node.ts:936` / `Edge.ts:656`; `StylePainter.ts:186-188` sets it true whenever text is written and nothing can write false | lost | latent | add the flag to the widened `LabelStyle` | A |
| 26 | AI control of arrow size, arrow colour, glow strength, outline width | `ai/commands/StyleCommands.ts` advertised all four to the model and refused all four | lost | visible | DONE. An arrow's colour, size and opacity and a glow's strength are written to their own channels now, so nothing is refused for them. An outline WIDTH stays refused, because no renderer can draw a per-node one (row 11), and the refusal carries that reason in the element's own published words instead of the bare word "unsupported" -- a reader is told what the element draws instead rather than that a word was dropped | B |
| 27 | `stories/LayeredStyles.stories.ts::ArrowSizeVariations` -- name and doc comment both false | comment promises "small arrows (0.5)" and "large arrows (2.0)"; all three layers write only `edge.arrowHead: "normal"`, and `assertEdgeVariety(scene, 2)` passes on a colour layer | undemonstrated | latent | restore the sizes once 1 lands | B |
| 28 | Four more hollowed-out stories | `ArrowText.stories.ts:42-46`, `BidirectionalArrows.stories.ts:36-39`, `EdgeStyles.stories.ts::TwoDAllArrows:279-282`, `LabelStyles.stories.ts::TextOutline:378-380` -- each still named for what it no longer draws | undemonstrated | latent | restore once the channels exist | A, B |
| 29 | `torus`, the 25th node shape, drawn by no story | added at `NodeStyle.ts:56`; `stories/helpers.ts:755` hardcodes 24 names | undemonstrated | latent | derive the story's list from `NodeShapes.options` | A |
| 30 | Data field paths read but not settable: `knownFields.nodeLabelPath`, `edgeWeightPath`, `positionScale`, `directed` | read at `algorithms/results/labels.ts:35`, `DataManager.ts:916,318`, `GraphStore.ts:533`; the element writes the config document at six `setDeep` paths and none is these | unreachable | blocking | reflecting properties, as `nodeIdPath` already has | D |
| 31 | Per-algorithm suggested-style tests (22 files, dijkstra 14 cases to 3) | dropped in `13125c76`, which in the same commit added `test/algorithms/derived-styles.test.ts`, table-driven over `BUILT_IN_ALGORITHMS` | replaced | none | none -- noted so the next mechanical audit does not re-flag it | -- |
| 32 | Three tests in `test/unit/node-mesh-disposed-regression.test.ts` (7 to 4) | dropped in `35c48108`; all three were about `styleUpdates`, which 2.0 removed. No replacement pins "a disposed mesh is rebuilt when a style change arrives" through the new repaint path | deliberate, incompletely replaced | latent | one test on the new path | D |
| 33 | Two assertions in `test/integration/Edge.integration.test.ts` | `assert.equal(edge.styleId, ...)` twice; what survives only checks an arrow mesh appears | lost | latent | re-pin on the paint's `meshKey` or `edge.currentStyle` | B |
| 34 | The 1.x style template, `StyleManager`, `calculatedStyle`, `StyleHelpers`, per-algorithm `suggestedStyles`, the `applySuggestedStyles` options, `edge-click` | register rows at `element-api-migration.md:123,135,165,213,214,238,239`; `edge-click` reasoned at `events.ts:400-405` and never emitted in 1.x either | deliberate | none | none. These are the major, correctly recorded | -- |
| 35 | A node outline is never drawn, at all, in any circumstance | FIXED. `NodeEffects.applyOutlineEffect` handed `HighlightLayer.addMesh` the node's InstancedMesh; Babylon renders an instance through its SOURCE mesh, so the layer was given a mesh it never consults, and `addMesh` subscribes to `onBeforeBindObservable`, which `InstancedMesh` does not declare -- so the call threw and a `try/catch` swallowed it under the comment "this is expected for instanced meshes". It now resolves the rendered mesh first, as the glow path always did, and there is no catch. The highlight layer is also created lazily now, so a graph that outlines nothing no longer pays for a full-screen post-process | was undemonstrated | was blocking | landed: `src/meshes/NodeEffects.ts`. Pinned by `test/browser/a-layer-added-later-paints.test.ts`, which measured 0 pixels for the old code and requires a moved frame; the `node.outline` waiver is deleted | D |
| 36 | A glow COLOUR added to a graph already on screen is ignored | FIXED, in two halves. `Node.paintFrom` applied a node's effects only on the branch that rebuilds its mesh, so no `instance` channel could reach the screen after the first paint; it now applies them on both branches, which is what the `instance` role means. And `node.glow` is a `mesh` channel now, because Babylon can only express a glow colour per SOURCE mesh -- two nodes sharing one cannot glow two colours -- so `instance` was the table promising what the renderer cannot do. `node.glowStrength`, which had been made `mesh` purely to force the rebuild, is `instance` again and mints no source mesh | was lost | was visible | landed: `src/Node.ts`, `src/session/styles/intern.ts`. Pinned by `test/browser/a-layer-added-later-paints.test.ts`, including a strength raised over a graph that is already glowing; the `node.glow` waiver is deleted | D |
| 37 | An arrow cap COLOUR added to a graph already on screen is ignored | FIXED. Both cap colours are `mesh` channels, so they belong in the number a source mesh is keyed on -- and the interner's push had branches for a number, a flag and a word, while a resolved colour is an object. Every colour therefore folded into the key as "nothing painted this", the key never moved, and `Edge.paintFrom` returned early without rebuilding the cap. A cap SIZE written afterwards did move the key, which is how the resolved colour was shown to have been right the whole time. `pushMeshValue` now folds a colour in as its four components | was lost | was visible | landed: `src/session/styles/repaint.ts`. Pinned by `test/session/styles/arrow-channels.test.ts` on the key and `test/browser/a-layer-added-later-paints.test.ts` on the frame; both cap-colour waivers are deleted | B |

### 3.1 Settled: the arrow head is pinned grey, and the two ends of one edge disagree

Two of the four reports disagreed about arrow colour. One said it falls back to the line colour;
one said it is hard-pinned. **The second is right, and the consequence is worse than
unreachability.** Verified by running the schemas:

- `defaultEdgeStyle.arrowHead` is `ArrowStyle.parse({type: "normal", color: "darkgrey"})`
  (`EdgeStyle.ts:86-89`).
- `EDGE_BASE = EdgeStyle.parse(defaultEdgeStyle)` (`StylePainter.ts:58`) is therefore
  `{type: "normal", size: 1, color: "#A9A9A9", opacity: 1}`. It has **no `arrowTail` key at all**,
  because `arrowTail` is optional and `defaultEdgeStyle` does not mention it.
- `edgePaintOf` finishes with `defaultsDeep(bag, cloneDeep(EDGE_BASE))` (`StylePainter.ts:258`).

So a painted edge always carries `arrowHead.color === "#A9A9A9"`, and `Edge.ts:260`'s
`style.arrowHead?.color ?? style.line?.color ?? "#FFFFFF"` can never reach its second term -- that
fallback is dead code. Meanwhile a layer that writes `edge.arrowTail` produces `{type}` alone, the
fallback DOES fire, and the tail follows the line. **Paint an edge magenta with both caps on and
you get a magenta tail and a grey head on the same line.**

`docs/guide/styling.md:137-140` says an arrow's appearance "follows the element it is attached
to", and `ai/commands/StyleCommands.ts:117-118` says the same. For the head, both are false.

The fix is two deletions plus the channels: drop `color: "darkgrey"` from
`defaultEdgeStyle.arrowHead`, and drop `.default("white")` from `ArrowStyle.color`. Either one
alone leaves the pin in place, because `EdgeStyle.parse` fills the schema default whenever the
`arrowHead` key is present. With both gone the existing `??` chain fires, an unstyled arrow
follows its line at both ends, and the new channels override it. **This changes the picture** --
today every arrow head is grey on every edge -- so it is a changelog entry in its own right.

`size` and `opacity` keep their defaults; the renderer's own `?? 1.0` agrees with them and nothing
is hidden by them.

### 3.2 Settled: the seventeen label stories are not migratable as written

The brief and one report say the seventeen migrate to
`setup: storySetup({ node: { "node.labelStyle": {...} } })` because all seventeen fields still
exist in `RichTextStyle`. The fields exist. Nothing carries them.

`node.labelStyle` accepts `LabelStyle` -- `font`, `sizePx`, `weight`, `color`, `background`,
`outline`, `padding`, `maxWidth`, `wrap` (`catalog/types.ts:367-377`). `richTextOf`
(`StylePainter.ts:117-149`) builds a FRESH object with seven of those nine translated into
rich-text keys and discards anything else without a word; `maxWidth` and `wrap` are dropped by
design. `writeChannel` then writes those keys one at a time, deliberately never the whole block.

Measured, rather than counted from a report: `RichTextStyle` has **59 leaves**. Ten are reachable
on a label (`text`, `enabled`, and the eight `richTextOf` writes). Forty-nine are not, and all
fifty-nine are read by `RichTextLabel.ts`. On a tooltip, two are reachable and fifty-seven are not,
and none of the fifty-nine is drawn at all.

So Lane A's first job is the vocabulary, and the stories come second. Written today, each of the
seventeen would render the default.

### 3.3 Settled: the layout pacing settings ARE reachable -- except one

One report listed `behavior.layout.preSteps`, `stepMultiplier` and `zoomStepInterval` as public
surfaces nothing reaches. They are reachable: `<graphty-element>` has a `layoutBehavior` property
(`graphty-element.ts:950-976`) whose setter calls `Graph.setLayoutBehavior` (`Graph.ts:792`), which
merges one level deep into `styles.config.behavior`. All three are read
(`LayoutManager.ts:214`, `UpdateManager.ts:459`, `UpdateManager.ts:605`).

`minDelta` is the real defect and it is the opposite shape: a consumer CAN set it, the element's
own JSDoc at `graphty-element.ts:937` says it paces the layout, eight test files set it believing
that, and nothing anywhere reads it. Row 15.

### 3.4 The arithmetic

These numbers are now produced by `test/contracts/config-reachability.test.ts` rather than by a
one-off walk, so they cannot go stale without a red test. They differ from the first hand
measurement in two ways: the test descends into the arms of a colour union, so `texture.color`
contributes five leaves rather than one and a rich-text block contributes 64 rather than 59; and
Lanes A, B and D have landed the label vocabulary, six arrow channels, `edge.patternCount`,
`node.glowStrength`, and the deletion of `texture.image` and `effect.outline.width`.

As the gate measures the tree today:

| Schema | Leaves | Reachable | Waived |
|---|---|---|---|
| `NodeStyle` | 143 | 59 | 84 |
| `EdgeStyle` | 272 | 65 | 207 |

The first run of the same gate, before those lanes landed, read 129 unreachable on `NodeStyle`
and 250 on `EdgeStyle`.

The 84 on nodes are: 62 on the tooltip, 16 on the label, four arms of `texture.color`,
`texture.icon` and `enabled`. The 207 on edges are: 64 per arrow caption block, 62 on the
tooltip, 16 on the label, and `enabled`. So two things now account for nearly all of it -- a
tooltip nothing draws (row 8) and a caption block nothing can reach (row 4) -- and both are
owner decisions rather than oversights.

Story count: 150 exported stories on `origin/master`, 131 in the tree when this register was
written, 151 now. All twenty that were removed are back and `Styles/Edge::ArrowHead` is new; the
roster and Storybook's live index agree on all 151.

---

## 4. Lane assignment

Four lanes, file-disjoint, plus a prelude and one deliberately shared data file. Both exceptions
are named here rather than discovered as a merge conflict.

### Prelude (lands before the lanes fork; roughly ten lines)

DONE, and not by Lane C: `src/catalog/label-style.ts` exists, `types.ts` re-exports `LabelStyle`
from it, and the file goes further than the prelude asked -- it also publishes
`LABEL_STYLE_FIELDS`, an iterable list of the vocabulary's own field names declared
`satisfies Record<keyof LabelStyle, 0>`, which a settings panel, a Storybook control and the
reachability gate all read instead of each restating the names. `src/catalog/index.ts` now
exports it and the label vocabulary's own enums from `./catalog`.

### LANE A -- the label vocabulary and the seventeen stories

Owns:
- `src/catalog/label-style.ts` (created by the prelude)
- `src/managers/StylePainter.ts`
- `stories/LabelStyles.stories.ts`
- `stories/helpers.ts`
- `test/session/styles/label-style.test.ts` (new)

Work, in order:
1. Widen `LabelStyle` to cover what `RichTextLabel` draws, in reader-named fields, and extend
   `richTextOf` to translate each one. The seventeen subjects are the acceptance criterion:
   `enabled`, `location`, `attachOffset`, the four margins, `lineHeight`, `textAlign`,
   `cornerRadius`, `borderWidth`/`borderColor`, the five text-shadow fields, the four gradient
   fields, the six pointer fields, `badge` and its icon fields, `animation`/`animationSpeed`, the
   three depth-fade fields, `smartOverflow`/`maxNumber`/`overflowSuffix`, and
   `textOutlineWidth`. Roughly twenty-five fields.
2. DONE: `maxWidth` and `wrap` (row 20) are deleted from the interface rather than implemented,
   and the two channel caveats that described them are gone with them.
3. Update `LABEL_FIELDS` in `stories/helpers.ts:330`, which hardcodes the seven, so the Storybook
   controls reach the new fields.
4. Restore all seventeen stories in the 2.0 `setup: storySetup(...)` form, each with a `play`
   function that asserts what the story is about -- not merely that it mounted.
   `stories/assertions.ts` already exports `assertLabelColour`, `assertLabelsDrawn`,
   `assertLabelInkAtLeast`, `pixelsOfColour` and `assertDistinctPicture`; several of the seventeen
   (Margin, AttachOffset, Location, CornerRadius, Pointer, Badge) need a new reader that measures
   label geometry or ink position rather than colour.
5. Un-hollow `LabelStyles::TextOutline` (row 28) and remove the header comment at lines 20-34 that
   records the gap, since the gap is closed.
6. Derive the shape list at `stories/helpers.ts:755` from `NodeShapes.options` (row 29) -- a
   one-liner in a file this lane already owns, which is why it sits here rather than with its
   topic.
7. Delete this lane's rows from `src/catalog/unreachable.ts`.

### LANE B -- the arrow channels and the three edge stories

Owns:
- `src/catalog/types.ts`
- `src/session/styles/channels.ts`
- `src/session/styles/intern.ts`
- `src/config/EdgeStyle.ts`
- `src/ai/commands/StyleCommands.ts`
- `stories/EdgeStyles.stories.ts`, `stories/LayeredStyles.stories.ts`,
  `stories/BidirectionalArrows.stories.ts`, `stories/ArrowText.stories.ts`
- `test/session/styles/channels.test.ts`, `test/integration/Edge.integration.test.ts`
- `docs/guide/styling.md`

Work, in order:
1. Publish six arrow channels (names and reasoning in section 5). Each needs three edits and no
   more: a member of the `Channel` union, a row in `CHANNEL_DESCRIPTORS` with its `stylePath`, and
   a role in `CHANNEL_ROLES` (`intern.ts:69`) -- all six are `"mesh"`, because a different arrow
   size or colour is a different source mesh. `writeChannel` is table-driven and needs no change.
2. Unpin the head colour: remove `color: "darkgrey"` from `defaultEdgeStyle.arrowHead` and
   `.default("white")` from `ArrowStyle.color` (section 3.1). Both, or the pin survives.
3. Publish `edge.patternCount` (row 9) and `node.glowStrength` (row 10) -- same three edits each.
4. Derive `EdgeLinePattern` from the line-pattern enum (row 19) and delete the
   `channels.test.ts:134-143` case that asserts the discrepancy exists.
5. Restore `ArrowSize`, `ArrowOpacity` and `ArrowColor` with asserting `play` functions;
   `assertArrowCapsDrawn` and `assertArrowVariety` already exist, and arrow size needs a new reader
   that measures the cap mesh's bounding box.
6. Fix `LayeredStyles::ArrowSizeVariations` so its name and comment stop lying (row 27), and
   un-hollow `ArrowText`, `BidirectionalArrows` and `EdgeStyles::TwoDAllArrows` (row 28).
7. Delete the four `unsupported.push` branches in `StyleCommands.ts` (row 26) once the channels
   exist.
8. Re-pin the two assertions lost from `Edge.integration.test.ts` (row 33).
9. Update the arrow sentence in `docs/guide/styling.md:137-140`, which is currently false for the
   head in both directions.
10. Delete this lane's rows from `src/catalog/unreachable.ts`.

### LANE C -- the prevention mechanism

Owns:
- the prelude (move `LabelStyle` out of `types.ts`)
- `stories/story-roster.json` (new), `test/contracts/story-roster.test.ts` (new)
- `src/catalog/unreachable.ts` (new), `test/contracts/config-reachability.test.ts` (new)
- `src/catalog/index.ts`
- `test/browser/channel-paints.test.ts` (new)
- `graphty-element/CLAUDE.md`
- `design/element-api/capability-losses.md` (this file)

DONE. The roster was seeded with the 131 stories then on disk and the twenty retired ones, each
with its reason; as Lane A and Lane B restored them the `retired` array emptied, which is the
workflow this design predicted and the state the tree is in now. The waiver list was seeded from
what the gate measured rather than from this document, and it has already been pruned twice by
its own failures -- once for the six arrow channels, once for the two schema fields Lane D
deleted.

The warning about 2.3 was heeded: the `renderable` self-assertion at
`test/session/styles/channels.test.ts:101-106` is a Lane B file and was left alone. The new
browser test stands beside it. Deleting the old case is a one-line follow-up for whoever lands
Lane B, and it should be deleted -- a check that reads a table and asserts the table said what it
said is worse than no check, because it looks like coverage.

### LANE D -- the rest of the unreachable surface, in priority order

Owns:
- `src/Node.ts`, `src/Edge.ts`, `src/NodeBehavior.ts`, `src/Graph.ts`
- `src/graphty-element.ts`, `src/events.ts`, `src/managers/EventManager.ts`
- `src/config/NodeStyle.ts`, `src/config/GraphStyle.ts`, `src/config/GraphBehavior.ts`,
  `src/config/DataConfig.ts`
- `docs/guide/style-helpers.md`, `docs/guide/web-component.md`, `docs/guide/javascript-api.md`,
  `docs/guide/events.md`
- new stories and tests for what it builds

Lane D has plenty. In priority order:

1. **Tooltips (row 8).** DONE, and split in two. The node's hover renderer is built and its
   appearance is published as `node.tooltipStyle`; the edge's is withdrawn, because an edge cannot
   be hovered at all (6.2). Nothing is left open here.
2. **`docs/guide/style-helpers.md` (row 21).** 227 lines in the site nav where every code block
   throws, teaching an import that does not resolve. A consumer following this page cannot
   succeed.
3. **On-demand expansion (row 16).** `setLayoutBehavior` parses `fetchNodes`/`fetchEdges` into the
   config and `NodeBehavior` reads them off a bare `Graph` field nothing assigns. Two lines, plus a
   test that double-click expansion works through the public property rather than a field poke.
4. **Data field paths (row 30).** Reflecting properties for `nodeLabelPath`, `edgeWeightPath`,
   `positionScale` and `directed`, following `nodeIdPath`.
5. **Selection highlight (row 18).** 1.x let a consumer restyle a selected node; 2.0 hard-codes a
   gold halo and deliberately keeps it out of the layer stack, so it cannot be reached by adding a
   layer either. It needs a session-owned surface.
6. **Gradient node fills (row 24)** -- publish or withdraw; see 6.5.
7. **`minDelta` (row 15), `style-changed` (row 17), the disposed-mesh regression test (row 32).**
8. **`takeScreenshot` in two guides (row 22)** and **the three undocumented `graphty-*` events
   (row 23)**.
9. **Dead schema fields (rows 11, 12, 13, 14)** -- delete or annotate, so a reader of the published
   schema can tell a placeholder from a feature.

---

## 5. Lane B: the channel names, decided

**Six channels: `edge.arrowHeadSize`, `edge.arrowHeadColor`, `edge.arrowHeadOpacity`,
`edge.arrowTailSize`, `edge.arrowTailColor`, `edge.arrowTailOpacity`.**

Four reasons, and the third is the one that rules out every alternative.

1. **The table's own rule is one channel, one field, one `stylePath`.** Every descriptor declares
   the field of the parsed style its value lands on, and `writeChannel` writes exactly that path.
   A shared `edge.arrowSize` would need two paths -- `arrowHead.size` and `arrowTail.size` -- which
   the descriptor cannot express and the painter cannot write without a special case, and the
   moment there is a special case the table has stopped being the single source of truth.
2. **The published vocabulary already spells arrows head-and-tail.** `edge.arrowHead` and
   `edge.arrowTail` are the existing names. Adding `edge.arrowSize` beside them would give one pair
   of drawn objects two naming schemes at once.
3. **Encodings need scalars, and the deleted story was an encoding.** A layer binds a channel to
   data through a scale: `{"edge.arrowHeadSize": {by: "data.weight", scale: "linear",
   range: [0.5, 2]}}`. That only works if the channel's value is a number. Making
   `edge.arrowHead` accept an object `{type, size, color, opacity}` -- the tempting shape, by
   analogy with `labelStyle` -- would make it un-encodable, and "arrow size by edge weight" is
   precisely what `LayeredStyles::ArrowSizeVariations` claims to demonstrate and cannot. It would
   also break every existing layer, theme and document that writes `"edge.arrowHead": "normal"`,
   for no gain.
4. **The tail is not optional, and this is where a half-fix would show.** Publishing the head
   alone would leave the live asymmetry in place: with the colour pin removed, a tail follows its
   line and a head would still have no way to be told anything. It would also silently withdraw a
   1.x capability -- a large head with a small tail -- that costs three more table rows to keep.

Naming detail: `edge.arrowHeadColor`, not `edge.arrowHeadColour`. The published vocabulary is
`node.color` and `edge.color`; the prose in this repository is British and the identifiers are
not, and the identifiers win.

`plainName` values for the catalogue and the Storybook controls: "Arrow Head Size", "Arrow Head
Colour", "Arrow Head Opacity", and the tail equivalents -- `plainName` is prose, so it takes the
repository's spelling.

Bounds, taken from the schema so the control cannot offer what the renderer rejects: size is a
positive number with `min: 0`; opacity is `min: 0, max: 1`; colour takes any colour the element
understands, through `toColorValue`.

Six is also the number that empties the waiver list for arrows except the caption block, which is
row 4 and is a separate decision.

---

## 6. Decisions only the owner can make

These are one-way doors: each publishes or withdraws part of a 2.0 public surface.

**6.1 How wide does `LabelStyle` get?** Lane A's proposal is about twenty-five reader-named fields
covering everything `RichTextLabel` draws, keeping the closed-vocabulary property and the
translation layer. The alternative is making the channel's value type `RichTextStyle` itself,
which collapses `richTextOf` entirely but publishes renderer-shaped names -- `billboardMode`,
`resolution`, `autoSize` -- as permanent public API. The first can be widened later; the second
cannot be narrowed.

**6.2 Tooltips: build or withdraw?** SETTLED, and differently at each end -- which is the whole
finding, because the two channels looked like one question and were not. A NODE tooltip was
BUILT: `Node.showTooltip` draws it, `NodeBehavior` raises and lowers it with the pointer, and 2.0
publishes `node.tooltipStyle` beside `node.tooltip` so a consumer can say what it looks like
rather than taking the element's defaults. An EDGE tooltip was WITHDRAWN, per section 2 of
`design/element-api/owner-decisions-2026-09-22.md`: a tooltip needs the pointer to land on the
thing it belongs to, and an edge is not pickable -- `isPickable = false` in three places, the
same fact that leaves `edge-click` unemitted -- so building it means building edge picking first,
over instanced lines, patterned meshes and bezier curves. The channel and the whole `tooltip`
block are gone from `EdgeStyle` rather than published `renderable: false`, because a strict
schema that refuses the key tells a consumer more than a flag they have to go and read. Leaving
either as it was is the one option `events.ts` explicitly forbids: "A declared event that never
fires is a documented lie."

**6.3 Arrow captions: publish or delete?** SETTLED 2026-09-22 -- publish, option B of
`design/element-api/owner-decisions-2026-09-22.md`. Four channels went out, two per end: the words
and the appearance. Three things changed beside the table entries. `StylePainter.writeChannel`
derives the `enabled` flag a text channel switches on from the leaf's PARENT rather than from the
first segment of its style path, which is identical for every channel published before this one
and wrong for a caption, whose words are three segments deep. `Edge.createLabelOptions` takes the
rich-text block rather than the whole edge style, as the node's equivalent already did, so all
three of an edge's pieces of text go through one translation. And the hand-rolled builder that
read seven of the block's fields is gone. The caption is drawn only at an end that HAS a cap, and
only when a layer wrote the words -- both are in the four channels' caveat.

**6.4 `node.glowStrength`.** `NodeEffects.ts:213-216` records that Babylon's glow intensity is a
property of the glow LAYER, not of a style, so two glowing styles on screen share whichever
strength landed last. Publishing the channel means publishing that caveat, or building one layer
per strength. Worth measuring before promising it.

**6.5 Gradient node fills.** `NodeMesh.createMaterial` builds linear and radial gradients, tests
cover them, and `StylePainter.ts:220-225` overwrites `texture.color` with a neutral solid so the
per-instance colour can show -- which means no gradient can survive the paint path at all. Publish
a channel carrying an `AdvancedColorStyle`, or record the removal and delete the renderer branch.
Keeping a tested renderer path that no door reaches is the worst of the three.

**6.6 The migration register's promise.** `design/element-api/element-api-migration.md:39` says
"Anything not listed here is, under the deprecation policy below, promised to keep working." Not
one row of this file appears in that register. Either the register gains the rows before 2.0 is
cut, or the release waits for the capabilities. That choice decides whether the work below is a
documentation task or an implementation one.

**6.7 Is the closed channel set a first cut or the final word?** `channels.ts:6-13` says a missing
channel "is a missing API, added in a minor with an entry in this table", which reads as a promise
that the remaining unreachable fields arrive in minors. If that is the intent, the 2.0 changelog
should say so and `UNREACHABLE_STYLE_FIELDS` is a roadmap. If it is not, the dead schema fields
should be deleted rather than published from `./schema` alongside the ones that work.
