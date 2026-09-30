# State definitions for screens/alert-triage.html. Executed by build.py; every number comes from
# kit/alerts.json (A: the August transfers, BANK: the whole bank's August).
PROJECT = "August alerts"
FULL = A["anchors"]["full"]
ROWS = {}
for group in (A["alerts"], A["seed"]["hop1"]["nodes"], A["ring"]["members"], A["tuitionCase"]["hop1"]["nodes"], A["seed"]["hop2"]["bandEnds"], A["universities"], [A["cashout"], A["nextCase"], A["distractor"]]):
    for r in group: ROWS.setdefault(r["id"], r)
TUI, SEED, NEXT, DIS, CASH = A["tuitionCase"], A["seed"], A["nextCase"], A["distractor"], A["cashout"]
H1 = SEED["hop1"]
H1_ALERTED = [r for r in H1["nodes"] if r["alert"]]
H1_PLAIN = [r for r in H1["nodes"] if not r["alert"]]
HOPS = SEED["hops"]["both"]
C0, C1 = SEED["secondHopContributors"][0], SEED["secondHopContributors"][1]
RS = A["ringSet"]
RING = RS["name"]
REF = "Referred " + SEED["alertId"]
STEP_T = f'{TUI["id"]} and neighbors'
STEP_S = f'{SEED["id"]} and neighbors'
STEP_S2 = f'{SEED["id"]} and neighbors, 2 hops'
BAND = "Transfers of 9,000 to 9,999 USD"
NBAND = len(SEED["hop2"]["bandTransfers"])
NBE = len(SEED["hop2"]["bandEnds"])

# ---------- shared pieces ----------
ALERT_HEAD = [("alertId", 0), ("id", 0), ("kind", 0), ("alertScenario", 0), ("riskScore", 1), ("Links (count)", 1)]
def alert_rows(sel=None, first=1, count=9):
    out = []
    for r in A["alerts"][first:first + count]:
        a = ' aria-selected="true"' if r["id"] == sel else " data-member"
        out.append((a, [(r["alertId"], "k-id"), (r["id"], "k-id"), (r["kind"], ""), (f'<span class="at-cell">{r["alertScenario"]}</span>', ""), (str(r["riskScore"]), "k-n"), (str(r["degree"]), "k-n")]))
    return out
NODE_HEAD = [("id", 0), ("kind", 0), ("category", 0), ("alert", 0), ("riskScore", 1), ("Links (count)", 1), ("Money in (USD)", 1), ("Money out (USD)", 1)]
def node_rows(rows, sel=(), member=()):
    out = []
    for r in rows:
        a = ' aria-selected="true"' if r["id"] in sel else (" data-member" if r["id"] in member else "")
        al = (DIA + "true") if r["alert"] else "false"
        out.append((a, [(r["id"], "k-id"), (r["kind"], ""), (r["category"] or '<span class="k-tertiary">--</span>', ""), (al, ""), (str(r["riskScore"]), "k-n"), (str(r["degree"]), "k-n"),
                         (usd(MONEY[r["id"]]["moneyIn"]), "k-n"), (usd(MONEY[r["id"]]["moneyOut"]), "k-n")]))
    return out
EDGE_HEAD = [("source", 0), ("target", 0), ("time (UTC)", 0), ("amount (USD)", 1)]
def edge_rows(edges, sel=None):
    return [(' aria-selected="true"' if sel and (e["source"], e["target"]) == sel else "", [(e["source"], "k-id"), (e["target"], "k-id"), (when(e["time"]), "k-num"), (usd(e["amount"]), "k-n")]) for e in edges]
def own(r, edges):  # the account's own transfers, in time order
    return sorted((e for e in edges if r["id"] in (e["source"], e["target"])), key=lambda e: e["time"])

ALERTS_ROW = lambda sel=False, count=50: item(ic("group"), "Alerts", "rule", f'<span class="k-num">{n(count)}</span>', ' aria-selected="true"' if sel else "")
def left(chip_html, sets=None, find=None, file_open=False, views=0, view_rows="", project=PROJECT, graph_count="3,000 nodes", file=A["file"], styles=50):
    body = find if find is not None else (graphs_section("Transfers", graph_count) + sets_section(sets or [ALERTS_ROW()]) + views_section(views, view_rows))
    return panel(project, chip_html, body, file=file, file_open=file_open)

def find_panel(query, hits):
    h = (f'<div class="k-search">{ic("search", "k-i k-i-sm")}<span class="k-field" data-focus><span class="k-id">{query}</span></span>'
         f'<span class="k-icon-btn">{ic("x")}</span></div>'
         f'<div class="k-row"><span class="k-field k-grow">This graph<svg class="k-i k-i-sm k-caret"><use href="../kit/icons.svg#chevron-down"/></svg></span><span class="k-icon-btn">{ic("ellipsis")}</span></div>'
         '<div class="k-group-head">Nodes</div>' + "".join(hits))
    return h
def hit(r, sub, sel=True):
    a = ' aria-selected="true"' if sel else ""
    return f'<div class="k-result at-hit"{a}>{ic("circle-dot")}<span class="k-id">{r["id"]}</span><span class="k-secondary k-grow">{sub}</span></div>'

def alerts_set_inspector(count=50, file_rows=True):
    members = "".join(data(f'<span class="k-id">{r["alertId"]}</span>', f'<span class="k-id">{r["id"]}</span>') for r in A["alerts"][:4])
    return (typerow("group", "Alerts", f"{count} &middot; Rule set", f'<span class="k-icon-btn">{ic("mouse-pointer-2")}</span><span class="k-icon-btn">{ic("funnel")}</span>'),
            section("Rule", arow('<span class="k-mono">alert is true</span>', ic("chevron-right", "k-i k-i-sm k-secondary")))
            + section("Created from", arow("Alert triage recipe, team shared drive"))
            + section("Members", '<div class="k-data" style="font-weight:550"><span class="k-name">50 nodes, by alertId</span></div>' + members + arow(f'<span class="k-secondary">{count - 4} more</span>'))
            + section("Used by", arow("Style layer Alerts")))

def hop_menu(label_node, rows, checked, commands, active, top=150, direction="Both", start="Any time", hover_opt=None):
    h = f'<div class="k-menu at-menu" style="top:{top}px" role="menu"><div class="k-menu-label">Hops from {label_node}</div>'
    for k, (hops, nodes, edges, desc) in enumerate(rows):
        c = "&#10003;" if hops == checked else ""
        d = f'<span class="k-menu-desc">{desc}</span>' if desc else ""
        hv = " data-hover" if active == ("hop", hops) else ""
        word = "hop" if hops == 1 else "hops"
        h += (f'<div class="k-menu-item" data-described{hv} role="menuitemradio" aria-checked="{"true" if c else "false"}"><span class="k-check-col" aria-hidden="true">{c}</span>'
              f'<span class="k-grow">{hops} {word} <span class="at-count k-num">&middot; {n(nodes)} nodes, {n(edges)} edges</span>{d}</span></div>')
    def opt(name, value):
        hv = " data-hover" if hover_opt == name else ""
        return f'<div class="k-menu-item"{hv} role="menuitem" aria-haspopup="menu"><span class="k-check-col"></span>{name}<span class="k-sub at-count">{value}</span>{ic("chevron-right", "k-i k-i-sm")}</div>'
    h += '<div class="k-menu-sep"></div>' + opt("Direction", direction) + opt("From", start) + '<div class="k-menu-sep"></div>'

    word = "hop" if checked == 1 else "hops"
    for cmd in commands:
        hv = " data-hover" if active == ("cmd", cmd) else ""
        sc = '<span class="k-shortcut">Shift+N</span>' if cmd == "Filter to neighbors" else ""
        h += f'<div class="k-menu-item"{hv} role="menuitem"><span class="k-check-col"></span>{cmd}, {checked} {word}{sc}</div>'
    return h + "</div>"
def big_hop(c0, c1): return f'Mostly through {c0["id"]} ({c0["category"]}, {n(c0["degree"])} neighbors) and {c1["id"]} ({c1["category"]}, {n(c1["degree"])}).'
SEED_ROWS = [(1, HOPS[0]["nodes"], HOPS[0]["edges"], ""), (2, HOPS[1]["nodes"], HOPS[1]["edges"], big_hop(C0, C1)), (3, HOPS[2]["nodes"], HOPS[2]["edges"], "")]

S = []
def add(sid, title, desc, html, zoom_of=None): S.append((sid, title, desc, html))

# ======================= Part 1: Nadia's queue (the triage) =======================
# 1. Open ---------------------------------------------------------------------------------
def s_open(zoom=False, points=False):
    drawing = "points" if points else "density"
    lg = legend(50) if points else legend(50, points=50)
    a = app(rail(), left(chip("Full graph"), [ALERTS_ROW(True)]),
            canvas(drawing, "3,000 accounts; the 50 alerted accounts drawn as orange diamonds" + ("" if points else " over the rest drawn as density"), legend=lg)
            + dock(["Nodes", "Edges"], "Nodes", "Rule set Alerts: 50 of 3,000 nodes. Sorted by alertId, the order the monitoring system raised them.", ALERT_HEAD, alert_rows(first=1, count=9)),
            right(*alerts_set_inspector()))
    notes = [note(330, 16, "The not-drawn line counts what is drawn as density: 2,950. The 50 alerted accounts are points: 2,950 + 50 = 3,000. interface-templates 13; state-matrix, Canvas, Partial. Drawn by graphty-element. The density form itself is an open question, tested against the all-points state below.", 300),
             note(60, 430, "Sets and paths: a Tree row, rule kind, count trailing. interface-templates 2. compact-mantine Tree.", 220),
             note(700, 560, "The table lists the queue: DataTable scoped to the selected rule set, sorted by alertId. interface-templates 16.", 260),
             note(60, 60, "Filter chip and file chip share one line under the project name. interface-templates 2 and 7. compact-mantine Pill triggers.", 220),
             note(1200, 470, "Set inspector: Rule, Created from, Members, Used by. interface-specification 4.1.", 220)]
    if points:
        notes = [note(330, 16, "Comparison: every account drawn as a point, the Alerts layer on top. No not-drawn line, because nothing is left out. canvas-drawing 6.", 280)]
    return state("open-points" if points else ("open-z" if zoom else "open"), a, notes, zoom)
