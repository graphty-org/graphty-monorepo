# Session r3-s12 -- Dana Okafor (returning user)

Task: on the Les Miserables network, without removing any character or tie, point out on the
drawing every tie of 10 or more shared chapters, and say how many there are.

Screenshots and logs are beside this file.

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs --start tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s12 setup:lesmis-ranked.txt

01.png: the network is open, orange balls sized and colored by PageRank, a legend top left,
a PageRank style panel on the right. Left panel: a search box "Find nodes, edges, values",
then Selection, PageRank (77), Everything. The ties are thin grey lines, all looking the same.
Dana: "Okay, this is the ranking I ran last time. Now I want the strong ties. The search box
says it finds edges and values -- I'll try that first."

## Step 1

    node design/ui/studio/tool/real.mjs --step tmp/.../r3-s12 --click "Find nodes, edges, values" --type "10"

02.png: two ties come up, both with exactly "shared_chapters: 10" (MmeMagloire -- Myriel,
Bossuet -- Enjolras), plus a "Values" row "Select where shared_chapters is 1..." (cut off).
Dana: "So the column is called shared_chapters. But that's only the ones at exactly 10. I need 10
and up. Let me try typing it like a filter, the way I would in Excel."

## Step 2

    node design/ui/studio/tool/real.mjs --step tmp/.../r3-s12 --key Control+a --type "shared_chapters >= 10"

03.png: the box understood it. A hint "Start with = to select by a value:" and one suggestion
"=shared_chapters >= `10`  Select its matches". Dana: "Odd little quote marks around the 10, but
fine. 'Select its matches' -- selecting is not removing anything, so that fits. Clicking it."

## Step 3

    node design/ui/studio/tool/real.mjs --step tmp/.../r3-s12 --click "Select its matches"

04.png: "13 edges selected". The 13 ties are drawn thick and blue on the drawing; every
character and every other tie is still there in grey. The right panel switched to Values with a
table "Selected edges": Edge / shared_chapters, 13 rows, smallest 10 (MmeMagloire -- Myriel,
Bossuet -- Enjolras), largest 31 (Cosette -- Valjean). Every row is 10 or more. Dana: "That's it.
Thirteen. They're lit up on the picture and the table backs it up, and nothing got deleted. The
table is the part I'd actually take to the meeting."

## End

    node design/ui/studio/tool/real.mjs --end tmp/.../r3-s12

Ended cleanly (no further request).

## Debrief (in character)

- **Finished?** Yes. 13 ties have 10 or more shared chapters; they are highlighted in blue on
  the drawing, and nothing was removed.
- **Ease:** 6 of 7.
- **What confused me:**
  - Typing plain "10" only found ties at exactly 10. I only got "10 and up" because I guessed I
    could type a comparison; nothing on screen said I could.
  - The "Values" suggestion under the plain "10" search was cut off ("Select where
    shared_chapters is 1...") so I could not read what it would do.
  - The suggestion showed the 10 in odd backtick quotes (`10`) and said "Start with = to select by
    a value", which reads like a formula language I have never been taught.
  - The search box filled itself in with "=shared_chapters >= `10`" after I clicked; fine, but I
    would not have typed that myself.
  - The table on the right is small grey-on-dark text; readable on my desk monitor, hard on the
    laptop. I'd want to get that table out to Excel.
