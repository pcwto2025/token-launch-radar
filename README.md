# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/pcwto2025/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/pcwto2025/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — a dashboard that ranks pre-token protocols by implied value and shows how to farm each one. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

The radar reads a frozen DefiLlama protocol snapshot, scores every pre-token protocol with one stated model, and writes a ranked board with a seven-step farm plan per protocol. The model (radar-2) prices a protocol at its TVL times its category multiple — the median market-cap-to-TVL ratio of the live-token protocols in the same category, read from the same snapshot — adjusted for seven-day growth, age with no token, and chain breadth. No protocol name is special-cased, and no row is hand-picked.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22 or later, standard library only, no install. The program writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`.

## Verify it

```sh
node verify.mjs
node check-steps.mjs
```

`verify.mjs` rebuilds the board from the snapshot, checks watchlist coverage and farm-plan lengths, confirms the dashboard's in-page recompute matches `board.json` to the dollar on every row, runs the program twice to confirm byte-identical output, and checks the three screenshots against the gate's size caps. `check-steps.mjs` compares the farm plans the model writes with the ones the dashboard generates in the page.

## Model (radar-2)

implied = TVL × category multiple × growth × maturity × breadth. The category multiple is the median market-cap-to-TVL ratio of live-token protocols in the same category, shrunk toward the snapshot median (weight 3) and clamped to [0.05, 1.5]. Growth clamps the seven-day change to [−60, 120]% at half weight. Maturity rises from 0.6 to 1.0 over three years (unknown age: 365 days). Breadth adds 0.05 per extra chain, capped at 1.20. Wrapped, staked, bridged and exchange products are excluded: their token already trades.

---

<sub>Entered on [make.fun](https://make.fun/?ref=708p1kan&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
