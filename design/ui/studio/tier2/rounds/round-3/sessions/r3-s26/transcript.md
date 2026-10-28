# Session r3-s26 -- Nadia, returning user

Task: the Florentine marriages network is open. Find the chain of families a message passes through from Strozzi to Pazzi, through as few families as possible, in order.

Screenshots are in this folder (01.png to 09.png).
All commands were run as: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <command> <session folder> ...`

## Step 1 -- start
`--start <folder> setup:florentine-ranked.txt` -> 01.png
The network is open, and PageRank sets each circle's size and color. No names are drawn on the circles. The left panel has a find box. I'll do what I do with alerts and type the first name into the find box.

## Step 2 -- find Strozzi
`--step --click "Find nodes, edges, values" --type "Strozzi"` -> 02.png
The find list shows Strozzi with 4 marriages: Castellani, Peruzzi, Ridolfi, Bischeri. Good, that is my connections list right there. Now I'll do the same for Pazzi, the other end, and see whether the two sides meet.

## Step 3 -- find Pazzi
`--step --click "Find nodes, edges, values" --key Control+a --type "Pazzi"` -> 03.png
Pazzi has only one marriage: Salviati. So the message has to come in through Salviati. Next I'll look up Salviati.

## Step 4 -- find Salviati
`--step --click "Find nodes, edges, values" --key Control+a --type "Salviati"` -> 04.png
Salviati is married only to Medici and Pazzi, so the chain ends Medici -- Salviati -- Pazzi. Next is Medici: is it married to any of Strozzi's four in-laws (Castellani, Peruzzi, Ridolfi, Bischeri)?

## Step 5 -- find Medici
`--step --click "Find nodes, edges, values" --key Control+a --type "Medici"` -> 05.png
Medici has six marriages: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. Ridolfi is on Strozzi's list too. So the chain is Strozzi -- Ridolfi -- Medici -- Salviati -- Pazzi. Strozzi is not married to Medici directly (Medici is not on its list of four). Pazzi can only be reached through Salviati, and Salviati only through Medici, so there is no shorter chain. I have my answer, so I'm ending.

## Step 6 -- end
`--end <folder>`
Instead of ending, it asked for more: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?" I'm carrying on in the same session.

## Step 7 -- find Peruzzi
Same routine: type one end into the find box first.
`--step --click "Find nodes, edges, values" --key Control+a --type "Peruzzi"` -> 06.png
Peruzzi is married to Castellani, Strozzi and Bischeri. Now Ginori, the other end.

## Step 8 -- find Ginori
`--step --click "Find nodes, edges, values" --key Control+a --type "Ginori"` -> 07.png
Ginori has one marriage: Albizzi. So the chain ends Albizzi -- Ginori. Next, Albizzi.

## Step 9 -- find Albizzi
`--step --click "Find nodes, edges, values" --key Control+a --type "Albizzi"` -> 08.png
Albizzi is married to Medici, Ginori and Guadagni. None of them is a Peruzzi in-law (Castellani, Strozzi, Bischeri), so at least two families sit in the middle. I already know one route: Peruzzi -- Strozzi -- Ridolfi -- Medici -- Albizzi -- Ginori. That is long, so I'll check whether Bischeri or Castellani reach Guadagni or Medici sooner. Bischeri first.

## Step 10 -- find Bischeri
`--step --click "Find nodes, edges, values" --key Control+a --type "Bischeri"` -> 09.png
Bischeri is married to Peruzzi, Strozzi and Guadagni. Guadagni is on Albizzi's list, so the chain is Peruzzi -- Bischeri -- Guadagni -- Albizzi -- Ginori. Nothing shorter is possible: Ginori is married only to Albizzi, and none of Albizzi's three in-laws (Medici, Ginori, Guadagni) is a Peruzzi in-law, so at least three families sit in between. Done; ending again.

## Step 11 -- end
`--end <folder>`
The session ended.

## Wrap-up (in character)

**Did I finish?** Yes, both.
- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (it passes through Ridolfi, Medici, Salviati).
- Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (it passes through Bischeri, Guadagni, Albizzi).

**Ease: 5 of 7.** The find box did all the work: type a family, read its marriages in the list. Four lookups for each chain, about a minute each. It is the same way I always do it.

**What confused me / what I would say:**
- I worked out each chain by hand from both ends, reading one list after another and writing it down. I saw nothing on screen that offered a route from one family to another, and I did not go looking -- on the clock I use what I know. If the program can do that, nothing on the screen told me.
- The picture never changed while I searched: no names on the circles, nothing lit up for the family I typed. So the graph itself was no help. For the alert file I would want the chain drawn on the picture, and I would have to make that by hand.
- Proving the chain is the SHORTEST rests only on my own reasoning ("Ginori is married only to Albizzi, so..."). QA would ask how I know there is no shorter way, and all I could show them is my notes, not anything the tool showed.
- Typing over the old search each time (select all, then type) was fine, but I lose the previous list, so I had to hold the families in my head between lookups.
