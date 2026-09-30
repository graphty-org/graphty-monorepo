# Fix the wrong middle step -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training (simulated; see
`study/personas/explorer-elena.md`). Trackpad, company laptop, Mac keys. Her reflexes come from
Google Sheets and her product-analytics dashboard. Run as the "curious afternoon" variant: no
deadline, three or four dead ends tolerated.

**Task as read by the moderator:** "Of three filter steps, the second removed the wrong group.
Fix it without losing the third."

**What was on screen at the start (Elena was not told):** Les Miserables, 77 characters, narrowed
in three filter steps: keep characters with at least 2 connections, keep characters with at least
5 connections, leave out group 8. The middle step is the mistake. Done is 47 of 77 nodes with the
middle step off and the other two on.

**Screens, in order:** the undo screen in its participant view, starting after the wrong step
(`shots/record/r3-elena-fixmiddle-undo-s3.png`); the same screen after one press of Cmd+Z
(`shots/record/r3-elena-fixmiddle-undo-s2.png`); the steps list opened from the undo line
(`shots/record/r3-elena-fixmiddle-undo-list.png`); the list after she unticked the middle step and ticked
the last one back (`shots/record/r3-elena-fixmiddle-undo-off.png`). At the end the moderator showed the
filter chip screen's version of the same list, with the middle step off
(`shots/record/r3-elena-fixmiddle-chip-off.png`) and with its editor open
(`shots/record/r3-elena-fixmiddle-chip-edit.png`). The pink dashed outlines around some buttons were
explained as "not built yet".

**Outcome:** finished with difficulty, about four minutes. She ended at 47 of 77 nodes, middle
step off, first and last on. Her first move, Cmd+Z, took away the step she was told to keep, and
for a moment she believed the undo had fixed the task, because the line said "group 8" and the
task said "wrong group". She found the real second step only by counting rows, never by
understanding what "degree &gt;= 5" meant. She was not sure she had finished until the list said
"took out 13" next to the group 8 row.

## Transcript

### 1. The starting screen (27 of 77 nodes, 3 steps)

> OK, Les Miserables again. "Three filter steps" -- where are my steps? I don't see a list of
> steps.

She looks at the picture first: a cluster of orange dots at the top, a mixed cluster in the
middle, Valjean in the middle of it.

> The big yellow one is Valjean, so he's the one that everybody's filtered around, I guess. He's
> the main character, that's why he's biggest.

(She reads the dot size as importance in the story; on this screen it is the number of
connections.)

> The second one removed the wrong group. Groups... the box on the left says group 4, 3, 2, 5. So
> one of the groups is gone. Which one? I don't know which groups there are supposed to be.

She reads the table's top line: "Selected: none, showing the previous selection."

> Selected none. I didn't select anything. Is that bad? I'm going to leave that alone.

### 2. She reaches for undo

> Honestly, in Sheets I'd just hit undo a couple of times. Undo is safe, right? You can always
> redo.

She presses Cmd+Z once. A line appears above the toolbar: "Undone: Filter out group 8 -- Show in
steps". Light blue dots appear at the bottom right: Marius, Gavroche, Enjolras, Bossuet.

> Ooh, new ones came back. Blue ones. "Undone: Filter out group 8." Group 8 -- OK, so group 8 was
> the wrong group, and now it's back. Done?

She looks at the chip: "40 of 77 nodes -- 2 of 3 steps".

> Wait. "2 of 3 steps". And you said fix the second, not lose the third. Did I just undo the
> third one? It says undone... group 8... I don't actually know if group 8 was number two or
> number three. I can't see a list.

(Engagement still high. She is worried, not annoyed.)

> I don't want to hit undo again and make it worse. What does "Show in steps" do? It's the only
> button there, so.

### 3. The steps list

She clicks **Show in steps**. A panel opens at the top: three rows with checkboxes.

> Oh, there's a list! Filter to, degree, greater-or-equal 2, "took out 17, 60 left." Filter to
> degree greater-or-equal 5, "took out 20, 40 left." Filter out group 8, "off".

