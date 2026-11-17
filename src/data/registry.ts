// One source of truth for every screen and chart: what the client sees (title,
// question, badge, what unlocks it) and what the presenter sees (talking points,
// questions, source, caveats). Estimate detail (WBS rows, priced or not) is NOT here:
// it lives in the git-ignored internal-notes.ts, loaded by internal.ts when present.
// Mirrors kcidade-analytics-demo-data-catalogue.md.

export type Status = 'today' | 'track' | 'survey' | 'profile' | 'cop';
export type Priced = 'yes' | 'partly' | 'no';

/** estimate detail per chart; values live only in the git-ignored internal-notes.ts */
export interface ChartEstimate {
  rows: string;
  priced: Priced;
  pricedNote?: string;
}
export type PageKey =
  | 'overview'
  | 'courses'
  | 'quizzes'
  | 'materials'
  | 'gaps'
  | 'learners'
  | 'recommendations'
  | 'feedback'
  | 'impact'
  | 'communities'
  | 'readiness';

export const STATUS_META: Record<Status, { label: string; short: string; color: string; unlockedBy: string }> = {
  today: { label: 'Available today', short: 'Today', color: 'green', unlockedBy: 'Existing platform data' },
  track: { label: 'New tracking', short: 'Tracking', color: 'blue', unlockedBy: 'New tracking in WordPress and the browser' },
  survey: { label: 'Survey', short: 'Survey', color: 'purple', unlockedBy: 'New surveys' },
  profile: { label: 'New profile field', short: 'Profile', color: 'gold', unlockedBy: 'A new profile field' },
  cop: { label: 'CoP app', short: 'CoP app', color: 'magenta', unlockedBy: 'Data from the Communities of Practice app' },
};

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
  source: string;
  caveat?: string;
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
    intro: 'How the academy is used, at a glance, and what is worth a closer look.',
    talk: [
      'Open with the mode switch on "Today\'s data": everything in the top row except satisfaction already exists in the platform, with history back to launch.',
      'Then flip to "With proposed additions" to show what the new tracking and surveys add: satisfaction, real resource use, video watching.',
      'The "Worth a look" cards turn dashboards into a to-do list: the lesson to fix, the question to rewrite, the topic that needs material.',
      'Every number here is invented demo data, shaped like their real database. Say this early.',
    ],
    ask: [
      'Which three numbers would your management look at every month?',
      'Who will read these dashboards, and how often?',
      'Is daily refresh enough, or do you expect real time?',
    ],
    watch: [
      '"Active learner" today means learning activity (a lesson, a quiz, a download), not a visit. Visits need the new tracking.',
      'The demo is not the BI tool. The client has not chosen one; the content of the dashboards is what we are agreeing on.',
    ],
    next: 'courses',
  },
  {
    key: 'courses',
    path: '/courses',
    title: 'Courses & progression',
    group: 'Learning',
    intro: 'Which courses learners choose, how far they get, and where they stop.',
    talk: [
      'The course table answers "which courses are popular" and "which are finished" side by side.',
      'Pick "Monitorização e Avaliação de Projetos" in the course filter: the lesson chart shows a sharp fall after lesson 3. That is the kind of finding that tells them which lesson to rework.',
      'The at-risk list replaces the theme\'s drop-off report, which never worked: it reads a value the theme never writes.',
      'Time per lesson comes from the course timer they already have, but it has no dates, so it ignores the period filter.',
    ],
    ask: [
      'Is a "learning pathway" one course or a sequence of courses?',
      'Is a "module" a LearnDash lesson?',
      'After how many days without activity should a learner count as at risk?',
      'Do courses get new lessons after launch? (It changes everyone\'s completion percentage.)',
    ],
    watch: [
      'Admin resets and access expiry delete progress records in LearnDash; reporting has to decide whether to keep its copy.',
    ],
    next: 'quizzes',
  },
  {
    key: 'quizzes',
    path: '/quizzes',
    title: 'Quizzes & questions',
    group: 'Learning',
    intro: 'Which quizzes and question types work, and which questions to keep, fix or replace.',
    talk: [
      'This is the strongest day-one screen: LearnDash already stores every attempt and, where statistics are on, every answer to every question.',
      'The question map plots difficulty against discrimination. A question that strong learners get wrong more often than weak ones almost always has a wording or answer-key problem.',
      'The review list gives the concrete fix, with the most chosen wrong answer: that is the misconception to address in the lesson.',
      'Compare question types: free-text questions score low and tell little, because LearnDash matches free text exactly and marks correct synonyms wrong.',
    ],
    ask: [
      'Is "statistics" switched on for every quiz that matters? (Without it there is no question-level data.)',
      'Which attempt should count in reports: the first, the best or the last?',
      'Are there quizzes outside courses?',
      'Who would act on the review list: course authors, or a learning designer?',
    ],
    watch: [
      'Question-level data only exists for quizzes with statistics on. The demo has 6 such quizzes switched off on purpose.',
      'In single-page quiz mode, LearnDash records the average time per question, not a real one.',
    ],
    next: 'materials',
  },
  {
    key: 'materials',
    path: '/materials',
    title: 'Learning materials',
    group: 'Content',
    intro: 'How documents, videos, podcasts, 360 videos, microlearning and downloads are used.',
    talk: [
      'Start in "Today\'s data": the platform only knows downloads and anonymous page counts. It does not know who opened a PDF, who played a podcast or how much of a video anyone watched.',
      'Switch to "With proposed additions": per-learner use by format, area and segment, and video completion.',
      'Use the segment filters (for example occupation) to show that in today\'s mode anonymous counts cannot be split by learner.',
    ],
    ask: [
      'Which video and audio players host the content: YouTube, Vimeo, self-hosted?',
      'Which events matter most for the first release?',
      'Would they want the full drop-off curve inside each video?',
    ],
    watch: [
    ],
    next: 'gaps',
  },
  {
    key: 'gaps',
    path: '/gaps',
    title: 'Content gaps',
    group: 'Content',
    intro: 'Which topics, formats and languages need new material, and which items need work.',
    talk: [
      'Interests chosen at registration are a demand signal the platform already has. Set against what is published, they show where to invest.',
      'In the demo, "Caregiver support" is wanted by many learners and has two resources. That is the kind of finding to point at.',
      'The language chart: learners can choose Nepali, Bengali, Urdu or Mandarin as their language, but almost no content exists in them.',
      'The Virtual Tutor and site search would sharpen this screen later (what learners ask). They are not in this demo.',
    ],
    ask: [
      'Who decides on new content, and how often?',
      'Would a monthly "content gaps" summary help?',
      'Are the non-PT/EN learners a priority audience?',
    ],
    watch: [
      'Interests have no history: a learner who changes them overwrites the old value.',
      'The client corrected resource tagging recently, so older comparisons mix wrong and right tags.',
    ],
    next: 'learners',
  },
  {
    key: 'learners',
    path: '/learners',
    title: 'Learners & cohorts',
    group: 'Learners',
    intro: 'Who the learners are, which groups finish, and whether learners come back.',
    talk: [
      'Profile answers are optional, so "Not answered" is shown, never hidden.',
      'The cohort grid shows, for each registration month, how many learners are still learning months later.',
      'Organisation is a new profile field (a scope addition): it unlocks results by organisation for Dimension 2.',
    ],
    ask: [
      'How do they define a cohort: by registration, by course start, or by programme intake?',
      'What is an "organisation": employer, partner institution, community group? Is there a master list?',
      'Are LearnDash groups used for classes or for organisations today?',
    ],
    watch: [
      'The profile has no history; reporting snapshots it at each load from go-live.',
      'Small groups: with real data, hide segments under a minimum size to protect privacy.',
    ],
    next: 'recommendations',
  },
  {
    key: 'recommendations',
    path: '/recommendations',
    title: 'Recommendations',
    group: 'Learners',
    intro: 'Whether "Recommended for you" leads learners to courses they finish and find relevant.',
    talk: [
      'Day one: we can already check whether learners take courses that match their interests, and whether matched courses get finished more often.',
      'Exposure and clicks need tracking, because nothing records what the carousels showed.',
      'Position matters: the click-through chart shows whether anyone looks past the first few items.',
    ],
    ask: [
      'Should recommendations change after a learner completes something? (Nothing in the theme code does that today.)',
      'How many days after a click should an enrolment count as recommended?',
      'Only the six home-page carousels, or other places too?',
      'Do they want A/B testing?',
    ],
    watch: [
      'Matched learners may simply be more motivated: the comparison shows association, not proof.',
    ],
    next: 'feedback',
  },
  {
    key: 'feedback',
    path: '/feedback',
    title: 'Course feedback',
    group: 'Impact',
    intro: 'What learners think of each course, on structure, relevance, quality and practical usefulness.',
    talk: [
      'A survey at completion, linked to the learner and the course by reference, gives comparable results and a known response rate.',
      'The grid shows weak spots at a glance, for example structure in "Proteção de Crianças e Jovens".',
      'In "Today\'s data" only LearnDash Course Reviews could give star ratings, and only if they switch them on.',
    ],
    ask: [
      'Which survey tool, and does its plan allow API access?',
      'Identified or anonymous answers?',
      'Public star ratings on course pages as well as private feedback?',
      'Were answers ever collected with the old course survey form, and should they be kept?',
    ],
    watch: [
      'The old Fluent Forms survey stored the course as typed text, not an ID.',
    ],
    next: 'impact',
  },
  {
    key: 'impact',
    path: '/impact',
    title: 'Practice change',
    group: 'Impact',
    intro: 'Whether learning changes practice 6 and 12 months after a course.',
    talk: [
      'The same core questions at completion, 6 and 12 months show change against each learner\'s own starting point.',
      'The four indicators are placeholders. The real ones come out of the co-creation phase named in the brief.',
      'Results by organisation answer the "organisational empowerment" question in the brief, once the organisation field exists.',
    ],
    ask: [
      'Follow-up per course, per pathway or per learner?',
      'Maximum survey frequency per learner?',
      'Include learners who completed 6-12 months before go-live (a catch-up wave)?',
      'Who writes and owns the indicators?',
    ],
    watch: [
      'Self-report only. Any other evidence (managers, partners) is out of scope unless they define it.',
      'Response rates fall with time; show the number of answers next to every percentage.',
    ],
    next: 'communities',
  },
  {
    key: 'communities',
    path: '/communities',
    title: 'Communities of Practice',
    group: 'Impact',
    intro: 'Participation, peer support and moderation in the communities, and their link to learning.',
    talk: [
      'All of this comes from their separate Communities of Practice app, read directly by the reporting system.',
      'Peer replies and time to first reply show whether it is peer learning or moderator-led.',
      'Members finish more courses, but motivated learners join communities: it is association, not cause.',
    ],
    ask: [
      'What does the CoP app\'s data model and API look like?',
      'How are its accounts identified: single sign-on or email?',
      'Does it log moderation and AI actions?',
      'When does it launch, and will it be integrated into WordPress?',
    ],
    watch: [
      'AI moderation can only be evaluated if the CoP app logs what its AI did.',
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
      'Close with this: a large share of what they saw works on data they already have, with history back to launch.',
      'Everything else is unlocked by named pieces of work: tracking, surveys, a profile field, the CoP connection.',
      'New tracking starts at go-live; there is no history before it.',
    ],
    ask: ['Which of these screens matters most for the first release?', 'What would they cut if they had to?'],
    watch: [],
  },
];