add("open", "1. The project opens: density and the alert queue",
    "Wednesday 2 September, 10:14. Nadia reopens the project August alerts: the monitoring system's August transfers under the team's alert triage recipe. The 50 alerted accounts are drawn as orange diamonds; the other 2,950 are drawn as density. The rule set Alerts is selected, so the table lists the queue in the order it was raised. She has worked six; AL-40121 is next.",
    s_open())
add("open-points", "1b. The same opening, every account a point (under test)",
    "The comparison the study runs against state 1: all 3,000 accounts as points with the Alerts layer on top. Whether a graph this size should open as density at all is an open question, not a decision.",
    s_open(points=True))

# 2. Find the tuition alert -------------------------------------------------------------------
ins_t = node_inspector(TUI)
find_t = find_panel(TUI["id"], [hit(TUI, f'{TUI["kind"]}, {TUI["country"]}; in Alerts')])
a = app(rail(), left(chip("Full graph"), find=find_t),
        canvas("density", f'3,000 accounts as density, {TUI["id"]} selected', sel_at(FULL[TUI["id"]], TUI["id"]), legend(50, points=50))
        + dock(["Nodes", "Edges"], "Nodes", "Rule set Alerts: 50 of 3,000 nodes. Sorted by alertId.", ALERT_HEAD, alert_rows(sel=TUI["id"], first=2, count=9)),
        right(*ins_t))
add("tuition-find", "2. Alert AL-40121: find the account",
    f'Nadia pastes {TUI["id"]} from the case system into Find. The hit is selected: the ring marks its diamond over the density, its row is selected in the table, and the inspector shows why it fired: one transfer of 9,000 to 9,999 USD. It has 5 counterparties.',
    state("tuition-find", a, [
        note(60, 170, "Find replaces the lists while open: SearchInput, scope select, ResultRow hits; a hit names the kept sets that hold it, on a second line that wraps. interface-templates 2a; information-architecture 7.", 230),
        note(1200, 520, "Appearance is a style row: the Alerts layer's mark and name, opening that layer's editor. No color field on one node. interface-specification 3.1.", 220),
        note(1200, 330, "Connections: one ActionRow, split In and Out; neighbors and edges are the same count here, so one row. interface-specification 3.", 220)]))

# 3. One hop around the tuition account ----------------------------------------------------------
UNI = ROWS["ACC-562115"]
ins_u = node_inspector(UNI, members="0 sets")
a = app(rail(), left(chip(f'Filtered: {TUI["hop1"]["nodes"].__len__()} of 3,000 nodes'), [ALERTS_ROW()]),
        canvas("tuition-hop1", f'{TUI["id"]} and its 5 counterparties', sel_at(A["anchors"]["tuitionHop1"][UNI["id"]]), legend(1))
        + dock(["Nodes", "Edges"], "Edges", f'Filtered graph: {len(TUI["hop1"]["edges"])} of {n(A["edges"])} edges. Sorted by amount, largest first.', EDGE_HEAD, edge_rows(TUI["hop1"]["edges"], (TUI["id"], UNI["id"]))),
        right(*ins_u))
add("tuition-hop1", "3. One hop: the transfer goes to a university",
    f'Filter to neighbors, 1 hop, keeps {TUI["id"]} and its 5 counterparties. The chip reads Filtered: 6 of 3,000 nodes. The Edges tab lists 5 transfers: {usd(TUI["hop1"]["edges"][0]["amount"])} USD to {UNI["id"]}, and a salary of {usd(TUI["hop1"]["edges"][1]["amount"])} USD in from {TUI["hop1"]["edges"][1]["source"]}. Selecting {UNI["id"]} shows it is a merchant in the category Education.',
    state("tuition-hop1", a, [
        note(60, 60, "Filter chip: 'Filtered: {kept} of {total} {kind}'. interface-templates 7; message-catalog.", 220),
        note(500, 560, "No notice: selecting ACC-562115 moved to another node, which clears the undo line. Edit &gt; Undo still names the step. task-flows 6.", 250)]))

# 4. Clear it: note and evidence file --------------------------------------------------------------
NOTE_T = (f'Cleared. {usd(TUI["hop1"]["edges"][0]["amount"])} USD to {UNI["id"]}, a university (Education). '
          f'Salary in from {TUI["hop1"]["edges"][1]["source"]} (IT services). No other transfer over 200 USD. Tuition; fits the profile.')
def exp_sec(title, rows, checked=True):
    c = ' aria-checked="true"' if checked else ""
    return f'<section class="k-section"><div class="k-section-head"><span class="k-check"{c}></span>&nbsp;{title}</div>{rows}</section>'
def export_modal(scope, scope_alt, people, holds, figure, files, nfiles, view_img=None):
    fig = ""
    if view_img:
        fig = (f'<div style="display:flex;gap:12px;padding:4px 16px 8px"><img class="k-light-only at-gray" src="../kit/canvas/alerts-{view_img}-light.svg" alt="" style="width:150px;border-radius:4px;box-shadow:0 0 0 1px var(--cm-border)">'
               f'<img class="k-dark-only at-gray" src="../kit/canvas/alerts-{view_img}-light.svg" alt="" style="width:150px;border-radius:4px">'
               '<div class="k-prose" style="padding:0">Gray check: alerted accounts stay apart in gray, as diamonds among circles.</div></div>')
    return ('<div class="k-backdrop"><div class="k-modal k-modal-wide"><div class="k-modal-head">Export<span class="k-grow"></span><span class="k-icon-btn">' + ic("x") + '</span></div><div class="k-modal-body">'
            + exp_sec("Findings report (.html)",
                      f'<div class="k-fieldrow"><span class="k-legend">Scope</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-field">{scope}<svg class="k-i k-i-sm k-caret"><use href="../kit/icons.svg#chevron-down"/></svg></span></div></div>'
                      + (f'<div class="k-prose">{scope_alt}</div>' if scope_alt else "")
                      + data("names", people) + data("holds", holds, "at-wrap") + data("file", f'<span class="k-id">{files[0]}</span>'))
            + exp_sec("Figure (.svg)", figure + fig)
            + exp_sec("Table (.csv): Nodes and Edges, the same scope", data("files", f'<span class="k-id">{files[1]}</span>'))
            + f'</div><div class="k-modal-foot"><span class="k-secondary k-grow">{ic("lock", "k-i k-i-sm")} {nfiles} files go to the download folder. Nothing is uploaded.</span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Export {nfiles} files</span></div></div></div>')
def evidence_modal(r, edges, accounts, holds, others, sel_word="The selection's edges"):
    c = {k: sum(1 for x in accounts if x["kind"] == k) for k in ("personal", "business", "merchant")}
    words = {"personal": ("person", "people"), "business": ("business", "businesses"), "merchant": ("merchant", "merchants")}
    kinds = ", ".join(f'{v} {words[k][v != 1]}' for k, v in c.items() if v)
    aid = r["alertId"]
    rows = "".join(f'<tr><td class="k-id">{e["source"]}</td><td class="k-id">{e["target"]}</td><td class="k-num">{when(e["time"])}</td><td class="k-n">{usd(e["amount"])}</td></tr>' for e in edges)
    tbl = ('<div class="k-table-wrap" style="margin:0 16px 8px;border:1px solid var(--cm-border);border-radius:4px"><table class="k-table"><thead><tr><th>source</th><th>target</th><th>time (UTC)</th><th class="k-n">amount (USD)</th></tr></thead>'
           f'<tbody>{rows}</tbody></table></div>')
    return ('<div class="k-backdrop"><div class="k-modal k-modal-wide"><div class="k-modal-head">Export<span class="k-grow"></span><span class="k-icon-btn">' + ic("x") + '</span></div><div class="k-modal-body">'
            + exp_sec("Findings report (.html)",
                      f'<div class="k-fieldrow"><span class="k-legend">Scope</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-field">{sel_word}: {r["id"]}, {len(edges)} transfers<svg class="k-i k-i-sm k-caret"><use href="../kit/icons.svg#chevron-down"/></svg></span></div></div>'
                      + prose(f"Other scopes: {others}.") + tbl
                      + data("names", f'{len(accounts)} accounts: {kinds}') + data("holds", holds, "at-wrap") + data("file", f'<span class="k-id">evidence-{aid}.html</span>')
                      + prose("One self-contained HTML file: figures embedded, notes and tables as text. It opens offline in any browser and prints to PDF."))
            + exp_sec("Table (.csv)", data("columns", "source, target, time (UTC), amount (USD)") + data("rows", str(len(edges))) + data("file", f'<span class="k-id">{aid}-transfers.csv</span>'))
            + f'</div><div class="k-modal-foot"><span class="k-secondary k-grow">{ic("lock", "k-i k-i-sm")} 2 files go to the download folder. Nothing is uploaded.</span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Export 2 files</span></div></div></div>')
