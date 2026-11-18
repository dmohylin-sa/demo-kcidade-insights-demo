// One source of truth for every screen and chart: what the client sees (title,
// question, status badges, evidence layers and sources, what unlocks it) and what the
// presenter sees (talking points, questions, technical source, caveats). Estimate
// detail (WBS rows, priced or not) is NOT here: it lives in the git-ignored
// internal-notes.ts, loaded by internal.ts when present.
//
// Layers and sources follow the client's "M&E framework for the Data & Insights
// platform" (V3): four automated levels, one human-led layer, four dimensions.

export type Status = 'today' | 'track' | 'survey' | 'profile' | 'cop' | 'ai' | 'evidence';
export type Priced = 'yes' | 'partly' | 'no';

/** estimate detail per chart; values live only in the git-ignored internal-notes.ts */
export interface ChartEstimate {
  rows: string;
  priced: Priced;
  pricedNote?: string;
}

export type PageKey =
  | 'overview'
  | 'learners'
  | 'access'
  | 'courses'
  | 'quizzes'
  | 'materials'
  | 'gaps'
  | 'recommendations'
  | 'feedback'
  | 'tutor'
  | 'impact'
  | 'triangulation'
  | 'communities'
  | 'evidence'
  | 'audiences'
  | 'readiness';

export const STATUS_META: Record<Status, { label: string; short: string; color: string; unlockedBy: string }> = {
  today: { label: 'Available today', short: 'Today', color: 'green', unlockedBy: 'Existing platform data' },
  track: { label: 'New tracking', short: 'Tracking', color: 'blue', unlockedBy: 'New tracking in the platform event log' },
  survey: { label: 'Survey', short: 'Survey', color: 'purple', unlockedBy: 'New surveys' },
  profile: { label: 'New profile field', short: 'Profile', color: 'gold', unlockedBy: 'New fields in the registration form or profile' },
  cop: { label: 'CoP app', short: 'CoP app', color: 'magenta', unlockedBy: 'Data from the Communities of Practice app' },
  ai: { label: 'AI analysis', short: 'AI', color: 'geekblue', unlockedBy: 'AI grouping of tutor conversations' },
  evidence: { label: 'Team evidence', short: 'Evidence', color: 'volcano', unlockedBy: 'An admin form for evidence gathered by the AKF teams' },
};

// ---------------------------------------------------------------- layers, sources, dimensions

export type Layer = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export const LAYER_META: Record<
  Layer,
  { n: number; kind: 'Level' | 'Layer'; name: string; short: string; color: string; byPeople: boolean; what: string; source: string }
