# Session: wide data filter -- Priya, threat hunter (cybersecurity analyst persona)

Task as given by the moderator: "You want to work only with production hosts that talk to at
least three other hosts. How many hosts does that leave, and how many would there have been if
you had not first limited it to production? The data on screen is a sample: a company's IT estate,
hosts and the network connections between them, with dozens of things recorded about each."

Start screen: shots/tasks/t07-wide/01.png. Renders: tmp/round-7-sessions/t07-wide--cybersecurity-analyst/NN.png.
All commands run from design/ui/prototype, each prefixed
`timeout 120 node app-b/study.mjs --try <abs path>/NN.png task:t07-wide`; only the steps are shown.

## Transcript (think-aloud)

**01 (start).** "Local only" in the top bar. Good, that answers 'where does it run' before I ask.
Still nothing about whether it's approved or calls out, but fine, it's a study. 300 nodes, 1,105
edges, a hairball. I need a filter. "Full graph" has a funnel on it, I'll start there.

**02** `--click "Full graph"` -- Took me to a Data page: Sources, Filters, Attributes. "Filters
change what is computed; the eye in the Graph tree only hides." Good -- that's what I want, so the
connection count gets worked out after the cut, not before. Click "Add filter step".

**03** `... --click "Add filter step"` -- A menu opened by itself: "By an attribute or computed
value", "Top of a computed value", "Largest component", "k-core", "Neighbors of the selection".
Environment is an attribute, so the first one.

**04** `... --click "By an attribute or computed value"` -- Field picker with a search box. List is
alphabetical, environment is below the fold. I click "environment".

**05** `... --click "environment"` -- That opened the environment ATTRIBUTE, not my filter. It grabbed
the one in the left list. Annoying, but useful: values are prod 187, staging 67, dev 46. So the
value is "prod", not "production". Glad I saw that, because the filter never told me.

**06** `... --click "prod"` -- Clicking the prod row does nothing. No "filter to this".

**07** `... --click "New step" --click "Pick a field" --click "environment"` -- Same thing, went to the
attribute again.

**08** `... --click "New step"` -- Back on my step; the picker pops open on its own. Fine, I'll
type, which is what I wanted to do from the start.

**09** `... --click "By an attribute or computed value" --key e --key n --key v` -- "1 match:
environment", highlighted. That's how it should work.

**10** `... --key Enter` -- "environment is [ ]". An empty text box. It knows this field has exactly
three values and it still makes me type one blind. If I hadn't stumbled into the attribute panel I'd
have typed "production" and got zero.

**11** `... --key p --key r --key o --key d` -- Typed prod. Still "This step 300 of 300 nodes".

**12** `... --key Enter` -- Step title updated to "environment is prod". Left list still says "Kept
all 300 nodes". The graph didn't change. Prod is 187 hosts by its own count. So this is wrong.

**13** `... --key Tab` -- Tabbed out in case it applies on blur. Still 300. "Apply this step" is
checked.

**14** `... --click "is"` -- Operators: is, is not, is one of, is empty, is not empty.

**15** `... --click "is one of"` -- Still a bare text box, no list of values.

**16** (with "is" and prod) `... --click "300 of 300 nodes"` -- Took me to the graph with a table:
"300 nodes", and the top rows are lb-dev-sgp-01 and lb-staging-sgp-01. So the "prod" filter kept
dev and staging. The top bar still says "Full graph". A filter labelled "environment is prod" that
keeps everything is worse than no filter -- I'd have put that number in a case.

**17** `--click "Full graph" --click "environment" --hover "More"` -- Tooltip "More actions
(Shift+F10)".

**18** `... --click "More actions"` -- Menu: Color by, Label by, Show as groups, Filter to...,
Create set where this is..., Show in table. "Filter to..." is what I want.

**19** `... --click "Filter to..."` -- Same filter editor, same empty box, "environment is", 300 of
300. Two routes, one dead end.

**20** `... --click "Value"` -- Guessed the box's name. Nothing.

**21** `--click "Full graph" --click "Add filter step" --click "By an attribute or computed value"
--key d --key e --key g` -- Wanted to see if the "talks to 3 or more hosts" half was even possible.
"No match for deg." The summary panel shows "Average total degree" and "Highest total degree", so
the tool knows degree exists, but it isn't something I can filter on from here. The menu says
"computed value" -- which ones? None show up.

**22** `--click "Readings not computed"` -- Opened a graph menu with "Compute the overview",
re-run layout, etc. Not a connection-count filter. I've spent well over my 90 seconds on a control
I can't find. Giving up.

## Outcome

- Did I succeed? No. I never got a working production filter and never found a way to filter on
  how many hosts each one talks to. The only number I have is 187 production hosts, from the
  attribute panel, and that isn't the answer to either question.
- Single Ease Question (1-7): 2.
- Would I use this instead of my current tool? No, not as it stands. In a notebook this is two
  lines of pandas: `df[df.environment=='prod']` and a degree count from the edge list. Here the
  filter box took my value, renamed the step to "environment is prod", and kept all 300 hosts
  including dev and staging, without saying anything was wrong. A filter whose label and count
  disagree is the thing I can't bring to my lead. Typing in the field picker was good, and
  "Local only" up top is the right instinct. Show me the three values in a dropdown, actually
  apply the step, put the connection count in the same picker as the attributes, and give me a
  box where I can just write `environment = prod AND degree >= 3`.

## Problems observed

1. The filter value for a category field is a free text box with no list of values; the real
   value ("prod" vs "production") is only visible elsewhere (render 10, 15).
2. The step "environment is prod" still reports "Kept all 300 nodes" and the table still shows
   dev and staging hosts (renders 12, 16). Label and result disagree, silently.
3. Clicking a field name in the picker list hit the same-named attribute in the left panel and
   navigated away (renders 05, 07); only typing worked.
4. "By an attribute or computed value" offers no computed values such as degree / connection
   count, even though the summary reports total degree (render 21).
5. Clicking a value row (prod 187 hosts) in the attribute panel does nothing (render 06).
6. No query box anywhere.