def holds_for(r, note_where):
    return (f'{note_where}; these transfers with time and amount; the account\'s attributes, each with the file it came from (riskScore from {A["accountsFile"]}, not computed by graphty; '
            f'alertScenario and alertTime from {A["alertsFile"]}); the current view as its figure; methods: the filter step {r["id"]} and neighbors, then the selection\'s edges')
tui_people = sum(1 for r in TUI["hop1"]["nodes"] if r["kind"] == "personal")
modal_t = evidence_modal(TUI, own(TUI, TUI["hop1"]["edges"]), TUI["hop1"]["nodes"], holds_for(TUI, "her note on the step"),
                         f'the selection (1 node), the filter step {STEP_T} (6 nodes, 5 edges)')
ins_tn = (ins_t[0], ins_t[1].replace(section("Export", "", f'<span class="k-icon-btn">{ic("plus")}</span>', " data-empty"),
          section("Notes", f'<div class="at-note-body">{NOTE_T}<div class="k-secondary" style="margin-top:6px">Nadia, 10:19. On {STEP_T}</div></div>')
          + section("Export", "", f'<span class="k-icon-btn">{ic("plus")}</span>', " data-empty")))
a = app(rail(), left(chip("Filtered: 6 of 3,000 nodes"), [ALERTS_ROW()]),
        canvas("tuition-hop1", f'{TUI["id"]} and its 5 counterparties', "", legend(1))
        + dock(["Nodes", "Edges"], "Edges", "Filtered graph: 5 of 9,171 edges.", EDGE_HEAD, edge_rows(TUI["hop1"]["edges"])),
        right(*ins_tn), modal_t)
add("tuition-clear", "4. Clear it: the note and the evidence file are its record",
    "Nadia clears the alert. She adds a note on the step saying why, selects the account and chooses Export the selection's edges: its own 5 transfers, with time and amount, as a findings report (her note, the account's attributes with where each came from, the view) and a CSV. The dialog says how many accounts and people the file names. A cleared alert keeps no set.",
    state("tuition-clear", a, [
        note(1080, 150, "Export dialog, opened by Export the selection's edges: the scope is the selected account's own transfers; the select also offers the node alone and the step. 'names' states who is in the file. The findings report is one self-contained HTML file (decided). interface-templates 20; files-and-recipes 3. compact-mantine Modal, Checkbox section heads, Select, DataTable.", 280),
        note(360, 800, "The footer says where files go before the click. Proposed wording (framework-changes).", 240)]))

# 5. The next alert: find ACC-365386 ------------------------------------------------------------------
ins_s = node_inspector(SEED)
find_s = find_panel(SEED["id"], [hit(SEED, f'{SEED["kind"]}, {SEED["country"]}; in Alerts')])
def s_seed(menu=False, zoom=False):
    a = app(rail(), left(chip("Full graph"), find=find_s),
            canvas("density", f'3,000 accounts as density, {SEED["id"]} selected', sel_at(FULL[SEED["id"]], SEED["id"]), legend(50, points=50))
            + dock(["Nodes", "Edges"], "Nodes", "Rule set Alerts: 50 of 3,000 nodes. Sorted by alertId.", ALERT_HEAD, alert_rows(sel=SEED["id"], first=3, count=9)),
            right(*node_inspector(SEED, open_menu=menu)),
            hop_menu(SEED["id"], SEED_ROWS, 1, ["Filter to neighbors", "Select neighbors"], ("cmd", "Filter to neighbors")) if menu else "")
    notes = [note(60, 170, "No notice: finding the next account cleared the delete's undo line; Edit &gt; Undo still brings the step back. Delete takes no confirmation; the step's row said what was kept (state 10). task-flows 6.2.", 230)] if not menu else [
        note(820, 150, "The Neighbors menu, under its caret and right-aligned to the inspector: each hop row states its size before anything changes, as secondary text after the label. The large jump's second line names what makes it large, read from the element. interface-specification 4.2; element need 'Name the node that contributes most to a neighborhood count'.", 300),
        note(820, 440, "compact-mantine SplitButton; its dropdown is a Menu with checkable rows, then its two options as submenus (Direction: Both, Out or In; From: any time, or a date on the time column, which the next state uses), then Filter to neighbors (what the main part does, with its key) and Select neighbors, each naming the checked hop count.", 300)]
    return state(("seed-menu" if menu else "seed-find") + ("-z" if zoom else ""), a, notes, zoom)
add("seed-find", "5. Alert AL-40122: find ACC-365386",
    f'The previous step is deleted and the chip is back to Full graph; its undo line cleared when Nadia moved to the next account, and Edit > Undo still brings it back. Nadia finds {SEED["id"]}, alerted for structuring: 3 or more transfers of 9,000 to 9,999 USD out in 30 days. It has 8 counterparties, 3 paying in and 5 paid to.',
    s_seed())
add("seed-menu", "6. How big is each hop? The sizes before committing",
    f'The caret on Neighbors opens its menu: 1 hop is 9 nodes and 13 edges, 2 hops {n(HOPS[1]["nodes"])} and {n(HOPS[1]["edges"])}, 3 hops {n(HOPS[2]["nodes"])}. The 2-hop row says why it jumps: {big_hop(C0, C1)} Under the hop rows sit its two options, Direction (Both) and From (any time); the commands name the checked count.',
    s_seed(menu=True))

# 7. The stall: Select neighbors selects, it does not filter ----------------------------------------------
ov7 = "".join(pt_at(FULL[r["id"]]) for r in H1_PLAIN) + "".join(sel_at(FULL[r["id"]]) for r in H1["nodes"]) + f'<span class="at-lbl" style="left:{FULL[SEED["id"]]["x"]}%;top:{FULL[SEED["id"]]["y"]}%">{SEED["id"]}</span>'
multi = (typerow("circle-dot", "9 nodes", "Selection", f'<span class="k-icon-btn">{ic("waypoints")}</span><span class="k-icon-btn" data-hover>{ic("funnel")}</span><span class="k-icon-btn">{ic("group")}</span>'),
         section("Selection", data("nodes", "9") + data("kind", "6 personal, 3 merchant") + data("alert", "5 true, 4 false"))
         + section("Connections", arow('<span class="k-num">13</span> edges among them'))
         + section("Appearance", '<div class="k-legend" style="padding:0 16px">Mixed</div>' + f'<div class="k-row at-stylerow">{DIA}<span class="k-grow">Alerts</span><span class="k-secondary">5</span></div><div class="k-row at-stylerow"><span class="k-chit" style="background:#808080"></span><span class="k-grow">Base style</span><span class="k-secondary">4</span></div>'))
a = app(rail(), left(chip("Full graph"), find=find_s),
        canvas("density", "3,000 accounts as density, ACC-365386 and its 8 neighbors selected", ov7, legend(50, points=54))
        + dock(["Nodes", "Edges"], "Nodes", "Full graph: 3,000 nodes, 9 selected.", NODE_HEAD, node_rows(H1["nodes"], sel=[r["id"] for r in H1["nodes"]])),
        right(*multi))
add("seed-selected", "7. Select neighbors, from the menu: selected, not narrowed",
    "Had Nadia chosen Select neighbors in the Neighbors menu, nine accounts would be selected and drawn as points over the density, but the chip would still read Full graph and the table count 3,000: nothing narrowed. The main part of Neighbors filters (state 8), so this happens only as a menu choice. The four selected accounts that are not alerted are now points too, so the density line reads 2,946 (2,946 + 54 points = 3,000). Filter to, the funnel in the type row, would make the step from here.",
    state("seed-selected", a, [
        note(60, 60, "Unchanged chip: the sign that nothing was filtered. In the first study this was the stall (task-flows 6: 'Does the analyst reach for Select neighbors to grow the boundary?'), so Select neighbors now lives only in the menu and the main press filters (proposed; study round 2).", 240),
        note(1200, 150, "Filter to, in the selection's type row. interface-specification 4.2, Several nodes.", 220)]))

# 8. One hop, filtered ------------------------------------------------------------------------------------
def seed_hop1(toast_text=None, sets=None, right_html=None, chip_html=None, extra="", who="N", file_open=False, project=PROJECT):
    return app(rail(), left(chip_html or chip("Filtered: 9 of 3,000 nodes"), sets, file_open=file_open, project=project),
               canvas("seed-hop1", "ACC-365386 and its 8 counterparties", "", legend(len(H1_ALERTED)), toast(toast_text) if toast_text else "")
               + dock(["Nodes", "Edges"], "Edges", f'Filtered graph: {len(H1["edges"])} of {n(A["edges"])} edges. Sorted by amount, largest first.', EDGE_HEAD, edge_rows(H1["edges"][:10])),
               right_html or right(*ins_s, who=who), extra)
add("seed-hop1", "8. One hop: nine accounts, drawn",
    f'Nadia presses Neighbors. The step, {STEP_S}, keeps the account and its 8 counterparties; the chip reads Filtered: 9 of 3,000 nodes. Five of the nine are alerted. The Edges tab, largest first, shows transfers of 9,139 to 9,864 USD passing through, four of them into the money transfer service {CASH["id"]}.',
    state("seed-hop1", seed_hop1(f"Filter to {STEP_S}: 9 nodes"), [
        note(500, 560, "The notice names the step as its row, Edit &gt; Undo and the undo line do ('Undone: ACC-365386 and neighbors'), plus its size. task-flows 6, the bound row.", 240),
        note(1000, 600, "Edges tab: DataTable, amount right-aligned in tabular figures. interface-templates 16.", 220)]))

