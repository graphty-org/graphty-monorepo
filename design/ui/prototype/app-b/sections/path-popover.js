/* Path popover: the one interface for a path (spec 2.3). One light popover above the toolbar,
   "Path between", with From, To, Direction (directed graphs only), Weight and its meaning, and Scope.
   Scope is a third pick field: the whole graph as drawn (what the filters leave), or a set or group
   picked on the canvas or typed, so the path stays inside it. Opened by the selection bar's Path between, P and Analyze > Find paths. One footer button, Find
   path, because it creates a row; Esc, X or a click outside close it. Most flow and Weakest cut are
   Analyze entries, not here. A pick field, while active, turns the canvas into a pick target (a
   crosshair and one hint line) and also takes a typed name, so the keyboard can pick too.
   Weight opens on the attribute set at load ("amount (set at load)"), as every run does, and is read
   by the kind it was declared with: a distance is summed; a similarity (Stronger) is never summed as a
   distance, the route uses its inverse and says so ("Stronger links count as shorter"); a capacity
   takes the widest route; a weight with no declared kind is summed and labeled as a sum. The other
   choice is "None (fewest steps)". A found path states its step count and a summary named after the
   weight attribute ("Sum of amount along the path: 22,397.82"; a capacity its smallest step, a
   similarity its weakest step). When routes tie, the bar says so and adds a
   "Route 1 of 2" stepper (previous and next, arrow keys while it has focus).
   Under Weight, one line says how many edges have no value for the weight and are left
   out of a weighted path. On data with a time column, Direction also offers Follow time order
   (needs graphty-element). A found path keeps its hops in path order (the path inspector lists them
   with their dates); a hop dated earlier than the hop before it is flagged on the result bar ("Not in
   time order: step 2 (7 Mar) is earlier than step 1 (9 Mar)"), and a path whose dates run forward says "Dates in order". On Les Miserables the found path's
   suggested layer is a highlight (scoped to isInPath == true): it draws the highlight mark (a dashed
   two-tone ring on its nodes, a dashed casing on its edges) and writes no color, so every color under
   it stays; nothing else is dimmed. The path is also selected (the selection rings on its nodes).
   Plain ASCII. */
