#!/usr/bin/env python3
"""Writes flows/run-and-read.html (edit this, then run it from anywhere).

The two diagrams are drawn here as inline SVG: each node is placed by its center, each edge is a
list of points. Numbers come from kit/fixtures.json so the flow agrees with its screen mock.
"""
import json, os

P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fx = json.load(open(os.path.join(P, "kit/fixtures.json")))["datasets"]
cit = fx["citations"]
cost, samp = cit["betweennessCost"], cit["sampledBetweenness"]
K, CAP, SEED = samp["k"], cost["budgetSeconds"], samp["seed"]
CN = f'{cit["nodes"]:,}'
ppi, tx = fx["ppi"], fx["transactions"]
PN = ppi["nodes"]
COMP = ppi["stats"]["components"]
TP53R = ppi["inspector"]["tp53"]["betweennessRank"]["from"]
TXN, TXE = f'{tx["nodes"]:,}', f'{tx["edges"]:,}'
AMAX = f'{tx["setsAndPaths"]["path"]["amountRange"][1]:,.2f}'
L = fx["ppi"]["louvain"]
LC, LS = L["communities"] - L["singletons"], L["singletons"]
S = "../screens/run-and-read.html"
OFC = "../screens/option-form-cost.html"
RP = "../screens/results-panel.html"

# How sure: the Top nodes the editor shows, the closest neighbouring pair, and whether PageRank
# puts the same nodes on top. Read from the fixture's top lists (the top 10 by betweenness and by
# degree, which hold every node that could reach PageRank's top 5 on this graph).
NEAR = 0.01  # the stated near-tie line: two values less than 1% apart
TOP = ppi["topByBetweenness"]
TN = len(TOP)
gaps = [((a["betweenness"] - b["betweenness"]) / a["betweenness"], i) for i, (a, b) in enumerate(zip(TOP, TOP[1:]))]
g, gi = min(gaps)
NEAR_TIES = [i for gap, i in gaps if gap < NEAR]
CLOSE = f'#{gi + 1} {TOP[gi]["id"]} and #{gi + 2} {TOP[gi + 1]["id"]}, {g * 100:.1f}% apart'
pool = {r["id"]: r for r in TOP + ppi["topByDegree"]}
by_pr = [r["id"] for r in sorted(pool.values(), key=lambda r: -r["pagerank"])]
AGREE = 0
while AGREE < TN and by_pr[AGREE] == TOP[AGREE]["id"]:
    AGREE += 1
SURE = (
    f"Top {TN} of {PN}: " + (f"{len(NEAR_TIES)} pairs are near-ties (less than {NEAR:.0%} apart)" if NEAR_TIES else f"no two are less than {NEAR:.0%} apart; the closest are {CLOSE}")
    + (f". Betweenness and PageRank agree on the top {AGREE}, in the same order." if AGREE >= 2 else ". Betweenness and PageRank disagree on the top.")
)


# ---------- drawing ----------
def box(shape, cx, cy, w, h, title, sub="", href=None, gap=False):
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    g = " f-gap" if gap else ""
    if shape == "place":
        el = f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="3" class="f-place{g}"/>'
    elif shape == "overlay":
        el = f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="{h / 2}" class="f-place{g}"/>'
    elif shape == "ask":
        el = f'<polygon points="{cx},{y0} {x1},{cy} {cx},{y1} {x0},{cy}" class="f-ask{g}"/>'
    elif shape == "commit":
        el = f'<polygon points="{x0 + 14},{y0} {x1},{y0} {x1 - 14},{y1} {x0},{y1}" class="f-commit{g}"/>'
    elif shape == "check":
        el = f'<polygon points="{x0 + 22},{y0} {x1 - 22},{y0} {x1},{cy} {x1 - 22},{y1} {x0 + 22},{y1} {x0},{cy}" class="f-check{g}"/>'
    inset = {"ask": w * 0.2, "check": 24, "commit": 16}.get(shape, 10)
    text = (
        f'<foreignObject x="{x0 + inset}" y="{y0}" width="{w - 2 * inset}" height="{h}"><div xmlns="http://www.w3.org/1999/xhtml" class="f-t">'
        f'<b>{title}</b>{f"<span class=f-u>{sub}</span>" if sub else ""}</div></foreignObject>'
    )
    label = title.replace("&quot;", "")
    if href:
        return f'<a href="{href}" aria-label="{label}">{el}{text}</a>'
    return f"<g>{el}{text}</g>"


MARK = ' marker-end="url(#ah)"'


def edge(pts, label=None, at=None, arrow=True):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    out = f'<path d="{d}" class="f-edge"{MARK if arrow else ""}/>'
    if label:
        lx, ly = at
        out += f'<text x="{lx}" y="{ly}" class="f-lbl-t">{label}</text>'
    return out


def svg(w, h, title, parts, mid):
    return (
        f'<svg class="f-diagram" viewBox="0 0 {w} {h}" role="group" aria-labelledby="{mid}"><title id="{mid}">{title}</title>'
        f'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="f-ah"/></marker></defs>'
        + "".join(parts) + "</svg>"
    )


