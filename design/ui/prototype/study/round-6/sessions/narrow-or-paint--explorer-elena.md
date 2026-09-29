# Narrow, hide or paint -- Explorer Elena

**Task, as the moderator gave it:** "Look only at the characters with 5 or more co-appearance
partners. How many are there, and who matters most among them?"

**Participant:** Explorer Elena, a product manager with no graph training (first-contact clock,
about five minutes before she drifts).

**Screens, in the order she saw them:** the graph at rest (Les Miserables, 77 characters), the
filter steps open on the filter chip, the results panel on a filtered graph, and the page that
compares filtering out, hiding and painting.

**Outcome:** failure, and she does not know it. She answers "40, and Valjean". Valjean is right.
The count is wrong: 41 characters have 5 or more partners in the whole book. She got 40 because a
"at least 2" step ran first and took one partner away from a character before the "at least 5"
step counted. The screen said so in grey ("among the 60 it reads"); she read past it.

## Think-aloud

**1. The graph at rest.**

"OK, Les Mis. Dots are characters, lines are... they're in a scene together, I guess. 77 nodes,
254 edges. Fine, 77 characters."

"'Five or more co-appearance partners.' So characters who are connected to at least five others.
I need to count them. First thing -- can I just click the big one in the middle? Valjean, obviously
he's the main guy." (Clicks at Valjean in her head; the task wants a count, not one person.)

"There's no big 'filter' button. The bottom bar has an arrow, a squiggly thing, Quick actions, 2D.
Quick actions sounds like it might do something. ... I'd try that first." (She does not notice the
"Full graph" chip under the file name at the top left. It is outlined and labelled, but it reads to
her like a caption -- "this is the full graph" -- not a button.)

"The table at the bottom says 77 nodes. In Sheets I'd sort a column and count. But I don't see a
'how many connections' column name. There's 'Degree distribution' on the right with a little bar
thing. Degree... is that the connections? It has an 'i'. I'm not hovering over every 'i'."

"Colours: orange group, blue group, green group. Legend says Group color, 2, 8, 4, 1... groups by
number. So group 2 is the Valjean team. The yellow ones are the good guys, I think." (Misreading:
the groups are community numbers in the file; they say nothing about good or bad.)

*Moderator hint after about 90 seconds: "Is there anything near the top left that narrows what you
are looking at?"*

"Oh. 'Full graph', with a little funnel. That's a dropdown. OK, so that's the filter. It was right
there."

**2. The filter steps.**

"Now it says '27 of 77 characters, 3 steps'. Wait, I didn't do three steps. Somebody already did
stuff. OK: 'Filter to degree >= 2, took out 17, 60 left.' 'Filter to degree >= 5, took out 20,
40 left.' 'Filter out group 8, took out 13, 27 left.'"

"The grey line under the second one: 'keeps only nodes with at least 5 neighbors among the 60 it
reads.' OK, neighbours, so degree is neighbours. Good, that's my five. I'll take that."

"I don't want group 8 gone, the task says just five-or-more. There's a checkbox. I'll uncheck
group 8 -- it's a checkbox, it can't be deleting anything. ... 40 left. OK."

"Do I need the 'at least 2' one? If you have five you have two. It doesn't matter. Leave it."
(It does matter: she keeps a step that changes the answer by one. She never reads "among the 60 it
reads" as "the count is different from the whole book".)

"Table: sorted by degree, 'Degree (filtered)' and 'Degree (full graph)'. Valjean, 17 filtered,
36 full. Why are there two? Filtered is... his connections to the ones that are left? Whatever.
Valjean is top in both. Fantine second. Thenardier, Javert."

"And the statistics on the right say 'Characters 27 of 77, in the filtered graph'... no wait, that
was before I unchecked. Now it'd say 40. Fine."

"Answer: 40 characters, and Valjean matters most."

**3. The results panel.**

"This one says 'Betweenness, on 60 of 77 nodes'. Betweenness. That's a word. Top nodes: Valjean
0.419, Gavroche 0.172, Marius... So Valjean again. 0.419 out of what? Is that a lot?"

"'On 60 of 77.' Hm. I had 40. This is a different filter, it's the 'at least 2' one. Chip says
'Filtered: 60 of 77 nodes, 1 step'. So this isn't my 40. Doesn't matter -- Valjean is top either
way and he's also the biggest dot. The biggest dot is the one that matters, I could have just
looked." (Here the size does show connections, so the guess happens to hold; she did not check the
style stack, which says "Size: degree" only on the filter screen.)

