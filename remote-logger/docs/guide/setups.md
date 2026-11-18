# Typical setups

## Phones, tablets and VR headsets

A phone or a headset cannot reach `localhost` on your computer. The command-line server listens on
every network address by default (`--host 0.0.0.0`), so point the script tag or `serverUrl` at
your computer's address on the local network instead. A page served over HTTPS may only send to an HTTPS
server, so start the server with a certificate (see [HTTPS certificates](./server#https-certificates));
a WebXR page always needs HTTPS. The device's console output then appears in your terminal while
you wear the headset or hold the phone.

## Vite Integration (Automatic Project Markers)

Use the Vite plugin to automatically inject project markers into your browser builds:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";

export default defineConfig({
    plugins: [remoteLoggerPlugin()],
});
```

The plugin automatically:

- Detects if you're in a git worktree (e.g., `.worktrees/my-feature`) and uses the worktree name as the marker
- Falls back to the project directory basename for regular projects
- Injects `__REMOTE_LOG_PROJECT_MARKER__` and `__REMOTE_LOG_WORKTREE_PATH__` globals

The `RemoteLogClient` automatically reads these globals when available:

```typescript
// These are injected by the Vite plugin
declare const __REMOTE_LOG_PROJECT_MARKER__: string | undefined;
declare const __REMOTE_LOG_WORKTREE_PATH__: string | undefined;

// Client reads them automatically
const client = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    // projectMarker and worktreePath are auto-detected!
});
```

## Storybook

Storybook runs on Vite, so the [Vite plugin](#vite-integration-automatic-project-markers) adds the
client to every story: each story's console output reaches the server, tagged with the project
marker, without opening the browser's developer tools.

## Usage with graphty-element

Add URL parameter to enable remote logging in Storybook:

```
?graphty-element-remote-log=http://localhost:9080
```

## Debugging Third-Party Sites

The server includes a reverse proxy that injects the remote logger into any website -- no install required on the target site.

```
http://localhost:9080/proxy/https://example.com
```

Point your browser (including iOS Safari) at the proxy URL. The proxy:

- Fetches the target page and injects the remote-logger script into HTML responses (using parse5 for safe HTML manipulation)
- Injects a `<base>` tag so relative URLs resolve through the proxy
- Strips Content-Security-Policy headers that would block the injected script
- Strips integrity attributes (SRI) from script/link tags
- Rewrites Set-Cookie Domain/Secure attributes for HTTP proxy compatibility
- Uses a custom TLS fingerprint to avoid CDN bot detection (Fastly, Akamai)
- Passes non-HTML resources (CSS, JS, images) through unmodified

**Limitations:**

- Resources using absolute paths (e.g., `/fonts/...`, `/media/...`) bypass the `<base>` tag and return 404
- JavaScript `fetch()` calls using absolute paths may bypass the proxy
- OAuth redirect flows that check the origin domain will not work
- WebSocket connections are not proxied
- Sites with very aggressive bot detection may still block the proxy

**Security:**

The server listens on all interfaces (`0.0.0.0`) by default so phones and headsets on your network can send logs, and it has no authentication. Anyone who can reach the port can send logs, read them (`/logs`) and use the proxy. To limit that:

- The proxy refuses targets on loopback, private, link-local (including cloud metadata at `169.254.169.254`) and unique-local addresses, so it cannot be used to reach services only your machine can see. Start the server with `--proxy-allow-private` to proxy such a host anyway.
- The proxy verifies upstream TLS certificates.
- Only `/log`, `/health` and `/remote-logger.js` answer web pages on other origins. A page on another origin cannot read or clear the logs, or drive the proxy.
- Bind to `127.0.0.1` with `--host 127.0.0.1` when no other device needs to reach the server.
