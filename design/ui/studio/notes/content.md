# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.
Summarized 2026-11-06; the full earlier text is in this file's git history at a80da6d62e.

## Top of mind

- (2026-11-06) Chat switcher words decided (`tier6/decided.md`): "conversation" becomes "chat" in every
  app string; title = name, else first words, else "New chat". My count at rest ("3 v") was cut: a
  number with no unit. Rename field is "Chat name"; no model-written titles.
- (2026-11-06) Round 2 verdict: the Assistant's words held (11 of 12 finished, no false "done", no count
  disagreed). What failed was the screen saying less than the graph did, or saying it where nobody
  looks. Round 3 tests fixes of placement and truth, not new terms.
- (2026-11-06) Watch in round 3, T92 A: the placeholder "Ask about this selection" (keyed on
  `scope.kind`) is the ONLY scope change credited. If the planted reader still asks the whole graph,
  the next step is the scope on the You turn, not new scope-line words.
- (2026-11-06) Watch, T90: statusless failure now reads "the connection failed or the key was refused"
  with Send again AND AI provider.... Count who opens the provider vs resends. "Or" is true in both
  cases; never "may be".
- (2026-11-06) Watch: one name per measure. App lines take `wordsFor(...).name` (no `plainName`
  fallback); the model still gets `plainName`, so a reply saying "Reach" is the model's prose, not a
  regression. Do not close the finding on app lines alone.
- (2026-11-06) A painting run joins its fact to the existing line: "Computed Closeness for 24 nodes,
  colored by it". My separate Colored row was refused: words at rest do not rise. Check lines per turn
  stay flat, and the line never says colored when a hand layer won.
- (2026-11-06) Autosave tooltip shipped as "Changes not yet in a file are kept in this browser and come
  back when you reopen graphty." Better than my "Your changes": true for a change since saved. No
  reader can credit it while the tool hovers only on command; the "Autosave: saved" label stays open at 2.
- (2026-11-06) Tooltip and hover findings measure the study tool, not readers: every hover is a
  deliberate command. Never cite "nobody hovered" as evidence.
- (2026-11-06) Backlog words I own next: "Removed {name}" for a removed run; a failed step's reason as
  words, no code; app rows with no `data.`/`results.` paths (styleLine through the key's reader, rules
  through `ruleWords`, "Picked" not "Picked by hand"); "Stopped." when nothing changed; unique
  accessible names in the panel, visible word first.
- (2026-11-06) Opened steps still say what ran, not what was asked; that needs a wording design per
  tool (bar 10 forbids arguments). Unowned -- a candidate for me to write.
- (2026-11-06) A true line after the fact is not a warning: "Computed Bridges for 14 nodes" carried the
  narrowing and nobody used it. Words that prevent must arrive before Send.
- (2026-11-05) The model's words are the model's; each effect gets one app line that stands alone and is
  true without the prose.
- (2026-11-05) Before calling words a defect, check the design and decided.md; if the design's text is
  wrong, say so with evidence. Cite the decision to set severity.
- (2026-11-03) An error must never contradict the screen: build words from applied state, never a
  `?? default`. A label must bind what it names; connector words must name the logic.
- (2026-10-21) Fix by pointing, not prose; never rename on model opinion or a task's wording.
- (2026-10-06) Budgets: at rest <= 50 words (hand count), inspector ~30 (max 40). Element returns
  codes + params; the app writes every word. Simulated users: fail strong, pass weak.

## Priorities and values

- **Words match outcomes.** A label is a promise. If the click after the right click fails, the
  first-click score is meaningless (round 8: first click 87%, tree 99.7% correct, tasks still
  failed on what happened next).
- **One term per concept.** A second name for one thing reads as a second thing; one name for two
  things ("Data" as rail place and inspector tab) drops selections and confuses screen readers.
- **The field's words, intact.** The design target is the intermediate weekly analyst; novices are
  served by aids everyone gets ((i), tooltips that wait, aliases, samples), never by renamed
  science or persona-specific text.
- **Less text.** The owner's longest-running complaint (2026-09-05 onward): "intimidatingly
  text-heavy", "still very text heavy". v1 failed by cluttering the screen with novice help.
  When in doubt, delete.
