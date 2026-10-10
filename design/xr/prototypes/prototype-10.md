**Prototype 10: The HUD**

_The idea in one line:_ a heads-up display that moves with your view, like Tony Stark's helmet. The graph sits in front of you; the HUD frames your view with readouts, a targeting reticle and command strips at the edges. Your eyes or head aim, and a small pinch with your hand resting in your lap does the rest. **Hands never reach out; the HUD is the control surface, and looking is how you use it.**

**How it differs, layer by layer:**

| Layer          | This prototype                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode model** | **Target lock, then act:** look at things to lock onto them, building up a target set, then fire a command from the HUD at the locked set                                                                                         |
| **Navigation** | **Look and pull:** look at a region, pinch and draw your resting hand toward you to bring it closer, or away to back off. A **radar** in the HUD's corner shows the whole graph and where you are                                 |
| **Selection**  | **Lock-on:** the center reticle aims. A pinch locks the target in brackets, and locks accumulate into a set                                                                                                                       |
| **Menus**      | **HUD strips at the edges of your view:** a context strip at the bottom with commands for the locked set, a results feed on the right, a target stack on the left, status at the top. Plus an **action wheel** around the reticle |
| **Parameters** | **Indirect pinch-drag:** pinch with your hand at rest and move it a few centimeters, which turns the HUD gauge in view. Or speak a number                                                                                         |
| **Feedback**   | **Callouts fixed to targets** (values pinned beside each locked node) and **the HUD feed**                                                                                                                                        |

**Setup:** a solid background in full VR, with the graph about 1 m in front of you. You're seated, with your hands resting in your lap or on the armrests. Meta Quest, Samsung Galaxy XR or Apple Vision Pro, with hands, or a controller as an alternative.

**The HUD layout:** it sits at a comfortable focal distance of about 1.5 m and follows your head **lazily**. It stays put for small glances and catches up smoothly when you turn further, so it never feels glued to your face.

| Region                | Contents                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Center**            | The **reticle**: a small ring showing what you're aiming at, with a short name tag for the target                                                  |
| **Left edge**         | **Target stack:** your locked targets, newest on top, with a count                                                                                 |
| **Bottom edge**       | **Context strip:** 5 to 7 command chips for what's locked (Expand, Analyze, Paint, Filter, Note, Path, More), plus a typed or spoken command field |
| **Right edge**        | **Results feed:** results as they arrive (rankings, counts, warnings). Each item can be **pinned** to stay floating in the world                   |
| **Top edge**          | **Status:** project name, active filters and layers as small chips, an undo counter                                                                |
| **Lower-left corner** | **Radar:** a small overview of the whole graph, marking where you're looking and where your targets are                                            |

**The control vocabulary:**

| Control                                                                  | Meaning, everywhere                                                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Look** (head direction on Quest; eyes where the headset provides them) | Aim the reticle. Anything you look at, a node or a HUD chip, highlights                                                            |
| **Quick pinch** (hand resting anywhere)                                  | Act on what's aimed at: lock a node, press a chip                                                                                  |
| **Pinch and hold**                                                       | Opens the **action wheel** around the reticle: the most likely commands for the aimed target. Look at one and release to choose it |
| **Pinch and move** (resting hand, a few centimeters)                     | Adjust: a gauge, a scroll, or pulling the view nearer or further                                                                   |
| **Double pinch**                                                         | Clear the target set                                                                                                               |
| **Voice** (optional; hold a pinch on the mic chip, or say "HUD")         | Commands and numbers, like JARVIS, but a fixed grammar, no AI                                                                      |
| **Look at the undo counter, then pinch**                                 | Undo. Pinch and drag across it to scrub history                                                                                    |

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** the graph ahead of you, the HUD fading in around the edges of your view, and a hint in the context strip: "Look at a node and pinch to lock on."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you see:** the radar in the lower left shows the whole graph and a cone for where you're looking.
- **What you do:** look at the graph's center, pinch and move your resting hand toward you, and the graph draws closer. Look at the radar and pinch a spot on it to swing the view to face that part.
- **Controls:** look, pinch and move. No reaching.

**Step 3. Find the Medici.**

- **If you can see it:** look at the big central node. The reticle's tag reads "Medici, degree 6". Pinch, and brackets lock onto it; the target stack shows "Medici".
- **If you need to search:** look at the command field at the bottom and pinch. Type on the system keyboard, or say "Medici". Matches show bracket flags in the graph; pinch to lock the one you want.
- **What you see:** a callout pinned beside the Medici, with its key values.
- **Controls:** look and pinch.

**Step 4. Who they married into.**

- **What you see:** with the Medici locked, the context strip shows its commands.
- **What you do:** look at **Expand** and pinch. A gauge appears on the chip, "1 hop". Pinch and move your hand slightly right to make it 2, or leave it, then pinch to commit.
- **What you see:** six new brackets snap onto the partner families, and the stack reads "7 locked".
- **Controls:** look at a chip, pinch, optional pinch-and-move for the number.

**Step 5. Who matters most.**

- **What you do:** double pinch to clear the targets, meaning "whole graph". Look at **Analyze** and pinch. The strip turns into algorithm chips, recent first; look at **PageRank** and pinch.
- **What you see:** a progress bar in the results feed, then "PageRank: done". The top five appear in the feed, and every node gets a small value callout that shows when you look at it.
- **Shortcut:** hold your pinch on the graph's center, and the action wheel offers "Analyze: PageRank" as a likely next step; look at it and release.
- **Controls:** look and pinch, or the wheel.

**Step 6. Read the result.**

