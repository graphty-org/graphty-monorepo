// A stand-in daemon for the restart spike: prints its pid and stays alive.
console.log(`s26 up pid=${process.pid} at ${new Date().toISOString()}`);
setInterval(() => {}, 60_000);
