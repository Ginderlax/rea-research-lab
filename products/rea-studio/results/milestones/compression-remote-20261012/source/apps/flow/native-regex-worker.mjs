import { parentPort, workerData } from 'node:worker_threads';
try {
  const expression = new RegExp(workerData.pattern, workerData.ignoreCase ? 'i' : '');
  parentPort.postMessage({ matched: expression.test(workerData.text) });
} catch (error) { parentPort.postMessage({ error: error.message }); }