> = {
  L1: {
    n: 1,
    kind: 'Level',
    name: 'Who learners are',
    short: 'Who',
    color: '#64748b',
    byPeople: false,
    what: 'Role, institution, territory, interests, gender, age',
    source: 'Registration form and profile prompts',
  },
  L2: {
    n: 2,
    kind: 'Level',
    name: 'What they do',
    short: 'What they do',
    color: '#2a78d6',
    byPeople: false,
    what: 'Courses, quizzes, resources, tutor, badges, devices',
    source: 'Platform event log and MonsterInsights',
  },
  L3: {
    n: 3,
    kind: 'Level',
    name: 'How useful they find it',
    short: 'How useful',
    color: '#7c3aed',
    byPeople: false,
    what: 'Resource, course and tutor ratings; platform survey',
    source: 'In-platform surveys',
  },
  L4: {
    n: 4,
    kind: 'Level',
    name: 'What they apply in practice',
    short: 'Applied',
    color: '#0f8a5f',
    byPeople: false,
    what: 'Selected courses: self-reported change at 6 and 12 months',
    source: 'Follow-up surveys by e-mail',
  },
  L5: {
    n: 5,
    kind: 'Layer',
    name: 'What others observe',
    short: 'Others observe',
    color: '#d9480f',
    byPeople: true,
    what: 'Focus groups, interviews, manager questionnaires, trainer reports',
    source: 'AKF area and data teams, by hand',
  },
};
export const LAYERS: Layer[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

export type SourceKey =
  | 'regform'
  | 'eventlog'
  | 'learndash'
  | 'dlm'
  | 'monster'
  | 'recengine'
  | 'tutor'
  | 'gamipress'
  | 'aianalysis'
  | 'copapp'
  | 'surveys'
  | 'followup'
  | 'teamform'
  | 'catalogue';

export const SOURCE_META: Record<SourceKey, { label: string; layer: Layer | null; status: Status; note: string }> = {
  regform: { label: 'Registration form and profile', layer: 'L1', status: 'today', note: 'Some fields today; the framework adds institution, territory, experience, starting point and consents.' },
  eventlog: { label: 'Platform event log', layer: 'L2', status: 'track', note: "Each learner's actions against a pseudonymous ID. New." },
  learndash: { label: 'LearnDash', layer: 'L2', status: 'today', note: 'Enrolments, lessons, completions, quiz attempts, certificates.' },
  dlm: { label: 'Download Manager', layer: 'L2', status: 'today', note: 'Every download, by learners and by visitors.' },
  monster: { label: 'MonsterInsights', layer: 'L2', status: 'today', note: 'All visitors in aggregate, only those who accept analytics cookies.' },
  recengine: { label: 'Recommendation engine', layer: 'L2', status: 'track', note: 'The "Recommended for you" carousels on the home page.' },
  tutor: { label: 'Virtual Tutor (Kappa)', layer: 'L2', status: 'track', note: 'ElevenLabs conversations linked to the learner ID.' },
  gamipress: { label: 'GamiPress', layer: 'L2', status: 'today', note: 'Badges earned.' },
  aianalysis: { label: 'AI analysis', layer: 'L2', status: 'ai', note: 'Groups tutor questions and flags topics with no matching resource.' },
  copapp: { label: 'Communities of Practice app', layer: 'L2', status: 'cop', note: 'Members, posts, moderation, co-created resources, once connected.' },
  surveys: { label: 'In-platform surveys', layer: 'L3', status: 'survey', note: 'One-click resource feedback, end-of-course survey, tutor thumbs, platform survey every six months.' },
  followup: { label: 'Follow-up surveys by e-mail', layer: 'L4', status: 'survey', note: 'At 6 and 12 months, for the courses the D&I team selects, to learners who agreed to be contacted.' },
  teamform: { label: 'Team evidence form', layer: 'L5', status: 'evidence', note: 'Focus groups, interviews, manager questionnaires and trainer reports, recorded by the AKF teams.' },
  catalogue: { label: 'Content catalogue', layer: null, status: 'today', note: 'Courses and resources with their topics, formats and languages.' },
};

export type Dimension = 'learning' | 'practice' | 'tutor' | 'cop' | 'platform';
export const DIMENSION_META: Record<Dimension, { label: string; order: number }> = {
  learning: { label: 'Learning', order: 0 },
  practice: { label: 'Practice transformation', order: 1 },
  tutor: { label: 'Virtual Tutor', order: 2 },
  cop: { label: 'Communities of Practice', order: 3 },
  platform: { label: 'Reach and access (all dimensions)', order: 4 },
};
export const DIMENSIONS: Dimension[] = ['learning', 'practice', 'tutor', 'cop'];

/** the client's matrix: what each level measures in each dimension */
export const MATRIX: Record<Exclude<Layer, 'L1'>, Record<Exclude<Dimension, 'platform'>, string>> = {
  L2: {
    learning: 'Enrolments, completion, quiz results, resource use',
    practice: 'Which resources were used, to pre-fill the follow-up',
    tutor: 'Adoption, voice or text, question groups',
    cop: 'Members, posts, moderation actions, new resources co-created',
  },
  L3: {
    learning: 'Course satisfaction; perceived learning; fit of recommendations',
    practice: 'Intention to apply',
    tutor: 'Usefulness; encourages reflection; preferred mode',
    cop: 'Usefulness of discussions; feeling less alone',
  },
  L4: {
    learning: 'Confidence before and now',
    practice: 'Use in work; change in the organisation and for communities',
    tutor: '-',
    cop: 'Content shared with colleagues; new contacts or collaborations',
  },
  L5: {
    learning: 'Trainer reports',
    practice: 'Quality, effectiveness, spread, sustainability',
    tutor: 'Interview feedback on the tutor',
    cop: 'Focus groups on peer support',
  },
};

// ---------------------------------------------------------------- charts

export interface ChartDef {
  id: string;
  page: PageKey;
  title: string;
  question: string;
  badges: Status[];
  /** full = complete with today's data; partial = shown, with less data; locked = needs new work */
  todayMode: 'full' | 'partial' | 'locked';
  todayNote?: string;
  unlock?: string;
  /** where the data comes from, with the proposed additions */
  sources: SourceKey[];
  /** where it comes from today, when that differs */
  sourcesToday?: SourceKey[];
  dim: Dimension;
  /** technical source for the presenter notes */
  source: string;
  caveat?: string;
}

export function sourcesOf(c: ChartDef, mode: 'today' | 'proposed'): SourceKey[] {
  return mode === 'today' && c.sourcesToday ? c.sourcesToday : c.sources;
}

export function layersOf(c: ChartDef, mode: 'today' | 'proposed' = 'proposed'): Layer[] {
  const set = new Set<Layer>();
  for (const k of sourcesOf(c, mode)) {
    const l = SOURCE_META[k].layer;
    if (l) set.add(l);
  }
  return LAYERS.filter((l) => set.has(l));
}

export interface PageDef {
  key: PageKey;
  path: string;
  title: string;
  group: string;
  intro: string;
  talk: string[];
  ask: string[];
  watch: string[];
  next?: PageKey;
}

export const PAGES: PageDef[] = [
  {
    key: 'overview',
    path: '/',
    title: 'Overview',
    group: '',
    intro: 'The headline indicators of the M&E framework, grouped by evidence level, and what is worth a closer look.',
    talk: [
      "This screen follows the headline set in the client's own framework: reach, monthly active learners and return, completion and quiz pass rate, resource use, tutor adoption, recommendation uptake, satisfaction, practice change.",
      'Each tile and chart carries two kinds of label: the evidence level it comes from (Level 1 to Layer 5) and whether the data exists today.',
      'Open in "Today\'s data": the learning row already works on LearnDash, with history back to launch. Then press T: the tutor, surveys, follow-ups and team evidence fill in.',
      '"Active" follows their definition: a learning action in the month (lesson, quiz, resource opened, tutor conversation). A login alone does not count.',
      'Every number is invented demo data shaped like their real database. Say this early.',
    ],
    ask: [
      'Do the D&I team want targets shown next to each headline indicator? Who sets them?',
      'Is the overview the same for every audience, or does each saved view start from its own screen?',
      'Daily refresh, or weekly for most audiences?',
    ],
    watch: [
      'Completion shows exposure, not learning: 93 of the 100 current lessons are videos that complete automatically. Always read it next to the quiz pass rate.',
      'Completion counts only enrolments at least 60 days old, as the framework defines it.',
    ],
    next: 'learners',
  },
  {
    key: 'learners',
    path: '/learners',
    title: 'Who the learners are',
    group: 'Reach',
    intro: 'Level 1: who registered learners are, how they compare with the audiences AKF wants to reach, and whether they come back.',
    talk: [
      'Level 1 is not a dashboard of its own in the framework: it applies to every other chart. Every screen here can be split by role, institution, territory, gender and age, from the filter row.',
      'The reach chart sets each group against the intended audience, so the gaps are visible at once.',
      'Institution type, territory, experience and the starting-point confidence are new fields. In "Today\'s data" they are locked.',
      'Groups under 10 people are hidden, as the framework asks, so no learner can be identified.',
    ],
    ask: [
      'Which of the Level 1 fields does the current registration form already collect?',
      'Who sets the targets for the intended audiences, and per which field?',
      'Is a "cohort" the registration month, a course start, or a programme intake?',
      'Should existing learners be asked for the new fields on their next visit?',
    ],
    watch: [
      'Registration must take under a minute on a phone; the rest of the profile is asked later in the personal area.',
      'The profile has no history; reporting snapshots it at each load from go-live.',
    ],
    next: 'access',
  },
  {
    key: 'access',
    path: '/access',
    title: 'Visitors & access',
    group: 'Reach',
    intro: 'Everyone who visits, registered or not: traffic, channels and devices from MonsterInsights, and what the registration gate brings in.',
    talk: [
      'MonsterInsights measures all visitors, but only in aggregate and only those who accept analytics cookies. It is the source for traffic, devices and acquisition, never for learner indicators.',
      'The "used without an account" chart is the warning in their framework: resources can be opened freely today, so a large share of use never reaches Levels 1-4.',
      'The registration gate is their proposal: three resources without an account, the fourth asks for a free one. The platform records each time the gate is shown and each registration that follows.',
      'AI-tool traffic (ChatGPT, Perplexity, Gemini) is a channel to watch: it grows every month in the demo data.',
    ],
    ask: [
      'Is the limit of three resources final, and who reviews it after three months of data?',
      'Has the DPO confirmed whether the gate counter is a strictly necessary cookie?',
      'Which MonsterInsights reports should the reporting system copy, and which should stay in MonsterInsights?',
    ],
    watch: [
      'Traffic history stays in MonsterInsights; the reporting system starts its own learner data when event tracking goes live.',
      'The gate costs casual visitors and search visibility; show the registrations it brings next to the visitors it turns away.',
    ],
    next: 'courses',
  },
  {
    key: 'courses',
    path: '/courses',
    title: 'Courses & progression',
    group: 'Learning',
    intro: 'Which courses learners choose, how far they get, where they stop, and the badges and certificates they earn.',
    talk: [
      'The course table answers "most and least sought" and "finished" side by side; completion counts only enrolments at least 60 days old.',
      'Pick "Monitorização e Avaliação de Projetos" in the course filter: the lesson chart shows a sharp fall after lesson 3. That tells them which lesson to rework.',
      'The at-risk list is the first AI analysis step in their order: drop-out flags, starting with simple rules.',
      'Badges come from GamiPress and certificates from LearnDash: both exist today.',
    ],
    ask: [
      'Is a "learning pathway" one course or a sequence of courses?',
      'After how many days without activity should a learner count as at risk?',
      'Attendance at live or face-to-face sessions: where is it recorded today?',
    ],
    watch: [
      '93 of 100 lessons complete automatically when the video ends. Completion is exposure; show it with quiz results.',
      'Admin resets and access expiry delete progress records in LearnDash; reporting has to decide whether to keep its copy.',
    ],
    next: 'quizzes',
  },
  {
    key: 'quizzes',
    path: '/quizzes',
    title: 'Quizzes & questions',
    group: 'Learning',
    intro: 'Pass rate at first attempt and average score per module and course, and which questions to keep, fix or replace.',
    talk: [
      'Their framework asks for the first-attempt pass rate because most lessons complete automatically: this is where learning shows.',
      'The question map plots difficulty against discrimination. A question that strong learners get wrong more often than weak ones almost always has a wording or answer-key problem.',
      'The review list gives the concrete fix, with the most chosen wrong answer.',
    ],
    ask: [
      'Is "statistics" switched on for every quiz that matters? Without it there is no question-level data.',
      'Which attempt counts in reports: the first, the best or the last?',
      'Who acts on the review list: course authors, area leads or a learning designer?',
    ],
    watch: ['Question-level data only exists for quizzes with statistics on. The demo has 6 such quizzes switched off on purpose.'],
    next: 'materials',
  },
  {
    key: 'materials',
    path: '/materials',
    title: 'Learning materials',
    group: 'Learning',
    intro: 'Resources opened and downloaded, videos and audio, searches, and whether learners find a resource useful for their work.',
    talk: [
      'Many learners use the library more than the courses. Their framework asks to count resources opened and downloaded per active learner, not only course completion.',
      '"Opened" (including in the PDF viewer) and "downloaded" are separate events in the event log.',
      'In "Today\'s data" only MonsterInsights page views and Download Manager exist: views cannot be split by learner.',
      'The one-click question "Was this useful for your work?" appears after a resource is opened or downloaded: yes, partly or no.',
    ],
    ask: [
      'Which video and audio players host the content? MonsterInsights Media tracks standard players only.',
      'Should the one-click question show on every resource, or only after a download?',
    ],
    watch: ['Post Views Counter duplicates MonsterInsights page views; the framework lists it as collected but not used.'],
    next: 'gaps',
  },
  {
    key: 'gaps',
    path: '/gaps',
    title: 'Content gaps',
    group: 'Learning',
    intro: 'Which topics, formats and languages need new material: interests against supply, searches with no results, and tutor questions no resource answers.',
    talk: [
      'Three signals point at the same gaps: interests chosen at registration, library searches with no results, and tutor questions with no matching resource.',
      '"Caregiver support" is wanted by many and has two resources; tutor questions about respite care for family carers confirm it.',
      'Grouping tutor questions and flagging content gaps is the first AI analysis in their priority order.',
    ],
    ask: ['Who decides on new content, and how often?', 'Should area leads get this screen filtered to their area every month?'],
    watch: [
      'Interests have no history: a learner who changes them overwrites the old value.',
      'Only tutor conversations of learners who agreed to AI analysis are grouped.',
    ],
    next: 'recommendations',
  },
  {
    key: 'recommendations',
    path: '/recommendations',
    title: 'Recommendations',
    group: 'Learning',
    intro: 'Whether the recommendation engine behind the home-page carousels leads learners to courses they enrol in, finish and find relevant.',
    talk: [
      'Recommendation uptake is a headline indicator in their framework: shown, clicked, enrolled and completed.',
      'Day one: we can already check whether learners take courses that match their interests, and whether matched courses get finished more often.',
      'The platform survey asks whether the suggested learning paths match the interests given at registration: the learner\'s view of the same question.',
    ],
    ask: [
      'How many days after a click should an enrolment count as recommended?',
      'Only the six home-page carousels, or other places too?',
      'Should recommendations change after a learner completes something?',
    ],
    watch: ['Matched learners may simply be more motivated: the comparison shows association, not proof.'],
    next: 'feedback',
  },
  {
    key: 'feedback',
    path: '/feedback',
    title: 'Usefulness & satisfaction',
    group: 'Learning',
    intro: 'Level 3: what learners think of each course and of the platform, from the end-of-course survey and the platform survey every six months.',
    talk: [
      'Level 3 asks learners directly at four moments: one-click feedback on each resource, a 3-minute end-of-course survey, a thumbs up or down after a tutor conversation, and a 10-item platform survey every six months.',
      'Most items use the same 1-5 scale, so courses, groups and periods compare.',
      '"What will you try to apply?" is stored and quoted back to the learner in the 6-month follow-up.',
    ],
    ask: [
      'Which survey tool? It must accept a learner reference and return answers through an API.',
      'Identified answers, or anonymous?',
      'Do area leads write course-specific items, or only the D&I team?',
    ],
    watch: ['The old Fluent Forms survey stored the course as typed text, not an ID.'],
    next: 'tutor',
  },
  {
    key: 'tutor',
    path: '/tutor',
    title: 'Virtual Tutor',
    group: 'Virtual Tutor',
    intro: 'How learners use Kappa: adoption, voice or text, what they ask, where they start, and whether the tutor is useful and encourages reflection.',
    talk: [
      'Their second dimension, because Kappa is already live.',
      'The mode chart compares what learners say they prefer (platform survey) with what they actually do (conversations). A gap between the two is itself a finding.',
      'Question groups come from AI analysis, and only for learners who agreed to it at registration.',
      'Unregistered visitors\' conversations cannot be linked to anyone; they count only in totals.',
    ],
    ask: [
      'Can ElevenLabs return each conversation with the learner ID, mode, length and the lesson it started from?',
      'Is scoring conversations for reflection wanted in this phase, or later?',
      'Kappa replaced earlier AI plugins: should their logs be imported, or left out?',
    ],
    watch: [
      'Kappa conversations are kept 30 days in ElevenLabs and the platform copy has the same retention. Keep counts and question groups, not transcripts, for trends.',
      'AI analysis beyond question grouping (scoring, summaries, patterns) is a second phase in their answers.',
    ],
    next: 'impact',
  },
  {
    key: 'impact',
    path: '/impact',
    title: 'Practice change',
    group: 'Practice transformation',
    intro: 'Level 4: whether learners use what they learned in their work, 6 and 12 months after the courses the D&I team selects.',
    talk: [
      'Follow-up is selective: 6 months for the courses the D&I team picks, 12 months only where lasting change is expected.',
      'Every view shows its coverage first: learners eligible, who agreed to be contacted, who were contacted and who answered. A low or skewed response limits what the results can show.',
      'The three outcome questions follow their impact indicators: practice, organisational capacity, and services to communities.',
      '"Before and now" confidence gives a measure of change even where no starting point was recorded at registration.',
    ],
    ask: [
      'Which courses get the 6-month follow-up this year, and which the 12-month one?',
      'Who sends the follow-up: a named area team, as the framework suggests?',
      'Include learners who finished 6-12 months before go-live (a catch-up wave)?',
    ],
    watch: [
      'Self-reported: this is the level that most needs the checks in Layer 5.',
      'Response falls with time. The four coverage counts appear on every Level 4 view.',
    ],
    next: 'triangulation',
  },
  {
    key: 'triangulation',
    path: '/triangulation',
    title: 'Triangulation',
    group: 'Practice transformation',
    intro: 'Layer 5: what trainers, managers and partners observe, recorded by the AKF teams, and whether it agrees with platform records and learners\' own reports.',
    talk: [
      'A finding counts as strong only when three kinds of source point the same way: platform records (Level 2), learners\' own reports (Levels 3-4) and outside observation (Layer 5).',
      'In the demo, "Employability & income" is the case to show: learners report change, but managers see little. The framework says disagreement is a result, not noise.',
      'Layer 5 evidence is collected by people, not the platform. To be triangulated it must reach the same database: a simple admin form per activity.',
    ],
    ask: [
      'Who records Layer 5 activities in the form: area leads, the D&I team, or both?',
      'Should a record link to individual learners, where they consented?',
      'How are themes coded: a fixed list, or free text grouped later?',
    ],
    watch: ['The admin form for Layer 5 evidence is a request in their framework, on top of what was scoped.'],
    next: 'communities',
  },
  {
    key: 'communities',
    path: '/communities',
    title: 'Communities of Practice',
    group: 'Communities of Practice',
    intro: 'Participation, peer support, moderation and co-created resources in the communities, and their link to learning and practice.',
    talk: [
      'Their last dimension: the app is developed but not yet connected. The connection decision is a second phase.',
      'All of Level 2 here comes from the separate Communities of Practice app, read directly by the reporting system.',
      'Level 3 and 4 add the learners\' view: usefulness of discussions, feeling less alone, new contacts and collaborations.',
    ],
    ask: [
      'Can the app mark a co-created resource as a draft? Counting resources started needs it.',
      'How are its accounts identified: single sign-on or e-mail?',
      'Does it log moderation and AI actions?',
    ],
    watch: ['AI moderation can only be evaluated if the app logs what its AI did.', 'Members finish more courses, but motivated learners join communities: association, not cause.'],
    next: 'evidence',
  },
  {
    key: 'evidence',
    path: '/evidence',
    title: 'Evidence map',
    group: 'About the data',
    intro: 'The five layers of evidence against the four dimensions, the sources behind them, and the charts in this demo that cover each cell.',
    talk: [
      'This is their framework diagram, made clickable: each cell lists the charts that cover it.',
      'Every layer feeds the same reporting database with one pseudonymous learner ID, so any finding can be checked against the others and split by Level 1 groups.',
      'The source table is the answer to "where does each number come from".',
    ],
    ask: ['Is any cell of the matrix missing a measure they need?', 'Which cells matter for the first release?'],
    watch: [],
    next: 'audiences',
  },
  {
    key: 'audiences',
    path: '/audiences',
    title: 'Audiences & views',
    group: 'About the data',
    intro: 'Who reads the dashboards, what each audience decides, how often, and the saved view each one opens.',
    talk: [
      'Predefined first: standard dashboards, filtered and saved per audience. That gives most of the flexibility without a report builder.',
      'Each saved view sets the filters and the period; partners and municipalities see only their own institution or territory.',
      'Learners see their own progress, badges and answers in their personal area, not here.',
    ],
    ask: [
      'Do the decisions in the table match how each audience works?',
      'Which audiences get an exported PDF report rather than a login?',
      'Is Power BI the BI tool? Part of the customisation would then come with it.',
    ],
    watch: [
      'Access follows platform roles; individual-level views need their own permission; groups below the minimum size are hidden; every view exports to PDF or CSV.',
    ],
    next: 'readiness',
  },
  {
    key: 'readiness',
    path: '/readiness',
    title: 'Data readiness',
    group: 'About the data',
    intro: 'What works on existing data from day one, and what each piece of new work unlocks.',
    talk: [
      'Close with this: the learning dimension works on data they already have, with history back to launch.',
      'Everything else is unlocked by named pieces of work: the event log, surveys, profile fields, the tutor link, AI grouping, the CoP connection and the Layer 5 form.',
      'Their order fits: Learning first, Virtual Tutor second, practice transformation designed now and measured from the first follow-up wave, Communities of Practice last.',
    ],
    ask: ['Which of these screens matters most for the first release?', 'What would they cut if they had to?'],
    watch: ['Existing accounts and LearnDash records are imported once, labelled as the pilot period, with internal and test accounts excluded.'],
  },
];

const L: SourceKey[] = ['learndash'];

export const CHARTS: ChartDef[] = [
  // ---------------- overview: headline indicators
  { id: 'ov-registered', page: 'overview', dim: 'platform', title: 'Registered learners', question: 'How many learners can we follow?', badges: ['today'], todayMode: 'full', sources: ['regform'], source: 'wp_users.user_registered' },
  { id: 'ov-mal', page: 'overview', dim: 'learning', title: 'Monthly active learners', question: 'How many take a learning action each month?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Lessons, quizzes and downloads only.', sources: ['learndash', 'dlm', 'eventlog', 'tutor'], sourcesToday: ['learndash', 'dlm'], source: 'LearnDash activity, quiz attempts, Download Manager; later resource opens and tutor conversations from the event log' },
  { id: 'ov-return', page: 'overview', dim: 'learning', title: 'Monthly return rate', question: 'Do last month\'s learners come back?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Lessons, quizzes and downloads only.', sources: ['learndash', 'dlm', 'eventlog', 'tutor'], sourcesToday: ['learndash', 'dlm'], source: 'As monthly active learners' },
  { id: 'ov-completion', page: 'overview', dim: 'learning', title: 'Course completion rate', question: 'Do learners finish what they start?', badges: ['today'], todayMode: 'full', sources: L, source: 'LearnDash course rows; enrolments at least 60 days old', caveat: '93 of 100 lessons complete automatically: read it next to the quiz pass rate.' },
  { id: 'ov-firstpass', page: 'overview', dim: 'learning', title: 'First-attempt quiz pass rate', question: 'Do learners learn, not only watch?', badges: ['today'], todayMode: 'full', sources: L, source: 'LearnDash quiz activity rows (pass per attempt)' },
  { id: 'ov-resperlearner', page: 'overview', dim: 'learning', title: 'Resources per active learner', question: 'How much do learners use the library?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Downloads only.', sources: ['eventlog', 'dlm'], sourcesToday: ['dlm'], source: 'Resource opened and downloaded events; today Download Manager' },
  { id: 'ov-tutor', page: 'overview', dim: 'tutor', title: 'Tutor adoption', question: 'How many active learners talk to the tutor?', badges: ['track'], todayMode: 'locked', unlock: 'Tutor conversations linked to the learner ID', sources: ['tutor', 'eventlog'], source: 'Tutor conversation started events + ElevenLabs' },
  { id: 'ov-recuptake', page: 'overview', dim: 'learning', title: 'Recommendation uptake', question: 'Do recommendations lead to enrolments?', badges: ['track'], todayMode: 'locked', unlock: 'Recommendation shown and clicked events', sources: ['recengine', 'eventlog', 'learndash'], source: 'Shown / clicked events + LearnDash enrolments' },
  { id: 'ov-satisfaction', page: 'overview', dim: 'learning', title: 'Course satisfaction', question: 'Is the quality good?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey, quality item' },
  { id: 'ov-learning', page: 'overview', dim: 'learning', title: 'Perceived learning', question: 'Do learners feel they learned?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey, "increased my understanding"' },
  { id: 'ov-nps', page: 'overview', dim: 'platform', title: 'Likelihood to recommend', question: 'Would learners recommend the academy?', badges: ['survey'], todayMode: 'locked', unlock: 'Platform survey every six months', sources: ['surveys'], source: 'Platform survey, 0-10 (NPS)' },
  { id: 'ov-applying', page: 'overview', dim: 'practice', title: 'Applying in practice', question: 'Do learners use it in their work?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up surveys at 6 and 12 months', sources: ['followup'], source: 'Follow-up, "used anything in your work" often or sometimes' },
  { id: 'ov-confirmed', page: 'overview', dim: 'practice', title: 'Practice change confirmed', question: 'Do others observe the change?', badges: ['evidence'], todayMode: 'locked', unlock: 'Layer 5 evidence recorded by the teams', sources: ['learndash', 'followup', 'teamform'], source: 'Triangulation summary per learning area' },
  { id: 'ov-monthly', page: 'overview', dim: 'learning', title: 'Monthly active learners and return rate', question: 'Is use growing, and do learners come back?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Lessons, quizzes and downloads only.', sources: ['learndash', 'dlm', 'eventlog', 'tutor'], sourcesToday: ['learndash', 'dlm'], source: 'As monthly active learners' },
  { id: 'ov-topcourses', page: 'overview', dim: 'learning', title: 'Most sought courses', question: 'Which courses draw learners?', badges: ['today'], todayMode: 'full', sources: L, source: 'LearnDash enrolments' },
  { id: 'ov-topresources', page: 'overview', dim: 'learning', title: 'Most used resources', question: 'Which resources draw learners?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Page views by everyone and downloads.', sources: ['eventlog', 'dlm'], sourcesToday: ['monster', 'dlm'], source: 'Resource events; today MonsterInsights top pages and Download Manager' },
  { id: 'ov-signals', page: 'overview', dim: 'platform', title: 'Worth a look', question: 'What should the team act on?', badges: ['today'], todayMode: 'full', sources: ['learndash', 'regform', 'catalogue'], source: 'Rules over the course, quiz, content-gap and survey views' },

  // ---------------- learners: Level 1
  { id: 'ln-registered', page: 'learners', dim: 'platform', title: 'Registered learners', question: 'How many learners are there?', badges: ['today'], todayMode: 'full', sources: ['regform'], source: 'wp_users' },
  { id: 'ln-enrolled', page: 'learners', dim: 'learning', title: 'Enrolled in a course', question: 'How many start learning?', badges: ['today'], todayMode: 'full', sources: ['regform', 'learndash'], source: 'wp_users + LearnDash' },
  { id: 'ln-never', page: 'learners', dim: 'learning', title: 'Registered, never enrolled', question: 'How many sign up and never start a course?', badges: ['today'], todayMode: 'full', sources: ['regform', 'learndash'], source: 'wp_users + LearnDash', caveat: 'Some of them use resources only; count those with the event log.' },
  { id: 'ln-monthly', page: 'learners', dim: 'platform', title: 'Registrations per month', question: 'How fast is the academy growing?', badges: ['today'], todayMode: 'full', sources: ['regform'], source: 'wp_users.user_registered' },
  { id: 'ln-reach', page: 'learners', dim: 'platform', title: 'Reach against intended audiences', question: 'Are we reaching the people AKF wants to reach?', badges: ['today', 'profile'], todayMode: 'partial', todayNote: 'Role only; institution type and district need new profile fields.', sources: ['regform'], source: 'Profile fields + targets set by the D&I team (invented here)' },
  { id: 'ln-mix', page: 'learners', dim: 'platform', title: 'Profile mix', question: 'Who are the learners?', badges: ['today', 'profile'], todayMode: 'partial', todayNote: 'Fields collected today only.', sources: ['regform'], source: 'Profile Builder fields in wp_usermeta; new fields from the framework', caveat: 'Stored as PT or EN text; mapped to one code list.' },
  { id: 'ln-segment', page: 'learners', dim: 'learning', title: 'Completion rate by group', question: 'Which groups finish their courses?', badges: ['today', 'profile'], todayMode: 'partial', todayNote: 'Fields collected today only.', sources: ['regform', 'learndash'], source: 'Profile + LearnDash' },
  { id: 'ln-territory', page: 'learners', dim: 'platform', title: 'Learners by municipality', question: 'Where do learners work?', badges: ['profile'], todayMode: 'locked', unlock: 'District and municipality at registration', sources: ['regform', 'learndash'], source: 'New location field (district, municipality; never an address)' },
  { id: 'ln-cohort', page: 'learners', dim: 'learning', title: 'Do learners come back?', question: 'How many in each cohort are still learning?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Lessons, quizzes and downloads only.', sources: ['regform', 'learndash', 'dlm', 'eventlog', 'tutor'], sourcesToday: ['regform', 'learndash', 'dlm'], source: 'user_registered + learning actions' },
  { id: 'ln-institution', page: 'learners', dim: 'practice', title: 'Learners by institution', question: 'Which partner institutions take part?', badges: ['profile'], todayMode: 'locked', unlock: 'Institution type and name at registration', sources: ['regform', 'learndash'], source: 'New institution fields (type required, name optional)' },
  { id: 'ln-consent', page: 'learners', dim: 'platform', title: 'Consents given', question: 'Which uses of their data did learners agree to?', badges: ['profile'], todayMode: 'locked', unlock: 'Consent questions at registration', sources: ['regform'], source: 'Consent fields: evaluation, re-contact after courses, AI analysis of tutor conversations', caveat: 'An answer is required; "yes" is not.' },

  // ---------------- access: everyone who visits
  { id: 'ac-sessions', page: 'access', dim: 'platform', title: 'Visits', question: 'How many visits, registered or not?', badges: ['today'], todayMode: 'full', sources: ['monster'], source: 'MonsterInsights overview (sessions)' },
  { id: 'ac-engaged', page: 'access', dim: 'platform', title: 'Engagement rate', question: 'Do visits go beyond one page?', badges: ['today'], todayMode: 'full', sources: ['monster'], source: 'MonsterInsights overview (engaged sessions)' },
  { id: 'ac-returning', page: 'access', dim: 'platform', title: 'Returning visitors', question: 'Do visitors come back?', badges: ['today'], todayMode: 'full', sources: ['monster'], source: 'MonsterInsights new vs returning users' },
  { id: 'ac-gateconv', page: 'access', dim: 'platform', title: 'Gate conversion', question: 'How often does the gate lead to an account?', badges: ['track'], todayMode: 'locked', unlock: 'The registration gate and its events', sources: ['eventlog'], source: 'Gate shown and registration-after-gate events' },
  { id: 'ac-traffic', page: 'access', dim: 'platform', title: 'Visits by channel', question: 'Which channels bring people in?', badges: ['today'], todayMode: 'full', sources: ['monster'], source: 'MonsterInsights source / medium, AI traffic' },
  { id: 'ac-referrers', page: 'access', dim: 'platform', title: 'Referring sites and AI tools', question: 'Which partners and tools send visitors?', badges: ['today'], todayMode: 'full', sources: ['monster'], source: 'MonsterInsights top referrals and AI traffic' },
  { id: 'ac-unregistered', page: 'access', dim: 'learning', title: 'Resource views with and without an account', question: 'How much use happens before anyone registers?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Total page views only; the split needs the event log.', sources: ['monster', 'eventlog'], sourcesToday: ['monster'], source: 'MonsterInsights top pages vs resource opened events' },
  { id: 'ac-gate', page: 'access', dim: 'platform', title: 'Registration gate', question: 'Does asking for an account after three resources bring registrations?', badges: ['track'], todayMode: 'locked', unlock: 'The registration gate and its events', sources: ['eventlog'], source: 'Gate shown and registration-after-gate events', caveat: 'In the demo data the gate starts in May 2026.' },
  { id: 'ac-devices', page: 'access', dim: 'platform', title: 'Devices', question: 'Do people study on phones, or in VR?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'All visitors in aggregate; per learner needs the event log.', sources: ['monster', 'eventlog'], sourcesToday: ['monster'], source: 'MonsterInsights technology and devices (incl. Meta Quest); event log session device' },
  { id: 'ac-region', page: 'access', dim: 'platform', title: 'Where visitors come from', question: 'Which regions and countries?', badges: ['today'], todayMode: 'full', sources: ['monster'], source: 'MonsterInsights demographics: country and region' },

  // ---------------- courses
  { id: 'co-table', page: 'courses', dim: 'learning', title: 'Courses', question: 'Which courses are most and least sought, and which are finished?', badges: ['today', 'survey'], todayMode: 'partial', todayNote: 'Satisfaction needs the end-of-course survey.', sources: ['learndash', 'surveys'], sourcesToday: L, source: 'LearnDash enrolments, completions, quiz attempts, certificates; survey for satisfaction' },
  { id: 'co-monthly', page: 'courses', dim: 'learning', title: 'Enrolments per month by learning area', question: 'Which learning areas are growing?', badges: ['today'], todayMode: 'full', sources: L, source: 'LearnDash enrolments + akfthemes' },
  { id: 'co-funnel', page: 'courses', dim: 'learning', title: 'Course funnel', question: 'How far do learners get?', badges: ['today'], todayMode: 'full', sources: L, source: 'access / course rows, steps_completed, _ld_course_steps_count' },
  { id: 'co-lessons', page: 'courses', dim: 'learning', title: 'Drop-off points', question: 'Where do learners stop?', badges: ['today'], todayMode: 'full', sources: ['learndash', 'eventlog'], sourcesToday: L, source: 'Last lesson reached per enrolment (LearnDash lesson activity in course order)' },
  { id: 'co-time', page: 'courses', dim: 'learning', title: 'Time per lesson', question: 'Which lessons take longest?', badges: ['today'], todayMode: 'full', sources: L, source: 'Uncanny Toolkit Pro timer, uo_timer_<course>_<step> (total seconds, no dates)', caveat: 'No dates: the period filter does not apply. Runs only if the timer module is on.' },
  { id: 'co-activedays', page: 'courses', dim: 'learning', title: 'Active days per learner', question: 'How often do learners come to learn each month?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Days with a lesson, quiz or download only.', sources: ['learndash', 'dlm', 'eventlog', 'tutor'], sourcesToday: ['learndash', 'dlm'], source: 'Days with a learning action per learner and month' },
  { id: 'co-risk', page: 'courses', dim: 'learning', title: 'Learners at risk', question: 'Who should we contact before they leave?', badges: ['today'], todayMode: 'full', sources: L, source: 'LearnDash activity dates + a simple risk rule', caveat: 'Uses pseudonymous IDs; individual views need their own permission.' },
  { id: 'co-badges', page: 'courses', dim: 'learning', title: 'Badges earned', question: 'Which badges do learners earn?', badges: ['today'], todayMode: 'full', sources: ['gamipress'], source: 'GamiPress user earnings' },
  { id: 'co-certificates', page: 'courses', dim: 'learning', title: 'Certificates issued', question: 'How many certificates per course?', badges: ['today'], todayMode: 'full', sources: L, source: 'LearnDash course certificates' },

  // ---------------- quizzes
  { id: 'qz-table', page: 'quizzes', dim: 'learning', title: 'Quizzes', question: 'How does each quiz perform?', badges: ['today'], todayMode: 'full', sources: L, source: 'Quiz activity rows + meta: score, percentage, pass, timespent' },
  { id: 'qz-attempts', page: 'quizzes', dim: 'learning', title: 'Attempts needed to pass', question: 'Are quizzes a barrier?', badges: ['today'], todayMode: 'full', sources: L, source: 'Quiz attempts per learner and quiz' },
  { id: 'qz-scores', page: 'quizzes', dim: 'learning', title: 'First-attempt scores', question: 'Is the pass mark in the right place?', badges: ['today'], todayMode: 'full', sources: L, source: 'Quiz attempts (percentage)' },
  { id: 'qz-types', page: 'quizzes', dim: 'learning', title: 'Question types compared', question: 'Which question types are worth building more of?', badges: ['today'], todayMode: 'full', sources: L, source: 'pro_quiz_question.answer_type + pro_quiz_statistic', caveat: 'Only quizzes with statistics on.' },
  { id: 'qz-map', page: 'quizzes', dim: 'learning', title: 'Question map', question: 'Which questions to keep, fix or drop?', badges: ['today'], todayMode: 'full', sources: L, source: 'pro_quiz_statistic per question per attempt', caveat: 'Only quizzes with statistics on.' },
  { id: 'qz-review', page: 'quizzes', dim: 'learning', title: 'Questions to review', question: 'What exactly should authors fix?', badges: ['today'], todayMode: 'full', sources: L, source: 'pro_quiz_statistic incl. answer_data (answer given)', caveat: 'Essay questions are graded later and change results.' },

  // ---------------- materials
  { id: 'mt-uses', page: 'materials', dim: 'learning', title: 'Resources opened and downloaded', question: 'How much are resources used?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Page views by everyone + downloads.', sources: ['eventlog', 'dlm'], sourcesToday: ['monster', 'dlm'], source: 'Resource opened (incl. PDF viewer) and downloaded events; today MonsterInsights top pages and Download Manager' },
  { id: 'mt-learners', page: 'materials', dim: 'learning', title: 'Learners using resources', question: 'How many learners use resources?', badges: ['track'], todayMode: 'locked', unlock: 'Per-learner resource events', sources: ['eventlog'], source: 'Resource events (registered learners)' },
  { id: 'mt-downloads', page: 'materials', dim: 'learning', title: 'Downloads', question: 'What gets taken away?', badges: ['today'], todayMode: 'full', sources: ['dlm'], source: 'ahm_download_stats' },
  { id: 'mt-videofinish', page: 'materials', dim: 'learning', title: 'Videos watched to the end', question: 'Are videos finished?', badges: ['track'], todayMode: 'locked', unlock: 'Video and audio player events', sources: ['eventlog'], source: 'Player events: started, finished, dropped before 50%' },
  { id: 'mt-bytype', page: 'materials', dim: 'learning', title: 'Use per month by format', question: 'Which formats are used?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Page views by everyone + downloads; learner filters do not apply.', sources: ['eventlog', 'dlm'], sourcesToday: ['monster', 'dlm'], source: 'As above, by resource type' },
  { id: 'mt-top', page: 'materials', dim: 'learning', title: 'Most and least used resources', question: 'Which resources draw learners, and are they useful?', badges: ['today', 'track', 'survey'], todayMode: 'partial', todayNote: 'Views and downloads only.', sources: ['eventlog', 'dlm', 'recengine', 'surveys'], sourcesToday: ['monster', 'dlm'], source: 'Resource events, recommendation clicks, one-click feedback' },
  { id: 'mt-grid', page: 'materials', dim: 'learning', title: 'Use by learning area and format', question: 'Which formats work in which area?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Page views by everyone + downloads.', sources: ['eventlog', 'dlm'], sourcesToday: ['monster', 'dlm'], source: 'As above + taxonomies' },
  { id: 'mt-visitors', page: 'materials', dim: 'learning', title: 'Downloads: learners and visitors', question: 'Who uses the open resources?', badges: ['today'], todayMode: 'full', sources: ['dlm'], source: 'ahm_download_stats.uid (0 = visitor)', caveat: 'Bots are not filtered by Download Manager.' },
  { id: 'mt-useful', page: 'materials', dim: 'learning', title: 'Was this useful for your work?', question: 'Which resources do learners find useful?', badges: ['survey'], todayMode: 'locked', unlock: 'One-click feedback after a resource is opened or downloaded', sources: ['surveys'], source: 'One-click feedback: yes / partly / no' },
  { id: 'mt-video', page: 'materials', dim: 'learning', title: 'Video and audio use', question: 'Are videos and podcasts watched to the end?', badges: ['track'], todayMode: 'locked', unlock: 'Video and audio player events', sources: ['eventlog'], source: 'Player events; MonsterInsights Media once switched on (aggregate)', caveat: 'MonsterInsights Media tracks standard players only.' },
  { id: 'mt-videocurve', page: 'materials', dim: 'learning', title: 'Where viewers stop inside a video', question: 'At which point do viewers leave?', badges: ['track'], todayMode: 'locked', unlock: 'Video progress every 10%', sources: ['eventlog'], source: 'Player progress milestones' },
  { id: 'mt-search', page: 'materials', dim: 'learning', title: 'Searches and filters', question: 'How do learners look for resources?', badges: ['track'], todayMode: 'locked', unlock: 'Search and filter events in the resource library', sources: ['eventlog'], source: 'Search and filter events' },

  // ---------------- gaps
  { id: 'gp-demand', page: 'gaps', dim: 'learning', title: 'Wanted vs available, by topic', question: 'Which topics are wanted by many but have few resources?', badges: ['today'], todayMode: 'full', sources: ['regform', 'catalogue'], source: 'Profile interests (topic term IDs) + topic tags on courses and resources', caveat: 'Interests have no history; PT and EN topic entries must be mapped to one list.' },
  { id: 'gp-lang', page: 'gaps', dim: 'learning', title: 'Learners vs content, by language', question: 'Are learners served in their language?', badges: ['today'], todayMode: 'full', sources: ['regform', 'catalogue'], source: 'Profile language + akflanguages + WPML' },
  { id: 'gp-nosearch', page: 'gaps', dim: 'learning', title: 'Searches with no results', question: 'What do learners look for and not find?', badges: ['track'], todayMode: 'locked', unlock: 'Search events in the resource library', sources: ['eventlog'], source: 'Search events with zero results' },
  { id: 'gp-tutorgaps', page: 'gaps', dim: 'tutor', title: 'Tutor questions with no matching resource', question: 'What do learners ask that no resource answers?', badges: ['ai'], todayMode: 'locked', unlock: 'AI grouping of tutor questions', sources: ['tutor', 'aianalysis'], source: 'AI question grouping over consented conversations' },
  { id: 'gp-format', page: 'gaps', dim: 'learning', title: 'Formats per topic', question: 'Which formats are missing for each topic?', badges: ['today'], todayMode: 'full', sources: ['catalogue'], source: 'Resource post types + topic taxonomy' },
  { id: 'gp-improve', page: 'gaps', dim: 'learning', title: 'Content to improve', question: 'Which existing items need work?', badges: ['today', 'survey'], todayMode: 'partial', todayNote: 'Satisfaction signals need the survey.', sources: ['learndash', 'surveys'], sourcesToday: L, source: 'Course, lesson, quiz and survey views' },

  // ---------------- recommendations
  { id: 'rc-match', page: 'recommendations', dim: 'learning', title: 'Enrolments matching interests', question: 'Do learners take courses that match their interests?', badges: ['today'], todayMode: 'full', sources: ['regform', 'learndash'], source: 'Profile interests + course topics' },
  { id: 'rc-matchcompletion', page: 'recommendations', dim: 'learning', title: 'Completion: matched vs not matched', question: 'Does matching interests help learners finish?', badges: ['today'], todayMode: 'full', sources: ['regform', 'learndash'], source: 'As above + LearnDash completions' },
  { id: 'rc-uptake', page: 'recommendations', dim: 'learning', title: 'Recommendation uptake', question: 'From shown to completed: where are learners lost?', badges: ['track'], todayMode: 'locked', unlock: 'Recommendation shown and clicked events', sources: ['recengine', 'eventlog', 'learndash'], source: 'Shown, clicked, enrolled (within the attribution window), completed' },
  { id: 'rc-carousel', page: 'recommendations', dim: 'learning', title: 'Carousel performance', question: 'Which "Recommended for you" carousels work?', badges: ['track'], todayMode: 'locked', unlock: 'Recommendation shown and clicked events', sources: ['recengine', 'eventlog'], source: 'Shown / clicked events, six Bricks carousels' },
  { id: 'rc-position', page: 'recommendations', dim: 'learning', title: 'Clicks by position', question: 'Do learners look past the first items?', badges: ['track'], todayMode: 'locked', unlock: 'Recommendation shown and clicked events', sources: ['recengine', 'eventlog'], source: 'Shown / clicked events with position' },
  { id: 'rc-attribution', page: 'recommendations', dim: 'learning', title: 'Recommended vs found otherwise', question: 'Are recommended courses finished more often?', badges: ['track'], todayMode: 'locked', unlock: 'Click-to-enrolment attribution', sources: ['recengine', 'eventlog', 'learndash'], source: 'Click-to-enrolment attribution' },
  { id: 'rc-relevance', page: 'recommendations', dim: 'learning', title: 'Fit of recommendations', question: 'Do suggested learning paths match learners\' interests?', badges: ['survey'], todayMode: 'locked', unlock: 'Platform survey every six months', sources: ['surveys'], source: 'Platform survey: "The learning paths suggested to me match the interests I gave at registration"' },

  // ---------------- feedback: Level 3
  { id: 'fb-avg', page: 'feedback', dim: 'learning', title: 'Course satisfaction', question: 'Is the course quality good?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey, quality item (1-5)' },
  { id: 'fb-learning', page: 'feedback', dim: 'learning', title: 'Perceived learning', question: 'Did the course increase understanding?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey (1-5)' },
  { id: 'fb-intent', page: 'feedback', dim: 'practice', title: 'Intention to apply', question: 'Do learners plan to use it?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey: "What will you try to apply in your work?" answered' },
  { id: 'fb-nps', page: 'feedback', dim: 'platform', title: 'Likelihood to recommend', question: 'Would learners recommend the academy?', badges: ['survey'], todayMode: 'locked', unlock: 'Platform survey every six months', sources: ['surveys'], source: 'Platform survey, 0-10' },
  { id: 'fb-rate', page: 'feedback', dim: 'learning', title: 'Response rate', question: 'Can the results be trusted?', badges: ['survey'], todayMode: 'locked', unlock: 'Survey send log', sources: ['surveys'], source: 'Send and reminder logs' },
  { id: 'fb-grid', page: 'feedback', dim: 'learning', title: 'End-of-course survey by course', question: 'Which courses and items score low?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey (three items, 1-5)' },
  { id: 'fb-funnel', page: 'feedback', dim: 'learning', title: 'Survey responses', question: 'How many answer, and does the reminder help?', badges: ['survey'], todayMode: 'locked', unlock: 'Survey send and reminder logs', sources: ['surveys'], source: 'Send and reminder logs' },
  { id: 'fb-trend', page: 'feedback', dim: 'learning', title: 'End-of-course scores over time', question: 'Is it getting better?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey' },
  { id: 'fb-platform', page: 'feedback', dim: 'platform', title: 'Platform survey', question: 'How do learners rate the platform as a whole?', badges: ['survey'], todayMode: 'locked', unlock: 'Platform survey every six months', sources: ['surveys'], source: 'Platform survey, about 10 items, to all learners active in the six months' },
  { id: 'fb-comments', page: 'feedback', dim: 'practice', title: 'In their own words', question: 'What will learners try, and what is missing?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey', sources: ['surveys'], source: 'End-of-course survey, two open questions' },
  { id: 'fb-reviews', page: 'feedback', dim: 'learning', title: 'Course Reviews (built into LearnDash)', question: 'Star ratings possible today', badges: ['today'], todayMode: 'full', sources: L, source: 'wp_comments, comment_type ld_review + rating', caveat: 'Only if Course Reviews are switched on per course.' },

  // ---------------- Virtual Tutor
  { id: 'vt-adoption', page: 'tutor', dim: 'tutor', title: 'Tutor adoption', question: 'Share of active learners with at least one conversation', badges: ['track'], todayMode: 'locked', unlock: 'Tutor conversations linked to the learner ID', sources: ['tutor', 'eventlog'], source: 'Tutor conversation started events, learner ID' },
  { id: 'vt-perlearner', page: 'tutor', dim: 'tutor', title: 'Conversations per tutor user', question: 'Do learners come back to the tutor?', badges: ['track'], todayMode: 'locked', unlock: 'Tutor conversations linked to the learner ID', sources: ['tutor', 'eventlog'], source: 'Conversations per learner' },
  { id: 'vt-length', page: 'tutor', dim: 'tutor', title: 'Average conversation length', question: 'How long do conversations last?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'ElevenLabs totals, last 30 days only.', sources: ['tutor'], source: 'ElevenLabs conversation duration' },
  { id: 'vt-thumbs', page: 'tutor', dim: 'tutor', title: 'Answers rated useful', question: 'Thumbs up after a conversation', badges: ['survey'], todayMode: 'locked', unlock: 'Thumbs up or down after a tutor conversation', sources: ['surveys'], source: 'Tutor feedback (thumbs)' },
  { id: 'vt-monthly', page: 'tutor', dim: 'tutor', title: 'Conversations per month, voice and text', question: 'Is the tutor used more over time?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'ElevenLabs keeps 30 days and has no learner ID: totals for the last month only.', sources: ['tutor', 'eventlog'], sourcesToday: ['tutor'], source: 'ElevenLabs conversations + tutor events' },
  { id: 'vt-mode', page: 'tutor', dim: 'tutor', title: 'Preferred and actual mode', question: 'Do learners use the tutor the way they say they prefer?', badges: ['survey', 'track'], todayMode: 'locked', unlock: 'Platform survey + tutor mode per conversation', sources: ['surveys', 'tutor'], source: 'Platform survey (preferred mode) vs conversation mode' },
  { id: 'vt-groups', page: 'tutor', dim: 'tutor', title: 'What learners ask', question: 'Which question groups come up most, and are the answers rated useful?', badges: ['ai', 'survey'], todayMode: 'locked', unlock: 'AI grouping of tutor questions', sources: ['tutor', 'aianalysis', 'surveys'], source: 'AI question grouping + thumbs per conversation', caveat: 'Only learners who agreed to AI analysis.' },
  { id: 'vt-lessons', page: 'tutor', dim: 'tutor', title: 'Where conversations start', question: 'Which lessons send learners to the tutor?', badges: ['track'], todayMode: 'locked', unlock: 'The lesson a conversation starts from', sources: ['tutor', 'eventlog', 'learndash'], source: 'Tutor conversation started event with the lesson' },
  { id: 'vt-usefulness', page: 'tutor', dim: 'tutor', title: 'Usefulness and reflection', question: 'Is the tutor useful, and does it make learners think?', badges: ['survey'], todayMode: 'locked', unlock: 'Platform survey every six months', sources: ['surveys'], source: 'Platform survey, three tutor items (1-5)' },
  { id: 'vt-segment', page: 'tutor', dim: 'tutor', title: 'Adoption by group', question: 'Who uses the tutor?', badges: ['track'], todayMode: 'locked', unlock: 'Tutor conversations linked to the learner ID', sources: ['tutor', 'eventlog', 'regform'], source: 'Tutor users / active learners per Level 1 group' },

  // ---------------- impact: Level 4
  { id: 'im-coverage', page: 'impact', dim: 'practice', title: 'Follow-up coverage', question: 'Who could we ask, and how many answered?', badges: ['survey', 'profile'], todayMode: 'locked', unlock: 'Follow-up surveys and the re-contact consent', sources: ['followup', 'regform'], source: 'Eligible (completed a selected course), consented, contacted, responded' },
  { id: 'im-use', page: 'impact', dim: 'practice', title: 'Use in work', question: 'Have learners used anything from the course in their work?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up surveys at 6 and 12 months', sources: ['followup'], source: 'Follow-up: often / sometimes / not yet / no' },
  { id: 'im-outcomes', page: 'impact', dim: 'practice', title: 'Practice, organisation and communities', question: 'What changed beyond the learner?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up surveys at 6 and 12 months', sources: ['followup'], source: 'Follow-up yes / no questions' },
  { id: 'im-confidence', page: 'impact', dim: 'learning', title: 'Confidence before and now', question: 'How much has confidence grown, by learning area?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up surveys at 6 and 12 months', sources: ['followup', 'regform'], source: 'Follow-up "before and now" (1-5); starting point at registration where given' },
  { id: 'im-barriers', page: 'impact', dim: 'practice', title: 'What made it harder to apply', question: 'What gets in the way?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up survey at 6 months', sources: ['followup'], source: 'Follow-up multiple choice' },
  { id: 'im-respondents', page: 'impact', dim: 'practice', title: 'Respondents vs eligible learners', question: 'Are respondents like everyone we could ask?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up surveys + Level 1 profile', sources: ['followup', 'regform'], source: 'Level 1 profile of respondents vs eligible learners' },
  { id: 'im-segment', page: 'impact', dim: 'practice', title: 'Use in work by group', question: 'Where is the change largest?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up surveys + Level 1 profile', sources: ['followup', 'regform'], source: 'Follow-ups + profile' },
  { id: 'im-org', page: 'impact', dim: 'practice', title: 'Organisations changing practice', question: 'Are organisations changing how they work?', badges: ['survey', 'profile'], todayMode: 'locked', unlock: 'Follow-ups + institution field', sources: ['followup', 'regform'], source: '12-month follow-up + institution type' },
  { id: 'im-quotes', page: 'impact', dim: 'practice', title: 'Plan and practice, in their words', question: 'What did learners plan, and what do they now do differently?', badges: ['survey'], todayMode: 'locked', unlock: 'End-of-course survey and follow-ups', sources: ['surveys', 'followup'], source: 'End-of-course plan, quoted back in the follow-up; "one thing I now do differently"' },

  // ---------------- triangulation: Layer 5
  { id: 'tr-summary', page: 'triangulation', dim: 'practice', title: 'Triangulation by learning area', question: 'Do the three kinds of evidence point the same way?', badges: ['today', 'survey', 'evidence'], todayMode: 'locked', unlock: 'Follow-ups and Layer 5 evidence', sources: ['learndash', 'followup', 'teamform'], source: 'Platform records (completion, quiz), learners\' reports (use in work), outside observation (Layer 5 ratings)' },
  { id: 'tr-methods', page: 'triangulation', dim: 'practice', title: 'Evidence by method', question: 'What have the teams gathered?', badges: ['evidence'], todayMode: 'locked', unlock: 'An admin form for Layer 5 evidence', sources: ['teamform'], source: 'Layer 5 admin form' },
  { id: 'tr-indicators', page: 'triangulation', dim: 'practice', title: 'Practice indicators observed', question: 'How do others rate the practice?', badges: ['evidence'], todayMode: 'locked', unlock: 'An admin form for Layer 5 evidence', sources: ['teamform'], source: 'Layer 5 ratings on the seven practice indicators' },
  { id: 'tr-activities', page: 'triangulation', dim: 'practice', title: 'Evidence log', question: 'Each activity, with themes and a selected quote', badges: ['evidence'], todayMode: 'locked', unlock: 'An admin form for Layer 5 evidence', sources: ['teamform'], source: 'Layer 5 admin form: date, method, area, territory, participants, themes, quotes' },

  // ---------------- communities
  { id: 'cp-members', page: 'communities', dim: 'cop', title: 'Members', question: 'How many learners are in a community?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app memberships' },
  { id: 'cp-active', page: 'communities', dim: 'cop', title: 'Active members', question: 'Members active in the last 30 days', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app posts and replies' },
  { id: 'cp-posts', page: 'communities', dim: 'cop', title: 'Posts and replies', question: 'How much discussion is there?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app posts and replies' },
  { id: 'cp-firstreply', page: 'communities', dim: 'cop', title: 'Time to first reply', question: 'Do questions get answered quickly?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app thread timestamps' },
  { id: 'cp-communities', page: 'communities', dim: 'cop', title: 'Members and active members by community', question: 'Which communities are alive?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app' },
  { id: 'cp-monthly', page: 'communities', dim: 'cop', title: 'Discussion per month', question: 'Is participation growing?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app' },
  { id: 'cp-peer', page: 'communities', dim: 'cop', title: 'Peer replies', question: 'Is it peer learning or moderator-led?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', sources: ['copapp'], source: 'CoP app replies by author role' },
  { id: 'cp-moderation', page: 'communities', dim: 'cop', title: 'Moderation: AI and people', question: 'How much moderation does the AI take on?', badges: ['cop'], todayMode: 'locked', unlock: 'CoP moderation log', sources: ['copapp'], source: 'CoP app moderation log', caveat: 'Only if the CoP app logs AI actions.' },
  { id: 'cp-cocreated', page: 'communities', dim: 'cop', title: 'Resources co-created by members', question: 'Do members build resources together?', badges: ['cop'], todayMode: 'locked', unlock: 'Co-created resources in the CoP app', sources: ['copapp'], source: 'Resources by two or more members, started or completed', caveat: 'Counting resources started needs a draft status in the app.' },
  { id: 'cp-belonging', page: 'communities', dim: 'cop', title: 'Useful discussions, feeling less alone', question: 'Do members find it useful, and feel less alone?', badges: ['survey', 'cop'], todayMode: 'locked', unlock: 'Platform survey + CoP membership', sources: ['surveys', 'copapp'], source: 'Platform survey items, members vs other learners' },
  { id: 'cp-contacts', page: 'communities', dim: 'cop', title: 'New contacts or collaborations', question: 'Does taking part lead to new contacts?', badges: ['survey', 'cop'], todayMode: 'locked', unlock: 'Follow-up surveys + CoP membership', sources: ['followup', 'copapp'], source: 'Follow-up question for community members' },
  { id: 'cp-completion', page: 'communities', dim: 'cop', title: 'Course completion: members and others', question: 'Do community members learn more?', badges: ['cop', 'today'], todayMode: 'locked', unlock: 'Linked CoP and platform accounts', sources: ['copapp', 'learndash'], source: 'CoP memberships + LearnDash, linked accounts', caveat: 'Association, not cause.' },
  { id: 'cp-focus', page: 'communities', dim: 'cop', title: 'Focus groups on peer support', question: 'What do members say in person?', badges: ['evidence'], todayMode: 'locked', unlock: 'An admin form for Layer 5 evidence', sources: ['teamform'], source: 'Layer 5 records with the theme "peer support"' },
];

export function chartsFor(page: PageKey): ChartDef[] {
  return CHARTS.filter((c) => c.page === page);
}

export function chart(id: string): ChartDef {
  const c = CHARTS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chart ${id}`);
  return c;
}

export function page(key: PageKey): PageDef {
  return PAGES.find((p) => p.key === key)!;
}
