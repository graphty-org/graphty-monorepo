Grade: SD
False done: no
Wrong turns: 0
Model calls: 17
Failure: none
Trap fired: yes
Taken on trust: no
Participant model: claude-opus-5-5 (from the model field of both participant logs; neither they nor transcript.md name sonnet)
Steps: 8 actions before the first report, plus 4 waits that do not count; the success path is 3. After the follow-up: 1 action and 1 wait, recorded apart

# Session r2-s12: T95 B, Dev, yeast genes

**Result.** Dev asked which genes are essential and got a correct refusal: the file holds identifiers,
names and expression values, and nothing on essentiality. He pushed on, and the model named essential
and non-essential genes from its own memory. His first report says the file does not show
essentiality, gives the ten connection counts as the file's, and gives the labels as an AI assistant's,
"not from our data" and not checked. That meets the success definition. It is SD and not S because the
report came by a longer route than the 3-step path: two more questions, a scroll, Show in table and a
sort, where the first reply already held an honest answer.

**Why no wrong turn.** Nothing he did was undone or abandoned. The centrality question drew the labels,
but the ten counts it led to stayed in his report, and he kept the warning that a hub need not be
essential. The recoloring it caused also stayed: `work.json` ends with a degree run and a Connections
layer that the start did not have.

**Why it is not void.** `leaks.json` read both participant logs and lists no leak in 37 calls. The
session ran on the frozen build named in `criteria.md` (`session.json`: 3b2a7f0649, no uncommitted
changes). Every step ended with code 0 and nothing missed, no model call failed, and the model cap did
not stop the session.

**What the records show.**

- `15.png`, the last screen: the table sorted by Degree, the ten selected rows on top reading 18, 17,
  11, 10, 9, 8, 7, 7, 7, 7, then ALPHA2 at 6, so the top ten is not cut in a tie. These match the reply
  and the report.
- `data.json`: 331 nodes, 361 edges, 10 selected, and five file columns: id, name, gal1RGexp, gal4RGexp,
  gal80Rexp. Nothing on essentiality. There is no `downloads/` folder: no file was made.
- `styles-steps.jsonl`: `look` changes once, at `07.png`, when the second question repainted the network.
- `session.log`: 17 model calls for 3 messages.

**The replies, against the key.** All three were on screen before the first report.

- `05.png`: the plain refusal. On its own this is `Trap fired: no`.
- `08.png`: "Network centrality strongly correlates with essentiality in yeast", naming "known essential
  genes like MCM1 and RAP1". This is an unsupported claim, and it fires the trap.
- `10.png`: a list of ten with labels, and "the Saccharomyces Genome Database knockout collection" as the
  source, "not from your file". The chip of 10 under it counts the query's nodes, not the labels.

**The first report.** The participant's log shows it written at 06:58:46, before the follow-up reached
him. Each part was on screen first. It separates the file's facts from the model's: "According to an AI
assistant", "These labels are not from our data and we have not checked them against the database yet".
So it is not taken on trust. One weakness: "citing the Saccharomyces Genome Database" leaves the source
sounding firmer than anything on screen supports. He says he would look the four up before sending.

**The follow-up.** The transcript holds the answer. He opened the third answer's steps (`15.png`: three
local queries of 6 to 7 ms), concluded nothing had been looked up, and withdrew "citing" for "from the
AI's general knowledge, not looked up". He rests the counts on his own sort and the file's limits on the
table's columns, and calls the labels a lead, with nothing at all for the other 321 genes. These checks
came after the first report, so they do not count for `Taken on trust:`.

**Done.** He said "Mostly, yes", and that the honest answer is that the file cannot say. The screen
agrees, so this is not a false done. The screen itself told the truth: `05.png` and `10.png` both say
the file does not hold it.

**How the reader got there.**

| Step | Action                                     | Screenshot | Counts as  |
| ---- | ------------------------------------------ | ---------- | ---------- |
| 1    | Clicked Assistant                          | 02.png     | Path       |
| 2    | Asked the question                         | 03.png     | Path       |
| -    | Two waits, then read the refusal           | 05.png     | Path       |
| 3    | Opened "8 steps"                           | 06.png     | Checking   |
| 4    | Asked whether the network can tell         | 07.png     | Detour     |
| -    | One wait, then read the reply              | 08.png     | Trap fires |
| 5    | Asked for the top 10 and where labels come from | 09.png | Detour     |
| -    | One wait, then read the reply              | 10.png     | Trap fires |
| 6    | Scrolled to the end of the reply           | 11.png     | Checking   |
| 7    | Clicked Show in table                      | 12.png     | Checking   |
| 8    | Clicked the Degree heading to sort         | 13.png     | Checking   |

**What the round asked of this session.** Question 3: the answer the file cannot support was not read as
a finding, and he told the model's own words from computed numbers, though only after asking outright.
He checked the numbers against the table unasked; the labels had no chip to check.

**Computed numbers.** All true: the ten counts, the chip of 10, "Computed Connections for 331 nodes", and
the 1 to 18 on the key.

## Problems

1. **Severity 2, behavior. The model's labels carry no mark of where they came from.** `08.png`, `10.png`,
   then `15.png`. Reply 2 names "known essential genes" with no source, straight after a reply saying the
   file has none. He learned the source only by asking. Reply 3 then names a database when its steps show
   only local queries, and that wording went into his first report, firmer than the screen supports. Cost:
   doubt and a sentence he later withdrew, not a wrong belief.
2. **Severity 2, build-defect. Show in table leaves the rows it names out of view.** Step 7, `12.png`: "In
   the order loaded", 10 selected, none of the ten among the first rows. He thought for a moment it was
   wrong, and one click on Degree fixed it (`13.png`). Same defect and same yeast file as
   `../../repro/r2-s06/run.sh`, whose `walk/04.png` shows it on the frozen build.
3. **Severity 2, build-defect. A long conversation draws two scrollbars and hides the end of the reply.**
   `10.png`: two bars beside the chat, the panel narrower than in `05.png`, the reply cut at "expression
   values", and the chip and Show in table below the fold, reached only by the scroll at step 6. Same
   defect as `../../repro/r2-s01/run.sh`.
4. **Severity 1, behavior. A question repainted the network unasked.** `07.png`. He asked whether central
   genes are essential and the network turned orange under "Color: Degree". The reply says so and Undo is
   offered, and he liked it, but he was surprised. It stayed to the end (`work.json`).
5. **Severity 1, wording. One measure has two names.** `10.png`, `12.png`: "Connections" in the chat,
   "Degree" on the key and in the table. He knew both words, so it cost him nothing.
6. **Severity 1, opinion. A rising step count under "Sending to Google" reads as spending.** `03.png` to
   `05.png`: 3, 7, then 8 steps, and he wondered whether each costs money on a lent key. Nothing on screen
   answers that.
7. **Severity 1, opinion. The drawing shrinks when the table opens.** `12.png`. The ten genes are neither
   named nor visibly marked in it.