export const CHARTS: ChartDef[] = [
  // ---------------- overview
  { id: 'ov-active', page: 'overview', title: 'Active learners', question: 'How many learners are learning?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Lessons, quizzes and downloads only.', source: 'LearnDash activity, quiz attempts, Download Manager; later the event store' },
  { id: 'ov-registrations', page: 'overview', title: 'New registrations', question: 'Is the academy growing?', badges: ['today'], todayMode: 'full', source: 'wp_users.user_registered' },
  { id: 'ov-enrolments', page: 'overview', title: 'Course enrolments', question: 'Are learners starting courses?', badges: ['today'], todayMode: 'full', source: 'LearnDash access rows, enrolled_at usermeta' },
  { id: 'ov-completion', page: 'overview', title: 'Completion rate', question: 'Do enrolled learners finish?', badges: ['today'], todayMode: 'full', source: 'LearnDash course rows, course_completed_<id>' },
  { id: 'ov-firstpass', page: 'overview', title: 'First-attempt quiz pass rate', question: 'Are quizzes pitched right?', badges: ['today'], todayMode: 'full', source: 'LearnDash quiz activity rows (pass per attempt)' },
  { id: 'ov-resuses', page: 'overview', title: 'Resource uses', question: 'Are materials used?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Anonymous views and downloads only.', source: 'Post Views Counter, Download Manager; later resource events' },
  { id: 'ov-satisfaction', page: 'overview', title: 'Average satisfaction', question: 'Do learners like the courses?', badges: ['survey'], todayMode: 'locked', unlock: 'Course survey at completion', source: 'Survey answers' },
  { id: 'ov-weekly', page: 'overview', title: 'Weekly active learners', question: 'Is use going up or down?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Learning activity only.', source: 'As active learners' },
  { id: 'ov-topcourses', page: 'overview', title: 'Most popular courses', question: 'Which courses draw learners?', badges: ['today'], todayMode: 'full', source: 'LearnDash enrolments' },
  { id: 'ov-topresources', page: 'overview', title: 'Most used materials', question: 'Which materials draw learners?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Anonymous views and downloads.', source: 'Post Views Counter, Download Manager; later resource events' },
  { id: 'ov-signals', page: 'overview', title: 'Worth a look', question: 'What should the team act on?', badges: ['today'], todayMode: 'full', source: 'Rules over the course, quiz and content-gap views' },

  // ---------------- courses
  { id: 'co-table', page: 'courses', title: 'Courses', question: 'Which courses are popular, and which are finished?', badges: ['today', 'survey'], todayMode: 'partial', todayNote: 'Satisfaction column needs the survey.', source: 'LearnDash enrolments, completions, quiz attempts; survey for satisfaction' },
  { id: 'co-monthly', page: 'courses', title: 'Enrolments per month by learning area', question: 'Which learning areas are growing?', badges: ['today'], todayMode: 'full', source: 'LearnDash enrolments + akfthemes' },
  { id: 'co-funnel', page: 'courses', title: 'Course funnel', question: 'How far do learners get?', badges: ['today'], todayMode: 'full', source: 'access / course rows, steps_completed, _ld_course_steps_count' },
  { id: 'co-lessons', page: 'courses', title: 'Lesson by lesson', question: 'Where do learners stop?', badges: ['today'], todayMode: 'full', source: 'Lesson activity rows in course order (ld_course_steps)' },
  { id: 'co-time', page: 'courses', title: 'Time per lesson', question: 'Which lessons take longest?', badges: ['today'], todayMode: 'full', source: 'Uncanny Toolkit Pro timer, uo_timer_<course>_<step> (total seconds, no dates)', caveat: 'No dates: the period filter does not apply. Runs only if the timer module is on (setting, confirm).' },
  { id: 'co-timeweek', page: 'courses', title: 'Learning time per week', question: 'Is time spent learning going up?', badges: ['track'], todayMode: 'locked', unlock: 'Time on page, per day', source: 'Browser heartbeat + time-on-page totals per day' },
  { id: 'co-risk', page: 'courses', title: 'Learners at risk', question: 'Who should we contact before they leave?', badges: ['today'], todayMode: 'full', source: 'LearnDash activity dates + risk rule', caveat: 'Uses pseudonymous IDs; contacting a learner happens in WordPress.' },

  // ---------------- quizzes
  { id: 'qz-table', page: 'quizzes', title: 'Quizzes', question: 'How does each quiz perform?', badges: ['today'], todayMode: 'full', source: 'Quiz activity rows + meta: score, percentage, pass, timespent' },
  { id: 'qz-attempts', page: 'quizzes', title: 'Attempts needed to pass', question: 'Are quizzes a barrier?', badges: ['today'], todayMode: 'full', source: 'Quiz attempts per learner and quiz' },
  { id: 'qz-scores', page: 'quizzes', title: 'First-attempt scores', question: 'Is the pass mark in the right place?', badges: ['today'], todayMode: 'full', source: 'Quiz attempts (percentage)' },
  { id: 'qz-types', page: 'quizzes', title: 'Question types compared', question: 'Which question types are worth building more of?', badges: ['today'], todayMode: 'full', source: 'pro_quiz_question.answer_type + pro_quiz_statistic', caveat: 'Only quizzes with statistics on.' },
  { id: 'qz-map', page: 'quizzes', title: 'Question map', question: 'Which questions to keep, fix or drop?', badges: ['today'], todayMode: 'full', source: 'pro_quiz_statistic per question per attempt', caveat: 'Only quizzes with statistics on.' },
  { id: 'qz-review', page: 'quizzes', title: 'Questions to review', question: 'What exactly should authors fix?', badges: ['today'], todayMode: 'full', source: 'pro_quiz_statistic incl. answer_data (answer given)', caveat: 'Essay questions are graded later and change results.' },

  // ---------------- materials
  { id: 'mt-uses', page: 'materials', title: 'Resource uses', question: 'How much are materials used?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Anonymous views + downloads.', source: 'Post Views Counter, Download Manager; later resource events' },
  { id: 'mt-learners', page: 'materials', title: 'Learners using materials', question: 'How many learners use materials?', badges: ['track'], todayMode: 'locked', unlock: 'Per-learner resource events', source: 'Resource events (logged-in learners)' },
  { id: 'mt-downloads', page: 'materials', title: 'Downloads', question: 'What gets taken away?', badges: ['today'], todayMode: 'full', source: 'ahm_download_stats' },
  { id: 'mt-videofinish', page: 'materials', title: 'Videos watched to the end', question: 'Are videos finished?', badges: ['track'], todayMode: 'locked', unlock: 'Video player events', source: 'Player events: started, past halfway, finished' },
  { id: 'mt-bytype', page: 'materials', title: 'Uses per month by format', question: 'Which formats are used?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Anonymous views + downloads; segment filters do not apply.', source: 'Post Views Counter, Download Manager; later resource events' },
  { id: 'mt-top', page: 'materials', title: 'Most used materials', question: 'Which materials draw learners?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Views and downloads only.', source: 'As above; recommendation share from row 30' },
  { id: 'mt-grid', page: 'materials', title: 'Use by learning area and format', question: 'Which formats work in which area?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Anonymous views + downloads.', source: 'As above + taxonomies' },
  { id: 'mt-visitors', page: 'materials', title: 'Downloads: learners and visitors', question: 'Who uses the open materials?', badges: ['today'], todayMode: 'full', source: 'ahm_download_stats.uid (0 = visitor)', caveat: 'Bots are not filtered by Download Manager.' },
  { id: 'mt-device', page: 'materials', title: 'Device used', question: 'Do learners study on phones?', badges: ['track'], todayMode: 'locked', unlock: 'Page context in the new tracker', source: 'Tracker page context (device class)' },
  { id: 'mt-video', page: 'materials', title: 'Video watching', question: 'Are videos watched to the end?', badges: ['track'], todayMode: 'locked', unlock: 'Video player events', source: 'Player events (HTML5 + one embedded player)' },
  { id: 'mt-videocurve', page: 'materials', title: 'Where viewers stop inside a video', question: 'At which point do viewers leave?', badges: ['track'], todayMode: 'locked', unlock: 'Video progress every 10%', source: 'Player progress milestones' },

  // ---------------- gaps
  { id: 'gp-demand', page: 'gaps', title: 'Wanted vs available, by topic', question: 'Which topics are wanted by many but have few materials?', badges: ['today'], todayMode: 'full', source: 'Profile interests (topic term IDs) + topic tags on courses and resources', caveat: 'Interests have no history; PT and EN topic entries must be mapped to one list.' },
  { id: 'gp-lang', page: 'gaps', title: 'Learners vs content, by language', question: 'Are learners served in their language?', badges: ['today'], todayMode: 'full', source: 'Profile language + akflanguages + WPML' },
  { id: 'gp-format', page: 'gaps', title: 'Formats per topic', question: 'Which formats are missing for each topic?', badges: ['today'], todayMode: 'full', source: 'Resource post types + topic taxonomy' },
  { id: 'gp-improve', page: 'gaps', title: 'Content to improve', question: 'Which existing items need work?', badges: ['today', 'survey'], todayMode: 'partial', todayNote: 'Satisfaction signals need the survey.', source: 'Course, lesson, quiz and survey views' },

  // ---------------- learners
  { id: 'ln-registered', page: 'learners', title: 'Registered learners', question: 'How many learners are there?', badges: ['today'], todayMode: 'full', source: 'wp_users' },
  { id: 'ln-enrolled', page: 'learners', title: 'Enrolled in a course', question: 'How many start learning?', badges: ['today'], todayMode: 'full', source: 'wp_users + LearnDash' },
  { id: 'ln-never', page: 'learners', title: 'Registered, never enrolled', question: 'How many sign up and never start?', badges: ['today'], todayMode: 'full', source: 'wp_users + LearnDash' },
  { id: 'ln-monthly', page: 'learners', title: 'Registrations per month', question: 'How fast is the academy growing?', badges: ['today'], todayMode: 'full', source: 'wp_users.user_registered' },
  { id: 'ln-mix', page: 'learners', title: 'Who the learners are', question: 'What is the profile mix?', badges: ['today'], todayMode: 'full', source: 'Profile Builder fields in wp_usermeta', caveat: 'Stored as PT or EN text; mapped to one code list.' },
  { id: 'ln-segment', page: 'learners', title: 'Completion rate by group', question: 'Which groups finish their courses?', badges: ['today'], todayMode: 'full', source: 'Profile + LearnDash' },
  { id: 'ln-cohort', page: 'learners', title: 'Do learners come back?', question: 'How many in each cohort are still learning?', badges: ['today', 'track'], todayMode: 'partial', todayNote: 'Learning activity only.', source: 'user_registered + LearnDash activity dates' },
  { id: 'ln-org', page: 'learners', title: 'Learners by organisation', question: 'Which organisations take part?', badges: ['profile'], todayMode: 'locked', unlock: 'Organisation field on registration and profile', source: 'New organisation field (managed list)' },

  // ---------------- recommendations
  { id: 'rc-match', page: 'recommendations', title: 'Enrolments matching interests', question: 'Do learners take courses that match their interests?', badges: ['today'], todayMode: 'full', source: 'Profile interests + course topics' },
  { id: 'rc-matchcompletion', page: 'recommendations', title: 'Completion: matched vs not matched', question: 'Does matching interests help learners finish?', badges: ['today'], todayMode: 'full', source: 'As above + LearnDash completions' },
  { id: 'rc-carousel', page: 'recommendations', title: 'Carousel performance', question: 'Which "Recommended for you" carousels work?', badges: ['track'], todayMode: 'locked', unlock: 'Recommendation shown and clicked events', source: 'Shown / clicked events, six Bricks carousels' },
  { id: 'rc-position', page: 'recommendations', title: 'Clicks by position', question: 'Do learners look past the first items?', badges: ['track'], todayMode: 'locked', unlock: 'Recommendation shown and clicked events', source: 'Shown / clicked events with position' },
  { id: 'rc-attribution', page: 'recommendations', title: 'Recommended vs found otherwise', question: 'Are recommended courses finished more often?', badges: ['track'], todayMode: 'locked', unlock: 'Click-to-enrolment attribution', source: 'Attribution on row 30' },
  { id: 'rc-relevance', page: 'recommendations', title: 'Perceived relevance', question: 'Do learners find their courses relevant?', badges: ['survey'], todayMode: 'locked', unlock: 'Relevance question in the course survey', source: 'Course survey' },

  // ---------------- feedback
  { id: 'fb-avg', page: 'feedback', title: 'Average satisfaction', question: 'How satisfied are learners?', badges: ['survey'], todayMode: 'locked', unlock: 'Course survey at completion', source: 'Survey answers' },
  { id: 'fb-rate', page: 'feedback', title: 'Response rate', question: 'Can the results be trusted?', badges: ['survey'], todayMode: 'locked', unlock: 'Survey send log', source: 'Send and reminder logs' },
  { id: 'fb-grid', page: 'feedback', title: 'Satisfaction by course and aspect', question: 'Which courses and aspects score low?', badges: ['survey'], todayMode: 'locked', unlock: 'Course survey at completion', source: 'Survey answers (four aspects, 1-5)' },
  { id: 'fb-funnel', page: 'feedback', title: 'Survey responses', question: 'How many answer, and does the reminder help?', badges: ['survey'], todayMode: 'locked', unlock: 'Survey send and reminder logs', source: 'Send and reminder logs' },
  { id: 'fb-trend', page: 'feedback', title: 'Satisfaction over time', question: 'Is it getting better?', badges: ['survey'], todayMode: 'locked', unlock: 'Course survey at completion', source: 'Survey answers' },
  { id: 'fb-comments', page: 'feedback', title: 'Latest comments', question: 'What do learners say in their own words?', badges: ['survey'], todayMode: 'locked', unlock: 'Course survey at completion', source: 'Survey answers (open comment)' },
  { id: 'fb-reviews', page: 'feedback', title: 'Course Reviews (built into LearnDash)', question: 'Star ratings possible today', badges: ['today'], todayMode: 'full', source: 'wp_comments, comment_type ld_review + rating', caveat: 'Only if Course Reviews are switched on per course (setting, confirm).' },

  // ---------------- impact
  { id: 'im-waves', page: 'impact', title: 'Practice indicators over time', question: 'Does practice change after the course?', badges: ['survey'], todayMode: 'locked', unlock: 'Completion survey and 6- and 12-month follow-ups', source: 'Completion survey + follow-ups' },
  { id: 'im-rate', page: 'impact', title: 'Follow-up response rate', question: 'How reliable is the follow-up?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-up send log', source: 'Send log per wave' },
  { id: 'im-segment', page: 'impact', title: 'Change by group', question: 'Where is the impact largest?', badges: ['survey'], todayMode: 'locked', unlock: 'Follow-ups + profile', source: 'Follow-ups + profile' },
  { id: 'im-org', page: 'impact', title: 'Change by organisation', question: 'Are organisations changing how they work?', badges: ['survey', 'profile'], todayMode: 'locked', unlock: 'Follow-ups + organisation field', source: 'Follow-ups + organisation field' },

  // ---------------- communities
  { id: 'cp-members', page: 'communities', title: 'Members', question: 'How many learners are in a community?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app memberships' },
  { id: 'cp-active', page: 'communities', title: 'Active members', question: 'How many take part?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app posts and replies' },
  { id: 'cp-posts', page: 'communities', title: 'Posts and replies', question: 'How much discussion is there?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app posts and replies' },
  { id: 'cp-firstreply', page: 'communities', title: 'Time to first reply', question: 'Do questions get answered quickly?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app thread timestamps' },
  { id: 'cp-communities', page: 'communities', title: 'Members and active members by community', question: 'Which communities are alive?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app' },
  { id: 'cp-monthly', page: 'communities', title: 'Discussion per month', question: 'Is participation growing?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app' },
  { id: 'cp-peer', page: 'communities', title: 'Peer replies', question: 'Is it peer learning or moderator-led?', badges: ['cop'], todayMode: 'locked', unlock: 'Connection to the CoP app', source: 'CoP app replies by author role' },
  { id: 'cp-moderation', page: 'communities', title: 'Moderation: AI and people', question: 'How much moderation does the AI take on?', badges: ['cop'], todayMode: 'locked', unlock: 'CoP moderation log', source: 'CoP app moderation log', caveat: 'Only if the CoP app logs AI actions.' },
  { id: 'cp-belonging', page: 'communities', title: 'Belonging and peer support', question: 'Do members feel part of it?', badges: ['survey', 'cop'], todayMode: 'locked', unlock: 'Community member survey', source: 'Member survey' },
  { id: 'cp-completion', page: 'communities', title: 'Course completion: members and others', question: 'Do community members learn more?', badges: ['cop', 'today'], todayMode: 'locked', unlock: 'Linked CoP and platform accounts', source: 'CoP memberships + LearnDash, linked accounts', caveat: 'Association, not cause.' },
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
