# VR interaction options for graphty: prototypes worth mocking

Status: research report, 2026-10-09. Options, not a design. Nothing here has been built or tested
with people.

graphty is a graph (network) visualization and analysis product: the graphty app, a React web UI,
around graphty-element, a web component that draws 2D and 3D graphs with Babylon.js and already
opens WebXR VR and AR sessions. In the headset today a user can enter and leave VR and AR, fly with
the thumbsticks, zoom and rotate with two hands, and pick and drag a node. There are no in-headset
menus, panels, text, search, inspector, legend, notes or undo. This report asks what graph analysis
in a headset could be if it were designed for the headset, rather than ported from the desktop,
and which ideas are worth a quick mock to find out.

Target headsets: Meta Quest 3 and 3S (controllers and hand tracking), Apple Vision Pro (hands only,
look and pinch, Safari), Android XR (Chrome). A keyboard, a phone, voice or a desktop may be nearby.

---

## 1. Summary

### The prototypes to mock, in priority order

0. **Foundation (not a differentiator, but first).** First, prove the round trip out of the
   headset to the app's 2D page and back on the same state (two small graphty-element fixes come
   before it); test how files get in and out; measure the frame rate of today's element at 1,000,
   5,000 and 10,000 nodes in a headset; spend a few days checking which inputs a WebXR session
   actually receives (keyboard, mouse, gamepad touch, hands resting in the lap or on a desk, speech
   cost); spend two days choosing how panels are drawn; build the legend and status cards; set up
   the control conditions every mock is compared with.
1. **Hand-held diorama.** Hold the answer (a path and its neighbors) in your off hand and turn it.
   Tests the central claim: does structure in depth, turned by your own hand, beat desktop 3D?
2. **The Graph Is the Material.** Pull a node to expand it, stretch a rubber band between two nodes
   (slack shows other routes), snip ties as a what-if. The graph's structure is the interface.
3. **Walk and Flick, with edge signposts.** The thumbstick walks along edges instead of flying
   through space; a 4-verb ring on the other thumb; each edge says what lies beyond it. Resting
   hands, silent, cheap.
4. **Then and Now.** A volumetric lens shows a second state (another week, a what-if, a second
   algorithm) inside a region of the graph, with differences counted. Attacks the task where VR
   is known to lose: comparison.
5. **The Desk.** Passthrough of the real desk; a flat linked copy of the graph on a tilted slab for
   picking; the real keyboard for commands; reading boards at comfortable distance. The likely
   daily driver, if one platform fact holds.
6. **Measure Space.** Put any measure on any of three axes (PageRank on x, betweenness on y),
   keeping the edges drawn. Test the measure-axis layout on the desktop first; the headset mock then
   tests only what depth adds.
7. **Point and Say, Wizard of Oz first.** "Path from this to that" while pointing; every utterance
   becomes editable chips before it runs. Reaches the whole catalog of about 60 algorithms, and is
   the route for people without usable hands. The first test needs no engineering.
8. **Hands Only resting-pinch gate.** Can 2-4 frequent verbs be fired by finger pinches with hands
   resting in the lap or on a desk? Decides an expert tier for hands-only headsets. Whether resting
   hands stay tracked at all is checked first, in the foundation.
9. **Stand In It.** The graph fills the room; walking is the navigation and a circle on the floor
   around your feet is the query scope. A short, costly, bold spike, run as a room-scale session of
   the diorama prototype rather than a build of its own.

**How a follow-up review changed this order.** Six entries added late in the study had their
own adversarial review by four simulated reviewers (a VR interaction designer, an ergonomics and
accessibility specialist, a working network analyst, and a WebXR and Babylon.js engineer). All
four moved Measure Space down, from third to sixth: its headline claims did not survive (placing
nodes by measures throws away the layout that shows bridges and communities), it costs weeks, not
days, and its main question can be answered on a desktop. Hands Only moved up one place, and its
tracking check moved into the foundation, which already listed it. Stand In It moved to last: its
fatigue stays below the bar, its rescored profile now sits below the plain VR baseline, and its
only route to a passing fatigue score is the seated diorama, so it becomes a session of that
prototype. The same-page round trip moved to the front of the foundation, because every model
scores poorly on entering and leaving and the reviewers found two defects in graphty-element that
block it today.

Optional, outside the order: **Guide and Diver, Wizard of Oz.** One person at a laptop steers, one
in the headset explores, with no new code. The only test of collaboration in this set.

### The headline insight

The best evidence for graph analysis in VR is old and was gathered on desktop stereo displays:
stereo plus motion that is coupled to the head or hand lets people trace paths in graphs about
three times larger than in 2D (Ware and Franck 1996; Ware and Mitchell 2008). No one has shown it
for analysis judgments on a modern headset, and the headset studies that exist are mixed: VR lost
on side-by-side comparison and on remembering nodes. So the first mock should test that one claim
cheaply and directly. If depth in the hand does not beat a mouse-orbited 3D view on the desktop,
graphty's VR story is comfort and novelty, and every other prototype should be scoped down.

The second insight is where the differentiation comes from. The ideas that score highest on
"could not exist on a desktop" do not reach for better menus. They make the graph's own structure
the interface: a cursor that moves along edges, not through space; a band whose slack answers
"is this the only route?"; signposts on edges; axes that are measures. A tool palette, however
clever, makes a better toolbox. These ideas aim at better analysis.

On "can we do better than Google's palette?" (the off-hand palette Tilt Brush made famous): the
study produced a sound answer, a palette that holds the user's own analysis state (computed
results, attributes, sets) and turns placement into commands. But under review it looked like
Tableau's shelves moved into 3D, and it teaches little a cheap A/B test would not. The stronger
answer is to stop sending the user to fetch tools at all: bring the answers to the reader (the
diorama and answer row) and let the structure be the control (prototypes 2 and 3).

---

## 2. How this was done, and its limits

Success criteria came first. They were brainstormed from the users' point of view, grounded in
four literature reviews (comfort and ergonomics; immersive analytics and graph tasks; input and
selection; learnability, accessibility and adoption), reviewed by three critics, and frozen before
any option was generated. Then 447 options in 29 families were collected and invented with
deliberately unconstrained brainstorming (216 researched or shipped elsewhere, 97 known ideas
given a new use, 134 invented here), alongside 31 use cases drawn from graphty's own design
documents (personas, workflows, task flows) and from what its code can do today. The options were
combined into 22 whole interaction models, each with its pointing, commands, text, reading and
undo, and a walkthrough on a real dataset. Four rounds of adversarial review by seven lenses (a
criteria scorer, a VR interaction designer, an ergonomics and accessibility reviewer, a working
graph analyst, a WebXR engineer, an innovation critic, and a use-case coverage auditor) merged,
split and demoted models into shared foundations, leaving 11 models, a set of control conditions
and 13 shared layers. Only then were they scored against the frozen criteria and ranked on
differentiation and learning value.

The limits are real. The reviewers were simulated (AI personas), not people. Nothing has been
tested with users or on a headset. Six entries added in the last round (Measure Space, Stand In
It, the merged Hands Only model, the legend-and-status cards, the same-page dip-in and the Quest
Link idea) then had an adversarial pass of their own by four further simulated reviewers, each
scoring independently against the frozen criteria; their findings are recorded in each entry. Almost every score that would make a model
special is a claim at Low confidence. Several platform facts the designs rely on are unverified
(marked "verify" in section 4; they are claims to test on a device). The literature citations
were checked against their originals on 2026-10-09, and section 9 says where one could not be. graphty's own
personas are marked unvalidated in the repository, so the use cases are hypotheses about use. The
worked examples use the Florentine families marriage network (15 families, 20 marriages), whose
figures were checked with networkx; the larger fraud-graph examples are illustrative.

---

## 3. Success criteria

The criteria come in three kinds: gates (pass or fail), scored criteria (a profile, never summed)
and two ranking axes. A score of 2 means "as good as the named reference technique"; 3 means
clearly better; 1 neutral; 0 harmful. A score marked `*` is a claim at Low confidence.

Evidence labels used throughout: Strong (several lab studies, a meta-analysis or biomechanics);
Moderate (one or two lab studies, or a shipped product with outcome data); Weak (one small study,
a preprint or press); Guideline (vendor or standards guidance); Shipped (a product decision with
no published outcome data); Opinion; Constraint (a hard platform fact or a repository rule);
Extrapolated (evidence from desktop, pen or non-headset displays applied to headsets).

### Gates (every option and model)

| Gate                    | Rule                                                                                                                                                                                                               | Evidence                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motion                  | The view never moves unless the user asked; large motion the user did not start is limited or masked; nothing flashes above 3 Hz over a significant part of the view.                                              | Strong: sickness meta-analysis of 55 studies (Saredakis et al. 2020); field-of-view restriction cut sickness (Fernandes and Feiner 2016). WCAG 2.3.1. |
| Accessible route        | Every function has a route that works seated, with either single hand, with no press-and-hold, no simultaneous inputs, no walking, and not by voice alone. Two-handed and held techniques are accelerators on top. | Guideline (Meta accessibility checks, W3C XR Accessibility User Requirements); Moderate (Mott et al. 2020, 16 people with limited mobility).          |
| Raised arm              | No common workflow holds the arm above the elbow or extended for more than a few seconds without rest.                                                                                                             | Strong (Consumed Endurance, Hincapie-Ramos et al. 2014; Jang et al. 2017).                                                                            |
| Web platform            | Runs in WebXR on the three target browsers with only the input each exposes; no continuous eye gaze (no target browser exposes it); no overriding system gestures; no native app.                                  | Constraint.                                                                                                                                           |
| No harm                 | Keeps stereo and head parallax during structure tasks; about 2 ms per frame at most at 1,000 nodes on Quest 3 beyond the engine; every new piece of state saves and restores.                                      | Constraint.                                                                                                                                           |
| Data on the device      | The core loop works with the network blocked; anything that sends graph content, names, speech or camera frames off the device is visible and switchable.                                                          | Constraint (fraud, intelligence and clinical users).                                                                                                  |
| Presentation neutrality | graphty-element holds mechanisms and neutral facts; the app supplies words, grouping and order; a third party turns on a working default XR UI in about 15 lines.                                                  | Constraint (repository rule).                                                                                                                         |

Two more gates apply to whole models only: every core task (find, neighbors, path, select and pin
a set, run an algorithm with parameters, read the result, compare, filter, annotate, undo) can be
done with the headset on; and any node's label and top values can be read in one action.

One gate was added after the criteria were frozen, because no criterion covered it and the
follow-up review showed every model relied on it silently:

| Gate             | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files in and out | An analyst can bring a graph from their own computer or a shared location into the headset, save the session, and get a result back (a table as CSV, a screenshot, the saved project) where the desktop can open it: with the headset on throughout, or with one round trip to the app's 2D page that returns to the same state. Target: the whole round trip in about 2 minutes, no manual file copy, nothing lost if the browser is killed mid-task. | Constraint (Quest Browser has no save-location picker; see section 4); domain need (analysts work from shared files and report to people at desks). |

It is a property of the foundation, not of any one model, so prototype 0 measures it: a half-day
test of which file routes work inside a session, then the full round trip timed through the
same-page dip-in, and again over Quest Link. Prototype 5 (The Desk) repeats the round trip as part
of its task script, because a daily driver that cannot save is not one.

### Scored criteria

Weights: critical (a finalist must reach 2 or name its route), important, nice, low. For the
reference index in section 6, critical counts x3, important x2, nice x1, low x0.5. Measurement
tiers: quick (1-5 internal testers, a day), study (12 or more participants, comparative, two
sessions, preference and speed taken from session 2), longitudinal.

| #   | Criterion                                                                                                                                                                                      | Weight    | Reference for a 2                                                                | Key evidence (strength)                                                                                                                                                                                                                                                                                                                                                                    | How it is measured                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Core-loop speed: pick, hover-to-read and undo no slower than a mouse; other core tasks within about 2x the desktop                                                                             | important | VR baseline's times                                                              | Users' own stated need; the 2x figure is provisional                                                                                                                                                                                                                                                                                                                                       | Core task script in the headset and on the desktop (quick, then study)                                                                                       |
| 2   | Structure-reading gain: better judgment of structure around a result (only route? bridge or clique center? sub-structure?) than desktop 3D with rotation, with confidence matching correctness | critical  | Free head motion with ray picking                                                | Strong for stereo plus motion on non-headset displays (Ware and Franck 1996; Ware and Mitchell 2008); Moderate on headsets (McGuffin 2022, N=34); counter-evidence: Huang et al. 2023, Kotlarek et al. 2020, Feyer et al. 2024                                                                                                                                                             | Plausibility questions on 300- and 1,000-node graphs vs desktop 3D; path tracing; insight counts; confidence calibration (study)                             |
| 3   | Each answer in the representation that reads it best: exact values from text or a flat chart, never from depth or size alone; 2D available in the headset; two states comparable               | important | A flat ranked table and chart beside the graph                                   | Strong (Kotlarek 2020; Feyer 2024; Whitlock et al. 2020; a 184-experiment review: stereo helps depth tasks only)                                                                                                                                                                                                                                                                           | Read-the-value tasks; density comparison; "which edges appeared since last week" (study); audit for depth-only encodings (quick)                             |
| 4   | Occlusion is cheap to defeat and the reader keeps their bearings, including after a re-layout or filter                                                                                        | critical  | Grab-and-rotate plus reset view                                                  | Moderate (Zimmermann and Bruckner 2025; Sorger et al. 2021; Drogemuller et al. 2020)                                                                                                                                                                                                                                                                                                       | Time to find a named node in the densest community; orientation probes; "I'm lost" count; time to re-find the focus after a filter                           |
| 5   | The intended single node can be picked, even small and in a dense cluster; aim confirmed before commit; the press does not move the aim                                                        | critical  | Bubble or cone cursor with snapping                                              | Strong that plain rays fail on small dense targets (Argelaguet and Andujar 2013; SQUAD; Expand); Moderate: the button press caused about 30% of pointing errors (Wolf et al. 2020, N=16); Guideline: interactive targets at least 2.5-3 degrees across for both direct touch and ray (Meta hands UI guide; Microsoft asks at least 2 degrees at 45 cm by touch and 1 degree at 2 m by ray) | 20 named targets in a 1,000-node layout, half in the densest cluster, controllers and hands: error rate (target under 5%), time, errors at the commit moment |
| 6   | Sets can be selected and edited in 3D: region, structure (k hops, community), attribute; add, subtract, intersect                                                                              | critical  | Single pick plus add, plus "select neighbors/community"                          | Weak: no graph-specific headset study found                                                                                                                                                                                                                                                                                                                                                | Select a community minus two nodes; select about 30 nodes in a region without neighbors                                                                      |
| 7   | Multi-parameter commands without mid-air typing; exact numbers enterable; "this" and "these" resolve; interpreters show their parse and ask when unsure                                        | important | Panel form with dropdowns, keypad, virtual keyboard                              | Strong that typing must not be the only path (Grubert et al. 2018; Knierim et al. 2018); Weak for voice in this domain (Lee et al. 2026 preprint)                                                                                                                                                                                                                                          | Five parameter-heavy commands; five planted ambiguous requests, all answered with a question                                                                 |
| 8   | Fatigue budget for arms and hands over a 20-minute block                                                                                                                                       | critical  | Controller ray from a hand resting at lap or desk height                         | Strong (Consumed Endurance; Jang et al.); Moderate (Kim et al. 2020: preferred reach 0.3-0.6 m; VirtualDesk: seated desk work comfortable)                                                                                                                                                                                                                                                 | Consumed Endurance from tracking; share of time hand above elbow or beyond 0.6 m; Borg CR10 no more than 1 point above the desktop                           |
| 9   | Every change visible, previewable and undoable; modes visible                                                                                                                                  | critical  | Visible undo button and a change notice                                          | Moderate (Nafis et al. 2024: poor error handling was the main obstacle)                                                                                                                                                                                                                                                                                                                    | Audit: every action has a change indicator and one-step undo; time to notice and undo an injected wrong action; mode errors                                  |
| 10  | The whole catalog (about 60 algorithms, about 20 layouts, style options, third-party extensions) reachable in the headset with no XR-specific code                                             | critical  | A generated panel with forms from each option schema                             | Constraint                                                                                                                                                                                                                                                                                                                                                                                 | Share reachable; register a test extension and check it appears                                                                                              |
| 11  | Viewing comfort: reading content stable relative to world or body; 0-35 degrees below the horizon; near content budgeted                                                                       | important | World-locked panels at about 1.5 m, 10-20 degrees below eye level                | Strong (upward gaze: Penumudi 2020; vergence-accommodation conflict: Hoffman et al. 2008); Guideline for the bands and distances: panels meant to be touched at 42-46 cm, nothing interactive at 0.5-0.8 m, ray-driven UI at 0.8-3 m (Meta hands UI guide)                                                                                                                                 | Head pitch logs (under 5% of time above +10 degrees); time on near content (under about 25%); audit of panel distances against those bands                   |
| 12  | The UI does not hide the data being worked on                                                                                                                                                  | important | A movable panel docked beside the graph                                          | None specific (a tension)                                                                                                                                                                                                                                                                                                                                                                  | Share of the graph's projected area hidden by UI                                                                                                             |
| 13  | Label budget: how much is legible at once on the lowest-resolution headset (about 20 pixels per degree)                                                                                        | important | Labels for hovered, selected and top-N nodes at about 1 degree                   | Moderate (two studies disagree about 2x on preferred size, so size must be tested); Guideline: text no smaller than 0.35-0.4 degrees tall at 2 m and 0.4-0.5 degrees at 45 cm, comfortable at 0.6-0.75 degrees (Microsoft typography guide, from its own user research)                                                                                                                    | Audit: no text below 0.35 degrees; smallest label read on Quest 3S; labels legible at once in a 1,000-node view                                              |
| 14  | Honest about hidden state: every cut, filter, label cull or aggregation is counted, never applied to the selection or path                                                                     | important | A status line of filters and hidden counts                                       | Correctness requirement                                                                                                                                                                                                                                                                                                                                                                    | Plant a hidden edge and ask whether two nodes connect                                                                                                        |
| 15  | Interaction at 5,000-10,000 nodes, and a credible route from 100,000-1,000,000 nodes to a workable view                                                                                        | important | Filter by query to a neighborhood                                                | Domain need; no headset study                                                                                                                                                                                                                                                                                                                                                              | Repeat picking and set tasks at 5,000 nodes; walk a 100,000-node dataset to a named node                                                                     |
| 16  | Robust input: tracking loss, false pinches, noise, including in its own resting posture                                                                                                        | important | Controllers in good light                                                        | Guideline; Wolf et al. 2020                                                                                                                                                                                                                                                                                                                                                                | Tracking loss and false activations in the recommended posture                                                                                               |
| 17  | Two or more routes per frequent command; no color-only or audio-only signal; traversal by structure without sight                                                                              | important | Ray plus voice for frequent commands; a screen-reader list on a companion device | Guideline plus Shipped; Moderate on desktop (TADA 2024); Moderate: a head pointer, the usual no-hands route, is slower than a mouse in a headset (about 2.5 against 3.2 bits/s; Hansen et al. 2018, N=41)                                                                                                                                                                                  | Command-by-route matrix; core script hands-only, controller-only, voice plus one hand                                                                        |
| 18  | Entering, leaving, interruptions and the real world: under 30 s in and out on the same state; keyboard, phone and people visible                                                               | important | A "send to headset" link and passthrough                                         | Strong that very long immersion is costly (Biener et al. 2022)                                                                                                                                                                                                                                                                                                                             | Seconds in and out; answer a phone call mid-task and resume                                                                                                  |
| 19  | A silent, small-motion route for an open office and confidential names                                                                                                                         | important | Controller or pinch input with small movements                                   | Opinion and domain need                                                                                                                                                                                                                                                                                                                                                                    | "Would you use this at your desk at work?"; checklist                                                                                                        |
| 20  | Provenance: every action, including gestures and voice, is a replayable record                                                                                                                 | important | An action log of panel commands                                                  | Domain need (reproducible sessions)                                                                                                                                                                                                                                                                                                                                                        | Replay a headset session on the desktop and diff the state                                                                                                   |
| 21  | Learnable without a manual; the novice path rehearses the expert path                                                                                                                          | important | A labeled world-locked panel with tooltips                                       | Moderate for VR menus (Wentzel et al. 2024: raycast panels most consistently usable); Extrapolated (marking menus, Kurtenbach and Buxton 1994)                                                                                                                                                                                                                                             | First core task within about 5 minutes unaided; fast-route share by session 3                                                                                |
| 22  | The reader's own spatial arrangement persists; positions are reproducible                                                                                                                      | important | Named viewpoints and pins in a list                                              | Weak to Moderate (case studies); counter-evidence: Kotlarek 2020                                                                                                                                                                                                                                                                                                                           | Share of found nodes re-reached within 30 s after a break                                                                                                    |
| 23  | Presentable findings someone without a headset can follow                                                                                                                                      | important | Saved viewpoints played on a desktop mirror                                      | Moderate for mixed collaboration (Cordeil et al. 2017)                                                                                                                                                                                                                                                                                                                                     | Build a 5-stop walk; an observer answers questions about it                                                                                                  |
| 24  | Graph editing in the headset                                                                                                                                                                   | nice      | --                                                                               | Knowledge-engineer need                                                                                                                                                                                                                                                                                                                                                                    | Add three nodes and connect them                                                                                                                             |
| 25  | Delight                                                                                                                                                                                        | nice      | --                                                                               | Weak                                                                                                                                                                                                                                                                                                                                                                                       | UEQ hedonic scale, "would you show a colleague?", voluntary return                                                                                           |
| 26  | Transfer to and from the desktop app's concepts                                                                                                                                                | low       | --                                                                               | Kept low so it does not pull designs back to copying the desktop                                                                                                                                                                                                                                                                                                                           | Desktop users name the headset equivalents of five concepts                                                                                                  |

### Ranking axes

- **Differentiation**: does the option do a graph-analysis task better, or do something otherwise
  impossible, because the user has a body, two hands, stereo depth, a room, a real desk or an
  audience? Newness alone does not count.
- **Learning value**: how much uncertainty a prototype would remove. Options whose key claim rests
  on weak evidence, Low-confidence scores or unknown gate verdicts rank higher.

Prototype first what is high on both. High differentiation with low learning value is a build
candidate; low differentiation with high learning value is a cheap experiment worth running if it
de-risks a differentiating option.

---

## 4. What works and what does not in VR

### What the evidence supports

- **Stereo plus coupled motion for structure.** Head- or hand-coupled stereo let people understand
  graphs about three times larger than 2D; skilled observers traced paths in graphs up to about
  1,000 nodes (Ware and Franck 1996; Ware and Mitchell 2008; Strong, but on desktop stereo
  displays). Motion alone gives much of the benefit, which is why every comparison here is against
  desktop 3D with rotation, not only flat 2D.
- **Egocentric neighborhoods.** Standing at a node with its neighbors around you improved visual
  search without hurting orientation (Sorger et al. 2021; Moderate).
- **Sweeping the whole graph.** For a task that covered the entire visualization, the headset was
  more accurate and rated least frustrating (Huang, Pfister, Yang 2023, N=20; Moderate).
- **Supported arms and real surfaces.** Passive haptics from a real surface helped (Lindeman et al.
  1999, N=32); seated work at desk height was comfortable (VirtualDesk 2018); the shoulder load
  rises with reach and height (Kim et al. 2020; Penumudi et al. 2020).
- **A real keyboard with visible hands** brought novices close to desktop typing speed (Knierim et
  al. 2018, N=32); in the same setting a touchscreen keyboard kept only about 40-45% of desktop speed against
  about 60% for a physical one (Grubert et al. 2018, N=24).
