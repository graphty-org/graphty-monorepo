# Session r1-s24 -- Tom (returning), task T18 prompt B (Florentine families)

Build: frozen build 946256efb876 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/), setup florentine-ranked.txt.

Task as given: "The Strozzi want a message carried to the Pazzi, passed only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?"

## Steps

### 01 -- start
Command: `REAL_DIST=... node ../tool/real.mjs --start .../r1-s24 setup:florentine-ranked.txt`
Screenshot 01.png. Tom: "Right, that's the families map, the one I had ranked -- big brown balls, the PageRank thing on the left. No names on any of them though. I don't know which ball is the Strozzi. There's the search box at the top left that I've used before; I'll type Strozzi in there."

### 02 -- click the find box
Command: `--step --click "Find nodes, edges, values"` -> 02.png. Cursor in the box.

### 03 -- type Strozzi
Command: `--step --type "Strozzi"` -> 03.png. The list shows one node, Strozzi, and four marriages: Castellani, Peruzzi, Ridolfi, Bischeri. Tom: "Good, that's a list I can read. Strozzi married into four families. The ball itself didn't light up on the picture that I can see, but the list is fine. Now the other end -- I'll clear this and look up the Pazzi the same way, see who they married, and meet in the middle."

### 04 -- clear the box
Command: `--step --click-at 275,90` (the little x, "Clear search") -> 04.png. Back to the plain list; the box still has the cursor.

### 05 -- click the find box again
Command: `--step --click "Find nodes, edges, values"` -> 05.png. (Did not need to; the cursor was already there.)

### 06 -- type Pazzi
Command: `--step --type "Pazzi"` -> 06.png. One marriage only: Salviati -- Pazzi. Tom: "So the Pazzi only married the Salviati. Then whatever happens it has to go through the Salviati at the end. Let me look the Salviati up."

### 07 -- clear the box
Command: `--step --click-at 275,90` -> 07.png.

### 08 -- type Salviati
Command: `--step --type "Salviati"` -> 08.png. Salviati married two: Medici and Pazzi. Tom: "So the end of the chain is Medici, Salviati, Pazzi. Now does the Medici family connect to any of the four the Strozzi married -- Castellani, Peruzzi, Ridolfi, Bischeri? Look up Medici."

### 09 -- clear the box
Command: `--step --click-at 275,90` -> 09.png.

### 10 -- type Medici
Command: `--step --type "Medici"` -> 10.png. Medici married six: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. Ridolfi is one of the four the Strozzi married. None of the other three Strozzi marriages (Castellani, Peruzzi, Bischeri) is in the Medici list. Tom: "There it is. Strozzi to Ridolfi, Ridolfi to Medici, Medici to Salviati, Salviati to Pazzi. The Pazzi only have the Salviati and the Salviati only have the Medici besides, so it can't be any shorter -- the Strozzi aren't married to the Medici directly. I did it on paper, basically, but I'm sure of it."

**Answer given:** Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. It passes through three families in between: Ridolfi, Medici, Salviati (four marriages).

## Follow-up
Given word for word: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"

Tom: "Same again then. Peruzzi first."

### 11 -- clear the box
Command: `--step --click-at 275,90` -> 11.png.

### 12 -- type Peruzzi
Command: `--step --type "Peruzzi"` -> 12.png. Peruzzi married Castellani, Strozzi, Bischeri. Tom: "Three. Now the other end, Ginori."

### 13 -- clear the box
Command: `--step --click-at 275,90` -> 13.png.

### 14 -- type Ginori
Command: `--step --type "Ginori"` -> 14.png. Ginori married only the Albizzi. Tom: "Same trick as the Pazzi -- only one way in. So who did the Albizzi marry?"

### 15 -- clear the box
Command: `--step --click-at 275,90` -> 15.png.

### 16 -- type Albizzi
Command: `--step --type "Albizzi"` -> 16.png. Albizzi married Medici, Ginori, Guadagni. Tom: "Medici I already looked at -- none of the Peruzzi's three are married to the Medici. So it has to be the Guadagni. Check who they married."

### 17 -- clear the box
Command: `--step --click-at 275,90` -> 17.png.

### 18 -- type Guadagni
Command: `--step --type "Guadagni"` -> 18.png. Guadagni married Tornabuoni, Albizzi, Bischeri, Lamberteschi. Bischeri is one of the Peruzzi's three. Tom: "Bischeri. So Peruzzi, Bischeri, Guadagni, Albizzi, Ginori. The Castellani and Strozzi don't touch the Albizzi or Guadagni from what I've seen, and the Ginori only have the Albizzi, so that's as short as it gets."

**Follow-up answer given:** Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori. Three families in between: Bischeri, Guadagni, Albizzi.

### End
Command: `--end .../r1-s24`.

## In Tom's words, at the end

**Did you finish?** Yes, both. Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi, and Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.

**Ease (1-7):** 4. "I got there, and I trust the answer because I read every marriage myself. But I did it the way I'd do it with a family tree on paper: look one family up, write down who they married, look the next one up. Nine lookups for two questions. If the Pazzi had married six families instead of one I'd still be at it."

**What confused me or slowed me down:**
- "The picture is no help for this. None of the balls have names, so I couldn't just look and trace it with my finger. When I typed a family in the box, the list told me who they married, but I couldn't see that family light up on the picture -- or if it did, I missed it. I used the list the whole time and ignored the drawing."
- "I had to clear the box and type the next name every time. Nine times. I couldn't click a name in a marriage line, say 'Medici -- Ridolfi', and go straight to the Ridolfi -- or I didn't think to try; nothing told me I could."
- "I never found anything that said 'here's the shortest way between these two'. I didn't go looking for one either -- the analysis button is where I ranked people, and I wasn't going to start pressing things I don't know in there. If it's there, it's well hidden for someone like me."
- "Being sure it was the shortest was on me. Nothing on the screen said 'that's the fewest'. I had to reason that the Pazzi only have one marriage, so it has to come through the Salviati, and so on. With a bigger list I'd have got it wrong."
- "The list said 'Edges 4'. I know from last time that means marriages here, but I'd rather it said that."
