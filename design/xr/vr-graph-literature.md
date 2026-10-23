# Graphs in headsets: what the research says, and what it means for graphty.app

This document reviews 19 published studies and system papers on reading node-link graphs in
virtual reality (VR) headsets, on stereo desktop displays and on flat screens. It draws out what
the evidence means for graphty.app's planned VR prototypes, and where graphty could add new
research of its own.

The prototypes it refers to (the hand-held answer diorama, direct graph manipulation, walking
along edges, the comparison lens, the passthrough desk, point-and-speak, resting-hand pinches,
measure-space layouts and room-scale walking) are described in the VR interaction study:

See [VR interaction options for graphty](vr-interaction-options.md).

Every number below comes from the text of the paper it is attributed to, with a page or section
where one was recorded. Section 6 says which papers were read in full and which only as an
abstract. Paper titles keep their original spelling.

## 1. The short answer

**3D only helps when it moves.** The oldest and cleanest result (Ware and Franck 1996) is that a
static 3D picture is no better than a 2D one: both had the highest error on a path-tracing task,
and they did not differ from each other. Error fell as soon as the graph moved, whether the motion
came from the head, the hand or automatic rotation, and fell further with stereo. With head-tracked
stereo, people could trace paths in a graph about 3 times larger than in 2D at the same error
rate. That figure was measured on graphs of at most 291 nodes, with paths of length 2, on a 1996
shutter-glasses monitor. A later paper by the same group (Ware and Mitchell 2008) reports, in its
abstract, under 10% error at 333 nodes for novices and 1,000 nodes for skilled observers on a very
high resolution stereo display. Its full text could not be obtained, and a current headset is
much less sharp than that display, so treat 1,000 nodes as a ceiling to test against, not a
promise.

**2D still wins for easy questions and for speed.** When the structure is well separated, 2D is
both more accurate and faster: counting well-separated communities, 2D error was 0.10 against
0.27 in stereo, and 2D took about half the time (Greffard 2011). Local lookups such as "which nodes
do these two share" were faster on a desktop than in a headset (Huang 2023, Kotlarek 2020), and
spatial memory was better in 2D (Kotlarek 2020). Depth pays off only when the structure is tangled:
tracing paths in a 4,941-node power grid (3D path accuracy 0.893 against 0.500 in 2D, Kotlarek
2020), counting many overlapping communities (Greffard 2011 and 2014), finding clusters in noise
(Kraus 2020), counting triangles (Huang 2023). Across these studies the 3D gain is in accuracy;
3D is almost always slower.

**A headset is not clearly better than desktop 3D that the user can rotate.** When a study
included a desktop 3D view with mouse rotation, the headset did not beat it on accuracy: Kraus
2020 found no significant difference between desktop 3D and either VR condition on cluster
counting, and desktop 3D was fastest; Whitlock 2020 found no main effect of display (desktop, VR
or passthrough AR) on reading values; Huang 2023 found 2D and desktop 3D not significantly
different, with VR winning only on triangle counting (62.5% correct against 32.5% for desktop 3D).
People nevertheless prefer the headset strongly (17 of 20 in Kotlarek 2020), and preference is
not accuracy: 74.3% of Greffard 2011's participants believed stereo was best, but only 54% of
those did best in it.

**Inside the headset, scale and travel matter.** A graph at table or hand scale was as accurate
as a room-sized one, better remembered, preferred, and needed half the walking (Kraus 2020);
arrangements that force walking were the slowest and least liked (Feyer 2024). Holding the graph
and rotating it by hand did most of the work in the strongest headset result (McGuffin 2022).
Hopping from node to node with a short eased animation roughly halved path-following time without
hurting orientation or comfort (Sorger 2021), while fade teleporting was the slowest and least
liked way to travel (Drogemuller 2020).

**The field has large gaps that graphty is unusually placed to fill.** Across the 59 controlled
studies in the most recent survey, graphs had a median of 120 nodes and only one study was about
scalability; only 4 of 87 immersive applications run graph algorithms; and only 17 of 87 shared
their code (Joos 2025).

## 2. The papers at a glance

"Full" means the whole paper was read; "abstract" means only the abstract and secondary
descriptions were available. N is participants in the main study.

