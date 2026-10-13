// Cooperative aggregate budget; bounded work is not worker/process isolation.
export const OPERATION_LIMITS = Object.freeze({ timeMs: 60000, steps: 8_000_000_000, defaultTimeMs: 15000, defaultSteps: 2_000_000_000 });
export class OperationBudget {
  constructor({ maxTimeMs = OPERATION_LIMITS.defaultTimeMs, maxSteps = OPERATION_LIMITS.defaultSteps } = {}) {
    if (!Number.isFinite(maxTimeMs) || maxTimeMs < 0 || maxTimeMs > OPERATION_LIMITS.timeMs) throw new Error('Archive operation time limit exceeds bound.');
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 0 || maxSteps > OPERATION_LIMITS.steps) throw new Error('Archive operation step limit exceeds bound.');
    this.deadline = performance.now() + maxTimeMs; this.limit = maxSteps; this.steps = 0; this.untilCheck = 4096; this.check();
  }
  work(units = 1) {
    this.steps += units; this.untilCheck -= units;
    if (this.steps > this.limit) throw new Error('Archive operation step budget exhausted.');
    if (this.untilCheck <= 0) this.check();
  }
  check() { this.untilCheck = 4096; if (performance.now() >= this.deadline) throw new Error('Archive operation elapsed-time budget exhausted.'); }
}
export function optionalOperationBudget(opts) {
  const value = opts.operationBudget;
  if (value !== undefined && !(value instanceof OperationBudget)) throw new Error('Archive operation budget must be an OperationBudget.');
  return value;
}
export function operationBudget(opts = {}) { return optionalOperationBudget(opts) ?? new OperationBudget(opts); }
