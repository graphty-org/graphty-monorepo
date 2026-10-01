// Generates the wide-data and nested-JSON fixtures: kit/wide-nested.json, copied to app-b/kit/.
// Run: node kit/gen-wide-nested.mjs (from design/ui/prototype/; under a second).
//
// Three datasets from one fixed seed. It does not touch kit/fixtures.json; the skeleton's boot
// (app-b/app.js) merges this file's datasets into AB.fx.datasets.
// - wide: an IT estate's hosts and the network connections between them. 300 hosts with 60+
//   attributes each, 1,000 connections with 20+ attributes. Numbers, categories, times, text, ids,
//   some mostly empty columns, long names with shared prefixes (cpu_util_*, vuln_*, cmdb_*).
// - nested: one nested JSON document as a research-network API returns it: researchers and
//   institutions inside data{}, sub-objects four levels deep, tag arrays, arrays of objects
//   (addresses, affiliations), relationships both as id arrays inside records (coauthor_ids,
//   affiliations[].institution_id) and as a separate links[] array.
// - plainJson: a small node-link JSON graph ({ nodes, links }), the one-step case.
import { writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const r = mulberry32(20261001);
const pick = (a) => a[Math.floor(r() * a.length)];
const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const num = (lo, hi, dp = 1) => Math.round((lo + r() * (hi - lo)) * 10 ** dp) / 10 ** dp;
const maybe = (p, f) => (r() < p ? f() : null);
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[int(0, 15)]).join("");
const T0 = Date.parse("2026-03-01T00:00:00Z");
const time = (dayLo, dayHi) => new Date(T0 + Math.floor((dayLo + r() * (dayHi - dayLo)) * 86400) * 1000).toISOString().replace(".000", "");
const daysAgo = (lo, hi) => new Date(Date.parse("2026-03-31T00:00:00Z") - Math.floor((lo + r() * (hi - lo)) * 86400) * 1000).toISOString().replace(".000", "");

// Describe the columns of a row set: kind, how many rows have a value, categories or range
function describe(rows, kinds) {
    return Object.entries(kinds).map(([name, kind]) => {
        const vals = rows.map((x) => x[name]).filter((v) => v !== null && v !== undefined && v !== "");
        const a = { name, kind, filled: vals.length };
        if (kind === "category" || kind === "boolean") {
            const c = {};
            vals.forEach((v) => { c[v] = (c[v] || 0) + 1; });
            a.values = c;
        } else if (kind === "integer" || kind === "number" || kind === "datetime") {
            const s = vals.slice().sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
            if (s.length) a.range = [s[0], s[s.length - 1]];
        }
        return a;
    });
}

// ---------- wide: the IT estate ----------
const ROLES = [
    // role, count, os family, tier
    ["lb", 12, "linux", "edge"], ["web", 48, "linux", "frontend"], ["app", 70, "linux", "application"], ["db", 30, "linux", "data"],
    ["cache", 18, "linux", "data"], ["queue", 12, "linux", "data"], ["auth", 10, "windows", "platform"], ["dns", 6, "linux", "platform"],
    ["batch", 26, "linux", "application"], ["monitor", 8, "linux", "platform"], ["backup", 10, "linux", "platform"], ["bastion", 6, "linux", "edge"],
    ["fileserver", 14, "windows", "data"], ["reporting", 30, "windows", "application"],
];
const ENVS = [["prod", 0.6], ["staging", 0.25], ["dev", 0.15]];
const SITES = [["fra", "Frankfurt"], ["iad", "Ashburn"], ["sgp", "Singapore"]];
const TEAMS = ["Platform Engineering", "Payments", "Customer Portal", "Data Warehouse", "Identity", "Internal Tools", "Site Reliability"];
const SERVICES = ["checkout", "customer-portal", "ledger", "identity", "reporting", "search", "notifications", "internal-wiki"];
const env = () => { const x = r(); return x < 0.6 ? "prod" : x < 0.85 ? "staging" : "dev"; };

