# VR interaction options for graphty: the full option catalog

This is the full catalog of VR interaction options for graphty, the graph visualization and
analysis product: every input, menu, tool, view and metaphor found or invented, grouped by family,
with how each works and where it comes from. It is a companion to the report
[VR interaction options for graphty](vr-interaction-options.md), which states the success criteria,
condenses this catalog to one line per option (its section 5), and evaluates and ranks the
prototypes worth mocking. This file itself is NOT evaluated.

Exact duplicates were removed. Near-duplicates (the same mechanism described by different
researchers) were merged into one entry that keeps the richest description and every source; the
"Merged from" line names the titles folded in. Distinct variants of one idea are kept as separate
entries. Option numbers match the report's section 5.

Each entry gives: how it works, inputs, what the user sees, what it is good for in graphty, where it
comes from and how strong the evidence is, and sources. "Invented" means no prior art was found; it
has no evidence.

Evidence shorthand: "lab study (N=...)" = controlled user study; "shipped" = in a released product;
"guideline" = platform design guidance; "prototype" = research system without a strong study;
"invented" = no evidence.

## Families

Marks: R = researched or shipped elsewhere; A = a known idea given a new use here; I = invented
here, no prior art found.

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

---

## 1. Pointing and selection

### 1.1 Plain ray-cast with trigger

- How: Straight ray from the controller; the first hit highlights; trigger selects.
- Inputs: controller pose, trigger. Visual: beam, hit dot, outline.
- Good for: baseline node and panel picking at a distance.
- Origin and evidence: shipped everywhere; Bowman and Hodges, I3D 1997 (lab study); Wentzel et al., IEEE TVCG 2025 (lab study: ray-cast menus slow but most consistently usable).
- Sources: https://www.cs.princeton.edu/courses/archive/spring01/cs598b/papers/bowman97.pdf ; https://johannwentzel.ca/projects/vrmm/index.html

### 1.2 Depth ray / RayCursor

- How: A marker slides along the ray via thumbstick or touchpad; the nearest pierced object to the marker is the candidate.
- Inputs: pose, thumbstick Y, trigger. Visual: bead on the beam, rings on pierced nodes.
- Good for: picking occluded nodes in dense cores and edges in bundles.
- Origin and evidence: Grossman and Balakrishnan, UIST 2006; Vanacken et al., 3DUI 2007 (lab study: best in dense scenes); Baloup et al., CHI 2019 (lab study, code public).
- Sources: https://www.dgp.toronto.edu/~ravin/papers/uist2006_volumetricselection.pdf ; https://www.tovigrossman.com/papers/3dui2007selection.pdf ; https://gery.casiez.net/raycursor/

### 1.3 3D bubble cursor

- How: A capture sphere grows until it touches exactly one target, so it never misses.
- Inputs: pose, trigger. Visual: morphing translucent sphere.
- Good for: small or distant nodes.
- Origin and evidence: Vanacken et al., 3DUI 2007 (lab study); MultiFingerBubble, CHI EA 2022.
- Sources: https://www.tovigrossman.com/papers/3dui2007selection.pdf ; https://dl.acm.org/doi/10.1145/3491101.3519692

### 1.4 Flashlight / aperture cone

- How: A cone instead of a ray; the object closest to the axis wins; cone width adjustable.
- Inputs: pose, trigger, stick for the angle. Visual: a light cone lighting nodes.
- Good for: soft region selection, spotlight exploration.
- Origin and evidence: Liang and Green, JDCAD 1994; Forsberg et al., UIST 1996 (research).
- Sources: https://people.cs.vt.edu/~bowman/papers/3dui_presence.pdf

### 1.5 Progressive refinement (SQUAD)

- How: Sphere-cast a coarse set, then split it into quarters on a flat 2x2 menu until one remains.
- Inputs: pose, trigger, quadrant pick. Visual: nodes fly out onto a flat board.
- Good for: one node out of a hairball; a flat, labeled list moment.
- Origin and evidence: Kopper, Bacim, Bowman, 3DUI 2011 (lab study).
- Sources: http://cs.ucf.edu/courses/cap6121/spr11/readings/Selection.pdf

### 1.6 Scored sticky ray (IntenSelect, bent ray)

- How: Objects near the ray accumulate a score over time; the ray bends to the winner; tolerates tremor and moving targets.
- Inputs: pose, trigger. Visual: bent beam.
- Good for: picking while the force layout moves; thin edges.
- Origin and evidence: de Haan et al., EGVE 2005 (lab study); Riege et al., 3DUI 2006.
- Sources: https://publica.fraunhofer.de/entities/publication/be4b1043-920d-4b41-a9c5-ff96701a470a

### 1.7 Adaptive ray filtering and expanding targets

- How: 1 euro filter smoothing scaled by hand speed; hit areas expand near the ray.
- Inputs: pose. Visual: none, or halo growth.
- Good for: hittable small nodes and edges without redrawing them.
- Origin and evidence: Casiez et al., CHI 2012; Fitts study, arXiv 2023 (lab).
- Sources: https://gery.casiez.net/1euro/ ; https://arxiv.org/html/2308.12515

### 1.8 Topology cursor (graph-aware stick hopping)

- How: Anchor on a node with the ray; thumbstick flicks hop along neighbors or BFS layers instead of moving through space.
- Inputs: ray, trigger, stick flicks, stick click. Visual: hop arcs, a compass rose of neighbors.
- Good for: neighbor browsing and path following at any density.
- Origin and evidence: invented.

### 1.9 Hand ray plus pinch

- How: A ray from the shoulder through the palm; pinch selects, pinch-drag moves; a two-hand drag zooms slates.
- Inputs: palm pose, pinch. Visual: ray with a donut cursor.
- Good for: distant nodes in room-scale graphs; panels.
- Origin and evidence: shipped (HoloLens 2 point-and-commit, Quest system ray); guideline.
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/design/point-and-commit

### 1.10 Gaze selects, hand acts (gaze + pinch)

- How: Look at a node and pinch with the hand anywhere (at rest); after the pinch, hand motion manipulates the target. In WebXR on Vision Pro this arrives as a transient pointer: the gaze ray exists only at pinch time and no gaze hover is exposed to web pages.
- Inputs: eye tracking (gaze ray at pinch time), pinch, hand motion. Visual: gaze hover highlight (native only), pinch flash; targets about 3 degrees minimum.
- Good for: fast, low-effort selection of distant nodes in dense 3D graphs; long sessions.
- Origin and evidence: Pfeuffer et al., SUI 2017 (lab study); shipped as the visionOS primary input; Apple guideline.
- Sources: https://eprints.lancs.ac.uk/id/eprint/156432/ ; https://ieeexplore.ieee.org/abstract/document/10568496 ; https://webkit.org/blog/15162/introducing-natural-input-for-webxr-in-apple-vision-pro/ ; https://developer.apple.com/news/?id=fi8ne6ji
- Merged from: "Gaze + pinch", "Gaze selects, hand acts (gaze + pinch)".

### 1.11 Semi-pinch multi-select

- How: While half-pinched, add each looked-at node by dwell or swipe; completing the pinch commits the set.
- Inputs: pinch distance, gaze or ray. Visual: basket counter, ringed nodes.
- Good for: seed sets for algorithms, path endpoints, comparisons.
- Origin and evidence: PinchCatcher, CHI 2025 (lab study).
- Sources: https://arxiv.org/abs/2503.05456

### 1.12 Image-plane selection: head crusher, framing hands, sticky finger

- How: Select what appears between pinching fingers, or inside a two-hand frame, as seen from the eye.
- Inputs: eye position, finger joints. Visual: projected frame outline.
- Good for: selecting a visible region regardless of depth; frame-to-zoom.
- Origin and evidence: Pierce et al., I3D 1997 (research prototype).
- Sources: https://www.cs.cmu.edu/~stage3/publications/97/conferences/3DSymposium/HeadCrusher/index.html

### 1.13 Volumetric brush, lasso, crossing and slab selection

- How: Sweep a sphere brush to paint a selection, draw a mid-air lasso loop or a crossing stroke with a controller or pinched fingertip, span a box between the hands, or cast a palm cone and pinch.
- Inputs: pose or fingertip trajectory, trigger or pinch, grip to subtract, stick for brush size, palm direction. Visual: glowing trail, cone volume, tinted selected nodes.
- Good for: selecting clusters and communities in one gesture; cutting edge sets; grabbing everything in a direction.
- Origin and evidence: Lucas, VT thesis 2005 (lab study); Slicing-Volume, IEEE VR 2020 (lab study); INTERACT 2023; Freehand multi-object selection in VR HMDs 2024 (lab study); HandConeGrid, CHI EA 2023 (lab study).
- Sources: https://people.cs.vt.edu/bowman/cs6724/lucas_mos.pdf ; https://discovery.ucl.ac.uk/id/eprint/10106533/ ; https://arxiv.org/pdf/2409.00982 ; https://dl.acm.org/doi/fullHtml/10.1145/3544549.3585615
- Merged from: "Volumetric brush / lasso / slab selection", "Mid-air lasso, crossing and cone selection".

### 1.14 Reference plane with drop lines

- How: Each node drops a stem to a shared plane; users point at the 2D plane instead of the 3D cloud to avoid depth ambiguity. Twist: the plane's axes are two data columns, so picking is also a scatter-plot brush.
- Inputs: ray or finger on an adjustable plane. Visual: nodes on flagpoles over a disc.
- Good for: selection in dense 3D layouts.
- Origin and evidence: shipped (Elite Dangerous galaxy map, route plotting on a 3D graph); forum advice and complaints.
- Sources: https://steamcommunity.com/app/359320/discussions/0/1495615865209923175/ ; https://github.com/gbiobob/ED3D-Galaxy-Map

### 1.15 Poke with the index fingertip

- How: The extended index finger presses nodes or buttons; a shallow push is hover, a deep push is press; a swipe scrolls.
- Inputs: index tip, press planes. Visual: button depresses, fingertip proximity ring.
- Good for: near-panel commands, tapping nodes in a hand-sized graph, scrolling results.
- Origin and evidence: shipped and guideline (Meta poke, HoloLens 2 direct touch).
- Sources: https://developers.meta.com/horizon/documentation/unity/unity-isdk-poke-interaction/

### 1.16 Hand proximity as hover (proximity glow, poke-the-bubble)

- How: Labels, values and neighbors bloom as a hand nears a node, and interactables glow on approach; pinch commits. Variant: choices are bubbles popped with a fingertip instead of ray clicks; nodes nearest the fingertip in a dense region swell into pokeable bubbles (a local fisheye).
- Inputs: fingertip or palm distance. Visual: a spotlight following the hand; approach glow; bursting bubbles.
- Good for: skimming neighborhoods, detail on demand without selecting; near-field choices.
- Origin and evidence: Hover UI Kit (built for a force-directed graph VR demo), Ultraleap guidance (demo, guideline); shipped in Little Cities hand tracking and Cosmonious High (reviews, dev blog).
- Sources: https://github.com/aestheticinteractive/Hover-UI-Kit ; https://medium.com/@zachkinstner/devup-force-directed-graph-vr-hand-held-user-interface-audio-feedback-downloadable-demo-93bb2dad0bab ; https://mixed-news.com/en/little-cities-review/ ; https://owlchemylabs.com/blog/handy-dandy-dev
- Merged from: "Hand proximity as hover", "Proximity glow and poke-the-bubble".

### 1.17 Head-gaze reticle with dwell or a single confirm button

- How: A reticle fixed at the center of the view is aimed by turning the head. A node is selected by dwelling on it, or by one button, a pinch or a spoken "select". The hands-free baseline that works on every headset, with no controllers and no eye tracker. Until now it appeared only as a stand-in inside other entries (4.10, 16.5, 26.2).
- Inputs: head pose (always available in WebXR), dwell timer or one discrete confirm. Visual: center reticle with a dwell-progress ring; the node under it highlights.
- Good for: hands-busy or controller-free sessions, accessibility, the fallback when hand tracking is lost, Vision-Pro-style use on headsets with no eye tracking.
- Origin and evidence: shipped (Google Cardboard, early Gear VR and Oculus Go menus); Qian and Teather, SUI 2017 (lab study, about N=12: head pointing beat eye-only pointing in VR); Kyto et al., CHI 2018 (lab study comparing precise head- and eye-based selection).
- Sources: https://dl.acm.org/doi/10.1145/3131277.3132182 ; https://dl.acm.org/doi/10.1145/3173574.3173655

### 1.18 Mouse or trackpad driving a 3D cursor in the immersive scene

- How: A Bluetooth mouse or laptop trackpad drives a cursor that slides over the graph's surfaces at the depth of whatever it is over, so precise 2D motion selects 3D nodes. The wheel changes depth or zoom. Differs from 22.4 (virtual monitors) and 25.4 (desktop beside the headset), where the mouse stays on a 2D screen.
- Inputs: mouse or trackpad, buttons, wheel. Visual: a depth-following 3D cursor.
- Good for: long seated analysis sessions, precise picking in dense graphs, low arm fatigue.
- Origin and evidence: Teather and Stuerzlinger, 3DUI 2011 (lab study: mouse competitive with or better than tracked pointing for 3D targets). Feasibility gap: WebXR delivers no mouse events into an immersive session on most browsers.
- Sources: https://ieeexplore.ieee.org/document/5759222

### 1.19 Eye-and-head combined pointing (head refines what the eyes point at)

- How: Eye gaze makes a quick rough pick and a small, separate head turn nudges the cursor or confirms it. Gaze-only dwell picks by accident and head-only pointing tires the neck; together they give precise hands-free picks in a dense 3D graph. Differs from 1.10 (gaze plus pinch), 1.17 (head reticle) and 26.8 (smooth pursuit).
- Inputs: continuous eye tracking plus head pose; WebXR exposes no continuous gaze, so in the browser only a head-pose fallback works today. Visual: gaze cursor with a head-driven fine offset ring.
- Good for: hands-free precise node pick in clutter, accessibility, hands busy sculpting.
- Origin and evidence: Sidenmark and Gellersen, Eye&Head, UIST 2019 (lab study, about N=12-16; strong evidence for the technique, low web feasibility).
- Sources: https://dl.acm.org/doi/10.1145/3332165.3347921

### 1.20 Gaze-depth (vergence) selection of occluded nodes

- How: The eyes converge at a different depth for a near node than for the node behind it; matching vergence to the nodes along the gaze line picks the occluded node with no depth cursor or second step. Targets the graph's main 3D problem, nodes stacked along the line of sight; the catalog's depth tools (1.2 RayCursor, 1.5 SQUAD) all use the hand.
- Inputs: binocular eye tracking (native only; not in WebXR). Visual: depth-highlighted candidate along the gaze line.
- Good for: picking behind-the-front nodes in dense 3D layouts.
- Origin and evidence: Sidenmark, Clarke, Newn, Lystbaek, Pfeuffer, Gellersen, Vergence Matching, CHI 2023 (lab study; moderate evidence, low web feasibility).
- Sources: https://dl.acm.org/doi/10.1145/3544548.3580685

---

## 2. Reach, grab and manipulation

### 2.1 Go-Go arm extension

- How: The virtual hand follows 1:1 near the body and extends non-linearly beyond about 2/3 of arm length.
- Inputs: hand-to-torso distance, grip. Visual: a flying virtual hand on a stretched ghost arm that runs ahead of the real one.
- Good for: grabbing deep or far nodes with a direct-manipulation feel; pulling nodes out of the hairball; pinning.
- Origin and evidence: Poupyrev et al., UIST 1996 (lab study).
- Sources: https://www.cs.princeton.edu/courses/archive/spring01/cs598b/papers/bowman97.pdf ; https://www.researchgate.net/publication/2817497_The_Go-Go_Interaction_Technique_Non-linear_Mapping_for_Direct_Manipulation_in_VR ; http://www.ivanpoupyrev.com/e-library/1998_1996/uist96.pdf
- Merged from: "Go-Go arm extension" (two entries), "Go-Go reach".

### 2.2 HOMER / scaled HOMER

- How: A ray selects, then the virtual hand jumps to the object for manipulation; velocity scaling for precision.
- Inputs: pose, trigger, grip. Visual: the ray collapses into the hand.
- Good for: dragging nodes; dropping a node onto a panel as an algorithm source.
- Origin and evidence: Bowman and Hodges, I3D 1997; Wilkes and Bowman, VRST 2008 (lab study).
- Sources: https://dl.acm.org/doi/10.1145/1450579.1450585

### 2.3 Fishing reel / telekinetic distance grab

- How: After a ray select (or a finger-pointed reticle), grab holds the distant object on an invisible rod; the thumbstick (or a crank motion, or an amplified arm push/pull) reels it in or out along the ray, and the hand rotates it. Twist: reel depth is hop distance, extending the selection outward hop by hop.
- Inputs: pose or finger ray, trigger or grip, thumbstick. Visual: fishing line or faint tether, spinning spool, reticle.
- Good for: bringing a node (with dangling neighbors) close to read; dragging and pinning far nodes while seated.
- Origin and evidence: Bowman and Hodges, I3D 1997 (lab study); shipped in I Expect You To Die (Schell Games) and Cosmonious High Distance Grab (Owlchemy, dev blog postmortem); crank variant invented.
- Sources: https://www.cs.princeton.edu/courses/archive/spring01/cs598b/papers/bowman97.pdf ; https://schellgames.com/portfolio/i-expect-you-to-die ; https://owlchemylabs.com/blog/handy-dandy-dev
- Merged from: "Fishing reel", "Telekinetic puppet (distance grab with reel)".

### 2.4 Gravity-glove pull / flick-to-summon

- How: Point roughly at a distant object (it glows), trigger locks it, a wrist flick arcs it into the palm on a physics trajectory, grip catches. Twist: it arrives with its 1-hop neighborhood dangling, a second flick adds hop 2, release springs it back home.
- Inputs: hand pose, trigger, wrist flick velocity, grip. Visual: highlight, glow and tether, tumbling arc.
- Good for: fetching a far node to a reading position without traveling.
- Origin and evidence: shipped (Half-Life: Alyx, Valve 2020); designer breakdowns and expert analysis.
- Sources: https://roadtovr.com/these-details-make-half-life-alyx-unlike-any-other-vr-game-inside-xr-design/ ; https://www.digipen.edu/showcase/news/with-half-life-alyx-digipen-graduate-kerry-davis-helps-redefine-vr-games ; https://www.darryllinardi.com/post/alyx-s-gravity-gloves ; https://en.wikipedia.org/wiki/Half-Life:_Alyx
- Merged from: "Gravity-glove pull", "Flick-to-summon (gravity gloves)".

### 2.5 PRISM precision manipulation

- How: The control/display ratio drops when the hand moves slowly.
- Inputs: pose, grip, optional precision button. Visual: offset line.
- Good for: fine node placement, slider scrubbing.
- Origin and evidence: Frees et al., ACM TOCHI 2007 (lab study).
- Sources: https://dl.acm.org/doi/10.1145/1229855.1229857

### 2.6 Voodoo dolls

- How: Hand-held miniature copies; the off-hand doll is the reference frame and the dominant doll moves the real object relative to it. Hand-sized dolls can stand in for distant clusters.
- Inputs: both controllers or hands. Visual: miniatures in each hand.
- Good for: placing a node relative to a cluster; comparing neighborhoods in hand; moving communities.
- Origin and evidence: Pierce et al., I3D 1999 (research); Poros, CHI 2021.
- Sources: https://dl.acm.org/doi/10.1145/300523.300540 ; https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445685 ; https://www.researchgate.net/publication/220792179_Voodoo_Dolls_Seamless_interaction_at_multiple_scales_in_virtual_environments

### 2.7 Direct grab and pinch of nodes

- How: Reach into the graph and grab (whole hand) or pinch (precise) a node to move or pin it; connected edges stretch and the layout reacts.
- Inputs: hand joints, grab or pinch strength. Visual: node swells on approach, contact ring, elastic edges.
- Good for: pulling a node out of a hairball, pinning, feeling structure.
- Origin and evidence: shipped and demo (Leap Motion Blocks / Interaction Engine, Meta Interaction SDK).
- Sources: https://blog.leapmotion.com/building-blocks-deep-dive-leap-motion-interactive-design/ ; https://developers.meta.com/horizon/design/hands-interaction-types/

### 2.8 Throw and fling to route results

- How: Throw nodes or result cards to targets: inspect panel, bin, compare tray, export.
- Inputs: release velocity. Visual: arc, pulsing targets.
- Good for: menu-free routing, building comparison sets.
- Origin and evidence: shipped games (Waltz of the Wizard, Leap demos); invented for analysis.
- Sources: https://www.uploadvr.com/waltz-wizard-magic-quest/

### 2.9 Consequence gestures (crush, toss, pocket)

- How: Accept by crushing in the hand, discard by tossing over the shoulder, keep by pocketing. Twist: toss to a parking wall for later.
- Inputs: squeeze, throw velocity. Visual: object deforms or flies away.
- Good for: hide by crushing, dismiss by tossing, keep by pocketing.
- Origin and evidence: shipped (Beat Saber rewards, Job Simulator); design analysis.
- Sources: https://medium.com/@sawantdarshini/beat-saber-vr-a-ui-ux-and-interaction-analysis-of-immersive-game-design-in-vr-d9a8039d9ee0

### 2.10 Magnetic snap with haptic click

- How: Pieces chunk together when close, with a haptic click and sound. Twist: snap strength follows similarity, so the hand feels the algorithm.
- Inputs: two-handed 6-DoF manipulation. Visual: pieces snapping.
- Good for: manual grouping, merging duplicates, creating edges.
- Origin and evidence: shipped (Puzzling Places); reviews.
- Sources: https://roadtovr.com/puzzling-places-review-quest/

### 2.11 Petri dish / cupped-hand subgraph holding

- How: Cup a hand under a selection, or pinch-pull it, to lift a hand-sized isolated copy into a dish held in the off hand. Carry it, compare two side by side, place it on a workbench; re-layout, edit, restyle or run algorithms on the copy without touching the original. Pour the dish back to apply its changes (a diff is shown first), or shelve it as a saved experiment.
- Inputs: cup hand shape, pinch-pull, controllers, voice to name the dish. Visual: subgraph shrinking into the palm; a small dish with its own layout, ghost lines to the source nodes, a diff badge.
- Good for: extracting ego networks or communities, safe what-if analysis, focused layout, side-by-side variants.
- Origin and evidence: invented; extends Voodoo Dolls, ImAxes and Worlds in Miniature (Stoakley, Conway, Pausch, CHI 1995).
- Sources: https://www.researchgate.net/publication/220792179_Voodoo_Dolls_Seamless_interaction_at_multiple_scales_in_virtual_environments ; https://doi.org/10.1145/223904.223938
- Merged from: "Cupped-hand subgraph holding", "Petri dish".

---

## 3. Navigation, scale and locomotion

### 3.1 Two-hand grab-the-world (handlebar, tabletop)

- How: Both grips (or pinches) form a handlebar: moving both translates, spreading apart scales, turning rotates; one-hand grip pulls the world. Lean in for detail, push away for overview; comfort vignette while moving. Twist: slide a cluster onto the table rim to park it as a detached subgraph.
- Inputs: two grab or pinch points, body lean. Visual: bar between hands with a scale percentage; tabletop diorama.
- Good for: core overview/detail navigation of the whole graph.
- Origin and evidence: shipped (Gravity Sketch, Open Brush, Google Earth VR, Demeo, Brass Tactics); Song et al., CHI 2012 (lab study); Drogemuller et al., J. Computer Languages 2020 (lab study on graphs); Google Daydream Labs locomotion blog.
- Sources: https://help.gravitysketch.com/hc/en-us/articles/5912757661597-scale ; https://help.gravitysketch.com/hc/en-us/articles/5912652221597-Moving-in-VR-Space ; https://www.researchgate.net/publication/239761342_A_handle_bar_metaphor_for_virtual_object_manipulation_with_mid-air_interaction ; https://doi.org/10.1016/j.cola.2019.100937 ; https://mixed-news.com/en/demeo-review-vr-co-op-role-playing-game/ ; https://blog.google/products/google-ar-vr/daydream-labs-locomotion-vr/ ; https://www.researchgate.net/publication/340803777_Whole_world_within_reach_Google_Earth_VR
- Merged from: "Two-handed grab-the-world", "Two-hand world grab (scale/rotate/move)", "Grab-the-world tabletop".

### 3.2 Spindle-and-wheel bimanual 7DOF

- How: A virtual axle between the hands; the midpoint is the pivot; twisting adds roll.
- Inputs: both poses and grips. Visual: rod with a wheel.
- Good for: orbiting the graph around a chosen node.
- Origin and evidence: Cho and Wartell, 3DUI 2015 (lab study); Guiard 1987 (theory).
- Sources: https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Guiard-JMB87.pdf

### 3.3 One-handed flying / steering

- How: Fly where the controller points; analog trigger sets speed.
- Inputs: pose, trigger, stick. Visual: vignette, speed lines.
- Good for: travel inside large graphs.
- Origin and evidence: Drogemuller et al. 2020 (lab study: faster than teleport for graph search); Meta comfort guideline.
- Sources: https://doi.org/10.1016/j.cola.2019.100937

### 3.4 Node-hop teleport

- How: The teleport arc can only land on nodes; you stand inside a node looking along its edges.
- Inputs: stick forward and release, snap turn. Visual: arc magnetized to nodes, edge corridors.
- Good for: egocentric neighborhood exploration, comfortable path walking.
- Origin and evidence: teleport shipped everywhere; node-only landing invented; egocentric views cf. Kwon et al., TVCG 2016.

### 3.5 World-in-miniature (WIM)

- How: A small copy of the graph sits on or in the off hand (or on a plate); picking or moving in the miniature acts on the full-scale graph, dragging your own marker moves you, pointing into it teleports. Variants: model in hand plus room-size detail; the miniature is the community-collapsed meta-graph.
- Inputs: off hand holds, dominant hand ray or picks. Visual: tabletop or palm-sized graph with a you-are-here frustum or marker.
- Good for: overview plus detail, region selection, selecting far or hidden nodes, travel, orientation in large graphs.
- Origin and evidence: Stoakley, Conway, Pausch, CHI 1995 (informal observation); Drogemuller et al., BDVA 2018 and 2020 (lab study: preferred for overview); Danyluk et al., CHI 2021 (design space survey); Yang et al., TVCG 2021 (lab study, model in hand vs room size).
- Sources: https://dl.acm.org/doi/10.1145/223904.223938 ; https://dl.acm.org/doi/10.1145/3411764.3445098 ; https://www.researchgate.net/publication/2598327_Virtual_Reality_on_a_WIM_Interactive_Worlds_in_Miniature ; https://wearables.unisa.edu.au/uploads/1/2/7/6/127656642/evaluating-navigation-techniques.pdf ; https://arxiv.org/abs/2008.09941
- Merged from: "World in miniature on off-hand", "World-in-miniature in the palm and voodoo dolls", "World-in-miniature and voodoo dolls", "World-in-miniature graph", "World-in-Miniature in the off hand", "E2 World-in-miniature panel", "Model in hand vs room-size". (Voodoo dolls kept as 2.6.)

### 3.6 Room-scale graph you walk through

- How: The graph surrounds the user at room size and walking is the navigation.
- Inputs: walking, head, ray or direct touch. Visual: standing inside the network.
- Good for: path tracing, local structure.
- Origin and evidence: Kwon et al., TVCG 2016 (lab study); Huang, Pfister, Yang, InfoVis journal 2023 (lab study N=20).
- Sources: https://dl.acm.org/doi/10.1109/TVCG.2016.2520921 ; https://arxiv.org/abs/2301.11516

### 3.7 Become a giant or an ant (god scale to human scale)

- How: The user scales themself while walking keeps working (eye separation scales with body size), or jumps between a desk-scale model and human scale to walk inside, then pops back out. Twist: at human scale edges become labeled corridors to neighbors and a node becomes a place.
- Inputs: scale gesture or toggle, two-hand scale, walking, teleport. Visual: the world shrinks or grows around you.
- Good for: multiscale exploration from communities down to ego networks; switching between graph-as-sculpture and standing on a node.
- Origin and evidence: GulliVR, CHI PLAY 2018 (lab study); GiAnt; shipped (Arkio, Gravity Sketch, Townsmen VR, Google Earth VR human scale; vendor case studies).
- Sources: https://doi.org/10.1145/3242671.3242704 ; https://www.arkio.is/ ; https://gravitysketch.com/blog-post/articles/how-confident-can-you-be-without-working-with-true-scale/ ; https://store.steampowered.com/app/749960/Townsmen_VR/
- Merged from: "Become a giant or an ant", "God-scale to human-scale jump".

### 3.8 Step inside a node (ego-bubble)

- How: Teleport onto or enter a node; its neighbors are arranged around you (evenly on a sphere, or a ring or cube sorted by attribute) with the rest of the graph behind; step toward or point at a neighbor to hop to it.
- Inputs: enter gesture, gaze or ray, trigger, walking. Visual: a sphere of neighbors around your head.
- Good for: ego networks, hop-by-hop paths.
- Origin and evidence: Sorger et al., CGF 2021; Takahira et al., Surrounded by Friends, SUI 2026 (lab study N=24).
- Sources: https://arxiv.org/abs/2109.09547 ; https://arxiv.org/pdf/2109.09547 ; https://arxiv.org/abs/2608.27194
- Merged from: "Step inside a node (egocentric)", "Ego-bubble: stand on a node".

### 3.9 Wear the node (ego-suit)

- How: Pull a node to the chest to become it; neighbors arrange on a sphere around you by edge weight, incoming edges attach to the chest and outgoing edges to the hands; walk through a neighbor to traverse.
- Inputs: put-on gesture, walking, turning. Visual: a personal planetarium of neighbors.
- Good for: neighbors, local structure, traversal, directed edges.
- Origin and evidence: invented (egocentric networks; proprioception from Mine, Brooks, Sequin, SIGGRAPH 1997).
- Sources: https://doi.org/10.1145/258734.258747

### 3.10 Walk inside a node (node as a room)

- How: Each node is a room with its attributes on the walls; each edge is a labeled doorway leading to the neighbor's room.
- Inputs: walking, teleport through doors, voice hints. Visual: room interiors with a miniature graph on a table.
- Good for: deep reading of one entity, path inspection, non-experts.
- Origin and evidence: invented.

### 3.11 Portals

- How: A frame shows another region, layout or filter of the graph; you can reach through it or step through it.
- Inputs: aim a frame, reach, step. Visual: a framed live view.
- Good for: comparing layouts or time steps, filtered x-ray views, jumping between regions.
- Origin and evidence: Stoev and Schmalstieg (research); PORTAL 2022; Poros, CHI 2021; shipped (visionOS portals).
- Sources: https://arbook.icg.tugraz.at/schmalstieg/Schmalstieg_044.pdf ; https://arxiv.org/abs/2210.00171

### 3.12 Graph bigger than the room (redirected walking)

- How: Subtle rotation/translation gains or overlapping layouts let the user keep walking through a graph larger than the room.
- Inputs: walking. Visual: unchanged to the user.
- Good for: walking between communities as rooms.
- Origin and evidence: Razzaque; Nilsson et al. survey 2018; Suma, Impossible Spaces 2012 (research).
- Sources: https://www.researchgate.net/publication/324005994_Redirected_Walking_in_Virtual_Reality

### 3.13 Walk through time

- How: Time is laid along the floor; walking forward moves through the states of a dynamic graph.
- Inputs: walking or leaning. Visual: a corridor of time slices.
- Good for: dynamic networks, before and after comparisons.
- Origin and evidence: invented; root in the immersive space-time cube (Wagner Filho 2019).
- Sources: https://arxiv.org/abs/1908.00580

### 3.14 Hand-over-hand climbing along edges

- How: No stick locomotion: grab geometry and pull your body, push off to drift; head motion tied 1:1 to the grabbing hand. Twist: edges are handrails, so what you can hold is where you can go; push off hubs to coast.
- Inputs: grip and arm motion. Visual: your hands holding structure.
- Good for: traversing topology physically.
- Origin and evidence: shipped (Lone Echo, Gorilla Tag); GDC talk.
- Sources: https://www.gdcvault.com/play/1024446/It-s-All-in-the ; https://medium.com/syry-io/what-makes-gorilla-tag-great-vr-design-28b253ad0294

### 3.15 Ride the path (on rails, grapple along edges)

- How: You are carried along a path from node to node on a fixed track at a steady pace while the body is free, choosing branches at junctions by gaze, or you grapple yourself along an edge. Synth Riders variant: the hand traces a moving rail, e.g. a bundled edge to its endpoint.
- Inputs: gaze to choose a branch, trigger grapple, thumbstick scrub or speed. Visual: lit path ahead, world streaming past, vignette during motion.
- Good for: feeling path length and branching; riding a shortest path, BFS frontier or cascade with nodes passing at arm's length; tours.
- Origin and evidence: Link Sliding, CHI 2009; Habgood node-to-node locomotion (research); shipped (Windlands 2, Spider-Man VR, Pistol Whip, Synth Riders, dark rides); limiting travel to edges invented.
- Sources: https://shura.shu.ac.uk/18594/1/Habgood-RapidContinuousMovementBetweenNodes(AM).pdf ; https://www.pushsquare.com/reviews/ps4/pistol_whip ; https://en.wikipedia.org/wiki/Synth_Riders
- Merged from: "Ride the path (rail or grapple along edges)", "On-rails ride along a path".

### 3.16 Out-of-body third-person travel

- How: Step out to a third-person view, place the avatar, snap back in; Moss frames the world as a diorama you guide a character through. Twist: leave a ghost self at a node as a bookmark.
- Inputs: mode button, point to place. Visual: seeing your own avatar from outside.
- Good for: checking your position in the whole graph and diving back.
- Origin and evidence: Cmentowski, Krekhov, Krueger, Outstanding, CHI PLAY 2019 (lab study); shipped (Moss).
- Sources: https://dl.acm.org/doi/10.1145/3290607.3312783 ; https://en.wikipedia.org/wiki/Moss_(video_game)

### 3.17 Time moves only when you move

- How: The world advances only as fast as the body moves; stillness freezes it. Twist: the force layout runs only where your hand stirs, so nothing jitters while you read.
- Inputs: head and hand velocity. Visual: slowed or frozen motion.
- Good for: scrubbing layout convergence, temporal graphs or algorithm steps by motion.
- Origin and evidence: shipped (SUPERHOT VR); reviews.
- Sources: https://www.meta.com/blog/vr-classics-superhot-vr/ ; https://roadtovr.com/superhot-vr-review-oculus-touch-rift/

### 3.18 Best-view compass

- How: A sphere colored by how readable the graph is from each direction; point at a bright spot to fly there.
- Inputs: ray or palm map. Visual: heat-colored sphere.
- Good for: less camera fiddling.
- Origin and evidence: Joos et al., SUI 2023 (expert study).
- Sources: https://dl.acm.org/doi/fullHtml/10.1145/3607822.3614537

### 3.19 Attention gravity

- How: Regions looked at for a sustained time slowly pull toward the user and enlarge; ignored regions recede; palms-out freezes the layout.
- Inputs: head direction or gaze, time. Visual: the graph breathing toward where you look.
- Good for: exploring big graphs without explicit navigation.
- Origin and evidence: invented (fisheye, degree of interest: Furnas, CHI 1986; Sarkar and Brown, CHI 1992).
- Sources: https://doi.org/10.1145/22627.22342 ; https://doi.org/10.1145/142750.142763

### 3.20 Leaning and walk-in-place locomotion devices (head-joystick lean, balance board, omnidirectional treadmill)

- How: Leaning the head or torso away from a neutral spot works like a joystick, speed growing with the lean. A lean-sensing board or seat, or an omnidirectional treadmill, gives continuous hands-free travel through a graph larger than the room with less sickness than thumbstick steering. The catalog's travel options are hand-driven, redirected walking (3.12) or the swivel chair (23.10).
- Inputs: head position relative to a calibrated center (works in WebXR now), or a lean board or treadmill read as a gamepad. Visual: neutral-zone ring on the floor.
- Good for: hands-free flying through a large graph while the hands keep selecting and pulling.
- Origin and evidence: Hashemian, Lotfaliei, Adhikari, Kruijff, Riecke, HeadJoystick, IEEE TVCG 2020 (lab study); shipped treadmills (Virtuix Omni). Moderate evidence. URLs not verified online.
- Sources: https://doi.org/10.1109/TVCG.2020.3025084 ; https://www.virtuix.com/

### 3.21 Edge signposts (information scent on every outgoing edge)

- How: While the user is focused on or standing at a node (3.8 or plain selection), each incident edge carries a small signpost near its far end summarizing what lies beyond it within k hops: how many nodes it reaches, the dominant community color, the highest-centrality node down that branch, and whether a search hit or path target lies that way. Users choose which edge to follow by scent, not trial hops. Unlike 3.18 (readable viewing directions) or 3.19 (attention gravity), this guides which way to go through the topology.
- Inputs: selection or ego-bubble entry; gaze or ray hover expands a signpost; trigger to hop. Visual: a tiny glyph or bar per edge (count, color band, star for a hit), expanding to a mini card on hover.
- Good for: hop-by-hop exploration of large graphs, heading toward a search target or path endpoint, avoiding dead-end branches, neighborhood triage without expanding everything.
- Origin and evidence: Furnas, 'Effective View Navigation', CHI 1997 (theory); Willett, Heer, Agrawala, 'Scented Widgets', InfoVis 2007 (lab study); Pirolli and Card, information foraging, Psych Review 1999 (theory). Per-edge immersive use invented.
- Sources: https://doi.org/10.1145/258549.258800 ; https://doi.org/10.1109/TVCG.2007.70589 ; https://doi.org/10.1037/0033-295X.106.4.643

---

## 4. Hand-held palettes and tool panels

### 4.1 Off-hand painter's palette (two-handed palette and brush)