"There's a popup, 'Run record': Brandes betweenness, exact, seed, damping, normalization... nope.
Closing that."

"Re-run is grey. I'm not re-running anything."

**4. Filter out, hide, or paint.**

(She was shown the comparison of the three moves -- the four cards with a fraud dataset.)

"Different data, OK. Four cards: Filter out, Hide on canvas, Color by kind, a color on the 60
selected."

"'Filter out' -- the chip says 'Filtered: 2,940 of 3,000' and the numbers go down. 'Hide on
canvas' -- '60 nodes hidden, Show all', and the numbers stay 3,000. Honestly? In Sheets, filtering
IS hiding. I hide rows, I filter rows, same thing. So I'd have guessed both change the count."

"If I'd wanted to 'look only at' the five-or-more ones, I think I would have hidden the others.
'Hide' sounds safe. 'Filter out' sounds like it takes them out of the file. ... But then the count
would still say 77 and I'd have written 77? No -- I'd count the dots. I don't know. I'd probably
trust the number that's biggest on the screen."

"The paint ones I get: it just colours them. Nothing gets lost. That's the one I'd pick if I was
nervous. But then how do I count them? Count the orange dots by hand?"

"At least the chip changes when I filter and doesn't change when I hide. That's something. I
wouldn't have noticed if you hadn't put a red dashed box around it."

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 4.**

"Once I found the funnel thing it was fine -- tick boxes, a number that goes down, a table sorted
the right way. Finding it took a hint. And somebody else's steps were already in there, which I
didn't love. The Betweenness screen threw me: it was a different number of characters than mine
and I just shrugged."

**Would she use this instead of her current tool (Sheets and the analytics dashboard)?**

"For this question, maybe. 'Valjean, 40 characters' is a Slack sentence and I got to it. The
table with the degree column sorted is what I'd actually screenshot -- that's basically my
dashboard. But I'd have done the same in Sheets with a COUNTIF if somebody gave me a connections
column. What this has that Sheets doesn't is the picture shrinking to just those 40, and that was
nice. The hide-versus-filter thing I would not have understood without being shown."

## What the session shows

- **The count is off by one and she cannot tell.** A pre-existing "degree >= 2" step before
  "degree >= 5" makes the second step count neighbours among the 60 survivors, so she gets 40
  where the book has 41. The explanation is a grey second line she reads as confirmation ("good,
  that's my five"), not as a warning. She reasons, like most spreadsheet users would, that "at
  least 2" is contained in "at least 5" and so harmless. Severity: high -- a wrong number she
  would paste into Slack.
- **The filter chip was missed until a hint.** "Full graph" reads to her as a caption of the
  graph, not a control. She tried Quick actions and the table first. Same finding as the round-3
  run, now on the current rail.
- **Steps she did not make were already in the list.** She accepted them and edited around them;
  she did not ask where they came from. Only the checkbox made her willing to touch them.
- **"Degree" and "betweenness" are still jargon.** The one line that translated degree ("at least
  5 neighbors") is what let her connect the task to the control. Betweenness had no translation
  and a score with no scale; she ignored it and fell back on dot size.
- **Two degree columns in the table ("filtered" and "full graph") puzzled her** but did not stop
  her, because Valjean topped both.
- **The results panel ran on a different filter (60) from the one she had just made (40).** She
  saw "60 of 77", noticed it was not hers, and dismissed it because the top name agreed. On a
  question where the top name differed she would have reported the wrong person.
- **Hide versus filter does not exist in her head.** In a spreadsheet, filtering hides rows, so
  she expects both to change the count, and she would choose "Hide" for this task because it
  sounds safer than "Filter out". The chip changing only for a filter is the right signal, but she
  saw it only because the comparison page boxed it in red.
- **Misreading:** she took the group colours to mean the good team versus the others.