(function () {
    "use strict";
    const CSS = [
        ".pp-full.k-field { cursor: pointer; width: 100%; box-sizing: border-box; }",
        ".pp-pick .pp-empty { color: var(--cm-text-tertiary); }",
        ".pp-pick input { all: unset; flex: 1; min-width: 0; font: inherit; color: var(--cm-text); }",
        ".pp-pick input::placeholder { color: var(--cm-text-tertiary); }",
        ".pp-col { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; width: 100%; }",
        ".pp-col .k-seg > * { white-space: nowrap; }",
        ".pp-loaded { color: var(--cm-text-tertiary); font-size: 11px; line-height: 16px; }",
        ".pp-result { height: auto; min-height: 32px; padding: 4px 8px 4px 12px; gap: 8px; font-size: 13px; color: var(--cm-text); }",
        ".pp-result .pp-step { display: inline-flex; align-items: center; gap: 2px; border-radius: 6px; }",
        ".pp-result .pp-step:focus-visible { outline: 2px solid var(--cm-border-selected); outline-offset: 2px; }",
        ".pp-result .pp-of { min-width: 76px; text-align: center; color: var(--cm-text-secondary, var(--cm-text)); }",
        ".pp-catch { position: absolute; cursor: crosshair; }",
        ".pp-hint { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 6px;",
        "  padding: 4px 10px; border-radius: 6px; background: var(--cm-bg); color: var(--cm-text);",
        "  box-shadow: var(--cm-elevation-200); white-space: nowrap; pointer-events: none; }",
    ].join("\n");

    // The fixture ends and settings for each graph. Les Miserables is undirected, so Direction hides.
    // The set Scope can pick on the canvas: one the project's tree holds (none on a project with no sets yet)
    function scopeSet(ds) {
        if (ds === "transactions") return AB.fx.datasets.transactions.setsAndPaths.intersection.name;
        return !ds || ds === "lesmis" ? "Watchlist" : null;
    }
    function setup(state) {
        const L = AB.fx.datasets.lesmis, T = AB.fx.datasets.transactions, ds = AB.route && AB.route.frame.dataset;
        if (ds === "doorEntries") {
            // The door entries as loaded: nothing selected, so From waits for a pick; the weight is count under Pair, none otherwise
            const D = AB.fx.datasets.doorEntries, w = D.loadedWeight();
            const names = [...new Set(D.tables[0].sample.map((r) => r.name))].concat(D.tables[1].sample.map((r) => r.bldg));
            return {
                directed: true, unit: "nodes", count: D.loadedTypes().total, from: null, to: null, fromIcon: "user", toIcon: "user",
                loaded: w ? { weight: w, meaning: "stronger", desc: "Entries per person and building" } : { weight: null, meaning: "stronger", desc: "No weight was chosen when the data was loaded" },
                weights: w ? [w] : [], direction: "either", names, pickFrom: names[0], pickTo: names.includes("Priya Nair") ? "Priya Nair" : names[1],
            };
        }
        if (ds === "wide" || ds === "nested" || ds === "plainJson") {
            // a loaded project: From is the node the inspector shows, To waits for a pick; the weight is the one set at load
            const D = AB.fx.datasets[ds], names = AB.walkList(ds).map((x) => x.name);
            const head = document.querySelector("#ab-right .ab-insp-head .k-name");
            const from = (AB.walked && AB.walked.dataset === ds && AB.walked.name) || (head && names.includes(head.textContent.trim()) ? head.textContent.trim() : null);
            const w = ds === "wide" ? "bytes_total_24h" : ds === "plainJson" ? "weight" : AB.nestedLoaded().weight;
            const directed = ds === "nested" ? AB.nestedLoaded().direction === "directed" : !!D.directed;
            return {
                directed, unit: "nodes", count: names.length, from, to: null, fromIcon: "circle-dot", toIcon: "circle-dot",
                loaded: w ? { weight: w, meaning: "stronger", desc: "Chosen when the data was loaded" } : { weight: null, meaning: "stronger", desc: "No weight was chosen when the data was loaded" },
                weights: w ? [w] : [], direction: directed ? "follow" : "either", names, pickFrom: names[0], pickTo: names[1],
            };
        }
        if (state === "transfers-directed" || ds === "transactions") {
            const P = T.setsAndPaths.path;
            // From is the account selected (the canvas walk or a table row), else it waits for a pick; the
            // weight's meaning is the one set at load, as the graph inspector and Analyze say ("amount, stronger")
            const W = AB.walked && AB.walked.dataset === "transactions" ? AB.walked.name : null;
            return {
                directed: true, unit: "accounts", count: T.nodes,
                from: W, to: null, fromIcon: "building-2", toIcon: "user",
                loaded: { weight: "amount", meaning: "stronger", desc: "Amount per transfer" }, weights: ["amount"], direction: "follow",
                // every account the fixtures name (the sample rows, the paths' routes, the flagged ring), not only the 40 sample rows
                names: [...new Set(T.rows.map((r) => r.id).concat(JSON.stringify(T).match(/ACC-\d+/g) || []))], pickFrom: P.from.id, pickTo: P.to.id,
            };
        }
        const two = state !== "from-analyze";
        if (state === "no-path") {
            // "Filter out group 8" alone leaves 64 nodes in 4 parts; Child1 reached Valjean only through Gavroche (group 8)
            const st = L.filterSteps.steps[2], left = L.filterSteps.statsByState["3"];
            return {
                directed: false, unit: "nodes", count: left.nodes, from: "Valjean", to: "Child1", noPathTo: "Child1", filter: st, fromIcon: "user", toIcon: "user",
                loaded: { weight: "value", meaning: "stronger", desc: "Co-appearances per pair" }, weights: ["value"], direction: "either",
                names: L.rows.filter((r) => r.group !== 8).map((r) => r.label), pickFrom: "Valjean", pickTo: "Javert",
            };
        }
        return {
            directed: !!L.directed, unit: "nodes", count: L.nodes,
            from: two ? "Valjean" : null, to: two && state !== "picking-to" ? "Javert" : null, fromIcon: "user", toIcon: "user",
            loaded: { weight: "value", meaning: "stronger", desc: "Co-appearances per pair" }, weights: ["value"], direction: "either",
            names: L.rows.map((r) => r.label), pickFrom: "Valjean", pickTo: "Javert",
        };
    }

    // The edges a path can run on: what the fixture holds of each project's edge list (the
    // transfers on the fixture's routes and the CSV's first rows; Les Miserables' Javert -- Valjean,
    // value 17, the edge inspector's row). ponytail: a pair these do not join finds no route and the
    // bar stays away; a full edge list in kit/fixtures.json would let any two ends find one.
    // Les Miserables' 254 edges with their value (the published graph, as kit/fixtures.json's degrees
    // count it: graphty-element/examples/data/miserables.json), "source,target,value;..."
    const LM_EDGES = "Napoleon,Myriel,1;Mlle.Baptistine,Myriel,8;Mme.Magloire,Myriel,10;Mme.Magloire,Mlle.Baptistine,6;CountessdeLo,Myriel,1;Geborand,Myriel,1;Champtercier,Myriel,1;Cravatte,Myriel,1;Count,Myriel,2;OldMan,Myriel,1;Valjean,Labarre,1;Valjean,Mme.Magloire,3;Valjean,Mlle.Baptistine,3;Valjean,Myriel,5;Marguerite,Valjean,1;Mme.deR,Valjean,1;Isabeau,Valjean,1;Gervais,Valjean,1;Listolier,Tholomyes,4;Fameuil,Tholomyes,4;Fameuil,Listolier,4;Blacheville,Tholomyes,4;Blacheville,Listolier,4;Blacheville,Fameuil,4;Favourite,Tholomyes,3;Favourite,Listolier,3;Favourite,Fameuil,3;Favourite,Blacheville,4;Dahlia,Tholomyes,3;Dahlia,Listolier,3;Dahlia,Fameuil,3;Dahlia,Blacheville,3;Dahlia,Favourite,5;Zephine,Tholomyes,3;Zephine,Listolier,3;Zephine,Fameuil,3;Zephine,Blacheville,3;Zephine,Favourite,4;Zephine,Dahlia,4;Fantine,Tholomyes,3;Fantine,Listolier,3;Fantine,Fameuil,3;Fantine,Blacheville,3;Fantine,Favourite,4;Fantine,Dahlia,4;Fantine,Zephine,4;Fantine,Marguerite,2;Fantine,Valjean,9;Mme.Thenardier,Fantine,2;Mme.Thenardier,Valjean,7;Thenardier,Mme.Thenardier,13;Thenardier,Fantine,1;Thenardier,Valjean,12;Cosette,Mme.Thenardier,4;Cosette,Valjean,31;Cosette,Tholomyes,1;Cosette,Thenardier,1;Javert,Valjean,17;Javert,Fantine,5;Javert,Thenardier,5;Javert,Mme.Thenardier,1;Javert,Cosette,1;Fauchelevent,Valjean,8;Fauchelevent,Javert,1;Bamatabois,Fantine,1;Bamatabois,Javert,1;Bamatabois,Valjean,2;Perpetue,Fantine,1;Simplice,Perpetue,2;Simplice,Valjean,3;Simplice,Fantine,2;Simplice,Javert,1;Scaufflaire,Valjean,1;Woman1,Valjean,2;Woman1,Javert,1;Judge,Valjean,3;Judge,Bamatabois,2;Champmathieu,Valjean,3;Champmathieu,Judge,3;Champmathieu,Bamatabois,2;Brevet,Judge,2;Brevet,Champmathieu,2;Brevet,Valjean,2;Brevet,Bamatabois,1;Chenildieu,Judge,2;Chenildieu,Champmathieu,2;Chenildieu,Brevet,2;Chenildieu,Valjean,2;Chenildieu,Bamatabois,1;Cochepaille,Judge,2;Cochepaille,Champmathieu,2;Cochepaille,Brevet,2;Cochepaille,Chenildieu,2;Cochepaille,Valjean,2;Cochepaille,Bamatabois,1;Pontmercy,Thenardier,1;Boulatruelle,Thenardier,1;Eponine,Mme.Thenardier,2;Eponine,Thenardier,3;Anzelma,Eponine,2;Anzelma,Thenardier,2;Anzelma,Mme.Thenardier,1;Woman2,Valjean,3;Woman2,Cosette,1;Woman2,Javert,1;MotherInnocent,Fauchelevent,3;MotherInnocent,Valjean,1;Gribier,Fauchelevent,2;Mme.Burgon,Jondrette,1;Gavroche,Mme.Burgon,2;Gavroche,Thenardier,1;Gavroche,Javert,1;Gavroche,Valjean,1;Gillenormand,Cosette,3;Gillenormand,Valjean,2;Magnon,Gillenormand,1;Magnon,Mme.Thenardier,1;Mlle.Gillenormand,Gillenormand,9;Mlle.Gillenormand,Cosette,2;Mlle.Gillenormand,Valjean,2;Mme.Pontmercy,Mlle.Gillenormand,1;Mme.Pontmercy,Pontmercy,1;Mlle.Vaubois,Mlle.Gillenormand,1;Lt.Gillenormand,Mlle.Gillenormand,2;Lt.Gillenormand,Gillenormand,1;Lt.Gillenormand,Cosette,1;Marius,Mlle.Gillenormand,6;Marius,Gillenormand,12;Marius,Pontmercy,1;Marius,Lt.Gillenormand,1;Marius,Cosette,21;Marius,Valjean,19;Marius,Tholomyes,1;Marius,Thenardier,2;Marius,Eponine,5;Marius,Gavroche,4;BaronessT,Gillenormand,1;BaronessT,Marius,1;Mabeuf,Marius,1;Mabeuf,Eponine,1;Mabeuf,Gavroche,1;Enjolras,Marius,7;Enjolras,Gavroche,7;Enjolras,Javert,6;Enjolras,Mabeuf,1;Enjolras,Valjean,4;Combeferre,Enjolras,15;Combeferre,Marius,5;Combeferre,Gavroche,6;Combeferre,Mabeuf,2;Prouvaire,Gavroche,1;Prouvaire,Enjolras,4;Prouvaire,Combeferre,2;Feuilly,Gavroche,2;Feuilly,Enjolras,6;Feuilly,Prouvaire,2;Feuilly,Combeferre,5;Feuilly,Mabeuf,1;Feuilly,Marius,1;Courfeyrac,Marius,9;Courfeyrac,Enjolras,17;Courfeyrac,Combeferre,13;Courfeyrac,Gavroche,7;Courfeyrac,Mabeuf,2;Courfeyrac,Eponine,1;Courfeyrac,Feuilly,6;Courfeyrac,Prouvaire,3;Bahorel,Combeferre,5;Bahorel,Gavroche,5;Bahorel,Courfeyrac,6;Bahorel,Mabeuf,2;Bahorel,Enjolras,4;Bahorel,Feuilly,3;Bahorel,Prouvaire,2;Bahorel,Marius,1;Bossuet,Marius,5;Bossuet,Courfeyrac,12;Bossuet,Gavroche,5;Bossuet,Bahorel,4;Bossuet,Enjolras,10;Bossuet,Feuilly,6;Bossuet,Prouvaire,2;Bossuet,Combeferre,9;Bossuet,Mabeuf,1;Bossuet,Valjean,1;Joly,Bahorel,5;Joly,Bossuet,7;Joly,Gavroche,3;Joly,Courfeyrac,5;Joly,Enjolras,5;Joly,Feuilly,5;Joly,Prouvaire,2;Joly,Combeferre,5;Joly,Mabeuf,1;Joly,Marius,2;Grantaire,Bossuet,3;Grantaire,Enjolras,3;Grantaire,Combeferre,1;Grantaire,Courfeyrac,2;Grantaire,Joly,2;Grantaire,Gavroche,1;Grantaire,Bahorel,1;Grantaire,Feuilly,1;Grantaire,Prouvaire,1;MotherPlutarch,Mabeuf,3;Gueulemer,Thenardier,5;Gueulemer,Valjean,1;Gueulemer,Mme.Thenardier,1;Gueulemer,Javert,1;Gueulemer,Gavroche,1;Gueulemer,Eponine,1;Babet,Thenardier,6;Babet,Gueulemer,6;Babet,Valjean,1;Babet,Mme.Thenardier,1;Babet,Javert,2;Babet,Gavroche,1;Babet,Eponine,1;Claquesous,Thenardier,4;Claquesous,Babet,4;Claquesous,Gueulemer,4;Claquesous,Valjean,1;Claquesous,Mme.Thenardier,1;Claquesous,Javert,1;Claquesous,Eponine,1;Claquesous,Enjolras,1;Montparnasse,Javert,1;Montparnasse,Babet,2;Montparnasse,Gueulemer,2;Montparnasse,Claquesous,2;Montparnasse,Valjean,1;Montparnasse,Gavroche,1;Montparnasse,Eponine,1;Montparnasse,Thenardier,1;Toussaint,Cosette,2;Toussaint,Javert,1;Toussaint,Valjean,1;Child1,Gavroche,2;Child2,Gavroche,2;Child2,Child1,3;Brujon,Babet,3;Brujon,Gueulemer,3;Brujon,Thenardier,3;Brujon,Gavroche,1;Brujon,Eponine,1;Brujon,Claquesous,1;Brujon,Montparnasse,1;Mme.Hucheloup,Bossuet,1;Mme.Hucheloup,Joly,1;Mme.Hucheloup,Grantaire,1;Mme.Hucheloup,Bahorel,1;Mme.Hucheloup,Courfeyrac,1;Mme.Hucheloup,Gavroche,1;Mme.Hucheloup,Enjolras,1";
    let lmEdges = null;
    function edgesOf(ds) {
        if (!ds || ds === "lesmis") return lmEdges || (lmEdges = LM_EDGES.split(";").map((x) => { const [source, target, v] = x.split(","); return { source, target, w: { value: Number(v) } }; }));
        if (ds !== "transactions") return [];
        const T = AB.fx.datasets.transactions, P = T.setsAndPaths.path, seen = new Map();
        const add = (s, t, amount, timestamp) => { const k = s + ">" + t + ">" + timestamp; if (!seen.has(k)) seen.set(k, { source: s, target: t, amount, timestamp, w: { amount } }); };
        P.routes.forEach((r) => r.transfers.forEach((x) => add(x.source, x.target, x.amount, x.timestamp)));
        (T.firstRows || []).forEach((x) => add(x.from_account, x.to_account, Number(x.amount), x.timestamp));
        return [...seen.values()];
    }
    // The weight's declared kind, from the meaning words the Data page and Analyze use
    // (Stronger, Farther, Capacity); anything else is a weight with no declared kind.
    const KIND = { farther: "distance", stronger: "similarity", capacity: "capacity" };
    // A hop's date as the path inspector writes it ("4 Mar")
    const day = (ts) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    // Hops dated earlier than the hop before them, in path order: graphty-element reports this with the
    // path result; ponytail: read here from the fixture's transfers until it does.
    function timeFlags(edges) {
        return edges.map((e, k) => (k > 0 && e.timestamp && edges[k - 1].timestamp && e.timestamp < edges[k - 1].timestamp
            ? "step " + (k + 1) + " (" + day(e.timestamp) + ") is earlier than step " + k + " (" + day(edges[k - 1].timestamp) + ")" : null)).filter(Boolean);
    }
    // A value in the column's own precision (amount has cents, value is whole): no currency case
    function fmt(v, vals) {
        const d = Math.max(0, ...vals.map((x) => (String(x).split(".")[1] || "").length));
        return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    // The routes from p.from to p.to on the project's edges, read by p's weight and its kind and by
    // p.direction ("follow" keeps to the edges' direction), cheapest first; the ties all come back.
    // A stand-in for graphty-element's path result, which reports the route, its cost and its ties.
    // ponytail: every simple path is tried, fine for the fixture's handful of edges; Dijkstra when a full edge list lands.
    function cheapest(adj, from, to, cost) {
        const dist = new Map([[from, 0]]), pred = new Map([[from, []]]), done = new Set();
        for (;;) {
            let u = null;
            dist.forEach((v, k) => { if (!done.has(k) && (u === null || v < dist.get(u))) u = k; });
            if (u === null || u === to) break;
            done.add(u);
            (adj.get(u) || []).forEach(([b, e]) => {
                const c = cost(e);
                if (c == null || done.has(b)) return;
                const nd = dist.get(u) + c, od = dist.get(b);
                if (od === undefined || nd < od - 1e-9) { dist.set(b, nd); pred.set(b, [[u, e]]); } else if (Math.abs(nd - od) < 1e-9) pred.get(b).push([u, e]);
            });
        }
        if (!dist.has(to)) return [];
        const out = [], back = (at, nodes, edges) => {
            if (out.length >= 20) return; // ponytail: at most 20 tied routes listed
            if (at === from) { out.push({ nodes: [from, ...nodes], edges }); return; }
            pred.get(at).forEach(([u, e]) => back(u, [at, ...nodes], [e, ...edges]));
        };
        back(to, [], []);
        return out;
    }
    // What each node on a route received and sent along this trace, read from the edges' own direction
    // (not the order the route walks them, which runs against the edges on an Either way trace), in the
    // weight attribute's name and unit as the data declares them; no currency case. Only on a directed
    // graph, where in and out mean something. graphty-element returns this with the path result;
    // ponytail: computed here from the fixture's edges until it does.
    function flowsOf(r, p) {
        const col = p.weight || p.loaded, D = AB.fx.datasets[p.ds || "lesmis"];
        if (!col || !D || !D.directed) return null;
        const f = AB.fieldsOf(p.ds).filter((g) => g.element === "edge").flatMap((g) => g.fields).find((x) => x.name === col);
        const unit = f && f.unit ? " " + f.unit : "", vals = r.edges.map((e) => e.w[col]).filter((v) => v != null);
        const tot = (es) => es.reduce((a, e) => a + (e.w[col] || 0), 0);
        return r.nodes.map((node) => {
            const got = tot(r.edges.filter((e) => e.target === node)), sent = tot(r.edges.filter((e) => e.source === node));
            const said = [got ? "in " + fmt(got, vals) + unit : null, sent ? "out " + fmt(sent, vals) + unit : null].filter(Boolean).join(" / ");
            return { node, col, in: got, out: sent, text: said ? col + " " + said + ", this trace" : "" };
        });
    }
    function solve(p) {
        const col = p.weight, kind = col ? KIND[p.meaning] || null : null, adj = new Map();
        const link = (a, b, e) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, e]); };
        edgesOf(p.ds).forEach((e) => { link(e.source, e.target, e); if (p.direction !== "follow") link(e.target, e.source, e); });
        const all = [], walk = (at, nodes, edges) => {
            if (at === p.to) return all.push({ nodes: nodes.slice(), edges: edges.slice() });
            (adj.get(at) || []).forEach(([b, e]) => { if (nodes.includes(b) || (col && e.w[col] == null)) return; nodes.push(b); edges.push(e); walk(b, nodes, edges); nodes.pop(); edges.pop(); });
        };
        // An additive cost (steps, 1/w, w) on a graph of any size: Dijkstra, keeping every tied predecessor so
        // the ties come back; a capacity (the widest route) on the transfers' handful of edges: every simple path
        const step = (e) => (!col ? 1 : e.w[col] == null ? null : kind === "similarity" ? 1 / e.w[col] : e.w[col]);
        if (p.from && p.to && p.from !== p.to) {
            if (kind === "capacity") walk(p.from, [p.from], []);
            else all.push(...cheapest(adj, p.from, p.to, step));
        }
        // what the route minimizes: steps with no weight; 1/w summed for a similarity; the smallest step,
        // negated, for a capacity (the widest route); the plain sum for a distance or no declared kind
        const sum = (w) => w.reduce((a, b) => a + b, 0);
        const cost = (w) => (!col ? w.length : kind === "similarity" ? sum(w.map((x) => 1 / x)) : kind === "capacity" ? -Math.min(...w) : sum(w));
        const ws = (r) => r.edges.map((e) => e.w[col]);
        const best = Math.min(...all.map((r) => cost(col ? ws(r) : r.edges)));
        const say = (w) => (!col ? ""
            : kind === "capacity" ? "Smallest " + col + " on the path: " + fmt(Math.min(...w), w)
            : kind === "similarity" ? "Weakest " + col + " on the path: " + fmt(Math.min(...w), w)
            : "Sum of " + col + " along the path: " + fmt(sum(w), w));
        // a tie opens on the fixture's asDistance route, as the path inspector does
        const first = p.ds === "transactions" ? AB.fx.datasets.transactions.setsAndPaths.path.asDistance.route.join() : "";
        return all.filter((r) => Math.abs(cost(col ? ws(r) : r.edges) - best) < 1e-9).sort((a, b) => (b.nodes.join() === first) - (a.nodes.join() === first)).map((r) => ({
            // route, hops, transfers and dollars: the shape of the fixture's path result, which the path inspector reads
            route: r.nodes, hops: r.edges.length, transfers: r.edges.filter((e) => e.amount != null).map(({ source, target, amount, timestamp }) => ({ source, target, amount, timestamp })),
            dollars: p.ds === "transactions" ? Math.round(sum(r.edges.map((e) => e.amount)) * 100) / 100 : undefined,
            steps: r.edges.length, col, text: col ? say(ws(r)) : "", late: timeFlags(r.edges), timed: r.edges.some((e) => e.timestamp),
            flows: flowsOf(r, p),
        }));
    }
    // A found path: its ends and settings, its name after its ends, its routes that tie, and the one
    // route the tree, the canvas and the path inspector show (the first; the result bar opens on it)
    // The transfers' path found with Weight None: two routes tie (found-tied, and the path inspector's path-tied)
    AB.tiedPath = () => withRoutes(Object.assign({}, foundPath("transactions"), { weight: null, routes: null }));
    function withRoutes(p) {
        const routes = solve(p);
        return Object.assign(p, { name: p.from + " to " + p.to, routes, route: routes[0] || null });
    }
    // The path the last Find path added on this project, or the fixture's own
    function foundPath(ds) {
        const lp = AB.lastPath && (AB.lastPath.ds || "lesmis") === (ds || "lesmis") ? AB.lastPath : null;
        if (lp) return lp.routes ? lp : withRoutes(lp);
        const P = AB.fx.datasets.transactions.setsAndPaths.path;
        return withRoutes(ds === "transactions" ? { ds, from: P.from.id, to: P.to.id, weight: "amount", meaning: "farther", loaded: "amount", direction: "follow" }
            : { ds: "lesmis", from: "Valjean", to: "Javert", weight: "value", meaning: "stronger", loaded: "value", direction: "either" });
    }
    // The result bar above the toolbar: "3 steps. Sum of amount along the path: 22,397.82", and
    // "2 routes tie" with the stepper only on a tie
    function resultBar(ds) {
        const routes = foundPath(ds).routes, dock = document.getElementById("ab-toolbar");
        if (!routes.length || !dock) return;
        const line = h("span", { "aria-live": "polite" });
        const of = h("span", { class: "pp-of" });
        const late = AB.needsElement("graphty-element's path result reports each hop's date and flags a hop earlier than the one before it");
        const show = () => {
            const i = Math.min(AB.pathRouteAt || 0, routes.length - 1), r = routes[i];
            line.textContent = AB.count(r.steps, "step") + (r.col ? ". " + r.text : "") + (routes.length > 1 ? ". " + AB.count(routes.length, "route") + " tie" : "")
                // on data with a time column the line always says how the dates run, so "in order" is told apart from "not checked"
                + (r.late.length ? ". Not in time order: " + r.late.join("; ") + "." : r.timed ? ". Dates in order" : "");
            late.style.display = r.timed ? "" : "none";
            of.textContent = "Route " + (i + 1) + " of " + routes.length;
        };
        // the route on screen is shared with the path inspector (AB.setPathRoute redraws it and tells this bar)
        const step = (d) => { const i = ((AB.pathRouteAt || 0) + d + routes.length) % routes.length; if (AB.setPathRoute) AB.setPathRoute(i); else { AB.pathRouteAt = i; show(); } };
        const onRoute = () => { if (line.isConnected) show(); else document.removeEventListener("ab-path-route", onRoute); };
        document.addEventListener("ab-path-route", onRoute);
        const stepper = routes.length > 1 ? h("span", { class: "pp-step", role: "group", tabindex: "0", "aria-label": "Routes that tie on cost: arrow keys step" },
            AB.iconButton("chevron-left", "Previous route", { onClick: () => step(-1) }), of, AB.iconButton("chevron-right", "Next route", { onClick: () => step(1) })) : null;
        if (stepper) stepper.addEventListener("keydown", (e) => {
            const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
            if (!d) return;
            e.preventDefault(); e.stopPropagation(); step(d);
        });
        show();
        dock.prepend(h("div", { class: "k-toolbar pp-result", role: "group", "aria-label": "Path found" }, icon("route", "sm"), line, late, stepper ? h("span", { class: "k-toolbar-sep" }) : null, stepper));
    }

    // The found path on Les Miserables, as the at-rest canvas draws it (one node size) with two marks
    // on top and no color changed: the path row's highlight layer (the highlight mark, outside every
    // color channel, so the PageRank colors under it stay) and the selection (the selection rings on
    // its nodes). The mark's two tones are the selection ring's pair in the same band order, read per
    // theme from the kit drawing that marks Valjean; the highlight band sits just outside the
    // selection band, dashed (highlight 1: long dash). The at-rest drawing's node circles are in row
    // order, so it says where each character is drawn.
    const DASH = "6 3";
    let spots = null;
    const rings = {};
    const parse = (t) => new DOMParser().parseFromString(t, "image/svg+xml");
    const spotsReady = Promise.all([
        fetch("kit/canvas/lesmis-groups-rest-light.svg").then((r) => r.text()).then((t) => {
            spots = [...parse(t).querySelectorAll("circle")].filter((c) => c.getAttribute("fill") !== "none").map((c) => [c.getAttribute("cx"), c.getAttribute("cy")]);
        }),
        ...["light", "dark"].map((th) => fetch("kit/canvas/lesmis-groups-valjean-" + th + ".svg").then((r) => r.text()).then((t) => {
            const doc = parse(t), V = [...doc.querySelectorAll("circle")].find((c) => c.getAttribute("cx") === "698.7" && c.getAttribute("cy") === "394.3" && c.getAttribute("fill") !== "none");
            if (V) rings[th] = [...doc.querySelectorAll("circle[stroke-width='2']")].filter((c) => c.getAttribute("cx") === "698.7").map((c) => ({ stroke: c.getAttribute("stroke"), dr: +c.getAttribute("r") - +V.getAttribute("r") }));
        })),
    ]).catch(() => {});
    function drawPathSelected(nodes) {
        const cv = document.getElementById("ab-canvas"), imgs = cv ? cv.querySelectorAll(".k-stage img") : [];
        if (!spots || !rings.light) { spotsReady.then(() => { if (spots && rings.light && AB.route && AB.route.id === "path-popover") drawPathSelected(nodes); }); return; }
        if (!imgs.length || !AB.lesmisDrawing || !nodes) return;
        const rows = AB.fx.datasets.lesmis.rows, spotOf = (n) => spots[rows.findIndex((r) => r.label === n)];
        if (nodes.some((n) => !spotOf(n))) return;
        const after = (doc, theme) => {
            const fills = [...doc.querySelectorAll("circle")].filter((c) => c.getAttribute("fill") !== "none");
            const fillAt = (n) => { const [x, y] = spotOf(n); return fills.find((c) => c.getAttribute("cx") === x && c.getAttribute("cy") === y); };
            const pts = nodes.map(fillAt);
            if (pts.some((c) => !c)) return;
            const ns = "http://www.w3.org/2000/svg", top = doc.documentElement, pair = rings[theme] || rings.light;
            const mk = (tag, at) => { const k = doc.createElementNS(ns, tag); at.forEach(([n, v]) => k.setAttribute(n, v)); return k; };
            // edges: a dashed two-tone casing under the edge's own stroke, which keeps its color
            pts.slice(1).forEach((b, k) => {
                const a = pts[k], ax = a.getAttribute("cx"), ay = a.getAttribute("cy"), bx = b.getAttribute("cx"), by = b.getAttribute("cy");
                const line = [...doc.querySelectorAll("line")].find((l) => (l.getAttribute("x1") === ax && l.getAttribute("y1") === ay && l.getAttribute("x2") === bx && l.getAttribute("y2") === by) || (l.getAttribute("x1") === bx && l.getAttribute("y1") === by && l.getAttribute("x2") === ax && l.getAttribute("y2") === ay));
                if (!line) return;
                const ends = ["x1", "y1", "x2", "y2"].map((n) => [n, line.getAttribute(n)]);
                [[pair[pair.length - 1].stroke, "6"], [pair[0].stroke, "3"]].forEach(([stroke, w]) => line.before(mk("line", ends.concat([["stroke", stroke], ["stroke-width", w], ["stroke-dasharray", DASH], ["stroke-opacity", "1"]]))));
            });
            pts.forEach((c) => {
                const r = +c.getAttribute("r"), at = [["cx", c.getAttribute("cx")], ["cy", c.getAttribute("cy")], ["fill", "none"]];
                // the selection band (two tones, 2 + 2 px)
                pair.forEach(({ stroke, dr }) => top.append(mk("circle", at.concat([["r", String(r + dr)], ["stroke", stroke], ["stroke-width", "2"]]))));
                // the highlight band just outside it (two tones, 1.5 + 1.5 px, long dash, same band order)
                const out = Math.max(...pair.map((x) => x.dr)) + 1;
                pair.forEach(({ stroke }, i) => top.append(mk("circle", at.concat([["r", String(r + out + 0.75 + 1.5 * i)], ["stroke", stroke], ["stroke-width", "1.5"], ["stroke-dasharray", DASH]]))));
            });
        };
        Object.defineProperty(after, "name", { value: "path-highlight-" + nodes.join("|") });
        AB.lesmisDrawing("lesmis-groups-onesize", "Les Miserables colored by PageRank; the path " + nodes.join(", ") + " highlighted with a dashed ring and selected, every color unchanged", null, after).forEach((img, i) => { if (imgs[i]) imgs[i].replaceWith(img); });
    }

    function render(el, state) {
        if (!document.getElementById("pp-css")) document.head.append(h("style", { id: "pp-css" }, CSS));
        if (state === "found" || state === "found-tied" || state === "found-out-of-time") {
            // The selected path row and its inspector confirm the result; the notice offers only Undo,
            // which goes back to the project's tree as it was before the path
            const ds = AB.route && AB.route.frame.dataset;
            const undo = ds && ds !== "lesmis" ? ["graph-place", AB.placeOf(ds, "graph") || "at-rest"] : ["path-popover", "from-selection"];
            // a path the tree already holds (the at-rest Shortest paths) is selected, not added again
            const lp = AB.lastPath, have = (!ds || ds === "lesmis") && lp && (lp.ds || "lesmis") === "lesmis" && ["Valjean to Javert", "Myriel to Javert"].includes(lp.name);
            el.append(have ? AB.notice(lp.name + " is already in Shortest paths; it is selected") : AB.notice("Found " + foundPath(ds).name, { label: "Undo", go: undo }));
            resultBar(ds);
            if (!ds || ds === "lesmis") {
                // the route on screen is the one the result bar and the path inspector show (AB.pathRouteAt)
                const draw = () => { const p = foundPath(ds), rs = p.routes && p.routes.length ? p.routes : [p.route], r = rs[Math.min(AB.pathRouteAt || 0, rs.length - 1)]; drawPathSelected(r && r.route); };
                draw();
                const onRoute = () => { if (AB.route && AB.route.id === "path-popover" && AB.route.state === state) draw(); else document.removeEventListener("ab-path-route", onRoute); };
                document.addEventListener("ab-path-route", onRoute);
            }
            return;
        }
        const s = setup(state);
        // The Weight starts as the weight chosen when the data was loaded, with its meaning; any other
        // pick overrides this path run only and is recorded in its Made with, never in the data.
        s.weight = s.loaded.weight; s.meaning = s.loaded.meaning;
        s.scope = null; s.set = scopeSet(AB.route && AB.route.frame.dataset);
        if (state === "weight-overridden") { s.weight = null; }
        let active = state === "picking-to" ? "to" : state === "from-analyze" || !s.from ? "from" : !s.to ? "to" : null;
        const host = h("div");
        el.append(host);

        // the anchor: the selection bar's Path between, else the toolbar's Analyze (P and Find paths)
        const anchor = () => document.querySelector("#ab-toolbar [aria-label^='Path between']") || document.querySelector("[data-tool=Analyze]");

        function pickField(which) {
            const val = s[which], on = active === which;
            const label = { from: "From", to: "To", scope: "Scope" }[which];
            // Armed, the field is the text box itself (a click anywhere on it types there); otherwise a button that arms it
            const f = on ? h("span", { class: "k-field pp-pick pp-full", "data-focus": "" })
                : h("span", { class: "k-field pp-pick pp-full", role: "button", tabindex: "0", "aria-pressed": "false", "aria-label": label + ": " + (val || (which === "scope" ? "Whole graph" : "not chosen")) });
            f.append(icon(which === "scope" ? (val ? AB.ICON.set : "network") : s[which + "Icon"], "sm"));
            if (on) {
                const inp = h("input", { type: "text", placeholder: which === "scope" ? "Type a set name" : "Type a name", "aria-label": label, "data-autofocus": "", value: val || "" });
                inp.addEventListener("keydown", (e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const q = inp.value.trim().toLowerCase();
                    const hit = q && (which === "scope" ? [s.set].filter(Boolean) : s.names).find((n) => n.toLowerCase().startsWith(q));
                    // said under the field, not in a toast that would sit over Find path
                    const was = f.parentNode && f.parentNode.querySelector(".pp-nomatch");
                    if (was) was.remove();
                    if (!hit) { f.after(h("div", { class: "pp-nomatch", role: "status" }, AB.noMatch(inp.value.trim()))); inp.setAttribute("aria-invalid", "true"); return; }
                    choose(which, hit);
                });
                f.append(inp);
            } else {
                f.append(h("span", { class: "k-grow k-ellipsis" + (val || which === "scope" ? "" : " pp-empty") }, val || (which === "scope" ? "Whole graph" : "Click to pick")));
            }
            AB.tip(f, which === "scope" ? (on ? "Click a set or group on the canvas, or type its name" : "Keep the path inside a set or group: pick it on the canvas")
                : on ? "Click a node on the canvas, or type a name" : "Pick " + label + " on the canvas", { label: false });
            const arm = (e) => { if (e.target.tagName === "INPUT") return; if (on) { f.querySelector("input").focus(); return; } active = which; draw(); };
            f.addEventListener("click", arm);
            f.addEventListener("keydown", (e) => { if (e.target === f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); arm(e); } });
            return f;
        }
        function choose(which, name) {
            if (which === "scope" && !name) { active = null; AB.flash("This project has no sets or groups yet"); return draw(); }
            s[which] = name;
            active = which === "from" && !s.to ? "to" : null;
            AB.announce({ from: "From: ", to: "To: ", scope: "Scope: " }[which] + name);
            draw();
        }
        const loadedLine = () => (s.loaded.weight ? s.loaded.weight + ", " + s.loaded.meaning : "none (each edge counts 1)"); // the graph inspector's words: "value, stronger"
        // the Weight choice's words: the attribute set at load says so, None says what it does
        const wordOf = (w) => (!w ? "None (fewest steps)" : w === s.loaded.weight ? w + " (set at load)" : w);
        const overridden = () => s.weight !== s.loaded.weight || (s.weight && s.meaning !== s.loaded.meaning);
        // The project's edge attributes (the field list's fields), for the Weight choices and the time column
        const ds0 = AB.route && AB.route.frame.dataset;
        const edgeFields = () => AB.fieldsOf(ds0 || "lesmis").filter((g) => g.element === "edge").flatMap((g) => g.fields);
        function weightField() {
            const L = s.loaded;
            // The field list at menu size, its choices in the decided order: the weight set at load, then
            // None, then the project's other numeric edge attributes (Find past 15)
            const pick = (w) => { s.weight = w; if (w && w === L.weight) s.meaning = L.meaning; draw(); };
            const item = (w, desc) => ({ label: wordOf(w), check: s.weight === w, desc, onClick: () => pick(w) });
            const others = edgeFields().filter((x) => x.type === "num" && x.name !== L.weight);
            const items = (L.weight ? [item(L.weight, L.desc)] : []).concat([item(null, "Every edge counts as one step")],
                others.length ? [{ heading: "Other numbers" }].concat(others.map((x) => item(x.name))) : []);
            const f = AB.field(wordOf(s.weight), { caret: true, onClick: () => AB.openFieldList(f, { items, label: "Weight" }) });
            f.classList.add("pp-full");
            f.setAttribute("aria-label", "Weight: " + wordOf(s.weight));
            return f;
        }
        // The weight used, and how many edges have no value for it (left out of a weighted path), read
        // from the field's fill (every edge has one when the field list shows no fill)
        function weightUse() {
            if (!s.weight) return null;
            const x = edgeFields().find((y) => y.name === s.weight), pc = AB.projectCounts(ds0 || "lesmis");
            if (!x || !pc) return null;
            const missing = x.fill == null ? 0 : Math.round(pc.edges * (1 - x.fill));
            // the Weight field above already names the column; this line says only what it leaves out
            return h("span", { class: "pp-loaded" }, missing ? AB.count(missing, "edge", { of: pc.edges }) + " have no " + s.weight + " and are left out of this path"
                : "Every edge has a value for " + s.weight);
        }
        // How the route reads the weight, by its declared kind: a similarity is never summed as a distance
        function readAs() {
            const w = s.weight;
            if (!w) return null;
            const say = { stronger: "Stronger links count as shorter: the route adds up 1/" + w + ", so it follows the strongest ties.",
                farther: "The route adds up " + w + " along its steps and takes the smallest total.",
                capacity: "The route takes the path whose smallest " + w + " is largest." }[s.meaning]
                || "No kind was declared for " + w + ": the route adds it up as a distance, and the result is labeled as a sum.";
            return h("span", { class: "pp-loaded" }, say);
        }
        // Follow time order: on data with a time column on its edges, a path whose dates run forward
        function timeOrder() {
            if (!edgeFields().some((x) => x.type === "time")) return null;
            const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": "false", "aria-disabled": "true", style: "opacity:.5" });
            AB.tip(box, "Follow time order", { second: "Needs graphty-element: a path option that keeps each step no earlier than the one before" });
            return h("span", { style: "display:flex;align-items:center;gap:8px" }, h("label", { style: "display:flex;align-items:center;gap:8px;color:var(--cm-text-tertiary)" }, box, "Follow time order"),
                AB.needsElement("graphty-element's shortest path has no time option; Follow time order needs one that keeps each hop's date no earlier than the hop before"));
        }
        // No path: the two ends lie in different parts of what the graph draws (a filter split it)
        function noPath() {
            if (state !== "no-path" || s.to !== s.noPathTo) return null;
            return AB.problem({
                what: "No path from " + s.from + " to " + s.to + ": the filter step \"" + s.filter + "\" hides every node between them.",
                todo: "Turn that step off in Filters, or pick another To.",
                action: { label: "Pick another To", onClick: () => { active = "to"; draw(); } },
            });
        }

        function draw() {
            const ready = s.from && s.to;
            const body = [
                AB.fieldRow("From", h("span", { class: "pp-col" }, pickField("from")), { popover: true }),
                AB.fieldRow("To", h("span", { class: "pp-col" }, pickField("to")), { popover: true }),
                s.directed ? AB.fieldRow("Direction", h("span", { class: "pp-col" },
                    AB.seg([["follow", "Follow edges"], ["either", "Either way"]], s.direction, (v) => { s.direction = v; draw(); }, { label: "Direction" }),
                    AB.needsElement("graphty-element's shortest path reads every graph as undirected; Follow edges needs a direction option"),
                    timeOrder()), { popover: true }) : null,
                AB.fieldRow("Weight", h("span", { class: "pp-col" },
                    weightField(),
                    weightUse(),
                    s.weight ? AB.seg([["stronger", "Stronger"], ["farther", "Farther"], ["capacity", "Capacity"]], s.meaning, (v) => { s.meaning = v; draw(); }, { label: "What a higher " + s.weight + " means" }) : null,
                    overridden() ? h("span", { class: "pp-loaded" }, "This path only. Set at load: " + loadedLine()) : null,
                    readAs(),
                    s.weight && (s.weight !== s.loaded.weight || s.meaning !== "farther") ? AB.needsElement("graphty-element's shortest path reads the loaded weight column as a distance only; another column, or Stronger or Capacity, needs a weight option with a meaning") : null), { popover: true }),
                AB.fieldRow("Scope", h("span", { class: "pp-col" },
                    pickField("scope"),
                    // what the path may pass through: the count, filter-aware ("64 of 77 nodes"), or the way back
                    s.scope ? AB.link("path-popover", state, "Back to the whole graph", { on: { click: (e) => { e.preventDefault(); s.scope = null; active = null; draw(); } } })
                        : h("span", { class: "pp-loaded" }, state === "no-path" ? AB.count(s.count, "node", { of: AB.fx.datasets.lesmis.nodes }) + " after filters" : AB.count(s.count, s.unit === "accounts" ? "account" : "node")),
                    s.scope ? AB.needsElement("graphty-element's shortest path runs on the whole graph; keeping it inside a set needs a scope option") : null), { popover: true }),
            ];
            const np = noPath();
            if (np) body.push(np);
            const foot = AB.button("Find path", {
                icon: "route", disabled: np ? "No path between these two in what the graph draws" : ready ? null : "Choose From and To first",
                // The ends and the weight go with the new row, so the tree and the inspector name this path
                onClick: () => { AB.redrawLeft = true; AB.pathRouteAt = 0; AB.lastPath = withRoutes({ ds: AB.route && AB.route.frame.dataset, from: s.from, to: s.to, weight: s.weight, meaning: s.meaning, loaded: s.loaded.weight, scope: s.scope, direction: s.directed ? s.direction : "either" }); AB.go("path-popover", AB.lastPath.ds === "transactions" && AB.lastPath.routes.length > 1 ? "found-tied" : "found"); },
            });
            const pop = AB.popover({ anchor: anchor(), title: "Path between", body, foot, width: 360 });
            pop.querySelector(".k-popover-body").append(AB.openQuestion("Can From or To be a set, so the path starts at the nearest member? graphty-element takes one source node"));
            const layer = [pop];
            if (active) {
                // the canvas becomes a pick target: a crosshair over it and one hint line at its top
                const cv = document.getElementById("ab-canvas"), ov = document.getElementById("ab-overlay");
                if (cv && ov) {
                    const C = cv.getBoundingClientRect(), O = ov.getBoundingClientRect();
                    const name = active === "from" ? s.pickFrom : active === "to" ? s.pickTo : s.set;
                    const which = active;
                    const catcher = h("div", { class: "pp-catch", style: `left:${C.left - O.left}px;top:${C.top - O.top}px;width:${C.width}px;height:${C.height}px`, "aria-hidden": "true" },
                        h("div", { class: "pp-hint" }, icon("crosshair", "sm"), active === "scope" ? "Click a set or group for Scope" : "Click a node for " + (active === "from" ? "From" : "To")));
                    catcher.addEventListener("click", (e) => { e.stopPropagation(); choose(which, name); });
                    layer.unshift(catcher);
                }
            }
            host.replaceChildren(...layer);
            // a pick field that is picking takes the keyboard too; its name is selected, so typing replaces it
            const inp = pop.querySelector(".pp-pick input");
            if (inp) requestAnimationFrame(() => requestAnimationFrame(() => { inp.focus(); inp.select(); }));
        }
        draw();
    }

    registerSection({
        id: "path-popover",
        title: "Path popover",
        region: "overlay",
        rail: "graph",
        states: [
            { id: "from-selection", label: "From and To filled from the selection" },
            { id: "picking-to", label: "Picking To on the canvas" },
            { id: "transfers-directed", label: "Directed graph: Direction shows" },
            { id: "weight-overridden", label: "Weight overridden to None for this path" },
            { id: "from-analyze", label: "From Analyze > Find paths, nothing selected" },
            { id: "found", label: "Path found: the new row selected" },
            { id: "found-tied", label: "Path found: two routes tie, Route 1 of 2" },
            { id: "found-out-of-time", label: "Path found against the transfers' direction: its dates run backward" },
            { id: "no-path", label: "No path: a filter step splits the graph" },
        ],
        closeTo: "graph-place/at-rest",
        // the transfers have their own state: P, Path between... and Analyze > Shortest path open it there
        stateFor: (ds, st) => (ds === "transactions" && (st === "from-selection" || st === "from-analyze") ? "transfers-directed" : null),
        frame(state) {
            // a just-loaded transfers project (no runs yet) keeps its own tree and plain drawing
            if (state === "transfers-directed") return AB.fx.datasets.transactions.fresh ? { dataset: "transactions", left: "graph-place/" + AB.placeOf("transactions", "graph"), dock: false }
                : { dataset: "transactions", left: "graph-place/many-groups", right: "inspector-run-row/many-groups", canvas: "canvas-and-states/transfers-communities", dock: false };
            if (state === "from-analyze") return { left: "graph-place/at-rest", dock: false };
            if (state === "no-path") return { left: "graph-place/at-rest", dock: false, chip: AB.count(AB.fx.datasets.lesmis.filterSteps.statsByState["3"].nodes, "node", { of: AB.fx.datasets.lesmis.nodes }), filterOn: ["group"] };
            if (state === "found" || state === "found-tied" || state === "found-out-of-time") {
                // The project the path ran on (the screen before this one): its tree with the new row, and the row's inspector
                const ds = state === "found-tied" || state === "found-out-of-time" ? "transactions" : AB.route && AB.route.frame.dataset;
                // two routes tie when the weight is None: three steps each
                if (state === "found-tied" && !(AB.lastPath && AB.lastPath.ds === "transactions" && AB.lastPath.routes && AB.lastPath.routes.length > 1)) AB.lastPath = AB.tiedPath();
                // Either way, from the flagged account back to the first: the route runs against the transfers, so its dates run backward
                if (state === "found-out-of-time") { const P = AB.fx.datasets.transactions.setsAndPaths.path; AB.lastPath = withRoutes({ ds: "transactions", from: P.to.id, to: P.from.id, weight: "amount", meaning: "farther", loaded: "amount", direction: "either" }); }
                if (ds === "doorEntries") return { own: true, dataset: ds, left: "graph-place/door-entries-path", right: "inspector-group-set-path-row/path-door-entries", dock: false };
                if (ds === "transactions") return { own: true, dataset: ds, left: "graph-place/path-found", right: "inspector-group-set-path-row/" + (AB.lastPath && AB.lastPath.routes && AB.lastPath.routes.length > 1 ? "path-tied" : "path"), canvas: AB.fx.datasets.transactions.fresh ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities", dock: false };
                // a loaded project has no path fixture: its own tree, beside the graph's inspector
                if (ds && ds !== "lesmis") return { own: true, dataset: ds, left: "graph-place/" + (AB.placeOf(ds, "graph") || "at-rest"), dock: false };
                // Opened directly (no Find path yet): a path the tree does not hold yet, found with the same
                // settings as the tree's Shortest paths, so it visibly lands under that run and is selected
                if (!(AB.lastPath && (AB.lastPath.ds || "lesmis") === "lesmis")) AB.lastPath = withRoutes({ ds: "lesmis", from: "Cosette", to: "Javert", weight: "value", meaning: "stronger", loaded: "value", direction: "either" });
                return { left: "graph-place/at-rest", right: "inspector-group-set-path-row/" + ({ "Valjean to Javert": "path-lesmis", "Myriel to Javert": "path-lesmis-2" }[AB.lastPath && (AB.lastPath.ds || "lesmis") === "lesmis" ? AB.lastPath.name : "Valjean to Javert"] || "path-lesmis-found"), dock: false };
            }
            return { left: "graph-place/at-rest", right: "inspector-several-elements/two-nodes", dock: false };
        },
        render,
    });
})();