J = 285  # the line every "run again" joins, just above the cost gate
MAIN = svg(1100, 1350, "Run a centrality measure and read it: two ways in, the cost checks, a run and its endings, reading, and retuning", [
    # edges first, so boxes sit over them
    edge([(300, 78), (300, 120)]),
    edge([(620, 76), (620, 120)]),
    edge([(920, 76), (920, 150), (650, 150)]),
    edge([(460, 180), (460, 212)]),
    edge([(460, 268), (460, 300)]),
    '<circle cx="460" cy="285" r="3.5" class="f-ah"/>',
    edge([(600, 350), (710, 350)], "yes", (640, 342)),
    edge([(460, 405), (460, 425)], "no", (470, 419)),
    edge([(860, 382), (860, 444)], "the focused route, or another", (870, 420)),
    edge([(335, 480), (270, 480)], "yes", (290, 472)),
    edge([(150, 512), (150, 576)], "Run", (160, 550)),
    edge([(460, 535), (460, 576)], "no: runs at once", (470, 560)),
    edge([(150, 624), (150, 700), (260, 700)]),
    edge([(460, 624), (460, 670)]),
    edge([(860, 496), (860, 700), (660, 700)]),
    edge([(460, 730), (460, 775)]),
    edge([(560, 820), (730, 820)], "canceled", (610, 812)),
    edge([(360, 820), (275, 820)], "failed", (290, 812)),
    edge([(460, 865), (460, 910)], "finished", (470, 893)),
    edge([(860, 850), (860, 898)], "Run", (870, 880)),
    edge([(980, 920), (1080, 920), (1080, J), (466, J)]),
    edge([(150, 852), (150, 898)], "Re-run on CPU", (160, 880)),
    edge([(30, 920), (20, 920)], arrow=False),
    edge([(460, 970), (460, 1020)]),
    edge([(660, 1050), (800, 1050)], "a Top node or a bar", (672, 1042)),
    edge([(460, 1080), (460, 1125)]),
    edge([(360, 1170), (275, 1170)], "no: change one", (272, 1160)),
    edge([(150, 1138), (150, 1082)], "Run", (160, 1116)),
    edge([(45, 1060), (20, 1060), (20, J), (454, J)]),
    edge([(460, 1215), (460, 1240)], "yes", (470, 1233)),
    '<text x="30" y="276" class="f-lbl-t">every new run passes the cost checks again</text>',
    '<a href="#weighted"><text x="588" y="646" class="f-lbl-t f-lbl-link">a weight with no answer yet: the branch below</text></a>',
    # boxes
    box("place", 300, 50, 270, 56, "Results: the Catalog, by family", "a Catalog row", f"{S}#catalog"),
    box("overlay", 620, 50, 250, 52, "Quick actions", "a name or a family word, Enter", f"{S}#quick"),
    box("overlay", 920, 50, 240, 52, "Quick actions by question word", "&quot;brokers&quot;: waits on catalog aliases", f"{S}#quick", gap=True),
    box("check", 460, 150, 380, 60, "Before the run: description and band word", "on hover and focus, in both places; nothing runs", f"{S}#catalog"),
    box("check", 460, 240, 380, 56, "Precondition mark", f"Eigenvector: {COMP} components, offers PageRank", f"{S}#catalog", gap=True),
    box("ask", 460, 350, 280, 110, "Refused by the cost gate?", f"past the cap: {CAP} s by default, not yet settled", f"{S}#refused"),
    box("overlay", 860, 350, 300, 64, "Result editor: refused", "routes cheapest first, each with its band", f"{S}#refused"),
    box("commit", 860, 470, 300, 52, "Run sampled, Run on set or Run exactly", "the header's one commit; one undo step", f"{S}#running"),
    box("ask", 460, 480, 250, 110, "Needs an argument, no cost model, or minutes?", "", f"{S}#unrun"),
    box("place", 150, 480, 240, 64, "Result row: Not run, Run focused", "its band; the editor's Parameters", f"{S}#unrun"),
    box("commit", 150, 600, 230, 48, "Run PageRank", "one undo step", f"{S}#unrun"),
    box("commit", 460, 600, 230, 48, "Run Betweenness", "one undo step", f"{S}#done"),
    box("place", 460, 700, 400, 60, "Results: the row Running, or Queued", "Cancel on the row; the notice while the panel is closed", f"{S}#running"),
    box("ask", 460, 820, 200, 90, "How does it end?"),
    box("place", 860, 820, 260, 60, "Row: Not run", "focus stays on the row; Run is its command", f"{S}#canceled"),
    box("place", 150, 820, 250, 64, "Row: Failed", "the cause; the run before kept and marked", f"{S}#failed"),
    box("commit", 860, 920, 240, 44, "Run", "one undo step", f"{S}#canceled"),
    box("commit", 150, 920, 240, 44, "Re-run on CPU", "one undo step", f"{S}#failed"),
    box("check", 460, 940, 400, 60, "State line, read from the run record", "weight, scope, exact or estimated, engine; the variant word in the name", f"{S}#done"),
    box("place", 460, 1050, 400, 60, "Result editor: Top nodes and how sure, then the distribution", "~ at every estimated value", f"{S}#sampled"),
    box("place", 920, 1050, 240, 56, "Inspector: the node's rank", "the table sorted by the column", f"{S}#rank"),
    box("ask", 460, 1170, 200, 90, "Right settings?"),
    box("overlay", 150, 1170, 250, 64, "Result editor: Parameters", "the Run line shows the held edit's band", f"{OFC}#sample-over-budget"),
    box("commit", 150, 1060, 210, 44, "Run: a new run of the result", "one undo step", f"{S}#sampled"),
    box("ask", 460, 1290, 300, 100, "Canvas: painted by the run's layer?", "the owner's open decision", "#decisions", gap=True),
], "dg-main")

