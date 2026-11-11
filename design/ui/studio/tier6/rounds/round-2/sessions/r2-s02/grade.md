Grade: SD
False done: no
Wrong turns: 3
Model calls: 9
Failure: met, recovered
Way out: model label, after 1 resend by Enter in the composer
Failure read: key
Disclosure: 3
Participant model: claude-opus-5-5 (both logs, the session and the follow-up; no line names sonnet)
Steps: 16 against the path of about 15 (the path plus one resend); 55 key-level steps by keyboard, 4 of them wasted

# Session r2-s02: T90 B, Sam, sources, keyboard only

**Result.** Sam opened sources.graphml, set up the OpenAI key, met the failed message, resent once,
moved on by the model label under the composer, saved the Google key and got a real reply. He
reported the names on screen. No step used a pointer. It is SD and not S because the route was
longer than the path: the key names the resend as a wrong turn, and the screen's label then led him
on.

**Why it is not void.** `leaks.json` read both of the participant's logs, 69 calls, and lists no
leak. The session ran on the frozen build (`session.json`: 3b2a7f0649, no uncommitted changes), and
`route.jsonl` shows no missed name. The tool's two exit codes of 1 are the browser's console errors
on the OpenAI call, which is the failure under study.

**What the records show.**

- `29.png`, the last screen: "Sends to Google", Gemini 3.8 Flash under the composer, focus in an
  empty composer, the reply in full, then "Computed Bridges for 24 nodes", "Computed Connections for
  24 nodes", "Computed Reach for 24 nodes", with Open run and Undo.
- `session.log`: 9 `gemini request` lines. `session.json`: `keyboardOnlyMode: true`.
- The reply agrees with the file. I recomputed it from sources.graphml: Silverline Media (s20) is
  first by betweenness at 67.68 and by closeness (total distance 50), then Port Authority (61.64) and
  Harlan Development (46.94). Paula Greene has the highest degree (7) and Victor Szabo is the top
  person by betweenness, and neither is on the record. Eileen Park and Marcus Lee, at degree 6, are
  the best connected people on the record.
- `styles-steps.jsonl`: the look changed twice during the reply, 80259fe7edae to 238ae3be6922 (`26.png`,
  Degree) to 61ac9febab7b (`27.png`, Closeness). `work.json` ends with three runs and the layers
  Bridges, Connections and Reach.

**How the reader got there.** Step numbers are the transcript's. The key's 15 steps are one action
each; by keyboard each is a walk of several keys.

| Step  | What he did                                            | Screenshot | On the path                     |
| ----- | ------------------------------------------------------ | ---------- | ------------------------------- |
| 1-3   | Tab x7, Enter, chose the file                          | 04.png     | Yes (path 1)                    |
| 4-8   | Shift+Tab x9, ArrowDown, Enter                         | 09.png     | Yes (path 2)                    |
| 9     | Enter on AI provider...                                | 10.png     | Yes (path 3)                    |
| 10-12 | Tab x2, ArrowDown, ArrowUp x2, Enter: OpenAI           | 13.png     | Yes (path 4, 5)                 |
| 13    | Tab x2, typed the OpenAI key                           | 14.png     | Yes (path 6)                    |
| 14    | Enter in the key box: nothing happened                 | 15.png     | Wrong turn 1, abandoned         |
| 15    | Tab x4: landed on Forget key                           | 16.png     | Wrong turn 2, undone            |
| 16    | Shift+Tab, Enter on Save                               | 17.png     | Yes (path 7)                    |
| 17    | Typed the question, Enter                              | 18.png     | Yes (path 8)                    |
| 18    | Read the failure                                       | 19.png     | Yes (path 9)                    |
| 19    | Enter: sent again, failed the same way                 | 20.png     | Wrong turn 3, the key's resend  |
| 20-21 | Tab, Enter on GPT-4o                                   | 22.png     | Yes (path 10)                   |
| 22    | Tab x2, ArrowDown x3, Enter: Google                    | 23.png     | Yes (path 11, 12)               |
| 23    | Tab x2, typed the Google key, Tab x3                   | 24.png     | Yes (path 13)                   |
| 24    | Enter on Save                                          | 25.png     | Yes (path 14)                   |
| 25    | Enter: the question was back in the composer           | 26.png     | Yes (path 15)                   |
| 26-28 | Waited, read the reply                                 | 28.png     | Success state                   |

