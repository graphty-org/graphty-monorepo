/**
 * Which hosts are private, loopback or link-local: what a model fetched from a public address is
 * never redirected to.
 */

import { assert, describe, it } from "vitest";

import { isPrivateHost } from "../src/detect/index.js";

describe("isPrivateHost", () => {
    it("names loopback, private, link-local and .local hosts, with or without a trailing dot", () => {
        for (const host of [
            "localhost",
            "127.0.0.1",
            "10.0.0.2",
            "192.168.1.4",
            "169.254.0.1",
            "[::1]",
            "nas.local",
            "localhost.",
            "foo.localhost.",
            "printer.local.",
            "127.0.0.1.",
            "0.0.0.0",
        ]) {
            assert.isTrue(isPrivateHost(host), host);
        }

        assert.isFalse(isPrivateHost("pictures.example.org"));
    });

    it("reads private addresses in every spelling the URL parser leaves, and public ones as public", () => {
        const host = (url: string): string => new URL(url).hostname;
        for (const url of [
            "http://198.18.0.1/",
            "http://198.19.255.1/",
            "http://192.0.0.8/",
            "http://224.0.0.1/",
            "http://255.255.255.255/",
            "http://100.64.0.1/",
            "http://172.16.0.1/",
            "http://[::127.0.0.1]/",
            "http://[::ffff:127.0.0.1]/",
            "http://[64:ff9b::7f00:1]/",
            "http://[2002:c0a8:0101::]/",
            "http://[ff02::1]/",
            "http://[fec0::1]/",
            "http://[fe80::1]/",
            "http://[fd00::1]/",
        ]) {
            assert.isTrue(isPrivateHost(host(url)), url);
        }

        for (const url of [
            "http://8.8.8.8/",
            "http://172.32.0.1/",
            "http://[2606:4700::1111]/",
            "http://[64:ff9b::808:808]/",
            "http://[2002:808:808::]/",
        ]) {
            assert.isFalse(isPrivateHost(host(url)), url);
        }
    });

    it("refuses an IPv6 address it cannot read rather than guess", () => {
        assert.isTrue(isPrivateHost("1::2::3"));
    });
});