| Paper                            | Year | Display                                               | N                 | Tasks                                                    | Main result                                                                                                                                         | Access                     |
| -------------------------------- | ---- | ----------------------------------------------------- | ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Ware and Franck                  | 1996 | Stereo monitor with shutter glasses and head tracking | 11 per experiment | Is there a path of length 2 between two nodes            | Errors grow linearly with nodes; slope 0.369 in 2D, 0.123 with head-tracked stereo, so a graph about 3.0x larger is readable. Static 3D = 2D        | Full (scan)                |
| Ware and Mitchell                | 2008 | Very high resolution stereo display                   | Not known         | Path tracing                                             | Under 10% error at 333 nodes (novices) and 1,000 (skilled), per abstract; error tracks links minus nodes                                            | Abstract                   |
| Greffard, Picarougne, Kuntz      | 2011 | Stereo projector, shutter glasses                     | 35                | Count communities                                        | 2D best when communities are separate (0.10 vs 0.27 stereo); stereo better with 8+ overlapping communities; 2D about 2x faster                      | Full                       |
| Greffard, Picarougne, Kuntz      | 2014 | Stereo projector, shutter glasses                     | 18                | Count communities                                        | Error 2.7 (2D), 2.5 (mono 3D), 1.8 (stereo); time 10 s (2D) vs 17 s and 17.3 s (3D)                                                                 | Full (workshop version)    |
| Kwon, Muelder, Lee, Ma           | 2016 | Oculus Rift DK2, seated, mouse                        | 21                | Common neighbors, degree, path order, recall             | Sphere layout with depth routing: 43.20 s vs 75.77 s for a flat layout; correctness 87.70% overall, no condition effect except on the largest graph | Full                       |
| Sorger et al.                    | 2021 | HTC Vive, desk-bound, browser (A-Frame)               | 25                | Neighbors, degree, paths, orientation                    | Hopping node to node: path following 23 s and 21 s vs 40 s flying; no orientation or sickness cost                                                  | Full (accepted manuscript) |
| Drogemuller et al.               | 2020 | HTC Vive Pro, 2.5 x 2.5 m area                        | 25                | Find nodes, find paths, count triangles                  | Two-handed flying fastest; teleport slowest across clusters and least liked; miniature most disorienting as a camera remote                         | Full                       |
| Huang, Pfister, Yang             | 2023 | 23.8 in monitor vs Quest 2                            | 20                | Common neighbors, count triangles, compare two graphs    | VR best at triangle counting (62.5%), slower at lookups (87.0 s vs 58.5 s), failed at side-by-side comparison (276.8 s)                             | Full (preprint)            |
| Kotlarek et al.                  | 2020 | 30 in monitor vs Vive Pro, room scale                 | 20                | Shortest path, memory, change detection                  | 2D faster on all tasks; 3D path accuracy 0.950 vs 0.806, driven by the 4,941-node graph; 2D better memory                                           | Full (preprint)            |
| Feyer et al.                     | 2024 | Valve Index, 5 x 5 m room                             | 22 analyzed       | Six multilayer tasks                                     | No arrangement best overall; the walking-heavy stacked layout slowest (138.9 s vs 64.94 s)                                                          | Full (preprint)            |
| McGuffin, Servera, Forest        | 2022 | HTC Vive; HoloLens with 3D print                      | 34; 12            | Shortest-path length                                     | 3D lower error than 2D for lengths 2-4 (p < 0.0000005), network held in the hand; 3D hover highlight no help                                        | Full (preprint)            |
| Kraus et al.                     | 2020 | 24 in monitor vs HTC Vive                             | 18                | Count clusters in 3D scatterplots                        | Static 2D worst (median 16.67%); desktop 3D and VR not significantly different; table scale = room scale on error, half the walking                 | Full                       |
| Whitlock, Smart, Szafir          | 2020 | 4K monitor, Vive, Vive with video passthrough         | 42                | Read values from color, size, height, orientation, depth | No main effect of display; color error over passthrough 5.53% vs 2.05% in VR                                                                        | Full                       |
| Joos et al. (survey)             | 2025 | Survey of 138 papers                                  | 3-60 per study    | 59 studies                                               | Median graph 120 nodes; 4 of 87 apps run algorithms; 0 studies of purely egocentric layouts                                                         | Full                       |
| Joos et al. (node selection)     | 2024 | Valve Index, seated                                   | 18                | Select one node                                          | Ray fastest on small graphs; filter plane steady across sizes; touch 58.33 s at 200 nodes                                                           | Full                       |
| Lee et al.                       | 2026 | Meta Quest 3                                          | 10                | Open sociology questions by voice                        | 99.0% correct queries on the core set; 50% pass on out-of-vocabulary probes, with invented queries                                                  | Full (preprint)            |
| Takahira et al.                  | 2026 | Quest 2 in a web browser                              | 24                | Ego network judgments                                    | Cylindrical layout preferred (42%); free-floating depth cut accuracy to 71%                                                                         | Full (preprint)            |
| Zimmermann and Bruckner          | 2025 | VR, headset not stated                                | None              | Demonstration only                                       | Hand-held copies of subgraphs linked back by cones; no evaluation                                                                                   | Full (preprint)            |
| Joos et al. (network comparison) | 2022 | Oculus Rift CV1                                       | 18                | Compare edge weights of two graphs                       | 40-node graphs only; no desktop condition                                                                                                           | Full                       |

## 3. The papers one by one

### Ware and Franck 1996: stereo and motion cues for 3D networks

Three experiments on a stereo monitor with head tracking (no headset). People decided whether a
path of length 2 joined two highlighted nodes in random graphs; 11 people per experiment.

- Errors grew in proportion to node count, and one constant per condition explained 95% of the
  variance (pp. 132-133). The constants: 0.369 for 2D, 0.232 for stereo alone, 0.167 for head
  coupling alone, 0.123 for head-coupled stereo. So the readable graph is about 3.0x larger with
  head-coupled stereo, 1.6x with stereo and 2.2x with head coupling.
- In the nine-condition experiment at 75 nodes (pp. 136-137), error ran from 26% in 2D to 6.1%
  with stereo and hand-coupled rotation. Static perspective 3D did not differ from 2D. Stereo plus
  motion averaged 7.5%, motion alone 11.4%, stereo alone 15.4%. Automatic rotation did as well as
  head or hand coupling.
- Time leveled off at about 13 s near 100 nodes (p. 134).
- Some people found head-coupled stereo "somewhat stressful"; tracker noise and frozen frames
  caused a "queasy feeling" (p. 138).

Limits: small samples, random synthetic graphs, one low-level task, half vertical resolution in
stereo.

### Ware and Mitchell 2008: graphs in 3D on a very high resolution display

Only the abstract could be read. With stereo and motion together, unskilled observers traced paths
in 333-node graphs at under 10% error and skilled observers did so at 1,000 nodes, which the
authors call an order of magnitude over 2D. Errors were best explained by the number of links
minus the number of nodes. The experiments also compared links drawn as 3D tubes and as lines,
but the abstract does not give that result, and the number of participants is not known. One
secondary description (Greffard 2011, p. 216) says the graphs had under 150 nodes, which conflicts
with the abstract. Do not cite this paper's tube or participant details until the full text is
obtained.

### Greffard, Picarougne and Kuntz 2011: counting communities in 2D, 3D and stereo

35 people counted communities in 480 planted-partition graphs, laid out by force direction, on a
wall-sized stereo projector. Error was the gap between the answer and the true count.

