# remote-logger

`@graphty/remote-logger` sends a browser's console output to a server on your machine, where you
read it in a terminal, over a REST API, or through an AI assistant's MCP tools. It is for the
browsers whose console you cannot easily open: a phone, a VR headset, a kiosk, a Storybook story
you are not looking at, a headless test run.

Browser applications run in a sandbox - their `console.log()` output appears in browser DevTools but is not accessible to CLI tools, terminal sessions, or AI assistants. Remote logging bridges this gap by sending browser logs to a server where they can be viewed, searched, and analyzed.

**Use cases where remote logging shines:**

- **Storybook & Component Development** - See console output without switching to browser DevTools
- **Mobile Web Apps** - Phones and tablets require USB debugging to access DevTools
- **VR/AR Applications** - You can't see a browser console while wearing a headset
- **Embedded Devices** - Kiosks, smart displays, and IoT devices without keyboard access
- **CI/CD & Automated Testing** - Capture browser logs during headless test runs
- **LLM-Assisted Debugging** - AI assistants can read, interpret, and act on logs without requiring user interaction with browser DevTools

## Read next

- [Getting started](./guide/getting-started): start the server and send it a first log line.
- [The browser client](./guide/browser-client): `RemoteLogClient`, its options and throttling, and
  the console capture widget.
- [The server](./guide/server): the command line, `startLogServer()`, the REST API, HTTPS, log
  files and how long they are kept.
- [MCP tools](./guide/mcp): reading logs from Claude Code or another MCP client.
- [Typical setups](./guide/setups): Storybook and Vite, phones and VR headsets, third-party sites.
- [Troubleshooting](./guide/troubleshooting)
- [API reference](./api/): every export of every entry point.
