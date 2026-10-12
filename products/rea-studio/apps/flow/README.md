# REA Flow

Working local development application for stateful event routing. Start REA Studio and open **Flow**. Edit/save/import/export flow JSON, preview connected node cards, choose an inject node, deliver JSON messages, inspect debug messages, inspect persisted counters and batch buffers, reset state, and reopen the last 50 runs.

This differs from Automation: deliveries run through a FIFO event queue, nodes receive individual messages, and counters/batch buffers survive successful runs. The default example routes temperature events to hot/normal debug outputs and counts hot events across injections. Inject, change, switch, delay, batch, counter and debug nodes are implemented. Change supports set (literal or `from` property path), increment and delete. Switch supports strict comparisons, type tests, contains and otherwise; `first:true` stops at the first match. A switch connection uses the zero-based rule index as its `port`; other nodes use port zero. Otherwise matches only when preceding rules have not matched. Separate branches receive cloned messages. Batch emits `{topic,payload:[messages]}` when its configured size is reached; incomplete buffers persist. Delay waits for 0–1000 milliseconds per delivery. Cycles are permitted but a run aborts after 5,000 deliveries or five seconds of combined delays. Failed runs retain an error record and do not commit partially updated node state.

## Current gaps against Node-RED

This original implementation does not import the study's reference-assisted Switch reconstruction. It is **not a complete Node-RED replacement**. It lacks Node-RED-compatible flow files, draggable wiring, deploy lifecycle, community node packages, MQTT/HTTP/WebSocket/serial/database connectors, timed inject scheduling, JavaScript Function nodes, JSONata expressions, context stores, subflows, message-sequence rules, template language, catch/status nodes, credentials, accounts, permissions, configuration nodes, dashboards and production queue recovery. The host serializes API operations within each application; state is not a distributed or transactional event store. The application has not demonstrated feature parity or objective overall improvement.

The scope/gaps were checked against the official [Node-RED core node documentation](https://nodered.org/docs/user-guide/nodes) on 2026-10-12. That documentation includes scheduled Inject, message inspection, arbitrary Function code, Change/context, Switch/JSONata/sequences and Template behavior beyond this application.

## Validation

`node --test products/rea-studio/apps/flow/app.test.mjs` checks API save/inject/state/reset, scalar routing, persistent counters and batch buffers, awaited delays, transforms, input immutability, unsafe property paths, invalid ports and cycle failure without partial-state commit. Tests are for this core, not Node-RED parity, throughput or crash durability.
