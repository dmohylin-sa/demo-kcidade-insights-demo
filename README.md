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

## How the demo is organised

The screens follow the client's M&E framework (V3): four automated levels and one human-led layer of evidence,
read against four dimensions (learning, practice transformation, Virtual Tutor, Communities of Practice).

Every chart and figure carries two kinds of label:

| Label | What it says |
|---|---|
| **Evidence layer** (numbered chip, under the chart title) | Which level the data comes from: 1 Who learners are, 2 What they do, 3 How useful, 4 Applied in practice, 5 What others observe (dashed: collected by people). Hover a chip for the sources. The source names follow the chip. |
| **Status badge** (top right) | Whether the data exists today: Available today, New tracking, Survey, New profile field, CoP app, AI analysis, Team evidence |

| Group | Screens |
|---|---|
| Overview | Headline indicators grouped by level |
| Reach | Who the learners are (Level 1); Visitors & access (MonsterInsights, registration gate) |
| Learning | Courses & progression; Quizzes & questions; Learning materials; Content gaps; Recommendations; Usefulness & satisfaction |
| Virtual Tutor | Virtual Tutor |
| Practice transformation | Practice change (Level 4); Triangulation (Layer 5) |
| Communities of Practice | Communities of Practice |
| About the data | Evidence map; Audiences & views; Data readiness |

## Presenting

| Key / control | What it does |
|---|---|
| **P** | Opens or closes the presenter notes: what to say, questions to ask (tick boxes are remembered in this browser), caveats, and the layers and sources of each chart |
| **T** | Switches between **Today's data** (only what the platform records now; the rest turns into locked cards that name the work that unlocks them) and **With proposed additions** |
| Saved view (eye icon, first in the filter row) | Opens the view of one audience: platform team, area lead, AKF leadership and D&I team, funder, partner, municipality. Sets the period and filters and shows the rhythm and level of detail |
| Filter row | Period, learning area, content language, role, age group; "More" adds the other Level 1 fields: work area, gender, preferred language, and the proposed institution type, institution, district, municipality, experience, education, how they found the platform, and device (locked in Today's data) |
| Chart / table icons | Every chart has a table view |

Groups smaller than 10 people are hidden in breakdowns, as the framework asks; a warning appears when the filters
leave fewer than 10 learners.

Estimate detail for the presenter (WBS rows, priced or not) lives in `src/data/internal-notes.ts`, which is
git-ignored: it exists only in the local copy and in a local `dist-single` build, never in this repo or the hosted
demo. `src/data/internal.ts` loads it when present. Keep the notes panel off the shared screen.

## Suggested flow (about 30 minutes)

1. **Overview** in Today's data, then flip with T. Explain the two labels (layer chips, status badges). Point at the "Worth a look" cards.
2. **Evidence map:** their framework diagram and the layer-by-dimension matrix, with the screens behind each cell.
3. **Who the learners are** and **Visitors & access:** reach against intended audiences, use without an account, the registration gate.
4. **Courses & progression:** pick "Monitorização e Avaliação de Projetos", show the fall after lesson 3 and the at-risk list.
5. **Quizzes & questions:** the question map and the review list.
6. **Learning materials** and **Content gaps:** "Caregiver support", searches with no results, tutor questions with no resource.
7. **Virtual Tutor:** preferred against actual mode, what learners ask.
8. **Usefulness & satisfaction**, **Practice change** (coverage first), **Triangulation** ("Employability & income" needs a closer look).
9. **Audiences & views:** open the area-lead or municipality view. Close on **Data readiness**.

## Stack

Vite 6, React 18, TypeScript, Ant Design 5 (neutral house style from the `antd-modern-style-demo` skill), Recharts 2,
zustand. Chart colours are the validated categorical palette from the `dataviz` skill. Code map:

| Path | What it holds |
|---|---|
| `src/data/taxonomy.ts` | Learning areas, topics, languages, resource and question types, profile options (invented) |
| `src/data/generate.ts` | The seeded data generator (learners with Level 1 fields, enrolments, quiz attempts with per-question results, resource and video events, searches, recommendations, tutor conversations, MonsterInsights traffic, gate events, surveys, follow-ups, Layer 5 evidence, CoP) |
| `src/data/registry.ts` | Every screen and chart: client-facing titles, status badges, evidence layers and sources, dimensions, and the presenter notes (talking points, questions, sources) |
| `src/data/audiences.ts` | The audiences, their saved views and the minimum group size |
| `src/lib/metrics.ts` | Shared metric definitions (monthly active learners, return rate, completion on enrolments that reached 60 days, first-attempt pass, item analysis, content gaps, triangulation, signals) |
| `src/pages/*` | One file per screen |
