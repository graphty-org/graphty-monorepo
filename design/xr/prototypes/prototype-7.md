**Prototype 7: Hand Signs**

_The idea in one line:_ the whole app runs on held hand shapes, the kind Handy.js recognizes from WebXR hand-tracking joints: a fist, a point, a V, a thumbs-up, horns, an OK sign, a flat palm, counting fingers. **Your off hand holds a sign that sets the mode. Your dominant hand points and "fires" to apply it.** Numbers come from counting fingers. No controllers, no voice, no panels to press.

**How it differs, layer by layer:**

| Layer          | This prototype                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Chords:** an off-hand sign (what to do) plus a dominant-hand action (what to do it to). Holding a sign is the mode; relaxing the hand ends it          |
| **Navigation** | **Fists:** two fists pull to scale and move the graph; one fist rolls to turn it                                                                         |
| **Selection**  | **Point and fire:** aim with an extended index finger, then drop your thumb, like a finger gun, to select                                                |
| **Menus**      | **None as such.** The off-hand sign is the command. Where a choice is needed, a small ring appears around your dominant hand only while the sign is held |
| **Parameters** | **Counting fingers** (1 to 5 per hand, up to 10 with both) for whole numbers. **Fist roll** for continuous values                                        |
| **Feedback**   | **A sign hint** floats beside your off hand, saying what the current sign means here. Results appear on the graph and on a single result card            |

**Setup:** a solid background in full VR, with the graph at chest height about 70 cm away. **Hands only,** on Meta Quest, Samsung Galaxy XR or Apple Vision Pro, using the browser's WebXR hand-joint tracking.

**The sign vocabulary:**

| Hand     | Sign                                                   | Meaning, everywhere                                                                   |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Dominant | **Point** (index extended)                             | Aim. A thin ray comes from your fingertip; what it hits is highlighted                |
| Dominant | **Fire** (point, then drop your thumb)                 | Apply. With no off-hand sign, that means select. Fire again on another node to add it |
| Dominant | **Point and sweep** while firing                       | Select everything you sweep across                                                    |
| Both     | **Fist**                                               | Grab the world. Two fists pull to scale and move; one fist rolls to turn              |
| Off      | **Open palm up**                                       | Show the cheat sheet: every sign and what it does right now                           |
| Off      | **V (two fingers)**                                    | **Explore:** fire at a node for its neighbors                                         |
| Off      | **Horns (index and pinky)**                            | **Analyze:** a ring of algorithms appears around your dominant hand                   |
| Off      | **Three fingers spread** (Vulcan split)                | **Paint:** color or size by an attribute                                              |
| Off      | **L shape** (thumb and index, like a gauge)            | **Filter:** set a threshold                                                           |
| Off      | **Flat hand, fingers together, like a writing tablet** | **Note mode**                                                                         |
| Off      | **Shaka** (thumb and pinky)                            | **Project:** save, open, export                                                       |
| Off      | **Count 1 to 5**                                       | A number: hops, top-N, or a choice on the ring                                        |
| Off      | **Thumbs up**                                          | Confirm                                                                               |
| Off      | **Thumbs down**                                        | Undo                                                                                  |
| Off      | **Flat palm out** ("stop")                             | Cancel or clear                                                                       |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph appears with a hint: "Turn your left palm up for the signs."
- **What you do:** turn your palm up, and a cheat sheet card shows the signs as small animated hands.
- **Controls:** palm up.

**Step 2. Get oriented.**

- **What you do:** make two fists and pull them apart to enlarge the graph, or move them together to shift it. Roll one fist to turn the graph.
- **Controls:** fists only. Relaxing your hands releases the graph.

**Step 3. Find the Medici.**

- **If you can see it:** point at the big central node, then fire.
- **If you need to search:** off hand in a **C shape** means Find. Fingerspell **M-E-D** with your dominant hand, using a small set of letter shapes that Handy.js-style matching can recognize. Matches glow; fire at the one you want.
- **What you see:** a ring on the Medici.
- **Controls:** point and fire, or the C sign plus fingerspelling. Search is the slowest part of this scheme.

**Step 4. Who they married into.**

- **What you do:** hold the **V** sign with your off hand, point at the Medici and fire.
- **What you see:** the six families light up and the sign hint shows "1 hop".
- **For 2 hops:** while still holding the V, change your off hand to **two fingers counted**, then fire again.
- **What you see:** "7 selected".
- **Controls:** a sign plus fire; counting changes the number.

**Step 5. Who matters most.**

- **What you do:** hold **Horns**. A ring of your five most-used algorithms appears around your dominant hand, with PageRank in the first slot. Either point at PageRank and fire, or count **one** with your off hand to pick slot 1.
- **To scope it:** firing at empty space means the whole graph; firing at a selected node means just the selection.
- **What you see:** a progress ring, then a ranking card stands beside the graph.
- **The whole catalog:** holding Horns with a fist-roll scrolls through families on the ring.
- **Controls:** a sign, then point and fire, or count.

**Step 6. Read the result.**

- **What you do:** point at any node, and its PageRank floats beside your fingertip. Point at a name on the ranking card and fire to select that family.
- **Controls:** pointing alone shows values; firing selects.

**Step 7. Color and size by PageRank.**

- **What you do:** hold the **three-finger** sign. A small ring of attributes appears around your dominant hand, with recent results first. Fire at **PageRank**. Thumbs up applies **color**.
- **Size:** hold three fingers again and fire at PageRank, then count **two** to choose size rather than color. Slot 1 is color, 2 is size, 3 is labels.
- **What you see:** the graph recolors and resizes, and the legend appears on the result card.
- **Controls:** a sign, fire, count, thumbs up.

**Step 8. Keep only the strong families.**

