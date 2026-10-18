**Prototype 1: The Palette Hand**

_The idea in one line:_ your off hand holds the toolbox and your dominant hand does the work. Like Tilt Brush's palette, but its top face always shows the commands for whatever you've selected, so object-first carries straight into VR.

**Setup, fixed for every prototype**

- **Background:** solid color, full VR, no environment.
- **The graph:** floating at chest height about 70 cm in front of you, roughly 60 cm across.
- **Position:** seated or standing.
- **Devices:** Meta Quest, Samsung Galaxy XR or Apple Vision Pro. The primary design is hands only, since all three track hands; controller and Vision Pro mappings are at the end.

**The control vocabulary (the whole thing, five rules):**

| Gesture                                                      | Meaning, everywhere                         |
| ------------------------------------------------------------ | ------------------------------------------- |
| Dominant hand **points and pinches** at something far away   | Select it                                   |
| Dominant hand **pokes** something within reach (the palette) | Press a button                              |
| **Pinch and drag** on a slider, dial or card                 | Adjust it, or move it                       |
| **Both hands pinch** on empty space and pull                 | Move, scale or turn the graph               |
| Off hand **turned palm-up toward your face**                 | Show the palette. Lower the hand to hide it |

**The palette:** a card of about 20 x 14 cm floating just above the off-hand palm. It has four faces. Turning your wrist, or swiping across the palette with the dominant thumb, flips to the next face:

1. **Selection.** The commands for what's selected, or Find when nothing is.
2. **Analyze.** Algorithm tiles.
3. **Paint.** The style layers.
4. **Steps.** Filter steps and history.

A thin bar along the top of every face always shows **Undo**, **Redo** and **Project**.

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** you press "Enter VR" on the graphty page. The background turns solid gray-blue, and the families graph appears in front of you, drawn as already set up on the page. A small glowing hint over your left palm says "palm up for tools".
- **Controls:** none yet.

**Step 2. Get oriented.**

- **What you do:** pinch empty space with both hands and pull them apart to enlarge the graph. Pinch with one hand and drag to turn it like a turntable.
- **What you see:** labels for the larger nodes face you.
- **Controls:** a both-hands pinch moves the whole graph; a one-hand pinch on empty space turns it. Nothing else ever moves the graph, so you never lose your bearings.

**Step 3. Find the Medici.**

- **What you do:** turn your left palm up. With nothing selected, the Selection face shows a **Find** field. Poke it. Type "Med" on the headset's system keyboard, or poke the microphone and say "Medici". Matching names list on the palette; poke **Medici**.
- **What you see:** the Medici node gets a selection ring, the graph turns gently so it faces you, and a thin leader line joins the node to the palette.
- **Controls:** poke the field, enter the text with the keyboard or by voice, poke a result.

**Step 4. Who they married into.**