SIDE = svg(1100, 650, "Make the layout readable: from rest or a selected set, the start and the pins", [
    edge([(300, 60), (380, 60)]),
    edge([(660, 60), (740, 60)], "edit an option", (664, 50)),
    edge([(520, 88), (520, 140)], "Run layout", (530, 120)),
    edge([(880, 88), (880, 190), (635, 190)], "Run layout", (760, 182)),
    edge([(405, 190), (300, 190), (300, 276)], "yes, the default", (310, 240)),
    edge([(520, 240), (520, 255), (740, 255), (740, 276)], "no: Fresh", (640, 248)),
    edge([(300, 324), (300, 400), (310, 400)]),
    edge([(740, 324), (740, 400), (730, 400)]),
    edge([(520, 428), (520, 455)]),
    edge([(630, 500), (750, 500)], "yes", (680, 492)),
    edge([(970, 500), (1060, 500), (1060, 16), (520, 16), (520, 32)]),
    edge([(520, 545), (520, 588)], "no", (530, 570)),
    box("place", 170, 60, 260, 56, "At rest (Esc), or a set selected", "at any point, not only after reading", f"{S}#layout"),
    box("place", 520, 60, 280, 56, "Inspector: the Layout row", "method, scope, start, seed, pins", f"{S}#layout"),
    box("overlay", 880, 60, 280, 56, "Layout editor", "method and options; edits wait for Run layout", f"{S}#layout"),
    box("ask", 520, 190, 230, 100, "Start from the current positions?"),
    box("commit", 300, 300, 300, 48, "Layout run from the current positions", "one undo step", f"{S}#layout", gap=True),
    box("commit", 740, 300, 300, 48, "Layout run from a fresh start", "one undo step", f"{S}#layout", gap=True),
    box("check", 520, 400, 420, 56, "The Layout row names method, scope, start and pins", "", f"{S}#layout", gap=True),
    box("ask", 520, 500, 220, 90, "Pinned nodes in the way?"),
    box("commit", 860, 500, 220, 44, "Unpin all", "one undo step", f"{S}#layout"),
    box("place", 520, 610, 160, 44, "Rest"),
], "dg-side")

WEIGHT = svg(1100, 760, "The first weighted run and changing the answer: PageRank weighted by amount on the March transfers", [
    edge([(330, 50), (466, 50)]),
    edge([(620, 80), (620, 125)], "Weight by: amount", (630, 108)),
    edge([(770, 50), (960, 50), (960, 150)], "None for this run", (800, 42)),
    edge([(470, 180), (352, 180)], "no", (410, 172)),
    edge([(200, 218), (200, 320), (486, 320)], "an answer, then Run", (210, 290)),
    edge([(620, 235), (620, 294)], "yes", (630, 270)),
    edge([(960, 208), (960, 430), (842, 430)]),
    edge([(620, 344), (620, 396)]),
    edge([(620, 462), (620, 510)]),
    edge([(620, 610), (620, 664)], "yes", (630, 642)),
    edge([(510, 560), (347, 560)], "no: Change...", (380, 552)),
    edge([(200, 595), (200, 656)]),
    edge([(40, 690), (20, 690), (20, 430), (396, 430)]),
    '<text x="30" y="420" class="f-lbl-t">every result that used the answer shows the new line</text>',
    box("overlay", 200, 50, 260, 56, "Quick actions: Run PageRank", "Sarah, on the March transfers", f"{S}#quick"),
    box("overlay", 620, 50, 300, 60, "Run form: Weight by", "&quot;amount (project answer)&quot; or &quot;None for this run&quot;", f"{OFC}#weight-refused"),
    box("ask", 620, 180, 300, 110, "Does amount have a project answer?"),
    box("overlay", 200, 180, 300, 76, "The meaning question, in the run form", "distance, similarity, capacity, reliability: one line each on what it does to PageRank", f"{OFC}#weight-meaning"),
    box("commit", 960, 180, 240, 56, "Run PageRank unweighted", "the project answer untouched; one undo step", f"{S}#done"),
    box("commit", 620, 320, 270, 48, "Run PageRank", "one undo step; a first answer is part of it", f"{S}#done"),
    box("check", 620, 430, 440, 64, "State line, read from the run record", "&quot;Weight: amount, used as capacity. Change...&quot; and, when some are blank, how many transfers have no amount", f"{RP}#finished"),
    box("ask", 620, 560, 220, 100, "Right meaning?"),
    box("place", 620, 690, 300, 52, "Read: Top nodes and how sure", "", f"{S}#done"),
    box("overlay", 200, 560, 290, 70, "Change...: the meaning question for amount", "names the 3 results that use the answer", f"{OFC}#weight-meaning"),
    box("commit", 200, 690, 320, 64, "Change the project answer", "one undo step: &quot;Weight: amount no longer used as capacity. 3 results re-run.&quot;", f"{RP}#outofdate"),
], "dg-weight")

GROUPS = svg(1100, 600, "Communities: run Louvain on the proteins, read the count, modularity and groups, retune the resolution", [
    edge([(320, 50), (410, 50)]),
    edge([(560, 78), (560, 128)]),
    edge([(560, 192), (560, 243)]),
    edge([(560, 307), (560, 358)]),
    edge([(560, 422), (560, 460)]),
    edge([(450, 510), (320, 510)], "no", (380, 502)),
    edge([(180, 478), (180, 414)], "Run", (190, 450)),
    edge([(180, 366), (180, 160), (330, 160)]),
    edge([(670, 510), (820, 510)], "yes", (730, 502)),
    box("overlay", 180, 50, 280, 56, "Catalog or Quick actions: Louvain", f"Dr. Chen, on {PN} proteins", f"{S}#catalog"),
    box("commit", 560, 50, 300, 56, "Run Louvain", f"{L['weight']} (project answer), seed {L['seed']}; one undo step", f"{RP}#louvain"),
    box("check", 560, 160, 460, 64, "State line, read from the run record", f"&quot;Weight: {L['weight']}, used as {L['weightRead']}. Change...&quot;; resolution {L['resolution']}; seed {L['seed']}", f"{RP}#louvain"),
    box("check", 560, 275, 460, 64, f"{LC} communities and {LS} unconnected nodes", f"modularity {L['modularity']}, read in plain words beside it", f"{RP}#louvain"),
    box("place", 560, 390, 460, 64, "Top groups", "size; hub: the member with the most links inside the group; the file's module most members carry", f"{RP}#louvain-table"),
    box("ask", 560, 510, 220, 100, "Right resolution?"),
    box("overlay", 180, 510, 280, 64, "Parameters: resolution", "a held edit; its band on the Run line", f"{RP}#louvain"),
    box("commit", 180, 390, 240, 48, "Run Louvain", "a new run of the result; one undo step", f"{RP}#louvain"),
    box("place", 940, 510, 260, 56, "Rest, or Compare Community 1 with the rest", "", "../screens/comparison.html"),
], "dg-groups")

