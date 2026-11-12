# Session r5-s18b -- Nadia, level-1 alert reviewer (returning user)

Task: the Florentine marriage network is open. The Strozzi want a message carried to the Pazzi, only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?

All commands run from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs ... tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s18b`.

## 01 (session started for me)
I see the Florentine families network, colored and sized by a PageRank run. No names on the dots. Left panel has the find box. Like any alert: I paste the name into the find box first -- "Strozzi".

## 02 `--click "Find nodes, edges, values" --type "Strozzi"`
The find box lists Strozzi and its 4 marriages: Castellani, Peruzzi, Ridolfi, Bischeri. Good, that is my usual "who is this tied to". Pazzi is not one of them, so it is more than one step. Let me look at the other end: search Pazzi.

## 03 `--key Control+a --type "Pazzi"`
Pazzi has exactly one marriage: Salviati. So the chain must end Salviati -> Pazzi. Now who is Salviati tied to? Search Salviati.

## 04 `--key Control+a --type "Salviati"`
Salviati: Medici and Pazzi. So it has to come through Medici. Is Medici married to one of the Strozzi's four (Castellani, Peruzzi, Ridolfi, Bischeri)? Search Medici.

## 05 `--key Control+a --type "Medici"`
Medici's six marriages include Ridolfi -- and Ridolfi was on the Strozzi list. So: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. It cannot be shorter: Pazzi's only marriage is Salviati, Salviati's only other one is Medici, and Medici is not on the Strozzi list, so Medici is at best two steps from Strozzi. That is my answer. Ending the session.

## --end (first time) -- `--end` answered with a further request
"The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"
Same routine, from the far end first: search Ginori.

## 06 `--click "Find nodes, edges, values" --key Control+a --type "Ginori"`
Ginori has one marriage: Albizzi. Next: Albizzi.

## 07 `--key Control+a --type "Albizzi"`
Albizzi: Medici, Ginori, Guadagni. Now the Peruzzi end -- who are they married to?

## 08 `--key Control+a --type "Peruzzi"`
Peruzzi: Castellani, Strozzi, Bischeri. None of them is Albizzi's other partners (Medici, Guadagni) directly as far as I know yet. Check Guadagni -- is it married to Bischeri, Castellani or Strozzi?

## 09 `--key Control+a --type "Guadagni"`
Guadagni is married to Bischeri, and Bischeri is on the Peruzzi list. So: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori. Nothing shorter: Ginori only reaches Albizzi, and none of Albizzi's partners (Medici, Ginori, Guadagni) is a Peruzzi partner, so it takes at least two families between Peruzzi and Albizzi. Ending.

## --end (second time): `--end` -- session ended.

## At the end, in character

**Did I finish?** Yes, both.
- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (passes through Ridolfi, Medici, Salviati).
- Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (passes through Bischeri, Guadagni, Albizzi).

**Ease: 5 of 7.** The find box did what I always use it for: type a family, get its marriages as a list. Four or five searches per chain, a couple of minutes each, and I can write the chain down for QA because every link was in a list I read.

**What confused me / what I would say:**
- I worked backwards from the end with only one marriage (Pazzi, Ginori) because that is the fastest way by hand. I never saw anything that would just work out the chain for me between two families -- if it exists, nothing on this screen pointed me at it, and I did not go hunting with a deadline on.
- Proving "as few as possible" was on me: I had to reason that no shorter route exists by comparing lists in my head. QA would want that written down, and the program gave me nothing to paste as proof -- no picture with the route marked.
- The dots on the picture have no names, so the picture was no help at all; everything came from the lists on the left.
- Each search replaces the last list, so I had to remember Strozzi's four partners while reading Medici's six. On a bigger network that is where I would make a mistake.