# 8b. The account's own transfers, in time order ------------------------------------------------------------
OWN_S = own(SEED, H1["edges"])
def own_foot():  # the step's footer over the selection: its sums in the money words
    m = MONEY[SEED["id"]]
    return (f'<span>{len(OWN_S)} rows selected</span><span><b>Money in</b> {usd(m["moneyIn"])} USD ({m["linksIn"]} transfers)</span>'
            f'<span><b>Money out</b> {usd(m["moneyOut"])} USD ({m["linksOut"]} transfers)</span>')
BANDOUT = [e for e in OWN_S if e["source"] == SEED["id"] and 9000 <= e["amount"] < 10000]
FIRST_IN = next(e for e in OWN_S if e["target"] == SEED["id"])
LATE_IN = [e for e in OWN_S if e["target"] == SEED["id"] and e["time"] > SEED["alertTime"]]
exp_menu = ('<div class="k-menu at-menu" style="right:8px;top:{top}px;min-width:224px;max-width:224px" role="menu">'
            f'<div class="k-menu-item" data-described data-hover role="menuitem"><span class="k-check-col"></span><span class="k-grow">Export the selection\'s edges...<span class="k-menu-desc">{len(OWN_S)} transfers: time and amount</span></span></div>'
            '<div class="k-menu-item" data-described role="menuitem"><span class="k-check-col"></span><span class="k-grow">Export the selection...<span class="k-menu-desc">1 node and its attributes</span></span></div></div>')
a = app(rail(), left(chip("Filtered: 9 of 3,000 nodes")),
        canvas("seed-hop1", f'{SEED["id"]} selected among its 8 counterparties', "", legend(len(H1_ALERTED)))
        + dock(["Nodes", "Edges"], "Edges", f'Edges of the selection, {SEED["id"]}: {len(OWN_S)} of {len(H1["edges"])} edges in the filtered graph. Sorted by time.', EDGE_HEAD, edge_rows(OWN_S), foot=own_foot()),
        right(*node_inspector(SEED)), exp_menu.replace("{top}", "748"))
add("seed-own", "8b. The account's own transfers, in time order",
    f'Nadia selects {SEED["id"]} and sorts the Edges tab by time. The tab follows the selection: its {len(OWN_S)} transfers, not the step\'s {len(H1["edges"])}. {usd(FIRST_IN["amount"])} USD came in on {when(FIRST_IN["time"])}; the next day, between {BANDOUT[0]["time"][11:16]} and {BANDOUT[-1]["time"][11:16]}, {len(BANDOUT)} transfers of 9,000 to 9,999 USD went out. The inspector says where each attribute came from: the alert rule and its time ({when(SEED["alertTime"])} UTC) from the monitoring system\'s alerts file, riskScore from the accounts file, not computed by graphty. Under the table, the footer adds them up in the money words: money in against money out, so nobody sums the column by hand. The Export section\'s + offers Export the selection\'s edges.',
    state("seed-own", a, [
        note(560, 860, "Footer: the selection's sums in the money words, computed by graphty-element (weighted in- and out-degree on amount; proposed). With a From date on the step it splits in two (state 13c).", 300),
        note(560, 520, "The Edges tab follows the selection: 'Edges of the selection'. Time comes right after the endpoints in every edge table. interface-templates 16. compact-mantine DataTable, sorted by the time column.", 280),
        note(900, 150, "Attribute provenance: each group of attributes names the file it came from; a delivered score says graphty did not compute it. No Alert section: the alert's own columns are ordinary attributes. interface-specification 3. compact-mantine DataRow and a caption Text.", 280),
        note(900, 560, "The Export section's +: Menu with the two export scopes of a selection. Both open the one Export dialog. interface-templates 20.", 260)]))

# 9. Refer it: a set of the boundary, a note ----------------------------------------------------------------
def _in(e): return e["target"] == SEED["id"]
NOTE_S = (f'Escalate. In {usd(FIRST_IN["amount"])} from {FIRST_IN["source"]} on {when(FIRST_IN["time"])}; out the next day, {BANDOUT[0]["time"][11:16]} to {BANDOUT[-1]["time"][11:16]}: '
          + ", ".join(f'{usd(e["amount"])} to {e["target"]}' for e in BANDOUT)
          + f' (money transfer {CASH["id"]}). Alerted {when(SEED["alertTime"])}. Later in: '
          + ", ".join(f'{usd(e["amount"])} from {e["source"]} ({when(e["time"])[:6].strip()})' for e in LATE_IN)
          + f'. All four personal counterparties are alerted for structuring and all four pay {CASH["id"]}. Pass-through pattern.')
ref_rows = [ALERTS_ROW(), item(ic("group"), REF, "frozen", '<span class="k-num">9</span>', ' aria-selected="true"')]
ins_ref = (typerow("group", REF, "9 &middot; Frozen set", f'<span class="k-icon-btn">{ic("mouse-pointer-2")}</span><span class="k-icon-btn">{ic("funnel")}</span>'),
           section("Created from", arow(f"Filter step {STEP_S}"))
           + section("Members", "".join(data(f'<span class="k-id">{r["id"]}</span>', ("alerted" if r["alert"] else r["kind"])) for r in H1["nodes"][:4]) + arow('<span class="k-secondary">5 more</span>'))
           + section("Notes", f'<div class="at-note-body">{NOTE_S}<div class="k-secondary" style="margin-top:6px">Nadia, 10:27. On {REF}</div></div>')
           + section("Used by", arow('<span class="k-secondary">Nothing yet</span>')))
add("seed-refer", "9. Refer it: keep the boundary as a set, with a note",
    f'Five minutes in, Nadia cannot clear it. From the step\'s menu she makes a set of its 9 accounts, named {REF}, and writes a note on it with the times from the Edges tab. Next she exports the evidence (state 9b).',
    state("seed-refer", seed_hop1("Add note", sets=ref_rows, right_html=right(*ins_ref)), [
        note(60, 330, "The new frozen set, named in place. Undo 'Create set " + REF + "'. task-flows 6.2, keep.", 220),
        note(900, 420, "Notes on the set: who wrote it, when, on what. task-flows 7. Element need 'A notes collection with targets', missing.", 260)]))

# 9b. The evidence: Export the selection's edges -----------------------------------------------------------------
ref_rows_n = [ALERTS_ROW(), item(ic("group"), REF, "frozen", '<span class="k-num">9</span>')]
a = app(rail(), left(chip("Filtered: 9 of 3,000 nodes"), ref_rows_n),
        canvas("seed-hop1", f'{SEED["id"]} selected among its 8 counterparties', "", legend(len(H1_ALERTED)))
        + dock(["Nodes", "Edges"], "Edges", f'Edges of the selection, {SEED["id"]}: {len(OWN_S)} of {len(H1["edges"])} edges in the filtered graph. Sorted by time.', EDGE_HEAD, edge_rows(OWN_S)),
        right(*node_inspector(SEED, members="2 sets")),
        evidence_modal(SEED, OWN_S, H1["nodes"], holds_for(SEED, f"her note (on the set {REF}, which holds these accounts)"), f'the selection (1 node), the filter step {STEP_S} (9 nodes, 13 edges), the set {REF} (9 nodes)'))
add("seed-evidence", "9b. The evidence: export the selection's edges",
    f'Nadia selects {SEED["id"]} again and chooses Export the selection\'s edges. The evidence is the account\'s own {len(OWN_S)} transfers, with time and amount, listed in the dialog before anything is written: a findings report that also carries her note, the account\'s attributes with the file each came from, the view and the method; and the same transfers as CSV. The dialog names the {len(H1["nodes"])} accounts the file mentions. Nothing is uploaded.',
    state("seed-evidence", a, [
        note(1080, 130, "Scope 'The selection's edges': the account's own transfers, previewed as rows before the file is written. The report carries the notes on the selection and on any kept set that holds it (proposed, framework-changes). The findings report is one self-contained HTML file (decided). compact-mantine Modal, Select, DataTable, Checkbox.", 290)]))

# 10. Delete the step -----------------------------------------------------------------------------------------
pop10 = ('<div class="k-popover" style="left:300px;top:70px;width:290px"><div class="k-popover-head">Filter steps<span class="k-grow"></span><span class="k-icon-btn">' + ic("plus") + '</span></div><div class="k-popover-body">'
         f'<ul class="k-list"><li class="k-item" aria-selected="true"><span class="k-check" aria-checked="true"></span><span class="k-ellipsis">{STEP_S}</span><span class="k-trail k-num">9</span></li></ul>'
         f'<div class="k-prose">Kept from this step: set {REF}, 1 note. Evidence exported 10:31.</div></div></div>'
         '<div class="k-menu" style="left:596px;top:118px"><div class="k-menu-item"><span class="k-check-col"></span>Rename</div><div class="k-menu-item"><span class="k-check-col"></span>Create rule set</div>'
         '<div class="k-menu-item"><span class="k-check-col"></span>Create set</div><div class="k-menu-sep"></div><div class="k-menu-item" data-hover><span class="k-check-col"></span>Delete step<span class="k-shortcut">Delete</span></div></div>')
add("next-delete", "10. Done with it: delete the step",
    "The filter chip opens the filter steps. Under the step, a line says what was kept from it (the set and the note) and when its evidence was exported, so deleting it loses nothing. Delete step is undoable.",
    state("next-delete", seed_hop1(sets=ref_rows, chip_html=chip("Filtered: 9 of 3,000 nodes", True), right_html=right(*ins_ref), extra=pop10), [
        note(620, 250, "Filter steps popover: Tree rows with a checkbox; the step's context menu. interface-templates 7. The kept-and-exported line answers the journey's trust question for the next alert: proposed.", 260)]))

