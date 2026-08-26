# Netlify functions

This directory owns bounded background and scheduled entry points. Domain rules stay in
typed application modules; a function validates its signed invocation, claims durable work,
calls the module, checkpoints the result, and stops before its execution budget expires.

No function may contain a browser-exposed service credential or treat a schedule as exactly-once.
