# VR control-surface catalog for graphty

Status: research catalog, 2026-10-09. Nothing here has been built or tried in a headset.

graphty is a graph (network) visualization and analysis product: the graphty app, a React web UI,
around graphty-element, a web component that draws 2D and 3D node-link graphs with Babylon.js and
opens WebXR sessions. This catalog lists every control paradigm considered for running graphty in
a headset (VR, AR and passthrough; no desktop or monitor variants). A paradigm is one way a person
explores, selects, analyzes, styles, filters, writes notes, undoes, saves and reopens while holding
the graph, standing outside it or being inside it. The control models built from these paradigms,
the parity matrix and the recommended spikes are in `vr-control-surfaces.md` in this folder.

Each entry gives how the paradigm works, the kinds of control it serves (point, list, text,
number, props, order, read, prose, file, confirm, command), its strengths and weaknesses, and its
sources. Near neighbors that differ in mechanism are kept as separate entries.

Tags on every entry:

- **AI** needs a language model to work at all. **No AI** works without one; "optional AI" means a
  model can add to it but the base works alone.
- **Seen** exists in a shipped tool or published study more or less as described. **Adapted**
  combines seen parts in a new way or for a new purpose. **Invented** has no precedent found.

## Summary

| Family                                      | Entries | AI     | No AI  |
| ------------------------------------------- | ------- | ------ | ------ |
| 1. Navigation, scale and modes              | 5       | 0      | 5      |
| 2. Command and verb grammars                | 7       | 0      | 7      |
| 3. On-body surfaces                         | 4       | 0      | 4      |
| 4. Voice, text entry and addressing (no AI) | 6       | 0      | 6      |
| 5. Selection and rules                      | 12      | 0      | 12     |
| 6. Inspecting and reading results           | 7       | 0      | 7      |
| 7. Filter steps and style layers            | 6       | 0      | 6      |
| 8. Held tools, catalogs and numbers         | 6       | 0      | 6      |
| 9. Layout                                   | 2       | 0      | 2      |
| 10. Panels and windows                      | 11      | 0      | 11     |
| 11. Notes and prose                         | 3       | 0      | 3      |
| 12. History, undo and confirmation          | 7       | 0      | 7      |
| 13. Projects, files and export              | 1       | 0      | 1      |
| 14. AI-mediated control                     | 10      | 10     | 0      |
| 15. Data preparation (nice to have)         | 15      | 3      | 12     |
| **Total**                                   | **102** | **13** | **89** |

87 percent of entries work with no AI. Origin mix: 1 Seen, 96 Adapted, 5 Invented (most entries pair a seen mechanism with an invented graph use).

---

## 1. Navigation, scale and modes

### 1.1 Scale detents and three reaches

No AI. Adapted.

