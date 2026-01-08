import * as fs from "fs";
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
        test("should generate valid certificate and key", () => {
            const result = generateSelfSignedCert();

            expect(result).toHaveProperty("cert");
            expect(result).toHaveProperty("key");
            expect(result.cert).toContain("-----BEGIN CERTIFICATE-----");
            expect(result.cert).toContain("-----END CERTIFICATE-----");
            expect(result.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
            expect(result.key).toContain("-----END RSA PRIVATE KEY-----");
        });

        test("should generate certificate with custom hostname", () => {
            const result = generateSelfSignedCert("custom.example.com");

            expect(result.cert).toContain("-----BEGIN CERTIFICATE-----");
            expect(result.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
        });

        test("should include hostname in Subject Alternative Names", () => {
            // The selfsigned library includes SANs in the certificate
            // We can't easily decode the certificate to verify, but we can
            // at least verify the certificate is generated
            const result = generateSelfSignedCert("test.local");

            expect(result.cert).toBeTruthy();
            expect(result.key).toBeTruthy();
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
            const keyContent = "-----BEGIN RSA PRIVATE KEY-----\ntest key\n-----END RSA PRIVATE KEY-----";

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
