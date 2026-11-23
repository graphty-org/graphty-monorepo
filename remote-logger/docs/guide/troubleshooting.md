# Troubleshooting

## CORS Errors

The server includes CORS headers by default (`Access-Control-Allow-Origin: *`). If you still encounter CORS issues:

1. Ensure you're using the correct protocol (http vs https)
2. Check that the port is correct
3. For HTTPS with a certificate the browser does not trust, accept the certificate first by visiting the server URL directly

## Certificate Warnings

When the server uses a certificate the browser does not trust (a self-signed one, say):

1. Navigate to `https://localhost:9080/health` in your browser
2. Accept the security warning
3. Your application should now be able to connect

## Logs Not Appearing

1. Check the browser console for network errors
2. Verify the server is running: `curl http://localhost:9080/health`
3. Check that `flush()` is being called before page unload
4. Increase `batchIntervalMs` if logs are being sent too frequently

## High Memory Usage on Server

The server stores all logs in memory. For long-running sessions:

1. Use `POST /logs/clear` periodically to clear logs
2. Or use `clearLogs()` programmatically
3. Consider using `--log-file` to persist logs to disk and reduce memory pressure
