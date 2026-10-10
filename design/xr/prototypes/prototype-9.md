**Prototype 9: Spellcasting**

_The idea in one line:_ you work the graph the way a sorcerer works magic, with the inspiration taken straight from Doctor Strange. Draw a circle in the air to open a casting ring. Trace a shape inside it to choose what happens. Sweep, push and pull with both hands to shape the result. Turn your hand like a dial to wind time backward or forward.

**What makes it different from the other gesture prototypes:**

- **3 (Gesture Grammar)** used small flicks from a fixed menu layout.
- **7 (Hand Signs)** used static held shapes.
- **8 (Grip and Tool)** used hand shapes that summon tools.
- **Here a gesture is a motion path,** with a hand shape during it, and with size and position that carry meaning. The circle you draw doesn't just open a menu: its size and position define the scope of the spell. A small circle around one node is local; a large circle around the whole graph is global.

| Layer          | This prototype                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Cast:** draw a ring to set the scope, trace a glyph to choose the spell, then close your fist to cast it or open your palm to dispel it     |
| **Navigation** | **Two-hand orbit:** hold your palms facing each other around the graph and turn them together, as if holding a sphere. Spread them to enlarge |
| **Selection**  | **Sweep:** an open hand swept through the graph gathers what it passes. **The circle you draw** also selects what it encloses                 |
| **Menus**      | **Glyphs,** shapes traced in the air. Where many choices exist, **runes** orbit the ring and you flick one into the center                    |
| **Parameters** | **Gesture size, distance and rotation:** how far your hands pull apart, how far your palms push, how much you turn your wrist                 |
| **Feedback**   | **The ring itself:** it names the recognized glyph and previews the effect before you cast. A history wheel appears when you wind time        |

**Setup:** a solid background in full VR, with the graph floating at chest height about 70 cm away. **Hands only,** on Meta Quest, Samsung Galaxy XR or Apple Vision Pro. Fingertip paths are recognized by a stroke recognizer, the same kind of technique that recognizes handwritten shapes on a phone.

**The core movements:**

| Movement                                                           | Meaning, everywhere                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Draw a circle with your index finger** around something          | Open a **casting ring** whose scope is what the circle encloses: a node, a cluster, or the whole graph |
| **Trace a glyph inside the ring**                                  | Choose the spell. The ring names it ("Expand") and shows a preview                                     |
| **Close your fist**                                                | Cast: apply it                                                                                         |
| **Open palm, shaken**                                              | Dispel: cancel the ring                                                                                |
| **Turn your hand like a dial,** fingers spread and palm facing you | **Wind time.** Counterclockwise undoes step by step; clockwise redoes. Like the Eye of Agamotto        |
| **Both palms around the graph, turning**                           | Turn the graph                                                                                         |
| **Open hand swept through the graph**                              | Select what you pass                                                                                   |

**The glyphs, each chosen to suggest its effect:**

| Glyph traced inside a ring               | Spell                                                                              | How you shape it                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Branching fork (Y)**                   | **Expand:** neighbors                                                              | Then pull your two hands apart from the ring. The distance is the number of hops |
| **Spiral, inward**                       | **Rank:** run an analysis                                                          | Runes of algorithms orbit the ring; flick one into the center                    |
| **Wave (~)**                             | **Sieve:** filter                                                                  | Then push your palms forward. The distance pushed is the threshold               |
| **Lightning (zigzag) between two rings** | **Path** between the two scopes                                                    | Opening your hands asks for alternative routes                                   |
| **Brushstroke (S curve)**                | **Paint:** color or size by an attribute                                           | Attribute runes orbit the ring; flick one in                                     |
| **Square (a frame)**                     | **Portal:** show a second state inside the frame, such as a what-if or another run | Widen the frame to show more                                                     |
| **Dot, tapped twice in the center**      | **Mark:** a note                                                                   |                                                                                  |
| **Triangle**                             | **Seal:** save the project                                                         |                                                                                  |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph appears. A short demonstration traces a circle, a fork and a closing fist, glowing in the air, then fades. A hint says "Draw a circle to begin."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** hold both palms facing each other on either side of the graph and turn them together. The graph turns as if you were holding a ball. Spread your palms to enlarge it; bring them closer to shrink it.
- **Controls:** two-palm orbit only. Lowering your hands lets go.