> So group 8 is the third one. That's the one I'm supposed to keep. Undo turned it off. Ugh. OK.
> At least it's still here -- it just says off, it didn't delete it.

She reads the second row again.

> The second one is "degree greater than 5". That's not a group. You said the second one removed
> the wrong group. Is "degree" a group? Like... degree of importance? Five stars? I don't know.
> It took out 20 people, so it did remove a bunch of people. Fine, that's a group of people.

(She never learns that degree means number of connections. She trusts the row order and the size
of "took out 20".)

### 4. Fixing it

> So I want the second one off and the third one on. They're checkboxes. I get checkboxes.

She unticks the second row. The picture changes a lot: more dots, three grey dots float off on
their own at the lower right, a black pair at the top.

> Whoa, lots more. Why are those three over there by themselves? Did they break off? ... Whatever,
> I'll look at that later.

She looks at the list. The second row says "off". The third still says "off".

> OK, the second one is off. But the third one is still off, from the undo. I have to turn it
> back on myself.

She ticks the third row. It reads "took out 13 -- 47 left". The blue dots go away again.

> "Took out 13, 47 left." So group 8 is gone again, which is what the third step does. And the
> second one is off. The top says "47 of 77 nodes, 2 of 3 steps."

> "2 of 3 steps" still bugs me. It sounds like one of them didn't work. But I turned it off on
> purpose, so... I guess that's right? I'd want it to say, like, "1 step off".

She does not press Cmd+Z or Cmd+Shift+Z again. She does not touch "Previous selection" in the
table.

> I think I'm done. I'm like 80 percent sure.

### 5. The comparison screen

The moderator shows the filter chip screen's version of the list with the middle step off.

> Oh, this one says "off, takes nothing out" instead of just "off". That's clearer. And the
> numbers are on their own line, easier to read.

The moderator shows the same list with the second step's editor open.

> "Keeps only nodes with at least 5 neighbors among the 60 it reads." OK, so degree is neighbors.
> Connections. That's... that's what I needed to know ten minutes ago. If the list had said that
> I'd have known which one was wrong myself, instead of just counting.

## After the task

**Single Ease Question:** 5 of 7.

> It wasn't hard once I found the list. The hard part was undo -- I did the thing I always do and
> it took away the wrong one, and it named it with a word I thought meant I was done. Then the
> list was fine: checkboxes, it tells you what each one took out, nothing gets deleted.

**Would she use this instead of her current tool?**

> For this? My current tool is the dashboard, where a filter is a dropdown at the top and you
> just clear it. This is better than that, actually, because I can turn off the middle one
> without redoing the other two -- in our dashboard I'd have to rebuild all of them. But I'd want
> the list to be visible without hunting for it, and I'd want it to say "connections" not
> "degree". I'd use it if somebody set up the data for me. I wouldn't tell my VP "I filtered
> by degree greater than 5" -- I don't know what that means.

## What the moderator noted

- **First reach:** Cmd+Z, within 20 seconds, before looking for any steps list.
- **The undo line was read, and misread.** She read "Undone: Filter out group 8" in full, and
  because the task said "wrong group", she took it as the fix for about ten seconds. The chip's
  "2 of 3 steps" is what made her doubt it, not the line.
- **Found the list through the line's action,** not through the chip. She never clicked the chip
  and did not say it was a button.
- **Found the wrong step by position and size,** not by meaning. "degree &gt;= 5" meant nothing to
  her; she guessed "degree of importance, five stars".
- **Ticked the kept step back on herself,** after noticing its row still said "off". She did not
  try Redo.
- **End state correct:** 47 of 77 nodes, middle step off, first and last on.
- **Unfinished doubt:** "2 of 3 steps" read as "one did not work".
- **Wrong reading of the picture:** Valjean is biggest "because he is the main character"; three
  isolated grey dots after the fix "broke off".
