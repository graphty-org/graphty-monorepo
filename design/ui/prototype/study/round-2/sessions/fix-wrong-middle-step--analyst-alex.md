# Session: fix a wrong middle filter step -- Analyst Alex

- **Participant**: Analyst Alex (intermediate graph analyst, Gephi and NetworkX user)
- **Task as given**: "Of three filter steps, the second removed the wrong group. Fix it without losing the third."
- **Screens**: Undo and ways back (version A, undo is silent, left panel open), then the filter chip and its steps list
- **Outcome**: done, with one detour. End state 63 of 77 nodes, "2 of 3 steps", the degree step off, group 8 still out.
- **Single Ease Question**: 5 of 7

## Transcript (think-aloud)

**Start screen.** Okay. Les Miserables, the sample. Under the title there's a little grey pill, "Filtered: 28 of 77 nodes - 3 steps". So that's where the filters live, I guess. Twenty-eight of seventy-seven, that's a lot gone. Canvas has the orange bunch up top, Valjean in the middle, the green lot on the right. Table at the bottom, statistics on the right say 106 edges, 1 component.

"Second one removed the wrong group, fix it without losing the third." My hand already wants Ctrl+Z. Everything I use has Ctrl+Z. Gephi doesn't really undo filters, you just go into the query panel and pull one out, but let's see what this does.

**Presses Ctrl+Z once.** Nothing popped up. Did it do anything? ... Wait, yeah -- the canvas got a whole new light-blue bunch at the bottom right. Marius, Enjolras, Gavroche, Courfeyrac. The pill says 41 of 77, 2 steps now. Edges went 106 to 195. So it took the LAST step off. That's the one I was told to keep. Of course it did, undo goes backwards. That's on me, but it would have been nice if it said what it just undid -- I only caught it because I watch the numbers. If I'd been looking at the table I'd have carried on with the students back in.

**Presses Ctrl+Y.** I'm on Windows, Ctrl+Y is redo everywhere. Pill is back to 28 of 77, 3 steps, the light-blue bunch is gone. Okay, good, it didn't eat it. Didn't tell me it redid it either, but the number's right.

**Clicks the pill.** Right, this is what I should have done first. A little box, "Filter steps":

1. Filter to Largest component -- 76
2. Filter to degree >= 5 -- 41
3. Filter out group = 8 -- 28

Hm. Hang on. "The second removed the wrong group." The second one isn't a group, it's degree five or more. The third one is the one that takes out a group. So... is the mistake the third one? No -- you said keep the third. And the numbers on the right are what's LEFT after each step, not what each step took out, so I have to do the subtraction myself: 76 to 41 is 35 gone at step 2, 41 to 28 is 13 gone at step 3. So step 2 is the one that threw out the most. I'll go with "second" meaning second in the list. If I were doing this for real I'd want to click a step and see which nodes it dropped before I kill it.

**Double-clicks the degree row, out of curiosity.** It opens the step: "Step 2: Filter to degree >= 5", a dropdown for the attribute, the operator, the 5. "Result: Leaves 41; takes out 35." Okay, THAT's the number I wanted, it's just one level down. Could I fix it by changing the rule instead? Maybe, but you said it's the wrong step, so I'll turn it off. Back arrow.

**Unticks "Filter to degree >= 5".** The row greys out, its count goes to "--". Pill says "63 of 77 nodes - 2 of 3 steps" and lost the word "Filtered". Canvas fills up: lots of small nodes, the blue Myriel bunch, and some dark grey and black dots floating off on their own at the right and bottom. Group 8 -- the light-blue students -- is still gone. So the third step survived. Good. That's the task, I think.

But -- statistics say **components 4**. My first step is still ticked and it says "Largest component". Why are there four components? ... Oh. Because the group-8 step runs after it, and pulling the students out broke it into pieces. In the other version of this box there's a line under the first step, "Split into 4 pieces by Filter out group = 8", and that's exactly what I needed; on this screen I had to work it out. If I'd put "largest component only" in a slide and then shown four pieces, somebody would ask, and I'd look like I didn't know my own filter.

And the grey and black dots -- what group are those? The legend lists 2, 4, 3, 5 and then "5 more". I'm not opening "5 more" to find out what the black ones are. Also the legend order changed -- before it was 4 first, now 2 is first. I'd have read the first one as the biggest group, and I guess it is, but it shuffles under me.

One thing I like: the degree step is still there, just unticked. So if my manager says "no, put it back", it's one click. In Gephi I'd have deleted it and rebuilt it. I do want to know if that unticked step comes along when I save this or export it -- I don't want a dead filter sitting in the recipe confusing somebody next month.

## After the task

**Moderator: how easy was that, 1 to 7?** Five. The actual fix was one click once I found the list. What took longest was the undo detour and then working out why "largest component" gave me four components.

**Would you use this instead of what you use now?** For this bit, yes. Gephi's filter panel is that drag-and-drop query tree and I always forget which filter is nested in which; a numbered list with counts next to each step and a checkbox is just easier. I'd still compute my real numbers in Python. What would stop me is if undo keeps silently eating the step I care about, or the counts don't explain themselves -- I can't hand a director "largest component" and four pieces.

## Problems observed

| Where | What happened | Severity (1-4) |
|---|---|---|
| Start, first Ctrl+Z | Undo removed the third (good) step with no message; only the pill count and the canvas changed. Caught it only by watching numbers. | 3 |
| Steps list | Counts show what is left after each step, not what each step removed; "removed the wrong group" could not be checked without opening the step editor or doing subtraction. | 2 |
| After unticking step 2 | "Largest component" still ticked while statistics show 4 components and loose pieces float on the canvas; nothing on this screen says the later step split it. | 3 |
| Legend after the fix | Dark grey / black nodes not named (behind "5 more"); legend order changed between states. | 2 |
| Pill after the fix | Drops the word "Filtered", reads "63 of 77 nodes - 2 of 3 steps"; fine, but less obvious it is a filter. | 1 |
| Unticked step | Unclear whether an off step is saved or exported with the analysis. | 1 |

> "Undo just took off the one step I was told to keep, and it didn't say a word. I only noticed because the number went from 28 to 41. Then I fix it and 'largest component' shows me four components. That's the kind of thing that ends up in a report wrong."
