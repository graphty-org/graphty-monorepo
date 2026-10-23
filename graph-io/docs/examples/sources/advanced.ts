import { defineSource, loadFromSource, replayFetch, throwIfAborted } from "@graphty/graph-io";

type RoutePage = { routes: { from: string; to: string; km: number }[]; done: number; total: number; last: boolean };

export const flights = defineSource({
    id: "flights",
    descriptor: {
        plainName: "Flights",
        defaultEndpoint: "https://flights.example.com/api/",
        params: [{ name: "airline", plainName: "Airline", type: "string", required: true }],
    },
    async import(params: { airline: string }, sink, ctx) {
        sink.setDirected(true);
        const km = sink.declareEdgeColumn({ name: "distanceKm", dtype: "f32", nullable: true });
        let page = Number(ctx.cursor?.page ?? 0);
        for (;;) {
            const res = await ctx.fetchJson<RoutePage>(
                `routes?airline=${encodeURIComponent(params.airline)}&page=${page}`,
            );
            for (const [i, r] of res.routes.entries()) {
                if (i % 64 === 0) throwIfAborted(ctx.signal);
                sink.setEdgeValue(km, sink.addEdge(r.from, r.to), r.km);
            }
            ctx.progress(res.done, res.total, "items");
            if (res.last || ctx.limits.reached()) return ctx.finish({ next: res.last ? null : { page: page + 1 } });
            page += 1;
        }
    },
});

const fetch = replayFetch([
    {
        url: "https://flights.example.com/api/routes?airline=GA&page=0",
        body: { routes: [{ from: "AMS", to: "LHR", km: 371 }], done: 1, total: 2, last: false },
    },
    {
        url: "https://flights.example.com/api/routes?airline=GA&page=1",
        body: { routes: [{ from: "LHR", to: "JFK", km: 5540 }], done: 2, total: 2, last: true },
    },
]);

// a cap stops after the first page and says where to continue
const first = await loadFromSource(flights, { airline: "GA" }, { fetch, limits: { maxEdges: 1 } });
console.log(`first: ${first.snapshot.edgeCount} edge, ${first.report.issues[0]?.code}`);
const rest = await loadFromSource(flights, { airline: "GA" }, { fetch, cursor: first.report.source?.next });
console.log(`rest: ${rest.snapshot.edgeCount} edge, next ${JSON.stringify(rest.report.source?.next)}`);
