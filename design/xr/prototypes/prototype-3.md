**Prototype 3: Gesture Grammar**

_The idea in one line:_ no palette, no voice, no panels to press. You act on the graph with a small vocabulary of hand gestures. Commands are marking menus, flicked in a direction from the thing you selected. Beginners see the menu appear; experts flick without looking.

**Setup:** the same as before. A solid background in full VR, the graph at chest height about 70 cm away, and Meta Quest, Samsung Galaxy XR or Apple Vision Pro, hands first.

**The gesture vocabulary, ten gestures in all:**

| Gesture                                                | Meaning, everywhere                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Point and pinch** (dominant hand)                    | Select the thing pointed at. Pinching empty space clears the selection                                                                                 |
| **Pinch and draw a loop** around nodes                 | Select everything inside the loop                                                                                                                      |
| **Pinch, hold and flick** in one of 8 directions       | Run a command on the selection, as a marking menu. Hold still for half a second and the menu appears around your fingertip, so you can see the choices |
| **Pinch and twist** your wrist, like turning a dial    | Change a number (hops, threshold, range). The value floats beside your fingers                                                                         |
| **Pinch a node and pull it away** from the graph       | Expand its neighborhood. Each 10 cm of pull adds one hop                                                                                               |
| **Off-hand thumb tap** on the side of the index finger | Confirm, or "yes, do it"                                                                                                                               |
| **Off-hand thumb swipe back** along the index finger   | Undo. Swipe forward to redo                                                                                                                            |
| **Off-hand palm flat, pushed down**                    | Cancel or dismiss whatever is open                                                                                                                     |
| **Both hands pinch** on empty space and pull           | Move, scale or turn the graph, as in prototypes 1 and 2                                                                                                |
| **Off-hand two-finger tap** on the dominant wrist      | Bring up the system keyboard, the only text route                                                                                                      |

**The marking menu:** the 8 directions are always the same:

| Direction  | Command group                        |
| ---------- | ------------------------------------ |
| Up         | **Explore** (neighbors, path, frame) |
| Down       | **Note**                             |
| Left       | **Hide or filter**                   |
| Right      | **Analyze**                          |
| Up-right   | **Paint** (color, size, labels)      |
| Down-right | **Details**                          |
| Down-left  | **Pin**                              |
| Up-left    | **Project** (save, open, export)     |

Flicking a group opens a second ring of eight; for example, Analyze then the PageRank direction. The items you use most get the stable positions. Because the menu always opens on the selected object, the object-first model holds: the menu's contents depend on what you flicked from.

**Feedback lives on the graph,** not on panels:

- the selected node gets a ring;
- numbers float beside your fingertip while you twist;
- results show as small labels on nodes;
- one ranking column appears to the right of the graph when a result is a ranking.

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph appears, with a one-time hint card that animates three gestures: pinch to select, hold to see the menu, swipe your thumb back to undo. Tap your off-hand thumb to dismiss it.
- **Controls:** a thumb tap.

**Step 2. Get oriented.**

- **What you do:** pull with both hands to scale, and pinch empty space with one hand and drag to turn the graph.
- **Controls:** the same as in the earlier prototypes.

**Step 3. Find the Medici.**

- **If you can see it:** point and pinch on the big central node.
- **If you need to search:** two-finger tap your wrist. The system keyboard appears; type "Med", and matching nodes glow in the graph, with the best match ringed. A thumb tap selects it.
- **What you see:** a ring on the Medici, and the graph turns to face it.
- **Controls:** pinch, or a wrist tap, the keyboard and a thumb tap. Text is deliberately the weakest part of this scheme.

**Step 4. Who they married into.**

- **What you do:** pinch the Medici and pull your hand away from the graph. At 10 cm a "1 hop: 6" label appears and the six neighbors light up; let go to select them.
- **To change the depth:** pull to 20 cm for 2 hops.
- **Alternative:** pinch-hold, flick **up** to Explore, then flick to **Neighbors**.
- **What you see:** "7 selected".
- **Controls:** a pinch and pull, where distance is the number. Or the marking menu.

**Step 5. Who matters most.**

- **What you do:** pinch-hold on empty space, which means "the whole graph", then flick **right** to Analyze and flick to **PageRank**.
- **What you see:** a ring of progress around your fingertip. When it's done, a ranking column appears to the right of the graph: Medici 0.146, Guadagni 0.098, Strozzi 0.088...
- **Controls:** two flicks. An expert does it in under a second without the menu showing.

**Step 6. Read the result.**

- **What you see:** point at any node and its PageRank shows beside it as a small label.
- **What you do:** pinch a name in the ranking column to select that family, or loop-draw around the top five names in the column to select them.
- **Controls:** pointing and pinching, which you already know.

**Step 7. Color and size by PageRank.**

