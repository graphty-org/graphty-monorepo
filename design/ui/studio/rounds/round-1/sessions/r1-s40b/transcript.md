# Session r1-s40b -- Dev (class-project student), task T8 "Circles of characters", Les Miserables

Commands run from `design/ui/studio` with `S=rounds/round-1/sessions/r1-s40b`.

Note on setup: the start command waited about 20 minutes for a free browser slot before 01.png
appeared ("waiting for a free browser slot ..."). Roughly twenty other study sessions and several
unrelated browser checks were queued on the four slots at the same time.

## Steps

1. `node tool/real.mjs --start $S empty` -> 01.png
   - Saw: a start screen. "Start" with "Open project or file..." and "New from data...", "Recent
     projects" (empty), and "Samples" listing Les Miserables (77 characters), Zachary's karate club,
     College football, Florentine families. A box at the bottom: "Your data is yours, but please
     help us" with "Share usage data" / "No thanks".
   - Think-aloud: "I read all of it. The Les Miserables sample is right there, and its description
     even says it's good for a first look at communities -- that's my assignment word. First I'll
     get rid of the data question."

2. `--step $S --click "No thanks"` -> 02.png (the banner closed).

3. `--step $S --click "Les Miserables"` -> 03.png
   - Saw: the network drawn as purple dots and gray lines. Left panel: "Selection", "Everything".
     Right panel "Overview": Nodes 77, Edges 254, Components 1. Bottom-left hint: "Analyze
     (Shift+A) to add results here". A toolbar at the bottom with five icons.
   - Think-aloud: "OK, I have a drawing. In the tutorial the next thing after layout is Statistics
     and Modularity. There's no 'Statistics' word, but the hint says Analyze. The flask icon is
     probably that."

4. `--step $S --hover-at 659,864` -> 04.png; tooltip "Analyze Shift+A". Confirmed.

5. `--step $S --click "Analyze"` -> 05.png
   - Saw: a list under "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
     PageRank ("Start here"), Eigenvector, Katz, HITS, ... and a "Filter analyses" box.
   - Hesitation: "These are all ranking things. I want groups. I don't see 'Modularity' in what's
     visible. Let me just type the tutorial word."

6. `--step $S --type "modularity"` -> 06.png
   - Saw: "Find groups": Louvain ("Start here", "Which nodes form densely linked groups") and
     Leiden.
   - Think-aloud: "Nice, typing 'modularity' found it even though it's called Louvain. 'Densely
     linked groups' is what I want, and it says Start here."

7. `--step $S --click "Louvain"` -> 07.png
   - Saw: a Louvain card with "Resolution: 1", "Under a second", and a Run button.
   - Think-aloud: "I don't know what resolution means. Gephi had that too; I'll leave the default."

8. `--step $S --click "Run"` -> 08.png
   - Saw: dots recolored in six colors. A legend "Color: Communities" with Group 1 to Group 6.
     Left panel now shows "Communities 6" with counts: Group 1 20, Group 2 17, Group 3 11,
     Group 4 11, Group 5 10, Group 6 8.
   - Think-aloud: "That's it -- six circles, and the biggest is Group 1 with 20. Now I need names.
     The dots have no labels, so I'll click the group in the list."

9. `--step $S --click-at 141,188` (treeitem "Group 1") -> 09.png
   - Saw: right panel "Group 1": Size 20, Made by Communities, and "Members -- First 10":
     MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais,
     Fauchelevent, Bamatabois.
   - Think-aloud: "There are the names. Valjean is in it -- the main character. I'll take Valjean,
     Fauchelevent and MlleBaptistine."
   - Small hesitation: the drawing did not visibly change when I picked Group 1 -- I couldn't tell
     which orange/yellow dots were the 20 just by looking, and the names only appear in the side
     panel, not on the dots. Only the first 10 of 20 are listed.

10. `--end $S`

## Answer (in character)

- How many circles: **6**
- Largest: **Group 1, 20 characters**
- Three characters in it: **Valjean, Fauchelevent, MlleBaptistine** (also MmeMagloire, Marguerite,
  Gervais, Bamatabois ...)

## Debrief (in character)

- **Did I finish?** Yes.
- **How hard (1 = very easy, 7 = very hard):** 2.
- **What confused me:**
  - The word "Modularity" from my tutorial isn't anywhere on screen; I only found Louvain because
    typing it into the filter worked. If I had scrolled the list instead, I'm not sure I'd have
    known "Louvain" was the one.
  - "Resolution" has no explanation; I left it at 1 and hoped.
  - The groups are just "Group 1..6" -- fine for counting, but for my essay I'd want to see the
    names on the dots. Clicking a group listed its members on the right, but didn't make those dots
    stand out in the picture, and only showed the first 10.
  - "Analyze" vs the "Statistics" word I was taught -- the hint at the bottom-left saved me.
</content>
</invoke>