- **What you do:** hold the **L** sign and fire at PageRank on the attribute ring. A gauge appears between your off hand's thumb and index finger. **Roll your dominant fist** to turn the threshold up, and watch families below it fade. "0.070" shows on the gauge.
- **Finishing:** **thumbs up** commits the filter; **flat palm out** cancels.
- **Controls:** a sign, fire, a fist roll for the value, thumbs up to commit.

**Step 9. Write a note.**

- **What you do:** point at the Strozzi family and fire to select it. Hold the **flat tablet** sign, and three quick-note stamps appear: a flag, a question and a star. Fire at **question** to stamp a "check this" marker.
- **Free text:** fingerspell it. That's slow, so this scheme favors short tagged notes over prose.
- **Controls:** a sign, then fire at a stamp.

**Step 10. Undo a mistake.**

- **What you do:** make a **thumbs down** with your off hand for one step back. Hold the thumbs down and count fingers with your dominant hand to undo that many steps: three fingers undoes three.
- **What you see:** the hint names each undone step.
- **Redo:** thumbs up, while undo is the last action.
- **Controls:** signs only.

**Step 11. Save.**

- **What you do:** hold **Shaka**, then give a **thumbs up** to save.
- **Naming a new project:** fingerspell a short name, or accept the suggested "Florentine marriages 1" with a thumbs up.
- **Controls:** signs only.

---

**Advanced journeys:**

- **A compound rule:** hold **L** and set the first condition, give a thumbs up, then hold **L** again for the next. Consecutive conditions mean AND. Holding **L with the other hand making V** before committing means OR. It works for two or three conditions, but complex rules are where this scheme struggles most.
- **Tuning algorithm options:** while Horns is held on a run, counting picks an option slot (1 damping, 2 weight, 3 iterations), and a fist roll changes its value.
- **Comparing two runs:** fire at two result cards while holding the **two-finger count**, and a comparison card appears.
- **Reordering layers:** hold the three-finger Paint sign and point at the layer list on the result card. A fist grabs a layer and moves it up or down.
- **Recipes:** a two-handed sign, Shaka plus V, starts recording; repeating it stops. The recorded sequence becomes a recipe card.
- **Joining tables:** not here.

**How it scales:**

- **Rings show the five favorites,** and fist-roll scrolls through families. That handles the 60-algorithm catalog, but slowly.
- **New object types reuse the same signs:** V explores, three fingers paints, L filters. That reuse keeps the vocabulary at about 15 signs.
- **The vocabulary must stay small.** Each new sign is a new thing to learn and a new chance of confusing two shapes. A plugin would add ring entries, never signs.

**On each device:**

|                              | Quest                                                            | Galaxy XR | Vision Pro                                                             |
| ---------------------------- | ---------------------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| Hand-joint tracking in WebXR | Yes                                                              | Yes       | Yes, in Safari's WebXR                                                 |
| Sign recognition             | Computed from joint positions, Handy.js-style, by matching poses | Same      | Same. Precision and occlusion vary by headset, so this needs measuring |
| Controllers                  | Not used                                                         | Not used  | Not used                                                               |

**Why it should work:**

- **Nothing to look at to give a command.** Experts work entirely by feel, with their eyes on the data.
- **Chords keep the vocabulary small.** About ten off-hand signs times one firing action covers the whole journey.
- **Counting fingers is natural** for small numbers such as hops, slots and steps.
- **It works without controllers or voice on all three headsets.** Hands are the one input every headset shares.

**What it would teach us:**

- how reliably today's hand tracking tells apart signs like V and three fingers, or a point and a fire, at a desk with real lighting;
- whether people can learn about 15 signs, and how fast the cheat sheet stops being needed;
- whether holding a sign while acting is tiring in a 20-minute session;
- how far a pose-only scheme can go before it needs a text or list fallback. That's a measure of where gestures alone stop.

**Known risks:**

- **Recognition errors:** similar shapes, hands blocking each other, and the off hand drifting out of the cameras' view. A wrong mode could apply the wrong command, which is why there's always a preview and thumbs up to confirm destructive steps.
- **Text is the weakest link.** Fingerspelling is slow and hard to recognize, so finding and notes are deliberately limited.
- **Cultural meanings:** thumbs-up, OK and horns signs mean different things in different places. The set should avoid offensive signs and be remappable.
- **Fatigue:** holding the off hand up in a sign for long periods. Signs work held low near the lap, which is a requirement for tracking.

**All seven prototypes:**

| Layer      | 1. Palette           | 2. Say               | 3. Gestures          | 4. Tool Belt       | 5. Workbench         | 6. Workshop        | 7. Hand Signs                   |
| ---------- | -------------------- | -------------------- | -------------------- | ------------------ | -------------------- | ------------------ | ------------------------------- |
| Mode model | Select, then command | Select, then command | Select, then command | Tools              | Edit properties      | Tools only         | **Sign chords**                 |
| Navigation | Grab                 | Grab, or voice       | Grab                 | Graph comes to you | Miniature            | Turntable and lens | **Fists**                       |
| Selection  | Pinch                | "This"               | Lasso                | Paint              | Query and outline    | Tongs              | **Point and fire**              |
| Choosing   | Palette              | Speech               | Flicks               | Radial and rack    | Panels               | Tags and tools     | **Off-hand signs**              |
| Parameters | Sliders              | Speech               | Twist                | Dial and pressure  | Typing and scrubbing | Knobs and pulls    | **Finger counts and fist roll** |

One note: prototype 3 (Gesture Grammar) also uses hands only, but with motion: flicks, twists and thumb swipes. Prototype 7 uses static held shapes, which is the Handy.js style. It's worth building both, to find out which kind of gesture is more reliable and easier to remember.
