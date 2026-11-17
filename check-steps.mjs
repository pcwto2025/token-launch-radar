// check-steps.mjs: verify the dashboard's farmSteps (app.js) produce exactly the same strings
// as the model's farmSteps (lib/model.ts) for every board row. Run from the repo root.
import { readFileSync } from 'node:fs';
import { parseSnapshot, buildBoard, farmSteps as modelSteps, stepText } from './lib/model.ts';

const js = readFileSync('dashboard/app.js', 'utf8');
const start = js.indexOf('function chainOf(p)');
const end = js.indexOf('function readHash()');
if (start < 0 || end < 0 || end <= start) throw new Error('farm block not found in app.js');
const block = js.slice(start, end);
// The extracted block defines chainOf/capitalFor/holdDaysFor/gasFor/actionFor/stepText/farmSteps.
const farmStepsJs = new Function(`${block}; return farmSteps;`)();

const snap = parseSnapshot(readFileSync('../token-radar-01-kit/input/snapshot.json', 'utf8'));
const board = buildBoard(snap);
let bad = 0;
for (const row of board) {
  const a = modelSteps(row, row.age_days).map(stepText);
  const b = farmStepsJs(row);
  if (a.length !== b.length || a.some((s, i) => s !== b[i])) {
    bad++;
    if (bad <= 3) {
      console.log('MISMATCH', row.slug);
      a.forEach((s, i) => { if (s !== b[i]) console.log(' model:', s, '\n page :', b[i]); });
    }
  }
}
console.log(`compared ${board.length} rows, ${bad} mismatches`);
if (bad > 0) process.exit(1);