# 11. The next alert: a new seed outside the ring ------------------------------------------------------------------
ins_n = node_inspector(NEXT)
def s_next(file_open=False):
    pop = ""
    if file_open:
        pop = ('<div class="k-popover" style="left:300px;top:60px;width:320px"><div class="k-popover-head">Where the data is<span class="k-grow"></span><span class="k-icon-btn">' + ic("x") + '</span></div><div class="k-popover-body">'
               + data("data", f'<span class="k-id">{A["file"]}</span>') + prose("Read from this computer at 08:41. graphty runs in this browser tab and has no server of its own.")
               + data("uploaded", "nothing, this session") + data("saved", "in this browser, 10:33")
               + data("written out", "4 files, 10:19 and 10:31")
               + prose('<span class="k-id">evidence-AL-40121.html, AL-40121-transfers.csv<br>evidence-AL-40122.html, AL-40122-transfers.csv</span>')
               + data("Assistant", "off") + prose("Turned on, it sends each question and the rows it reads to the chosen provider.") + "</div></div>")
    return app(rail(), left(chip("Filtered: 1 of 3,000 nodes"), ref_rows[:1] + [item(ic("group"), REF, "frozen", '<span class="k-num">9</span>')], file_open=file_open),
               canvas("next", f'{NEXT["id"]} alone', "", legend(1), "" if file_open else toast(f'Filter to {NEXT["id"]}'))
               + dock(["Nodes", "Edges"], "Nodes", "Filtered graph: 1 of 3,000 nodes.", NODE_HEAD, node_rows([NEXT], sel=[NEXT["id"]])),
               right(*ins_n), pop)
add("next", "11. The next alert: a new step on a new seed",
    f'Nadia finds {NEXT["id"]} (AL-40123, a consulting firm alerted for outflow over 3 times its 3-month average) and uses Filter to on it. The chip reads Filtered: 1 of 3,000 nodes; the next Filter to neighbors grows it. Keeping the last alert and starting this one took 6 steps: Create set, Add note, Delete step, Find, the hit, Filter to.',
    state("next", s_next(), [
        note(60, 60, "Chip after Filter to on the new seed: 'Filtered: 1 of 3,000 nodes'. task-flows 6.2.", 220),
        note(560, 560, "Undo label 'Filter to " + NEXT["id"] + "'. task-flows 6.2, replace.", 220)]))
add("file", "12. Did anything just upload?",
    "Four files have been written this morning. The file chip, beside the filter chip, opens a plain account of the session: where the data came from, that nothing was uploaded, where the project is saved, which files were written and when, and that the Assistant is off.",
    state("file", s_next(file_open=True), [
        note(640, 60, "The file chip opens 'Where the data is' (proposed in framework-changes): compact-mantine Pill trigger opening a Popout with DataRows and ProseBlocks. Reads the element's load record and the app's own save and export log.", 280)]))

# ======================= Part 2: Sarah's escalated case (days) =======================
ref_rows_s = [ALERTS_ROW(), item(ic("group"), REF, "frozen", '<span class="k-num">9</span>', ' aria-selected="true"')]
ins_ref_s = (ins_ref[0], ins_ref[1].replace("Nothing yet", "Nothing yet"))
ov13 = "".join(pt_at(FULL[r["id"]]) for r in H1_PLAIN) + "".join(sel_at(FULL[r["id"]]) for r in H1["nodes"])
a = app(rail(), left(chip("Full graph"), ref_rows_s),
        canvas("density", f"3,000 accounts as density, the set {REF} selected", ov13, legend(50, points=54))
        + dock(["Nodes", "Edges"], "Nodes", f"Set {REF}: 9 of 3,000 nodes.", NODE_HEAD, node_rows(H1["nodes"], member=[r["id"] for r in H1["nodes"]])),
        right(*ins_ref, who="S"))
add("case-open", "13. Level 2, day 1: Sarah opens the escalation",
    f'Wednesday 15:40. The escalation carries Nadia\'s project file. Sarah opens it on the set {REF}: its 9 members are points over the density (2,946 + 54 points = 3,000), and Nadia\'s note is the first thing in the inspector.',
    state("case-open", a, [note(1200, 330, "The set's Notes section shows the escalating reviewer's note, with author and time. task-flows 7.", 220)]))

# 13b-13c. Where did the money go next? Neighbors with Direction Out and a From date ---------------------
TR = TRACE
TS = TR["step"]
TFOOT = TR["footer"]
ALERT_IDS = {r["id"] for r in A["alerts"]}
T_ALERTED = sum(1 for x in TR["anchors"] if x in ALERT_IDS)
STEP_TR = f'{SEED["id"]} and neighbors, out from {TR["fromLabel"]}, 2 hops'
TR_ROWS = [(TR["hops"][0]["hops"], TR["hops"][0]["nodes"], TR["hops"][0]["edges"], f'Its {TFOOT["transfersOutFrom"]} transfers out from {TR["fromLabel"]} on, and the transfers among the accounts they reach.'),
           (TR["hops"][1]["hops"], TR["hops"][1]["nodes"], TR["hops"][1]["edges"], ""), (TR["hops"][2]["hops"], TR["hops"][2]["nodes"], TR["hops"][2]["edges"], "")]
from_sub = ('<div class="k-menu" style="right:320px;top:338px;min-width:220px" role="menu"><div class="k-menu-label">Transfers from</div>'
            '<div class="k-menu-item" role="menuitemradio" aria-checked="false"><span class="k-check-col"></span>Any time</div>'
            f'<div class="k-menu-item" data-described role="menuitemradio" aria-checked="true"><span class="k-check-col">&#10003;</span><span class="k-grow">{TR["fromLabel"]}, 2026<span class="k-menu-desc">on or after, on the column time (UTC)</span></span></div>'
            '<div class="k-menu-sep"></div><div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Pick a date...</div></div>')
def case_trace_menu():
    a = app(rail(), left(chip("Full graph"), ref_rows_s),
            canvas("density", f'3,000 accounts as density, {SEED["id"]} selected', sel_at(FULL[SEED["id"]], SEED["id"]), legend(50, points=50))
            + dock(["Nodes", "Edges"], "Edges", f'Edges of the selection, {SEED["id"]}: {TR["seedOwnRows"]} of {n(A["edges"])} edges. Sorted by time.', EDGE_HEAD, edge_rows(OWN_S), foot=own_foot()),
            right(*node_inspector(SEED, members="2 sets", open_menu=True)),
            hop_menu(SEED["id"], TR_ROWS, 2, ["Filter to neighbors", "Select neighbors"], None, direction="Out", start=f'{TR["fromLabel"]}, 2026', hover_opt="From") + from_sub)
    return state("case-trace-menu", a, [
        note(560, 60, "Neighbors options: Direction (Both, Out, In) and From (any time, or a date on a date column) are graphty-element options of the neighborhood query, so every hop row is counted with them before anything changes. Proposed to graphty-element. compact-mantine Menu with a submenu.", 300)])
add("case-trace-menu", "13b. Where did the money go next? Out, from Aug 6",
    f'Before widening the case, Sarah follows the money forward. The footer under her table already says that over the month more went out ({usd(MONEY[SEED["id"]]["moneyOut"])} USD) than came in ({usd(MONEY[SEED["id"]]["moneyIn"])} USD). On {SEED["id"]} she opens the Neighbors menu and sets its two options: Direction Out, and From {TR["fromLabel"]}, the day after the money arrived. Every hop row is recounted with them: 1 hop is {TR["hops"][0]["nodes"]} accounts, 2 hops {TR["hops"][1]["nodes"]}, 3 hops {TR["hops"][2]["nodes"]} (against {n(HOPS[1]["nodes"])} at 2 hops with no direction and no date).',
    case_trace_menu())

def time_order(r):
    if r["senderHop"] == 0: return '<span class="k-secondary">starts the trace</span>'
    if r["earlierThanHopBefore"]: return f'<span class="at-order">{ic("clock", "k-i k-i-sm")} no: earlier than the hop before ({when(r["reachedAt"])})</span>'
    return "yes"
TRACE_HEAD = [("source", 0), ("target", 0), ("time (UTC)", 0), ("amount (USD)", 1), ("sender's hop", 1), ("Dates in order", 0)]
tr_rows = [(" data-member" if r["source"] == SEED["id"] else "", [(r["source"], "k-id"), (r["target"], "k-id"), (when(r["time"]), "k-num"), (usd(r["amount"]), "k-n"),
            ("start" if r["senderHop"] == 0 else str(r["senderHop"]), "k-n"), (time_order(r), "")]) for r in TS["rows"]]
tr_foot = (f'<span>Selection {SEED["id"]}, on the full graph</span>'
           f'<span><b>Money in before {TR["fromLabel"]}</b> {usd(TFOOT["moneyInBefore"])} USD ({TFOOT["transfersInBefore"]} transfer)</span>'
           f'<span><b>Money out from {TR["fromLabel"]} on</b> {usd(TFOOT["moneyOutFrom"])} USD ({TFOOT["transfersOutFrom"]} transfers)</span>')
tr_legend = legend(T_ALERTED, extra=f'<div class="k-lg-row">{ic("clock", "k-i k-i-sm")}earlier than the hop before<span class="k-value k-num">{TS["earlierThanHopBefore"]}</span></div>')
seed_in_step = dict(SEED, degree=TFOOT["transfersOutFrom"], **{"in": 0, "out": TFOOT["transfersOutFrom"]})
a = app(rail(), left(chip(f'Filtered: {TS["nodes"]} of 3,000 nodes'), ref_rows_s),
        canvas("img:alerts-trace", f'Transfers out of {SEED["id"]} from {TR["fromLabel"]}, two hops: {TS["nodes"]} accounts, arrows along each transfer', "", tr_legend,
               toast(f'Filter to {STEP_TR}: {TS["nodes"]} nodes'))
        + dock(["Nodes", "Edges"], "Edges", f'Filtered graph: {TS["edges"]} of {n(A["edges"])} edges. Sorted by time; the selection\'s {TFOOT["transfersOutFrom"]} marked.', TRACE_HEAD, tr_rows, foot=tr_foot),
        right(*node_inspector(seed_in_step, members="2 sets", in_full=f'{SEED["degree"]} neighbors: in {SEED["in"]}, out {SEED["out"]}')))