KEY = """<div class="f-key">
    <span><svg viewBox="0 0 28 16"><rect x="1" y="2" width="26" height="12" rx="2" class="f-place"/></svg>a place in the app</span>
    <span><svg viewBox="0 0 28 16"><rect x="1" y="2" width="26" height="12" rx="6" class="f-place"/></svg>an overlay: Quick actions, an editor</span>
    <span><svg viewBox="0 0 28 16"><polygon points="14,0 28,8 14,16 0,8" class="f-ask"/></svg>a decision or an ending</span>
    <span><svg viewBox="0 0 28 16"><polygon points="5,2 27,2 23,14 1,14" class="f-commit"/></svg>a committed change: one undo step</span>
    <span><svg viewBox="0 0 28 16"><polygon points="5,1 23,1 27,8 23,15 5,15 1,8" class="f-check"/></svg>a trust check: seen before believing a number</span>
    <span><svg viewBox="0 0 28 16"><rect x="1" y="2" width="26" height="12" rx="2" class="f-place f-gap"/></svg>dashed: waits on graphty-element or on an open decision</span>
  </div>"""

# ---------- the screens ----------
SHOTS = [
    ("Main path: 300 proteins, runs at once", [
        ("catalog", "1. Choose from the Catalog. Hover shows the description; Closeness names its variant, Eigenvector its precondition."),
        ("quick", "2. Or type it. Each row carries the same marks as the Catalog row."),
        ("done", "3. Finished: the row, the state line, the distribution and Top nodes; the run's layer listed, off."),
        ("rank", f"4. One node: TP53 chosen in Top nodes; #{TP53R} of {PN} on the inspector's metric row; the table sorted."),
    ]),
    (f"When exact is too costly: {CN} patents", [
        ("refused", "5. Refused by the cost gate: three routes, cheapest first; Run sampled is the one commit."),
        ("running", "6. Running: progress, band and Cancel on the row."),
        ("sampled", f"7. The estimate finished: ~ on every value, in the editor and the table ({K} sources, seed {SEED})."),
    ]),
    ("Other endings", [
        ("canceled", "8. Canceled: Not run again, focus on the row."),
        ("failed", "9. Failed: WebGPU lost; the run before kept; Re-run on CPU."),
        ("queued", "10. Run exactly: hours on the row; a second long run Queued; PageRank starts beside it."),
        ("elsewhere", "11. Keep working: the notice carries the run; the kept set the refusal offered."),
        ("unrun", "12. Arrives unrun: PageRank at a few minutes on the CPU, Run focused."),
    ]),
    ("The first weighted run, on the March transfers", [
        (f"{OFC}#weight-meaning", "14. The meaning question, asked in the run form the first time a run reads a weight column."),
        (f"{RP}#outofdate", "15. Results that used a changed answer: re-run in the same step, or marked Out of date when past the time limit."),
    ]),
    (f"Communities, on {PN} proteins", [
        (f"{RP}#louvain", f"16. A finished Louvain run: the count, modularity and seed."),
        (f"{RP}#louvain-table", "17. Its groups in the table: size, hub and the file's module most members carry."),
    ]),
    ("Side branch, from rest", [
        ("layout", "13. Make the layout readable: the Layout row and its editor."),
    ]),
]


def shots():
    out = ""
    for group, items in SHOTS:
        out += f"<h3>{group}</h3><div class=\"k-board\">"
        for sid, cap in items:
            href = sid if "/" in sid else f"{S}#{sid}"
            out += (
                f'<figure class="k-frame"><a href="{href}" class="f-shot-link"><div class="k-frame-shot" style="--k-scale:0.2361">'
                f'<iframe class="k-frame-live" src="{href}" title="{cap}" loading="lazy" tabindex="-1"></iframe></div></a><figcaption>{cap}</figcaption></figure>'
            )
        out += "</div>"
    return out


