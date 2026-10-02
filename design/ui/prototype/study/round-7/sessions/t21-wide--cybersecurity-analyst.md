# Session: label hosts by name (wide IT estate sample) -- Priya, threat hunter

Task as given: "Have each host in the drawing show what people call it, not its inventory
number. The data on screen is a sample: a company's IT estate, hosts and the network connections
between them, with dozens of things recorded about each."

Start screen: shots/tasks/t21-wide/01.png. Renders saved in
tmp/round-7-sessions/t21-wide--cybersecurity-analyst/. All commands were run from
design/ui/prototype with the prefix
`timeout 120 node app-b/study.mjs --try <abs path>/tmp/round-7-sessions/t21-wide--cybersecurity-analyst/NN.png task:t21-wide`.

## Think-aloud

**01 (start).** "IT estate, March 2026", 300 nodes, 1,105 edges, 8 of 69 columns. "Local only"
at the top -- that answers "where does it run" a bit, nothing about phoning home. Fine for a
study. I want the hostname on each dot. Labels are a looks thing, so I go to Style.

**02** `--click "Style"`
Canvas settings and layout. There is a "Hide overlapping labels" box, so labels exist somewhere,
but nothing here says what they show. Wrong place. The left list has "Everything" -- sounds like
the rule that matches every node.

**03** `--click "Everything"`
"Paints 300 nodes, 1,105 edges", matches the summary. Good. Sections: Fill, Shape, Effects,
Label, Tooltip. Label has a plus.

**04** `--click "Everything" --click "Label"`
Clicking the word does nothing. Has to be the plus.

**05** `--click "Everything" --hover "Add label"`
Nothing on screen is called "Add label". I guessed its name wrong.

**06** `--click "Everything" --hover "Add"`
Got the Effects plus instead: tooltip "Add to Effects". So the label one is "Add to Label".
Odd phrasing -- I'm not adding TO a label, I'm adding a label.

**07** `--click "Everything" --click "Add to Label"`
Menu: "Label line" and "Show labels". Don't know what a label line is. "Show labels" sounds like
the on switch.

**08** `... --click "Show labels"`
It added a "Show labels" checkbox -- unticked. I asked to show labels and it gave me a switch
that's off. Also a little database icon next to it I don't understand. Still nothing about which
field.

**09** `... --click "Show labels" --click "Show labels"`
Ticked. Drawing unchanged, no names anywhere. Still no field choice.

**10** `... --click "Add to Label" --click "Label line"`
Nothing called "Label line" this time -- the plus didn't open the menu again, it went straight to
adding a row "Above: Pick a field" and opened a field list. Fine, that's what I wanted, but it
didn't behave like the first time. The list: "id" tagged Key, "hostname" tagged Name, then all
the cmdb_ and backup_ columns. id is the inventory number, hostname is what people say. Easy
call, and the Key / Name tags help.

**11** `... --click "Add to Label" --click "hostname"`
Panel now: Label -- Above: hostname, Show labels: ticked. The panel says the right thing. The
drawing does not: not one name on any dot, and the bubble still says "Nothing is colored or
sized by a row". Overlap hiding is off on the graph settings, so that's not why. I can't check
it against a single host I know, so I'm not calling it done. Stopping.

## Outcome

- Succeeded? Partly. I think the setting is right (hostname, not id), but I never saw a label
  on the drawing, so I can't confirm it. In real life I'd zoom in once and then give up.
- Single Ease Question: 3 of 7. Two wrong guesses at the plus button's name, a menu with a
  choice I didn't understand ("Label line" vs "Show labels"), a switch that was added in the off
  position, and the second plus click doing something different from the first.
- Would I use it instead of my current tool? Not for this. In BloodHound or a notebook the name
  field is just there or it's one line of code. Picking hostname from a list tagged Key / Name
  was the good part. Everything before it was hunting for the field picker, and the drawing gave
  me no proof it worked.

## Problems, in my words

1. No visible labels after setting hostname and ticking Show labels -- I can't verify anything.
2. "Show labels" is added unticked. I just asked to show them.
3. Two ways in ("Label line", "Show labels") with no hint of the difference; the field picker
   only appeared on the second plus click, and the menu didn't come back.
4. Icon-only plus buttons named "Add to <section>" -- I had to find the name by hovering a
   different one.
5. Clicking the section title "Label" does nothing.
6. Label position "Above" shown before I'd even picked the field; fine, but I never chose it.

## What worked

- "Paints 300 nodes" on the Everything row matches the summary count.
- The field list marks id as Key and hostname as Name; that made the right choice obvious among
  69 columns, and it has a search box.