- **Selection aids.** Bubble and cone cursors, depth rays and progressive refinement beat plain rays
  on small, distant, dense targets (Strong).
- **Raycast panels** were the most consistently usable VR menus; marking menus were fastest at two
  levels (Wentzel et al. 2024; Moderate). A panel was preferred over a radial menu, and placement
  mattered more than shape (IEEE Access 2019, N=51; Moderate).
- **Desktop plus headset** beat the headset alone (Tong et al. 2025, N=18; Moderate).
- **World-in-miniature** was the least demanding and preferred overview technique (Drogemuller et
  al. 2020; Moderate).

### What the evidence warns against

- **Reading values in a headset.** About 20-25 pixels per degree, perspective distorting size, and
  tilted text: "resolution beats immersion" (Munzner; Guideline). Exact values belong on text or a
  flat chart.
- **Comparison and memory.** VR was worse for side-by-side comparison (Huang et al. 2023); 2D was
  better for remembering nodes and spotting change (Kotlarek et al. 2020); 2D was best for density
  and patterns on large networks (Feyer et al. 2024). Immersive studies often report better
  accuracy with slower times.
- **Raised arms** (Consumed Endurance; Strong), **upward gaze** (Strong) and **near content that
  forces refocusing** (vergence-accommodation conflict, Hoffman et al. 2008; Strong).
- **The press moves the aim**: about 30% of pointing errors came from the button press itself
  (Wolf et al. 2020).
- **Head pointing is a floor, not a fast route.** In a headset, head pointing reached about 2.5
  bits/s and gaze pointing about 2.1, against about 3.2 for a mouse (Hansen et al. 2018, N=41;
  Moderate). That study had no controller condition; the "about 4 bits/s for controllers" figure
  sometimes quoted beside it was not confirmed here. The head-pointer route of the accessibility
  layer therefore needs targets of at least 2.5-3 degrees (the study's effective target widths were
  about 2.5 degrees for the head and 3 for the eyes).
- **Small text and near targets.** Below about 0.35-0.4 degrees text stops being legible (Microsoft
  typography guide); targets under about 2.5-3 degrees and panels in the 0.5-0.8 m middle distance
  are hard to hit (Meta hands UI guide). Panels meant to be touched belong at 42-46 cm.
- **Long immersion.** People who worked a week in VR rated it worse on most measures, and two
  withdrew on day one (Biener et al. 2022). Design for 15-30 minute excursions, not all-day use.
- **Voice that guesses.** In the one domain study, the language model coerced ambiguous requests
  instead of asking (Lee et al. 2026, preprint); speech and pointing are often not simultaneous
  (Oviatt 1999).
- **Vendor bets that did not stick.** Horizon Workrooms shut down in 2026 after weak adoption;
  Vision Pro returns cited work features no better than a monitor (Anecdote, press).

### Platform facts that decide whole families of options (to verify)

- No continuous eye gaze in any target browser; Vision Pro gives a gaze ray only at the moment of
  a pinch, as a `transient-pointer` (Constraint, WebKit). Meta's Immersive Web SDK 1.0 announced
  gaze-and-pinch for WebXR developers in September 2026 without saying which devices or browser
  versions support it (press report; verify), so this gate may loosen on Quest.
- Vision Pro WebXR reportedly has no passthrough (immersive-ar) as of visionOS 2.x (verify on
  visionOS 26).
- The Web Speech API is reportedly absent in the Quest browser; in desktop Chrome it sends audio
  to a server (verify). `getUserMedia` reportedly works inside a session if permission was granted
  on the page first (Babylon.js forum; report), which is what an on-device recognizer needs.
- The Quest system keyboard can be raised from a session (`XRSession.isSystemKeyboardSupported`,
  Quest Browser 26.1+; vendor guide), with swipe typing and dictation, but while it is up the
  session is `visible-blurred` and there are no per-key events. Bluetooth keyboards reportedly
  deliver ordinary key events during a session, except arrow keys on Quest 2 and Pro (developer
  reports; verify on Quest 3 and 3S).
- Files on Quest Browser (Chromium on Android): there is no save-location picker (the File System
  Access API is absent on Android Chromium; MDN), and saving a file the user keeps is a download
  into headset storage. An ordinary file input probably opens the system chooser, but whether a
  press inside VR counts as the user gesture it needs, and whether the chooser blurs or ends the
  session, is unverified. Fetching from or posting to a URL and the browser's own storage
  (IndexedDB, the origin private file system) work inside a session, so loading from a URL and
  autosave need no exit (engineering review; verify).
- Two defects in today's graphty-element block any leave-and-return flow. It does not notice when
  the system ends a session (the Meta button, or taking the headset off): its session manager
  clears its state only in its own exit call, so the next Enter VR fails with "An XR session is
  already active". And it always requests a `local-floor` reference space, although its
  configuration accepts `bounded-floor`, and builds a new XR helper on every entry, so the graph's
  place in the room is lost on re-entry. Each is an element fix of about a day.
- Still unknown: whether mouse and switch events reach an immersive session; gamepad touch flags;
  hand tracking in resting postures; quad layers outside Quest (Android XR's WebXR page does not
  list Layers); whether thumb microgestures reach WebXR (sources disagree).
- No DOM in immersive sessions (DOM overlay is for handheld AR only): HTML panels must be drawn to
  a texture.

---

## 5. The option catalog, condensed

Every option found or invented, one line each, so the breadth is visible. The full catalog, with
how each option works, what the user sees, its evidence and its sources, is
[the VR interaction option catalog](vr-interaction-option-catalog.md); option numbers match. Marks: **[R]**
researched or shipped elsewhere (studied, prototyped or in a product); **[A]** a known idea given a
new use or twist here (for example a shipped game mechanic applied to graph analysis); **[I]**
invented here, no prior art found, no evidence.

| Family                                                      | Options | R       | A      | I       |
| ----------------------------------------------------------- | ------- | ------- | ------ | ------- |
| 1. Pointing and selection                                   | 20      | 19      | 0      | 1       |
| 2. Reach, grab and manipulation                             | 11      | 8       | 2      | 1       |
| 3. Navigation, scale and locomotion                         | 21      | 14      | 3      | 4       |
| 4. Hand-held palettes and tool panels                       | 21      | 7       | 0      | 14      |
| 5. Wrist, palm, forearm and finger menus                    | 13      | 10      | 1      | 2       |
| 6. Radial, marking and controller-button menus              | 12      | 9       | 1      | 2       |
| 7. Hand gestures and microgestures as commands              | 11      | 6       | 2      | 3       |
| 8. Body-anchored storage and tool locations                 | 10      | 5       | 2      | 3       |
| 9. Lenses and hand-held analysis tools                      | 17      | 7       | 2      | 8       |
| 10. Graph-native physical metaphors                         | 21      | 2       | 6      | 13      |
| 11. Algorithms as visible physics and creatures             | 10      | 1       | 1      | 8       |
| 12. Filtering, thresholds and neighborhood depth            | 12      | 0       | 2      | 10      |
| 13. Paths, relations, patterns and reading results          | 19      | 4       | 2      | 13      |
| 14. Alternative graph worlds and representations            | 34      | 18      | 13     | 3       |
| 15. Haptic, audio and other non-visual channels             | 12      | 5       | 3      | 4       |
| 16. Voice commands and speech input                         | 16      | 10      | 4      | 2       |
| 17. Natural language, conversation and generative UI        | 14      | 9       | 3      | 2       |
| 18. AI agents in the space                                  | 19      | 4       | 7      | 8       |
| 19. Text entry                                              | 5       | 4       | 1      | 0       |
| 20. Commands and operations as objects                      | 13      | 2       | 2      | 9       |
| 21. Rendered HTML plumbing                                  | 7       | 7       | 0      | 0       |
| 22. Panel placement and window management                   | 22      | 18      | 0      | 4       |
| 23. Desk, room and floor                                    | 13      | 5       | 3      | 5       |
| 24. Physical props, tangibles, stylus and extra controllers | 21      | 11      | 4      | 6       |
| 25. Multi-device and cross-device                           | 10      | 6       | 4      | 0       |
| 26. Body, eye and brain sensing                             | 12      | 6       | 3      | 3       |
| 27. History, saving and provenance                          | 11      | 4       | 2      | 5       |
| 28. Collaboration and shared sessions                       | 18      | 6       | 11     | 1       |
| 29. Accessibility                                           | 22      | 9       | 13     | 0       |
| **Total**                                                   | **447** | **216** | **97** | **134** |

The marks were assigned from each option's recorded origin. "Researched" says only that prior art
exists, not that it was shown to work for graphs or in a headset; most of the graph-specific
options have no evidence at all.

**1. Pointing and selection**

- 1.1 Plain ray-cast with trigger [R]: Straight ray from the controller; the first hit highlights; trigger selects.
- 1.2 Depth ray / RayCursor [R]: A marker slides along the ray via thumbstick or touchpad; the nearest pierced object to the marker is the candidate.
- 1.3 3D bubble cursor [R]: A capture sphere grows until it touches exactly one target, so it never misses.
- 1.4 Flashlight / aperture cone [R]: A cone instead of a ray; the object closest to the axis wins; cone width adjustable.
- 1.5 Progressive refinement (SQUAD) [R]: Sphere-cast a coarse set, then split it into quarters on a flat 2x2 menu until one remains.
- 1.6 Scored sticky ray (IntenSelect, bent ray) [R]: Objects near the ray accumulate a score over time; the ray bends to the winner; tolerates tremor and moving targets.
- 1.7 Adaptive ray filtering and expanding targets [R]: 1 euro filter smoothing scaled by hand speed; hit areas expand near the ray.
- 1.8 Topology cursor (graph-aware stick hopping) [I]: Anchor on a node with the ray; thumbstick flicks hop along neighbors or BFS layers instead of moving through space.
- 1.9 Hand ray plus pinch [R]: A ray from the shoulder through the palm; pinch selects, pinch-drag moves; a two-hand drag zooms slates.
- 1.10 Gaze selects, hand acts (gaze + pinch) [R]: Look at a node and pinch with the hand anywhere (at rest); after the pinch, hand motion manipulates the target.
- 1.11 Semi-pinch multi-select [R]: While half-pinched, add each looked-at node by dwell or swipe; completing the pinch commits the set.
- 1.12 Image-plane selection: head crusher, framing hands, sticky finger [R]: Select what appears between pinching fingers, or inside a two-hand frame, as seen from the eye.
- 1.13 Volumetric brush, lasso, crossing and slab selection [R]: Sweep a sphere brush to paint a selection, draw a mid-air lasso loop or a crossing stroke with a controller or pinched fingertip, span a box between the hands, or cast a ...
- 1.14 Reference plane with drop lines [R]: Each node drops a stem to a shared plane; users point at the 2D plane instead of the 3D cloud to avoid depth ambiguity.
- 1.15 Poke with the index fingertip [R]: The extended index finger presses nodes or buttons; a shallow push is hover, a deep push is press; a swipe scrolls.
- 1.16 Hand proximity as hover (proximity glow, poke-the-bubble) [R]: Labels, values and neighbors bloom as a hand nears a node, and interactables glow on approach; pinch commits.
- 1.17 Head-gaze reticle with dwell or a single confirm button [R]: A reticle fixed at the center of the view is aimed by turning the head.
- 1.18 Mouse or trackpad driving a 3D cursor in the immersive scene [R]: A Bluetooth mouse or laptop trackpad drives a cursor that slides over the graph's surfaces at the depth of whatever it is over, so precise 2D motion selects 3D nodes.
- 1.19 Eye-and-head combined pointing (head refines what the eyes point at) [R]: Eye gaze makes a quick rough pick and a small, separate head turn nudges the cursor or confirms it.
- 1.20 Gaze-depth (vergence) selection of occluded nodes [R]: The eyes converge at a different depth for a near node than for the node behind it.

**2. Reach, grab and manipulation**

- 2.1 Go-Go arm extension [R]: The virtual hand follows 1:1 near the body and extends non-linearly beyond about 2/3 of arm length.
- 2.2 HOMER / scaled HOMER [R]: A ray selects, then the virtual hand jumps to the object for manipulation; velocity scaling for precision.
- 2.3 Fishing reel / telekinetic distance grab [A]: After a ray select (or a finger-pointed reticle), grab holds the distant object on an invisible rod.
- 2.4 Gravity-glove pull / flick-to-summon [R]: Point roughly at a distant object (it glows), trigger locks it, a wrist flick arcs it into the palm on a physics trajectory, grip catches.
- 2.5 PRISM precision manipulation [R]: The control/display ratio drops when the hand moves slowly.
- 2.6 Voodoo dolls [R]: Hand-held miniature copies; the off-hand doll is the reference frame and the dominant doll moves the real object relative to it.
- 2.7 Direct grab and pinch of nodes [R]: Reach into the graph and grab (whole hand) or pinch (precise) a node to move or pin it; connected edges stretch and the layout reacts.
- 2.8 Throw and fling to route results [A]: Throw nodes or result cards to targets: inspect panel, bin, compare tray, export.
- 2.9 Consequence gestures (crush, toss, pocket) [R]: Accept by crushing in the hand, discard by tossing over the shoulder, keep by pocketing.
- 2.10 Magnetic snap with haptic click [R]: Pieces chunk together when close, with a haptic click and sound.
- 2.11 Petri dish / cupped-hand subgraph holding [I]: Cup a hand under a selection, or pinch-pull it, to lift a hand-sized isolated copy into a dish held in the off hand.

**3. Navigation, scale and locomotion**

- 3.1 Two-hand grab-the-world (handlebar, tabletop) [R]: Both grips (or pinches) form a handlebar: moving both translates, spreading apart scales, turning rotates; one-hand grip pulls the world.
- 3.2 Spindle-and-wheel bimanual 7DOF [R]: A virtual axle between the hands; the midpoint is the pivot; twisting adds roll.
- 3.3 One-handed flying / steering [R]: Fly where the controller points; analog trigger sets speed.
- 3.4 Node-hop teleport [A]: The teleport arc can only land on nodes; you stand inside a node looking along its edges.
- 3.5 World-in-miniature (WIM) [R]: A small copy of the graph sits on or in the off hand (or on a plate).
- 3.6 Room-scale graph you walk through [R]: The graph surrounds the user at room size and walking is the navigation.
- 3.7 Become a giant or an ant (god scale to human scale) [R]: The user scales themself while walking keeps working (eye separation scales with body size), or jumps between a desk-scale model and human scale to walk inside, then pops ...
- 3.8 Step inside a node (ego-bubble) [R]: Teleport onto or enter a node.
- 3.9 Wear the node (ego-suit) [I]: Pull a node to the chest to become it.
- 3.10 Walk inside a node (node as a room) [I]: Each node is a room with its attributes on the walls; each edge is a labeled doorway leading to the neighbor's room.
- 3.11 Portals [R]: A frame shows another region, layout or filter of the graph; you can reach through it or step through it.
- 3.12 Graph bigger than the room (redirected walking) [R]: Subtle rotation/translation gains or overlapping layouts let the user keep walking through a graph larger than the room.
- 3.13 Walk through time [I]: Time is laid along the floor; walking forward moves through the states of a dynamic graph.
- 3.14 Hand-over-hand climbing along edges [R]: No stick locomotion: grab geometry and pull your body, push off to drift; head motion tied 1:1 to the grabbing hand.
- 3.15 Ride the path (on rails, grapple along edges) [A]: You are carried along a path from node to node on a fixed track at a steady pace while the body is free, choosing branches at junctions by gaze, or you grapple yourself ...
- 3.16 Out-of-body third-person travel [R]: Step out to a third-person view, place the avatar, snap back in; Moss frames the world as a diorama you guide a character through.
- 3.17 Time moves only when you move [R]: The world advances only as fast as the body moves; stillness freezes it.
- 3.18 Best-view compass [R]: A sphere colored by how readable the graph is from each direction; point at a bright spot to fly there.
- 3.19 Attention gravity [I]: Regions looked at for a sustained time slowly pull toward the user and enlarge; ignored regions recede; palms-out freezes the layout.
- 3.20 Leaning and walk-in-place locomotion devices (head-joystick lean, balance board, omnidirectional treadmill) [R]: Leaning the head or torso away from a neutral spot works like a joystick, speed growing with the lean.
- 3.21 Edge signposts (information scent on every outgoing edge) [A]: While the user is focused on or standing at a node (3.8 or plain selection), each incident edge carries a small signpost near its far end summarizing what lies beyond it ...

**4. Hand-held palettes and tool panels**

- 4.1 Off-hand painter's palette (two-handed palette and brush) [R]: Panels of tools, brushes, colors and options are attached to the non-dominant controller or hand.
- 4.2 Rotating prism or cube palette [R]: The off-hand palette is a prism or cube; a wrist turn or swipe reveals the next face.
- 4.3 Detachable, dockable (tear-off) panels [R]: A panel that lives on the hand can be torn off by its title bar or edge, pulled into space, scaled, parked anywhere in the room, and docked or sent home later.
- 4.4 Pen and pad (Personal Interaction Panel, hand-held tablet) [R]: A tablet or notebook panel in the off hand (virtual, or a tracked physical paddle with real edges for passive haptics) carries 2D widgets.
- 4.5 Pop-out tool tray [R]: Pushing the support hand's thumbstick forward pops out a tool tray; the tool hand picks a tool and the tray collapses.
- 4.6 Tabbed maker palette attached to a tool [R]: A pen tool owns a tabbed palette (shapes, colors, chips, settings); pick an item, then pull the pen's trigger to apply it.
- 4.7 Off-hand peephole display [R]: A phone-like panel rigid on the off hand shows a detail view or the existing 2D UI.
- 4.8 Palette that is a miniature of the graph [I]: The off-hand palette shows the whole graph in miniature; touch it to fly there, drag a box to select, rotate it to rotate the big graph.
- 4.9 Lenticular question card [I]: Wrist tilt picks the face.
- 4.10 Gaze-faced palette [I]: The face shown on the off hand follows what you look at (edge, cluster, empty space, label); glancing at the palette freezes it.
- 4.11 Grip-depth palette [I]: Squeeze level of the analog grip (or pinch aperture) goes from families to members to parameters; releasing backs out one level.
- 4.12 Set swatches [I]: Selections become swatches; overlapping two gives the intersection, pulling apart the union, pushing one through another the difference; dip a finger to re-select.
- 4.13 Distribution palm [I]: A face holds histograms of attributes and results.
- 4.14 Pocket shelves [I]: Drag column or result chips into visual-channel slots (color, size, height, label, edge width); holding a chip over a slot previews.
- 4.15 Stretch scroll [I]: Pull the hands apart to stretch a band; hand distance sets how much of the catalog is shown, from 6 families to every algorithm.
- 4.16 Walkie-talkie palette [I]: Raise the palette to the mouth to open the mic; speech becomes a previewed card; lower the hand to confirm, flick to cancel.
- 4.17 Catalog as a graph [I]: A face opens into a small graph of algorithms linked by family, inputs and "often run after"; explore it with the same gestures used on data; pick a node to run it.
- 4.18 Ephemeral next-step palette [I]: Three predicted next steps light at once; everything else stays in its fixed place and fades in after about 500 ms; nothing moves.
- 4.19 Feel-it palette [I]: Wrist roll or stick steps through families, each with its own vibration rhythm and sound; items tick with rising pitch; eyes never leave the graph.
- 4.20 Lap slate [I]: Drop the palette and it lands on the thigh, desk or chair arm, growing to tablet size; touching the real surface clicks; lift the hand to pick it back up.
- 4.21 Saturn ring [I]: A desk-height ring around a tabletop graph is the palette; turn it to bring a segment near; take tools off it into the graph; several people share it.

**5. Wrist, palm, forearm and finger menus**

- 5.1 Palm-up hand menu [R]: Turning or raising the non-dominant flat palm toward the face summons a small panel or card of 3 to 6 large buttons beside the palm (pinky side), billboarded toward the ...
- 5.2 Wrist watch face (status and quick actions) [R]: A watch-face panel on the wrist is revealed by the check-the-time gesture (wrist turn or glance); a small menu can bloom over it and the other hand picks.
- 5.3 Wrist computer with a pull-out screen [R]: A forearm device wakes when the arm is raised; swiping scrolls it, and the other hand can pull out a larger holographic screen.
- 5.4 Wrist-twist split menu [R]: Turning the off-hand palm down shows navigation tools; palm up shows session actions; the direction of the twist is the first menu choice.
- 5.5 Same-hand gaze and wrist menus (Look & Turn, PalmGazer) [R]: Eyes pick an item on a hand-attached menu, and turning that same wrist navigates or sets a continuous value.
- 5.6 Forearm HUD with wrist-orientation modes [R]: The forearm acts as a long display; arm rotation swaps panels; the other hand pokes with passive support from the arm.
- 5.7 Forearm rail / ruler slider [A]: Sliding a dominant finger along the off forearm on real skin sets a value (wrist = min, elbow = max) with an attribute histogram drawn along the arm.
- 5.8 Palm scribble [I]: Write 1-2 letters on the off palm; ranked commands, nodes and attributes rise from the palm; a thumb tap picks.
- 5.9 Analyst's glove [I]: Finger segments hold 12 verbs, the palm is search or distributions, the forearm is the parameter slider, palm-down shows status (selection count, filters, layout, undo depth).
- 5.10 TULIP finger menu [R]: Three items are bound to the index, middle and ring fingers; a finger-to-thumb pinch selects; the pinky pages to the next three; remaining items show on the palm.
- 5.11 Phalanx keypad (finger-segment keypad) [R]: The thumb of the off hand taps one of 12 finger segments like a phone keypad to fire a slot.
- 5.12 Finger-count menus [R]: The number of fingers held up on the left hand picks one of 5 menus; on the right hand, one of 5 items.
- 5.13 Touch and tap on the headset itself [R]: The headset's own shell is a command surface that is always there and found without looking: a tap for undo, a swipe along the side to scrub history, a press on the front ...

**6. Radial, marking and controller-button menus**

- 6.1 Radial (pie) menu [R]: A button, thumbstick touch or pinch opens a ring of 4-8 wedges around the hand or controller.
- 6.2 Marking menu (novice pops the pie, expert flicks blind) [R]: Hold a button or pinch and make a directional stroke (a zig-zag for submenus); the pie appears only if the user hesitates.
- 6.3 Drum menu (bimanual) [R]: A bimanual pie-menu derivative with commands on a drum or two concentric rings; each hand's stick picks one menu level simultaneously, or selection is by stroke or pointing.
- 6.4 Ring and spin menus [R]: Items sit on a ring around the hand and a wrist twist rotates the ring under a fixed hotspot; the Spin Menu adds a precision filter and stacked rings for hierarchy.
- 6.5 Command and Control Cube [R]: A 3x3x3 grid of cells around the hand: move into a cell and release to select.
- 6.6 Hover/dwell arc menu [R]: An arc-shaped hierarchical menu attached to one hand; any cursor selects an item by dwelling near it, with no click.
- 6.7 Game item wheel with slowed time [R]: Holding a button opens a large radial wheel and slows or pauses time; releasing toward a slot equips it.
- 6.8 Control menus, FlowMenu, tracking menus [R]: One stroke picks a command and then sets its value (control menu).
- 6.9 Chorded buttons [R]: A held modifier (grip or B) remaps trigger, stick and A.
- 6.10 Capacitive touch-to-preview [A]: Resting the thumb on a button previews its effect as ghosts; pressing commits, lifting cancels.
- 6.11 Say it or flick it marking menu [I]: Every wedge has a spoken name; flick, say the word while the menu is open, or say it with no menu at all; the gesture and the word teach each other.
- 6.12 Node-centered marking menu aimed at real neighbors [I]: The menu blooms around the touched node with wedges pointing at its actual neighbors; flicking toward one walks to it; generic commands fill the gaps.

