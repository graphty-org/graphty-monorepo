**Prototype 8: Grip and Tool**

_The idea in one line:_ shape your hand as if you were holding a tool, and that tool appears in your hand. Then use it. **The gesture loads the tool, and the tool does the work.** There's no pegboard, belt or menu to fetch tools from: your hand shape is the tool picker, and each grip mimics how you'd hold the real thing.

**How it differs:**

| Layer          | This prototype                                                                                                           | Compared with                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Mode model** | **Tools,** loaded by a grip gesture                                                                                      | 4 and 6 fetch tools from a belt or pegboard. 7 uses signs as modes, not as tools |
| **Navigation** | **The off hand holds the graph's stand** like a handle and turns it. The dominant hand never navigates                   | Grabbing in 1 to 3, a turntable in 6                                             |
| **Selection**  | **The Claw** picks nodes up; the **Scoop** gathers a neighborhood                                                        |                                                                                  |
| **Menus**      | **None.** About 8 grips are the tool picker. Each tool's few settings sit on the tool itself                             |                                                                                  |
| **Parameters** | **Physical controls on the tool,** turned by the off hand, and **how wide the grip is open,** for example a scoop's size |                                                                                  |
| **Feedback**   | **On the tool:** a small readout on the tool body. Results and states appear on the graph and as objects beside it       |                                                                                  |

**Setup:** a solid background in full VR, with the graph on a small stand at chest height about 60 cm away. **Hands only,** on Meta Quest, Samsung Galaxy XR or Apple Vision Pro, recognizing grips from WebXR hand joints, as in prototype 7.

**The grips:** form the grip with your dominant hand and hold it for a beat. The tool fades into your hand.

| Grip, shaped like holding...                        | Tool that appears | What the tool does                                                                            |
| --------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| **A pointer:** index finger out                     | **Probe**         | Point at things; their values show on the probe's readout                                     |
| **A claw:** fingers curled as if around a ball      | **Claw**          | Close it on a node to pick it up into your selection. Close and sweep to pick up several      |
| **A scoop:** hand cupped                            | **Scoop**         | Dip it into the graph at a node to gather its neighborhood. Cupping deeper takes more hops    |
| **A spray can:** fist, thumb resting on top         | **Spray can**     | Press your thumb down to spray: color by the loaded attribute                                 |
| **Scissors:** index and middle finger spread        | **Shears**        | Close the fingers on edges or nodes to cut them out of view, as a filter                      |
| **Calipers:** thumb and index in a C                | **Calipers**      | Touch two nodes for the path and distance between them. Open them wide to set a range         |
| **A pen:** thumb, index and middle pinched together | **Pen**           | Touch a node to start a note                                                                  |
| **A lens:** thumb and index in a ring               | **Lens**          | Hold it up to see through it a second state: an algorithm's result, or what-if without a node |
| **A flat hand, shaken once**                        | Tool put away     | Back to an empty hand                                                                         |

**The off hand:**

