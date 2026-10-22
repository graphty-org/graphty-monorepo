# Session r5-s24b -- transcript (participant: the recipe recipient, returning user)

Task: the Florentine marriages network is open. The Strozzi want a message carried to the Pazzi, only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?

Commands use REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and session folder tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s24b (S below).

## 01.png (start, already open)

"Florentine families" is open, orange balls of different sizes, a PageRank legend top left. None of the balls have names on them. I can't tell which one is the Strozzi. There's a "Find nodes, edges, values" box on the left -- I'll type Strozzi in there first.

Command: `--step S --click "Find nodes, edges, values" --type "Strozzi"` -> 02.png

## 02.png

Good, a list. Strozzi is one family, with four lines: Castellani, Peruzzi, Ridolfi, Bischeri. So those are their marriages. Now I'll look up the Pazzi the same way and see who they are married to.

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Pazzi"` -> 03.png

## 03.png

Pazzi has only one line: Salviati. So the message has to go through the Salviati last. Now Salviati -- who are they married to?

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Salviati"` -> 04.png

## 04.png

Salviati: Medici and Pazzi. So it's ...Medici, Salviati, Pazzi at the end. Now does the Medici family touch one of the Strozzi's four (Castellani, Peruzzi, Ridolfi, Bischeri)? Looking up Medici.

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Medici"` -> 05.png

## 05.png

Medici has six lines, and one of them is Ridolfi -- and Ridolfi was on the Strozzi's list. So: Strozzi to Ridolfi, Ridolfi to Medici, Medici to Salviati, Salviati to Pazzi. The Pazzi only have the Salviati, the Salviati only have the Medici besides them, and the Medici aren't married to the Strozzi directly, so I don't see a way with fewer families in between. That's my answer; I'm stopping here.

Command: `--end S`

`--end` came back with a second request: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?" Carrying on in the same session.

Same trick. Start from the end this time: who are the Ginori married to?

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Ginori"` -> 06.png

## 06.png

Ginori only have the Albizzi. So it ends Albizzi, Ginori. Now Albizzi.

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Albizzi"` -> 07.png

## 07.png

Albizzi: Medici, Ginori, Guadagni. Now the start end: who are the Peruzzi married to? I remember Strozzi from before, but let me see the whole list.

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Peruzzi"` -> 08.png

## 08.png

Peruzzi: Castellani, Strozzi, Bischeri. None of those is the Albizzi, so it's at least two families in the middle before Albizzi. Medici route through Strozzi would be Strozzi, Ridolfi, Medici -- that's long. Let me check the Guadagni: if they're married to one of the Peruzzi's three, that's shorter.

Command: `--step S --click "Clear search" --click "Find nodes, edges, values" --type "Guadagni"` -> 09.png

## 09.png

Guadagni: Tornabuoni, Albizzi, Bischeri, Lamberteschi. Bischeri is one of the Peruzzi's. So: Peruzzi to Bischeri, Bischeri to Guadagni, Guadagni to Albizzi, Albizzi to Ginori. The Albizzi's other families (Medici, Guadagni) aren't married to the Peruzzi, so there's no way with only one family in the middle. That's it. Ending.

Command: `--end S`

Session ended (exit 0).

## Afterwards, in my own words

**Did I finish?** Yes, both.
- Strozzi to Pazzi: Strozzi, Ridolfi, Medici, Salviati, Pazzi.
- Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi, Ginori.

**Ease: 5 out of 7.**

**What confused me / what annoyed me:**
- The picture itself was no help. None of the balls had names on them, so I couldn't just look and trace it with my finger. I did the whole thing from the search box on the left, one family at a time, writing down who's married to whom. Like working it out from an Excel sheet.
- The search list is good: you type a family and it shows its marriages as "Medici -- Salviati" lines. That's plain. But nothing told me whether I had the shortest way. I had to work it out myself by checking the families at both ends, and if I'd missed one I'd never know. I'd be nervous saying it out loud in lab meeting.
- When I typed a family, nothing lit up on the picture, so I still don't know which ball is the Strozzi or the Pazzi.
- The colours and sizes say "PageRank" with numbers like 0.03066 to 0.1458. I don't know what that is and it didn't matter for this question, so I ignored it.
- "Local only" up top -- I took that to mean nothing went anywhere. Fine.
- I didn't change anything: only typed in the search box and cleared it.
