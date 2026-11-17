// Token Radar's own verification: board, farm plans, page recompute and determinism, in one run.
//
//   node verify.mjs [--input <snapshot.json>]
//
// The input defaults to the kit's sealed snapshot next to this repository. The run writes nothing
// into the repository: the two determinism runs go to throwaway directories. Exit 0 when every
// check passes, 1 otherwise, with one line per check.
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseSnapshot, buildBoard, buildRadar, boardIssue, farmSteps, stepText } from './lib/model.ts';

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures.push(name);
}
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const arg = (flag, fallback) => {
  const at = process.argv.indexOf(flag);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};
const inputPath = arg('--input', '../token-radar-01-kit/input/snapshot.json');
const snapshot = parseSnapshot(readFileSync(inputPath, 'utf8'));
const { board, radar } = buildRadar(snapshot);
check('snapshot parses', snapshot.protocols.length === 758, `${snapshot.protocols.length} protocols`);
check('board has no gate issue', boardIssue(board, snapshot) === null, boardIssue(board, snapshot) ?? 'clean');
check('watchlist covered', snapshot.watchlist.every((s) => board.some((r) => r.slug === s)), `${snapshot.watchlist.length} slugs`);
check('board size', board.length === 198, `${board.length} rows`);
const badSteps = board.filter((r) => r.farm_steps.length !== 7 || r.farm_steps.some((s) => s.length < 20 || s.length > 600));
check('farm plans well formed', badSteps.length === 0, badSteps.length > 0 ? badSteps[0].slug : '7 steps, 20..600 chars');
const direct = board.map((r) => farmSteps({ ...r, chains: r.chains, tvl_usd: r.tvl_usd }, r.age_days).map(stepText));
check('model farm plans match the board', direct.every((steps, i) => steps.join('\n') === board[i].farm_steps.join('\n')));

// The dashboard's own arithmetic, lifted out of dashboard/app.js and run against the board it shows.
const page = readFileSync('dashboard/app.js', 'utf8');
const lift = (from, to, name) => {
  const start = page.indexOf(from);
  const end = page.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`cannot lift ${name}`);
  return new Function(`${page.slice(start, end)}; return ${name};`)();
};
const impliedOf = lift('function round4(n)', 'function el(tag, attrs)', 'impliedOf');
const pageFarm = lift('// The farm plan is the same derivation', 'function readHash()', 'farmSteps');
const recomputeBad = radar.rows.filter((r) => impliedOf(r, radar.model) !== r.implied_value_usd);
check('page recompute matches the board', recomputeBad.length === 0, recomputeBad.length > 0 ? recomputeBad[0].slug : '0 mismatches');
const farmBad = radar.rows.filter((r) => pageFarm(r).join('\n') !== board.find((b) => b.slug === r.slug).farm_steps.join('\n'));
check('page farm plans match the board', farmBad.length === 0, farmBad.length > 0 ? farmBad[0].slug : '0 mismatches');

// Determinism: the program run twice must write identical bytes.
const dirs = [mkdtempSync(join(tmpdir(), 'radar-a-')), mkdtempSync(join(tmpdir(), 'radar-b-'))];
try {
  for (const dir of dirs) {
    execFileSync('node', ['main.ts', '--input', inputPath], { env: { ...process.env, MAKEFUN_OUTPUT_DIR: dir }, stdio: 'pipe' });
  }
  const names = ['board.json', 'data.js', 'dossier.json'];
  const same = names.every((n) => sha(readFileSync(join(dirs[0], n))) === sha(readFileSync(join(dirs[1], n))));
  check('two runs are byte-identical', same, names.join(', '));
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}

// Screenshots: the gate's caps, read straight from the PNG headers.
const shots = readdirSync('screenshots').filter((f) => f.endsWith('.png')).sort();
check('three screenshots present', shots.length === 3, shots.join(', '));
for (const file of shots) {
  const buf = readFileSync(join('screenshots', file));
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  check(`screenshot ${file}`, buf.length <= 512 * 1024 && longSide <= 1440 && shortSide >= 800, `${width}x${height}, ${Math.round(buf.length / 1024)}KB`);
}
if (failures.length > 0) {
  console.log(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nall checks passed');
}