- How: Panels of tools, brushes, colors and options are attached to the non-dominant controller or hand. A thumbstick swipe or wrist roll rotates a different face to the front; the dominant hand points, pokes or triggers to pick, and the panel springs forward, brightens and labels itself as it approaches. Panels can be detached to float. Twist: palette faces are the graph's attributes, and brushing applies a data-driven style layer to brushed nodes only.
- Inputs: two controllers or hands, thumbstick swipe or wrist roll, dominant trigger or poke. Visual: a small stack, polyhedron or rotating 3D palette of panels on the off hand.
- Good for: switching modes (select, navigate, path, annotate, filter); pickers for layout, style and algorithms; properties of the selected node; style swatches.
- Origin and evidence: shipped (Tilt Brush/Open Brush, Quill, Medium; Gravity Sketch wrist twist); PIP, Eurographics 1997; Bowman and Wingrave, IEEE VR 2001 (lab study: pen-and-tablet fastest); Guiard 1987 asymmetric bimanual model; UX case studies.
- Sources: https://virtualrealitypop.com/vr-ui-design-pattern-the-tool-palette-c5a00db13cc2 ; https://people.cs.vt.edu/~bowman/papers/menu_paper.pdf ; https://blog.hamaluik.ca/posts/vr-ux-case-study-tilt-brush/ ; http://www.cogprints.org/625/1/jmb_87.html ; https://docs.openbrush.app/user-guide/using-the-open-brush-tools-quick-tools-and-menu-panels/the-admin-panel ; https://docs.openbrush.app/developer-notes/ui-elements ; https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/two-handed-input-94.pdf ; https://support.google.com/tiltbrush/answer/6389713?hl=en ; https://gravitysketch.com/blog-post/updates/quick-menus-and-onboarding-rooms-update/ ; https://www.afternow.io/vr-tilt-brush/
- Merged from: "Non-dominant-hand palette", "Non-dominant palette, dominant tool", "Painter's palette on the off hand", "C3 Off-hand painter's palette", "Off-hand palette", "Two-handed palette and brush".

### 4.2 Rotating prism or cube palette

- How: The off-hand palette is a prism or cube; a wrist turn or swipe reveals the next face. Blocks puts tools on one face and 25 colors on another; early Quill used a cube of panels.
- Inputs: wrist roll or thumbstick, dominant-hand touch. Visual: a toy-like object with one active face.
- Good for: faces as workspaces (Explore, Analyze, Style, Layout, File), so the rotation teaches the app's top-level structure.
- Origin and evidence: shipped (Google Blocks, early Quill); Quill later dropped the cube for detachable panels.
- Sources: https://skarredghost.com/2017/07/10/google-blocks-review-3d-modeling-prototyping-made-easy/ ; https://medium.com/inborn-experience/oculus-quill-tools-and-hotkeys-330ae2ccfe8c

### 4.3 Detachable, dockable (tear-off) panels

- How: A panel that lives on the hand can be torn off by its title bar or edge, pulled into space, scaled, parked anywhere in the room, and docked or sent home later.
- Inputs: grab, two-handed scale. Visual: floating panels with grab bars.
- Good for: parking a results table beside the cluster it describes, pinning a legend.
- Origin and evidence: shipped (Quill, Open Brush, Arkio, Gravity Sketch).
- Sources: https://quill.fb.com/features/ ; https://support.arkio.is/hc/en-us/articles/360002017137-Main-menu ; https://help.gravitysketch.com/hc/en-us/articles/9964913793053-web-browser-in-vr
- Merged from: "Detachable, dockable panels", "D1 Tear-off panels".

### 4.4 Pen and pad (Personal Interaction Panel, hand-held tablet)

- How: A tablet or notebook panel in the off hand (virtual, or a tracked physical paddle with real edges for passive haptics) carries 2D widgets; the dominant hand uses a pen or controller tip on it. It can show a 2D projection of a 3D selection.
- Inputs: both poses, touches, tilt, stylus pressure. Visual: a clipboard-sized surface in hand.
- Good for: dense or precise controls: tables, text, threshold sliders, algorithm parameter forms, a portable node inspector and neighbor list held beside the graph.
- Origin and evidence: Szalavari and Gervautz, Eurographics 1997 (Studierstube prototype); Lindeman et al., IEEE VR 1999 (lab study); Bowman and Wingrave, IEEE VR 2001 (lab study: significantly faster than floating menus and TULIP); Stoakley et al. WIM clipboard, CHI 1995; Slicing-Volume, IEEE VR 2020 (lab); pen spreadsheets, ISMAR 2020.
- Sources: https://www.cg.tuwien.ac.at/research/vr/pip/eg97.pdf ; https://www.cg.tuwien.ac.at/research/vr/pip/ ; https://doi.org/10.1109/VR.1999.756952 ; https://people.cs.vt.edu/~bowman/papers/menu_paper.pdf ; https://discovery.ucl.ac.uk/id/eprint/10106533/ ; https://arxiv.org/pdf/2008.04543 ; https://www.researchgate.net/publication/220506747 ; https://www.cs.cmu.edu/~stage3/publications/95/conferences/chi/paper.html
- Merged from: "Pen-and-tablet (virtual or real)", "Pen and pad (Personal Interaction Panel)" (two entries), "C4 Hand-held virtual tablet (PIP)".

### 4.5 Pop-out tool tray

- How: Pushing the support hand's thumbstick forward pops out a tool tray; the tool hand picks a tool and the tray collapses.
- Inputs: thumbstick push, touch. Visual: a tray that appears only on demand.
- Good for: keeping the view of a dense graph clear while tools stay one gesture away.
- Origin and evidence: shipped (Oculus Medium / Adobe Substance 3D Modeler).
- Sources: https://helpx.adobe.com/medium/using/workspace-basics.html ; https://helpx.adobe.com/substance-3d-modeler/interface/the-palette.html

### 4.6 Tabbed maker palette attached to a tool

- How: A pen tool owns a tabbed palette (shapes, colors, chips, settings); pick an item, then pull the pen's trigger to apply it.
- Inputs: ray or touch, trigger. Visual: a tabbed panel opened from the tool.
- Good for: a style pen that paints a palette or data-driven style rule onto nodes or communities.
- Origin and evidence: shipped (Rec Room Maker Pen, large non-expert audience).
- Sources: https://rec-room.fandom.com/wiki/Palette ; https://recroom.com/ship-notes/2022/2/24/rec-room-update-the-maker-pen-makeover-edition

### 4.7 Off-hand peephole display

- How: A phone-like panel rigid on the off hand shows a detail view or the existing 2D UI.
- Inputs: off-hand pose, dominant ray. Visual: a phone-sized panel.
- Good for: linked 2D/3D views; reuse of app panels.
- Origin and evidence: Yee, CHI 2003 peephole displays; concept for graphs.

### 4.8 Palette that is a miniature of the graph

- How: The off-hand palette shows the whole graph in miniature; touch it to fly there, drag a box to select, rotate it to rotate the big graph.
- Inputs: two hands. Visual: a small 3D graph on a plate.
- Good for: overview plus detail; navigating big graphs.
- Origin and evidence: invented as a menu; builds on World-in-Miniature (Stoakley et al., CHI 1995).

### 4.9 Lenticular question card

- How: Wrist tilt picks the face; faces are analyst questions (What matters? What belongs together? How is it connected? What does it look like?); entries are ranked by the current selection.
- Inputs: wrist orientation; dominant poke or ray. Visual: lenticular shimmer; an edge strip names all four faces.
- Good for: organizing algorithms by analyst question.
- Origin and evidence: invented; inspired by Tilt Brush faces, lenticular prints, Google Blocks.

### 4.10 Gaze-faced palette

- How: The face shown on the off hand follows what you look at (edge, cluster, empty space, label); glancing at the palette freezes it.
- Inputs: eye or head gaze; transient pointer on Vision Pro.
- Good for: context tools without menus popping up inside the graph.
- Origin and evidence: invented; inspired by Gaze+Pinch (Pfeuffer et al., SUI 2017).
- Sources: https://dl.acm.org/doi/10.1145/3131277.3132180

### 4.11 Grip-depth palette

- How: Squeeze level of the analog grip (or pinch aperture) goes from families to members to parameters; releasing backs out one level.
- Inputs: analog grip value or pinch distance.
- Good for: a three-level path to any algorithm and its parameters.
- Origin and evidence: invented; inspired by pressure widgets (Ramos et al., CHI 2004).

### 4.12 Set swatches

- How: Selections become swatches; overlapping two gives the intersection, pulling apart the union, pushing one through another the difference; dip a finger to re-select.
- Inputs: two-hand grab, dip.
- Good for: set algebra on selections and results; condition comparison.
- Origin and evidence: invented; inspired by Tilt Brush color mixing, Venn diagrams, OnSet (InfoVis 2014).
- Sources: https://www.semanticscholar.org/paper/OnSet%3A-A-Visualization-Technique-for-Large-scale-Sadana-Major/832ff1262c3dc3324739992b0279731fb3ea7bab

### 4.13 Distribution palm

- How: A face holds histograms of attributes and results; brush a range to light matching nodes, then flick to select, hide or encode; selection histograms overlay whole-graph histograms.
- Inputs: dominant finger brush and flick.
- Good for: thresholds, anomalies, hub investigation.
- Origin and evidence: invented; inspired by Tilt Brush color picker and scented widgets (Willett et al., InfoVis 2007).

### 4.14 Pocket shelves

- How: Drag column or result chips into visual-channel slots (color, size, height, label, edge width); holding a chip over a slot previews.
- Inputs: drag and drop.
- Good for: data-driven styling with preview.
- Origin and evidence: invented; inspired by Polaris/Tableau shelves (Stolte et al., TVCG 2002).

### 4.15 Stretch scroll

- How: Pull the hands apart to stretch a band; hand distance sets how much of the catalog is shown, from 6 families to every algorithm.
- Inputs: two hands, pinch or grip to start.
- Good for: browsing the whole catalog.
- Origin and evidence: invented; inspired by semantic zoom (Pad, SIGGRAPH 1993) and accordions.

### 4.16 Walkie-talkie palette

- How: Raise the palette to the mouth to open the mic; speech becomes a previewed card; lower the hand to confirm, flick to cancel.
- Inputs: hand-to-head distance, speech recognition.
- Good for: multi-parameter commands without typing.
- Origin and evidence: invented; inspired by walkie-talkies and Apple Watch raise-to-speak.

### 4.17 Catalog as a graph

- How: A face opens into a small graph of algorithms linked by family, inputs and "often run after"; explore it with the same gestures used on data; pick a node to run it.
- Good for: discovering algorithms and rehearsing the navigation gestures.
- Origin and evidence: invented; inspired by skill trees and self-similar interfaces.

### 4.18 Ephemeral next-step palette

- How: Three predicted next steps light at once; everything else stays in its fixed place and fades in after about 500 ms; nothing moves.
- Good for: common analysis loops for novices without breaking expert spatial memory.
- Origin and evidence: invented; inspired by ephemeral adaptation (Findlater et al., CHI 2009, lab study).

### 4.19 Feel-it palette

- How: Wrist roll or stick steps through families, each with its own vibration rhythm and sound; items tick with rising pitch; eyes never leave the graph.
- Inputs: controller haptics, audio.
- Good for: frequent mode switches; accessibility.
- Origin and evidence: invented; inspired by tactons (Brewster and Brown 2004) and earcons.

### 4.20 Lap slate

- How: Drop the palette and it lands on the thigh, desk or chair arm, growing to tablet size; touching the real surface clicks; lift the hand to pick it back up.
- Inputs: plane detection or a one-time calibration tap; fingertip contact.
- Good for: long sessions, parameter-heavy work, reading tables.
- Origin and evidence: invented; inspired by Lindeman et al. hand-held windows (IEEE VR / CHI 1999, lab study), the Personal Interaction Panel and WebXR plane detection.
- Sources: https://web.cs.wpi.edu/~gogo/papers/chi99.pdf

### 4.21 Saturn ring

- How: A desk-height ring around a tabletop graph is the palette; turn it to bring a segment near; take tools off it into the graph; several people share it.
- Good for: shared and presented sessions.
- Origin and evidence: invented; inspired by a lazy Susan and Tilt Brush panels moved onto the data.

---

## 5. Wrist, palm, forearm and finger menus

### 5.1 Palm-up hand menu

- How: Turning or raising the non-dominant flat palm toward the face summons a small panel or card of 3 to 6 large buttons beside the palm (pinky side), billboarded toward the opposite shoulder; the other hand pokes them; turning the palm away hides it. Guards against false activation: require a flat hand or gaze on the hand. It can switch to world-locked when the hand turns over.
- Inputs: hand-tracking palm orientation, poke; controller orientation as fallback. Visual: card above or beside the palm.
- Good for: the controller-free home for mode switching and top actions: undo, select neighbors, clear selection, toggle labels, rerun the last algorithm, recenter; glanceable stats.
- Origin and evidence: shipped and guideline (HoloLens 2 / MRTK hand menu, Meta system UI, Ultraleap guidelines, Leap Motion Blocks, Android XR); PalmGazer 2023 (prototype).
- Sources: https://docs.ultraleap.com/xr-guidelines/Components/handcontrols.html ; https://learn.microsoft.com/en-us/windows/mixed-reality/design/hand-menu ; https://arxiv.org/pdf/2306.12402
- Merged from: "Palm-up hand menu" (three entries), "C2 Palm menu".

### 5.2 Wrist watch face (status and quick actions)

- How: A watch-face panel on the wrist is revealed by the check-the-time gesture (wrist turn or glance); a small menu can bloom over it and the other hand picks. Twist: the watch shows a live readout of whatever node the other hand touches.
- Inputs: wrist rotation or gaze, optional tap or other-hand poke. Visual: watch face, band or radial items.
- Good for: algorithm progress, counts, selection size, notifications, quick actions.
- Origin and evidence: shipped (Gravity Sketch, Half-Life: Alyx, Rec Room Watch Menu, Little Cities, Population: One); small game study; Armstrong, CHI 2023 arm-anchored pointing (lab study).
- Sources: https://gravitysketch.com/blog-post/updates/quick-menus-and-onboarding-rooms-update/ ; https://rec-room.fandom.com/wiki/Watch_Menu ; https://mixed-news.com/en/little-cities-vr-city-planning-for-dummies/ ; https://spatialandimmersivedesign.substack.com/p/designing-an-ideal-adjustable-wrist
- Merged from: "C1 Wrist screen", "Wrist watch status face", "Wrist watch hologram".

### 5.3 Wrist computer with a pull-out screen

- How: A forearm device wakes when the arm is raised; swiping scrolls it, and the other hand can pull out a larger holographic screen.
- Inputs: arm raise, swipe, grab-and-pull. Visual: a diegetic gadget on the arm.
- Good for: a watch face for counts, selection size and algorithm or layout progress, with a full results panel pulled out on demand.
- Origin and evidence: shipped (Lone Echo); designer interview.
- Sources: https://www.roadtovr.com/designing-lone-echo-echo-arena-virtual-touchscreen-interfaces-robert-duncan/

### 5.4 Wrist-twist split menu

- How: Turning the off-hand palm down shows navigation tools; palm up shows session actions; the direction of the twist is the first menu choice.
- Inputs: wrist rotation, touch. Visual: a button cluster on the hand.
- Good for: palm-down for moving through the graph, palm-up for save, export and history.
- Origin and evidence: shipped (Gravity Sketch quick access menu, Arkio).
- Sources: https://help.gravitysketch.com/hc/en-us/articles/22600460586141-quick-access-menu ; https://support.arkio.is/hc/en-us/articles/360002027298-VR-Controllers-and-hand-tracking

### 5.5 Same-hand gaze and wrist menus (Look & Turn, PalmGazer)

- How: Eyes pick an item on a hand-attached menu, and turning that same wrist navigates or sets a continuous value. In PalmGazer an open palm summons the menu, look plus pinch selects, and a fist dismisses.
- Inputs: eye tracking plus hand tracking. Visual: a hand-attached menu with a gaze highlight.
- Good for: one hand keeps manipulating the graph while the other runs the menu by gaze; wrist turn for thresholds.
- Origin and evidence: Reiter et al., ETRA 2022; Pfeuffer et al., SUI 2023 (small-N prototypes).
- Sources: https://dl.acm.org/doi/10.1145/3517031.3529233 ; https://arxiv.org/abs/2306.12402

### 5.6 Forearm HUD with wrist-orientation modes

- How: The forearm acts as a long display; arm rotation swaps panels; the other hand pokes with passive support from the arm.
- Inputs: forearm pose, poke. Visual: a strip along the arm.
- Good for: lists, legends, filter sliders with tactile backing.
- Origin and evidence: demo (Leap Motion Arm HUD).
- Sources: https://developer-archive.leapmotion.com/gallery/arm-hud-vr-alpha

### 5.7 Forearm rail / ruler slider

- How: Sliding a dominant finger along the off forearm on real skin sets a value (wrist = min, elbow = max) with an attribute histogram drawn along the arm; tool-family beads sit along the rail, pausing fans a list, lifting fires.
- Inputs: hand tracking of both hands touching the arm. Visual: a scale, histogram or slim strip on the sleeve.
- Good for: threshold filters, layout parameters, time scrubbing; algorithm and layout families.
- Origin and evidence: on-body menu placement study, ISS 2024 (lab study N=12+18); Skinput, CHI 2010; palm imaginary interfaces (Gustafson et al., CHI 2013); the slider itself invented.
- Sources: https://arxiv.org/abs/2409.20238 ; https://hpi.de/baudisch/publications.html
- Merged from: "Forearm ruler/slider", "Forearm rail".

### 5.8 Palm scribble

- How: Write 1-2 letters on the off palm; ranked commands, nodes and attributes rise from the palm; a thumb tap picks.
- Inputs: hand joints plus a letter recognizer. Visual: a short ranked list above the palm.
- Good for: the long tail of the catalog; node and attribute lookup.
- Origin and evidence: invented; inspired by PalmType (MobileHCI 2015), Graffiti and Ctrl+K command palettes.

### 5.9 Analyst's glove

- How: Finger segments hold 12 verbs, the palm is search or distributions, the forearm is the parameter slider, palm-down shows status (selection count, filters, layout, undo depth); the dominant hand stays free.
- Inputs: hand tracking first, controller mapping as fallback.
- Good for: the full analysis loop with one resting hand and real touch.
- Origin and evidence: invented; recombines phalanx keypad, forearm rail, palm scribble and distribution palm.

### 5.10 TULIP finger menu

- How: Three items are bound to the index, middle and ring fingers; a finger-to-thumb pinch selects; the pinky pages to the next three; remaining items show on the palm.
- Inputs: per-finger pinch (gloves originally, hand tracking now). Visual: labels at the fingertips.
- Good for: fast switching between select, neighbors and path without pointing.
- Origin and evidence: Bowman and Wingrave, IEEE VR 2001 (lab study: preferred but slower than pen-and-tablet).
- Sources: https://people.cs.vt.edu/~bowman/papers/menu_paper.pdf

### 5.11 Phalanx keypad (finger-segment keypad)

- How: The thumb of the off hand taps one of 12 finger segments like a phone keypad to fire a slot; slide along a finger to scrub; a fingertip can act as a touchpad; a thumb swipe across the fingertips turns the page.
- Inputs: thumb versus phalanx regions (WebXR hand joints); stick-grid fallback. Visual: tiny labels drawn on the user's virtual fingers at the knuckle lines, brightening on thumb approach.
- Good for: 12 frequent exploration verbs (expand, isolate, path, undo, pin, frame); numeric entry (k, top-N).
- Origin and evidence: DigitSpace, CHI 2016 and DigiTouch, IMWUT 2017 (lab studies); Meta microgestures SDK v74 (shipped).
- Sources: https://howieliang.github.io/projects/DigitSpace/ ; https://dl.acm.org/doi/10.1145/3130978 ; https://developers.meta.com/horizon/design/design-microgestures/ ; https://www.uploadvr.com/meta-quest-sdk-v74-thumb-microgestures-improved-audio-to-expression/
- Merged from: "Finger-segment keypad", "Phalanx keypad".

### 5.12 Finger-count menus

- How: The number of fingers held up on the left hand picks one of 5 menus; on the right hand, one of 5 items.
- Inputs: extended finger counts. Visual: category rings around both hands.
- Good for: 25 commands with no pointing, e.g. Centrality > Betweenness.
- Origin and evidence: Kulshreshth and LaViola, CHI 2014 (lab study: fastest, about 2x 3D marking menus).
- Sources: https://www.cs.ucf.edu/~jjl/pubs/chi2014_Arun.pdf

### 5.13 Touch and tap on the headset itself

- How: The headset's own shell is a command surface that is always there and found without looking: a tap for undo, a swipe along the side to scrub history, a press on the front to recenter. Shipped examples are the Quest's double-tap on the side (toggles passthrough) and Vision Pro's Digital Crown, which the catalog uses only for the immersion dial (26.6).
- Inputs: headset IMU tap detection (inferable from head-pose jerk in WebXR) or a touch-sensitive housing. Visual: none, or a brief confirming toast.
- Good for: undo, recenter and mode switching with no menu, when both hands are full or the controllers are put down.
- Origin and evidence: Gugenheimer, Dobbelstein, Winkler, Haas, Rukzio, FaceTouch, UIST 2016 (lab study); shipped (Quest double-tap passthrough, Vision Pro Digital Crown).
- Sources: https://dl.acm.org/doi/10.1145/2984511.2984576

---

## 6. Radial, marking and controller-button menus

### 6.1 Radial (pie) menu

- How: A button, thumbstick touch or pinch opens a ring of 4-8 wedges around the hand or controller; moving the hand into a wedge, pointing, or pushing the stick toward it selects it, so only direction matters; release commits. Twist: slices change with what is held (node vs edge).
- Inputs: thumbstick touch/direction plus click, pick-hand, pick-ray, hand or stick rotation. Visual: an icon ring (donut) around the controller or hand.
- Good for: fast verbs on the selection; a node context menu (neighbors, path from here, pin, hide, color, details).
- Origin and evidence: Callahan and Hopkins 1988; shipped (VRChat Action Menu, Steam Input, Arkio 8-tool circle, Unreal Engine VR Mode); Gebhardt et al., TVCG 2013 (lab); Mundt and Mathew, NordiCHI 2020 (lab study: moving the hand into the wedge rated significantly better than rotation variants).
- Sources: https://wiki.vrchat.com/wiki/Action_Menu ; https://dl.acm.org/doi/abs/10.1145/3419249.3420146 ; https://ieeexplore.ieee.org/document/8786823/ ; https://dl.acm.org/doi/abs/10.1145/3340764.3344448 ; https://docs.unrealengine.com/en-US/BuildingWorlds/VRMode/index.html
- Merged from: "Thumbstick radial (pie) menu", "Pie / radial menu at the hand", "Radial quick menu on the controller".

### 6.2 Marking menu (novice pops the pie, expert flicks blind)

- How: Hold a button or pinch and make a directional stroke (a zig-zag for submenus); the pie appears only if the user hesitates. Hand variant: pinch-hold opens a radial menu, move a few cm in a direction and release; experts flick blind.
- Inputs: button hold or pinch plus hand/controller motion or stick. Visual: nothing for experts; the pie around the hand for novices.
- Good for: high-frequency exploration verbs (expand, back, path) without looking away from the graph; a node context menu that becomes muscle memory.
- Origin and evidence: Kurtenbach and Buxton 1993/94 (lab studies); Wentzel et al., IEEE TVCG 2025 (lab study: fastest for 2-level menus; rare in commercial VR apps); shipped Android XR palm-up pinch-move navigation.
- Sources: https://johannwentzel.ca/projects/vrmm/files/Wentzel_TVCG.pdf ; https://johannwentzel.ca/projects/vrmm/index.html ; https://www.billbuxton.com/MMExpert.html ; https://www.billbuxton.com/MMUserLearn.html ; https://support.google.com/android-xr/answer/16639048?hl=en
- Merged from: "Marking menu", "Marking menu (novice pops the pie, expert flicks blind)", "Pinch-and-flick marking menu".

### 6.3 Drum menu (bimanual)

- How: A bimanual pie-menu derivative with commands on a drum or two concentric rings; each hand's stick picks one menu level simultaneously, or selection is by stroke or pointing.
- Inputs: both sticks / two controllers. Visual: two concentric rings or a cylinder of command bands.
- Good for: algorithm family x algorithm, property x value; a shortcut layer for the 10-20 most used commands.
- Origin and evidence: Drum Menu, Graphics Interface / ACM 2025 (lab study; one catalog note says only the abstract was read).
- Sources: https://www.jeffjianzhao.com/papers/drummenu.pdf ; https://dl.acm.org/doi/10.1145/3769872.3769884
- Merged from: "Bimanual drum menu", "Drum menu".

### 6.4 Ring and spin menus

- How: Items sit on a ring around the hand and a wrist twist rotates the ring under a fixed hotspot; the Spin Menu adds a precision filter and stacked rings for hierarchy.
- Inputs: wrist roll plus confirm. Visual: a dial-like ring.
- Good for: cycling ordered choices: layouts, color schemes, k-core k, hop count, time steps.
- Origin and evidence: Liang and Green, JDCAD 1994; Gerber and Bechmann, IEEE VR 2005 (lab studies; rotation variants rated lower than hand movement in a later study).
- Sources: https://www.researchgate.net/publication/4165391_The_spin_menu_A_menu_system_for_virtual_environments ; https://dl.acm.org/doi/10.1016/j.cag.2006.09.006

### 6.5 Command and Control Cube

- How: A 3x3x3 grid of cells around the hand: move into a cell and release to select. Visual mode for novices; blind mode with optional sound or touch cues for experts.
- Inputs: hand position, one button. Visual: a translucent cube of cells, or nothing.
- Good for: 26 blind shortcuts covering algorithm families and view commands.
- Origin and evidence: Grosjean and Coquillart, EGVE 2001; evaluation at ICMI 2002 (lab study).
- Sources: https://diglib.eg.org/handle/10.2312/EGVE.EGVE01.001-012 ; https://ieeexplore.ieee.org/document/1167041/

### 6.6 Hover/dwell arc menu

- How: An arc-shaped hierarchical menu attached to one hand; any cursor selects an item by dwelling near it, with no click.
- Inputs: any tracked point, dwell. Visual: a curved fan around the palm.
- Good for: input without a reliable click (hand tracking, accessibility); the only graph-specific prior art found.
- Origin and evidence: Kinstner, Hover UI Kit, used on a force-directed graph in VR (open-source toolkit and demo; no study).
- Sources: https://github.com/aestheticinteractive/Hover-UI-Kit ; https://medium.com/@zachkinstner/devup-force-directed-graph-in-vr-9e6bf3e1a351

### 6.7 Game item wheel with slowed time

- How: Holding a button opens a large radial wheel and slows or pauses time; releasing toward a slot equips it.
- Inputs: button hold plus direction. Visual: a large HUD wheel.
- Good for: freezing the running layout while a menu is open, so the graph stops moving under the hand.
- Origin and evidence: shipped (console weapon wheels; Boneworks/Bonelab radial inventory).
- Sources: https://gameuidatabase.com/index.php?scrn=168 ; https://boneworks.fandom.com/wiki/Inventory

### 6.8 Control menus, FlowMenu, tracking menus

- How: One stroke picks a command and then sets its value (control menu); submenus replace the menu and returning to the center commits (FlowMenu); a tool cluster follows the cursor at its edge (tracking menu).
- Inputs: one continuous stroke. Visual: a radial menu that turns into a gauge.
- Good for: choosing and tuning a threshold, hop count or layout spacing in one motion.
- Origin and evidence: Pook et al., CHI 2000; Guimbretiere and Winograd, UIST 2000; Fitzmaurice et al., UIST 2003 (pen and desktop lab studies; not tested in VR).
- Sources: https://hci-museum.lisn.upsaclay.fr/flowmenu ; https://dx.doi.org/10.1145/964696.964704

### 6.9 Chorded buttons

- How: A held modifier (grip or B) remaps trigger, stick and A.
- Inputs: button combinations. Visual: controller button labels change with the modifier.
- Good for: selection algebra, mode switches.
- Origin and evidence: shipped (Medium, Gravity Sketch layouts).
- Sources: https://help.gravitysketch.com/hc/en-us/articles/9380640515485-Controllers-Layout

### 6.10 Capacitive touch-to-preview

- How: Resting the thumb on a button previews its effect as ghosts; pressing commits, lifting cancels.
- Inputs: capacitive touch on buttons and trigger. Visual: ghosted previews.
- Good for: previewing algorithms, filters, layouts before running.
- Origin and evidence: capacitive sensing shipped (Oculus Touch); preview for analysis invented.
- Sources: https://developers.meta.com/horizon/documentation/unreal/unreal-touch-controller/

### 6.11 Say it or flick it marking menu

- How: Every wedge has a spoken name; flick, say the word while the menu is open, or say it with no menu at all; the gesture and the word teach each other.
- Inputs: stroke plus microphone. Visual: pie with text labels.
- Good for: long-tail commands by voice, frequent ones by flick.
- Origin and evidence: invented.

### 6.12 Node-centered marking menu aimed at real neighbors

- How: The menu blooms around the touched node with wedges pointing at its actual neighbors; flicking toward one walks to it; generic commands fill the gaps.
- Inputs: point or grab plus a flick. Visual: a ring shaped by graph geometry.
- Good for: neighborhood exploration and path walking, where menu and data coincide.
- Origin and evidence: invented.

---

## 7. Hand gestures and microgestures as commands

### 7.1 Thumb-to-finger microgestures (hand or smart ring)

- How: With the hand relaxed (even in the lap), the thumb taps or swipes four ways along the curled index finger like a tiny D-pad; rings can sense it with fields, proximity or IMUs.
- Inputs: thumb vs index joints; tap, 4-way swipe, slide. Visual: tiny 4-way indicator or none.
- Good for: stepping through results and neighbors (next/previous neighbor, expand, back), cycling layouts, undo, scrubbing parameters with arms down.
- Origin and evidence: shipped (Meta Quest SDK v74 microgestures, native only, 2025); STMG, CHI 2024 (lab, 95.1%); rings EFRing, ThumbTrak (93.6%), picoRing (research).
- Sources: https://www.uploadvr.com/meta-quest-sdk-v74-thumb-microgestures-improved-audio-to-expression/ ; https://dl.acm.org/doi/10.1145/3613904.3642702 ; https://dl.acm.org/doi/10.1145/3569478 ; https://arxiv.org/pdf/2105.14680 ; https://arxiv.org/pdf/2411.13065
- Merged from: "Thumb microgestures as a D-pad", "Thumb-to-finger microgestures (hand or smart ring)".

### 7.2 Microgestures with busy hands (middle/ring/pinky)

- How: Microgestures on the other fingers while the index is pinching or holding.
- Inputs: finger joints. Visual: as the D-pad.
- Good for: changing k-hop depth while holding a node; modifiers during a drag.
- Origin and evidence: UIST 2023 transferable microgestures (lab study).
- Sources: https://dl.acm.org/doi/fullHtml/10.1145/3586183.3606713

### 7.3 Symbolic stroke gestures (gesture-traced commands)

- How: Draw a symbol or shape in the air; a $-family point-cloud recognizer maps it to a command; strokes over nodes take those nodes as arguments. Examples: line A to B = shortest path, circle = neighbors, C = communities, scratch-out = hide, arrow = expand, lasso = select.
- Inputs: fingertip or hand path, optional voice. Visual: ink trail morphing into an icon; effect on success.
- Good for: removing icon walls; commands with node arguments.
- Origin and evidence: $P, Vatavu et al., ICMI 2012 (lab); shipped (Black and White, Lionhead; Waltz of the Wizard); postmortem notes weak discoverability.
- Sources: https://dl.acm.org/doi/10.1145/2388676.2388732 ; https://www.gamedeveloper.com/design/postmortem-lionhead-studios-i-black-white-i- ; https://www.meta.com/experiences/pcvr/waltz-of-the-wizard/2348743601909175/
- Merged from: "Symbolic stroke gestures with a $-family recognizer", "Gesture-traced commands".

### 7.4 Static poses and sign-like shortcuts

- How: Snap, thumbs-up, open palm or fist, combined with gaze or pointing for a target.
- Inputs: finger-curl classifier with dwell. Visual: a pose glyph filling as confirmation.
- Good for: hide, bookmark, freeze layout, undo.
- Origin and evidence: shipped (Waltz of the Wizard snap; visionOS Happy Beam heart gesture).
- Sources: https://developers.meta.com/vr/blog/how-hand-interactions-are-opening-new-possibilities-vr-developers/ ; https://developer.apple.com/videos/play/wwdc2024/10094/

### 7.5 User-recorded gesture macros

- How: Record a pose or stroke three times and bind it to a command or an analysis sequence.
- Inputs: joint templates. Visual: gesture shelf of looping ghost hands.
- Good for: personal pipelines, accessibility.
- Origin and evidence: $B recognizer 2024 (lab); invented as an analysis macro tool.
- Sources: https://arxiv.org/html/2409.08402v1

### 7.6 EMG wristband (microgestures and finger handwriting)

- How: Surface EMG reads forearm muscle signals: subtle pinch, thumb taps and swipes, scroll, and finger-written letters on any surface, with hands down.
- Inputs: Meta Neural Band (not exposed to WebXR). Visual: none; text appears in fields.
- Good for: hands-in-lap confirm and scroll; search by name, filters, annotations with no fatigue.
- Origin and evidence: Meta sEMG, Nature 2025 (large lab study); shipped Meta Neural Band 2025 (over 90 percent accuracy reported); speculative for WebXR.
- Sources: https://www.uploadvr.com/meta-semg-wristband-gestures-nature-paper/ ; https://www.meta.com/ai-glasses/accessories/neural-band/ ; https://www.cnbc.com/2025/09/20/hands-on-with-the-meta-ray-ban-display-glasses.html
- Merged from: "EMG wristband microgestures and finger handwriting", "EMG wristband".

### 7.7 Rhythm taps

- How: Frequent commands are tap rhythms on a node or via pinch timing (double = expand, long-short = hide, triple = pin); users record their own; needs only pinch timing, not pose recognition.
- Inputs: pinch or button timing. Visual: node pulse echoing the recognized rhythm.
- Good for: frequent commands without menus or aiming.
- Origin and evidence: invented; Ghomi et al., CHI 2012 (lab study on rhythmic patterns).
- Sources: https://doi.org/10.1145/2207676.2208579

### 7.8 Noun hand, verb hand

- How: The off hand holds scope chips (node, neighbors, 2 hops, community, selection, all); the dominant hand flicks a verb (rank, group, path, hide, color); the chord is the command; the sentence is shown, then commits.
- Inputs: off thumb over chips; dominant flick.
- Good for: compound scoped commands.
- Origin and evidence: invented; inspired by Guiard's kinematic chain, the vi operator grammar and the Tilt Brush palette/brush split.

### 7.9 Stenographer's hands

- How: A left-hand chord picks the command family and a right-hand chord picks the member, covering about 80 commands. A wrist cheat-sheet works as a tappable menu for novices and fades for experts; every chord can also be spoken.
- Inputs: finger poses or button chords, wrist display. Visual: wrist chord sheet, recognition flash.
- Good for: fast expert access to a large command set.
- Origin and evidence: invented.

### 7.10 Graph-specific elicited gesture vocabulary (method)

- How: Adopt the highest-agreement gestures that analysts invent for each graph operation.
- Inputs and visual: vary.
- Good for: a vocabulary matched to analysts' expectations.
- Origin and evidence: Huang et al., IEEE 2017 graph gesture system (lab study); bare-hand elicitation studies.
- Sources: https://ieeexplore.ieee.org/document/8031577/ ; https://arxiv.org/pdf/2501.08500

### 7.11 Head gestures as commands (nod, shake, tilt)

- How: Head motion patterns read from the head pose WebXR already exposes: a nod confirms, a shake cancels or undoes, a tilt steps through options or adjusts a value. No hands, voice or eye tracker needed.
- Inputs: head pose stream. Visual: a small yes/no affordance while a confirmation is pending.
- Good for: confirming agent suggestions or destructive actions while the hands hold the graph; quiet settings where speaking is not possible.
- Origin and evidence: Yan et al., "HeadGesture", IMWUT 2018 (lab study); head-based text entry, Yu et al., CHI 2017 (lab study). Risk: accidental triggers from ordinary looking around.
- Sources: https://dl.acm.org/doi/10.1145/3287076 ; https://dl.acm.org/doi/10.1145/3025453.3025964

---

## 8. Body-anchored storage and tool locations

### 8.1 Holsters, belt and body slots

- How: Tools live at fixed places on the body (hips, belt ring, chest, shoulders, back); reach there and grab without looking; a haptic tick confirms; silhouettes light up as the hand nears. Twist: holster a node set and pull it out later as a reusable set.
- Inputs: reach and grab at body-relative spots. Visual: tools hanging on the body, or hidden until the hand is near.
- Good for: a few always-in-the-same-place tools: lasso, shortest-path string, magnifier/lens, filter, paint bucket, hide scissors, search, camera.
- Origin and evidence: shipped (Boneworks, Blade and Sorcery, Saints and Sinners, Vacation Simulator, VR shooters, Half-Life: Alyx Body Holsters mod); Mine et al., SIGGRAPH 1997 (proprioception research); inventory taxonomy, CHI PLAY 2019; reviews note missing feedback.
- Sources: https://boneworks.fandom.com/wiki/Inventory ; https://www.roadtovr.com/cas-chary-present-walking-dead-saints-sinners-gameplay-overview/ ; https://history.siggraph.org/learning/moving-objects-in-space-exploiting-proprioception-in-virtual-environment-interaction-by-mine-brooks-jr-and-sequin/ ; https://steamcommunity.com/sharedfiles/filedetails/?id=3144612716 ; https://roadtovr.com/half-life-alyx-review/ ; https://roadtovr.com/boneworks-review/ ; https://arxiv.org/pdf/1908.03591
- Merged from: "Holsters and body slots", "Belt/hip holsters tool ring", "Body holsters and backpack".

### 8.2 Over-the-shoulder store and throw-away

- How: Reaching over the shoulder always yields exactly one kind of thing (the clipboard, the undo stack, a saved view or selection); dropping an item there stores it with a vibration; throwing something over the shoulder hides or deletes it.
- Inputs: hand position relative to the head or torso, grab or release. Visual: none (off-screen) until the item returns; faint body hotspots.
- Good for: a stash of saved selections or views; one-motion hide of subgraphs; recalling the last view.
- Origin and evidence: Mine, Brooks, Sequin, SIGGRAPH 1997 (lab study); shipped (Half-Life: Alyx backpack, The Lab Longbow quiver).
- Sources: https://www.researchgate.net/publication/2379681_Exploiting_Proprioception_in_Virtual-Environment_Interaction ; https://history.siggraph.org/learning/moving-objects-in-space-exploiting-proprioception-in-virtual-environment-interaction-by-mine-brooks-jr-and-sequin/ ; https://en.wikipedia.org/wiki/Half-Life:_Alyx ; https://steamcommunity.com/app/546560/discussions/0/1861616237338788582/ ; https://www.uploadvr.com/quivr-early-access-longbow-lab/
- Merged from: "Body-relative storage and over-the-shoulder throw-away", "Over-the-shoulder single-purpose store", "Over-the-shoulder pull and throw".

