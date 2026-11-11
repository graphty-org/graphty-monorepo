# AI chat windows: what research and products recommend

A graph tool draws networks of nodes and edges and analyzes them. This note gathers what researchers and shipping products say about putting an AI chat window in such a tool: one that answers questions, changes the drawing, searches the web and takes voice, using a provider key the reader supplies. It was written for graphty, a graph visualization app, on 2026-11-04.

**The main limit.** No study tests an LLM chat window that edits a drawn graph, and no graph tool checked (Neo4j, Linkurious, Graphistry) documents one. Everything here is transferred from spreadsheets, notebooks, coding tools, charts and pre-LLM language interfaces. Most samples are small.

**Evidence marks.** STRONG: several independent controlled studies agree, or a W3C requirement says so. MODERATE: one or two controlled studies, or smaller studies and shipped products pointing the same way. WEAK: shipped practice, opinion, or a single small study. Shipped practice shows what products do, not that it works.

## The ten recommendations that matter most

**1. Compute every fact about the graph, and put every claim one click from its data.** Numbers come from a tool call, never from the model reading the graph as text. Named nodes highlight on the canvas, a number links to the run that produced it, and each answer offers a compact list of the items behind it, because the canvas alone verifies poorly.
STRONG that cheap checking is what reduces overreliance; WEAK for linked highlighting itself, which has no outcome study.
Sources: Vasconcelos 2023 https://arxiv.org/abs/2212.06823; Kim 2025 https://arxiv.org/abs/2502.08554; Fatemi 2024 https://arxiv.org/abs/2310.04560; Gu 2024 https://arxiv.org/abs/2309.10947; Claude for Excel https://claude.com/docs/office-agents/excel

**2. Design for doubt: polish is not proof.** Keep answers short. Mark computed facts, model interpretation and web material differently. Show "no results" as a warning saying what was searched and what came close. Use honest first-person uncertainty, not a percentage most providers cannot supply.
STRONG that explanations raise trust whether or not the answer is right; MODERATE for the graph-specific finding, which is one qualitative preprint.
Sources: Bansal 2021 https://arxiv.org/abs/2006.14779; Steyvers 2025 https://arxiv.org/abs/2401.13835; Ding 2025 https://arxiv.org/abs/2501.01303; Kim 2024 https://arxiv.org/abs/2405.00623; LinkQ, Li 2025 https://arxiv.org/abs/2505.21512

**3. Decide approval by reversibility, not by habit.** View, style and layout changes apply at once with a visible undo. Ask first only for what undo cannot reach: deleting data, overwriting, anything leaving the app. Offer "change this" beside approve and reject.
MODERATE. No study compares undo with pre-approval.
Sources: Anthropic 2026 (vendor data) https://claude.com/blog/auto-mode-default-in-claude-code; Zhong 2026 https://arxiv.org/abs/2604.13536; Magentic-UI, Mozannar 2025 https://arxiv.org/abs/2507.22358; Horvitz 1999 https://erichorvitz.com/chi99horvitz.pdf

**4. One assistant turn is one undo step, and the change is stated in words.** Use the app's normal undo stack. Describe the change as its rule and count ("colored 42 nodes by PageRank, 3 hidden"). Stop says what already took effect. Undo keeps the conversation and notes that the change was reversed.
MODERATE: products converge, the studies are small, and WCAG supports it only for mass loss.
Sources: Excel https://support.microsoft.com/en-us/accessibility/copilot/copilot-with-excel-tutorial-for-screen-reader-users; Figma https://help.figma.com/hc/en-us/articles/37998629035799; VS Code https://code.visualstudio.com/docs/copilot/chat/review-code-edits; Heer 2008 https://www.cs.tufts.edu/comp/250VA/papers/heer2008graphical.pdf; WCAG 3.3.4 https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html

