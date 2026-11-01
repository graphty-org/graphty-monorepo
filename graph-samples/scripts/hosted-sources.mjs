/**
 * Where graph-samples' hosted datasets come from (scripts/build-hosted.mjs): their sources, the
 * GitHub releases that keep a copy of every redistributable one, and the files graphty.app already
 * publishes. A rebuild contacts a source's original host only when the release has no good copy of it
 * (or, with build-hosted.mjs --from-original-hosts and scripts/refresh-sources.mjs, always).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const USER_AGENT = "graphty-graph-samples-build-hosted";

/**
 * The GitHub release holding the copy of one redistributable source: one release per source, named by its
 * checksum, because the repository's releases are immutable (no file can be added to a published one), so
 * a new or changed source gets a release of its own. The graph-samples-sources.yml workflow creates them.
 * @param {{ sha256: string }} source - an entry of SOURCES
 * @returns {string} the release's tag
 */
export function sourceRelease(source) {
    return `graph-samples-source-${source.sha256.slice(0, 16)}`;
}

/** The download URL of a source's copy in its release (sourceRelease). */
export function sourceReleaseUrl(source) {
    return `https://github.com/graphty-org/graphty-monorepo/releases/download/${sourceRelease(source)}/${source.file}`;
}

/**
 * The bytes of a file graphty.app already publishes, when they are exactly the ones recorded in the
 * repository (their SHA-256), else null: missing, unreachable or different bytes are never used.
 * @param {string} url - the published file
 * @param {string | undefined} sha256 - the checksum the repository records for it
 * @param {typeof fetch} [fetchImpl] - fetch, replaceable in tests
 * @returns {Promise<Buffer | null>} the verified bytes, or null
 */
export async function publishedCopy(url, sha256, fetchImpl = fetch) {
    if (sha256 === undefined) {
        return null;
    }
    try {
        const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT } });
        if (!response.ok) {
            return null;
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        return sha256Of(bytes) === sha256 ? bytes : null;
    } catch {
        return null;
    }
}

/**
 * Every source file, its original URL and its checksum. `redistribute` says whether its terms
 * (graph-samples/NOTICE) allow a copy in a release of this repository (sourceRelease).
 */
export const SOURCES = {
    roadNyArcs: {
        url: "http://www.diag.uniroma1.it/challenge9/data/USA-road-d/USA-road-d.NY.gr.gz", // NOSONAR(S5332): the DIMACS host serves only http; every download is checked against the sha256 below
        sha256: "7b2446c7ffe6179efbc42af6812448e8cb782f12968ca2bb1d50d979343056d4",
        file: "USA-road-d.NY.gr.gz",
        redistribute: true,
    },
    roadNyCoordinates: {
        url: "http://www.diag.uniroma1.it/challenge9/data/USA-road-d/USA-road-d.NY.co.gz", // NOSONAR(S5332): the DIMACS host serves only http; every download is checked against the sha256 below
        sha256: "02547a628742164e02bd73f59e33a65d23dfac8fc54c09275c8b9169c38eafdf",
        file: "USA-road-d.NY.co.gz",
        redistribute: true,
    },
    arxiv: {
        url: "https://snap.stanford.edu/ogb/data/nodeproppred/arxiv.zip",
        sha256: "49f85c801589ecdcc52cfaca99693aaea7b8af16a9ac3f41dd85a5f3193fe276",
        file: "ogbn-arxiv.zip",
        redistribute: true,
    },
    dblp: {
        url: "https://snap.stanford.edu/data/bigdata/communities/com-dblp.ungraph.txt.gz",
        sha256: "9eb0bd30312ddd04e2624f7c36c0983a2e99b116f0385be5a7fce6d6170f4cb3",
        file: "com-dblp.ungraph.txt.gz",
        // NOTICE: "unclear: SNAP states no license for its files", so no copy is redistributed
        redistribute: false,
    },
    goBasic: {
        url: "https://release.geneontology.org/2026-08-05/ontology/go-basic.obo",
        sha256: "b08d45b268b8c24ccb2513dbbbc7d4df9f6521c099b413f79eb31e06e0fa3bcc",
        file: "go-basic-2026-08-05.obo",
        redistribute: true,
    },
    doid: {
        url: "https://raw.githubusercontent.com/DiseaseOntology/HumanDiseaseOntology/v2026-09-30/src/ontology/doid.obo",
        sha256: "51e717b6b9f5d391f2793f9e16faf9c8629a661ab8f21c3a024458129f182ad2",
        file: "doid-v2026-09-30.obo",
        redistribute: true,
    },
    bioplex: {
        // NDEx writes the CX2 on request; the checksum stops the build if it ever writes other bytes
        url: "https://www.ndexbio.org/v3/networks/e96d063d-237a-11ea-bb65-0ac135e8bacf",
        sha256: "242009380d6053b44fe3c7b1f0ff6d668d99425108f9b8fe744f3496759a7778",
        file: "ndex-e96d063d-237a-11ea-bb65-0ac135e8bacf.cx2",
        redistribute: true,
    },
};