- **Trust on first use.** graphty.app plus Sentry will be the real user study; the first shipped
  words must not bust trust (privacy card, counts, claims).
- **Voice of a methods section.** Facts, the next verb; never praise, apologize, encourage or
  recommend.

## Design criteria

- **Purpose test** -- every string says what a value is, whether to trust it, or what to do next;
  otherwise cut. Reason: text that does none of these is the clutter the owner keeps rejecting.
- **Computed or removed** -- no hand-typed count or claim. Reason: numbers disagreeing between
  screens recurred in rounds 2 to 8.
- **Live claims** -- a message may say something "paints" or "is shown" only when the canvas
  changed. Reason: round 8, Degree claimed "Size 0.5 to 3" while hidden.
- **One door, one label** -- the same command is spelled identically in menus, tooltips, Quick
  actions and accessible names ("Add label line", not "Add a label line"). Reason: a tooltip
  worded differently reads as a different action.
- **Unique accessible names** -- a qualifier wherever two reachable controls share visible words.
  Reason: round 8 finding 5; identical by ear for the screen-reader participant.
- **Glossary terms only** -- every on-screen graph word is a Screen term in
  `design/ui/framework/glossary.md`; rejected synonyms are defects on screen and live only as
  aliases. Reason: the conceptual model is the product's spine.
- **Placeholders name only what the box returns** -- "Find rows, elements, values" only if it
  really finds all three; "Filter analyses" because it filters. Reason: "Find rows and notes"
  told readers names were not searchable, so they left (round 8, severity 4).
- **Counts carry units and wholes; sizes in the element's units, never "px"**. Reason: the
  "Line 5", "Arrow head 4" owner review.
- **Copy conventions** -- American spelling, sentence case, no final period on labels/notices,
  "..." only for more input, ranges with "to", plain ASCII, no "please/sorry/successfully/!",
  no "Invalid" or "error" as a whole message. Reason: `design/ui/framework/content-design.md` 2-3.
- **Message caps** -- notice 6 words subject first, error headline "Could not {verb} {object}"
  8 words, (i) 2 sentences, tooltip one line. Reason: Figma's toasts; scanning.
- **No one-domain wording** -- "Total <attribute> in/out", "value 17" unless the data declares a
  unit; no currency detection. Reason: owner, 2026-09-29.

## Decisions and reasons (condensed 2026-11-06)

- 2026-09-26 Standard technical terms stay; friendly words only as search aliases. Owner.
- 2026-09-28 / 10-03 Element supplies `{ code, params }`, the app supplies every word. Owner.
- 2026-09-29 No one-domain words ("Total <column> in/out"); test every label on two domains. Owner.
- 2026-09-29 One noun "Recipe" for a saved style or workflow file (drift unresolved). Scoped counts
  "N of M <noun>". A run-made layer names its run by the run list's exact title.
- 2026-09-30 American spelling. "Remove from list view" / "Show in list view" over hide.
- 2026-10-01 Toolbar icons only; tooltip = name plus key chip. Owner.
- 2026-10-03 "Add label line"; "Show all labels"; "N labels, M hidden to avoid overlap"; find box
  "Find rows, elements, values"; Analyze "Filter analyses"; inspector tab "Values"; table caption
  "Full graph: 77 nodes, sorted by degree, highest first".
- 2026-10-06 to 10-11 Tier 1-2 rounds: runs named by method everywhere; example rule after a non-rule
  "No match", once, never at rest; layer named by its rule; `atLeast` "or more" rows; scope words kept
  even when a count fails, because a true fact is not cut to pass a count.
- 2026-10-14 Round 6 words: "Layer N"; "Arrowheads" with "Target end"/"Source end"; "Label at target
  end"; "Degree rank (1 = highest)"; "Take all tied | Take fewer"; failure notices carry the reason.
- 2026-10-30 Preview tags and destructive labels name the act's outcome; a count shown twice shares one
  basis.
- 2026-11-03 Announcements follow what is visible; Clear keeps a card's name; a reference row shows the
  matched value beside its id.