const hosts = [];
const count = {};
for (const [role, n, os, tier] of ROLES) {
    for (let i = 0; i < n; i++) {
        const e = env(), [site, city] = pick(SITES);
        const key = `${role}-${e}-${site}`;
        count[key] = (count[key] || 0) + 1;
        const name = `${key}-${String(count[key]).padStart(2, "0")}`;
        const cores = pick(role === "db" ? [16, 32, 64] : [2, 4, 8, 16]);
        const mem = cores * pick([2, 4, 8]);
        const disk = pick([50, 100, 250, 500, 1000, 2000]) * (role === "db" || role === "fileserver" || role === "backup" ? 4 : 1);
        const p50 = num(3, 45), p95 = Math.min(100, Math.round((p50 + num(5, 40)) * 10) / 10);
        const m50 = num(15, 70), m95 = Math.min(100, Math.round((m50 + num(3, 25)) * 10) / 10);
        const crit = r() < 0.15 ? int(1, 6) : 0, high = int(0, 14), med = int(0, 40);
        const linux = os === "linux";
        const decom = r() < 0.03;
        hosts.push({
            id: `CI${String(100000 + hosts.length * 37 + int(0, 30)).padStart(7, "0")}`,
            hostname: name,
            fqdn: `${name}.${site}.corp.example.net`,
            ip_address: `10.${ENVS.findIndex(([x]) => x === e) * 10 + SITES.findIndex(([x]) => x === site)}.${int(0, 31)}.${int(2, 254)}`,
            mac_address: Array.from({ length: 6 }, () => hex(2)).join(":"),
            role,
            tier,
            environment: e,
            site,
            site_city: city,
            rack_location: maybe(0.7, () => `${site.toUpperCase()}-R${int(1, 40)}-U${int(1, 42)}`),
            is_virtual: r() < 0.8,
            hypervisor_cluster: null, // filled below for virtual hosts
            os_family: os,
            os_distribution: linux ? pick(["Ubuntu", "Ubuntu", "RHEL", "Debian"]) : "Windows Server",
            os_version: linux ? pick(["22.04", "24.04", "9.3", "12"]) : pick(["2019", "2022"]),
            kernel_version: linux ? pick(["5.15.0-118", "6.8.0-45", "5.14.0-362", "6.1.0-25"]) : null,
            cpu_model: pick(["Intel Xeon Gold 6338", "AMD EPYC 7543", "Intel Xeon Silver 4314", "AMD EPYC 9354"]),
            cpu_cores: cores,
            cpu_util_p50_pct: p50,
            cpu_util_p95_pct: p95,
            cpu_util_max_pct: Math.min(100, Math.round((p95 + num(0, 20)) * 10) / 10),
            memory_total_gb: mem,
            memory_util_p50_pct: m50,
            memory_util_p95_pct: m95,
            disk_total_gb: disk,
            disk_used_gb: Math.round(disk * num(0.1, 0.95, 2)),
            disk_iops_p95: int(50, role === "db" ? 20000 : 3000),
            net_in_mbps_p50: num(0.1, 120),
            net_in_mbps_p95: num(5, 900),
            net_out_mbps_p50: num(0.1, 120),
            net_out_mbps_p95: num(5, 900),
            uptime_days: decom ? 0 : int(0, 420),
            last_reboot_at: daysAgo(0, 400),
            last_seen_at: decom ? daysAgo(30, 90) : daysAgo(0, 0.05),
            first_discovered_at: daysAgo(60, 1400),
            patch_level: pick(["current", "current", "current", "n-1", "n-2", "unsupported"]),
            patch_last_applied_at: daysAgo(0, 120),
            patch_pending_count: int(0, 30),
            patch_pending_critical_count: crit ? int(0, 3) : 0,
            vuln_count_critical: crit,
            vuln_count_high: high,
            vuln_count_medium: med,
            vuln_count_low: int(0, 80),
            vuln_count_critical_unremediated_over_30_days: crit ? int(0, crit) : 0,
            vuln_scan_last_completed_timestamp_utc: maybe(0.92, () => daysAgo(0, 14)),
            vuln_scan_policy: pick(["standard", "standard", "pci", "internal-only"]),
            edr_agent_version: maybe(0.9, () => pick(["7.11.0", "7.12.1", "7.14.2"])),
            edr_agent_status: pick(["healthy", "healthy", "healthy", "degraded", "not reporting"]),
            backup_policy: pick(["daily-30d", "daily-30d", "weekly-90d", "none"]),
            backup_last_success_at: maybe(0.85, () => daysAgo(0, 9)),
            cmdb_owner_group: pick(TEAMS),
            cmdb_business_service: pick(SERVICES),
            cmdb_cost_center: `CC-${int(4100, 4180)}`,
            cmdb_support_tier: pick(["gold", "silver", "silver", "bronze"]),
            cmdb_data_classification: pick(["public", "internal", "internal", "confidential", "restricted"]),
            cmdb_lifecycle_status: decom ? "retiring" : pick(["in service", "in service", "in service", "build"]),
            cmdb_last_audited_at: maybe(0.6, () => daysAgo(10, 500)),
            pci_scope: r() < 0.12,
            monthly_cost_usd: num(40, role === "db" ? 4200 : 1400, 2),
            purchase_order: maybe(0.25, () => `PO-${int(2019, 2025)}-${int(1000, 9999)}`),
            warranty_expires_on: maybe(0.2, () => `${int(2025, 2029)}-${String(int(1, 12)).padStart(2, "0")}-28`),
            legacy_asset_tag: maybe(0.06, () => `AT-${int(10000, 99999)}`),
            maintenance_window_override: maybe(0.04, () => pick(["Sun 02:00-04:00 UTC", "Sat 22:00-23:30 UTC", "frozen until quarter end"])),
            decommission_requested_on: decom ? daysAgo(5, 60).slice(0, 10) : null,
            on_call_escalation_contact: maybe(0.3, () => pick(["sre-primary", "payments-oncall", "identity-oncall", "dw-oncall"])),
            tags: [role, e, site, ...(r() < 0.3 ? ["customer-facing"] : []), ...(r() < 0.1 ? ["legacy"] : [])].join(";"),
            notes: maybe(0.05, () => pick([
                "Pinned to the old kernel until the storage driver is certified; see change CHG-48213.",
                "Shares a license server with reporting; do not move without telling Finance.",
                "Migrated from the Dublin site in 2024; the rack location in the old CMDB is wrong.",
                "Runs the nightly reconciliation job; a reboot between 01:00 and 03:00 UTC breaks month end.",
            ])),
        });
        const h = hosts[hosts.length - 1];
        if (h.is_virtual) h.hypervisor_cluster = `${site}-vsphere-${int(1, 4)}`;
        h.disk_used_pct = Math.round((h.disk_used_gb / h.disk_total_gb) * 1000) / 10;
    }
}
const NODE_KINDS = {
    id: "id", hostname: "text", fqdn: "text", ip_address: "text", mac_address: "text", role: "category", tier: "category", environment: "category", site: "category", site_city: "category",
    rack_location: "text", is_virtual: "boolean", hypervisor_cluster: "category", os_family: "category", os_distribution: "category", os_version: "category", kernel_version: "category", cpu_model: "category",
    cpu_cores: "integer", cpu_util_p50_pct: "number", cpu_util_p95_pct: "number", cpu_util_max_pct: "number", memory_total_gb: "integer", memory_util_p50_pct: "number", memory_util_p95_pct: "number",
    disk_total_gb: "integer", disk_used_gb: "integer", disk_used_pct: "number", disk_iops_p95: "integer", net_in_mbps_p50: "number", net_in_mbps_p95: "number", net_out_mbps_p50: "number", net_out_mbps_p95: "number",
    uptime_days: "integer", last_reboot_at: "datetime", last_seen_at: "datetime", first_discovered_at: "datetime", patch_level: "category", patch_last_applied_at: "datetime", patch_pending_count: "integer",
    patch_pending_critical_count: "integer", vuln_count_critical: "integer", vuln_count_high: "integer", vuln_count_medium: "integer", vuln_count_low: "integer",
    vuln_count_critical_unremediated_over_30_days: "integer", vuln_scan_last_completed_timestamp_utc: "datetime", vuln_scan_policy: "category", edr_agent_version: "category", edr_agent_status: "category",
    backup_policy: "category", backup_last_success_at: "datetime", cmdb_owner_group: "category", cmdb_business_service: "category", cmdb_cost_center: "category", cmdb_support_tier: "category",
    cmdb_data_classification: "category", cmdb_lifecycle_status: "category", cmdb_last_audited_at: "datetime", pci_scope: "boolean", monthly_cost_usd: "number", purchase_order: "id",
    warranty_expires_on: "date", legacy_asset_tag: "id", maintenance_window_override: "text", decommission_requested_on: "date", on_call_escalation_contact: "category", tags: "text", notes: "text",
};
hosts.forEach((h) => { const o = {}; Object.keys(NODE_KINDS).forEach((k) => { o[k] = h[k]; }); Object.keys(h).forEach((k) => delete h[k]); Object.assign(h, o); });

