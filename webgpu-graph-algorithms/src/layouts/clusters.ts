/**
 * The cluster force (issue #3257; `LayoutSimulation.setClusters`): the stage every force model runs after its
 * attraction. `cluster-centroid` sums each community on the device, one workgroup per community, over member lists
 * sorted once per setClusters(); `cluster-pull` adds the pull to `force`. Both read the iteration's Fa2Params slot: the
 * strength and the community count travel there, with the law's `frK` and `springCoefficient`.
 *
 * ponytail: one workgroup per community, so a single community of a million nodes walks its members on one compute
 * unit; split the member list across workgroups if that shows up in a real graph.
 */

import { NO_CLUSTER } from "../constants.js";
import { type DispatchPlan, plan1d, plan2d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { FA2_PARAMS, kernelSpec } from "../kernels.js";
import { type Lease } from "../memory/lease.js";
import { type Binding } from "../types/memory.js";
import { type ModelResources } from "./force-simulation.js";

/**
 * The rows of each community in row order, as a counting sort.
 * @param communities - one community per row, or NO_CLUSTER
 * @returns `members`, and `start`: where each community begins in it, one more entry than there are communities
 */
export function sortMembers(communities: Uint32Array): {
    readonly members: Uint32Array<ArrayBuffer>;
    readonly start: Uint32Array<ArrayBuffer>;
} {
    let count = 0;
    let rows = 0;
    for (const community of communities) {
        if (community !== NO_CLUSTER) {
            count = Math.max(count, community + 1);
            rows++;
        }
    }
    const start = new Uint32Array(count + 1);
    for (const community of communities) {
        if (community !== NO_CLUSTER) {
            start[community + 1]++;
        }
    }
    for (let c = 0; c < count; c++) {
        start[c + 1] += start[c];
    }
    const next = start.slice();
    const members = new Uint32Array(rows);
    communities.forEach((community, row) => {
        if (community !== NO_CLUSTER) {
            members[next[community]++] = row;
        }
    });
    return { members, start };
}

/** See the file header. */
export class ClusterStage {
    private readonly device: GPUDevice;
    private readonly caps: ModelResources["caps"];
    private readonly plan: DispatchPlan;
    private readonly clusterOf: Binding;
    private readonly members: Binding;
    private readonly clusterStart: Binding;
    private readonly bound: { readonly centroid: BoundKernel; readonly pull: BoundKernel };
    /** One workgroup per community. */
    private groups: DispatchPlan | null = null;
    /** How many communities the last update() uploaded, what the Fa2Params slot carries. */
    private countValue = 0;

    /**
     * Takes the stage's buffers from the lease and binds the kernels; create() is the only caller.
     * @param resources - the simulation's resources
     * @param lease - the lease
     * @param centroid - the compiled `cluster-centroid`
     * @param pull - the compiled `cluster-pull`
     */
    private constructor(
        resources: ModelResources,
        private lease: Lease | null,
        private readonly centroid: Kernel,
        private readonly pull: Kernel,
    ) {
        const { n, device, caps, ring } = resources;
        const storage = (bytes: number, label: string): Binding => ({
            buffer: (lease as Lease).storage(bytes, label),
            offset: 0,
            size: bytes,
            window: null,
        });
        this.device = device;
        this.caps = caps;
        this.plan = plan1d(n, pull.workgroupSize, caps);
        this.clusterOf = storage(4 * n, "cluster/clusterOf");
        this.members = storage(4 * n, "cluster/members");
        this.clusterStart = storage(4 * (n + 1), "cluster/start");
        const centroids = storage(16 * n, "cluster/centroids");
        const pos = resources.buffer("positions");
        const P = ring.binding(FA2_PARAMS);
        this.bound = {
            centroid: centroid.bind({ pos, members: this.members, clusterStart: this.clusterStart, centroids, P }),
            pull: pull.bind({
                pos,
                force: resources.buffer("force"),
                clusterOf: this.clusterOf,
                centroids,
                P,
            }),
        };
    }

    /**
     * Compiles the stage and binds it over a lease of the context's pool.
     * @param resources - the simulation's resources (n > 0)
     * @param law - the model's law of attraction: 0 ForceAtlas2, 1 Fruchterman-Reingold, 2 spring-electrical
     * @returns the stage
     */
    static async create(resources: ModelResources, law: 0 | 1 | 2): Promise<ClusterStage> {
        const { pipelines, pool } = resources;
        const lease = pool.lease();
        try {
            const centroid = await pipelines.kernel(kernelSpec("cluster-centroid"));
            const pull = await pipelines.kernel(kernelSpec("cluster-pull", { LAW: law }));
            return new ClusterStage(resources, lease, centroid, pull);
        } catch (error) {
            lease.release();
            throw error;
        }
    }

    /**
     * How many communities the stage pulls.
     * @returns the count
     */
    get count(): number {
        return this.countValue;
    }

    /**
     * Uploads the communities; queue writes, so they land before the next submit.
     * @param communities - one community per row, or NO_CLUSTER
     */
    update(communities: Uint32Array<ArrayBuffer>): void {
        const { members, start } = sortMembers(communities);
        this.countValue = start.length - 1;
        this.groups = plan2d(this.countValue, this.caps);
        this.device.queue.writeBuffer(this.clusterOf.buffer, 0, communities);
        this.device.queue.writeBuffer(this.members.buffer, 0, members);
        this.device.queue.writeBuffer(this.clusterStart.buffer, 0, start);
    }

    /**
     * Records the sums and the pull after an attraction.
     * @param pass - the open compute pass
     * @param offset - the iteration's Fa2Params dynamic offset
     */
    record(pass: GPUComputePassEncoder, offset: number): void {
        if (this.countValue > 0 && this.groups !== null) {
            this.centroid.dispatch(pass, this.bound.centroid, this.groups, [offset]);
            this.pull.dispatch(pass, this.bound.pull, this.plan, [offset]);
        }
    }

    /** Releases the lease and drops the bind groups; idempotent. */
    dispose(): void {
        this.lease?.release();
        this.lease = null;
        this.centroid.invalidate();
        this.pull.invalidate();
    }
}
