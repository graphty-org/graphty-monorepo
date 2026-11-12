# Grade: session r1-s18 -- Nadia, back as an alert reviewer, traces the fewest marriages from Strozzi to Pazzi (Florentine families)

**Grade: SD** (success with difficulty). The chain is right and in order: Strozzi, Ridolfi, Medici,
Salviati, Pazzi -- 4 marriages, 3 families in between, the only chain of that length. She read it
off the run's "Nodes in order", the place the answer key grades S. But she reached the chain tool
only after a detour through Strozzi's list of connections and the wrong "..." menu, and the answer
key grades "right chain after a detour" SD. The follow-up was also answered correctly.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step's screenshot matches its command. At
step 3 the tool reported an ambiguous name and took the node option, the same thing a person
clicking that row would get; the `--click-at` steps hit the named controls (the "..." buttons and
the suggestion rows). No tool fault; the session is not void.

## What the last screen shows (`19.png`)

- The follow-up run's Values: "Path 5 nodes, 4 edges"; Nodes in order Peruzzi 1, Bischeri 2,
  Guadagni 3, Albizzi 4, Ginori 5; Made with: Analysis Shortest path, Ran Oct 8, 11:27:29 PM, From
  Peruzzi, To Ginori, Weight None, "Each edge counts as 1."; Advanced run settings closed.
- The path is drawn in black; the Graph tree has one "Shortest path 4 hops" row, highlighted.
- The main prompt's run is on `13.png`: Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5,
  "5 nodes, 4 edges", From Strozzi, To Pazzi, Weight None, "Each edge counts as 1.". This is the
  answer key's chain for B exactly.
- No files were saved; the task asks for none.

## Measures

- **Main prompt steps:** 13 (`01.png` to `13.png`), of which steps 4 to 8 were the detour. The
  success path is about 4 (key p, From, To, Find path); from a selected node, its "..." menu, "Path
  between...", To and Find path is 4 as well.
- **Wrong turns: 2.**
    1. Steps 4 to 6 (`04.png` to `06.png`): opened Strozzi's list of connections (Degree), the place
       her history names, then tried Hops 2 and Hops 3 hoping Pazzi would appear. Pazzi is 4 ties
       away and the Hops control stops at 3, so it never did ("Strozzi's 12 connections within 3
       hops", `06.png`); the list is alphabetical, mixing every ring, so it could not give an order
       either. This is a broken habit by the criteria: a first move into a place the history names
       that offers no way on to the task.
    2. Step 7 (`07.png`): opened the neighborhood view's "..." menu ("Neighborhood actions"), which
       holds only "Frame selection". She went back to Strozzi (`08.png`) and found "Path between..."
       in the node's own "..." menu (`09.png`).
       Step 2 (the find box, `02.png`) was her habit too, and it did lead on: it selected Strozzi,
       whose menu holds the chain tool. Not a wrong turn.
- **Follow-up (the second time):** 6 steps (`14.png` to `19.png`; step 19 is two actions, pick
  Ginori and Find path), 0 wrong turns. She reused the route she had found (find box, node, "...",
  "Path between...") rather than the shorter p shortcut shown in the menu. The target is steps <=
  the follow-up's success path + 1 (about 5); she took about one step more. A target, not a gate,
  in round 1.
- **False "done": none.** Both answers match the screen. Her claim at step 19 that the first chain
  "is gone from the drawing and from the panel" and was replaced is true (the answer key: the
  second run replaces the first; one "Shortest path" row). truth-on-screen: no wrong claim.
- **Traps avoided:** she read the chain from Values, not the drawing, so the Peruzzi-Bischeri edge
  that passes through an orange node not on the path (`19.png`, about 713,604) did not mislead
  her. She did not guess from the 3-hop list (she said "I'm guessing" about Salviati and Pazzi and
  went on to find the tool instead).
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None is a build defect: every control did what the answer
key says it does.

1. **Severity 3 (one session so far; confirmed if another T18 session makes the same first move)
   -- a person's list of connections, the place a returning user's history sends them to read how
   two parties are linked, offers no way on to the chain.** The Hops control stops at 3 with no
   sign that the other party may be further out, the list is alphabetical so it cannot show an
   order, and nothing on that screen names "Path between..." or points to it. A user whose target
   is 3 or fewer ties away would see it in the list and could believe that answers "how are they
   linked" without ever getting the chain. Evidence: `04.png`, `05.png`, `06.png`; her remark
   "Nothing on that screen pointed me at the chain tool."
2. **Severity 2 -- two "..." menus in the same spot hold different things.** On the neighborhood
   view the menu has only "Frame selection"; on the node page it has Neighborhood, "Path
   between...", Frame selection and Add note. The chain tool is a node action, but from the
   neighborhood view it is two screens away and the look-alike menu suggests there is nothing
   else. Evidence: `07.png`, `09.png`.
3. **Severity 2 -- a second path run replaces the first without a word.** The investigator needs
   both chains for the case file and would have exported the first had she known. She noticed, so
   no wrong conclusion. Evidence: `13.png`, `19.png`; her step 19 remark.
4. **Severity 1 -- "hops" is not the reader's word, and one result is counted two ways.** The Graph
   tree says "4 hops", Values says "5 nodes, 4 edges"; she would say "4 marriages, 3 families in
   between". She worked it out. Evidence: `13.png`, `06.png`.

What worked: once found, "Path between..." filled From with the selected family, the To
suggestion moved focus to Find path (`12.png`), and the run's "Nodes in order" and Made with
("Each edge counts as 1.") gave her exactly the documented chain her job asks for. The follow-up
went with no wrong turns.

## What this says about the round

The participant spent her detour on design, not on implementation: no broken control, no wrong
value, no console error was seen, and the trouble was discovering where the chain tool lives from
the place her habit took her (the connections list and its look-alike menu).