### 8.3 Pull-down menus overhead and virtual shelves

- How: Menus are hidden above the field of view and pulled down by hand; shortcuts are mapped to directions around the body and triggered by pointing; users reached 7x4 regions by kinesthetic memory alone.
- Inputs: arm direction. Visual: none for experts, ghosted shelves for novices.
- Good for: a dome of 28 eyes-off shortcuts (algorithms left, layouts right, files overhead).
- Origin and evidence: Mine et al., SIGGRAPH 1997; Li et al., Virtual Shelves, UIST 2009 (lab studies).
- Sources: https://dl.acm.org/doi/10.1145/1622176.1622200 ; https://link.springer.com/article/10.1007/s10055-021-00591-6

### 8.4 Context-adaptive toolbelt

- How: Holster positions are fixed but their contents change with the selection: view tools when nothing is selected, neighbor and path tools for one node, community and export tools for a set.
- Inputs: reach and grab at the waist. Visual: a ring of holsters, labeled as the hand nears.
- Good for: context-sensitive commands without a context menu.
- Origin and evidence: invented.

### 8.5 Body pouches (pockets for selection sets)

- How: Toss or stow selections into colored pouches worn on a belt, forearm or body pocket zones; each pouch is a named set. Touching two pouches combines them: overlap = intersection, stacking = union, pulling one out of the other = difference. Shaking a pouch highlights its members; holding it to an algorithm token uses the set as that algorithm's input (seeds, sources, targets).
- Inputs: throw, grab near body zones, controller grip/trigger, voice. Visual: pocket icons that fill, member counts, color dots on member nodes.
- Good for: candidate sets, PageRank seeds, source and target sets, comparing sets.
- Origin and evidence: invented; root in Half-Life: Alyx wrist pockets and body inventory (shipped), Venn diagrams.
- Sources: https://roadtovr.com/half-life-alyx-review/
- Merged from: "Pockets for selection sets", "Body pouches".

### 8.6 User-authored body map

- How: In a mirror view the user places commands on spots of their own body, then touches a spot to run its command.
- Inputs: hand touching the body, a virtual mirror. Visual: mirror during setup, small markers afterwards.
- Good for: personal shortcuts to the most-used of about 60 algorithms.
- Origin and evidence: on-body menu study, ISS 2024 (lab study: mirror creation was fastest); applying it to graph tools invented.
- Sources: https://arxiv.org/abs/2409.20238

### 8.7 Shoulder-perched inspector

- How: A tag-along detail card at the edge of view (about 30 to 45 degrees off center); a glance reads it and a grab enlarges it.
- Inputs: gaze or head, grab. Visual: a card off to the side.
- Good for: properties and algorithm values of the hovered node.
- Origin and evidence: guideline (MRTK tag-along solver); shoulder placement invented.
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk2/features/ux-building-blocks/solvers/solver?view=mrtkunity-2022-05

### 8.8 Living toolbox companion

- How: A floating creature carries tools and follows you; pluck tools off it. Twist: the companion is also the voice assistant that fetches results as objects and points into the graph.
- Inputs: grab from the creature. Visual: a friendly mascot laden with tools.
- Good for: tools that stay near but are not pinned to the body.
- Origin and evidence: shipped (Fantastic Contraption VR, Neko); designer interviews.
- Sources: https://80.lv/articles/fantastic-contraption-browser-to-virtual-reality

### 8.9 Helmet portal to a menu world

- How: Put a helmet on your head to go to a separate room for saving, loading and browsing; take it off to return. Twist: saved views sit on tables as miniature graphs you drop into the main room.
- Inputs: grab object to head. Visual: a distinct library room.
- Good for: keeping file-level work out of the analysis space.
- Origin and evidence: shipped (Fantastic Contraption VR); designer accounts.
- Sources: https://en.wikipedia.org/wiki/Fantastic_Contraption_(2016_video_game)

### 8.10 Algorithm lenses in a quiver

- How: Each algorithm family is a lens kept in a quiver over the shoulder. Holding one up previews that algorithm's result through it; dropping it on the graph commits it as a style layer; tossing it back discards it. Two hands can compare two lenses.
- Inputs: reach, grab, hold up, drop. Visual: colored glass rings.
- Good for: previewing before committing; comparing two centralities side by side.
- Origin and evidence: invented, combining the quiver store and Toolglass.

---

## 9. Lenses and hand-held analysis tools

### 9.1 Magic lens (hand-held, on controller, or as a panel)

- How: A hand-held frame, magnifier or hand mirror re-renders what is seen through it (labels, another layer or algorithm result, hidden or filtered edges, another layout, x-ray); the dominant hand can click through it; it can be dropped in space as a see-through panel.
- Inputs: controller or hand pose sets the lens, stick, button. Visual: translucent window or volume.
- Good for: in-place comparison, labels in dense areas, local reveal of filtered nodes.
- Origin and evidence: Bier et al., SIGGRAPH 1993; Viega et al., UIST 1996; Kluge et al., GI VR/AR 2020 (informal, 100+ users); AR anatomy gesture lens 2022; Multi-Focus Probes 2025; surveys 2025.
- Sources: https://arxiv.org/abs/1911.10044 ; https://arxiv.org/html/2507.01140v1 ; https://www.billbuxton.com/tgml93.html ; https://www.tandfonline.com/doi/full/10.1080/21681163.2022.2157749 ; https://arxiv.org/pdf/2503.23441
- Merged from: "Magic lens on controller", "Handheld magic lens", "E1 Magic-lens panel".

### 9.2 Toolglass / click-through tool sheet

- How: The off hand holds a transparent tool sheet; the dominant hand clicks through a tool onto the object behind it; lens regions re-render what is seen through them.
- Inputs: two hands. Visual: a translucent pane that alters the view behind it.
- Good for: centrality, community or filter lenses; click-through coloring of the node behind the sheet.
- Origin and evidence: Bier, Stone, Pier, Buxton, DeRose, SIGGRAPH 1993 (desktop lab studies).
- Sources: https://www.billbuxton.com/tgml93.html ; https://dl.acm.org/doi/10.1145/1096737.1096742

### 9.3 Algorithm flashlight

- How: The beam carries an algorithm; lit nodes show its result; trigger freezes it into a style layer.
- Inputs: pose, stick for bulb, trigger. Visual: colored light cone.
- Good for: a local, reversible look at algorithm results.
- Origin and evidence: invented (cone selection from Liang and Green 1994).

### 9.4 Gel-wheel flashlight

- How: The off hand casts a cone from the waist; wrist roll turns a wheel of algorithm-preview gels shown only inside the cone; pinch commits to the whole graph.
- Good for: preview before commit; local comparison of algorithms.
- Origin and evidence: invented; inspired by flashlight selection (Liang and Green 1994), stage gel wheels, Toolglass (SIGGRAPH 1993).

### 9.5 Intent lens

- How: A hand-held lens whose contents the agent re-renders per spoken intent; outside the lens is unchanged; several lenses allow comparison.
- Inputs: hand pose, voice. Visual: see-through frame with a restyled graph.
- Good for: local, non-destructive metric checks.
- Origin and evidence: researched base (Magic Lenses); agent lens invented.
- Sources: https://dl.acm.org/doi/10.1145/166117.166126

### 9.6 Hand-held slicing / section / filter plane

- How: Grab a transparent plane (virtual, or a tracked flat prop) and move or twist it through the graph: only nodes in the slab around it are shown in focus and selectable, or one side fades to show a cross section; medical tools preview and highlight the cut. Twist: the plane slides along an attribute or hop distance instead of space.
- Inputs: hand-held plane or prop pose, grip plus wrist rotation, trigger, thumbstick for slab thickness, touch to switch lens. Visual: translucent glass plane and slab, framed window.
- Good for: selection in dense 3D; slab-by-slab reading of hairballs; seeing the interior of dense layouts.
- Origin and evidence: SUI 2024 (lab study N=18: best for dense graphs); Slicing-Volume, IEEE VR 2020; Surale et al., TabletInVR, CHI 2019 (user evaluation); Hinckley cutting plane; shipped (Prospect by IrisVR, Elucis); CARDIACAR (pilot clinical validation, systematic review).
- Sources: https://dl.acm.org/doi/fullHtml/10.1145/3677386.3682102 ; https://www.semanticscholar.org/paper/8cf607b2fe404866160370063409afb9448ed2c7 ; https://mobile.engineering.com/amp/18914.html ; https://graft3d.com/elucis ; https://pmc.ncbi.nlm.nih.gov/articles/PMC11612127/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9925905/
- Merged from: "Filter plane / slicing blade", "Hand-held section plane", "Slicing plane / magic lens prop".

### 9.7 Scalpel, pruning shears, snip-and-ghost (what-if cutting)

- How: Slash through edges with a blade, hold a two-handed cutting plane, use a scissors pose or tool to cut an edge, or a fist to remove a node. Hovering previews the clippings; whatever disconnects falls to the floor, revealing bridges and critical nodes. Displayed metrics are recomputed and each node shows a ghost of its old value with a green or red trail; a component counter shows any split. Cuts are a temporary what-if layer; a wrist strip holds each removal as an undoable step; regrow restores.
- Inputs: pose velocity, trigger, scissors or fist pose, hover, voice. Visual: blade trail, severed edges fading, outline preview, falling clippings, before/after ghosts, component counter.
- Good for: what-if removal of bridges, component counts, min-cut exploration, robustness, teaching centrality.
- Origin and evidence: invented; slicing shipped in Beat Saber; ghost laps from racing games; bridges per Tarjan, SIAM J. Computing 1972.
- Sources: https://doi.org/10.1137/0201010
- Merged from: "Scalpel / slicing plane", "Pruning shears", "Snip and see the ghost".

### 9.8 Hand-held EdgeLens (part the curtain)

- How: A lens on the palm bends edges out of the way without moving nodes; two hands part the edges like a curtain.
- Inputs: open palm; two-hand spread. Visual: clear disc; edges bowed around it.
- Good for: occlusion; reading labels behind a tangle.
- Origin and evidence: Wong et al., InfoVis 2003; Tominski lens survey, CGF 2017.
- Sources: https://innovis.cpsc.ucalgary.ca/Research/EdgeLens ; https://vca.informatik.uni-rostock.de/~schumann/papers/2016+/LensesCGF.pdf

### 9.9 3D fisheye / semantic lens bubble

- How: A bubble held in the hand magnifies the graph inside it and squeezes the surroundings; variants filter by attribute or adapt to how crowded the graph is.
- Inputs: hand position, pinch for magnification, voice for the filter. Visual: distortion bubble with labels inside.
- Good for: labels in dense clusters; focus plus context.
- Origin and evidence: MoleView, TVCG 2011; DP-LENS, arXiv 2026.
- Sources: https://doi.org/10.1109/tvcg.2011.223 ; https://arxiv.org/pdf/2607.27697

### 9.10 Multi-focus probes

- How: Cast or place several probe spheres into the graph; what each encloses is copied out and pulled close to the user as a linked local view, still tethered to where it came from; compare, edit or deform them.
- Inputs: controller ray, thumbstick depth and scale, grab. Visual: colored spheres, tunnels, tethered detail bubbles, cross-probe lines.
- Good for: comparing neighborhoods or regions; editing hard-to-reach or distant nodes.
- Origin and evidence: Zimmermann and Bruckner, IEEE VIS 2025 / arXiv 2025 (prototype, no user study).
- Sources: https://arxiv.org/abs/2507.01140 ; https://arxiv.org/html/2507.01140 ; https://arxiv.org/pdf/2507.01140
- Merged from: "Multi-focus probes", "Multi-focus probe spheres", "D7 Multi-focus probe windows".

### 9.11 Two-controller calipers

- How: Touch node A with the left hand and B with the right; the live path, distance, flow and common neighbors appear.
- Inputs: both tips or rays and triggers. Visual: paths lit between the hands, value at the midpoint.
- Good for: two-endpoint algorithms with no menus.
- Origin and evidence: invented.

### 9.12 Style brush and eyedropper

- How: Paint a chosen style onto nodes, creating a style layer; an eyedropper copies styles.
- Inputs: trigger, off-hand palette, stick. Visual: brush tip and trail.
- Good for: manual tagging and categorization.
- Origin and evidence: brush from Tilt Brush; style-layer painting invented.

### 9.13 Brush loaded with operations

- How: Dip the brush into a palette swatch to load an operation (select, hide, color by attribute, pin), then paint across nodes; brush size is the selection radius; loading two swatches combines them.
- Inputs: two controllers, trigger, stick for radius. Visual: a Tilt Brush palette whose swatches are operations.
- Good for: bulk selection and styling in 3D without a lasso.
- Origin and evidence: invented, extending the painter's palette.

### 9.14 Beekeeper's smoker

- How: Puff smoke into a region and its edges and labels fade so you can see occluded nodes; the smoke drifts away and the graph restores itself. Fuels choose what fades: edges, labels or low-degree nodes.
- Inputs: squeeze, point, hold. Visual: drifting fog revealing nodes.
- Good for: seeing through occlusion without leaving persistent filters on.
- Origin and evidence: invented.

### 9.15 Metal detector

- How: Pick a target score; sweep the controller like a detector coil; tone and haptic rate rise near high-value nodes even when occluded; pull the trigger to dig up the strongest node.
- Inputs: target pick, sweep, trigger. Visual: minimal; coil, signal meter, swept trail.
- Good for: finding high or unusual values in dense 3D graphs, eyes-free.
- Origin and evidence: invented; sonification background (Hermann, Hunt, Neuhoff, The Sonification Handbook, 2011).
- Sources: https://sonification.de/handbook/

### 9.16 Fishing cast (spatial search)

- How: Give a voice or typed query as the bait, then cast it in a direction; matches in that direction bite with haptic tugs scaled by match quality; reel them into a net for close reading, leaving ghosts behind.
- Inputs: voice or keyboard, cast gesture, reel, release. Visual: line, matches pulled along it, ghost positions.
- Good for: spatially scoped search; bringing far results close.
- Origin and evidence: invented.

### 9.17 Inspect tool with property sheet and issue pins

- How: Point the inspect tool at an element to show its properties; mark issues in place.
- Inputs: tool mode plus point. Visual: anchored panel, markup pins.
- Good for: node/edge data and persistent, exportable annotations.
- Origin and evidence: shipped (Prospect by IrisVR); vendor release.
- Sources: https://thewild.com/press-releases/prospect-irisvr-coordination-bim-immersive-issue-tracking

---

## 10. Graph-native physical metaphors (pull, pluck, sculpt, fold)

### 10.1 Pull a node: neighbor reel, leash, pull-to-expand

- How: Grab or pinch a node and pull it toward you; its neighbors follow on elastic edges into a ring around it, and pull length sets how many hops unfold (neighbors peel off in hop rings). Shake to drop far hops. Tap one neighbor to make it the new focus. Ghosts stay at home positions.
- Inputs: controller grip or hand pinch-pull, pull length = hops, pose velocity, haptics. Visual: taut edges, beads in a ring, dangling ego network, ghosts.
- Good for: k-hop and ego-network extraction; neighbors, common neighbors, walking hop by hop.
- Origin and evidence: Bring-and-Go, Moscovich et al., CHI 2009 (lab study); Kwon et al., TVCG 2016 (VR); related IEEE 2017 graph gesture system; leash and shake invented.
- Sources: https://dl.acm.org/doi/10.1145/1518701.1519056 ; https://dl.acm.org/doi/10.1109/TVCG.2016.2520921 ; https://ieeexplore.ieee.org/document/8031577/
- Merged from: "Pull-a-node neighbor reel (Bring-and-Go in 3D)", "Pull-to-expand neighborhood", "Leash / ego-network pull".

### 10.2 Edge plucking and strumming

- How: Hook a bundle of edges and pull it sideways while the nodes stay put; release and the edges spring back with a wobble. Pluck one edge and it vibrates along its length so you can follow it, with its weight shown and heard as pitch; strum across edges to hear a sequence; tug to pull endpoints.
- Inputs: finger hook or fingertip-edge proximity, pinch, controller tip, haptic strum. Visual: edges bending around the hand, vibrating edges, weight label.
- Good for: untangling dense areas; following one long edge; reading edge attributes in dense regions.
- Origin and evidence: Wong, Carpendale, Greenberg, InfoVis 2005 poster (desktop); haptics, pitch and strumming invented (graph sonification).
- Sources: https://www.researchgate.net/publication/255668388_Using_Edge_Plucking_for_Interactive_Graph_Exploration
- Merged from: "Edge plucking (guitar-string edges)", "Pluck and strum edges".

### 10.3 Edge harp

- How: A node's edges fan out like harp strings sorted by weight; strum to hear and highlight neighbors; pinch a string to follow it.
- Inputs: hand sweep, pinch. Visual: a fan of labeled strings.
- Good for: reading a hub's neighbors; eyes-free browsing.
- Origin and evidence: invented.

### 10.4 Edge combing

- How: Stroke an open hand through edges: the edges it passes through are pulled into a braid along the stroke; stroking against the grain loosens it; finger spread sets braid width; a double stroke parts edges like hair. Strokes are saved as a style layer.
- Inputs: palm velocity and finger spread; controller grip plus stick; mouse drag. Visual: edges bending toward the stroke, braids with averaged endpoint colors, short-lived comb trail.
- Good for: reading traffic between communities, clearing occlusion, presentable views.
- Origin and evidence: invented (inspired by Holten edge bundling, InfoVis 2006; Holten and van Wijk, EuroVis 2009).
- Sources: https://doi.org/10.1109/TVCG.2006.147 ; https://doi.org/10.1111/j.1467-8659.2009.01450.x

### 10.5 Taut threads

- How: Grab and pull one edge; all edges of the same type or value go taut and bright while the rest sag and dim; pull distance is a similarity threshold; pluck to release.
- Inputs: grab edge, pull distance, pluck. Visual: straight bright vs sagging dim edges.
- Good for: query-by-example edge filtering in multi-relational graphs.
- Origin and evidence: invented.

### 10.6 Strings and magnets (attribute magnets)

- How: Place magnets labeled with an attribute or algorithm result; nodes are drawn toward each magnet by their value while edges stay attached like strings.
- Inputs: hand placement, voice naming, twist for strength. Visual: magnet objects, nodes streaming toward them, taut edges.
- Good for: relating structure to attributes; outliers.
- Origin and evidence: Dust and Magnet (Stasko), MagnetViz (desktop); in-room VR version invented.
- Sources: https://sites.cc.gatech.edu/gvu/ii/dnm

### 10.7 Sculpt the layout with your hands

- How: The force layout runs live while you drag, stretch, pin and squash parts of the graph: a flat hand pushes nodes, a cupped hand gathers them, two hands pry clusters apart.
- Inputs: hand grab, palm pose and velocity, two-hand stretch, pin gesture. Visual: nodes parting around the hand, edges colored by tension, pins.
- Good for: untangling, making room, manual grouping, layouts you arrange yourself, presenting.
- Origin and evidence: shipped (3d-force-graph-vr, Noda); Leap Motion Interaction Engine physics; Huang, Pfister, Yang 2023 (lab study N=20) on embodied navigation.
- Sources: https://github.com/XiaoxiZheng/3d-force-graph-vr ; https://noda.io/ ; https://arxiv.org/abs/2301.11516 ; https://techcrunch.com/2016/08/23/leap-motion-shows-off-interaction-engine-for-their-vr-hand-tracking-tech/
- Merged from: "Sculpt the layout with your hands", "Sweep and sculpt the layout".

### 10.8 Fingertips as layout pins (puppeteer)

- How: Up to ten nodes are pinned to fingertips while the layout re-flows as the fingers move.
- Inputs: fingertip positions. Visual: marionette strings.
- Good for: landmark-anchored layouts; betweenness intuition.
- Origin and evidence: invented.

### 10.9 Warm hands, cold hands

- How: The warm hand reheats the force simulation locally and the cold hand freezes and pins regions, so one tangled cluster can be re-laid out while the memorized arrangement elsewhere stays put; raising both hands reheats everything.
- Inputs: hand proximity, two controller tool heads, voice. Visual: heat shimmer, frost on pinned nodes.
- Good for: layout, keeping the reader's mental map, untangling.
- Origin and evidence: invented (simulated annealing temperature).

### 10.10 Conductor's baton

- How: Beat tempo to set simulation speed; point and raise at a community section to give it space and labels; a fist cutoff freezes the layout; palm-down dims a section.
- Inputs: baton beat, point-raise, fist, palm-down. Visual: communities seated in a semicircle, the active one lit.
- Good for: steering a running layout and directing focus.
- Origin and evidence: invented.

### 10.11 Knot and untangle (twist to reduce crossings)

- How: Twist a region with two hands to re-lay it out locally with fewer crossings; the rest of the graph stays fixed.
- Inputs: two-hand twist. Visual: region relaxes; crossing count on the wrist.
- Good for: local cleanup that keeps the mental map.
- Origin and evidence: invented; Kotlarek et al. 2020 found spatial memory weaker in VR, which is why keeping the mental map matters.
- Sources: https://arxiv.org/abs/2001.06462

### 10.12 Shake to reveal (wiggle highlighting)

- How: Shake the controller at a node and its k-hop subgraph oscillates in place.
- Inputs: controller shake, or gaze dwell. Visual: a moving subgraph with no color change.
- Good for: highlighting that keeps existing colors and is color-blind safe.
- Origin and evidence: Ware and Bobrow, ACM TAP 2004 (3 desktop experiments); shake gesture invented.
- Sources: https://scholars.unh.edu/ccom/1006/

### 10.13 Squeeze, pour and tear communities

- How: Each community is a liquid hull. Squeezing condenses it into a meta-node (grip pressure = amount); pouring one hull onto another merges them as a manual partition edit; pulling a hull apart with two hands re-runs community detection at a higher resolution and the hull tears along its weakest internal cut.
- Inputs: analog grip, hand grab, two-hand pull, voice. Visual: liquid hulls with surface tension, edges stretching into strands before they snap, count of cut edges.
- Good for: communities, aggregation at scale, correcting a clustering, exploring resolution.
- Origin and evidence: invented (metaballs, clay, Louvain/Leiden resolution).

### 10.14 Fold and unfold communities

- How: Cup a community in both hands to fold it into a meta-node pod; open the hands to unfold it; twist to step between hierarchy levels.
- Inputs: two-hand cup and open, voice. Visual: pods with meta-edges.
- Good for: scale; community-level reasoning.
- Origin and evidence: ASK-GraphView, GrouseFlocks, Bauer et al. multi-layout VR (research); gesture invented.
- Sources: https://arxiv.org/html/2112.10272v3

### 10.15 Potter's thumbs (constrained community detection)

- How: Communities show as clay blobs; thumb-split one to add cannot-link constraints, squeeze two together for must-link; the algorithm re-runs with the constraints, and nodes that resist wobble back to show where the data disagrees.
- Inputs: two-hand pull/squeeze, release. Visual: clay hulls, wobble on contested nodes, modularity readout.
- Good for: human-in-the-loop community detection.
- Origin and evidence: invented; Wagstaff et al., Constrained K-means, ICML 2001; Blondel et al., J. Stat. Mech. 2008.
- Sources: https://doi.org/10.1088/1742-5468/2008/10/P10008

### 10.16 Fold the space / crease

- How: Pinch two nodes, two communities, or two versions of a graph and bring the hands together (or draw a crease between them); the layout folds so the two meet or face each other like pages of a book. Everything else fades; shortest paths lie in the crease, common neighbors on the fold line; edges between the groups remain short and parallel, with brokers sorted to the spine; matching nodes snap into alignment and mismatches glow. Folding further reveals longer alternative paths; a second fold flattens 3D to 2D; opening the hands unfolds.
- Inputs: two-handed pinch, hand distance, two-hand crease draw, voice. Visual: graph creasing like paper, hinge animation, facing pages, binding threads, cross-edge counts.
- Good for: paths, common neighbors, comparing distant regions, groups or versions, finding brokers, reading edges between groups, flattening 3D for reading.
- Origin and evidence: invented (origami, map folding, bipartite views); Melange space folding, Elmqvist et al., CHI 2008 (lab study N=12, 2D).
- Sources: https://doi.org/10.1145/1357054.1357263
- Merged from: "Fold the space", "Crease", "Origami crease".

### 10.17 Tug the live simulation

- How: Grab nodes in a running simulation and pull; the structure responds in real time; multi-user. Twist: pull two nodes apart and see which edges stretch (bottleneck probe).
- Inputs: grip, displacement as force. Visual: elastic tether, deforming structure.
- Good for: feeling how attached a node is in a running force layout.
- Origin and evidence: O'Connor, Glowacki et al., Science Advances 2018 (iMD-VR lab study: faster mastery in VR).
- Sources: http://advances.sciencemag.org/content/4/6/eaat2731/tab-article-info ; https://arxiv.org/pdf/1902.01827

### 10.18 Tug-of-war min cut

- How: Pull two groups apart with two hands; the edges of the minimum cut stretch and snap with a haptic click.
- Inputs: two-hand pull, haptics. Visual: glowing stretched edges that snap.
- Good for: min cut, bridges, how separable two groups are.
- Origin and evidence: invented.

### 10.19 Stitching

- How: A pinch on a node turns the fingertip into a needle; drawing thread to another node sews an edge; the number of knots sets the weight, a bow makes it directed, unpicking removes it.
- Inputs: hands, controllers, keyboard for attributes. Visual: thread, knots, bows.
- Good for: graph editing; annotating relationships the data lacks.
- Origin and evidence: invented.

### 10.20 Blow to spread

- How: Microphone amplitude in the head direction is a wind force that spreads nodes in the breath cone and lets them settle; a sip pulls a selection together; works when both hands are busy.
- Inputs: microphone amplitude, head direction. Visual: nodes drifting like dandelion seeds.
- Good for: decluttering; hands-free layout nudges.
- Origin and evidence: invented; Nintendo DS mic blowing; Sra, Xu, Maes, BreathVR, CHI 2018 (lab study N=16, presence not productivity).
- Sources: https://doi.org/10.1145/3173574.3173914

### 10.21 Inverse manipulation: drag the result, and the model or data answers

- How: The user moves the OUTPUT instead of setting inputs. (a) Semantic interaction: drag nodes together, apart or into an arrangement, and the system infers which attribute or edge weights explain it, then re-lays out the rest of the graph to match; the inferred weights appear as readable, editable handles. (b) Goal seeking: grab a node's metric value (its height on a centrality stem, or its rank) and pull it to a target; the system ghosts the smallest set of edge additions or removals that would produce it ("what would it take for B to be a bridge?"). Release to discard, pinch to keep as a what-if branch.
- Inputs: grab and drag nodes or value handles; hands or controllers; optional voice ("why") to explain inferred weights. Visual: ghosted candidate edits (red removals, green additions); a weight panel whose bars move during the drag; the rest of the graph easing into the inferred layout.
- Good for: explaining results ("what drives this ranking"), sensitivity and robustness questions, building a layout from domain intuition without knowing attribute names, link prediction framed as a goal.
- Origin and evidence: Endert, Fiaux, North, "Semantic Interaction for Visual Text Analytics", CHI 2012 (lab study, small N); Endert, Han, Maiti, House, North, "Observation-level interaction with statistical models", IEEE VAST 2011 (prototype plus study); Brown et al., "Dis-Function", IEEE VAST 2012 (prototype). Goal-seeking graph edits and the VR embodiment are invented. 9.7 snip-and-ghost and 10.17 tug the simulation are forward (input to result) only.
- Sources: https://doi.org/10.1145/2207676.2207741 ; https://doi.org/10.1109/VAST.2011.6102449 ; https://doi.org/10.1109/VAST.2012.6400486

---

## 11. Algorithms as visible physics and creatures

### 11.1 Algorithm creatures

- How: Release an algorithm onto a node as a creature: BFS fireflies, a Dijkstra explorer, PageRank walkers piling up, community flocks, flow as water; block an edge with a hand to see rerouting; hand aperture sets speed. Ends in the normal styled result.
- Inputs: place or throw, block, hand aperture. Visual: animated agents.
- Good for: running and trusting algorithms, teaching, what-if.
- Origin and evidence: invented; algorithm animation (Brown and Sedgewick, SIGGRAPH 1984); Hundhausen, Douglas, Stasko, JVLC 2002 (meta-study of 24 experiments: active engagement matters).
- Sources: https://doi.org/10.1145/800031.808596 ; https://doi.org/10.1006/jvlc.2002.0237

### 11.2 Pinball random walkers

- How: Launch balls that random-walk the graph, with a tilt knob setting the teleport rate; nodes heat as balls pass and converge to PageRank; flippers pause the balls; catch one to see its trail.
- Inputs: plunger, tilt knob, catch. Visual: bouncing balls, warming nodes, trails.
- Good for: running and explaining random-walk algorithms.
- Origin and evidence: invented; Page et al., PageRank, Stanford tech report 1999.
- Sources: http://ilpubs.stanford.edu:8090/422/

### 11.3 Firefly lantern

- How: Open a cupped hand to release random walkers from a node; nodes glow by how often they are visited (personalized PageRank computed visibly); two colors from two nodes show where their influence overlaps; a forward push adds teleportation (the damping factor).
- Inputs: cupped hand, trigger, voice. Visual: particles hopping along edges, node glow, convergence status.
- Good for: centrality, influence, teaching PageRank.
- Origin and evidence: invented (fireflies; random-surfer model).

### 11.4 A creature that walks the graph

- How: Guide a small character through a diorama; attention follows it. Twist: a swarm of random walkers piles up where PageRank is high.
- Inputs: point to direct; hands manipulate the world. Visual: animated figure or swarm.
- Good for: making traversals and paths visible.
- Origin and evidence: shipped (Moss, Polyarc); swarm twist invented.
- Sources: https://en.wikipedia.org/wiki/Moss_(video_game)

### 11.5 Gravity well centrality

- How: Nodes weigh down a rubber sheet by centrality; dropped balls roll along edges and pool in the heavy nodes.
- Inputs: hand drop, voice to pick the metric. Visual: deformed sheet with rolling balls.
- Good for: explaining PageRank and random walks.
- Origin and evidence: invented.

### 11.6 Ripple stone (BFS by dropping)

- How: Drop a node like a stone; a wave colors nodes by hop distance; two stones show the band equidistant from both.
- Inputs: pinch-drop. Visual: expanding color rings.
- Good for: distance, reachability, spread.
- Origin and evidence: invented.

### 11.7 Algorithm rope

