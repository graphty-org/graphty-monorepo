Grade: S
False done: no
Wrong turns: 0
Model calls: 12
Failure: none
Trap fired: no
Taken on trust: no
Checked: Open run (the run's Values tab, Top 10) for fact 1; chip row's Show in table, inspector and a sort of the column for fact 2; the folded steps of the first reply. No chip hover or chip click
Participant model: claude-opus-5-5 (from the model field of both participant logs; neither names sonnet as the model)
Steps: 8, on the path of 4 to 9

# Session r2-s06: T92 B, Maren, yeast genes

**Result.** Both facts are right, each had something on screen behind it before she gave it, and she
can say what that was. Fact 1: YMR043W, which is the key's answer (the id counts; it is MCM1). Fact 2:
7 genes, and the seven she listed are the key's seven.

**Why it is not void.** `leaks.json` read two participant logs, 39 calls, and found no leaks. The
session ran on the frozen build (`session.json`: 3b2a7f0649, no uncommitted changes), the tool missed
no step (`route.jsonl`: every step code 0, missed 0), and 12 model calls is under the session's cap.

**What the records show.**

- `06.png`: the Betweenness run's Values tab, Top 10 with YMR043W 16,124, YGL035C 12,500, and "331 of
  331 have a value". 16,124 over the 54,285 pairs is the key's 0.297.
- `11.png`, the last screen: both replies, "There are 7 genes with a gal80Rexp value above 1, and 2
  genes that have no gal80Rexp value", chip 7, and the table sorted by gal80Rexp with seven shaded rows
  (3.126 to 1.101) above an unshaded 0.991. The inspector reads 7 nodes, gal80Rexp 1.101 to 3.126.
  `data.json`: 7 nodes selected, 331 and 361 visible.
- Recounted from `tool/files/yeast-galactose.graphml`: 329 values, 7 above 1, next 0.991, and 2 nulls
  (ids `?` and `YER056CA`). So the model's side claim of 2 blanks is true as well.
- `work.json`: one run added (betweenness, label Bridges) and one layer (`bridges_1`). `look` changed
  once, at `03.png`, and stayed. No file was saved.
- This session did not meet the key's "at least 6": fact 1 selected nothing here, so the second message
  went out under Whole graph (`06.png`, `08.png`) and read all 331.

**How the reader got there.**

| Step | What she did                               | Screenshot | On the path                   |
| ---- | ------------------------------------------ | ---------- | ----------------------------- |
| 1    | Clicked Assistant                          | 02.png     | Yes                           |
| 2    | Asked fact 1, in the reviewer's words      | 03.png     | Yes                           |
| 3    | Opened "3 steps"                           | 04.png     | Checking                      |
| 4    | Clicked Open run                           | 05.png     | Checking                      |
| 5    | Clicked the Values tab                     | 06.png     | Checking: Top 10              |
| 6    | Asked fact 2, plus how many have no value  | 07-08.png  | Yes                           |
| 7    | Clicked Show in table                      | 09.png     | Checking                      |
| 8    | Sorted the gal80Rexp column                | 10.png     | Checking: read the seven rows |

The waits at `08.png` and `11.png` are no steps. Every step served the check the key expects, and none
was undone, so there are no wrong turns.

**Her report.** She gave YMR043W and 7, each with its check, and held back three things without being
asked: the 2 blanks ("I would not repeat it to the reviewer without looking"), that YMR043W is MCM1 (her
memory, and the name was not on screen for that row), and what the column means. The id is on screen
first, so the name from memory does not touch the grade. Nothing she reported is wrong; her "Yes" is
true on `11.png`. One line overstates: "Nothing is highlighted until you sort". The rows are shaded
from the click, but they are out of view (problem 1).

**The follow-up.** The transcript holds it. She separated the program's record from the model's
sentence: fact 1 is the run's Top 10 with its time and the 331 of 331, fact 2 is her own count of the
sorted column with the inspector agreeing. She named her doubt on each: she trusts the calculation on
the program's word, assumes Bridges and Betweenness are one run, and notes that "most of the
connections" is the highest score, not more than half the paths, across 26 components.

**Measures.**

- Checks before the follow-up: all of the above, unasked. She went to computed sources for both facts
  before reporting, with no chip hover or chip click: the Show in table button did that job.
- Computed against the model's words: she told them apart by source, and she treats the model's
  unchecked side claim as unverified though it was true.
- An analysis asked as a question repainted the network: seen and disliked, left in place.

## Problems

None blocked her or left her with a wrong belief, so nothing here is above severity 2.

1. **Show in table leaves the rows it names out of view** (severity 2, build-defect; step 7, `09.png`).
   It selects the seven and opens the table in the order loaded, with none of them on the first screen
   of rows, so the button's promise is not met until the reader sorts. One click on the heading fixed
   it for her, and a reader who does not think of that sees 11 rows of other genes under a chip of 7.
   Repro: `../../repro/r2-s06/run.sh`, on the frozen build, 2 model calls: `walk/04.png` shows
   "In the order loaded", 7 nodes selected and no shaded row. Already in `../../../../backlog.md` from
   T91 B and T92 B.
2. **An analysis asked as a question repaints the network** (severity 2, behavior; step 2, `03.png`).
   The key's known defect, kept to watch. `look` changes at `03.png`, and the key card reads Color:
   Betweenness for the rest of the session, unasked. Undo was offered and she did not press it.
3. **Three words for one thing** (severity 2, wording; steps 3 to 5, `04.png`, `05.png`). The step and
   the change line say Bridges, the reply says betweenness centrality, the panel says Betweenness. She
   had to assume one run, and said so in the follow-up. `work.json` confirms it is one.
4. **Open run lands on Style, though the panel was on Values** (severity 2, behavior; step 4, `04.png`
   to `05.png`). The numbers she came for are one more click away. Not marked build-defect: two scripted
   tries could not click Open run ("nothing on screen is called Open run", cause not found), so it has
   no repro of its own, but `04.png` to `05.png` shows it and `backlog.md` has it from four earlier walks.
5. **The chip "5" in the folded steps has no label** (severity 1, wording; step 4, `04.png`). She never
   learned what it counts. `decided.md` settles that chips carry no label; she did not hover it.
6. **"Sends to Google" does not say what is sent** (severity 1, opinion; `02.png`). She never opened
   it, so this is what the line alone tells a reader with unpublished data. T90 measures it properly.
