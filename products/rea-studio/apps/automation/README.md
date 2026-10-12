# REA Automation

Working local development application for declarative JSON workflows, HTTP requests, delays and saved-workflow calls. Create and edit nodes and connections, import/export the application's JSON format, save workflows, run or cancel executions, inspect per-node attempts and outputs, and revisit execution history. Start the REA Studio host and open **Automation**. The separate **Native n8n workflows** panel imports native JSON, preserves unknown fields, and runs the bounded Manual Trigger 1 / Set 3.4 / If 2.3 / HTTP Request 4.4 / Wait 1.1 slice. See [native contracts and original comparison](NATIVE-SOURCE-COMPARISON.md) and [current native validation](native-validation.json). The sections below describe the existing custom format.

The sample filters orders worth at least 100 and sums the qualifying amounts. Input is an array of JSON objects. The original transformation nodes remain `input`, `map`, `filter`, `branch`, `aggregate` and `output`. Map uses literal values or `{ "from": "customer.name" }` references, with `keep:false` to discard other fields. Filter/branch support strict equality, inequality, numeric ordering, string contains and exists. Aggregate supports count, sum, average, min and max. Non-numeric values are ignored by numeric aggregates; empty average/min/max is null. Numeric overflow fails explicitly. Aggregate `as` supports nested paths but cannot overwrite `count`/`numericCount`. Multiple incoming edges concatenate data in stored edge order. Branches use `true`/`false`; ordinary success uses `out`; nodes configured with `error-output` may use `error`. Validation rejects cycles, disconnected nodes, malformed ports and unsafe object paths.

## HTTP requests

A `http` node makes one request for each incoming item, in order. URL accepts an absolute HTTP(S) string or a `{ "from": "endpoint" }` reference. Embedded URL credentials are rejected. Methods are GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS. `headers` and `query` are objects with scalar values or `from`/`secret` references. Query keys replace existing values of the same name. Transport-managed headers are rejected.

```json
{
  "id": "request",
  "type": "http",
  "config": {
    "url": { "from": "endpoint" },
    "method": "POST",
    "headers": { "Authorization": { "secret": "apiToken" } },
    "bodyType": "json",
    "body": { "customer": { "from": "customer.name" } },
    "responseFormat": "auto",
    "timeoutMs": 10000,
    "responsePath": "response"
  },
  "settings": { "onError": "error-output", "retry": { "maxAttempts": 3, "delayMs": 1000 } }
}
```

`bodyType` is `none` (default), `json` or `raw`. JSON bodies support nested references; raw bodies accept text or one reference. GET/HEAD cannot send a body. Default content types are application/json and text/plain respectively, unless a header overrides them. `responseFormat` is `auto` (JSON media types become JSON; other content becomes text), `json`, or `text`. Empty JSON responses become null. Invalid JSON fails explicitly.

Success writes `{ "statusCode": 200, "headers": {}, "body": ... }` at `responsePath` (default `response`) on a copy of the input item. `keepInput:false` starts from an empty item. Non-2xx status fails unless `neverError:true`; network, parse, timeout and response-size errors still fail. `followRedirects` defaults to true and follows Node's Fetch behavior, including stripping authorization/cookie headers on cross-origin redirects. Maximum redirects follow the Fetch implementation rather than a configurable n8n value. Cookies are not stored between requests. Request timeout covers the entire response, including body reads, and is 1–60,000 ms (default 10,000).

## Delay, calls and error behavior

- `wait` with `{ "delayMs": 1000 }` pauses the current process and then passes its items unchanged. Delay must be an integer from 0 to 60,000 ms. Empty streams skip HTTP, wait and call nodes, preventing requests from unused branches.
- `call` with `{ "workflowId": "saved-id", "mode": "all", "outputId": "result" }` loads a saved definition and waits for it. `all` runs once with every input item; `each` runs once per item. `outputId` chooses one child output; omitting it concatenates child outputs in execution order. Child traces are nested under the parent call. Calls share the parent's request/node limits, cancellation and deadline. They do not create separate execution-history records. Repeated workflow IDs and depth beyond five workflows are rejected.
- Every node accepts `settings.onError`: `stop` (default) fails the run, `continue` passes the original input onward, or `error-output` routes `{ ...input, "error": { "node", "code", "message", ... } }` through `error`. HTTP applies the policy separately to each item; other nodes apply it to the whole node. A failed branch under `continue` passes input through `true`. Cancellation, workflow timeout and execution limits always stop execution.
- `settings.retry` accepts `maxAttempts` from 1 to 5 (default 1) and `delayMs` from 0 to 10,000 (default 0). HTTP retries only the current item, preserving earlier successful items. Other nodes retry the whole operation. Invalid request configuration, missing run secrets, recursion and size/budget limits are not retried. Retrying a request or child workflow can repeat side effects; no exactly-once guarantee is provided.

