**Prototype 17: Orbits** -- Eyes and head only: commands circle whatever you look at, each with its own moving dot; following a dot picks it, a nod confirms and a head shake backs out.

### How it differs, layer by layer

| Layer                   | Orbits                                                                                                                                                                                                                                                                                                                                                                  | Closest existing prototypes and how this differs                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode model              | Look, follow, nod. Looking at something (fixation) only sets the focus and never changes anything. Only smooth pursuit -- tracking a dot that moves on a circle, a movement nobody makes by accident -- picks a verb. Verbs that change the project become pending and show their effect as a preview; a nod commits, a shake backs out.                                | HUD (10) also aims with the head and eyes, but fires with a pinch. Point and Say (2) and Context Menus (11) are select-then-command with hands. Here no hand ever confirms.                                          |
| Navigation              | "Turn" is a verb on the graph: pick it, and while it is active, turning your head turns the graph around its own center three times as far; nod to keep the new angle, shake to spring back. Follow the "go" dot on a node to fly to it; "Frame all" flies back. Leaning in is ordinary parallax and never a command.                                                   | Two-hand grab (1, 3), turntable stick (4), miniature (5), palms (9), look-and-pull plus radar (10). No other prototype moves the view with the head alone.                                                           |
| Selection               | Fixation sets one focus. Where nodes overlap in depth, each candidate's outline carries a dot running a different circle, and following one picks it. The selection is built by following "+ add" (this node) or "+ ring" (its neighbors); selection acts at once, with no nod, because it changes nothing in the project.                                              | Point and pinch (1), lasso (3, 11), painting (4), typed query (5), tongs (6), ring and sweep (9), lock-on (10). None picks by following a moving mark.                                                               |
| Menus / command surface | Rings of up to 8 static, labeled tiles around the focus, each tile with a small dot orbiting it on its own direction and phase. The dots move only while your gaze is inside the ring. Following "more" opens the next ring; the algorithm catalog is three rings deep.                                                                                                 | Marking menus (3) are flicked by hand; runes in Spellcasting (9) orbit but are picked by hand; HUD (10) strips are fixed at the edge of the view. Here the menu is around the object and picked by the eyes or head. |
| Parameter entry         | A dial: a static scale with two dots on its rim, one running clockwise, one counterclockwise. Follow the clockwise dot to raise the value, the other to lower it; the value moves fast, then slower the longer you follow. A quick head tilt steps one notch; a held tilt keeps stepping, faster the further you tilt. Voice numbers are optional.                      | Sliders (1), wrist twist (3), stick dial (4), scrubbing (5), knobs (6, 8), finger counts (7), pull apart (9), gauges (10), in-menu steppers (11). All of those take a hand.                                          |
| Feedback                | A followed dot's tile fills as the pursuit match builds. A pending tile pulses and the graph previews its effect (fading what would be hidden or removed, showing what would be added). A short rising tone confirms a nod, a short falling tone a shake, and the word "Kept" or "Cancelled" shows beside the focus. A live count ("5 of 15 kept") rides on every dial. | Sound here confirms only the two head gestures; it is not a sonification of data.                                                                                                                                    |

**Setup:** Fixed environment for every prototype: solid colored background, full VR, graph floating at chest height 70-80 cm away. The user is seated or standing with hands at rest. Inputs: eye gaze where the device gives it to the app, head pose on every device, optional voice. Hands and controllers are not used; stray pinches and button presses are ignored unless the accessibility switch (below) is on. Where a device does not give eye gaze to the app (in the browser, that is every device; see "On each device"), a small head cursor shows where the head points, fixation is a dwell of that cursor, and the same dots are followed with small circles of the head.

### The control vocabulary