// Connections: who talks to whom, by role, inside one environment (monitoring and backup cross it)
const FLOWS = [
    ["lb", "web", "https", 443, 80], ["web", "app", "http", 8080, 140], ["app", "db", "postgres", 5432, 120], ["app", "cache", "redis", 6379, 90], ["app", "queue", "amqp", 5672, 60],
    ["batch", "db", "postgres", 5432, 50], ["batch", "queue", "amqp", 5672, 25], ["reporting", "db", "postgres", 5432, 40], ["reporting", "fileserver", "smb", 445, 30],
    ["app", "auth", "ldaps", 636, 40], ["web", "auth", "https", 443, 25], ["monitor", "*", "prometheus", 9100, 140], ["backup", "db", "ssh", 22, 30], ["backup", "fileserver", "smb", 445, 15],
    ["bastion", "*", "ssh", 22, 70], ["*", "dns", "dns", 53, 120], ["app", "app", "grpc", 9090, 30],
];
const byRole = (role) => hosts.filter((x) => x.role === role);
const pairs = new Set();
const edges = [];
for (const [from, to, proto, port, n] of FLOWS) {
    let tries = 0;
    for (let i = 0; i < n && tries < n * 30; tries++) {
        const a = from === "*" ? pick(hosts) : pick(byRole(from));
        const b = to === "*" ? pick(hosts) : pick(byRole(to));
        const crossEnv = from === "monitor" || from === "backup" || from === "bastion" || to === "dns";
        if (a === b || (!crossEnv && a.environment !== b.environment) || pairs.has(a.id + ">" + b.id + ":" + port)) continue;
        pairs.add(a.id + ">" + b.id + ":" + port);
        i++;
        const flows = int(1, 40000), enc = ["https", "ldaps", "ssh", "grpc", "postgres"].includes(proto) ? r() < 0.95 : r() < 0.3;
        const lat = num(0.2, a.site === b.site ? 4 : 180);
        edges.push({
            id: `FL-${hex(8)}`,
            source: a.id,
            target: b.id,
            protocol: proto,
            dst_port: port,
            src_port_range: pick(["ephemeral", "ephemeral", "32768-60999", "49152-65535"]),
            service_name: proto === "prometheus" ? "node-exporter" : b.cmdb_business_service,
            flow_count_24h: flows,
            bytes_total_24h: flows * int(400, 90000),
            bytes_in_p95: int(200, 2000000),
            bytes_out_p95: int(200, 2000000),
            packets_dropped_24h: r() < 0.1 ? int(1, 900) : 0,
            avg_latency_ms: lat,
            p95_latency_ms: Math.round((lat * num(1.2, 4)) * 10) / 10,
            error_rate_pct: r() < 0.15 ? num(0.1, 8, 2) : 0,
            first_seen_at: daysAgo(20, 700),
            last_seen_at: daysAgo(0, 2),
            is_encrypted: enc,
            tls_version: enc && !["ssh", "postgres"].includes(proto) ? pick(["TLS 1.2", "TLS 1.3", "TLS 1.3"]) : null,
            cross_site: a.site !== b.site,
            firewall_rule_id: maybe(0.7, () => `FW-${a.site.toUpperCase()}-${int(100, 999)}`),
            zone_src: a.tier,
            zone_dst: b.tier,
            observed_by: pick(["netflow", "netflow", "ebpf-agent", "firewall-log"]),
            exception_ticket: maybe(0.03, () => `SEC-${int(2000, 2999)}`),
            comment: maybe(0.02, () => pick(["temporary rule for the March migration", "allowed by the 2025 risk acceptance", "investigate: unexpected cross-site path"])),
        });
    }
}
const EDGE_KINDS = {
    id: "id", source: "id", target: "id", protocol: "category", dst_port: "integer", src_port_range: "category", service_name: "category", flow_count_24h: "integer", bytes_total_24h: "integer",
    bytes_in_p95: "integer", bytes_out_p95: "integer", packets_dropped_24h: "integer", avg_latency_ms: "number", p95_latency_ms: "number", error_rate_pct: "number", first_seen_at: "datetime",
    last_seen_at: "datetime", is_encrypted: "boolean", tls_version: "category", cross_site: "boolean", firewall_rule_id: "id", zone_src: "category", zone_dst: "category", observed_by: "category",
    exception_ticket: "id", comment: "text",
};
const deg = {};
edges.forEach((e) => { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; });
const wide = {
    title: "IT estate hosts and connections, March 2026",
    graphName: "Hosts",
    file: "hosts-2026-03.csv",
    edgesFile: "connections-2026-03.csv",
    source: "generated for the mocks by kit/gen-wide-nested.mjs: a CMDB export joined to 24 hours of flow logs, across three sites and three environments",
    nodes: hosts.length,
    edges: edges.length,
    directed: true,
    nodeKey: "id",
    edgeEnds: ["source", "target"],
    stats: { isolated: hosts.filter((x) => !deg[x.id]).length, maxDegree: Math.max(...Object.values(deg)), averageDegree: Math.round((2 * edges.length / hosts.length) * 100) / 100 },
    nodeAttributes: describe(hosts, NODE_KINDS),
    edgeAttributes: describe(edges, EDGE_KINDS),
    nodeRows: hosts,
    edgeRows: edges,
    frame: { project: "IT estate, March 2026", graphRow: "Hosts" },
};