- **What you do:** pinch-hold on empty space, flick **up-right** to Paint, then flick to **Color by**. A ring of attributes appears, with the most recent result first, so flick to PageRank. Repeat with **Size by**.
- **What you see:** the graph recolors and resizes at once, and a small color key appears under the ranking column.
- **To adjust the color range:** pinch the key and twist.
- **Controls:** flicks, plus a twist for the range.

**Step 8. Keep only the strong families.**

- **What you do:** pinch-hold on empty space, flick **left** to Hide or filter, then flick to **By PageRank**. A threshold value appears at your fingertips; twist your wrist to raise it.
- **What you see:** families below the threshold fade live as you twist. The value reads 0.070. Tap your off-hand thumb to commit it as a filter step.
- **Controls:** flicks, a twist for the number, a thumb tap to confirm.

**Step 9. Write a note.**

- **What you do:** pinch-select the Strozzi family, pinch-hold, flick **down** to Note. The system keyboard appears; type "check the 1434 exile date", then tap your off-hand thumb.
- **What you see:** a pin appears on the node. Pinching the pin shows the note text beside the node; flicking **down** on it again edits it.
- **Controls:** a flick, the keyboard, a thumb tap.

**Step 10. Undo a mistake.**

- **What you do:** swipe your off-hand thumb back along your index finger. Each swipe is one step back.
- **What you see:** each undo flashes the name of what was undone near the graph: "Undid: filter PageRank 0.07". To jump further, swipe back and hold, then twist your wrist to scrub through history; release to stay there.
- **Controls:** a thumb swipe, or swipe-and-hold plus a twist.

**Step 11. Save.**

- **What you do:** pinch-hold on empty space, flick **up-left** to Project, then flick to **Save**. A new project asks for a name by keyboard; otherwise it saves at once.
- **What you see:** "Saved".
- **Controls:** two flicks.

---

**On each device:**

| Action                | Quest / Galaxy XR, hands               | Quest / Galaxy XR, controllers            | Vision Pro                                                                                                            |
| --------------------- | -------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Select                | Point and pinch                        | Trigger                                   | Look and pinch                                                                                                        |
| Marking menu          | Pinch-hold and flick                   | Hold the trigger and flick the thumbstick | Pinch-hold and move your hand                                                                                         |
| Twist dial            | Pinch and twist your wrist             | Turn the thumbstick                       | Pinch and twist                                                                                                       |
| Pull to expand        | Pinch and pull                         | Hold the trigger and pull back            | Pinch and pull                                                                                                        |
| Confirm / undo / redo | Thumb tap or swipe on the index finger | A button / B button / Y button            | Thumb tap on finger, if tracking is good enough; otherwise a short off-hand pinch for confirm and a long one for undo |
| Keyboard              | Two-finger wrist tap                   | X button                                  | Two-finger wrist tap                                                                                                  |

**Why it should work:**

- **Marking menus are among the best-studied fast command techniques.** Beginners get a visible menu; experts flick from muscle memory. The same gesture works whether or not you look.
- **The hands stay low and close.** Flicks and twists are small motions near the body, so there's less arm fatigue than reaching for panels.
- **Gestures are directly about the data.** Pulling a node gives its neighborhood, twisting sets a number, drawing a loop selects a region.
- **Nothing to manage:** no palette to hold, no panels to place. The graph is the whole interface.

**What it would teach us:**

- whether eight directions per ring are learnable for graphty's command set, and how quickly people become fast;
- whether pinch-and-twist dials are precise enough for real thresholds, such as 0.070 against 0.075;
- whether thumb gestures on the off hand are reliable with today's headset hand tracking;
- how badly the lack of text hurts finding and notes, which is a measure of how much a scheme needs a typing route.

**Known risks:**

- **Thumb-on-finger gestures are new for browsers.** We would recognize them ourselves from hand-joint data, and accuracy varies by headset.
- **Discoverability:** gestures are invisible until learned. The half-second menu reveal and the first-run hint card are the only teaching.
- **Deep command sets** (60 algorithms) don't fit in rings of eight; "More..." becomes a scrolling ring.
- **Text entry relies on the system keyboard,** the weakest link.

**How the three differ:**

|                          | 1. Palette Hand                | 2. Point and Say                 | 3. Gesture Grammar                    |
| ------------------------ | ------------------------------ | -------------------------------- | ------------------------------------- |
| Commands                 | A palette held in the off hand | Spoken sentences                 | Flicked marking menus                 |
| Numbers                  | Sliders                        | Spoken numbers                   | A wrist twist                         |
| Expanding a neighborhood | Poking a button                | "neighbors"                      | Pulling the node away                 |
| Undo                     | A button on the palette        | "undo"                           | A thumb swipe                         |
| Text                     | Keyboard or dictation          | Dictation                        | Keyboard only                         |
| What stays on screen     | The palette and torn-off cards | The command bar and result cards | Almost nothing; feedback on the graph |
