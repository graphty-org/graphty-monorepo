#!/usr/bin/env node
// The hash check of a site repository's deploy (tools/channel/site-deploy.yml, committed by the
// owner as deploy.yml in graphty-org/graphty-nightly and graphty-org/graphty-site).
//
// A release asset is not trusted by itself: a Write collaborator can replace it. deployed.json is
// written only with the site repository's deploy key (release.yml's site job, promote.yml), so the
// asset is deployed only when its sha256 equals the one deployed.json names
// (design/ci/channels-pipeline/channels.md, section 3).
//
//   node tools/channel/site-deploy.mjs check <deployed.json> <asset>
//
// Prints what it found and exits 1 on an invalid deployed.json or a hash mismatch.
import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SITES = ["nightly", "production"];

const SHAPES = {
    tag: /^site-[0-9a-f]{40}$/,
    sha256: /^[0-9a-f]{64}$/,
    configRef: /^[0-9a-f]{40}$/,
};

/**
 * Parses and validates deployed.json: { site, tag, sha256, configRef, time, approver }. configRef is
 * the graphty-monorepo commit whose graphty/sites/<site>.json becomes the site's site.json (master's
 * tip at dispatch).
 * @param text - the file's contents
 * @returns the parsed record; throws naming every invalid field
 */
export function parseDeployed(text) {
    let d;
    try {
        d = JSON.parse(text);
    } catch (err) {
        throw new Error(`deployed.json is not JSON: ${err.message}`);
    }
    const problems = [];
    if (!SITES.includes(d?.site))
        problems.push(`site must be one of ${SITES.join(", ")}, got ${JSON.stringify(d?.site)}`);
    for (const [field, shape] of Object.entries(SHAPES)) {
        if (typeof d?.[field] !== "string" || !shape.test(d[field])) {
            problems.push(`${field} ${JSON.stringify(d?.[field])} does not match ${shape}`);
        }
    }
    if (problems.length > 0) throw new Error(`deployed.json is invalid: ${problems.join("; ")}`);
    return d;
}

/**
 * Hashes a file as a stream, so a 373 MB site tarball is never held in memory.
 * @param path - a file
 * @returns its sha256, lower-case hex
 */
export async function sha256File(path) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
}

/**
 * Compares the downloaded asset with the sha256 deployed.json names.
 * @param deployed - the parsed deployed.json
 * @param assetPath - the downloaded site asset
 * @returns whether the asset may be deployed (ok), and a message saying why
 */
export async function checkAsset(deployed, assetPath) {
    const got = await sha256File(assetPath);
    if (got !== deployed.sha256) {
        return {
            ok: false,
            message: `refused: ${assetPath} has sha256 ${got}, deployed.json names ${deployed.sha256}`,
        };
    }
    return { ok: true, message: `${assetPath} matches deployed.json (sha256 ${got}, ${deployed.tag})` };
}

async function main([command, deployedPath, assetPath]) {
    if (command !== "check" || !deployedPath || !assetPath) {
        console.error("usage: site-deploy.mjs check <deployed.json> <asset>");
        return 2;
    }
    let deployed;
    try {
        deployed = parseDeployed(readFileSync(deployedPath, "utf8"));
    } catch (err) {
        console.error(err.message);
        return 1;
    }
    const result = await checkAsset(deployed, assetPath);
    (result.ok ? console.log : console.error)(result.message);
    return result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    process.exitCode = await main(process.argv.slice(2));
}
