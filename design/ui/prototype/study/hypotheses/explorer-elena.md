# Design hypotheses for the first-time graph user

For the design team and session runners only. Do NOT include this file in the prompt that plays
Explorer Elena: if the simulated user knows the intended solutions, she will recognise and praise
them, and the session proves nothing.

Each hypothesis names a design idea, the outcome it is meant to produce (in her words, from her
persona), and what a session must show for it to hold. A hypothesis that sessions do not support
is dropped or reworked, not defended.

| Design idea | Outcome it should produce | Holds if, in a session |
|---|---|---|
| A first picture chosen for her: obvious groups coloured, most-connected items larger, with a one-line note saying what was chosen and a way to change it | "It was my data, not a demo, and it made sense the first time I looked at it." | She describes a real pattern in her data (a group, a hub) without help, and does not misread size as something else. If she reads size as revenue, the note failed. |
| An import summary in plain words: rows read, items of each kind found, names that look like duplicates, rows skipped and why | "I didn't have to clean my spreadsheet first, and nothing went missing." | She notices a skipped row or duplicate without prompting and can say why it happened -- and does not blame herself for it. |
| A business-shaped sample dataset (accounts and integrations), not a karate club | "It was my data, not a demo..." | She treats the sample as plausible and tries a task on it before loading her own. |
| Clicking an item gives a short card in words: what it is, how many it connects to, how that compares to the rest | "I clicked on a customer I know and it told me something I didn't know." | She repeats a comparison from the card in her own words, correctly. |
| Plain questions in place of algorithm names ("Which ones are most connected?", "Are there groups?", "Shortest route from A to B") | "I never had to learn what any of the words meant." | She runs at least one analysis without asking what a term means. |
| A layout that holds still after it settles, and a visible way back after every change | "I tried things and nothing broke." | She takes an action she was unsure about, and returns from it, without asking whether it is safe. |
| One-step export of the current view as an image sized for a slide | "The picture I put in the deck looked as good as it did on my screen." | The exported image is readable when shown at slide size on a shared screen. |
| 3,000 rows in the browser with visible progress and no install | "It worked with all three thousand rows, on my laptop, in the browser." | Her full-size file loads and she never asks whether it is frozen. |

Evidence behind each idea is in `study/personas/explorer-elena.md` (Frustrations, and Evidence from
business users).