- In the easiest graphs, error was 0.10 in 2D, 0.37 in mono 3D and 0.27 in stereo, and 2D was
  significantly better (p = 0.01). In harder graphs stereo was slightly better (p = 0.1), and with
  more than 7 communities and heavy mixing, stereo beat 2D significantly (p = 0.02) (pp. 221-222).
- 2D was significantly faster everywhere, for example 7.3 s against 12.3 s in stereo for the
  easiest graphs (Table 4).
- 68.6% rated stereo easiest and 74.3% believed it best, but only 54% of those believers did best
  in stereo (p. 223).

Limits: complexity classes found after the fact, synthetic graphs, one projector.

### Greffard, Picarougne and Kuntz 2014: does stereo change how people rotate?

18 computer scientists counted communities in overlapping graphs; the only interaction was
rotation about the center.

- Mean error 2.7 in 2D, 2.5 in mono 3D, 1.8 in stereo; stereo was lower than both (p < 0.0001),
  and 2D and mono did not differ.
- Time 10 s in 2D against 17 s mono and 17.3 s stereo; stereo saved no time.
- Stereo users looked from fewer viewpoints (viewpoint entropy 4.67 against 5.12 for mono) and
  switched back and forth more (alternation ratio 0.38 against 0.31): they settled on a view and
  rocked around it, possibly to create motion parallax on purpose (p. 4).

Limits: fixed community size, rotation only, a small sample of computer scientists, a projector.

### Kwon, Muelder, Lee and Ma 2016: layout, rendering and interaction for headset graphs

21 students, seated with a mouse in an Oculus Rift DK2, compared a flat layout placed in the
headset, a layout on the inside of a sphere around them, and the sphere with bundled edges routed
outward by cluster level.

- Time: 75.77 s flat, 56.22 s sphere, 43.20 s sphere with routing; all differences significant.
- Correctness 87.70% overall, with no condition effect except on the largest graph (297 nodes),
  where it was 80.95%, 88.1% and 95.24%.
- Interactions 28.89, 17.75 and 16.55; 20 of 21 ranked the routed sphere best. No sickness.
- Design notes: keep scanned content within the neck's comfortable range, about 160 x 100-110
  degrees (sec. 3.2); move highlighted nodes toward the eye along the view ray so they stay under
  the pointer; a world-fixed mouse cursor beat head-coupled cursors.

Limits: at most 297 nodes, seated only, 2015 hardware, no desktop condition.

### Sorger et al. 2021: egocentric network exploration

25 people in an HTC Vive (a browser app built on A-Frame) compared free flight through a 3D
force layout with two "egocentric" modes: stand at a node, highlight its neighbors and drop the
edges to them, and jump to another node with a 3 s eased animation; one variant also spread the
neighbors around the head. Graphs had 415 nodes and 826 edges.

- Finding a named neighbor took about 9 s and 20 s in the egocentric modes against more than
  100 s flying. Path following took 23 s and 21 s against 40 s.
- Shortest-path finding showed no significant difference (p = .066); the authors call it "not
  efficient without dedicated interaction support".
- Pointing back to a remembered place was off by 19-35 degrees in every mode, with no difference
  between them. Sickness subscales were slightly lower in the egocentric mode; nausea did not
  differ.
- Unprompted requests: bookmarks (10 people), landmarks (8), an outside overview (6), color by
  distance from here (3), a degree readout (3).

Limits: tasks favored the detail view, sparse graphs only, desk-bound, no 2D condition.

### Drogemuller et al. 2020: navigation techniques for 3D networks

25 people in an HTC Vive Pro compared one-handed flying, two-handed flying (pulling space between
the controllers), teleporting with a 1 s fade, and a 1:15 hand-held miniature that drives the
camera. Graphs ran up to 900 nodes, the most the system could draw at 90 fps.

- Finding nodes in one cluster: two-handed flying fastest, then one-handed (both p < 0.001 for
  technique). Across clusters, teleport was slowest (p < 0.01). Means appear only in figures
  (read as roughly 4 to 8 s per trial).
- Path finding and triangle counting showed no significant pairwise difference.
- The miniature had the least head motion and was the favorite for counting triangles (11 first
  choices), but rated the most disorienting and felt shaky. Teleport drew 13 negative comments and
  2 positive; its fade disoriented people.
- Novices walked instead of using the technique and nearly hit walls or a desk.

Limits: mixed VR experience, small tracked space, social networks only.

### Huang, Pfister and Yang 2023: is embodied interaction beneficial?

20 undergraduates compared 2D with a mouse, 3D with a mouse, 3D with a trackball, and VR on a
Quest 2 with two-hand grab, pinch zoom and walking. Graphs had 8 to 100 nodes.

- 2D and desktop 3D did not differ significantly on time or accuracy, but 2D took more effort.
- Counting triangles: VR 62.5% correct against 32.5% for desktop 3D and 17.5% for 2D.
- VR was slower on common neighbors (87.0 s against 58.5 s and 63.4 s) and far slower at finding
  differences between two side-by-side graphs (276.8 s), where the two copies were seen from
  mismatched angles. The paper gives the desktop 3D common-neighbor time as both 50.1 s and
  58.5 s (p. 8).
- 14 and 16 of 20 ranked VR first for the neighbor and triangle tasks.

Limits: each condition bundles display and input; small graphs; students only; pan and zoom only.

### Kotlarek et al. 2020: mental maps in immersive network visualization

20 people compared a 30 inch monitor with a room-scale Vive Pro on the same layout (rotation
removed in both; in VR people walked around).

- 2D was faster on all three tasks: path 49.26 s against 67.81 s, memory 31.92 s against 50.70 s,
  change 58.86 s against 71.69 s.
- Path accuracy was higher in 3D (0.950 against 0.806), but only because of the 4,941-node power
  grid (0.893 against 0.500); the smaller graphs did not differ.
