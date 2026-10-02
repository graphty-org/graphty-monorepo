# Session: wide-table filter task -- Dr. Chen, computational biologist

Task as given: "You want to work only with production hosts that talk to at least three other hosts. How many hosts does that leave, and how many would there have been if you had not first limited it to production?" Sample data: a company's IT estate (hosts and network connections), treated as a wide spreadsheet.

Start screen: shots/tasks/t07-wide/01.png. Renders: tmp/round-7-sessions/t07-wide--bioinformatics-researcher/NN.png. All commands were run from design/ui/prototype with the prefix
`timeout 120 node app-b/study.mjs --try <render> task:t07-wide`.

## Steps, thinking aloud

**Start.** "There are 300 nodes and 1,105 edges, and it's directed. Production will be a column, and 'talks to at least three' means degree of at least 3. It's directed, so do they mean in, out or total? I'll assume total. The order matters: degree inside the prod-only network is not the same as degree in the whole network. I need a filter, and 'Full graph' with the funnel icon looks like one."

01 -- `--click "Full graph"`
"A Data panel opened with Sources, Filters and Attributes. The Filters section says 'Filters change what is computed; the eye only hides.' Good. That is exactly the distinction this question is about. I can see an 'environment' attribute further down the list."

02 -- `... --click "Add filter step"`
"A 'New step' was created, 'Kept all 300 nodes', and a menu is open: By an attribute or computed value / Top of a computed value / Largest component / k-core / Neighbors of the selection. k-core is not the same as degree >= 3, so the first option is the one."

03 -- `... --click "By an attribute or computed value"`
"Now there's a field picker with a search box. 'environment' is below the fold."

04 -- `... --click "environment"`
"That opened the environment ATTRIBUTE in the right panel instead of putting it into my filter. The click went to the list on the left, not the dropdown. It is useful all the same: Category, 3 distinct values, prod 187 hosts, staging 67, dev 46. That adds up to 300, so nothing is missing. 'Production' is 'prod', 187 hosts."

05 -- `... --click "environment" --click "New step"`
"Back on my step, and the field picker opened again by itself. 'environment' is still below the fold."

06 -- `... --click "By an attribute or computed value" --type "environment"`
"I tried typing into the picker's search box. Nothing changed."

07 -- `--click "Full graph" --click "environment" --click "prod"`
"Can I filter from the value count? Clicking 'prod 187 hosts' does nothing. In Cytoscape I'd right-click a value and select those nodes."

08 -- `--click "Full graph" --click "Add filter step" --click "Attributes" --click "By an attribute or computed value" --click "environment"`
"I collapsed the left Attributes list so it would stop catching my clicks. That closed the menu, so the step reads 'Keep: Pick one' again."

09 -- `... --click "Attributes" --click "Pick one" --click "By an attribute or computed value" --click "environment"`
"Now it reads 'environment is' followed by an empty box. 'This step: 300 of 300 nodes.' The app already knows there are exactly three values. Why is this a blank text box and not a dropdown of prod/staging/dev? I could misspell 'prod' here and get zero rows without knowing why."

10 -- `... --type "prod" --key Enter`
"The box is still empty. My typing did not land."

11 -- `... --click "is"`
"That only lists operators: is, is not, is one of, is empty, is not empty."

12 -- `... --click "is" --click "is one of"`
"I hoped 'is one of' would give me checkboxes of the values. It didn't. Same empty box, still 300 of 300."

13 -- `--click "Table"`
"I tried the node table instead. It shows 8 of 69 columns, with no environment column in view and no filter on the column headers. That's no help."

14 -- `--click "Full graph" --click "Add filter step" --click "Attributes" --click "Pick one" --click "By an attribute or computed value" --click "environment" --key Tab --key Tab --key p --key r --key o --key d --key Enter`
"I tabbed into the box and typed 'prod' key by key. The 'p' opened a 'Path between' dialog, put 'rod' into From, and said 'No match for rod'. My keystrokes became a global shortcut. That is the kind of thing that makes me stop trusting a tool: I type data and it runs a different analysis."

15 -- `--click "Analyze"`
"Forget the filter. Can I at least get degree? Analyze lists 'Links (count): how many edges each node has', plus in and out versions. I wish it just said degree, but fine."

16 -- `--click "Analyze" --click "Links (count)"`
"There's one setting, Measure, and 'Under a second'. No parameter for direction, though in/out are separate entries."

17 -- `--click "Analyze" --click "Links (count)" --click "Run"`
"'Would add Links (count) at the top of the list, running...' Nothing comes back: no column, no distribution, no count of nodes >= 3. So I can't answer the degree half either way."

**Stopped here.** "I have 187 production hosts and nothing else. I'd do this in igraph:
`induced_subgraph(g, V(g)$environment == "prod")`, then `sum(degree(sub) >= 3)`, then the same on the full graph. Four lines."

## Outcome

- Succeeded? No. I found the production count (187 of 300), but I never got a filter on environment applied, and never got a count of hosts with degree >= 3, either inside the prod-only network or in the whole one. I could not answer either number the task asked for.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? No, not for this. The idea is right: an ordered list of filter steps that changes what is computed, with "N of M nodes" on each step, is exactly what I'd need to answer "before vs after restricting". The Cytoscape filter panel can't show me that cleanly. But I couldn't enter a value for a category column, and typing in the panel fired a shortcut. Until that works, it's igraph.

## What got in my way, specifically

1. The value box for a category condition is a blank text field. The app already knows environment has exactly three values (it showed them with counts), so offer them as a picklist or checkboxes.
2. My keystrokes in the filter panel went to a global shortcut ('p' opened Path between) instead of the field. A data-entry field must own the keyboard while it has focus, and a shortcut must never fire while I'm typing data.
3. The field picker for the condition and the Attributes list in the left panel show the same names at the same time. Clicking the name opened the attribute page instead of choosing the field, and I lost my step setup.
4. Clicking a value in the attribute summary ("prod 187 hosts") does nothing. That is the most natural place to say "keep only these".
5. The degree measure is called "Links (count)". Say "degree" somewhere, and say whether it counts in, out or both on a directed graph.
6. Running the measure gave no visible result: no new column, no distribution, no way to threshold it.
7. The task's real question, degree counted after the restriction versus before it, is what the Filters text promises ("filters change what is computed"). I never got far enough to see whether the app would show me both numbers side by side.