**Step 3. Find the Medici.**

- **If you can see it:** draw a small circle around the big central node. The circle snaps around it, the Medici is selected, and the ring reads "Medici".
- **If you need to search:** trace the letters "M-E" with your finger inside an empty ring, as on a phone that recognizes handwriting. Matches glow, and a fist casts the selection on the brightest match.
- **What you see:** the ring hovering around the Medici, with the name.
- **Controls:** a circle, or letters traced in a ring.

**Step 4. Who they married into.**

- **What you do:** inside the Medici's ring, trace a **fork (Y)**. The ring reads "Expand". Place your hands together over the ring and pull them apart. At one hand-width, "1 hop: 6" appears and the families glow; at two hand-widths, "2 hops". Close your fist to cast.
- **What you see:** the seven families selected, ringed together.
- **Controls:** a glyph, a two-handed pull for the number, a fist to cast.

**Step 5. Who matters most.**

- **What you do:** draw a **large circle** around the whole graph, so the scope is everything, and trace an **inward spiral**. Runes for your favorite algorithms orbit the ring: PageRank, Degree, Betweenness, Communities, and "More". Flick the PageRank rune into the center with your fingertip, then close your fist.
- **What you see:** the ring spins while it works, then nodes swell gently by their PageRank. A ranking card rises beside the graph: Medici 0.146, Guadagni 0.098, Strozzi 0.088...
- **The whole catalog:** flicking the "More" rune shows the next ring of runes, grouped by family.
- **Controls:** a big circle, a spiral, a rune flick, a fist.

**Step 6. Read the result.**

- **What you do:** point at any node and hold for a moment. Its PageRank appears as a small glowing figure beside it. Draw a small circle around a name on the ranking card to select that family.
- **Controls:** pointing to read, circling to select.

**Step 7. Color and size by PageRank.**

- **What you do:** big circle around the graph, then trace a **brushstroke (S curve)**. Attribute runes orbit, with recent results first; flick **PageRank** in, and cast with a fist. The graph colors by PageRank.
- **Size:** repeat, but before casting, **spread your fingers wide**. That shape means size rather than color.
- **What you see:** the colors and a legend card, plus a layer rune on the graph's rim.
- **Controls:** a circle, a brushstroke, a rune flick, a hand shape for color or size, a fist.

**Step 8. Keep only the strong families.**

- **What you do:** big circle, then trace a **wave**, and flick the PageRank rune in. Hold both palms facing the graph and **push them forward**. The further you push, the higher the threshold; families below it fade back as if blown away. A number floats between your palms: "0.070".
- **Finishing:** close both fists to cast, or shake an open palm to dispel.
- **Controls:** a circle, a wave, a rune, a push for the number, fists to cast.

**Step 9. Write a note.**

- **What you do:** draw a small circle around the Strozzi family, then **tap the center twice**. A note card opens. Trace the words with your finger, or press the card's dictation sigil and speak: "check the 1434 exile date". A fist casts it.
- **What you see:** a small glowing mark on the node; pointing at it reads the note.
- **Controls:** a circle, a double-tap, handwriting or dictation.

**Step 10. Undo a mistake.**

- **What you do:** raise your hand with fingers spread and palm toward you, and **turn it counterclockwise**, like turning a dial on an amulet.
- **What you see:** a history wheel appears around your hand, and the graph winds backward step by step as you turn. Each step is named on the wheel: "Sieve PageRank 0.070", "Paint size". Stop turning and close your fist to stay there. Turn clockwise to wind forward again.
- **Controls:** a turning hand, then a fist.

**Step 11. Save.**

- **What you do:** big circle, then trace a **triangle**: Seal. Cast with a fist.
- **Naming a new project:** trace the name in the ring, or dictate it.
- **What you see:** "Sealed: Florentine marriages".
- **Controls:** a circle, a triangle, a fist.

---

**Advanced journeys:**