add("case-trace", "13c. The trace: each transfer in time order, and the money in against the money out",
    f'The step {STEP_TR} keeps {TS["nodes"]} accounts and the {TS["edges"]} transfers among them dated {TR["fromLabel"]} or later. The drawing has arrows along each transfer. The Edges tab, in time order, gives each transfer the hop of its sender, and its Dates in order column checks the transfer\'s date against the transfer that reached that sender: {TS["earlierThanHopBefore"]} is earlier than the hop before, drawn dashed with a clock and named in its row, so it cannot be the same money. The column checks dates only, not amounts; the money is on the drawing, where each account reads Received and Sent over this trace\'s transfers alone (ACC-274887: Received {usd(TS["traceMoney"]["ACC-274887"]["received"])} USD / Sent {usd(TS["traceMoney"]["ACC-274887"]["sent"])} USD, this trace), so money sent on without arriving in the trace shows at a glance. The footer splits the selected account\'s money at the From date: {usd(TFOOT["moneyInBefore"])} USD in before {TR["fromLabel"]}, {usd(TFOOT["moneyOutFrom"])} USD out from then on. Most of what went out never came in through this file, which is the question Sarah takes to the account statement.',
    state("case-trace", a, [
        note(560, 60, "Filter chip: the dated step counts like any Neighbors step. interface-templates 7.", 220),
        note(330, 700, "Received and Sent under each account are summed over the step's transfers only, the weighted in- and out-degree on amount on the filtered graph; the inspector's Money in and Money out stay on the full graph. Computed by graphty-element (proposed).", 260),
        note(330, 470, "Arrows on a directed graph, by default; the dashed edge with a clock is a transfer earlier than the one that reached its sender. canvas-drawing (proposed).", 260),
        note(560, 860, "The step's table footer splits the selection's total at the step's From date: Money in before, Money out from then on. It reads the full graph, and says so, because a step that follows money out holds none of the money that came in. Computed by graphty-element (proposed).", 320)]))

def case_menu(zoom=False):
    rows = [(1, HOPS[0]["nodes"], HOPS[0]["edges"], "The step already holds these 9."), SEED_ROWS[1], SEED_ROWS[2]]
    return state("case-menu" + ("-z" if zoom else ""), seed_hop1(sets=ref_rows_s, chip_html=chip("Filtered: 9 of 3,000 nodes"), who="S",
                 right_html=right(*node_inspector(SEED, members="2 sets", open_menu=True), who="S"),
                 extra=hop_menu(SEED["id"], rows, 2, ["Filter to neighbors", "Select neighbors"], ("cmd", "Filter to neighbors"))),
                 [note(820, 470, "The same menu in every state: hop rows counted from the selected node, Direction and From, then the commands naming the checked count. Growing a step reads the same as starting one.", 280)], zoom)
add("case-menu", "14. Two hops? The size, and what it is made of",
    f'Sarah deletes the dated step and presses Neighbors on {SEED["id"]}: the step {STEP_S} keeps 9 accounts. Inside it she opens the same menu.' f' 2 hops is checked: {n(HOPS[1]["nodes"])} nodes, and its second line says why: {big_hop(C0, C1)} She takes it, knowing the extra accounts are two shops\' customers.',
    case_menu())

def case_hop2(zoom=False):
    bt = SEED["hop2"]["bandTransfers"]
    a = app(rail(), left(chip(f'Filtered: {n(HOPS[1]["nodes"])} of 3,000 nodes'), ref_rows_s),
            canvas("seed-hop2", f'Two hops from {SEED["id"]}: {n(HOPS[1]["nodes"])} accounts', "", legend(len(SEED["hop2"]["alerted"])), toast(f'Filter to {STEP_S2}: {n(HOPS[1]["nodes"])} nodes'))
            + dock(["Nodes", "Edges"], "Edges", f'Filtered graph: {n(HOPS[1]["edges"])} of {n(A["edges"])} edges. Sorted by amount, largest first.', EDGE_HEAD, edge_rows(bt[:10])),
            right(*node_inspector(SEED, members="2 sets"), who="S"))
    return state("case-hop2" + ("-z" if zoom else ""), a, [
        note(320, 16, f'The legend counts within the step: {len(SEED["hop2"]["alerted"])} alerted. Every number follows the chip (conceptual-model 4.4).', 240)], zoom)
add("case-hop2", "15. Two hops: 283 accounts, and the transfers just under 10,000",
    f'The step grows to {n(HOPS[1]["nodes"])} accounts and {n(HOPS[1]["edges"])} transfers. The two shops\' customers fan out; {len(SEED["hop2"]["alerted"])} of the accounts inside are alerted, for four different reasons. Sorted by amount, the top {NBAND} transfers are all between 9,000 and 9,999 USD.',
    case_hop2())

band_rows = [ALERTS_ROW(), item(ic("group"), REF, "frozen", '<span class="k-num">9</span>')]
ins_d = node_inspector(dict(DIS, degree=1, **{"in": 0, "out": 1}), in_full=f'{DIS["degree"]} neighbors: in {DIS["in"]}, out {DIS["out"]}')
a = app(rail(), left(chip(f"Filtered: {NBE} of 3,000 nodes"), band_rows),
        canvas("band", f"{NBE} accounts in transfers of 9,000 to 9,999 USD", "", legend(sum(1 for r in SEED["hop2"]["bandEnds"] if r["alert"])))
        + dock(["Nodes", "Edges"], "Nodes", f"Filtered graph: {NBE} of 3,000 nodes.", NODE_HEAD, node_rows(SEED["hop2"]["bandEnds"][:10], sel=[DIS["id"]])),
        right(*ins_d, who="S"))
add("case-distractor", "16. Fourteen accounts: is every one of them in it?",
    f'A second step keeps only transfers of 9,000 to 9,999 USD with their accounts: {NBE}. Twelve pass money to each other, three or more transfers each. {DIS["id"]} is alerted too, but inside the step it has one transfer, to the money transfer service; its full-graph count shows two more, which the account statement shows are a salary from a construction firm and a fuel purchase. Sarah leaves it, and the service itself, out of the set.',
    state("case-distractor", a, [note(60, 60, "Two filter steps; the chip counts them. interface-templates 7. The second step is a rule over edges, kept with their nodes (task-flows 4.1).", 230)]))

ring_rows = [ALERTS_ROW(), item(ic("group"), REF, "frozen", '<span class="k-num">9</span>'), item(ic("group"), RING, "frozen", f'<span class="k-num">{len(RS["members"])}</span>', ' aria-selected="true"')]
NOTE_R = (f'{len(RS["members"])} personal accounts in {RS["countries"]} countries pass {RS["transfersAmong"]} transfers of 9,000 to 9,999 USD among themselves ({usd(RS["totalAmongUSD"])} USD) '
          f'and cash out {usd(RS["cashoutUSD"])} USD through {CASH["id"]}. 4 members were never alerted: they cash out just under 9,000 ({", ".join(A["ring"]["notAlerted"])}). '
          f'{DIS["id"]} (alerted) paid {CASH["id"]} once, salary-funded: excluded.')
ins_ring = (typerow("group", RING, f'{len(RS["members"])} &middot; Frozen set', f'<span class="k-icon-btn">{ic("mouse-pointer-2")}</span><span class="k-icon-btn">{ic("funnel")}</span>'),
            section("Created from", arow(f"Selection in {BAND}"))
            + section("Statistics", data("alert", f'{A["ring"]["alerted"]} true, {len(A["ring"]["notAlerted"])} false') + data("transfers among", str(RS["transfersAmong"])) + data("total among (USD)", usd(RS["totalAmongUSD"])))
            + section("Notes", f'<div class="at-note-body">{NOTE_R}<div class="k-secondary" style="margin-top:6px">Sarah, Wednesday 17:05. On {RING}</div></div>')
            + section("Used by", arow('<span class="k-secondary">Nothing yet</span>')))
a = app(rail(), left(chip(f"Filtered: {NBE} of 3,000 nodes"), ring_rows),
        canvas("band-set", f"The set {RING} selected", "", legend(sum(1 for r in SEED["hop2"]["bandEnds"] if r["alert"])), toast("Add note"))
        + dock(["Nodes", "Edges"], "Nodes", f"Set {RING}: {len(RS['members'])} of {NBE} nodes in the filtered graph.", NODE_HEAD, node_rows(RS["members"][:10], member=[r["id"] for r in RS["members"]])),
        right(*ins_ring, who="S"))
add("case-ring", "17. Keep the ring: made from the transfers, not from the alerts",
    f'Sarah makes a set of the {len(RS["members"])} accounts that pass the money around. It is not the alert list: {len(A["ring"]["notAlerted"])} members were never alerted, and most alerted accounts in the step are not in it. Its statistics and her note say so.',
    state("case-ring", a, [note(1200, 250, "Set inspector with Statistics over its members. interface-specification 4.1. Undo 'Create set " + RING + "'.", 220)]))