MISS = '<span class="f-miss">missing</span>'
STEPS = [
    ("choose", "Results, Catalog; or Quick actions", "a Catalog row; Enter on a Quick actions row",
     "Hover and keyboard focus show the description and, past 10 s, the band word. One click adds the result and runs it, focused in In this project. A result that already exists and is current is opened, not re-run.",
     "&quot;Run Betweenness&quot;", "the band before running", "Element, surfaced by the app",
     f"<code>session.runs.start</code>; the band from <code>session.estimate</code>. Search by question word (&quot;brokers&quot;) {MISS}: catalog aliases"),
    ("precondition", "the Catalog row; the Quick actions row", "--",
     f"A variant is a dotted word (Closeness: WF-corrected, which offers Harmonic centrality). A violated precondition is the warning mark and its phrase (Eigenvector: {COMP} components, which offers PageRank).",
     "none", "the precondition, before the run", "Element, surfaced", f"{MISS}: declared preconditions on catalog entries"),
    ("refused", "the result editor, beside its row", "Run sampled, Run on set or Run exactly: the header's one commit",
     f"Past the cost gate's cap the result is created and refused. Its editor shows the cause and three routes, cheapest first, grouped by verdict, focus on the first; no option rows. Run sampled creates the sibling result and runs it at once.",
     "&quot;Run Betweenness (sampled)&quot;", "exact or estimated, chosen by name", "Element, surfaced",
     f"the gate's verdict with the estimate exists; the sampled method {MISS} (betweenness declares none, and no seed is recorded)"),
    ("arrives unrun", "the result row; its editor", "Run",
     "An entry that needs an argument, has no cost model, or takes a few minutes or more is created Not run with Run focused and its band. An option edit applies at once and runs nothing until Run.",
     "&quot;Run PageRank&quot;", "the band before Run", "Element, surfaced", "<code>session.estimate</code> returns seconds only: the response class is a defect"),
    ("running", "the result row; the notice while Results is closed", "Cancel",
     "Progress, band and engine on the row, with Cancel the whole time. The notice carries the earliest run only while the Results panel is closed. Nothing is blocked; the old values stay.",
     "Cancel leaves no step; the undo chord on &quot;Run ...&quot; cancels and removes the result", "the band during the run", "Element, surfaced", "run state and progress from <code>session.runs</code>"),
    ("queued", "the result row", "Cancel",
     "A second run of hours waits Queued with its place in line. A run under a minute never waits behind one of hours: it starts beside it.",
     "none until it runs", "its place in line", "Element (the queue), surfaced", "the run queue (<code>element-contract.md</code> 3)"),
    ("canceled", "the result row", "Run",
     "Cancel of the only run leaves the result Not run. Focus stays on the row, which now offers Run with its band. Run from here is a new commit and passes the cost checks again.",
     "none for Cancel; Run adds &quot;Run Betweenness (sampled)&quot;", "--", "App (focus) over Element (state)", "exists"),
    ("failed", "the result row; Needs action", "Re-run on CPU",
     "Failed, with the element's sentence and code; the run before is kept and marked. A GPU failure names the path Re-run will take. Never finished quietly on the CPU.",
     "&quot;Re-run Betweenness (sampled)&quot;", "the cause; which values show", "Element, surfaced", "the error's class and verb as data; the GPU policy"),
    ("state line", "the result row's second line; the editor's first line", "Change... (the weight)",
     "Read from the run record, never composed by the app: the weight (&quot;Weight: amount, used as capacity. Change...&quot;, &quot;Weight: none for this run&quot;), the scope with counts, exact or estimated, edge reading and engine; the variant word in the name. When some edges have no value in the weight column, a second sentence counts them: &quot;{N} of {M} transfers have no amount. They are left out of weighted paths.&quot;",
     "none", "which weight, read which way, over which scope", "Element, surfaced", f"the weight the run read and its meaning, in the run record {MISS}; the count of edges with no value {MISS}"),
    ("read", "the result editor; the Nodes table", "--",
     f"Top nodes first, then how sure, then the distribution (middle, highest and zeros). How sure covers the rows shown and states its line: &quot;{SURE}&quot; The table says the same for the rows it shows. &quot;N more&quot; opens the table sorted by this column. An estimate carries ~ at every value, and its ranks carry their range.",
     "none", "near-ties at a stated line; whether two measures agree on the top", "Element, surfaced", f"<code>session.results</code>; a ranking read with near-ties at a stated line, and agreement between two results {MISS}"),
    ("rank", "the node's inspector; the table", "a Top node, or a bar",
     f"Selects it on the canvas, in the table and the inspector; the left panel and the editor stay. The metric row carries &quot;#{TP53R} of {PN}, on: full graph&quot; as its second line.",
     "none", "the denominator and scope", "Element, surfaced", f"the metric result's <code>rank</code> exists; a ranking read for ties {MISS}"),
    ("retune", "the result editor's Parameters", "an option; Run",
     "The edit is held; the Run line shows its band. Run passes the cost gate again: past the cap the field is marked and Run is disabled with the reason.",
     "&quot;Run Betweenness (sampled)&quot;, the held edit included", "the held edit's band on the Run line", "Element, surfaced",
     f"<code>session.runs.start</code> with params; the seed a run used {MISS}"),
    ("paint", "the canvas; the legend", "--",
     "Whether a finished run's layer paints on its own is the owner's open decision. Every screen here shows the layer listed and turned off.",
     "part of the run's entry", "the legend names the layer", "Element", "door 26, Whether a finished run paints"),
]
WEIGHT_STEPS = [
    ("first weighted run", "the run form", "an answer; Run",
     f"Weight by lists the numeric edge columns. When the chosen column has no project answer yet, the meaning question opens in the form, nothing preselected, focus on the first answer, Run off until one is chosen. Each answer carries one line on what it does to this measure (PageRank, below). Reliability is unavailable for amount, with its reason: it needs values from 0 to 1, and amount runs to {AMAX}.",
     "the answer is part of &quot;Run PageRank&quot;", "what the answer does, said before the run", "Element, surfaced", f"a weight meaning on the column, with reliability {MISS} (door 21)"),
    ("this run only", "the run form's Weight by", "None for this run",
     "&quot;amount (project answer)&quot; is the default; &quot;None for this run&quot; runs unweighted and leaves the project answer alone. The state line then reads &quot;Weight: none for this run&quot;.",
     "&quot;Run PageRank&quot;", "the state line says none", "Element, surfaced", "<code>session.runs.start</code> with a weight of none exists"),
    ("change the answer", "Change... on any state line that names amount", "an answer",
     "Opens the same question for amount, with the current answer marked and the results that use it named. Choosing another answer is one step: every result that used it re-runs if it fits the time limit, and the rest go Out of date with Run. The notice reads &quot;Weight: amount no longer used as capacity. 3 results re-run.&quot; Focus returns to the Change... it came from.",
     "&quot;Weight: amount no longer used as capacity&quot;; undo restores the answer and the runs before", "the new line on every result that used it", "Element, surfaced", f"re-running the results that read a column's meaning, as one step {MISS}"),
]
MEANINGS = [
    ("a longer or costlier step", "distance", "PageRank reads 1 / amount: small transfers pass more rank than large ones."),
    ("a closer or stronger link", "similarity", "PageRank passes more rank along larger transfers."),
    ("more can pass through", "capacity", "PageRank passes rank in proportion to the amount sent: the same arithmetic as a stronger link. Max flow reads it as a limit."),
    ("how likely it is real", "reliability", f"Each transfer counts in proportion to how likely it is real. Unavailable for amount: it needs values from 0 to 1, and amount runs to {AMAX}."),
]
GROUP_STEPS = [
    ("run", "the Catalog or Quick actions", "Louvain",
     f"Runs at once on {PN} proteins with the project answer for {L['weight']} and a recorded seed.",
     "&quot;Run Louvain&quot;", "the weight and seed on the state line", "Element, surfaced", f"exists; the seed a run used {MISS}"),
    ("count", "the result editor's first reading", "--",
     f"&quot;{LC} communities and {LS} unconnected nodes&quot;: a node with no link is not counted as a community of its own.",
     "none", "the headline counts only real groups", "Element, surfaced", f"the unconnected count beside the community count {MISS}"),
    ("modularity", "beside the count", "--",
     f"modularity {L['modularity']}, then in words: &quot;Far more links fall inside these communities than chance would put there; 0 would mean no more than chance.&quot; The file's own modules score {L['modularityOfFileModules']} on the same scale, named as that.",
     "none", "a number read in words", "Element, surfaced", "the value exists; its reading as a published message is proposed"),
    ("groups", "Top groups; the table's tab for this result", "a group",
     "Size, edges inside and out, the hub, and the file's module most members carry. The hub is the member with the most links inside the group, never an outsider with many links elsewhere.",
     "none", "the hub is the group's own", "Element, surfaced", f"a group's hub by degree inside the group {MISS}"),
    ("retune", "the result editor's Parameters", "resolution; Run",
     "The edit is held; the Run line shows its band. Run is a new run of the same result.",
     "&quot;Run Louvain&quot;", "the held edit's band", "Element, surfaced", "<code>session.runs.start</code> with params"),
]
LAYOUT_STEPS = [
    ("run as is", "the graph's Layout row", "Run layout", "From rest or with a set selected. The row names method, scope, start, seed and pinned count.",
     "&quot;Run layout&quot;", "the row's line", "Element, surfaced", f"<code>setLayout</code>; the layout scope {MISS}"),
    ("start", "the layout editor", "Current or Fresh", "Starts from the current positions unless Fresh is chosen, so the learned picture is kept.",
     "part of the run's entry", "the row says which", "Element, surfaced", f"run from the current positions {MISS}"),
    ("pins", "the Layout row's pinned count", "Unpin all", "Pinned nodes hold their places; Unpin all clears them.",
     "&quot;Unpin all&quot;", "the count", "Element, surfaced", f"set a node's position and pin it {MISS}"),
]


