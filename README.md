# K'CIDADE Academy Insights - analytics demo

A clickable demo of the analytics and M&E dashboards proposed for K'CIDADE Academy, for the BA to present on the
proposal call. **All figures are invented** (500 learners, fixed seed). The data follows the structure of the
academy's real WordPress + LearnDash database, but nothing was read from the client's database.

The content behind every screen (sources, what is available today and what has to be added) is in the data catalogue
kept next to this folder in the local pre-sales workspace; it is not part of this repo.

## Open it

- **No install:** double-click `dist-single/index.html`. It is one self-contained file and works offline.
- **Development:** `npm install`, then `npm run dev` and open the printed localhost address.
- **Rebuild the single file** after a change: `npm run build:single` (writes `dist-single/index.html`, git-ignored).
- `npm run build` writes a normal multi-file build to `dist/` (needs a web server; use it to host the demo).

## Presenting

| Key / control | What it does |
|---|---|
| **P** | Opens or closes the presenter notes: what to say, questions to ask (tick boxes are remembered in this browser), caveats and the data source of each chart |
| **T** | Switches between **Today's data** (only what the platform records now; the rest turns into locked cards that name the work that unlocks them) and **With proposed additions** |
| Filter row | Period, learning area, content language, occupation, age group; "More" adds work area, gender, preferred language, organisation and device (the last two are locked in Today's data) |
| Chart / table icons | Every chart has a table view |

Estimate detail for the presenter (WBS rows, priced or not) lives in `src/data/internal-notes.ts`, which is
git-ignored: it exists only in the local copy and in a local `dist-single` build, never in this repo or the hosted
demo. `src/data/internal.ts` loads it when present. Keep the notes panel off the shared screen.

## Suggested flow (about 25 minutes)

1. **Overview** in Today's data, then flip with T. Point at the "Worth a look" cards.
2. **Courses & progression:** pick "Monitorização e Avaliação de Projetos", show the fall after lesson 3 and the at-risk list.
3. **Quizzes & questions:** the question map and the review list (the strongest day-one screen).
4. **Learning materials** in Today's data, then with proposed additions (who opens, plays, finishes).
5. **Content gaps:** "Caregiver support" and the language chart.
6. **Learners & cohorts**, **Recommendations** (short).
7. **Course feedback**, **Practice change**, **Communities of Practice** (what surveys and the CoP connection add).
8. Close on **Data readiness**.

## Stack

Vite 6, React 18, TypeScript, Ant Design 5 (neutral house style from the `antd-modern-style-demo` skill), Recharts 2,
zustand. Chart colours are the validated categorical palette from the `dataviz` skill. Code map:

| Path | What it holds |
|---|---|
| `src/data/taxonomy.ts` | Learning areas, topics, languages, resource and question types, profile options (invented) |
| `src/data/generate.ts` | The seeded data generator (learners, enrolments, quiz attempts with per-question results, resource and video events, recommendations, surveys, follow-ups, CoP) |
| `src/data/registry.ts` | Every screen and chart: client-facing titles and badges, and the presenter notes (talking points, questions, sources) |
| `src/lib/metrics.ts` | Shared metric definitions (completion, first-attempt pass, item analysis, content gaps, signals) |
| `src/pages/*` | One file per screen |
