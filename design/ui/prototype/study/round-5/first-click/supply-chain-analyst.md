# First-click test: supply chain risk analyst (Dana Okafor)

Participant: a supply chain risk analyst who works in Excel and Power BI, is not a network
scientist, skims labels and reads tables carefully. Each prompt was answered by looking only at
the named screen image. Sureness is 1 (a guess) to 7 (certain). The answers were checked
against the intended targets afterwards and were not changed.

## Les Miserables network, nothing selected (round-5-fc-lesmis-rest.png)

**1. "Your co-author wants a picture of this network for the paper."**
Click: the three-line menu at the very top left. Sureness 4.
"I want Export, or Save as image. I don't see a download or share button anywhere, so it has
to be in the menu. That's where File lives in everything else I use."
Result: correct.

**2. "A colleague wants to repeat the earlier bridges calculation exactly."**
Click: the "Bridges -- done" row under Results on the right. Sureness 5.
"It's the only place the word 'Bridges' shows up as something that was run. There's also a
'Bridges off' in the Style stack, which confused me for a second -- is that the same thing? I
went with the one that says done."
Result: correct.

**3. "Rank the characters a second way, to check against the ranking you already have."**
Click: the "..." at the right end of the table header, to add another column. Sureness 2.
"The ranking I have is the degree column in the table, so the second ranking should be another
column next to it. The dots are where I'd expect 'add column'. The plus next to Results didn't
say what it adds."
Result: incorrect.

**4. "Groups 2 and 3 are hard to tell apart. Change the color of one of them."**
Click: the orange swatch next to "2" in the Group color box on the canvas. Sureness 5.
"That's a legend. In Power BI you click the colour in the legend or go to the format pane. The
legend is right there. I'd hope clicking the little square opens a colour picker."
Result: correct.

**5. "Moments ago you had a group of characters selected, and a stray click cleared it. Get it back."**
Click: none -- Ctrl+Z on the keyboard (Undo). Sureness 5.
"Ctrl+Z. Every tool I use, that's how you get back what you just lost. If that didn't work I'd
look in the top-left menu for an Edit menu. I'm not hunting around the screen first."
Result: incorrect (a reach for Undo is logged separately from the intended target).

## Les Miserables network, Valjean selected (round-5-fc-lesmis-node.png)

**6. "Valjean is not the color you expected. Find out what is painting him this color."**
Click: the "Group color -- color" row under Appearance on the right. Sureness 4.
"The right panel is all about Valjean now. Under Appearance, one row says 'color' and it's the
group colour. Group 2 is orange and he's orange, so that's probably it."
Result: correct.

**7. "Where does Valjean's betweenness number come from, and how was it calculated?"**
Click: the "betweenness 0.57, highest" row under Results on the right. Sureness 4.
"Betweenness is the chokepoint number, I know that much. I'd click where it says Results and
hope it tells me the settings. I nearly clicked the column header in the table, but a header
usually just sorts."
Result: correct.

## Transfers network (round-5-fc-transfers-rest.png)

**8. "Next month's transfers file has arrived. Bring it in so everything you set up carries over."**
Click: the file chip "transfers-2026..." under the project name. Sureness 4.
"That's the file. I want to swap it for the April one, so I click on the file. The project
name above it is the whole project, not the file, and I don't want a new project."
Result: incorrect.

**9. "Your manager wants the accounts that take in far more money than they send out."**
Click: the "Table -- 3,000 nodes, 9,113 edges" strip at the bottom. Sureness 3.
"That's a table question: money in, money out, subtract, sort. I'd open the table and look for
amount columns. If it can't do that, I export it and do it in Excel with a pivot in ten
minutes. The lightning button, I don't know what that does."
Result: incorrect.

**10. "Find the cheapest route between two accounts, where a bigger transfer should count as more expensive."**
Click: "Change..." in the Loaded line on the right ("amount not used yet"). Sureness 3.
"It says in plain words that the amount isn't being used. The question is about the amount
counting, so I'd fix that first. There's a button on the toolbar that looks like a route, but
it has no label and I don't click things I can't read."
Result: incorrect (logged separately: it changes the default for new runs).

**11. "IT asks whether anything from this project has left the computer. Where do you look?"**
Click: "Nothing has been sent from this project" under the project name. Sureness 6.
"That's exactly the question my IT people ask. It's right at the top, with a lock. I'd click it
to see if there's more detail I could screenshot for them. I'd also want it in writing,
somewhere they can read, not just a line on a screen."
Result: correct.

## Human protein interactions network (round-5-fc-ppi-rest.png)

**12. "Ribosome and Spliceosome are two blues you cannot tell apart. Change one of them."**
Click: the dark blue swatch next to "Spliceosome" in the Module color box. Sureness 5.
"Same as before -- the legend. Honestly the two blues are hard to tell apart even in the
legend on my laptop screen."
Result: correct.

**13. "Your lab sent you a file of the colors and sizes the team always uses. Bring it into this project."**
Click: "Data" on the left rail. Sureness 3.
"Bringing a file in is import, and import is usually under Data. I'm not sure a colours file
counts as data, though. My second guess would be the palette icon at the top of the right
panel."
Result: correct.

**14. "How is the Ribosome module different from the rest of the network?"**
Click: "Ribosome" in the Module color box. Sureness 2.
"I don't know what a module means here. Click the name, hope it picks those 56 out, then
compare them in the table. What 'different' means -- more connections? -- is not something the
screen tells me."
Result: correct.

## Summary

8 of 14 first clicks hit an intended target (fc-1, 2, 4, 6, 7, 11, 12, 13).

What the misses have in common:

- **Tables and files come first for her.** For "rank a second way" and "accounts that take in
  more than they send" she went to the table, not to Results or the lightning button. To bring
  in next month's file she clicked the file chip, which is not an intended target, although it
  sits right under the project name and shows the file she means to replace.
- **Unlabelled toolbar icons are invisible to her.** She did not use the Path tool or the
  lightning button in any answer, and said so twice. She picked the plain-language "amount not
  used yet. Change..." line over an unlabelled route icon.
- **Undo is a key, not a place.** She would press Ctrl+Z to recover a lost selection, before
  looking for anything on screen.
- **Two "Bridges" rows.** "Bridges off" in the Style stack and "Bridges done" in Results made
  her stop and ask whether they are the same thing.