- Memory was better in 2D (0.951 against 0.923). Change detection did not differ significantly in
  accuracy (0.804 against 0.756, p = 0.458).
- 17 of 20 preferred 3D. People lost targets after changing their point of view, and asked for a
  2D overview and mouse precision alongside VR. Selection used a cone of about 2 degrees.

Limits: bundled conditions, fixed task order, short viewing times.

### Feyer et al. 2024: 2D, 2.5D or 3D for multilayer networks in VR

22 people in a Valve Index compared three ways of arranging the layers of a multilayer network:
one plane, a stack of planes, and a hemisphere, at 3 and 7 layers. No graph manipulation; people
moved their heads and bodies.

- People spent about 43.5 minutes on tasks and moved their heads about 320 m.
- No arrangement was best overall. On large networks the stack, which forced walking, was slowest
  (138.9 s and 24.82 m against 64.94 s and 4.72 m for the plane on one task).
- Density judgments were more accurate on flat layouts (error 0.09 against 0.36 in 3D on large
  networks). Most error differences were descriptive rather than significant.
- 64% found movement high in the stack; 6 of 28 recruits were excluded, partly for headset fit.

Limits: floor effects, no interaction, no desktop condition.

### McGuffin, Servera and Forest 2022: path tracing in 2D, 3D and physical networks

A preregistered study: 34 people in an HTC Vive held a 70-node network in the non-dominant hand
and reported shortest-path lengths. The 2D layout was the 3D layout projected flat.

- 3D had lower error than 2D on paths of length 2-4 (p < 0.0000005).
- Highlighting by hovering a mouse cursor gave only limited evidence of help (p < 0.09), none in
  3D, and 14 of 34 described 3D highlighting negatively.
- Most view rotation came from the hand, not the head.
- A second study (12 people) compared a touchable 3D print seen through a HoloLens with virtual
  3D: no evidence of an error difference, AR slower, all 12 preferred VR. People touched path
  nodes to hold their place (9 of 12).
- The authors propose "sticky" and "slippery" marks set by different finger pinches, and a hybrid
  layout that is 2D overall and 3D where paths are traced.

Limits: no desktop condition, one 70-node graph family, one task.

### Kraus et al. 2020: the impact of immersion on cluster identification

18 people counted clusters in 3D scatterplots: a static 2D scatterplot matrix, desktop 3D with
mouse rotation, VR at table scale (a 1 m cube) and VR at room scale (a 3 m cube to stand in).

- The static 2D matrix was worst (median error 16.67%); desktop 3D (median 14.29%) and the two VR
  conditions (median 0%) had no significant pairwise difference.
- Mean times: desktop 3D 61.79 s, table 72.14 s, room 75.19 s, 2D 90.12 s; no pairwise difference.
- Table and room did not differ in error, but room scale needed 32.20 m of walking against
  16.77 m, recall error was 20.42% against 0% (about 4 people each), 9 people named poor overview
  as a drawback, and sparse clusters were dismissed as noise mostly at room scale.
- Preferred: table 50%, desktop 3D 33.3%, room 16.7%, 2D 0%.

Limits: points without edges, a static 2D condition, small sample for the side factors.

### Whitlock, Smart and Szafir 2020: graphical perception for immersive analytics

42 people read values from color, size, height, orientation and depth on a 4K monitor, in a Vive,
or in a Vive with video passthrough (each person used one display).

- No main effect of display on error or time.
- Color over passthrough had about double the error (5.53% against 2.89% and 2.51% desktop and
  2.05% VR, in one plot type). Size was read worse on the desktop (9.67% against 3.27% in VR).
- Orientation was the worst channel. Depth and height were slower on the desktop.
- Passthrough users moved and rotated more. People pointed fingers to hold points.

Limits: preliminary, one color ramp, 720p passthrough, scatterplots not graphs.

### Joos et al. 2025: survey of visual network analysis in immersive environments

A systematic survey of 138 papers from 1993-2024: 87 applications and 59 studies.

- Participants per study 3-60, mean 20.04. Graph sizes 5-7,885 nodes, median 120; only 3 studies
  span all four size classes, and only 1 is about scalability.
- 48 of 53 analysis-task studies tested topology; memory 6, change detection 5.
- 4 of 87 applications run algorithms; 17 of 87 have accessible code; speech was evaluated in 2
  studies; no study tested a purely egocentric layout.
- The survey reads the literature as saying motion cues help more than stereo.

### Joos et al. 2024: node selection techniques in VR

18 mostly novice people, seated in a Valve Index, selected one highlighted node in graphs of 50,
120 and 200 nodes with six techniques.

- Ray: 16.60, 12.48 and 20.84 s. Touch: 19.60, 15.84 and 58.33 s, with 17.82 m of movement at the
  largest size. Filter plane: 21.83, 18.22 and 20.86 s, steady across sizes. Fisheye 17.32, 15.77,
  23.05 s. Neighborhood hopping 42.95, 36.30, 39.54 s.
- Ray was liked on uncluttered graphs (8.11 out of 10) and less so on cluttered ones (5.33); the
  filter plane went the other way (7.00 to 8.11). People asked to combine the filter with hopping.

Limits: accuracy not measured, single-node selection, small graphs.

### Lee et al. 2026: voice interaction for immersive network analysis

10 students on a Quest 3 explored a 788-node bullying and friendship network by voice. Speech went
through Whisper, then a language model that writes database queries.

- Core utterances: 100% pass, 99.0% correct queries. Held-out adversarial set: 89.8% pass. Requests
  outside the system's vocabulary: 50% pass; on these probes the model asked a clarifying
  question for 3 of 6 and "fabricated plausible queries" for the rest.
- Latency about 2.73 s including speech recognition, judged acceptable.
- All 10 preferred voice to typing; 6 of 10 found controller selection harder than speaking. Most
  stayed in place and expected the subgraph to be brought to them.
