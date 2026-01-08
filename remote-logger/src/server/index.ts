/**
 * Server-side logging utilities.
 * These are only meant to be run in Node.js, not in the browser.
 * @module server
 */

export {
    clearLogs,
    HELP_TEXT,
    type LogEntry,
    type LogServerOptions,
    main,
    parseArgs,
    type ParseArgsResult,
    startLogServer,
} from "./log-server.js";
export { certFilesExist, type GeneratedCert, generateSelfSignedCert, readCertFiles } from "./self-signed-cert.js";
