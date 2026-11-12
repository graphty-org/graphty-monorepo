# Session r2-s37 -- Ruth (returning), T21 prompt A (running club, friends.csv to friends-v2.csv)

Build: 8f0d5a6f7791 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/)
T=design/ui/studio/tool, run from design/ui/studio/tier2, S=rounds/round-2/sessions/r2-s37

## Start

    REAL_DIST=... node ../tool/real.mjs --start $S setup:friends-ranked.txt   -> 01.png

01: My running-club map is open, "friends", file friends.csv in the left list. There is a PageRank
run in the list, 20, and the right side shows its Style. First I want to write down who was first
before I touch anything: I'll open Values, like last time.

    node ../tool/real.mjs --step $S --click "Values"   -> 02.png

02: Top 10 before: Farah 0.06394 first, then Hana 0.05941, Milo 0.05648. Written down. "Made with"
says weight read as closer, assumed. Now the new list. The file is listed under "Graph friends.csv";
there's a Data button on the far left. I'll look there for where the file comes in.

    node ../tool/real.mjs --step $S --click "Data"   -> 03.png

03: Sources: friends.csv, 20 nodes, 41 edges. That matches my 20 people. I'll click the file to see
what I can do with it.

    node ../tool/real.mjs --step $S --click "friends.csv"   -> 04.png

04: The right side now says friends.csv, Source, Loaded 20 nodes, 41 edges, and a table of ties
opened at the bottom: Ava-Ben 3, Ava-Chloe 5, Ava-Dev 2, Ben-Chloe 4. I'll note Ava-Ben = 3 to check
later that the new numbers really arrived. There's a "..." menu next to the file name on the right;
I'll open it.

    node ../tool/real.mjs --step $S --click-at 1419,73   -> 05.png ("Source actions")

05: The menu offers "Edit source..." and "Replace with file...". "Replace with file" is plainly
what I want. I'll click it and pick friends-v2.csv.

    node ../tool/real.mjs --step $S --click "Replace with file..."   -> 06.png (a file chooser opened)

06: The file picker is open. I pick friends-v2.csv from Downloads.

    node ../tool/real.mjs --step $S --upload friends-v2.csv   -> 07.png

07: A full-page "Replace: friends-v2.csv -- Was 20 nodes, 41 edges; now 20, 41." Good, it told me
the counts before and after without my asking: nobody dropped. The rows show the new numbers:
Ava-Chloe is now 1 (was 5), Ava-Dev 4 (was 2), Ava-Ben still 3. "Higher means: Not set", with the
line "PageRank and communities read a higher weight as closer" -- that is the same assumption the
old run said it made, so I leave it alone to keep the comparison like for like. Direction "As the
file says". I'll press Replace.

    node ../tool/real.mjs --step $S --click "Replace"   -> 08.png

08: Back on the map. Top left now reads "Graph friends-v2.csv". The ties table shows Ava-Chloe 1,
Ava-Dev 4: the new numbers are in. The key on the drawing says "Size: PageRank, out of date" --
honest, it knows the ranking is from the old list. The PageRank entry is still in my list, with a
little clock-like icon. My work survived. I'll click PageRank to see how to redo it.

    node ../tool/real.mjs --step $S --click "PageRank"   -> 09.png

09: The run's panel says "Data changed since this run" with a blue "Rerun" button. The top ten is
still the old one (Farah 0.06394), ran Oct 9, 8:35:24 PM -- clearly labelled old. Rerun it is.

    node ../tool/real.mjs --step $S --click "Rerun"   -> 10.png

10: The banner is gone, "ran Oct 9, 8:37:08 PM", the key no longer says out of date and reads
0.02872 to 0.08012. New top ten: Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi
0.05308. Ava was not even in the old top ten; Farah drops to second. Same 20 of 20 have a value.
Made with: weight read as closer, assumed, same as the first run, so the two are comparable. That's
my answer. I'm done.

    node ../tool/real.mjs --end $S

## In character, at the end

Finished: yes. Who was first before: Farah (0.06394, on friends.csv). Who is first now: Ava
(0.08012, on friends-v2.csv). Farah is second now.

Ease: 6 of 7.

What worked: the file's own menu said "Replace with file...", which is exactly what I meant. The
replace screen told me "was 20 nodes, 41 edges; now 20, 41" before I committed, so I knew nobody
was dropped, and it showed me the new numbers line by line. Afterwards the key said "out of date"
and the run said "Data changed since this run" with a Rerun button -- I never had to wonder whether
I was looking at old numbers.

What confused me or slowed me:
- Finding where to swap the file took two guesses: the Graph list names the file but does nothing
  with it; I had to go to Data, click the file, and open an unlabeled "..." on the right. A first
  timer might not open that "...".
- Once I pressed Rerun, the old top ten was gone. I had written Farah down first, so I was fine,
  but the program never shows before and after side by side; if I had not copied it I could not
  have told my editor who was first last month.
- "Higher means: Not set" on the replace screen made me stop and think. Its sentence explained
  what happens if I leave it, which was enough, but I had to read it twice.