- The authors say the system lacks a cycle, path and centrality layer.

Limits: 10 students, qualitative, no timing of voice against controller.

### Takahira et al. 2026: immersive layouts of ego networks

24 mostly novice people on a Quest 2, in a web browser, compared four layouts around a central
person: cube, cylinder, floor disc and sphere, on 60-node networks.

- Judging the weakest of three ties: cube 96%, disc 100%, cylinder and sphere 71% (no pairwise
  test survived correction). Depth floating in space hurt this judgment.
- Counting clusters: cube and sphere beat the disc, but cube needed 1,062 m of movement.
- Preference: cylinder 42%, cube 29%. Disc and sphere were the most physically demanding, because
  turning in place caused fatigue and sickness, while walking felt natural.

Limits: small static networks, non-experts, layouts differ in several ways at once.

### Zimmermann and Bruckner 2025: multi-focus probes

A system paper with no user study, built on Babylon.js (the engine graphty-element uses). Spheres
placed in the graph copy the subgraph inside them into an editable view in front of the user;
cones and tunnels link each copy back to its origin. Demonstrated on a 95-node graph. The authors
say placing probes in dense regions is hard and an evaluation is future work.

### Joos et al. 2022: visual comparison of networks in VR

Read in full only to check whether comparison in a headset had been studied. 18 people in the main
study compared edge weights of two synthetic 40-node graphs (densities 8% and 16%) on an Oculus
Rift CV1. There was no desktop condition and no test of structural change.

## 4. What this means for graphty.app

### Design rules the evidence supports

1. **Never show 3D standing still.** A static 3D picture is as bad as 2D (Ware and Franck 1996).
   Keep stereo and head tracking on in the headset, and on the desktop never present a 3D layout
   without rotation. Stop automatic rotation the moment the user points, because it makes selection
   hard.
2. **Keep 2D available in the headset.** For well-separated structure, lookups and memory, 2D is
   more accurate or faster (Greffard 2011, Huang 2023, Kotlarek 2020). Participants asked for it
   (Kotlarek 2020).
3. **Prefer hand and table scale over room scale.** Same accuracy, better recall, half the walking
   (Kraus 2020); walking-heavy arrangements were slowest (Feyer 2024).
4. **Let the graph be held and rocked.** Hand rotation did most of the work in McGuffin 2022, and
   stereo users settle on a view and rock around it (Greffard 2014).
5. **Travel by short eased moves to data targets.** Hop node to node with an eased animation
   (Sorger 2021); do not fade-teleport or ask users to set a laser length (Drogemuller 2020). Keep
   a soft vignette on any smooth flight.
6. **Highlight, and lift toward the eye, before re-laying out.** Highlighting neighbors and
   dropping their redundant edges gave most of Sorger's gain; spreading neighbors around the head
   added little and raised false positives. Kwon 2016 moved highlighted nodes along the view ray
   so they stayed under the pointer.
7. **Always give a stable frame.** Orientation errors of 19-35 degrees after moving (Sorger 2021)
   and lost targets after viewpoint changes (Kotlarek 2020) mean every detail view needs a floor or
   horizon, a docked overview, bookmarks or a visited trail.
8. **Use a ray by default, a filter plane for dense graphs.** Ray selection was fastest on small
   graphs; the filter plane stayed steady as graphs grew; touch collapsed at 200 nodes (Joos 2024).
   A selection cone of about 2 degrees worked in Kotlarek 2020. Do not port desktop hover
   highlighting to a 3D cursor (McGuffin 2022).
9. **Watch density, not just node count.** Errors track links minus nodes (Ware and Mitchell,
   abstract). graphty-element can report that as a neutral fact; filtering edges probably helps
   more than filtering nodes.
10. **Over passthrough, protect color.** Color error about doubled over a real room (Whitlock
    2020). Offer a solid neutral backing behind the graph and a redundant channel. Avoid
    orientation as a value encoding.
11. **Keep content within comfortable neck range** (about 160 x 100-110 degrees seated, Kwon 2016)
    and reachable for short or seated users (Feyer 2024).
12. **Score accuracy first, and never trust preference alone.** Most 3D gains are in accuracy at
    a cost in time, and people prefer the headset whether or not it helps them (Greffard 2011,
    Kotlarek 2020).

### The prototypes, one by one

