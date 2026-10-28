# Session r2-s32 -- Elena (returning), task T18, prompt B (Florentine families)

Frozen build: tier2-r2d4-8f0d5a6f7 (commit 8f0d5a6f7791).

Prompt: "The Strozzi want a message carried to the Pazzi, passed only between families joined by
marriage, through as few families as possible. Which families does it pass through, in order?"

## Steps

### 01 -- start
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node tool/real.mjs --start .../r2-s32 setup:florentine-ranked.txt`

What I see: the Florentine families network, orange dots sized and colored by something called
PageRank (I think that's the "who matters most" thing I ran last time). No names on the dots, so I
can't tell which one is the Strozzi. Last time I used the find box at the top left to jump to a
name. I'll type "Strozzi" there.

### 02 -- typed "Strozzi" in the find box
`node tool/real.mjs --step .../r2-s32 --click "Find nodes, edges, values" --type "Strozzi"`

What I see: the find box lists one node, Strozzi, and four links: Castellani, Peruzzi, Ridolfi
and Bischeri. So those are the families the Strozzi married into. Handy -- I can read it like a
list. Now I want the same for the Pazzi, to see who they're tied to, and then look for an overlap.
I'll clear the box and type "Pazzi".

### 03 -- typed "Pazzi"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Pazzi"`

What I see: Pazzi has just one link, to Salviati. So the message has to come in through the
Salviati. Now who are the Salviati tied to? I'll search "Salviati".

### 04 -- typed "Salviati"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Salviati"`

What I see: Salviati is tied only to Medici and Pazzi. So it goes ... Medici, Salviati, Pazzi at
the end. Now, does Medici touch any of the Strozzi's four (Castellani, Peruzzi, Ridolfi,
Bischeri)? I'll search "Medici".

### 05 -- typed "Medici"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Medici"`

What I see: Medici has six links: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati.
Ridolfi is one of the Strozzi's four! So: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi.

Can it be shorter? The Pazzi only have the Salviati, and the Salviati only have the Medici and
the Pazzi, so any chain has to come in Medici -> Salviati -> Pazzi. The Strozzi are not tied to
the Medici directly (Medici's list has no Strozzi), so at least one family has to sit between
them, and Ridolfi is the only one of the Strozzi's four that shows up in the Medici's list. I'm
fairly confident that's the answer. I'm done; ending the session.

`node tool/real.mjs --end .../r2-s32` -- the session stayed open with the follow-up request:
"The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass
through, in order?"

My answer to the first request: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (it passes
through Ridolfi, Medici and Salviati).

## Follow-up: Peruzzi to Ginori

Same trick. I'll start from the end with fewer ties: search "Ginori".

### 06 -- typed "Ginori"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Ginori"`

What I see: Ginori has one link, Albizzi. So it ends Albizzi -> Ginori. Next: who are the Albizzi
tied to?

### 07 -- typed "Albizzi"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Albizzi"`

What I see: Albizzi is tied to Medici, Ginori and Guadagni. So the chain comes in through either
Medici or Guadagni. Now the other end: who are the Peruzzi tied to?

### 08 -- typed "Peruzzi"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Peruzzi"`

What I see: Peruzzi is tied to Castellani, Strozzi and Bischeri. None of those three were in the
Medici's list I saw earlier, so it can't be Peruzzi -> (one of them) -> Medici. Let me check the
other way in, Guadagni.

### 09 -- typed "Guadagni"
`node tool/real.mjs --step .../r2-s32 --key Control+a --type "Guadagni"`

What I see: Guadagni is tied to Tornabuoni, Albizzi, Bischeri and Lamberteschi. Bischeri is one of
the Peruzzi's three. So: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.

Shorter? Ginori only has Albizzi. Albizzi's other ties are Medici and Guadagni, and none of the
Peruzzi's three (Castellani, Strozzi, Bischeri) is tied to Albizzi directly or to the Medici, so
it needs two families between Peruzzi and Albizzi, and Bischeri -> Guadagni does it. Done.

`node tool/real.mjs --end .../r2-s32`

## At the end (in character)

**Did I finish?** Yes, both.

- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (through Ridolfi, Medici,
  Salviati).
- Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (through Bischeri,
  Guadagni, Albizzi).

**Ease: 5 of 7.** The find box did all the work: type a family and it lists who they married into,
which is exactly the "list of connections" I remembered. Working backward from the family with
only one tie made it quick.

**What confused or bothered me:**

- The dots have no names on them, so the picture was no help at all. I never once looked at the
  drawing; I did the whole thing as a word puzzle in the find box, keeping the lists in my head.
  If I had to show this to someone, I couldn't point at the chain on the picture.
- I'm not 100 percent sure it's the fewest. I convinced myself by reasoning about who has only one
  or two ties, but on a bigger network I couldn't do that. I didn't see anything that would just
  work out the chain for me, and I didn't go looking -- I didn't know whether the program could.
- Typing a name didn't light up that family on the picture as far as I could tell, so I couldn't
  even use the drawing to see where they sit.
- Each list shows the link as "A -- B" with the searched family sometimes first, sometimes
  second, so I had to read both sides each time to find the other family.
