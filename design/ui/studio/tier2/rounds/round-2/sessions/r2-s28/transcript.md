# Session r2-s28 -- Dana (supply-chain risk analyst, returning), task T18, dataset B (Florentine families)

Task as given: "You have used this program a few times. The ready-made network of marriages between the
leading families of Renaissance Florence is already open. The Strozzi want a message carried to the
Pazzi, passed only between families joined by marriage, through as few families as possible. Which
families does it pass through, in order?"

Commands run from design/ui/studio/tool with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/

## Start

`node real.mjs --start $S setup:florentine-ranked.txt` -> 01.png

01: The Florentine network is open, dots colored and sized by PageRank like last time. No names on
the dots, so I can't tell which one is Strozzi or Pazzi. There's the find box at the top left that I've
used before -- I'll type Strozzi there first.

## Step 2

`--step --click "Find nodes, edges, values" --type "Strozzi"` -> 02.png

02: Good, a table-ish list. Strozzi is married to four: Castellani, Peruzzi, Ridolfi, Bischeri. That's
a list I can work with. Now let me see who the Pazzi are married to -- I'll clear and type Pazzi.

## Step 3

`--step --key Control+a --type "Pazzi"` -> 03.png

03: Pazzi only has one marriage: Salviati. So the message has to come in through the Salviati. I could
keep doing this by hand like a VLOOKUP chain, but this is exactly the kind of "what's connected to
what, how many hops" question a tool should answer. Let me look in the analysis button I use for the
ranking and see if there's something for it.

## Step 4

`--step --click-at 679,864` (button "Analyze") -> 04.png

04: The analysis list. It's long and all rankings -- Degree, Betweenness, Closeness, Katz, HITS... I
don't want a ranking, I want the chain between two families. There's a filter box at the top. I'll
type "chain" and see if anything answers that.

## Step 5

`--step --type "chain"` -> 05.png

05: One hit: "Shortest path -- the fewest steps ... between two nodes". "Fewest steps between two" is
exactly my question. I'll click it.

## Step 6

`--step --click "Shortest path"` -> 06.png

06: A small form: From, To, Weight (None), and "Find path". Simple enough. From is Strozzi. I'll click
in From and type it.

## Step 7

`--step --click "Where the path starts" --type "Strozzi"` -> 07.png

07: It suggests Strozzi in a dropdown. I'll pick it from the list so it's definitely the right one.

## Step 8

`--step --click-at 557,679` (option "Strozzi") -> 08.png

08: From says Strozzi and the To box looks focused already. Nice, it moved me along. Typing Pazzi.

## Step 9

`--step --type "Pazzi"` -> 09.png

09: Pazzi suggested. Picking it from the list.

## Step 10

`--step --click-at 552,733` (option "Pazzi") -> 10.png

10: Strozzi to Pazzi, weight None -- marriages don't have a weight anyway. Find path.

## Step 11

`--step --click "Find path"` -> 11.png

11: There it is, and as a table on the right, which is what I want: "Nodes in order" -- Strozzi 1,
Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. Summary says 5 nodes, 4 edges, and the left list calls it
"4 hops". The chain is drawn in black on the picture too. It agrees with what I saw by hand: Pazzi's
only marriage is to the Salviati, so it had to end Salviati -> Pazzi. "Each edge counts as 1" is a
helpful line -- tells me it's counting marriages, not something weighted.

**My answer:** the message passes Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. That is, through
the Ridolfi, the Medici and the Salviati (three families in between, four handoffs).

Done with the main question.

## Follow-up (given once the main prompt was done)

"The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass
through, in order?"

Same thing again. I'll open the analysis button -- hopefully Shortest path is up top under Recent now.

## Step 12

`--step --click "Analyze"` -> 12.png

12: Shortest path is at the top under Recent. Clicking it.

## Step 13

`--step --click-at 565,448` (option "Shortest path ...") -> 13.png

13: Empty form again. Fine. Typing Peruzzi into From.

## Step 14

`--step --click "Where the path starts" --type "Peruzzi"` -> 14.png

14: Peruzzi suggested. Pick it, then type Ginori in To (it moved focus there last time).

## Step 15

`--step --click-at 558,679 --type "Ginori"` (option "Peruzzi") -> 15.png

15: Peruzzi in From, Ginori suggested in To. Pick Ginori and hit Find path.

## Step 16

`--step --click-at 554,733 --click "Find path"` (option "Ginori") -> 16.png

16: New table: Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5 -- 4 hops again. The black line
on the picture now runs from the bottom up the right side. On the drawing, the black line from the
bottom dot seems to pass right over an orange dot on its way up, so from the picture alone I would not
be sure whether that orange one is in the chain; the table settles it, so I read the table.

One thing I noticed: the left list still shows just one "Shortest path, 4 hops" -- the Strozzi one is
gone, replaced by this one. Today that's fine, but if I'd wanted both chains side by side for a slide,
I'd have had to write the first one down. I didn't need to check further for this task.

**My follow-up answer:** Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (through the Bischeri,
the Guadagni and the Albizzi).

Done. Ending the session.

`--end $S`

(The first `--end` printed the follow-up request word for word and asked to carry on; it is the same
Peruzzi-to-Ginori request already answered in steps 12-16 above, so `--end` was run again.)

## Debrief (in character, Dana)

**Did I finish?** Yes, both.
- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi.
- Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.

**Ease: 6 out of 7.** I didn't have to ask anyone. Once I found the right analysis, it took four or five
clicks and gave me an ordered table, which is how I like it. The second time took under a minute
because the analysis sat at the top under Recent.

**What confused me or slowed me down:**
- Finding it. The analysis list opens on a long run of rankings with names like Katz, HITS and
  Eigenvector, and that's not what I wanted. I only found "Shortest path" because I typed "chain" in the
  filter box. If I'd just scrolled, I might have given up and done it by hand from the find box, which
  is what I started doing (Pazzi only married the Salviati, so I already knew the last step).
- There are no names on the dots, so the picture alone doesn't tell me who is who. The black line was
  clear enough, but where it crosses over another dot I couldn't tell from the drawing whether that
  family was in the chain. The "Nodes in order" table is what I trusted.
- Running the second chain replaced the first one in the list on the left. For a Thursday slide I'd
  want to keep both, or at least export the table. I didn't try exporting this time.
- "Weight: None" was fine once I read "Each edge counts as 1" underneath. Without that line I'd have
  wondered whether it was skipping something.

**So what for my work:** in supplier terms this is "how many handoffs between this sub-supplier and
our plant". That's only useful if I have the Tier 2 links, and mostly I don't. On the data I do have,
it's quicker than tracing by hand in Excel.