| Prototype                                                                       | Verdict                                 | Why                                                                                                                                                                                                                                                                           | What to measure, against what                                                                                                                                        |
| ------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Hand-held answer diorama                                                     | Strongly supported                      | Hand-held rotation gave the strongest headset result (McGuffin 2022); table scale beat room scale (Kraus 2020); VR won on whole-structure counting (Huang 2023). Supported as something to read, not as a camera remote (Drogemuller 2020)                                    | Path-length error at lengths 2-4 and community-count error by graph size; hand-versus-head rotation share; against desktop 3D with rotation and 2D on the same graph |
| 2. Direct graph manipulation (pull to expand, rubber-band paths, snip what-ifs) | Supported in parts, untested as a whole | Two-handed pulling was the fastest navigation (Drogemuller 2020); people touch nodes to hold their place (McGuffin 2022); sticky and slippery marks were proposed but never built. Lift and highlight beat re-layout (Sorger 2021, Kwon 2016)                                 | Time and correctness on robustness questions with known answers; interaction count; against a highlight-only control and a desktop with the same live recomputation  |
| 3. Walking along edges with signposts                                           | Supported for local topology            | Node-to-node hops halved path-following time with no orientation or sickness cost (Sorger 2021). Path finding was not helped without support, so the signposts are the experiment. Joystick hopping by proximity was slow (Joos 2024): hop only along real edges              | Path finding and path following time and correctness, pointing error after a move, sickness questionnaire; against free flight, signposts on and off                 |
| 4. Comparison lens (then and now)                                               | Open question, with a warning           | Two side-by-side 3D copies failed in a headset (Huang 2023); change detection was not better in 3D (Kotlarek 2020); memory suffers after viewpoint changes. Show both states in one frame; never rely on recall                                                               | Added and removed elements found, false alarms, time; against superimposed marks, an animated toggle, side-by-side, and the same designs on the desktop              |
| 5. Passthrough desk with keyboard and linked flat slab                          | Supported, with a color caution         | 2D is better for easy questions and lookups; participants asked for a 2D overview and mouse precision (Kotlarek 2020); a world-fixed mouse cursor worked seated (Kwon 2016). Color reading suffers over passthrough (Whitlock 2020)                                           | Accuracy and time over a mixed task session, and which tasks people move to the slab; against pure VR and pure desktop                                               |
| 6. Measure-space layouts                                                        | Warned                                  | Free-floating depth cut accuracy to 71% (Takahira 2026); density judgments were better flat (Feyer 2024); a fancy layout gave only a modest gain over highlighting (Kwon 2016). Anchor the measured axis to a reference plane and keep exact values flat                      | Error as a percent of the value range; against the same values on a flat chart and a highlight-only control                                                          |
| 7. Point-and-speak                                                              | Supported, with a hard rule             | All 10 preferred voice to typing (Lee 2026), but free-form query generation invented queries on unknown requests. Bind speech only to graphty-element's algorithm catalog and refuse anything outside it; budget about 2.7 s of latency                                       | Rate of invented operations and correct refusals on out-of-vocabulary probes; time in each input mode; against controller menus                                      |
| 8. Resting-hand pinches                                                         | Weak evidence either way                | Not tested for graphs; two-handed pulling caused the most body motion (Drogemuller 2020), so it does not belong here. Treat it as an input condition inside another study                                                                                                     | Fatigue and workload (including physical demand), error rate; against controller input on the same task                                                              |
| 9. Room-scale walking                                                           | Warned                                  | More walking, a lost overview, and no gain in accuracy (Kraus 2020, Feyer 2024, Kotlarek 2020, Takahira 2026). Novices walked into walls in a small space (Drogemuller 2020). Keep it a spike, with an always-available miniature overview and a cleared, boundary-aware area | Meters walked, head rotation, sparse structures dismissed, recall; against the table-scale diorama                                                                   |

### What every prototype test should include

- **The right control.** Desktop 3D with rotation, in the same browser engine, on the same graph,
  layout and seed. Beating static 2D proves nothing (Kraus 2020, Ware and Franck 1996).
- **Graph sizes across the survey's four classes** (up to 60, 61-120, 121-249, 250 or more nodes),
  and density (links minus nodes) varied at fixed size.
- **Accuracy split into misses and false positives**, and degree or count estimates as signed
  error (everyone underestimated degree in Sorger 2021).
- **Time on a log scale**, with answering time separated from exploring time (part of the 3D time
  in Kotlarek 2020 was play).
- **Movement from WebXR poses**, which the headset provides every frame: head travel and rotation,
  hand-versus-head rotation share (McGuffin 2022), viewpoint entropy and alternation (Greffard
  2014).
- **Comfort and workload**: the sickness questionnaire subscales and NASA-TLX, including physical
  demand.
- **VR experience as a covariate**, reported separately for novices and experienced users, and a
  plan for some headset-fit exclusions (6 of 28 recruits in Feyer 2024).

### Three corrections made to the VR interaction study

1. It said 3D needs motion "coupled to the head or hand". Ware and Franck found automatic rotation
   as good as either, so the claim became stereo plus any structured motion; coupling matters
   for selection, not reading.
2. It cited Whitlock 2020 for "exact values belong on text or flat charts". Whitlock found no main
   effect of display, and headsets did better for size, depth and height. That rule now rests on
   legibility and resolution sources and on Feyer 2024's density result.
3. It said 2D was better at change detection in Kotlarek 2020. 2D was faster; accuracy did not
   differ significantly (p = 0.458).

## 5. Where graphty could contribute new research

graphty has four things most earlier studies lacked: the same component renders the same graph on
a flat page, in desktop 3D and in a headset, so one factor can change at a time (Huang 2023 and
Kotlarek 2020 both name bundled conditions as their main weakness); seeded, repeatable test graphs
from graph-samples, in the families the classic studies used; a full algorithm catalog inside the
element; and head and hand poses every frame for free. It cannot claim "the first browser-based
study": Sorger 2021 and Takahira 2026 already ran in browsers. It can claim the first comparison on
a matched rendering stack.

In priority order, by how new the result would be against what it costs to build:

1. **Does Ware's error law hold on a current headset, and where do 2D, desktop 3D and VR cross
   over?** Path tracing and community counting at five sizes from about 50 to 1,000 nodes, with
   density varied at fixed size, on 2D, desktop 3D with rotation, VR with hand-held rotation and a
   2D layout in VR. Report the slope per condition and the ratio of slopes. Nothing has replicated
   the 1,000-node result on a consumer headset, McGuffin 2022 used 70 nodes and no desktop, and the
   survey found one scalability study. Cheapest to run, and it tells every later study which sizes
   to use. Check Quest 3 frame rate at 1,000 nodes first: Drogemuller 2020 could not hold 90 fps at
   3,000. Venue: IEEE VIS or TVCG, preregistered.
2. **Speech bound to the algorithm catalog.** First a technical evaluation on Lee 2026's protocol,
   comparing free-form query generation with calls that can only name catalog algorithms and must
   refuse anything else: does that eliminate invented operations, and what coverage does it cost?
   Then a user study of pointing plus speech against controller menus on real networks, scored by
   insights. Only 4 of 87 immersive applications run algorithms and only 2 studies evaluated
   speech; this is graphty's most distinctive contribution. Venue: CHI or IEEE VIS.
