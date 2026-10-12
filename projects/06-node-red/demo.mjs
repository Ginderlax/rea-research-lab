// SPDX-License-Identifier: Apache-2.0
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import {route} from './reconstruction.mjs';
const rules=[{t:'gte',v:80,vt:'num'},{t:'btwn',v:30,v2:79,vt:'num',v2t:'num'},{t:'else'}];
const destinations=['urgent-maintenance','schedule-review','normal'];
console.log(JSON.stringify([12,42,93,'93',null].map(payload=>({payload,ports:route(payload,rules),destinations:route(payload,rules).map(i=>destinations[i])})),null,2));