- **What you see:** the Selection face is now _about the Medici_. It shows a header "Medici", two key values (degree 6, plus PageRank once it's computed), and their commands: **Neighbors, Path to..., Note, Pin, Details**.
- **What you do:** poke **Neighbors**. A small 1 / 2 hops switch appears; poke **1**.
- **What you see:** the six partner families join the selection, and the palette says "7 selected: Medici + 6".
- **Controls:** poke and poke. The commands always belong to what's selected, so nothing has to be learned per screen.

**Step 5. Who matters most.**

- **What you do:** turn your wrist, or thumb-swipe, to the **Analyze** face. It shows tiles for your frequently used algorithms plus **All...**, a scrolling list grouped by kind. Poke **PageRank**.
- **What you see:** a progress ring on the tile, then "done".
- **Controls:** flip a face, poke a tile.

**Step 6. Read the result.**

- **What you see:** the PageRank tile turns into a mini ranking showing the top 5 with values (Medici 0.146, Guadagni 0.098, Strozzi 0.088...). Pointing at any node in the graph shows its PageRank on the Selection face.
- **What you do:** to keep the full ranking in view, pinch the mini ranking and pull it off the palette. It becomes a card that stays wherever you let go, for example beside the graph. Poking a name on the card selects that node.
- **Controls:** a pinch-and-drag tears a card off the palette. This is the one way any palette content becomes a standing panel.

**Step 7. Color and size by PageRank.**

- **What you do:** flip to **Paint**. It shows the style layer stack, which doubles as the legend. Poke **+ Layer**, then **Color by**. An attribute list opens, with recent results first, so PageRank is at the top; poke it. Then poke **+ Layer**, then **Size by**, then **PageRank**.
- **What you see:** a color ramp appears on the new layer, and the graph recolors immediately. To adjust the ramp's range, pinch-drag its two end handles.
- **Controls:** poke to choose, pinch-drag to tune. Layer order is changed by pinch-dragging a layer up or down the stack.

**Step 8. Keep only the strong families.**

- **What you do:** flip to **Steps** and poke **+ Filter**. Choose **PageRank**, then **at least**. A slider with a small histogram appears; pinch the slider's handle and drag.
- **What you see:** families below the line fade live as you drag. Releasing commits the filter, which becomes a chip "PageRank >= 0.07" in the steps list. Poking the chip later reopens the slider; poking its eye toggles it off.
- **Controls:** pinch-drag sets the number; you can also poke the value to type or say it exactly.

**Step 9. Write a note.**

- **What you do:** point at the Strozzi node and pinch to select it. On the Selection face, poke **Note**. Dictate "Check the 1434 exile date", or type it, then poke **Done**.
- **What you see:** a small note pin appears on the node. Selecting the pin shows the note on the palette, with **Edit** and **Delete**.
- **Controls:** pinch to select, poke the command, dictate or type.

**Step 10. Undo a mistake.**

- **What you do:** suppose you filtered too hard. Poke **Undo** in the palette's top bar, which is on every face. Hold **Undo** to open a list of recent actions; poke one to step back to it.
- **What you see:** the graph and the steps list return to that point.
- **Controls:** a poke for one step back, a hold-and-poke to go further.

**Step 11. Save.**

- **What you do:** poke **Project** in the top bar, then **Save**. Name it by voice or keyboard if it's new. Saving also happens automatically.
- **What you see:** "Saved: Florentine marriages".
- **Controls:** poke, poke, with an optional name.

---

**The same scheme on each device:**

| Action                  | Quest / Galaxy XR, hands   | Quest / Galaxy XR, controllers                                   | Vision Pro                |
| ----------------------- | -------------------------- | ---------------------------------------------------------------- | ------------------------- |
| Show the palette        | Off hand palm up           | The palette is mounted on the left controller and always visible | Off hand palm up          |
| Select far away         | Hand ray and pinch         | Right trigger                                                    | Look and pinch            |
| Press a palette button  | Poke with the index finger | Point with the right controller tip and pull the trigger         | Poke, or look and pinch   |
| Flip the palette face   | Wrist turn or thumb swipe  | Left thumbstick left or right                                    | Wrist turn or swipe       |
| Move or scale the graph | Both hands pinch and pull  | Both grips                                                       | Both hands pinch and pull |
| Undo                    | Palette top bar            | Palette top bar, or the B button                                 | Palette top bar           |

**Why it should work:**

- **Proprioception:** your off hand is always within reach, and your body knows where it is without looking. That's why Tilt Brush's palette is fast.
- **Object-first carries over:** the Selection face always shows the commands for what's selected, the same model as the desktop app.
- **Short arm reach:** poking a palette held near your body is quicker and more precise than pointing at far panels.
- **Tearing cards off the palette** lets you keep what matters in view without designing panels.

**What it would teach us:**

- whether one hand-held palette can carry the whole app's command set without getting deep or cluttered;
- whether people remember which face holds what, and whether flipping by wrist turn beats swiping;
- whether holding up the off hand gets tiring within a 20-minute session, and whether torn-off cards relieve that;
- whether poking a palette is accurate enough with hands only, with no controllers.

**Known risks:**

- **Arm fatigue from holding the palette up.** Mitigation: a quick flick drops the palette to dock at the graph's base, and turning your palm up picks it back up.
- **Text entry still relies on the system keyboard or dictation.**
- **On Vision Pro,** "look and pinch" and "poke" both work, which may confuse people about which to use where.
