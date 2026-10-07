# Session r3-s21 -- Grace (nonprofit operations analyst), task T12 B (Florentine families)

Task as given: practice on the ready-made network of Renaissance Florence families and their marriages. Go to the Medici family, read what the program knows about them, and see which families they married into. Say who they are and how many.

Tool: `T=design/ui/studio/tool; S=design/ui/studio/rounds/round-3/sessions/r3-s21` (paths relative to the studio worktree).

## Step 1 -- start
Command: `node $T/real.mjs --start $S empty`
Saw (01.png): a start page. Left: "Open project or file...", "New from data...", a line saying files are read on this computer and never uploaded (good -- I always look for that). Right: Samples, including "Florentine families -- 15 families, marriages between the leading families of Renaissance Florence". At the bottom a box asking to share usage data.
Thinking: I'll say no to the usage data first, then open the Florentine families sample.

## Step 2 -- decline usage data
Command: `--click "No thanks"` -> 02.png
Saw: the box went away (prints only the screenshot path). Now clicking the Florentine families sample.

## Step 3 -- open the sample
Command: `--click "Florentine families"` -> 03.png
Saw: the drawing -- 15 blue balls joined by lines, no names on any of them. Right side: Nodes 15, Edges 20 (good, matches the "15 families" on the start page). There's an odd line "Undirected, from the file: directed 0" which I didn't understand. "Edges per n..." is cut off. On the left there's a box "Find nodes, edges, values".
Hesitation: no names on the balls, so I can't just point at the Medici. I'll type the name in the Find box.

## Step 4 -- try the Find box by its words
Command: `--click "Find nodes, edges, values" --type "Medici"` -> 04.png
Result: the tool said nothing on screen is called "Find nodes, edges, values" and nothing was typed. (The grey words in the box are only a placeholder, apparently not the box's name.) I'll point at the box instead.

## Step 5 -- type Medici in the Find box
Command: `--click-at 180,90 --type "Medici"` -> 05.png (tool: "combobox Find")
Saw: a dropdown under the box: "Elements -- Medici" and "Values -- Select where name is Medici (1)". The drawing hasn't changed yet. The first one, "Medici" under Elements, looks like the family itself, so I'll click that.

## Step 6 -- pick Medici from the list
Command: `--click-at 116,153` (option "Medici") -> 06.png
Saw: one ball in the middle is now ringed in yellow. Right panel: "Medici -- Node", Summary: id Medici, name Medici, Degree 6 with a little ">" arrow. "Selection 1" on the left.
That is what the program knows: just the name and "Degree 6". I guess "degree" means 6 lines, i.e. married into 6 families -- but it doesn't say which. Still no names on the drawing. The ">" next to Degree looks like it might open a list, so I'll click that row.

## Step 7 -- open the Degree row
Command: `--click-at 1320,236` (button "Degree 6") -> 07.png
Saw: the right panel changed to "Medici -- Neighborhood", heading "Medici's 6 connections", and a list: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Seven balls are now ringed yellow on the drawing (Medici plus six). On the left "Selection" now says 7, which made me stop for a second -- the heading says 6 -- until I realised the 7 counts the Medici themselves too.
That is my answer, so I'm done.

## End
Command: `node $T/real.mjs --end $S`

## In character -- Grace's wrap-up

**Did I finish?** Yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati and Tornabuoni. What the program knows about the Medici themselves is only their name (id and name both "Medici") and "Degree 6".

**How easy, 1 (very difficult) to 7 (very easy):** 6. Seven steps, no dead ends. Finding the family by typing in the Find box worked straight away, and the list of six names was exactly what I'd paste into Excel.

**What confused me or slowed me down:**
- The drawing has no names on it at all. With 15 balls I could not tell which one was the Medici without the Find box; for a board slide I'd need names on it.
- "Degree 6" is jargon. I only guessed it meant "six marriages", and I only found the list of families because the ">" arrow next to it hinted it would open something. A plainer word like "Connections 6" or "Married into 6" would have told me before I clicked. Once open, the heading "Medici's 6 connections" was clear.
- "Selection 7" on the left next to "6 connections" on the right -- two different numbers for what looked like the same thing; I worked out the 7 includes the Medici, but I double-checked.
- The overview line "Undirected, from the file: directed 0" meant nothing to me, and "Edges per n..." was cut off.
- Nothing said these ties are marriages; the program calls them connections/edges. Fine for this sample since the start page said "marriages", but I had to remember that.
- Good: the start page said files are read on this computer and never uploaded, and the top bar says "Local only" -- that's what I look for with donor names.