// ---------- nested: a research-network API response ----------
const FIRST = ["Ana", "Tomas", "Grace", "Wei", "Priya", "Marek", "Lena", "Kofi", "Sofia", "Hiro", "Amara", "Jonas", "Maya", "Diego", "Ines", "Ravi", "Elif", "Noah", "Zara", "Mateo", "Yuki", "Olga", "Samir", "Chloe"];
const LAST = ["Ruiz", "Lindqvist", "Okafor", "Chen", "Nair", "Novak", "Fischer", "Mensah", "Rossi", "Tanaka", "Diallo", "Berg", "Cohen", "Alvarez", "Moreau", "Iyer", "Kaya", "Schmidt", "Haddad", "Silva"];
const FIELDS = ["network science", "epidemiology", "climate modeling", "genomics", "materials", "machine learning", "economics", "neuroscience"];
const CITIES = [["Leiden", "NL", 52.16, 4.49], ["Toronto", "CA", 43.65, -79.38], ["Nairobi", "KE", -1.29, 36.82], ["Kyoto", "JP", 35.01, 135.77], ["Lyon", "FR", 45.76, 4.84], ["Austin", "US", 30.27, -97.74], ["Pune", "IN", 18.52, 73.86], ["Porto", "PT", 41.15, -8.61]];
const insts = Array.from({ length: 30 }, (_, i) => {
    const [city, country, lat, lon] = pick(CITIES);
    return {
        id: `inst_${String(i + 1).padStart(3, "0")}`,
        type: "institution",
        attributes: {
            name: `${pick(["Institute for", "Center for", "School of", "Laboratory of"])} ${pick(FIELDS).replace(/\b\w/g, (c) => c.toUpperCase())} ${city}`,
            kind: pick(["university", "university", "lab", "hospital", "company"]),
            founded: int(1850, 2015),
            location: { city, country, geo: { lat: num(lat - 0.1, lat + 0.1, 4), lon: num(lon - 0.1, lon + 0.1, 4) } },
            funding: { currency: "EUR", grants: Array.from({ length: int(0, 3) }, () => ({ funder: pick(["ERC", "NSF", "Wellcome", "JSPS", "NIH"]), amount: int(50, 2500) * 1000, years: [int(2019, 2023), int(2024, 2028)] })) },
        },
        tags: Array.from(new Set(Array.from({ length: int(1, 3) }, () => pick(FIELDS)))),
    };
});
const people = Array.from({ length: 170 }, (_, i) => {
    const [city, country, lat, lon] = pick(CITIES);
    const nAff = r() < 0.7 ? 1 : int(2, 3);
    return {
        id: `res_${String(i + 1).padStart(4, "0")}`,
        type: "researcher",
        attributes: {
            name: { given: pick(FIRST), family: pick(LAST) },
            orcid: maybe(0.75, () => `0000-000${int(1, 3)}-${int(1000, 9999)}-${int(1000, 9999)}`),
            profile: {
                field: pick(FIELDS),
                h_index: int(1, 70),
                contact: {
                    email: maybe(0.6, () => `${hex(6)}@example.org`),
                    addresses: Array.from({ length: int(0, 2) }, (_, k) => ({ kind: k ? "home" : "work", city, country, geo: { lat: num(lat - 0.2, lat + 0.2, 4), lon: num(lon - 0.2, lon + 0.2, 4) } })),
                },
                metrics: { citations: { total: int(10, 40000), last_5_years: int(5, 15000) }, papers: int(2, 300) },
            },
            affiliations: Array.from({ length: nAff }, (_, k) => ({ institution_id: pick(insts).id, role: pick(["professor", "postdoc", "PhD student", "research engineer", "visiting"]), since: `${int(2005, 2025)}-${String(int(1, 12)).padStart(2, "0")}`, current: k === 0 || r() < 0.3 })),
        },
        tags: Array.from(new Set(Array.from({ length: int(0, 4) }, () => pick(["open data", "reviewer", "mentor", "editor", "PI", "early career", "industry"])))),
        relationships: { coauthor_ids: [], advisor_id: null },
    };
});
people.forEach((p, i) => {
    const k = int(0, 6);
    for (let j = 0; j < k; j++) { const q = pick(people); if (q !== p && !p.relationships.coauthor_ids.includes(q.id)) p.relationships.coauthor_ids.push(q.id); }
    if (i > 20 && r() < 0.4) p.relationships.advisor_id = people[int(0, i - 1)].id;
});
const links = [];
for (let i = 0; i < 160; i++) {
    const a = pick(people), b = r() < 0.75 ? pick(people) : pick(insts);
    if (a === b) continue;
    links.push({ id: `lnk_${String(links.length + 1).padStart(4, "0")}`, source: a.id, target: b.id, type: b.type === "institution" ? pick(["visited", "reviewed for"]) : pick(["co-supervised", "shared dataset", "grant partner"]), since: `${int(2015, 2026)}`, weight: num(0.1, 1, 2), evidence: { kind: pick(["paper", "grant", "dataset"]), refs: Array.from({ length: int(1, 3) }, () => `doi:10.${int(1000, 9999)}/${hex(6)}`) } });
}
const doc = {
    meta: { api_version: "2.3", generated_at: "2026-03-31T09:00:00Z", request: { endpoint: "/v2/network/export", params: { region: "all", include: ["researchers", "institutions", "links"] } }, page: { number: 1, size: 200, total_records: people.length + insts.length } },
    data: { researchers: people, institutions: insts },
    links,
};
// Every JSON path in the document, with how many values sit there and what kind they are
function paths(v, p, out) {
    const kind = Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
    const e = out[p] || (out[p] = { path: p, kinds: {}, count: 0 });
    e.count++;
    e.kinds[kind] = (e.kinds[kind] || 0) + 1;
    if (Array.isArray(v)) v.forEach((x) => paths(x, p + "[]", out));
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => paths(x, p ? p + "." + k : k, out));
    return out;
}
const pathList = Object.values(paths(doc, "", {})).filter((x) => x.path);
const nested = {
    title: "Research network API export, March 2026",
    graphName: "Research network",
    file: "network-export-2026-03.json",
    source: "generated for the mocks by kit/gen-wide-nested.mjs: one response from a research network's /v2/network/export endpoint",
    records: people.length + insts.length,
    recordArrays: { "data.researchers[]": people.length, "data.institutions[]": insts.length, "links[]": links.length },
    // Where the relationships are: id arrays inside records, an id inside an array of objects, and the separate links array
    relationshipPaths: [
        { path: "data.researchers[].relationships.coauthor_ids[]", to: "data.researchers[].id", count: people.reduce((s, p) => s + p.relationships.coauthor_ids.length, 0) },
        { path: "data.researchers[].relationships.advisor_id", to: "data.researchers[].id", count: people.filter((p) => p.relationships.advisor_id).length },
        { path: "data.researchers[].attributes.affiliations[].institution_id", to: "data.institutions[].id", count: people.reduce((s, p) => s + p.attributes.affiliations.length, 0) },
        { path: "links[].source / links[].target", to: "data.researchers[].id or data.institutions[].id", count: links.length },
    ],
    maxDepth: Math.max(...pathList.map((x) => x.path.split(/\.|\[\]/).filter(Boolean).length)),
    paths: pathList,
    document: doc,
    frame: { project: "Research network, March 2026", graphRow: "Research network" },
};

