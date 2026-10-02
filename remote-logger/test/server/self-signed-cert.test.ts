import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import type { AddressInfo } from "net";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { certFilesExist, generateSelfSignedCert, readCertFiles } from "../../src/server/self-signed-cert.js";

describe("self-signed-cert", () => {
    const tmpDir = path.join(process.cwd(), "tmp");
    const testCertPath = path.join(tmpDir, "test-cert.pem");
    const testKeyPath = path.join(tmpDir, "test-key.pem");

    beforeEach(() => {
        // Ensure tmp directory exists
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testCertPath)) {
            fs.unlinkSync(testCertPath);
        }
        if (fs.existsSync(testKeyPath)) {
            fs.unlinkSync(testKeyPath);
        }
    });

    describe("generateSelfSignedCert", () => {
        test("should generate valid certificate and key", async () => {
            const result = await generateSelfSignedCert();

            expect(result).toHaveProperty("cert");
            expect(result).toHaveProperty("key");
            expect(result.cert).toContain("-----BEGIN CERTIFICATE-----");
            expect(result.cert).toContain("-----END CERTIFICATE-----");
            expect(result.key).toContain("-----BEGIN PRIVATE KEY-----");
            expect(result.key).toContain("-----END PRIVATE KEY-----");
        });

        test("should generate certificate with custom hostname", async () => {
            const result = await generateSelfSignedCert("custom.example.com");

            expect(result.cert).toContain("-----BEGIN CERTIFICATE-----");
            expect(result.key).toContain("-----BEGIN PRIVATE KEY-----");
        });

        test("should include hostname, localhost and loopback IPs in Subject Alternative Names", async () => {
            const result = await generateSelfSignedCert("test.local");
            const x509 = new crypto.X509Certificate(result.cert);

            expect(x509.subjectAltName).toBe(
                "DNS:test.local, DNS:localhost, IP Address:127.0.0.1, IP Address:0:0:0:0:0:0:0:1",
            );
            expect(x509.subject).toContain("CN=test.local");
            expect(x509.publicKey.asymmetricKeyType).toBe("rsa");
            expect(x509.publicKey.asymmetricKeyDetails?.modulusLength).toBe(2048);
            const days = (Date.parse(x509.validTo) - Date.parse(x509.validFrom)) / 86_400_000;
            expect(Math.round(days)).toBe(365);
        });

        test("should be accepted by an HTTPS client that trusts it", async () => {
            const { cert, key } = await generateSelfSignedCert("localhost");
            const server = https.createServer({ cert, key }, (_req, res) => res.end("ok"));
            await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
            const { port } = server.address() as AddressInfo;
            try {
                const body = await new Promise<string>((resolve, reject) => {
                    https
                        .get({ host: "127.0.0.1", servername: "localhost", port, ca: cert }, (res) => {
                            let data = "";
                            res.on("data", (chunk: Buffer) => (data += chunk.toString()));
                            res.on("end", () => resolve(data));
                        })
                        .on("error", reject);
                });
                expect(body).toBe("ok");
            } finally {
                server.close();
            }
        });
    });

    describe("certFilesExist", () => {
        test("should return false if cert file does not exist", () => {
            const result = certFilesExist("/nonexistent/cert.pem", "/nonexistent/key.pem");
            expect(result).toBe(false);
        });

        test("should return false if key file does not exist", () => {
            // Create cert file only
            fs.writeFileSync(testCertPath, "test cert content");

            const result = certFilesExist(testCertPath, "/nonexistent/key.pem");
            expect(result).toBe(false);
        });

        test("should return true if both files exist and are readable", () => {
            // Create both files
            fs.writeFileSync(testCertPath, "test cert content");
            fs.writeFileSync(testKeyPath, "test key content");

            const result = certFilesExist(testCertPath, testKeyPath);
            expect(result).toBe(true);
        });
    });

    describe("readCertFiles", () => {
        test("should read cert files from disk", () => {
            const certContent = "-----BEGIN CERTIFICATE-----\ntest cert\n-----END CERTIFICATE-----";
            const keyContent = "-----BEGIN PRIVATE KEY-----\ntest key\n-----END PRIVATE KEY-----";

            fs.writeFileSync(testCertPath, certContent);
            fs.writeFileSync(testKeyPath, keyContent);

            const result = readCertFiles(testCertPath, testKeyPath);

            expect(result.cert).toBe(certContent);
            expect(result.key).toBe(keyContent);
        });

        test("should throw error if cert file does not exist", () => {
            fs.writeFileSync(testKeyPath, "test key content");

            expect(() => readCertFiles("/nonexistent/cert.pem", testKeyPath)).toThrow();
        });

        test("should throw error if key file does not exist", () => {
            fs.writeFileSync(testCertPath, "test cert content");

            expect(() => readCertFiles(testCertPath, "/nonexistent/key.pem")).toThrow();
        });
    });
});
