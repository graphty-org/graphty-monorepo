# Session: label hosts by name (wide IT-estate sample) -- Dana Okafor, supply chain risk analyst

Task as given: "Have each host in the drawing show what people call it, not its inventory
number. The data on screen is a sample: a company's IT estate, hosts and the network connections
between them, with dozens of things recorded about each. If that is not your line of work, treat
it as your own wide spreadsheet."

Start screen: shots/tasks/t21-wide/01.png. Renders are in
tmp/round-7-sessions/t21-wide--supply-chain-analyst/ (02-13).
All commands were run from design/ui/prototype as
`timeout 120 node app-b/study.mjs --try <D>/NN.png task:t21-wide ...`, where <D> is that render folder.

## Think-aloud

**01 (start).** "OK, a hairball of grey dots. Not my data, but fine: think of it as a supplier
list with 69 columns. I want the dots to say the name, like 'web-prod-03', not some asset tag.
There's a search box, Selection / Notes / Everything on the left, and Style / Data tabs on the
right. Right now Data is open and shows counts. 'Style' sounds like how it looks. I'll try that."

**02 `--click "Style"`.** "This is the background and 'Layout: Spread Out'. There's 'Hide
overlapping labels', so labels exist somewhere, but there's no 'show names' here. Not it."

**03 `--click "Everything"`.** "'Everything' is the only thing on the left that sounds like all the
hosts. Yes: 'Paints 300 nodes', with Fill, Shape, Effects, Label and Tooltip. Label is what I
want. There's a plus next to it."

**04 `--click "Everything" --click "Label"`.** "Clicking the word 'Label' does nothing. I have to
hit the little plus."

**05-07 `--hover "Add label"`, `--click "Add Label"`, `--click "Show label"`.** "I can't tell
what the plus is called. None of my guesses work. Annoying. In Excel a plus has a tooltip."

**08 `--click "Everything" --hover "Add"`.** "That shows the Effects plus is 'Add to Effects'. So
the Label one must be 'Add to Label'. Odd wording, 'add to label', but OK."

**09 `--click "Everything" --click "Add to Label"`.** "A small menu: 'Label line' and 'Show
labels'. I don't know what a 'label line' is. A line pointing at the dot? 'Show labels' is the
plain-English one."

**10 `... --click "Show labels"`.** "It added a 'Show labels' row with a checkbox, and it's
UNticked. So I picked 'show labels' and it's... not showing them? I have to tick it as well. Two
steps for one thing."

**11 `... --click "Show labels" --click "Show labels"`.** "Ticked. The drawing looks exactly the
same, with no text anywhere. It also never asked me WHICH column to show. If it's going to show the
inventory number, that's the wrong answer, and I couldn't tell. Maybe 'Label line' is where you
pick the text."

**12 `... --click "Add to Label" --click "Label line"`.** "The tool said nothing is called
'Label line' that second time, but a picker opened anyway: a row 'Above -- Pick a field' and a
list. 'In use: id (Key), hostname (Name)', then a long list of other columns. hostname is what
people call the hosts. 'id' must be the inventory number. Good that it says Key vs Name. That's
the one helpful thing so far."

**13 `... --click "hostname"`.** "Now it reads 'Above: Abc hostname' and 'Show labels' is ticked.
On paper that's done. But the picture STILL has no names on the dots. Nothing changed that I can
see. Maybe it's because it's zoomed out, or maybe overlapping labels are hidden, but there's no
message telling me. I'm going to stop here. The settings say hostname, so I'll call it done,
but I wouldn't bet the Thursday slide on it."

## Commands

```
--try <D>/02.png task:t21-wide --click "Style"
--try <D>/03.png task:t21-wide --click "Everything"
--try <D>/04.png task:t21-wide --click "Everything" --click "Label"
--try <D>/05.png task:t21-wide --click "Everything" --hover "Add label"        -> nothing on screen is called "Add label"
--try <D>/06.png task:t21-wide --click "Everything" --click "Add Label"        -> nothing on screen is called "Add Label"
--try <D>/07.png task:t21-wide --click "Everything" --click "Show label"       -> nothing on screen is called "Show label"
--try <D>/08.png task:t21-wide --click "Everything" --hover "Add"             (tooltip "Add to Effects")
--try <D>/09.png task:t21-wide --click "Everything" --click "Add to Label"
--try <D>/10.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels"
--try <D>/11.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"
--try <D>/12.png task:t21-wide --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "Label line"   -> nothing on screen is called "Label line" (but a field picker was open)
--try <D>/13.png task:t21-wide ... same as 12 ... --click "hostname"
```

## Outcome

- **Succeeded?** Probably. The label is set to hostname and labels are ticked on. But the drawing
  never showed a single name, so I can't confirm it with my own eyes.
- **Single Ease Question:** 3 of 7.
- **Would I use this instead of my current tool?** Not for this. In Excel or Power BI I pick the
  "name" column for the data label in one dropdown and I SEE it at once. Here I had to find that
  "Everything" is where the look of all the hosts lives, guess a plus button with no visible name,
  pick "Show labels", then tick it AGAIN, and choose the column in a separate step. And then the
  picture didn't change. The Key / Name tags in the column list were genuinely useful. If the
  first "Show labels" had asked me "which column?" and pre-picked the Name one, it would have
  been one click.

## Problems seen

1. Nothing in the first screen says where names on the drawing are set; "Style" on the graph only
   offers background and layout. Labels live under the built-in "Everything" row.
2. The plus next to "Label" has no visible text; its tooltip wording "Add to Label" is guessable
   only after hovering a sibling plus.
3. Choosing "Show labels" adds a checkbox that is OFF, so the same intent takes two clicks.
4. "Show labels" does not ask which column to use; the column choice hides behind "Label line",
   a term I did not understand.
5. After hostname is set and labels are on, the drawing shows no labels at all, with no
   explanation (zoom, overlap hiding, or anything else).
6. Delight: the column picker marks id as "Key" and hostname as "Name", and puts them first under
   "In use". That answered "which one is the inventory number" without opening the table.