P = A["path"]
path_hops = ""
for k in range(len(P["directed"]) - 1):
    back = k and P["directedTimes"][k] < P["directedTimes"][k - 1]
    path_hops += data(f'<span class="k-id">{P["directed"][k]}</span>', "") + f'<div class="k-data" style="padding-inline-start:32px"><span class="k-name k-secondary">{when(P["directedTimes"][k])}{", earlier" if back else ""}</span><span class="k-value">{usd(P["directedAmounts"][k])}</span></div>'
path_hops += data(f'<span class="k-id">{P["directed"][-1]}</span>', "")
ins_p = (typerow("route", "Shortest path", f'{len(P["directed"]) - 1} hops', f'<span class="k-icon-btn">{ic("mouse-pointer-2")}</span><span class="k-icon-btn">{ic("funnel")}</span><span class="k-icon-btn">{ic("group")}</span>'),
         section("Path", data("from", f'<span class="k-id">{SEED["id"]}</span>') + data("to", f'<span class="k-id">{P["to"]["id"]}</span>') + data("direction", "along transfers") + data("scope", "the filtered graph"))
         + prose(f'Ignoring direction, the shortest route is 2 hops, through {CASH["id"]}. It is not a flow from one to the other.')
         + section("Path hops", path_hops))
bar = (f'<div class="k-secondary-bar" style="position:absolute;left:50%;transform:translateX(-50%);bottom:64px;z-index:5;display:flex;gap:8px;align-items:center;padding:4px 8px;border-radius:8px;background:var(--cm-bg);box-shadow:var(--cm-elevation-200)">'
       f'<span class="k-secondary">From</span><span class="k-field k-id">{SEED["id"]}</span><span class="k-secondary">To</span><span class="k-field k-id">{P["to"]["id"]}</span>'
       '<span class="k-field">Along transfers<svg class="k-i k-i-sm k-caret"><use href="../kit/icons.svg#chevron-down"/></svg></span><span class="k-btn">Run</span></div>')
a = app(rail(), left(chip(f"Filtered: {NBE} of 3,000 nodes"), ring_rows),
        canvas("band-path", f'Shortest path along transfers, {SEED["id"]} to {P["to"]["id"]}', "", legend(sum(1 for r in SEED["hop2"]["bandEnds"] if r["alert"])), armed="path", bar=bar)
        + dock(["Nodes", "Edges"], "Edges", "Path: 5 of 42 edges in the filtered graph.", EDGE_HEAD,
               [("", [(P["directed"][k], "k-id"), (P["directed"][k + 1], "k-id"), (when(P["directedTimes"][k]) + (' <span class="k-secondary">earlier than the hop before</span>' if k and P["directedTimes"][k] < P["directedTimes"][k - 1] else ""), "k-num"), (usd(P["directedAmounts"][k]), "k-n")]) for k in range(len(P["directed"]) - 1)]),
        right(*ins_p, who="S"))
add("case-path", "18. Day 2: how does money from ACC-365386 reach ACC-580664?",
    f'Thursday. Sarah checks that the escalated account feeds the rest of the ring, not just its neighbors. With the Path tool, From {SEED["id"]}, To {P["to"]["id"]} (alerted, risk {P["to"]["riskScore"]}), along transfers: {len(P["directed"]) - 1} hops, each 9,260 to 9,862 USD. The table puts each hop\'s time beside it: {sum(1 for k in range(1, len(P["directedTimes"])) if P["directedTimes"][k] < P["directedTimes"][k - 1])} hop is earlier than the hop before, so this is a route along transfers, not one sum moving forward. The inspector also says that ignoring direction the route is 2 hops through the money transfer service, which is two customers of one service, not a flow.',
    state("case-path", a, [
        note(420, 540, "Path tool secondary bar: From, To, direction, Run. compact-mantine SecondaryToolbar. task-flows 10.2; interface-templates 14.", 260),
        note(1200, 420, "Path hops: node DataRow, inset edge DataRow with the amount. interface-specification 3. The direction sentence: proposed.", 220)]))

def case_export(zoom=False):
    cp = RS["counterparties"]
    modal = export_modal(f'Set: {RING} ({len(RS["members"])} nodes, {RS["transfersTouching"]} transfers touching them)',
                         f'Other scopes: the filter step ({NBE} nodes) or both steps off ({n(HOPS[1]["nodes"])} nodes, most of them two shops\' customers).',
                         f'{len(RS["members"]) + cp["count"]} accounts: the {len(RS["members"])} members and {cp["count"]} counterparties ({cp["kinds"].get("personal", 0)} people, {cp["kinds"].get("merchant", 0)} merchants)',
                         "1 view (Ring, 12 accounts), 2 notes, the shortest path; methods: Neighbors, 2 hops; rule step on amount; Shortest path along transfers",
                         data("format", "SVG, legend and scope drawn in, one per saved view"),
                         ["evidence-AL-40122.html", "AL-40122-ring-nodes.csv, AL-40122-ring-edges.csv"], 4, view_img="band-set")
    a = app(rail(), left(chip(f"Filtered: {NBE} of 3,000 nodes"), ring_rows, views=1, view_rows=item(ic("bookmark"), "Ring, 12 accounts", "", "", ' aria-selected="true"')),
            canvas("band-set", f"The set {RING} selected", "", legend(sum(1 for r in SEED["hop2"]["bandEnds"] if r["alert"])))
            + dock(["Nodes", "Edges"], "Nodes", f"Set {RING}: {len(RS['members'])} of {NBE} nodes.", NODE_HEAD, node_rows(RS["members"][:6], member=[r["id"] for r in RS["members"]])),
            right(*ins_ring, who="S"), modal)
    return state("case-export" + ("-z" if zoom else ""), a, [
        note(1080, 130, "With a set selected, the evidence file is scoped to the set; the step and the full neighborhood are the wider choices. 'names' counts the people in the file before it is written. Proposed (framework-changes).", 280)], zoom)
add("case-export", "19. Day 3: the evidence file for the SAR",
    f'Friday. Sarah decides to file. She saves the view (Ring, 12 accounts), so the report has a figure of its own, and exports. With the set selected, the file is scoped to its {len(RS["members"])} members and the {RS["transfersTouching"]} transfers touching them, not to the {n(HOPS[1]["nodes"])} accounts of the neighborhood; the dialog says how many accounts and people it names. The figure keeps alerted accounts apart in gray.',
    case_export())

# ======================= Variants =======================
rule_pop = ('<div class="k-popover" style="left:300px;top:70px;width:300px"><div class="k-popover-head">' + ic("chevron-left", "k-i k-i-sm") + '&nbsp;New filter step</div><div class="k-popover-body">'
            '<div class="k-fieldrow"><span class="k-legend">Keep</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-field">Edges, with their nodes<svg class="k-i k-i-sm k-caret"><use href="../kit/icons.svg#chevron-down"/></svg></span></div></div>'
            '<div class="k-fieldrow"><span class="k-legend">Where</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-field" data-focus><span class="k-mono">amount between 9000 and 9999.99</span></span></div></div>'
            f'<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">{A["rule"]["nodes"]}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">{A["rule"]["edges"]}</span></div></div>'
            f'<div class="k-prose">Of 3,000 nodes and {n(A["edges"])} edges. {A["rule"]["alerted"]} of the {A["rule"]["nodes"]} are alerted.</div>'
            '<div class="at-foot"><span class="k-btn k-btn-secondary">Create rule set</span><span class="k-btn">Filter to</span></div></div></div>')
a = app(rail(), panel("Structuring hunt", chip("Full graph", True), graphs_section("Transfers", "3,000 nodes") + sets_section([ALERTS_ROW()]) + views_section()),
        canvas("density", "3,000 accounts as density", "", legend(50, points=50))
        + dock(["Nodes", "Edges"], "Edges", f"Full graph: {n(A['edges'])} edges. Sorted by amount, largest first.", EDGE_HEAD, edge_rows(SEED["hop2"]["bandTransfers"][:6])),
        right(typerow("network", "Transfers", "Graph"), section("Statistics", f'<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">3,000</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">{n(A["edges"])}</span></div></div>'
                                                                + data("direction", "directed") + data("weak components", str(A["stats"]["components"])) + data("max links (count)", str(A["stats"]["maxDegree"])))
              + style_stack() + section("Export", "", f'<span class="k-icon-btn">{ic("plus")}</span>', " data-empty"), who="P"), rule_pop)
add("rule", "20. Variant: Priya starts from a rule",
    f'Priya hunts for structuring rather than working an alert. Her first move is a filter step written as a rule over transfers. Before she commits, the editor counts what it keeps: {A["rule"]["nodes"]} accounts and {A["rule"]["edges"]} transfers, {A["rule"]["alerted"]} of the accounts alerted -- the ring and, beside it, the tuition payers.',
    state("rule", a, [note(1200, 330, "Style stack: the layers the team's recipe brought (Alerts: vermillion and a diamond on alert is true), then Suggested. Shape by kind is offered for a column of 5 kinds or fewer and is never applied until the reader adds it. interface-specification 4; framework-changes, suggested layers.", 230),
                      note(620, 70, "Rule editor in the filter steps popover, entered through its back row: FieldRow with the expression, MetricRows for the preview. interface-templates 7 and 10; task-flows 4.1.", 280)]))

rule_seed = dict(SEED)
a = app(rail(), panel("Structuring hunt", chip(f'Filtered: {A["rule"]["nodes"]} of 3,000 nodes'), find_panel(SEED["id"], [hit(SEED, "in the filtered graph; in Alerts")])),
        canvas("rule", "Accounts in transfers of 9,000 to 9,999 USD", sel_at(A["anchors"]["rule"][SEED["id"]]), legend(A["rule"]["alerted"]))
        + dock(["Nodes", "Edges"], "Nodes", f'Filtered graph: {A["rule"]["nodes"]} of 3,000 nodes.', NODE_HEAD, node_rows(A["rule"]["members"][:9], sel=[SEED["id"]])),
        right(*node_inspector(dict(SEED, degree=5, **{"in": 2, "out": 3}), in_full="8 neighbors: in 3, out 5"), who="P"))