| Input                                                                                                            | Meaning, everywhere                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixation (look at something, or point the head cursor at it, for about half a second)                            | Set the focus. The focus's ring of verbs appears around it and its name and key values show. Looking at a tile of the open ring never moves the focus. Never changes the project.                                                                                               |
| Smooth pursuit (follow a dot on its circle for about 0.8 seconds with the eyes, about 1.2 seconds with the head) | Pick that dot's tile. A tile that opens a ring, moves the view or changes the selection acts at once. A tile that changes the project becomes pending: filled, pulsing, its effect previewed in the graph, until a nod or shake. Picking another tile replaces what is pending. |
| Nod (one down-up, starting and ending on the pending tile)                                                       | Confirm what is pending: a command, a value, a note, a turned view, or an undo. Ignored when nothing is pending, and while you are speaking.                                                                                                                                    |
| Shake (one left-right-left, starting and ending on the focus)                                                    | Back out one level: drop what is pending, else close the newest ring. With nothing pending and only the first ring (or no ring) open, it opens the undo ring with the last change already pending and previewed; a nod undoes it.                                               |
| Head turn while "Turn" is active                                                                                 | Turn the graph around its center, three degrees per degree of head turn (left-right and up-down); pending until a nod keeps it or a shake springs it back. Outside "Turn", turning your head only looks around.                                                                 |
| Head tilt (roll the head about 15 degrees and back)                                                              | Step the active dial or list by one notch: right is up, left is down. Hold the tilt to keep stepping. Ignored when no dial or list is active.                                                                                                                                   |
| Voice (optional)                                                                                                 | Fill a value or a note's text, or say a tile's name to pick it. Voice never commits; a nod still does.                                                                                                                                                                          |
| Accessibility switch (off by default)                                                                            | Any one controller button, a pinch, or a dwell on the pending tile can stand in for the nod, for people who cannot nod reliably.                                                                                                                                                |

Every dot moves on a circle, and a match needs the eyes or head to follow it on both axes at once. A nod is vertical only and a shake horizontal only, so neither can be mistaken for a pursuit, and a pursuit is too small and too slow to look like either gesture.

### The rings

Every object you can look at has one ring of at most 8 tiles. The last tile is "more" when the object has more verbs.