- **What you see:** look at any node and its PageRank shows in the reticle's tag: "Strozzi 0.088, #3".
- **What you do:** in the results feed, look at the PageRank item and pinch **Pin**. The ranking leaves the HUD and floats beside the graph, fixed in the world, so you can look away and come back to it. Look at a name in it and pinch to lock that family.
- **Controls:** look, pinch, pin.

**Step 7. Color and size by PageRank.**

- **What you do:** with nothing locked (the whole graph), look at **Paint** and pinch. The strip shows attribute chips; pinch **PageRank**, then **Color**. Repeat for **Size**.
- **What you see:** the graph recolors and resizes, and two layer chips appear in the status bar at the top. Looking at a layer chip and pinching opens its gauges (color range, scale) in the context strip.
- **Controls:** look and pinch through two or three chips.

**Step 8. Keep only the strong families.**

- **What you do:** look at **Filter**, pinch, and choose **PageRank**, then **at least**. A threshold gauge appears in the strip. Pinch and move your resting hand to the right, and watch families below the line fade, with "0.070" on the gauge. Release, then pinch **Apply**.
- **What you see:** a filter chip in the status bar. Looking at it and pinching reopens the gauge; a quick double pinch on it toggles it off.
- **Controls:** chips, then a pinch-and-move gauge.

**Step 9. Write a note.**

- **What you do:** look at the Strozzi family and pinch to lock it. Look at **Note** and pinch, then say or type "check the 1434 exile date". Pinch **Done**.
- **What you see:** a note callout pinned to the node, which shows when you look at it.
- **Controls:** look, pinch, voice or keyboard.

**Step 10. Undo a mistake.**

- **What you do:** look at the undo counter at the top and pinch to undo one step. Pinch and drag left across it to scrub further back; each step's name shows as you pass it.
- **Controls:** look, pinch, or pinch and drag.

**Step 11. Save.**

- **What you do:** look at the project name at the top and pinch. Choose **Save**; a new project asks for a name by voice or keyboard.
- **Controls:** look and pinch.

---

**Advanced journeys:**

- **A compound rule:** the command field builds rules as chips: "PageRank >= 0.07" AND "century = 15". Each chip is filled by gauges or speech, and AND or OR is a toggle between chips. Typing the rule is the fast route.
- **Tuning algorithm options:** a pinned result's settings icon opens its options as gauges in the context strip, each turned with a pinch-and-move.
- **Comparing two runs:** lock two results in the feed and pinch **Compare**. A split card shows both rankings and the difference; pinning it fixes it in the world.
- **Reordering layers:** the layer chips in the status bar can be dragged along the bar with a pinch-and-move while you look at them.
- **Recipes:** looking at the undo counter with a pinch-hold opens the full history. Lock a range of steps and pinch **Save as recipe**.
- **Watching the graph change:** a results-feed item can be set to **alert** when a value crosses a line, such as a node's rank changing after new data. That's the Iron Man-style "alert" use, natural only in a HUD.

**How it scales:**

- **The context strip is generated** from graphty's catalog for whatever's locked. More commands mean "More" pages or a search, not new gestures.
- **The results feed takes any kind of result,** so new result types simply appear in it.
- **Voice and typing** reach the full catalog by name.
- **The limit:** the HUD can only hold so much at its edges before it crowds your view. Pinning content to the world is the release valve.

**On each device:**

|                        | Quest 3                                                     | Galaxy XR                                        | Vision Pro                                                                                                   |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Aiming                 | **Head direction** (no eye tracking exposed to the browser) | Head direction; eyes if the browser exposes them | **Eyes at the moment of a pinch** (Safari reports where you looked when you pinch); head direction otherwise |
| Pinch                  | Hand tracking, hand resting                                 | Hand tracking                                    | Hand tracking. Pinching with a resting hand is Vision Pro's native style                                     |
| Controller alternative | Trigger as pinch, thumbstick as move                        | Same                                             | PS VR2 controllers                                                                                           |
| Voice                  | Optional                                                    | Optional                                         | Optional                                                                                                     |

**Why it should work:**

- **No arm fatigue at all.** Your hands rest and only pinch. It's the most comfortable of all the prototypes for long sessions.
- **Your eyes stay on the data.** Information comes to the edges of your view instead of panels you have to look away to, the HUD's whole point.
- **Locking targets builds selections naturally:** look, pinch, look, pinch. The target stack makes the set visible.
- **It matches how Vision Pro is designed:** look, then pinch in your lap. So it fits people's expectations on that device.

**What it would teach us:**

- whether a HUD that follows your view is comfortable, or causes eye strain and motion sickness. Head-locked content is usually discouraged in VR, so this is the central question, and the lazy-follow behavior is the test;
- whether head-aiming on Quest is precise enough for small nodes, compared with eye aiming on Vision Pro;
- whether information at the edges of view is read, or ignored and missed;
- whether the edge strips and pinned cards hold everything, or the HUD fills up.

**Known risks:**

- **Comfort with a view-following overlay.** Mitigations: the lazy follow, a dead zone, keeping the HUD small and at the edges, letting any part be pinned to the world, and a button to hide the HUD.
- **Head aiming is tiring for the neck** with many small targets. Eye tracking helps, but browsers expose it only partly.
- **Clutter** in the field of view.
- **Text** relies on voice or the system keyboard.

**All ten prototypes, by mode model:**

| Mode model                | Prototypes                               |
| ------------------------- | ---------------------------------------- |
| Select, then command      | 1 Palette, 2 Say, 3 Gesture Grammar      |
| Tools                     | 4 Tool Belt, 6 Workshop, 8 Grip and Tool |
| Edit properties           | 5 Workbench                              |
| Sign chords               | 7 Hand Signs                             |
| Scope ring and cast       | 9 Spellcasting                           |
| **Target lock, then act** | **10 HUD**                               |