- **A compound rule:** cast a sieve, then cast a second sieve inside the first ring. Nested rings are AND. Two rings drawn overlapping, like a Venn diagram, then cast as one with both fists, are OR. The rings' geometry is the rule, and you can see it.
- **Tuning algorithm options:** before casting, each option of the chosen rune appears as a smaller orbit. Grab an orbit and turn it to change that option, such as damping.
- **Comparing two runs:** trace a **square** to open a **portal**. Through it, the graph shows another run's result, or "what if the Medici were removed". A cast portal stays open, and differences glow at its edges.
- **Reordering layers:** layer runes sit on the graph's rim. Pinch one and slide it along the rim to change the order.
- **Recipes:** draw a ring around a section of the history wheel while time is wound, and that sequence of spells becomes a recipe rune. Flicking it into a ring later recasts the whole sequence.
- **Paths:** draw small rings around two families and trace **lightning** from one to the other. The path lights up; opening your hands wider shows alternative routes.

**How it scales:**

- **The glyphs stay few, about eight.** Each is a family of spells, and the specifics come from runes in the ring.
- **Runes come from graphty's catalog,** so a new algorithm or attribute becomes a new rune with no new glyph to learn.
- **Ring size and position define scope,** so the same spells work on a node, a cluster or everything, with no extra commands.
- **The limit:** families with many members need several rings of runes. A spoken name, such as "PageRank", may be the shortcut experts want for a large catalog.

**On each device:**

|                              | Quest                                                     | Galaxy XR | Vision Pro |
| ---------------------------- | --------------------------------------------------------- | --------- | ---------- |
| Hand tracking in WebXR       | Yes                                                       | Yes       | Yes        |
| Recognizing traced shapes    | From the index fingertip's path, using a shape recognizer | Same      | Same       |
| The turning hand (time dial) | From the wrist's rotation                                 | Same      | Same       |
| Controllers                  | Not used; the trigger could stand in as "draw"            | Same      | Not used   |

**Why it should work:**

- **Scope is spatial.** The size and position of the ring decide what a spell applies to, so local and global work are the same act at different sizes. No other prototype does this.
- **The gestures carry meaning:** forking for neighbors, pushing away for filters, winding backward for undo. That makes them easier to remember than arbitrary signs.
- **Continuous effects are tangible:** the pull distance, push distance and wrist turn show the result live before you commit.
- **It's the most distinctive of all the prototypes,** and could be memorable and enjoyable. That matters for a product people choose to use.

**What it would teach us:**

- whether shapes traced in the air are recognized reliably enough at real speed, and how often a wave is mistaken for a brushstroke;
- whether drawing the scope as a ring feels faster than selecting first;
- whether winding time with a turning hand is a better undo than buttons or lists;
- how tiring large arm movements are over 20 minutes, which is the classic problem with "magic" gestures.

**Known risks:**

- **Fatigue.** Big sweeping gestures and pushing with both palms are the most tiring of all the prototypes. Glyphs and rings should work small and near the body, with big versions optional.
- **Recognition errors on shapes drawn in the air,** especially fast or sloppy ones. Every spell previews and needs a fist to cast, so a wrong glyph costs a shake, not a mistake.
- **Learning curve:** about eight glyphs plus the movements. The first-run demonstration and a palm-up cheat sheet help.
- **Text** is still traced letters or dictation, the weak point as in the other hand-only schemes.

**All nine prototypes:**

| Layer      | 1                    | 2                    | 3                    | 4                  | 5               | 6                 | 7              | 8                     | 9. Spellcasting               |
| ---------- | -------------------- | -------------------- | -------------------- | ------------------ | --------------- | ----------------- | -------------- | --------------------- | ----------------------------- |
| Mode model | Select, then command | Select, then command | Select, then command | Tools (belt)       | Edit properties | Tools (pegboard)  | Sign chords    | Tools by grip         | **Scope ring, glyph, cast**   |
| Navigation | Grab                 | Grab, or voice       | Grab                 | Graph comes to you | Miniature       | Turntable         | Fists          | Stand in the off hand | **Two-palm orbit**            |
| Selection  | Pinch                | "This"               | Lasso                | Paint              | Query           | Tongs             | Point and fire | Claw and scoop        | **Ring and sweep**            |
| Choosing   | Palette              | Speech               | Flicks               | Radial and rack    | Panels          | Tags and pegboard | Signs          | Grips                 | **Glyphs and runes**          |
| Parameters | Sliders              | Speech               | Twist                | Dial               | Typing          | Knobs             | Finger counts  | Knobs and grip depth  | **Pull, push and wrist turn** |
| Undo       | Button               | "undo"               | Thumb swipe          | B button           | Ctrl+Z          | Remove a receipt  | Thumbs down    | Flick the strip       | **Wind time**                 |
