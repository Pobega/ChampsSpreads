# Rotometrics

VGC damage calculator and SP (stat) spread optimizer for the Pokémon Champions
ruleset. Pure client-side — no build step, no bundler. ES modules + the Tailwind
and Preact CDNs, served as static files.

## Running locally

ES modules don't load over `file://`, so you need an HTTP server:

```sh
python3 -m http.server 8765
```

Then open <http://localhost:8765/>.

## Tests

The damage engine has a golden-case suite (25 cases) you can open in a browser:

```
http://localhost:8765/tests.html
```

For headless/CI runs (drives `tests.html` in Chromium via Playwright):

```sh
npm test
```

## Project layout

```
index.html          Page shell + CDN importmap (Tailwind, Preact, htm)
App.js              Entry point: wiring, initialization, page registration
tests.html          In-browser golden-case test runner for the damage engine
champions_dex.json  Champions-format species roster

src/
  State.js          Shared STATE + CACHE singletons
  engine/           Pure calc core (no DOM)
    Damage.js         Damage roll formula
    Optimize.js       EV/nature survival + offensive optimizers
    Stats.js          Stat calculation
    Abilities.js      Ability hooks into the damage pipeline
  data/             Static data + rules
    Constants.js, Dex.js, Moves.js, MoveTags.js,
    Regulations.js, MatchupText.js
  api/              PokeAPI fetching + local cache
    PokeApi.js, Cache.js
  ui/               Vanilla UI helpers (page nav, rendering)
    PageNav.js, Render.js, ResultSummary.js
  ui-preact/        Preact + htm islands (see Preact migration below)
    AttackerCard.js, DefenderCard.js, CenterPanel/OptimizerPanel.js,
    ResultsHUD.js, HeaderControls.js, DexView.js, AttackdexView.js,
    Store.js, Reactive.js, ...

ci/
  run-tests.mjs     Headless test driver
  smoke.mjs         Smoke check (npm run smoke)
```

## Where to add things

- **New ability** — add its damage-pipeline hook in `src/engine/Abilities.js`
  and register it in the ability helper lists in `src/data/Constants.js`.
- **Damage formula change** — `src/engine/Damage.js`; add/adjust a golden case
  in `tests.html` to lock the expected rolls.
- **Species / move data** — `src/data/Dex.js`, `src/data/Moves.js`,
  `champions_dex.json`. Fetched details come through `src/api/PokeApi.js`.
- **Format / regulation rules** — `src/data/Regulations.js`.

## Notes

- The UI is mid-migration to buildless Preact + htm, page by page. Newer panels
  live in `src/ui-preact/`; some vanilla code in `src/ui/` remains. Both styles
  coexist by design.
- `App.js` and `index.html` carry a `?v=…` cache-buster on the script tag; bump
  it when shipping changes if a stale GitHub Pages cache bites you.
- A few PokeAPI 404/CORS console warnings during data fetches are expected and
  handled — they don't indicate a broken page.

## AI Disclosure

This tool is built using Claude Code. This repository exists mostly as an
experiment for how far I could take creating a website completely vibe coded.

If you are morally against that, feel free to not use the tooling. I am
providing this disclosure to make sure no one feels cheated, or believes that
I am taking 'stolen valor' from work created by an LLM.

Generally I try to attribute commits to Claude in the Git history so that it's
extremely obvious AI was used in generating it. Occasionally you will see a
commit without Claude, which may mean that it's something I did manually --
but it could also mean Claude was just not attributed for some reason.

## License

[Apache License 2.0](LICENSE).