## Execution and secret handling

The editor uses `start`, `run-status` and `cancel` actions; `run` remains an awaited API for scripts and tests. Runs have running/completed/failed/cancelled/interrupted states. Completed steps and the failing step retain their attempt counts, timings, status and error. Error responses in traces use a 4,096-character body preview; request bodies are not copied into traces. Cancelling a delay, request, response body or retry delay aborts subsequent steps, but cannot undo a completed remote action or interrupt a synchronous transformation mid-instruction. Shutdown cancels active executions for that workspace. An abandoned persisted running record becomes interrupted when history is read; it is not resumed.

Supply credentials using the editor's **Run secrets JSON** or API `secrets` object and `{ "secret": "name" }` references. Secrets are used in memory and are not included in saved definitions or history. History and returned run snapshots redact known secret strings, authorization/cookie/API-key headers, common credential keys and sensitive URL query parameters, including echoed response data. Runtime data passed between nodes retains the original values. Redaction is not an encrypted credential vault or a guarantee against arbitrary transformations of secrets. Literal values in saved definitions are stored as supplied; use secret references for credentials.

Definitions allow 100 nodes and 300 connections; each node allows 10,000 items. A root execution allows 500 total node visits and 500 HTTP attempts, including child calls. Requests and responses are capped at 1 MiB each; each node and combined root outputs at 4 MiB. URLs are capped at 8,192 characters, headers at 16 KiB total and 8,192 characters per value. `workflow.settings.timeoutMs` is 1–120,000 ms (default 120,000). History retains up to 50 runs within a 12 MiB total, removing oldest runs as needed; unusually large traces omit request/response detail and mark `traceDetailsLimited`. These are development bounds, not n8n limits.

## Current gaps against n8n

This application is an original implementation and does not load the study's reference-assisted reconstruction or execute a vendor workflow engine. It is **not a complete n8n replacement**. The custom format remains separate from the bounded native JSON slice described above. It still lacks complete n8n runtime orchestration, connector/credential systems, OAuth, webhooks, schedules, queues, general expressions/code nodes, error-trigger workflows, published versions, collaboration, accounts, credential encryption and enterprise administration. HTTP additionally lacks forms/binary files, pagination, proxy configuration, configurable redirect limits, credential domain policies, batching and n8n item linking. Calls lack native trigger/input schemas, type conversion, detached execution, child execution IDs and graph extraction. Its editor presents cards and forms rather than a draggable graph. Production network-access policy, recovery and security assessment remain open. No speed, reliability, accessibility or superiority claim has been established.

The [pinned source comparison](SOURCE-COMPARISON.md) documents the exact official documentation/source revisions consulted on 2026-10-12, matching contracts, explicit differences and original-execution gaps. In particular, this application's full-response envelope, whole-body timeout, per-item retries, bounded in-process delay and child-output concatenation differ from n8n. Source reading and local fixtures do not establish observed original-product parity.

## Validation

`node --test products/rea-studio/apps/automation/app.test.mjs products/rea-studio/apps/automation/execution.test.mjs` exercises the transformation core and synthetic local HTTP endpoints: seven methods, JSON/raw bodies, headers/query/references, status handling, redirects, credential stripping/redaction, response limits, retry traces, delayed headers/stalled bodies, error routing, branch side-effect avoidance, waits, workflow deadlines, saved calls, recursion, cancellation, concurrent history writes and real host API cancellation. The shared test runner discovers both files. These establish the implemented contracts, not original-product parity, production durability or remote-account compatibility.
