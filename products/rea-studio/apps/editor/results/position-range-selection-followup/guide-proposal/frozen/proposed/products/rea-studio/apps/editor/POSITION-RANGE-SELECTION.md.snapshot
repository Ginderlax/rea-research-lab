# Position, Range and Selection value API

[position-range-selection.mjs](position-range-selection.mjs) exports source-assisted `Position`, `Range` and `Selection` value classes. Developers can import the module directly in Node. The current Editor client does not use these classes for its document cursor, selection or extension lifecycle; this module establishes a finite compatibility foundation.

```js
import { Position, Range, Selection } from './position-range-selection.mjs';

const start = new Position(0, 3);
const end = start.translate({ characterDelta: 4 });
const range = new Range(start, end);
const backwards = new Selection(end, start);

range.contains(start);       // true: range boundaries are inclusive
backwards.isReversed;        // true: direction is retained separately
start.with({ character: 3 }) === start; // true: unchanged values retain identity
```

The selected public declaration census has **30 direct entries**, including overloads: 13 for Position, 12 for Range and five for Selection. Six nested optional fields accompany the object overloads. Selection also inherits **ten nonconstructor Range declaration entries across nine names**. Range constructors are excluded from inheritance; Selection has its own two constructor forms. This census is complete only for these three selected classes. It does not enumerate every VS Code API or documented editor feature.

Coordinates and endpoints expose readonly accessors. Objects are not deeply frozen, and the module has no document length or cursor validation context. Source-supported constructor behavior is retained rather than imposing document-specific limits. Ordering, inclusive containment, intersection, union, translation, replacement and directional selection operate on these standalone values. Six constructible call/apply compatibility helpers are also retained; they are outside the 30-entry public declaration denominator.

The normal [pure regression test](position-range-selection.test.mjs) has 13 groups covering the selected declarations and options, ordered/inclusive ranges, touching/disjoint/nested intersections, identity aliases, directional selection, inherited return types, readonly accessors and the six compatibility helpers. From the repository root, run:

```text
node --test products/rea-studio/apps/editor/position-range-selection.test.mjs
```

It needs only Node and the candidate module. It imports no original oracle, parser, compiler or machine-specific cache and writes no app/source/result files. These are authored production regressions, not a fresh independent original differential campaign. The proposed module and tests passed one source-bound 13/13 correctness run before installation; root must verify the actual installed paths separately. The retained initial smoke run is provisional and is not added to this count.

The source binding is [VS Code 1.140.0, commit 07f806f999227108933c2e30515b26eecc1fda74](https://github.com/microsoft/vscode/tree/07f806f999227108933c2e30515b26eecc1fda74). Six exact implementation source files, their copyright headers, acquisition records and the [full original MIT license](results/position-range-selection-followup/accepted-author319/source/LICENSE.txt.snapshot.snapshot) are retained as inert study snapshots. The [study notice](results/position-range-selection-followup/accepted-author319/NOTICE.md.snapshot) and accompanying [redistribution notice](position-range-selection.NOTICE.md) describe their source-assisted role. The notice contains the exact 1,088-byte Microsoft MIT license text. No original/vendor/parser runtime is imported by this module or the normal regression tests. This is not a clean-room authorship claim or an independent legal opinion.

Historical validation counts remain separate:

- The [accepted 319-file correction epoch](results/position-range-selection-followup/accepted-author319/validation.json.snapshot) contains 22 groups: nine author groups and 13 exact prior reviewer replays. The author oracle evaluates five pinned TypeScript library units in six VM evaluations through Node stripping. The prior reviewer replay compiles ten units in 12 VM evaluations and reports 179 exact semantic pairs, with nine raw readonly receiver-label controls kept separate. Its separately shaped 240 author cases share the packet harness and are not described as held-out independence.
- The [fresh independent 81-file review](results/position-range-selection-followup/accepted-independent81/review-validation.json.snapshot) adds nine groups with 58 differential pairs: 38 exact encoded-value/library-error comparisons and 20 engine rejection-type comparisons retaining raw errors. Six descriptor controls are additional to the 58 pairs. They retain both a prior nonstrict composed-script control and explicit strict composition, because the released source files are ES modules. The two compositions together evaluate ten source units in 12 VM evaluations. Script `caller`/`arguments` differences remain disclosed as composition differences; original errors are not suppressed or normalized into exact equality.

Those historical campaigns execute source-composed class libraries, not the shipped workbench or extension host. The accepted trees preserve the complete earlier 145-file author and 43-file negative-review epochs, including their wrong inherited denominator, held-out wording, helper construction failures and raw oracle controls. Publication and this documentation override rerun no original library code. Original native program, original GUI, workbench and extension-host executions are zero for these finite campaigns.

Complete extension APIs, extension-host lifecycle, document/client binding, arbitrary hostile objects/proxies/cycles, universal engine error text/prototype/function-source equality, accessibility/native packaging and full Editor parity remain open. No performance, memory, security-equivalence or superiority conclusion follows from this value API.