add("rule-find", "21. Variant: then Find, inside the rule's step",
    f'The step draws {A["rule"]["nodes"]} accounts in three groups: the ring around its money transfer service, and two universities with their tuition payers. Priya finds {SEED["id"]} inside it. Its Connections count within the step, and one row gives the full-graph count beside it.',
    state("rule-find", a, [note(1200, 330, "Connections inside a filter step, with the full-graph count as a DataRow: proposed (framework-changes).", 220)]))

# Past the drawing limit: the whole bank's month
BK = BANK
bank_stats = (typerow("network", "Transfers", "Graph"),
              section("Statistics", f'<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">{n(BK["nodes"])}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">{n(BK["edges"])}</span></div></div>'
                      + data("direction", "directed") + data("weak components", n(BK["stats"]["components"])) + data("isolated nodes", n(BK["stats"]["isolated"]))
                      + data("average links (count)", str(BK["stats"]["averageDegree"])) + data("max links (count)", n(BK["stats"]["maxDegree"])))
              + section("Connected components", arow(f'1 component: {n(BK["stats"]["componentSizes"][0])} nodes'))
              + style_stack(BK["alerts"]) + section("Export", "", f'<span class="k-icon-btn">{ic("plus")}</span>', " data-empty"))
NOTDRAWN = f'<div class="k-notdrawn k-num" style="border:0;margin:0;padding:0">{n(BK["nodes"])} nodes not drawn. <a>Narrow the graph...</a></div>'
def bank_app(right_html, left_body=None, chip_html=None, extra="", canvas_html=None, dock_html=None):
    lb = left_body if left_body is not None else graphs_section("Transfers", f'{n(BK["nodes"])} nodes') + sets_section([ALERTS_ROW(True, BK["alerts"])]) + views_section()
    return app(rail(), panel("Whole bank, August", chip_html or chip("Full graph"), lb, file=BK["file"]),
               (canvas_html or f'<div class="k-canvas"><div class="k-legend-card">{NOTDRAWN}</div>{toolbar()}<span class="k-help">{ic("circle-help")}</span></div>')
               + (dock_html or dock(["Nodes", "Edges"], "Nodes", f'Rule set Alerts: {n(BK["alerts"])} of {n(BK["nodes"])} nodes. Sorted by alertId.', ALERT_HEAD, alert_rows(first=0, count=9))),
               right_html, extra)
add("bank-open", "22. Variant: the whole bank's month, past the drawing limit",
    f'The same August, for the whole bank: {n(BK["nodes"])} accounts and {n(BK["edges"])} transfers, past the drawing limit. Nothing is drawn; the not-drawn line says so. The inspector\'s statistics and component list stand in for a picture, and the Alerts rule set ({n(BK["alerts"])} members) still lists the queue.',
    state("bank-open", bank_app(right(*bank_stats)), [
        note(330, 16, "Past the node drawing limit: an empty canvas with the not-drawn line and one action. state-matrix, Canvas, Partial; scale-levels 2.", 260),
        note(1200, 300, "Statistics and the component-size list are the aggregate view past the limit. scale-levels 2, Aggregate view.", 220)]))
tb = BK["topByDegreeWithNeighbors"]
narrow_pop = ('<div class="k-popover" style="left:300px;top:70px;width:300px"><div class="k-popover-head">Filter steps<span class="k-grow"></span><span class="k-icon-btn">' + ic("x") + '</span></div><div class="k-popover-body">'
              + prose("No steps. Every number describes the full graph.")
              + '<div class="k-group-head">Offered steps</div>'
              + f'<div class="k-row" data-described><span class="k-grow">Largest component<br><span class="k-secondary">{n(BK["stats"]["componentSizes"][0])} nodes: will not be drawn</span></span></div>'
              + f'<div class="k-row"><span class="k-grow">Top 1 by degree, with neighbors<br><span class="k-secondary">{n(tb["nodes"])} nodes: will not be drawn</span></span></div>'
              + prose("Neither fits under the drawing limit. Find an account and filter to its neighbors to start from it.")
              + f'<div class="k-row">{ic("plus")}<span class="k-grow">New filter step...</span></div></div></div>')
add("bank-narrow", "23. Variant: Narrow the graph... opens the filter steps",
    f'Narrow the graph... opens the filter chip\'s popover. Its offered steps count honestly: the largest component is the whole graph, and the top account by degree (a grocery chain with {n(BK["stats"]["maxDegree"])} counterparties) brings {n(tb["nodes"])}. Neither draws. On a transfer graph the way in is an account, which is how alert work starts anyway.',
    state("bank-narrow", bank_app(right(*bank_stats), chip_html=chip("Full graph", True), extra=narrow_pop), [
        note(620, 80, "The filter chip's popover: Offered steps above '+', each stating its size and whether it draws. state-matrix, Canvas, Partial; implementation-mapping 9, slice 6.", 260)]))
bc0, bc1 = BK["secondHopContributors"][0], BK["secondHopContributors"][1]
bank_rows = [(1, BK["seedHops"][0]["nodes"], BK["seedHops"][0]["edges"], ""), (2, BK["seedHops"][1]["nodes"], BK["seedHops"][1]["edges"], big_hop(bc0, bc1)),
             (3, BK["seedHops"][2]["nodes"], BK["seedHops"][2]["edges"], "Will not be drawn: past the drawing limit.")]
bank_seed = dict(SEED, degree=8)
add("bank-menu", "24. Variant: find the account with nothing drawn, and size its neighborhood",
    f'Nadia pastes {SEED["id"]} into Find. Nothing is drawn, but the hit is selected, its row is in the table and the inspector reads as before: the same 8 counterparties. The hop menu counts over the whole bank: 1 hop is still 9 nodes; 2 hops is {n(BK["seedHops"][1]["nodes"])}, mostly the two shops\' customers; 3 hops would not be drawn.',
    state("bank-menu", bank_app(right(*node_inspector(SEED, open_menu=True)), left_body=find_panel(SEED["id"], [hit(SEED, f'{SEED["kind"]}, {SEED["country"]}; in Alerts')]),
                               extra=hop_menu(SEED["id"], bank_rows, 1, ["Filter to neighbors", "Select neighbors"], ("cmd", "Filter to neighbors")),
                               dock_html=dock(["Nodes", "Edges"], "Nodes", f'Full graph: {n(BK["nodes"])} nodes, 1 selected.', NODE_HEAD, node_rows([SEED], sel=[SEED["id"]]))), [
        note(820, 470, "Past the limit, a hop row that would not draw says so, from the element's level. state-matrix 4.4.", 260)]))
add("bank-hop1", "25. Variant: one hop draws",
    f'Filter to neighbors, 1 hop: the step holds 9 accounts, under the limit, and it draws. The chip reads Filtered: 9 of {n(BK["nodes"])} nodes. From here the alert is worked exactly as on the smaller file.',
    state("bank-hop1", bank_app(right(*ins_s), chip_html=chip(f'Filtered: 9 of {n(BK["nodes"])} nodes'),
                               canvas_html=canvas("seed-hop1", "ACC-365386 and its 8 counterparties", "", legend(len(H1_ALERTED)), toast(f"Filter to {STEP_S}: 9 nodes")),
                               dock_html=dock(["Nodes", "Edges"], "Edges", f'Filtered graph: {len(H1["edges"])} of {n(BK["edges"])} edges. Sorted by amount, largest first.', EDGE_HEAD, edge_rows(H1["edges"][:10]))), []))

# Zoomed laptops: the key states at 1536 x 740 (125 percent scaling on a 1080p screen)
add("open-z", "1 at 1536 x 740", "State 1 on the reviewers' laptops: 1080p at 125 percent scaling leaves a 1536 x 740 viewport.", s_open(zoom=True))
add("seed-menu-z", "6 at 1536 x 740", "The hop menu at the short viewport: it still fits under its trigger.", s_seed(menu=True, zoom=True))
add("case-hop2-z", "15 at 1536 x 740", "Two hops at the short viewport.", case_hop2(zoom=True))
add("case-export-z", "19 at 1536 x 740", "The Export dialog at the short viewport: its body scrolls, its footer stays.", case_export(zoom=True))

GROUPS = [("The triage: Nadia works the alert queue", ["open", "open-points", "tuition-find", "tuition-hop1", "tuition-clear", "seed-find", "seed-menu", "seed-selected", "seed-hop1", "seed-own", "seed-refer", "seed-evidence", "next-delete", "next", "file"]),
          ("The escalated case: Sarah, over three days", ["case-open", "case-trace-menu", "case-trace", "case-menu", "case-hop2", "case-distractor", "case-ring", "case-path", "case-export"]),
          ("Variants", ["rule", "rule-find", "bank-open", "bank-narrow", "bank-menu", "bank-hop1"]),
          ("At 1536 x 740", ["open-z", "seed-menu-z", "case-hop2-z", "case-export-z"])]
page("alert-triage.html", "Alert triage on the August transfers",
     "Screens for the alert triage storyboard. A level-1 reviewer clears one alert and refers another from a queue of 50, most of them benign; a level-2 investigator works the referred one into a ring over three days; and two variants: a hunt that starts from a rule, and the same month for the whole bank, past the drawing limit. Every number comes from kit/alerts.json. Light or dark follows your system.",
     S, GROUPS)
