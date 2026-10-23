# Grade: session r5-s22b

Task T18, dataset B (Florentine families, ranked, colored and sized by PageRank at the start,
setup `florentine-ranked.txt`), persona Dev (tier 1 graduate, returning student). Build
8c015b806086 (graphty@0.8.65), the frozen round 5 build (`session.json`, buildStamp).

**Grade: S** -- both chains are right, in order, read off the run's Values: Strozzi, Ridolfi,
Medici, Salviati, Pazzi for the main prompt, and Peruzzi, Bischeri, Guadagni, Albizzi, Ginori for
the follow-up, each 5 nodes and 4 edges with Weight "None".

## Evidence from the screenshots and the saved files

- Main prompt (10.png, the screen when the participant said it was done): the inspector heads
  "Shortest path", Values, Summary "Path 5 nodes, 4 edges"; Nodes in order Strozzi 1, Ridolfi 2,
  Medici 3, Salviati 4, Pazzi 5; Made with Analysis "Shortest path", Ran "Oct 11, 10:18:58 AM",
  From "Strozzi", To "Pazzi", Weight "None", "Each edge counts as 1."; the left list's row reads
  "Shortest path 4 hops". Matches the answer key.
- Follow-up, last screenshot (15.png): Path "5 nodes, 4 edges"; Nodes in order Peruzzi 1,
  Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5; From "Peruzzi", To "Ginori", Weight "None",
  "Each edge counts as 1.", Ran "Oct 11, 10:19:48 AM". Matches the answer key.
- The participant's answers in the transcript give both chains in the order above, with "four
  marriage links" each.
- `work.json`: at the end one Shortest path run (label "Shortest route") beside the PageRank run,
  its two layers (nodes, edges) added, the PageRank layer kept, nothing under "gone". One run,
  not two, is the expected state: the second run replaces the first.
- `session.log` is empty and `leaks.json` lists no leaks.

## Route and counts

- Main prompt: 9 steps -- hover the flask (Analyze), click Analyze, type "path" in "Filter
  analyses", click Shortest path, type and pick Strozzi, type and pick Pazzi, Find path. The key's
  success path is 4 screenshots after the start; the extra steps are a hover to check the button,
  the filter typed to find the item, and typing and picking as separate steps. No detour.
- Follow-up: Analyze, the "Recent: Shortest path" item, From, To, Find path. The tool refused one
  click by name as ambiguous (step 12; 12.png is the same image as 11.png) and the participant
  clicked the same item by position. That is the tool's name matcher, not the app: four controls
  on screen carry the words "Shortest path" (the left list row, the inspector heading, the legend
  and the Recent item), and a person clicks the one they see.
- Wrong turns: 0.
- False "done" claims: none. Both "done" claims were made with the right chain on screen.
- Words avoided: the participant found the analysis by typing "path" in the filter, its own word
  ("in class they'd say shortest path"), not one taken from the prompt; it went to the From field
  because the form opened with focus there, not straight after reading the prompt.
- Scripted exit: not applicable.

## Problems

1. **Severity 2 -- a second Shortest path run replaces the first with nothing on the list to say
   so.** After the follow-up the left list still shows one "Shortest path 4 hops" row and the
   Strozzi to Pazzi chain is gone from the drawing and the panel (15.png against 10.png); only
   From, To and the time of Ran changed. Participant: "if I wanted both routes in my figure I'd
   have been confused ... nothing in the list told me it was a new answer." No wrong answer
   followed because the first chain had been written down; the answer key names this behavior.
2. **Severity 1 -- the drawing names no node, so the highlighted chain cannot be read off the
   map.** Five black nodes on PageRank colors with no names (10.png, 15.png); the participant read
   the order from the panel and said it would have to put names on for a figure. On 15.png the
   Peruzzi to Bischeri tie passes through Castellani, an orange node not on the path (about
   713,604), as the key notes; the participant did not read the drawing and was not misled.
3. **Severity 1 -- the Analyze list opens on rankings, and the route was found only by guessing
   the word "path".** The first screen of the list (03.png) shows Recent PageRank and "Rank nodes
   and edges"; the participant: "If I'd typed 'route' first I'm not sure it would have shown up."
   Not tested; it cost one typed word here.
4. **Severity 0 -- "Guided route" is grayed with "Select 2 nodes first"** (04.png) beside
   Shortest path; seen, not tried, no effect on the task. Recorded only.

## Notes on the method

- The participant is simulated and briefed as a returning user whose history says it has never
  asked the program for a route; a pass is weak evidence until real people confirm it. Keyboard
  and screen-reader access were not studied in this session.
- The tool ran cleanly apart from the one ambiguous-name refusal above, which changed nothing in
  the app: the start setup completed, every step produced its screenshot, and the session ended
  with `--end`.
- The transcript's step 14 lists two command lines; the screenshot after it (14.png) shows From
  "Peruzzi" picked and focus in To, so the step's result is not in doubt.