// ---------- plainJson: the one-step case ----------
const small = people.slice(0, 12);
const plainLinks = [];
small.forEach((p) => p.relationships.coauthor_ids.forEach((q) => { if (small.some((x) => x.id === q)) plainLinks.push({ source: p.id, target: q, weight: num(0.1, 1, 2) }); }));
for (let i = 0; plainLinks.length < 16 && i < 200; i++) {
    const a = pick(small), b = pick(small);
    if (a !== b && !plainLinks.some((l) => l.source === a.id && l.target === b.id)) plainLinks.push({ source: a.id, target: b.id, weight: num(0.1, 1, 2) });
}
const plainDoc = { directed: false, nodes: small.map((p) => ({ id: p.id, name: `${p.attributes.name.given} ${p.attributes.name.family}`, field: p.attributes.profile.field, h_index: p.attributes.profile.h_index })), links: plainLinks };
const plainJson = {
    title: "Coauthors, small sample",
    graphName: "Coauthors",
    file: "coauthors.json",
    source: "generated for the mocks by kit/gen-wide-nested.mjs: twelve researchers from the research network in node-link JSON, which loads in one step",
    nodes: plainDoc.nodes.length,
    edges: plainLinks.length,
    directed: false,
    document: plainDoc,
    frame: { project: "Coauthors", graphRow: "Coauthors" },
};

const out = JSON.stringify({ wide, nested, plainJson }) + "\n";
writeFileSync(join(here, "wide-nested.json"), out);
copyFileSync(join(here, "wide-nested.json"), join(here, "..", "app-b", "kit", "wide-nested.json"));
console.log(`wide: ${wide.nodes} hosts x ${wide.nodeAttributes.length} attributes, ${wide.edges} connections x ${wide.edgeAttributes.length} attributes`);
console.log(`nested: ${nested.records} records, ${links.length} links, ${pathList.length} paths, depth ${nested.maxDepth}`);
console.log(`plainJson: ${plainJson.nodes} nodes, ${plainJson.edges} links; ${(out.length / 1024).toFixed(0)} KB`);
