# Fixing the wrong middle filter step -- Analyst Alex

**Participant:** Analyst Alex, operations data analyst; uses NetworkX for the maths and Gephi for the
picture.
**Task given aloud:** "Of three filter steps, the second removed the wrong group. Fix it without
losing the third."
**Screens used:** the undo screen first (participant view, the three steps on), then the filter chip
screen.
**What he saw:**
- `shots/record/r3-alexmid-s3.png`: the start
- `shots/record/r3-alexmid-pop.png`: the steps list open
- `shots/record/r3-alexmid-off.png`: the middle step off
- `shots/record/r3-alexmid-fc-three.png`: the filter chip screen, list open
- `shots/record/r3-alexmid-fc-edit.png`: the step editor

## Transcript (think-aloud)

**1. The start screen.**
> "OK. Les Miserables, the sample. Top left there's a little box: '27 of 77 nodes, 3 steps', with a
> funnel. So that's my filters. Good, it's where I'd look. In Gephi the filter stack is in its own
> panel and I always lose it."

> "First thing I am NOT doing is Ctrl+Z. If I undo, it takes off the last thing I did, which is
> the third step, the one I'm supposed to keep. Been there. So I want to see the list."

He clicks the box with the funnel.

**2. The steps list opens.**
> "Right: Filter to degree >= 2, took out 17, 60 left. Filter to degree >= 5, took out 20, 40 left.
> Filter out group 8, took out 13, 27 left. I like that -- each row says what it took out and what
> was left. That's the thing I'd normally check in SQL."

> "Hang on. You said the second one removed the wrong group. The second one isn't a group, it's a
> degree cutoff. The only group step is the third one, group 8. So... either you mean the third one,
> or 'group' just means a bunch of nodes. You said second, and you said keep the third, so I'll go
> with the middle one being the mistake."

(He hesitates about 20 seconds here and looks at the legend: groups 4, 3, 2, 5. "And group 8
isn't even in the legend any more, because it's filtered out. Fine, that makes sense.")

**3. Trying to fix the middle step on the undo screen.**
> "I'd rather fix it than delete it. There's a three-dot button on the row, that's usually where
> Edit lives."

He clicks the three dots on the middle row. Nothing happens in this prototype. (The button has a
pink dashed outline, as do several other controls on this screen.)
> "Nothing. And why are half the buttons outlined in pink dashes? Is that a highlight, a warning?
> I don't know what that means. Looks like a debug overlay."

> "OK, the checkbox then. Untick it and see what happens."

He unticks "Filter to degree >= 5".

**4. After unticking.**
> "Box now says 47 of 77 nodes, 2 of 3 steps. The middle row says 'off', greyed, but it's still
> there, so I didn't lose it. The third one is still ticked and now says took out 13, 47 left. So
> group 8 is still out. Good -- that's what you asked, I think. Edges went from 104 to 142,
> components from 1 to 3."

> "Three components -- those dark dots floating off on the right, that's the dust that the degree
> filter was hiding. Makes sense."

> "But that's turning it off, not fixing it. If the step picked the wrong group, I want to point it
> at the right group, not just switch it off. There's no way to edit it on this screen that I can
> find. Double-click? I don't know, I wouldn't think to double-click a checkbox row."

**5. The filter chip screen.** The moderator moves him to the second screen, same starting point.
> "Same list but the rows are taller, and this one has a sentence: 'keeps only nodes with at least 5
> neighbors among the 60 it reads'. That's actually nice -- I could paste that into a slide note.
> Why didn't the other screen have it?"

He opens the three dots on the middle row. A menu: Edit rule..., Turn off step, Move up, Move down,
Create rule set from step, Delete step.
> "Edit rule. There it is."

**6. The step editor.**
> "Step 2: Filter to degree >= 5. Outcome: Filter to or Filter out. Rule: degree, >=, 5. Scope:
> after step 1, 60 nodes. OK, so it knows it's reading what step 1 left. That's the order-matters
> thing Gephi never shows you."

He switches Outcome to "Filter out" and the Rule dropdown from degree to group.
> "It filled in 8. Group 8 -- that's what step 3 already takes out. So now two steps take out
> group 8? That's how you end up with the wrong group, honestly."

> "Which group was it supposed to be? I don't know. The groups are just numbers. In my own data it'd
> be 'Tier-2 electronics' or 'the northern depots', and I'd know. Here I'll say 5."

He types 5.
> "Result line changed. There's no Save or Apply button, though. Did it take? Is it live? I'm
> clicking the back arrow to check."

He clicks back to the list.
> "Step 2 now reads Filter out group 5, with its own took-out number, and step 3 still says it took
> out 13. So the third one survived. Fine. I think I'm done. I'd want to see that Ctrl+Z undoes the
> edit and not something else, but I'm not pushing my luck."

## Afterwards

**Single Ease Question:** 4 of 7.

> "Turning it off was easy, and I liked that the row stays and the third step keeps working -- that
> alone is better than Gephi, where I rebuild the filter chain. But 'fix it' meant change it, and on
> the first screen I couldn't. The three dots did nothing and everything was outlined in pink. On
> the second screen Edit was there, but it put in group 8 for me, which is the exact mistake I was
> fixing, and there was no Save, so I didn't know if it had stuck."

**Would he use this instead of his current tool?**
> "For this part, maybe. Filters in Gephi are a mess: you can't see what each one took out, and
> reordering or turning one off in the middle breaks the rest. Here every row tells me how many it
> removed and how many are left, and turning one off doesn't lose it. If editing a step is one click
> from the row and the groups have names, yes, I'd do my filtering here. I'd still check the counts
> in Python the first few times."

## Observations for the studio

- The task and the data disagree: the middle step is a degree cutoff, not a group. He spent about
  20 seconds deciding which step the moderator meant. Future runs need a middle step that really is
  a group rule, or different wording.
- He avoided Ctrl+Z on purpose, for the right reason: it would have hit the third step first.
- On the undo screen the row menu is not drawn, and dashed outlines mark controls that are not in the
  mock. In the participant view those outlines read as a warning or a debug overlay.
- Unticking worked and read correctly: "2 of 3 steps", the row kept and greyed, the third row's
  counts updated.
- The two screens draw the same list differently. Only the filter chip screen has the plain-English
  sentence and Edit rule. He noticed and asked why.
- Switching the attribute to group pre-filled 8, the value the third step already removes.
- The editor applies changes as he types, and nothing says so. He was not sure it had stuck.
- Group numbers with no names left him guessing which group was right.