- How: Pull a rope out of a seed node; the length pulled sets how many steps the algorithm has run (BFS hops, Dijkstra's settled nodes, label propagation rounds); letting it retract rewinds; knots bookmark steps; two ropes run two traversals until their frontiers collide.
- Inputs: hand distance, trigger distance, stick for fine steps. Visual: glowing frontier, length marks, knots.
- Good for: understanding and explaining algorithms, exact k-hop neighborhoods, teaching.
- Origin and evidence: invented (algorithm animation, tape measure).

### 11.8 Pitcher, pipes and hand valves (flow)

- How: Edges are pipes, thick by capacity and filled by flow. Tip a pitcher over a source node: a water wavefront spreads by weight and its first arrival traces the shortest path; tip angle sets flow rate. For max flow, bottleneck edges bulge red to show the min cut. Closing a hand around a pipe lowers its capacity, max flow is recomputed and the liquid visibly reroutes; holding several valves tests multiple failures.
- Inputs: grab pitcher, tip angle, touch sink, hand closure, analog trigger, desktop slider. Visual: animated fluid, bulging or red saturated pipes, a throughput gauge at the drain.
- Good for: running and reading path and flow algorithms; robustness; explaining a min cut.
- Origin and evidence: invented; Ford and Fulkerson, Canadian J. Math 1956.
- Sources: https://doi.org/10.4153/CJM-1956-045-5
- Merged from: "Pitcher and pipes", "Hand valve on flow".

### 11.9 Flowing particles along edges

- How: Particles stream along edges in their direction; speed and density show flow, weight or time.
- Inputs: touch a node to release, voice, speed dial. Visual: animated dots and fading trails.
- Good for: edge direction in 3D, max flow, random walks.
- Origin and evidence: Romat et al., CHI 2018; Holten et al. 2011 (desktop lab studies).
- Sources: https://www.microsoft.com/en-us/research/wp-content/uploads/2018/05/edgetextures.pdf

### 11.10 Tuning fork (structural similarity)

- How: Strike a node and it hums; nodes with a similar structural role hum in sympathy, louder the more similar; spatial audio reveals those out of view; holding the note turns the resonating set into a selection.
- Inputs: flick or controller tap, voice. Visual: vibration rings, intensity = similarity.
- Good for: finding similar nodes, role discovery, link prediction.
- Origin and evidence: invented (sympathetic resonance, structural equivalence, node embeddings).

---

## 12. Filtering, thresholds and neighborhood depth

### 12.1 Rising tide (tide filter)

- How: A water plane sets a threshold on a metric; raising a flat palm (or, as a body variant, your head height) raises the tide; submerged nodes blur and stop taking input but stay visible; a second palm sets a ceiling. What stays above water forms labeled islands (connected components) that split and merge as the tide moves; a barcode chart on the wall records the island count at every level so the reader can jump to an interesting threshold.
- Inputs: palm or head height, stick, voice. Visual: water surface, dimmed nodes underwater, island outlines, component counts, barcode chart.
- Good for: threshold filtering while seeing what was removed; finding the backbone; seeing how structure depends on a threshold.
- Origin and evidence: invented; sea-level viewers (NOAA, metaphor only); persistent homology (Edelsbrunner and Harer, Contemporary Mathematics 2008, theory).
- Sources: https://coast.noaa.gov/slr/
- Merged from: "Tide filter", "Rising tide".

### 12.2 Gold pan / sieve

- How: Scoop the graph or a region into a handheld pan or sieve whose mesh size is a threshold (finger spread, twist, rim dial or stick). Swirl or shake it and nodes below the threshold fall through onto a visible floor heap, their edges hanging as threads; repeated shakes on degree converge to the k-core. Tilt or tip the heap back to undo.
- Inputs: grab, controller shake/swirl, rim dial or stick, tilt, voice. Visual: pan or sieve, falling nodes, an inspectable heap with a count, mesh value on the rim.
- Good for: threshold filtering while seeing what was removed; finding the dense core; reducing a hairball.
- Origin and evidence: invented (mining, kitchen sieve, k-core).
- Merged from: "Gold pan", "Sieve".

### 12.3 Two-hand span as a range

- How: The distance between facing palms or controllers sets a value range on an attribute, with the histogram drawn between them; nodes outside it fade live.
- Inputs: two hands or controllers. Visual: a histogram slab between the hands.
- Good for: embodied dynamic queries, range filters, color-scale endpoints, k-core, time windows.
- Origin and evidence: invented (from the handlebar and dynamic queries).
- Merged from: "Two-hand range filter", "Two-hand span as a range".

### 12.4 Two-hand accordion parameter

- How: After a command is chosen, the distance between the hands sets its value with the graph updating live; a pinch commits.
- Inputs: distance between the hands, pinch. Visual: a stretchy bar with a readout.
- Good for: continuous parameters without fiddly mid-air sliders.
- Origin and evidence: invented, related to control menus and bimanual scaling.

### 12.5 Twist and squeeze parameter knobs

- How: Pinch and twist the wrist like a dial; squeeze switches coarse/fine; results update live.
- Inputs: wrist roll, grab strength. Visual: ghost dial with a result sparkline.
- Good for: sweeping community resolution, PageRank damping, layout parameters.
- Origin and evidence: roll-and-pinch menus and pinch sliders; invented as an analysis scrubber.

### 12.6 Analog trigger as dial (squeeze to expand)

- How: Trigger or grip travel maps to hops, threshold, k or opacity while held.
- Inputs: analog trigger or grip. Visual: gauge ring, live graph update.
- Good for: neighborhood depth, threshold filtering.
- Origin and evidence: invented (analog trigger is shipped hardware).

### 12.7 Hold to deepen

- How: Touch and hold a node; each beat, with a haptic tick, lights the next hop ring; release at the wanted depth to select; pull back to shrink; the same works for paths and radii.
- Inputs: touch duration, haptic ticks. Visual: stepped ripples spreading outward.
- Good for: k-hop neighborhoods without sliders.
- Origin and evidence: invented (dwell, inverted Midas touch: Jacob, ACM TOIS 1991).
- Sources: https://doi.org/10.1145/123078.128728

### 12.8 Finger hops

- How: Point at a node and hold up k fingers on the other hand to light its k-hop neighborhood, each hop ring in its own shade; a fist clears it; works on a selection too.
- Inputs: finger-count pose, stick clicks, voice. Visual: shaded hop rings with counts.
- Good for: neighbors, quick context.
- Origin and evidence: invented (counting on fingers, ego networks).

### 12.9 Archer's draw (k-hop selection)

- How: Aim with the off hand and draw back with the dominant hand; draw length sets hop count with preview rings on the target; release selects; arrows stay in nodes as bookmarks.
- Inputs: two-hand draw and release. Visual: growing hop rings, count on the nock.
- Good for: previewable neighborhood selection at a distance.
- Origin and evidence: invented; Guiard kinematic chain, J. Motor Behavior 1987.
- Sources: https://doi.org/10.1080/00222895.1987.10735426

### 12.10 Simmer and reduce (coarsening)

- How: Turning a heat knob up merges tight clusters into supernodes (the pot level drops); down restores detail; ladle one supernode onto a plate to expand only it.
- Inputs: knob twist, ladle grab, pour. Visual: pot with a level line and node count, merged blobs.
- Good for: overview of huge graphs and drill-down.
- Origin and evidence: invented; Walshaw, Multilevel Force-Directed Drawing, Graph Drawing 2000.
- Sources: https://doi.org/10.1007/3-540-44541-2_17

### 12.11 Grow from a seed

- How: Plant one node and squeeze to grow rings of the most interesting neighbors; snip branches you do not want.
- Inputs: voice or search to plant, squeeze, snip gesture. Visual: nodes budding along edges.
- Good for: huge graphs; investigations.
- Origin and evidence: van Ham and Perer, TVCG 2009 (desktop); plant metaphor invented.
- Sources: https://www.semanticscholar.org/paper/b0c7b282003ac26311ee6fd61bcfc1550e9c92f0

### 12.12 Peel the onion (k-core shells)

- How: Nodes sit in shells by k-core number; peel the outer shells off and lay them on the floor to expose the core.
- Inputs: pinch-pull a shell, twist. Visual: nested translucent shells.
- Good for: core-periphery structure.
- Origin and evidence: invented interaction; peel-away views come from volume rendering.
- Sources: https://dl.acm.org/doi/10.1145/1980462.1980487

---

## 13. Paths, relations, patterns and reading results

### 13.1 Thread the needle (draw a path)

- How: Draw a stroke in the air between two nodes; it snaps to a real path; draw through a node to force the path through it, around one to avoid it; alternative paths appear as ghosts.
- Inputs: finger stroke. Visual: ink line, snapped path, ghost alternatives.
- Good for: path queries with constraints.
- Origin and evidence: invented.

### 13.2 Rubber-band path

- How: Stretch a band from source to target and it snaps onto the shortest path; adding slack moves it to the 2nd through k-th shortest; pinching a node makes it a required waypoint, pinching an edge forbids it; release saves the path as a selection.
- Inputs: two hands or controllers, voice. Visual: taut glowing band, fainter alternatives, length readout.
- Good for: shortest, k-shortest and constrained paths.
- Origin and evidence: invented; Link Sliding, Moscovich et al., CHI 2009 (desktop lab study).
- Sources: https://doi.org/10.1145/1518701.1518920

### 13.3 Pin-and-reach paths

- How: The off hand anchors a node; dominant-hand hover shows the live shortest path; pinch keeps it.
- Inputs: pinch hold plus hover. Visual: snapping glowing path.
- Good for: interactive reachability and distance.
- Origin and evidence: invented, from Guiard's kinematic chain.
- Sources: http://www.cogprints.org/625/1/jmb_87.html

### 13.4 Graft (how are these related?)

- How: Drop node A onto node B; a persistent bridge appears showing the shortest path, common neighbors, shared community and a similarity score; drop a node on a community hull to ask how it relates to the group.
- Inputs: hands, controllers, gaze plus pinch with drag. Visual: a bridge with answer chips.
- Good for: relations between two things, paths, link prediction.
- Origin and evidence: invented (grafting, drag-to-compare).

### 13.5 Point at nothing (select absence)

- How: Grab an empty gap between groups; the system shows likely missing edges, brokers that could bridge it, and whether the gap is in the data or only the layout; drop a ghost edge to rerun algorithms as if it existed.
- Inputs: grab on empty space. Visual: ghost edges across the gap, highlighted brokers.
- Good for: link prediction, what-if analysis, missing data.
- Origin and evidence: invented; Burt, Structural Holes, Harvard UP 1992; Liben-Nowell and Kleinberg, JASIST 2007.
- Sources: https://www.hup.harvard.edu/books/9780674843714 ; https://doi.org/10.1002/asi.20591

### 13.6 Raised arcs by edge length

- How: Long edges rise as arcs whose height matches their length, so they separate from local edges.
- Inputs: two-hand lift, slider. Visual: a flat or globe base with arcs above.
- Good for: long-range and bridge edges.
- Origin and evidence: Yang, Dwyer et al., TVCG 2019 (3 VR lab studies).
- Sources: https://arxiv.org/abs/1908.02089

### 13.7 A hand full of neighbors

- How: The top five neighbors of the current node map to the off-hand fingertips; a thumb tap makes that neighbor current (path walking by taps); a finger curl previews that branch.
- Inputs: thumb-to-finger taps or thumbstick slots. Visual: fingertip miniatures linked to highlights in the graph.
- Good for: neighbor stepping, path walking.
- Origin and evidence: invented; DigitSpace, CHI 2016 (lab).
- Sources: https://doi.org/10.1145/2858036.2858483

### 13.8 Planetarium of a selection

- How: Raising both arms makes the current selection the floor; its neighbors are laid on a dome overhead (latitude by a metric, capped for neck comfort; longitude by community); point at a star to add it, flick to dismiss.
- Inputs: two-arm raise, button, voice. Visual: dome, light beams up from the floor, community sectors at the horizon.
- Good for: the neighborhood of a set, growing a set by importance, presenting.
- Origin and evidence: invented; spherical layouts studied by Kwon et al., IEEE TVCG 2016 (VR lab study).
- Sources: https://doi.org/10.1109/TVCG.2016.2520921

### 13.9 Node River

- How: Nodes ordered by a chosen metric peel off the graph into a slow stream passing in front of the user, tethered to home positions; grab as they pass to keep; palm against or along the flow sets speed and direction; kept nodes stack in the off hand.
- Inputs: hand grab or grip; palm velocity. Visual: ribbon of nodes with mini ego networks and tethers back to the graph.
- Good for: find, triage, select among many candidates.
- Origin and evidence: invented (kaiten-zushi conveyor); RSVP review, Spence, Information Visualization 2002 (moderate).
- Sources: https://doi.org/10.1057/palgrave.ivs.9500008

### 13.10 Volunteer nodes

- How: After each action, 3-5 interesting next nodes drift toward the user with an idle motion that encodes why (outlier wobble, reaching for a missing link, bridge shape); touch to accept, ignore to dismiss.
- Inputs: touch; time as reject. Visual: a few glowing nodes out of the graph plane.
- Good for: exploration; next-step suggestions.
- Origin and evidence: invented; Chau et al., Apolo, CHI 2011 (lab N=12); Liben-Nowell and Kleinberg, JASIST 2007.
- Sources: https://doi.org/10.1145/1978942.1978967 ; https://doi.org/10.1002/asi.20591

### 13.11 Heliotropic nodes

- How: Nodes matching the current question turn to face the user and keep tracking them as they walk; result strength = speed or completeness of the turn; multiple questions use different rotation axes.
- Inputs: none beyond the question from another channel. Visual: faceted nodes, a subset swiveling toward the viewer.
- Good for: reading results and finding without spending color.
- Origin and evidence: invented; preattentive orientation (Healey and Enns, IEEE TVCG 2012, strong for 2D).
- Sources: https://doi.org/10.1109/TVCG.2011.127

### 13.12 Meadow

- How: Algorithm values grow as stems on the nodes; sweeping a hand at a height lights every stem that reaches it and reads out their values; grabbing a handful selects the local top-k; two stem colors on one node compare two metrics.
- Inputs: hand height and sweep, ray with a height offset. Visual: stems, lit stems, values at the fingertips.
- Good for: reading results in structural context; selecting top values locally.
- Origin and evidence: invented.

### 13.13 Linked 1D strip beside the 3D structure

- How: A sequence strip linked to the 3D structure; drag a span to select; toggle interaction types; voice assistant. Graphty use: a ranked strip (by centrality) to select the top N and see where they sit; twist: the strip pulled out and bent around the user.
- Inputs: point/drag on strip, toggles, voice. Visual: ribbon next to the structure, linked highlight.
- Good for: ranked selection; edge-type toggles.
- Origin and evidence: shipped professional tool (Nanome); vendor docs.
- Sources: https://nanome.ai/blog/nanome-v2.3.0:-new-tools-(builder-and-selection)-sequence-menu-and-web-preview/ ; https://help.nanome.ai/nanome_v2/mainmenus

### 13.14 Constellation sketching (motif search)

- How: Draw a small pattern in the air and every place it occurs in the graph lights up.
- Inputs: finger strokes, voice. Visual: sketch glyph and highlighted matches.
- Good for: motif and pattern search.
- Origin and evidence: invented.

### 13.15 Sculpt the question

- How: Pinch clay lumps into nodes, pull threads into edges, squeeze for high degree, dip into color for an attribute; matching subgraphs light up live; or cast an existing subgraph to find similar ones.
- Inputs: pinch, pull, squeeze. Visual: hand-held clay motif with matches lit in the graph.
- Good for: pattern and motif search without a query language.
- Origin and evidence: invented; query by sketch (VISAGE, AVI 2016; Wattenberg, CHI EA 2001); Neo4j Cypher patterns.
- Sources: https://doi.org/10.1145/2909132.2909246 ; https://doi.org/10.1145/634067.634153 ; https://neo4j.com/docs/cypher-manual/current/patterns/

### 13.16 Explicit difference encoding (superimposed diff graph)

- How: Comparing two graphs (two versions, two filters, before and after an edit or what-if) shows one union graph: added elements glow in one color, removed ones appear as dashed ghosts, changed attributes show as delta glyphs or arrows from old to new position. A toggle switches between overlaid diff, side by side, and difference only.
- Inputs: pick two states (bookmarks, state crystals, decks); a slider for the minimum change shown. Visual: union graph with added, removed and changed colors, ghosted removed edges, displacement arrows.
- Good for: version comparison, what-if cuts, checking what a re-run or an edit changed, dynamic graphs.
- Origin and evidence: Gleicher et al., "Visual comparison for information visualization", Information Visualization 2011 (design taxonomy: juxtapose, superpose, explicit encoding); Archambault, Purchase, Pinaud, IEEE TVCG 2011 (lab studies on animation versus small multiples in dynamic graphs). The catalog morphs (14.9, 14.11) and stacks (14.6) but never encodes the difference itself.
- Sources: https://doi.org/10.1177/1473871611416549 ; https://doi.org/10.1109/TVCG.2010.78

### 13.17 Sorting bins: teach a node classifier by example

- How: Drop a few example nodes into two or more labeled bins ("suspicious" / "normal"; "hub" / "not a hub"). After each drop the system trains on attributes, structure and embeddings, and the rest of the graph pre-sorts itself: nodes lean or drift toward the bin they most resemble, with confidence shown as how far they lean. Toss a misplaced node into the right bin to retrain. Pinch a bin to select its members or save them as a style layer.
- Inputs: grab and toss nodes; voice to name a bin; pinch a bin to select. Visual: bins at the edge of the space; nodes leaning toward bins; uncertain nodes wobbling in the middle (the next ones worth labeling).
- Good for: finding more nodes like these, labeling roles no single algorithm computes, active learning on large graphs.
- Origin and evidence: Fails and Olsen, "Interactive Machine Learning", IUI 2003 (prototype plus study); Amershi et al., "Power to the People", AI Magazine 2014 (review); Chau, Kittur, Hong, Faloutsos, "Apolo", CHI 2011 (lab N=12, exemplar grouping in graphs). The physical bins in VR are invented. 18.9 "show it twice" teaches operations, not node categories.
- Sources: https://doi.org/10.1145/604045.604056 ; https://doi.org/10.1609/aimag.v35i4.2513 ; https://doi.org/10.1145/1978942.1978967

### 13.18 Metro-map schematic for paths and sets

- How: A shortest path, k paths, or overlapping groups are redrawn as a transit map: each path or set is a colored line, nodes are stations, the drawing straightened to a few fixed angles on a panel or wall, shared nodes as interchanges. The map is linked to the 3D graph: touch a station to light the node, slide along a line to fly the path. Unlike the 1D strip (13.13) and riding the path (3.15), it shows several paths or sets and their intersections in one schematic.
- Inputs: generated from a path or set result; poke or ray on stations and lines. Visual: a transit-style map with colored lines and interchange circles beside the tangled 3D graph.
- Good for: comparing several paths, k-shortest paths, flow routes and overlapping community membership; readable across the room and printable for reports.
- Origin and evidence: Nollenburg and Wolff, IEEE TVCG 2011 (algorithm with evaluation); Jacobsen, Wallinger, Kobourov, Nollenburg, 'MetroSets', IEEE TVCG (InfoVis) 2021 (prototype with a user study). No VR study.
- Sources: https://doi.org/10.1109/TVCG.2010.81 ; https://doi.org/10.1109/TVCG.2020.3030475

### 13.19 Predict, then reveal (commit a guess before the algorithm answers)

- How: Before an algorithm's result is painted, the user commits a prediction in space: pin the nodes they think are most central, sketch the path they expect, or lasso the communities they expect. The algorithm then runs and the gap is drawn explicitly: hits glow, misses show as ghost pins with a leader line to the true answer, and a surprise score goes to history. Skippable per run. Unlike 18.7 (agent-authored hypothesis cards) and 17.4 (ghost futures), the user commits an expectation first.
- Inputs: pinch or trigger to drop prediction pins, path drag or lasso, then a reveal gesture. Visual: the user's ghost pins and sketch, then the result overlaid with hit/miss connectors and a small surprise meter.
- Good for: making result reading active; catching surprising nodes; teaching what an algorithm measures (betweenness versus degree); checking an analyst's mental model.
- Origin and evidence: adapted from 'you draw it': Kim, Reinecke, Hullman, 'Explaining the Gap', CHI 2017 (crowdsourced experiments, N in the hundreds, improved recall); NYT 'You Draw It' (shipped, 2015). Graph and VR use invented.
- Sources: https://doi.org/10.1145/3025453.3025592 ; https://www.nytimes.com/interactive/2015/05/28/upshot/you-draw-it-how-family-income-affects-childrens-college-chances.html

---

## 14. Alternative graph worlds and representations

### 14.1 Graph as terrain

- How: Height is a node metric, so communities become peaks; raise a water level to flood out everything below a threshold.
- Inputs: walk or teleport, two-hand water gesture. Visual: height field with contour lines.
- Good for: community overview, thresholds.
- Origin and evidence: terrain metaphor, KDD 2017; ModuLand (desktop); water threshold invented.
- Sources: https://dl.acm.org/doi/10.1145/3097983.3098130 ; https://arxiv.org/pdf/0912.0161

### 14.2 Graph as city

- How: Communities are districts and nodes are buildings sized by metrics; edges are roads or cables you walk along.
- Inputs: walk, point, elevator gesture to change scale. Visual: city model.
- Good for: modular graphs, many metrics at once.
- Origin and evidence: researched and shipped (CodeCity VR, IslandViz, ExplorViz, SecCityVR).
- Sources: https://www.researchgate.net/publication/336310605 ; https://arxiv.org/pdf/2504.18238

### 14.3 Graph as galaxy

- How: Nodes are stars and communities are clusters; constellation lines appear only nearby; warp along long edges; a telescope shows far links.
- Inputs: steering, point-and-warp, hand telescope. Visual: dark sky with glowing points.
- Good for: very large graphs, engagement.
- Origin and evidence: shipped (Wikiverse, Obsidian Galaxy Graph 3D).
- Sources: https://community.obsidian.md/plugins/galaxy-graph-view

### 14.4 Surround sphere / dome

- How: The graph is projected onto a sphere around you; pull a community down from the dome into a detail view.
- Inputs: head turn, ray, grab. Visual: a planetarium of nodes.
- Good for: 360-degree overview, seated use.
- Origin and evidence: Kwon et al. 2015/2016; Bauer et al. (research).
- Sources: https://www.researchgate.net/publication/283105138

### 14.5 Hyperbolic world

- How: Lay the graph out in 3D hyperbolic space: whatever is in focus is full size and the rest shrinks toward a boundary; drag to re-center.
- Inputs: two-hand ball drag, gaze. Visual: a ball with a magnified center.
- Good for: trees and large graphs with focus plus context.
- Origin and evidence: Munzner H3, 1997/1998.
- Sources: https://dl.acm.org/doi/10.1109/38.689657

### 14.6 Layer deck (multilayer stacks)

- How: Edge types, time snapshots or algorithm results sit on stacked glass plates; fan the deck, or pull a plate out.
- Inputs: two-hand fan, grab a plate. Visual: 2.5D stacked planes joined by vertical threads.
- Good for: multilayer networks, comparison.
- Origin and evidence: Feyer et al., TVCG 2024 (lab: no overall winner among 2D/2.5D/3D); Arena3Dweb; HoloGraphs.
- Sources: https://arxiv.org/abs/2307.10674 ; https://arxiv.org/abs/2502.00044

### 14.7 Squeezable time cube

- How: A dynamic graph is a cube with time as its depth; rotate it, squeeze it to merge periods, slice it to see one moment.
- Inputs: two-hand rotate, squeeze, slice. Visual: a cube of matrix slices.
- Good for: change over time.
- Origin and evidence: Bach et al., Matrix Cubes (Cubix), CHI 2014.
- Sources: https://aviz.fr/~bbach/cubix/Bach2014cubix.pdf

### 14.8 3D triangle matrix

- How: An adjacency cube in which each cell is a closed triad; reorder it by community and pull out dense blocks.
- Inputs: grab blocks, slicing planes. Visual: a sorted voxel cube.
- Good for: triangles, cliques, dense graphs.
- Origin and evidence: Pan, Purchase, Dwyer, Chen 2023 (user study).
- Sources: https://arxiv.org/abs/2306.07588

### 14.9 Layout morphing dial

- How: Turn a dial to morph the graph between two layouts; nodes that travel far are the surprising ones.
- Inputs: dial, two-post pull. Visual: node trajectories.
- Good for: topology vs metadata.
- Origin and evidence: VRNetzer, Nature Communications 2021.
- Sources: https://www.nature.com/articles/s41467-021-22570-w

### 14.10 Walk between layouts

- How: Layouts are pinned to floor spots; walking between them morphs the graph proportionally; stop midway to see which nodes travel far; step onto a spot to commit; thumbstick when seated.
- Inputs: floor position or thumbstick. Visual: floor markers, graph mid-morph.
- Good for: comparing and choosing layouts.
- Origin and evidence: invented; proxemic interaction (Ballendat, Marquardt, Greenberg, ITS 2010); Jakobsen et al., IEEE TVCG 2013 (lab N=12: unintended movement-driven changes disliked).
- Sources: https://doi.org/10.1145/1936652.1936676 ; https://doi.org/10.1109/TVCG.2013.166

### 14.11 DJ crossfader

- How: Two decks each hold a layout, an algorithm result or a saved view; a crossfader morphs positions and colors between them; per-channel knobs choose which deck drives position, color and size; cue previews deck B privately.
- Inputs: slider, knobs, drop records onto decks. Visual: mixer; nodes that differ most glow mid-fade.
- Good for: comparing two layouts or two algorithm outputs.
- Origin and evidence: invented.

### 14.12 Snow-globe seeds

- How: The layout lives in a palm-size globe; shake it to re-run the layout with a new seed; bottle results onto a labeled shelf, put one on a plinth to make it the room-size graph, or pinch inside a globe to teleport.
- Inputs: shake, grab, place, pinch. Visual: shelf of miniature globes labeled by seed.
- Good for: exploring layout variability, picking a reproducible seed, navigating a large graph.
- Origin and evidence: invented; Worlds in Miniature (Stoakley, Conway, Pausch, CHI 1995).
- Sources: https://dl.acm.org/doi/10.1145/223904.223938

### 14.13 Matrix views: linked adjacency matrix, NodeTrix tiles and pull-out matrix slabs

- How: A 2D adjacency matrix, reordered by community or a metric, sits as a panel or a floor or wall surface beside the 3D node-link graph, with brushing linked both ways. Variant (NodeTrix hybrid): dense communities collapse in place into small matrix tiles floating inside the 3D graph while sparse parts stay node-link; grab a tile to expand it back. Variant (per-region swap): grab a dense community and pull it out; it flattens into a matrix slab (or adjacency list or table) whose external edges dock onto its rows and columns; twist the slab to reorder by degree or seriation, push it back in to restore node-link. Other regions can swap at the same time (a long chain flattened to a 1D strip).
- Inputs: ray or poke on cells; two-hand grab and pull; twist to reorder; voice ("as a matrix") or palette. Visual: heat-shaded matrix with block structure, or matrix tiles and slabs embedded in the 3D graph, tethered by inter-cluster links.
- Good for: dense graphs and hairball cores where node-link fails, reading the block structure of communities, checking which members are fully connected, edge weight lookup.
- Origin and evidence: Ghoniem, Fekete, Castagliola, InfoVis 2004 (lab N=36: matrices beat node-link on most tasks for graphs over about 20 nodes and for dense graphs); Henry, Fekete, McGuffin, "NodeTrix", IEEE TVCG/InfoVis 2007 (prototype with an informal study). Not evaluated in VR; the swap gesture is invented. The catalog had only 14.7 (time cube) and 14.8 (triangle matrix).
- Sources: https://doi.org/10.1109/INFVIS.2004.1 ; https://doi.org/10.1109/TVCG.2007.70582
- Merged from: "Linked adjacency matrix and NodeTrix hybrid view", "Per-region representation swap (pull a cluster out as a matrix)".

### 14.14 Small multiples shelf and parameter-sweep gallery

- How: Several miniature copies of the same graph, each showing a different algorithm result, layout, time step or filter, sit on a curved shelf or grid around the user. Rotation, camera and selection are synchronized, so brushing a node in one copy highlights it in all; pull any copy up to full scale. Sweep variant: pick one parameter (community resolution, PageRank damping, a threshold, k for k-core, or a layout) and say or flick "sweep"; the system runs N values and orders the copies along the arc by the parameter, with stability coloring (a node that changes group across the sweep glows). Walk along the arc or turn the head to scan; pinch two copies together to diff them (13.16).
- Inputs: grab and place a replica, a ray brush shared across copies, voice ("show betweenness, pagerank and degree"), head turn or walking to scan. Visual: an arc of 4 to 16 synchronized miniatures with a label under each and the same node highlighted in each.
- Good for: comparing many centralities or community algorithms at once, choosing parameters, judging how stable communities and rankings are, comparing time steps or layouts, teaching what a parameter does.
- Origin and evidence: Liu, Prouzeau, Ens, Dwyer, "Design and Evaluation of Interactive Small Multiples Data Visualisation in Immersive Spaces", IEEE VR 2020 (lab study: curved shelf layouts suited small multiples); Sedlmair et al., "Visual Parameter Space Analysis", IEEE TVCG 2014 (survey and framework); Tufte's small multiples (guideline). Distinct from 14.11 (two decks) and 14.12 (per-seed snow globes); applying it to graph algorithm sweeps is invented.
- Sources: https://doi.org/10.1109/VR46266.2020.00081 ; https://arxiv.org/abs/2001.04745 ; https://doi.org/10.1109/TVCG.2014.2346321
- Merged from: "Small multiples shelf of graph replicas", "Parameter-sweep gallery (immersive small multiples)".

### 14.15 View-managed labels with leader lines

- How: A view-management solver lays labels out each frame instead of floating them at the nodes: they avoid overlap and occlusion, keep a constant angular size, and move to a decluttered label plane or the graph's silhouette, joined to their nodes by leader lines. Priority (selection, metric, gaze) decides which labels win space.
- Inputs: passive; label density by voice or slider; gaze raises priority. Visual: non-overlapping billboarded labels of constant apparent size, leader lines, a side label column for dense cores.
- Good for: reading names in dense 3D graphs, which the catalog only toggles (proximity, stillness, LOD) and never places.
- Origin and evidence: Bell, Feiner, Hollerer, "View management for virtual and augmented reality", UIST 2001 (prototype); Madsen et al., "Temporal coherence strategies for augmented reality labeling", IEEE TVCG 2016 (lab study); excentric labeling, Fekete and Plaisant, CHI 1999 (desktop).
- Sources: https://doi.org/10.1145/502348.502363 ; https://doi.org/10.1109/TVCG.2016.2518318 ; https://doi.org/10.1145/302979.303148

### 14.16 Depth-cue rendering kit (edge halos, fog, focus blur)

- How: Rendering choices that make 3D structure legible: dark halos around edges so crossings read front to back, distance fog or desaturation, screen-space ambient occlusion on node clusters, optional depth-of-field focus at the selection's depth. Each is a named, switchable style mode.
- Inputs: style presets; focus depth follows selection or gaze. Visual: haloed edges, receding fog, contact shading in clusters.
- Good for: reducing depth ambiguity and edge-crossing confusion in the 3D node-link base view every other option sits on.
- Origin and evidence: Ware and Mitchell, "Visualizing graphs in three dimensions", ACM TAP 2008 (lab studies: stereo plus motion cues made path tracing reliable in graphs of up to about 1000 nodes); Tarini, Cignoni, Montani, IEEE TVCG 2006 (prototype, ambient occlusion and edge cueing); edge halos ship in tools such as Graphia.
- Sources: https://doi.org/10.1145/1279640.1279644 ; https://doi.org/10.1109/TVCG.2006.115

### 14.17 Multivariate node glyphs

- How: Each node shows several attributes or algorithm scores at once as a glyph: donut or radial-bar rings, a small star plot, stacked segments, or 3D shape plus color plus texture. Glyphs gain detail as you approach; the user chooses which columns feed which ring.
- Inputs: drag columns into glyph slots; LOD by distance. Visual: ringed or segmented nodes, each ring a metric.
- Good for: comparing several centralities or attributes per node without switching styles; spotting nodes high on one metric and low on another.
- Origin and evidence: Borgo et al., "Glyph-based visualization", EuroVis STAR 2013 (survey and guidelines); shipped in Cytoscape (enhancedGraphics pie and ring node charts). Not studied in VR.
- Sources: https://doi.org/10.2312/conf/EG2013/stars/039-063 ; https://apps.cytoscape.org/apps/enhancedgraphics

### 14.18 Overlapping-set enclosures in 3D (BubbleSets, LineSets)

- How: Arbitrary groups (selections, overlapping communities, search results, attribute values) are drawn as smooth implicit-surface enclosures or colored threads through their members without moving the nodes. A node in several sets sits inside several overlapping translucent hulls or threads.
- Inputs: create from a selection or swatch; toggle per set. Visual: translucent iso-surfaces or colored curves through members, overlapping where sets intersect.
- Good for: overlapping community algorithms, comparing selections, showing set membership on a fixed layout. The catalog had only single-partition community hulls (10.13, 10.15).
- Origin and evidence: Collins, Penn, Carpendale, "Bubble Sets", IEEE TVCG/InfoVis 2009 (prototype); Alper et al., "Design study of LineSets", IEEE TVCG 2011 (lab study). The 3D implicit-surface version is invented.
- Sources: https://doi.org/10.1109/TVCG.2009.122 ; https://doi.org/10.1109/TVCG.2011.186

### 14.19 Tapered and directed edge encoding

- How: Edge direction and weight are shown statically: tapered tubes from wide (source) to narrow (target), a color gradient along the edge, or partial edges that show only the ends of long edges. Avoids arrowheads, which read poorly in 3D.
- Inputs: style setting. Visual: tapered tubes, gradient edges, stub edges.
- Good for: directed graphs, flow and citation data, less clutter from long edges. The catalog showed direction only through animated particles (11.9).
- Origin and evidence: Holten and van Wijk, "A user study on visualizing directed edges in graphs", CHI 2009 (lab study: tapered edges most effective, arrows least); Burch et al., "Evaluation of partial edges", IEEE TVCG 2012 (lab study).
- Sources: https://doi.org/10.1145/1518701.1519054 ; https://doi.org/10.1109/TVCG.2012.226

### 14.20 Community hierarchy view (nested spheres, sunburst dome, dendrogram)

- How: Hierarchical community results (Louvain and Leiden levels, k-core shells, clustering dendrograms) appear as their own structure: nested translucent spheres (3D circle packing), a sunburst on a dome overhead, or a dendrogram standing beside the graph. Picking a level or branch selects and colors those nodes in the graph.
- Inputs: ray or poke on a level or branch, twist to change level. Visual: nested bubbles, an overhead radial sunburst, or a 3D dendrogram linked to the graph.
- Good for: reading multi-level community structure and choosing the resolution of a result. Folding (10.14) collapses hierarchy in place but never shows it.
- Origin and evidence: Wang et al., "Visualization of large hierarchical data by circle packing", CHI 2006 (prototype); Stasko et al., sunburst versus treemap, IJHCS 2000 (lab study). The VR versions are invented.
- Sources: https://doi.org/10.1145/1124772.1124851 ; https://doi.org/10.1006/ijhc.2000.0420

### 14.21 Deterministic linear layouts as linked views (hive plot, BioFabric, arc diagram)

- How: Rule-based, reproducible layouts that place nodes on axes by attribute: a 3D hive plot (nodes on 3 to 6 radial axes by category, positioned by a metric), BioFabric (nodes as horizontal lines, edges as vertical segments), or an arc diagram on a wall, each linked to the main graph.
- Inputs: choose the axis attributes; a linked brush. Visual: radial axes with ribbons, or a line-fabric wall.
- Good for: comparing structure across categories without hairball ambiguity, reproducible views for reports, very dense graphs.
- Origin and evidence: Krzywinski et al., "Hive plots", Briefings in Bioinformatics 2012 (design paper, shipped tools); Longabaugh, "Combing the hairball with BioFabric", BMC Bioinformatics 2012 (design paper, shipped). No VR study.
- Sources: https://doi.org/10.1093/bib/bbr069 ; https://doi.org/10.1186/1471-2105-13-275

### 14.22 Global edge-bundling render mode with a bundle strength dial

- How: The whole graph is drawn with 3D edge bundling (hierarchical by community, or force-directed), with a strength dial from straight to fully bundled. Differs from edge combing (10.4), which bundles locally by hand.
- Inputs: dial or slider; bundle hierarchy from a community result. Visual: bundled curved edge flows between communities.
- Good for: an overview of traffic between communities in large graphs, cutting edge clutter.
- Origin and evidence: Kwon, Muelder, Lee, Ma, IEEE TVCG 2016 (VR lab study: spherical layout, curved bundled edges and interaction together beat the baseline); Holten, InfoVis 2006; Holten and van Wijk, EuroVis 2009.
- Sources: https://doi.org/10.1109/TVCG.2016.2520921 ; https://doi.org/10.1109/TVCG.2006.147

### 14.23 Density-field (splat) rendering for very large graphs

- How: Past a node or edge budget, or on demand, the graph is drawn as a continuous density field instead of glyphs: splatted into a 3D volume or onto a floor or wall heatmap, so dense cores and the corridors between communities show as glowing fog or iso-surfaces. Moving closer brings individual nodes back inside a focus region. Density can be weighted by a metric (for example PageRank mass instead of node count).
- Inputs: automatic switch by node count or distance, a style toggle, a weighting attribute and an iso-level dial. Visual: volumetric glow or nested iso-surfaces, discrete nodes only near the focus point.
- Good for: overviews of graphs with 10^5 nodes or more, where node-link drawing becomes noise and slows the frame rate; seeing where the mass sits before drilling in. The catalog's large-graph answers (galaxy, terrain, supernodes, folding) still draw discrete objects or need a clustering first.
- Origin and evidence: van Liere and de Leeuw, GraphSplatting, IEEE TVCG 2003 (prototype); Zinsmaier, Brandes, Deussen, Strobelt, Interactive level-of-detail rendering of large graphs, IEEE TVCG/InfoVis 2012 (prototype with performance evaluation). No VR study; the volumetric VR version is invented.
- Sources: https://doi.org/10.1109/TVCG.2003.1196006 ; https://doi.org/10.1109/TVCG.2012.238

### 14.24 Attribute-aggregated graph (PivotGraph / semantic substrate cube)

- How: Instead of a force layout, nodes are rolled up by the values of 2 or 3 categorical attributes into the cells of a 3D grid; each cell is one aggregate node sized by member count, and edges between cells are aggregated with thickness by edge count. A dial or palette chooses the attribute per axis; grabbing a cell expands it back into its members in the main graph.
- Inputs: assign attributes to X, Y and Z (palette, voice or attribute rods); grab a cell to expand it. Visual: a lattice of sized cubes or spheres joined by weighted edges.
- Good for: questions like 'how do departments connect across offices?', which force layouts hide; a deterministic, reproducible summary. Aggregates by attribute, whereas the catalog's meta-node options aggregate only by community or coarsening.
- Origin and evidence: Wattenberg, PivotGraph, CHI 2006 (prototype); Shneiderman and Aris, semantic substrates, IEEE TVCG 2006 (prototype with case studies). A third attribute as VR depth axis is invented.
- Sources: https://doi.org/10.1145/1124772.1124891 ; https://doi.org/10.1109/TVCG.2006.166

### 14.25 Geospatial layout on a hand-held globe or tabletop map

- How: When nodes carry coordinates (latitude/longitude, an address, a floor-plan position) or the user maps two attributes to them, the graph lays out on a globe held and spun in the off hand, a room-size globe, or a flat map on the real table or floor in AR. Edges are raised flow arcs, height by length or weight. A dial (or pinching to 'unpeel' the map) morphs between geographic position and topological layout so the user sees where geography and structure disagree. Passthrough can register a map to the room for local data such as a building or site. None of the other alternative worlds in this family uses geography; 13.6 borrows only the raised arcs.
- Inputs: choose coordinate columns; grab and spin the globe; two-hand stretch to zoom a region; geo-to-topology blend dial. Visual: globe or map with raised arcs and pinned nodes; ghost trails while morphing.
- Good for: infrastructure, transport, supply-chain, migration, epidemiology, IP and organization networks.
- Origin and evidence: Yang, Dwyer, Jenny, Marriott, Cordeil, Chen, Origin-destination flow maps in immersive environments, IEEE TVCG (InfoVis) 2019 (three VR lab studies, N=27 in one); Yang, Jenny, Dwyer, Marriott, Chen, Cordeil, Maps and globes in virtual reality, CGF (EuroVis) 2018 (lab study). The blend dial and general graph use are invented.
- Sources: https://arxiv.org/abs/1908.02089 ; https://ieeexplore.ieee.org/document/8440858 ; https://doi.org/10.1111/cgf.13431
- Merged from: "Geospatial layout on a globe or tabletop map", "Geo-anchored graph on a hand-held globe or tabletop map"

### 14.26 Exploded and group-in-a-box community layout

- How: An explode dial pushes communities (or any partition) outward from the centroid until they separate into distinct boxes or shelves, each keeping its internal layout, with only inter-group edges spanning the gaps. At full explosion groups snap into a group-in-a-box arrangement sized by member count; turning back reassembles the hairball.
- Inputs: explode dial or pulling two hands apart; choose the partition attribute or algorithm result. Visual: separated community volumes with bundled bridge edges in the gaps.
- Good for: clearing occlusion between communities without filtering anything away; reading the bridges. Existing options hull, fold or bundle communities but never pull them apart in space.
- Origin and evidence: Rodrigues, Milic-Frayling, Smith, Shneiderman, Hansen, Group-in-a-Box, IEEE SocialCom 2011 (shipped in NodeXL); Elmqvist and Tsigas, 3D occlusion management taxonomy, IEEE TVCG 2008 (survey: exploded views). The VR explode dial is invented.
- Sources: https://doi.org/10.1109/PASSAT/SocialCom.2011.139 ; https://doi.org/10.1109/TVCG.2007.70433

### 14.27 Content-bearing nodes (images, document cards, 3D models)

- How: Nodes whose data has media (photo, logo, molecule, document, 3D model URL) are drawn as that content, scaled by importance: icons far away, readable cards or full models to turn in the hand up close. The graph reads like a mood board or evidence wall instead of identical spheres.
- Inputs: map an image, text or model column to node appearance; proximity or gaze opens the full view. Visual: billboarded thumbnails and cards, or small 3D models.
- Good for: social, citation, knowledge, product and investigation graphs, where recognizing an entity beats reading its label. Multivariate glyphs (14.17) show numbers, not content.
- Origin and evidence: shipped in desktop tools (Cytoscape enhancedGraphics, Kumu, Neo4j Bloom icons, Obsidian canvas). No VR study found.
- Sources: https://apps.cytoscape.org/apps/enhancedgraphics ; https://docs.kumu.io/guides/images

### 14.28 Edge-centric view: line graph as a linked view or an inside-out flip

- How: Edges become first-class objects: each edge is a node of the line graph, linked when the original edges share an endpoint (bipartite data gets a variant that collapses one side into a projection). Two forms: (a) a linked secondary view beside the main graph with linked brushing; (b) a two-handed 'turn inside out' gesture (like turning a sock), a twist of a held graph prop or a voice command morphs the graph itself into its line graph, each edge-node starting at its old edge's midpoint, and the same gesture flips back. Selections, styles and results carry across, so every node tool (lenses, palettes, glyphs, community detection) works on edges.
- Inputs: toggle the view or the flip gesture; brush in either view; optional projection side for bipartite graphs. Visual: a second graph whose points are the original edges, or edges swelling into beads while endpoints dissolve into threads.
- Good for: edge-attribute analysis (edge betweenness, flow, transactions, bridges, which relationships share partners), overlapping link communities, bipartite projections. In the catalog edges are only styled, never analyzed as objects.
- Origin and evidence: Ahn, Bagrow, Lehmann, Link communities, Nature 2010 (algorithm basis); NetworkX line_graph and projected_graph. Using it as a linked view or animated flip is invented.
- Sources: https://doi.org/10.1038/nature09182 ; https://networkx.org/documentation/stable/reference/generated/networkx.generators.line.line_graph.html ; https://networkx.org/documentation/stable/reference/algorithms/bipartite.html
- Merged from: "Edge-centric dual view (line graph)", "Turn the graph inside out (edge-node duality flip)"

### 14.29 Eye-exam tuning ("better one, or better two?")

- How: Instead of sliders for layout, style or algorithm parameters, the system shows two variants of the same graph side by side or toggled (two repulsion strengths, two community resolutions, two color mappings); the user picks the better one by flick, nod or word. A preference-learning optimizer (sequential line search or Bayesian optimization from pairwise choices) proposes the next pair and converges in about 10 to 20 choices. Grabbing a variant makes it the start of the next round. Related to 14.14 parameter-sweep gallery, but driven by an optimizer.
- Inputs: any binary choice: controller flick, head nod or shake (7.11), 'left' or 'right', a pinch on one copy. Visual: two copies, or one toggling copy, with a convergence meter.
- Good for: layouts and community resolution, where nobody knows the values but everyone can tell which picture reads better; no text, sliders or parameter names needed.
- Origin and evidence: Koyama et al., Sequential Line Search, SIGGRAPH 2017 (crowd study); Brochu, de Freitas, Ghosh, NeurIPS 2007 (user study); Koyama et al., Sequential Gallery, ACM TOG 2020 (lab study). Not found for graph layout or VR; invented there.
- Sources: https://koyama.xyz/project/sequential_line_search/ ; https://papers.nips.cc/paper/3219-active-preference-learning-with-discrete-choice-data ; https://dl.acm.org/doi/10.1145/3386569.3392444

### 14.30 Motif simplification glyphs

- How: Common repeating substructures are replaced by compact glyphs and the layout is recomputed around them. Fans (many leaves off one hub) become a wedge sized by leaf count; D-connectors (many nodes linking the same few anchors) become a lens between the anchors; cliques become a solid polyhedron sized by member count. Reach out or pinch a glyph to expand it in place; a dial sets how aggressively motifs collapse. Unlike meta-nodes (10.13, 10.14), which collapse a community the user picks, and PivotGraph (14.24), which aggregates by attribute, this collapses by local structure automatically.
- Inputs: style toggle or dial; pinch or poke a glyph to expand it. Visual: wedges, lenses and polyhedra in place of leaf fans and dense cliques, with counts on each.
- Good for: social, citation and web graphs where leaf fans and cliques eat most of the space and the frame budget; makes the remaining structure readable in 3D at a glance.
- Origin and evidence: Dunne and Shneiderman, 'Motif simplification', CHI 2013 (lab study, N=36); shipped in NodeXL. The 3D and VR version is invented.
- Sources: https://doi.org/10.1145/2470654.2466444

### 14.31 Structural backbone (sparsified skeleton) render mode

- How: Every edge gets a structural importance score: Simmelian embeddedness (shared triangles), disparity-filter significance, or membership in the maximum spanning tree. Only backbone edges are drawn solid (or used for the layout); the rest fade to faint threads or disappear. A dial moves from 'backbone only' to 'all edges'. Unlike threshold filters (family 12), which cut on a node metric or a raw weight, edges are kept for their place in the structure, which untangles a hairball without removing nodes.
- Inputs: backbone method choice; a strength dial (hand span or stick). Visual: a clean skeleton of strong ties with the rest ghosted, communities pulled apart in the layout.
- Good for: dense small-world graphs that are a hairball in 3D; seeing community structure before running an algorithm.
- Origin and evidence: Nocaj, Ortmann, Brandes, 'Untangling the hairballs of multi-centered, small-world online social media networks', JGAA 2015 (prototype with case studies); Serrano, Boguna, Vespignani, PNAS 2009 (method paper). No VR study.
- Sources: https://doi.org/10.7155/jgaa.00370 ; https://doi.org/10.1073/pnas.0808904106

### 14.32 Layout uncertainty view (probabilistic positions)

- How: The force layout is run several times (several seeds, or samples of uncertain edges) and each node is drawn as a soft cloud over all its positions instead of a point; edges become fuzzy bundles. Tight clouds are stable structure; diffuse clouds are artifacts of one run. A toggle collapses back to one run. Complements robustness shading (18.6), which judges algorithm results, not layout placement.
- Inputs: toggle; number of runs; grab a cloud to pin the node. Visual: nodes as blurred density clouds of varying spread; edges as translucent fans.
- Good for: telling the user which apparent clusters and distances to trust in an unseeded force layout; uncertain or sampled edge data.
- Origin and evidence: Schulz, Nocaj, Goertler, Deussen, Brandes, Weiskopf, 'Probabilistic graph layout for uncertain network visualization', IEEE TVCG (InfoVis) 2017 (prototype with case studies). Not studied in VR.
- Sources: https://doi.org/10.1109/TVCG.2016.2598919

### 14.33 Edge-level detail rendering: parallel edges, edge types, self-loops and edge labels

- How: Parallel edges between the same pair fan out as separate arcs, or fold into one ribbon with a count that splits apart when the user reaches in. Edge types get lanes or dash patterns, self-loops are drawn as small rings, and edge attribute labels are placed by the same solver as node labels (14.15) along the edge midpoint, prioritized by selection, hover or weight. Extends 14.19 (direction and weight) to individual edge detail.
- Inputs: style setting; reach toward a ribbon to split it; the same label-density control as node labels. Visual: fanned arcs or count-labeled ribbons, typed lanes, loops, midpoint labels that stay readable as the user moves.
- Good for: multigraphs (transactions, communications, typed knowledge graphs) where collapsed parallel edges silently hide data; reading an edge's weight or type without a panel.
- Origin and evidence: shipped (Cytoscape draws and labels parallel edges; Neo4j Bloom shows edge types and labels). 3D edge label placement is prototype-level with no VR study.
- Sources: https://manual.cytoscape.org/en/stable/Styles.html ; https://neo4j.com/docs/bloom-user-guide/current/

### 14.34 Gaze-contingent edge reveal (foveated hairball declutter)

- How: Edges are faded across the whole graph except within a small cone around the point of regard (eye gaze where available, head-ray dwell otherwise); edges touching the looked-at nodes draw fully and their far endpoints light up even when far away. Node positions stay; edge clutter goes. A hand pose or button freezes the revealed set. Unlike 3.19 (moves the layout), 9.8 (a hand-held EdgeLens) and 14.16 (fog and blur by depth), the filter follows the eyes.
- Inputs: eye tracking (Vision Pro, Quest Pro) or a head-ray proxy on WebXR, which exposes no continuous eye gaze; freeze gesture. Visual: a dim node cloud with a bright moving patch of edges following where the user looks.
- Good for: reading dense 3D hairballs without filters; tracing connections from whatever catches the eye; reducing visual load on large graphs.
- Origin and evidence: gaze-contingent displays (Duchowski, Cournia, Murphy, CyberPsychology and Behavior 2004, review); EdgeLens (Wong, Carpendale, Greenberg, CHI 2003, lab study). Driving the edge filter from gaze in VR is invented.
- Sources: https://doi.org/10.1089/1094931041291295 ; https://doi.org/10.1145/642611.642626

---

## 15. Haptic, audio and other non-visual channels

### 15.1 Haptic Geiger sweep (haptics as a data channel)

- How: Vibration encodes data as the hand sweeps: a tick or pulse per node crossed, stronger for central nodes or hubs, a buzz at community borders and on edges to selected nodes.
- Inputs: hand or controller sweep; GamepadHapticActuator pulse; mid-air ultrasound haptics as a research variant. Visual: none.
- Good for: feeling density and hubs, eyes-free hub scanning, selection confirmation, an extra channel beyond color.
- Origin and evidence: haptic confirmation is guideline; probe haptics in Zimmermann and Bruckner, arXiv 2025 (no study); mid-air ultrasound haptics, Villa et al., ISS 2022 (lab N=12); data sweep invented.
- Sources: https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator ; https://arxiv.org/html/2507.01140v1 ; https://dl.acm.org/doi/10.1145/3567731 ; https://docs.ultraleap.com/haptics/index.html
- Merged from: "Haptic Geiger sweep", "Haptics as a data channel".

### 15.2 Edge tension pseudo-haptics

- How: A dragged node's edges act as springs: vibration and hand lag grow with stretch; hubs feel heavy.
- Inputs: grip drag, haptics, control/display ratio. Visual: stretching bright edges.
- Good for: feeling how embedded a node is.
- Origin and evidence: pseudo-haptics research (Lecuyer); application to edges invented.

### 15.3 Heft (weigh nodes to compare)

- How: A grabbed node's mass is a chosen metric: heavy nodes lag behind the hand, sag and rumble low; light ones are snappy. One node in each hand compares by which hand sinks, with a balance beam showing exact values; a palmful or tossed nodes sort by weight.
- Inputs: grab; haptics or visual offset. Visual: held nodes droop and lag; balance beam with values.
- Good for: coarse comparison of centrality and other metrics; accessibility; memorability.
- Origin and evidence: invented; Rietzler et al., CHI 2018 (lab); Samad et al., CHI 2019 (lab psychophysics); Lecuyer, Presence 2009 (survey of lab studies; supports coarse weight discrimination only).
- Sources: https://doi.org/10.1145/3173574.3173702 ; https://doi.org/10.1145/3290605.3300550 ; https://doi.org/10.1162/pres.18.1.39
- Merged from: "Heft to compare", "Heft".

### 15.4 Current under the finger

- How: Tracing an edge with its direction gives light ticks; against it, faster ticks and particles pushing back; weight sets tick intensity; circling a node gives a feel of its in and out degree.
- Inputs: controller haptics; hands get visuals only. Visual: particles flowing along the traced edge.
- Good for: directed graphs, reading weight without labels, accessibility.
- Origin and evidence: invented (haptic texture rendering).

### 15.5 Synesthetic feedback

- How: Every action triggers music-aligned sound, light pulse and haptics, entraining flow. Twist: BFS expansion heard as a rising arpeggio; read values by pitch and haptic ticks while brushing.
- Inputs: any action. Visual: pulses timed to sound.
- Good for: flow state; reading values non-visually.
- Origin and evidence: shipped (Tetris Effect, Rez by Mizuguchi); designer interviews.
- Sources: https://voicesofvr.com/920-tetris-effect-vr-experiential-design-for-flow-states-in-a-classic-puzzle-game/

### 15.6 Spatial sonification of the graph

- How: Nodes emit spatial sounds: communities hum at pitches, hubs are louder, edges have pitch; algorithms play as ripples and melodies; "ears in hand" plays what is near the controller.
- Inputs: head pose, hand position, touch; spatial audio. Visual: none required, or a small listening glyph.
- Good for: finding structure and targets out of view; accessibility; a second data channel; algorithm progress.
- Origin and evidence: sonification STAR 2024; ears-in-hand map exploration (research); spatial sonification chapter (31 percent better feature identification); graph mappings invented.
- Sources: https://arxiv.org/pdf/2402.16558 ; https://www.researchgate.net/publication/221098873 ; https://www.intechopen.com/chapters/1246021
- Merged from: "Spatial sonification of the graph", "Hearing the graph (spatial sonification)".

### 15.7 Spearcon sweep

- How: A sweeping ray or gaze plays sped-up spoken node names; pitch encodes a value.
- Inputs: ray or gaze motion. Visual: none.
- Good for: skimming many nodes by ear; feeling the density of hubs.
- Origin and evidence: Walker, Nance, Lindsay, ICAD 2006 (lab study).
- Sources: http://sonify.psych.gatech.edu/publications/pdfs/2006ICAD-WalkerNanceLindsay.pdf ; https://www.researchgate.net/publication/221100879

### 15.8 Earcons for operations and state

- How: Short distinct sounds confirm listening, understood, algorithm finished, errors; pitch direction for more/fewer.
- Inputs: none (output). Visual: none.
- Good for: knowing background work finished; voice confirmation without toasts.
- Origin and evidence: earcon research (Dingler and Lindsay, ICAD 2008); HoloLens guidance; visionOS Siri chirp (shipped).
- Sources: https://www.icad.org/Proceedings/2008/DinglerLindsay2008.pdf ; https://learn.microsoft.com/en-us/windows/mixed-reality/design/voice-input

### 15.9 Spoken readback of selection

- How: TTS reads a structured description of the hovered or selected node at a chosen verbosity.
- Inputs: speech or button trigger; TTS output. Visual: optional caption.
- Good for: reading attributes without panels; low-vision accessibility.
- Origin and evidence: Olli; VizAbility (lab study with blind and low-vision users).
- Sources: https://arxiv.org/pdf/2310.09611 ; https://arxiv.org/pdf/2506.15883

### 15.10 Whisper channel (spatial-audio narration at the node)

- How: Agent remarks are spoken quietly from the location of their subject; turn toward them to find it; can be tones only.
- Inputs: head orientation; voice. Visual: optional glint at the source.
- Good for: 360-degree attention guidance; low vision.
- Origin and evidence: invented.
- Sources: https://research.google/blog/agenthands-generating-interactive-hand-gestures-for-spatially-grounded-agent-conversations-in-xr/

### 15.11 Haptic gloves and wearable tactile devices

- How: Fingertip vibrotactile or force-feedback gloves, or a haptic vest, give touch feedback where bare hand tracking has none: contact when poking a node, resistance when stretching an edge, a pulse when a long-running algorithm finishes. Every other haptic entry assumes a controller actuator or ultrasound.
- Inputs: glove or vest as output; gloves can also track fingers. Visual: none.
- Good for: poke, pluck and grab with bare hands; eyes-free confirmation.
- Origin and evidence: shipped products (bHaptics TactGlove, SenseGlove, HaptX). The web would need Web Bluetooth or a vendor bridge, so feasibility is weak.
- Sources: https://www.bhaptics.com/en/tactsuit/tactglove-dk2/ ; https://www.senseglove.com/

### 15.12 Echolocation ping (hop distance heard as echo delay)

- How: The user fires a ping from a selected node (button, pinch, or a tongue click picked up by the mic). Each node within k hops answers with a short spatialized echo from its 3D position, delayed in proportion to hop (or weighted) distance and louder for higher scores, so the user hears the shape of the neighborhood, including behind them and inside occluded clusters. An active probe on demand, unlike 15.6 (always-on sonification), 9.15 (metal detector) and 11.6 (visual BFS ripple).
- Inputs: ping trigger; head pose for listening. Visual: optional faint ring per echo; none required.
- Good for: sensing reachability and neighborhood shape eyes-free; finding nodes out of view; low-vision and blind use; a quick spread check before a full traversal.
- Origin and evidence: invented for graphs; human echolocation research (Thaler and Goodale, WIREs Cognitive Science 2016, review); audio navigation cues in games for blind players (shipped, e.g. The Last of Us Part II). No study.
- Sources: https://doi.org/10.1002/wcs.1382 ; https://sonification.de/handbook/

---

## 16. Voice commands and speech input

### 16.1 Push-to-talk command words

- How: Hold grip or pinch, say a short fixed command (undo, reset view, run PageRank); release ends listening; closed grammar.
- Inputs: button or pinch-hold plus speech. Visual: mic glyph on the hand lights while held; recognized words flash.
- Good for: global commands with no spatial target; calling any of 60 algorithms by name.
- Origin and evidence: shipped (HoloLens, Meta Voice SDK).
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/design/voice-input ; https://developers.meta.com/horizon/documentation/unity/voice-sdk-overview/

### 16.2 See-it-say-it labels

- How: Every visible control label is its voice command; "what can I say" reveals voice badges.
- Inputs: speech, gaze to scope. Visual: speech badges on speakable controls.
- Good for: hands-free operation of any panel; voice discoverability.
- Origin and evidence: shipped and guideline (HoloLens MRTK).
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-uxcore/packages/uxcore/seeitsayit-label

### 16.3 Say-the-number tags over nodes

- How: "Show numbers" tags nodes or clusters in view; say a number to select, two numbers for a path; a grid variant for regions.
- Inputs: speech only. Visual: transient numbered pills on nodes.
- Good for: selecting dense, distant or occluded nodes; accessible selection; path endpoints.
- Origin and evidence: shipped (Apple Voice Control on iOS and visionOS).
- Sources: https://support.apple.com/guide/apple-vision-pro/perform-actions-with-your-voice-tan14d179ad1/visionos

### 16.4 Point-and-speak deictic commands ("why is THIS one central")

- How: Point a ray (controller, hand or gaze) at nodes and say "neighbors of this", "path from this to that", "why is this one central"; pronouns bind to the ray hit near utterance time, allowing for the lag between pointing and speech; recent pointing history is kept for "this and that"; bound referents are outlined and numbered before the action runs.
- Inputs: controller ray, hand ray or eye gaze plus speech. Visual: bound-referent outline that persists briefly; numbered markers for multiple referents.
- Good for: neighbor expansion, path endpoints, moving/pinning, comparing nodes, asking about unlabeled nodes, region selection.
- Origin and evidence: Bolt, Put-That-There, 1980 (demo); Oviatt 1999 (review); recent research 2024-2025; weaker form shipped (Meta AI with Vision, Gemini on Android XR).
- Sources: https://www.semanticscholar.org/paper/5ba7042c5220548c9d5636df3cc2c84bb8641e02 ; https://dl.acm.org/doi/pdf/10.1145/319382.319398 ; https://dl.acm.org/doi/10.1145/800250.807503 ; https://arxiv.org/abs/2404.08213 ; https://arxiv.org/abs/2510.12156 ; https://www.meta.com/blog/meta-ai-on-meta-quest-3/
- Merged from: "Point-and-speak deictic commands", "Deictic voice: why is THIS one central".

### 16.5 Look-to-talk

- How: Looking at a mic orb or dwelling on a node opens listening with no wake word; the gaze target from about 630 ms before speech resolves "this".
- Inputs: eye or head gaze plus speech. Visual: placeable orb brightens under gaze; listening ring on nodes.
- Good for: hands-free inspection while hands manipulate the graph.
- Origin and evidence: shipped (Vision Pro Look to Dictate, visionOS 27 Siri orb); lab evidence on gaze lead time; raw eye gaze is not exposed to WebXR on Vision Pro.
- Sources: https://support.apple.com/en-kg/guide/apple-vision-pro/tana14220eef/visionos ; https://roadtovr.com/siri-on-vision-pro-is-getting-eye-tracked-activation-and-visual-awareness-alongside-new-ai-features/ ; https://cse.msu.edu/~jchai/Papers/AAAI07Sym.pdf

### 16.6 Voice-addressed nodes by name

- How: Say a node name; a fuzzy phonetic match flies to it or brings it to you; ambiguous matches are offered as numbered tags.
- Inputs: speech. Visual: fly-through, target pulse, candidate tags.
- Good for: finding known nodes; path endpoints by name.
- Origin and evidence: speculative adaptation of voice search.
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/design/voice-input

### 16.7 Whisper / silent mode

- How: Commands whispered or mouthed; a whisper-tuned model or headset IMU/electrode sensors; closed-grammar fallback.
- Inputs: whispered or silent speech. Visual: quiet variant of the mic glyph.
- Good for: voice in shared spaces; reducing embarrassment.
- Origin and evidence: SilentWhisper 2022 (13.9% WER); QuietSync, ICMI 2024 (N=9, 94.2% on 12 commands); Pandey, CHI 2021 (acceptability); silent variant lacks consumer hardware.
- Sources: https://dl.acm.org/doi/fullHtml/10.1145/3526114.3558715 ; https://dl.acm.org/doi/10.1145/3678957.3685720 ; https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445430

### 16.8 Non-verbal voice continuous control

- How: Hum pitch to move a threshold, a sustained "ssss" to zoom, a tongue click to step.
- Inputs: pitch, loudness, vowel, duration. Visual: gauge or slider tracking the sound.
- Good for: scrubbing filter thresholds or layout steps while hands are busy.
- Origin and evidence: Vocal Joystick (UW); Voice as Sound (Igarashi and Hughes, UIST 2001).
- Sources: https://www.researchgate.net/publication/224640992 ; https://dl.acm.org/doi/pdf/10.1145/502348.502372

### 16.9 Incremental more/less/stop speech

- How: Steer an animated change with short words: bigger, more, slower, stop.
- Inputs: speech. Visual: the change plus a small value gauge.
- Good for: tuning size, opacity, spacing, label density.
- Origin and evidence: shipped in assistive voice control; speculative for graphs.
- Sources: https://support.apple.com/en-us/111778

### 16.10 Spell grammar (hard magic)

- How: A small, strict vocabulary of incantations paired with hand shapes; composable and predictable.
- Inputs: speech plus gesture. Visual: spellbook listing; cast traces.
- Good for: expert shortcuts; a memorable command set; differentiation.
- Origin and evidence: Wizualization (Batch et al., VIS 2023); shipped game In Verbis Virtus.
- Sources: https://dl.acm.org/doi/10.1109/TVCG.2023.3326580 ; https://en.wikipedia.org/wiki/In_Verbis_Virtus

### 16.11 Name-it macros

- How: After a sequence of steps say "call that triage"; saying it later replays it, optionally with a spoken argument.
- Inputs: speech. Visual: editable macro card.
- Good for: repeating analyses across datasets; sharing workflows.
- Origin and evidence: shipped (Voice Control custom commands); speculative for graphs.
- Sources: https://support.apple.com/en-us/111778

### 16.12 Spoken notes pinned to nodes

- How: Point at a node or selection and speak; the audio is kept, transcribed and searchable; an icon sits on the node.
- Inputs: pointing plus speech; touch or gaze playback. Visual: speech-bubble or waveform icon with transcript caption.
- Good for: annotation without typing; leaving findings for colleagues.
- Origin and evidence: Audio Stickies (research); patents on VR voice memos.
- Sources: https://www.researchgate.net/publication/266655117 ; https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10339715

### 16.13 Phone or desktop as voice/text channel

- How: A paired phone carries the mic, keyboard and transcript; results appear in VR; works around Quest Browser's missing speech API.
- Inputs: phone mic, keyboard, touch. Visual: mirror of phone text in VR; transcript on the phone.
- Good for: exact names, long queries, a second person feeding queries.
- Origin and evidence: speculative as design; platform gap documented.
- Sources: https://communityforums.atmeta.com/discussions/dev-quest/speechrecognition-in-webxr/1168273

### 16.14 Puppeteer: gesture is the verb, speech is the scope

- How: A tiny fixed gesture set carries verbs; short spoken modifiers set the scope; the agent fuses them with a preview.
- Inputs: hand or controller gestures plus voice. Visual: previewed effect on the scope.
- Good for: expand, hide, filter, layout on subsets; expert speed.
- Origin and evidence: researched base (multimodal fusion); the split is invented.
- Sources: https://dl.acm.org/doi/10.1145/800250.807503 ; https://arxiv.org/abs/2510.12156

### 16.15 Circle-and-ask

- How: Pinch-hold and draw a loop around part of the graph, then speak a question about it.
- Inputs: hand drawing plus speech. Visual: glowing lasso stroke until answered.
- Good for: ad hoc questions about a visual group; region vs rest comparison.
- Origin and evidence: shipped gesture only (Circle to Search on Android XR); speech combination speculative.
- Sources: https://tech.yahoo.com/ar-vr/articles/circle-search-real-life-standout-140000364.html

### 16.16 Describe-and-point group selection

- How: Point roughly and describe ("the big red ones over here"); an LLM fuses ray, words and attributes to select many objects.
- Inputs: ray plus speech. Visual: soft candidate highlight while speaking.
- Good for: selecting many nodes by position plus attribute.
- Origin and evidence: AssistVR (Chen, Grubert, Kristensson 2024), lab study N=24, beat a mini-map baseline for multiple targets.
- Sources: https://arxiv.org/abs/2410.21091

---

## 17. Natural language, conversation and generative UI

### 17.1 Natural-language query as editable chips (visible parse)

- How: A spoken or typed question is parsed into a filter, selection or algorithm call shown as editable tokens near the hand with a live highlight; poke a chip to cycle alternatives, drag to remove; the uncertain chip is marked; runs on release.
- Inputs: speech or text; pinch/poke to edit chips. Visual: floating query strip of tokens.
- Good for: find, filter, attribute selection, path queries, multi-part filters, recovering from recognition errors, learning the vocabulary.
- Origin and evidence: Orko (TVCG 2018, network vis NL plus touch), NL4DV, LinkQ (research); 2024-2026 research on visible parses.
- Sources: https://www.researchgate.net/publication/319364606 ; https://arxiv.org/pdf/2008.10723 ; https://dl.acm.org/doi/10.1145/3811427.3811441 ; https://arxiv.org/abs/2608.00876 ; https://arxiv.org/abs/2408.13391
- Merged from: "Natural-language query to editable query chips", "Visible parse as editable chips".

### 17.2 Ambiguity widgets in space

- How: For vague words the system guesses, runs, and spawns a small widget showing the choice (dropdown, slider); corrections persist.
- Inputs: speech then hand/ray or spoken correction. Visual: small 3D controls anchored beside results.
- Good for: thresholds; which attribute or algorithm a vague word meant.
- Origin and evidence: DataTone, UIST 2015 (lab study); shipped Tableau Ask Data.
- Sources: https://www.semanticscholar.org/paper/36a607d93637475a3675ee55ee7a1c2eb6d4376a ; https://www.tableau.com/about/blog/2019/12/overcoming-ambiguity-natural-language-research-behind-ask-data

### 17.3 Clarify-by-choice tray

- How: Ambiguity is answered by a tray of 2-4 large labeled choices instead of prose.
- Inputs: voice; point or poke. Visual: row of large targets.
- Good for: algorithm choice, name disambiguation, destructive confirmations.
- Origin and evidence: researched; suggested replies shipped widely.
- Sources: https://arxiv.org/abs/2607.23201

### 17.4 Ghost futures: preview interpretations, grab one

- How: An ambiguous request renders 2-4 translucent candidate outcomes; the user grabs the intended one.
- Inputs: voice, grab or point. Visual: semi-transparent alternate colorings or positions with labels.
- Good for: algorithm, layout and style choice; teaching by showing.
- Origin and evidence: researched (feedforward).
- Sources: https://arxiv.org/abs/2607.23201 ; https://dl.acm.org/doi/10.1145/3742413.3789063 ; https://arxiv.org/abs/2502.14229

### 17.5 Conversational follow-ups with context

- How: Each utterance builds on the previous result; pronouns and ellipsis are resolved against the current selection.
- Inputs: speech or text. Visual: breadcrumb trail of conversation steps, each clickable.
- Good for: progressive narrowing; a record of the analysis path.
- Origin and evidence: Eviza/Evizeon, Orko, Setlur and Tory (research).
- Sources: https://arxiv.org/pdf/2207.00189 ; https://dl.acm.org/doi/10.1145/2984511.2984588

### 17.6 Live query preview while speaking

- How: Streaming partial transcripts are parsed continuously so the graph highlight follows the sentence as it is spoken.
- Inputs: streaming speech. Visual: graph updates live; faint transcript line.
- Good for: fast filtering; catching misrecognition mid-sentence.
- Origin and evidence: speculative; related to Ask Data autocomplete.
- Sources: https://www.tableau.com/blog/ask-data-simplifying-analytics-natural-language-98655

### 17.7 Voice style rules as editable cards

- How: "Color by PageRank, red is high" becomes a real style layer shown as an editable card in the layer stack.
- Inputs: speech; hands to edit. Visual: stack of rule cards mirroring style layers.
- Good for: styling by data without a property editor; reading back active styles.
- Origin and evidence: NL visualization authoring (desktop research); mapping to style layers speculative.
- Sources: https://arxiv.org/pdf/2208.10947

### 17.8 Spoken history and undo by description

- How: "Go back to before I filtered", "what did I do in the last five minutes"; history searchable by language.
- Inputs: speech. Visual: timeline ribbon of operation cards.
- Good for: recovery and review in long sessions; branching.
- Origin and evidence: speculative.
- Sources: https://arxiv.org/pdf/2207.00189

### 17.9 What-can-I-do voice help

- How: Ask about the interface or concepts; the answer is spoken with highlighted controls or a demonstration.
- Inputs: speech or text; pointing at an element. Visual: highlighted controls, optional ghost hand.
- Good for: onboarding; explaining algorithms to non-experts.
- Origin and evidence: Hey Dashboard / DIANA, CHI 2026 (qualitative study: voice plus highlighting preferred).
- Sources: https://arxiv.org/abs/2510.12386

### 17.10 Ask about what is in view

- How: "What am I looking at?": the agent uses the rendered view plus the data behind visible nodes to describe the region.
- Inputs: speech; view and gaze as context. Visual: scan effect; items light as named.
- Good for: orientation in large 3D graphs; region summaries; accessibility.
- Origin and evidence: shipped (visionOS 27 Siri visual awareness, Gemini on Galaxy XR).
- Sources: https://roadtovr.com/siri-on-vision-pro-is-getting-eye-tracked-activation-and-visual-awareness-alongside-new-ai-features/ ; https://blog.google/products-and-platforms/platforms/android/samsung-galaxy-xr/

### 17.11 Ask-and-show analyst agent (the answer is the graph)

- How: A goal-level spoken or typed request is planned by an LLM into real app operations (algorithms, selection, layout, style layers, filter, camera, export); the answer is a change to the scene plus at most one sentence, with a plan card whose steps check off.
- Inputs: speech or text, optional pointing and confirm. Visual: temporary result style layer, camera framing, pinnable caption, plan card, effects highlighted.
- Good for: find, neighbors, paths, centrality questions, multi-step analysis, first contact, users who do not know algorithm names.
- Origin and evidence: researched (Lee et al. 2026 voice for immersive network vis; CogBRE MCP agent; ChatVis; LLM vis agents 2024).
- Sources: https://arxiv.org/abs/2607.26526 ; https://arxiv.org/pdf/2508.13413 ; https://arxiv.org/pdf/2507.23096 ; https://arxiv.org/abs/2401.12672 ; https://arxiv.org/abs/2406.06621 ; https://arxiv.org/abs/2207.00189
- Merged from: "Analyst agent with tool calls", "Ask-and-show: the answer is the graph".

### 17.12 Summoned widget: say it, then tune it by hand

- How: A voice edit is applied and the agent synthesizes a one-purpose control (slider, range, ramp) for that edit beside the hand.
- Inputs: voice to create, hands to adjust. Visual: generated control tethered to affected nodes.
- Good for: styling by data, thresholds, layout parameters.
- Origin and evidence: desktop research (DynaVis, Spatula); new in VR.
- Sources: https://dx.doi.org/10.1145/3613904.3642639 ; https://arxiv.org/abs/2607.10405

### 17.13 Generative panel assembled for the task

- How: The agent composes a whole panel from a fixed component library for the current task; it dissolves on task change and can be saved.
- Inputs: voice or typed request plus selection context. Visual: floating or body-anchored panel with changing content in a stable design system.
- Good for: rare or compound tasks; fewer always-on menus.
- Origin and evidence: researched (generative UI, LLMR).
- Sources: https://arxiv.org/html/2604.09577v1 ; https://dl.acm.org/doi/10.1145/3706599.3719743 ; https://arxiv.org/abs/2309.12276

### 17.14 Socratic interviewer (asks about the goal first)

- How: On load, the agent asks 2-3 goal questions and configures algorithms, layout and style; skippable.
- Inputs: voice or choice trays. Visual: questions and choices; the graph changes per answer.
- Good for: novices, unknown datasets.
- Origin and evidence: adjacent research; new for VR graphs.
- Sources: https://dl.acm.org/doi/10.1145/3742413.3789063

---

## 18. AI agents in the space

### 18.1 Embodied guide (avatar or pointing hands)

- How: The agent has a body, a small avatar or a floating pair of hands in the scene and points at the nodes it explains, gesturing in sync with speech.
- Inputs: speech to the agent; agent answers with speech plus deictic gesture. Visual: small avatar, hand pair, or disembodied laser hand.
- Good for: explaining algorithm results and paths, onboarding, guided analysis, directing attention in 3D.
- Origin and evidence: embodied conversational agent literature, EmBARDiment, AgentHands (Google), Kim 2018 (research); NPCs shipped in social VR.
- Sources: https://arxiv.org/html/2408.08158v1 ; https://dl.acm.org/doi/10.1145/3715070.3749224 ; https://research.google/blog/agenthands-generating-interactive-hand-gestures-for-spatially-grounded-agent-conversations-in-xr/ ; https://sreal.ucf.edu/wp-content/uploads/2018/08/Kim2018a.pdf ; https://arxiv.org/abs/2401.11923 ; https://dl.acm.org/doi/10.1145/3613905.3651026
- Merged from: "Embodied guide avatar", "Embodied guide with pointing hands".

### 18.2 Disembodied presence: agent as a second cursor

- How: The agent is a distinct ray or spark that visibly moves to what it will act on before acting; the user can catch it to stop it.
- Inputs: voice; grab to interrupt. Visual: colored ray or spark with a short trail.
- Good for: legible agent actions without occlusion or social baggage.
- Origin and evidence: invented, drawing on groupware telepointers.
- Sources: https://sreal.ucf.edu/wp-content/uploads/2018/08/Kim2018a.pdf ; https://doi.org/10.1023/A:1021271517844

### 18.3 Narrated interruptible tour (flythrough)

- How: "Give me a tour" generates narrated stops (biggest community, hubs, bridges, outliers); the agent moves the camera or world while narrating; the user interrupts by speech or gesture to branch into questions and the agent re-plans.
- Inputs: speech to start or interrupt, gesture, head direction. Visual: numbered path of stops, captions, a scrubbable stop strip.
- Good for: first look at a dataset, presenting findings, handoff, onboarding, accessibility.
- Origin and evidence: VR guided tours 2025, LLM narration (research); interruption and branching speculative.
- Sources: https://arxiv.org/pdf/2502.00880 ; https://arxiv.org/pdf/2310.09611 ; https://arxiv.org/abs/2409.17331 ; https://arxiv.org/abs/2607.26910 ; https://dl.acm.org/doi/10.1145/3706598.3713132 ; https://arxiv.org/abs/2504.17150
- Merged from: "Narrated interruptible tour", "Narrated flythrough".

### 18.4 Agent drives, user steers (shared autonomy)

- How: The agent explores continuously; the user biases direction with gaze or lean, flicks "less of this", holds "stay"; control is blended by user effort.
- Inputs: head/gaze, hand flicks, hold; optional voice. Visual: travelling focus, fan of next candidates, trail.
- Good for: foraging large unfamiliar graphs; low-effort exploration.
- Origin and evidence: invented, from shared-control robotics.
- Sources: https://doi.org/10.1177/0278364913490324 ; https://dl.acm.org/doi/10.1145/302979.303030

### 18.5 Agent panel of disagreeing specialists

- How: Several role agents (structure, community, skeptic, domain) answer from their angle; disagreements are shown as colored overlays; the user moderates.
- Inputs: voice addressed by name or gaze. Visual: seats with colors, overlays and cards.
- Good for: avoiding single-answer overconfidence; critical thinking.
- Origin and evidence: desktop/NLP research; new in VR and graphs.
- Sources: https://arxiv.org/abs/2509.20553 ; https://aclanthology.org/2024.emnlp-main.992/ ; https://arxiv.org/abs/2506.00066

### 18.6 Skeptic on the shoulder: robustness shading

- How: On pin or save, a skeptic agent re-runs the finding under perturbation and shades its stability.
- Inputs: passive trigger; tap for details. Visual: solid vs shimmering shading.
- Good for: community detection and centrality rankings before export.
- Origin and evidence: invented.
- Sources: https://arxiv.org/abs/2509.20553

### 18.7 Hypothesis cards

- How: A spoken belief becomes a card with proposed tests and status lights, tethered to nodes.
- Inputs: voice, grab, tap. Visual: cards on a workbench.
- Good for: hypothesis-driven analysis; tracking what was checked.
- Origin and evidence: researched base; spatial form invented.
- Sources: https://arxiv.org/abs/2507.18165 ; https://arxiv.org/abs/2305.11483

### 18.8 Node beacons: anchored proactive suggestions

- How: The agent places quiet, rate-limited markers on notable nodes; look or point to expand one into one sentence and one action.
- Inputs: passive; gaze or point; one action. Visual: small glyphs or halos, an expanded tethered card.
- Good for: discovery, attention guidance, onboarding.
- Origin and evidence: researched (ProactiveVA, Inner Thoughts; mixed-initiative principles, Horvitz CHI 1999; the Clippy lesson); spatial form invented.
- Sources: https://arxiv.org/abs/2507.18165 ; https://dl.acm.org/doi/10.1145/3706598.3713760 ; https://dl.acm.org/doi/10.1145/302979.303030 ; https://xenon.stanford.edu/~lswartz/paperclip/paperclip.pdf

### 18.9 Show it twice: programming by demonstration

- How: The user edits 2-3 nodes by hand; the agent infers the rule and ghosts the generalization with a rule chip; one gesture accepts.
- Inputs: direct manipulation, accept gesture, chip edit. Visual: ghosted predicted changes plus rule text.
- Good for: styling by data and filters without knowing attribute names.
- Origin and evidence: researched base (PBD, Cypher "Watch What I Do"); new for VR graphs.
- Sources: http://acypher.com/wwid/

### 18.10 Ghost completion of gestures

- How: The agent predicts the rest of an in-progress lasso or path drag and ghosts it; flick to accept.
- Inputs: in-progress gesture; accept gesture. Visual: faint extended selection or path.
- Good for: selection in dense 3D, path finding.
- Origin and evidence: shipped elsewhere (code ghost text); new for VR.
- Sources: https://docs.github.com/en/copilot/using-github-copilot/getting-code-suggestions-in-your-ide-with-github-copilot

### 18.11 Spell cards: packaged reusable workflows

- How: The agent offers to turn a successful multi-step workflow into a card; throw or touch it to replay on a subgraph or dataset; shareable.
- Inputs: grab, throw, touch; voice to name. Visual: deck of illustrated cards.
- Good for: repeated analyses, teaching, replay.
- Origin and evidence: invented; LLMR skill library closest.
- Sources: https://arxiv.org/abs/2309.12276

### 18.12 Visible workers for long-running jobs

- How: Slow jobs appear as entities sweeping the region they process; grab to cancel, ask for an ETA.
- Inputs: agent-initiated; grab; voice. Visual: worker glyphs or a scanning wave.
- Good for: legible, interruptible computation; covering latency.
- Origin and evidence: invented.
- Sources: https://dl.acm.org/doi/10.1145/302979.303030 ; https://arxiv.org/abs/2507.22352

### 18.13 Context librarian: outside knowledge on nodes

- How: The agent looks up the real-world entities behind labels, hangs cards, and proposes dashed edges or attributes that need acceptance.
- Inputs: voice plus deixis; accept/reject. Visual: tethered cards, dashed proposed edges.
- Good for: knowledge graphs, citation and biology networks, enrichment.
- Origin and evidence: shipped in general form (Meta AI, Android XR); desktop research.
- Sources: https://www.meta.com/blog/meta-ai-on-meta-quest-3/ ; https://blog.google/products-and-platforms/platforms/android/android-xr/ ; https://arxiv.org/abs/2410.11531 ; https://arxiv.org/abs/2512.11674

### 18.14 Findings gallery the agent builds

- How: Pinned findings are assembled into walkable stations with captions and evidence; editable; exportable as a tour or report.
- Inputs: voice, locomotion. Visual: ring of mini-graph dioramas.
- Good for: save, export, share, revisiting.
- Origin and evidence: researched base (immersive data-driven storytelling); agent-authored output invented.
- Sources: https://arxiv.org/abs/2401.11923 ; https://imld.de/cnt/uploads/Immersive-Data-Driven-Storytelling.pdf

### 18.15 Group facilitator in shared sessions

- How: The agent tracks multi-party talk, catches mismatched references, summarizes, speaks at pauses.
- Inputs: multi-party voice and pointing. Visual: shared agent presence, per-user highlights.
- Good for: team analysis, teaching, stakeholder reviews.
- Origin and evidence: researched.
- Sources: https://arxiv.org/abs/2607.18556 ; https://dl.acm.org/doi/10.1145/3706598.3713760

### 18.16 Shared transcript for collaborative sessions

- How: All users' speech is transcribed into a shared log tied to their pointing; the agent acts on it and summarizes it as graph notes.
- Inputs: multi-user speech plus rays. Visual: speech bubbles anchored to discussed nodes; a log.
- Good for: team analysis and review meetings.
- Origin and evidence: speculative; related to the VR guided tours study.
- Sources: https://arxiv.org/pdf/2502.00880

### 18.17 Companion screen for agent text

- How: The headset shows the graph and captions; a phone or desktop shows the transcript, exact query and tables; editing there re-runs in the headset.
- Inputs: voice in the headset, touch on the phone. Visual: minimal captions in the headset, full chat on the phone.
- Good for: long text, precise edits, records.
- Origin and evidence: invented; second screens common in products.
- Sources: https://arxiv.org/abs/2308.13015

### 18.18 Explain-the-result replay

- How: The agent animates how an algorithm reached a result on the real graph (wavefronts, flow pulses, merges) with narration and scrubbing.
- Inputs: voice plus deixis; play/pause/scrub. Visual: animated overlays on the graph.
- Good for: trust, teaching algorithms, explaining to non-specialists.
- Origin and evidence: invented.
- Sources: https://research.google/blog/agenthands-generating-interactive-hand-gestures-for-spatially-grounded-agent-conversations-in-xr/

### 18.19 Agent-built analysis room

- How: The user describes a workspace; the agent arranges multiple linked graph views and panels; rearrange by hand and save.
- Inputs: voice; hands. Visual: several linked views around the user.
- Good for: multi-view coordinated analysis; recurring setups.
- Origin and evidence: researched (LLM-generated XR scenes).
- Sources: https://arxiv.org/abs/2309.12276 ; https://arxiv.org/abs/2502.02441 ; https://arxiv.org/abs/2411.11752

---

## 19. Text entry

### 19.1 Drum keyboard

- How: Controller tips strike key pads like drums.
- Inputs: tip collision, haptic tick. Visual: pad keyboard at waist height.
- Good for: search, annotations, filter values.
- Origin and evidence: Google Daydream Labs 2016 (informal, about 50 wpm); IJVR comparison study.
- Sources: https://blog.google/products-and-platforms/products/google-ar-vr/daydream-labs-exploring-and-sharing-vrs/ ; https://ijvr.eu/article/view/2917

### 19.2 Real keyboard in VR (tracked or passthrough cutout)

- How: The real keyboard is shown in VR with the hands, either as a tracked model (Quest tracked K830, Apple Magic Keyboard) or through a passthrough hole on the desk, so touch-typing works.
- Inputs: Bluetooth keyboard, passthrough; typing and shortcuts. Visual: a rectangle of real video, or a rendered keyboard with hands.
- Good for: search, query and selector expressions, filter expressions, annotation, LLM prompts, shortcuts.
- Origin and evidence: shipped (Horizon Workrooms; Meta tracked keyboard, deprecated in v72); Grubert et al., IEEE VR 2018 (lab study N=24: about 60 percent of desktop speed).
- Sources: https://developers.meta.com/vr/documentation/unity/unity-tracked-keyboard/ ; https://about.fb.com/news/2021/08/introducing-horizon-workrooms-remote-collaboration-reimagined/ ; https://arxiv.org/html/1802.00626 ; https://www.meta.com/blog/apple-magic-keyboard-support-link-sharing-an-organized-home-and-more-in-latest-quest-software-update/
- Merged from: "Real keyboard via passthrough cutout", "Tracked physical keyboard".

### 19.3 Dictation with n-best repair chooser

- How: Dictate free text; uncertain words are underlined; point to see alternatives or respell.
- Inputs: speech plus pointing or pinch. Visual: text with highlighted words and radial alternatives.
- Good for: entering names, labels, search terms without a virtual keyboard.
- Origin and evidence: multimodal error correction (Suhm et al.: repair faster than re-speaking, slower than typing); 2024 study.
- Sources: https://www.researchgate.net/publication/220286396 ; https://www.tandfonline.com/doi/full/10.1080/10447318.2024.2352932

### 19.4 Word-gesture (swipe) keyboard and the platform system keyboard

- How: (a) A shape-writing keyboard: sweep a finger, ray or head pointer across a virtual keyboard in one stroke per word, and a decoder resolves the word. (b) The headset's own system keyboard, raised when a DOM input field gets focus, so the app builds no keyboard at all.
- Inputs: finger, ray or head pointer; or the OS keyboard. Visual: a floating keyboard with the stroke trail and word candidates.
- Good for: node search, selector and filter expressions, labels, LLM prompts when speaking is not possible.
- Origin and evidence: Markussen, Jakobsen, Hornbaek, "Vulture", CHI 2014 (lab study: mid-air word-gesture typing, about 20 wpm after training); system keyboards ship on Quest and visionOS, but whether they can be raised inside an immersive WebXR session must be checked per browser.
- Sources: https://dl.acm.org/doi/10.1145/2556288.2556964

### 19.5 Predictive zooming text entry (Dasher) over the graph's own vocabulary

- How: For users who can steer only one continuous pointer (head, gaze, single joystick, mouth stick or sip-and-puff) and cannot type or be understood by speech recognition. Text is entered by flying into a zooming column of letters, with a language model giving likely next letters more room; here the model is built from the loaded graph's node labels, attribute names and values and algorithm names, so naming a node, attribute or filter value takes a few strokes. Unlike 19.4 it needs no discrete click; unlike 29.2 scanning it is continuous and fast once learned.
- Inputs: any single continuous 2D pointer. Visual: nested letter boxes streaming toward the user, candidate node names as whole-word boxes.
- Good for: ALS, spinal cord injury and severe motor impairment; also no-hands search in any session.
- Origin and evidence: shipped open-source assistive tool (Dasher; Ward, Blackwell, MacKay, UIST 2000); Tuisku, Majaranta, Isokoski, Raiha, ETRA 2008 (longitudinal lab study, N=12, gaze Dasher 2.5 to 17.3 wpm over ten sessions). Graph-vocabulary model invented.
- Sources: https://www.researchgate.net/publication/220810949_Now_Dasher_Dash_Away_Longitudinal_Study_of_Fast_Text_Entry_by_Eye_Gaze ; https://arxiv.org/pdf/2010.03247

---

## 20. Commands and operations as objects

### 20.1 Algorithm cartridges

- How: Algorithms are holdable cartridges inserted into the controller or touched to nodes; each is a removable result layer.
- Inputs: grip, trigger, proximity. Visual: labeled cartridges; controller tinted by the loaded algorithm.
- Good for: tangible stacking of algorithm style layers.
- Origin and evidence: holsters shipped (Job Simulator, Alyx); cartridges invented.

### 20.2 Placed operators

- How: Pull a token off the palette and set it on a node, cluster or region; the token IS the applied operation; twist for its parameter, pick it up to undo.
- Inputs: grab, place, twist.
- Good for: visible hidden state, local analysis, provenance by inspection.
- Origin and evidence: invented; inspired by token+constraint (Ullmer, Ishii, Jacob, TOCHI 2005), game totems, Tilt Brush detachable panels.

### 20.3 Charm bracelet compositor

- How: Thread algorithm, filter, rank and style beads on a wrist bracelet; twist a bead to set its parameter; fling it at the graph to run; the thumb along the bracelet scrubs through intermediate states.
- Inputs: grab, drop, twist.
- Good for: repeatable recipes, provenance, comparing pipelines.
- Origin and evidence: invented; inspired by Unix pipes and node editors.

### 20.4 The meta-graph (in-world wiring)

- How: Operations (algorithms, layouts, styles, filters, export) are nodes in a second graph, or chips created with a pen; draw a wire from a selection to an operation to apply it, chain outputs onward; parameters are child nodes; cut a wire to undo. The wiring is provenance, and the pipeline is itself a graph rendered by the same engine.
- Inputs: pinch-drag edge, pen with trigger, grab, slice. Visual: operation cubes or boxes orbiting the data with bright wires.
- Good for: running algorithms, chaining analyses, visual query pipelines, provenance.
- Origin and evidence: invented for graphs; shipped node editors (Blender geometry nodes, Unreal Blueprints) and Rec Room Maker Pen circuits; Ragan et al., IEEE TVCG 2016 (provenance).
- Sources: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/introduction.html ; https://doi.org/10.1109/TVCG.2015.2467551 ; https://rec-room.fandom.com/wiki/Maker_Pen
- Merged from: "The meta-graph", "In-world wiring (maker pen circuits)".

### 20.5 Cauldron of ingredients

- How: Drop combinations of physical ingredients into a vessel to produce a result: a node set plus an algorithm token plus a style token. Twist: the vessel keeps the recipe for re-running on another graph.
- Inputs: grab and drop into a vessel. Visual: objects, reacting vessel, emerging result.
- Good for: composing analyses; reusable recipes.
- Origin and evidence: shipped (Waltz of the Wizard); guides.
- Sources: https://vr.fandom.com/wiki/Waltz_of_the_Wizard

### 20.6 Workbench of physical, hands-first tools

- How: Every function is a grabbable object on a counter, rack or wall, used as in life, and its shape conveys what it does; no abstract menus. Graph examples: magnifier for labels, scissors to cut edges, a lamp lighting neighbors, a betweenness flashlight, props for each algorithm family.
- Inputs: grab, use, physics. Visual: a bench of chunky, readable props.
- Good for: a graph lab bench where newcomers can see what exists.
- Origin and evidence: shipped (Job Simulator, Vacation Simulator by Owlchemy); GDC postmortem and design talks.
- Sources: https://www.gdcvault.com/play/1024256/-Job-Simulator-Postmortem-VR ; https://developers.meta.com/vr/blog/owlchemy-labs-case-study-lessons-learned-from-job-to-vacation/?locale=da_DK ; https://www.gamedeveloper.com/design/q-a-serious-vr-design-lurks-just-beneath-i-job-simulator-i-s-goofy-premise
- Merged from: "Physical props on a workbench", "Visceral hands-first tools".

### 20.7 Algorithm spice rack with hover preview

- How: Algorithms are jars on a shelf grouped by family; hovering previews cheap results live and shows a cost estimate for expensive ones; grabbing a jar commits.
- Inputs: hover, grab. Visual: labeled jars whose lids show parameters.
- Good for: finding about 60 algorithms by browsing rather than by name.
- Origin and evidence: invented.

### 20.8 Spice jars (style by sprinkling)

- How: Style presets are jars; shake one over a region to apply the style to nodes under the cone; shake more to strengthen; each sprinkle becomes a scoped style layer; a wash jar removes styling.
- Inputs: grab jar, shake over region. Visual: particle cone, nodes adopting the style.
- Good for: fast local layered styling without an editor.
- Origin and evidence: invented.

### 20.9 Stained-glass layer stack

- How: Each style layer or filter is a glass sheet or pane between user and graph; hold panes up to see layers composited in the order you hold them; reorder them by sliding or in a rack to reorder the real style stack; bin a pane to remove its layer.
- Inputs: grab panes, two-hand overlap, rack slots, stylus. Visual: translucent tinted panes recoloring the graph seen through them.
- Good for: understanding and editing the style layer stack.
- Origin and evidence: invented; Bier et al., Toolglass and Magic Lenses, SIGGRAPH 1993.
- Sources: https://dl.acm.org/doi/10.1145/166117.166126
- Merged from: "Stained-glass layer stack", "F3 Sheets-of-glass style/filter stack".

### 20.10 Embodied attribute axes (ImAxes pattern)

- How: Data attributes are graspable labeled rods; their arrangement (angle, distance) creates plots with no menus or modes, and crossing two makes a scatterplot. On a live graph: plug or touch a rod to the graph to map the attribute to size, color or axis; hold it against the graph and nodes slide to their values along it with edges still drawn.
- Inputs: grip, grab and place, proximity. Visual: labeled rods with ticks, nodes snapped to them, plots between rods.
- Good for: style-by-data as physical assembly; metrics vs structure; attribute layouts.
- Origin and evidence: Cordeil et al., ImAxes, UIST 2017 (research system with user study; not graphs); graph use invented.
- Sources: https://dl.acm.org/doi/pdf/10.1145/3126594.3126613 ; https://www.researchgate.net/publication/318876157 ; https://ialab.it.monash.edu/~dwyer/papers/imaxes.pdf ; https://www.semanticscholar.org/paper/ImAxes:-Immersive-Axes-as-Embodied-Affordances-for-Cordeil-Cunningham/d67a50aea692bf3720865d292abb96c1ca408603
- Merged from: "Embodied attribute rods (ImAxes pattern)", "D6 Embodied axes", "Embodied attribute axes on a live graph", "Embodied axes combined by proximity".

### 20.11 Result card deck (fanned card hand)

- How: Each algorithm run, or each ranked result, arrives as a card in an off-hand deck or fanned hand. Fan or thumb through it to browse and highlight nodes; pull a card to fly to its node; flick one onto the graph to apply its style; lay cards out to compare; discard or throw away to hide or delete; shuffle in another list to merge.
- Inputs: grab, off-hand fan by wrist turn, thumb scroll, pull, flick, lay down, discard. Visual: playing-card panels with name, value bar and rank.
- Good for: analysis history and comparison; reading algorithm results without a floating table.
- Origin and evidence: invented.
- Merged from: "Result card deck", "Fanned card hand".

### 20.12 Datasets as physical objects: load, append and join by combining

- How: Each data source is an object: a file arrives from the phone or desktop (25.x) as a labeled jar or cartridge on a shelf showing a preview of its size and format. Drop it on the plinth to load it. Pour a second jar into the loaded graph to append it, or touch two jars together to join on a key: pinch matching attribute labels on the two jars to choose the key, and a preview shows how many nodes match before committing. Unmatched nodes stay ghosted for inspection.
- Inputs: grab, place, pour; pinch attribute labels to choose the join key; companion device for file picking. Visual: a shelf of jars with tiny previews; a pour animation; a match preview ("1,240 of 1,300 matched"); ghosted unmatched nodes.
- Good for: loading data, combining node and edge files, enriching a graph with an attribute table, all without leaving VR. No other entry covers bringing data in.
- Origin and evidence: invented.
- Sources: none

### 20.13 Sentinels (standing questions placed in the world)

- How: The user plants a sentinel (a small totem) on a node, cluster or empty region holding a standing question: 'tell me if this node enters the top 10 by betweenness', 'if these two communities merge', 'if any node crosses this volume', 'if a path between A and B appears'. It stays live through filter changes, time scrubbing, reruns and layout settling; when true it lights, chimes spatially and pulses haptics, and a thread leads to the cause. Placed operators (20.2) apply once; a sentinel watches and reports later.
- Inputs: place and grab; a voice or NL predicate (17.1 chips) dragged onto the totem; poke to see why it fired; pick up to remove. Visual: dormant totems, glowing when fired with a leader line; off-screen firing uses 22.21 Halo or Wedge cues.
- Good for: temporal or what-if exploration, long sweeps and parameter fiddling where the change happens away from where the user looks; in VR much of the scene is behind the user.
- Origin and evidence: invented for VR graph analysis; desktop analogues are database triggers, continuous queries and dashboard alerting. No VR evidence.
- Sources: https://dl.acm.org/doi/10.1145/191839.191863

---

## 21. Rendered HTML plumbing

How the existing graphty React panels could appear inside an immersive session. These are
implementation routes, kept here because they bound which panel-based options are cheap.

### 21.1 HTML-in-Canvas live DOM texture

- How: WICG proposal: `layoutsubtree` canvas children, and `drawElementImage` / `texElementSubImage2D` upload a live DOM element snapshot to a WebGL/WebGPU texture; input is forwarded by ray-UV mapping.
- Inputs: ray or poke on the textured quad, real keyboard focus. Visual: any mesh wearing the live React panel.
- Good for: reusing existing graphty panels in VR without rewriting them.
- Origin and evidence: spec in incubation, behind a Chromium flag.
- Sources: https://github.com/WICG/html-in-canvas ; https://groups.google.com/a/chromium.org/g/blink-dev/c/t_nGEmJ_v4s

### 21.2 Rasterize the DOM (html2canvas / SVG foreignObject)

- How: A library repaints the DOM into a canvas used as a DynamicTexture, refreshed on change.
- Good for: read-mostly panels today: tables, legends, node cards.
- Origin and evidence: demo / forum (Babylon community).
- Sources: https://forum.babylonjs.com/t/webxr-compatible-html-texture/48978

### 21.3 Babylon HtmlMesh

- How: CSS3D-positioned real DOM aligned with a mesh; desktop only, not in immersive WebXR.
- Origin and evidence: shipped library.
- Sources: https://doc.babylonjs.com/addons/htmlMesh

### 21.4 WebXR DOM Overlay

- How: One DOM element composited over an immersive session; handheld AR only; rejected by Quest Browser for immersive-vr.
- Good for: phone-AR graphty with full app chrome.
- Origin and evidence: W3C spec, shipped in Chrome Android.
- Sources: https://immersive-web.github.io/dom-overlays/

### 21.5 WebXR compositor quad / cylinder layers

- How: The panel texture is handed to the compositor and sampled once (no double aliasing), with a text-optimized quality hint; no depth-sorting with scene meshes.
- Good for: long-reading surfaces: tables, logs, docs.
- Origin and evidence: spec, shipped in Quest Browser.
- Sources: https://www.w3.org/TR/webxrlayers ; https://developers.meta.com/horizon/blog/achieve-better-rendering-and-performance-with-webxr-layers-in-oculus-browser/

### 21.6 Engine-native 3D GUI

- How: Babylon GUI 3D HolographicSlate, NearMenu, HandMenu built as meshes.
- Origin and evidence: shipped library (MRTK patterns).
- Sources: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D

### 21.7 Stream the real 2D app window

- How: WebRTC capture of the desktop app into a video texture, with pointer events sent back.
- Good for: the full app in VR on day one with zero porting.
- Origin and evidence: WindowSpace, PACM HCI 2025 (lab study); shipped (Immersed, Virtual Desktop).
- Sources: https://dl.acm.org/doi/10.1145/3773063 ; https://immersed.com/

---

## 22. Panel placement and window management

### 22.1 App as one big window / Theater View

- How: The whole app as a large world-locked panel at 0.8-3 m, with the graph in the room.
- Origin and evidence: shipped (Horizon OS, visionOS); Meta panel guideline.
- Sources: https://www.meta.com/blog/meta-quest-v67-update-new-window-layout-creator-content-horizon-feed/ ; https://developers.meta.com/horizon/design/panels/

### 22.2 Hinged multi-panel arc

- How: Three docked panels in an arc plus free panels.
- Origin and evidence: shipped (Horizon OS v67).
- Sources: https://www.neowin.net/news/meta-quest-supports-six-window-multitasking-with-horizon-os-version-67/

### 22.3 Personal Cockpit (body-anchored ring of windows)

- How: A body-anchored curved grid or shell of small touchable windows at arm's reach; switch tasks with a head turn and a touch.
- Inputs: head turn, poke. Visual: a curved array of panels.
- Good for: fixed body positions for the catalog, results, layouts, filters and style layers.
- Origin and evidence: Ens, Finnegan, Irani, CHI 2014 (lab studies: 40% faster switching).
- Sources: https://hci.cs.umanitoba.ca/publications/details/personal-cockpit ; https://dl.acm.org/doi/10.1145/2556288.2557058
- Merged from: "B3 Personal Cockpit", "Personal cockpit ring of windows".

### 22.4 Multiple virtual monitors

- How: 2-5 virtual monitors around a seated desk with keyboard and mouse.
- Origin and evidence: shipped products; Pavanatto et al., IEEE VR 2021 (lab study).
- Sources: https://wordpress.cs.vt.edu/3digroup/2020/12/02/ar-virtual-monitors/ ; https://arxiv.org/html/2601.02829v1

### 22.5 Spatial Bar taskbar

- How: A thumbnail bar for window switching by gaze or cursor.
- Origin and evidence: Pavanatto, Grubert, Bowman, IEEE VR 2025 (lab study).
- Sources: https://arxiv.org/abs/2501.11754

### 22.6 Curved panels

- How: Cylindrical panels keep all columns equidistant from the eye.
- Origin and evidence: Meta guideline.
- Sources: https://developers.meta.com/horizon/design/display/

### 22.7 Ornaments and side tab bars (on windows or on the graph volume)

- How: Toolbars float just in front of and below the content, outside the window edge, and a vertical tab bar expands its labels when looked at; operated by look and pinch. Windows, volumes and immersive spaces are distinct containers.
- Inputs: gaze plus pinch, or touch. Visual: glass toolbars attached to the edge of the content.
- Good for: a toolbar attached to the graph's bounding volume that travels and scales with the graph.
- Origin and evidence: shipped and guideline (Apple visionOS HIG).
- Sources: https://www.createwithswift.com/creating-ornaments-in-visionos/ ; https://developer.apple.com/videos/play/wwdc2024/10153/
- Merged from: "Ornaments and side tab bars on the content volume", "B7 visionOS windows with ornaments".

### 22.8 Tag-along lazy-follow panel

- How: World-still until it leaves a view cone, then glides back.
- Origin and evidence: MRTK solvers; HoloLens guideline.
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/design/near-menu

### 22.9 Glanceable peripheral panels

- How: Head-glance or gaze summons peripheral content.
- Origin and evidence: Lu et al., IEEE VR 2020 (lab study).
- Sources: https://wordpress.cs.vt.edu/3digroup/2020/02/13/glanceable-ar-information-access-methods-for-head-worn-ar-displays/

### 22.10 Projective windows

- How: One gesture grabs, pushes and scales a panel onto a surface; apparent size stays constant while held; push away to enlarge.
- Inputs: pinch and push. Visual: panels flying to walls.
- Good for: fast arrangement of result panels.
- Origin and evidence: Lee, An, Kim, Bae, CHI 2018 (lab study).
- Sources: https://sketch.kaist.ac.kr/publications/2018_chi_projective_windows ; https://dl.acm.org/doi/10.1145/3173574.3173792
- Merged from: "D2 Projective windows", "Projective windows".

### 22.11 Visual links panel-to-graph

- How: Routed 3D links from panel rows to their nodes.
- Origin and evidence: Prouzeau et al., ISS 2019 (lab study).
- Sources: https://ialab.it.monash.edu/~dwyer/papers/VisualLinks.pdf

### 22.12 Data-flow panels

- How: Each analysis step produces a placed output panel.
- Origin and evidence: DataHop, UIST 2020 (lab study).
- Sources: https://hci.ucsd.edu/datahop

### 22.13 Coordinated-view containers

- How: Views in clonable, linked boxes.
- Origin and evidence: INTERACT 2021 (lab study N=19).
- Sources: https://link.springer.com/chapter/10.1007/978-3-030-85613-7_33

### 22.14 Diegetic holographic UI

- How: Information on world objects instead of floating chrome.
- Origin and evidence: shipped games (Dead Space, Half-Life: Alyx).
- Sources: https://medium.com/inbeta/dead-space-ui-design-lessons-for-vr-39aa9e976ca8

### 22.15 Orthographic viewport panels

- How: A placeable flat projection of the 3D graph, selection-linked.
- Origin and evidence: shipped (Gravity Sketch); 2D/2.5D/3D network study 2023.
- Sources: https://arxiv.org/pdf/2307.10674

### 22.16 Peel a node

- How: Pinch-pull a node to peel off its linked detail card.
- Origin and evidence: invented.

### 22.17 Graph-aware panel placement

- How: A solver moves, tilts or fades panels to avoid occluding relevant nodes.
- Origin and evidence: invented.

### 22.18 Table ring around the graph

- How: A cylindrical attribute table aligned to node bearings.
- Origin and evidence: invented.

### 22.19 Walls as panel surfaces, graph in the middle

- How: 2D panels snap to real walls and the 3D graph stands in open space.
- Inputs: plane detection, drag to snap. Visual: a war room.
- Good for: results tables per run, histograms, comparisons.
- Origin and evidence: FIESTA, Lee et al., InfoVis 2020 (research); WebXR plane detection.
- Sources: https://arxiv.org/abs/2009.00050 ; https://immersive-web.github.io/plane-detection/

### 22.20 Detective's corkboard

- How: Throw nodes at a wall to pin them as cards; stretch red string between two cards to compute and hang the shortest path between them; notes by voice or keyboard; the board saves and exports.
- Inputs: throw, string stretch, voice or keyboard. Visual: a readable 2D board beside the 3D graph.
- Good for: annotation, case-building, paths between chosen entities, a summary that survives leaving VR.
- Origin and evidence: invented.

### 22.21 Off-screen result indicators (3D Halo and Wedge, EyeSee360)

- How: When a search, algorithm or agent highlights nodes outside the field of view (behind, above, or occluded), peripheral indicators show where and how many: arcs or wedges at the view edge, or a compressed 360-degree band of out-of-view targets. Tap one to turn toward the target or fly to it.
- Inputs: passive; point at an indicator to travel. Visual: edge-of-view wedges sized by distance, or a thin radar band of out-of-view results.
- Good for: finding results in room-scale and surround graphs; making "it found 12 matches" visible. Other out-of-view cues in the catalog are audio only (15.6, 10.x).
- Origin and evidence: Gruenefeld et al., "EyeSee360", ACM SUI 2017 (lab study); Gruenefeld et al., "Beyond Halo and Wedge", MobileHCI 2018 (lab study); Lin et al., "Outside-In", UIST 2017 (lab study).
- Sources: https://doi.org/10.1145/3131277.3132175 ; https://doi.org/10.1145/3229434.3229438 ; https://doi.org/10.1145/3126594.3126656

### 22.22 UI text drawing style and panel material that adapt to the background

- How: The look of the UI (not where panels sit) adapts to what is behind it. Over passthrough or a busy graph, labels and panels switch among drawing styles: billboard with an opaque backing, outline or halo text, a frosted-glass panel that blurs and dims what is behind, or an opaque panel, chosen from the measured contrast of the background behind each panel or label. In VR over the dark graph void, a lighter translucent style keeps the graph visible through the UI.
- Inputs: automatic, from the background behind each panel; a per-user legibility override. Visual: panels and labels whose backing material and outline change with the background.
- Good for: mixed-reality sessions on Quest and Vision Pro, where a real room behind fixed-color panels breaks legibility; overlays on dense graphs.
- Origin and evidence: Gabbard, Swan, Hix, Presence 2006 (lab study, N=18, text drawing styles and backgrounds in outdoor AR); Apple visionOS HIG, Materials (guideline; shipped glass material).
- Sources: https://doi.org/10.1162/pres.2006.15.1.16 ; https://developer.apple.com/design/human-interface-guidelines/materials

---

## 23. Desk, room and floor

### 23.1 Seated desk VR (VirtualDesk, deskVR)

- How: The virtual desk is aligned to the real one; the graph and panels sit on it and are anchored to it; leaning changes the view; the desk supports the arms.
- Inputs: hands on the desk, head motion, tangibles. Visual: a graph model on the desk.
- Good for: long, low-fatigue sessions; precise selection.
- Origin and evidence: Zielasko et al., WEVR 2017 (lab study N=23); Wagner Filho et al., VirtualDesk (research); shipped (Horizon Workrooms).
- Sources: https://www.vr.rwth-aachen.de/media/papers/paper1.pdf ; https://www.semanticscholar.org/paper/VirtualDesk:-A-Comfortable-and-Efficient-Immersive-Wagner-Freitas/08c77168370f990efbcb931ed2c90fbfa37dd12a
- Merged from: "C6 Desk-anchored seated panels", "Seated desk VR (VirtualDesk/deskVR)".

### 23.2 Desk as a touch surface

- How: Virtual controls are aligned to the real desk plane so every touch lands on wood; the graph floats above.
- Inputs: hand or controller tip touching the desk, drags. Visual: a flat lit control area on the desk.
- Good for: low-fatigue algorithm picking, style editing, threshold scrubbing.
- Origin and evidence: Gall/Grubert et al., IEEE WEVR 2019 (lab study N=33: desk alignment affected menu time; a mid-air menu with physical backing won narrowly); Insko, UNC 2001 (passive haptics raise presence).
- Sources: https://ieeexplore.ieee.org/document/8809589/ ; https://www.cs.unc.edu/techreports/01-017.pdf

### 23.3 Shadow on the desk

- How: The floating 3D graph casts a live 2D projection onto the real desk; touching the shadow selects and moves nodes in 3D.
- Inputs: finger on the desk, passive haptics. Visual: a crisp 2D graph on the desk linked to the 3D one.
- Good for: precise lasso and labels while keeping the 3D structure in view.
- Origin and evidence: Herndon et al., Interactive Shadows, UIST 1992 (research root); mixed-reality desk version invented.
- Sources: https://dl.acm.org/doi/10.1145/142621.142622

### 23.4 Shadow lamps (wall projections)

- How: Place lamps around the 3D graph; each casts a 2D shadow projection onto a wall or floor, with different encodings; moving the lamp changes the angle; colored lamps cast subsets; attribute lamps cast a two-attribute scatterplot; selection is linked across all shadows, and selecting a shadow selects the node.
- Inputs: grab, place or hold lamps; touch or point at shadows. Visual: one 3D graph plus linked 2D shadow views on room surfaces.
- Good for: linking 3D structure to readable 2D views; comparing projections; precise selection.
- Origin and evidence: invented (GEB shadow sculpture); scatterplot matrix navigation, Elmqvist, Dragicevic, Fekete, IEEE TVCG 2008 (lab N=16).
- Sources: https://doi.org/10.1109/TVCG.2008.153
- Merged from: "Shadow lamps", "Shadow puppets (wall projections)".

### 23.5 Graph on the real table

- How: The graph is dropped onto a detected table and sits at model scale so people can walk around it.
- Inputs: plane/mesh detection, hit test. Visual: a tabletop network.
- Good for: overview, group discussion, a stable reference.
- Origin and evidence: product and guideline (MRTK surface magnetism, WebXR mesh detection).
- Sources: https://developers.meta.com/horizon/documentation/web/iwsdk-guide-scene-understanding/

### 23.6 Graph on the floor (stand on it, select with feet)

- How: A 2D or room-scale layout on the floor; walking navigates; standing on a node focuses it and its neighborhood rises around you; stepping or tapping a foot selects; stepping across edges walks paths.
- Inputs: head and feet position over the floor, foot tap. Visual: a network carpet.
- Good for: hands-free browsing of communities, ego view by standing on a node, path walking, spatial memory.
- Origin and evidence: Velloso et al. feet survey, ACM CSUR 2015; Huang, Pfister, Yang 2023 (embodied network navigation promising); graph use invented.
- Sources: https://researchportal.bath.ac.uk/en/publications/the-feet-in-human-computer-interaction-a-survey-of-foot-based-int/ ; https://arxiv.org/pdf/2301.11516
- Merged from: "Graph on the floor, select with feet", "Floor as a map you stand on".

### 23.7 Room stations (walking is the mode switch)

- How: Areas of the room are filter, algorithm, style and export stations; carrying a selection to a station applies it.
- Inputs: walking, carrying, proxemic triggers. Visual: labeled benches or zones.
- Good for: a memorable spatial pipeline; teaching.
- Origin and evidence: invented; roots in proxemics (Ballendat, ITS 2010) and memory palaces (Krokos 2019, lab N=40).
- Sources: https://dl.acm.org/doi/10.1145/1936652.1936676 ; https://www.cs.umd.edu/sites/default/files/scholarly_papers/Krokos.pdf

### 23.8 Saved views anchored to real objects

- How: Persistent anchors pin views or subgraphs to real places in the room.
- Inputs: WebXR anchors, gaze or point. Visual: badges or miniatures on real objects.
- Good for: investigation bookmarks, long projects.
- Origin and evidence: memory palace research, Ens, SUI 2015; platform: WebXR Anchors.
- Sources: https://immersive-web.github.io/anchors/ ; https://dl.acm.org/doi/10.1145/2788940.2788954

### 23.9 Colocated shared graph

- How: Several headsets see one graph aligned by shared anchors; each person's selections are colored.
- Inputs: shared anchors, each person's own input. Visual: one graph in the room.
- Good for: team analysis, presenting, pointing.
- Origin and evidence: shipped (Quest Browser experimental colocated WebXR, visionOS SharePlay).
- Sources: https://www.uploadvr.com/quest-web-browser-experimental-colocation-webxr/ ; https://developer.apple.com/videos/play/wwdc2025/318/

### 23.10 Swivel chair as a view carousel

- How: Seated, the user turns the chair (body yaw) to pick among workspaces or linked views of one graph arranged in a circle (different layouts or algorithm colorings).
- Inputs: torso or chair rotation, head yaw. Visual: 4 to 8 graph stages in a circle.
- Good for: comparing layouts or results by direction; many simultaneous views without window management.
- Origin and evidence: invented combination; roots in Personal Cockpit and a multi-layout network design (2021).
- Sources: https://arxiv.org/abs/2112.10272
- Merged from: "Swivel-chair ring of linked views", "Swivel chair as a view carousel".

### 23.11 Desk cockpit (combination)

- How: Desk-surface controls plus a physical keyboard plus a pedal clutch, with the graph floating above the desk.
- Good for: a seated all-day analysis station.
- Origin and evidence: invented combination.

### 23.12 Ambient room as global-state display

- How: Graph-wide facts with no single location are carried by the environment instead of a panel: sky color or brightness shows how far the layout has converged (it calms as the layout settles); fog density shows the fraction hidden by filters; a low sound bed changes with modularity or connectivity; horizon glows grow while background jobs run, one per job; floor tint shows the selection's share of the graph. Nothing has to be read; a change is noticed peripherally, and looking at the sky opens the exact value.
- Inputs: none for awareness; gaze or point at the sky or horizon to read exact values. Visual: subtle sky, fog, horizon and floor changes; an exact readout card only when asked.
- Good for: knowing that the layout is still settling, that filters hide most of the data, or that an algorithm finished, without status panels cluttering the view.
- Origin and evidence: Ishii et al., "ambientROOM", CHI 1998 (prototype); Pousman and Stasko, "A taxonomy of ambient information systems", AVI 2006 (framework); peripheral awareness benefits have mixed lab evidence. The graph-analysis mapping is invented; 5.2 and 18.12 use the body and panels, never the environment.
- Sources: https://doi.org/10.1145/286498.286652 ; https://doi.org/10.1145/1133265.1133277

### 23.13 Room-aware layout (the room is part of the force model)

- How: In mixed reality the room mesh and planes (WebXR mesh and plane detection) enter the layout as forces and constraints: nodes avoid furniture and keep walking lanes clear, large communities settle on empty floor or against walls, a cluster dropped on the real desk flattens to fit, one dropped on a wall becomes a 2D view, and hierarchy tiers can map to floor, desk and eye height. In the catalog plane detection only places panels (4.20, 22.19), never the graph.
- Inputs: automatic from scene understanding; drag a cluster onto a real surface to bind it; toggle the room solid or ghost. Visual: the graph drapes around real objects; bound clusters show a contact glow or shadow.
- Good for: a large 3D graph walkable in an ordinary room without collisions; real surfaces as passive haptics; spatial memory tied to familiar places, as passthrough use grows.
- Origin and evidence: invented for graph layout. Related: Lindlbauer, Feit, Hilliges, Context-aware online adaptation of MR interfaces, UIST 2019 (lab study, UI only); Lee et al., FIESTA, IEEE TVCG 2020 (panels on walls); WebXR mesh and plane detection (draft specs, shipped in Quest browser).
- Sources: https://dl.acm.org/doi/10.1145/3332165.3347945 ; https://immersive-web.github.io/real-world-meshing/ ; https://immersive-web.github.io/real-world-geometry/plane-detection.html

---

## 24. Physical props, tangibles, stylus and extra controllers

### 24.1 Tangible tokens and proxies as graph handles

- How: Physical objects (pucks, magnets, rulers, tokens) seen in passthrough are bound to nodes, filters, algorithms or thresholds; moving a token changes what it is bound to.
- Inputs: tracked physical objects plus hand tracking. Visual: real objects with virtual halos; graph anchored to them.
- Good for: pinning landmark nodes, stacking filters, source and target tokens for paths, precision, presenting.
- Origin and evidence: TangibleNet, CHI 2025 (lab study N=12); McGuffin et al., TVCG 2024 (N=34); VirtualDesk tangibles.
- Sources: https://arxiv.org/abs/2504.04710 ; https://arxiv.org/pdf/2504.04710 ; https://arxiv.org/html/2207.11586
- Merged from: "Tangible tokens as graph handles", "Tangible proxies and magnets".

### 24.2 Tangible tokens as a query pipeline

- How: Marked cards or blocks stand for algorithms, filters and styles; placement applies, order is pipeline order, rotation is a parameter.
- Inputs: token presence, position, order, rotation. Visual: labels and previews over tokens, linked by a line into the graph.
- Good for: building and reordering analysis pipelines, visible undoable history, teaching.
- Origin and evidence: tabletop token studies (railway control room, N=37); VR graph use is an invented combination.
- Sources: https://cs.wellesley.edu/~oshaer/TUI_NOW.pdf ; https://doi.org/10.1145/3689050.3704938

### 24.3 Token board plus graph walker (combination)

- How: Tangible tokens define the computation; a gamepad or microgestures walk the results; haptics tick on high scorers.
- Origin and evidence: invented combination.

### 24.4 Hold-the-graph prop (doll's head)

- How: An off-hand object is the graph: rotate it to rotate the graph absolutely, move it toward the body to zoom; the dominant hand selects.
- Inputs: prop 6DoF pose, distance to head. Visual: graph or miniature riding on the prop.
- Good for: modeless rotation to break occlusion in 3D layouts.
- Origin and evidence: Hinckley et al., CHI 1994 (prototype, surgeon feedback); Guiard 1987.
- Sources: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/mmvrpaper.pdf ; https://www.lri.fr/~mbl/ENS/FONDIHM/2013/papers/Guiard-JMB87.pdf

### 24.5 Tangible sphere for a spherical layout

- How: A real ball is aligned with a graph laid out on a sphere; turn the ball, touch its surface to select.
- Inputs: ball pose, finger contact. Visual: nodes on and inside the ball.
- Good for: search, neighborhood inspection, overview without world edges.
- Origin and evidence: Englmeier et al., IEEE VR 2019 (lab study, small N: better graph-pattern perception with tangible interaction).
- Sources: https://www.mmi.ifi.lmu.de/pubdb/publications/pub/englmeier2019vr_2/englmeier2019vr_2.pdf

### 24.6 Everyday objects annexed as props

- How: Bind a mug, book or stapler on the desk to a parameter; twist or slide it.
- Inputs: object pose, contact. Visual: a dial ring and label drawn over the real object.
- Good for: persistent knobs for thresholds, k-core level, layout temperature.
- Origin and evidence: Hettiarachchi and Wigdor, CHI 2016; Simeone et al., CHI 2015 (prototypes, small studies).
- Sources: https://www.semanticscholar.org/paper/23990cbec53b8b1f22a2ad6ec8b582af32e34581 ; https://dl.acm.org/doi/10.1145/2702123.2702389

### 24.7 One prop, many nodes (haptic retargeting)

- How: Warp the hand or world so one real block is touched whenever any virtual node is grabbed.
- Inputs: hand tracking, gaze or reach prediction. Visual: ordinary graph; warp invisible up to about 40 degrees.
- Good for: solid-feeling grab, pin, drag, press-to-expand.
- Origin and evidence: Azmandian et al., CHI 2016; Cheng et al., Sparse Haptic Proxy, CHI 2017 (lab studies; gaze predicted touch 97.5 percent).
- Sources: https://www.researchgate.net/publication/301931572 ; https://dl.acm.org/doi/10.1145/3025453.3025753

### 24.8 Physical motif kit

- How: Build a small pattern with props or controller-placed points; the app finds and lights all matches.
- Inputs: 2-5 prop positions and drawn edges. Visual: user sculpture and matching subgraphs share a glow.
- Good for: motif / subgraph search.
- Origin and evidence: invented (hub-and-strut graph tangibles exist on tabletops); untested.
- Sources: https://cs.wellesley.edu/~oshaer/TUI_NOW.pdf

### 24.9 Physical graph print plus finger tracing

- How: A printed graph with AR overlays; the user traces paths with the fingers.
- Inputs: hand tracking on the object. Visual: the real model with highlights.
- Good for: path tracing, teaching.
- Origin and evidence: McGuffin, Servera, Forest, TVCG 2024 (lab N=12).
- Sources: https://doi.org/10.1109/tvcg.2023.3238989

### 24.10 Printed or 3D-printed overview map

- How: A registered paper layout or printed model on the desk acts as a touchable world-in-miniature; touching it flies the view.
- Inputs: fingertip or stylus position on the map. Visual: physical map with the viewpoint projected.
- Good for: orientation in very large graphs, a stable mental map, a meeting artifact.
- Origin and evidence: invented combination of WIM (Stoakley 1995) and data physicalization (Jansen et al., CHI 2015); untested.
- Sources: https://www.researchgate.net/publication/278688799

### 24.11 Paper bridge with printed codes

- How: Exported reports carry codes; pointing the headset or phone at a code jumps to that node or view.
- Inputs: camera code reading (phone relay), controller tap.
- Good for: carrying findings between meetings and the headset.
- Origin and evidence: invented; untested.

### 24.12 Tracked 6DoF stylus (pressure pen)

- How: A tracked pen (Logitech MX Ink on Quest, Muse on Vision Pro) gives a pressure tip on the desk, a precise pointer in the air, buttons and haptics; Touch Pro thumb-rest force adds a pressure pinch.
- Inputs: pen pose, tip and side pressure, buttons, force axes. Visual: ink strokes with width/glow by pressure, precise tip ray.
- Good for: lasso on the desk, sketching a path that snaps to the shortest path, handwriting search, annotation on a real desk, fuzzy selection strength.
- Origin and evidence: shipped hardware (Touch Pro 2022; MX Ink 2024, the first official third-party Quest tracked device, WebXR notes published; Muse for visionOS 26); Gesslein et al., ISMAR 2020 (pen plus VR spreadsheets); WebXR exposure of force axes unverified.
- Sources: https://developers.meta.com/vr/documentation/unity/unity-touch-pro-controllers/ ; https://www.uploadvr.com/logitech-mx-ink-for-meta-quest/ ; https://logitech.github.io/mxink/ ; https://www.roadtovr.com/vision-pro-psvr-2-controller-logitech-muse-visionos-26/ ; https://arxiv.org/pdf/2008.04543
- Merged from: "Pressure pinch and stylus tip", "Tracked 6DoF stylus".

### 24.13 Stylus pressure as an analog dial

- How: Tip on a node; pressure sweeps the neighborhood radius or a threshold; lifting commits.
- Inputs: tip pressure, button.
- Good for: watching influence spread hop by hop.
- Origin and evidence: invented on shipped hardware; untested.

### 24.14 6DoF desk puck (SpaceMouse)

- How: A CAD-style 6-axis cap flies the camera or graph while the other hand points.
- Inputs: 6 continuous axes, view buttons.
- Good for: seated, low-fatigue navigation; saved views.
- Origin and evidence: shipped desktop product; needs a desktop relay; not studied in WebXR.
- Sources: https://3dconnexion.com/us/product/spacemouse-pro/

### 24.15 Gamepad for seated analysis

- How: Sticks fly or orbit, the D-pad steps to a neighbor, triggers expand hops, buttons are verbs.
- Inputs: sticks, triggers, D-pad, buttons, rumble.
- Good for: node-by-node graph walking, path exploration.
- Origin and evidence: games; PS VR2 controllers on visionOS 26; Gamepad API inside Quest WebXR unverified.
- Sources: https://www.uploadvr.com/visionos-26-out-now-apple-vision-pro/

### 24.16 Dials and fader boxes (knobs, MIDI)

- How: Physical knobs and faders bound to parameters, with labels floating above them in VR.
- Inputs: continuous values, buttons.
- Good for: live tuning of layout forces, thresholds, style ranges, time scrubbing.
- Origin and evidence: shipped products in audio and lighting; graph-VR use invented; WebMIDI in Quest Browser unconfirmed.

### 24.17 Cockpit / mixer desk (virtual)

- How: A console of virtual knobs, faders and switches grabbed and twisted like real ones. Twist: faders bound to attributes filter live, two at once with two hands.
- Inputs: grip or pinch plus wrist rotation or slide. Visual: a desk in front of a seated user.
- Good for: layout forces, thresholds, filter ranges, resolution.
- Origin and evidence: shipped (Microsoft Flight Simulator VR, Tribe XR); forums report imprecise hand-tracked knobs.
- Sources: https://flyawaysimulation.com/ask/answers/vr-hand-tracking-msfs-2024/ ; https://www.tribexr.com/vr

### 24.18 Active force props: weight and encounter

- How: A wrist device swings a handle into the palm and renders weight; robots place real surfaces where nodes are.
- Good for: subgraph weight by node count; a touchable force layout.
- Origin and evidence: research prototypes (Haptic PIVOT, UIST 2020, N=12; Snake Charmer, TEI 2016; HapticBots, UIST 2021); speculative.
- Sources: https://www.microsoft.com/en-us/research/publication/haptic-pivot-on-demand-handhelds-in-vr/ ; https://www.dgp.toronto.edu/~karan/papers/p218-araujo.pdf ; https://arxiv.org/pdf/2108.10829

### 24.19 Phone palette in the off hand, stylus in the main hand (combination)

- How: The phone is held as a real-glass palette (algorithms, swatches, table); a stylus picks nodes and drops palette items on them.
- Good for: a physical-glass take on the Tilt Brush off-hand palette.
- Origin and evidence: invented combination; Tilt Brush off-hand palette is the shipped precedent.
- Sources: https://blog.hamaluik.ca/posts/vr-ux-case-study-tilt-brush/

### 24.20 Headset camera as a sensor (read sketches, whiteboards and printouts)

- How: Passthrough camera access lets the headset read the room: draw a small graph or motif on paper or a whiteboard and it becomes a query or a new graph, or point at a printed table or label to load or search it. Differs from 24.11, which needs printed codes and a phone relay.
- Inputs: headset RGB camera with image or sketch recognition. Visual: recognized strokes overlaid on the paper.
- Good for: motif search by sketch, importing data on paper, collaboration at a whiteboard.
- Origin and evidence: shipped APIs (WebXR Raw Camera Access in Chrome Android, origin trial; Meta Passthrough Camera API, native); the interaction is invented.
- Sources: https://immersive-web.github.io/raw-camera-access/ ; https://developers.meta.com/horizon/documentation/unity/unity-pca-overview/

### 24.21 Grounded desktop force-feedback arm (Haply Inverse3, 3D Systems Touch)

- How: A desk-mounted haptic arm with a stylus or handle gives precise 3-DoF or 6-DoF position input and pushes back with real, continuous force. The analyst probes the graph with it: they feel edge tension and the attraction of the force layout, a pull toward high-centrality nodes ('snap to important'), the stiffness of k-core shells, and the resistance of a min-cut. Unlike the gloves (15.11), which give vibration or finger-level force, this is grounded, high-fidelity and continuous, and it pairs with seated desk VR (23.1).
- Inputs: 6-DoF stylus pose and buttons in; 3-DoF force out, through WebHID or a local bridge such as Haply's WebSocket SDK, because WebXR does not expose it. Visual: a virtual pen tip in the graph, plus a force vector or spring glyph while in contact.
- Good for: feeling a weighted graph's structure, precise node placement and pinning in the force layout with real force, checking flow capacity by force, analysis without sight (pairs with 29.17).
- Origin and evidence: shipped hardware (Haply Inverse3 2023; Geomagic/3D Systems Touch); haptic graph exploration for blind users, Yu, Brewster et al. (lab studies, small N). Weak for graphty: needs a desk device and a non-WebXR bridge.
- Sources: https://www.haply.co/inverse3 ; https://www.3dsystems.com/haptics-devices/touch ; https://doi.org/10.1145/354324.354340

---

## 25. Multi-device and cross-device

### 25.1 Phone or tablet as a tracked touch surface

- How: The user's own phone (or a tablet), with its pose tracked, appears in VR as a virtual device showing app-chosen UI, with virtual content around its edges; touch gives precise scrolling and typing with real haptics.
- Inputs: touch, swipe, phone rotation and pose, vibration. Visual: a floating phone in hand showing a compact panel.
- Good for: forms, long node lists, results tables, long dropdowns, minimap, layout picker, search typing.
- Origin and evidence: PhoneInVR, CHI 2024 (lab: holding a real phone was fastest and most accurate); Phonetroller, CHI 2021; Dias et al., AVI 2018; PAIR, VRST 2021; Gesslein et al., ISMAR 2020; Biener et al., TVCG 2020; UIST 2023 (lab studies).
- Sources: https://doi.org/10.1145/3613904.3642582 ; https://dl.acm.org/doi/10.1145/3411764.3445583 ; https://dl.acm.org/doi/pdf/10.1145/3206505.3206526 ; https://dl.acm.org/doi/10.1145/3489849.3489878 ; https://arxiv.org/pdf/2008.04543 ; https://arxiv.org/pdf/2008.04559
- Merged from: "C5 Real tablet or phone seen in VR", "Phone as tracked touch panel", "Phone as tracked touch controller".

### 25.2 Phone as untracked companion screen

- How: The phone joins the session by URL or code, runs the same session, mirrors the VR selection, and hosts the 2D half of the app (tables, catalog, charts, settings); its keyboard and dictation handle text.
- Inputs: full phone touch UI, keyboard, dictation.
- Good for: moving form-like tasks out of 3D.
- Origin and evidence: Zhu and Grossman, BISHARE, CHI 2020 (lab N=12); shipped in games (Wii U, Jackbox).
- Sources: https://www.researchgate.net/publication/341694367
- Merged from: "Phone as untracked companion screen", "F5 Phone as synced detail window".

### 25.3 Spatially aware tablet beside the 3D graph

- How: A tracked tablet shows linked 2D views; pointing it filters, brushing on it highlights in 3D.
- Inputs: tablet pose, touch, pen.
- Good for: linked brushing between algorithm numbers and topology.
- Origin and evidence: Hubenschmid et al., STREAM, CHI 2021 (lab study, open source).
- Sources: https://dl.acm.org/doi/10.1145/3411764.3445298 ; https://github.com/hcigroupkonstanz/STREAM

### 25.4 Desktop plus headset in one session (split reality)

- How: The same graph is open in the desktop app and in the headset with shared selection, styles and camera. In passthrough the real monitor runs the graphty app and a linked 3D graph floats beside it or grows out of it; dragging from the 2D window promotes items into 3D. Dense 2D UI stays 2D; the headset is used for spatial moments.
- Inputs: mouse and keyboard plus headset inputs and hands. Visual: a 3D graph beside a real or virtual monitor.
- Good for: the realistic analyst adoption path.
- Origin and evidence: shipped (Mac Virtual Display on Vision Pro, Quest Remote Desktop); DeskVR, HybridAxes (research); the linked combination is near-invented.
- Sources: https://support.apple.com/guide/apple-vision-pro/use-mac-virtual-display-tan357ede966/visionos ; https://www.researchgate.net/publication/366312286_HybridAxes_An_Immersive_Analytics_Tool_With_Interoperability_Between_2D_and_Immersive_Reality_Modes
- Merged from: "Desktop app beside the headset (cross-reality)", "Desktop plus headset in one session", "F7 Split-reality 2D/3D shared selection".

### 25.5 Asymmetric partner outside VR (co-pilot on a screen)

- How: The headset user explores; a colleague on a laptop, tablet or phone has the tables and panels, selects, runs algorithms and drops markers that appear as beacons in VR; they must talk. Solo variant: your own phone as the text and search "manual".
- Inputs: each person's device; voice.
- Good for: guided exploration, teaching, experts who will not wear a headset.
- Origin and evidence: Gugenheimer et al., ShareVR, CHI 2017 (lab N=16); shipped asymmetric games (Keep Talking and Nobody Explodes); asymmetric VR subgenre taxonomy, MDPI MTI 2024.
- Sources: https://www.researchgate.net/publication/316708890 ; https://voicesofvr.com/98-ben-kane-on-designing-keep-talking-and-nobody-explodes/ ; https://www.mdpi.com/2414-4088/8/2/12
- Merged from: "Asymmetric co-pilot on a screen", "Asymmetric partner outside VR".

### 25.6 Smartwatch as wrist controller

- How: The watch shows context and takes touch; the crown scrubs values; IMU and haptic taps.
- Inputs: touch, crown, buttons, IMU.
- Good for: k-hop depth on the crown, confirm/cancel, private notifications.
- Origin and evidence: Computers and Graphics 2023 (lab study N=20: touchscreen preferred over gestures).
- Sources: https://www.sciencedirect.com/science/article/abs/pii/S0097849323002479

### 25.7 Hands and controllers at the same time (one controller, one bare hand)

- How: The dominant hand holds a controller for a precise ray, trigger and haptics, while the bare off hand uses palm menus, microgestures or direct grabs. The user can set the controller down and keep working by hand with no mode switch.
- Inputs: concurrent controller and hand-tracking input sources. Visual: controller ray on one side, hand UI on the other.
- Good for: precise selection combined with fast hand menus; picking up and putting down tools at a desk.
- Origin and evidence: shipped natively (Meta "Multimodal", concurrent hands and controllers); WebXR support is uncertain and must be checked.
- Sources: https://developers.meta.com/horizon/documentation/unity/unity-multimodal/

### 25.8 Display smart glasses as a lightweight second device

- How: Everyday display glasses with a small heads-up screen and their own input (EMG band, temple touchpad, voice) act as a low-commitment companion to the headset session: watching long algorithm jobs, alerts from a shared session, spoken notes onto bookmarked nodes, passing a selection into the headset later. The catalog's companions are phone, tablet, desktop or watch only.
- Inputs: glasses HUD, EMG wristband or temple touch, voice. Visual: single-line glanceable heads-up card.
- Good for: monitoring and light triage between headset sessions; keeping an analysis going away from the desk.
- Origin and evidence: shipped devices (Meta Ray-Ban Display with Neural Band, Android XR glasses, 2025); graph use invented. URLs not verified online.
- Sources: https://www.meta.com/ai-glasses/meta-ray-ban-display/ ; https://www.android.com/xr/

### 25.9 Directed spectator camera for a flat-screen audience

- How: A one-to-many broadcast of the VR session to a TV, video call or web link without viewers joining. A virtual director camera (smoothed, never head-locked, third person, showing the analyst's avatar beside the graph) frames what matters: cuts to the node under discussion, overlays the current result and a caption. The headset user can place or hand off cameras. Differs from 25.5 (interactive partner) and 28.4 (viewers in VR): the audience is passive and large.
- Inputs: camera placement gesture; auto-director following selection and voice; viewer link. Visual: stable cinematic third-person view with captions for viewers; small camera objects and a 'live' indicator in VR.
- Good for: stakeholder briefings, conference demos, teaching a room with one headset; avoids nauseating raw head-mounted mirroring.
- Origin and evidence: shipped (Meta Quest casting; LIV spectator capture, Meta's supported third-person tool); graph-aware auto-direction invented.
- Sources: https://developers.meta.com/horizon/documentation/unity/unity-spectator-camera/ ; https://www.uploadvr.com/meta-is-deprecating-quest-mrc-capture-tool-and-officially-supporting-liv-instead/

### 25.10 Earbuds as a minimal remote (stem press, ear-touch, earable head-gesture IMU)

- How: Paired earbuds act as an always-worn clicker that needs no hand. A stem press or squeeze is push-to-talk or confirm, a double-press is undo, and the earbuds' own IMU head gestures (nod or shake, as AirPods ship for answering calls) are yes or no for agent suggestions. Unlike 7.11 (head gestures from the headset's tracking) and 5.13 (the headset shell), the earbuds are a separate device worn the same way across headset, phone and desktop sessions.
- Inputs: Bluetooth media keys received as key or Media Session events in the browser; earbud head-gesture IMU through the companion platform. Visual: none required; a small earbud glyph confirms each press.
- Good for: push-to-talk for voice (16.1) with both hands busy, quick accept or reject of agent beacons (18.8), a presenter clicker for tours.
- Origin and evidence: shipped (AirPods head gestures in iOS 18; earbud stem controls); graphty use invented. Whether a WebXR immersive session receives media keys is unverified, so feasibility is weak.
- Sources: https://support.apple.com/en-us/120434 ; https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API

---

## 26. Body, eye and brain sensing

### 26.1 Foot pedals and foot taps

- How: Pedals as modifiers, mode switches, undo, analog scrub.
- Inputs: 1-3 binary or analog pedals.
- Good for: keeping both hands on the graph; a clutch for move-world vs move-node.
- Origin and evidence: Velloso et al., ACM CSUR 2015 (survey); VR foot text entry, CHI 2024 (lab).
- Sources: https://www.researchgate.net/publication/282483383 ; https://dl.acm.org/doi/10.1145/3613904.3642757

### 26.2 Gaze trail as analysis memory

- How: Record which nodes were looked at and offer coverage back (uninspected nodes, attention trail).
- Good for: auditing coverage; analyst handoff.
- Origin and evidence: invented; speculative on the web (no continuous gaze; head-dwell proxy possible).
- Sources: https://arxiv.org/html/2508.12268v2

### 26.3 Flicker-tag SSVEP BCI selection

- How: Candidates flicker at distinct frequencies; EEG detects which is attended.
- Good for: hands-free choice among a few nodes or menu items; accessibility.
- Origin and evidence: shipped then discontinued dev kit (NextMind, acquired by Snap 2022); speculative.
- Sources: https://www.uploadvr.com/snap-nextmind-bci-ar-glasses/

### 26.4 Passive biosensing adapts detail

- How: A workload estimate from EEG/EMG/EDA/eyes triggers simplification (fewer labels, collapsed communities).
- Good for: managing visual overload.
- Origin and evidence: research hardware (OpenBCI Galea, shipping to researchers since 2024); speculative.
- Sources: https://openbci.com/community/introducing-galea-bci-hmd-biosensing/

### 26.5 Lean in for detail

- How: Head distance drives level of detail: summaries from afar, then labels, then values.
- Inputs: head distance and orientation. Visual: detail fading in as you approach.
- Good for: label clutter control with no settings.
- Origin and evidence: invented as a primary control; root in proxemic interaction (Ballendat 2010).
- Sources: https://dl.acm.org/doi/10.1145/1936652.1936676

### 26.6 Immersion dial

- How: One continuous control goes from passthrough to full immersion.
- Inputs: Digital Crown, or a thumbstick or wrist twist. Visual: a growing portal edge.
- Good for: switching between desk work and deep exploration.
- Origin and evidence: shipped (visionOS progressive immersion).
- Sources: https://developer.apple.com/videos/play/wwdc2024/10153/

### 26.7 Stillness reveals

- How: While moving, only shape and color show; holding still fades in labels, numbers, minor edges and annotations over about two seconds by relevance; any motion clears them.
- Inputs: head and hand velocity, time. Visual: a sparse graph that develops detail when you stop.
- Good for: reading results without toggling labels.
- Origin and evidence: invented (photographic development; dwell per Jacob, ACM TOIS 1991; no direct evidence for stillness-driven detail).
- Sources: https://doi.org/10.1145/123078.128728

### 26.8 Smooth-pursuit eye selection (follow the moving target)

- How: Candidate nodes or menu items each move along a different small path; the system picks the one whose motion the eyes follow. No calibration or dwell, and it resolves overlapping nodes a gaze point cannot tell apart. Graph twist: shake an ambiguous cluster so each node orbits on its own path, then pick by following one.
- Inputs: continuous eye tracking. Visual: small orbiting markers on the candidate nodes.
- Good for: choosing between nodes in dense or occluded clusters, hands-free confirmation.
- Origin and evidence: Vidal, Bulling, Gellersen, "Pursuits", UbiComp 2013 (lab study); Esteves et al., "Orbits", UIST 2015 (lab study); Khamis et al., "VRpursuits", MUM 2018 (lab study). Web feasibility is low: WebXR exposes no continuous gaze (Vision Pro reports gaze only at the moment of the pinch).
- Sources: https://dl.acm.org/doi/10.1145/2493432.2493477 ; https://dl.acm.org/doi/10.1145/2807442.2807499

### 26.9 Facial-expression input

- How: Headset face tracking reads brow raise, smile, jaw open or a cheek puff and maps them to a few commands (a modifier, confirm, "show me more"). It could also feed a passive frown-means-confused signal to the assistant.
- Inputs: face-tracking blendshapes (Quest Pro and later). Visual: none, or a small indicator when a mapped expression is recognized.
- Good for: a hands-free modifier while both hands manipulate the graph; accessibility.
- Origin and evidence: shipped sensor (Meta Movement SDK face tracking, native only, not in WebXR); the interaction use is a research prototype or opinion, weak evidence.
- Sources: https://developers.meta.com/horizon/documentation/unity/move-face-tracking/

### 26.10 Deliberate eye gestures and winks as commands

- How: Short deliberate eye strokes (left-right-left, glance at a corner and back) or a one-eye wink fire a command (confirm, undo, expand neighbors) while both hands stay on the graph. In the catalog a blink is only a scanning switch (29.2), not a command vocabulary.
- Inputs: eye tracking or eye-openness blendshapes (native face and eye tracking; not in WebXR). Visual: small confirmation glyph on recognition.
- Good for: hands-busy modifiers and confirm; accessibility.
- Origin and evidence: Drewes and Schmidt, Interacting with the computer using gaze gestures, INTERACT 2007 (lab study; weak to moderate evidence for VR use).
- Sources: https://link.springer.com/chapter/10.1007/978-3-540-74800-7_43

### 26.11 Full-body pose as input (arms, torso, crouch, body trackers)

- How: Whole-body poses and motions become commands or continuous controls: spreading both arms wide expands the selection's neighborhood, crouching lowers a filter threshold or drops to a lower layer of a stack, turning the torso with the head still cycles views; body trackers can carry tools on elbows or knees. The catalog covers hand poses (7.4), head gestures (7.11), feet (26.1, 23.6) and leaning (26.5), not the whole body.
- Inputs: headset body tracking (Meta Movement SDK, native), extra trackers (SlimeVR, Vive), or the draft WebXR body tracking module. Visual: optional body-silhouette echo of the recognized pose.
- Good for: large expressive parameters while standing, room-scale analysis, embodied presentation.
- Origin and evidence: shipped sensors (Meta body tracking); WebXR body-tracking draft; the interaction use is invented (no evidence).
- Sources: https://immersive-web.github.io/body-tracking/ ; https://developers.meta.com/horizon/documentation/unity/move-body-tracking/

### 26.12 Active brain-computer input: motor imagery, P300 and a consumer EEG headband

- How: The user selects or commands by intent, not by gaze-locked flicker (26.3) and not by passive workload (26.4). With P300, candidate nodes or menu items flash in sequence and the attended one is picked. With motor imagery, imagined left-hand or right-hand movement steps a two-way choice (expand or collapse, next or previous neighbor). With an EEG-integrated headset (OpenBCI Galea) or a consumer headband (Muse), an 'intent to select' signal confirms a gaze-picked target with no hand movement.
- Inputs: an EEG headband or EEG-integrated face gasket, through Web Bluetooth (Muse) or a local bridge. Visual: sequential flash highlights for P300; a confidence bar filling toward a confirm.
- Good for: hands-free and voice-free confirmation for users with severe motor impairment; a research prototype of 'think to confirm' over gaze selection.
- Origin and evidence: lab studies and shipped research hardware (OpenBCI Galea; Neurable). Accuracy is low and selection slow (P300 takes seconds per pick). Accessibility and research option only.
- Sources: https://galea.co/ ; https://www.neurable.com/ ; https://doi.org/10.3389/fnhum.2020.00010

---

## 27. History, saving, provenance and collaboration

### 27.1 Ariadne's thread (breadcrumb spool)

- How: A yarn or glowing thread from a belt spool is laid along the edges the reader travels. Tug or pull it to rewind the camera, selection and filters to the previous node; snip or cut it to drop history or branch a new line of inquiry; tie two points to ask for the shortest path; pin it or wind the ball to save the walk as a replayable story.
- Inputs: automatic recording, grab, tug, pinch, back button, voice. Visual: yarn on the visited edges, branch strands, a ball that grows with the trail.
- Good for: history, back navigation, undo, path queries, saved walks, presenting findings, keeping the reader oriented.
- Origin and evidence: invented; GraphTrail, Dunne et al., CHI 2012.
- Sources: https://doi.org/10.1145/2207676.2208293
- Merged from: "Breadcrumb thread spool", "Ariadne's thread".

### 27.2 Walkable branching analysis trail (spatial history breadcrumbs)

- How: Every user and agent action is recorded as a tree of thumbnail snapshot windows left in space, colored by actor; grab one to restore that state; the agent summarizes branches.
- Inputs: automatic; grab; voice. Visual: a miniature thumbnail tree.
- Good for: undoing agent actions, comparing inquiries, reproducibility.
- Origin and evidence: researched (provenance trees, Graphologue); spatial form invented.
- Sources: https://arxiv.org/abs/2608.14869 ; https://arxiv.org/abs/2305.11483 ; https://hci.ucsd.edu/papers/graphologue.pdf
- Merged from: "Walkable branching analysis trail", "F6 Spatial history breadcrumbs".

### 27.3 Ghost of your past self

- How: Sessions record head, hands and actions; summon a past self's or colleague's ghost that replays the exploration; follow, overtake, pause and branch; a shared tour is a ghost; multiple ghosts reveal unexplored areas.
- Inputs: summon, pause, scrub. Visual: translucent avatars with trails.
- Good for: provenance, reporting, collaboration, resuming.
- Origin and evidence: invented; ghost pattern shipped in racing games; Ragan et al., IEEE TVCG 2016 (provenance).
- Sources: https://en.wikipedia.org/wiki/Ghost_(video_games) ; https://doi.org/10.1109/TVCG.2015.2467551

### 27.4 Instant replay and ghosts

- How: Replay the last action as a translucent rerun. Twist: ghost trails of node positions before a layout or filter change.
- Inputs: replay button. Visual: ghost rerun.
- Good for: undo as visible rewind; provenance.
- Origin and evidence: shipped (Walkabout Mini Golf).
- Sources: https://steamcommunity.com/app/1408230/announcements/

### 27.5 Hourglass history

- How: Each action drops a colored grain into an hourglass; flip and tilt it to rewind live; pick a grain to inspect or remove that step; snap the glass off its stand to save a checkpoint.
- Inputs: rotate/tilt, pick grain, snap off. Visual: grains colored by action type.
- Good for: undo, scrubbing history, checkpoints.
- Origin and evidence: invented.

### 27.6 Wind the clock back

- How: A palm-up counterclockwise wrist roll rewinds the graph's history as continuous motion with ghost trails; release to stay; branching keeps the old future as a grabbable ghost branch.
- Inputs: wrist roll, release. Visual: graph animating backward with ghost states.
- Good for: undo/redo, comparing states, recovering views.
- Origin and evidence: invented; shipped rewind in Braid; Dragicevic et al., CHI 2008 (lab N=16, direct-manipulation video scrubbing).
- Sources: https://en.wikipedia.org/wiki/Braid_(video_game) ; https://doi.org/10.1145/1357054.1357096

### 27.7 State crystals

- How: A two-hand squeeze crystallizes the current state into a miniature gem; a pedestal restores it; knocking two crystals together makes a diff crystal; throwing one at an outbox exports.
- Inputs: squeeze, place, collide, throw. Visual: gem miniatures of graph states.
- Good for: save, bookmark, compare, export.
- Origin and evidence: invented; tangible bits (Ishii and Ullmer, CHI 1997, vision paper).
- Sources: https://doi.org/10.1145/258549.258715

### 27.8 In-world camera as bookmark

- How: A physical camera from the backpack produces prints you carry and reuse; spectator cameras lock to a spot or avatar. Twist: each print stores the full view state and stepping into it restores it.
- Inputs: grab, frame, trigger. Visual: Polaroid prints.
- Good for: saving views and exporting images.
- Origin and evidence: shipped (Vacation Simulator, Walkabout CocoVision).
- Sources: https://jobsimulator.fandom.com/wiki/Vacation_Simulator ; https://steamcommunity.com/app/1408230/announcements/

### 27.9 Crew stations

- How: Players each own a console role; a captain coordinates and can take over empty stations. Twist: a solo user turns the chair to switch station, a spatial mode switch.
- Inputs: station consoles, voice. Visual: bridge with a shared main viewer.
- Good for: shared analysis roles.
- Origin and evidence: shipped (Star Trek: Bridge Crew); designer write-up.
- Sources: https://www.gamedeveloper.com/design/fostering-vr-teamwork-in-4-player-i-star-trek-bridge-crew-i-

### 27.10 Guided tour with mapped physical props

- How: An authored path through scenes, with real props mapped to virtual ones (passive haptics). Twist: anchor the graph table to the user's real desk through passthrough for a physical touch stop.
- Inputs: walking, props. Visual: a curated sequence.
- Good for: presenting findings to non-experts.
- Origin and evidence: shipped attraction (The VOID / ILMxLAB, Star Wars: Secrets of the Empire); press.
- Sources: https://www.uploadvr.com/star-wars-secrets-empire-incredible-clunky-vr-adventure-void/

### 27.11 Read-wear trails: cumulative traces of where everyone has been

- How: Every visit, selection, expansion and dwell by every past user of a shared graph is aggregated anonymously into a persistent wear layer. Well-traveled edges look worn like a footpath, nodes many people inspected look polished, and nodes nobody opened stay pristine. A newcomer can follow the beaten path to known findings or go where nobody has been. Filter by team, role or time window. Unlike 28.9 (one live group's coverage) and 27.3 (replaying individual sessions), this is the long-term crowd trace with no individual identity.
- Inputs: passive logging; a toggle and filter on the wear layer; 'take me to the least visited community' by voice or menu. Visual: edge thickness or worn texture for traffic, a patina on nodes, untouched regions crisp and new.
- Good for: onboarding to a graph a team has worked on for months, audits ('nobody ever looked at this cluster'), finding blind spots, organizational memory.
- Origin and evidence: Hill, Hollan, Wroblewski, McCandless, 'Edit wear and read wear', CHI 1992 (prototype); Wexelblat and Maes, 'Footprints', CHI 1999 (prototype, small user study). Graph and VR form invented; no VR study.
- Sources: https://doi.org/10.1145/142750.142751 ; https://doi.org/10.1145/302979.303060

---

## 28. Collaboration and shared sessions

### 28.1 Remote shared graph session with avatars (distributed, mixed presence)

- How: Two or more people in different places join one live graph session, each an avatar (head, hands and ray) beside the same graph, with spatial voice. Selections, filters and algorithm runs sync. Mixed presence: a colocated group plus remote avatars. 23.9 covers only people in the same room.
- Inputs: each user's own headset input; spatial voice; session link or invite. Visual: avatars around the graph; per-user colored rays and selections; voice from where each avatar stands.
- Good for: distributed teams analyzing together, remote review of findings, teaching across sites.
- Origin and evidence: shipped (Horizon Workrooms, Spatial, Arkio, Mozilla Hubs); Cordeil et al., IEEE TVCG 2017 (lab study, about 16 pairs doing network-connectivity tasks: HMD pairs did as well as CAVE pairs).
- Sources: https://about.fb.com/news/2021/08/introducing-horizon-workrooms-remote-collaboration-reimagined/ ; https://hubs.mozilla.com/docs/welcome.html ; https://doi.org/10.1109/TVCG.2016.2599107

### 28.2 Subjective views: one shared graph, per-user styling, filters and labels

- How: Everyone sees the same nodes in the same places, so pointing and talking still work, but each person can apply a private style layer, filter, label set or algorithm overlay, then promote it to everyone with a gesture. A public/private toggle on every layer and lens; the same mechanism can redact sensitive attributes for some viewers.
- Inputs: per-layer share toggle; "show everyone" gesture or voice. Visual: private overlays drawn differently (for example dashed outlines); a badge shows which layers others can see.
- Good for: comparing centrality measures side by side without fighting over the shared style; an expert and a novice reading the same graph differently; data-permission differences.
- Origin and evidence: Agrawala et al., two-user Responsive Workbench, SIGGRAPH 1997 (prototype); Smith and Mariani, subjective views, 1997 (prototype); FIESTA, Lee et al., IEEE TVCG 2021 (lab study, 30 participants in groups: people built private workspaces, then brought work into shared space).
- Sources: https://doi.org/10.1145/258734.258875 ; https://doi.org/10.1109/TVCG.2020.3030450

### 28.3 Collaborator awareness cues: gaze rays, view frustums, hand sharing

- How: Show where each collaborator is looking and what they can see: a faint gaze ray or cone, their view frustum drawn on the graph, the node under their gaze glowing in their color, and off-screen arrows toward a colleague's focus. A "look where I am looking" button snaps your view to theirs.
- Inputs: each user's eye or head tracking; toggle; snap-to-view button. Visual: colored cones or rays and gaze dots on nodes; edge-of-view arrows toward collaborators.
- Good for: resolving "this node" and "that cluster" in conversation, which is hard in a dense 3D hairball; knowing who is looking at what.
- Origin and evidence: Brennan et al., Cognition 2008 (lab study: shared gaze sped up collaborative search); Piumsomboon et al., CoVAR, SIGGRAPH Asia 2017 (prototype); Bai et al., CHI 2020 (lab study, gaze plus gesture sharing in MR remote collaboration).
- Sources: https://doi.org/10.1016/j.cognition.2007.05.005 ; https://doi.org/10.1145/3313831.3376550

### 28.4 Live presenter controls: follow me, gather, laser broadcast, audience mode

- How: A presenter can tether viewers' cameras to theirs (follow me, with comfort-safe easing), gather everyone to one node, broadcast a laser pointer, lock or unlock audience interaction, and let viewers raise a hand or react on a node. Viewers can break away and snap back. 27.10 and 18.3 are authored or agent-narrated tours; this is a person leading live.
- Inputs: presenter buttons or voice ("everyone, come here"); viewer break-away and return; hand-raise gesture. Visual: a presenter badge; a "following" indicator; reaction icons on nodes.
- Good for: stakeholder briefings, teaching graph concepts, walking a team through a finding.
- Origin and evidence: shipped (ENGAGE and Mozilla Hubs presenter and follow tools; Spatial presentation mode). No graph-specific study.
- Sources: https://engagevr.io/ ; https://hubs.mozilla.com/docs/welcome.html

### 28.5 Multiscale collaboration: a giant guide and an ant-scale explorer

- How: Two users work at different scales at once. The guide stands over the graph as a giant or holds a miniature of it, drops markers, draws paths and moves the other person; the explorer is immersed at node scale and reports what the neighborhood looks like. The guide's head and hands appear to the explorer as a small "mini-me" avatar. Distinct from 3.7 (one user switching scale) and 25.5 (partner outside VR).
- Inputs: both users' VR input; the guide also uses WIM-style picking. Visual: the explorer sees a giant hand or mini avatar of the guide; the guide sees the explorer as a tiny figure in the graph.
- Good for: combining the overview with local reading of an ego network; teaching; spotting someone lost in a big graph.
- Origin and evidence: Piumsomboon et al., Mini-Me, CHI 2018 (lab study); Piumsomboon et al., Snow Dome, CHI 2018 extended abstract (prototype).
- Sources: https://doi.org/10.1145/3173574.3173620

### 28.6 Fork-and-merge personal copies with group voting

- How: Any participant pulls a personal copy of the shared graph (or a subgraph) out beside them to try a layout, filter or community setting without disturbing others. Copies can be placed side by side, compared, then merged back or adopted. The group puts votes on competing copies, hypothesis cards or nodes, and the decision is recorded in history. 27.2 branching is single-user history only.
- Inputs: pull-out gesture to fork; place side by side; push-in to merge; vote tokens. Visual: smaller graph copies around the main one in each owner's color; vote dots.
- Good for: divergent-then-convergent group analysis; settling which community result or layout to keep.
- Origin and evidence: invented for VR graphs; dot voting ships in Miro and Mural; FIESTA (lab study) saw people make personal copies and comparison views.
- Sources: https://doi.org/10.1109/TVCG.2020.3030450 ; https://miro.com/

### 28.7 Floor control, ownership locks and hand-to-hand passing of objects

- How: Concurrency made social and visible. A node or subgraph someone is dragging glows in their color and resists others; two-person grabs blend (co-manipulation). Global operations (re-layout, a whole-graph algorithm, a filter for everyone) need the "baton", a talking-stick object passed hand to hand. Analysis objects (lenses, selection crystals, cartridges, result cards) can be handed physically to a colleague, which transfers them.
- Inputs: grab; hand-over by bringing hands together; baton request gesture. Visual: owner-colored glow on held items; the baton in someone's hand; a brief tug animation on conflicts.
- Good for: preventing one person's re-layout from wrecking everyone's mental map; making shared tools feel physical.
- Origin and evidence: Pinho, Bowman, Freitas, cooperative object manipulation, VRST 2002 (lab study); Scott, Carpendale, Inkpen, territoriality on tabletops, CSCW 2004 (observational study); turn-taking tokens are common facilitation practice. The baton for global graph operations is invented.
- Sources: https://doi.org/10.1145/585740.585768 ; https://doi.org/10.1145/1031607.1031655

### 28.8 Asynchronous review threads anchored in the graph

- How: A colleague leaves comment threads (voice, text or a recorded gesture) pinned to nodes, paths, clusters or saved views, and can mention a person. On entering the session, a "what changed since you were here" overlay highlights their edits and open threads; you reply in place and mark threads resolved. 16.12 is a single spoken note and 27.3 replays a whole session; this is the review workflow with replies, status and a change diff.
- Inputs: pin gesture; voice or keyboard reply; resolve tap. Visual: thread markers on nodes, open threads colored and resolved ones grayed; a change-since overlay.
- Good for: teams in different time zones; review and sign-off on an analysis; handoff.
- Origin and evidence: shipped in 2D tools (Figma and Google Docs comments); VR comment pins ship in Arkio and Gravity Sketch collaboration; the graph-anchored form is near-invented.
- Sources: https://help.figma.com/hc/en-us/articles/360039825734 ; https://www.arkio.is/

### 28.9 Group coverage map and divide-the-graph work split

- How: The group splits a large graph into territories (community, region or attribute range), each tinted in its owner's color with a fill meter showing how much has been inspected. A shared overlay shows which nodes and communities anyone has looked at, selected or run an algorithm on, so gaps and duplicated effort show. Others' searches and brushes appear as faint 'already looked here' marks that never override your own selection. 26.2 and 27.3 are single-user or replay-only; 28.7 uses territoriality only for locks.
- Inputs: assign-territory gesture or voice ('I take the blue community'); automatic logging of views, selections and runs; overlay toggle. Visual: owner-colored hulls, desaturated unvisited nodes, faint per-user search marks, a coverage gauge per territory.
- Good for: large graphs explored by a team; audit and due diligence ('did anyone check this cluster?'); supporting both loose and tight collaboration.
- Origin and evidence: Isenberg and Fisher, Cambiera, EuroVis 2009 (lab study, pairs); Tang et al., CHI 2006 (two observational studies of pairs: coupling shifts); HeedVision, arXiv 2025 (immersive attention awareness, prototype). Group coverage for VR graphs not found.
- Sources: https://www.microsoft.com/en-us/research/publication/collaborative-brushing-and-linking-for-co-located-visual-analytics-of-document-collections/ ; https://dl.acm.org/doi/10.1145/1124772.1124950 ; https://arxiv.org/pdf/2505.07069

### 28.10 Breakout huddles: sub-groups split off with audio zones and reconvene

- How: A larger session (class, review meeting) splits into small huddles, each around its own forked copy or region of the graph inside an audio zone so its talk does not reach the others. A facilitator sees all huddles as small tables from above, can drop in, and calls everyone back; each huddle's result returns to the main graph as a card or layer to compare. Differs from 28.6 (individual forks) and 28.1 (one shared room).
- Inputs: facilitator 'split into N' or dragging people into huddles; walk into a zone to join; recall command. Visual: ring of huddle tables around the main graph, sound-muffling zone boundaries, returned result cards in huddle colors.
- Good for: teaching (each group analyzes a different community or algorithm), workshops, parallel hypothesis testing.
- Origin and evidence: shipped in social VR and meetings (Mozilla Hubs audio zones, Zoom breakout rooms); forked graph regions invented. No graph-specific study.
- Sources: https://github.com/mozilla/hubs/pull/4399 ; https://hacks.mozilla.org/2019/09/exploring-collaboration-and-communication-with-mozilla-hubs/

### 28.11 Participants become nodes (live action sociogram)

- How: In a shared session each participant takes on a node: their avatar stands on it and carries its attributes. Flow, diffusion or a random walk is acted out by passing a token hand to hand along real edges; centrality is felt as how many hands reach you; a cut is people stepping apart. In reverse, the team's own conversation (who talks to whom) is drawn live as a graph they stand in.
- Inputs: claim-a-node gesture; hand-to-hand token passing; walking. Visual: avatars tinted by node attributes, edges between people, a token moving between hands.
- Good for: teaching graph concepts (degree, betweenness, contagion, bottlenecks) to non-experts; workshops; letting a small social network be felt by its members.
- Origin and evidence: Moreno's action sociometry (1930s practitioner method); VR graph form invented. No controlled study for learning graph concepts.
- Sources: https://en.wikipedia.org/wiki/Sociometry ; https://link.springer.com/chapter/10.1007/978-981-33-6342-7_11

### 28.12 Pass-the-headset handoff with a guest profile

- How: A team with one headset passes it around. Analysis state stays put; the outgoing wearer moves to the desktop app (25.4) and keeps control there; the incoming wearer gets their own fit and input profile (handedness, reach, comfort, hands or controllers) and a 10-second orientation that flies them to what the previous wearer was looking at, with that person's pointer and voice relayed from the desk. Actions are attributed to the new person in history.
- Inputs: 'hand over' command; guest sign-in on the headset or approval from the owner's phone; desktop pointer. Visual: 'you are looking at what Sam was looking at' orientation; the desktop user's cursor as a beacon in VR.
- Good for: one headset in a meeting room; stakeholder demos; shared use in labs and classrooms.
- Origin and evidence: shipped at OS level (Apple Vision Pro Guest User; Meta Quest multi-account and guest mode); the app-level state handoff is invented.
- Sources: https://support.apple.com/en-us/117742 ; https://support.apple.com/guide/apple-vision-pro/let-others-use-your-apple-vision-pro-dev57f3c667e/visionos

### 28.13 Speaker-aware voice commands in a group (addressee detection)

- How: With several people talking, the system decides whether an utterance is a command to graphty or talk between people (head direction, pointing, a wake word or per-user push-to-talk) and attributes each command to its speaker, so 'show me its neighbors' acts on that speaker's selection and appears in their color in history. View-changing commands go through floor control (28.7). 18.15 and 18.16 listen and summarize but do not settle who commands what.
- Inputs: multi-party speech; head pose and pointing; optional per-user push-to-talk. Visual: a speaker-colored marker when an utterance is taken as a command; a 'did you mean me?' chip when unsure.
- Good for: any shared session with voice control; preventing accidental commands from conversation.
- Origin and evidence: addressee detection in multi-party human-robot dialogue (lab studies, e.g. Katzenmaier, Stiefelhagen, Schultz, ICMI 2004, head pose plus speech); shared VR graph use invented.
- Sources: https://www.researchgate.net/publication/221052267_Identifying_the_addressee_in_human-human-robot_interactions_based_on_head_pose_and_speech ; https://link.springer.com/article/10.1007/s12193-020-00361-9

### 28.14 Crowd puzzle mode (many players cooperate or compete on one graph)

- How: A large open session turns an analysis task into a game for many people: untangle a layout to reduce crossings, label communities, flag suspicious edges or find motifs, with scores, leaderboards and shared credit. The best solutions return as candidate layers the owner can adopt. Players may be outside the team and need no graph theory.
- Inputs: the same direct-manipulation tools as solo work; a score and submit action. Visual: scoreboard, other players' attempts as ghosts, the current best highlighted.
- Good for: labeling and cleanup at scale, citizen-science graphs, teaching, human-in-the-loop training data.
- Origin and evidence: shipped precedent in science games: Foldit players solved a retroviral protease structure (Khatib et al., Nature Structural and Molecular Biology 2011, real-world result). Invented for graphs in VR; weak evidence for graph tasks.
- Sources: https://www.nature.com/articles/nsmb.2119

### 28.15 Safety, consent and personal-space controls for shared and open sessions

- How: Every shared session gets social-safety mechanics built for a graph space. A personal boundary bubble stops other avatars, and their rays and grabs, from entering your space or your private copies. People can be muted, blocked or hidden, which also hides their annotations and layers. A host can remove a participant, freeze all edits, or roll back what one participant changed (using the attribution in 28.13 and 27.2). A 'safe zone' gesture pulls you into a private view. Invitees consent before they are recorded (27.3, 18.16) or follow-tethered (28.4). A prerequisite for 28.1 and 28.14 with outsiders or strangers.
- Inputs: palm-out 'stop' gesture or wrist menu; host console; consent prompt on joining. Visual: a faint boundary shell; muted or blocked avatars fade to outlines; a recording indicator; a host badge.
- Good for: open crowd sessions (28.14), classes, public demos, anything mixing strangers with sensitive data.
- Origin and evidence: shipped in social VR (Meta Horizon personal boundary, VRChat safety and trust system, Rec Room); Blackwell, Ellison, Elliott-Deflo, Schwartz, 'Harassment in Social Virtual Reality', CSCW 2019 (interviews, N=25). Graph edits, rollback and layer hiding invented. Strong evidence the problem exists; no graph-specific study.
- Sources: https://doi.org/10.1145/3359202 ; https://docs.vrchat.com/docs/vrchat-safety-and-trust-system ; https://about.fb.com/news/2022/02/personal-boundary-horizon-worlds-venues/

### 28.16 Live translated speech and per-user label language in shared sessions

- How: Collaborators who speak different languages hear and read each other in their own language. Speech is translated as it streams and shown as a caption bubble at the speaker (building on 29.9), optionally with a synthesized voice. Node labels, attribute names, algorithm names and agent narration render in each viewer's language through the per-user layer of 28.2, with the original one glance away. Spoken commands (28.13) work in any participant's language and go to history in a canonical form.
- Inputs: each user's speech; a language setting per user; hover to see the original. Visual: a translated caption at each speaker's avatar with a language tag; labels in the viewer's language.
- Good for: international teams, cross-border investigations (financial or supply-chain graphs with multilingual entity names), conferences and teaching.
- Origin and evidence: shipped in 2D meetings (Microsoft Teams live translated captions); streaming speech translation research (Meta SeamlessStreaming, 2023). VR graph use invented; no VR study.
- Sources: https://support.microsoft.com/en-us/office/use-live-captions-in-microsoft-teams-meetings-4be2d304-f675-4b57-8347-cbd000a21260 ; https://ai.meta.com/research/seamless-communication/

### 28.17 Phones and tablets as handheld AR seats in a colocated shared graph

- How: People in the room with no headset join the shared graph by holding up a phone or tablet. Through a WebXR immersive-ar or shared-anchor link they see the same graph anchored at the same spot as headset users. Each phone is a magic window: walk around the table to look, tap a node to select it in your own color, point the phone to cast a ray headset users see. One headset and five phones make a working group. Unlike 23.9 (a headset per person), 25.5 (an unanchored screen partner) and 25.1/25.3 (the wearer's own devices).
- Inputs: phone camera pose, touch taps, a long press to aim a ray, voice in the room. Visual: the graph overlaid on the room through the phone camera; headset users see a phone avatar with a frustum and the holder's colored ray.
- Good for: classrooms, meetings with one headset, stakeholders who will not wear a headset, cheap mixed presence.
- Origin and evidence: shipped building blocks (WebXR immersive-ar in Chrome on Android; ARCore Cloud Anchors; asymmetric phone-plus-headset games); Gugenheimer et al., ShareVR, CHI 2017 (lab study, N=16). The graph combination is invented.
- Sources: https://developers.google.com/ar/develop/cloud-anchors ; https://immersive-web.github.io/webxr-ar-module/ ; https://www.researchgate.net/publication/316708890

### 28.18 Video-call participants placed in the scene with a working pointer

- How: People who join from an ordinary video call or browser link appear in the VR graph space as live video tiles, each hung near the part of the graph that person is looking at in their 2D view. When they move their mouse over the graph in the browser, a ray leaves their tile and lands on the same node in 3D, so the headset user sees both their face and what they point at. Unlike 25.5 (beacons, no presence) and 25.9 (one-way broadcast).
- Inputs: the remote person's mouse, touch and webcam; the headset user's gaze or ray to pick a tile and talk to that person. Visual: floating video tiles with name tags, a colored ray from each tile into the graph, tiles turning to face the node under discussion.
- Good for: mixed meetings where most participants are on laptops; remote experts without a headset; face-to-face cues in a VR analysis.
- Origin and evidence: shipped: 2D participants as video tiles in Meta Horizon Workrooms and Microsoft Mesh for Teams. The 2D-cursor-to-3D-ray pointer is invented. No graph study.
- Sources: https://about.fb.com/news/2021/08/introducing-horizon-workrooms-remote-collaboration-reimagined/ ; https://learn.microsoft.com/en-us/mesh/overview

---

## 29. Accessibility

### 29.1 Walkable graph structure for screen readers (keyboard, stick or switch tree walk)

- How: The graph is exposed as a structure to move through step by step, not a picture: graph, communities, nodes, neighbors, edges, plus algorithm results such as top-k lists and paths. Arrow keys, a thumbstick or a switch move up, down and sideways (next sibling, follow this edge, back); each step speaks a summary at a chosen verbosity, with a spatial earcon from the node's position. The same structure is mirrored as a DOM accessibility tree on a companion phone or desktop, so the user's own screen reader (VoiceOver, TalkBack, NVDA) can drive the headset view. 15.9 only speaks what is already hovered; this is the navigation model that reaches a node without seeing it.
- Inputs: keyboard arrows, thumbstick, a single switch, voice next/back; TTS; optional companion screen reader. Visual: optional highlight following the cursor, with a breadcrumb of the current path.
- Good for: blind and low-vision analysts; hands-light exploration; a canonical way to step through neighbors and paths in order.
- Origin and evidence: Olli, Zong, Lee, Lundgard, Jang, Hajas, Satyanarayan, EuroVis/CGF 2022 (study with blind and low-vision screen reader users); Data Navigator, Elavsky, Nadolskis, Moritz, IEEE VIS 2023 (toolkit including node-link graphs, prototype); W3C XR Accessibility User Requirements (guideline). The phone screen-reader bridge is invented; a WebXR canvas exposes no accessibility tree, so it is the only route for real assistive tech.
- Sources: https://vis.csail.mit.edu/pubs/rich-screen-reader-vis-experiences/ ; https://arxiv.org/abs/2308.08475 ; https://www.w3.org/TR/xaur/

### 29.2 Graph-aware switch scanning with adaptive controllers

- How: For users with one or two switches (an adaptive-controller button, a sip-and-puff device, a blink, a foot or head switch). A highlight moves through items automatically and the switch picks the current one, so every function stays reachable with one binary input. Scanning is graph-aware: first communities, then the members of the chosen community, then that node's neighbors, then a verb menu. Scan speed, dwell and group order are user settings; hubs and recently used items come first.
- Inputs: one or two switches through the Gamepad API (Xbox Adaptive Controller or a USB switch interface), or any single key, blink or sound. Visual: a moving scan highlight with group outlines that narrow step by step.
- Good for: people with severe motor impairment who cannot point; a robust fallback when tracking fails.
- Origin and evidence: shipped (Apple Switch Control, Android Switch Access, Xbox Adaptive Controller; mature assistive technology); Mott et al., "Accessible by design", ISMAR-Adjunct 2019 (position paper, opinion). Graph-aware scan grouping is invented.
- Sources: https://support.apple.com/guide/iphone/use-switch-control-iph400cb6fd2/ios ; https://support.google.com/accessibility/android/answer/6122836 ; https://www.xbox.com/en-US/accessories/controllers/xbox-adaptive-controller ; https://www.microsoft.com/en-us/research/publication/accessible-by-design-an-opportunity-for-virtual-reality/ ; https://ieeexplore.ieee.org/document/8951961
- Merged from: "One-switch scanning and adaptive controllers", "Switch scanning over menus and the graph".

### 29.3 Any-input action map (every command bindable to any input)

- How: Every graphty operation is a named action (select, expand neighbors, run a named algorithm, undo, open a palette, grab the world). In an in-VR binding panel the user binds any action to any input they can produce: a controller button, an adaptive-controller port, a foot pedal, a key, a spoken word, a recorded gesture or a dwell zone. No action is reachable only through one fixed movement (a two-hand spread, a wrist twist). Profiles save and export. 7.5 gesture macros only add shortcuts; this guarantees nothing depends on one body movement.
- Inputs: any Gamepad API device, keyboard, voice, recorded gestures, dwell. Visual: a binding list with live capture (press, say or do the input to bind it).
- Good for: limb differences, tremor, one usable hand, users who must avoid a specific movement because of pain.
- Origin and evidence: shipped (Xbox Adaptive Controller, WalkinVR driver); guideline (Game Accessibility Guidelines, "allow controls to be remapped").
- Sources: https://www.xbox.com/en-US/accessories/controllers/xbox-adaptive-controller ; https://www.walkinvrdriver.com/ ; https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/

### 29.4 Calibrated reach envelope (everything comes to where you can reach)

- How: A one-minute calibration records the user's comfortable reach volume as they sweep each hand, seated, standing or in a wheelchair. From then on every panel, holster, shelf, palette face and grab target is clamped inside it; hip holsters, overhead shelves and floor targets move to reachable stand-ins, and a pull gesture brings any out-of-reach target into the envelope. Leaning or standing is never required. Families 8 and 23 assume standing adults with full reach; this re-maps them.
- Inputs: calibration sweep; any pull action. Visual: an optional faint shell showing the reach volume; out-of-reach items show a pull affordance.
- Good for: wheelchair users, short-statured users and children, limited shoulder range, fatigue.
- Origin and evidence: Gerling et al., "Virtual Reality Games for People Using Wheelchairs", CHI 2020 (qualitative study); Franz, Mott et al., "Nearmi", ASSETS 2021 (lab study with limited-mobility participants); shipped (WalkinVR reach scaling and virtual-hand offset).
- Sources: https://doi.org/10.1145/3313831.3376265 ; https://doi.org/10.1145/3441852.3471230 ; https://www.walkinvrdriver.com/

### 29.5 Complete one-handed mode with a parked ghost hand

- How: Every bimanual option (off-hand palette, two-hand handlebar zoom, noun hand and verb hand, two-hand span ranges, drum menu) gets a one-hand equivalent. The user drops a ghost hand, a virtual anchor that stays where released and acts as the missing hand; the real hand then does the second hand's part (drag away from the anchor to scale, orbit it to rotate). The off-hand palette docks to the active wrist or a world spot; two-hand chords become sequences (tap noun, then tap verb).
- Inputs: one controller or one tracked hand; a button or pinch-hold to drop and lift the ghost hand. Visual: a translucent parked hand or anchor marker, with a line to the live hand.
- Good for: amputees, hemiplegia, a hand on a mobility aid, holding coffee or a phone.
- Origin and evidence: the ghost hand is invented; related shipped work: MRTK bounds control one-hand scale and rotate handles; guideline (Game Accessibility Guidelines, "ensure controls are usable with one hand").
- Sources: https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk2/features/ux-building-blocks/bounding-box ; https://gameaccessibilityguidelines.com/full-list/

### 29.6 Low-vision toolkit for the graph (SeeingVR pattern)

- How: Switchable tools applied to the whole scene: graph-aware text augmentation (labels with a minimum angular size, bold, backplates); contrast and edge enhancement (outlined nodes and edges); a bifocal reading lens fixed in the lower field; and peripheral remapping for a narrow visual field (glaucoma, retinitis pigmentosa), which shows a minified overview of out-of-field nodes and edges inside the central field, draws guidelines from the selection to off-field results and can recolor to higher-contrast tones. The 9.x magnifiers and fisheye bubble are analysis lenses at normal acuity; this is for impaired acuity, contrast and field.
- Inputs: settings toggles, voice, a wrist quick toggle. Visual: high-contrast outlined graph; persistent minimap of out-of-field structure; large labels.
- Good for: low acuity, low contrast sensitivity, field loss, older users.
- Origin and evidence: Zhao et al., "SeeingVR", CHI 2019 (lab study with low-vision participants, N=11: 14 tools helped participants finish tasks faster and more accurately). Graph-specific remapping is invented.
- Sources: https://doi.org/10.1145/3290605.3300341

### 29.7 Redundant non-color encoding and a color-vision profile

- How: Every color-coded result is also shown another way: communities, algorithm membership, paths and filters get node glyph shapes, textures or patterns, edge dash styles and label tags. Users pick a color-vision profile (protan, deutan, tritan, monochrome), and every data-driven style layer re-picks its palette from a safe set. A point-and-ask query (button or voice) speaks "what color or group is this". 10.12 shake-to-reveal gives only color-blind-safe highlighting, not a full encoding profile.
- Inputs: settings; point plus button or voice query. Visual: shape, texture or pattern channels alongside color; palettes safe for the chosen profile.
- Good for: color vision deficiency (about 8 percent of men); passthrough AR, where lighting shifts colors.
- Origin and evidence: guideline (WCAG 1.4.1 Use of Color; Okabe and Ito color-universal-design palette, widely used guidance).
- Sources: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html ; https://jfly.uni-koeln.de/color/

### 29.8 Depth without stereo (monocular and stereoblind mode)

- How: For users without stereo depth perception, depth comes from other cues: depth fog or depth-tinted color, size cues, shadows on a ground plane, and an optional small automatic parallax wobble (kinetic depth). Path and neighbor tracing uses motion-based highlighting rather than 3D separation. A depth-ruler readout appears on demand. 1.14 drop lines cover only part of this; 14.16 is the general depth-cue kit.
- Inputs: a profile toggle; wobble amplitude setting. Visual: depth-cued fog or tint, ground shadows, a gentle continuous wobble.
- Good for: stereoblind or stereo-deficient users (several percent of adults), amblyopia, one functioning eye.
- Origin and evidence: Chopin, Bavelier, Levi, Ophthalmic and Physiological Optics 2019 (evidence synthesis: stereoblindness in about 7 percent of adults); Ware and Mitchell, APGV 2005 (lab study: motion cues as well as stereo improve 3D graph path tracing).
- Sources: https://doi.org/10.1111/opo.12607 ; https://doi.org/10.1145/1080402.1080411

### 29.9 Directional captions and visual or haptic twins of every sound

- How: Every audio channel (earcons, sonification, the whisper channel, agent speech, collaborators' voices) gets a non-audio equivalent. Speech is captioned in a bubble attached to the speaker or source, with an edge-of-view arrow when the source is out of view; earcons become brief visual glyphs plus haptic pulses; sonified structure shows as glows or pulses on the sounding nodes. Agent narration (18.3) already has captions; collaborator voices, sound alerts and sonified data had none.
- Inputs: output only; caption size and position settings. Visual: speech bubbles at the source, direction arrows, glyph flashes in place of earcons.
- Good for: deaf and hard-of-hearing users, noisy rooms, muted headsets, shared sessions.
- Origin and evidence: Jain et al., CHI 2015 (design study with deaf and hard-of-hearing participants, N=24, head-mounted sound awareness); Peng et al., "SpeechBubbles", CHI 2018 (lab study with deaf and hard-of-hearing users); W3C XR Accessibility User Requirements (guideline).
- Sources: https://doi.org/10.1145/2702123.2702393 ; https://doi.org/10.1145/3173574.3173867 ; https://www.w3.org/TR/xaur/

### 29.10 Reduced-motion and flash-safe profile

- How: One switch, which also follows the browser's prefers-reduced-motion setting: camera travel becomes a fade cut with no smooth flight; layout changes crossfade instead of animating, and live force simulations settle hidden then appear; flowing edge particles become static arrows; algorithm creatures, ripples and pulses become static end states; SSVEP flicker selection (26.3) and any flashing above three per second are disabled; family 3 walk-through and on-rails options become point-and-teleport.
- Inputs: a toggle, or the OS/browser reduced-motion setting. Visual: the same information in still frames and cuts.
- Good for: vestibular disorders, migraine, motion sickness, photosensitive epilepsy.
- Origin and evidence: guideline (WCAG 2.3.1 Three Flashes, WCAG 2.3.3 Animation from Interactions; Meta locomotion comfort guidance); shipped (CSS prefers-reduced-motion). The catalog had a comfort vignette but no motion or flash profile.
- Sources: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ; https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html ; https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

### 29.11 Trainable personal command vocabulary for atypical speech

- How: The user records a few samples of their own utterance for each command (any word, sound or language), and recognition matches against those personal samples instead of a general speech model, with a confirmation step and a visible list of known commands. Families 16 and 17 assume speech a general recognizer understands; 16.8 non-verbal voice is continuous control, not a vocabulary.
- Inputs: microphone; a short enrollment per command. Visual: a command list showing which entries are trained, plus a confirmation chip.
- Good for: dysarthria, stuttering, strong accents, non-English speakers, users who can make sounds but not words.
- Origin and evidence: shipped (Google Project Relate, from the Euphonia research).
- Sources: https://sites.research.google/relate/ ; https://sites.research.google/euphonia/about/

### 29.12 Plain-language step mode with a fixed home anchor

- How: A mode that limits the choices on screen, each with a plain-language label and icon. One operation runs at a time, followed by a one-line spoken or written result ("These 12 people connect the two groups"). A home anchor that never moves offers where am I, undo and start over. Modes never change without the user's action, and nothing important is gesture-only or timed. Differs from 4.18 and 17.14, which are productivity options, not a stability and low-load guarantee; it may be better treated as a property of other options.
- Inputs: any pointing or switch input; voice optional. Visual: few large labeled choices; a persistent home anchor; a single result sentence.
- Good for: cognitive and learning disabilities, brain injury, fatigue, first-time users.
- Origin and evidence: guideline (W3C "Making Content Usable for People with Cognitive and Learning Disabilities", COGA 2021); weakest evidence of this family.
- Sources: https://www.w3.org/TR/coga-usable/

### 29.13 Reclined and lying-down session (gravity-rotated workspace)

- How: A recenter while looking up (or a profile toggle) rotates the whole graphty frame so 'forward' is the ceiling: graph, panels, palettes, holsters and the reach envelope (29.4) re-anchor to the reclined head and torso, and nothing assumes gravity-down (no floor targets, table rim, or gravity metaphors such as ripple stone 11.6, pitcher 11.8, gold pan 12.2, room-scale walking). Grab-the-world replaces floor locomotion. 29.4 calibrates reach but assumes an upright posture.
- Inputs: recenter gesture or button; any pointing input; the app re-orients its own content root within the WebXR reference space. Visual: the scene rotated about 90 degrees to face the user; floor affordances moved to a virtual surface in front of the chest.
- Good for: bed-bound and recumbent users, chronic pain, ME/CFS and post-surgery fatigue, long relaxed reading sessions.
- Origin and evidence: shipped: Meta Quest lying-down mode (Horizon OS v63, experimental, 2024), no study. Applying it to graphty's floor- and gravity-dependent metaphors is invented.
- Sources: https://www.uploadvr.com/quest-v63-lying-down/ ; https://www.meta.com/blog/v63-software-update-lying-down-quest-cash/

### 29.14 Limited neck rotation: amplified head turn and bring-to-front

- How: A short calibration records the comfortable head yaw and pitch range. Then: (a) an optional rotation gain makes a small head turn sweep the whole surround (dome 14.4, small-multiples shelf 14.14); (b) any off-axis result, agent beacon or caption can be summoned into the comfortable cone with one action; (c) wrap-around layouts (curved shelves, overhead dome, walls) compress to fit the cone. 29.4 handles arm reach, not head range of motion.
- Inputs: head calibration sweep; a bring-to-front button, voice or dwell; rotation gain setting. Visual: content compressed into the comfortable cone; edge arrows for summonable off-cone items.
- Good for: limited neck mobility (cervical injury, arthritis, torticollis), neck pain, users who must stay still, seated users who cannot swivel.
- Origin and evidence: Sargunam, Moghadam, Suhail, Ragan, Guided and amplified head rotation, IEEE VR 2017 (lab study); rotation gains for seated VR (arXiv 2022, lab study); vignetting during amplified rotation (SAP 2018) reports some sickness cost. The calibrated cone with summoning is invented.
- Sources: https://www.researchgate.net/publication/315873855_Guided_head_rotation_and_amplified_head_rotation_Evaluating_semi-natural_travel_and_viewing_techniques_in_virtual_reality ; https://arxiv.org/html/2203.02750v1 ; https://dx.doi.org/10.1145/3225153.3225162

### 29.15 Haptic-channel substitution and per-channel sensory intensity mixer

- How: Several options carry data or confirmation only through touch (haptic Geiger sweep 15.1, heft 15.3, magnetic snap click 2.10, hold-to-deepen ticks 12.7, tug-of-war snap 10.18, fishing-cast tugs 9.16, metal detector 9.15). Each gets a non-haptic twin (a visual pulse or meter at the hand, or a sound), chosen automatically when there are no controllers (hand tracking has no haptics) or haptics are off. A mixer sets haptic, audio, motion and visual-clutter intensity separately, with a quiet preset. 29.9 converts audio to other channels; nothing converted haptics.
- Inputs: settings mixer; automatic when hand tracking replaces controllers. Visual: small amplitude meters or pulsing rings at the hand mirroring vibration, optional matching tones.
- Good for: reduced touch sensation (neuropathy, diabetes, prosthetic hands), hand-tracking-only sessions, autistic and sensory-sensitive users.
- Origin and evidence: guideline: Game Accessibility Guidelines (no single channel; separate intensity controls); W3C XR Accessibility User Requirements. Application to graphty's haptic options invented. No study.
- Sources: https://gameaccessibilityguidelines.com/full-list/ ; https://www.w3.org/TR/xaur/

### 29.16 Direction without two ears (mono-safe spatial audio)

- How: Spatial sonification 15.6, the whisper channel 15.10, spearcon sweeps 15.7, spatial earcons in 29.1 and collaborator voices assume binaural hearing for direction. In mono mode audio is downmixed to both ears and the lost direction re-encoded: a haptic pulse on the left or right controller, a pitch or timbre code for up/down and near/far, a spoken clock direction ('3 o'clock, close') and an edge-of-view arrow. Unlike 29.9 it keeps sound and replaces only direction.
- Inputs: mono toggle, or the OS mono-audio setting where exposed; output only. Visual: optional edge arrows.
- Good for: single-sided deafness, asymmetric hearing loss, one hearing aid or cochlear implant, a single earbud.
- Origin and evidence: shipped OS mono-audio settings (iOS, Android, Quest); guideline: Game Accessibility Guidelines 'provide a stereo/mono toggle'. Direction re-encoding for graph sonification invented. No study.
- Sources: https://gameaccessibilityguidelines.com/provide-a-stereo-mono-toggle/ ; https://www.w3.org/TR/xaur/

### 29.17 Refreshable tactile display mirror of the local neighborhood

- How: A pin-array tactile display (Dot Pad class) on the desk or lap shows the current focus as a touch-readable diagram: the selected node with 1- or 2-hop neighbors on a grid, a path as a raised line, or a small adjacency-matrix tile, with a braille label on the selected cell. It updates as the user walks the graph with 29.1; pressing a pin location (or arrow keys) moves the focus in the headset and the companion screen reader. Sighted collaborators see the mirrored region outlined in VR. 24.10 is a static printed overview; this is a live output channel.
- Inputs: refreshable tactile display over USB or Bluetooth via the companion device; its keys or touch; TTS for detail. Visual (for sighted co-users): an outline of the region on the pin array.
- Good for: blind touch readers who need spatial structure (clusters, bridges, path shape) that lists and speech lose; mixed blind and sighted teams.
- Origin and evidence: Yang, Marriott, Butler, Goncu, Holloway, Tactile presentation of network data, CHI 2020 (lab study, N=8 blind touch readers: node-link best for most tasks, matrix for adjacency); Reinders et al., arXiv 2024 (study with blind and low-vision participants, refreshable display plus agent); shipped hardware (Dot Pad). Pairing with live XR invented.
- Sources: https://arxiv.org/abs/2003.14274 ; https://arxiv.org/html/2408.04806v1 ; https://www.applevis.com/forum/assistive-technology/dot-pad

### 29.18 Sign-language channel (signing agent output, sign input)

- How: For Deaf users whose first language is signed, captions are a second language. The graph agent (family 18) and result narration can be shown by a signing avatar docked near the result or at the wrist, captions optional. Since hands are tracked, a small set of signed commands and fingerspelled node names can be bound as input through 29.3; in shared sessions a collaborator's speech can be relayed as signing. Text and signing come from the same neutral result facts ({code, params}).
- Inputs: hand tracking for signs and fingerspelling; avatar animation output (machine translation or a fixed lexicon for result templates). Visual: a small signing figure beside the node or panel it describes, with 29.9 direction arrows when out of view.
- Good for: Deaf signers, Deaf-hearing teams, users with low written-language literacy.
- Origin and evidence: Deaf-centric mixed-reality avatar design study, ACM 2025 (design study with Deaf participants); sign-language avatar comprehensibility evaluation, ACM 2025 (user study); W3C XAUR (guideline). Avatar sign quality is a known weakness, so evidence is mixed; graph application invented.
- Sources: https://dl.acm.org/doi/10.1145/3710953 ; https://dl.acm.org/doi/10.1145/3742886.3756719 ; https://arxiv.org/pdf/2609.11706 ; https://www.w3.org/TR/xaur/

### 29.19 Effort-aware input: measured arm fatigue moves work to lower-effort input

- How: The app estimates arm effort from the hand and controller pose WebXR already gives (how long and how high each arm is held, how far from the body) with a published shoulder-fatigue model. When the budget runs low it suggests, or with consent switches to, a lower-exertion equivalent: mid-air palettes drop to lap or desk height, ray picking becomes head-reticle or mouse picking, two-hand world grabs become a thumbstick or a parked anchor; plus a rest prompt with pause-anywhere that keeps state. Thresholds are calibrated per user, so chronic pain, ME/CFS, MS or a shoulder injury gets a much smaller budget. 29.4 fixes where things are; this fixes how long the user can keep doing them.
- Inputs: head and hand or controller pose over time, a short calibration and a sensitivity setting. Visual: an optional effort gauge at the wrist and a suggestion chip naming the lower-effort alternative.
- Good for: chronic fatigue and pain conditions, MS, shoulder or arm injury, older users, long sessions; less gorilla-arm for everyone.
- Origin and evidence: Hincapie-Ramos, Guo, Moghadasian, Irani, 'Consumed Endurance', CHI 2014 (lab study, about N=20); Jang, Stuerzlinger, Ambike, Ramani, 'Modeling Cumulative Arm Fatigue in Mid-Air Interaction', CHI 2017 (lab study). Run-time adaptation and per-user budget invented. Strong evidence for measuring fatigue, none for the adaptation.
- Sources: https://dl.acm.org/doi/10.1145/2556288.2557130 ; https://dl.acm.org/doi/10.1145/3025453.3025523

### 29.20 Gesture timing and hand-pose accommodations (no gesture needs speed, steadiness or a working pinch)

- How: One profile relaxes the timing, speed and hand-pose rules of every gesture recognizer. Velocity- and timing-based options (2.8 throw, 6.2 flicks, 10.1 pull velocity, 7.7 rhythm taps, 12.7 hold-to-deepen, double pinches) get adjustable minimum and maximum hold durations; repeated pinches inside a window are ignored so a tremor does not fire five selections; the user picks whether selection fires on first or last contact; every velocity rule gets a slow equivalent (a slow drag past a distance does what a flick does). Recognizers also accept any pose the user records as their 'pinch' or 'grab' (a fist, a palm press, a lateral thumb, a pinch with missing or contracted fingers). 29.3 changes which input fires an action; this changes whether the user's movement is recognized at all.
- Inputs: settings, a short pose-recording step, the existing hand joints and controller buttons. Visual: a test area showing which rule a gesture passed or failed, and a progress ring on holds.
- Good for: Parkinson's, ALS, cerebral palsy, arthritis and contractures, limb and finger differences, spasticity.
- Origin and evidence: shipped on other platforms (Apple Touch Accommodations; Vision Pro alternative pointer sources); guidelines (WCAG 2.2 2.5.1 and 2.2.1; Game Accessibility Guidelines). Application to graphty's velocity gestures invented; no XR study.
- Sources: https://support.apple.com/guide/iphone/touch-accommodations-iph77bcdd132/ios ; https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html ; https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html ; https://gameaccessibilityguidelines.com/

### 29.21 Reading support for panels: read-aloud with synced highlighting and adjustable typography

- How: Any text in the immersive UI (algorithm descriptions, result tables, node properties, errors, agent replies) can be read aloud with each word highlighted as spoken: point at it, say 'read this' or hold a button. Text can be reformatted in a focus view a line at a time, with adjustable letter and line spacing, font, background tint and syllable breaks; long attribute names and values in labels can be read on demand without enlarging them. 15.9 speaks only the selected node and 29.6 targets poor eyesight; this targets decoding and reading load.
- Inputs: point plus a button, voice, or dwell; text-to-speech; typography settings. Visual: a focus strip highlighting each spoken word, with a tinted backplate and spacing controls.
- Good for: dyslexia, low literacy, second-language readers, aphasia, fatigue; text-heavy algorithm and result panels.
- Origin and evidence: shipped (Microsoft Immersive Reader); evidence on dyslexia fonts is negative (Wery and Diliberto, Annals of Dyslexia 2017, N=12: OpenDyslexic no benefit), so offer spacing and read-aloud and treat the font as a preference. Moderate to weak evidence; no XR study.
- Sources: https://learn.microsoft.com/en-us/training/educator-center/product-guides/immersive-reader/ ; https://link.springer.com/article/10.1007/s11881-016-0127-1

### 29.22 The user's wheelchair as a navigation input

- How: A wheelchair user moves through the graph with the chair they already control well. A power chair's joystick is read through an adaptive Gamepad API interface, or the chair's rotation and roll are read from the headset's tracked motion: turning the chair rotates the graph world, rolling moves in and out, and the play area is reshaped to a wheelchair-safe boundary. Opt-in. The goal is that walk-through options (3.6, 3.7, 3.15) have an equal path not depending on legs, rather than teleport-only. 29.4 and 3.20 assume a standing or fixed-seat user.
- Inputs: wheelchair motion read from head pose relative to the chair, or a joystick through a USB or Bluetooth gamepad adapter; speed settings. Visual: ordinary graph travel with a boundary sized to the chair.
- Good for: manual and power wheelchair users who want embodied travel through the graph.
- Origin and evidence: Gerling, Dickinson, Hicks, Mason, Simeone, Spiel, 'Virtual Reality Games for People Using Wheelchairs', CHI 2020 (qualitative study: users wanted the chair to be part of the experience). The input mapping is invented; weak evidence for the technique.
- Sources: https://dl.acm.org/doi/10.1145/3313831.3376265