**7. Hand gestures and microgestures as commands**

- 7.1 Thumb-to-finger microgestures (hand or smart ring) [R]: With the hand relaxed (even in the lap), the thumb taps or swipes four ways along the curled index finger like a tiny D-pad; rings can sense it with fields, proximity or IMUs.
- 7.2 Microgestures with busy hands (middle/ring/pinky) [R]: Microgestures on the other fingers while the index is pinching or holding.
- 7.3 Symbolic stroke gestures (gesture-traced commands) [R]: Draw a symbol or shape in the air; a $-family point-cloud recognizer maps it to a command; strokes over nodes take those nodes as arguments.
- 7.4 Static poses and sign-like shortcuts [R]: Snap, thumbs-up, open palm or fist, combined with gaze or pointing for a target.
- 7.5 User-recorded gesture macros [A]: Record a pose or stroke three times and bind it to a command or an analysis sequence.
- 7.6 EMG wristband (microgestures and finger handwriting) [A]: Surface EMG reads forearm muscle signals: subtle pinch, thumb taps and swipes, scroll, and finger-written letters on any surface, with hands down.
- 7.7 Rhythm taps [I]: Frequent commands are tap rhythms on a node or via pinch timing (double = expand, long-short = hide, triple = pin).
- 7.8 Noun hand, verb hand [I]: The off hand holds scope chips (node, neighbors, 2 hops, community, selection, all).
- 7.9 Stenographer's hands [I]: A left-hand chord picks the command family and a right-hand chord picks the member, covering about 80 commands.
- 7.10 Graph-specific elicited gesture vocabulary (method) [R]: Adopt the highest-agreement gestures that analysts invent for each graph operation.
- 7.11 Head gestures as commands (nod, shake, tilt) [R]: Head motion patterns read from the head pose WebXR already exposes: a nod confirms, a shake cancels or undoes, a tilt steps through options or adjusts a value.

**8. Body-anchored storage and tool locations**

- 8.1 Holsters, belt and body slots [R]: Tools live at fixed places on the body (hips, belt ring, chest, shoulders, back).
- 8.2 Over-the-shoulder store and throw-away [R]: Reaching over the shoulder always yields exactly one kind of thing (the clipboard, the undo stack, a saved view or selection).
- 8.3 Pull-down menus overhead and virtual shelves [R]: Menus are hidden above the field of view and pulled down by hand.
- 8.4 Context-adaptive toolbelt [I]: Holster positions are fixed but their contents change with the selection: view tools when nothing is selected, neighbor and path tools for one node, community and export ...
- 8.5 Body pouches (pockets for selection sets) [I]: Toss or stow selections into colored pouches worn on a belt, forearm or body pocket zones; each pouch is a named set.
- 8.6 User-authored body map [A]: In a mirror view the user places commands on spots of their own body, then touches a spot to run its command.
- 8.7 Shoulder-perched inspector [A]: A tag-along detail card at the edge of view (about 30 to 45 degrees off center); a glance reads it and a grab enlarges it.
- 8.8 Living toolbox companion [R]: A floating creature carries tools and follows you; pluck tools off it.
- 8.9 Helmet portal to a menu world [R]: Put a helmet on your head to go to a separate room for saving, loading and browsing; take it off to return.
- 8.10 Algorithm lenses in a quiver [I]: Each algorithm family is a lens kept in a quiver over the shoulder.

**9. Lenses and hand-held analysis tools**

- 9.1 Magic lens (hand-held, on controller, or as a panel) [R]: A hand-held frame, magnifier or hand mirror re-renders what is seen through it (labels, another layer or algorithm result, hidden or filtered edges, another layout, x-ray).
- 9.2 Toolglass / click-through tool sheet [R]: The off hand holds a transparent tool sheet; the dominant hand clicks through a tool onto the object behind it; lens regions re-render what is seen through them.
- 9.3 Algorithm flashlight [I]: The beam carries an algorithm; lit nodes show its result; trigger freezes it into a style layer.
- 9.4 Gel-wheel flashlight [I]: The off hand casts a cone from the waist; wrist roll turns a wheel of algorithm-preview gels shown only inside the cone; pinch commits to the whole graph.
- 9.5 Intent lens [A]: A hand-held lens whose contents the agent re-renders per spoken intent; outside the lens is unchanged; several lenses allow comparison.
- 9.6 Hand-held slicing / section / filter plane [R]: Grab a transparent plane (virtual, or a tracked flat prop) and move or twist it through the graph: only nodes in the slab around it are shown in focus and selectable, or ...
- 9.7 Scalpel, pruning shears, snip-and-ghost (what-if cutting) [I]: Slash through edges with a blade, hold a two-handed cutting plane, use a scissors pose or tool to cut an edge, or a fist to remove a node.
- 9.8 Hand-held EdgeLens (part the curtain) [R]: A lens on the palm bends edges out of the way without moving nodes; two hands part the edges like a curtain.
- 9.9 3D fisheye / semantic lens bubble [R]: A bubble held in the hand magnifies the graph inside it and squeezes the surroundings; variants filter by attribute or adapt to how crowded the graph is.
- 9.10 Multi-focus probes [R]: Cast or place several probe spheres into the graph.
- 9.11 Two-controller calipers [I]: Touch node A with the left hand and B with the right; the live path, distance, flow and common neighbors appear.
- 9.12 Style brush and eyedropper [A]: Paint a chosen style onto nodes, creating a style layer; an eyedropper copies styles.
- 9.13 Brush loaded with operations [I]: Dip the brush into a palette swatch to load an operation (select, hide, color by attribute, pin), then paint across nodes.
- 9.14 Beekeeper's smoker [I]: Puff smoke into a region and its edges and labels fade so you can see occluded nodes; the smoke drifts away and the graph restores itself.
- 9.15 Metal detector [I]: Pick a target score.
- 9.16 Fishing cast (spatial search) [I]: Give a voice or typed query as the bait, then cast it in a direction.
- 9.17 Inspect tool with property sheet and issue pins [R]: Point the inspect tool at an element to show its properties; mark issues in place.

**10. Graph-native physical metaphors (pull, pluck, sculpt, fold)**

- 10.1 Pull a node: neighbor reel, leash, pull-to-expand [A]: Grab or pinch a node and pull it toward you.
- 10.2 Edge plucking and strumming [A]: Hook a bundle of edges and pull it sideways while the nodes stay put; release and the edges spring back with a wobble.
- 10.3 Edge harp [I]: A node's edges fan out like harp strings sorted by weight; strum to hear and highlight neighbors; pinch a string to follow it.
- 10.4 Edge combing [I]: Stroke an open hand through edges: the edges it passes through are pulled into a braid along the stroke.
- 10.5 Taut threads [I]: Grab and pull one edge; all edges of the same type or value go taut and bright while the rest sag and dim; pull distance is a similarity threshold; pluck to release.
- 10.6 Strings and magnets (attribute magnets) [A]: Place magnets labeled with an attribute or algorithm result; nodes are drawn toward each magnet by their value while edges stay attached like strings.
- 10.7 Sculpt the layout with your hands [R]: The force layout runs live while you drag, stretch, pin and squash parts of the graph: a flat hand pushes nodes, a cupped hand gathers them, two hands pry clusters apart.
- 10.8 Fingertips as layout pins (puppeteer) [I]: Up to ten nodes are pinned to fingertips while the layout re-flows as the fingers move.
- 10.9 Warm hands, cold hands [I]: The warm hand reheats the force simulation locally and the cold hand freezes and pins regions, so one tangled cluster can be re-laid out while the memorized arrangement ...
- 10.10 Conductor's baton [I]: Beat tempo to set simulation speed; point and raise at a community section to give it space and labels; a fist cutoff freezes the layout; palm-down dims a section.
- 10.11 Knot and untangle (twist to reduce crossings) [I]: Twist a region with two hands to re-lay it out locally with fewer crossings; the rest of the graph stays fixed.
- 10.12 Shake to reveal (wiggle highlighting) [A]: Shake the controller at a node and its k-hop subgraph oscillates in place.
- 10.13 Squeeze, pour and tear communities [I]: Each community is a liquid hull.
- 10.14 Fold and unfold communities [A]: Cup a community in both hands to fold it into a meta-node pod; open the hands to unfold it; twist to step between hierarchy levels.
- 10.15 Potter's thumbs (constrained community detection) [I]: Communities show as clay blobs.
- 10.16 Fold the space / crease [I]: Pinch two nodes, two communities, or two versions of a graph and bring the hands together (or draw a crease between them).
- 10.17 Tug the live simulation [R]: Grab nodes in a running simulation and pull; the structure responds in real time; multi-user.
- 10.18 Tug-of-war min cut [I]: Pull two groups apart with two hands; the edges of the minimum cut stretch and snap with a haptic click.
- 10.19 Stitching [I]: A pinch on a node turns the fingertip into a needle.
- 10.20 Blow to spread [I]: Microphone amplitude in the head direction is a wind force that spreads nodes in the breath cone and lets them settle.
- 10.21 Inverse manipulation: drag the result, and the model or data answers [A]: The user moves the OUTPUT instead of setting inputs.

**11. Algorithms as visible physics and creatures**

- 11.1 Algorithm creatures [I]: Release an algorithm onto a node as a creature: BFS fireflies, a Dijkstra explorer, PageRank walkers piling up, community flocks, flow as water.
- 11.2 Pinball random walkers [I]: Launch balls that random-walk the graph, with a tilt knob setting the teleport rate.
- 11.3 Firefly lantern [I]: Open a cupped hand to release random walkers from a node.
- 11.4 A creature that walks the graph [A]: Guide a small character through a diorama; attention follows it.
- 11.5 Gravity well centrality [I]: Nodes weigh down a rubber sheet by centrality; dropped balls roll along edges and pool in the heavy nodes.
- 11.6 Ripple stone (BFS by dropping) [I]: Drop a node like a stone; a wave colors nodes by hop distance; two stones show the band equidistant from both.
- 11.7 Algorithm rope [I]: Pull a rope out of a seed node.
- 11.8 Pitcher, pipes and hand valves (flow) [I]: Edges are pipes, thick by capacity and filled by flow.
- 11.9 Flowing particles along edges [R]: Particles stream along edges in their direction; speed and density show flow, weight or time.
- 11.10 Tuning fork (structural similarity) [I]: Strike a node and it hums.

**12. Filtering, thresholds and neighborhood depth**

- 12.1 Rising tide (tide filter) [I]: A water plane sets a threshold on a metric.
- 12.2 Gold pan / sieve [I]: Scoop the graph or a region into a handheld pan or sieve whose mesh size is a threshold (finger spread, twist, rim dial or stick).
- 12.3 Two-hand span as a range [I]: The distance between facing palms or controllers sets a value range on an attribute, with the histogram drawn between them; nodes outside it fade live.
- 12.4 Two-hand accordion parameter [I]: After a command is chosen, the distance between the hands sets its value with the graph updating live; a pinch commits.
- 12.5 Twist and squeeze parameter knobs [A]: Pinch and twist the wrist like a dial; squeeze switches coarse/fine; results update live.
- 12.6 Analog trigger as dial (squeeze to expand) [I]: Trigger or grip travel maps to hops, threshold, k or opacity while held.
- 12.7 Hold to deepen [I]: Touch and hold a node; each beat, with a haptic tick, lights the next hop ring; release at the wanted depth to select; pull back to shrink; the same works for paths and radii.
- 12.8 Finger hops [I]: Point at a node and hold up k fingers on the other hand to light its k-hop neighborhood, each hop ring in its own shade; a fist clears it; works on a selection too.
- 12.9 Archer's draw (k-hop selection) [I]: Aim with the off hand and draw back with the dominant hand; draw length sets hop count with preview rings on the target; release selects; arrows stay in nodes as bookmarks.
- 12.10 Simmer and reduce (coarsening) [I]: Turning a heat knob up merges tight clusters into supernodes (the pot level drops); down restores detail; ladle one supernode onto a plate to expand only it.
- 12.11 Grow from a seed [A]: Plant one node and squeeze to grow rings of the most interesting neighbors; snip branches you do not want.
- 12.12 Peel the onion (k-core shells) [I]: Nodes sit in shells by k-core number; peel the outer shells off and lay them on the floor to expose the core.

**13. Paths, relations, patterns and reading results**

- 13.1 Thread the needle (draw a path) [I]: Draw a stroke in the air between two nodes.
- 13.2 Rubber-band path [I]: Stretch a band from source to target and it snaps onto the shortest path.
- 13.3 Pin-and-reach paths [I]: The off hand anchors a node; dominant-hand hover shows the live shortest path; pinch keeps it.
- 13.4 Graft (how are these related?) [I]: Drop node A onto node B.
- 13.5 Point at nothing (select absence) [I]: Grab an empty gap between groups.
- 13.6 Raised arcs by edge length [R]: Long edges rise as arcs whose height matches their length, so they separate from local edges.
- 13.7 A hand full of neighbors [I]: The top five neighbors of the current node map to the off-hand fingertips; a thumb tap makes that neighbor current (path walking by taps); a finger curl previews that branch.
- 13.8 Planetarium of a selection [I]: Raising both arms makes the current selection the floor.
- 13.9 Node River [I]: Nodes ordered by a chosen metric peel off the graph into a slow stream passing in front of the user, tethered to home positions.
- 13.10 Volunteer nodes [I]: After each action, 3-5 interesting next nodes drift toward the user with an idle motion that encodes why (outlier wobble, reaching for a missing link, bridge shape).
- 13.11 Heliotropic nodes [I]: Nodes matching the current question turn to face the user and keep tracking them as they walk.
- 13.12 Meadow [I]: Algorithm values grow as stems on the nodes.
- 13.13 Linked 1D strip beside the 3D structure [R]: A sequence strip linked to the 3D structure; drag a span to select; toggle interaction types; voice assistant.
- 13.14 Constellation sketching (motif search) [I]: Draw a small pattern in the air and every place it occurs in the graph lights up.
- 13.15 Sculpt the question [I]: Pinch clay lumps into nodes, pull threads into edges, squeeze for high degree, dip into color for an attribute.
- 13.16 Explicit difference encoding (superimposed diff graph) [R]: Comparing two graphs (two versions, two filters, before and after an edit or what-if) shows one union graph: added elements glow in one color, removed ones appear as ...
- 13.17 Sorting bins: teach a node classifier by example [A]: Drop a few example nodes into two or more labeled bins ("suspicious" / "normal"; "hub" / "not a hub").
- 13.18 Metro-map schematic for paths and sets [R]: A shortest path, k paths, or overlapping groups are redrawn as a transit map: each path or set is a colored line, nodes are stations, the drawing straightened to a few ...
- 13.19 Predict, then reveal (commit a guess before the algorithm answers) [A]: Before an algorithm's result is painted, the user commits a prediction in space: pin the nodes they think are most central, sketch the path they expect, or lasso the ...

**14. Alternative graph worlds and representations**