| Look at                                                                     | Ring                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The background or the graph's frame (the graph and its project)             | Find, Turn, Frame all, Analyze, Paint, Filter, Save, more (Layers, Note, Recipes, History, Export, Settings)                                      |
| A node                                                                      | + add, + ring, go, Note, Hide, Paths from here, Details, more (Edges, Select similar)                                                             |
| An edge (the small handle at its middle, shown on the focused node's edges) | Details, + add ends, Hide, Note, Paths through here                                                                                               |
| A selected node, or the selection count                                     | Analyze these, Paint these, Keep only these, Hide these, - remove this, Clear, Note, more (+ ring, Go to these)                                   |
| A result card (a run)                                                       | Color and size, Color by, Size by, Compare, Options, Rerun, Remove, more                                                                          |
| A row of the key (a style layer)                                            | Show or hide, Up, Down, Edit, Scope, Remove                                                                                                       |
| A chip of the filter (a filter step)                                        | Edit value, Invert, On or off, + condition, Remove                                                                                                |
| A note                                                                      | Edit (voice), Move to..., Remove                                                                                                                  |
| Undo ring (shake with nothing pending)                                      | Undo: <the last change> (already pending), Redo: <the last undone change> when there is one, History                                              |
| History ring (from the undo ring or the graph ring's "more")                | The last 7 steps, newest first, plus "Keep as recipe"; picking a step makes "return to here" pending and previews it                              |
| Analyze, three rings deep                                                   | Recent, then families (Importance, Groups, Paths, Flow, Similarity, Structure, more), then the algorithms of the family, then "more" for the rest |

### The journey

**1. Enter**

- **What you do:** On the 2D page, press Enter VR (the browser requires one tap or pinch there; it is outside this scheme, and a person who cannot use their hands needs the device's own accessibility features or a helper for it). In the headset, a single dot circles in front of you with the words "follow me, then nod". You follow it and nod. A second prompt, "now shake", shows what backing out does.
- **What you see:** The Florentine families, 15 nodes and 20 marriages, at chest height. The teaching dot fills, the nod tone sounds, then the shake tone. The two gestures set your own nod and shake size. No rings show until you look at something.
- **Controls:** Smooth pursuit, nod, shake.

**2. Get oriented**

- **What you do:** Let your eyes wander over the graph. Look at the background; the graph ring appears. Follow the dot on "Turn". Turn your head about 10 degrees to the right; the graph turns about 30 degrees and you see the far side. Nod to keep it there.
- **What you see:** Whichever node you rest your eyes on shows its family name and degree; nothing else happens, and no dots move until your gaze enters a ring. While "Turn" is active, the graph turns around its own center and pulses to show the turn is not kept yet; after the nod it stops pulsing and turning your head only looks around again.
- **Controls:** Fixation, smooth pursuit, head turn while "Turn" is active, nod.

**3. Find the Medici**

- **What you do:** Look at the background; the graph ring appears. Follow the dot on "Find". A ring of letter groups appears; follow "M-P". Follow the dot on "Medici". (With voice on: look at Find and say "Medici".)
- **What you see:** The graph flies so the Medici sit at its center, outlined. The Medici become the focus and their ring appears: + add, + ring, go, Note, Hide, Paths from here, Details, more.
- **Controls:** Fixation, smooth pursuit (Find and its rings move the view, so they act without a nod).

**4. Who they married into**

- **What you do:** Follow the dot on "+ ring".
- **What you see:** At once, the Medici and their six marriage partners -- Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni -- are outlined as the selection, and a count reads "7 selected". Fixating any of them shows the selection ring. Following "Clear" or "- remove this" takes it back the same way.
- **Controls:** Smooth pursuit.

**5. Who matters most (PageRank)**

- **What you do:** Look at the background. Follow "Analyze", then "Importance", then "PageRank". It pulses and the card reads "PageRank on the whole graph"; nod.
- **What you see:** Each ring replaces the last around the same spot, so your eyes do not travel. After the nod, the run starts on the whole graph (the graph ring was the focus, so the scope is the graph; the selection stays). A result card appears beside the graph when it finishes.
- **Controls:** Fixation, three smooth pursuits, nod.

**6. Read the result**

- **What you do:** Read the result card. Rest your eyes on a row.
- **What you see:** The card is a static ranked list: Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881, Albizzi 0.0791, Tornabuoni 0.0713, and the rest. The row you are reading lights its family in the graph. Reading never fires anything, because the list does not move and its dots stay still until your gaze reaches the card's ring.
- **Controls:** Fixation only.

**7. Color and size by PageRank**

- **What you do:** With the result card as focus, follow "Color and size". The graph previews the new look while the tile pulses. Nod.
- **What you see:** The Medici grow largest and darkest, the four one-marriage families smallest. The key gains "Size: PageRank" and "Color: PageRank" with the range 0.0307 to 0.1458.
- **Controls:** Fixation, smooth pursuit, nod.

**8. Keep only strong families (filter)**

- **What you do:** Look at the background, follow "Filter", then "PageRank", then "at least". A dial appears. Follow the clockwise dot; the value climbs fast, then slows the longer you follow. Look away from the dot at about 0.075. Tilt your head left once to step down one notch to 0.070. Nod. (With voice on: say "point zero seven", then nod.)
- **What you see:** A live count on the dial and a live preview in the graph: families fade as the value passes them, and at 0.075 the count reads "4 of 15 kept". One step down to 0.070 brings Tornabuoni back: "5 of 15 kept": Medici, Guadagni, Strozzi, Albizzi, Tornabuoni. After the nod, the others stay faded out and a chip "PageRank at least 0.070" sits under the graph.
- **Controls:** Smooth pursuit, dial, head tilt, nod, optional voice.

**9. Write a note**

- **What you do:** Look at the Medici, follow "Note". With voice on, say "Hub of the marriage network; every other bloc reaches the rest through them." When the text stops changing, nod to keep it. Without voice, a ring of tags appears (Key, Question, Check, Surprising, Type...); follow "Key" and nod. "Type..." opens a pursuit keyboard, which works but is slow.
- **What you see:** The dictated text shows under the Medici as you speak. Nods made while you are talking are ignored, so agreeing with yourself does not cut the note short. After the nod, it stays as a note pinned to the node.
- **Controls:** Fixation, smooth pursuit, voice or a tag ring, nod.

**10. Undo a mistake**

- **What you do:** On Guadagni you meant to follow "Note" but followed "Hide" and nodded before you noticed. Shake your head once, then nod.
- **What you see:** The shake opens the undo ring with "Undo: hide Guadagni" already pending; Guadagni shows faintly in place as the preview. The nod brings it back, with the rising tone. The next shake's undo ring also offers "Redo: hide Guadagni", in case the undo was not meant. To go further back, follow "History" in the undo ring, follow a step, and nod to return the project to it.
- **Controls:** Shake, nod; pursuit and nod for history.

**11. Save**

- **What you do:** Look at the background, follow "Save". Nod.
- **What you see:** Rising tone and "Saved: Florentine families, 9 Oct" beside the graph. With voice on, you can say a name before the nod.
- **Controls:** Fixation, smooth pursuit, nod, optional voice.

### Advanced journeys

- **Compound rule.** Focus the filter chip, follow "+ condition", then an attribute ("Degree"), a comparison ("at least"), and set the dial to 3. A small "and / or" ring appears between the two chips; follow "and" and nod. The rule reads as a row of static chips ("PageRank at least 0.070 and Degree at least 3"), so it is read by fixation and edited by focusing a chip.
- **Tuning algorithm options.** Focus the PageRank result card, follow "Options". Each option is a tile: follow "Damping" to get its dial (0.85), raise it to 0.90, nod, then follow "Rerun" and nod. A new card stands beside the old one; the old one is kept.
- **Comparing two runs.** Focus one result card, follow "Compare", then look at the other card: a "with this" dot appears on it; follow it and nod. The graph sizes nodes by the difference and the card lists the rank changes, read by fixation.
- **Layers on subsets.** Build the selection with "+ add" and "+ ring", focus a selected node, follow "Paint these", pick an attribute ring and a palette ring; the graph previews the paint; nod. The new layer in the key is scoped to those nodes; focus its key row to move it (follow "Up" and nod, or tilt to step) or change its scope.
- **Recipes.** Open the history ring, follow "Keep as recipe", follow the first step and nod, follow the last step and nod. The recipe appears under the graph ring's "more", Recipes; on another graph, follow it, watch the preview, and nod to replay it.
- **Joining tables** stays on the 2D page. Choosing key columns from a long list by pursuit, a ring at a time, is too slow; the headset shows the joined result.

### How it scales

- **60+ algorithm catalog.** Three rings: "Recent" plus 6 families plus "more", then up to 7 algorithms plus "more", then the rest. Each ring costs a read and about one pursuit, so reaching any algorithm takes roughly 5-8 seconds with the eyes and 8-12 with the head. With voice on, saying the name picks it directly.
- **New object types.** Anything you can look at gets a ring, filled from that object's verbs in the element's catalog, in order. No new input is ever added; a new object only adds a ring.
- **Plugins.** A plugin's algorithm lands in its family's ring under its catalog name. Its numeric options become dials, its choices become rings, its yes/no options become a two-tile ring. Free text needs voice or the pursuit keyboard.
- **The limit.** Eight moving dots at once is the cap; past that, pursuits start to confuse neighbors. Dense graphs need "go" to zoom in before fixation can resolve a node, and outline pursuits only separate a handful of overlapping candidates. Edges are reachable only from a focused node's handles. Text entry without voice and long lists (column pickers, joins) are the real ceiling.

### On each device

| Device            | What this prototype uses                                                         | What WebXR gives a web page today                                                                                         | Notes                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S | Head pose for the cursor, pursuits, nod, shake, tilt and turning; optional voice | Head pose at display rate. No eye tracking hardware.                                                                      | Runs as head pursuits: the dots are followed with a small circling motion of the head (as in SmoothMoves). Hand tracking stays on in the system, so the page ignores select events from hands and controllers unless the accessibility switch is on. Speech recognition in Quest Browser is not something to rely on; without it, voice stays off. |
| Meta Quest Pro    | Eyes for fixation and pursuit; head for the rest                                 | Head pose; eye gaze is not exposed to WebXR as far as we know.                                                            | A native build could read gaze through Meta's eye-tracking extension; the web version uses head pursuits.                                                                                                                                                                                                                                          |
| Samsung Galaxy XR | Eyes for fixation and pursuit; head for the rest; optional voice                 | Head pose. Eye tracking exists in the device, but no standard WebXR feature streams gaze to pages.                        | Android XR documents an eye-tracking permission for native apps, so the full eye version is plausible as a native app. Chrome's speech recognition is the likeliest of the three to work for voice; check it inside an immersive session.                                                                                                          |
| Apple Vision Pro  | Head pose for the cursor, pursuits, nod, shake, tilt and turning; optional voice | Head pose. Gaze reaches the page only as a ray at the moment of a pinch (transient pointer); there is no continuous gaze. | Apple gives no app, native or web, continuous gaze, so the eye version cannot run here at all; head pursuits only. Every pinch fires a select event, so the page ignores them unless the accessibility switch is on. Apple's own Dwell Control and head-pointer features show that hands-free head control is a supported need on this device.     |

In head mode the eyes cannot be checked, so a nod or shake is recognized from head pose alone: it must start and end with the head cursor on the pending tile (or the focus), within the size and speed the teaching step recorded. Microphone permission is asked on the 2D page before entering VR, because a prompt inside the session is easy to miss.

The honest summary: the eye version needs a native build on a device that grants gaze (Galaxy XR, Quest Pro). In the browser, every device runs the head-pursuit version, which tests the same rings, nod, shake and dial, but is slower and more tiring.

### Why it should work

- Fixation never changes anything, which removes the classic eye-control problem of everything you look at activating (the "Midas touch"). Pursuit is a movement the eyes only make when deliberately tracking, and the dots move only once your gaze is inside a ring.
- Pursuits work without calibration, because they match the shape of the eye's movement to the target's, not its absolute position (Vidal et al., "Pursuits", UbiComp 2013). Headset gaze drift and offset matter less.
- Orbits (Esteves et al., UIST 2015) used static controls with small orbiting dots on a smartwatch and got reliable selection among several targets -- the same "read the static tile, follow its dot" layout used here.
- VRpursuits (Khamis et al., AVI 2018) showed pursuit selection works in VR and mapped how target count, speed and trajectory affect accuracy; Outline Pursuits (Sidenmark et al., CHI 2020) picked occluded objects in VR by following their outlines.
- Head gestures with the eyes held on a target are detectable and distinct from ordinary head motion, because the eyes counter-rotate (Mardanbegi et al., "Eye-based head gestures", ETRA 2012); HeadGesture and HeadCross (Yan et al.) showed hands-free head confirmation on headsets.
- Amplified head rotation let seated users see all around without twisting (Sargunam et al., IEEE VR 2017). Head pursuits for the browser version were shown in SmoothMoves (Esteves et al., UIST 2017).
- Gaze targeting is proven at scale: Vision Pro's look-and-pinch is the platform's main input. This prototype tests whether the pinch can go too.
- Every change is pending with a preview before it lands, and undo is a shake and a nod away from anywhere, so a wrong pick costs one gesture.
- No arm is ever raised, so there is no arm fatigue, and the scheme serves people who cannot use their hands.

### What it would teach us

- Can someone finish the whole basic journey with no hands, and how much slower is it than a hand prototype?
- Do people accidentally follow dots while reading, or does "static tile, moving dot, dots still until you enter the ring" keep reading safe?
- How often do natural nods and head shakes (agreeing with a result, disbelief at one) trigger confirm or the undo ring, even with the pending-only and start-on-target rules?
- What gain makes "Turn" comfortable, and does "nod to keep" feel natural or fussy?
- Is selection without a nod safe, or do accidental "+ ring" picks annoy people?
- Do outline pursuits beat zooming in with "go" for picking a node in a dense cluster?
- How tiring are pursuits over a 20-minute session, by eye and by head, and does the held tilt replace the dial dots for most head-mode users?
- Is three rings deep acceptable for the catalog without voice?
- How much worse is the head-pursuit version than the eye version, and is it good enough to ship in the browser?

### Known risks

- **No device streams gaze to web pages.** Mitigation: head pursuits in the browser on every device; a native build for Galaxy XR and Quest Pro to test the eye version.
- **In head mode, pursuits, gestures and looking around all use the head.** Mitigation: dots move on circles and need both axes to match, which nods and shakes never satisfy; head turning moves the graph only inside "Turn"; nods and shakes count only when they start and end on the target; the kept turn angle is read from just before the nod began.
- **Reading a moving label is itself a pursuit.** Mitigation: labels never move; only small unlabeled dots move, each on its tile, only while your gaze is inside the ring, and the match needs about 0.8 seconds (eyes) or 1.2 seconds (head) of correlation.
- **Accidental nods and shakes.** Mitigation: a nod counts only when something is pending and is ignored while you speak; a shake never changes the project by itself -- with nothing pending it only opens the undo ring, and the undo still needs a nod.
- **Head gestures do not mean yes and no everywhere** (reversed in Bulgaria; the Indian head wobble). Mitigation: the nod and shake can be swapped in settings; tones and on-screen words confirm which happened.
- **Neck strain and limited neck movement.** Mitigation: head pursuits use small circles (a few degrees); the held tilt replaces long dial pursuits; the accessibility switch replaces the nod; voice names tiles directly. People who cannot make smooth pursuits (for example with nystagmus) need voice or the switch.
- **Turning the graph with gain could disorient or nauseate.** Mitigation: only the graph turns, never the surroundings, against a solid background; gain capped at 3x; it turns only while "Turn" is active; nothing is kept without a nod.
- **Slow for experts.** Mitigation: "Recent" leads the Analyze ring; selection acts without a nod; optional voice names a tile directly; recipes replay a sequence with one pick and one nod.
- **Text entry without voice.** Mitigation: tag rings cover quick notes; the pursuit keyboard is a last resort; long text is better typed on the 2D page.
- **Eye fatigue from moving targets.** Mitigation: dots move only while your gaze is inside an open ring, at moderate speed, and stop when you look away; dot size and speed are settings.

### Comparison row

| #   | Name   | One-line idea                                                                                                                                              | Mode model                                          | Navigation                                                                      | Selection                                                                         | Command surface                                                   | Parameters                                                                       | Undo                                                                                            |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 17  | Orbits | Eyes and head only: static verb tiles circle whatever you look at, each with its own orbiting dot; follow a dot to pick, nod to confirm, shake to back out | look, follow, nod (changes previewed while pending) | "Turn" verb, then head turn with 3x gain, nod to keep; "go" dot flies to a node | fixation sets focus; outline pursuits for overlaps; "+ add", "+ ring" act at once | rings of up to 8 tiles around the focus; catalog three rings deep | dial with raise and lower dots, head tilt steps (hold to repeat), optional voice | shake with nothing pending opens the undo ring with the undo previewed; nod; history from there |