3. **Hold the graph or move through it.** A hand-held miniature you rotate and lift nodes out of,
   against node-to-node hops with signposts, against both linked by a cone back to the original
   (as in Zimmermann 2025), on 300-1,000 node graphs at two densities, with Sorger's task battery
   plus overview tasks and orientation probes. Zimmermann has no evaluation, McGuffin's gain is
   shown only at 70 nodes, and Kraus asks for an evaluated overview aid. Venue: IEEE VR or TVCG.
4. **Do signposts fix path finding during node-to-node travel?** Travel (flight against hops) by
   signposts (off against on: distance-from-here color, a direction cue, a visited trail). Sorger
   added these features after the study and never tested them. Can be folded into the previous
   study. Venue: SUI or IEEE VR.
5. **Comparing two states of a graph in the headset.** Superimposed marks, a hand-held lens, an
   animated toggle and side-by-side copies, each in the headset and on the desktop, for structural
   change (added and removed elements, a community splitting). Joos 2022 covered only edge weights
   on 40-node graphs with no desktop, and Huang's side-by-side task failed. Venue: EuroVis or VIS.
6. **Reading node and edge encodings on the desktop, in VR and over passthrough**, with a solid
   backing plate as a factor. Whitlock 2020 covered scatterplot points only. Cheap. Venue: IEEE VR
   or a VIS short paper.
7. **What-if editing: cut an edge and watch the results update**, by hand in VR against the same
   live recomputation on a desktop and against a menu workflow, on tasks with known answers. Not
   found in the literature; a clean task battery is what keeps it from reading as a systems paper.
   Venue: CHI or IEEE VIS.
8. **The desk hybrid**: graph above the desk, flat panel and keyboard below, over passthrough,
   against pure VR and pure desktop, logging when people switch. Partly covered by SeamlessVR and
   AR-desktop transition work, but not for node-link analysis with a live linked panel; the claim
   must stay narrow. Venue: CHI or ISMAR.
9. **Real analysts over weeks**: 6-10 analysts with their own data for 4-6 weeks, with opt-in
   logs, diaries and interviews. No longitudinal network study was found; participants are
   usually about 20 students in one session. Needs a stable product, so it comes last. Venue: CHI,
   a VIS design study, or the BELIV workshop.
10. **A reusable measurement kit and open pose data**: viewpoint entropy, alternation, hand-versus-
    head rotation share, travel per second and pointing error after a move, released with
    anonymized pose traces from the studies above. Nearly free once logging exists. Venue: BELIV,
    or a supplement to each paper.

Build order: shared infrastructure first (a trial runner that works on the desktop and in WebXR,
pose and event logging, frame-rate checks on Quest 3 at 1,000 and 5,000 nodes), then the scaling
study, then speech, then the hold-or-move and signpost studies, then comparison, encodings and
what-if editing, and the desk hybrid and long-term study last.

**Ideas that are not worth a paper.** Room-scale walking is already well covered and consistently
costs more than it gives. Resting-hand pinches, gaze plus pinch and hand tracking for 3D graphs
have prior work; use them as an input condition. Attribute-driven positioning is established.
"VR beats desktop" is not supported in general: any graphty paper should say on which tasks, above
which size, VR wins. Do not credit a new layout without a highlight-only control (Kwon 2016,
McGuffin 2022). Do not cite Ware and Mitchell's 1,000 nodes as an expected result.

## 6. Sources

Read in full:

- Ware, C. and Franck, G. Evaluating stereo and motion cues for visualizing information nets in
  three dimensions. ACM Transactions on Graphics 15(2), 1996, pp. 121-140.
  https://doi.org/10.1145/234972.234975 -- read from a scan at
  http://cs.brown.edu/courses/cs237/2000/1999/ware.pdf (some symbols garbled by OCR).
- Greffard, N., Picarougne, F. and Kuntz, P. Visual Community Detection: An Evaluation of 2D, 3D
  Perspective and 3D Stereoscopic Displays. Graph Drawing 2011, LNCS 7034, pp. 215-225.
  https://doi.org/10.1007/978-3-642-25878-7_21 (publisher PDF, free to read).
- Greffard, N., Picarougne, F. and Kuntz, P. Beyond the classical monoscopic 3D in graph analytics:
  an experimental study of the impact of stereoscopy. IEEE VIS 3DVis Workshop 2014.
  https://doi.org/10.1109/3DVis.2014.7160095 -- read as the submitted version at
  https://blogs.evergreen.edu/vistas/files/2015/02/grefard-stereoscopy-3dvisieeevis2014_submission_4.pdf
- Kwon, O.-H., Muelder, C., Lee, K. and Ma, K.-L. A Study of Layout, Rendering, and Interaction
  Methods for Immersive Graph Visualization. IEEE TVCG 22(7), 2016, pp. 1802-1815.
  https://doi.org/10.1109/TVCG.2016.2520921 -- read at https://kwon.io/resource/papers/kwon_tvcg2016.pdf
- Sorger, J., Arleo, A., Kan, P., Knecht, W. and Waldner, M. Egocentric Network Exploration for
  Immersive Analytics. Computer Graphics Forum 40(7), 2021. https://arxiv.org/abs/2109.09547
  (accepted manuscript).
- Drogemuller, A., Cunningham, A., Walsh, J., Thomas, B. H., Cordeil, M. and Ross, W. Examining
  virtual reality navigation techniques for 3D network visualisations. Journal of Computer
  Languages 56, 2020, 100937. https://doi.org/10.1016/j.cola.2019.100937 -- read at
  https://researchmgt.monash.edu/ws/files/298969984/298969574_oa.pdf
- Huang, H. H., Pfister, H. and Yang, Y. Is embodied interaction beneficial? A study on navigating
  network visualizations. Information Visualization 22(3), 2023.
  https://doi.org/10.1177/14738716231157082 -- read as the preprint https://arxiv.org/abs/2301.11516