**His report.** "Silverline Media first; for a person on the record, Eileen Park and Marcus Lee",
with Port Authority, Harlan Development, Paula Greene and Victor Szabo. All were on screen before he
gave them. The task is done as he says: no false "done".

**The follow-up.** It is in the transcript, and the answers score 3 of 3.

- What leaves: his messages and what the Assistant reads, quoting "column names, node ids, labels
  and values". Right; on screen at `14.png` and `24.png`.
- Where: "straight to" the provider chosen, Google now. Right; the status bar agrees.
- Who pays: the key's owner, "Google charges your key". Right. He added that the grant was only said
  to cover the OpenAI key, so this spend may fall on her, which is sound.
- The first key: "I cannot tell from the screen" whether the key, the network or the provider failed.
  That counts as `key`, and he stated no wrong cause. He leaned toward a network failure and said why,
  but kept the doubt open.
- Her real list: no, not as it is. He would strip emails and phones, code the names, drop the
  on-the-record column, or stay Local only, and check the provider's terms and her paper's rules
  first, because labels and values go to the provider and the reply repeated by name who will not go
  on the record.

**Reported measures.** First move: the word Assistant, named at step 4, reached by walking the rail.
He used no starter. The disclosure was not mentioned at setup; he read it at the follow-up
from his own screenshots of those screens, which the key allows. Bar 8: he reached the end with no
pointer, and focus sat in the composer after Save, each failure and the reply. These sessions cannot
show the next key landing there; that is the accessibility walk's check.

## Problems

| Sev | Kind         | Problem                                                                                                                                                                                                                                                             | Evidence                 |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 2   | wording      | "Could not reach OpenAI: the connection failed." does not say whether the key, the network or the provider is at fault, and Send again invites a retry that cannot help. Cost: a second failed message, and he ended unsure whether the key is good. `decided.md` keeps this for the first round | Steps 18-19, 19.png, 20.png |
| 2   | behavior     | A question repainted the network unasked, while the reply says it worked "without altering the graph's styles or layout". The change rows say only "Computed", so nothing on screen owns the repaint. Sam saw the contradiction, so he was left with no wrong belief. `decided.md` keeps the repaint for the first round; the sentence is the model's | Steps 26-28, 26.png, 27.png, 29.png |
| 2   | build-defect | Enter in the API key box does nothing and says nothing: the key stays unsaved, the panel still reads "Needs a key", and a keyboard reader must walk to Save. Reproduced: `../../repro/r2-s02/run.sh`, `walk/07.png` to `walk/08.png`                                  | Step 14, 15.png          |
| 1   | accessibility | Forget key is one Tab past Save, with no confirmation seen on this route, so an overshoot followed by Enter would act on it. He caught it from the focus ring                                                                                                       | Step 15, 16.png          |
| 1   | accessibility | Settings opens with focus on the dialog's X, though he came for the provider: 2 Tabs each time, 4 presses in the session                                                                                                                                             | Steps 10, 22; 10.png, 22.png |
| 1   | accessibility | The file-to-Assistant walk took 11 presses. He said no shortcut exists, which is not so: Control+I opens the Assistant (`../../repro/r2-s02/shortcut/control-i-opens-assistant.png`), and the button's tooltip reads "Assistant Ctrl+I" within 2 seconds of focus (`../../repro/r2-s02/walk/03.png`). His screenshot came too soon to show it, and a hint on the button can only help after the walk is made | Steps 4-8, 08.png        |
| 1   | behavior     | Save takes a key with no check, so he learned it did not work only after asking. The call that would check it is the one that fails                                                                                                                                | Steps 16-19              |
| 1   | wording      | The disclosure is the smallest type on the page and went unremarked at setup. It says nothing of what the provider keeps or for how long, or what a question costs; he raised both                                                                                  | 14.png, 24.png, follow-up |
| 1   | opinion      | The reply gave several names and no single first call, and carries no chip to check them by. This is the model's choice; the names are true. He took them as given and said so                                                                                     | Step 28, 29.png          |
| 1   | opinion      | Study limit, not the build: the tool printed the browser's CORS error for api.openai.com to the participant, which no reader sees. He said so himself and did not rest his answer on it, so `Failure read:` stands, but a reader on the screen alone may lean less toward the network | Steps 18-19, `route.jsonl` |

No problem here is a severity 3: none blocked him or left him with a wrong belief.