- **How:** Two-hand grip scales and rotates the graph continuously, with soft haptic detents at held (about 40 cm, at the chest), outside (about 2 m, on the real floor or table) and inside (bigger than the room, scaled around the point between the hands). Lifting the held model to the face and pushing in dives inside at that spot; pulling cupped hands apart steps out; hands closing around a ball call the graph back. A wrist chip names mode and scale ("held 1:40"). Going inside puts a world-in-miniature copy on the off-hand wrist or belt with a you-are-here marker; tapping a node there carries you along an eased path, tapping a face picks a camera preset. A clap zooms to fit (or frames the selection); squashing the graph flat between the palms switches to 2D. Every tool keeps its meaning but changes reach: direct touch held, short ray plus gravity-glove flick outside, a radius around the hand or a cone inside. Mode changes fade, never fly.
- **Controls:** point (orbit, pan, zoom), command (fit, frame, presets, 2D/3D), mode switching.
- **Strengths:** One gesture replaces orbit, pan, zoom, fit and presets; all three modes reachable with no menu; the miniature keeps an overview inside; one toolset for all modes.
- **Weaknesses:** Two hands; the clap can misfire; table snapping depends on scene understanding; extended reach loses precision; the scale gesture can collide with two-hand node grabs; diving in can disorient.
- **Sources:** ParaView XR, ChimeraX, Google Earth VR (Street View bubble), Demeo, Half-Life: Alyx gravity gloves, Unity EditorXR MiniWorld, Freebird XR scale readout; Worlds in Miniature, Stoakley et al. CHI 1995 (https://dl.acm.org/doi/10.1145/223904.223938). Invented: the detents, the wrist miniature on entry, clap, squash to 2D, reach that changes with mode.

### 1.2 Tethered proxy

No AI. Adapted.

- **How:** Ray at a node, edge or hull and squeeze grip: a hand-sized copy flies to your hand on an elastic tether to the real thing. Controls work on the proxy and the effect shows on the original; release snaps it back. One proxy per hand works on the edge or path between them.
- **Controls:** point, read; carries every other kind to the hand.
- **Strengths:** A far node is as easy to edit as a near one; the tether keeps the link visible; same in all modes.
- **Weaknesses:** Tether clutter in dense graphs; two-handed use leaves no hand for commands; proxies of large groups lose detail.
- **Sources:** Go-Go, Poupyrev UIST 1996; Half-Life: Alyx gravity gloves; multi-focus network probes (arXiv 2507.01140).

### 1.3 Proxemic bloom

No AI. Adapted.

- **How:** Controls appear by distance zone and facing. Public distance (whole graph): graph-level reading and controls on a plinth. Social (one community): group controls on its hull. Personal (node in reach): inspector and verbs bloom. Intimate (touching): rename, merge, delete. Turning away dismisses, turning back restores; blooms can be pinned. Held, outside and inside become one distance continuum.
- **Controls:** read, command, point, some props, confirm (reaching is the confirmation).
- **Strengths:** The body's focus picks the controls; destructive edits sit behind a physical reach.
- **Weaknesses:** Appearing and vanishing controls are hard to learn; zone boundaries flicker without hysteresis; undo and search must be exempt; seated users must scale instead of walk.
- **Sources:** Proxemic interaction (Greenberg, Marquardt); game level of detail. Invented: as the whole control model of a graph tool.

### 1.4 Guided flight

No AI (optional AI for described destinations). Adapted.

- **How:** Ask or pick a destination ("the most central node") and you are moved with a comfort-safe fade or vignetted glide; when holding, the model is rotated and framed instead. Breadcrumb beads return you to earlier places. "Next" and "previous" turn the last ranking into a tour.
- **Controls:** command, point, read.
- **Strengths:** Wayfinding in large graphs without manual flying; rankings become tours without a list.
- **Weaknesses:** Any automatic motion is a comfort risk; being moved can lose your bearings.
- **Sources:** Google Earth VR search-and-fly; Flow Immersive voice navigation. Invented: tours and breadcrumbs.

### 1.5 Rooms of the analysis

No AI. Adapted.

- **How:** The graph travels with you through a fixed building whose rooms are the tools: front hall (datasets, recents, mail room for files), lab (algorithms on benches, results as jars), gallery (style layers as ordered sheets), sorting room (set bins, filter gates), study (table wall, notes), workshop (data prep), archive (versions), corridor (history snapshots). In any room the graph can sit on a table, the floor or around you.
- **Controls:** list, file, read, order, command, mode switching.
- **Strengths:** Method of loci makes the app learnable as a place; each feature gets a big uncluttered surface; data prep gets its own place.
- **Weaknesses:** Travel is slower than a menu; mixed tasks mean constant walking; teleport breaks spatial memory; small spaces need a diorama version.
- **Sources:** Le Corbusier's promenade architecturale; VR method-of-loci studies; Arkio, The Wild. Invented: the app as a building with the graph carried between rooms.

## 2. Command and verb grammars

### 2.1 Node halo (the graph is the menu)

No AI. Adapted.

- **How:** Grip or touch-and-hold (300 ms) any node, edge, group or result and 6 to 8 verb petals bloom around it at fixed clock positions (Note at 12, Neighbors at 3, Path at 6, Same-as at 9), so a quick flick fires a verb like a marking menu. Each object type has its own ring. A petal needing an argument turns into that control in place (twist Neighbors for k hops). Destructive petals arm on reach and fire on a second squeeze. A root seed at the graph's center holds global verbs; pulling a petal draws out the next layer as seeds (algorithm families, then algorithms). Results become grippable objects (degree rings, community hulls) with Paint, Filter, Select top N, Remove petals.
- **Controls:** command, point, number, confirm, list (two-step seed tree), read.
- **Strengths:** No menu bar; verbs are where attention already is; fixed positions build muscle memory; long catalogs become two short choices.
- **Weaknesses:** About 8 verbs per ring; graph-wide verbs need the root seed (a menu in disguise); petals collide in dense clusters; typing unsolved; discoverability of gripping.
- **Sources:** EditorXR and Unreal VR radials, Substance Modeler Actions, Little Cities palm bubbles, Nanome object menus, visionOS ornaments; marking menus (Kurtenbach, Buxton). Invented: per-type rings, arguments in place, root seed, results as grippable objects.

### 2.2 Marking-menu sentences with rehearsal guides

No AI. Adapted.

- **How:** Hold trigger: an 8-direction radial appears, or not if the expert flicks at once. Chained marks in one stroke pick verb family, verb and an optional argument (at most three levels). Drawing slowly shows feed-forward paths with labels. The stroke's start point is the target. Inside, the off hand draws the marks.
- **Controls:** command, list (short), point.
- **Strengths:** Proven novice-to-expert path with identical motion; fast for bare commands.
- **Weaknesses:** Capacity limited; accuracy drops past two levels; mid-air marks are sloppy.
- **Sources:** Kurtenbach and Buxton marking menus; Bau and Mackay OctoPocus; OctoPocus in VR (TVCG 2021). Invented: graph verb-family layout.

### 2.3 Operator, count, scope (vim for graphs)

No AI. Adapted.

- **How:** Every command is operator + count + scope. About ten operators on dominant-controller buttons (select, filter, hide, color, size, note, pin, remove, keep as set, frame), about ten scopes on the off stick (this node, neighbors, community, path, component, same value, selection, set under ray, everything, inverse), count by stick clicks. "f 2 neighbors" filters to the 2-hop neighborhood. A repeat button reapplies the last sentence to a new target; a cheat ring shows valid scopes.
- **Controls:** command, point, number.
- **Strengths:** Expert speed without voice or text; vocabulary grows multiplicatively; repeat makes iteration cheap.
- **Weaknesses:** Steep start; controllers only; attribute-valued commands still need a list.
- **Sources:** vi/vim operator-motion grammar and dot repeat. Invented: graph scopes, cheat ring.

### 2.4 Three-slot sentence palette

No AI. Adapted.

- **How:** The off palm shows NOUN / VERB / ARGUMENT slots. Pointing fills NOUN; VERB lists only verbs valid for that type, most used first; ARGUMENT opens the right control. The sentence reads in plain words before a thumb press commits. Verb-first also works (valid targets then glow). Moves to the inner wrist inside.
- **Controls:** command, point, list, number, confirm, props (small).
- **Strengths:** Discoverable without knowing verb names; short type-filtered lists; the sentence doubles as confirmation and undo label.
- **Weaknesses:** Three steps where voice takes one; attributes still need a long-list picker; raised-hand fatigue.
- **Sources:** Quicksilver object/action/argument panes; Tilt Brush/Open Brush palette. Invented: type filtering, reversible order.

### 2.5 Pinch-chord command vocabulary

No AI. Adapted.

- **How:** Thumb-to-finger pinches are keys (four per hand); chords map through an editable dictionary to whole commands. Off hand is operator, dominant hand is scope, so one two-handed stroke is a full command; double pinch modifies (count, repeat, negate); an off-hand fist switches to fingerspelling for names. A chord chart floats above the off hand until dismissed.
- **Controls:** command, text (short), number.
- **Strengths:** Silent; arms can rest; fast once learned.
- **Weaknesses:** Occluded pinches misread; real learning cost; unusable for prose.
- **Sources:** Plover / Open Steno chords and briefs; PinchType. Invented: operator/scope hand split, command dictionary.

### 2.6 Word tokens on a belt

No AI. Invented.

- **How:** A hip belt of verb and modifier tokens (filter, select, hide, color, size, label, note, keep, run, lay out; neighbors, community, top 10, inverse). Pull one and drop it on a target ("neighbors" on a node lights its neighbors; "filter" on that group makes a step). Tokens stack into phrases before dropping; invalid drops bounce back with a reason. Inside, tokens are thrown along the ray.
- **Controls:** command, point, number, confirm.
- **Strengths:** Grammar is visible and physical; learnable without reading.
- **Weaknesses:** Slow for experts; 15 to 20 tokens, so attribute and algorithm lists need a picker; throwing is imprecise.
- **Sources:** Related to tangible programming blocks and adventure-game verb-on-object grammars.

### 2.7 Hold to grow

No AI. Adapted.

- **How:** Commands with one main number grow while held and stop on release, with the effect visible throughout: hold a node to grow its neighborhood one hop per second, a result ring to grow top N, Layout to run until release, Communities to raise resolution, a filter to raise its threshold. Twisting reverses. The value is printed afterward and can be held again.
- **Controls:** number, command, light props.
- **Strengths:** You choose a value by seeing its effect; one hand, any mode, no panel.
- **Weaknesses:** One parameter per command; slow for exact values; expensive algorithms cannot rerun every tick; tiring.
- **Sources:** Press-and-hold acceleration; the theremin; Bret Victor's scrubbable values. Invented: as the general parameter control.

## 3. On-body surfaces

### 3.1 Thumb verbs and finger-segment keys

No AI. Adapted.

- **How:** Commands are thumb taps and swipes on the fingers of the non-pointing hand. What each means depends on what the pointing hand aims at (node, edge, empty space, panel). Resting the thumb half a second shows a ring of the current 8 verbs, so beginners choose and experts flick with the same motion; a ninth slot opens more. The twelve finger joints can act as twelve keys (eight frequent verbs: select neighbors, expand one hop, fit, frame, fade others, pin, note, run again) with a second T9 layer for short names. Swipe forward/back steps through findings, left/right is undo/redo. Palm up opens document commands, palm down opens view commands (flat palm plus a glance). Controllers map verbs to stick directions.
- **Controls:** command, text (short), number, list (stepping through findings).
- **Strengths:** The cheapest command possible: no arm or gaze movement, works in every mode and while holding the graph; touch on your own finger gives real feedback; context by target replaces a menu bar; shows its own verbs.
- **Weaknesses:** 8 to 16 verbs per target; microgesture recognition errors; fingers occlude each other; left-handed and accessibility mappings; T9 is slow.
- **Sources:** Marking menus (Kurtenbach); Meta microgestures (https://developers.meta.com/horizon/documentation/unity/unity-microgestures/); STMG (https://dl.acm.org/doi/10.1145/3613904.3642702); PalmType; Gravity Sketch palm menus. Invented: target-dependent verb table, rest-to-reveal ring, finger-joint keypad for graph verbs.

### 3.2 Tool belt and body slots

No AI. Adapted.

- **How:** A hip belt of 6 to 8 holsters in front of the body (inside the cameras' view); a slot glows and ticks before you grab. Tossing over the shoulder deletes, with a bin behind you for undo. Touching the chest pulls out a ball holding the current selection, to drop into a set jar or filter rack. Pulling down an overhead shade opens New, Close, Settings, Help. Back of the hand to the hip zooms to fit. Same place in every mode.
- **Controls:** command, point, confirm.
- **Strengths:** Eyes-free once learned (Virtual Shelves: about 28 body-relative regions hit from memory); no menu covers the graph; delete is unambiguous.
- **Weaknesses:** Few slots; refit when sitting; accidental tosses; needs hover and occupied feedback.
- **Sources:** Boneworks body slots; Half-Life: Alyx wrist pockets; Mine, Brooks, Sequin 1997; Virtual Shelves (Li et al. 2009). Invented: chest-pocket selection ball.

### 3.3 The sleeve: wrist status and forearm scrubber

No AI. Adapted.

- **How:** A watch face shows one live fact (selection count, nodes left, layout running, last step); a glance opens the full status card. The inner forearm is undo history: slide wrist to elbow, one detent per step, with name and live preview. The outer forearm is the slider for the number in play, with the attribute's histogram on the skin, detents at quartiles, two fingers for a range. Tap the wrist bone to confirm, cover the watch to cancel.
- **Controls:** read, number, command, list.
- **Strengths:** Touch on your own arm is the most precise slider a headset has; visible undo; status one glance away.
- **Weaknesses:** Skin touch needs research-grade hand tracking; sleeves confuse tracking; controller fallback needed; only about 25 cm of rail.
- **Sources:** Lone Echo wrist display; Little Cities and Walkabout watches; Gravity Sketch history clock; OnArmQWERTY. Invented: forearm undo and value rails.

### 3.4 Session grid on the forearm

No AI. Adapted.

- **How:** An 8x8 pad grid on the off forearm: rows are results and attributes, columns are encodings (color, size, label, filter, select, fade, hide, note). Tap a pad to launch that pairing (Degree by size); active pads pulse, so the grid doubles as legend and layer list. A second pad in a column replaces the first. Scene pads launch saved views; shift zooms out; a dim pad runs its algorithm first.
- **Controls:** list, command, read.
- **Strengths:** Color-by and size-by are one tap; result list and layer list become one object; always in reach.
- **Weaknesses:** Paging for many attributes; tiny labels; palette and range options need a second step; one layer per column.
- **Sources:** Ableton Live Session View and Push; Tilt Brush and Gravity Sketch wrist palettes. Invented: results by encodings as a launch grid.

## 4. Voice, text entry and addressing (no AI)

### 4.1 Fixed-phrase deictic voice grammar

No AI. Adapted.

- **How:** An on-device recognizer constrained to a fixed phrase list mapped one to one to app commands (select, show, hide, color by, run, layout, filter, name, note, go to, undo, zoom to fit...), with nouns loaded from the open project (attributes, values, nodes, algorithms, sets) plus sayable aliases. Each pronoun (this, these, that, there) binds to the ray or gaze target at the moment the word is spoken; sweeping the ray during "these" captures every node crossed. An echo line shows the parsed sentence with captured slots; consequential commands wait for "do it". Every utterance lands as the same object a hand would make (for example a pre-set rule bar). "What can I say?" or a glance at the palm lists phrases for the current target; every button shows its spoken name on hover.
- **Controls:** command, point, list, text, number, confirm, order.
- **Strengths:** Fastest route into long lists; offline and private; far more accurate than dictation; hands free to point; same sentence in every mode; the language AI paradigms compile into.
- **Weaknesses:** Quiet and social comfort needed; odd ids recognized poorly; phrases forgotten; no paraphrase; pronoun timing is unforgiving; people overestimate what a grammar understands.
- **Sources:** Bolt, Put-That-There (MIT 1980); syGlass voice list with "what can I say"; early Nanome fixed phrases and Nanome's stated gap that voice cannot use pointing. Invented: project-derived nouns, per-word timestamp binding, utterances landing as editable objects.

### 4.2 Spoken rule language with token correction

No AI. Adapted.

- **How:** Fixed grammar "[select|filter|hide] [nodes|edges] where attribute comparison value [and|or ...]" with the graph's attributes and values loaded as phrases. The rule appears as a row of tokens; fix any token by pointing and saying a replacement, dragging a number token, or picking from its typed alternatives. The row can be dropped onto the pipeline rail.
- **Controls:** props, text, number, list.
- **Strengths:** Fastest rule entry for people who can say it; edits never require re-speaking.
- **Weaknesses:** Out-of-grammar phrasing yields nothing; coded names need aliases; numbers must be checked.
- **Sources:** syGlass "set ... to N"; ChimeraX typed commands. Invented: graph-derived phrases, per-token correction.

### 4.3 The prompt book (standby, then go)

No AI (optional AI maps free speech to a standby). Adapted.

- **How:** Each command has a cue name. "Standby Communities" arms it and shows a ghost preview with cost and a parameter card; "Go" is the only word that executes; "Cut" or "Hold" cancels. A held clipboard logs every cue with margin notes, serving as undo history, notes list and report; flipping a page jumps back. Named scenes are saved views; a prepared cue sheet is a recipe run with "go, go, go".
- **Controls:** command, confirm, list, read, prose.
- **Strengths:** Two-phase confirmation makes voice safe and every action previewable; long lists vanish when you can say the name.
- **Weaknesses:** Names must be known (visible cue list needed); shared spaces; unpronounceable attribute names; recognition errors.
- **Sources:** Theater stage-manager cue calling and prompt books; Nanome MARA. Invented: standby/go as the confirm model of a data tool.

### 4.4 Hint labels

No AI. Adapted.

- **How:** A hint command stamps two-character tags on every node, card and control in view, nearest and largest first. Saying the tag in a spoken alphabet ("air bat") or chording it targets that thing. Inside, tags for out-of-view nodes sit on a compass ring at the edge of vision; tags on list rows pick row 37 without scrolling.
- **Controls:** point, command, list.
- **Strengths:** Pointing precision stops mattering for tiny, far, occluded or behind-you targets; hands-free accessibility.
- **Weaknesses:** Clutter on dense graphs; alphabet learning; tags change between views.
- **Sources:** Vimium link hints; Talon spoken alphabet. Invented: out-of-view compass ring.

### 4.5 Steered text entry over the graph's own words

No AI. Adapted.

- **How:** A zooming column of character boxes steered with the ray; flying into a box writes it. Box sizes come from a frequency table counted over the open graph's labels, attribute names, values, set and layer names and command words. When the prefix uniquely names a node, it lights and a trigger pull targets it.
- **Controls:** text, list.
- **Strengths:** Text with only a ray; fast for this dataset's words; quiet; accessible.
- **Weaknesses:** Slow for words not in the data; practice; tiring; useless for prose.
- **Sources:** Dasher (Ward and MacKay 2000). Invented: data-derived frequencies, search meets pointing.

### 4.6 Grammar-aware command palette with ghost slots

No AI (optional AI interpreter). Adapted.

- **How:** A pinch near the mouth or a button summons a slim palette at the hand: one input line searching every command, node, attribute, algorithm, layout, palette, set, result and view. Speak, type, chord, steer or tap rows; pointing fills node slots. Once a command matches, its remaining arguments show as ghost slots ("color by [attribute] using [palette] on [scope]") and the list offers candidates only for the next slot. Recent full sentences rank first. Run by pointing or saying "first". Without AI, speech is fuzzy-matched to catalog names; with AI, a free-form request becomes editable rows of real commands that nothing runs until confirmed.
- **Controls:** command, list, text, point, number.
- **Strengths:** One control reaches every function; ghost slots teach argument structure; shares grammar with the desktop palette; AI output stays inspectable.
- **Weaknesses:** Still a text field; speech fails in noise; discovery needs a catalog browser; large type at arm's length; least spatial.
- **Sources:** Emacs M-x; Blender F3 search; graphty's command palette; Flow AI voice commands; Tableau visionOS voice prototype. Invented: per-slot ghost arguments, editable AI plan rows.

## 5. Selection and rules

### 5.1 Reach, brush and cookie-cutter selection

No AI. Adapted.

- **How:** Pointing follows distance: fingertip touch held, a ray that bends to the nearest node outside, gaze plus pinch inside. Select many with a brush (sphere sized by finger spread), a cookie cutter (a loop drawn in the air extrudes away from the eye into a 3D marquee with an adjustable back face), or pouring a held selection into a set jar. Dominant hand adds, off hand removes, both intersect. Previous selection is a thumb verb.
- **Controls:** point, command.
- **Strengths:** Direct touch is precise and restful; no pointing mode to pick; a true 3D marquee.
- **Weaknesses:** Gaze needs eye tracking; the cutter catches occluded nodes without a depth limit; easy to over-brush.
- **Sources:** Gaze + pinch, Pfeuffer et al. SUI 2017 (https://dl.acm.org/doi/10.1145/3131277.3132180); Go-Go (UIST 1996); Final Assault drawn lasso. Invented: distance switching, extruded cutter, add/remove by hand.

### 5.2 Tangible rule pieces (bars, tokens, blocks)

No AI. Adapted.

- **How:** Each attribute or result is a rod or token with its histogram or category chips printed on it; sliding rings or a value knob set a range (detents at quantiles and existing values, pull for fine steps) and taps include or exclude categories. Comparator blocks roll between =, !=, >, <, between, in, matches, and sockets accept only compatible types so invalid rules cannot be built; a dropped node supplies "that node's value". Pieces end to end or on one rail are AND, side by side or stacked rails are OR, upside down or a clip is NOT; an end-cap dial picks replace, add, remove or intersect. Matches glow live with a count. Where the finished piece goes decides its role: over the graph or the Select slot it selects; in a jar it is a rule set (press the lid to freeze a fixed set); in the filter stack it is a filter step; on a gel or brush it scopes a style layer. Two jars touched together offer set operations. Built on a tabletop, palm or pinned board by mode.
- **Controls:** props, number, list, point, command.
- **Strengths:** The hardest core control (select by rule, filter steps) becomes object handling with live feedback and no typing; the histogram shows the data while writing; one object serves select, filter, sets and style scope.
- **Weaknesses:** Nesting past about two levels is clumsy; neighbor expressions and regular expressions do not fit; pieces need storage and get lost; experts are slower than typing.
- **Sources:** Ullmer, Ishii and Jacob, Tangible Query Interfaces, INTERACT 2003 (http://www.cs.tufts.edu/~jacob/papers/interact03.pdf); ImAxes (UIST 2017); PatchWorld knobs; Scratch and Snap! blocks; Neo4j Labs Visual Cypher Builder. Invented: the placement grammar, combine dial, typed sockets for graph attributes, value by dropped node, role by placement.

### 5.3 Rule from one example (tug a trait)

No AI. Adapted.

- **How:** Grab or pull a node toward you and its attributes and metrics come out as orbiting tags or a shelf of cards (value, rank, a small distribution bar). Tugging or tapping one lights every node sharing that value with a count ("same value as this" in one move); pulling farther or twisting the wrist widens the comparison (=, >=, between); sliding along a card's bar selects above or below this node; a second example node turns categories into "one of" and numbers into a spanning range; flick to negate. Tossing a card onto the graph colors by that attribute, onto the node outline sizes by it. Contrast mode: one example per hand shows the traits that differ most (largest normalized difference, plain arithmetic). The result becomes an editable rule piece with sinks (select, filter, hide, rule set, style target). Long schemas fold into pinned, recent and other stacks.
- **Controls:** props, point, number, read, list.
- **Strengths:** Fastest path from "this is interesting" to "show me ones like it" with no names typed or spoken; inspector, picker and rule builder become one object.
- **Weaknesses:** Only rules an example can show; hundreds of attributes must be pruned; categories lack an order for similarity; tossing is imprecise; nested logic is weak.
- **Sources:** Query by Example (Zloof 1977); Cypher by Example (2025); BadVR grab-to-read; Open Brush Dropper; VR Sketch tap-to-edit. Invented: orbiting tags, distance or twist as tolerance, two-hand contrast, card tossing.

### 5.4 Rule from several examples (more like these)

No AI (optional AI for richer rules). Adapted.

- **How:** Touch 2 to 5 example nodes, or put examples in a "these" hand and counter-examples in a "not these" hand. A hull wraps them and the simplest shared conjunctions appear as rule chips or cards in plain words with match counts ("type is person and degree over 10: 4 of 5 matched, 212 total"); two to four candidates can be offered, each with a ghost highlight. Flick a chip off to drop a condition, twist to change the comparator, stretch a range; pinch an unwanted match to make it a counter-example and the candidates recompute. Commit as replace, add, intersect, subtract, rule set or filter step; the rule opens as an editable rule. A deterministic routine computes the rules; an optional model adds richer ones and can generalize manual restyling.
- **Controls:** props, text (rules without typing), list, number, point, read.
- **Strengths:** Select by rule without ever stating a rule; counter-examples by flicking; teaches the rule language.
- **Weaknesses:** Examples with nothing in common give an empty rule; few examples fit many rules; OR needs two hulls; coincidental or overfitted conditions; rules over results need those results first.
- **Sources:** Query by Example (Zloof 1977); FlashFill; Wrangler; programming by demonstration (Lieberman, Your Wish Is My Command); PatchWorld snap blocks; Flow Immersive AI; Nanome MARA. Invented: rule chips on a hull, two-hands-of-examples gesture.

### 5.5 Metric skyline and the cutting plane

No AI. Adapted.

- **How:** Running or pulling up a metric lifts each node in place by its value or rank, so the graph becomes a skyline or bar field. A translucent plane floats at the median with its value on the edge; grab its handle to raise or lower it, with haptic ticks at quantiles. Nodes above glow with a count; commit from the handle (select, filter to, save as set, paint). A second plane makes a band; pulling the plane away hands you its value as a knob; a log toggle handles skew. One metric per hand: height by one, color by the other. Communities pull apart into islands with sizes and bundles between them. Inside, the plane passes through your body. Nodes settle back on release.
- **Controls:** number, read, command, select by rule.
- **Strengths:** Rank, distribution and location in one look; the threshold is a physical plane on the real nodes before committing; no typing or slider panel.
- **Weaknesses:** One numeric condition at a time; hides the layout while up; low nodes hidden in dense graphs; many moving nodes is a comfort risk.
- **Sources:** ImAxes embodied axes; Nanome span strip; state on the object (Half-Life: Alyx, Little Cities). Invented: lifting the graph's own nodes, the grabbable plane, communities as islands.

### 5.6 Pipeline rail

No AI. Adapted.

- **How:** A waist-height rail of tiles read left to right: source | where | traverse | structure | rank | sink (select modes, filter, hide, rule set, paint). Each tile shows a live pass-through count, and pointing at it highlights what passes. Grab tiles from a tray, slide to reorder, pull out to delete, toggle off, edit values in place. Junction tiles merge rails for union, intersect, subtract. In the room outside, a forearm strip when holding, wrapped around you inside.
- **Controls:** props, order, number, list, read, command, point.
- **Strengths:** Rules and filter steps become object handling; order is physical; per-step counts read "what is left"; one grammar for selection, filters, rule sets and set algebra.
- **Weaknesses:** OR needs forks; long rails exceed reach; tile labels must stay legible.
- **Sources:** Gremlin traversal steps; Gephi filter Queries panel. Invented: walkable rail with per-step highlighting.

### 5.7 Sentence tiles

No AI. Adapted.

- **How:** A command is built of floating tiles: verb, scope, condition (attribute, operator, value), and how to combine with the current selection. Twist a number tile, tap an attribute tile for a filtered list, pull a tile out to delete a clause, add tiles from a wrist tray. A ghost preview updates live. Drop the finished sentence on the filter stack, set shelf or a style layer. An assistant can also answer requests with a prefilled sentence.
- **Controls:** props, text, number, list.
- **Strengths:** Rules without typing; you see exactly what was understood; one editor for selection, filters and layer scopes.
- **Weaknesses:** Nested logic is hard as a flat sentence; about 8 tiles legible.
- **Sources:** DirectGPT (CHI 2024); Scratch blocks. Invented: physical rule tiles in VR.

### 5.8 Stroke grammar (scope then glyph; coach's chalk)

No AI. Adapted.

- **How:** Air or chalk strokes recognized by shape form a sentence: a scope stroke (lasso or loop selects, line or arrow from node to node is a shortest path, arrow into space a neighborhood whose length is the hop count, cut across edges, circle on empty space for all in view, box makes a set, bracket compares) then an optional single-stroke letter verb (S select or save set, F filter, H hide, N note, C color, P pin, X remove with a count confirmation, L lay out only these, ? statistics). Unrecognized ink becomes a note pinned to the nodes it touches. Bins at the edges take tossed selections. A saved sequence of drawings is a play that replays as a findings report. Outside, draw telestrator-style on your view; inside, the lasso is a swept ray cone; an alphabet reference sits on the inner wrist.
- **Controls:** point, command, confirm, prose (ink), order (plays), read.
- **Strengths:** Scope and verb in one motion; supplies marquee selection; mnemonic letters; one tool for selection, commands and notes.
- **Weaknesses:** About 10 to 20 shapes before misrecognition; mid-air strokes imprecise; lasso ill-defined inside; select by attribute not covered.
- **Sources:** Palm Graffiti; template stroke recognizers; coaching tactics boards and telestrators; Final Assault drawn paths; arXiv 2409.13859 mixed-reality tactics study. Invented: scope-then-glyph sentence for graphs, plays as reports.

### 5.9 Group hulls (set algebra by overlap)

No AI. Adapted.

- **How:** Sets, communities, paths and saved selections show as skins with a tab (name, count). Drag one hull into another and release in a zone for A-only, both or B-only; on the rim for union. Two-hand squeeze collapses a group to a meta-node. Tear the tab to duplicate, drop it in the base tray to delete, speak while holding to rename. Poke a node through the skin to add it, pull one out to remove it.
- **Controls:** command, point, list, text, read.
- **Strengths:** The whole Sets feature as spatial verbs; community sizes and overlaps read by looking.
- **Weaknesses:** Hulls around scattered members mislead (draw linked rings instead); many hulls clutter.
- **Sources:** Apple Freeform groups; Venn diagrams. Invented: collision set algebra, poke-through membership.

### 5.10 Eyedropper everything

No AI. Adapted.

- **How:** One dropper. Sample a node's look and release on others to apply it as an override layer; sample a value and release on empty space to select every node with that value; two samples make a range; sample a legend entry, histogram band or result column to select, filter or color. Dip one sample into another to stack conditions as beads (AND, or OR with the off trigger). Names are a drawn glyph, a color and an audio memo; numbers come from the data or a finger span.
- **Controls:** props, text (rules), number, point.
- **Strengths:** Rules built from the data cannot name a missing value; one grammar for select, filter and style.
- **Weaknesses:** Cannot express absent values or regular expressions; glyph names are hard to search and export; long bead rules are hard to read.
- **Sources:** Eyedropper and format painter; Zloof query by example; Ullmer, Ishii, Jacob tokens. Invented: sampling as the only input.

### 5.11 Reactable lenses (spinning pucks)

No AI. Adapted.

- **How:** Pucks on the rim of a table graph become lenses when slid onto it: spinning sets the main parameter, a finger around the rim the second (neighborhood k, threshold, fade). Two path pucks on A and B light the shortest path. Overlapping lenses combine as AND; a drawn link makes OR. Pushing a puck to the rim commits it as a filter step or set. Outside, pucks are flashlight lenses; inside, a wrist ring you look through.
- **Controls:** props, number, point.
- **Strengths:** Rules as visible movable regions; two parameters per object; non-destructive.
- **Weaknesses:** Committing a local lens to the whole graph is not obvious; NOT and nesting awkward; slow to precise values; best on flat layouts.
- **Sources:** The Reactable (Universitat Pompeu Fabra); Toolglass and Magic Lenses (Bier et al. 1993); Ullmer, Ishii, Jacob. Invented: puck lenses as graph rule builders.

### 5.12 Edge strings (pluck, draw, cut)

No AI. Adapted.

- **How:** Pluck an edge to show its tag and flash its endpoints; draw it outward for a width handle. Trace a thread from A to B and the shortest path snaps on as a rope; drag the rope through a third node to reroute; twist a knot to keep it as a path set. Chop a flat hand across a bundle to mark those edges, then filter, select or hide.
- **Controls:** point, read, number, command (shortest path, filter).
- **Strengths:** Edges become first-class targets; paths are drawn, not configured.
- **Weaknesses:** Thin edges need a snap radius; the chop misfires unless armed; hands and controllers need different detection.
- **Sources:** Final Assault drawn paths; Tilt Brush strokes. Invented: the string metaphor, waypoint reroute, chop.

## 6. Inspecting and reading results

### 6.1 Pull to unfold (node inspector on a tether)

No AI (optional AI answers questions). Adapted.

- **How:** Pinch a node and pull it toward you (or touch it when inside): it grows into a card near your face joined by a line, showing attributes, metrics with rank and memberships. Neighbors hang off it as labeled beads on strings: tug one to go there, a fist selects them all; twisting the card expands one hop per click. Let go and it returns; drop it and it stays pinned. Two cards (or one node per hand) compare automatically. Pointing a second shows a hover label. Optionally ask "why is this one central?" or "which layer made it red?"; the answer is built from element facts, each linked to its evidence.
- **Controls:** read, point, number (k hops), command.
- **Strengths:** The core inspection task is one motion with no panel; the line says which node a card describes; structure becomes navigation; checkable answers limit made-up claims.
- **Weaknesses:** High-degree nodes need bundled strings; cards clutter; text legibility at arm's length; pulling one node from a dense cluster is fiddly.
- **Sources:** BadVR grab-to-read; ShapesXR inspector leader line; Freeform on Vision Pro; GazePointAR. Invented: neighbor strings, twist to expand, side-by-side compare, tethered held node.

### 6.2 Clip-on gauges and tear-off tape

No AI. Adapted.

- **How:** Gauges clip onto a node, set jar, filter pane or community and show live statistics; two side by side compare. A ranking prints as paper tape: run a finger down and each node pulses; tear at row N to select the top N; pin a segment beside the graph. A histogram ruler with a sliding clamp selects or filters a band. Each style layer can print its legend card. Tiny when held, hand-size outside, on the wrist inside.
- **Controls:** read, point, number, command.
- **Strengths:** Covers characterize, rank, communities and filter counts without a table panel; results stay beside their subject; comparing is placing.
- **Weaknesses:** Clutter; wide tables do not fit; about 15 rows per tape.
- **Sources:** Half-Life: Alyx readouts; BadVR grab-to-read; Nanome sequence strip. Invented: clip-on gauges, tear-to-select tape, histogram ruler.

### 6.3 Result badges

No AI. Adapted.

- **How:** Top-N nodes wear rank badges, communities wear hulls, a path wears its rope. Twist a badge to change N; pull it out for a card of run parameters as dials with provenance on the back; squeeze the card to rerun (progress ring, cancel petal). Lift the badge to see the distribution as a cutting plane; pull its table tab to unroll a ranked list linked to nodes.
- **Controls:** read, number, props, command, list.
- **Strengths:** Reading and revising a result happen at the result; tables secondary.
- **Weaknesses:** Graph-level statistics have no element; several results stack badges; badges hide labels.
- **Sources:** Half-Life: Alyx magazine lights; Little Cities status bubbles; ShapesXR leader lines. Invented: badges as the analysis control surface.

### 6.4 Held slate with threads

No AI. Adapted.

- **How:** A tablet-size slate held in the off hand like a clipboard, or set on a real surface. Tilting the wrist scrolls; tap a header to sort, a cell to select. A thread joins each visible row to its node: touching a row pulses the node, touching a node scrolls to its row. Drag across column sparklines to select a band. Spread the edge to unfold it wider or lean it on a wall. Back is the status bar; bottom edge the legend.
- **Controls:** read, point, list.
- **Strengths:** A readable table at arm's length; threads link table and graph without a brushing mode.
- **Weaknesses:** Ties up the off hand; thread clutter; risks being a desktop panel in disguise.
- **Sources:** Lone Echo touchscreens; Resolve plan sheet; MRTK hand menu peel-off (https://learn.microsoft.com/en-us/windows/mixed-reality/design/hand-menu). Invented: tilt to scroll, row-to-node threads.

### 6.5 Table wall

No AI. Adapted.

- **How:** A curved wall of tall rows behind the graph outside, a cylinder around you inside. Headers carry histograms: swipe to sort, brush to filter. Pointing at a row runs a thread to its node; pointing at a node scrolls to its row. Tabs switch nodes or edges and scope. Pinching a cell raises an edit chip (dial, pick list, dictation).
- **Controls:** read, point, order, number, text, list.
- **Strengths:** The only paradigm that shows many rows at once; threads make table and graph one object; placement follows mode.
- **Weaknesses:** Headset text 1.3 to 1.5 times larger, so about 25 rows readable; threads hairball; wide tables mean turning.
- **Sources:** Resolve plan sheet; "This is the Table I Want!" (IEEE VIS 2023, https://arxiv.org/abs/2309.12168). Invented: cylinder inside the graph.

### 6.6 Linked window pairs for comparison

No AI. Adapted.

- **How:** Duplicate the view into up to six small volumes on an arc, each labeled with its metric, run, scope or time window. Selection is linked, with lines between copies of the same node. Two copies make a difference view colored by change. Promote any copy to main; saved views share the thumbnail row. Inside, copies float as small globes.
- **Controls:** read, point, list, command.
- **Strengths:** Real space for comparison; linked selection is cheap and powerful.
- **Weaknesses:** Rendering cost multiplies; small copies blur; arc fits few copies.
- **Sources:** Immersive small multiples (Liu, Prouzeau, Ens, Dwyer, IEEE VR 2020); Horizon OS six windows. Invented: cross-copy lines, difference view.

### 6.7 Variant tray

No AI (optional AI for judgment calls). Adapted.

- **How:** For a judgment call ("make this readable", "pick a palette"), three to five variants appear as labeled miniature graphs on an off-hand tray. Pick one up to look closer, hold two side by side, drop one on the full graph to apply it (through a ghost preview), or ask for more like one. Variants come from seeds and palettes without AI.
- **Controls:** list, confirm, read.
- **Strengths:** Replaces scrolling 14 layouts or 18 palettes with choosing among a few visible results.
- **Weaknesses:** Miniatures of large graphs are costly and hard to read; labels hide the parameter space.
- **Sources:** Worlds in Miniature (CHI 1995). Invented: the tray of graph variants.

## 7. Filter steps and style layers

### 7.1 Sieves, gels and lens panes (order as depth)

No AI. Adapted.

- **How:** Filters and styles are panes of glass. Hold one up and you see the filtered or restyled graph (or another layer stack, a previous run, another time window) through it, with its rule on the frame; stacked lenses combine. Slide it into a rack between you and the graph, or press it into the graph, to commit. Two racks: sieves are filter steps (plate nearest the graph acts first, each frame shows its rule and surviving count, touch shows the caught nodes); gels are style layers (nearest you wins). Slide to reorder, flip or tilt flat to toggle, toss to remove, pull toward you to edit, peel a corner to compare without it. Pointing at a node draws threads to each gel that styled it with what it gave (why this look). Poking through a pane applies its verb to that node only. Smoked glass hides without changing counts. A glass sphere set inside the graph shows what is inside and fades the rest (inside-mode version). A lens set to run B over a graph showing run A is the comparison view. Unused racks fold to edge tabs; when held, they become a card fan on the off hand or a jeweler's loupe.
- **Controls:** order, command, props, read, point, confirm.
- **Strengths:** Order becomes visible depth; preview before commit is built in; why-this-look at a glance; non-destructive; one grammar for two stacks.
- **Weaknesses:** More than 6 to 8 plates are hard to slide between or read edge-on; looking through layers costs legibility and is ambiguous in stereo; racks take room; local preview misleads about global metrics.
- **Sources:** Toolglass and Magic Lenses, Bier et al. SIGGRAPH 1993 (https://dl.acm.org/doi/10.1145/166117.166126); 3D Magic Lenses (Viega et al. 1996); Virtual Lenses as Embodied Tools (arXiv 1911.10044); collaborative magic-lens graph exploration. Invented: depth as order, filter and style racks, flip to toggle, why-this-look threads, stamping a lens as a step.

### 7.2 Stack rails and pedalboard (order as position along a chain)

No AI. Adapted.

- **How:** Filter steps and style layers hang as cards on a chest-height rail, or sit as pedals on a cabled board at your feet or on a table between the data (the guitar) and the graph (the amp). Position is order: filters first, leftmost runs first; styles after, last wins. Slide or re-plug to reorder; flip or press bypass to disable (with a light); lift off or turn knobs to edit; drop in a bin to delete with an undo toast. Running counts show between filter cards. Hanging a selection, set or result on the layer rail makes a layer that paints exactly it. A splitter sends the chain to two outputs for comparison; a looper saves the chain as a preset. Inside, rails curve into rings or a belt.
- **Controls:** order, command, props, read.
- **Strengths:** Order is physical position; bypass makes toggling trivial; "what is left" read at a glance; comparison falls out of the splitter.
- **Weaknesses:** Long chains overflow; knobs fit categorical choices poorly; non-musicians need the metaphor explained; foot control unreliable without tracked feet.
- **Sources:** Gravity Sketch layer palettes; immersive small multiples shelf layouts (Liu et al., IEEE VR 2020); guitar pedalboards; modular synths; PatchWorld (PatchXR). Invented: applying rail and chain to graph filters and style layers.

### 7.3 Look stack (layers worn on a node)

No AI. Adapted.

- **How:** A node's "why this look" petal fans out one plate per style layer that wrote to it, bottom to top, tinted with its contribution. Slide a plate to reorder that layer for the whole graph, flip to hide it, pull sideways to open its property card beside the node, toss it to delete. Holding a plate makes everything that layer paints flicker.
- **Controls:** order, props, read, command.
- **Strengths:** Layer reordering, which no surveyed VR tool supports, becomes a slide; "why this look" answered at the element.
- **Weaknesses:** Tall decks; layers that paint nothing here need the base stack; local gesture with global effect can surprise.
- **Sources:** Gravity Sketch, Quill and Substance layer panels; graphty's Why-this-look. Invented: layers worn on the element.

### 7.4 Sieve shells (filter steps as nested skins)

No AI. Adapted.

- **How:** Each filter step is a shell around the graph, outermost first, with its rule as chips on the equator. What it removed rests as faint dust on the shell with a count on its tab. Pull the tab away to remove, tap to toggle, push a shell through its neighbor to reorder, edit chips in place. A hull, plane or chop dragged outward becomes a new step. Inside, shells are horizon rings.
- **Controls:** props, order, command, read.
- **Strengths:** Order and effect of every step visible at once; non-destructive.
- **Weaknesses:** More than 4 or 5 shells blur together; dust adds noise; small on a held graph.
- **Sources:** The sieve idea in the VR games survey. Invented: nested shells, dust, push-through reordering.

### 7.5 Style mixing desk

No AI. Adapted.

- **How:** Each style layer is a channel strip: name, attribute cartridge socket, palette knob, size-range faders, opacity fader, label switch, mute and solo. Channels run left to right in layer order (rightmost wins); slide to reorder. A master section holds Reset (under a flip cover, fires on hold), Save style file, fade or hide others. Touching a node with the probe lights the channels that wrote each property. Flip the desk for edge layers. Pocket 4-channel when held, full on the bench outside, floating at the waist inside.
- **Controls:** props, order, number, command, read, list.
- **Strengths:** Every layer's settings visible at once, which the desktop cannot do; mute and solo are familiar.
- **Weaknesses:** Too wide past about 8 channels; fixed properties need pop-outs; duplicates a palette Style face if both exist.
- **Sources:** PatchWorld knobs and faders; Electronauts; audio mixing consoles. Invented: layers as channel strips.

### 7.6 Attribute lens (try on an encoding)

No AI. Adapted.

- **How:** Hold an attribute bar like a flashlight: the cone previews the graph encoded by that attribute. Rolling the wrist changes the channel (color, size, label, edge width, shape); a swatch ring cycles the 18 palettes; spreading the fingers widens to the whole graph; barrel rings set the size range. The lens shape shows how the attribute is read (faceted groups, smooth amounts, ridged order); tap to cycle. Press the lens onto the gel stack, optionally with a rule piece or jar, to make a scoped style layer.
- **Controls:** list, props, number, command.
- **Strengths:** Trying encodings is free and local; channel is one motion; shares objects with rules and gels.
- **Weaknesses:** A partial preview misleads about whole-graph contrast; long fixed-property forms not compressed; wrist-roll comfort.
- **Sources:** Magic Lenses; Tilt Brush palette hand (https://docs.openbrush.app/user-guide/painting-with-open-brush). Invented: flashlight lens over a graph, channel by roll, reading as lens shape.

## 8. Held tools, catalogs and numbers

### 8.1 Loaded tools

No AI. Adapted.

- **How:** Every verb with settings is a physical tool carrying its settings. Brush styles nodes (attribute cartridge, swatch band for palette, collar for size range; one stroke is one style layer). Net selects (replace/add/remove switch, twist grip for size). Probe shows the inspector on its tip. Dropper samples a value and squeezes it onto a brush, rule tray or net. Pin pins. Shaker reruns layout with a 14-detent method dial. String draws a shortest path. Scissors remove, firing only when squeezed past halfway. Turn a tool to look at its top to open its full settings ring. Two copies with different settings are presets. Reach is touch held, short ray outside, radius inside.
- **Controls:** point, props, command, number, list (cartridges), confirm.
- **Strengths:** State never hidden; presets are tools you keep; one stroke, one undoable command; learnable without a tutorial.
- **Weaknesses:** A dozen tools need storage; long options fall back to the settings ring; switching in a tight loop takes time.
- **Sources:** Rec Room Maker Pen; Open Brush Dropper; Half-Life: Alyx settings on objects; Job Simulator. Invented: attribute cartridges, the graph tool set.

### 8.2 The shelf you walk along

No AI. Adapted.

- **How:** Every long list is objects on one curved shelf around you, summoned by a "more" verb or a quiver-draw from the hip: algorithms, layouts, palettes, formats, attributes, sets, saved views, recents. Bays by family with an alphabet ruler; run a finger along the ruler to flip items like records, or say a name and it floats to your hand. A forearm shelf holds about 8 recent and suggested items. Taking an item chooses it; where you drop it sets scope (graph, held selection, set jar). Turning it over shows its description and options.
- **Controls:** list, command, read.
- **Strengths:** Spatial memory; flipping beats ray scrolling; the drop target answers "run on what".
- **Weaknesses:** Needs room to turn (rotate when seated); 200 attributes is a long walk; abstract items need icons.
- **Sources:** Final Assault clipboard; Half-Life: Alyx fabricator; Electronauts cubes. Invented: wraparound bays, quiver gesture, finger ruler, scope by drop.

### 8.3 Workbench, drawers and the analyzer

No AI. Adapted.

- **How:** A waist-high bench beside the graph. Attributes are index cards in an alphabetical drawer, each with type and a small chart; pinned cards at the front; pulling one makes a token or brush cartridge. The analyzer machine takes a selection ball or set jar (or nothing for the whole graph) and an algorithm cartridge from a rack with a shelf per family; knobs set options; a cost light shows before you pull the run lever (pull back to cancel); the result prints as a card. Sets are jars: pour to union, squeeze two to intersect. Inside, the bench folds into a backpack.
- **Controls:** list, props, number, command, read, confirm.
- **Strengths:** Big memorable homes for long lists; placement answers "run on what"; cost and preconditions before committing.
- **Weaknesses:** Walking back to a fixed place; slower than a palette; needs floor space.
- **Sources:** Half-Life: Alyx Combine Fabricator; Final Assault clipboard; Job Simulator cartridges; Fantastic Contraption. Invented: attribute drawers, analyzer machine.

### 8.4 Seed tokens (drop an analysis where it should run)

No AI. Adapted.

- **How:** Analyses and layouts are glyph tokens. A node's ring fans out those that take a source node; a hull's ring the group-scoped ones; the full catalog sits on the base shelf. Drop on a node to set the source, on a second for the target, on a hull or selection for that scope, on empty space for the whole graph. Before release, the token shows estimated cost and preconditions; a red cost arms instead of running.
- **Controls:** list, point, confirm.
- **Strengths:** Scope and source by placement; catalog narrowed by what you touched; cost visible before committing.
- **Weaknesses:** Full catalog still needs a shelf; glyphs need hover names; small nodes need the proxy.
- **Sources:** Final Assault clipboard; Half-Life: Alyx fabricator; VR games survey catalog-as-objects. Invented: per-target narrowing, cost before release.

### 8.5 Mise en place rail

No AI. Adapted.

- **How:** A U-shaped waist rail of attribute and result jars (histogram on each lid) and palette tins; tools hang above (ladle = color, rolling pin = size, label gun, sieve = filter, tongs = select, knife = partition). Color by: dip the ladle in a jar and a tin, then pour. Filter: drop a jar in the sieve, set the mesh dial; removed nodes fall into a bowl. Algorithms come from a cooler and cook on a burner whose flame shows cost. A ticket records every step as a reusable recipe; plating a frame through the pass exports it.
- **Controls:** list, props, file, command, read.
- **Strengths:** Long attribute list in reach, arranged by the user; recipes fall out of normal work; cost visible.
- **Weaknesses:** 200 attributes overflow (needs a pantry with search); multi-step dips are slow; metaphor per tool.
- **Sources:** Kitchen mise en place; Job Simulator; tangible tokens. Invented: the rail, the ticket as recipe.

### 8.6 Pull-distance knobs

No AI. Adapted.

- **How:** Every number is a knob: pinch and twist with a tick per step. Pulling the hand away along a string makes ticks finer (10x per 15 cm); a spin flick makes large jumps. Detents at quartiles, mean, round values and actual data values; counts show effect live. Look at the knob and say a number for exact entry.
- **Controls:** number.
- **Strengths:** Exact values without a keypad; coarse and fine with no mode; data detents make typing rare.
- **Weaknesses:** Twisting large ranges is tiring; no haptics with hand tracking.
- **Sources:** PatchWorld knobs; Arkio and VR Sketch haptic snapping. Invented: precision by pull distance, quantile detents.

## 9. Layout

### 9.1 Layout molds and the shake

No AI. Invented.

- **How:** Layout methods are molds on the shelf (ring, grid frame, tree hanger, nested hoops, bins); press the graph or a held set into one to apply it (a center is touched first when needed). Force layout is the default. A short shake reruns, a harder shake reshuffles the seed, a still closed hand stops it. Grab a node to move, push until it clicks to pin, two-hand shake to unpin all. Option knobs on each mold. Pressing one set lays out only that set.
- **Controls:** list, command, number, point.
- **Strengths:** Each method's shape is legible before use; memorable verbs; subset layout is natural.
- **Weaknesses:** Shaking tires and misfires; abstract methods (spectral) have no obvious mold.
- **Sources:** VR VR games survey catalog-as-objects.

### 9.2 Hull handles (lay out by shaping)

No AI. Adapted.

- **How:** Grab a hull or the graph's box for handles: spread corners for spacing, flatten between palms for 2D, flick-spin for a circle, pull the top face up for a tree, shake to reshuffle the seed, hold still to stop. Drag a node to move, flick it down to pin, pluck the pin to unpin. Rarer layouts come from the token shelf.
- **Controls:** list (common layouts), number, command, point.
- **Strengths:** "Lay out only this group" becomes the default; layout feels like shaping.
- **Weaknesses:** More than 5 or 6 gestures are not memorized; many-option layouts still need a card.
- **Sources:** MRTK BoundsControl and ObjectManipulator; Gravity Sketch two-hand manipulation. Invented: handles as layout controls.

## 10. Panels and windows

### 10.1 The whole app, curved

No AI. Adapted.

- **How:** The unmodified desktop app on one large curved layer about 1.6 m away, with its canvas area cut out and the real 3D graph sitting in the cut-out at depth. Controller ray is the mouse (trigger clicks, stick scrolls the panel under the ray, grip grabs the graph); a physical keyboard for text; a text-scale knob reflows at 1.3x. Held: the graph comes out toward you. Outside: the window recedes behind. Inside: it shrinks to a waist strip of open panels.
- **Controls:** all.
- **Strengths:** Parity by construction; nothing to keep in sync; desktop knowledge carries over; the fallback for every other paradigm.
- **Weaknesses:** Small targets for a ray; dense tables worse at headset resolution; neck work at the edges; the graph feels like a guest.
- **Sources:** Virtual Desktop; Immersed; Mac Virtual Display Ultrawide; Virtualitics panels. Invented: the canvas cut-out holding the real graph.

### 10.2 Hinged triptych

No AI. Adapted.

- **How:** Three hinged leaves angled 25 to 35 degrees in: center is the graph volume, left is the navigator (section tabs plus the active list), right is the reader (inspector, result table, legend). A theater button enlarges one leaf. Held: folds around the graph like a book stand. Outside: opens flat behind. Inside: side leaves ride at your shoulders.
- **Controls:** list, read, point, command, props.
- **Strengths:** One learnable layout (find left, read right); mirrors the app's rail and inspector; the platform default.
- **Weaknesses:** One list and one reader at a time; comparison needs theater or a second triptych; large graphs overlap leaves.
- **Sources:** Meta Horizon OS three-window layout and Theater View. Invented: the fold for holding.

### 10.3 Ornament-rimmed graph volume

No AI. Adapted.

- **How:** Controls hang on the edges of the graph's bounds: bottom toolbar (undo with step name, fit, selection mode, layout), left filter-step chips with counts, right legend rows per style layer with eye toggles, top status and progress with cancel. Tapping a chip opens a popover in place. Constant angular text size. Inside, the ornaments regather into a waist ring in the same order.
- **Controls:** command, order, read, props, confirm.
- **Strengths:** Controls travel with the graph through scale and mode; nothing covers nodes; stacks always visible.
- **Weaknesses:** Room only for frequent controls; long catalogs elsewhere; crowded on a small held graph.
- **Sources:** visionOS ornaments; Android XR orbiters. Invented: ornaments on a 3D volume turning into a waist ring.

### 10.4 Personal cockpit

No AI. Adapted.

- **How:** A body-locked arc of small single-purpose windows just beyond arm's length, always in the same order (Data, Find, Inspector front-low, Analyze, Style, Filters, Notes, History); it turns with the torso, not the head. Looking toward a window enlarges it; glance-and-pinch or ray works it. Only the radius changes between modes.
- **Controls:** list, read, order, props, command, prose.
- **Strengths:** Spatial memory makes switching fast (40 percent faster in the CHI 2014 study); identical in all modes.
- **Weaknesses:** Cramped windows; arc collides with a big graph; far ends need head turns; calibration.
- **Sources:** The Personal Cockpit (Ens, Finnegan, Irani, CHI 2014); Ethereal Planes. New: application to graph analysis.

### 10.5 Off-hand palette that tears off

No AI. Adapted.

- **How:** The off hand holds a tablet (about 30 x 22 cm) with section tabs, or a six-faced box rolled by the thumb (Style stack, Filter stack, Results, Catalog, Sets, Project); the dominant fingertip pokes as a small cursor, the off stick pages. A letter strip along the top narrows every list on the face by sliding a finger (type-ahead without a keyboard), with recents ringing the edge. Style layers and filter steps are plates stacked edge-on: slide to reorder, flick off, pull out to edit. Each face's back is read-only (legend behind Style, counts behind Filter). Pinch a page or face rim and pull to tear it off into a world slate with a leader line; a return corner or slap re-docks. Dropping the hand parks the tablet; raising it recalls it. Held graph docks on the top face; inside, the palette is the kit that always comes with you.
- **Controls:** list, order, props, number, read, command, point, text (short).
- **Strengths:** Precise direct touch on a steadied surface; proven two-hand pen-and-pad; long lists without a keyboard; short tasks on the hand, long ones in the world with no mode switch.
- **Weaknesses:** Ties up the off hand (cannot hold graph and palette at once); arm fatigue; about 8 rows per face at headset text size; search strip slower than typing.
- **Sources:** Personal Interaction Panel (1997); Tilt Brush/Open Brush palette; Quill tablet; Arkio tear-off menus; MRTK hand menu peel-off; Nanome list filter. Invented: search edge, order plates, two-sided faces, the palette as the kit inside the graph.

### 10.6 Tethered cards (one card per object)

No AI. Adapted.

- **How:** Every object (node, edge, set, style layer, filter step, result, note) opens a card beside it with a leader line, holding its inspector and verbs; neighbor rows retarget the line. Cards follow their object and avoid each other; grab a handle to detach (the line stretches). A compare button between two cards gives side-by-side statistics. Inside, cards open at 1 m.
- **Controls:** read, point, props, command, list (short).
- **Strengths:** Always clear what is being edited; reading and acting in one place; maps one to one onto the object model.
- **Weaknesses:** Clutter (needs collapse to chips); leader lines through dense graphs; object-less commands need another surface.
- **Sources:** ShapesXR Object Inspector; Freeform pop-up bar. Invented: cards for every app object including layers and steps.

### 10.7 The analyst's wall

No AI. Adapted.

- **How:** Long-reading panels pin to real walls (passthrough) or virtual walls and persist with the project: rankings, community list, data table, histograms, notes list. Link beams run from a pointed row to its node; a selected histogram band lights and can select or filter nodes. Pull a panel to your hands to edit, throw it back. From inside, walls show through with depth fade.
- **Controls:** read, point, list, compare.
- **Strengths:** Real room for reading; a stable visible record of the analysis; switch task by walking.
- **Weaknesses:** Needs space; seated users get one wall; far walls need huge text; ray editing on a wall tires.
- **Sources:** visionOS 26 wall widgets; Workrooms wall board; Microsoft Research VR spreadsheets. Invented: wall-to-graph beams.

### 10.8 Desk slate

No AI. Adapted.

- **How:** A panel flat or tilted on the real desk, worked by a fingertip that stops on the wood: forms, sliders, the rule editor, filter steps, layer list; drag rows to reorder, slide a finger to scrub numbers. A physical keyboard at its edge with the text field just above. The graph floats above the desk. Outside it becomes a hip-height lectern that follows you; inside, a waist lectern.
- **Controls:** props, number, order, text, prose, confirm, point.
- **Strengths:** Fast accurate touch with no arm fatigue; the natural home for the rule editor; keyboard and field together.
- **Weaknesses:** Needs a desk (or loses haptics); looking down strains the neck; calibration drift in full VR.
- **Sources:** Horizon Workrooms desk mode; Personal Interaction Panel; passive haptics research. Invented: slate as rule-editor home with lectern fallback.

### 10.9 Pull-near reading lens (distance as density)

No AI. Adapted.

- **How:** Grab any window and move it along your line of sight: far (2 m or more) it is a glance tile with a title and one number; middle a normal panel; near (40 to 60 cm) a dense reading and editing pane with more rows and pokeable controls. It springs back on release unless pinned. Inside, pulling near dims the nodes behind.
- **Controls:** read, props, number, command.
- **Strengths:** Three densities with no compact/full switch; distance reconciles reading far with touching near.
- **Weaknesses:** Three layouts per window; form change while moving can surprise; crowds the face.
- **Sources:** Projective Windows (Lee, An, Kim, Bae, CHI 2018). Invented: distance as semantic zoom of panel content.

### 10.10 Mode-aware concierge panel

No AI. Adapted.

- **How:** One main panel docks by fixed rules: held, a book stand under the graph; outside, hinged beside the graph at 1.5 m and 5 degrees down, lazily following as you walk; inside, body-locked at the waist like a music stand. It shows the app's panels as a stack with a back button; secondary panels open as edge ornaments; a pin freezes it.
- **Controls:** list, props, read, command, number, text.
- **Strengths:** Never hunt for the UI after a mode change; simplest to build and learn.
- **Weaknesses:** One panel at a time; follow rules annoy some (tunable distances needed).
- **Sources:** MRTK tag-along, radial view and near-menu solvers; Unity EditorXR workspaces. Invented: dock rules tied to graph modes.

### 10.11 The plinth (graph-wide controls on the graph's base)

No AI. Adapted.

- **How:** A low base under a held or tabletop graph (a waist ring inside). Front edge: project label (rename by voice), undo and redo knobs with step names. Left: layer stack, filter stack, analysis token shelf. Right: graph statistics, degree terrain, legend. A recessed tray deletes what is dropped in. A corner seal saves. An L-frame with both hands plus a pinch exports a picture card with format and size dials on its back. Other projects stand as small plinths on a shelf; set one down to open it.
- **Controls:** command, file, list, read, text, order.
- **Strengths:** Graph-wide verbs stay on content; reachable in all three modes; frame-to-export is natural.
- **Weaknesses:** Dense on a small held graph; arbitrary file opening still needs a picker; drifts into a conventional panel.
- **Sources:** Open Brush sketchbook and camera; Workrooms desk surface; Demeo's tiltable board. Invented: the plinth as home of graph verbs, frame-to-export.

## 11. Notes and prose

### 11.1 Spoken notes pinned to their subject

No AI. Adapted.

- **How:** A note is a pebble or flag planted on a node, edge, hull, path, selection, filter or style plate, the graph or a viewpoint (from a thumb verb or a ring's Note petal). Hold the thumb or the pole and speak; on-device dictation writes it. Edit by touching a word and saying it again, sweeping a phrase and re-dictating, or tossing a sentence; a passthrough or tracked keyboard types into the note you look at, a drum keyboard as last resort. Touching or dropping a result while dictating inserts a live citation. Toss the note to delete. A note rail on the shelf, or flags pulled into a bouquet with an open palm, lists every note and flies you to its subject. Keep only the transcript.
- **Controls:** prose, point, list, read, command.
- **Strengths:** Notes stay attached to what they describe; no keyboard needed; word-level correction without typing; a notes list without a panel.
- **Weaknesses:** Punctuation and jargon; long edits clumsy; markers clutter small graphs; audio privacy.
- **Sources:** The Wild speech-to-text comments (https://thewild.com/blog/comment-tool-speech-to-text-annotation-vr-design-review); Arkio; Resolve; ShapesXR Holonotes; Cutie Keys drum keyboard (https://github.com/NormalVR/CutieKeys). Invented: word-level re-dictation, cite by touch or drop, note rail and bouquet.

### 11.2 Notebook, stylus and pinned pages

No AI. Adapted.

- **How:** The off hand holds a notebook; write with a tracked stylus (Logitech MX Ink, which supports WebXR) or fingertip. Ink stays ink; a microphone clip on the spine adds dictation. Tear a page out and press it onto a node, edge, set jar, selection or empty space to attach it (folded-corner marker). Dropping a torn ranking tape or gauge on a page cites it live. Index tabs list notes and fly you to them. In passthrough, write against a real desk.
- **Controls:** prose, point, read, list, command.
- **Strengths:** A real writing surface; notes found in place and by index; ink beats a virtual keyboard for short notes.
- **Weaknesses:** Ink not searchable without recognition; stylus is an extra purchase; editing long paragraphs is awkward.
- **Sources:** Personal Interaction Panel (Szalavari, Gervautz 1997); Logitech MX Ink; The Wild and Arkio voice notes; ShapesXR Holonotes; Workrooms desk writing. Invented: tear-and-pin pages, live citations.

### 11.3 Narrated notes

No AI (optional AI cleanup). Adapted.

- **How:** Hold a record bead and talk while exploring. Speech is transcribed and split into short notes, each anchored to what you were looking at, pointing at or had selected when you said it. Draft cards hover by their anchors: accept, merge, drag the tether to another anchor, delete. A timeline scrub replays where you looked. AI wording cleanup only on request, as tracked edits.
- **Controls:** prose, point, read.
- **Strengths:** Removes air typing for the one core prose task; notes self-anchor.
- **Weaknesses:** Gaze timing misanchors in dense areas; speech in shared rooms; word-level edits hard.
- **Sources:** Spatial voice-to-text sticky notes; Arkio transcription; GazePointAR. Invented: self-anchoring notes.

## 12. History, undo and confirmation

### 12.1 Wearable history strip (ribbon, spool, bracelet)

No AI (optional AI undo by meaning). Adapted.

- **How:** Undo and redo are thumb verbs, or winding a reel. History is a strip of named steps worn on the body: beads on an off-hand wrist ribbon or bracelet, or labeled tiles on a tape reel at the belt ("Ran Degree", with a thumbnail). Slide or turn along it for a live ghost preview; release to return to the present or squeeze or tap to make that step current. A new step after an undo forks a branch (or the cut tape hangs on a hook) so nothing is lost. Pinch-and-twist ties a knot, or a clothespin marks a tile, as a named checkpoint, which is also a saved view or version. Data versions are the same strip in another color. Steps that cannot be undone look different; expensive steps preview from stored results. A step can be removed from the middle only when later steps do not depend on it. With AI: "go back to before I filtered" or "undo the assistant's last three things" highlights the matching steps and previews before anything happens.
- **Controls:** command, list, read, confirm, text.
- **Strengths:** Safe exploratory undo; branches never lose work; one object covers undo, checkpoints, versions and saved views; naming every step fixes the undo-granularity surprise Gravity Sketch users report; the AI's actions are as reversible as yours.
- **Weaknesses:** Long histories must collapse between checkpoints; branches confuse some people; another object on the body; mid-history removal is risky.
- **Sources:** Gravity Sketch history clock (https://help.gravitysketch.com/hc/en-us/articles/5912754499997-Delete-Undo-and-Move-Through-Timeline-History); VR Sketch icon row; Open Brush hold-to-repeat undo; ShapesXR frames. Invented: branching strip, knots and clothespins as saved views, undo by meaning.

### 12.2 The time river

No AI. Adapted.

- **How:** Each undoable step is a stepping stone with thumbnail and name in a river on the floor behind you. Stepping back, or pulling the river like a rope when seated, scrubs the graph through past states; editing from an earlier stone forks the river. Saves and views are flagged stones; reopening a project is walking to its flag. A cleaning step can be lifted out and later steps rerun. The data's own timeline is a second channel. Inside, the river is a ring around your waist.
- **Controls:** command, list, confirm, file, number (time windows).
- **Strengths:** Undo is unmistakable and findable; branching makes exploration safe; merges undo, history, versions and saved projects into one place.
- **Weaknesses:** Long sessions need compaction; you must stay near it; thumbnails are costly; forked history is new to most.
- **Sources:** Gravity Sketch history clock; Quill timeline; Bret Victor, Inventing on Principle. Invented: walkable forking river with saves as flags.

### 12.3 Trail tails (undo where it happened)

No AI. Adapted.

- **How:** Global undo and redo with step names live on the base. Every recently changed object also carries a short comet tail of the steps that touched it; draw it back to preview earlier states, release on a segment to apply "restore this object as of step N" as a new undoable step.
- **Controls:** command, list, read.
- **Strengths:** Answers "what did I do to this?" at the object; restore keeps unrelated later work.
- **Weaknesses:** Not true selective undo; dependent steps need out-of-date warnings; tails clutter unless hover-only.
- **Sources:** Gravity Sketch history clock; VR Sketch action icons. Invented: per-object tails, restore as a new step.

### 12.4 Command log slab

No AI. Adapted.

- **How:** Every action from any input is written as a readable command line with its result ("filter where degree > 3 -> 412 of 1,204") in a floating log. Pull a line toward you to undo back to it; dial a past parameter to rerun that step and replay what follows (cost shown first); select lines to keep as a recipe for other data; reorder commuting lines (refused with a reason otherwise). Watching it teaches the textual language.
- **Controls:** read, list, number, props, order, command, file.
- **Strengths:** Undo, versions, revise-and-rerun, recipes and provenance from one object; mirrors graphty-element's session command vocabulary.
- **Weaknesses:** Text-heavy; long logs need folding and search; replays can be expensive.
- **Sources:** ChimeraX command log; Jupyter notebooks; shell history. Invented: grabbable replayable log in a headset.

### 12.5 Plan conveyor

No AI (AI only to plan from a sentence). Adapted.

- **How:** A multi-step request or recipe becomes step cards on a waist belt moving toward a gate; each runs as it passes. Palm on the gate pauses. Pull a card off to skip, insert your own, swap two, open one for options. Run cards stay behind the gate as history; pulling one back undoes it and everything after. A finished belt saves as a recipe.
- **Controls:** order, command, props, confirm.
- **Strengths:** Plans inspectable before and interruptible during a run; recipe, history and plan are one object.
- **Weaknesses:** Reordering can break dependent steps; floor space.
- **Sources:** Plan views in coding agents. Invented: the conveyor with a gate.

### 12.6 Heft and the shredder

No AI. Adapted.

- **How:** An algorithm or layout pulled from the shelf feels heavy in proportion to estimated cost (haptic drag, slow follow, time label); items that cannot run here are chained to the shelf with the reason on the chain. Lifting a heavy item past the shoulder confirms; a lighter twin runs the sampled version. Delete by carrying or flicking the selection into a shredder slot showing counts. Reset is a fist held on all the gels until a ring fills. Other consequential actions arm when held and fire on a second act with distinct sounds. Cancel a run by crushing its progress ring.
- **Controls:** confirm, read, command.
- **Strengths:** Confirmation without interruption; cost learned through the body; no dialogs.
- **Weaknesses:** Weak haptics with hand tracking; needs a seated flick form; experts' frequent items should lighten.
- **Sources:** Half-Life: Alyx gloves hold-to-arm; Walkabout grip-to-putt. Invented: cost as weight, chains, shredder.

### 12.7 Ghost preview with a scrub handle

No AI. Invented.

- **How:** Every proposed change shows first as a ghost over the live graph: wireframes for nodes a filter would remove, translucent target positions for a layout, a half-opacity shell for new colors. A badge gives the count difference; the thumbstick scrubs between before and after. Pinch the badge or say "do it" to commit; flick away to reject.
- **Controls:** confirm, read, command.
- **Strengths:** Review any action (including AI ones) without a dialog; shows what would change.
- **Weaknesses:** Slow algorithms preview only after running; one pending proposal at a time.
- **Sources:** Editor previews; Gravity Sketch.

## 13. Projects, files and export

### 13.1 Projects as objects, with a camera and an outbox

No AI. Adapted.

- **How:** A project persists continuously (graph, panels, notes, stacks, history), so there is no Save to forget; squeezing it also saves in place. Recent projects and sample datasets stand on racks or a lobby sideboard as live dioramas or cartridges with live thumbnails. Pick one up for its info; raise it to your face, or slot it into the pedestal under the graph, to open it; pull it out to close (a light warns of unsaved changes). Name it by speaking while holding it; Save as breaks off a copy or presses a blank cartridge (suggested name on a sticker, rename by keypad or dictation). Picture export: a camera carrying every setting on its body (format and size dials, transparency and legend switches, a scope ring); frame, shoot, and a print drops out as a downloaded file. Data export: put the graph, a jar or the selection into an outbox or printer with a dial for the 13 writable formats and a scope switch (all, selection, filtered). A crate or mailbox opens the headset's file system and Downloads as drawers or envelopes; a web address can be spoken; an optional companion page can drop files in.
- **Controls:** file, list, text, command, confirm.
- **Strengths:** No fear of lost work; open, save, picture export and data export without a file dialog; export settings visible before shooting; projects recognized by sight.
- **Weaknesses:** Limited file access for web apps on headsets (the browser picker still appears); the companion page must stay optional; live dioramas cost rendering; many cartridges need paging.
- **Sources:** Open Brush sketchbook and camera; ChimeraX sessions that save VR state (https://www.cgl.ucsf.edu/chimerax/docs/user/vr.html); Google Earth VR raise-to-face; Job Simulator cartridges; ShapesXR viewpoint screenshots. Invented: diorama lobby, outbox and printer, camera carrying export settings.

## 14. AI-mediated control

### 14.1 Deictic assistant that answers in editable objects

AI. Adapted.

- **How:** Palm up, or while touching, pointing or looking, speak in ordinary language ("color these by department", "hide everything not connected to that", "path from here to there"). The model receives the touched or pointed objects, the gaze target at each spoken word, the selection, layers and scope. It answers only with ordinary objects the no-AI paradigms use (rule pieces, gels, filter steps or shells, shelf items, look-stack plates, a skyline, note flags), assembled in the air one part at a time while affected elements flicker. An echo line shows the resolved command; correct it by pointing and saying "no, this". Touch to accept, pull a part out to edit, brush away to reject. Answers to questions are cards attached to their subject with lines to cited nodes.
- **Controls:** prose, text, props, list, read, point, command.
- **Strengths:** Reaches operations whose names you do not know; fastest route for compound requests; resolves "this" and "that", closing the gap Nanome named; every result is checkable and editable by hand, so AI and no-AI paths converge.
- **Weaknesses:** Needs a configured provider, key and network; plausible but wrong rules must be checked; slower than a thumb verb for known actions; gaze into dense 3D is ambiguous; speech privacy and noise.
- **Sources:** Nanome MARA voice and its pointing gap (https://nanome.ai/blog/nanome-v2.4.0:-early-access-release-mara-voice-commands-minimization-chem-interactions-and-more!); Flow AI (https://flowimmersive.com/flowai); Bolt, Put-That-There (1980); GazePointAR (CHI 2024); voice study for immersive network analysis (arXiv 2607.26526); PatchWorld agentic patching. Invented: answering only as in-place editable objects.

### 14.2 Ghost hands

AI. Invented.

- **How:** Asked to do something or "how do I...", translucent ghost hands perform the manual steps at a followable speed, each step named; take over at any point. "Do that for the other groups" repeats the sequence; "keep that as a recipe" stores it as a bead string on the shelf.
- **Controls:** command, list, file (recipes); teaches every kind.
- **Strengths:** Turns AI help into learning the no-AI controls; recipes get a physical form.
- **Weaknesses:** Slower than acting directly; can disorient; only as good as the plan.
- **Sources:** None found.

### 14.3 Generated workbenches and task panels

AI. Adapted.

- **How:** Describe a task ("vary community resolution and watch the group count", "compare degree and betweenness") and the assistant assembles a small panel or workbench from a fixed set of tested parts bound to real commands and element state (slider, Run, live readout, histogram, scatter of nodes, linked range sliders, list, table, play bar), so brushing a range selects nodes. Reshape it by hand; it keeps working with AI off and saves with the project or as a named tool on your belt. It sits on the table, as a lectern, or folds out on the wrist by mode. Hand-made task panels (Characterize, Rank, Communities, Path, Filter by value) are the no-AI fallback.
- **Controls:** props, number, command, read, point.
- **Strengths:** Covers the long tail of tasks without a permanent panel each; cuts desktop forms to the few controls a task needs; durable artifacts, not chat; fixed parts keep generated UI predictable.
- **Weaknesses:** A wrong panel wastes time; layouts vary between runs, hurting learning; a misleading chart choice; needs a provider and key; designing the parts set is the real work.
- **Sources:** Google Generative UI; LEGOUI (2026); XR Blocks (2025); Unreal's curated Virtual Scouting palette.

### 14.4 Assistant side window with show me

AI. Adapted.

- **How:** A tall narrow window at the non-dominant side shows the conversation in large text. Answer chips name nodes, sets, results, filters or styles; hovering one beams to its subject; tapping applies it as an undoable step. Dictation writes notes the assistant can tidy with citations. Inside, body-locked at the shoulder.
- **Controls:** prose, read, point, command.
- **Strengths:** Covers the assistant and notes with citations; beams make answers checkable.
- **Weaknesses:** Only as good as the model; long answers tire; competes with the inspector for the side.
- **Sources:** graphty's assistant; Flow AI. Invented: chip-to-node beams.

### 14.5 The familiar (shoulder companion)

AI. Adapted.

- **How:** A small creature, orb or plain cube on your shoulder. Hand it a tool or point at something and speak; it hands back a loaded tool, a rule tray or a cartridge for you to apply or edit ("betweenness, small to big, blue to red" sets the brush; "which algorithm finds bridges?" returns the cartridge). It also watches the command stream and offers suggestion cards at the edge of view (grab to accept, flick to dismiss), and flies to the part of the graph it changes. A tether from your wrist sets its autonomy: short means suggest only, medium prepares previews, long acts and you review afterward. Inside, it can lead you somewhere. "What can I say?" lists its commands.
- **Controls:** list, props, text, prose, command, read, confirm.
- **Strengths:** Shortcut through long lists and forms; every result is a physical object fixable by hand; where and how much the AI acts is visible at a glance.
- **Weaknesses:** Speaking aloud; latency; a character can distract or put experts off; unwanted suggestions annoy; a body invites overtrust; needs a provider key.
- **Sources:** Fantastic Contraption cat; Nanome MARA; syGlass "what can I say"; PatchWorld agentic patching; Meta AI on Quest; Virtualitics AI routines; the Office Assistant as a warning. Invented: handing tools to the AI, the autonomy leash.

### 14.6 The oracle lens

AI. Adapted.

- **How:** A glass pane with a question ring on its frame. Hold it over a cluster, ranking tape or node and turn the ring to a stock question (What is this group? What stands out? Why is this node central? What changed since the checkpoint?) or ask your own. The answer appears on the glass with marks on the graph behind; each claim has a "show me" corner lighting its evidence. Tear the answer off to pin it as a note.
- **Controls:** read, prose, point.
- **Strengths:** Help where reading is hardest; scoped by what is under the glass; answers become notes.
- **Weaknesses:** Can be confidently wrong; costly on large graphs; helps read, not act.
- **Sources:** Magic Lenses (Bier 1993) with Arkio and Nanome voice assistants. Invented: question ring, tear-off answers.

### 14.7 Conjured instruments

AI. Adapted.

- **How:** Say an edit ("size nodes by betweenness"); the assistant applies it and leaves a small instrument for it (attribute chip, two-handle size-range slider, linear/log toggle). Instruments collect on a waist rail that follows you through modes; further changes happen on the knob, not by talking. Dropping one in a bin removes its edit (undoable).
- **Controls:** props, number, list.
- **Strengths:** Only the controls that matter appear; exact values with instant feedback; DynaVis found language plus a generated widget preferred over language alone.
- **Weaknesses:** Hard to discover what to ask; rail clutter; two instruments can fight over one property.
- **Sources:** DynaVis (CHI 2024); Spatula (2026). Invented: the spatial rail.

### 14.8 Answer objects

AI. Adapted.

- **How:** Questions get objects plus one spoken sentence: a ranking is a column of node tokens tethered to their nodes, a community result is a set of bins, a graph profile is a card stack. Place them on the table, in the room or in hand. Drop a ranking on the graph to select it, drag its cut line for top N, drop a bin on the filter stack, throw an answer onto the notes board to cite it.
- **Controls:** read, point, number.
- **Strengths:** Avoids the keyhole failure of chat for data; legible at arm's length; an answer is the input to the next action.
- **Weaknesses:** Clutter; distributions take space.
- **Sources:** Flow Immersive's Flow AI; BadVR; Google Generative UI. Invented: tethers, answers dropped as operations.

### 14.9 The docent

AI. Adapted.

- **How:** A museum-style guide beside the graph. Ask a question and it frames the view, highlights, runs analyses and speaks a short answer; a caption card shows the numbers and the command it issued, so it can be undone. It offers tours (largest component, hubs, communities, bridges, isolates), writes dictated notes attached to what you point at with citations, and assembles stops and notes into a findings report.
- **Controls:** read, prose, list, command.
- **Strengths:** Fastest path to the core tasks for newcomers; prose without a keyboard; any mode.
- **Weaknesses:** Needs a provider; confidently wrong answers; the user becomes a passenger; speaking aloud.
- **Sources:** Museum docents and audio guides; Flow Immersive AI; graphty's assistant.

### 14.10 Sculpt the answer

AI. Invented.

- **How:** Push the graph into the shape you expect (pull clusters apart, squeeze a group, sort nodes left and right, stretch a chain). On release, cards offer operations that would produce a similar arrangement for good: columns by department, Louvain communities with an agreement percentage, a tree layout from a root, a filter to these groups. Take one or let the graph spring back.
- **Controls:** list (layout and algorithm choice), props (inferred parameters), point.
- **Strengths:** Reach algorithms you cannot name through the shape you expect; two-handed pushing suits headsets.
- **Weaknesses:** Inference from rough arrangements is unreliable; slow on large graphs; can confirm bias.
- **Sources:** Related to semantic interaction in visual analytics.

## 15. Data preparation (nice to have)

### 15.1 Preparation bench (sockets, knots, bins)

No AI (optional AI suggests fixes). Adapted.

- **How:** A bench unfolds from the lobby. An imported table arrives as a crate or fanned deck of row cards; columns are tabs or spools of thread, each with name and a small value chart; refused rows are loose threads you can pull and read. Map columns by dropping tabs or hanging spools into sockets or pegs on the graph frame (From, To, Key, Weight, Time, Label) and on typed pegs (category, number, ordered, time), or by turning a tab to one of four faces, while a preview graph rebuilds. Join by holding a key column in each hand and bringing them together, or tying spools: matches become threads or knots with a count, unmatched rows dangle in red, fix one by saying the right value or touching it to its match. Problem rows arrive in an inbox to be sorted into drop, merge or fix bins. Merge duplicate nodes by pressing two node cards together, or with welding tongs that fire on hold. Every fix is a card action and a history step.
- **Controls:** file, props, list, point, read, confirm.
- **Strengths:** Joins and mappings become visible placements; problems are discrete objects to count and clear; provenance stays visible in space; every fix undoable.
- **Weaknesses:** Cards and threads do not scale past a few hundred problem rows (bins must accept "all like this one"; summarize big tables); voice needed for text fixes; much new vocabulary; slower than a desktop join dialog.
- **Sources:** "This is the Table I Want!" (IEEE VIS 2023); Noda list import; PatchWorld wiring; VR games survey join-by-touch and row bins. Invented: frame sockets, four-faced tabs, spools, pegs, knots, fusing cards, welding tongs.

### 15.2 Node and graph surgery

No AI (optional AI pre-draws merges and joins). Adapted.

- **How:** In an editing mode switched on at the wrist: pinch empty space to spawn a node and label it from a pick list or by dictation; drag a strand between nodes to make an edge; pull an edge sharply to tear it. Push two nodes together to merge them, with a ghost of the result and a seam card where conflicting values are two-sided cards you flip to choose (armed confirm). Fix a value on the node's attribute cards, or drop a value card on a selection to fill missing values; twist an attribute card to say how it is read. A second table can arrive as a cloud of bare nodes joined key card to key card (threads with a count, unmatched nodes dangle, pinch the bundle to fuse). Each action is a recipe or history step.
- **Controls:** point, command, confirm, text, list.
- **Strengths:** Merging and joining become physical bringing-together; the most natural control for small hand edits, best inside the graph.
- **Weaknesses:** Row-by-row work does not scale (bulk fixes need a rule plus a value card); accidental triggers (hence the mode); dense graphs need a magnifier; messy keys need fuzzy matching.
- **Sources:** Gravity Sketch and Open Brush pinch-to-create; Open Brush Join; "This is the Table I Want!" (IEEE VIS 2023). Invented: tear, press-to-merge, seam cards, thread bundle.

### 15.3 Key handshake (join by bringing keys together)

No AI (optional AI matches by meaning). Adapted.

- **How:** Each table is a slab; pull the key column of each out as a strip, one per hand, or bring two slabs together so proposed key matches appear as strings between headers labeled with match rates. Matching values bridge the seam with a count; unmatched values droop below like loose threads. Pluck a string to keep it, cut to drop it, draw a new one by hand, or lay a drooping thread against a value to pair it. Twist the strips to change the match rule (exact, case-blind, trimmed). The joined network grows as a preview between the slabs; let go to commit.
- **Controls:** list, props, read, point, confirm.
- **Strengths:** Join quality visible before committing (the droop is the unmatched set); two hands for a two-sided operation.
- **Weaknesses:** Shows only key columns; large joins must be summarized; arms out is tiring; wide tables do not fit a slab.
- **Sources:** Merge-by-collision in "This is the Table I Want!" (https://arxiv.org/abs/2309.12168); OpenRefine; Wrangler; VR games survey key-column-in-each-hand. Invented: droop, twist, hand pairing, strings with match rates.

### 15.4 The crate (import as unpacking)

No AI. Adapted.

- **How:** An opened file arrives as a crate on a waist bench, lid printed with name, format and row counts. Lifting the lid raises a preview graph in a glass volume; import problems hang as red tags you can unfold into the offending rows. Push the crate into the graph to load or replace, set it beside the graph to add another graph, or drop it down a chute to discard. An unparseable file arrives cracked with file, line and column on the crack.
- **Controls:** file, read, confirm, command.
- **Strengths:** Checking before committing is physical and unskippable without a modal; errors are holdable objects; body-anchored, so it works in every mode.
- **Weaknesses:** A step before the graph appears; very large files preview only a sample.
- **Sources:** VR VR games survey import-as-unpacking; visionOS volumes; Brass Tactics place-to-commit. Invented: cracked crate, error tags.

### 15.5 Role sockets (column mapping as plugging)

No AI. Adapted.

- **How:** Each column hangs from a rail as a plug tagged with its name and three sample values. The crate's front has sockets (From, To, Key, Weight, Time, Label, attribute strip). Plug columns in and the preview rewires live; a wrong-type plug will not seat and shows why. Delimiter and header-row toggles sit on the rim.
- **Controls:** props, list, read, point.
- **Strengths:** Cause and effect a hand apart; two-handed From and To; errors are refusals to seat, not after-the-fact messages.
- **Weaknesses:** 200 columns make a long rail (paging or search wand); cables tangle.
- **Sources:** PatchWorld and synth patching; ImAxes columns-as-objects. Invented: sockets replacing a mapping form.

### 15.6 Cluster pucks and duplicate piles

No AI. Adapted.

- **How:** A text column's distinct values float as pucks sized by row count. Deterministic similarity (OpenRefine key collision, then nearest neighbor) pulls look-alikes into clumps or piles. Squeeze a clump between both hands to fuse it into one value; flick or pull a wrong member out first. An off-hand dial changes the clustering radius live. On the node id column, clumps are duplicate nodes and squeezing merges them.
- **Controls:** point, command, number, read, text.
- **Strengths:** Hundreds of candidate clusters scanned in seconds; puck size shows what matters; dedup becomes sorting, which hands do well.
- **Weaknesses:** Categorical text only; long values do not fit; a wrong node merge is costly.
- **Sources:** OpenRefine clustering (https://openrefine.org/docs/technical-reference/clustering-in-depth); squeeze from "This is the Table I Want!". Invented: pucks, live dial.

### 15.7 Triage bins

No AI. Adapted.

- **How:** A problem finder emits each problem row (missing id, duplicate edge, non-number in a number column, edge to an unknown node) as a card on a conveyor. Toss each into Drop, Keep, Merge or Fix (Fix opens the cell). A card corner applies the decision to every card with the same reason. Each bin is an undoable step; pull a card back to undo one decision.
- **Controls:** command, point, read, confirm, text.
- **Strengths:** Fast and rhythmic; decisions stay visible; tossing tolerates shaky tracking better than buttons.
- **Weaknesses:** Needs the all-like-this shortcut past a few hundred rows; tosses near bins are ambiguous.
- **Sources:** Job Simulator; UX card sorting; throw-to-delete from "This is the Table I Want!". Invented: bins as an undoable record.

### 15.8 Column strips (sculpt a column)

No AI. Adapted.

- **How:** Grab a header and it becomes a rod with one tick per row (swatches for categories, a ruler for numbers, a timeline for time), gaps for missing values. Twist the rod to say what it holds; unreadable ticks turn red. Pinch a tick to correct it; wipe a fill sponge across gaps (zero, mean, constant, nearest); pull swatches apart to partition; drop the rod on selected nodes to add an attribute.
- **Controls:** list, number, point, read, text.
- **Strengths:** Type and gaps seen before they silently break a style or algorithm; twist replaces a buried dropdown.
- **Weaknesses:** Thousands of ticks blur (aggregate); twist needs a visible hint.
- **Sources:** ImAxes axes as held objects. Invented: twist-to-type, fill sponge, rod as attribute stamp.

### 15.9 The recipe rail

No AI. Adapted.

- **How:** A chest-high rail from the raw crate to the graph holds every preparation step as a labeled block in order. Lift a block off to turn the step off and watch the graph re-derive; put it back to reapply; slide to reorder; a lens slid along the rail shows before and after at any point. Grab the whole rail to save a reusable recipe. Lifting a join dims its dependents.
- **Controls:** order, command, read, file.
- **Strengths:** Matches the finding that VR users kept intermediate states and recalled steps better; undoing a middle step is a lift.
- **Weaknesses:** Dependencies must be shown; long rails need folding.
- **Sources:** DataHop steps-as-places; "This is the Table I Want!" provenance finding; VR games survey plates and sieves. Invented: the lens.

### 15.10 Graph overlay join

No AI (optional AI suggests partners). Adapted.

- **How:** A second dataset loads as a small graph in the off hand. Carry it into the main graph: nodes with matching keys pull toward their partners and lock with a click; non-matching nodes collect in a halo ring. A dial on its base picks the key attribute on each side. Release to commit; the halo stays as an un-joined set.
- **Controls:** point, list, read, confirm.
- **Strengths:** Shows what the join means for the network; works held and is striking from inside.
- **Weaknesses:** Needs a marker for attribute conflicts; must summarize hundreds of locks.
- **Sources:** Merge-by-collision from "This is the Table I Want!" moved to graphs. Invented: magnetism, halo.

### 15.11 Punch list

No AI (optional AI groups flags). Adapted.

- **How:** While exploring, flag anything that looks wrong with a point and a pull-tab-down gesture, optionally with a dictated remark. Flags collect on a hip clipboard; opening it feeds flagged rows to the triage conveyor or opens the table wall filtered to them. Flagging never changes data.
- **Controls:** point, command, prose, read.
- **Strengths:** Captures problems found during analysis without breaking flow; fits data prep's lower priority.
- **Weaknesses:** A second queue beside notes (the line must be clear); deferred work can become never.
- **Sources:** Construction punch lists; BIM issue pins (The Wild, Resolve). Invented: pull-tab gesture.

### 15.12 Workbench slab (keep it 2D)

No AI. Seen.

- **How:** A large flat slab at reading angle, anchorable to a real table in passthrough, holding the desktop data page's grid and import form unchanged; ray or touch, thumbstick scroll, virtual keyboard or dictation. Any other paradigm can open its subject here for dense precise work.
- **Controls:** props, list, text, read, order, confirm, file.
- **Strengths:** Complete parity at the lowest cost; nothing to learn; honest answer for wide tables and long expressions.
- **Weaknesses:** Shows less than a monitor; ray over a fine grid tires; slow typing; adds nothing VR does better.
- **Sources:** Virtualitics panels; Unreal VR mode; ShapesXR floating inspectors.

### 15.13 Say it, see the ghost

AI. Adapted.

- **How:** Palm up, speak a fix ("drop edges with no weight", "join messages to people on sender equals name"). A model turns it into one ordinary operation; affected rows and nodes ghost red and a card shows the operation as structured fields. Pinch to apply, flick to cancel, grab to edit any field. Applied, it lands as a recipe rail block.
- **Controls:** prose, text, props, confirm.
- **Strengths:** Removes long-list and rule-building costs; never opaque: an editable undoable step.
- **Weaknesses:** Misheard or plausible-but-wrong columns; needs provider, key and network.
- **Sources:** Flow Immersive AI; Tableau for visionOS spoken filters. Invented: ghost preview and step card.

### 15.14 Paper in (passthrough capture)

AI. Adapted.

- **How:** In passthrough, frame a printed table, a whiteboard network drawing or a phone screen with two L-shaped pinches. It is read into a crate as rows, or as nodes and edges; low-confidence cells glow for fixing before load.
- **Controls:** file, read, point, confirm.
- **Strengths:** The one data source a headset has that a desktop lacks; strong for workshops.
- **Weaknesses:** Unconfirmed whether WebXR on Quest Browser can read the camera (the Quest Passthrough Camera API, Horizon OS v74, is documented as native-only); recognition errors; room privacy.
- **Sources:** Office Lens and Excel scan-to-table; Quest Passthrough Camera API (roadtovr.com). Invented: L-pinch framing, whiteboard-to-graph.

### 15.15 The data steward

AI. Adapted.

- **How:** A companion lays proposal cards around a loaded crate, each pointing at its subject: a likely join key with its overlap, a date column stored as text, ids differing only by case. Taking a card opens the matching hand paradigm already set up (key handshake with both columns in hand, cluster pucks already clumped). Ignored cards fade. It never applies anything itself.
- **Controls:** read, confirm, list.
- **Strengths:** Finds the join key for a novice; hands off to no-AI paradigms, so the user still acts and sees the result.
- **Weaknesses:** Proposal clutter; a confidently wrong card is worse than none.
- **Sources:** graphty Insights strip made spatial; PatchWorld agentic building. Invented: hand-off into a pre-set paradigm.