/**
 * Where a source is fetched from, in order: its copy in the release, then its original host. A source
 * whose terms do not allow a copy, or a refresh (fromOriginalHost), has only its original host.
 * @param {{ url: string, file: string, redistribute: boolean }} source - an entry of SOURCES
 * @param {{ fromOriginalHost?: boolean }} [options] - fromOriginalHost: the refresh, or a rebuild by hand
 * @returns {string[]} the URLs to try
 */
export function sourceUrls(source, { fromOriginalHost = false } = {}) {
    return fromOriginalHost || !source.redistribute ? [source.url] : [sourceReleaseUrl(source), source.url];
}

/** The hex SHA-256 of some bytes. */
export function sha256Of(bytes) {
    return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The bytes at a URL when their SHA-256 is the recorded one, else why not.
 * @returns {Promise<{ bytes: Buffer } | { reason: string }>} the verified bytes, or the reason
 */
async function verifiedDownload(url, source, fetchImpl) {
    console.log(`fetching ${url}`);
    try {
        const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT } });
        if (!response.ok) {
            return { reason: `${url}: HTTP ${response.status}` };
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        const actual = sha256Of(bytes);
        return actual === source.sha256
            ? { bytes }
            : {
                  reason: `${url}: sha256 ${actual}, expected ${source.sha256} -- the source changed; review it before updating`,
              };
    } catch (error) {
        return { reason: `${url}: ${error.message}${error.cause ? " (" + error.cause.message + ")" : ""}` };
    }
}

/**
 * A source file in the cache directory, fetched when missing from the first of sourceUrls that serves
 * the recorded SHA-256 (a copy missing from the release, or an old one, falls through to the original
 * host); bytes with another SHA-256 are never used.
 * @param {{ url: string, sha256: string, file: string, redistribute: boolean }} source - an entry of SOURCES
 * @param {string} cacheDir - the cache directory
 * @param {{ fromOriginalHost?: boolean, fetchImpl?: typeof fetch }} [options] - see sourceUrls; fetch, replaceable in tests
 * @returns {Promise<string>} the cached file's path
 */
export async function fetchSource(source, cacheDir, { fromOriginalHost = false, fetchImpl = fetch } = {}) {
    const target = path.join(cacheDir, source.file);
    if (existsSync(target) && sha256Of(readFileSync(target)) === source.sha256) {
        return target;
    }
    const reasons = [];
    for (const url of sourceUrls(source, { fromOriginalHost })) {
        const result = await verifiedDownload(url, source, fetchImpl);
        if ("bytes" in result) {
            mkdirSync(cacheDir, { recursive: true });
            writeFileSync(target, result.bytes);
            return target;
        }
        reasons.push(result.reason);
    }
    const advice = source.redistribute
        ? `when its original host answers again, dispatch graph-samples-sources.yml (gh workflow run graph-samples-sources.yml --ref master) to copy it into the release ${sourceRelease(source)}, then re-run this build`
        : `it is not redistributable, so no release has a copy: re-run this build when its original host answers again`;
    throw new Error(
        `${source.file}: no copy with sha256 ${source.sha256} could be fetched; ${advice}\n  ${reasons.join("\n  ")}`,
    );
}
