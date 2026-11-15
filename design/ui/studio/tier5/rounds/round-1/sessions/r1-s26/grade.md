Grade: S
False done: 0
Wrong turns: 0
Overwhelm: 3 -- the filter card after its first click -- "I expected the card to open, and instead nothing opened: the "7 of 11" count on the card disappeared and a small "Edit" button showed up in its place"

# r1-s26 grade (task T77B, persona Tom, participant model opus)

Build 1e123d7d33 (tier5-r1d1-1e123d7d33), 1440 x 900, pointer. Steps: 10 commands against the
answer key's 14 by pointer (the participant folded click, type and Tab into one command at steps 6
and 9, and the key's Graph step is needless on this build). Tool refusal: none. Leaks: none
(`leaks.json` read two transcripts, 28 calls, no leak). The transcripts record the participant
model as claude-opus-5-5.

## End state against the success definition

The last screenshot (11.png) and the end-state records match T77 B's success on the main route:
the existing filter card and the existing layer were changed, not replaced.

- Filter: the same card `filter-1` (`work.json` end) now holds two branches: A "telemetry yes"
  (keep data.telemetry yes) or B "depth_cm min 140" (add data.depth_cm range min 140). The card
  reads "telemetry yes 9 of 11" with A 7 / or B 3; the top bar reads "9 of 11 nodes, 8 of 13
  edges". No second filter card.
- Layer: `styles.json` reports only `layer-1_2` (Oldest) changed, nothing added or gone; the
  inspector reads "Which nodes 5 of 9", outline "installed before 2005", Fill E4572E (orange).
- `key.json`: "Color: Oldest 5 of 9 nodes"; 5 nodes drawn #e4572e. Five orange nodes are visible
  in 11.png.
- Reported in the transcript: 9 in the picture, 5 orange (Upper Falls, Mill Pond, Cedar Bend, Old
  Bridge, Lake Inlet) -- the key's 9 of 11 and G01, G02, G03, G05, G09.

Route: Data (via the top bar's filter count), a click on the card (swaps its count for Edit), Edit,
Or..., depth_cm, 140 + Tab, Done, the layer's row "installed before 2000", the date box with
Ctrl+A, 2005 and Tab, Done. This is the key's path, including the extra Edit click it names.

Wrong turns 0: the card click that only revealed Edit is on the key's path; nothing was cancelled,
undone or removed.

False done 0: the claim of done at step 10 matches the screen and the records.

Follow-up: answered in the transcript (rating 3; least sure at step 2, 03.png, when the card's
count turned into an Edit button instead of the card opening).

## Problems

1. **A click on a filter card opens nothing and swaps its count for Edit** (severity 2, behavior).
   Step 2 (03.png): the participant expected the card to open; the "7 of 11" disappeared and a
   small Edit button took its place. He "thought I had changed something or lost the count" and
   needed a second click (step 3). The moment he named as least sure; known on this build.
2. **The Or group's branch counts do not show the overlap** (severity 1, behavior). Step 6
   (07.png) and 11.png: A 7 or B 3 with a total of 9 of 11; nothing says one gauge (G09) is in
   both, so he had to reason it out before trusting the result.
3. **The range boxes' 48 and 210 look like set values** (severity 1, wording). Step 5 (06.png):
   the grey bounds left him unsure whether a range was already applied.
4. **Nothing says whether a minimum includes the bound** (severity 1, wording). Step 6 (07.png):
   he learned "min 140" includes 140 only because Cedar Bend (140) appeared in the list.
5. **"Up to the end of 2004" had to be translated to "before 2005"** (severity 1, opinion).
   Step 8-9 (09.png, 10.png): the date step offers Before; he was unsure how a date late in 2004
   would fall. The result is right.
6. **An unexplained "With issues 9" chip and a warning sign on station** (severity 1, wording).
   11.png: the table shows both with no explanation reachable at sight; he left them alone. Not
   part of the task.
7. **No explicit save** (severity 0, opinion). 11.png: he relied on "Autosave: saved" at the
   bottom left, which is the product's design.