def table(rows):
    head = "<tr><th>Step</th><th>Where</th><th>Command</th><th>Behavior</th><th>Undo</th><th>Trust check</th><th>Built by</th><th>graphty-element</th></tr>"
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="f-steps"><thead>{head}</thead><tbody>{body}</tbody></table>'


def meanings():
    rows = "".join(f"<tr><td>{w}</td><td>{t}</td><td>{d}</td></tr>" for w, t, d in MEANINGS)
    return f'<table class="f-steps f-meanings"><thead><tr><th>Answer</th><th>Term</th><th>What it does to PageRank</th></tr></thead><tbody>{rows}</tbody></table>'


HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Run a measure and read it</title>
<!-- Written by flows/run-and-read.py. Edit the script and run it. -->
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  .f-diagram {{ display: block; width: 100%; max-width: 1100px; height: auto; margin: 8px 0 4px; font-family: inherit; }}
  .f-place, .f-commit, .f-check, .f-ask {{ fill: var(--cm-bg); stroke: var(--cm-text-secondary); stroke-width: 1.25; }}
  .f-commit {{ fill: var(--cm-bg-secondary); }}
  .f-check {{ fill: var(--cm-bg-selected); stroke: var(--cm-border-selected-strong); stroke-width: 1.5; }}
  .f-gap {{ stroke-dasharray: 5 4; }}
  .f-diagram a:hover .f-place, .f-diagram a:hover .f-commit, .f-diagram a:hover .f-check, .f-diagram a:hover .f-ask {{ stroke: var(--k-annot); stroke-width: 2; }}
  .f-diagram a:focus-visible {{ outline: 2px solid var(--k-annot); }}
  .f-t {{ height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 12px; line-height: 15px; color: var(--cm-text); }}
  .f-t b {{ font-weight: 600; }}
  .f-u {{ display: block; margin-top: 2px; font-size: 11px; line-height: 13px; color: var(--cm-text-secondary); }}
  .f-edge {{ fill: none; stroke: var(--cm-text-secondary); stroke-width: 1.25; }}
  .f-ah {{ fill: var(--cm-text-secondary); }}
  .f-lbl-t {{ font-size: 11px; fill: var(--cm-text-secondary); font-style: italic; paint-order: stroke; stroke: var(--cm-bg); stroke-width: 4px; stroke-linejoin: round; }}
  .f-key {{ display: flex; flex-wrap: wrap; gap: 6px 20px; color: var(--cm-text-secondary); font-size: 12px; }}
  .f-key span {{ display: inline-flex; align-items: center; gap: 6px; }}
  .f-key svg {{ width: 28px; height: 16px; overflow: visible; }}
  .f-facts {{ display: grid; grid-template-columns: 160px 1fr; gap: 6px 16px; margin: 8px 0 16px; max-width: 900px; }}
  .f-facts dt {{ color: var(--cm-text-secondary); }}
  .f-facts dd {{ margin: 0; }}
  .f-steps {{ width: 100%; font-size: 12px; line-height: 17px; }}
  .f-steps th {{ font-weight: 600; white-space: nowrap; }}
  .f-miss {{ color: var(--k-annot-ink); font-weight: 600; }}
  .f-shot-link {{ display: block; }}
  .k-board {{ grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }}
  .f-lbl-link {{ fill: var(--cm-text-brand); stroke: none; text-decoration: underline; }}
  .f-meanings {{ max-width: 900px; }}