**5. Show the selection as removable context, and state the scope.** Display it in the composer, live while typing, because people state the command and then point. Say which nodes count and whether hidden or filtered ones do.
MODERATE.
Sources: DirectGPT, Masson 2024 https://arxiv.org/abs/2310.03691; InterChat, Chen 2025 https://arxiv.org/html/2503.04110v2; Orko, Srinivasan 2018 https://faculty.cc.gatech.edu/~stasko/papers/infovis17-orko.pdf; Power BI's filter mismatch https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-ask-data-question

**6. Repair with choices, not apologies.** When a wrong guess is cheap, act and show the guess as editable chips ("important = degree above 10"). When it is not, ask back with clickable options plus free text. When something fails, name the failure class and offer the next action as a button. Instruct the model to ask, because models tend not to.
MODERATE. Widgets must never be the only repair path.
Sources: DataTone, Gao 2015 https://mail.zcliu.cs.umd.edu/datatone/DataTone-UIST15.pdf; Ashktorab 2019 https://mohitjaindr.github.io/pdfs/c25-chi-2019.pdf; Laban 2026 https://arxiv.org/abs/2505.06120; Zhang 2025 https://arxiv.org/abs/2410.13788

**7. For multi-step work, show a short plan and pause only at consequential steps.** Group low-level operations into a few steps, show each tool step as one compact row with its real name, collapsed by default, and keep Stop in place of Send. Expect more control, not better results: none of these studies found a task-success gain.
MODERATE.
Sources: Kazemitabaar 2024 https://arxiv.org/abs/2407.02651; Cocoa, Feng 2026 https://arxiv.org/abs/2412.10999; Pista, Sabouri 2026 https://arxiv.org/abs/2604.20070; WaitGPT, Xie 2024 https://arxiv.org/html/2408.01703v1

**8. Dock a panel from the left rail with a sparkle and a visible word, and keep the graph in view.** Pin the composer and scroll only the log. The first screen says what the assistant does and that it can be wrong, with three to six specific starter prompts drawn from the loaded graph.
MODERATE for the label (the sparkle alone is not understood); WEAK for the panel, which nearly every product ships but nobody has compared.
Sources: NN/G sparkle study https://www.nngroup.com/articles/ai-sparkles-icon-problem/; Figma (above); Li 2024 https://arxiv.org/abs/2404.01425; Cloudscape https://cloudscape.design/patterns/genai/generative-AI-chat/; Zamfirescu-Pereira 2023 https://people.eecs.berkeley.edu/~bjoern/papers/zamfirescu-johnny-chi2023.pdf

**9. Make it work without seeing it.** Never stream the answer body into a live region. Use one always-mounted `role="status"` element for short state changes: working, finished, waiting for approval, error. Give each turn a heading, keep focus in the composer, and report every graph change in words, because the drawing tells a blind reader nothing.
STRONG for announcing status without moving focus; MODERATE for the exact pattern, which rests on two products and one interview study.
Sources: WCAG 4.1.3 https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html; Adnin and Das 2024 https://maitraye.github.io/files/papers/BLV_GenAI_ASSETS24.pdf; Atlassian https://jira.atlassian.com/browse/ROVO-978; azukiazusa 2026 https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui

**10. Say what leaves the browser, and distrust what comes in.** At setup, state that requests go straight to the chosen provider, that the reader is charged, and whether the whole graph or a summary is sent; labels may be personal data. Keep the key for the session unless the reader opts in. Treat web results and imported files as untrusted, and confirm what they prompt.
WEAK: vendor guidance and practitioner rules, with no study.
Sources: Anthropic https://platform.claude.com/docs/en/manage-claude/authentication; OWASP https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html; Willison 2024 https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access; Claude for Excel (above)

## What academics recommend

**When to act.** Horvitz says an agent acts only when expected value beats inaction, and that doing less is better under uncertainty. Amershi's 18 guidelines (https://www.microsoft.com/research/blog/guidelines-for-human-ai-interaction-design/) were tested by 49 practitioners on 20 products and stress efficient dismissal, correction and saying why. Laban found a 39% average drop in multi-turn versus fully specified tasks, with simulated users: models assume early and do not recover. So make starting over cheap.

