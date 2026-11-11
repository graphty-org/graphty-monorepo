Grade: S
False done: no
Wrong turns: 1
Model calls: 19
Failure: none
Hand edit: Open layer
Participant model: claude-opus-5-5 (from the model field of both participant logs; neither names sonnet)
Steps: 8 to the success state, of which 3 are the path's (path is 3 to 5) and 5 are her own checking; 16 to her report; 3 more on the follow-up

# Session r2-s03: T91 A, Ruth, volunteers as saved

**Result.** The nine people with `trained` false, and only they, look different on the canvas, and
Ruth reported 9 with a basis on screen. The paint came from the path's own moves: open the Assistant,
ask, answer its question. Everything else she did was checking the number, which the task's "how you
know" invites, plus one message she chose to send after success.

**Why it is not void.** `leaks.json` read two participant logs, 51 calls, and found no leaks. The
session ran on the frozen build (`session.json`: 3b2a7f0649, no uncommitted changes), the tool missed
no step (`route.jsonl`: every step code 0, missed 0), and 19 model calls is under the session's 40.

**What the records show.**

- `styles.json`: one layer added, Untrained (`untrained_1`), from the Assistant. At the end its
  selector is `data.trained == false`, matched 9, painted 9, setting `node.color`. Nothing else
  changed: the PageRank layer and run stay (`work.json`).
- `19.png`, the screen at her report: the layer reads "trained: no, 9 nodes", "9 of 24 nodes", color
  FF2A55; the key card reads "Color: Untrained, 9 of 24 nodes"; nine pink dots among orange and brown.
- `23.png`, the last screen, after the follow-up: the same rule and count, color 0077BB. `key.json`
  gives the same card, with 9 nodes drawn `#0077bb` and 15 in the ranking's browns and oranges. `data.json`: 24 nodes and 63 edges visible, none selected.
- The nine she named match the key: Tobias Becker, Leo Novak, Omar Haddad, Fatima Diallo, Seun Okoro,
  Ivan Petrov, Ahmed Saleh, Mei Tanaka, Zara Ahmed.
- Every count on a chip and change line (9, "Colored 9 nodes", 24, 63) agrees with the key and the
  records.

**How the reader got there.**

| Step | What she did                                     | Screenshot | On the path                         |
| ---- | ------------------------------------------------ | ---------- | ----------------------------------- |
| 1    | Clicked Assistant                                | 02.png     | Yes                                 |
| 2    | Typed the request, sent it; waited               | 03-05.png  | Yes: the reply found 9, painted none |
| 3    | Opened "8 steps"                                 | 06.png     | Checking                            |
| 4    | Clicked Show in table                            | 07.png     | Checking                            |
| 5-7  | Scrolled the table three times                   | 08-10.png  | Checking: read all 24 rows          |
| 8    | Answered: highlight, keep all 24; waited         | 11-12.png  | Yes: success state reached          |
| 9    | Clicked Open layer                               | 13.png     | Checking                            |
| 10   | Opened Which nodes                               | 14.png     | Checking                            |
| 11   | Clicked Done                                     | 15.png     | Checking                            |
| 12   | Closed the table                                 | 15.png     | Checking                            |
| 13   | Pressed the scope x to drop the yellow rings     | 15.png     | Wrong turn: the rings stayed        |
| 14   | Clicked empty canvas                             | 16.png     | Checking: the rings went            |
| 15   | Asked for a rule on `trained`; waited            | 17-18.png  | Beyond the task: an id list matches |
| 16   | Clicked Open layer                               | 19.png     | Checking                            |

**Why S and not SD.** Her route to success used three of the path's moves, with the second message
the key allows when the first paints nothing. The five steps between them were checks of a number
already on screen, taken before answering rather than after, and no choice of hers led away from
success. The one wrong turn and the third message both came after the success state, and a selector
listing the nine ids already matched. The same checks after the paint would be S, so their order does
not lower the grade. A reader who wants the raw figure has it above: 8 steps to success against a path
of 3 to 5.

**Her report.** She said 9 and gave four grounds, all on screen first: the 24 table rows she read, the
inspector's "trained No (9)", the layer and key card, and nine dots counted on the map. She said she
could not match dots to names, because no names are drawn. Her "done" is true on `19.png`: no false
done.

**The follow-up.** The transcript holds it. Without the AI she used the Untrained layer, which Open
layer had left open: Fill, the color box, the blue swatch, close (`20-23.png`, three actions). `Hand
edit: Open layer`, outside the grade. All nine went blue, and what she said about the screen is true.

**Measures.**

- Layer list: she did not look for it. Open layer took her to the layer each time.
- Preview: no wish for one, in the first report or the follow-up. She read the change after it applied.
- Starters: read and ignored ("none mine").
- How the number was confirmed: the table first, then the layer, the key card and the drawing.

## Problems

None blocked her or left her with a wrong belief, so nothing here is above severity 2. None is marked
build-defect, because none has a repro. The likeliest, problem 1, depends on the model painting from a
selection, is already in `../../../../backlog.md` at severity 2, and no bar waits on it.

1. **"Picked by hand: 9 nodes" on a layer the Assistant made** (severity 2, wording; steps 9 and 10,
   `13.png`, `14.png`). Nobody's hand made it, and the chat never said the layer was a fixed list. The
   app prints these words for any fixed id list (`pickedWords` in `graphty/src/workspace/style/cards.ts`).
   Her second message went out under "Selection 9", left there by Show in table. She read it rightly as
   a list that would not follow the data, and it cost her one more message (step 15), which brought
   "trained: no, 9 nodes". A reader who never opens the layer does not learn this.
2. **The folded steps do not say what was looked at, and two "Style" rows sit over "No changes were
   made"** (severity 2, wording; step 3, `06.png`). `styles-steps.jsonl` keeps the same `look` through
   `11.png`, so the words are true, but the rows give only names, times and one 9. She could not tell
   whether something had been tried. Show in table answered her instead.
3. **The first request painted nothing and asked how** (severity 1, behavior; step 2, `05.png`). The
   key expects this, and what the reply chose to do is the model's. It cost her the one extra message
   the path allows.
4. **The scope x does not drop the selection's rings** (severity 1, behavior; step 13, `15.png`). She
   took it for a way to clear them. The x is named "Ask about the whole graph" and `../../../../decided.md`,
   "Scope", settles what it does; "Use selection" appeared after it. An empty-canvas click cleared the
   rings at once. One wrong turn.
5. **The key card covers part of one of the nine** (severity 1, behavior; `15.png`, `19.png`, `23.png`,
   the dot near 528,225). The key names this. She still counted nine.
6. **Which nodes stops at "+4"** (severity 1, wording; step 10, `14.png`). She could not read the last
   four ids there, and the table already had them.
7. **The reply says "training is false" where the column says No and the layer says "trained: no"**
   (severity 1, wording; step 15, `18.png`). The model's words; the layer's own line let her check them
   in one click.
8. **After the hand edit the reply's Undo is gone with no word why** (severity 1, behavior; follow-up,
   `21.png` against `23.png`). The arrow at the top remains. She noticed and did not test it.
9. **The pink leaves the picker's row of colors once replaced** (severity 0, behavior; follow-up,
   `21.png` against `22.png`). Getting it back takes the hex value or the arrow at the top.
10. **Pink among warm oranges and browns** (severity 0, opinion; step 8, `12.png`). The color was the
    model's choice. She doubted it for print and for readers who have trouble with reds, could not
    confirm either, and moved to blue on the follow-up.