- 2026-11-05 Influence / Connections naming fixed in the app by id. "Listening" stays; the element moves
  its event after the microphone opens.
- 2026-11-06 Tier 6 round 2 closed (`tier6/rounds/round-2/decisions.md`). Adopted from my critique:
  placeholder follows scope (on `scope.kind`, so the x reads Whole graph too); failure "or the key was
  refused" plus AI provider... only for a `requiresKey` provider; `wordsFor` names at `stepName`, the
  slow approval title and `AI_EFFECT_RUN`; Undo notice with no added period, and none over the open
  panel. Changed by the Director: Colored row became a clause on the Computed line; my "Your changes"
  became "Changes not yet in a file...". Refused: any other scope-word form, "Autosave: no changes"
  (flips on every Save, reads like loss), plain words for opened steps (needs a design), Group 1 to N
  (a concept the product lacks), a warning glyph on the failure row. Reason: one change per problem so
  round 3 can credit it; words at rest do not rise.

## Tried: worked / did not work

- 2026-11-06 Tier 6 round 2. WORKED: approval card words (read 2 of 2, count right); "Undo" in the reply
  (first choice 2 of 2, restored all); disclosure once read (3 of 3, readers changed what they load);
  "Selected N nodes" where it is drawn; every computed count. DID NOT WORK: "the connection failed"
  alone (0 of 2 learned the cause); "Selection 14" as the only warning; two names for one measure (Reach
  vs Closeness, Bridges vs Betweenness, Louvain vs Communities); "Ask about this graph" under a
  selection scope; a long reply's chips and Undo below the fold. UNMEASURED: every tooltip.
- 2026-11-05 Tier 6 round 1: no sessions ran, so nothing of mine was measured.
- 2026-11-03 Tier 5: four of nine editor insights were word failures (run naming, Condition/Or
  connectors, By position's false error, reference ids). Scripted word counts inflated with chrome;
  hand count stays. Leaving my walk out left bar 6 unmeasured.
- 2026-10-30 Tier 4: no surviving insight was word-first; hover findings suspect.
- 2026-10-21 Tier 3: none of my built words produced a failure; count-only layer names and hex-first
  color box with no hint did not work.
- 2026-10-11 Tier 2: mechanism fixes get adopted, word picks to meet a count do not until a diff names
  the words. "<column> is 10 or more (13)" worked; field-path layer names did not. Test a new fact
  against each task file's own number. A counter that reads nothing passes silently.
- Tier 1 (summarized): method names, "Show all labels", refusals naming the method, the usage card
  worked; element English, "directed 0", truncating "Edges per ...", one-domain words, task echoes did not.

## Thinking

- 2026-11-06 The round's shape: truth and placement beat vocabulary. My next useful work is a wording
  design for opened steps (what was asked, in plain words, no arguments), and the backlog's raw-text
  rows, since bar 10 counts them.
- 2026-11-06 A fix that lives only in a tooltip cannot be credited by this study; if a promise matters,
  put the true fact where it is read, or accept it is untested.
- 2026-11-05 Watch whether readers trust the prose or the line when they differ; r2-s02 trusted the
  prose's false denial. That is why every app line must stand alone.
- 2026-11-03 The reference picker's silent search is a speech gap from a second-built control; fix by
  one shared combobox, not added text.
- Open term collisions (2026-10-31): "group" vs glossary group, "Focus", "picked", "whole graph" vs
  Full/Filtered graph. "Whole graph" now also on the Assistant's scope line -- check against glossary.

## Sources

- `design/ui/studio/tier6/rounds/round-2/insights.md`, `decisions.md`, `scores.md`, `sessions/`,
  `repro/` (2026-11-06)
- `design/ui/framework/content-design.md`, `glossary.md` (section 2 rule 1), `principles.md`,
  `decided-doors.md`; tier `decided.md`
- graphty: `workspace/assistant/words.ts`, `autosave/words.ts`, `frame/historyWords.ts`,
  `style/cards.ts`, `data-place/filterWords.ts`; graphty-element `src/ai/tools/families/algorithms.ts`
- Earlier tier source lists: git history of this file at e1237f47af and a80da6d62e.