| Off-hand action                                                | Meaning, everywhere                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Holding the graph's stand**                                  | Turn and tilt the graph like a model on a base. Letting go leaves it where it is                             |
| **Turning a knob** on the held tool (pinch the knob and twist) | Change the tool's setting: the spray's color scale, the shears' threshold, the scoop's limit                 |
| **Touching a tag to the tool**                                 | Load an attribute into it. Tags appear beside a node when you probe it; you pinch one off, as in prototype 6 |
| **Palm up**                                                    | Shows your **selection tray** (what's selected) and, above it, the **history strip**                         |
| **Pinching the newest history entry and flicking it away**     | Undo. Flicking an older entry undoes back to it                                                              |

**Algorithms,** the one place a choice from many is unavoidable:

- **The Lens grip.** With the Lens in hand, the off hand counts fingers: 1 to 5 picks one of your five favorite algorithms.
- **The rest of the catalog:** pinch the lens's rim and rotate it through families. The lens shows each result before you commit.
- **Committing:** a squeeze (closing the ring) keeps the run.

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph on its stand, and a ghost hand beside it demonstrating three grips: pointer, claw and spray. A hint says "Shape your hand like a tool."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** reach your off hand to the stand under the graph and grip it. Turn your wrist to spin the graph and tilt it to see underneath. Move your off hand forward or back to bring the graph closer.
- **Controls:** off-hand grip on the stand. Your dominant hand stays free for tools.

**Step 3. Find the Medici.**

- **What you do:** make the **pointer** grip, and the Probe appears. Sweep it across the graph; its readout names what it touches, "Medici, degree 6".
- **To pick it:** switch to the **claw** grip and close it on the Medici.
- **What you see:** the Medici lifts slightly and appears in your selection tray when your off-hand palm is up.
- **Searching by name:** this scheme has no text. The Probe's readout has a "find" knob that steps through names alphabetically, which is fine for 15 families but slow for large graphs.
- **Controls:** two grips, a close.

**Step 4. Who they married into.**

- **What you do:** make the **scoop** grip and dip the scoop into the graph at the Medici. A shallow cup takes 1 hop; the readout says "6", and the six families glow inside the scoop's rim. Lift the scoop out to add them to your selection.
- **For 2 hops:** cup your hand deeper before lifting.
- **What you see:** "7 selected".
- **Controls:** a grip, a dip, a lift. How deep you cup is the number.

**Step 5. Who matters most.**

- **What you do:** make the **lens** grip. Count **one** with your off hand, and slot 1 is PageRank. Look through the lens at the graph: nodes inside it are sized by PageRank, as a preview. Squeeze the ring closed to run it for the whole graph.
- **What you see:** a ranking card stands beside the graph.
- **Controls:** a grip, a finger count, a squeeze.

**Step 6. Read the result.**

- **What you do:** pointer grip again. The Probe's readout now shows PageRank too: "Strozzi 0.088, #3". Point the probe at a name on the ranking card and close it into a claw to select that family.
- **Controls:** the same Probe and Claw, used on the result card.

**Step 7. Color and size by PageRank.**

- **What you do:** probe any node. Its tags hang beside it; pinch the **PageRank** tag off with your off hand. Make the **spray can** grip, touch the tag to the can, and it loads. Press your thumb and sweep across the graph.
- **What you see:** the graph colors by PageRank, and a layer chip appears on the stand's rim.
- **Size:** turn the can's top knob from "color" to "size" and spray again.
- **Spraying only some families:** spray only over those, as in prototype 6.
- **Controls:** a tag, a grip, a thumb press. A knob on the can switches color, size or labels.

**Step 8. Keep only the strong families.**

- **What you do:** load the PageRank tag into the **shears** grip. A threshold knob on the shears, turned with your off hand, sets "0.070". Close the shears once in the air.
- **What you see:** everything below 0.070 is cut away, fading, as a filter step. The step appears as a chip on the stand's rim; pinch the chip to reopen it.
- **Controls:** load, turn, snip.

**Step 9. Write a note.**

- **What you do:** make the **pen** grip and touch the Strozzi node. A note card opens. Write in the air with the pen, as handwriting that's recognized, or press the card's dictation button.
- **What you see:** a pin on the node.
- **Controls:** a grip, a touch, handwriting or dictation. The pen is the only text tool.

**Step 10. Undo a mistake.**

- **What you do:** turn your off-hand palm up. The history strip floats above your palm: "spray PageRank", "shears 0.070"... Pinch the newest entry and flick it away. Flicking an older one undoes back to it.
- **Controls:** palm up, pinch and flick.

**Step 11. Save.**

- **What you do:** make the **pen** grip and sign the history strip, as if signing a document. That saves the project.
- **Naming a new project:** write the name with the pen.
- **Controls:** a grip and a signature.

---

**Advanced journeys:**

- **A compound rule:** cut with the shears, then cut again with a second tag loaded, and each cut adds a step: AND. For OR, hold two tags against the shears at once before cutting. Rules beyond two or three conditions get awkward.
- **Tuning algorithm options:** the lens has an outer ring for each option (damping, weight), turned by the off hand while you look through it. The preview updates live.
- **Comparing two runs:** look through the lens with one result loaded while a second result card is selected, and the lens shows the difference. This is the lens's natural job: "this state, seen through another".
- **Reordering layers:** pinch the layer chips on the stand's rim and slide them along it.
- **Recipes:** pinch a run of history entries and pull them off the strip together, and they become a recipe card. Spraying a recipe card onto another graph replays it.
- **Paths:** the **calipers** touch two nodes to show the path; opening them wider asks for alternative routes.
- **Joining tables:** not here.

**How it scales:**

- **About eight grips are all the tools there will ever be.** Grips have to be distinct shapes, and a hand has only so many. New capabilities must fit inside an existing tool, as a knob, a tag or a lens setting, rather than as a new grip.
- **Algorithms scale through the lens:** five favorites by finger count, then families on its rim.
- **Attributes come from tags, like prototype 6,** so any number of attributes is fine.
- **Plugins** add lens entries or tag types, never grips.

**On each device:**

|                  | Quest                                                                                      | Galaxy XR | Vision Pro                                               |
| ---------------- | ------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------- |
| Grip recognition | From WebXR hand joints                                                                     | Same      | Same. Fine shapes such as pen versus claw need measuring |
| Controllers      | Not used. A controller version would replace grips with a tool wheel, which loses the idea | Not used  | Not used                                                 |

**Why it should work:**

- **Nothing to fetch or search.** The tool is always in your hand within a second.
- **Grips are memorable,** because they copy how you'd hold the real object: spray can, scissors, pen.
- **It combines the strengths of 6 and 7.** It has the visible, physical tools of the Workshop without walking to a pegboard, and the speed of hand shapes without arbitrary signs to memorize.
- **It's natural for repeated work:** keep the spray can and color three subsets in a row.

**What it would teach us:**

- whether hand shapes that mimic real tools are easier to learn and remember than arbitrary signs, the direct comparison with prototype 7;
- whether the tool appearing in your hand feels reliable, or whether misrecognized grips summon the wrong tool;
- whether two-handed work (dominant hand uses, off hand adjusts and holds the graph) is comfortable over 20 minutes;
- how much of graphty fits into eight tools before the scheme strains.

**Known risks:**

- **Grip confusion:** claw versus scoop, or pointer versus pen, under imperfect hand tracking. The ghost preview of the tool before it fully appears gives a chance to correct it.
- **Accidental summoning,** when you just move your hand naturally. The beat of holding the grip, and a short animation before the tool appears, guard against this.
- **No real text.** Air handwriting and dictation are both weak, so finding and notes stay limited.
- **The off hand carries a lot:** the stand, knobs, tags and the tray. That needs careful testing for fatigue.

**All eight prototypes:**

| Layer      | 1                    | 2                    | 3                    | 4                  | 5               | 6                  | 7              | 8. Grip and Tool                  |
| ---------- | -------------------- | -------------------- | -------------------- | ------------------ | --------------- | ------------------ | -------------- | --------------------------------- |
| Mode model | Select, then command | Select, then command | Select, then command | Tools (belt)       | Edit properties | Tools (pegboard)   | Sign chords    | **Tools, loaded by grip**         |
| Navigation | Grab                 | Grab, or voice       | Grab                 | Graph comes to you | Miniature       | Turntable and lens | Fists          | **Off hand on the stand**         |
| Selection  | Pinch                | "This"               | Lasso                | Paint              | Query           | Tongs              | Point and fire | **Claw and scoop**                |
| Choosing   | Palette              | Speech               | Flicks               | Radial and rack    | Panels          | Tags and pegboard  | Signs          | **Grips, tags and lens**          |
| Parameters | Sliders              | Speech               | Twist                | Dial               | Typing          | Knobs              | Finger counts  | **Knobs on the tool, grip depth** |