- 14.1 Graph as terrain [A]: Height is a node metric, so communities become peaks; raise a water level to flood out everything below a threshold.
- 14.2 Graph as city [R]: Communities are districts and nodes are buildings sized by metrics; edges are roads or cables you walk along.
- 14.3 Graph as galaxy [R]: Nodes are stars and communities are clusters; constellation lines appear only nearby; warp along long edges; a telescope shows far links.
- 14.4 Surround sphere / dome [R]: The graph is projected onto a sphere around you; pull a community down from the dome into a detail view.
- 14.5 Hyperbolic world [R]: Lay the graph out in 3D hyperbolic space: whatever is in focus is full size and the rest shrinks toward a boundary; drag to re-center.
- 14.6 Layer deck (multilayer stacks) [R]: Edge types, time snapshots or algorithm results sit on stacked glass plates; fan the deck, or pull a plate out.
- 14.7 Squeezable time cube [R]: A dynamic graph is a cube with time as its depth; rotate it, squeeze it to merge periods, slice it to see one moment.
- 14.8 3D triangle matrix [R]: An adjacency cube in which each cell is a closed triad; reorder it by community and pull out dense blocks.
- 14.9 Layout morphing dial [R]: Turn a dial to morph the graph between two layouts; nodes that travel far are the surprising ones.
- 14.10 Walk between layouts [I]: Layouts are pinned to floor spots.
- 14.11 DJ crossfader [I]: Two decks each hold a layout, an algorithm result or a saved view.
- 14.12 Snow-globe seeds [I]: The layout lives in a palm-size globe.
- 14.13 Matrix views: linked adjacency matrix, NodeTrix tiles and pull-out matrix slabs [A]: A 2D adjacency matrix, reordered by community or a metric, sits as a panel or a floor or wall surface beside the 3D node-link graph, with brushing linked both ways.
- 14.14 Small multiples shelf and parameter-sweep gallery [A]: Several miniature copies of the same graph, each showing a different algorithm result, layout, time step or filter, sit on a curved shelf or grid around the user.
- 14.15 View-managed labels with leader lines [R]: A view-management solver lays labels out each frame instead of floating them at the nodes: they avoid overlap and occlusion, keep a constant angular size, and move to a ...
- 14.16 Depth-cue rendering kit (edge halos, fog, focus blur) [R]: Rendering choices that make 3D structure legible: dark halos around edges so crossings read front to back, distance fog or desaturation, screen-space ambient occlusion on ...
- 14.17 Multivariate node glyphs [R]: Each node shows several attributes or algorithm scores at once as a glyph: donut or radial-bar rings, a small star plot, stacked segments, or 3D shape plus color plus texture.
- 14.18 Overlapping-set enclosures in 3D (BubbleSets, LineSets) [A]: Arbitrary groups (selections, overlapping communities, search results, attribute values) are drawn as smooth implicit-surface enclosures or colored threads through their ...
- 14.19 Tapered and directed edge encoding [R]: Edge direction and weight are shown statically: tapered tubes from wide (source) to narrow (target), a color gradient along the edge, or partial edges that show only the ...
- 14.20 Community hierarchy view (nested spheres, sunburst dome, dendrogram) [A]: Hierarchical community results (Louvain and Leiden levels, k-core shells, clustering dendrograms) appear as their own structure: nested translucent spheres (3D circle ...
- 14.21 Deterministic linear layouts as linked views (hive plot, BioFabric, arc diagram) [R]: Rule-based, reproducible layouts that place nodes on axes by attribute: a 3D hive plot (nodes on 3 to 6 radial axes by category, positioned by a metric), BioFabric (nodes ...
- 14.22 Global edge-bundling render mode with a bundle strength dial [R]: The whole graph is drawn with 3D edge bundling (hierarchical by community, or force-directed), with a strength dial from straight to fully bundled.
- 14.23 Density-field (splat) rendering for very large graphs [A]: Past a node or edge budget, or on demand, the graph is drawn as a continuous density field instead of glyphs: splatted into a 3D volume or onto a floor or wall heatmap, so ...
- 14.24 Attribute-aggregated graph (PivotGraph / semantic substrate cube) [A]: Instead of a force layout, nodes are rolled up by the values of 2 or 3 categorical attributes into the cells of a 3D grid.
- 14.25 Geospatial layout on a hand-held globe or tabletop map [A]: When nodes carry coordinates (latitude/longitude, an address, a floor-plan position) or the user maps two attributes to them, the graph lays out on a globe held and spun ...
- 14.26 Exploded and group-in-a-box community layout [A]: An explode dial pushes communities (or any partition) outward from the centroid until they separate into distinct boxes or shelves, each keeping its internal layout, with ...
- 14.27 Content-bearing nodes (images, document cards, 3D models) [R]: Nodes whose data has media (photo, logo, molecule, document, 3D model URL) are drawn as that content, scaled by importance: icons far away, readable cards or full models ...
- 14.28 Edge-centric view: line graph as a linked view or an inside-out flip [A]: Edges become first-class objects: each edge is a node of the line graph, linked when the original edges share an endpoint (bipartite data gets a variant that collapses one ...
- 14.29 Eye-exam tuning ("better one, or better two?") [A]: Instead of sliders for layout, style or algorithm parameters, the system shows two variants of the same graph side by side or toggled (two repulsion strengths, two ...
- 14.30 Motif simplification glyphs [A]: Common repeating substructures are replaced by compact glyphs and the layout is recomputed around them.
- 14.31 Structural backbone (sparsified skeleton) render mode [R]: Every edge gets a structural importance score: Simmelian embeddedness (shared triangles), disparity-filter significance, or membership in the maximum spanning tree.
- 14.32 Layout uncertainty view (probabilistic positions) [R]: The force layout is run several times (several seeds, or samples of uncertain edges) and each node is drawn as a soft cloud over all its positions instead of a point.
- 14.33 Edge-level detail rendering: parallel edges, edge types, self-loops and edge labels [R]: Parallel edges between the same pair fan out as separate arcs, or fold into one ribbon with a count that splits apart when the user reaches in.
- 14.34 Gaze-contingent edge reveal (foveated hairball declutter) [A]: Edges are faded across the whole graph except within a small cone around the point of regard (eye gaze where available, head-ray dwell otherwise).

**15. Haptic, audio and other non-visual channels**

- 15.1 Haptic Geiger sweep (haptics as a data channel) [A]: Vibration encodes data as the hand sweeps: a tick or pulse per node crossed, stronger for central nodes or hubs, a buzz at community borders and on edges to selected nodes.
- 15.2 Edge tension pseudo-haptics [A]: A dragged node's edges act as springs: vibration and hand lag grow with stretch; hubs feel heavy.
- 15.3 Heft (weigh nodes to compare) [I]: A grabbed node's mass is a chosen metric: heavy nodes lag behind the hand, sag and rumble low; light ones are snappy.
- 15.4 Current under the finger [I]: Tracing an edge with its direction gives light ticks.
- 15.5 Synesthetic feedback [R]: Every action triggers music-aligned sound, light pulse and haptics, entraining flow.
- 15.6 Spatial sonification of the graph [A]: Nodes emit spatial sounds: communities hum at pitches, hubs are louder, edges have pitch.
- 15.7 Spearcon sweep [R]: A sweeping ray or gaze plays sped-up spoken node names; pitch encodes a value.
- 15.8 Earcons for operations and state [R]: Short distinct sounds confirm listening, understood, algorithm finished, errors; pitch direction for more/fewer.
- 15.9 Spoken readback of selection [R]: TTS reads a structured description of the hovered or selected node at a chosen verbosity.
- 15.10 Whisper channel (spatial-audio narration at the node) [I]: Agent remarks are spoken quietly from the location of their subject; turn toward them to find it; can be tones only.
- 15.11 Haptic gloves and wearable tactile devices [R]: Fingertip vibrotactile or force-feedback gloves, or a haptic vest, give touch feedback where bare hand tracking has none: contact when poking a node, resistance when ...
- 15.12 Echolocation ping (hop distance heard as echo delay) [I]: The user fires a ping from a selected node (button, pinch, or a tongue click picked up by the mic).

**16. Voice commands and speech input**

- 16.1 Push-to-talk command words [R]: Hold grip or pinch, say a short fixed command (undo, reset view, run PageRank); release ends listening; closed grammar.
- 16.2 See-it-say-it labels [R]: Every visible control label is its voice command; "what can I say" reveals voice badges.
- 16.3 Say-the-number tags over nodes [R]: "Show numbers" tags nodes or clusters in view; say a number to select, two numbers for a path; a grid variant for regions.
- 16.4 Point-and-speak deictic commands ("why is THIS one central") [R]: Point a ray (controller, hand or gaze) at nodes and say "neighbors of this", "path from this to that", "why is this one central".
- 16.5 Look-to-talk [R]: Looking at a mic orb or dwelling on a node opens listening with no wake word; the gaze target from about 630 ms before speech resolves "this".
- 16.6 Voice-addressed nodes by name [I]: Say a node name; a fuzzy phonetic match flies to it or brings it to you; ambiguous matches are offered as numbered tags.
- 16.7 Whisper / silent mode [R]: Commands whispered or mouthed; a whisper-tuned model or headset IMU/electrode sensors; closed-grammar fallback.
- 16.8 Non-verbal voice continuous control [R]: Hum pitch to move a threshold, a sustained "ssss" to zoom, a tongue click to step.
- 16.9 Incremental more/less/stop speech [A]: Steer an animated change with short words: bigger, more, slower, stop.
- 16.10 Spell grammar (hard magic) [R]: A small, strict vocabulary of incantations paired with hand shapes; composable and predictable.
- 16.11 Name-it macros [A]: After a sequence of steps say "call that triage"; saying it later replays it, optionally with a spoken argument.
- 16.12 Spoken notes pinned to nodes [R]: Point at a node or selection and speak; the audio is kept, transcribed and searchable; an icon sits on the node.
- 16.13 Phone or desktop as voice/text channel [I]: A paired phone carries the mic, keyboard and transcript; results appear in VR; works around Quest Browser's missing speech API.
- 16.14 Puppeteer: gesture is the verb, speech is the scope [A]: A tiny fixed gesture set carries verbs; short spoken modifiers set the scope; the agent fuses them with a preview.
- 16.15 Circle-and-ask [A]: Pinch-hold and draw a loop around part of the graph, then speak a question about it.
- 16.16 Describe-and-point group selection [R]: Point roughly and describe ("the big red ones over here"); an LLM fuses ray, words and attributes to select many objects.

**17. Natural language, conversation and generative UI**

- 17.1 Natural-language query as editable chips (visible parse) [R]: A spoken or typed question is parsed into a filter, selection or algorithm call shown as editable tokens near the hand with a live highlight.
- 17.2 Ambiguity widgets in space [R]: For vague words the system guesses, runs, and spawns a small widget showing the choice (dropdown, slider); corrections persist.
- 17.3 Clarify-by-choice tray [R]: Ambiguity is answered by a tray of 2-4 large labeled choices instead of prose.
- 17.4 Ghost futures: preview interpretations, grab one [R]: An ambiguous request renders 2-4 translucent candidate outcomes; the user grabs the intended one.
- 17.5 Conversational follow-ups with context [R]: Each utterance builds on the previous result; pronouns and ellipsis are resolved against the current selection.
- 17.6 Live query preview while speaking [I]: Streaming partial transcripts are parsed continuously so the graph highlight follows the sentence as it is spoken.
- 17.7 Voice style rules as editable cards [A]: "Color by PageRank, red is high" becomes a real style layer shown as an editable card in the layer stack.
- 17.8 Spoken history and undo by description [I]: "Go back to before I filtered", "what did I do in the last five minutes"; history searchable by language.
- 17.9 What-can-I-do voice help [R]: Ask about the interface or concepts; the answer is spoken with highlighted controls or a demonstration.
- 17.10 Ask about what is in view [R]: "What am I looking at?": the agent uses the rendered view plus the data behind visible nodes to describe the region.
- 17.11 Ask-and-show analyst agent (the answer is the graph) [R]: A goal-level spoken or typed request is planned by an LLM into real app operations (algorithms, selection, layout, style layers, filter, camera, export).
- 17.12 Summoned widget: say it, then tune it by hand [A]: A voice edit is applied and the agent synthesizes a one-purpose control (slider, range, ramp) for that edit beside the hand.
- 17.13 Generative panel assembled for the task [R]: The agent composes a whole panel from a fixed component library for the current task; it dissolves on task change and can be saved.
- 17.14 Socratic interviewer (asks about the goal first) [A]: On load, the agent asks 2-3 goal questions and configures algorithms, layout and style; skippable.

**18. AI agents in the space**

- 18.1 Embodied guide (avatar or pointing hands) [R]: The agent has a body, a small avatar or a floating pair of hands in the scene and points at the nodes it explains, gesturing in sync with speech.
- 18.2 Disembodied presence: agent as a second cursor [I]: The agent is a distinct ray or spark that visibly moves to what it will act on before acting; the user can catch it to stop it.
- 18.3 Narrated interruptible tour (flythrough) [A]: "Give me a tour" generates narrated stops (biggest community, hubs, bridges, outliers).
- 18.4 Agent drives, user steers (shared autonomy) [I]: The agent explores continuously; the user biases direction with gaze or lean, flicks "less of this", holds "stay"; control is blended by user effort.
- 18.5 Agent panel of disagreeing specialists [A]: Several role agents (structure, community, skeptic, domain) answer from their angle; disagreements are shown as colored overlays; the user moderates.
- 18.6 Skeptic on the shoulder: robustness shading [I]: On pin or save, a skeptic agent re-runs the finding under perturbation and shades its stability.
- 18.7 Hypothesis cards [A]: A spoken belief becomes a card with proposed tests and status lights, tethered to nodes.
- 18.8 Node beacons: anchored proactive suggestions [A]: The agent places quiet, rate-limited markers on notable nodes; look or point to expand one into one sentence and one action.
- 18.9 Show it twice: programming by demonstration [A]: The user edits 2-3 nodes by hand; the agent infers the rule and ghosts the generalization with a rule chip; one gesture accepts.
- 18.10 Ghost completion of gestures [A]: The agent predicts the rest of an in-progress lasso or path drag and ghosts it; flick to accept.
- 18.11 Spell cards: packaged reusable workflows [I]: The agent offers to turn a successful multi-step workflow into a card; throw or touch it to replay on a subgraph or dataset; shareable.
- 18.12 Visible workers for long-running jobs [I]: Slow jobs appear as entities sweeping the region they process; grab to cancel, ask for an ETA.
- 18.13 Context librarian: outside knowledge on nodes [R]: The agent looks up the real-world entities behind labels, hangs cards, and proposes dashed edges or attributes that need acceptance.
- 18.14 Findings gallery the agent builds [A]: Pinned findings are assembled into walkable stations with captions and evidence; editable; exportable as a tour or report.
- 18.15 Group facilitator in shared sessions [R]: The agent tracks multi-party talk, catches mismatched references, summarizes, speaks at pauses.
- 18.16 Shared transcript for collaborative sessions [I]: All users' speech is transcribed into a shared log tied to their pointing; the agent acts on it and summarizes it as graph notes.
- 18.17 Companion screen for agent text [I]: The headset shows the graph and captions; a phone or desktop shows the transcript, exact query and tables; editing there re-runs in the headset.
- 18.18 Explain-the-result replay [I]: The agent animates how an algorithm reached a result on the real graph (wavefronts, flow pulses, merges) with narration and scrubbing.
- 18.19 Agent-built analysis room [R]: The user describes a workspace; the agent arranges multiple linked graph views and panels; rearrange by hand and save.

**19. Text entry**

- 19.1 Drum keyboard [R]: Controller tips strike key pads like drums.
- 19.2 Real keyboard in VR (tracked or passthrough cutout) [R]: The real keyboard is shown in VR with the hands, either as a tracked model (Quest tracked K830, Apple Magic Keyboard) or through a passthrough hole on the desk, so ...
- 19.3 Dictation with n-best repair chooser [R]: Dictate free text; uncertain words are underlined; point to see alternatives or respell.
- 19.4 Word-gesture (swipe) keyboard and the platform system keyboard [R]: (a) A shape-writing keyboard: sweep a finger, ray or head pointer across a virtual keyboard in one stroke per word, and a decoder resolves the word.
- 19.5 Predictive zooming text entry (Dasher) over the graph's own vocabulary [A]: For users who can steer only one continuous pointer (head, gaze, single joystick, mouth stick or sip-and-puff) and cannot type or be understood by speech recognition.

**20. Commands and operations as objects**

- 20.1 Algorithm cartridges [A]: Algorithms are holdable cartridges inserted into the controller or touched to nodes; each is a removable result layer.
- 20.2 Placed operators [I]: Pull a token off the palette and set it on a node, cluster or region; the token IS the applied operation; twist for its parameter, pick it up to undo.
- 20.3 Charm bracelet compositor [I]: Thread algorithm, filter, rank and style beads on a wrist bracelet.
- 20.4 The meta-graph (in-world wiring) [I]: Operations (algorithms, layouts, styles, filters, export) are nodes in a second graph, or chips created with a pen.
- 20.5 Cauldron of ingredients [R]: Drop combinations of physical ingredients into a vessel to produce a result: a node set plus an algorithm token plus a style token.
- 20.6 Workbench of physical, hands-first tools [R]: Every function is a grabbable object on a counter, rack or wall, used as in life, and its shape conveys what it does; no abstract menus.
- 20.7 Algorithm spice rack with hover preview [I]: Algorithms are jars on a shelf grouped by family; hovering previews cheap results live and shows a cost estimate for expensive ones; grabbing a jar commits.
- 20.8 Spice jars (style by sprinkling) [I]: Style presets are jars.
- 20.9 Stained-glass layer stack [I]: Each style layer or filter is a glass sheet or pane between user and graph.
- 20.10 Embodied attribute axes (ImAxes pattern) [A]: Data attributes are graspable labeled rods; their arrangement (angle, distance) creates plots with no menus or modes, and crossing two makes a scatterplot.
- 20.11 Result card deck (fanned card hand) [I]: Each algorithm run, or each ranked result, arrives as a card in an off-hand deck or fanned hand.
- 20.12 Datasets as physical objects: load, append and join by combining [I]: Each data source is an object: a file arrives from the phone or desktop (25.x) as a labeled jar or cartridge on a shelf showing a preview of its size and format.
- 20.13 Sentinels (standing questions placed in the world) [I]: The user plants a sentinel (a small totem) on a node, cluster or empty region holding a standing question: 'tell me if this node enters the top 10 by betweenness', 'if ...

**21. Rendered HTML plumbing**

- 21.1 HTML-in-Canvas live DOM texture [R]: WICG proposal: `layoutsubtree` canvas children, and `drawElementImage` / `texElementSubImage2D` upload a live DOM element snapshot to a WebGL/WebGPU texture.
- 21.2 Rasterize the DOM (html2canvas / SVG foreignObject) [R]: A library repaints the DOM into a canvas used as a DynamicTexture, refreshed on change.
- 21.3 Babylon HtmlMesh [R]: CSS3D-positioned real DOM aligned with a mesh; desktop only, not in immersive WebXR.
- 21.4 WebXR DOM Overlay [R]: One DOM element composited over an immersive session; handheld AR only; rejected by Quest Browser for immersive-vr.
- 21.5 WebXR compositor quad / cylinder layers [R]: The panel texture is handed to the compositor and sampled once (no double aliasing), with a text-optimized quality hint; no depth-sorting with scene meshes.
- 21.6 Engine-native 3D GUI [R]: Babylon GUI 3D HolographicSlate, NearMenu, HandMenu built as meshes.
- 21.7 Stream the real 2D app window [R]: WebRTC capture of the desktop app into a video texture, with pointer events sent back.

**22. Panel placement and window management**

- 22.1 App as one big window / Theater View [R]: The whole app as a large world-locked panel at 0.8-3 m, with the graph in the room.
- 22.2 Hinged multi-panel arc [R]: Three docked panels in an arc plus free panels.
- 22.3 Personal Cockpit (body-anchored ring of windows) [R]: A body-anchored curved grid or shell of small touchable windows at arm's reach; switch tasks with a head turn and a touch.
- 22.4 Multiple virtual monitors [R]: 2-5 virtual monitors around a seated desk with keyboard and mouse.
- 22.5 Spatial Bar taskbar [R]: A thumbnail bar for window switching by gaze or cursor.
- 22.6 Curved panels [R]: Cylindrical panels keep all columns equidistant from the eye.
- 22.7 Ornaments and side tab bars (on windows or on the graph volume) [R]: Toolbars float just in front of and below the content, outside the window edge, and a vertical tab bar expands its labels when looked at; operated by look and pinch.
- 22.8 Tag-along lazy-follow panel [R]: World-still until it leaves a view cone, then glides back.
- 22.9 Glanceable peripheral panels [R]: Head-glance or gaze summons peripheral content.
- 22.10 Projective windows [R]: One gesture grabs, pushes and scales a panel onto a surface; apparent size stays constant while held; push away to enlarge.
- 22.11 Visual links panel-to-graph [R]: Routed 3D links from panel rows to their nodes.
- 22.12 Data-flow panels [R]: Each analysis step produces a placed output panel.
- 22.13 Coordinated-view containers [R]: Views in clonable, linked boxes.
- 22.14 Diegetic holographic UI [R]: Information on world objects instead of floating chrome.
- 22.15 Orthographic viewport panels [R]: A placeable flat projection of the 3D graph, selection-linked.
- 22.16 Peel a node [I]: Pinch-pull a node to peel off its linked detail card.
- 22.17 Graph-aware panel placement [I]: A solver moves, tilts or fades panels to avoid occluding relevant nodes.
- 22.18 Table ring around the graph [I]: A cylindrical attribute table aligned to node bearings.
- 22.19 Walls as panel surfaces, graph in the middle [R]: 2D panels snap to real walls and the 3D graph stands in open space.
- 22.20 Detective's corkboard [I]: Throw nodes at a wall to pin them as cards.
- 22.21 Off-screen result indicators (3D Halo and Wedge, EyeSee360) [R]: When a search, algorithm or agent highlights nodes outside the field of view (behind, above, or occluded), peripheral indicators show where and how many: arcs or wedges at ...
- 22.22 UI text drawing style and panel material that adapt to the background [R]: The look of the UI (not where panels sit) adapts to what is behind it.

**23. Desk, room and floor**

- 23.1 Seated desk VR (VirtualDesk, deskVR) [R]: The virtual desk is aligned to the real one; the graph and panels sit on it and are anchored to it; leaning changes the view; the desk supports the arms.
- 23.2 Desk as a touch surface [R]: Virtual controls are aligned to the real desk plane so every touch lands on wood; the graph floats above.
- 23.3 Shadow on the desk [A]: The floating 3D graph casts a live 2D projection onto the real desk; touching the shadow selects and moves nodes in 3D.
- 23.4 Shadow lamps (wall projections) [I]: Place lamps around the 3D graph.
- 23.5 Graph on the real table [R]: The graph is dropped onto a detected table and sits at model scale so people can walk around it.
- 23.6 Graph on the floor (stand on it, select with feet) [A]: A 2D or room-scale layout on the floor.
- 23.7 Room stations (walking is the mode switch) [I]: Areas of the room are filter, algorithm, style and export stations; carrying a selection to a station applies it.
- 23.8 Saved views anchored to real objects [R]: Persistent anchors pin views or subgraphs to real places in the room.
- 23.9 Colocated shared graph [R]: Several headsets see one graph aligned by shared anchors; each person's selections are colored.
- 23.10 Swivel chair as a view carousel [I]: Seated, the user turns the chair (body yaw) to pick among workspaces or linked views of one graph arranged in a circle (different layouts or algorithm colorings).
- 23.11 Desk cockpit (combination) [I]: Desk-surface controls plus a physical keyboard plus a pedal clutch, with the graph floating above the desk.
- 23.12 Ambient room as global-state display [A]: Graph-wide facts with no single location are carried by the environment instead of a panel: sky color or brightness shows how far the layout has converged (it calms as the ...
- 23.13 Room-aware layout (the room is part of the force model) [I]: In mixed reality the room mesh and planes (WebXR mesh and plane detection) enter the layout as forces and constraints: nodes avoid furniture and keep walking lanes clear ...

**24. Physical props, tangibles, stylus and extra controllers**

- 24.1 Tangible tokens and proxies as graph handles [R]: Physical objects (pucks, magnets, rulers, tokens) seen in passthrough are bound to nodes, filters, algorithms or thresholds; moving a token changes what it is bound to.
- 24.2 Tangible tokens as a query pipeline [A]: Marked cards or blocks stand for algorithms, filters and styles; placement applies, order is pipeline order, rotation is a parameter.
- 24.3 Token board plus graph walker (combination) [I]: Tangible tokens define the computation; a gamepad or microgestures walk the results; haptics tick on high scorers.
- 24.4 Hold-the-graph prop (doll's head) [R]: An off-hand object is the graph: rotate it to rotate the graph absolutely, move it toward the body to zoom; the dominant hand selects.
- 24.5 Tangible sphere for a spherical layout [R]: A real ball is aligned with a graph laid out on a sphere; turn the ball, touch its surface to select.
- 24.6 Everyday objects annexed as props [R]: Bind a mug, book or stapler on the desk to a parameter; twist or slide it.
- 24.7 One prop, many nodes (haptic retargeting) [R]: Warp the hand or world so one real block is touched whenever any virtual node is grabbed.
- 24.8 Physical motif kit [I]: Build a small pattern with props or controller-placed points; the app finds and lights all matches.
- 24.9 Physical graph print plus finger tracing [R]: A printed graph with AR overlays; the user traces paths with the fingers.
- 24.10 Printed or 3D-printed overview map [I]: A registered paper layout or printed model on the desk acts as a touchable world-in-miniature; touching it flies the view.
- 24.11 Paper bridge with printed codes [I]: Exported reports carry codes; pointing the headset or phone at a code jumps to that node or view.
- 24.12 Tracked 6DoF stylus (pressure pen) [R]: A tracked pen (Logitech MX Ink on Quest, Muse on Vision Pro) gives a pressure tip on the desk, a precise pointer in the air, buttons and haptics.
- 24.13 Stylus pressure as an analog dial [I]: Tip on a node; pressure sweeps the neighborhood radius or a threshold; lifting commits.
- 24.14 6DoF desk puck (SpaceMouse) [R]: A CAD-style 6-axis cap flies the camera or graph while the other hand points.
- 24.15 Gamepad for seated analysis [R]: Sticks fly or orbit, the D-pad steps to a neighbor, triggers expand hops, buttons are verbs.
- 24.16 Dials and fader boxes (knobs, MIDI) [A]: Physical knobs and faders bound to parameters, with labels floating above them in VR.
- 24.17 Cockpit / mixer desk (virtual) [R]: A console of virtual knobs, faders and switches grabbed and twisted like real ones.
- 24.18 Active force props: weight and encounter [A]: A wrist device swings a handle into the palm and renders weight; robots place real surfaces where nodes are.
- 24.19 Phone palette in the off hand, stylus in the main hand (combination) [I]: The phone is held as a real-glass palette (algorithms, swatches, table); a stylus picks nodes and drops palette items on them.
- 24.20 Headset camera as a sensor (read sketches, whiteboards and printouts) [A]: Passthrough camera access lets the headset read the room: draw a small graph or motif on paper or a whiteboard and it becomes a query or a new graph, or point at a printed ...
- 24.21 Grounded desktop force-feedback arm (Haply Inverse3, 3D Systems Touch) [R]: A desk-mounted haptic arm with a stylus or handle gives precise 3-DoF or 6-DoF position input and pushes back with real, continuous force.

**25. Multi-device and cross-device**

- 25.1 Phone or tablet as a tracked touch surface [R]: The user's own phone (or a tablet), with its pose tracked, appears in VR as a virtual device showing app-chosen UI, with virtual content around its edges.
- 25.2 Phone as untracked companion screen [R]: The phone joins the session by URL or code, runs the same session, mirrors the VR selection, and hosts the 2D half of the app (tables, catalog, charts, settings).
- 25.3 Spatially aware tablet beside the 3D graph [R]: A tracked tablet shows linked 2D views; pointing it filters, brushing on it highlights in 3D.
- 25.4 Desktop plus headset in one session (split reality) [A]: The same graph is open in the desktop app and in the headset with shared selection, styles and camera.
- 25.5 Asymmetric partner outside VR (co-pilot on a screen) [R]: The headset user explores.
- 25.6 Smartwatch as wrist controller [R]: The watch shows context and takes touch; the crown scrubs values; IMU and haptic taps.
- 25.7 Hands and controllers at the same time (one controller, one bare hand) [R]: The dominant hand holds a controller for a precise ray, trigger and haptics, while the bare off hand uses palm menus, microgestures or direct grabs.
- 25.8 Display smart glasses as a lightweight second device [A]: Everyday display glasses with a small heads-up screen and their own input (EMG band, temple touchpad, voice) act as a low-commitment companion to the headset session ...
- 25.9 Directed spectator camera for a flat-screen audience [A]: A one-to-many broadcast of the VR session to a TV, video call or web link without viewers joining.
- 25.10 Earbuds as a minimal remote (stem press, ear-touch, earable head-gesture IMU) [A]: Paired earbuds act as an always-worn clicker that needs no hand.

**26. Body, eye and brain sensing**

- 26.1 Foot pedals and foot taps [R]: Pedals as modifiers, mode switches, undo, analog scrub.
- 26.2 Gaze trail as analysis memory [I]: Record which nodes were looked at and offer coverage back (uninspected nodes, attention trail).
- 26.3 Flicker-tag SSVEP BCI selection [A]: Candidates flicker at distinct frequencies; EEG detects which is attended.
- 26.4 Passive biosensing adapts detail [A]: A workload estimate from EEG/EMG/EDA/eyes triggers simplification (fewer labels, collapsed communities).
- 26.5 Lean in for detail [I]: Head distance drives level of detail: summaries from afar, then labels, then values.
- 26.6 Immersion dial [R]: One continuous control goes from passthrough to full immersion.
- 26.7 Stillness reveals [I]: While moving, only shape and color show; holding still fades in labels, numbers, minor edges and annotations over about two seconds by relevance; any motion clears them.
- 26.8 Smooth-pursuit eye selection (follow the moving target) [R]: Candidate nodes or menu items each move along a different small path; the system picks the one whose motion the eyes follow.
- 26.9 Facial-expression input [R]: Headset face tracking reads brow raise, smile, jaw open or a cheek puff and maps them to a few commands (a modifier, confirm, "show me more").
- 26.10 Deliberate eye gestures and winks as commands [R]: Short deliberate eye strokes (left-right-left, glance at a corner and back) or a one-eye wink fire a command (confirm, undo, expand neighbors) while both hands stay on the ...
- 26.11 Full-body pose as input (arms, torso, crouch, body trackers) [A]: Whole-body poses and motions become commands or continuous controls: spreading both arms wide expands the selection's neighborhood, crouching lowers a filter threshold or ...
- 26.12 Active brain-computer input: motor imagery, P300 and a consumer EEG headband [R]: The user selects or commands by intent, not by gaze-locked flicker (26.3) and not by passive workload (26.4).

**27. History, saving, provenance and collaboration**

- 27.1 Ariadne's thread (breadcrumb spool) [I]: A yarn or glowing thread from a belt spool is laid along the edges the reader travels.
- 27.2 Walkable branching analysis trail (spatial history breadcrumbs) [A]: Every user and agent action is recorded as a tree of thumbnail snapshot windows left in space, colored by actor; grab one to restore that state; the agent summarizes branches.
- 27.3 Ghost of your past self [I]: Sessions record head, hands and actions.
- 27.4 Instant replay and ghosts [R]: Replay the last action as a translucent rerun.
- 27.5 Hourglass history [I]: Each action drops a colored grain into an hourglass.
- 27.6 Wind the clock back [I]: A palm-up counterclockwise wrist roll rewinds the graph's history as continuous motion with ghost trails.
- 27.7 State crystals [I]: A two-hand squeeze crystallizes the current state into a miniature gem.
- 27.8 In-world camera as bookmark [R]: A physical camera from the backpack produces prints you carry and reuse; spectator cameras lock to a spot or avatar.
- 27.9 Crew stations [R]: Players each own a console role; a captain coordinates and can take over empty stations.
- 27.10 Guided tour with mapped physical props [R]: An authored path through scenes, with real props mapped to virtual ones (passive haptics).
- 27.11 Read-wear trails: cumulative traces of where everyone has been [A]: Every visit, selection, expansion and dwell by every past user of a shared graph is aggregated anonymously into a persistent wear layer.

**28. Collaboration and shared sessions**

- 28.1 Remote shared graph session with avatars (distributed, mixed presence) [R]: Two or more people in different places join one live graph session, each an avatar (head, hands and ray) beside the same graph, with spatial voice.
- 28.2 Subjective views: one shared graph, per-user styling, filters and labels [R]: Everyone sees the same nodes in the same places, so pointing and talking still work, but each person can apply a private style layer, filter, label set or algorithm ...
- 28.3 Collaborator awareness cues: gaze rays, view frustums, hand sharing [R]: Show where each collaborator is looking and what they can see: a faint gaze ray or cone, their view frustum drawn on the graph, the node under their gaze glowing in their ...
- 28.4 Live presenter controls: follow me, gather, laser broadcast, audience mode [R]: A presenter can tether viewers' cameras to theirs (follow me, with comfort-safe easing), gather everyone to one node, broadcast a laser pointer, lock or unlock audience ...
- 28.5 Multiscale collaboration: a giant guide and an ant-scale explorer [R]: Two users work at different scales at once.
- 28.6 Fork-and-merge personal copies with group voting [I]: Any participant pulls a personal copy of the shared graph (or a subgraph) out beside them to try a layout, filter or community setting without disturbing others.
- 28.7 Floor control, ownership locks and hand-to-hand passing of objects [A]: Concurrency made social and visible.
- 28.8 Asynchronous review threads anchored in the graph [A]: A colleague leaves comment threads (voice, text or a recorded gesture) pinned to nodes, paths, clusters or saved views, and can mention a person.
- 28.9 Group coverage map and divide-the-graph work split [R]: The group splits a large graph into territories (community, region or attribute range), each tinted in its owner's color with a fill meter showing how much has been inspected.
- 28.10 Breakout huddles: sub-groups split off with audio zones and reconvene [A]: A larger session (class, review meeting) splits into small huddles, each around its own forked copy or region of the graph inside an audio zone so its talk does not reach ...
- 28.11 Participants become nodes (live action sociogram) [A]: In a shared session each participant takes on a node: their avatar stands on it and carries its attributes.
- 28.12 Pass-the-headset handoff with a guest profile [A]: A team with one headset passes it around.
- 28.13 Speaker-aware voice commands in a group (addressee detection) [A]: With several people talking, the system decides whether an utterance is a command to graphty or talk between people (head direction, pointing, a wake word or per-user ...
- 28.14 Crowd puzzle mode (many players cooperate or compete on one graph) [A]: A large open session turns an analysis task into a game for many people: untangle a layout to reduce crossings, label communities, flag suspicious edges or find motifs ...
- 28.15 Safety, consent and personal-space controls for shared and open sessions [A]: Every shared session gets social-safety mechanics built for a graph space.
- 28.16 Live translated speech and per-user label language in shared sessions [A]: Collaborators who speak different languages hear and read each other in their own language.
- 28.17 Phones and tablets as handheld AR seats in a colocated shared graph [A]: People in the room with no headset join the shared graph by holding up a phone or tablet.
- 28.18 Video-call participants placed in the scene with a working pointer [A]: People who join from an ordinary video call or browser link appear in the VR graph space as live video tiles, each hung near the part of the graph that person is looking ...

**29. Accessibility**

- 29.1 Walkable graph structure for screen readers (keyboard, stick or switch tree walk) [A]: The graph is exposed as a structure to move through step by step, not a picture: graph, communities, nodes, neighbors, edges, plus algorithm results such as top-k lists ...
- 29.2 Graph-aware switch scanning with adaptive controllers [A]: For users with one or two switches (an adaptive-controller button, a sip-and-puff device, a blink, a foot or head switch).
- 29.3 Any-input action map (every command bindable to any input) [R]: Every graphty operation is a named action (select, expand neighbors, run a named algorithm, undo, open a palette, grab the world).
- 29.4 Calibrated reach envelope (everything comes to where you can reach) [R]: A one-minute calibration records the user's comfortable reach volume as they sweep each hand, seated, standing or in a wheelchair.
- 29.5 Complete one-handed mode with a parked ghost hand [A]: Every bimanual option (off-hand palette, two-hand handlebar zoom, noun hand and verb hand, two-hand span ranges, drum menu) gets a one-hand equivalent.
- 29.6 Low-vision toolkit for the graph (SeeingVR pattern) [A]: Switchable tools applied to the whole scene: graph-aware text augmentation (labels with a minimum angular size, bold, backplates).
- 29.7 Redundant non-color encoding and a color-vision profile [R]: Every color-coded result is also shown another way: communities, algorithm membership, paths and filters get node glyph shapes, textures or patterns, edge dash styles and ...
- 29.8 Depth without stereo (monocular and stereoblind mode) [R]: For users without stereo depth perception, depth comes from other cues: depth fog or depth-tinted color, size cues, shadows on a ground plane, and an optional small ...
- 29.9 Directional captions and visual or haptic twins of every sound [R]: Every audio channel (earcons, sonification, the whisper channel, agent speech, collaborators' voices) gets a non-audio equivalent.
- 29.10 Reduced-motion and flash-safe profile [R]: One switch, which also follows the browser's prefers-reduced-motion setting: camera travel becomes a fade cut with no smooth flight.
- 29.11 Trainable personal command vocabulary for atypical speech [R]: The user records a few samples of their own utterance for each command (any word, sound or language), and recognition matches against those personal samples instead of a ...
- 29.12 Plain-language step mode with a fixed home anchor [R]: A mode that limits the choices on screen, each with a plain-language label and icon.
- 29.13 Reclined and lying-down session (gravity-rotated workspace) [A]: A recenter while looking up (or a profile toggle) rotates the whole graphty frame so 'forward' is the ceiling: graph, panels, palettes, holsters and the reach envelope ...
- 29.14 Limited neck rotation: amplified head turn and bring-to-front [A]: A short calibration records the comfortable head yaw and pitch range.
- 29.15 Haptic-channel substitution and per-channel sensory intensity mixer [A]: Several options carry data or confirmation only through touch (haptic Geiger sweep 15.1, heft 15.3, magnetic snap click 2.10, hold-to-deepen ticks 12.7, tug-of-war snap ...
- 29.16 Direction without two ears (mono-safe spatial audio) [A]: Spatial sonification 15.6, the whisper channel 15.10, spearcon sweeps 15.7, spatial earcons in 29.1 and collaborator voices assume binaural hearing for direction.
- 29.17 Refreshable tactile display mirror of the local neighborhood [A]: A pin-array tactile display (Dot Pad class) on the desk or lap shows the current focus as a touch-readable diagram: the selected node with 1- or 2-hop neighbors on a grid ...
- 29.18 Sign-language channel (signing agent output, sign input) [A]: For Deaf users whose first language is signed, captions are a second language.
- 29.19 Effort-aware input: measured arm fatigue moves work to lower-effort input [A]: The app estimates arm effort from the hand and controller pose WebXR already gives (how long and how high each arm is held, how far from the body) with a published ...
- 29.20 Gesture timing and hand-pose accommodations (no gesture needs speed, steadiness or a working pinch) [A]: One profile relaxes the timing, speed and hand-pose rules of every gesture recognizer.
- 29.21 Reading support for panels: read-aloud with synced highlighting and adjustable typography [R]: Any text in the immersive UI (algorithm descriptions, result tables, node properties, errors, agent replies) can be read aloud with each word highlighted as spoken: point ...
- 29.22 The user's wheelchair as a navigation input [A]: A wheelchair user moves through the graph with the chair they already control well.

---

## 6. The prioritized prototypes

### How to read this section

Each prototype below is a slice of a whole interaction model, chosen for the one question it
settles. They are ordered by what they would teach and how much they could set graphty apart,
not by score. Every prototype sits on the same shared foundation, so none is penalized for what
the foundation already provides:

- **A panel surface and an in-headset text route.** Panels drawn to a texture; names entered from a
  prefix-filtered list of the graph's own vocabulary, or a virtual keyboard; the system keyboard if
  WebXR can raise it.
- **One command log with preview-before-commit and undo.** Every act, including gestures, is
  logged with its parameters ("pull Medici, 2 hops -> 11"); acts that are not instant to undo show
  a ghost and a count first; one undo history shared with the desktop. Built mostly on code the
  element already has (session commands, journal, history, transactions, cost estimates).
- **One accessibility and binding layer.** A published table of controller bindings so models
  cannot collide; seated, one-handed and no-hands routes (head-pose pointer with smoothing, dwell
  or a single switch); the bubble cursor and progressive refinement; standard grab, rotate and
  scale view controls with one-handed forms; one reduce-motion switch.
- **A community hierarchy for scale.** Past the flat-graph ceiling, the graph loads as communities
  that open in place, with every aggregate stating what it aggregates.
- **Legend and status cards.** Any node or edge can say why it looks the way it does.
  graphty-element already returns this as neutral, coded facts (its legend and style-explain
  functions); the app writes the words, for example "color: layer PageRank -> color, value 0.146,
  rank 1 of 15". Ranks state their scope ("of 15", or "of 11 visible"). A global legend states every
  encoding in view. One docked status line, not a new card per step, states counts, what is hidden
  (counted by kind, not listed) and results that went stale after a filter.

Scores, all models (0-3 against the reference in section 3; `*` = Low confidence). The index is a
weighted percentage for reference only; it is not the ranking.

| Model                         | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  | 14  | 15  | 16  | 17  | 18  | 19  | 20  | 21  | 22  | 23  | 24  | 25  | 26  | Index | Differentiation                 | Learning value                            |
| ----------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- | ------------------------------- | ----------------------------------------- |
| The Desk                      | 3*  | 3*  | 3   | 3   | 3   | 3   | 3*  | 3   | 3   | 3   | 2   | 2   | 2   | 2   | 2   | 2   | 3   | 3   | 3   | 3   | 2   | 2   | 1   | 1   | 3*  | 3   | 87    | Medium-High                     | High                                      |
| Front Row (hand-held diorama) | 2   | 3*  | 3   | 3   | 3   | 3*  | 2   | 2   | 3   | 2   | 3   | 3*  | 3   | 3   | 2   | 2   | 2   | 2   | 3   | 2   | 3   | 2   | 2   | 1   | 3   | 2   | 84    | High                            | Very high                                 |
| Wayfinder                     | 1   | 3*  | 2   | 3   | 3   | 2   | 2   | 3   | 2   | 2   | 3   | 2   | 3   | 3   | 3   | 2   | 3   | 1   | 3   | 2   | 2   | 2   | 2   | 1   | 3   | 1   | 78    | Medium                          | Medium                                    |
| Walk and Flick                | 2   | 2   | 2   | 2   | 3   | 2   | 2   | 3   | 3   | 2   | 2   | 2   | 2   | 2   | 3*  | 2   | 3   | 1   | 3   | 3   | 2   | 1   | 1   | 1   | 2   | 2   | 73    | Medium                          | High                                      |
| Point and Say                 | 2   | 2   | 2   | 2   | 2   | 2   | 3   | 3   | 3   | 3   | 2   | 2   | 2   | 2   | 2   | 2*  | 3   | 1   | 2   | 3   | 3   | 1   | 1   | 1   | 2   | 2   | 73    | Medium                          | High                                      |
| The Graph Is the Material     | 2   | 3*  | 2   | 3*  | 2   | 2   | 2   | 2   | 3   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 2   | 3   | 3*  | 1   | 1   | 3*  | 3   | 1   | 72    | Very high                       | Very high                                 |
| Result Objects                | 2   | 2   | 3   | 2   | 2   | 3   | 2   | 2   | 3   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 3   | 3   | 2   | 2   | 1   | 1   | 3   | 3   | 72    | Low-Medium                      | Medium                                    |
| Then and Now                  | 2   | 2   | 3*  | 2   | 2   | 2   | 2   | 2   | 3   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 3   | 3   | 2   | 2   | 2   | 1   | 3   | 2   | 71    | Medium-High                     | High                                      |
| Measure Space (rescored)      | 2   | 2*  | 2   | 2   | 2   | 2   | 2   | 2   | 3   | 2   | 2   | 2   | 2   | 1   | 2   | 2   | 2   | 1   | 2   | 3   | 2   | 2   | 2   | 1   | 3*  | 2   | 67    | Medium-High                     | High (much of it answerable on a desktop) |
| Hands Only (rescored)         | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 3   | 1   | 3   | 3   | 1   | 1   | 1   | 1   | 2   | 2   | 64    | Low (base) / High (expert tier) | Medium                                    |
| VR baseline (control)         | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 2   | 2   | 2   | 2   | 1   | 2   | 1   | 1   | 3   | 63    | Low                             | Low (needed as the control)               |
| Stand In It (rescored)        | 1   | 2*  | 2   | 2   | 2   | 2   | 2   | 1   | 2   | 2   | 1   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 1   | 2   | 3*  | 3*  | 2   | 1   | 3   | 1   | 62    | High                            | High (but costly)                         |

The three rows marked "rescored" changed after the follow-up review described in each entry:
Measure Space fell from 76 to 67, Hands Only from 68 to 64, and Stand In It from 67 to 62, below the
VR baseline.

What the profile says:

- **No model has shown the structure-reading gain (criterion 2).** Every 3 there is a Low-confidence
  claim. That criterion is the reason to put graph analysis in a headset at all, so the prototype
  that tests it most directly comes first.
- **The Desk tops the index because it borrows the desktop's strengths**: keyboard speed, a
  supported forearm, the real room. Its top scores on speed and parameters rest on one unverified
  fact, keyboard events reaching an immersive WebXR session. Without it, it falls to about Front
  Row's level.
- **The two boldest models are lowest on comfort and practicality and highest on what they could
  add.** They stay in contention because the ranking is on differentiation and learning value.
- **Entering, leaving and the real world (criterion 18) scores 1 almost everywhere.** It is a
  property of the foundation (a send-to-headset link, passthrough), not of a model.
- **Every model clears every critical criterion at 2 except Stand In It's fatigue score,** which
  reaches 2 only through its seated twin. Two more reach 2 only through something outside their
  own description: Measure Space's occlusion needs a rank-scale axis option (real centrality values
  pile most nodes into one corner, and a log scale fails on the many zeros), and Hands Only's single
  pick on Vision Pro needs a pinch that commits on release, because nothing confirms the aim before
  the pinch.

---

### Prototype 0. The foundation and the control conditions

**Why first.** Several platform facts would each sink more than one prototype, and every mock
needs the same yardstick. This is not a differentiator and is not ranked.

**What it contains.**

- **First, the same-page round trip** (the same-page dip-in in section 7). Fix the two element
  defects in section 4 (the session the system ends, and the reference space), then time leaving
  to the 2D page and returning on the same state, including where the graph sits in the room and
  what happens to a pending preview or mode at exit. A new control condition goes with it: the 2D
  page plus today's VR with no in-headset UI, which is the alternative an analyst already has.
- **A half-day file-route test** for the files gate in section 3. On one Quest 3, six actions, each
  pressed with the ray inside a session: post 1 MB to a local server; write and read back 1 MB in
  IndexedDB and in the origin private file system; download a file; open a file input; share a
  file; copy to the clipboard. Log every session visibility change and end, and repeat with the
  Meta button pressed and with the headset off for 30 s. Each route is recorded as works, works
  but blurs, ends the session, or blocked. Then the analyst's round trip, through each route that
  works (in session, the dip-in, Quest Link): a 5,000-node GraphML file on a shared drive; find a
  node, select its 2-hop neighborhood, run PageRank; export the selection as CSV and a screenshot
  and open both on the desktop; kill the browser mid-task and resume. Count seconds, steps,
  headset removals and manual copies. It passes at about 2 minutes, headset on, no manual copy.
- A frame-time test of today's element at 1,000, 5,000 and 10,000 nodes in an immersive session on
  Quest 3, labels on and off. The element draws one object per node, which may put the flat-graph
  ceiling at a few thousand nodes; every model designs to that number.
- A platform check of about 4-5 days, ordered by how many prototypes each item blocks: keyboard
  events in an immersive session; the system keyboard; mouse and trackpad events; WebXR over Quest Link
  (as a development loop, a spectator mirror and the desktop control condition, and to time
  10,000-50,000 nodes on a desktop GPU); gamepad touch
  flags and haptics per browser; which pinches the system reserves (palm-up pinch is Quest's system
  menu); hand tracking with hands resting in the lap, on a desk and on an armrest (the tracking half
  of prototype 8, moved here); the per-frame
  cost of an on-device speech recognizer; quad layers for sharp text; switch and adaptive
  controller events; head-pointer latency; passthrough legibility; visionOS limits; each device's
  focal distance.
- A two-day panel spike comparing three routes: app HTML drawn to a Babylon texture with pointer
  events forwarded; Babylon's own 3D GUI (a new dependency); extending the element's existing
  label textures. The choice is made on presentation neutrality: the element offers "attach a
  panel surface" plus primitives, and the app composes and words every panel. Estimated 2-4
  person-weeks for the panel host; it is first on the critical path.
- The published binding table and the first slice of the accessibility layer.
- The legend and status cards, on the element's existing legend and style-explain facts; the
  task battery's "style and read the legend" task tests them. Their follow-up review asked for
  three changes, now in the foundation description above: the element returns facts and the app
  writes the sentence; a global legend beside the per-node explanation; one docked status line
  that also flags stale results. It also asked to drop the "legend eyedropper", a mode whose name
  the option catalog already uses for copying a style, in favor of a "why this look" row on the
  node's inspect card, and to add a spoken readout for low-vision users. Remaining objections:
  the cards are only as cheap as the panel surface, the 2-4 person-week item on the critical
  path; the card should update on a hover dwell, not every frame.
- Control conditions, run in every study: a ray onto flat world-locked panels with a raycast
  virtual keyboard; Quest-style hand-tracked panels (poke and pinch); the desktop app flat; the
  desktop app with a mouse-orbited 3D view (this one separates "VR helps" from "3D helps"); and a
  faithful Tilt Brush style off-hand palette with the same catalog route, so the palette's form is
  the only variable.
- A core task battery of about 20 minutes on 300- and 1,000-node graphs (find by name, k-hop
  neighbors, path, path tracing by eye, run and compare two rankings, filter, style and read the
  legend, undo and cancel), with sickness checks (FMS every 2-3 minutes, VRSQ before and after).

---

### Prototype 1. The hand-held diorama (from the Front Row model)

**Why try it.** It tests the central claim directly: holding a subgraph and turning it with the
hand improves judgments about structure ("is this the only route?", "is this hub a bridge?") over
desktop 3D. The evidence most in VR's favor comes from exactly this condition: stereo plus
hand-coupled motion. If it fails, every later prototype should be scoped down.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | Ray with the bubble cursor by default above about 300 nodes; when a node is below the minimum angular size, the answer row or a progressive-refinement list is the route, so the diorama is never the only way to pick. Brush or lasso inside the diorama, with a box-select twin. Ray drag and pin.                                                                                                                                                                                                           |
| Navigation             | The world never moves on its own. The graph is a still diorama at about the headset's focal distance (about 1.3-1.5 m on Quest). "Hold" lifts the answer (a path and its neighbors, or the whole graph below about 300 nodes) into the off hand, which turns it while the dominant hand picks. One-handed twins: a grip toggle plus the thumbstick rotates the held set; a "rotate 90 degrees" button.                                                                                                         |
| Commands               | Question cards ("Who matters most?", "Who did they marry?") from catalog data, worded by the app, plus a browse card for the whole catalog. Ask-by-pointing chips: the element returns candidate questions for the pointed node as neutral codes with costs; the app words them. Depth acts: show in diorama (default for paths, hubs and sets), lift, hold. Keep, flag, clear, refer on the focused card.                                                                                                     |
| Text and numbers       | The shared text route (prefix list over the graph's names, or a virtual keyboard). A summoned slider always paired with a keypad. A tray of choices when a request is ambiguous.                                                                                                                                                                                                                                                                                                                               |
| Reading results        | Ranked answers come to a curved row of at most about 7 cards, 15-25 degrees below the horizon; more than about 12 answers, or several measures, become a sortable table. Path, hub and set answers light up in the diorama, with the row as their index. Labels: focused card, hovered node, top N of the answer, and a line "N of M labels shown". The global legend at the row's end; the docked status line updates after every narrowing. The row dims and drops out of the way while the diorama is held. |
| Running algorithms     | Question cards and the browse card; a chip whose measure is not computed yet shows its cost; long runs show progress and cancel.                                                                                                                                                                                                                                                                                                                                                                               |
| Styling                | "Show in diorama" dims the rest with a reader-added style layer (never an algorithm's suggested style); encoding by data through the shared "encode" command; a "why this look" row on any node's inspect card explains its appearance.                                                                                                                                                                                                                                                                        |
| Undo                   | The shared log: one-step undo from the same place; what-ifs are ghosted before they commit.                                                                                                                                                                                                                                                                                                                                                                                                                    |

**What is unique.** Structure answers go into the hand, where depth and motion do work no panel
can. Values stay as readable text at reading distance. The world never moves on its own.

**Strengths.**

- The strongest evidence base for its key claim: Ware and Franck 1996 and Ware and Mitchell 2008
  (Strong, non-headset displays); McGuffin 2022 (N=34, preprint, Moderate for headsets).
- Two-handed frame of reference: Guiard 1987 (theory); Hinckley et al. 1998 (Moderate).
- The best comfort and reading profile in the set (criteria 3, 11, 13, 14).

**Weaknesses.**

- Holding the diorama is an arm load, so fatigue is a 2, not a 3.
- Rendering a second, hand-held copy has an unmeasured frame cost.
- Counter-evidence: VR was worse for side-by-side comparison (Huang et al. 2023); 2D was better for
  remembering nodes and spotting change (Kotlarek et al. 2020).

**Criteria scores.** 3 on readability, occlusion, single pick, undo, viewing comfort, labels,
hidden state, silence and learnability; Low-confidence 3s on structure reading, sets and keeping
the UI off the data; 2 on fatigue and catalog coverage; 1 on editing. Index 84. Differentiation
High; learning value Very high.

**What a mock would teach us, and how to test it.**

- Smallest mock: a still diorama, the answer row with a sortable table form, "show in diorama",
  and "hold" in the off hand, on canned path and bridge questions. No question chips, no notes.
- Tasks: path-judgment and bridge-judgment questions ("is this the only route between these two
  groups?", "is this hub a bridge or the center of a clique?") on 300- and 1,000-node graphs.
- Conditions: held diorama; the row alone; the desktop flat; desktop 3D with mouse orbit.
- Measures: accuracy, time, and confidence calibration per answer; arm time above the elbow; Borg
  CR10; frame time.
- Decision it drives: whether depth in the hand is graphty's VR thesis. The Desk's "lift a lasso
  into the hand" is the same question, so it is tested here once.

**Walkthrough (Florentine families).** Pointing at Medici, the reader picks "Who did they
marry?": six partners light in the diorama and six cards fade into the row; the chips read
"neighbors of Medici, marriage ties, 6 of 15". "Who matters most? by PageRank": the row reads
Medici 0.146, Guadagni 0.098, Strozzi 0.088. "Compare with betweenness" turns the row into a
two-column table, and Strozzi drops from 3rd to 7th (0.103). "Path Strozzi to Pazzi" lights
Strozzi-Ridolfi-Medici-Salviati-Pazzi in 3D; "hold" puts those five and their neighbors in the off
hand, and turning them shows the path is the only route between the two halves of the network.
"What if they were gone?" shows a casualty row (Acciaiuoli alone; Salviati and Pazzi cut off) and
three ghosted pieces. At scale (illustrative fraud graph): a summary card ("140 counterparties: 5
groups, 12 flagged") plus the top 7; tapping a group pages its members.

---

### Prototype 2. The Graph Is the Material (bold)

**Why try it.** It is the boldest model with a concrete analytic payoff. Whether two nodes are
joined by only one route becomes physical slack in a rubber band; a what-if removal becomes a
snip. Nobody has studied direct physical manipulation of graph structure as a query language, so
it is both a possible breakthrough and the highest-uncertainty entry.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | The bubble cursor must highlight exactly the target before a pull or a snip counts. Go-Go reach extension (the virtual hand reaches farther than the real one beyond about two-thirds of arm length) so the arm stays near the body. The plain trigger stays the element's existing node drag.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Navigation             | The graph sits on a stage at 0.8-1.0 m with the forearm supported, not a tabletop within arm's reach; standard view controls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Commands               | Five acts on controllers (grip plus trigger, or an act mode). **Pull to expand**: pull length sets hops, with a haptic detent per hop on the analog trigger and the count shown before anything moves. **Rubber-band path**: stretch from source to target and it snaps to the shortest path; as it slackens, up to 3 alternative routes are released in a stated order. **Snip**: target first, the preview names exactly what will be cut, then the stroke confirms. **Pinch out**: remove a node as a what-if. **Tide**: a dial sets a threshold on an attribute. Every act has a no-hold twin: select, choose the act, set it by stick. An experiment: twist a held edge to re-weight it for the path computation. |
| Text and numbers       | Hop counts by detent or stick; the tide by dial; names through the shared text route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Reading results        | The count always shows before content moves ("6" at the first detent, "2 hops: 11" at the second); the latched count sits beside the live count; pieces that fall away are counted. A pull can replay the real breadth-first frontier ring by ring. The global legend and the status line sit on the answer row, as in prototype 1.                                                                                                                                                                                                                                                                                                                                                                                    |
| Running algorithms     | The acts are algorithms: k-hop expansion, shortest path plus k-shortest alternatives (Yen's algorithm, which graphty's algorithms package does not have yet), removal what-if, threshold filter. The rest of the catalog comes through the shared command layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Styling                | Not its focus; through the shared encode command. Graph editing (snip deletes, band creates an edge) is deferred to a separate, visibly badged mode that never shares a gesture with the what-if snip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Undo                   | Every act is previewed and undoable as one unit, and logged as a parameterized gesture ("pull Medici, 2 hops -> 11").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**What is unique.** The gesture is the command, and the graph's own structure is the interface. No
desktop control expresses "is there slack in this route?". The highest differentiation and delight
in the set.

**Strengths.**

- Highest delight; strong on structure reading and occlusion on paper.
- Every result previewable and undoable; a counted preview always comes before content moves.

**Weaknesses.**

- The highest fatigue risk; its fatigue score is 2 only because of the forearm support and the
  no-hold twins (Consumed Endurance, Hincapie-Ramos et al. 2014, N=20; Strong).
- Accidental commits: the press itself shifts the aim (Wolf et al. 2020, N=16; Moderate).
- Weak at scale without the community hierarchy; 1 on spatial arrangement and presentability.
- Depends on new algorithm work for the band's alternatives.

**Criteria scores.** 3 on undo, provenance and delight; Low-confidence 3s on structure reading,
occlusion, learnability and editing; 2 on the other critical criteria including fatigue; 1 on the
real world, arrangement, presentability and desktop transfer. Index 72. Differentiation Very high;
learning value Very high.

**What a mock would teach us, and how to test it.**

- Smallest mock: pull, band, snip, pinch out and tide on controllers with forearm support, on
  graphs of 500-2,000 nodes, with the no-hold twins built alongside. Hands only after controllers
  pass.
- Tasks: expand a node by k hops to a target count; decide "is this the only route?"; predict what
  a removal disconnects; set a threshold.
- Primary measures: accidental-commit rate (target under 1 percent); the gap between the count
  shown and the count latched.
- Also: Borg CR10 at 15 minutes; share of time with the hand above the elbow or beyond 0.6 m;
  whether people read band slack correctly as "only route"; task completion against Walk and
  Flick's verbs and the no-hold twins.
- Decision it drives: whether direct manipulation becomes a standalone mode, a set of accelerators
  inside other models, or is dropped.

**Walkthrough (Florentine families).** Grip and trigger on Medici, draw back: "6" shows at the
first detent before the six families move; at the second detent, "2 hops: 11". Release latches 11
beside the live count; a click confirms the selection. A band from Strozzi to Pazzi snaps through
Ridolfi, Medici and Salviati; slackening it either releases the next routes or reports that there
is no other route of that length. Pick Medici, then snip: the preview names exactly its 6 ties, the
stroke confirms, and Acciaiuoli and the Salviati-Pazzi pair drop away, "3 pieces"; undo restores.
At scale: pulling a hub shows "140" and 5 bundles before anything moves; pulling a bundle unspools
its members.

---

### Prototype 3. Walk and Flick, with edge signposts

**Why try it.** It is the cheapest and most robust model, and it carries two questions no other
prototype answers: can people traverse a graph by its topology in a headset with the camera still,
and do edge signposts help? A signpost tells, for each neighbor of the current node, how many nodes
are reachable only through it, the best node beyond it, and the distance to a destination through
it. It also becomes the silent, resting-hands route for every other model.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | A sticky ray with a depth bead (slide along the ray by thumbstick) lands on a node; above about 300 nodes the bubble cursor is the default. "Set" on the ring opens add, subtract, intersect, select community, select component.                                                                                                                                                                                                                                             |
| Navigation             | The camera never moves on its own. Once a node is focused, the dominant thumbstick walks the topology: forward hops to the candidate neighbor, back retraces, left and right step through a neighbor carousel. Hubs above about degree 12 are walked as groups first (communities, or attribute buckets), then members, with jump-to-rank. "Jump to ray target" means walking is never the only way to a distant node. With nothing focused, both sticks keep today's flying. |
| Commands               | The off-hand thumbstick opens a fixed 4-verb ring: inspect, neighbors, path, run. Push toward a verb to preview, release to commit, the way game weapon wheels work. 8 directions and ballistic flicks come only after accuracy is measured. A no-timing mode (push highlights, a click commits) for tremor. A triage rail: flag, clear, refer, note, one press each with its own undo, plus bulk actions.                                                                    |
| Text and numbers       | Find-where: an attribute drum, operator chips and a digit drum for numbers; hop count by stick clicks; names from the prefix list, so text entry produces only names the graph contains.                                                                                                                                                                                                                                                                                      |
| Reading results        | An inspect card with every attribute; ranked results on a rail; signposts at the walked node, with their definition printed on first use; haptic step ticks and captioned readback.                                                                                                                                                                                                                                                                                           |
| Running algorithms     | "Run" on the ring opens the catalog list; the carousel re-sorts only between walks, with a "re-sorted by PageRank" chip.                                                                                                                                                                                                                                                                                                                                                      |
| Styling                | Through the shared encode command, reached from the ring's "more" slot; the candidate node is marked by outline thickness and pattern as well as color.                                                                                                                                                                                                                                                                                                                       |
| Undo                   | B undoes and cancels a running algorithm; Y redoes; stick-back restores the previous view or selection.                                                                                                                                                                                                                                                                                                                                                                       |

**What is unique.** It navigates topology instead of space. The same thumb motions do the same thing
on every node, and it is the only model built for resting hands that never needs pointing into
depth.

**Strengths.**

- Best on fatigue, silence, provenance and pick precision.
- Works at any graph size because it is topological.
- Cheap to build on the element's existing thumbstick handling.
- Structural navigation is known to work on desktop and tablet (TADA 2024; Moderate), and an
  egocentric neighborhood view helped search (Sorger et al. 2021; Moderate).

**Weaknesses.**

- Medium differentiation: much of it would work with a gamepad on a desktop.
- Walking is slow for distant targets, so it is measured only on local tasks.
- Raycast panels were the most consistently usable VR menus (Wentzel et al. 2024) and panels were
  preferred over radial menus (IEEE Access 2019, N=51); the ring has to beat that. The marking-menu
  learning evidence is from pen input (Extrapolated).

**Criteria scores.** 3 on single pick, fatigue, undo, several routes, silence and provenance;
Low-confidence 3 on scale; 2 on structure reading, occlusion, sets and catalog; 1 on the real
world, arrangement, presentability and editing. Index 73. Differentiation Medium; learning value
High.

**What a mock would teach us, and how to test it.**

- Smallest mock: ray plus bead, walking with hub groups, the 4-verb push-and-release ring,
  stick-click hops, the rail with bulk triage, signposts on, on real controllers with measured
  stick drift.
- Tasks: k-hop inspection, broker judgment, stepping along a computed path, triage of 50 alerts, a
  degree-40 hub.
- A/B: the ring vs the same verbs on a raycast panel; walking vs ray pick on a path-tracing task;
  signposts on vs off; push-and-release vs flick; 4 vs 8 directions.
- Measures: wrong-verb rate; false activations while resting; thumb actions per minute; learning
  over 3 sessions; whether the signpost definition is understood. Recruit participants with
  arthritis and essential tremor.
- Decision it drives: whether the topology cursor is the default resting-hands grammar, and whether
  signposts ship as an element capability on their own (if they work without travel, egocentric
  hop travel stays optional).

**Walkthrough (Florentine families).** The prefix list "Me" picks Medici; its signposts appear
(Acciaiuoli "0 only this way"; Salviati "1 only this way: Pazzi"; Ridolfi "1: Strozzi"). Push
toward "neighbors": "6 of 15" previews; release commits. Run PageRank: the rail reads Medici 0.146,
Guadagni 0.098, Strozzi 0.088; a second rail by betweenness puts Strozzi 7th at 0.103. Path from
Strozzi to Pazzi: Strozzi-Ridolfi-Medici-Salviati-Pazzi, then "walk along path" steps it node by
node. "Without" on Medici previews 1 -> 3 pieces; B cancels. At scale (illustrative): find-where
degree > 100 finds a hub; "neighbors" previews 140; the carousel walks 5 amount groups first;
jump-to-rank 25 lands on the 25th; triage moves down a 300-alert rail one press each, and "clear
all from source X" removes 40 at once.

---

### Prototype 4. Then and Now: the volumetric lens

**Why try it.** Comparison is the task where the evidence says VR loses (Huang et al. 2023;
Kotlarek et al. 2020). It is also central to the scientist, ML engineer and fraud users: this week
vs last, with vs without a node, PageRank vs betweenness. A design that beats the desktop on
comparison would be a real differentiator; one that cannot tells us to send comparison back to
the desktop.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | The shared cursor. The lens, a box or sphere placed in the graph, is world-locked by default; holding it in the hand is an accelerator; its size is set by stick.                                                                                                                                                         |
| Navigation             | The world stays still. Node positions are pinned to one layout across all states, so a difference is a difference and not a re-layout.                                                                                                                                                                                    |
| Commands               | Pick a second state: a time window, a what-if, a second algorithm's result, or a saved view. "Swap" exchanges inside and outside. A difference view toggle. Later: an arc of 3 copies drawn as points.                                                                                                                    |
| Text and numbers       | A keypad for exact dates; a time dial with detents (visual ticks always, since Vision Pro has no haptics).                                                                                                                                                                                                                |
| Reading results        | Differences counted on the lens rim ("6 ties removed, components 1 -> 3"). The difference view marks appeared, disappeared and changed elements by shape and pattern as well as color, with counts. Values are read in a sortable table. A sparkline of change counts on the dial's track answers "when did this start?". |
| Running algorithms     | A second algorithm's result can be the second state; time steps use the element's existing time window and batch-run functions.                                                                                                                                                                                           |
| Styling                | The lens is a per-region reader-added style override, never an algorithm's suggested style.                                                                                                                                                                                                                               |
| Undo                   | Undo restores the comparison set. Snapshot changes are limited well under 3 per second with a cross-fade; reduced motion makes the scrub step-only, so it never flashes.                                                                                                                                                  |

**What is unique.** The other state is placed where it differs, instead of being squeezed into rows.
The only new element work is a neutral snapshot diff returning {added, removed, changed}.

**Strengths.**

- The only model that covers time and condition comparison.
- Built on existing element functions (the time window and its batch runs).
- Flashing is designed out.

**Weaknesses.**

- The counter-evidence is direct.
- The lens and copies have an unmeasured frame cost on Quest 3S.
- Magic lenses are an old technique (Viega et al. 1996), so the novelty is only in applying them to
  graph states.
- The mental map helped less than expected in dynamic graphs (Archambault, Purchase, Pinaud 2011).

**Criteria scores.** 3 on undo, silence, provenance and delight; Low-confidence 3 on best
representation; 2 on every critical criterion; 1 on the real world and editing. Index 71.
Differentiation Medium-High; learning value High.

**What a mock would teach us, and how to test it.**

- Smallest mock: the lens and the difference view on two static states (with and without Medici;
  PageRank vs betweenness) at 300-1,000 nodes. Then the arc of 3 copies; then the dial on a real
  public timestamped network (an email or transaction network; check the license).
- Tasks: "what changed?" questions.
- Conditions: lens, difference view, two rows, a simple toggle, a desktop side-by-side view.
- Measures: time and accuracy; FMS during the scrub; frame time.
- Decision it drives: whether comparison stays in the headset or is routed to the desktop or a flat
  table.

**Walkthrough (Florentine families).** The lens set to "without Medici", placed over the center,
shows 3 pieces inside it (Acciaiuoli alone; Salviati and Pazzi cut off) while the world outside
stays whole; the rim reads "6 ties removed, components 1 -> 3". The difference view marks the 6
removed ties by a dashed pattern. The arc shows three copies by PageRank, betweenness and degree;
Medici is first in all three; selecting Strozzi links it across them (3rd by PageRank, 7th by
betweenness). At scale (illustrative): weekly payment windows; one dial step from week 30 to 31
reads "212 new transfers, 9 new accounts, the hub gained 14 counterparties", and the sparkline
shows the spike began in week 27.

---

### Prototype 5. The Desk: passthrough desk, linked flat slab, real keyboard

**Why try it.** It has the best profile in the set and is the most likely to become the productive
daily mode, because it keeps the keyboard, the coffee and colleagues visible and rests the forearm.
Its own lesson is not depth (prototype 1 tests that) but whether a linked flat picking surface on a
real desk, plus real typing, makes headset analysis as fast as the desktop.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | A tilted slab about 20-25 degrees below eye level at about 0.8 m shows a deterministic 2D layout, linked node for node to the 3D graph beyond the desk, used for picking and lasso with the forearm on the desk. The ray on the slab with the bubble cursor if no mouse; a mouse only if its events reach the session. |
| Navigation             | An immersive passthrough session (the element already supports AR). The desk is calibrated by plane detection, by the resting controllers, or by a 3-point touch, and re-anchors on recenter. The 3D graph floats beyond the desk. A no-desk profile puts the slab at lap level, on an armrest or a wheelchair tray.   |
| Commands               | If keyboard events arrive: Ctrl+K with completion chips, defaults and a cost estimate; every chord also works as a sticky-modifier sequence; Esc cancels. If not: the docked command strip plus Walk and Flick's ring.                                                                                                 |
| Text and numbers       | The real keyboard (gated on the platform check); otherwise the shared text route.                                                                                                                                                                                                                                      |
| Reading results        | Upright boards at focal distance (about 1.2-1.5 m), for example a sortable linked attribute table, because near content tires the eyes (Hoffman et al. 2008); the legend on a board at reading distance, not on the slab edge (about 0.8 m away), which would force refocusing.                                        |
| Running algorithms     | Typed by name in the command palette, with cost shown.                                                                                                                                                                                                                                                                 |
| Styling                | Through the palette and the shared encode command.                                                                                                                                                                                                                                                                     |
| Undo                   | Keyboard or strip undo; Esc cancels a running job.                                                                                                                                                                                                                                                                     |

**What is unique.** It uses the real world as part of the interface: a supported surface,
passthrough and real typing beside a 3D graph. It does not recreate a desktop inside VR.

**Strengths.**

- Highest on core-loop speed, parameters, and entering, leaving and the real world, if the keyboard
  works.
- Strong on picking and sets.
- Passive haptics from a real surface helped (Lindeman et al. 1999, N=32); typists need to see
  their hands (Knierim et al. 2018, N=32); desktop plus VR beat VR alone (Tong et al. 2025, N=18);
  seated desk work was comfortable (VirtualDesk 2018). All Moderate.

**Weaknesses.**

- Its top scores rest on an unverified fact: keyboard and mouse events in immersive WebXR.
- The slab is near content, so viewing comfort is 2.
- Vision Pro WebXR offers no passthrough (verify), so it gets only a virtual desk.
- Weak on presentability.

**Criteria scores.** 3 on every critical criterion (structure reading at Low confidence), and on
speed (Low), parameters (Low), the real world, silence, provenance and desktop transfer; 2 on
viewing comfort; 1 on presentability and editing. Index 87. Differentiation Medium-High; learning
value High.

**What a mock would teach us, and how to test it.**

- Day one: do keyboard and mouse events arrive? That decides the model's shape.
- Smallest mock: passthrough, desk calibration, the slab with lasso, one attribute-table board, and
  the command palette if keys arrive.
- Tasks: the core task battery against the desktop and the raycast-panel control; slab picking at
  1,000 nodes.
- Measures: time per task; picking errors; near-content time; calibration success.
- Stop rule: if the keyboard check fails and slab picking does not beat the ray, cut The Desk rather
  than ship its fallback stack.
- Decision it drives: whether "VR at the desk" is the default analyst posture, with the more
  immersive modes as excursions from it.

**Walkthrough (Florentine families).** Ctrl+K "med", Enter: Medici is selected on the slab and in
3D. "nei" shows [Medici][neighbors][1 hop] previewing 6; Enter. "pagerank", Enter: the table board
at focal distance sorts Medici 0.146, Guadagni 0.098, Strozzi 0.088, with a beam to the focused
row. Without a keyboard, the same steps run from the name list and the off-hand ring. At scale:
"=degree > 100" finds the hub; the slab keeps its 140 neighbors pickable as points; a lasso selects
one group.

---

### Prototype 6. Measure Space (bold)

**Why try it.** Almost every model treats depth as force-layout noise. Measure Space makes all
three axes data the analyst chose, for example PageRank on x, betweenness on y, and z either flat
or re-solved by a force layout with x and y held fixed, with the graph's edges still drawn. It
looked cheap and carried the most untested claims; its follow-up review (below) found it neither
cheap nor as strong as claimed, and moved it from third to sixth.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | The shared bubble cursor. Per-axis range brushes with typed endpoints become a set selection with a count preview.                                                                                                                                                                                                                                                                                                                     |
| Navigation             | Turn the whole space in the hand to defeat occlusion. One press collapses an axis to give the flat 2D twin. Layout changes are user-started and masked.                                                                                                                                                                                                                                                                                |
| Commands               | Pick a measure (from the attribute list or a result), then pick an axis rod; dragging is an accelerator. Up to three rods; any axis can keep the force-layout position. A log/linear toggle per axis. Log, linear and rank scales per axis; a list of the stacked nodes when a pick lands on ties. z = time (a stack of snapshots) is left to Then and Now (prototype 4): it needs a snapshot data model and multiplies what is drawn. |
| Text and numbers       | Typed brush endpoints; axis ticks.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Reading results        | Each axis shows its scale, units and ticks at reading distance; a hovered node's three values on a card; the flat twin for exact reading.                                                                                                                                                                                                                                                                                              |
| Running algorithms     | Measures come from computed results; an uncomputed measure runs first through the shared command layer, with its cost shown.                                                                                                                                                                                                                                                                                                           |
| Styling                | Position is the encoding; color and size through the shared encode command; the legend card states the axis scales.                                                                                                                                                                                                                                                                                                                    |
| Undo                   | Each arrangement is a logged, undoable step.                                                                                                                                                                                                                                                                                                                                                                                           |

**What is unique.** The only model in which position in all three dimensions means something the
analyst chose. It applies attribute axes to graph measures while keeping the edges, which appears to
be new in a headset; on flat screens, semantic substrates, PivotGraph, GraphDice and hive plots
already place nodes by measures with edges drawn. It also gives graphty-element a reusable attribute-axis layout any view can switch on
("z = PageRank"), and it would improve the desktop too.

**Strengths.**

- Sets by brushing measures; fully reproducible positions.
- The one-press flat twin satisfies "exact values from text or a planar view".
- Silent, easy to log, presentable.

**Weaknesses.**

- Occlusion in a 3D scatter with edges: its occlusion score is only 2.
- Reading values in depth is slower (Barrera Machuca and Stuerzlinger 2019; Moderate).
- The evidence for the base idea is exploratory: ImAxes (Cordeil et al. 2017; Weak). Cluster
  finding in VR scatterplots helped (Kraus et al. 2020, N=18; Moderate, but scatterplots, an
  analogue only).

**Criteria scores.** As first scored: 3 on undo, silence and provenance; Low-confidence 3s on
structure reading, best representation, sets, spatial arrangement and delight; index 76. As
rescored by the follow-up review: 3 on undo and provenance; a Low-confidence 2 on structure
reading; 2 on every other critical criterion; 1 on hidden state, the real world and editing;
index 67. Differentiation Medium-High; learning value High, but much of it can be learned on a
desktop.

**Follow-up review.** Verdict: keep with changes, and move down (all four reviewers).

- Usability: a first-time analyst sees the graph re-form into a scatter strung with edges, most
  nodes piled in one corner. The insight arrives on the 15-node Florentine graph and is much harder
  to see at 1,000 nodes.
- Structure reading drops from a claimed 3 to 2 at Low confidence: placing nodes by measures
  removes the layout that shows bridges and communities, and the walkthrough's insight is read
  from two numbers a flat scatter shows as well. Best representation drops to 2 (a measure on z is
  a value read from depth, which criterion 3 forbids as the only route); sets, spatial arrangement
  and silence drop to 2; hidden state drops to 1, because nodes with a missing value, or a zero on
  a log axis, silently disappear.
- Gates: raised arm is fixable by an edit (rest the space on a stage at desk height, top below eye
  level, 1.0-1.3 m away, turned by a supported grab or the thumbstick, not held); "every core task
  in the headset" is fixable by saying it is a view mode of a host model (paths, neighbors,
  compare and annotate come from the host); presentation neutrality is fixable by an edit (axis
  words come from the app); no-harm needs a component, a new layout engine (the element's force
  engine can already pin single axes, and a fixed layout places nodes from data).
- Cost: about 2-3 person-weeks, not days (the layout engine, legible axes, typed range brushes,
  animated transitions, tie handling, the flat twin).
- Remaining objections: ties and zeros (four of the fifteen Florentine families have betweenness 0) need a rank scale and a stacked-node list; at 5,000 nodes the edges become a web across the
  space; a "layout" axis may be read as data, so it needs a distinct look.
- Changed test: build the measure-axis layout as an element feature and test it on the desktop in
  3D first, with a "run A against run B" task; the headset mock then tests only what depth adds.

**What a mock would teach us, and how to test it.**

- Smallest mock: two rods plus "layout" on z, on the Florentine graph and on a 1,000-node graph
  with three computed measures.
- Tasks: "which highly central nodes bridge two communities?"; a dense-cluster judgment.
- Comparison: a desktop 2D scatter with edges, and the same measure-axis layout in a mouse-orbited
  3D view on the desktop.
- Measures: accuracy and time; head pitch; occlusion complaints; whether analysts pick measure
  combinations unprompted.
- Decision it drives: whether depth-as-data becomes a standard view option in graphty-element.

**Walkthrough (Florentine families).** PageRank on x, betweenness on y, "layout" on z. Medici
stands alone at the far corner (0.146, 0.522); Guadagni next (0.098, 0.255); Strozzi sits high on
PageRank (3rd) but only 7th of 15 on betweenness (0.088, 0.103): a well-connected family that
brokers less than its PageRank suggests. The marriage edges run across the space, so the reader sees that Strozzi's ties all point
back into the dense cluster. Collapsing z gives the flat scatter. At scale (illustrative): amount on
x, degree on y, week on z; a column of accounts rising in degree over consecutive weeks stands out
as a growing hub.

---

### Prototype 7. Point and Say, Wizard of Oz first

**Why try it.** graphty's catalog has about 60 algorithms and about 20 layouts. Speech fused with
pointing ("path from this to that", "compare this and that") reaches all of it without a menu. It
is also the one complete route for people with no usable hands. The first step costs no
engineering: a person plays the recognizer.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | Each "this" or "that" binds to the pointer target at the moment that word is spoken (the target held longest in a 300 ms window), resolved through the bubble cursor, and shown as a chip before commit. Hands-free profile: a head-pose pointer with smoothing, dwell or a single switch, and numbered tags.                                                                                                                                                                                                                      |
| Navigation             | Words for next, previous, back, frame and fit; the standard view controls.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Commands               | Push-to-talk, or toggle-to-talk that ends on silence. A capped grammar: verbs, catalog names, attribute names and a biased set of visible and recently touched node names. Every utterance becomes visible parse chips and a preview once the parse is stable; commit by button, pinch, dwell or "do it". Ambiguity goes to a tray of the recognizer's alternative readings. The same grammar can be typed. A silent twin (the ring or the docked strip) is the default for repetitive tasks, open offices and confidential names. |
| Text and numbers       | Speech carries names, measures, attributes and numbers; names not in view are fuzzy-matched against the full name list; opaque ids go to the prefix list. Notes use a separate dictation check.                                                                                                                                                                                                                                                                                                                                    |
| Reading results        | Borrows the answer row and table from prototype 1; readback and captions.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Running algorithms     | By name: "run PageRank on everyone".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Styling                | By voice through the shared encode command ("color by PageRank"), shown as a sentence first.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Undo                   | Undo by description ("undo the without"), or a button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**What is unique.** The grammar is biased toward the graph's own words; every command is visible and
editable before it acts; it is the route for users without hands.

**Strengths.**

- Best on parameters and catalog reach; best on learnability; low arm load.

**Weaknesses.**

- Web Speech is reportedly absent in the Quest browser and in desktop Chrome sends audio to a server
  (verify); an on-device recognizer must pass a frame-cost check.
- Not silent and not confidential in an open office.
- Speech and pointing are often not simultaneous (Oviatt 1999; Moderate, 2D pen and voice), which
  is exactly what the study measures.
- Domain evidence for voice in graph VR is a preprint (Lee et al. 2026; Weak). Impaired speech needs
  personalization (Shor et al. 2019).

**Criteria scores.** 3 on parameters, fatigue, undo, catalog, several routes, provenance and
learnability; 2 on every other critical criterion and on silence; 1 on the real world, arrangement,
presentability and editing. Index 73. Differentiation Medium; learning value High.

**What a mock would teach us, and how to test it.**

- Step 1, Wizard of Oz: a person hears the participant and drives the parse chips by hand.
  Measures: grammar vs menu time and errors; a log of when people point relative to when they
  speak; five planted ambiguous requests, each of which should be answered with a question.
- Step 2, only if step 1 is promising: the on-device recognizer check on Quest 3S with a 1,000-node
  graph: no frames dropped beyond the baseline, latency, and top-3 name recall of at least 95
  percent on 1,000 real names. Candidate on-device recognizers: sherpa-onnx streaming with
  hotwords; Moonshine; an open recognizer with fuzzy matching of its alternatives against the graph
  vocabulary.
- Include at least one participant with no usable hand function.
- Decision it drives: whether voice is an accelerator worth an on-device recognizer, and the
  per-word binding window. A pluggable recognizer interface in graphty-element is needed for the
  no-hands route either way.

**Walkthrough (Florentine families).** "Show me the Medici": [find][Medici], framed. Pointing at
Medici while saying "who did they marry into" binds "they" at that word and previews 6; "select"
commits. "Run PageRank on everyone", "do it": Medici 0.146, Guadagni 0.098, Strozzi 0.088.
"Compare this" (pointing at Strozzi) "and that" (pointing at Medici): two chips, then degree 4 vs 6,
betweenness 0.103 vs 0.522. "Path from this to that" between Strozzi and Pazzi:
Strozzi-Ridolfi-Medici-Salviati-Pazzi. "Without Medici" shows 3 pieces; "undo the without"
restores. At scale: "find accounts with degree over 100", then "its counterparties" previews 140,
groups first.

---

### Prototype 8. Hands Only: the resting-hands pinch gate

**Why try it.** Vision Pro has no controllers, so look-and-pinch onto a pie menu at the target, plus
a docked command strip, must be built regardless; building that teaches little. The open question
is the expert tier: can 2-4 frequent verbs be fired with index and middle-finger pinches while the
hands rest in the lap, on the desk or on an armrest, with no raised arm and no looking at the hands?
If yes, it is the hands-only equivalent of Walk and Flick's resting thumbs. If no, we learn it
cheaply. Whether resting hands stay tracked at all is now checked in prototype 0; this prototype
keeps the gesture test.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | Look and pinch (Vision Pro; the gaze ray exists only at the pinch, so there is no hover and previews come after the pinch) or hand ray and pinch (Quest). With resting hands, a structural walk cursor (next or previous neighbor by pinch tap) or the name list picks nouns.                                                                                                                                                                                                                                                                                                     |
| Navigation             | Standard view controls by pinch; structural stepping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Commands               | Base tier: a pinch tap at the target opens a verb pie (a tap, not a hold), a second pinch picks; the command strip carries every pie verb, as the route with no timing at all. Expert tier: a deliberate double pinch, with an adjustable timing window, arms the recognizer and shows a visible armed state (palm-up pinch is avoided because Quest reserves it for the system menu); index and middle pinches on either hand give 4 targets, taps first; the fired verb echoes at the target as a text chip. The ring finger is dropped because it does not move independently. |
| Text and numbers       | The strip's keypad; the shared text route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Reading results        | The answer row from prototype 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Running algorithms     | "Run" on the pie opens the catalog list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Styling                | Through the shared encode command.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Undo                   | Strip buttons for undo and cancel; one-tap redo after a readback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**What is unique.** The only route to commands without raised arms or looking at the hands on
hands-only headsets.

**Strengths.**

- Silent; low arm load if tracking holds; pinches users remap themselves are recalled better
  (Nacenta et al. 2013, N=33; Moderate).

**Weaknesses.**

- Fingertip tracking error is about 1 cm worse under occlusion (Abdlkarim et al. 2024; Moderate).
- Fingers do not move independently (Hager-Ross and Schieber 2000, N=10; Moderate).
- Resting hands may leave the cameras' view.
- Low differentiation unless the gate passes.

**Criteria scores.** As first scored: 3 on undo, several routes, silence and provenance; 2 on
every critical criterion; a Low-confidence 2 on robust input; index 68. As rescored by the
follow-up review: 3 on several routes, silence and provenance; 2 on every critical criterion,
including undo and visible modes until the armed state is shown; 1 on robust input,
learnability, the real world, arrangement, presentability and editing. Index 64. Differentiation Low for the base tier, High for the expert tier; learning value
Medium.

**Follow-up review.** Verdict: keep with changes, move up one place (three of four reviewers),
and move its tracking check into prototype 0.

- Usability: on Quest the pie-and-strip base tier works but tires the arm with hand rays, and the
  resting tier fires by accident within a minute of talking with the hands unless it is disarmed
  by default.
- The original claim of "no timing anywhere" was false: a pinch-hold and a double pinch are both
  timed. The base tier now opens the pie with a tap, the strip carries every verb, and the
  double-pinch window is adjustable for tremor.
- Gates: web platform is unknown until a device test: Vision Pro, the headset this tier exists for,
  may not expose finger joints to Safari, and its thumb-index pinch is the system select, so only
  middle-finger targets are free there; the expert tier may be Quest-only. One-action read is
  fixable by an edit: on Vision Pro a pinch to read a label must not replace a built selection.
- Robust input drops to 1 (its own resting posture is where tracking is worst; palm-down on a desk
  hides the fingertips, and the lap is at the edge of Quest's tracking volume); learnability drops
  to 1 unless the pie shows which finger fires each verb.
- Single pick on Vision Pro is at risk of 1 (critical): commit on release, cancel by releasing off
  the target.
- Remaining objections: each resting pinch only previews, and the commit is a look-and-pinch on the
  strip, so the expert tier may save almost nothing; time verbs end to end. The test needs a
  calibrated recognizer (per-user open and closed distance, closure speed, middle finger), not the
  element's fixed 4 cm grab threshold. The full test is about a week, not a day.

**What a mock would teach us, and how to test it.**

- On Quest 3 and 3S, in lap, desk and armrest postures, each reported separately: a confusion
  matrix for the 4 targets, including the system pinch; false activations over 10 minutes of
  typing, fidgeting, talking with the hands and drinking; tracking dropouts. Include participants
  with tremor. Compare the same pinch on the thumb against the finger with the pinch in the air.
- Keep the gestures that reach about 98 percent (95 percent for previewed, undoable verbs) with
  under 1 false activation per 10 minutes; drop the rest. If a posture fails, say "desk or armrest
  only" rather than averaging.
- Decision it drives: whether hands-only headsets get a resting expert tier or stay on the pie and
  strip.

**Walkthrough (Florentine families).** Quest, hands only: pinch on Medici selects it; pinch-hold
opens the pie; a second pinch on "neighbors" previews "Neighbors (1 hop) of Medici: 6", and the
strip's commit applies it. Expert tier, hands resting on the desk after a double-pinch arm: an index
tap ("neighbors") on the walked node previews 6; a middle tap ("without") on Medici previews 1 -> 3
pieces, and "without" echoes at Medici; the strip's cancel clears it. Vision Pro: look at Strozzi
and pinch, pinch-hold for the pie, "path", look at Pazzi and pinch: the path lights.

---

### Prototype 9. Stand In It: room-scale spike (bold)

**Why try it.** Every other model is seated. Physical navigation has lab support on large displays,
and real walking gives more presence than virtual travel. If walking around and into a graph builds
spatial memory that seated viewing does not, that is something no desktop can copy. It is the
highest-uncertainty and highest-cost entry, so it is a short spike, not a full build: after the
follow-up review, a room-scale session added to the diorama prototype (prototype 1), whose seated
diorama is its only route to a passing fatigue score.

**Interaction patterns.**

| Need                   | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointing and selection | A ray from a lowered hand by default; near nodes may be poked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Navigation             | The graph is laid out to fill a cleared 2 x 2 to 3 x 3 m play area and stays inside its bounds, which are drawn (today's element always requests a `local-floor` space; it must first be able to ask for `bounded-floor`). Run in passthrough on Quest, so the room stays visible. Nodes sit between about 0.8 and 1.6 m, set from the user's measured eye height, and fade near the head. Walking replaces virtual travel, so there is no vection. The seated twin is the hand-held diorama with the same scope circle moved by stick, so standing is never required. |
| Commands               | A floor circle around the user's feet is the current scope; its radius is set by a wrist dial or stick and its count shows before anything changes. Other commands through the shared command layer.                                                                                                                                                                                                                                                                                                                                                                   |
| Text and numbers       | The shared text route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Reading results        | Answers come to a reading row at focal distance that follows the user's facing with lag, or to a room-sized findings wall. A status line counts what is outside the circle. Search hits and hubs outside the view play a soft, captioned spatial-audio cue where they are.                                                                                                                                                                                                                                                                                             |
| Running algorithms     | Through the shared command layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Styling                | Through the shared encode command.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Undo                   | The shared log.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**What is unique.** The body does the navigation, and where you stand is the query.

**Strengths.**

- No vection; spatial memory from movement; off-view information heard as well as seen; high
  delight.

**Weaknesses.**

- Standing and arm fatigue: its fatigue score is 1, a critical criterion below 2, reached only
  through the seated twin.
- Needs a cleared room; not silent in an office; slow on the core loop.
- Very long immersion is costly (Biener et al. 2022).
- The evidence is extrapolated: physical navigation with large displays (Ball, North and Bowman
  2007; Moderate, Extrapolated); real walking gave more presence (Usoh et al. 1999; Moderate).

**Criteria scores.** As first scored: Low-confidence 3s on structure reading, occlusion,
learnability and spatial arrangement; 3 on delight; 1 on speed, fatigue, the real world, silence,
editing and desktop transfer; index 67. As rescored by the follow-up review: structure reading a
Low-confidence 2, occlusion 2, viewing comfort 1; index 62, below the VR baseline.
Differentiation High; learning value High but costly.

**Follow-up review.** Verdict: keep as a spike only; move to last (three of four reviewers; the
analyst would fold it into prototype 1 as a variant session, which is what it now is).

- Usability: a first-time analyst enjoys the first minute of walking among nodes, then spends the
  session minding furniture and the boundary, reading labels behind or above them, and asking to
  sit down.
- Fatigue (critical) stays at 1; its only route to 2 is the seated diorama, which is prototype 1.
- Being inside a graph is the worst case for occlusion, so structure reading and occlusion drop to 2. Viewing comfort drops to 1: labels above chest-height nodes sit at or above eye level, the
  floor circle needs 45-60 degrees of neck flexion, and nodes come within 0.5 m of the eyes.
- Gates: motion needs a component (fade geometry near the head; walking through nodes flashes them
  past the near clipping plane); raised arm is fixable by an edit (the lowered-hand ray and the
  height band above); web platform is unknown: Vision Pro reportedly limits how far a user can walk
  in full immersion (verify), so this is a Quest mode.
- Remaining objections: "where you stand is the query" misleads, because nearness in a force
  layout is not nearness in the graph, so "6 in scope" counts the wrong thing unless the scope is
  defined by hops; a 3 x 3 m room holds about 1,000 nodes at most, so test 50-300 nodes or the
  community bubbles; recall a day later needs the graph in the same place, which needs a stable
  floor or a persistent anchor; analysts rarely need to recall an overview a day later; every
  captioned spatial-audio cue needs a visual direction cue too.

**What a mock would teach us, and how to test it.**

- Smallest mock: a 300-1,000-node graph in a 3 x 3 m space with the scope circle and audio cues,
  against the seated diorama.
- Tasks: overview recall after 1 day; a cluster-structure judgment; path finding; wayfinding to a
  named node.
- Measures: accuracy and time; FMS; Borg CR10 at 15 and 30 minutes; whether people walk unprompted
  (weak evidence, since participants know it is a walking study); frame time measured standing
  inside the graph.
- Decision it drives: whether a room-scale mode earns a place for briefings and recall tasks. If
  people do not walk unprompted, the answer is no, cheaply.

**Walkthrough (Florentine families).** In a 3 x 3 m room the families stand at chest height, Medici
at the center. Walking to Medici puts its 6 partners inside the scope circle ("6 in scope, 9
outside"). A search for "Strozzi" plays a soft cue behind the user's left shoulder; turning shows
Strozzi near the wall. PageRank raises the labels Medici 0.146, Guadagni 0.098 and Strozzi 0.088
above their nodes. At scale: the room holds 60 community bubbles; walking into one opens it in
place.

---

### Prototype 10 (optional). Guide and Diver: a two-person Wizard-of-Oz trial

**Why try it.** Every other prototype is one person alone. Several of graphty's use cases are two
people: one who knows the data and types fast, one who explores. The asymmetric pair (a Guide at
the desktop with the overview, a Diver in the headset inside the graph) may be the strongest reason
to put a headset on at all, because it splits the two things a headset is worst and best at:
typing and overview on one side, depth and presence on the other. The real mode needs a session
link between two devices (a signaling service, an owner decision), so this trial fakes the link.
It is optional because it tests a use case, not an interaction technique, and it costs no
engineering.

**Set-up.** Two participants who know each other, one dataset (the Florentine graph, then a
1,000-node graph). The Guide sits at the desktop graphty app. The Diver wears a Quest running the
same dataset in the headset build from prototype 0 or 1. The Guide sees the headset view through
the platform's casting to a browser tab. An experimenter plays the missing link: when the Guide
selects nodes or says "go to Medici", the experimenter relays it, and the Diver applies it with the
headset's own controls, or refuses. Nothing moves the Diver without their action, so the motion
gate holds. A second run puts the Guide in another room with a voice call and typed messages read
aloud, so speech is not the only channel. If the trial looks promising, a test-only relay page
(about a day of work) replaces the human relay before anything is built for real.

**Tasks.** A joint investigation of about 15 minutes: "which family brokers between the two
factions, and what would happen if it were removed?" on the Florentine graph; then a
find-and-explain task on the larger graph. The pair then swaps roles. A solo control runs the same
tasks with one person on the desktop app alone.

**Measures.** Time and correctness against the solo control; who typed, who pointed and who
decided, coded from the session video; how often the Diver accepted or refused a "go there";
sickness (FMS) for the Diver; each
participant's rating of which role they would want; whether the Guide ever asks to put the headset
on.

**Decision it drives.** Whether the collaboration mode (a desktop Guide and a headset Diver sharing
one session) is worth building the session link for, and whether that link must carry selection,
"come here" and beacons, or only a shared view. If pairs are no faster or better than one person
at the desktop, the session link waits.

**Limits.** A human playing the link responds faster and more sensibly than software would; the
trial overstates the real mode, so it can rule the mode out but not prove it.

---

### Which question each prototype answers

| Prototype                                    | The one question it settles                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. Hand-held diorama                         | Does holding and turning structure beat desktop 3D at judging it?                          |
| 2. The Graph Is the Material                 | Can direct manipulation of structure be a precise, low-fatigue query language?             |
| 3. Walk and Flick with signposts             | Can resting thumbs traverse topology, and do signposts guide it?                           |
| 4. Then and Now lens                         | Can superposition in place overturn VR's known weakness at comparison?                     |
| 5. The Desk                                  | Does a linked flat slab plus a real keyboard make headset analysis as fast as the desktop? |
| 6. Measure Space                             | Does depth carry data readably when the analyst chooses what it means?                     |
| 7. Point and Say (Wizard of Oz)              | Do speech and pointing fuse well enough to replace menus for parameters and the catalog?   |
| 8. Hands Only gate                           | Can verbs be fired reliably by resting-hand pinches?                                       |
| 9. Stand In It                               | Does walking through a graph build memory and judgment that seated viewing does not?       |
| 10. Guide and Diver (optional, Wizard of Oz) | Does a desktop Guide plus a headset Diver beat one analyst at the desktop?                 |

---

## 7. Other models considered

Twenty-two whole interaction models were considered. The ones not prototyped, and why:

- **Wayfinder (egocentric travel).** Stand on a node; neighbors on an arc at reading distance; hop
  along edges with fades. Scores well (3s on comfort, labels, hidden state and scale) but its two
  lessons are covered: signposts are tested on the still cursor in prototype 3, and egocentric
  views already have support (Sorger et al. 2021). Hop travel adds a sickness risk. Build it if
  signposts work and users ask to "go there".
- **Result Objects (a palette made of your analysis state).** Computed results, attributes and sets
  are wells you place into color, size, label and highlight sockets; a well's histogram is a range
  filter. Sound, and this study's best answer to the Tilt Brush palette, but its sockets resemble
  Tableau's shelves and the deciding comparison (docked palette vs a flat encoding panel) is an
  incremental A/B test on the foundation's panels, not a mock.
- **The Instrument (a scope-and-verb grammar played on the body).** Scope chords on finger segments
  plus verb flicks. The finger-segment grammar is unproven and hard on hand tracking; it survives
  only as the gated expert tier of Hands Only (prototype 8).
- **Your Hands Are the Toolbar.** A toolbar on the body's surfaces; merged into The Instrument (12
  finger-segment targets are unproven).
- **A Palette Made of Your Data** and **Clay and Rods (results and attributes you plug in).** Merged
  into Result Objects; the axis rods became Measure Space; the hand acts went to The Graph Is the
  Material.
- **Shadow Desk, Lamplight and Drafting Table.** Three versions of the desk idea (a 2D shadow on the
  desk; analyses chosen by placing lights; a pen on the graph's shadow); merged into The Desk.
- **Desk Portal (the desktop app stays the control surface).** The least novel; it became a control
  condition and the companion link.
- **Phone in Hand.** The phone as palette, keyboard and pointer: the best text channel and the least
  differentiated; it became the shared companion-phone link, deferred until in-headset text is
  shown to be too slow. A browser page cannot accept incoming connections, so it needs a small
  signaling service (a decision for the owner).
- **A Second Analyst in the Room (an AI agent).** An agent is not VR-specific; it became an opt-in
  layer whose plans are editable command sentences, run on-device for confidential graphs. Never
  part of the core loop.
- **Second Graph (the analysis is a graph too).** A provenance view rather than a command channel;
  it became the shared history layer.
- **Case Room** and **Case Wall (a live link chart you lay out yourself).** A findings store rather
  than a way of exploring; it became a findings wall shared by every model.
- **Atlas (walk the graph of communities).** Became the shared community hierarchy for scale.
- **Draw the Shape (find structure by sketching it).** The value is the pattern matcher, which works
  as well from a 2D menu; it became a shared pattern query (pull real nodes out to form the
  stencil), to be validated with fraud and cyber practitioners first.
- **Question Bench (predict, then watch the algorithm work).** Too slow as a main loop; it became
  an optional teach mode.
- **Bring It Here (one pointer, one button, everything comes to you).** A floor every model must
  meet, not a competitor; it became the required accessibility layer.
- **Guide and Diver (one sees the whole, one stands inside).** Needs two people and the session
  link; it became a later collaboration mode. Its cheap Wizard-of-Oz pairing trial is optional
  prototype 10 in section 6.
- **Briefing Theater (perform the analysis for an audience).** A mode, not an analysis model; it
  became present mode and saved views.

Two ideas from an earlier graphty study (2026-10-08, see section 9) were not among the 22 models
and were not reviewed here. Both are about leaving and re-entering the headset view (criterion 18,
which scores 1 almost everywhere), so they belong in the foundation, not in competition with the
prototypes above:

- **Same-page dip-in.** The graphty app already runs in the headset browser's 2D window. The user
  prepares data there, presses Enter VR, and the same page and the same graphty-element instance go
  immersive, so selection, results, styles and undo carry over with nothing to synchronize (the
  graph's place in the room and session-only state do not; section 4).
  Anything the headset UI lacks (loading a file, export, a rare setting) is one "finish this on the
  page" press away, and each such trip is logged so the next in-headset panel is built where the
  data says it is needed. It is the surest route for opening a file from the headset's storage and saving a file the
  user keeps; loading from a URL and autosave work inside a session (section 4). It is now the
  first check in prototype 0: seconds out and back on the same state, and whether session-only
  options (hand tracking, layers, anchors) survive re-entry.
  Follow-up review: keep, and move to the front of prototype 0 (all four reviewers). It would take
  entering and leaving (criterion 18) from 1 to about 3 for every model. It fails on its first
  round trip today, because of the two element defects in section 4. Bearings (criterion 4,
  critical) stay at 1 until the graph's position in the room is restored on re-entry. The app's
  dense desktop UI is barely legible at about 20 pixels per degree in the headset browser, so the
  app needs a headset density setting. Remaining objections: what happens to a pending preview or
  mode at exit is undefined; the trip log is usage telemetry and must stay on the device; leaving
  needs a brightness fade.
- **The same page on a PC over Quest Link.** Desktop Chrome or Edge on Windows can run WebXR through
  the Meta OpenXR runtime, so the desktop app and its files run on the PC while the graph is in the
  headset, with almost no extra code. Developers report controller detection trouble (report). A
  one-day device check in prototype 0.
  Follow-up review: keep, reframed (all four reviewers). The first claim made for it, that the
  monitor, keyboard and tables "stay" available, does not hold for the person in the headset: no
  passthrough to desktop Chrome is known (verify), so the monitor is invisible and typing is blind.
  It is therefore not the cheapest form of The Desk's keyboard, whose premise is seeing your hands.
  What it is good for: a fast development loop; a spectator mirror on the monitor (the best one in
  this study); the desktop control condition; and, through the desktop GPU, the only route found to
  graphs of 10,000-50,000 nodes without aggregation. Remaining objections: Link's video compression
  softens fine text; frame rates over Link say nothing about a standalone headset; it is
  Windows-only and needs a capable GPU and a cable or Air Link set-up.

---

## 8. Open questions and the riskiest assumptions

**Riskiest assumptions.**

- **That depth helps analysis on a headset at all.** The strong evidence is on desktop stereo
  displays and on path tracing, not on judgments about computed results; headset studies are mixed.
  Prototype 1 settles this before anything else is invested.
- **That the element can draw enough.** The element draws one object per node; the real flat-graph
  ceiling in a headset is unmeasured and may be a few thousand nodes. Fraud, cyber and intelligence
  graphs start far above that, which makes the community hierarchy a precondition, not an extra.
- **That platform input arrives.** Keyboard, mouse and switch events in immersive sessions, the
  system keyboard, gamepad touch flags, hand tracking in resting postures, the cost of on-device
  speech, Vision Pro passthrough and layers: each unverified, and each would reshape one or more
  prototypes.
- **That comfort holds for the bold models.** The Graph Is the Material and Stand In It carry the
  highest fatigue and sickness risk; their no-hold and seated twins must be real routes, not
  afterthoughts.
- **That comparison can be won in VR.** The counter-evidence is direct. Prototype 4 may simply
  confirm that comparison belongs on a flat surface.
- **That the personas are right.** graphty's personas are marked unvalidated; the use cases built on
  them are hypotheses. The strongest fit judged here is for intelligence, supply-chain,
  bioinformatics and marketing analysts with bounded graphs and audiences to brief; fraud and
  cyber have the right tasks but the time pressure and graph sizes that make a headset costly.
- **Novelty.** First-session preference is inflated by novelty and first-session speed deflated by
  learning; every study reports preference and speed from a second session.

**Open questions.**

- How should panels be drawn: app HTML to a texture, Babylon's 3D GUI, or the element's label
  textures? Decided by the two-day spike.
- Do edge signposts make sense to people? Their definition ("nodes beyond this neighbor whose every
  shortest path from here starts with this edge") must be understood, not only useful.
- Does Yen's k-shortest-paths need to land in graphty's algorithms package before the rubber band
  is worth mocking, or can the mock fake it on small graphs?
- Is the 2x-desktop speed target the right bar for the core loop? It is provisional.
- Are measures as axes, with edges drawn, useful at all? Measure Space's follow-up review moved
  that question to a desktop test, before any headset mock.
- Which file routes work inside a Quest Browser session, and does a press in VR count as the user
  gesture a file input needs? The half-day test in prototype 0 settles it.

**Decisions that are hard to undo, for the owner, before anything ships (not before mocks).**
Prototypes keep all of these private or in the session until two prototypes use them:

- the panel-surface API graphty-element would publish;
- graphty-element's default XR controller bindings (today both triggers grab the world): a
  remappable binding layer with the current mapping as the default is additive; changing the
  default is breaking;
- the preview-before-commit contract;
- whether history branches persist, and whether tagging each step with its author is an additive
  change to the saved format;
- the signaling service for pairing a phone or desktop with the headset;
- the saved format for views, presentation stations and the findings wall;
- persisting the community hierarchy in the project file.

---

## 9. Sources

Evidence strength in brackets. Each literature reference below was checked against its original
(the publisher's page, arXiv or the authors' copy) on 2026-10-09; where a detail could not be
confirmed, the entry says so. "Verify" remains only on platform reports, which are claims to test
on a device. Every catalog option's own sources are listed with the option in
[the VR interaction option catalog](vr-interaction-option-catalog.md).

### Depth, structure and graphs in immersive displays

- Ware, C. and Franck, G. "Evaluating stereo and motion cues for visualizing information nets in
  three dimensions." ACM TOG 15(2), 1996. https://doi.org/10.1145/234972.234975 [lab; Strong on
  non-headset displays]
- Ware, C. and Mitchell, P. "Visualizing graphs in three dimensions." ACM TAP 5(1), 2008.
  https://dl.acm.org/doi/10.1145/1279640.1279642 [lab; Strong on non-headset displays]
- Greffard, N., Picarougne, F. and Kuntz, P. Stereoscopy and community identification, 2011
  (N=35), https://link.springer.com/chapter/10.1007/978-3-642-25878-7_21 ; and IEEE 3DVis 2014,
  https://doi.org/10.1109/3dvis.2014.7160095 [lab; Moderate, abstract read]
- McGuffin, M. et al. 2022, N=34. https://arxiv.org/html/2207.11586 [preprint; Moderate for
  headsets]
- Huang, H., Pfister, H. and Yang, Y. "Is embodied interaction beneficial? A study on navigating
  network visualizations." Information Visualization 22(3), 2023, N=20.
  https://doi.org/10.1177/14738716231157082 ; preprint https://arxiv.org/abs/2301.11516 [lab;
  Moderate]
- Kotlarek, J., Kwon, O.-H., Ma, K.-L., Eades, P., Kerren, A., Klein, K. and Schreiber, F. "A
  study of mental maps in immersive network visualization." IEEE PacificVis 2020.
  https://arxiv.org/abs/2001.06462 [lab; the participant count was not confirmed]
- Feyer et al. "2D, 2.5D, or 3D? An exploratory study on multilayer network visualisations in
  virtual reality." IEEE TVCG 2024, N=22. https://arxiv.org/html/2307.10674v2 [exploratory lab]
- Kraus, M. et al. IEEE TVCG 2020, N=18. https://doi.org/10.1109/tvcg.2019.2934395 [lab;
  scatterplots, an analogue]
- Whitlock, Smart, Szafir. IEEE VR 2020.
  https://cmci.colorado.edu/visualab/3DPerception/3DPerception.pdf [lab]
- Kwon, O.-H., Muelder, C., Lee, K. and Ma, K.-L. "A study of layout, rendering, and interaction
  methods for immersive graph visualization." IEEE TVCG 22(7):1802-1815, 2016.
  https://doi.org/10.1109/TVCG.2016.2520921 [lab]
- Sorger, J. et al. "Egocentric network exploration for immersive analytics." CGF 40(7), 2021.
  https://arxiv.org/abs/2109.09547 [lab; Moderate]
- Zimmermann and Bruckner, 2025. https://arxiv.org/html/2507.01140v1 [probe study, qualitative]
- Drogemuller, A. et al. J. Computer Languages 2020.
  https://www.sciencedirect.com/science/article/abs/pii/S2590118419300620 [lab; Moderate]
- Joos, L. et al. "Visual network analysis in immersive environments: a survey." 2025.
  https://arxiv.org/abs/2501.08500 [survey]
- Joos, L. et al. SUI 2024. https://dl.acm.org/doi/10.1145/3677386.3682102 [lab]
- Cordeil, M. et al. "Immersive collaborative analysis of network connectivity: CAVE-style or
  head-mounted display?" IEEE TVCG 23(1), 2017.
  https://research.monash.edu/en/publications/immersive-collaborative-analysis-of-network-connectivity-cave-sty/
  [lab; Moderate]
- Lee, S. Y.-T., Chen, H.-A., Yuniar, S., Bauer, D. and Ma, K.-L. "A design study on voice-based
  interaction for immersive network visualization and analysis." arXiv 2607.26526, submitted
  2026-07-29. https://arxiv.org/abs/2607.26526 [preprint, not peer reviewed; Weak]
- Nafis, F. et al. HCII 2024 (ParaView XR with domain experts). https://arxiv.org/abs/2406.13918
  [Moderate]
- Tong, W. et al. IEEE TVCG 2025, N=18. https://arxiv.org/abs/2502.00853 [lab; Moderate]
- Ens, B. et al. "Grand challenges in immersive analytics." CHI 2021.
  https://dl.acm.org/doi/fullHtml/10.1145/3411764.3446866 [position paper; Opinion]
- Cordeil, M. et al. "ImAxes." UIST 2017. https://doi.org/10.1145/3126594.3126613 [exploratory lab;
  Weak]
- Munzner, T. Visualization Analysis and Design, rules of thumb.
  https://www.cs.ubc.ca/~tmm/talks/vad/VAD-rules-4x4.pdf [Guideline]
- Andrews, Endert, North. "Space to think." CHI 2010. https://doi.org/10.1145/1753326.1753336
  [observational, documents]
- Lisle, L. et al. "Sensemaking strategies with Immersive Space to Think." IEEE VR 2021, N=17.
  https://doi.org/10.1109/VR50410.2021.00077 [observational, documents]

### Selection, pointing and manipulation

- Argelaguet, F. and Andujar, C. "A survey of 3D object selection techniques." Computers and
  Graphics 2013. https://dl.acm.org/doi/10.1016/j.cag.2012.12.003 [survey; Strong]
- Kopper, Bacim, Bowman. "SQUAD." IEEE 3DUI 2011, N=12. https://doi.org/10.1109/3DUI.2011.5759219
  [lab]
- Vanacken, L. et al. 3D bubble cursor and depth ray. IEEE 3DUI 2007.
  https://www.tovigrossman.com/papers/3dui2007selection.pdf [lab]
- Cashion, J. et al. "Expand." IEEE TVCG 2012. https://pubmed.ncbi.nlm.nih.gov/22402691/ [lab]
- Baloup, M. et al. "RayCursor." CHI 2019. https://doi.org/10.1145/3290605.3300331 [lab]
- Wolf, Gugenheimer, Combosch, Rukzio. CHI 2020, N=16. https://doi.org/10.1145/3313831.3376876
  [lab; Moderate]
- Qiu et al. IEEE VR 2026. https://arxiv.org/abs/2602.01061 [lab]
- Barrera Machuca, M. and Stuerzlinger, W. CHI 2019.
  https://dl.acm.org/doi/fullHtml/10.1145/3290605.3300437 [lab; Moderate]
- Poupyrev, I. et al. "The Go-Go interaction technique." UIST 1996 [lab]
- Guiard, Y. "Asymmetric division of labor in human skilled bimanual action." J. Motor Behavior 1987. https://doi.org/10.1080/00222895.1987.10735426 [theory]
- Hinckley, K. et al. Two-handed manipulation, ACM TOCHI 1998 [lab; Moderate]
- Abdlkarim, D. et al. Behavior Research Methods 2024. https://doi.org/10.3758/s13428-022-02051-8
  [lab; Moderate]
- Hager-Ross, C. and Schieber, M. J. Neuroscience 2000, N=10 [lab; Moderate]
- Mine, Brooks, Sequin. "Moving objects in space: exploiting proprioception." SIGGRAPH 1997.
  https://doi.org/10.1145/258734.258747 [lab]
- Pfeuffer, K. et al. "Gaze + Pinch." SUI 2017. https://dl.acm.org/doi/10.1145/3131277.3132180
  [concept paper, small study; shipped as the visionOS default]
- Meta, raycasting best practices. https://developers.meta.com/horizon/design/raycasting_bp/
  [Guideline]
- Apple, WWDC23 spatial design. https://developer.apple.com/videos/play/wwdc2023/10073/
  [Guideline]; WWDC24 WebXR on visionOS (transient pointer).
  https://developer.apple.com/videos/play/wwdc2024/10066/ [Constraint]
- Casiez, Roussel, Vogel. "1 euro filter." CHI 2012 [lab]

### Menus, commands and learnability

- Wentzel, J., Lakier, M., Hartmann, J., Shazib, F., Casiez, G. and Vogel, D. "A comparison of
  virtual reality menu archetypes: raycasting, direct input, and marking menus." IEEE TVCG
  31(9):4868-4882, 2025 (online 2024). https://doi.org/10.1109/TVCG.2024.3420236 [a survey of 108
  menu interfaces in 84 popular commercial VR applications, plus lab experiments; Moderate]
- "Comparison of radial and panel menus in virtual reality." IEEE Access 2019, N=51.
  https://ieeexplore.ieee.org/document/8786823/ [lab; Moderate]
- Kurtenbach, G. and Buxton, W. "User learning and performance with marking menus." CHI 1994.
  https://www.billbuxton.com/MMUserLearn.html [lab, pen; Extrapolated]
- Nacenta, M. et al. "Memorability of pre-designed and user-defined gesture sets." CHI 2013, N=33.
  https://research-repository.st-andrews.ac.uk/handle/10023/3486 [lab; Moderate]
- Chauvergne, Hachet, Prouzeau. CHI 2023. https://dl.acm.org/doi/10.1145/3544548.3581211 [lab]
- Sellen, Kurtenbach, Buxton. Held modes and mode errors. HCI 1992 [lab, desktop; Extrapolated]
- Stolte, Tang, Hanrahan. "Polaris." IEEE TVCG 2002 [shipped as Tableau]
- Bolt, R. "Put-that-there." SIGGRAPH 1980. https://doi.org/10.1145/965105.807503 [demo]
- Oviatt, S. "Ten myths of multimodal interaction." 1999.
  https://doi.org/10.1145/302979.303163 [review; Moderate]
- Viega, J. et al. "3D magic lenses." UIST 1996.
  https://doi.org/10.1145/237091.237098 [technique]
- Gleicher, M. et al. "Visual comparison for information visualization." Information Visualization 2011. https://doi.org/10.1177/1473871611416549 [taxonomy]
- Archambault, Purchase, Pinaud. IEEE TVCG 2011. https://doi.org/10.1109/TVCG.2010.78 [lab]
- Pirolli, P. and Card, S. "Information foraging." Psychological Review 1999 [theory]
- Willett, Heer, Agrawala. "Scented widgets." IEEE InfoVis 2007 [lab]
- Callahan, S. et al. "VisTrails." SIGMOD 2006. https://doi.org/10.1145/1142473.1142574 [system]
- Kim, Reinecke, Hullman. "Explaining the gap." CHI 2017. https://doi.org/10.1145/3025453.3025592
  [crowdsourced experiments]

### Text entry and companion devices

- Grubert, J., Witzani, L., Ofek, E., Pahud, M., Kranz, M. and Kristensson, P. O. "Text entry in
  immersive head-mounted display-based virtual reality using standard keyboards." IEEE VR 2018,
  N=24: novices kept about 60% of their desktop typing speed on a physical keyboard and about
  40-45% on a touchscreen keyboard. https://arxiv.org/abs/1802.00626 [lab; Moderate]
- Grubert, J. et al. "Effects of hand representations for typing in virtual reality." IEEE VR 2018,
  N=24: no difference in typing speed between hand representations.
  https://arxiv.org/abs/1802.00613 [lab]
- Knierim, P. et al. Physical keyboards in VR and the effect of seeing the hands. CHI 2018, N=32.
  https://doi.org/10.1145/3173574.3173919 [lab; Moderate]
- Speicher, M. et al. "Selection-based text entry in virtual reality." CHI 2018.
  https://doi.org/10.1145/3173574.3173883 [lab]
- Keypad vs slider for exact values. Virtual Reality 2017.
  https://link.springer.com/article/10.1007/s10055-017-0312-5 [lab]
- Zhu, F. and Grossman, T. "BISHARE." CHI 2020. https://doi.org/10.1145/3313831.3376233 [lab]
- Gugenheimer, J. et al. "ShareVR." CHI 2017. https://doi.org/10.1145/3025453.3025683 [lab, N=16]

### Comfort, fatigue, sickness and reading

- Hincapie-Ramos, Guo, Moghadasian, Irani. "Consumed endurance." CHI 2014.
  https://doi.org/10.1145/2556288.2557130 [lab, biomechanics; Strong]
- Jang, Stuerzlinger, Ambike, Ramani. "Modeling cumulative arm fatigue in mid-air interaction." CHI 2017. https://dl.acm.org/doi/10.1145/3025453.3025523 [lab; Strong]
- Kim et al. Shoulder load at three target distances with an AR headset. Applied Ergonomics 2020, N=20.
  https://health.oregonstate.edu/sites/health.oregonstate.edu/files/kim_biomechanical_ar.pdf
  [lab; Moderate]
- Penumudi, S. et al. Applied Ergonomics 2020.
  https://www.sciencedirect.com/science/article/abs/pii/S0003687019302194 [lab]
- Wagner Filho, J. et al. "VirtualDesk." CGF 2018.
  https://onlinelibrary.wiley.com/doi/abs/10.1111/cgf.13430 [lab; Moderate]
- Lindeman, R. et al. Passive haptics for panels in immersive environments. CHI 1999, N=32.
  https://doi.org/10.1145/302979.303064 [lab; Moderate]
- Hoffman, D. et al. Vergence-accommodation conflicts. Journal of Vision 2008.
  https://jov.arvojournals.org/article.aspx?articleid=2122611 [lab; Strong]
- Zhang, Chen, Sun. SIGGRAPH 2023. https://dl.acm.org/doi/10.1145/3588432.3591495 [lab]
- Hansen, J. P., Rajanna, V., MacKenzie, I. S. and Baekgaard, P. "A Fitts' law study of click and
  dwell interaction by gaze, head and mouse with a head-mounted display." COGAIN 2018 (ACM), N=41:
  throughput mouse 3.24, head 2.47, gaze 2.13 bits/s. https://www.yorku.ca/mack/etra2018.html [lab;
  Moderate]
- Meta, hands UI best practices (touch panels at 42-46 cm; targets 2.5-3 degrees; avoid 0.5-0.8 m;
  ray UI at 0.8-3 m). https://developers.meta.com/horizon/design/hands-ui-best-practices/
  [Guideline]
- Microsoft, typography for mixed reality (minimum and comfortable text heights in degrees).
  https://learn.microsoft.com/en-us/windows/mixed-reality/design/typography ; interactable object
  sizing. https://learn.microsoft.com/en-us/windows/mixed-reality/design/interactable-object
  [Guideline]
- Microsoft mixed reality comfort guidance.
  https://learn.microsoft.com/en-us/windows/mixed-reality/design/comfort [Guideline]
- Saredakis, D. et al. Cybersickness meta-analysis (55 articles, 3,016 participants). Frontiers in
  Human Neuroscience 2020.
  https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2020.00096/pdf
  [meta-analysis; Strong]
- Fernandes, A. and Feiner, S. Field-of-view restriction. IEEE 3DUI 2016, N=30 [lab]
- Stanney, K. et al. Frontiers in Robotics and AI 2020.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7805626/ [review]
- Meta locomotion best practices.
  https://developers.meta.com/horizon/design/locomotion-best-practices/ [Guideline]
- Photosensitivity in headsets. ACM TACCESS 2024.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11872230/ [analysis]
- Biener, V. et al. A week of work in VR. IEEE TVCG 2022, N=16. https://arxiv.org/abs/2206.03189
  [lab; Moderate]
- Google Research. Geometry-aware passthrough, N=24.
  https://research.google/blog/mind-the-gap-geometry-aware-passthrough-mitigates-cybersickness/
  [lab]
- Bowman, Koller, Hodges. Travel in immersive environments. VRAIS 1997.
  https://doi.org/10.1109/VRAIS.1997.583043 [lab]
- Ball, North, Bowman. Physical navigation with large displays. CHI 2007. https://doi.org/10.1145/1240624.1240656 [lab;
  Extrapolated from large displays]
- Usoh, M., Arthur, K., Whitton, M., Bastos, R., Steed, A., Slater, M. and Brooks, F. "Walking >
  walking-in-place > flying, in virtual environments." SIGGRAPH 1999.
  https://doi.org/10.1145/311535.311589 [lab]
- Meta typography guidance. https://developers.meta.com/vr/design/styles_typography/ [Guideline]
- Dingler, Kunze, Outram. CHI EA 2018, N=18. https://kaikunze.de/papers/pdf/dingler2018vr.pdf [lab]
- Kojic, T. et al. QoMEX 2020, N=22. https://arxiv.org/html/2004.01545v1 [lab]

### Accessibility

- Mott, M. et al. ASSETS 2020, 16 people with limited mobility.
  https://doi.org/10.1145/3373625.3416998 [interview and observation; Moderate]
- Meta VRC accessibility items.
  https://developers.meta.com/horizon/resources/vrc-quest-accessibility-4/ [Guideline]
- W3C XR Accessibility User Requirements. https://www.w3.org/TR/xaur/ [Guideline]
- Android XR design guides. https://developer.android.com/design/ui/xr/guides [Guideline]
- TADA, structural navigation of node-link diagrams for blind readers. CHI 2024.
  https://arxiv.org/html/2311.04502v3 [lab; Moderate, desktop and tablet]
- Zhao, Y. et al. "SeeingVR." CHI 2019, N=11 [lab]
- Shor, J. et al. Personalizing speech recognition for impaired speech. Interspeech 2019.
  https://arxiv.org/abs/1907.13511 [lab]

### Platform facts and products

- Apple developer forum: immersive-ar on visionOS. https://developer.apple.com/forums/thread/756850
  [verify]
- WebKit: natural input for WebXR on Apple Vision Pro (transient pointer).
  https://webkit.org/blog/15162/introducing-natural-input-for-webxr-in-apple-vision-pro/
  [Constraint]
- Meta: WebXR system keyboard. https://developers.meta.com/horizon/documentation/web/webxr-keyboard/
  [Guideline]; WebXR hands (palm pinch reserved).
  https://developers.meta.com/horizon/documentation/web/webxr-hands/ [Guideline]
- A-Frame issue on Bluetooth keyboard events in Quest Browser.
  https://github.com/aframevr/aframe/issues/5271 [report; verify]
- Mixed News: Meta Immersive Web SDK 1.0 gaze and pinch.
  https://mixed-news.com/en/meta-immersive-web-sdk-1-0-gaze-and-pinch-webxr/ [press; verify]
- MDN: showSaveFilePicker browser support.
  https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker [Constraint]
- Android XR WebXR support. https://developer.android.com/develop/xr/web [Guideline]
- Meta community forum: WebXR over Quest Link from desktop Chrome.
  https://communityforums.atmeta.com/discussions/dev-quest/webxr-with-a-quest-connected-to-desktop-using-link/833765
  [report]
- On-device recognizer candidates: sherpa-onnx, https://github.com/k2-fsa/sherpa-onnx ; Moonshine,
  https://github.com/moonshine-ai/moonshine (the old usefulsensors/moonshine address redirects
  there) [project pages; frame cost unmeasured]
- Earlier graphty study (2026-10-08) whose two strongest ideas are recorded in section 7:
  [VR user interface options for graphty](vr-ui-options.md).
- Meta developer forum: SpeechRecognition in WebXR.
  https://communityforums.atmeta.com/discussions/dev-quest/speechrecognition-in-webxr/1168273
  [verify]
- UploadVR: Meta shutting down Horizon Workrooms.
  https://www.uploadvr.com/meta-shutting-down-horizon-workrooms/ [Anecdote]
- 9to5Mac: returning the Vision Pro. https://9to5mac.com/2024/02/19/returning-the-vision-pro/
  [press; Weak]
- Wang, X. et al. CHI 2020, study with 7 experts.
  https://doi.org/10.1145/3313831.3376657 [small study]
- Shipped references used as precedents: Tilt Brush / Open Brush off-hand palette; Gravity Sketch;
  Half-Life: Alyx; Job Simulator; console weapon wheels; visionOS look and pinch; Quest hand-tracking
  system UI [Shipped].
