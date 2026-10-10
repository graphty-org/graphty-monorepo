# XR control prototypes: what the studio found

Date: 2026-10-10. Written by the studio director for graphty's owner.

The studio evaluated 43 paper designs for controlling graphty in a VR headset (Meta Quest 3/3S, Samsung Galaxy XR, Apple Vision Pro): what a person does with hands, controllers, eyes where exposed and optional voice to load, explore, analyze, style and publish a graph. Scenery and graphics were never judged. Every design was scored on eight criteria (Appendix A). Twelve finalists and three hybrids went through up to three rounds of review and revision, and three judges then ranked those 15. Every prototype has its own file under [prototypes/](prototypes/README.md), and [the index](prototypes/README.md) lists all 46 (the 43 designs plus the studio's three hybrids). The criteria, the triage and the judges' rankings are the appendices at the end of this document.

The criteria are scored 1 to 5 in half steps:

- **vr_usability:** each input means one thing, there are no accidents, dense picking works, and every act is previewed before commit.
- **ergonomics_access:** an hour seated, one-handed, with no voice.
- **webxr_feasibility:** buildable in a browser on all three headsets.
- **coverage:** how much of graphty's 22 checklist areas is reachable without taking the headset off.
- **extensibility:** a plugin's algorithm or layout, and a new object type, appear without new controls.
- **onboarding:** a first-time user finishes unaided.
- **ease_of_use:** an expert makes few mistakes and carries little in their head.
- **efficiency:** acts per step.

A severity 3 finding blocks a task for many people or changes work without anyone noticing. A severity 4 breaks the idea.

## 1. The answer

### Nothing meets the bar, so the studio recommends nothing for implementation

The bar for "recommended" is:

- every criterion at 3.5 or more;
- coverage and webxr_feasibility at 4 or more;
- no open severity 4.

No finalist reaches it, either on the scores the reviewers gave or on those scores capped by the red team's open findings. Section 2 shows both.

**The closest is [Paired Browser (44)](prototypes/prototype-44.md).** It is a hybrid built on [Graph Browser (28)](prototypes/prototype-28.md):

- every object has a page of facts and worded verbs;
- forms are generated from each algorithm's and layout's option list;
- Back (the view) is kept apart from a named Undo (the data);
- a laptop paired once by a six-digit code lends its files, its keyboard and a wide table sheet.

On the reviewers' scores of its last round it has a mean of 3.94 and nothing below 3.5. Two things keep it off the bar:

- **webxr_feasibility is 3.5.**
    - The WebXR reviewer's lowest condition is the custom-engineering load, at 3:
        - an in-scene panel toolkit (DOM overlay works only in AR, so text, lists, forms and a keyboard must be drawn in the scene);
        - a pairing service graphty does not run;
        - a typing filter;
        - a "two versions" page.
    - The reviewer also found two claims a browser cannot honor: a second projection layer on Quest, and a wake lock held by a laptop page in a background tab. Each fails into a path the file already has.
    - Deleting the two claims removes one of the reviewer's two reasons for the lost half point. Whether that gives 4 is a rescoring nobody has done, and the engineering load does not shrink on paper. Judge 3 is right about the load; judge 1 is right about the claims.
- **Coverage drops to 3.5 once open severity 3 findings cap it.**
    - The criteria cap a criterion at 3.5 for a severity 3 finding, and severity "measures what happens to the person, whichever lens finds it".
    - The red team found one in round 2 that the six reviewers missed. While the laptop sleeps, a save waits in the headset's Outbox. If the laptop copy is edited in the meantime, that queued save later overwrites the edit, and nothing says so (area 19).
    - The director's walk of the publish journey (section 4) found a second: the defect the studio found in eight other finalists.
        - A recipe replays a time-windowed run on a window it never recorded.
        - A set kept from a community follows the group when the community is renumbered.
        - Both land on area 18.
    - Until both are fixed, 44's coverage is 3.5, under the bar's 4.

So deleting the two claims would not, on its own, make 44 recommended. Both coverage defects have paper fixes:

- writes that carry the version they were based on;
- references that store what they resolved to.

The webxr question needs a headset spike, not a paper round.

The next closest are:

- **[Hotbox (26)](prototypes/prototype-26.md):** short only on efficiency (2.5) on the reviewers' scores, and also on coverage (3.5) once capped.
- **[One Question at a Time (30)](prototypes/prototype-30.md):** short on coverage (3) and efficiency (3).

### What happens next: spikes, not another paper round

The stop rule ended 44 after round 2: its mean rose 0.19, under the 0.2 the rule requires. The director's earlier note ("one more round of 44 if the studio reopens") is withdrawn. The criteria were frozen before screening, and 44 is no exception.

The remaining question about 44 is whether it can be built, and only a headset answers that. Its paper fixes go into the spec of the first mock instead. Section 3 covers how coarse the stop rule is, and the one finalist (29) that the token-limit gap stopped by mistake.

### The tiers

**Recommended to implement:** none.

**Worth a mock**, meaning a cheap headset prototype of the risky part only, in this order:

- Every entry is a reviewed design, and its scores are those of its last round.
- Where the mock covers only part of a design, the entry names that part and claims no score for it.
- A variant the studio did not review gets no score.

1. **[Paired Browser (44)](prototypes/prototype-44.md).** A hybrid of plain designs. Mode model: always on one object's page. Works with hands alone and no voice.
    - [Graph Browser (28)](prototypes/prototype-28.md) is not listed separately. 44 contains it whole, so by the criteria's own rule 28 is dropped as a duplicate. Its unpaired core becomes 44's first milestone, as judges 1 and 2 propose.
    - **Why:**
        - All three judges put it first.
        - It is the closest to the bar.
        - It is the only design that answers files, text and wide tables together.
        - Every core act is a standard select event (release, a timed hold, a drag, two hands), with no gaze, no gesture classifier and no speech.
        - It builds the panel toolkit and the pairing that most other designs need.
    - **Biggest open risk:**
        - The size of the in-scene toolkit.
        - Whether panel text, the pointer and the graph composite correctly on Quest within the frame budget.
        - Behind that sits judge 3's objection, which the file names as its own top risk: it may be "a desktop app in a headset" in which people stop looking at the graph.
    - **First spike:**
        - Draw one generated form page and one sorted reader in the scene at 1.1 m, with 1.3 cm text and 12 rows.
        - Build it two ways on Quest 3 hands: a quad layer under a cleared projection layer with a depth hole, and a texture panel.
        - Draw the ray, the hold ring and a name tag over it, at 1,000 and 10,000 nodes.
        - Repeat on Vision Pro's transient pointer.
        - Measure frame time, legibility and wrong-target pinches.
        - Log how often the person pinches the graph against how often they pinch links and buttons on the panel (judge 3's test). Without that count, building 44 first cannot tell the studio whether the headset adds anything.
    - **Fixes the mock's spec carries (none of them scored):**
        - delete the second projection layer and the background wake lock;
        - writes to a project's home carry the version they were based on, and one device holds a project at a time;
        - the red team's typing gate: the pause starts on key-down, each pinch is held for one round trip, Enter picks the highlighted search result, and "paused" shows at the ray tip;
        - a row cursor with mark-and-next on every list page;
        - a kept, comparable scenario table for "What if removed";
        - a time window that is view-only by default, run pages that state the window they ran on, and the time window as a recipe input;
        - sets kept from a result store their members, with drift reported on reopen.

        The row cursor and the scenario table are the two changes that would move its efficiency (3.5) toward 4.
2. **[Hotbox (26)](prototypes/prototype-26.md), on controllers only.** A plain design. Mode model: hold one button, every command for the target shows, release on one.
    - **Why:**
        - After 44 it is the closest to the bar under both readings.
        - It has the best repeat path in the studio: Repeat last, and Again on a new target. Efficiency is the ceiling every finalist shares.
        - No lens left a severity 3 open in its last round.
    - **How it answers its two objections:**
        - _Hands are excluded until a pinch rule passes._ The round 3 red team, the onboarding reviewer and judge 1 agree on the hands problem. The first time the hotbox is opened with hands, the cursor overshoots into a corner command almost every time, and that command can be Undo.
            - That is an error, not a hesitation, and it is how a person afraid of breaking things quits.
            - On Vision Pro, a relaxed or 150 ms pinch can run a row nobody saw lit.
            - The red team confirms that "the item that runs is the item that was lit" holds on controllers. So the mock is controllers only, as judge 2 conditions it.
        - _There is one fast-layer mock, not two._ Judge 3 ranks 26 fourteenth because [Fast Ring over Pages (46)](prototypes/prototype-46.md) asks the same question: can a fast layer sit over complete surfaces? It does.
            - The studio mocks that question once, with 26: reviewed, with no lens severity 3 open, ease_of_use 3.5 and webxr_feasibility 4.
            - The reviewed 46 aims with the head and has five severity 3 findings open. A hand-aimed 46 was never reviewed.
            - Judge 3's preference for the resting-hand ring is recorded as a disagreement.
    - **Biggest open risk:** the wrong-item rate in first sessions, and on hands the corner overshoot.
    - **First spike:**
        - Controllers only.
        - Measure the wrong-item rate in first sessions.
        - Count the hub-removal repeat (click, then B).
        - Count the top-10 agreement check across five rankings. Today it costs about 44 acts, because several runs cannot be one target.
        - Move to hands only after a stated pinch rule passes the same test.
3. **[Hint Keys (35)](prototypes/prototype-35.md): the tag layer only.** A plain design. Mode model: see it, name it.
    - **Why:**
        - A two-letter tag at a constant angular size (about 2 degrees) sits on every node, row, bar and history step. That makes picking one node among thousands a reading task.
        - Any standard select hits a tag on any headset, with taps only and hands alone.
        - Judges 1 and 2 would build it as an addressing layer.
    - **Not mocked:** the finger-segment keypad (a classifier whose pose hides the fingers it reads), the phrase recognizer, and the rest of its command system.
    - **Biggest open risk:**
        - Rendering 2,000 tags at constant angular size within the frame budget.
        - The red team's round 3 severity 3 also stands: a pick run replaces the selection even when what was picked was runs, sets or history steps.
    - **First spike:** the shared dense-selection test.
        - Pick 12 scattered nodes among 400, and among 10,000, three ways: with 44's "which one?" card, 35's tags and 38's slab.
        - Run it on Quest 3 hands and on controllers.
        - Measure time and wrong picks.
4. **[Findings Inbox (42)](prototypes/prototype-42.md).** A usage design. Mode model: triage. graphty runs cheap analyses on load, and the person files each finding.
    - **Why:**
        - It is the only design that asks for fewer commands instead of cheaper ones.
        - The flick is specified on hands, controllers, Vision Pro's transient pointer and thumbsticks, from a resting elbow, and it needs speed as well as distance.
        - Coverage is 4.5 by the lens and 4 capped.
    - **Biggest open risk:** efficiency is 2.
        - With no case boundary, one alert's filters and fades shape the next (the expert's severity 3).
        - A callout can cite an automatic result that the inbox-clearing flick deletes (the red team's severity 3).
    - **First spike:**
        - Run the four-way flick and its footer, with the view following each card, on all three headsets for 30 minutes.
        - Test trust in machine findings on the 2D page first, which is cheaper.
        - The red team's Start case, Close case and Next case is an unreviewed fix. The mock may include it as scaffolding, but the studio has no score for 42 with it.
5. **[Cutting Room (23)](prototypes/prototype-23.md).** The only metaphor left. Mode model: edit the history, not the state.
    - **Why:**
        - "Replace the data, keep my steps", and fixing step 8 while keeping the 7 good steps after it, are worth more for weekly work than any other single feature (judge 2).
        - Its coverage went from 1.5 to 4 by generating every object's verbs from the command catalog.
    - **Biggest open risk:**
        - The replay engine (cached state, state diffs, branches) is months of graphty-element work. That is why webxr_feasibility has been 3 for three rounds.
        - The red team also found replays that re-bind silently. "Community 7" lands on a different group. "Re-measure here" recolors a published figure from a run on a 30-node subset.
    - **First spike:**
        - Build it in graphty-element and behind a 2D history view first, as judge 3 asks.
        - Replay a recorded journal in a worker on new data, with each reference stored by what it meant.
        - Stop at the first reference whose members change, and show old beside new.
        - Only after that, mock the timeline and ripple bar in the headset. That mock may run over precomputed states, so the headset question (can a person edit an old step with hands) does not wait for the engine.
6. **[Prop and Plane (38)](prototypes/prototype-38.md): the slab only.** A research design. Mode model: a held plate with two stances.
    - **Why:**
        - It is the one idea a monitor cannot do. A plate pushed through the graph draws the nodes of a thin slice flat on its face, with a crosshair that snaps node to node.
        - That turns occlusion into a plane-distance filter, which stays cheap at 10,000 nodes and needs no gaze.
        - It is judge 3's second choice, and the tier would hold no research design without it.
    - **Against it:**
        - Two judges rank it last of 15.
        - Its mean (3.31) is the lowest of the finalists.
        - Its seated home puts the graph about 50 degrees below eye level (severity 3).
        - So the mock is the slab and nothing else, not the scheme.
    - **Biggest open risk:** jitter of the palm plane with hands alone, and arm load while the plate is held in the graph.
    - **First spike:** the shared dense-selection test (entry 3), with the slab's snapping crosshair.

**Keep as a source of parts.** These are named parts, not designs to build. Several are already inside 44.

| Part                                                                                                                                                                                                                                           | From                                  | Where it goes                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| The unpaired core, and the red team's row cursor. Do not carry over its round 2 pose gate and aim settle, the drag that turns the graph, or Back, Forward and Home on the panel edge the graph covers                                          | 28 Graph Browser                      | 44's first milestone                                                                |
| Press to preview, release to choose, slide off to cancel (the select lifecycle answers Vision Pro's missing hover); a Check card listing every default it skipped; versioned task cards                                                        | 30 One Question at a Time             | 44's forms                                                                          |
| The detented range handle that names who sits just outside ("Ridolfi and Castellani at 0.069 are out"); the route chip with facets that recount for the nodes on the route; per-value counts and relational facets that search the whole graph | 41 Facet Browser                      | graphty-element first (the 2D app gets them too), then a facet page in 44           |
| A "why this look" page of pills on named roles; refusals that explain themselves                                                                                                                                                               | 29 Encoding Shelves                   | 44's graph page                                                                     |
| The Review step (Yes, No, Skip, "not reviewed") as the one way a person's judgment enters the record; the Methods page; probe beads; "only fitting ports light"                                                                                | 32 Patch Bay                          | every recipe; 44's History                                                          |
| The arm-load floor (no poses, a sticky one-hand alternative for every hold, tracking loss always cancels); "strike only this" on one old step                                                                                                  | 45 Editable Record                    | every design; the element's replay engine                                           |
| The phone as a keyboard with its keys mirrored under the field being typed, lift to commit                                                                                                                                                     | 39 Phone in Hand                      | already in 44                                                                       |
| The target tray that binds "this" only to objects the person pinched; editable slot tiles that show the request back in graphty's terms                                                                                                        | 34 Point and Ask                      | 44's optional assistant, once a "data withheld" route shows the exact outgoing text |
| The counted outcome strip ("keeps 5 of 16"); scope from a labeled chip, never from where a pinch lands                                                                                                                                         | 46 Fast Ring over Pages               | 26's center row; 44's forms                                                         |
| Object-first marking menu with a half-second reveal; pull a node for hops with a live "1 hop: 6"                                                                                                                                               | 3 Gesture Grammar (eliminated)        | a fast layer, if the 26 mock passes                                                 |
| Handles that show a count before release; drag back past the rest notch to cancel                                                                                                                                                              | 12 Lean In (eliminated)               | any drag control                                                                    |
| A pending guess with a count and named borderline cases; correction by counter-example                                                                                                                                                         | 19 Show Me (eliminated)               | a selection-by-example mock, if one is made (see the open questions)                |
| The "which one?" list for dense picks; option kinds the headset cannot show are labeled "Set this on the 2D page" instead of dropped                                                                                                           | 24 Hand Menu and Windows (eliminated) | already in 44                                                                       |
| The command sentence with typed slots and a preview line of counts and cost                                                                                                                                                                    | 25 Search Everything (eliminated)     | already in 45; a candidate for 44's History lines                                   |
| The detent histogram filter: "keeps 5 of 16; next below: Ridolfi 0.069"                                                                                                                                                                        | 27 The Sheet (eliminated)             | already in 44's linked reader                                                       |

The other parts named at screening are in the "Dropped prototypes" table of the triage (Appendix B).

### Before any of these reaches a study session

These rules come from the red team's walks of the publish journey and from all three judges. They belong in graphty-element or in whatever design is built.

- **A reference stores what it resolved to.**
    - A set, a scope, a recipe input or a note's target made from a result binds to its members, or the run it read, or the dates of its window.
    - When a re-run, new data or the clock would change it, it says so on its face when reopened or replayed.
    - "Rolling" is an explicit, visible choice.
    - This is graphty-element work. It was found as a severity 3 in 23, 28, 29, 30, 32, 41, 42 and 45, and in 44 by the director's walk.
- **What is shown is separate from what is analyzed.**
    - A filter made to read the graph or to compose a figure never re-scopes a later run or an export.
    - Every run names its scope when it runs, including time windows and filters.
- **Anything done once per row or per group has a repeat:**
    - a row cursor that files a row and moves on (all three judges ask for it);
    - a per-group scope that returns one table.
- **Exports and methods list exactly what made them**, including lookups, automatic results a note cites, and the order the steps really ran in.
- **A person's judgment enters the record as a Review step** (Yes, No, Skip), never as a frozen list of ids.
- **Every revision is walked against stress journey 6 (publish the analysis) before its fixes are called done.** That is where the red team found a severity 3 in almost every design.

### What this portfolio does not contain

- **It leans toward one toolkit on purpose.**
    - 44, 26 and 35 are all object-then-verb surfaces over labeled controls, and the tag and hotbox mocks would run over 44's pages.
    - Judge 1 chose this: within two quarters, one toolkit shared by everything that ships is worth more than variety.
    - The other three entries keep three different mode models: triage (42), history editing (23) and a held prop (38).
- **Some mode models are missing.** No entry in any tier tests:
    - two people (20 was eliminated for needing two people, and no single-person variant was ever tried);
    - demonstration (19);
    - live mixing with no apply step (21);
    - tools held in the hand (4 and 8 were both closed sets; 38's plate is the only held object left);
    - hand distance (12).

    Each was dropped for a reason recorded at screening. None was rebuilt to test whether the mode model failed or only that one design did.

- **No paradigm design earns a mock.**
    - [Patch Bay (32)](prototypes/prototype-32.md) has a permanent engineering load: webxr_feasibility 3, and its own file says "no revision removes this".
    - Point and Ask's (34) main question is what share of requests a local compiler can handle. The 2D page's command palette answers that more cheaply.
    - Their parts are kept.
- **Hands alone with no voice:** 44, 35's tag layer, 42 and 38 all work that way. 26 is controllers only by choice.

## 2. Every finalist's scores

**Where the scores come from:**

- Scores come from `scripts/extract-lens-scores.py`, which reads each review file, not from the judges' text.
- The script was fixed on 2026-10-10 to also read 44's expert scores. They sit past the part of the file the script used to read.

**What "Capped" means:**

- "Capped" applies the red team's open severity 3 findings, and its corrected area counts, to the same round.
- The judges' statements quoted below rest on the uncapped scores.

Order of the eight scores: vr_usability, ergonomics_access, webxr_feasibility, coverage, extensibility, onboarding, ease_of_use, efficiency.

| #   | Name                                                 | Kind     | Rounds | First round (mean)                 | Last round (mean)                    | Capped last (mean)                 | Under the bar, last round (capped adds)            | Tier                     |
| --- | ---------------------------------------------------- | -------- | ------ | ---------------------------------- | ------------------------------------ | ---------------------------------- | -------------------------------------------------- | ------------------------ |
| 44  | [Paired Browser](prototypes/prototype-44.md)         | hybrid   | 2      | 3 3.5 3.5 4.5 4.5 4 3.5 3.5 (3.75) | 3.5 4 3.5 4.5 4.5 4.5 3.5 3.5 (3.94) | 3.5 4 3.5 3.5 4.5 4 3.5 3.5 (3.75) | webxr 3.5 (coverage 3.5)                           | mock 1                   |
| 26  | [Hotbox](prototypes/prototype-26.md)                 | plain    | 3      | 2.5 3 4 3 4 3 3 2.5 (3.13)         | 3.5 4 4 4 4 4 3.5 2.5 (3.69)         | 3.5 4 4 3.5 4 3.5 3.5 2.5 (3.56)   | efficiency 2.5 (coverage 3.5)                      | mock 2, controllers only |
| 35  | [Hint Keys](prototypes/prototype-35.md)              | plain    | 3      | 2.5 3.5 3 4 4 3 2.5 2 (3.06)       | 3.5 4 4 4.5 4.5 4 3 2.5 (3.75)       | 3.5 4 3.5 4 4.5 4 3 2.5 (3.63)     | ease 3, efficiency 2.5 (webxr 3.5)                 | mock 3, tag layer        |
| 42  | [Findings Inbox](prototypes/prototype-42.md)         | usage    | 3      | 3 3.5 3.5 3 4 3.5 3 2.5 (3.25)     | 3.5 4 4 4.5 4.5 4 3 2 (3.69)         | 3.5 4 4 4 4.5 3.5 3 2 (3.56)       | ease 3, efficiency 2                               | mock 4                   |
| 23  | [Cutting Room](prototypes/prototype-23.md)           | metaphor | 3      | 3 3.5 3 1.5 3 3 2.5 2 (2.69)       | 3.5 4 3 4 4 4 3 3.5 (3.63)           | 3.5 4 3 3.5 4 3.5 3 3.5 (3.5)      | webxr 3, ease 3 (coverage 3.5)                     | mock 5                   |
| 38  | [Prop and Plane](prototypes/prototype-38.md)         | research | 2      | 3 3.5 3 3 4 3 3 2.5 (3.13)         | 3.5 3.5 3.5 3.5 4 3.5 3 2 (3.31)     | unchanged                          | webxr 3.5, coverage 3.5, ease 3, efficiency 2      | mock 6, slab only        |
| 28  | [Graph Browser](prototypes/prototype-28.md)          | plain    | 2      | 3 3.5 4 3 4.5 4 3.5 2.5 (3.5)      | 3.5 4 4 4 4.5 4 3 2.5 (3.69)         | 3.5 3.5 4 3.5 4.5 3.5 3 2.5 (3.5)  | ease 3, efficiency 2.5 (coverage 3.5)              | 44's first milestone     |
| 30  | [One Question at a Time](prototypes/prototype-30.md) | plain    | 2      | 4 4.5 4 3.5 4 4 3.5 3 (3.81) *     | 4 4 4 3 4 4.5 3.5 3 (3.75)           | 3.5 4 4 3 4 4.5 3.5 3 (3.69)       | coverage 3, efficiency 3                           | parts                    |
| 41  | [Facet Browser](prototypes/prototype-41.md)          | usage    | 3      | 3.5 4 3.5 4 4 3.5 3 3 (3.56)       | 4 4 4 4 4.5 4 3 2.5 (3.75)           | 4 4 4 3.5 4 4 3 2.5 (3.63)         | ease 3, efficiency 2.5 (coverage 3.5)              | parts                    |
| 29  | [Encoding Shelves](prototypes/prototype-29.md)       | plain    | 2      | 3.5 4 3.5 3 4 3.5 3.5 3 (3.5) *    | 3.5 4 3.5 4.5 4.5 4 3 2.5 (3.69)     | 3.5 4 3.5 3.5 4 4 3 2.5 (3.5)      | webxr 3.5, ease 3, efficiency 2.5 (coverage 3.5)   | parts                    |
| 32  | [Patch Bay](prototypes/prototype-32.md)              | paradigm | 3      | 3 3 3 4 4 3 3.5 3.5 (3.38) *       | 3.5 4 3 4.5 4.5 4.5 3 2.5 (3.69)     | 3.5 4 3 4 4.5 4 3 2.5 (3.56)       | webxr 3, ease 3, efficiency 2.5                    | parts                    |
| 45  | [Editable Record](prototypes/prototype-45.md)        | hybrid   | 3      | 3 3.5 3.5 3.5 4 3.5 3.5 2.5 (3.38) | 3.5 4 3.5 4 4.5 4 2.5 2.5 (3.56)     | 3.5 4 3.5 3.5 4 4 2.5 2.5 (3.44)   | webxr 3.5, ease 2.5, efficiency 2.5 (coverage 3.5) | parts                    |
| 39  | [Phone in Hand](prototypes/prototype-39.md)          | research | 2      | 3 3.5 3 3.5 4.5 3 3.5 3 (3.38)     | 3.5 4 3.5 4.5 4.5 3 3 2.5 (3.56)     | 3.5 4 3.5 4 4.5 3 3 2.5 (3.5)      | webxr 3.5, onboarding 3, ease 3, efficiency 2.5    | parts (already in 44)    |
| 34  | [Point and Ask](prototypes/prototype-34.md)          | paradigm | 2      | 3 3.5 3.5 3 4 3.5 3.5 4 (3.5)      | 3.5 4 3.5 3.5 4 4 3 2.5 (3.5)        | 3.5 4 3.5 3.5 4 3.5 3 2.5 (3.44)   | webxr 3.5, coverage 3.5, ease 3, efficiency 2.5    | parts                    |
| 46  | [Fast Ring over Pages](prototypes/prototype-46.md)   | hybrid   | 2      | 3.5 3.5 3.5 4 4 3.5 3 3.5 (3.56)   | 3.5 3.5 4 3 4 3.5 3 3 (3.44)         | unchanged                          | coverage 3, ease 3, efficiency 3                   | parts                    |

\* Round 1 mixes two versions of the file; see section 3.

What the capped column changes:

- **Coverage and webxr_feasibility both at 4 or more:** on the reviewers' scores, five finalists have both (26, 28, 35, 41 and 42). Capped, only 42 does.
- **Judge 1's claim that 41 is "the only finalist at 4 on vr_usability, webxr_feasibility, coverage and onboarding":** true of the reviewers' scores. Capped, 41's coverage is 3.5, because route, flow and cut lookups are never recorded, so the methods and the recipe lose the computation behind the finding.
- **The earlier claim "26 is the only fast layer with no severity 3 left":** literally true; no lens and no red team raised one against 26 in round 3. But the red team counts 15 of 22 areas fully reachable, not 19, which is below the 4 anchor. It also scores onboarding 3.5, because the corner command is an error rather than a hesitation. Neither affects the mock, which runs on controllers only.
- **The order of the closest designs does not change:** 44 is closest under both readings, 26 is next under both, and 30 ties 26 when capped.

Judges' numbers corrected against the reviews:

- Judge 3 gives [Graph Browser (28)](prototypes/prototype-28.md) as "3.81 -> 3.69". 3.81 is its screening mean. Its round 1 mean was 3.5, so its mean rose 0.19; it did not fall.
- Judge 1 says 44 has "no severity 3 or 4 from the panel". That holds for the six lens reviewers, but the same judge then cites the red team's severity 3 for the Outbox. 44 has one open severity 3 from round 2, and one more from the director's walk (section 4).

## 3. Did the studio's state survive the token-limit gap?

**What happened:**

- The run hit a token limit partway through round 1 and resumed hours later.
- The round 1 reviews were written at 01:14 to 01:33 and at 07:47 to 07:53.
- The final report was never saved. The harness refused to let a subagent write it, and the text it returned was lost.

**How it was checked:**

- This document replaces the lost report, rebuilt from the review files themselves.
- Each item below was checked against the file timestamps, the studio's saved versions and superseded reviews (working files, not committed), and the text of each review.

**Rounds 2 and 3 are clean.**

- Every round 2 and round 3 review was written after its prototype's last revision.
- Every prototype file on disk is the version its last round scored.

**Three round 1 baselines mix two versions of the file:**

- **29 Encoding Shelves.**
    - Coverage, expert, onboarding and webxr scored the unrevised file. Ergonomics, vr-interaction and the red team scored the file after its first revision.
    - The superseded ergonomics review of the unrevised file scored 3.5, not 4. With that score the round 1 mean is 3.44, not 3.5. The round 2 rise is then 0.25, so 29 should have had a third round.
    - The vr-interaction review of the unrevised file was not kept. Its score would have to be 4 or more for the stop to hold, and screening scored 3.
    - **29 is the one finalist the gap stopped by mistake.** It has not been given its third round (see the open questions).
    - Its tier does not depend on that round: even a perfect round would have to lift its efficiency from 2.5 to 3.5.
- **30 One Question at a Time.**
    - Coverage, expert and webxr scored the original file. Ergonomics, onboarding and vr-interaction scored a revised one.
    - The superseded vr-interaction review of the original scored 3.5, not 4. With it, the round 1 mean is 3.75 and the round 2 rise is 0.
    - The stop holds unless the lost original ergonomics and onboarding scores were 2 points lower in sum than the revised-file scores of 4.5 and 4. Screening gave 4 and 4, so that is not plausible.
- **32 Patch Bay.**
    - Onboarding and vr-interaction scored a half-finished revision: its summary table had changed, but its vocabulary, journey and coverage table had not (an intermediate draft, not kept here).
    - The mixed baseline could only have granted 32 a round it would not otherwise have had.
    - 32 ran all three rounds, and its round 3, which is the one reported, is clean.

**The other reviews written after the gap read the same file as those written before it.**

- The check covered 23 (coverage), 35 (expert, vr-interaction), 38 (vr-interaction), 42 (expert, onboarding), 44 (vr-interaction) and 45 (vr-interaction).
- Each of these reviews describes the controls of the unrevised file, and none of the controls its first revision added. For example:
    - 35's reviews discuss the holds and the echo line that the revision removed;
    - 38's discuss the fist pose;
    - 23's does not know the start card.
- Their round 1 baselines are sound.

**The stop rule is coarser than the margins it decided.**

- A mean over eight criteria scored in half steps moves in steps of 0.0625. So "rise at least 0.2" really means "rise at least 0.25", which is four half-step gains net.
- Five finalists stopped at exactly +0.1875, which is three half steps: 28, 29, 38, 39 and 44.
- The studio keeps the rule as written. The criteria were frozen before screening, and changing them now would favor the designs they are changed for.
- A future studio should state the threshold in half steps.

**The judges quoted the reviewers' scores, and no lens ever ruled on the red team's disputes.** Section 2 gives both columns, and no conclusion about the bar changes.

## 4. Stress journeys the director walked

The criteria assign stress journeys 2 to 5 to the coverage lens and journey 1 to the onboarding lens. Journey 6 (publish the analysis) was walked only by red teams. The walks below close the gaps that matter for the worth-a-mock tier.

### Paired Browser (44): journey 6, a week after journey 2's fraud case

**Setting:** Quest 3, hands, seated, laptop paired.

**Last week's case** ran journey 2 as the file gives it:

- Graph page, Time, "last 30 days", Apply, Earlier by a week.
- Then Run on these, Louvain.
- The suspicious group was kept as "Ring 7".

Each step below follows the file's own rules.

| Step                                                  | Path in 44                                                                                                   | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Reopen; go to "Ring 7 close-up"                    | Home, Recent, the case (opens the laptop's file); address bar "ring", the view, Go                           | Works when nothing waits in the Outbox. If headset saves were queued while the laptop slept, and the laptop copy was edited since, the Outbox later overwrites that edit without a word (the red team's severity 3, area 19). A view stores the page, what is in view and the framing, but not the time window. So the close-up opens under whatever window the tab was left at, and nothing says which (severity 2)                                                                                                                                                                                                              |
| 3. The ring and its 1-hop context                     | Ring 7 set page, Grow neighbors..., 1 hop, Add to basket, Fade others                                        | A set page has a "definition" and the verbs Freeze and Edit rule..., so on the most plausible reading a set kept from a group row is a live rule ("community is 7") until frozen. Suppose Louvain was re-run last week with "Run again with changes...". Ring 7 now holds the renumbered community 7, its count changes, and the evidence note now sits on a different group. Nothing on the set page says it changed. **Severity 3** (changes work unnoticed; areas 7, 17 and 18). The file does not say which reading holds. The fix is the shared rule: a kept set stores its members, and drift is reported on reopen         |
| 5. Methods                                            | History, Journal, Open wide                                                                                  | The methods paragraph is prefilled from the journal, which keeps undone runs (the red team's severity 2). Run pages list "scope, time", but they do not say whether "time" is the window the run used                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6. Recipe "Ring triage", replayed on a second dataset | Save steps as recipe..., tick six; Ring 7 becomes the input "a set or a rule"; the dataset becomes "a graph" | The Louvain step ran under the tab's time window. That is none of the recipe's input kinds, so replay never asks for it. On the new dataset the step runs either with no window (the whole history) or with last case's absolute dates; the file says neither. The replay's page lists only steps that could not run, and a wider window runs fine. **Severity 3** (area 18's hardest case fails silently). 44's recipe inputs, like Graph Browser's (28), have no time-window kind, so 44 has the same defect as 28's round 2 red-team finding. The red team's severity 2 also applies: Ring 7 cannot be asked for during replay |
| 7 to 9. Exports, report, Save as                      | Three Export... forms to the laptop folder; Report...; Save as "Case 2026-114 final"                         | Work when paired. Unpaired, exports land in the headset's downloads, and moving them means leaving VR. Save as makes the laptop file the project's home, so the Outbox risk from step 1 applies to it                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Effect:**

- 44 joins the list of designs with the shared defect.
- Two severity 3 findings cap its coverage at 3.5.
- Each has a paper fix inside the idea (section 1, mock 1).

### Prop and Plane (38): journey 6 rechecked after its revision

**What round 1 found:** the red team found two severity 3 findings on this journey. A recipe could not target a set or a node, and every output stayed in the headset. Nobody walked journey 6 again after the revision.

**Recipe targets are fixed on paper:**

- every node, set and attribute a step used becomes an input slot;
- a set slot is filled by a kept set or the current selection;
- "Run recipe from here" starts from any node or set.

**Outputs are fixed on paper, at one cost:**

- every export goes to the Outbox on the paired laptop by default;
- but the pairing code shows only inside VR and must be typed on the laptop, so the headset comes off once per session (the round 2 red team's severity 2).

**Still open:**

- files from the laptop cannot come in without taking the headset off (severity 3 on coverage);
- sets are "rule or frozen", with no stated default for a set kept from a community;
- a time window is not a recipe input kind, so a time-windowed run replays on an unstated window, as in 44 (severity 2 here, since no 38 journey runs under a window);
- a 2000-character report section is drafted on the laptop.

None of these touches the slab, which is all the mock tests.

### Not walked

- **[Hint Keys (35)](prototypes/prototype-35.md):**
    - The round 3 red team walked journey 1, steps 4 to 8, and journey 6, step 6 (where the pick run breaks).
    - The rest of journey 6 has never been walked.
    - The mock covers only the tag layer, which journey 6 does not test.
- **[Fast Ring over Pages (46)](prototypes/prototype-46.md):**
    - Journey 3 was never walked past step 1, and nobody walked journey 6 after its revision. Yet the file claims journeys 2 to 5 complete.
    - 46 is now a source of parts, so its coverage claim decides nothing. The claim stays unverified.

## 5. What the studio learned across designs

**What survived review in every family:**

- one worded verb list on the object in front of you (object, then verb);
- Back for the view, kept apart from a named Undo for the data;
- a preview with counts before any commit ("keeps 5 of 16");
- forms and catalogs generated from each algorithm's and layout's option descriptor, which put extensibility at 4 or 4.5 for every finalist;
- a "which one?" list for dense picks;
- inputs built only from the standard select event (release, timed hold, drag, two hands). These run unchanged on Vision Pro's transient pointer.

**What failed everywhere:**

- **Repeat for per-row and per-group work.**
    - No finalist's efficiency rose above 3.5.
    - Triaging matches, labeling 15 clusters, merging 40 pairs and running five scenarios were all repeated by hand, at 5 to 16 acts each.
- **Re-binding when work is replayed:** found in nine finalists.
- **Laptop files:** every answer depends on a relay graphty does not run.
- **The in-scene UI toolkit:** DOM overlay works only in AR, so every panel-heavy design has to build one.
- **At screening, two kinds of design were eliminated or came close:**
    - designs that relied on held poses (7, 8), memorized glyphs (9), raw eye gaze (17) or voice as the only path (2);
    - designs whose fixed surfaces ran out of room (4, 6, 22).

**The hard cases, and which reviewed design handles each best:**

| Hard case                               | Best answer                                                                                                                                                                                                                             | Where                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Text                                    | A lent laptop keyboard, or the phone with its keys mirrored under the field; an in-scene keyboard when neither is there                                                                                                                 | 44 (from 39)                                   |
| Long lists and catalogs                 | An address bar over every page and verb, with catalogs generated from descriptors                                                                                                                                                       | 44 and 28                                      |
| Many numbers and numeric options        | Generated forms with decade steppers and an exponent key for logarithmic options                                                                                                                                                        | 41 and 29                                      |
| Two inputs (a path's source and target) | A slot on the form armed by "Type a name" or a pick ("Route to...")                                                                                                                                                                     | 44                                             |
| Rules                                   | Clause rows under ALL OF, ANY OF and NONE OF, editable a week later from the step's page                                                                                                                                                | 44                                             |
| Comparing                               | Graph views side by side are not possible yet (graphty-element draws one view per immersive session). Best today: a switch that flips between conditions at fixed positions (44), or runs stacked in depth and sliced by the plate (38) | 44, 38                                         |
| Tables                                  | A wide sheet with frozen name and sort columns, and a linked histogram with one cut handle                                                                                                                                              | 44                                             |
| Files                                   | A laptop folder listed in the headset's Inbox through a pairing, still unbuilt                                                                                                                                                          | 44, 32, 35                                     |
| Precise reading                         | A cut handle that settles between two named values ("between Tornabuoni 0.071 and Ridolfi 0.069")                                                                                                                                       | 44 (from 27), 41                               |
| Picking one node in a dense graph       | Tags (35), the slab (38) or the "which one?" card (44); the mock tier compares all three                                                                                                                                                | 35, 38, 44                                     |
| History                                 | Editing an old step in place, with a preview of what will replay                                                                                                                                                                        | 23, 45 (both need the element's replay engine) |

## 6. Prototypes not chosen at screening

31 of the 43 were eliminated at screening. 12 finalists went forward, joined by 3 new hybrids (the triage in Appendix B has the full board).

| #   | Name                                                | Why it was dropped                                                           | Worth keeping                                                     |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | [Palette Hand](prototypes/prototype-1.md)           | A four-face palette has no room for forms, tables or lists                   | The face that always shows the selection's verbs                  |
| 2   | [Point and Say](prototypes/prototype-2.md)          | Voice is the only command path, so Quest Browser reaches nothing             | Fix one wrong word by poking its chip                             |
| 3   | [Gesture Grammar](prototypes/prototype-3.md)        | No panels, so no place for tables, forms and lists                           | Object-first marking menu; pull a node for hops with a live count |
| 4   | [Tool Belt](prototypes/prototype-4.md)              | Its eight-slot belt is already full                                          | Preview-then-confirm filter                                       |
| 5   | [Workbench](prototypes/prototype-5.md)              | Coverage 2 and webxr_feasibility 2; 28 does its job better                   | Compound rules as an editable AND/OR list                         |
| 6   | [Workshop](prototypes/prototype-6.md)               | Its fixed pegboard needs twice the tools it holds                            | Analysis state as objects on rails                                |
| 7   | [Hand Signs](prototypes/prototype-7.md)             | The mode is a held pose that tracks well only where it tires the arm         | An undo that names the step                                       |
| 8   | [Grip and Tool](prototypes/prototype-8.md)          | A closed set of eight grips, with no path for people who cannot form them    | Attribute tags generated from result fields                       |
| 9   | [Spellcasting](prototypes/prototype-9.md)           | Memorized glyphs cannot be discovered and cannot grow                        | A live preview before the cast                                    |
| 10  | [HUD](prototypes/prototype-10.md)                   | Coverage 1.5; it lacks surfaces                                              | A name tag at the reticle before any act                          |
| 11  | [Context Menus](prototypes/prototype-11.md)         | Coverage 2, webxr_feasibility 2.5; 24 and 28 carry the idea further          | Its controller mapping                                            |
| 12  | [Lean In](prototypes/prototype-12.md)               | Hand distance as the mode cannot carry panel-shaped work                     | Counts before release; drag back past the rest notch to cancel    |
| 13  | [Hand of Cards](prototypes/prototype-13.md)         | Coverage 1.5; 23 is the stronger history metaphor                            | Per-object undo that lights its blast radius (in 45)              |
| 14  | [Voodoo Dolls](prototypes/prototype-14.md)          | Coverage 1.5, onboarding 2                                                   | Two touching copies show only the verbs that fit that pair        |
| 15  | [Physics Lab](prototypes/prototype-15.md)           | Feedback and selection stop working past a few hundred nodes                 | A well's rim reading "0.070 -- 5 kept"                            |
| 16  | [Proofreader's Slate](prototypes/prototype-16.md)   | Coverage 1.5; fingertip ink unproven on two of three headsets                | Strike, stet and bracket steps as history and recipe (in 45)      |
| 17  | [Orbits](prototypes/prototype-17.md)                | Eye pursuit is not readable by a web page on any headset                     | Nothing changes until an explicit confirm                         |
| 18  | [Linked Views](prototypes/prototype-18.md)          | Coverage 2, extensibility 2.5                                                | A linked sorted table and histogram (in 44)                       |
| 19  | [Show Me](prototypes/prototype-19.md)               | Demonstration covers ranking and filters but little else                     | A pending guess with a count; correction by counter-example       |
| 20  | [Pilot and Navigator](prototypes/prototype-20.md)   | Every command needs two people                                               | A joint-hold ghost that names the target and counts the effect    |
| 21  | [Mixing Desk](prototypes/prototype-21.md)           | Coverage 1.5                                                                 | A cue bus that previews any strip before it reaches the graph     |
| 22  | [Command Card](prototypes/prototype-22.md)          | The fixed grid runs out of room                                              | Cancel-last at a body landmark that names its target              |
| 24  | [Hand Menu and Windows](prototypes/prototype-24.md) | Repeats the platform default that 28 carries further                         | "Which one?" list; "Set this on the 2D page" (both in 44)         |
| 25  | [Search Everything](prototypes/prototype-25.md)     | Repeats 28's address bar at a lower score                                    | The typed-slot command sentence (in 45)                           |
| 27  | [The Sheet](prototypes/prototype-27.md)             | Efficiency 2; overlaps 29                                                    | The detent histogram filter (in 44)                               |
| 31  | [Lens Kit](prototypes/prototype-31.md)              | Coverage 2.5; whole-graph lens previews threaten frame rate                  | The two-count readout (inside now, if spread)                     |
| 33  | [Verb, Count, Scope](prototypes/prototype-33.md)    | A grammar to learn                                                           | Target-first verb ring and repeat on a new target (in 46)         |
| 36  | [Focus Remote](prototypes/prototype-36.md)          | Onboarding 2.5, efficiency 2                                                 | A status strip naming the focus and the next input                |
| 37  | [Zoom Stream](prototypes/prototype-37.md)           | Files unanswered; 30 covers safe commit with better feasibility              | The slow-crossing Go box that states what will change             |
| 40  | [Desk Touch](prototypes/prototype-40.md)            | An untested contact classifier on an uninstrumented table                    | The table edge as a detented rail with a magnifier                |
| 43  | [Variant Grid](prototypes/prototype-43.md)          | Rendering every tile as a live whole-graph variant is beyond graphty-element | Counted outcome tiles (in 46)                                     |

## 7. How the studio worked

1. **Criteria.** The criteria and the bar were written first and frozen after a pilot review of prototype 24.
2. **Screening and triage.**
    - Three screening lenses scored all 43 designs.
    - Triage picked 12 finalists, for score and for diversity of kind and mode model.
    - It also proposed 3 hybrids aimed at gaps the finalists share.
3. **Rounds.** Each finalist went through up to three rounds. In each round:
    - six lens reviewers each scored their own criteria;
    - a red team attacked both the design and the reviews;
    - a designer revised the file.
4. **Stopping.** A finalist stopped when it met the bar, when its mean rose less than 0.2, or after three rounds.
5. **Judging.** Three judges with different priorities ranked the 15:
    - judge 1 (Appendix C): a product lead;
    - judge 2 (Appendix C): a working analyst;
    - judge 3 (Appendix C): a research lead.
6. **This document** closes the gaps a completeness critic found in the first draft.

## Open questions

- **Would 44's webxr_feasibility be 4 with the two unbuildable claims deleted?**
    - Only a WebXR re-read of a revised file can say, and the stop rule forbids that round.
    - The answer would not change the verdict while coverage is capped.
    - The first mock's compositing spike answers the underlying question.
- **29 is owed a third round.** The token-limit gap stopped it by mistake (section 3), and the round has not been run. Its tier (source of parts) would change only if one round lifted its efficiency by a full point.
- **30's and 32's original round 1 scores are partly lost:** ergonomics and onboarding for 30, vr-interaction and onboarding for 32. Neither loss can change a stop decision (section 3), but their first-round columns in section 2 are not clean.
- **No lens has ruled on the red team's score disputes.** The capped column is the director's application of the cap rule, not a rescoring.
- **44's file does not specify how its sets and time windows behave.** The director's walk scored it on its most plausible reading. The file should state both rules before the mock is specified.
- **Some journeys have never been walked:** the rest of journey 6 for 35, and journeys 3 and 6 for 46.
- **Should the studio try a single-person variant of two-person control (20) or a demonstration mock (19)?** No tier tests either mode model (section 1), and the studio has not spent a round on them.
- **The stop rule's threshold** should be stated in half steps by any future studio (section 3).

## Appendix A: the criteria

These are the rules every review, triage, revision and ranking in the studio follows. They were
written before any prototype was reviewed. A rule changes only with a reason recorded in the change
log at the end, and never after screening starts, except through the pilot check.

What is judged: interactions, controls, menus and how they combine. What is never judged: scenery,
graphics, the background color or the look of the graph. Every prototype has the same setting -- a
solid colored background in full VR, the graph at chest height about 75 cm away, a head-mounted
display (Meta Quest 3/3S, Samsung Galaxy XR, Apple Vision Pro) with hands, controllers where the
device has them, eyes where exposed, voice optional.

Sources a reviewer works from:

- the prototype file (control vocabulary, the 11-step Florentine families journey, advanced
  journeys, coverage, plug-in paths, devices, evidence, risks; prototypes 1-11 may lack the
  coverage sections, and the reviewer then judges coverage from their controls)
- `tmp/xr-control-prototypes/graphty-functionality.md`: the 22 checklist areas, the 9 hard cases
  and the 6 stress journeys
- `design/designloom/personas/` and `design/designloom/workflows/`

### General scoring rules

- Score 1 to 5 in steps of 0.5. Each criterion below names its conditions. In the review, state
  which anchor each condition sits at, then score between them; a half step means the design sits
  between two anchors. The score may be at most 1 point above the lowest condition, so strength on
  one condition (excellent feedforward) never buys back a failure on another (an invisible mode
  that changes what the main pinch does). webxr_feasibility is scored by its weakest core input on
  its weakest headset, and efficiency by its counts.
- A reviewer who raises a severity 3 finding against a criterion scores that criterion at most
  3.5; a severity 4 finding, at most 2.5.
- Score what the paper design says, not what a good implementation might add. An operation the
  file gives no path to does not exist. "Could be added later" earns nothing.
- A described control whose behavior in an edge case is left unspecified (whether a list opens on
  press or release, what hand-tracking loss does mid-drag, how a popover closes) is scored on its
  most plausible reading, and the gap is a finding, usually severity 2. This is not a missing
  operation.
- An operation also has a path when a generic mechanism the file describes reaches it by
  construction: a form generated from every descriptor, a command palette over every command,
  every object's popover listing its declared verbs. The reviewer names the mechanism. "A generated
  page would probably carry it" is not by construction. This matters most for prototypes 1-11,
  which lack coverage sections.
- A path the file itself defers ("later", "once paired", "to be checked") counts only through the
  fallback the file gives for today. A path the file specifies as part of the design counts even
  though graphty would have to build it; its build cost is judged under webxr_feasibility, not
  coverage.
- Start from 3 only if the evidence supports it. Every score of 4 or 5 must cite at least one
  journey step or checklist area the reviewer walked and that worked; every score of 2 or below
  must cite where it failed.
- Voice is optional. A design whose only path to an operation is voice has no path on Quest
  Browser (no Web Speech) or for a person who cannot or will not speak; count that operation as
  not reachable unless a non-voice path exists.
- Raw eye gaze is not available to web pages on Quest Browser or Vision Pro Safari (Vision Pro
  exposes only gaze-and-pinch as a transient pointer at the moment of the pinch). Treat raw gaze as
  unavailable on Galaxy XR Chrome too unless the prototype cites evidence that it is exposed.
- When two inputs collide (the same pinch means two things, a rest pose fires a command), that is
  a vr_usability finding, not an efficiency gain.

### The rubric

#### vr_usability -- does every control mean one thing, behave predictably and show what it will do?

Watch for: one meaning per input everywhere, accidental activation (Midas touch, a pinch read during
a rest pose, hand tracking loss mid-gesture), visible modes, pointing at one node in a dense 3D
graph, and feedforward (the person sees what will happen before it happens).

Conditions: input meanings and visible modes; accidental activation; dense selection; feedforward.

| Score | Anchor                                                                                                                                                                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | Every input has one meaning in every state; no gesture is a natural rest or conversation pose; the current mode is always visible where the person is looking; picking one node among 500 within 1 degree works first time through a disambiguation step (snap, magnify, cycle); every destructive or expensive act previews its effect before commit |
| 4     | At most one input changes meaning with a mode, and that mode is shown on the hand or pointer; accidental activation is possible in one rare situation and undoable in one act; dense selection works with one extra act                                                                                                                               |
| 3     | Two or three inputs are overloaded or one mode is invisible; accidental triggers are plausible during normal use but cheap to undo; dense selection needs zooming in first                                                                                                                                                                            |
| 2     | Common gestures collide (the select pinch also grabs, scrolls or opens a menu); a mode is invisible and changes what the main input does; dense selection regularly hits the wrong node; no preview before commit                                                                                                                                     |
| 1     | The person cannot predict what an act will do; ordinary hand movement fires commands; selection in a graph of a few hundred nodes is a guess                                                                                                                                                                                                          |

#### ergonomics_access -- can a person use it for an hour, seated, one-handed, without voice?

Watch for: arms raised above the elbow or extended for long periods (gorilla arm), held poses, neck
turns beyond 30 degrees or looking down at the hands for long, motion that causes sickness,
precision beyond what tremor allows, seated and one-handed use, low vision (text size), no voice,
sessions of 30 to 60 minutes.

Conditions: arm, neck and held-pose load; one-handed and no-voice paths; text readability; motion
comfort; session length. When the file states no text size, assume each platform's default panel
text at the distance and placement the file gives, and judge the distance and placement only.

| Score | Anchor                                                                                                                                                                                                                                                                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | The 11-step journey can be done seated with elbows near the body, hands at or below chest height, no held pose longer than 2 seconds; every operation has a one-handed path and a no-voice path; text is readable at the stated distance; camera motion is user-driven or eased with no forced locomotion; 60 minutes is plausible |
| 4     | One or two steps need raised or extended arms for under 10 seconds, or one held pose; one-handed and no-voice paths exist for everything but are slower; 30 to 60 minutes plausible with breaks                                                                                                                                    |
| 3     | Several steps need raised arms or held poses of 5 to 15 seconds; some operations need two hands or voice with a clumsy alternative; 20 to 30 minutes before fatigue                                                                                                                                                                |
| 2     | The core loop keeps the arms raised or extended, or needs constant looking down; some operations have no one-handed or no no-voice path; standing is assumed; fatigue within 10 to 20 minutes                                                                                                                                      |
| 1     | Unusable seated, one-handed or without voice for core operations, or causes motion sickness by design (forced camera motion, rapid world movement)                                                                                                                                                                                 |

#### webxr_feasibility -- can a browser build it on all three headsets?

Check each input against what a browser reads today: Quest Browser (hands, controllers, no eye data,
no Web Speech), Samsung Galaxy XR in Chrome (hands, controllers; eye data unconfirmed), Vision Pro
Safari (transient-pointer gaze-and-pinch, hand joints, no raw gaze, PS VR2 controllers), plus text
entry, DOM or layer overlays, and frame rate at 1,000 to 10,000 nodes.

| Score | Anchor                                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5     | Works on all three headsets today with standard WebXR input (select and squeeze events, controller buttons and axes, transient pointer, simple hand-joint distances) and graphty-element's existing XR rendering; nothing core needs custom engineering beyond ordinary UI panels          |
| 4     | Works on all three headsets with known custom work: a hand-joint gesture recognizer for a few distinct poses, in-scene UI panels and a keyboard, a laptop handoff channel; every core input has an equivalent on each device, stated in the file                                           |
| 3     | Needs substantial custom engineering (a classifier for many similar gestures, continuous trajectory recognition, a custom text-entry system, heavy per-frame work that threatens frame rate at 10,000 nodes), or one core input falls back to a noticeably worse substitute on one headset |
| 2     | A core input is unavailable on one headset with only a poor fallback (raw gaze on Quest or Vision Pro, Web Speech on Quest, continuous hand tracking where only transient pointer is exposed), or the design depends on browser features in flags or behind origin trials                  |
| 1     | Impossible on at least one of the three headsets: the central input of the idea cannot be read by a web page there, and no substitute keeps the idea                                                                                                                                       |

#### coverage -- how much of graphty is reachable in the headset?

Count the 22 areas of `graphty-functionality.md`. An area is FULLY REACHABLE when every operation
in its operations table is natural or workable with this design's own controls without taking off
the headset (the parity codes in that file), AND the area's named hardest case can be completed.
Test the hardest case first. An area with any operation awkward or not possible, or whose hardest
case stops, is not fully reachable. A file on the laptop counts as workable only when the
prototype names a handoff path that brings it into the headset without taking the headset off (a
headset picker that sees only the headset's downloads or a cloud drive the person must upload to
first does not).

Walk stress journeys 2, 3, 4 and 5, every step, so coverage scores compare across prototypes
(journey 1 is walked by the onboarding lens; journey 6 is optional). Name the step where each
stops.

A hard case is ANSWERED when the file gives a path that completes it; WEAK when the path completes
only at a large stated cost (much slower than the desktop, error-prone, or relying on a device
feature the file marks "to be checked"); UNANSWERED when no path completes it.

Conditions: areas fully reachable; hard cases; stress journeys completed.

| Score | Anchor                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | 20 to 22 areas fully reachable (90% or more), and every one of the 9 hard cases has an explicit answer (text, long lists, many numbers, two inputs, rules, comparing, tables, files, precise reading) |
| 4     | 16 to 19 areas fully reachable (about 75 to 89%), the rest workable in part; at most two hard cases have weak answers, none unanswered                                                                |
| 3     | 11 to 15 areas fully reachable (50 to 74%); some hard cases unanswered, but the 11-step journey and at least two stress journeys complete                                                             |
| 2     | 6 to 10 areas fully reachable (25 to 49%); several stress journeys stop at a step the design cannot do                                                                                                |
| 1     | 5 or fewer areas fully reachable; the design covers little more than view, select and run one algorithm                                                                                               |

#### extensibility -- does a new feature slot in without redesigning the controls?

Three additions. A plugin author (`design/designloom/personas/plugin-author-*.yaml`) adds a new
algorithm with 3 options (one logarithmic) and a new layout with 8 options. graphty's own team adds
a new object type with its own verbs (for example a "time window" or "comparison" object):
graphty-element's extension points register algorithms, layouts, data sources, format writers and
palettes, not object types, so no design can let a plugin add one and none is marked down for it.
Judge whether the new type joins the controls from its descriptor (its verbs, its scene marker or
pick target, its place in menus) or needs a hand-designed gesture, glyph or surface. Also check
growth: the algorithm catalog from 29 to 60+, a 19th palette, a 12th file format.

Conditions: the three additions; catalog growth; room on fixed surfaces.

| Score | Anchor                                                                                                                                                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | All three additions appear automatically from their plain-data descriptors (name, category, options, result fields, verbs) in the right place, with correct option controls, and are found in about three acts at 60+ catalog entries; the plugin author writes no XR code and the new object type needs nothing beyond its descriptor |
| 4     | All three appear from descriptors; one needs a small hand-made addition (an icon, a glyph, a slot assignment) or a catalog of 60+ needs one more act than 29                                                                                                                                                                           |
| 3     | Algorithms and layouts slot in from descriptors, but a new object type or a new kind of option needs design work; or the catalog past about 40 entries degrades to scrolling                                                                                                                                                           |
| 2     | Each new feature needs a hand-designed control (a new gesture, glyph, tool, card or slot), so growth is linear design effort; or a fixed surface (a grid, a belt, a pegboard) runs out of room                                                                                                                                         |
| 1     | The control set is closed: a plugin cannot appear in VR at all without redesigning the scheme                                                                                                                                                                                                                                          |

#### onboarding -- does a first-time user finish unaided?

Play `explorer-elena`, a first-time user who knows graphty on the 2D page but not this VR scheme,
on Meta Quest 3 with hands only, seated (the hardest common case); note where Vision Pro changes
the outcome. Narrate the first 10 minutes, starting from the empty start of stress journey 1
(steps 1 and 2: no data loaded, open a sample) and then the 11-step journey.

A tour or hint counts only where the file says when and where it appears. A control counts as
invisible for a step only when that step has no visible, labeled alternative; a missed control
with a visible alternative is at most a hesitation.

Conditions: completion unaided; discoverability of the controls the journey needs; stalls and
hesitations.

| Score | Anchor                                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | The person finishes the 11-step journey unaided in about 10 minutes; every control is discoverable from what is visible (affordances, labels, hints at the point of use); nothing must be memorized first; a mistake shows how to recover |
| 4     | Finishes unaided with one or two hesitations, helped by a short in-context tutorial or hint; one control (a gesture, a shortcut) is learned from a hint rather than seen                                                                  |
| 3     | Finishes with a tutorial of under 5 minutes; two or three controls are invisible until taught; at least one step stalls until a hint appears                                                                                              |
| 2     | Needs a long tutorial or memorized vocabulary (gestures, glyphs, poses, spoken grammar) before the journey; several steps stall; important verbs are never discovered                                                                     |
| 1     | Cannot get past the first steps without outside instruction; the person does not know how to start                                                                                                                                        |

#### ease_of_use -- does an expert make few mistakes and carry little in their head?

Play a domain persona doing one of their real workflows. Judge recall burden, error rate, recovery
and whether the work stays in the flow of the graph.

Conditions: patterns and recall; errors and recovery; whether the expert would choose VR.

| Score | Anchor                                                                                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | The expert works without thinking about the controls: one consistent pattern (object, then verb) everywhere, nothing to memorize beyond what is visible, every error undoable in one act, would choose VR over the 2D page for this workflow |
| 4     | One or two patterns to learn; rare errors, cheap to recover; would choose VR for the spatial parts of the workflow                                                                                                                           |
| 3     | Several patterns or modes to keep in mind; occasional wrong-target or wrong-mode errors; recovery takes a few acts; VR and the 2D page roughly equal                                                                                         |
| 2     | Frequent errors or heavy recall (many gestures, a grammar, hidden modes); recovery is costly; the expert would go back to the 2D page                                                                                                        |
| 1     | The expert cannot do their workflow reliably                                                                                                                                                                                                 |

#### efficiency -- how many actions does each journey step take?

An action is one discrete act: a pinch or trigger press, a flick or gesture, a grab and release
(counted as one), a dwell, a spoken command, one pick from a list, one confirm. Typing or dictating
a short string (a name, an id) counts as 2 actions; a sentence counts as 4. Navigating to a surface
(opening a menu, turning the head or body to a panel out of view) counts as 1. The median is taken
over the 11 steps of the Florentine journey; the "no step above" limits apply to those steps and to
every step of the persona workflow walked. A step the design cannot do counts as 15. Stress
journeys walked by other lenses do not enter efficiency, because each prototype gets different
ones.

| Score | Anchor                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | Median 2 or fewer actions per step; no step above 5; shortcuts or repeat for repeated work (re-run with new options, the same style on another set) |
| 4     | Median 3 or fewer; no step above 7                                                                                                                  |
| 3     | Median 4 or fewer; no step above 10                                                                                                                 |
| 2     | Median 5 or 6, or any step above 10                                                                                                                 |
| 1     | Median above 6, or any step of the 11-step journey cannot be done                                                                                   |

### Severity of findings

| Level | Meaning                                                                                                                                                                                                     | Example                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Cosmetic: a label, an order, a size; nobody is slowed                                                                                                                                                       | A verb sits second in a menu where it is used most                                                                                                      |
| 2     | Slows people: extra acts, hesitation, or a wrong act the person notices and undoes in one act; the task still finishes                                                                                      | Picking the source and target for a shortest path takes a mode switch each time; a drag on a list row's grip reorders a layer, and one Undo restores it |
| 3     | Blocks a task or a whole checklist area for many people, or an accident in normal use that changes work unnoticed, cancels running work or takes more than one act to recover; a fix exists inside the idea | No way to set a logarithmic tolerance; rules cannot be edited after creation; no one-handed path; a resting arm pokes a panel's steppers                |
| 4     | Breaks the design: cannot be fixed without abandoning the idea                                                                                                                                              | The central input does not exist on Vision Pro; the core gesture is a natural rest pose; the fixed grid cannot hold a 60-entry catalog by construction  |

Severity measures what happens to the person, whichever lens finds it:

- A dependency on something graphty does not have yet (a laptop pairing, panel descriptions the
  desktop does not use) is not a finding by itself: its cost belongs to webxr_feasibility and the
  file's risks. It becomes a finding only when the file offers no working path before it exists,
  and then it takes the severity of the task it blocks.
- For extensibility: severity 3 when one of the three additions, or one growth case, needs a
  hand-designed control each time; severity 4 when the control set is closed to it.
- When two reviewers report the same defect, triage keeps one finding at the higher severity.

A severity 4 finding is CLEARED only when a revision fixes it while keeping the idea, and a reviewer
of the next round agrees. Relabelling it 3 without a change does not clear it.

### The bar for RECOMMENDED for implementation

A prototype is RECOMMENDED only when, in its latest review round:

- no criterion has a mean score below 3.5,
- coverage and webxr_feasibility each score at least 4, and
- no severity 4 finding is open.

Scores are the mean of the reviewers who scored that criterion in that round, rounded to one
decimal.

### How the final list is chosen

The studio ends with:

1. A prioritized list of diverse ideas in three tiers: recommended to implement, worth a mock (a
   cheap prototype in a headset to test the risky part), and keep as a source of parts (one control
   or idea worth reusing).
2. Two to four prototypes recommended for implementation, in order, each with why, its biggest open
   risk and the first spike that would test it. If none meets the bar, the studio says so plainly,
   names which comes closest and what blocks it, and does not recommend anything below the bar.

Diversity matters as much as score when choosing finalists and building the tiers:

- Kinds: plain (including combinations and product borrowings), metaphor, our own paradigms,
  research-sourced, and new usage paradigms. The finalists and the tiers should hold at least one of
  each kind when one of that kind is worth keeping.
- Mode models: select-then-command, tools, marking menus, hand distance, live mixing, demonstration,
  history editing, two-person, and others. Prefer a spread of mode models over several variants of
  one.
- Inputs: controllers, hands, gaze-and-pinch, voice-optional. At least one recommended or
  worth-a-mock design must work fully with hands alone and no voice.
- A low scorer whose weaknesses are fixable stays in if it is the best of its kind. A high scorer
  that only repeats a stronger one of the same kind and mode model may be dropped.
- A hybrid is a new prototype that combines the strongest parts of several prototypes to cure a
  weakness the finalists share; it is reviewed to the same bar as any other.

Ties on the bar are broken by: coverage, then webxr_feasibility, then the lowest criterion, then the
mean.

### Stop rules for iteration

A finalist stops iterating at the first of:

- it meets the bar (it is then a candidate for RECOMMENDED);
- a revision does not raise its mean score by at least 0.2 and does not clear a severity 4 finding;
- it has had 3 review rounds.

A finalist that stops without meeting the bar keeps its last scores and can still appear in the
"worth a mock" or "source of parts" tiers.

### The pilot

Before screening fans out, three prototypes are reviewed as a pilot. The director then checks that
reviewers walked real journey steps and checklist areas, that scores match the anchors, that
severities are used consistently, and that every rule can be scored from a paper design. The
director may change these criteria at that point, with each change and its reason in the change log.
After the pilot check, the criteria are frozen.

### Change log

| Date       | Change                                                                                                                                                                                                                                                            | Reason                                                                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-10 | Each criterion names its conditions; reviewers state each condition's anchor, and a score may be at most 1 above the lowest condition (webxr_feasibility by weakest input, efficiency by counts)                                                                  | The pilot's vr_usability 3.5 averaged top-anchor feedforward against three invisible modes that change what a pinch on a node does, which is the 2 anchor's wording. Anchors bundle several conditions and the rubric never said how to combine them                                                       |
| 2026-10-10 | A severity 3 finding caps its criterion at 3.5; a severity 4 at 2.5                                                                                                                                                                                               | The pilot raised four severity 3 findings beside vr_usability 3.5 and one beside extensibility 4. Scores and severities must agree, and a severity 4 must keep a prototype off the bar                                                                                                                     |
| 2026-10-10 | Unspecified edge-case behavior of a described control is scored on its most plausible reading and reported as a finding                                                                                                                                           | "A control the file does not describe does not exist" was being stretched to edge cases (press or release for "which one?", hand-tracking loss); it should apply to missing operations only                                                                                                                |
| 2026-10-10 | Generic mechanisms that reach an operation by construction count, if named; "probably" does not                                                                                                                                                                   | The coverage reviewer let five areas fall to partial over one unnamed operation each and also floated "a generous reading of about 16". Prototypes 1-11 have no coverage sections and would be judged on a different standard without this rule                                                            |
| 2026-10-10 | Deferred paths ("later", "to be checked") count only through today's fallback; specified paths count, with their build cost under webxr_feasibility                                                                                                               | Prototype 24 lists the laptop inbox as a path in its coverage table and calls the pairing "the later path" in its risks; the coverage reviewer both credited it (area 1) and raised it as severity 3. The webxr_feasibility 4 anchor already prices a handoff channel as custom work                       |
| 2026-10-10 | Coverage: an area is fully reachable only if its named hardest case completes; a laptop file needs a handoff that does not take the headset off; hard cases defined as answered, weak or unanswered                                                               | The pilot counted area 16 "fully (with a stall)" while its hardest case (three-state edges, stress journey 5 step 5) stopped, and counted laptop files workable through a picker that cannot see the laptop. Weak and unanswered were used without definitions. Re-read, the pilot counts 10 areas, not 11 |
| 2026-10-10 | Coverage walks stress journeys 2, 3, 4 and 5; onboarding walks journey 1's empty start; efficiency counts the Florentine journey and the persona workflow only                                                                                                    | "At least 3 of 6" let each reviewer pick different journeys, so "journeys complete" and step maxima would not compare across 43 prototypes; the checklist itself promised all six. The pilot skipped journey 4 (formula, batch run, removal)                                                               |
| 2026-10-10 | Extensibility: graphty's team, not a plugin author, adds the new object type                                                                                                                                                                                      | graphty-element's extension points register algorithms, layouts, data sources, format writers and palettes, never object types, so every design would fail "a plugin adds an object type" for a reason that is not about its controls. The pilot reviewer worked around it by switching authors            |
| 2026-10-10 | Onboarding fixes the persona (explorer-elena), the device (Quest 3, hands, seated) and the start (empty, journey 1); tours count only where the file says when they appear; a missed control with a visible alternative is a hesitation, not an invisible control | "elena or alex" and an unstated device would make onboarding scores incomparable. The pilot reviewer made these choices well; they are now the rule                                                                                                                                                        |
| 2026-10-10 | Ergonomics: with no stated text size, assume platform-default panel text and judge distance and placement                                                                                                                                                         | Paper designs rarely state text size, so "readable at the stated distance" could not be scored                                                                                                                                                                                                             |
| 2026-10-10 | Severity 2 and 3 now cover accidents (noticed and undone in one act, versus unnoticed, cancelling work or costly); dependencies are not findings by themselves; extensibility severities defined; duplicates take the higher severity                             | The table only described blocked tasks, so the pilot used severity 3 for Midas touch and for an architectural dependency (desktop panels) with no rule behind either                                                                                                                                       |

## Appendix B: the triage after screening

Date: 2026-10-10. Written by the studio director with the red-team critic.

Screening scored all 43 prototypes on the eight criteria in `criteria.md`. This page picks the
finalists that go on to revision rounds, proposes three hybrids, and says why every other
prototype was dropped and what is worth keeping from it.

**Nothing meets the bar yet.** The bar for "recommended" needs every criterion at 3.5 or more and
coverage and webxr_feasibility at 4 or more. The closest is prototype 28 (Graph Browser, mean
3.81), held back by coverage 3 (no laptop file handoff that works today) and ease_of_use 3. Only
prototypes 35 and 32 reach coverage 4, and only 28 and 30 reach webxr_feasibility 4; no prototype
has both.

### What the finalists have in common, and what holds them all down

Read across the screening reviews, the same five gaps recur in nearly every strong prototype:

1. **Files between the laptop and the headset.** The "files" hard case is unanswered or deferred
   in 28, 30, 25, 29, 42, 27, 38, 37, 34, 43, 24 and most others. Only 35 and 32 specify a paired
   inbox and outbox as part of the design. This alone stops stress journeys 3 and 5 at step 1 and
   holds coverage at 3.
2. **Text.** The note (Florentine step 9) is the worst-counted step in almost every design, and
   the "text" hard case is weak everywhere except 39 (the person's own phone keyboard), 26 and 37.
3. **Dense tables.** 10 to 25 rows a page; weak in most designs.
4. **Long authoring steps.** A weighted batch, a composite score or a two-clause rule costs 11 to
   17 actions in the persona workflows of 30, 32, 41, 42, 26 and 34, which pins efficiency at 2 to
   2.5 even where the Florentine median is good.
5. **ease_of_use is 3 or below for every prototype but 26.** Several patterns to hold in mind,
   wrong-target slips on small targets under hand-ray jitter, and an expert who finds VR and the 2D
   page "roughly equal".

Behind 1 to 3 sits one webxr fact: DOM overlay is AR-only, so every panel-heavy design must build
a whole in-scene UI toolkit (scrolling tables, keyboards with a caret, generated forms), and that
cost is what holds most webxr_feasibility scores at 3.5. The hybrids below aim at these gaps.

### The board

Columns: vr = vr_usability, erg = ergonomics_access, xr = webxr_feasibility, cov = coverage,
ext = extensibility, onb = onboarding, ease = ease_of_use, eff = efficiency. S3 and S4 count
severity 3 and 4 findings. "Fatal" says whether a reviewer named a flaw that cannot be fixed
without abandoning the idea.

| #   | Name                   | Kind     | vr  | erg | xr  | cov | ext | onb | ease | eff | Mean | Min | S3  | S4  | Fatal            | Decision                  |
| --- | ---------------------- | -------- | --- | --- | --- | --- | --- | --- | ---- | --- | ---- | --- | --- | --- | ---------------- | ------------------------- |
| 28  | Graph Browser          | plain    | 4   | 4   | 4   | 3   | 4.5 | 4   | 3    | 4   | 3.81 | 3   | 2   | 0   | no               | finalist                  |
| 35  | Hint Keys              | plain    | 3   | 4   | 3.5 | 4   | 4.5 | 3.5 | 3    | 3.5 | 3.63 | 3   | 5   | 0   | no               | finalist                  |
| 30  | One Question at a Time | plain    | 3.5 | 4   | 4   | 3   | 4   | 4   | 3    | 2.5 | 3.50 | 2.5 | 3   | 0   | no               | finalist                  |
| 25  | Search Everything      | plain    | 3   | 4   | 3.5 | 3.5 | 4   | 3.5 | 3    | 2.5 | 3.38 | 2.5 | 3   | 0   | no               | dropped (parts to hybrid) |
| 29  | Encoding Shelves       | plain    | 3   | 3.5 | 3.5 | 3.5 | 4   | 3.5 | 3    | 3   | 3.38 | 3   | 4   | 0   | no               | finalist                  |
| 32  | Patch Bay              | paradigm | 3.5 | 3   | 3.5 | 4   | 4   | 3.5 | 3    | 2.5 | 3.38 | 2.5 | 6   | 0   | no               | finalist                  |
| 39  | Phone in Hand          | research | 3   | 4   | 3   | 3.5 | 4.5 | 3   | 3    | 3   | 3.38 | 3   | 6   | 0   | no               | finalist                  |
| 41  | Facet Browser          | usage    | 3   | 4   | 3.5 | 3.5 | 4   | 3.5 | 3    | 2.5 | 3.38 | 2.5 | 3   | 0   | no               | finalist                  |
| 42  | Findings Inbox         | usage    | 3.5 | 3.5 | 3.5 | 3   | 4   | 4   | 3    | 2.5 | 3.38 | 2.5 | 3   | 0   | no               | finalist                  |
| 26  | Hotbox                 | plain    | 3   | 3   | 3.5 | 3.5 | 4   | 3.5 | 3.5  | 2   | 3.25 | 2   | 7   | 0   | no               | finalist                  |
| 27  | The Sheet              | plain    | 3.5 | 3   | 3.5 | 3.5 | 4   | 3.5 | 3    | 2   | 3.25 | 2   | 4   | 0   | no               | dropped                   |
| 38  | Prop and Plane         | research | 3   | 3   | 3   | 3   | 4.5 | 3.5 | 3    | 3   | 3.25 | 3   | 7   | 0   | no               | finalist                  |
| 40  | Desk Touch             | plain    | 3   | 3   | 3   | 3.5 | 4   | 3.5 | 3    | 3   | 3.25 | 3   | 9   | 0   | no               | dropped                   |
| 24  | Hand Menu and Windows  | plain    | 3.5 | 3.5 | 3.5 | 2.5 | 4   | 3.5 | 3    | 2   | 3.19 | 2   | 5   | 0   | no               | dropped                   |
| 37  | Zoom Stream            | research | 3.5 | 3.5 | 3.5 | 3   | 3.5 | 3   | 3    | 2.5 | 3.19 | 2.5 | 5   | 0   | no               | dropped                   |
| 34  | Point and Ask          | paradigm | 3   | 3.5 | 3   | 3   | 4   | 3.5 | 2.5  | 2   | 3.06 | 2   | 5   | 0   | no               | finalist                  |
| 43  | Variant Grid           | usage    | 3   | 3.5 | 3.5 | 3   | 4   | 3   | 2.5  | 2   | 3.06 | 2   | 11  | 0   | no               | dropped (parts to hybrid) |
| 31  | Lens Kit               | usage    | 3   | 3   | 3.5 | 2.5 | 3.5 | 3.5 | 3    | 2   | 3.00 | 2   | 4   | 0   | no               | dropped                   |
| 33  | Verb, Count, Scope     | paradigm | 3   | 4   | 3.5 | 3   | 3.5 | 2.5 | 2.5  | 2   | 3.00 | 2   | 9   | 0   | no               | dropped (parts to hybrid) |
| 36  | Focus Remote           | plain    | 3   | 3.5 | 3   | 3   | 4   | 2.5 | 3    | 2   | 3.00 | 2   | 8   | 0   | no               | dropped                   |
| 19  | Show Me                | research | 3   | 4   | 3.5 | 1.5 | 3.5 | 2.5 | 3    | 2   | 2.88 | 1.5 | 15  | 0   | no               | dropped                   |
| 13  | Hand of Cards          | metaphor | 3   | 3   | 3.5 | 1.5 | 3.5 | 3   | 2.5  | 2.5 | 2.81 | 1.5 | 15  | 0   | no               | dropped (parts to hybrid) |
| 11  | Context Menus          | plain    | 3   | 3   | 2.5 | 2   | 4   | 3   | 2.5  | 2   | 2.75 | 2   | 22  | 0   | no               | dropped                   |
| 23  | Cutting Room           | metaphor | 3   | 3.5 | 3   | 2   | 3.5 | 2.5 | 2.5  | 2   | 2.75 | 2   | 20  | 0   | no               | finalist                  |
| 16  | Proofreader's Slate    | metaphor | 3   | 3.5 | 3   | 1.5 | 3.5 | 2   | 2.5  | 2   | 2.63 | 1.5 | 14  | 0   | no (stylus risk) | dropped (parts to hybrid) |
| 18  | Linked Views           | research | 3   | 3   | 3   | 2   | 2.5 | 2.5 | 3    | 2   | 2.63 | 2   | 18  | 0   | no               | dropped (parts to hybrid) |
| 21  | Mixing Desk            | metaphor | 3   | 3   | 3.5 | 1.5 | 3   | 2.5 | 2.5  | 2   | 2.63 | 1.5 | 20  | 0   | no               | dropped                   |
| 5   | Workbench              | plain    | 2.5 | 3.5 | 2   | 2   | 3.5 | 2   | 2.5  | 2   | 2.50 | 2   | 14  | 0   | no               | dropped                   |
| 12  | Lean In                | paradigm | 3   | 2.5 | 3.5 | 1.5 | 2.5 | 2.5 | 2.5  | 2   | 2.50 | 1.5 | 21  | 0   | no (close)       | dropped                   |
| 14  | Voodoo Dolls           | metaphor | 3   | 3   | 3   | 1.5 | 3   | 2   | 2.5  | 2   | 2.50 | 1.5 | 15  | 0   | no               | dropped                   |
| 22  | Command Card           | metaphor | 3   | 3   | 3   | 1.5 | 2.5 | 2.5 | 2.5  | 2   | 2.50 | 1.5 | 21  | 0   | no               | dropped                   |
| 10  | HUD                    | metaphor | 2.5 | 3   | 2.5 | 1.5 | 3   | 2.5 | 2.5  | 2   | 2.44 | 1.5 | 26  | 0   | no               | dropped                   |
| 15  | Physics Lab            | metaphor | 2.5 | 3   | 3   | 1.5 | 2.5 | 2.5 | 2    | 2   | 2.38 | 1.5 | 24  | 0   | no (close)       | dropped                   |
| 20  | Pilot and Navigator    | usage    | 3   | 2   | 3   | 1.5 | 3   | 2.5 | 2    | 2   | 2.38 | 1.5 | 18  | 2   | yes              | dropped                   |
| 17  | Orbits                 | research | 2.5 | 2.5 | 2.5 | 1.5 | 3   | 2.5 | 2    | 2   | 2.31 | 1.5 | 20  | 0   | no (close)       | dropped                   |
| 3   | Gesture Grammar        | paradigm | 2.5 | 2.5 | 2.5 | 1.5 | 2   | 2.5 | 2.5  | 2   | 2.25 | 1.5 | 22  | 1   | yes              | dropped                   |
| 4   | Tool Belt              | metaphor | 2.5 | 2.5 | 2.5 | 1   | 2.5 | 1.5 | 2.5  | 2   | 2.13 | 1   | 27  | 1   | yes              | dropped                   |
| 1   | Palette Hand           | metaphor | 2.5 | 2.5 | 2.5 | 1   | 2   | 2.5 | 1.5  | 2   | 2.06 | 1   | 21  | 0   | no               | dropped                   |
| 6   | Workshop               | metaphor | 2.5 | 2   | 2   | 1   | 2   | 2   | 2.5  | 2   | 2.00 | 1   | 22  | 1   | yes              | dropped                   |
| 7   | Hand Signs             | paradigm | 2   | 2   | 2.5 | 1   | 2   | 2   | 2    | 2   | 1.94 | 1   | 21  | 1   | yes              | dropped                   |
| 9   | Spellcasting           | metaphor | 2   | 2   | 2.5 | 1   | 2   | 1.5 | 2    | 2   | 1.88 | 1   | 21  | 2   | yes              | dropped                   |
| 2   | Point and Say          | plain    | 2.5 | 2   | 2   | 1   | 2.5 | 1.5 | 2    | 1   | 1.81 | 1   | 16  | 3   | yes              | dropped                   |
| 8   | Grip and Tool          | metaphor | 2   | 2   | 2   | 1   | 2   | 1.5 | 1.5  | 2   | 1.75 | 1   | 20  | 3   | yes              | dropped                   |

### The finalists (12)

They span every kind (5 plain, 2 paradigm, 2 research, 2 usage, 1 metaphor), twelve different mode
models, and every input type: hand ray, controllers, Vision Pro look-and-pinch, a touch screen and
optional voice. Prototypes 28 and 30 work fully with hands alone and no voice.

| #   | Name                   | Kind                | Mode model                                       | Why it goes forward                                                                                                                                                                                                       | Lowest criterion, and the revision that would raise it most                                                                                                                                |
| --- | ---------------------- | ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 28  | Graph Browser          | plain (combination) | always on one object's page; labeled verbs       | Highest mean (3.81), no criterion below 3, the best feedforward-by-count and the clearest descriptor-only path for a new object type. Closest to the bar                                                                  | coverage 3: specify a laptop file handoff that works today as the design's path (pairing code plus relay), and give split tabs their own view-only filter for the two-condition comparison |
| 35  | Hint Keys              | plain (combination) | see it, say or type its tag                      | One of only two at coverage 4, with all of files, tables and comparing answered; tags make dense selection a reading task, not a pointing one                                                                             | vr_usability and ease_of_use 3: drop the finger-segment keypad as a core channel (a classifier the thumb occludes) and keep it optional behind the pinchable labeled controls              |
| 30  | One Question at a Time | plain               | goal, then a slot-filling interview              | webxr_feasibility 4 with only standard select events; the safest first session (Check card, change any answer and re-run); best on Vision Pro                                                                             | efficiency 2.5: add a "fill all from last time" and a one-card expert form, so a known task is not 7 to 12 questions                                                                       |
| 29  | Encoding Shelves       | plain               | pill to role shelf                               | Only shelf-based design; the whole view state is visible as pills, refusals explain themselves, and every drag has a two-tap equivalent for Vision Pro and tremor                                                         | efficiency, ease_of_use 3: put the most common roles (Color, Size, Filter) one tap from any object, not a drag across the panel                                                            |
| 32  | Patch Bay              | paradigm            | live dataflow; plugging a cable is the command   | The other coverage 4, with files answered by a specified pairing; the patch is a reproducible recipe; typed ports give feedforward                                                                                        | ergonomics 3 and efficiency 2.5: raise the board to the reading zone and add whole-box presets so a weighted batch is not 17 acts                                                          |
| 39  | Phone in Hand          | research            | point at the graph, touch the phone              | The only design that answers text with a real keyboard and caret; every 2D panel arrives by construction (extensibility 4.5)                                                                                              | webxr_feasibility 3: replace per-frame DOM mirroring with a small set of phone-side widgets reported as data, and specify the signaling service as part of the design                      |
| 41  | Facet Browser          | usage               | one live query with a role switch                | Best answer to dense selection without pointing: select by value, range and relation with a count on every next step; plugin metrics become facets for free                                                               | efficiency 2.5: let a typed id fill a relational slot in one act (the 11-act route) and fix the per-condition computation the coverage review found wrong                                  |
| 42  | Findings Inbox         | usage               | triage                                           | Unique working model; machine findings never change the project until acted on; every change carries its source, which makes history and the methods section readable                                                     | coverage 3: specify a file handoff and a dig sheet that reaches tables and forms, not just the card's four acts                                                                            |
| 26  | Hotbox                 | plain               | object, then one held button shows every command | The controller-first finalist and the only ease_of_use 3.5; best repeat path (Repeat last, recipes) for weekly analysis                                                                                                   | efficiency 2: give compound rules and composite scores a form opened from the option box instead of 13 to 15 hotbox trips                                                                  |
| 38  | Prop and Plane         | research            | two stances of one held plate                    | No criterion below 3; the only real disambiguation step for picking one node in a dense 3D graph; comparing two runs by sliding the plate                                                                                 | webxr_feasibility 3 on hands: reduce the hand poses to two distinct ones (pinch and flat hand) and make controllers the primary mapping                                                    |
| 34  | Point and Ask          | paradigm            | request, preview as editable tiles, commit       | The only language-model design and the most honest speech feedforward (the model never fills a number, name or id); keeps the voice-optional input in the set, with a full hand path                                      | ease_of_use 2.5 and webxr 3: make the typed field (no model) the first-class path on Vision Pro, where pointing while speaking cannot work                                                 |
| 23  | Cutting Room           | metaphor            | edit the history, not the state                  | Best metaphor, and the only history-editing mode model: fix an old step in place, with a ripple bar counting what will replay and break. That is the best answer to "undo a change 8 steps back and keep the 7 good ones" | coverage 2: add a find-by-id and an export path, and a clip drawer generated from descriptors so every area has a clip                                                                     |

### Hybrids (3)

Each is a new prototype, reviewed to the same bar as the finalists.

#### Hybrid A: Paired Browser

- **Combines:** 28 (pages, address bar, generated forms, Back kept apart from Undo), 35 and 32 (an
  inbox and outbox paired by a six-digit code, specified as part of the design), 39 (the person's
  phone as an optional touch slab with a real keyboard, lift-to-commit and a mirrored highlight),
  18 (a linked sorted table and histogram as the reader for wide tables).
- **Idea:** 28's browser stays the complete in-headset surface. The laptop's 2D graphty page,
  paired once by a code, holds a folder grant and lists its files to the headset's Inbox, so a CSV
  on the laptop is picked from inside the headset; Save to laptop writes back to the same folder.
  A paired phone, when present, takes text fields (notes, ids, API keys) and wide tables; when
  absent, the in-scene keyboard and paged tables of 28 remain.
- **Why:** files, text and dense tables are the three hard cases that hold almost every finalist
  at coverage 3, and each finalist answers at most one of them. Fixing all three on the
  highest-scoring base is the shortest path to coverage 4 and the bar.

#### Hybrid B: Editable Record

- **Combines:** 25 (every command is one sentence of typed slots with a preview line of counts and
  cost), 23 (fix an old step in place, with a ripple bar counting replays and breaks), 13 (pinch a
  step to light everything that depends on it; lift it to remove only that), 16 (strike a step and
  restore it; bracket steps into a recipe), 30 (Check card before commit; change one answer and
  re-run), 42 (each change carries the source that caused it).
- **Idea:** one record of sentences is the history, the recipe and the undo. Every act, whatever
  surface issued it, lands as a sentence; any old sentence's slot can be edited in place with its
  replay previewed; a bracket of sentences becomes a recipe whose slots refill next week.
- **Why:** the history hardest case is weak in 28 and absent in most finalists, re-running with
  one changed option and editing a rule a week later are long in all of them, and the weekly
  repeat that keeps experts in VR has no cheap path outside 26 and 32.

#### Hybrid C: Fast Ring over Pages

- **Combines:** 3 and 33 (an object-first ring of the object's own verbs: a beginner holds and
  reads, an expert flicks; Repeat on a new target), 26 (target named at the center; Repeat last;
  release on the option box opens the full form), 43 and 41 (counted outcome choices, with the
  current state as one choice), 24 and 35 (a magnified "which one?" list and printed tags for
  dense picks), 3 (pull a node for hops with a live count), 28 (the object's page as the "More"
  fallback that reaches everything).
- **Idea:** two speeds on one object-then-verb pattern. The ring makes common acts one or two
  actions with a count on every choice; the page behind it keeps full coverage. Hands alone, no
  voice, arms low.
- **Why:** ease_of_use is 3 or below for eleven of the twelve finalists, and efficiency 2 to 2.5
  for seven, because the complete surfaces that win coverage are slow for experts and the fast
  surfaces lose coverage. This hybrid tests whether one pattern can be both.

### Dropped prototypes

| #   | Name                  | Why dropped                                                                                         | Worth keeping                                                                                                  |
| --- | --------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Palette Hand          | Coverage 1 and ease_of_use 1.5; a four-face palette has no room for forms, tables or lists          | The Selection face that always shows the selection's verbs; tear-off cards                                     |
| 2   | Point and Say         | Fatal: voice is the only command path, so Quest Browser and anyone not speaking reach 0 of 22 areas | The chip sentence: fix one wrong word by poking its chip; a number chip doubles as a dial (to hybrid B)        |
| 3   | Gesture Grammar       | Fatal: no panels means no place for tables, forms and lists                                         | Object-first marking menu with a half-second reveal; pull-for-hops with a live "1 hop: 6" (to hybrid C)        |
| 4   | Tool Belt             | Fatal: the eight-slot belt is already full                                                          | The Sieve's preview-then-confirm filter; the Probe that reads a node or a result the same way                  |
| 5   | Workbench             | Coverage 2 and webxr 2 (relies on a Bluetooth keyboard "to be checked"); 28 does its job better     | Outline plus generated inspector; compound rules as an editable AND/OR list                                    |
| 6   | Workshop              | Fatal: the fixed pegboard needs twice the tools it holds                                            | Analysis state as objects on rails (sieves whose order is the rule, history receipts)                          |
| 7   | Hand Signs            | Fatal: the mode is a held pose that tracks well only where it tires the arm                         | The sign hint at the off hand; thumbs-down undo that names the step                                            |
| 8   | Grip and Tool         | Fatal: closed set of eight grips, no path for people who cannot form them                           | Attribute tags that load into any tool, generated from result fields                                           |
| 9   | Spellcasting          | Fatal: memorized glyphs cannot be discovered and cannot grow                                        | Scope set by the size of a drawn ring, with a live preview before the cast                                     |
| 10  | HUD                   | Coverage 1.5, 26 severity 3 findings; it lacks surfaces, not structure                              | The reticle name tag ("Strozzi 0.088, #3") before any act; lock-to-scope                                       |
| 11  | Context Menus         | Coverage 2, webxr 2.5, 22 severity 3; 24 and 28 carry the same object-then-menu idea further        | Controller vocabulary (trigger chooses, A opens the object's menu, B backs out)                                |
| 12  | Lean In               | Coverage 1.5, extensibility 2.5; hand distance as the mode cannot carry panel-shaped work           | Handles that show a count before release; drag back past the rest notch to cancel                              |
| 13  | Hand of Cards         | Coverage 1.5, 15 severity 3; 23 is the stronger history-centered metaphor                           | Per-object undo that lights its blast radius before the lift (to hybrid B)                                     |
| 14  | Voodoo Dolls          | Coverage 1.5, onboarding 2                                                                          | Two touching dolls show only the verbs that fit that pair: the two-input question as one act                   |
| 15  | Physics Lab           | Coverage 1.5; past a few hundred nodes its feedback and selection stop working                      | A well's rim reading "0.070 -- 5 kept" with the nearest item below it                                          |
| 16  | Proofreader's Slate   | Coverage 1.5, onboarding 2; fingertip ink on two of three headsets is unproven                      | Strike, stet and bracket a numbered step list as history and recipe (to hybrid B)                              |
| 17  | Orbits                | Coverage 1.5; eye pursuit is not readable by a web page on any headset, leaving head-only control   | Nothing changes until an explicit confirm, with the change previewed live                                      |
| 18  | Linked Views          | Coverage 2, extensibility 2.5                                                                       | A linked sorted table and histogram for thresholds, top N and the second input of a path (to hybrid A)         |
| 19  | Show Me               | Coverage 1.5, 15 severity 3; demonstration covers ranking and filters but little else               | The pending guess with a count and named borderline cases; correction by counter-example                       |
| 20  | Pilot and Navigator   | Fatal: every command needs two people                                                               | The joint-hold ghost that names the target and counts the effect before commit                                 |
| 21  | Mixing Desk           | Coverage 1.5, 20 severity 3                                                                         | The cue bus that previews any strip before it reaches the graph; re-seedable live chains                       |
| 22  | Command Card          | Coverage 1.5, extensibility 2.5; the fixed grid runs out of room                                    | Cancel last at a body landmark that names its target; stored groups as path targets                            |
| 24  | Hand Menu and Windows | Coverage 2.5; repeats the platform-default idea that 28 carries further                             | Unknown option kinds labeled "Set this on the 2D page" instead of dropped; the "which one?" list (to hybrid C) |
| 25  | Search Everything     | Repeats 28's address-bar palette and 35's echo as its core, at a lower score                        | The command sentence with typed slots and a preview line of counts and cost (to hybrid B)                      |
| 27  | The Sheet             | Efficiency 2; overlaps 29 (both drive the view from a data pane) at a lower score                   | The detent histogram filter with "keeps 5 of 16; next below: Ridolfi 0.069"                                    |
| 31  | Lens Kit              | Coverage 2.5; whole-graph lens previews threaten frame rate                                         | The two-count readout (inside now / if spread)                                                                 |
| 33  | Verb, Count, Scope    | Onboarding and ease_of_use 2.5: a grammar to learn; its strengths fit better as a fast layer        | Target-first verb ring and Repeat on a new target (to hybrid C)                                                |
| 36  | Focus Remote          | Onboarding 2.5, efficiency 2, webxr 3 on hands                                                      | Discrete focus with no pointing; the status strip naming focus and next input; decade-then-mantissa wheels     |
| 37  | Zoom Stream           | Efficiency 2.5; files unanswered; 30 covers the safe-commit niche with a better webxr score         | The slow-crossing Go box that states what will change; Dasher text on every headset with no keyboard           |
| 40  | Desk Touch            | webxr 3 (an untested contact classifier on an uninstrumented table), 9 severity 3                   | The real table edge as a detented rail with magnifier, live counts and typed value; Undo at a fixed corner     |
| 43  | Variant Grid          | 11 severity 3; rendering every tile as a live whole-graph variant is beyond graphty-element today   | Counted outcome tiles with the current state as one choice (to hybrid C)                                       |

## Appendix C: the judges' rankings

### Judge 1: the product lead's ranking of the finalists

Judge: a product lead who must ship a VR mode for graphty within two quarters with a small team.
Weighted most: webxr_feasibility, coverage and onboarding. Read: the criteria, the triage, the 15
finalist prototype files and their latest-round reviews (round 3 for 23, 26, 32, 35, 41, 42, 45;
round 2 for the rest), including each round's red-team critique.

#### The verdict first

**No finalist meets the studio's bar for "recommended".** The bar needs every criterion at 3.5
or above, coverage and webxr_feasibility at 4 or above, and no open severity 4. Every finalist
fails it, almost always on efficiency or ease_of_use. The closest is **Paired Browser (44)**: mean
3.94, lowest criterion 3.5, no severity 3 or 4 finding from the panel. Only webxr_feasibility at
3.5 keeps it off the bar. The WebXR reviewer says why. The design without a paired laptop or
phone already sits at the 4 anchor on all three headsets. The half point is lost to technical
claims added in round 2 that a browser cannot honor as written: a second projection layer on
Quest, and a wake lock held by a laptop page in a background tab. Deleting those claims and
stating the fallbacks the file already has would reach the bar on paper. It would not change a
single control.

Four facts about today's code shape the ranking more than the score table does.

- **No design can use the DOM.** DOM overlay works only in AR, and these prototypes run in full
  VR. So every panel-heavy design has to build an in-scene UI toolkit: text, scrolling lists,
  generated forms and a keyboard with a caret. This is the largest item in any build, and the
  designs that share one toolkit compound.
- **Vision Pro is unsupported today.** graphty-element's XR input (`cameras/XRInputHandler.ts`)
  picks with `scene.pickWithRay` and has no transient-pointer path. Whatever ships needs that
  added first, and the designs built only on the select lifecycle (press, hold, drag, release)
  need nothing more on Vision Pro.
- **The element already has what generated surfaces need.** It has option descriptors, a
  per-command `GraphSession.estimate()` cost, a command journal and a per-instance color buffer.
  A design that generates its surfaces from descriptors and its previews from `estimate()` starts
  half built. A design that needs a new engine (a typed dataflow runtime, a replay engine with
  state diffs, a facet engine, a language compiler) starts at zero.
- **Every design that solves laptop files needs a relay.** graphty.app is a static site, so a
  pairing relay is a new service to run. The designs that work unpaired and treat pairing as an
  add-on can ship before the relay exists. The designs whose coverage depends on it cannot.

#### Ranking, most to least worth building

##### 1. Paired Browser (44) -- build it

It holds the highest mean in the studio (3.94), the highest lowest criterion (3.5), and two of the
three criteria I weigh most at 4.5: coverage (22 of 22 areas by the reviewer, 20 by the red team,
either way above the 4 anchor) and onboarding (Elena finishes unaided, and the two scares that
would make her quit are now answered where they happen: "nothing changed; Fold or Back to see
all" at step 4, and "Back does not undo" at step 10). It is the only design that answers files,
text and wide tables together, and it does so additively. The pairing, the phone keyboard and the
wide sheet each sit on top of a browser that works without them, so the first release does not
wait on a relay. Every core act is a standard select event: release, a timed hold, a drag or two
hands. The person never needs gaze, a gesture classifier or speech. Its open risks are real but
bounded:

- the in-scene hypertext toolkit;
- a relay service;
- two claims to delete (the second projection layer and the background wake lock);
- the red team's severity 3, where the single project home plus the Outbox loses work without
  saying so (to be fixed before the pairing ships);
- the first-keystroke race in the typing pause.

**First spike:** the reader panel as an in-scene texture panel on Quest 3 hands and on Vision
Pro's transient pointer. It needs one page, one generated form with a stepper and an attribute
list, Back and the named Undo, at 1,000 and 10,000 nodes. That tests the toolkit and the frame
budget together.

##### 2. Graph Browser (28) -- build it, as Paired Browser's first milestone, not on its own

Graph Browser is Paired Browser without the pairing, the phone and the linked table reader, and
that is exactly why it matters. Its webxr_feasibility is a clean 4 (one ray, one select, a hold,
a drag, two selects), and its onboarding is 4. It ships with no relay and no phone. As a design
of its own it is weaker. Coverage is only 4: the red team counts 16 areas once the relay that
does not exist yet is removed. ease_of_use is 3 and efficiency 2.5: writing the threat-hunting
rule took about 14 acts, and triaging 38 matches took about 210 with no mark-and-next. The red
team also found a severity 3: a replayed recipe runs on the wrong time window without saying so.
Three things from round 2 must be undone before it ships:

- the palm-away pose gate and the 120 ms aim settle, which drop a first-timer's pinch with no
  message;
- the drag inside the graph that now turns it, so a region box can no longer start there;
- Back, Forward and Home moved to the panel edge that a large graph covers.

I list it second because it is the quarter-1 deliverable, not a second product.

##### 3. Hint Keys (35) -- build its tag layer on the same panels

Hint Keys earns its place by doing something the browser does not: it makes picking one node in a
dense graph a reading task instead of a pointing task. A two-letter tag at a constant angular size
(about 2 degrees) sits on every node, row, bar, layer and history step, and any standard select
hits it on any headset with no hover and no recognizer. Coverage is 4.5 (21 of 22 areas),
webxr_feasibility and onboarding are 4, and no severity 3 finding from the panel remains after
three rounds. What I would not build is its accelerators: the finger-segment keypad (a classifier
whose pose hides the fingers it reads), the Vosk phrase grammar (which cannot widen mid-utterance)
and the T9 engine. The core path -- tags, the bar at the current object, named Enter, Undo -- is
complete without them, and the WebXR review walked steps 3 to 5 on Vision Pro with nothing else.
Efficiency 2.5 and the red team's severity 3 stand: a pick run silently replaces the selection
when what it picked was runs, sets or history steps rather than nodes. Both argue for using tags
as an addressing layer over Paired Browser's pages, not as a second command system.

##### 4. Facet Browser (41) -- the best analysis model, but it starts with an engine

It is the only finalist at 4 on vr_usability, webxr_feasibility, coverage and onboarding at once.
Its input set is the most portable in the studio (a ray, select, hold, drag, two selects, with no
pose classifier and no gaze). Selecting by value and by relation with a count on every next step
answers dense selection without pointing at all. For me the catch is cost and scope. Under this
repository's rules, the facet engine is graph computation that belongs in graphty-element. It
needs per-value counts that leave out a facet's own chips, membership masks, k-hop and
route facets over the whole graph, and stored scopes with drift on reopen. The WebXR reviewer
calls it the largest single build item, and the file names only the highlight channel. Two
severity 3 findings remain, and it has stopped after three rounds, so they are permanent:

- a result that is a table, such as link prediction's scored pairs, has nowhere to land;
- route, flow and cut lookups are never recorded, so a published methods section misses the
  computation behind the finding.

Efficiency is 2.5. Worth building after the browser ships, as a facet page type plus element-side
facets that the 2D app gets too.

##### 5. One Question at a Time (30) -- the cheapest correct input model, with a coverage hole

This is the most browser-friendly scheme in the studio. Press previews, release chooses, and
sliding off cancels. All of it is the select lifecycle, so Vision Pro's transient pointer, which
has no hover, behaves like a hovering ray by construction. Onboarding is 4.5. But coverage is 3,
the one criterion I cannot ship below 4. A file on the laptop never reaches the headset (the
paired laptop's picker is on a screen the person cannot see, and leaving VR sees only the
headset's files), and the red team shows that the relay the file credits for outbound files is
deferred, not specified. The red team also found a severity 3 that triage missed: while "The ones
I point at" is open, a short turn that starts on a node toggles it, and the Check card shows only
a count. I would not build it as the product. I would take its press-preview and release-choose
rule and its per-task Check card into Paired Browser's forms, which already activate on release.

##### 6. Hotbox (26) -- the controller-first option, with a first-use trap

It has 4 on webxr_feasibility, coverage and onboarding, no severity 3 finding in its last round,
and an ease_of_use of 3.5, which only two other finalists reach. The reason is the best repeat
path in the studio: Repeat last and Again on a new target, plus recipes. On controllers it is excellent.
On hands it has two problems that matter to a product lead:

- The onboarding and red-team reviews both call this "near certain": the first time Elena opens
  the hotbox at eye level from a hand at rest, relative steering throws the cursor 1.5 times past
  the band into a corner, and her pinch runs Find, or Undo of her last step. A wrong command on
  first contact with the core surface is how a "fear of breaking things" persona quits.
- On Vision Pro without the hand-tracking permission, the release kick can move the lit row,
  which breaks the design's own rule "the item that runs is the item that was lit".

Twelve fixed headers with one free row each in Data, Analyze and Layout will also need a regroup
when the roadmap adds its next algorithm family.

##### 7. Findings Inbox (42) -- a strong idea that belongs on top of something else

Coverage is 4.5, webxr_feasibility and onboarding are 4, and the triage flick is precisely
specified on standard events on every headset. The machine-first model is genuinely new: findings
never change the graph until filed. But efficiency is 2, the lowest of the finalists I would
consider, and the design needs an automatic-analysis pipeline in a worker plus the whole hand-menu
and window base of an earlier prototype. Two severity 3 findings stand. The expert's: no case
boundary, so one alert's filters shape the next. The red team's: a value cited in a note never
counts as "used", so the inbox-clearing flick can delete the run behind a published number. I
would ship it later as an "Insights" page inside the browser, not as the control model.

##### 8. Encoding Shelves (29) -- coverage without feasibility yet

Coverage and extensibility are both 4.5, and onboarding is 4. Every drag has a two-tap equivalent,
and every change is a named pill on a named shelf. Its webxr_feasibility is 3.5 because of a
severity 3 on the weakest headset's core tap: the stray-tap filters (a resting-hand pose test and
a 150 ms steady aim) swallow an ordinary Vision Pro look-and-pinch. The reviewer says one line
fixes it. The red team found a second severity 3: a set kept from a community renumbers silently
when that community is re-run. About 18 shelves on one panel is also a lot for a first-timer, and
the file accepts that as a known risk. Its commit model (nothing changes but a pill on a named
shelf) is worth borrowing; the surface is not the one to build first.

##### 9. Editable Record (45) -- the right idea for history, two quarters too early

The typed-slot sentence as command, history, undo and recipe is the cleanest answer to "undo step
8 and keep the 7 after it", and its arm-load rules are the floor every design should start from.
But webxr_feasibility is 3.5 and ease_of_use 2.5. Swapping in a finished replay is main-thread
work outside the frame budget, a synchronous plugin cannot be sliced as the file claims, and text
legibility without quad layers is unstated. After three rounds, the red team's severity 3 is
permanent: "Keep both" by default puts edited chains out of record order, so the methods
paragraph and the recipe silently misdescribe the analysis. The dependency-tracked journal is
element work worth doing on its own schedule, not inside this deadline.

##### 10. Cutting Room (23) -- the best metaphor, gated on months of element work

From coverage 2 to 4 in one round, by generating every object's verb row from the command
catalog, is the strongest proof in the studio that descriptors pay. "Pressing only looks, a verb
acts" is also excellent onboarding. But webxr_feasibility has been 3 for three rounds for one
reason the file now states honestly. Branches, the diff lane, Show both and fixing an old clip all
need a replay engine with cached state and state diffs, which the WebXR reviewer puts at months of
graphty-element work. The red team's two silent re-binding failures (community 7 on new data;
"Re-measure here" recoloring from a 30-node subset) land on the exact promise the timeline makes.

##### 11. Patch Bay (32) -- excellent on paper, not a two-quarter build

Coverage 4.5 and onboarding 4.5, with every journey step reachable from the work strip without
opening the board. But webxr_feasibility is 3. It needs a typed dataflow runtime (caching,
staleness, a run log, review steps, recipe sheets), a 3D node editor and a second in-scene panel
system, and the file itself says "no revision removes this". The red team also found that the
seated default puts a resting hand in the board's touch zone. That hand then has no ray, so on
Vision Pro a look-and-pinch at Medici from the armrest does nothing at step 3, with no message.

##### 12. Phone in Hand (39) -- real glass, too many owners of the phone

It has the best text answer in the studio, a lit-before-lift keyboard on the person's own phone,
and coverage 4.5. But onboarding is 3. Elena unlocks the phone by passcode in passthrough, grants
motion permission, is asked to set a focus mode in Control Center, and then the first Dictate
raises a microphone prompt she cannot see. The panel left five severity 3 findings open. Two are
that on Vision Pro, reading the ray-tip label starts a node move and pins the node, and that the
phone's own home and back gestures sit under its most-used targets. The red team's point stands:
the phone browser owns gestures, alerts and chrome, so a web page cannot promise what this file
promises. Paired Browser already carries the phone keyboard as an optional extra, which is the
right size for it.

##### 13. Fast Ring over Pages (46) -- an expert layer, not a product

webxr_feasibility is 4 and the scope rule is right: scope comes from a labeled chip, never from
where a pinch lands. But coverage is 3, because the file defers the relay and so laptop files fall
to the headset's own picker. Five severity 3 findings remain. Head aim moves the load onto the
neck and breaks Tags, and the prescribed resting posture blocks the ring's three lower arms. On
day one the counted outcomes that teach the ring ("keeps 5 of 16") are absent until
graphty-element gains a preview overlay and a dry-run count. A six-verb ring over Paired
Browser's pages is a good later addition for experts. It is not the first thing to build.

##### 14. Point and Ask (34) -- voice-optional in name, voice-shaped in cost

Its target tray and slot tiles are the most honest speech feedforward in the studio. But it scores
3.5 on webxr_feasibility and coverage. The file says outright that laptop files are "not solved by
this design", and it adds a hand-written language compiler on top of another prototype's whole
in-scene UI. New projects start Local only, and no headset is confirmed to have an on-device
recognizer, so the real first session on every headset is typing requests on an in-scene
keyboard. The red team's privacy severity 3 is disqualifying for the confidential personas it
targets: recipes, rail templates and speech hints carry one case's data into another.

##### 15. Prop and Plane (38) -- the best dense-pick idea, the weakest overall

It has the lowest mean of the finalists (3.31), coverage 3.5 with inbound laptop files
unanswered, and four severity 3 findings. Its best features need four new renderer capabilities:
a slab-plane uniform in every material, a highlight mask, stacked copies with shared positions,
and laying out along an attribute. The stack budget is about four times what graphty-element
draws today and leaves edges out. The plate's slab picker and the off-hand prop are worth keeping
as parts, but not as a product built on this deadline.

#### What I would implement, in order

1. **Paired Browser (44), shipped first as the Graph Browser core (28).** Quarter 1: the
   transient-pointer path in graphty-element's XR input, the in-scene panel toolkit, pages and
   generated forms from the existing descriptors, Back kept apart from a named Undo, previews
   driven by `GraphSession.estimate()`, and the in-panel keyboard. This alone is at the 4 anchor
   on all three headsets with no relay. The three round-2 regressions in Graph Browser get
   reverted (pose gate, the drag that turns, chrome on the covered edge). Biggest risk: the
   toolkit's size and the frame budget at 10,000 nodes. First spike: the texture-panel page and
   form on Quest hands and Vision Pro.
2. **Paired Browser's pairing (44), quarter 2.** The six-digit pairing, the laptop folder in the
   Inbox, Save to laptop, and the lent laptop keyboard, with the two unbuildable claims deleted
   and the home-and-Outbox data loss fixed first. This is the step that lifts coverage from 4 to
   4.5 and answers files and text. Biggest risk: running a relay for a static site, and how it
   behaves when the laptop sleeps. First spike: a WebRTC data channel between Quest Browser and a
   laptop Chrome tab through a minimal signaling relay, moving a 20 MB CSV mid-session.
3. **Hint Keys' tag layer (35) on the same panels, quarter 2 if the team has room, otherwise
   first after ship.** Tags on nodes, rows and history steps plus the bar's named Enter, with no
   finger keypad and no voice. It fixes dense selection on every headset with a plain select.
   Biggest risk: the pick run replacing the selection with things that are not nodes. Keep tags
   as addressing only, so each tag opens its object's page and never becomes a second command
   grammar. First spike: label rendering for 2,000 tags at constant angular size on Quest 3.
4. **Facet Browser's facets (41), after ship.** Start in graphty-element (per-value counts, masks,
   relational facets), so the 2D app gets them too. Then add a facet page type to the browser.
   Biggest risk: results shaped as tables, which have no facet. First spike: per-value counts
   with the facet's own chips left out, recomputed under 16 ms for 10,000 nodes in a worker.

Paired Browser (a hybrid) and Hint Keys (a plain combination) are both panels of labeled controls
over the same generated pages. That is deliberate: within two quarters,
diversity is worth less to me than one toolkit shared by everything that ships. The other kinds
stay in the studio's "worth a mock" and "source of parts" tiers:

- the history editing of Cutting Room and Editable Record;
- the dataflow of Patch Bay;
- the triage of Findings Inbox;
- the plate of Prop and Plane.

### Judge 2: which XR control prototypes are worth building

Judged as a working analyst who would spend hours a week in the headset. What counts: how easy it
is, how few acts the work takes, whether an hour is comfortable, and whether every feature can be
reached without taking the headset off. The sources are each finalist's prototype file, its latest
round of reviews (all seven lenses, including the red-team review), the studio criteria and the
triage. Scores quoted are the final-round means.

#### Verdict

No finalist meets the studio's bar for "recommended". The bar needs every criterion at 3.5 or more,
and coverage and webxr_feasibility at 4 or more.

- **Closest: prototype 44 (Paired Browser)**, mean 3.94 and lowest score 3.5. It is the only
  finalist with ease_of_use and efficiency both at 3.5.
    - Its webxr_feasibility is 3.5, not 4: the Quest compositing path for the panel is unproven, and
      several laptop and network claims cannot be built as written.
    - Its red-team review found one open severity 3 that the six lenses missed: the Outbox can
      silently overwrite newer work saved on the laptop.
- **The shared ceiling is efficiency.** Only three designs keep every step of their persona
  workflow at 10 acts or fewer: 44, 30 (One Question at a Time) and 23 (Cutting Room). Everywhere
  else, the work that repeats -- triaging matches, enriching 15 clusters, merging 40 duplicate
  pairs, running five scenarios -- is hand-repeated at 5 to 16 acts a time.
- **The shared failure is publishing.** In almost every finalist, the red-team walk of stress
  journey 6 (publish the analysis) found a severity 3. Typical cases: a recipe, set or note
  silently re-binds to a different group on new data, or an export carries a scope the person did
  not choose. No lens reviewer walked that journey.

My build order below is therefore conditional: each item starts with a spike that must clear the
blocker named for it.

#### Ranking, most to least worth building

| Rank | Prototype                 | Final mean / lowest | One line                                                                               |
| ---- | ------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| 1    | 44 Paired Browser         | 3.94 / 3.5          | Everything reachable from a seat, with real keys and real files; build it              |
| 2    | 28 Graph Browser          | 3.69 / 2.5          | 44 without the pairing; build it as 44's first milestone, not on its own               |
| 3    | 26 Hotbox                 | 3.69 / 2.5          | The fastest expert path on controllers, with real repeat; build it as the fast layer   |
| 4    | 23 Cutting Room           | 3.63 / 3.0          | The best weekly repeat, but it needs a replay engine graphty-element does not have     |
| 5    | 30 One Question at a Time | 3.75 / 3.0          | The safest and calmest, but slow for daily work, and laptop files cannot come in       |
| 6    | 41 Facet Browser          | 3.75 / 2.5          | Comfortable selection by value; it cannot hold table-shaped results                    |
| 7    | 35 Hint Keys              | 3.75 / 2.5          | Tags solve dense picking; too much to memorize for the rest                            |
| 8    | 29 Encoding Shelves       | 3.69 / 2.5          | Every visible choice is a pill; every act is a carry, and kept sets drift              |
| 9    | 32 Patch Bay              | 3.69 / 2.5          | Reproducible wiring, heavy to build, the board sits below the seat                     |
| 10   | 42 Findings Inbox         | 3.69 / 2.0          | A distinctive triage model with the lowest efficiency in the set                       |
| 11   | 45 Editable Record        | 3.56 / 2.5          | Undo one old merge in 4 acts; the hardest expert experience in the set                 |
| 12   | 46 Fast Ring over Pages   | 3.44 / 3.0          | The right idea (a fast ring over pages) with the wrong aim (the head)                  |
| 13   | 34 Point and Ask          | 3.50 / 2.5          | Language turns a 23-act pattern into 8, but on Quest with private data it has no voice |
| 14   | 39 Phone in Hand          | 3.56 / 2.5          | Its best part already lives in 44; as the main surface it is a blind small screen      |
| 15   | 38 Prop and Plane         | 3.31 / 2.0          | Brilliant dense picking; the head stays bowed and the menus sit at arm's length        |

#### Why, one by one

**1. Paired Browser (44).** It is the one design I could work in for an hour. Every object has a
page of facts and worded verbs. Forms are generated from descriptors, so a plugin's algorithm with
a logarithmic option appears complete with no XR code. Back (view) is kept apart from a named Undo
(data). The pairing then fixes the three things that held most finalists at coverage 3:

- **Files.** A CSV on the laptop is picked in the headset's Inbox.
- **Text.** A note is typed on the lent laptop keyboard, or on the phone with its keys mirrored
  under the field I am reading.
- **Wide tables.** They open on a sheet with a linked histogram and one cut handle.

The coverage reviewer counted 22 of 22 areas fully reachable, and the supply-chain expert's 16-step
workflow had no step above 10 acts on its best path. Comfort holds: every act is a ray pinch from a
low hand, there are no poses, and voice only types. My complaints are specific:

- **The typing pause misfires.** It swallows the first pinch after a search (address bar, type,
  pinch the result), and on the vocabulary's reading it also fires on phone pad touches. That makes
  a dead pinch with no message at the point I am aiming.
- **No repeat for scenarios.** Five "what if supplier X fails" runs cost about 45 acts and five
  hand-written notes, because a scenario cannot be kept, run once per row, or compared.
- **The Outbox can overwrite newer work.** This is the red team's severity 3. After an edit made on
  the laptop, a queued save from the headset replaces it, and nothing says so.
- **It needs a lot of building.** It needs a full in-scene UI toolkit, a pairing service and a
  Quest layer arrangement that has not been tried.

All of these are fixable inside the idea. The red team's rebuilt typing gate fixes eight findings
with one input rule. That gate starts on key-down, holds each pinch back for one round trip, and
lets Enter pick the highlighted address-bar result.

**2. Graph Browser (28).** It is 44 minus the pairing, the phone and the linked reader, and 44 is
built on it unchanged. As a separate product it is strictly worse for me:

- the laptop file needs the headset lifted;
- a note is about 25 aimed key pinches;
- triaging 38 pattern matches costs about 210 acts, because a table of rows has no Next and no
  "keep / not a threat".

It ranks second only because it is the right first milestone of 44: the unpaired browser has to
work on its own anyway (44 promises that "nothing needs either device"). Two of its round 2
defects need fixing before that milestone:

- A graph framed large covers Back, Forward and Home with its pick volume (severity 3).
- The pointing-pose gate and Aim settle reject pinches silently.

The fix the red team proposed for the triage loop belongs in 44 as well: a row cursor on every
list page, with Next and Previous on the thumbstick and on paired keys, and up to two row actions
that file the row and move on.

**3. Hotbox (26).** For an expert on controllers, this is the quickest command surface in the
studio that stays honest:

- Hold A, turn the ray to a worded item, release.
- The item that runs is the item that was lit.
- B repeats the last command on whatever I point at next.

In the hub-gene walk, the expert simulated removing hub after hub at two acts each and replayed
next month's pass from a recipe in about 35 acts. Its ease_of_use of 3.5 is shared only by 44 and
30, and the round 3 lenses left no severity 3 open. It falls short of the top for three reasons:

- **Several objects cannot be one target.** The top-10 agreement check across five rankings costs
  about 44 acts, and five histograms overflow the four pinned forms. The red team's "several
  objects of one kind are one target" brings these to about 9 and 4 acts.
- **The hands path is weaker.** The onboarding reviewer called the first hotbox's overshoot into a
  corner command "near certain", and the corner can be Undo.
- **Vision Pro's commit rule is unsettled.** A relaxed held pinch or a quick 150 ms pinch can run
  a row the person never saw lit.

I would not build it as a rival scheme. I would build its hotbox on controllers over 44's command
registry and target rule, as the fast layer that 46 tried to be.

**4. Cutting Room (23).** This is the design for the weekly part of my job. "Replace data, keep my
steps" replays the joins, runs, filters, scenarios and notes on Monday's export in about 5 acts.
Every clip says which graph it read, and the ripple bar names what an edit to the past will change
before it lands. Efficiency is 3.5, tied best, and no persona step exceeds 10 acts. But:

- **It is expensive.** webxr_feasibility is 3.0. Branches, the diff lane and "Remove and
  re-measure" need a replay engine in graphty-element that the WebXR reviewer put at months of
  work. Until it exists, undoing step 10's old mistake means pressing Undo back through the note,
  the filter, the style and the run.
- **Its replays can be wrong without a word, which defeats the point of a trustworthy history.**
    - A second "what if" silently stacks on the first scenario's branch, so the Branches table
      reports a compound scenario under one supplier's name.
    - A recipe re-selects "community 7" on data where 7 is a different group.
    - "Re-measure here", the only button on the warning, recolors a publication figure from a run on
      a 30-node subset.

It earns a mock, gated on the element's headless replay. The fixes are cheap once that engine
exists: references that store what they meant, and a fork from the baseline by default.

**5. One Question at a Time (30).** It is the calmest design in the set:

- each act is press to preview, release to choose, on a 6 cm answer that states its consequence;
- it uses only standard select events, so webxr_feasibility is 4;
- vr_usability is 4, onboarding 4.5, ease_of_use 3.5;
- every finished task is a versioned card, which is a methods record for free.

For hours a week it is too slow and too narrow. The Florentine median is 4 acts. A known task is
still an interview, and the supply-chain workflow sat at 8 to 10 acts per step. Coverage is 3
because a laptop file cannot come in without taking the headset off, and free formulas and drawn
patterns are sent to the 2D page.

Its central rule also fails silently. The "working set" on the bar is both "what I hid to read"
and "what every later task runs on". So:

- a tier-1 readability filter re-scopes every later betweenness and what-if run;
- the red team showed a figure's fade quietly shrinking the published GraphML to 30 of 1,200 nodes.

The fix is a hard separation of shown from analyzed. 44's forms already give most of 30's safety
(they preview at the graph, show counts and record nothing until pressed), so its best parts
belong in 44 rather than in a second build.

**6. Facet Browser (41).** It has the most comfortable selection model I read. Every column and
result is a facet with counts, a range handle stops in labeled gaps and names who sits just
outside, and every long press has a tap behind it. vr_usability, ergonomics and webxr_feasibility
are all 4. "On a route from [user] to [item]" with recounting facets is a genuinely better
explanation tool than the desktop. But it stopped after three rounds with severity 3s open:

- **Results shaped like a table have nowhere to land.** Link prediction returns scored pairs, so
  the recommender engineer could not read, rank or count his predictions at all.
- **Route, flow and cut lookups are never recorded,** so the computation that tied a fraud ring to
  a known fraudster vanishes from Methods and from the recipe.
- **A kept "filter what algorithms see" can leak test edges into a run** while the form still
  reads "All".

The facet idea overlaps 44's linked reader and rule page. I would lift the route chip with
recounting facets into 44, not build 41.

**7. Hint Keys (35).** Two-letter tags at a constant angular size are the best answer in the studio
to "pick one node among thousands": any headset's plain select hits a 2-degree target, with no
recognizer. Coverage is 4.5, and the removal what-if walked down a ranking with Next is the one
part of supply-chain work that is better in the headset. As a daily tool it asks me to hold too
much:

- five key states, eight phonetic words, and spoken aliases ("bridges", not "betweenness");
- a finger keypad whose hand still needs the other hand for Undo and the decimal point;
- label prefixes that the red team found colliding in the file's own Florentine key paths.

Its new severity 3 is the pick run: picking two runs to compare silently replaces a hand-built
selection with them. Tags belong in 44 as an optional dense-pick layer, not as the control scheme.

**8. Encoding Shelves (29).** The shelves show the whole state of the view as pills, so "why does
this node look like this" always has an answer. Its single best moment is two field pills on X and
Y that turn a social graph into a map of influencer types in three acts. But:

- **Every act is a placement.** Segmenting four influencer types costs 32 acts.
- **Previews vanish on real data.** Past a few thousand nodes they become sentences, so the
  "look before you drop" safety disappears.
- **Kept sets drift silently.** A set kept from a Louvain community is a rule. When the run is
  re-run after a new Expand seed, the set, its evidence note, its tab and its recipe input all move
  to a renumbered group, and nothing on screen says so.

The pill-and-shelf transparency is worth keeping as a "why this look" page. The drag grammar is
more work than an analyst wants for hours.

**9. Patch Bay (32).** Wiring makes two-input operations, sweeps and recipes fall out of one act.
The Review box turns "this group is the ring" into a recorded decision, and the Methods page
answers the genomics postdoc's named pain. For me the costs dominate:

- webxr_feasibility is 3, the lowest of the leaders.
- The board sits below the graph. In the default seated posture a forearm on an armrest lands on
  its bare rail, which takes that hand's pinch away from the graph with no message.
- There is no "for each group" repeat. Annotating 15 clusters is about 280 acts.
- Two silent severity 3s:
    - re-running MCL leaves 15 enrichment results and labels bound to the old clusters;
    - a one-tap Keep as set publishes "1 yes, 11 no" for eleven groups nobody looked at.

It is a source of parts: the Review box with a "not reviewed" state, and the Methods page.

**10. Findings Inbox (42).** Machine-posted findings that never change the project until I act are
a distinctive working model, and a recipe whose ids are asked again on replay is exactly "the same
investigation on the next account". But efficiency is 2, the lowest in the set:

- the first view of a fraud alert is 12 to 13 acts;
- cleaning up after the previous alert is about 15 more, because there is no case boundary;
- that missing boundary is a severity 3: alert 1's filter and fade silently shape alert 2's ring
  and its exported picture.

The red team found a second severity 3: a callout can cite an automatic result that the methods
omit, the export drops and a Dismiss deletes. The fraud analyst said she would use it for the one
alert in twenty that looks like a ring. I would keep the "machine proposes, person files" card as
an optional panel in 44.

**11. Editable Record (45).** "Strike only this" on a merge line three weeks and 300 lines back is a
capability no 2D tool offers the knowledge engineer. The arm-load floor (ray pinches from a resting
hand, a sticky one-hand alternative for every held act) is the best in the studio. But its
ease_of_use of 2.5 is the lowest of the set:

- 40 candidate merges cost about 480 acts with no repeat;
- at 400,000 nodes the Check card stops nearly every act, so it trains Apply-without-reading;
- a merge picked off a ranked table re-derives on refresh and can merge the wrong pair;
- "Keep both", the default whenever an edit reaches an output, puts the corrected chain at the
  foot of the record. Methods and recipes then read it out of order.

Worth a mock of exactly that risky part, not a build.

**12. Fast Ring over Pages (46).** The structure is right: a ring of six counted verbs over a
complete page, a novice reads and an expert flicks, and scope comes from a labeled chip and never
from where a pinch landed. It has the best Florentine count in the set (median 2, worst 6). But
aiming with the head produced most of its five severity 3s:

- deep neck flexion for every press on a low surface;
- an in-scene keyboard typed with the head;
- tags that move as you aim at them.

On top of those, the thigh blocks the three lower arms of every ring, which hold Save, Note and
Repeat. And the counted outcomes, its teaching device, do not exist on day one: the element has no
dry-run count yet. Re-aimed with the hand ray, its counted-outcome strip is the part to lift into
the hotbox's center row.

**13. Point and Ask (34).** Language could be the biggest efficiency lever in the studio. A
lateral-movement pattern described in one sentence fills the pattern editor in 8 acts, against 17
to 23 by hand. But:

- on Quest, the most common headset, there is no Web Speech;
- a confidential project is locked to "Local only", and no on-headset recognizer is confirmed,
  so the threat hunter types every request or falls back to another prototype's hand path;
- its privacy model leaks two ways (severity 3): attribute values go out under "Names withheld",
  and recipes and recognition hints carry a confidential case's ids into other projects.

The visible target tray and the editable slot tiles are excellent. They belong as 44's optional
assistant (checklist area 21) once a "data withheld" route shows the exact outgoing text.

**14. Phone in Hand (39).** Lift-to-commit on real glass is the best feedforward on Quest, and 44
has already taken the part that matters: the phone as a keyboard with its keys mirrored under the
field. As the main surface it is a small 2D page touched blind:

- the microphone prompt and Safari's toolbar and edge gestures are operating-system surfaces the
  headset cannot draw;
- a blind scroll on a long form scrubs a slider and silently changes an option before Run
  (severity 3);
- on Vision Pro, reading the label of a held pinch starts a move that pins the node;
- a first-timer reaches the first analysis at 6 to 7 minutes;
- every per-cluster loop costs about 16 acts, with no "each group".

Nothing left here needs building separately.

**15. Prop and Plane (38).** The plate's slab is the only real disambiguation step for picking in a
dense 3D graph. An MCL sweep stacked in depth and sliced by the plate shows which proteins leave a
complex, the one decision a 2D page cannot show as well. For an hour in a chair it fails on
comfort, with two severity 3s:

- the seated home puts the graph about 50 degrees below eye level;
- on hands, the pinned clipboard and its Turn handle sit at arm's length.

Efficiency is 2: the note step is 10 acts, and per-cluster work is about 350 acts. Keep the slab
selector and the stacked sweep as parts. Do not build the scheme.

#### What I would implement first, in order

##### 1. Paired Browser (44), starting from its unpaired core (28)

- **Why:** it is the only design where an analyst reaches all 22 checklist areas from a seat. It
  has the best text and file paths and the strongest recovery model, and nothing about it fights
  an hour of use.
- **Biggest open risk:**
    - **Feasibility on Quest.** The panel's text and the pointer have to render correctly together.
      The file's fix is a second projection layer, which neither Quest Browser's samples nor
      Babylon's layers feature uses.
    - **Size.** It needs a whole in-scene UI toolkit (scrolling tables, generated forms, a keyboard
      with a caret), because DOM overlay is AR-only.
- **First spike:** one reader panel on a Quest 3, built two ways: a quad layer under a cleared
  projection layer with a depth hole, and a texture.
    - Draw the ray, the hold ring and a name tag over it.
    - Use 1.3 cm text and a 12-row page, at 1,000 and 10,000 nodes.
    - Measure frame time and legibility, then repeat on Vision Pro with the transient pointer.
- **Second spike:** the pairing (a Worker plus WebRTC), the folder listing, and keyboard lending
  with the red team's rebuilt typing gate. Also add version-checked writes, so the Outbox can
  never overwrite newer laptop work.
- **Added before release:**
    - a row cursor with mark-and-next on every list page;
    - a kept, comparable scenario table for "what if removed";
    - arrow keys and Tab moving a focus ring over a page's buttons when a laptop keyboard is lent.

##### 2. Hotbox (26), as the controller fast layer over the same command registry

- **Why:** ease and efficiency are where every finalist is weakest. For an expert on controllers,
  hold, turn and release with "repeat on the next target" is the cheapest way to cut repeated acts
  without a new grammar to memorize. Because its center row is generated from the same verbs as
  44's pages, it adds speed without adding a second model.
- **Biggest open risk:**
    - A first-time hands user commits an unintended corner command (possibly Undo).
    - Vision Pro's quick or relaxed pinch can run a row nobody saw lit.
- **First spike:** controllers only, over 44's verb registry.
    - Measure wrong-item rate in first sessions.
    - Count the hub-gene repeat (click, B) and the top-N agreement case with several runs as one
      target.
    - Ship on hands only after a stated pinch rule passes the same test.

##### 3. Cutting Room (23), as a mock, after graphty-element can replay its journal headlessly

- **Why:** for weekly work, "replace data, keep my steps" and editing an old step in place are
  worth more than any other single feature in the studio. The headless replay it needs is also
  what 44's "Undo back to here, then replay the later steps" relies on, so the investment is
  shared.
- **Biggest open risk:** silent re-binding on replay. A recipe or a "Replace data" picks a
  different community under the same number, and a second scenario stacks on the first.
- **First spike:** replay a recorded journal in a worker on new data. Store each reference by what
  it meant (its members or defining node, not "community 7"), and stop at the first reference
  whose members change, showing old beside new.

#### Rules every build should take from these reviews

These came up in nearly every finalist, so they belong in whichever design is built:

- **A pick from a result keeps what it meant.** A set, note, layer target or recipe input made
  from a group binds to its members. When a re-run, the clock or new data changes what it matches,
  it says so on its face.
- **What is shown and what is analyzed are separate.** A filter made to read or to make a figure
  never re-scopes later runs. Every run names its scope, including time windows and filters, at
  the moment it runs.
- **Anything done once per row or per group has a repeat.** That means a row cursor that files and
  moves on, and a per-group scope that returns one table.
- **Exported files and published methods list exactly what made them.** That includes lookups,
  automatic results a note cites, and the order the steps really ran in.
- **Every revision is walked against stress journey 6 (publish) before its fixes are called
  done.** That is where the red team found a severity 3 in almost every design.

### Judge 3: the innovation and research lead's ranking of the finalists

Date: 2026-10-10. Sources: `criteria.md`, `triage.md`, the 15 finalist prototype files, and each
finalist's latest review round (round 3 for 23, 26, 32, 35, 41, 42 and 45; round 2 for the rest).

#### What this judge values

Three things, in this order:

1. **Ideas that only VR makes possible.** For each finalist I ask: could the same lesson be learned
   on graphty's 2D page, for a tenth of the cost? If it could, the headset build teaches little that
   the 2D page would not, however good the design is.
2. **What each build teaches.** A build that answers several open questions at once, or gives later
   builds parts they can reuse, is worth more than one that answers one question.
3. **A spread of kinds in what we build.** The set we build should test different mode models
   against each other, not several versions of "panels beside the graph".

#### The bar, stated plainly

**No finalist meets the bar for RECOMMENDED.** Every finalist has at least one criterion below 3.5,
except Paired Browser (44), and 44's webxr_feasibility is 3.5 where the bar needs 4. Paired Browser
comes closest: mean 3.94, lowest 3.5, no severity 4. What blocks it is build cost: an in-scene panel
toolkit, a pairing service graphty does not run, and the phone mirror. A better paper design cannot
lower that cost; only building it can. So the builds named at the end are **headset prototypes that
test the risky part**, which the criteria call "worth a mock". They are not recommendations to ship.

#### Two problems every finalist shares

These shape the build order more than any single score does.

- **Every finalist needs the same two pieces of infrastructure.** One is an in-scene panel toolkit
  that draws forms generated from descriptors, lists, tables and a keyboard. DOM overlay works only
  in AR, so nothing exists today. The other is a laptop pairing for files and long text. All 15
  files rely on it, either as part of the design or as a dependency they wait for. Whichever prototype builds these first pays
  for them once on behalf of every other one.
- **Replayed work quietly changes what it refers to.** In the latest round the red team walked
  stress journey 6 (publish, then replay a week later). It found the same severity 3 in 23, 28, 29,
  30, 32, 41, 42 and 45: a set, note, recipe input or scope that silently means something else
  after a re-run, a renumbered community or a moved time window. No control fixes this. It is a
  graphty-element capability: a recorded reference must store what it resolved to and report drift.
  It should be built once in the element, not designed again in each prototype.

#### Ranking, most to least worth building

##### 1. Paired Browser (44) -- hybrid; mean 3.75 -> 3.94, lowest 3.5

On VR-only ideas, this is the weakest design here. Its own top risk is "a desktop app in a
headset", and its first open question is whether people still look at the graph at all. I still
rank it first, for two reasons. First, it builds both pieces of infrastructure (generated in-scene
pages, the six-digit pairing with the laptop folder Inbox, and Save to laptop), and almost every
design below them needs both. Second, it is the **control condition**. The more VR-specific designs
below (the slab, the ring, triage) can only show what they gain if they are compared with a complete,
plain, page-based surface. It also has the best scores in the studio: coverage 4.5, onboarding 4.5,
no criterion below 3.5. Its open defects are fixable inside the idea, and the red team named both.
The typing pause swallows the first pinch after a search and silences pinches during phone-pad
touches; that needs one rule that starts on intent and shows at the aim point. And two devices can
write one project, which needs version-checked writes. The point of building it is less what it
teaches about VR than what it saves on the next three builds.

##### 2. Prop and Plane (38) -- research; mean 3.13 -> 3.31, lowest 2

It has the lowest final mean of any finalist, and it is the design I most want built. It is the only
one whose central acts cannot exist on a monitor. The off hand holds a stand-in that turns the graph
1:1. A plate pushed through the graph draws the nodes in a thin slice flat and unhidden on its face,
with a crosshair that snaps from node to node. A sweep laid out in depth on identical positions
shows, one slice per run, which proteins leave a complex as MCL inflation goes from 2 to 3 to 4. That
is the one comparison the reviewers say the 2D page cannot show as well. Picking by slab turns
occlusion, the hardest VR-specific problem in the checklist (12 to 21 seconds per node in dense 3D),
into a plane-distance filter that stays cheap at 10,000 nodes and needs no gaze. Its weaknesses are
real but all sit on the ordinary half of the design. The clipboard is a hand-held panel and does
most of the work. The four severity 3 findings include a quick pick that toggles Medici out of the
selection, so the step 9 note lands on the wrong subject. With hands alone it rests on two poses,
and jitter of the palm plane is unmeasured. The red team's fix keeps the idea: separate "what I am
looking at" from "what is selected", and label the pick before the press. Built on top of Paired
Browser's pages, which can replace its clipboard, this becomes a narrow spike that answers the
studio's biggest open question: is there anything a graph analyst does better in a headset?

##### 3. Fast Ring over Pages (46) -- hybrid; mean 3.56 -> 3.44, lowest 3

Its mean went down in round 2 because coverage fell to 3. The file left the laptop pairing "until
graphty hosts the relay", and the red team's top change is simply to take on the pairing, which
building Paired Browser first provides. Its research question is the one the whole studio is stuck
on: efficiency sits at 2 to 2.5 and ease_of_use at 3 for almost every finalist, because the complete
surfaces are slow and the fast surfaces are incomplete. This design tests whether one object-then-verb
pattern can be both. A beginner holds and reads a ring of six counted verbs. An expert flicks the
same direction blind. The top arm always opens the object's complete page. It also has the studio's
most interesting ergonomic idea: the hand rests on the thigh and only presses and steers by 2 to 12.5
cm of relative travel, while the head or, on Vision Pro, the eyes aim. And it carries two-letter tags
from Hint Keys for dense picks. Built over Paired Browser, it costs one layer, not a new surface, and
the comparison is clean: the same pages with and without the ring. The open risks are flick errors
between adjacent arms (Neighbors next to Hide), commit-on-release when hand tracking flickers, and
whether counts can be computed in time on 10,000 nodes. All three can only be measured in a headset.

##### 4. Findings Inbox (42) -- usage; mean 3.25 -> 3.69, lowest 2

This is the most different mode model among the finalists, and it attacks the VR input problem from
the other side. Every other design asks how to make commands cheaper in a headset. This one asks for
fewer commands: graphty runs cheap analyses on load, and the person files each finding with a 4 cm
flick from a resting elbow. The flick needs speed as well as distance, cancels when tracking is lost
and has a labeled button behind it. It is precisely specified on all four inputs (hands, controllers,
the Vision Pro transient pointer, thumbsticks), and the per-element emphasis channel fits
graphty-element's existing per-instance buffers. What the build would teach depends partly on the
headset: whether a view that follows each card helps orientation or disorients, and whether flicks
beat pinching panels for an hour. Whether analysts trust machine findings can be tested on the 2D
page as well, and should be tested there first. Its efficiency is 2, because there is no case
boundary: an analyst working fifty alerts on one graph cleans up about 15 acts per alert. The red
team's Start case, Close case and Next case fixes that on surfaces the design already has. Its
severity 3 (a published callout cites an automatic result that the inbox-clearing flick throws away)
is the shared replay problem above, in another form.

##### 5. Patch Bay (32) -- paradigm; mean 3.38 -> 3.69, lowest 2.5

Dataflow boards exist on desktops, so the board itself teaches little about VR. The idea in it that
matters most for the whole portfolio is the **Review box**: a person's call ("this group is the
ring") becomes a recorded stage with Yes, No and Skip that replays as a question on new data. The
designer notes already make it a rule for every recipe. Two more parts are worth taking: probe beads
that show any stage of the analysis in the 3D graph, and "only fitting ports light", which gives
Vision Pro the feedforward its missing hover cannot. As a build it is expensive (webxr_feasibility
3: a live recompute graph inside a frame budget, a wiring bench below the eyes, per-box faces), and
its round 3 red team found journey 6 failing in four places. All four have one root: a pick from a
result becomes several unrelated tokens instead of one object. Build the Review box into whichever
design is built. Build the board only if a reproducibility-first persona study asks for it.

##### 6. Hint Keys (35) -- plain combination; mean 3.06 -> 3.75, lowest 2.5

This had the largest climb among the plain designs, and it holds the cleanest one-meaning input set in
the studio: taps only, so a resting or trembling hand can never fire a gesture. Its core idea, a
two-letter tag of constant angular size on every node, row, bar and history step, is a borrowed
desktop idea (Vimium, Voice Control's numbers). But it solves a VR-specific problem: pointing at one
node among thousands with a jittery hand ray. That answer competes directly with the slab in Prop
and Plane and with the "which one?" card in Paired Browser. The Fast Ring already carries the tags,
so the three answers to dense selection get compared head to head without building this design
whole. The rest of its novelty (an in-page Vosk recognizer whose vocabulary is what is on screen
plus one level down, and a thumb keypad on the finger segments) is a voice and accessibility
experiment worth a mock. The keypad is now optional, and its reliability from WebXR hand joints is
unmeasured. Its open severity 3 is a pick run that ends by replacing the selection whatever was
picked; "a pick run collects, never selects" fixes it.

##### 7. Cutting Room (23) -- metaphor; mean 2.69 -> 3.63, lowest 3

This had the largest climb in the studio, and it is the only metaphor still standing. It now has the
highest lowest score (3, tied) and the best efficiency (3.5). Editing the history instead of the
state is a strong idea, but not a VR idea: nothing in it needs a headset. Its central machine, a
replay engine that knows what each run read, does not exist in graphty-element. Most of what a
build would teach is how people react to the engine, and the 2D page can teach that more cheaply.
Build the replay engine in the element first, behind a 2D history view. Once it exists, the timeline
becomes cheap to mock in a headset, and Editable Record and Patch Bay both benefit. Its round 3 red
team found the shared replay defect in its strongest form: "community 7" re-binds to a different
group on new data, and "Re-measure here" quietly recolors a published figure. That is what to fix
first.

##### 8. Point and Ask (34) -- paradigm; mean 3.5 -> 3.5, lowest 2.5

This is the only language-model design, and it has two genuinely new parts. The target tray binds
"this" only to objects you pinched, so speech never depends on gaze or word timing. Slot tiles show
your own words back in graphty's terms, and no number or name is ever invented. It keeps
voice-optional input in the portfolio, as the criteria require. But its default first session is
typed: no headset has a confirmed on-device recognizer, and a new project starts in Local only. Its
main research question, what share of requests a local compiler can handle, does not need a
headset; graphty's 2D command palette can answer it this quarter. The round 2 red team also found
that recipes and rail templates carry a confidential project's data out of it. Learn the compiler on
the 2D page, then add the tray to a headset build.

##### 9. Phone in Hand (39) -- research; mean 3.38 -> 3.56, lowest 2.5

The idea (real glass under the finger, every control drawn by graphty's own page, touch, highlight,
then lift to commit) is sound and VR-motivated, and it is the best answer to text in a headset. But
Paired Browser already carries its phone keyboard and table pad, so most of what it would teach comes
free from the first build. What is left standalone has five severity 3 findings. The red team showed
that the phone's browser owns alerts, toolbars and edge gestures, so "nothing on the phone is drawn by
its operating system" cannot hold inside a VR session. Walked in full, stress journey 1 already
misses the 5-minute first analysis. Its one remaining unique lesson, blind touch accuracy on a lap,
is measured inside Paired Browser's optional phone.

##### 10. One Question at a Time (30) -- plain; mean 3.81 -> 3.75, lowest 3

This is the safest design in the studio, and it has two of the most reusable parts. Press to
preview, release to choose and slide off to cancel solves Vision Pro's missing hover by construction.
The Check card lists every default it skipped. It also asks a valuable question about the platform:
can descriptors as they ship today produce questions people understand? But a wizard is not a VR
idea, and that descriptor question is answered more cheaply on the 2D page. Its red team found that
the working set (one visible scope for every task) is the design's single point of failure: a filter
made for a figure silently changes what the export analyzes. Separating what is shown from what is
analyzed fixes it. Keep it as a source of parts, and as the Vision Pro reference.

##### 11. Facet Browser (41) -- usage; mean 3.56 -> 3.75, lowest 2.5

The route chip is its one partly VR-specific moment. The paths light in 3D while the category and
brand facets recount for the nodes on them, which explains a recommendation by structure and by
attribute at once. The rest is faceted search, which teaches nothing on a headset that it does not
teach on a monitor. It has stopped under the stop rules, with two permanent open problems: results
shaped as tables of pairs (link prediction) have no facet kind, and route, flow and cut lookups are
never recorded, so journey 6's methods and recipe silently lose the computation that tied the ring to
a fraudster. Keep it as a source of parts: the detented range handle that names who sits just
outside ("Ridolfi and Castellani at 0.069 are out").

##### 12. Editable Record (45) -- hybrid; mean 3.38 -> 3.56, lowest 2.5

It tests the same mode model as Cutting Room (edit the history) with lower ease_of_use (2.5) and a
lower floor. Its red team found that round 2's "Keep both by default" put copies at the foot of the
record, so record order stopped being execution order. Its strongest single result, undoing one wrong
merge three weeks and 300 lines back in four acts, is a capability of the element's replay engine
(see Cutting Room), not of a VR control. It also sets an ergonomic floor worth copying: no hand
poses, a sticky one-hand alternative for every held pose, and tracking loss always cancels. Keep it
as a source of parts.

##### 13. Encoding Shelves (29) -- plain; mean 3.5 -> 3.69, lowest 2.5

Tableau's shelves are well understood, and the commit model (nothing changes the view except a pill
on a named shelf) is the clearest state model in the studio. But dragging pills is a desktop
interaction made harder in a headset, and the reviewers' own best moment for it is an X and Y
attribute scatter. Prop and Plane does that too, with a plate to cut it. Its severity 3 (a rule set
re-binds when Louvain renumbers its communities) is the shared replay defect again. Keep it as a
source of parts.

##### 14. Hotbox (26) -- plain; mean 3.13 -> 3.69, lowest 2.5

It is the controller-first design, and its commit rule (the item that runs is the item that was lit,
frozen at the commit motion) and ray-tip text ("click again: 7 neighbors") are excellent. But the
Fast Ring tests the same research question, a fast layer with relative steering over complete
surfaces, with the hand at rest and no held button. The Fast Ring's version is the more VR-native
one. Keep the Hotbox as the controller mapping, and its Repeat on a new target, for whichever design
is built.

##### 15. Graph Browser (28) -- plain combination; mean 3.81 -> 3.69, lowest 2.5

Paired Browser contains it whole and adds the pairing, the linked reader and the phone. Building it
separately would teach nothing that building Paired Browser does not. Drop it as a duplicate under
the criteria's own rule. Carry its red team's row cursor (Next and Previous on every list page,
which cuts the threat-triage walk from about 210 acts to about 80) into Paired Browser.

#### What to build first, in order

| Order | Prototype                 | Why first                                                                                                                                                            | Biggest open risk                                                                                                      | First spike                                                                                                                                                                                                                            |
| ----- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Paired Browser (44)       | Builds the in-scene panel toolkit and the laptop pairing that the others need; the plain control condition every other build is measured against; closest to the bar | Build cost: a signaling endpoint graphty must host, and the in-scene toolkit; and whether the graph becomes decoration | One generated form page and one sorted reader drawn in-scene at 1.1 m, plus the six-digit pairing that lists a laptop folder in the headset's Inbox, on Quest 3 hands and Vision Pro. Log how often the graph is pinched against links |
| 2     | Prop and Plane (38)       | The one idea that only a headset can do: occlusion-free picking by slab, 1:1 orientation from a held prop, runs stacked in depth and sliced                          | Jitter of the palm plane with hands alone, and arm load from holding the plate in the graph                            | Slab selection with the snapping crosshair on 400 and 10,000 nodes, hands only and controllers, timed against Paired Browser's "which one?" card for picking 12 scattered nodes                                                        |
| 3     | Fast Ring over Pages (46) | Tests the studio's shared failure (complete means slow) as one layer over Paired Browser's pages; brings two-letter tags into the dense-selection comparison         | Flick errors between adjacent arms, and commit-on-release when hand tracking flickers with the hand on the thigh       | Head-aimed ring steered by relative travel from a resting hand on Quest hands, over 30 minutes: hold-to-flick transition, adjacent-arm errors, cancels on tracking loss                                                                |
| 4     | Findings Inbox (42)       | The most different mode model: fewer commands instead of cheaper ones; precisely specified on every input                                                            | Agenda-setting and false discoveries on large graphs; efficiency 2 until it has a case boundary                        | The four-way flick and its footer, with the view following each card, on all three headsets, after the case boundary lands; trust in machine findings tested first on the 2D page                                                      |

Builds 2 and 3 both sit on build 1, so after the first build each costs one layer, not a new UI. With
the "which one?" card in build 1, the slab in build 2 and tags in build 3, the three answers to
dense selection can be compared on the same pages. All four work with hands alone and no voice.

Before any of them reaches a study session, graphty-element needs the capability the red team found
missing in eight designs: a recorded reference (a set, a scope, a recipe input, a note's target)
stores what it resolved to and reports drift when it is reopened or replayed. Build it once, in the
element, together with Patch Bay's Review box as the one way a person's judgment enters the record.