</style>
</head>
<body>
<div class="k-doc">
  <p><a href="../index.html">Gallery</a></p>
  <h1>Run a measure and read it</h1>
  <p class="k-lede">An analyst picks a measure, sees what it will cost before it runs, waits or cancels, and then reads the answer: the top nodes and how sure they are, the whole distribution, and where one node ranks. Shown on two real sizes: <span data-fx="datasets.ppi.nodes">{PN}</span> human proteins, where betweenness finishes at once, and {CN} patents, where the exact run would take hours and the analyst chooses an estimate by name. Two branches follow: the first run that reads a weight column, on {TXN} bank accounts, and communities on the proteins. Making the picture readable is a side branch that starts from rest.</p>

  <dl class="f-facts">
    <dt>Who</dt><dd><a href="../study/personas/bioinformatics-researcher.md">Dr. Chen</a>, a computational biologist ranking bottleneck proteins in {PN} human proteins and grouping them into communities; <a href="../study/personas/expert-emma.md">Emma</a>, a network scientist, on a {CN}-patent citation network too large to draw; <a href="../study/personas/fraud-analyst.md">Sarah</a>, a fraud investigator, weighting March's {TXE} transfers by amount.</dd>
    <dt>Starts</dt><dd>At rest: the graph's inspector, nothing selected.</dd>
    <dt>Scale</dt><dd>The same route at every size; only the cost checks' answers change. Under 10 s nothing shows before the run. Past 10 s a band word shows: a rough duration such as &quot;under a minute&quot; or &quot;hours&quot;. Past the cost gate's cap ({CAP} s by default, a default the owner has not settled) the result arrives refused, with its routes.</dd>
    <dt>Claim at the end</dt><dd>&quot;These are the top nodes by betweenness, on this scope, with this weight read this way, with these options, computed exactly (or estimated from {K} sources, seed {SEED}), and this is how close the nearest ranks are.&quot;</dd>
    <dt>Record</dt><dd>One undo step per run (&quot;Run Betweenness&quot;, &quot;Run Betweenness (sampled)&quot;), and the run's record with every resolved option, the scope with its counts, the seed and the engine. Cancel leaves no undo step.</dd>
    <dt>Figma's nearest route</dt><dd>A Tools-panel row runs a plugin on click, with one toast and Cancel: 1 step. graphty's route is 1 step too for a cheap run. Past the cap the one extra step is a trust check: exact or estimated must be chosen by name, never swapped in.</dd>
    <dt>Covers</dt><dd>The framework's flow &quot;Run a measure and read it&quot;: ranking by centrality and finding communities, which share one run mechanism, and its layout sub-flow as a side branch.</dd>
  </dl>

  <p><a href="{S}">Open the screen mock</a> (thirteen states, light and dark; each state's Notes button shows which framework section and which compact-mantine component is behind each element, and what a screen reader hears). The refused editor and the sample-size field in detail: <a href="{OFC}">Measure options with cost</a>.</p>

  <h2>The flow</h2>
  <p>Every box links to the screen that shows it.</p>
  {KEY}
  {MAIN}

  <h2 id="weighted">Branch: the first weighted run, and changing the answer</h2>
  <p>Sarah runs PageRank on the March transfers and chooses amount in Weight by. A weight column has no meaning until someone says what a bigger number means, and that answer belongs to the project, not to one run: it is asked the first time a run reads the column, and every later run and every Path reads the same answer. The run form's Weight by keeps &quot;None for this run&quot; for a single unweighted run. Every one of the <span data-fx="datasets.transactions.edges">{TXE}</span> March transfers has an amount, so the line counting transfers with no amount does not show here.</p>
  {WEIGHT}
  <h3>The four answers, and what each does to PageRank</h3>
  <p>The question reads &quot;For amount, a higher number means...&quot;. Each answer shows the column's words first, the technical term second, and one line on what it does to the measure being run. The lines are written per measure; these are PageRank's.</p>
  {meanings()}

  <h2 id="groups">Branch: communities</h2>
  <p>Dr. Chen runs Louvain on the proteins. The result states how many real groups it found, what its modularity means in words, and each group's hub counted inside the group. Whether the groups hold up across several seeds is not drawn: it needs a stability run that graphty-element does not have yet, and it is proposed there.</p>
  {GROUPS}

  <h2>Side branch: make the layout readable</h2>
  <p>Laying out is its own task, entered from rest or with a set selected at any point -- not a step after reading a rank. Past the drawing limit nothing is drawn, so it applies to the patents only once a filter step brings them under it.</p>
  {SIDE}

  <h2>The screens</h2>
  {shots()}

  <h2>Step by step</h2>
  {table(STEPS)}
  <h3>The first weighted run</h3>
  {table(WEIGHT_STEPS)}
  <h3>Communities</h3>
  {table(GROUP_STEPS)}
  <h3>The layout side branch</h3>
  {table(LAYOUT_STEPS)}

  <h2>Counts, focus and the keyboard</h2>
  <ul>
    <li><b>Steps from rest.</b> A cheap run: 1 step, 2 travel (open Results, find the row, click it), or 1 step by Quick actions. Refused by the gate: 2 steps (the row, then Enter on the focused route, Run sampled). Arrives unrun: 2 steps (the row, then Run). Reading a node's rank: 1 more. A retune: 2 (the edit, then Run). The first weighted run: 1 more (an answer, then the same Run). Changing the answer: 2 (Change..., then an answer), from any result that names the column. Re-laying out: 1 step from the Layout row.</li>
    <li><b>Where focus goes.</b> A Catalog click moves focus to the new result's row; its editor opens beside it when it was refused or arrived unrun, focus on the first route or on Run. Cancel on the row: focus stays on the row, now showing Run. Cancel in the running notice (Results closed): focus goes back to the control that held it before the notice took it. A finished run moves nothing. Choosing a Top node moves the selection, never the left panel. The meaning question in the run form takes focus on its first answer, with nothing chosen; Change... opens it with focus on the current answer, and after the change focus returns to the Change... it came from.</li>
    <li><b>Keyboard.</b> Everything is in Quick actions. Catalog rows are arrow-stepped and Enter runs; the refused editor's routes are one list (arrows choose, Enter commits the chosen route); Top nodes and histogram bars are stepped with arrows and Enter selects. The meaning question is one radio group: arrows choose, and the unavailable answer is skipped by the arrows but still read with its reason.</li>
    <li><b>Announcements.</b> Finished and canceled are polite; progress is spoken when a run starts and then at most every 10 s, never per percent; a failure is assertive, once. A changed answer announces its notice politely: &quot;Weight: amount no longer used as capacity. 3 results re-run.&quot;</li>
    <li><b>First failure, weighted.</b> Reading a result as weighted when it was not, or the other way round. Guarded by the state line, read from the run record on every result, and by one project answer that every run and path reads.</li>
    <li><b>First failure.</b> Reading a sampled number as exact. Guarded by the variant word in the name everywhere the number appears, and by &quot;~&quot; at every estimated value: middle, highest, the axis, Top nodes and the table column (screen 7).</li>
    <li><b>Where an analyst may stall.</b> Picking a measure by question rather than by name; telling a row that ran from one that arrived Not run; after Cancel, knowing nothing changed; after a retune, which run the numbers are from (screen 9); which of the four answers fits money or a confidence score.</li>
  </ul>

  <h2 id="decisions">Decisions made here</h2>
  <ul>
    <li><b>The editor's state line always names the weight and the scope</b>, read from the run record, even on the full graph with no filter and even when no weight was used (&quot;Weight: none for this run&quot;); a list row names them only when they differ from the graph's. Proposed in <a href="../framework-changes.md">framework-changes.md</a>.</li>
    <li><b>Changing a column's meaning is one undoable step that re-runs what used it</b>: results within the time limit re-run inside the step, the rest go Out of date with Run, and the notice counts both. Proposed in framework-changes.md.</li>
    <li><b>Each answer to the meaning question carries one line for the measure being run</b>, and an answer the column's values cannot support is shown unavailable with its reason (reliability needs values from 0 to 1). Proposed in framework-changes.md.</li>
    <li><b>How sure covers the rows shown</b>, states its near-tie line (less than 1% apart, relative to the higher value) and whether another finished measure puts the same nodes on top; when nothing is that close it names the closest pair instead. The line itself is proposed to graphty-element as a published default. Proposed in framework-changes.md.</li>
    <li><b>Communities count real groups</b> (&quot;{LC} communities and {LS} unconnected nodes&quot;), read modularity in words, and name each group's hub by its links inside the group. Stability across seeds is proposed to graphty-element and not drawn. Proposed in framework-changes.md.</li>
    <li><b>The refusal</b> follows the proposal &quot;The over-budget refusal: order, focus and one commit&quot;: routes cheapest first, grouped by the gate's verdict, focus on the first, one commit in the header; Run sampled runs at once. screens/option-form-cost.html draws the same editor.</li>
    <li><b>A result row's trailing slot holds a state or a command, never a count.</b> A bare &quot;{PN}&quot; beside a measure's name reads as a score.</li>
    <li><b>The running notice shows only while the Results panel is closed</b>, as figma-crosswalk.md already says, so two Cancels are never on screen together.</li>
    <li><b>Quick actions rows carry the Catalog row's marks</b> (band word, variant word, precondition mark). Proposed in framework-changes.md.</li>
    <li><b>An iterative measure is outside the cost gate</b>: at &quot;a few minutes&quot; it arrives unrun rather than refused. Proposed in framework-changes.md.</li>
    <li><b>Every new run passes the cost checks again</b>: Run after Cancel, Re-run after a failure and Run after a retune. Proposed in framework-changes.md.</li>
    <li><b>Whether a finished run paints the canvas on its own</b> is still the owner's open decision (one-way door 26, recommended option: paint, but say so when an authored layer suppresses it). Every screen shows the run's layer listed and turned off, and the canvas as the Module color layer painted it.</li>
  </ul>
</div>
</body>
</html>
"""
assert all(ord(ch) < 128 for ch in HTML), "non-ASCII in output"
open(os.path.join(P, "flows/run-and-read.html"), "w").write(HTML)
print("ok")
