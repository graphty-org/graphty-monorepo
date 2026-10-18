**Prototype 2: Point and Say**

_The idea in one line:_ nothing is held and no menus are opened. You point at things and say what you want, in a small fixed command language, with no AI. Every sentence appears as editable "chips" before it runs, so you always see what will happen.

**Setup:** the same as prototype 1. A solid background in full VR, and the graph at chest height about 70 cm in front of you. Meta Quest, Samsung Galaxy XR or Apple Vision Pro, using hands, controllers, or eyes.

**The control vocabulary:**

| Gesture or speech                                                          | Meaning, everywhere                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Point** (hand ray, controller ray, or gaze on Vision Pro)                | Highlights what you're aiming at. It becomes "this" in what you say                                         |
| **Pinch**, trigger, or look-and-pinch                                      | Select what you're pointing at                                                                              |
| **Hold the off-hand pinch** (or the left controller's grip) while speaking | Talk. Releasing the pinch ends the sentence. Nothing is heard unless you hold it                            |
| **The command bar**                                                        | A strip under the graph, about 40 cm wide, showing your sentence as chips, then "Running..." and the result |
| **Say "go"** or tap the bar                                                | Run the previewed command. Short commands, such as selecting or framing, run at once                        |
| **Poke a chip**, or say "no, ..."                                          | Correct one part without repeating the whole sentence                                                       |
| **Both hands pinch** on empty space and pull                               | Move, scale or turn the graph, the same as in prototype 1                                                   |

**The language:** short sentences of the form _[command] [what] [details]_. "What" can be:

- **a pointed-at thing:** "this", "these", "that one";
- **the current selection:** "them";
- **a name:** "the Medici";
- **a set:** "everything", "the selection".

The commands come from graphty's own catalog: select, neighbors, path, run, color by, size by, filter, note, undo, save, frame, show. Numbers and comparisons are spoken: "at least 0.07", "two hops". A **"What can I say?"** card lists the commands available for whatever is selected, so the object-first model drives discovery: select something and ask what you can do with it.

---

**The journey: the Florentine families, from loading to saving**

**Step 1. Enter.**

- **What you see:** you press "Enter VR" and the graph appears. The command bar shows a hint: "Hold your left pinch and speak. Try: find the Medici."
- **Controls:** none.

**Step 2. Get oriented.**

- **What you do:** pull with both hands to enlarge the graph; one-hand pinch on empty space to turn it. Or hold-to-talk and say **"fit"**, or **"turn left"**.
- **What you see:** the graph frames itself or turns.
- **Controls:** hands, or a spoken view command.

**Step 3. Find the Medici.**

- **What you do:** hold the off-hand pinch, say **"find Medici"**, release.
- **What you see:** the bar shows **[find] [Medici]**, the node is selected, and the graph turns to face it. A select command runs at once, with no "go" needed.
- **If it misheard:** the bar shows the three closest names; poke the right one, or say **"no, Medici"**.
- **Controls:** hold-to-talk, plus pointing or poking only for corrections.

**Step 4. Who they married into.**

- **What you do:** with the Medici selected, hold and say **"neighbors"**. Or point at another family and say **"neighbors of this"**.
- **What you see:** the bar shows **[neighbors] [Medici] [1 hop]**, and the six families join the selection: "7 selected".
- **For two hops:** say **"two hops"**. Only the hop chip changes, and the selection grows.
- **Controls:** speech. "This" binds to whatever you were pointing at the moment you said the word.

**Step 5. Who matters most.**

- **What you do:** hold and say **"run PageRank"**.
- **What you see:** the bar shows **[run] [PageRank] [on everything]** and waits, since running an algorithm is a preview-first command. Say **"go"**. The bar shows progress, then "PageRank done", and a ranking card appears beside the graph with the top 10.
- **Controls:** speech, then "go".

**Step 6. Read the result.**

- **What you see:** the card lists Medici 0.146, Guadagni 0.098, Strozzi 0.088 and so on.
- **What you do:** point at any node and say **"what's this?"**. A small card on that node shows its values. Say **"select the top five"** to turn the ranking into a selection.
- **Controls:** point plus speech. Poking a name on the card also selects that family.

**Step 7. Color and size by PageRank.**

- **What you do:** say **"color by PageRank"**, then **"size by PageRank"**.
- **What you see:** each runs at once and adds a style layer. A small style-layers card, which doubles as the legend, appears under the ranking card.
- **To adjust:** say **"reverse the colors"**, or **"move color below size"** to reorder layers.
- **Controls:** speech only.

**Step 8. Keep only the strong families.**

- **What you do:** say **"filter PageRank at least 0.07"**.
- **What you see:** the bar shows **[filter] [PageRank] [at least] [0.07]**, and families below it fade as a preview. Say **"go"** to commit it as a filter step.
- **To adjust:** say **"make it 0.05"**, which changes only the number chip, or pinch-drag the number chip like a dial.
- **Controls:** speech, with the chip as an optional dial.

**Step 9. Write a note.**

- **What you do:** point at the Strozzi family and say **"note on this:"**, then dictate freely: "check the 1434 exile date". Release.
- **What you see:** the bar shows **[note] [Strozzi]**, followed by your text in plain words. Say **"go"**, and a note pin appears on the node.
- **To read it:** point at the pin and say **"read it"**, or **"edit it"** to dictate a replacement.
- **Controls:** after "note on this", dictation takes over until you release the pinch.

**Step 10. Undo a mistake.**

- **What you do:** say **"undo"**, or **"undo two"**, or **"undo the filter"** to step back to just before that action.
- **What you see:** the bar names what was undone: "Undid: filter PageRank at least 0.07".
- **Controls:** speech. There's also an undo button on the bar for when you can't speak.

**Step 11. Save.**

- **What you do:** say **"save as Florentine marriages"**.
- **What you see:** "Saved".
- **Controls:** speech.

---

**On each device:**

| Action          | Quest / Galaxy XR, hands  | Quest / Galaxy XR, controllers   | Vision Pro                |
| --------------- | ------------------------- | -------------------------------- | ------------------------- |
| Point at "this" | Hand ray                  | Controller ray                   | Where you look            |
| Select          | Pinch                     | Trigger                          | Look and pinch            |
| Talk            | Hold the left pinch       | Hold the left grip               | Hold the left pinch       |
| Correct a chip  | Poke it                   | Point at it and pull the trigger | Look and pinch            |
| Move the graph  | Both hands pinch and pull | Both grips                       | Both hands pinch and pull |

**Why it should work:**

- **Very little arm use.** Long sessions stay comfortable.
- **The whole catalog is reachable by name,** with no menus to dig through. Hundreds of algorithms and attributes cost nothing to "show".
- **Speech is good at what's hard in VR:** names, numbers and short notes.
- **Pointing at the moment you say "this"** is the classic "put that there" pattern, and it removes the need to name nodes.
- **The chip preview and "go"** keep mistakes cheap and visible, the same contract as previews on the desktop.
- **No AI means it's predictable,** works offline if speech recognition runs on the device, and nothing leaves the headset.

**What it would teach us:**

- whether a fixed command language is learnable with the "What can I say?" card, or people keep hitting phrases it doesn't understand;
- how often recognition errors happen, and whether fixing a single chip beats repeating the whole sentence;
- whether timing "this" to the moment you speak the word picks the right node in a dense graph;
- whether people are comfortable talking to a graph for 20 minutes, and in what settings they aren't.

**Known risks:**

- **Speech recognition inside a VR session varies by browser and headset.** It may need an on-device recognizer that we bundle.
- **Noisy rooms, shared offices and privacy.** That's why there's a hold-to-talk, and every command also has a poke route on the bar's chips.
- **Building a rule** ("weight at least 4 and from the 1400s") gets long to say. It tests the limit of a fixed command language.

**How it differs from prototype 1:**

|                         | Prototype 1: Palette Hand                                 | Prototype 2: Point and Say             |
| ----------------------- | --------------------------------------------------------- | -------------------------------------- |
| Commands live           | On a palette held in the off hand                         | In speech                              |
| Parameters              | Sliders and dials                                         | Spoken numbers, or chips used as dials |
| Feedback                | On the palette                                            | On the command bar and result cards    |
| What the hands do       | Hold the palette and poke it                              | Point, and hold the pinch to talk      |
| Shared with prototype 1 | Pinch to select, two-hand move, and object-first commands |                                        |
