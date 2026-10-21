/**
 * @file What a recorded endpoint is (design/documents/sources.md, "Network loads" rule 2 and
 * "Reopening" rule 4): the form a file's endpoint must have to run, and which endpoints are on the
 * reader's own machine or local network, every spelling the URL parser accepts for one.
 */

import { assert, describe, it } from "vitest";

import { isLocalNetwork, isRecordableEndpoint } from "../../../src/session/sources/endpoint";

describe("isLocalNetwork", () => {
    const local = [
        "http://localhost:7474",
        "http://localhost.:7474/db",
        "http://LOCALHOST/",
        "http://neo4j.localhost/",
        "http://printer.local/",
        "http://db.internal/",
        "http://nas.home.arpa/",
        "http://router.lan/",
        "http://intranet/",
        "http://0.0.0.0:7474/",
        "http://127.0.0.1/",
        "http://127.1/",
        "http://2130706433/",
        "http://10.1.2.3/",
        "http://100.64.0.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://172.16.0.1/",
        "http://172.31.255.255/",
        "http://192.168.1.1/",
        "http://[::1]/",
        "http://[::]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[fc00::1]/",
        "http://[fd12:3456::1]/",
        "http://[fe80::1]/",
        "bolt://localhost:7687",
        "not a url",
    ];
    for (const endpoint of local) {
        it(`counts ${endpoint} as local`, () => {
            assert.isTrue(isLocalNetwork(endpoint));
        });
    }

    const remote = [
        "https://db.example.org/db/neo4j/query/v2",
        "https://8.8.8.8/",
        "https://172.32.0.1/",
        "https://100.128.0.1/",
        "https://[2001:db8::1]/",
        "https://api.openalex.org",
        "bolt+s://db.example.org:7687",
    ];
    for (const endpoint of remote) {
        it(`counts ${endpoint} as remote`, () => {
            assert.isFalse(isLocalNetwork(endpoint));
        });
    }

    it("counts the source's default endpoint, null, as remote", () => {
        assert.isFalse(isLocalNetwork(null));
    });
});

describe("isRecordableEndpoint", () => {
    it("takes an absolute http, https or bolt URL of origin and path", () => {
        for (const endpoint of [
            "https://db.example.org/db/neo4j/query/v2",
            "http://localhost:7474",
            "bolt+s://h:7687",
        ]) {
            assert.isTrue(isRecordableEndpoint(endpoint), endpoint);
        }
    });

    it("refuses a user name, a query, a fragment, another scheme and text that is no URL", () => {
        for (const endpoint of [
            "https://u:p@db.example.org/",
            "https://db.example.org/?key=1",
            "https://db.example.org/?",
            "https://db.example.org/#x",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "x",
            "",
        ]) {
            assert.isFalse(isRecordableEndpoint(endpoint), endpoint);
        }
    });
});
