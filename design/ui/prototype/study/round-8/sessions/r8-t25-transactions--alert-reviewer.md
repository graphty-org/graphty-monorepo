# Session: transfers weighted by how often two accounts trade -- Nadia, level-1 alert reviewer

Task as given by the moderator: "The accounts and transfers spreadsheets are open on the import
page (example data if you do not work in banking). In every analysis from now on, two accounts
that trade often should count as more tightly tied than two that traded once. Set that up before
you load, then check it took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25-transactions--alert-reviewer/.

## Start screen (shots/tasks/r8-t25-transactions/01.png)

"OK, the transfers file, one row per transfer. from, to, amount, timestamp. The amount column
already has a blue 'Weight' tag and 'Higher means Stronger'. So right now a big transfer counts
as a tight tie. That's not what I was asked -- they said how OFTEN, not how much. One transfer of
50,000 is not a relationship; forty transfers of 200 is.

Up top: 'One edge per Row / Pair'. Pair sounds like 'these two accounts', which is what I want to
count. Down in the report it says 'No two transfers share both ends, so One edge per Pair would
change nothing.' Huh. Nobody sent to the same account twice in a whole month? That's weird for
real data, but fine, it's example data. I'll click Pair anyway, because that's the setting that
sounds like 'count the trades between two accounts'."

## Step 1 -- click Pair

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t25-transactions --click "Pair"

"A banner: 'One row per pair: each is one edge, its count the rows it merged.' And a new gray
column on the right, 'count', marked derived, with 'Attribute' under it. All 1s. The toast says
amount stays the Weight, summed. So it is still weighting by money, just added up. I want the
count to be the weight. The little 'Attribute' under count looks like the same kind of label as
the blue 'Weight' under amount, so maybe I can change it."

## Step 2 -- click Attribute under count

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t25-transactions --click "Pair" --click "Attribute"

"A menu. Grayed lines at the top about From and To that I don't need. Then Subtype, Name, Time,
Weight, Edge id, Position, and Attribute is ticked. Weight -- that's it."

## Step 3 -- click Weight

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight"

(The tool noted 'Weight' matched two controls and clicked the menu item, which is the one I
meant.)

"Toast: 'Weight moved from amount to count.' Good, it says it in plain words, and there's an Undo.
count now has the blue Weight tag and 'Higher means Stronger' is on. The header line says 'Weight:
count, the number of rows per pair'. That's exactly what I wanted. amount went back to plain
Attribute, combined by Sum -- fine, I'd still want the total somewhere.

Still every count is 1, though. So on this file the setting does nothing you could see. I'll
load and look."

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load"

"Big gray blob of hexagons, I don't care about that. On the right, Summary: 'Weight: count,
stronger.' OK, that's my check. 'Edges: 9,113 transfers, each a distinct pair.' Reciprocity 0, so
nobody even sent money back the other way. So again, every pair traded once. It took, but on this
data it changes nothing -- if I ran something on it I couldn't tell the difference.

'count, stronger' is a blue link. Let me click it and make sure it shows me where that's set."

## Step 5 -- click "count, stronger"

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "count, stronger"

"Wait. This is 'Edit: transfers', and it says One edge per ROW, 'Weight: amount', amount has the
Weight tag, there's no count column at all. That's the opposite of what the summary just told me.
Which one is true? Did the load throw away what I set? 'Apply is off: Nothing has changed yet' --
so this screen thinks amount is the current setting.

Fine, I'll do it again here and press Apply."

## Step 6 -- redo it in the edit screen and Apply

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "count, stronger" --click "Pair" --click "Attribute" --click "Weight" --click "Apply"

"Now I'm on a Data panel. Right side still says 'Weight: count, stronger'. Left side, under the
transfers source: 'one edge per row. Weight: amount, a higher amount is a stronger tie.' And under
Attributes, Edges: 'amount -- Weight'. No count anywhere on the left.

So the same screen tells me two different things. Right says count. Left says amount. I set it
twice. I can't put that in a file -- if QA asks 'what was the weight', I don't have an answer I'd
sign. And 'every analysis from now on' -- I haven't seen anything that says this is remembered for
next time either, unless that's what the left side is, and the left side says amount.

I'm stopping. That's already longer than an alert takes."

## Debrief

- Did I succeed? I don't know, and that means no. Setting it before loading was easy -- Pair, then
  change count's tag to Weight, and the toast said exactly what moved. Checking it is where it fell
  apart: the summary said count, the screen it links to said amount, and after redoing it the
  sources list and attributes list still said amount.
- Also: the example data has every pair trading exactly once, so even if it took I could not see
  any effect. The app told me that up front ("No two transfers share both ends"), which I
  appreciated, but it left me wondering whether I'd understood the job.
- Single Ease Question: 3 of 7. Easy to set, impossible to confirm.
- Would I use this instead of my current tool? No. I don't use a graph tool for alerts at all, and
  my case system doesn't make me pick what a "tie" means. If I did need this, two parts of the
  screen disagreeing about what the weight is would be a QA finding waiting to happen. When I'm not
  sure, it goes up to level 2 -- and this is a "not sure".