**Approval.** In Anthropic's data, users approved 97% of prompts but rejected 39% of plans. Seeded testers caught a dangerous command 13.6% of the time, falling from about 17% to about 5% after 50+ prompts. It is vendor data justifying a vendor's default, from a test environment. In 290 reports reviewed by Zhong, prompts showed command text rather than effect, and 40% of the 180 with known recoverability could not be fully undone. No peer-reviewed controlled study of approval fatigue with LLM agents was found.

**Structure.** Cocoa (16 researchers) raised steerability but not usefulness. Kazemitabaar (18 people) raised control and ease of checking, with no change in success or time. Pista (N=16) raised reported understanding, with task success at 0.53 versus 0.50. Too many fine steps "felt verbose and disrupted" work.

**Two routes to checking.** Among 22 analysts, procedure checks appeared in 44 of 52 workflows and data checks in 25; people usually began with procedure and moved to data when something looked off. In LinkQ, 14 practitioners overtrusted answers because of helpful visuals, despite warnings, and every one chose the results table over the graph view. That graph was a side view, so this may be weaker where the graph is the work surface.

**Chat and direct manipulation.** Orko, the closest system (network tool, language plus touch, six people), split about 51% speech, 31% touch, 18% sequential. Speech served search, filters and paths; touch served single nodes and rescued failed speech. In its follow-up (https://arxiv.org/abs/2004.14505), all 12 who tried both preferred having both. DirectGPT made edits about 50% faster (N=12). Data Formulator 2 (https://arxiv.org/html/2408.16119v2) keeps colors and sort order in a builder, which suggests chat should link to the real Style control rather than replace it.

**Answers.** A bare "62%" helped less than one compared with its peers, and trust grew when the system echoed the reader's terms and stated its interpretation (Setlur and Tory 2022, https://arxiv.org/abs/2203.08420).

**Change over time.** Animated transitions help tracking if staging stays simple (Heer and Robertson 2007, https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf), but for dynamic graphs small multiples were faster than animation (Archambault 2011, https://pubmed.ncbi.nlm.nih.gov/20498503/). Animate once and keep a text delta.

**Proactivity.** Pu 2025 (https://arxiv.org/abs/2502.18658, N=18): proactive agents raised disruption and lowered awareness; task boundaries worked and idle triggers failed. ArticulatePro (https://arxiv.org/html/2409.10797v1) doubled discoveries, yet 15 of 24 preferred the non-proactive version.

**Latency.** Tan 2026 (https://arxiv.org/html/2604.06183, N=240) found a 2, 9 or 20 second first-token wait did not change trust; 2 seconds rated less thoughtful. There were no stakes and no agentic work.

**Blind readers.** Kodandaram 2026 (https://arxiv.org/pdf/2602.18623): 9 of 14 wanted uncertainty flagged, and answers leaned on visual references such as "click the green button". So tell the model never to refer to a color or position. VizAbility (https://arxiv.org/html/2310.09611v4) added suggested questions because readers did not know what to ask.

## What products do

**Placement.** A docked panel is the default in Power BI (https://learn.microsoft.com/power-bi/create-reports/copilot-introduction), Hex (https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent), Tableau (https://help.tableau.com/current/online/en-us/web_author_einstein.htm) and Canva. Figma is the closest match: "Agents" in the left navigation opens a persistent sidebar. Microsoft advises against persona names (https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance).

**Context.** Notion and Hex start implicit and narrow with selection; Miro and Hex show removable items. tldraw (https://tldraw.dev/starter-kits/agent) sends selection, a viewport screenshot, simplified visible shapes and clusters summarizing what is off screen, a useful model for large graphs.

**Changes.** Four models ship:

| Model                | Who                                   | Behavior                                       |
| -------------------- | ------------------------------------- | ---------------------------------------------- |
| Plan first           | Excel plan mode, Gemini Deep Research | Review or edit a plan, then act                |
| Hold until confirmed | Hex                                   | Pending edits with diff, Confirm or Undo       |
| Apply, then review   | VS Code, Cursor, Excel default        | Live edits, kept or rejected afterward         |
| Apply, offer undo    | Figma, Power BI, Canva                | Undo afterward, no pre-apply review documented |

Power BI answers also stay in the pane until **Add to page**.

**Undo and Stop.** Figma has Undo in the chat. Excel edits sit on the normal undo stack, with changed cells highlighted, but the highlights are visual only and screen reader users must ask for a list. Tableau's Recreate returns to an earlier view without calling the model. VS Code states that stopping "doesn't undo" finished work. Send becomes Stop in place (Cloudscape https://cloudscape.design/patterns/genai/response-regeneration/).

**Tool activity.** AI Elements (https://elements.ai-sdk.dev/) publishes states: Pending, Running, Awaiting Approval, Completed, Error, Denied. Its banner says it will be deprecated at the end of November 2026, and assistant-ui (https://www.assistant-ui.com/docs/migrations/toolkit-tools) has deprecated its tool helpers, so borrow the state models, not a dependency.

**Citations.** Perplexity numbers them inline (https://www.perplexity.ai/help-center/en/articles/10352895-how-does-perplexity-work). An audit found 51.5% of sentences fully supported by their citations (Liu 2023, https://arxiv.org/abs/2304.09848), and NN/G reports people rarely click yet trust rises (https://www.nngroup.com/articles/explainable-ai/). A link to nodes the reader can see is stronger than a web link.

**Loading and errors.** Separate processing from generation, skip the state under one second, and name real activity (https://cloudscape.design/patterns/genai/genai-loading-states/). Provider errors differ in kind: Anthropic's spend limit can be a 400 or a 429, an error can arrive mid-stream after a 200, and one 401 is a browser refusal, not a bad key (https://platform.claude.com/docs/en/api/errors). Classify by the provider's error fields, keep the prompt and partial answer, and say whether any graph change applied.

**Model choice.** Perplexity offers automatic choice with override; ChatGPT reportedly retired automatic switching for paid plans in 2026 (search excerpts only); Claude keeps a plain picker. Where the reader pays, show provider and model in the composer.

**Graph tools.** The pattern is query generation, not acting on a drawing. Neo4j's co-pilot (https://neo4j.com/blog/developer/cypher-co-pilot/) gives an editable Cypher candidate and warns of invented relationships. False information was the top concern of graph experts (8 of 20, Li 2024).

## Where they disagree, and which way to lean

- **Apply first or hold?** Figma and Excel act; Hex holds; no head-to-head exists. Lean by reversibility. A plan-level approval covers only multi-step work with consequential steps.
- **Does transparency help?** Self-report says yes; LinkQ, watching wrong answers, saw confidence outrun accuracy. Bansal and Vasconcelos reconcile on verification cost. Lean toward cheap checking, and do not treat confidence as success.
- **Whole plan or one step?** Cocoa favors a visible plan, while Kazemitabaar found up-front phases overwhelming and suggests solving first, then steering (untested). Lean to a short outline with stepwise execution.
- **Are widgets used?** Heavily in DataTone, only twice in Orko. Lean: chips for typed requests, with retyping and touch always working.
- **Showing reasoning.** Major products show it; NN/G warns it is often after-the-fact rationalization. Lean: show tool calls and results as fact, and keep model prose collapsed.
- **Sparkle.** Cloudscape calls it convention (https://cloudscape.design/patterns/genai/ingress); NN/G's data says it is not understood. A visible label satisfies both.
- **Regenerate.** Cloudscape deletes later messages; Shape of AI (https://www.shapeof.ai/) preserves versions. Lean: offer it only for turns with no applied changes; otherwise Undo first.
- **Conversation on undo.** VS Code restore removes later turns; Cursor keeps them. Lean: keep them and add a note.
- **Latency.** Nielsen (https://www.nngroup.com/articles/response-times-3-important-limits/) implies every delay costs; Tan finds moderate waits read as care. Lean: never add delay; name real steps.
- **Local key storage.** OWASP and Anthropic warn; Willison accepts it for the reader's own key. Neither has data. Lean: session by default, explicit opt-in to remember, a Forget key button.
- **`role="log"`.** W3C uses it for chat (https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23.html); Soueidan reports poor support (https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/). Lean on `role="status"`.
- **Friction.** Forcing thought cut overreliance on one judgment, and people disliked it (Bucinca 2021, https://arxiv.org/abs/2102.09692). Reserve it for high-stakes steps.

## Patterns to avoid

- Approving every action: people stop catching problems.
- Prompts showing arguments rather than effect.
- A bare sparkle, a persona name, or a bare icon in the composer.
- Streaming answer text into a live region, or relying on `aria-busy`.
- Moving focus on stream or tool steps; auto-scrolling a reader who scrolled up.
- Unprompted action, idle-triggered suggestions, or "was this what you expected?" interruptions.
- Long explanations as a trust device, and citations the reader cannot open.
- Numbers generated by the model, or a confidence percentage it cannot back.
- Regenerate on a turn that already changed the graph.
- Artificial delay.
- Disclaimers on every output: use one specific line with an action near the composer.
- Referring to a color or position in answers.
- A bare single-letter shortcut (WCAG 2.1.4, https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html), or sending voice without showing the transcript.
- Highlights as the only record of a change.

## Open questions for testing with users

1. Given a planted wrong result, who catches it, and how? Confidence is not the measure.
2. Is an incorrectly empty result read as a real finding?
3. Is immediate apply with undo comfortable, or do people want a preview for style and layout?
4. Does anyone check the item list behind an answer, or does the canvas count as proof when the graph is the work surface?
5. Do readers click node links, or only trust that they exist?
6. Do readers notice the selection chip, and what do they assume about hidden or filtered nodes?
7. Are chips used, or do people retype?
8. Does the label get found first time? Which word do people expect?
9. Do starter prompts teach what is possible, or get ignored?
10. How much of a multi-step plan do people read?
11. Do readers understand what is sent to the provider, and does that change what they load?
12. Can a screen reader user complete a change and know what happened, on NVDA, JAWS and VoiceOver?

## Gaps

**Subjects not covered:**

- In-browser models for readers with no key: speed, quality and tool use.
- Large graphs: how much of a graph to send, and what happens at the context limit. Only tldraw's kit touches this.
- Current models' ability to reason over graph text: the benchmark is from 2023.
- Panel width, resizing, narrow screens, and floating versus docked outcomes.
- Streaming and markdown rendering, for which no usable research was found.
- Which word to use: no source compares "AI", "Assistant" and "Agent".
- Saving, exporting or sharing a conversation with a graph: one line, on Figma and Tableau.
- Low vision, zoom and reflow, reduced motion, color blindness in change highlights, and cognitive accessibility.
- Non-English readers, and languages other than English in voice.
- Hold versus toggle for voice, and cost disclosure: no study found.
- Learning over time: nearly all studies are single sessions.

**Claims resting on one source:**

- Prompt injection: only Claude for Excel; no security research was read.
- Approval fatigue numbers: one vendor, in a coding tool.
- Overtrust caused by process visuals: LinkQ, a preprint with no comparison condition.
- Network language plus touch: Orko and its follow-up, one group, pre-LLM.
- Latency: Tan, one study without stakes.
- Spreadsheet step pausing: Pista, a preprint with one Microsoft co-author.
- Chat-window status announcements: two products, each checked on one pairing.

**Not checked against the source.** One review could not open Ashktorab; another did and confirmed that offering options ranked first. Still unverified: Eviza, Snowy and Archambault (abstract or excerpts), Horvitz, Amershi, Zamfirescu-Pereira, Shape of AI, Apple, PAIR, Notion, Miro, tldraw, Genie, Canva, Observable, OWASP, Nielsen, Willison and ChatGPT's help pages.