- Kotlarek, J., Kwon, O.-H., Ma, K.-L., Eades, P., Kerren, A., Klein, K. and Schreiber, F. A study of
  mental maps in immersive network visualization. IEEE PacificVis 2020.
  https://arxiv.org/abs/2001.06462 (preprint).
- Feyer, S. P., Pinaud, B., Kobourov, S., Brich, N., Krone, M., Kerren, A., Behrisch, M., Schreiber,
  F. and Klein, K. 2D, 2.5D, or 3D? An exploratory study on multilayer network visualisations in
  virtual reality. IEEE TVCG 2024. https://arxiv.org/abs/2307.10674 (preprint; the supplement with
  most significance tests was not read).
- McGuffin, M. J., Servera, R. and Forest, M. Path Tracing in 2D, 3D, and Physicalized Networks. 2022. https://arxiv.org/abs/2207.11586 (preprint; error rates appear only in figures).
- Kraus, M., Weiler, N., Oelke, D., Kehrer, J., Keim, D. A. and Fuchs, J. The Impact of Immersion on
  Cluster Identification Tasks. IEEE TVCG 26(1), 2020. https://doi.org/10.1109/TVCG.2019.2934395
  (read as the authors' open-access copy in the University of Konstanz repository).
- Whitlock, M., Smart, S. and Szafir, D. A. Graphical Perception for Immersive Analytics. IEEE VR 2020. https://cmci.colorado.edu/visualab/3DPerception/3DPerception.pdf
- Joos, L., Fischer, M. T., Rauscher, J., Keim, D. A., Dwyer, T., Schreiber, F. and Klein, K. Visual
  Network Analysis in Immersive Environments: A Survey. 2025. https://arxiv.org/abs/2501.08500
- Joos, L., Durdu, U., Wieland, J., Reiterer, H., Keim, D. A., Fuchs, J. and Fischer, M. T.
  Evaluating Node Selection Techniques for Network Visualizations in Virtual Reality. ACM SUI 2024.
  https://doi.org/10.1145/3677386.3682102 (read from the authors' repository at bib.dbvis.de).
- Lee, S. Y.-T., Chen, H.-A., Yuniar, S., Bauer, D. and Ma, K.-L. A Design Study on Voice-based
  Interaction for Immersive Network Visualization and Analysis. IEEE VIS 2026.
  https://arxiv.org/abs/2607.26526 (preprint).
- Takahira, K., Fujiwara, T., Kam-Kwai, W., Shigyo, K., Yang, L., Natsukawa, H., Yang, Y. and Qu, H.
  Surrounded by Friends: Design and Evaluation of Immersive Layouts of Egocentric Network for
  Visual Analytics. ACM SUI 2026. https://doi.org/10.1145/3822518.3830041,
  https://arxiv.org/abs/2608.27194 (preprint).
- Zimmermann, E. and Bruckner, S. Multi-Focus Probes for Context-Preserving Network Exploration and
  Interaction in Immersive Analytics. 2025. https://arxiv.org/abs/2507.01140 (preprint).
- Joos, L., Jaeger-Honz, S., Schreiber, F., Keim, D. A. and Klein, K. Visual Comparison of Networks
  in VR. IEEE TVCG 28(11), 2022, pp. 3651-3661. https://d-nb.info/1273230957/34

Abstract only:

- Ware, C. and Mitchell, P. Visualizing graphs in three dimensions. ACM Transactions on Applied
  Perception 5(1), 2008, article 2. https://doi.org/10.1145/1279640.1279642 -- the publisher
  refused access and the listed open copy no longer exists; abstract at
  https://scholars.unh.edu/ccom/467

Checked only to see whether a research idea had been done (abstract or summary only):

- Song et al. Embodied NLI: speech input patterns in immersive analytics. https://arxiv.org/abs/2510.12156
- Sorger et al. Immersive Analytics of Large Dynamic Networks via Overview and Detail Navigation.
  https://arxiv.org/abs/1910.06825
- Bauer et al. A Multi-Layout Design for Immersive Visualization of Hierarchical Network Data.
  ISMAR 2024. https://www.computer.org/csdl/proceedings-article/ismar/2024/164700b038/22eZWnw3lYs
- SeamlessVR. TVCG 2025. https://www.cs.purdue.edu/xrlab/assets/pdf/SeamlessVR25.pdf
- A Design Space for Visualization Transitions in Hybrid AR-Desktop Environments.
  https://arxiv.org/abs/2506.22250
- Analyzing User Behaviour Patterns in a Cross-Virtuality Immersive Analytics System. TVCG 2024.
  https://dl.acm.org/doi/10.1109/TVCG.2024.3372129
- Habibi and Chattopadhyay. Bimanual Mid-Air Multi-Object Manipulation of Graph Data. CHI EA 2026.
  https://doi.org/10.1145/3772363.3798391
- Capece et al. Evaluation of VR Interaction Techniques: the case of 3D Graph.
  https://arxiv.org/abs/2302.05660
- microGEXT: Microgestures for Text Editing in VR. https://arxiv.org/abs/2504.04198
- Pfeuffer et al. Gaze + pinch interaction in virtual reality. 2017.
  https://www.researchgate.net/publication/320312970_Gaze_pinch_interaction_in_virtual_reality
- VRNetzer. Nature Communications 2021. https://www.nature.com/articles/s41467-021-22570-w
- Immersive analytics with HMDs and CAVEs: 3D graph interaction.
  https://www.sciencedirect.com/science/article/pii/S1524070326000160
- TADA: node-link diagrams for blind and low-vision people. https://arxiv.org/abs/2311.04502
- Attribute Driven Positioning. https://vdl.sci.utah.edu/mvnv/techniques/attr-driven/
- DP-LENS. ISMAR 2026. https://arxiv.org/abs/2607.27697

The downloaded PDFs, extracted text and per-paper reading notes are in `tmp/vr-papers/` (not
checked in).
