// Generates the whole invented dataset once, with a fixed seed.
// Shapes follow the real schema (see the data catalogue): LearnDash enrolments, lesson
// completions and quiz attempts with per-question results, Download Manager downloads,
// Post Views Counter anonymous counts, and the proposed new capture (resource events,
// video progress, recommendation events, surveys, CoP data).

import { Rng, sigmoid, clamp } from '../lib/rng';
import { TODAY, monthIndexOfDay, MONTH_COUNT, monthStartDay } from '../lib/time';
import {
  TOPICS,
  RES_TYPES,
  QTYPES,
  OCCUPATIONS,
  WORK_AREAS,
  AGE_GROUPS,
  GENDERS,
  NOT_ANSWERED,
  ORGANISATIONS,
  INSTITUTIONS,
  INST_TYPES,
  TERRITORIES,
  EXPERIENCE,
  EDUCATION,
  FOUND_VIA,
  DEVICES,
  CAROUSELS,
  COMMUNITIES,
  QUESTION_GROUPS,
  UNMATCHED_TOPICS,
  L5_METHODS,
  L5_INDICATORS,
  TOPICS as TOPIC_LIST,
  type ContentLang,
  type ResType,
  type QType,
} from './taxonomy';

// ---------------------------------------------------------------- types

export interface Lesson {
  id: number;
  courseId: number;
  idx: number;
  title: string;
  continueProb: number;
  minutes: number;
  videoMinutes: number;
  videoHook: number;
  quizId: number;
}

export interface Course {
  id: number;
  title: string;
  lang: ContentLang;
  areaId: number;
  topicIds: number[];
  popularity: number;
  lessonIds: number[];
  aspectBase: number[];
}

export interface Quiz {
  id: number;
  courseId: number;
  lessonId: number;
  title: string;
  passMark: number;
  statsOn: boolean;
  questionIds: number[];
}

export interface Question {
  id: number;
  quizId: number;
  courseId: number;
  lessonId: number;
  type: QType;
  text: string;
  a: number;
  b: number;
  /** type-level ease: higher = easier for everyone */
  c: number;
  wrongAnswer: string;
  why?: string;
}

export interface Resource {
  id: number;
  title: string;
  type: ResType;
  areaId: number;
  topicId: number;
  lang: ContentLang;
  appeal: number;
  durationMin: number;
  hook: number;
}

export interface Learner {
  id: number;
  code: string;
  regDay: number;
  occupation: string;
  workArea: string;
  ageGroup: string;
  gender: string;
  prefLang: ContentLang;
  interests: number[];
  org: string;
  /** Level 1 proposed fields */
  instType: string;
  district: string;
  municipality: string;
  experience: string;
  education: string;
  foundVia: string;
  /** starting-point confidence 1-5, or 0 when not answered */
  baseline: number;
  consentEval: boolean;
  consentRecontact: boolean;
  consentAI: boolean;
  /** registered right after the registration gate was shown */
  viaGate: boolean;
  device: string;
  motivation: number;
  ability: number;
  communities: number[];
  copJoinMonth: number;
  /** last day this learner is active on the platform (churn) */
  activeUntil: number;
}

export interface Enrolment {
  id: number;
  learnerId: number;
  courseId: number;
  day: number;
  matched: boolean;
  viaRec: boolean;
  started: boolean;
  lessonsDone: number;
  lessonDays: number[];
  completedDay: number | null;
  lastActivityDay: number;
  timerMin: number[];
}

export interface QuizAttempt {
  learnerId: number;
  quizId: number;
  courseId: number;
  day: number;
  attemptNo: number;
  correct: boolean[];
  scorePct: number;
  passed: boolean;
  timeSec: number;
}

export type ResKind = 'view' | 'download' | 'play';
export type ResSource = 'Recommendation' | 'Search' | 'Course link' | 'Browsing';

export interface ResourceEvent {
  learnerId: number;
  resourceId: number;
  day: number;
  kind: ResKind;
  watched: number;
  source: ResSource;
  device: string;
}

export interface AnonMonth {
  resourceId: number;
  month: number;
  /** MonsterInsights page views, everyone who accepts analytics cookies */
  views: number;
  /** the part of those views by visitors without an account */
  visitorViews: number;
  visitorDownloads: number;
}

export interface LessonVideo {
  learnerId: number;
  courseId: number;
  lessonId: number;
  day: number;
  watched: number;
}

export interface RecStat {
  learnerId: number;
  carousel: number;
  month: number;
  shown: number;
  clicks: number[];
}

export interface SurveyResponse {
  enrolmentId: number;
  learnerId: number;
  courseId: number;
  sentDay: number;
  reminded: boolean;
  answered: boolean;
  answerDay: number;
  /** Quality, Fits my work, Increased my understanding (1-5) */
  scores: number[];
  /** "What will you try to apply in your work?" */
  plan: string | null;
  /** "What is missing, or what would you change?" */
  comment: string | null;
}

export interface CourseReview {
  learnerId: number;
  courseId: number;
  day: number;
  stars: number;
}

/** Level 4 follow-up, one row per eligible learner, course and wave (0 = +6 months, 1 = +12 months) */
export interface FollowUp {
  learnerId: number;
  courseId: number;
  enrolmentId: number;
  wave: 0 | 1;
  sentDay: number;
  consented: boolean;
  contacted: boolean;
  answered: boolean;
  /** index into USE_LEVELS: often, sometimes, not yet, no */
  use: number;
  outcomes: Partial<Record<'tried' | 'shared' | 'still' | 'orgChange' | 'community', boolean>>;
  confBefore: number;
  confNow: number;
  barriers: number[];
  copContacts: boolean | null;
  volunteer: boolean;
  changeText: string | null;
}

export interface TutorConv {
  learnerId: number;
  day: number;
  mode: 'Text' | 'Voice';
  minutes: number;
  /** index into QUESTION_GROUPS; -1 when the learner did not consent to AI analysis */
  group: number;
  lessonId: number | null;
  /** index into UNMATCHED_TOPICS when no resource matched, else -1 */
  unmatched: number;
  /** 1 thumbs up, -1 thumbs down, 0 no rating */
  thumbs: number;
}

export interface PlatformSurvey {
  learnerId: number;
  wave: number;
  month: number;
  answered: boolean;
  items: Partial<Record<string, number>>;
  nps: number;
  /** index into MODE_PREFS */
  modePref: number;
}

export interface ResFeedback {
  learnerId: number;
  resourceId: number;
  day: number;
  /** 0 yes, 1 partly, 2 no */
  answer: number;
}

export interface SearchEvent {
  learnerId: number;
  day: number;
  term: string;
  results: number;
  /** filter used with the search, or null */
  filter: 'Format' | 'Learning area' | 'Language' | null;
  unmatched: number;
}

export interface GateMonth {
  month: number;
  shown: number;
}

export interface TrafficMonth {
  month: number;
  channels: Record<string, number>;
  devices: Record<string, number>;
  regions: Record<string, number>;
  referrers: Record<string, number>;
  newUsers: number;
  returningUsers: number;
  engagedRate: number;
}

export interface L5Activity {
  id: number;
  day: number;
  method: string;
  areaId: number;
  municipality: string;
  participants: number;
  roles: string[];
  instTypes: string[];
  themes: string[];
  quote: string;
  /** observed level per L5 indicator, 1-4, or 0 when not covered */
  ratings: number[];
  /** does the activity describe practice change in line with the learners' reports? */
  observedChange: number;
}

export interface CopCoCreated {
  communityId: number;
  month: number;
  started: number;
  completed: number;
}

export interface BadgeEarned {
  learnerId: number;
  badge: string;
  day: number;
}

export interface CopMemberMonth {
  learnerId: number;
  communityId: number;
  month: number;
  posts: number;
  replies: number;
}

export interface CopCommunityMonth {
  communityId: number;
  month: number;
  moderatorReplies: number;
  firstReplyHours: number;
  modPerson: number;
  modAi: number;
}

export interface CopSurvey {
  learnerId: number;
  communityId: number;
  belonging: number;
  peerSupport: number;
}

export interface Dataset {
  courses: Course[];
  lessons: Lesson[];
  quizzes: Quiz[];
  questions: Question[];
  resources: Resource[];
  learners: Learner[];
  enrolments: Enrolment[];
  attempts: QuizAttempt[];
  resEvents: ResourceEvent[];
  anon: AnonMonth[];
  lessonVideos: LessonVideo[];
  recStats: RecStat[];
  surveys: SurveyResponse[];
  reviews: CourseReview[];
  followUps: FollowUp[];
  copMemberMonths: CopMemberMonth[];
  copCommunityMonths: CopCommunityMonth[];
  copSurveys: CopSurvey[];
  copCoCreated: CopCoCreated[];
  tutorConvs: TutorConv[];
  platformSurveys: PlatformSurvey[];
  resFeedback: ResFeedback[];
  searches: SearchEvent[];
  gateMonths: GateMonth[];
  traffic: TrafficMonth[];
  l5: L5Activity[];
  badges: BadgeEarned[];
  /** courses the D&I team selected for the +6 and +12 month follow-ups */
  followUpCourses: number[][];
  /** learning-activity days per learner: today = LearnDash + downloads; proposed adds tracked views and plays */
  activityToday: number[][];
  activityProposed: number[][];
}

export const COP_LAUNCH_MONTH = 8; // Jan 2026
export const AI_MODERATION_MONTH = 11; // Apr 2026
export const TUTOR_LAUNCH_MONTH = 7; // Dec 2025
export const GATE_MONTH = 12; // May 2026
export const PLATFORM_SURVEY_MONTHS = [7, 13]; // Dec 2025, Jun 2026
export const FOLLOWUP_6M = [0, 1, 2, 3, 4, 5, 7, 8, 10, 11];
export const FOLLOWUP_12M = [0, 2, 4, 7, 10, 11];
export const BADGES = ['First course completed', 'Three courses completed', 'Quiz ace', 'Curious mind', 'Persistent learner', 'Fast finisher'] as const;

// ---------------------------------------------------------------- catalogue specs

interface CourseSpec {
  title: string;
  lang: ContentLang;
  area: number;
  topics: number[];
  popularity: number;
  lessons: string[];
  dips?: Record<number, number>;
  aspects: number[];
}

const COURSE_SPECS: CourseSpec[] = [
  {
    title: 'Diagnóstico Participativo de Comunidades',
    lang: 'Portuguese',
    area: 0,
    topics: [0, 1],
    popularity: 1.35,
    lessons: [
      'Porquê um diagnóstico participativo',
      'Mapear atores e recursos',
      'Técnicas de auscultação',
      'Analisar e priorizar',
      'Devolver resultados à comunidade',
    ],
    aspects: [4.2, 4.4, 4.2],
  },
  {
    title: 'Building Local Partnerships',
    lang: 'English',
    area: 0,
    topics: [2, 1],
    popularity: 0.75,
    lessons: ['Why partnerships matter', 'Mapping potential partners', 'Agreements and roles', 'Keeping partnerships alive'],
    aspects: [4.1, 3.9, 3.9],
  },
  {
    title: 'Parentalidade Positiva',
    lang: 'Portuguese',
    area: 1,
    topics: [3],
    popularity: 1.45,
    lessons: [
      'O que é a parentalidade positiva',
      'Compreender o comportamento',
      'Rotinas e limites',
      'Gerir conflitos sem castigos',
      'Comunicar com afeto',
      'Apoiar famílias em contexto comunitário',
    ],
    aspects: [4.4, 4.6, 4.5],
  },
  {
    title: 'Early Learning at Home',
    lang: 'English',
    area: 1,
    topics: [4, 3],
    popularity: 0.85,
    lessons: ['How young children learn', 'Play as learning', 'Early literacy', 'Working with parents', 'Simple materials at home'],
    aspects: [4.3, 4.0, 4.2],
  },
  {
    title: 'Proteção de Crianças e Jovens',
    lang: 'Portuguese',
    area: 1,
    topics: [5],
    popularity: 1.0,
    lessons: [
      'Direitos da criança',
      'Sinais de risco',
      'O papel de cada profissional',
      'Sinalizar uma situação de perigo',
      'Trabalho em rede',
      'Prevenção na comunidade',
    ],
    dips: { 3: 0.7 },
    aspects: [3.4, 4.3, 4.0],
  },
  {
    title: 'Youth Participation in Practice',
    lang: 'English',
    area: 2,
    topics: [7],
    popularity: 0.9,
    lessons: ['What participation means', 'Levels of participation', 'Youth-led projects', 'Facilitation skills', 'Measuring participation'],
    aspects: [4.0, 4.2, 4.1],
  },
  {
    title: 'Educação Não Formal',
    lang: 'Portuguese',
    area: 2,
    topics: [8, 6],
    popularity: 0.8,
    lessons: ['Princípios da educação não formal', 'Desenhar uma sessão', 'Métodos ativos', 'Avaliar aprendizagens'],
    aspects: [4.2, 4.1, 4.2],
  },
  {
    title: 'Competências para a Empregabilidade',
    lang: 'Portuguese',
    area: 3,
    topics: [9],
    popularity: 1.15,
    lessons: [
      'O mercado de trabalho hoje',
      'Competências transversais',
      'Procurar emprego',
      'A entrevista',
      'Acompanhar candidatos',
    ],
    aspects: [3.9, 4.1, 4.1],
  },
  {
    title: 'Social Entrepreneurship Basics',
    lang: 'English',
    area: 3,
    topics: [10, 11],
    popularity: 0.9,
    lessons: [
      'What is a social enterprise',
      'Business models with impact',
      'Testing an idea',
      'Money matters',
      'Measuring social value',
      'Pitching your project',
    ],
    dips: { 1: 0.72 },
    aspects: [3.8, 4.0, 3.8],
  },
  {
    title: 'Envelhecimento Ativo e Comunidade',
    lang: 'Portuguese',
    area: 4,
    topics: [12, 14],
    popularity: 0.8,
    lessons: ['Envelhecer hoje', 'Participação e autonomia', 'Projetos intergeracionais', 'Redes de apoio'],
    aspects: [4.3, 4.2, 4.2],
  },
  {
    title: 'Project Management for NGOs',
    lang: 'English',
    area: 5,
    topics: [15],
    popularity: 1.0,
    lessons: ['Project basics', 'Planning the work', 'Budgets', 'Schedules and the critical path', 'Managing risk', 'Closing a project'],
    aspects: [4.0, 3.3, 4.0],
  },
  {
    title: 'Monitorização e Avaliação de Projetos',
    lang: 'Portuguese',
    area: 5,
    topics: [16, 15],
    popularity: 1.25,
    lessons: [
      'Para que serve a M&A',
      'Teoria da mudança',
      'Indicadores e níveis de resultado',
      'Recolher dados',
      'Analisar e reportar',
      'Usar os resultados',
    ],
    dips: { 2: 0.66 },
    aspects: [3.9, 4.4, 3.6],
  },
  {
    title: 'Mediação Intercultural na Prática',
    lang: 'Portuguese',
    area: 6,
    topics: [18, 19],
    popularity: 0.85,
    lessons: ['Cultura, identidade e preconceito', 'O papel do mediador', 'Comunicar com intérpretes', 'Mediar conflitos na comunidade'],
    aspects: [4.2, 4.3, 4.1],
  },
];

interface SpecialQ {
  course: number;
  lesson: number;
  type: QType;
  text: string;
  wrong: string;
  a: number;
  b: number;
  why: string;
}

const SPECIAL_QUESTIONS: SpecialQ[] = [
  {
    course: 11,
    lesson: 2,
    type: 'Matrix sorting',
    text: 'Associe cada indicador ao seu nível: realização, resultado ou impacto.',
    wrong: 'N.º de workshops realizados -> resultado',
    a: -0.5,
    b: 0.9,
    why: 'Strong learners miss it as often as weak ones. The levels are taught after this quiz.',
  },
  {
    course: 11,
    lesson: 2,
    type: 'Free text',
    text: 'Como se chama a ferramenta que liga atividades, realizações e resultados?',
    wrong: 'quadro lógico',
    a: -0.15,
    b: 1.5,
    why: 'Exact-match free text: the key is "matriz de enquadramento lógico", so correct synonyms are marked wrong.',
  },
  {
    course: 11,
    lesson: 2,
    type: 'Single choice',
    text: 'Qual destes é um indicador de resultado?',
    wrong: 'N.º de participantes inscritos',
    a: 2.6,
    b: 1.1,
    why: 'Hard but fair: it separates strong and weak learners well. Keep it, teach the idea better.',
  },
  {
    course: 8,
    lesson: 1,
    type: 'Free text',
    text: 'What do we call the income a social enterprise earns from selling goods or services?',
    wrong: 'revenue',
    a: -0.2,
    b: 1.3,
    why: 'Exact-match free text: the key is "earned income", so "revenue" and "sales income" are marked wrong.',
  },
  {
    course: 8,
    lesson: 1,
    type: 'Multiple choice',
    text: 'Which are features of a social enterprise? Choose all that apply.',
    wrong: 'Profits are paid out to shareholders',
    a: 0.45,
    b: 1.0,
    why: 'All-or-nothing scoring: one missed option fails the whole question.',
  },
  {
    course: 4,
    lesson: 3,
    type: 'Sorting',
    text: 'Ordene os passos de uma sinalização de perigo para a criança.',
    wrong: 'Informar a família antes de registar a situação',
    a: 0.3,
    b: 1.1,
    why: 'Learners split on one step. Check the order against current guidance.',
  },
  {
    course: 2,
    lesson: 1,
    type: 'Single choice',
    text: 'Qual a melhor resposta a uma birra de uma criança pequena?',
    wrong: 'Ignorar a criança até parar',
    a: -0.8,
    b: 0.2,
    why: 'Strong learners pick "planned ignoring", which lesson 4 teaches. The answer key conflicts with the course.',
  },
  {
    course: 0,
    lesson: 2,
    type: 'Matrix sorting',
    text: 'Associe cada técnica de auscultação ao seu objetivo.',
    wrong: 'Grupo focal -> quantificar necessidades',
    a: 0.2,
    b: 0.8,
    why: 'Low discrimination: eight pairs to match for one point. Split it or use fewer pairs.',
  },
  {
    course: 10,
    lesson: 3,
    type: 'Single choice',
    text: 'What does the critical path show?',
    wrong: 'The most expensive tasks',
    a: 2.8,
    b: 0.5,
    why: 'Working well: hard enough and clearly separates strong learners.',
  },
  {
    course: 7,
    lesson: 2,
    type: 'Single choice',
    text: 'Para que serve um CV?',
    wrong: 'Listar todos os empregos que já teve',
    a: 0.4,
    b: -2.8,
    why: 'Almost everyone gets it right, so it does not test anything. Replace with an applied question.',
  },
  {
    course: 5,
    lesson: 1,
    type: 'Multiple choice',
    text: 'Which practices count as genuine youth participation?',
    wrong: 'Young people attend a meeting planned by adults',
    a: -0.4,
    b: 0.5,
    why: 'Strong learners answer it worse than weak ones. The wording of one option is ambiguous.',
  },
];

const STEMS_EN: Record<QType, string[]> = {
  'Single choice': ['Which statement about "{L}" is correct?', 'What is the main purpose of "{L}"?'],
  'Multiple choice': ['Which of these apply to "{L}"? Choose all that apply.'],
  'Fill in the blank': ['Complete the sentence about "{L}".'],
  Sorting: ['Put the steps of "{L}" in the right order.'],
  'Matrix sorting': ['Match each item to its role in "{L}".'],
  'Free text': ['In a few words, name the key idea of "{L}".'],
  Essay: ['Describe how you would apply "{L}" in your work.'],
};

const STEMS_PT: Record<QType, string[]> = {
  'Single choice': ['Qual a afirmação correta sobre "{L}"?', 'Qual o principal objetivo de "{L}"?'],
  'Multiple choice': ['Quais destas opções se aplicam a "{L}"? Escolha todas as corretas.'],
  'Fill in the blank': ['Complete a frase sobre "{L}".'],
  Sorting: ['Ordene os passos de "{L}".'],
  'Matrix sorting': ['Associe cada elemento ao seu papel em "{L}".'],
  'Free text': ['Em poucas palavras, indique a ideia-chave de "{L}".'],
  Essay: ['Descreva como aplicaria "{L}" no seu trabalho.'],
};

const WRONG_EN = ['A step from a later lesson', 'An option that is only partly true', 'The answer from the previous lesson'];
const WRONG_PT = ['Um passo de uma lição posterior', 'Uma opção só parcialmente verdadeira', 'A resposta da lição anterior'];

const QTYPE_PARAMS: Record<QType, { w: number; a: number; b: number; c: number }> = {
  'Single choice': { w: 34, a: 2.0, b: 0, c: 2.3 },
  'Multiple choice': { w: 20, a: 1.6, b: 0, c: 1.4 },
  'Fill in the blank': { w: 13, a: 2.4, b: 0, c: 1.8 },
  Sorting: { w: 10, a: 1.5, b: 0, c: 1.5 },
  'Matrix sorting': { w: 7, a: 0.7, b: 0, c: 0.9 },
  'Free text': { w: 8, a: 0.3, b: 0, c: 0.45 },
  Essay: { w: 8, a: 1.3, b: 0, c: 2.0 },
};

const TOPIC_PT: string[] = [
  'Diagnóstico participativo',
  'Mobilização comunitária',
  'Parcerias locais',
  'Apoio à parentalidade',
  'Aprendizagem na primeira infância',
  'Proteção de crianças',
  'Envolvimento escolar',
  'Participação juvenil',
  'Educação não formal',
  'Competências de empregabilidade',
  'Empreendedorismo social',
  'Literacia financeira',
  'Envelhecimento ativo',
  'Apoio a cuidadores',
  'Projetos intergeracionais',
  'Gestão de projetos',
  'Monitorização e avaliação',
  'Angariação de fundos e governação',
  'Mediação intercultural',
  'Integração de migrantes',
];

/** designed supply per topic: number of resources tagged with it */
const TOPIC_SUPPLY = [10, 8, 6, 11, 8, 7, 5, 7, 6, 9, 6, 4, 7, 2, 4, 8, 3, 3, 4, 3];

const RES_TYPE_WEIGHTS = [34, 20, 12, 9, 15, 10];

const RES_TITLE_EN: Record<ResType, string[]> = {
  Document: ['{T}: a practical guide', '{T}: case study', '{T} toolkit', '{T}: key concepts'],
  'Instructional video': ['{T} explained', 'How to: {T}'],
  Podcast: ['Voices of practice: {T}', 'Talking {T}'],
  '360 video': ['Inside a {T} session (360°)'],
  Microlearning: ['{T} in 5 minutes', '{T}: quick start'],
  'Download package': ['{T} templates pack', '{T} session materials'],
};

const RES_TITLE_PT: Record<ResType, string[]> = {
  Document: ['{T}: guia prático', '{T}: estudo de caso', 'Kit de ferramentas: {T}', '{T}: conceitos-chave'],
  'Instructional video': ['Vídeo explicativo: {T}', 'Como fazer: {T}'],
  Podcast: ['Vozes da prática: {T}', 'Conversas sobre {T}'],
  '360 video': ['Por dentro de uma sessão (360°): {T}'],
  Microlearning: ['{T} em 5 minutos', '{T}: primeiros passos'],
  'Download package': ['Pacote de modelos: {T}', 'Materiais de sessão: {T}'],
};

const COMMENTS: Record<string, string[]> = {
  positive: [
    'Nothing missing, the examples from real projects were enough.',
    'Gostei muito dos exemplos práticos.',
    'The videos were short and easy to follow.',
    'Good balance between theory and practice.',
  ],
  Quality: [
    'Lesson 4 felt out of order, I needed it earlier.',
    'Some videos have poor sound.',
    'A ordem das lições não é clara.',
    'O PDF tem erros de formatação.',
  ],
  'Fits my work': ['Interesting, but not close to my daily work.', 'Mais exemplos do contexto português, por favor.', 'Too much theory, not enough practice.'],
  'Increased my understanding': ['I knew most of this already.', 'Faltam exercícios práticos.', 'More depth on the methods, please.'],
};

/** "What will you try to apply in your work?" per learning area */
const PLANS: string[][] = [
  ['Run a short participatory mapping session with the families I follow.', 'Ask residents to rank the priorities before our next plan.'],
  ['Try the planned-ignoring approach with parents in my next home visit.', 'Use the routines checklist with two families.'],
  ['Use the session plan template with my youth group.', 'Let the young people choose the next project theme.'],
  ['Use the interview checklist with my candidates.', 'Test one income idea with the group before investing.'],
  ['Start a weekly check-in with the older people in our centre.', 'Pair a school class with our day centre.'],
  ['Set up three indicators for our food bank project.', 'Draw a theory of change with my team.'],
  ['Book an interpreter for the next family meeting.', 'Use the mediation steps in the next neighbour conflict.'],
];

/** "Describe one thing you now do differently in your work" per learning area */
const CHANGES: string[][] = [
  ['I now open every project with a short listening round in the neighbourhood.', 'We map local resources with residents before planning.'],
  ['My home visits now follow a clear routine with the parents.', 'I explain limits without punishment, and parents copy it.'],
  ['Young people now run part of our weekly session.', 'I plan sessions with active methods instead of talks.'],
  ['I prepare candidates for interviews with a checklist.', 'We tested a small catering idea with the group.'],
  ['We added an intergenerational activity every month.', 'Older people now help plan the centre activities.'],
  ['Our reports now show results, not only activities.', 'We review two indicators at every team meeting.'],
  ['We always ask families which language they prefer.', 'I mediate before conflicts reach the school.'],
];

/** Layer 5 themes and quotes per learning area (invented) */
const L5_THEMES: string[][] = [
  ['Residents more involved in planning', 'Better use of local partners', 'Time pressure limits change'],
  ['Families more involved in decisions', 'More structured home visits', 'Peer support between colleagues'],
  ['Young people take part in decisions', 'New group sessions started', 'Managers not yet aware of the training'],
  ['Managers not yet aware of the training', 'Tools not adapted to local context', 'Time pressure limits change'],
  ['Older people more involved in planning', 'New intergenerational activities', 'Peer support between colleagues'],
  ['Clearer indicators in project reports', 'Better use of local partners', 'Peer support between colleagues'],
  ['Families helped in their own language', 'Tools adapted to local context', 'Time pressure limits change'],
];
const L5_QUOTES: string[] = [
  'Since the course, the team asks residents first. It takes longer, but people come back. (coordinator, OSC)',
  'The home visits are more organised; parents know what to expect. (manager, municipal service)',
  'Two of our youth workers now let the group choose the activity. (coordinator, youth association)',
  'I did not notice a difference in how candidates are prepared. Nobody told me about the course. (manager, employment service)',
  'The day centre now plans activities with the older people, not for them. (director, IPSS)',
  'Project reports finally show results. Funders noticed. (director, foundation)',
  'Families now get an interpreter when they need one; that was rare before. (head teacher)',
];

// ---------------------------------------------------------------- generation
// ---------------------------------------------------------------- generation

export function generate(): Dataset {
  const rng = new Rng(20261117);

  // --- courses, lessons, quizzes, questions
  const courses: Course[] = [];
  const lessons: Lesson[] = [];
  const quizzes: Quiz[] = [];
  const questions: Question[] = [];

  COURSE_SPECS.forEach((spec, ci) => {
    const course: Course = {
      id: ci,
      title: spec.title,
      lang: spec.lang,
      areaId: spec.area,
      topicIds: spec.topics,
      popularity: spec.popularity,
      lessonIds: [],
      aspectBase: spec.aspects,
    };
    courses.push(course);
    spec.lessons.forEach((lt, li) => {
      const lessonId = lessons.length;
      const quizId = quizzes.length;
      const dip = spec.dips?.[li];
      lessons.push({
        id: lessonId,
        courseId: ci,
        idx: li,
        title: lt,
        continueProb: dip ?? clamp(rng.normal(0.95, 0.025), 0.88, 0.99),
        minutes: Math.round(clamp(rng.normal(32, 9), 14, 60)),
        videoMinutes: Math.round(clamp(rng.normal(9, 3), 4, 18)),
        videoHook: clamp(rng.normal(0.5, 0.13), 0.2, 0.8),
        quizId,
      });
      course.lessonIds.push(lessonId);
      const quiz: Quiz = {
        id: quizId,
        courseId: ci,
        lessonId,
        title: `Quiz ${li + 1}: ${lt}`,
        passMark: rng.chance(0.6) ? 70 : 80,
        statsOn: !(ci === 6 || (ci === 9 && li > 1) || (ci === 3 && li === 4)),
        questionIds: [],
      };
      quizzes.push(quiz);
      const nQ = rng.int(5, 8);
      const specials = SPECIAL_QUESTIONS.filter((s) => s.course === ci && s.lesson === li);
      const stems = spec.lang === 'Portuguese' ? STEMS_PT : STEMS_EN;
      const wrongs = spec.lang === 'Portuguese' ? WRONG_PT : WRONG_EN;
      for (let qi = 0; qi < nQ; qi++) {
        const sp = specials[qi];
        const qid = questions.length;
        if (sp) {
          questions.push({
            id: qid,
            quizId,
            courseId: ci,
            lessonId,
            type: sp.type,
            text: sp.text,
            a: sp.a,
            b: sp.b,
            c: sp.b < -2 ? 3.2 : sp.a > 2 ? 1.6 : 0.55,
            wrongAnswer: sp.wrong,
            why: sp.why,
          });
        } else {
          const type = rng.weighted(QTYPES, QTYPES.map((t) => QTYPE_PARAMS[t].w));
          const p = QTYPE_PARAMS[type];
          questions.push({
            id: qid,
            quizId,
            courseId: ci,
            lessonId,
            type,
            text: rng.pick(stems[type]).replace('{L}', lt),
            a: Math.max(0.2, rng.normal(p.a, 0.35)),
            b: rng.normal(p.b + (dip ? 0.45 : 0), 0.75),
            c: p.c,
            wrongAnswer: rng.pick(wrongs),
          });
        }
        quiz.questionIds.push(qid);
      }
    });
  });

  // --- resources
  const resources: Resource[] = [];
  const seenTitles = new Set<string>();
  TOPICS.forEach((topic, ti) => {
    for (let k = 0; k < TOPIC_SUPPLY[ti]; k++) {
      const type = rng.weighted(RES_TYPES, RES_TYPE_WEIGHTS);
      const lang: ContentLang = rng.chance(0.6) ? 'Portuguese' : 'English';
      const tpl = rng.pick(lang === 'Portuguese' ? RES_TITLE_PT[type] : RES_TITLE_EN[type]);
      let title = tpl.replace('{T}', lang === 'Portuguese' ? TOPIC_PT[ti] : topic.name);
      title = title.charAt(0).toUpperCase() + title.slice(1);
      let n = 2;
      const base = title;
      while (seenTitles.has(title)) title = `${base} (${n++})`;
      seenTitles.add(title);
      const durationMin =
        type === 'Instructional video'
          ? rng.int(4, 18)
          : type === 'Podcast'
            ? rng.int(15, 40)
            : type === '360 video'
              ? rng.int(3, 8)
              : type === 'Microlearning'
                ? 5
                : 0;
      resources.push({
        id: resources.length,
        title,
        type,
        areaId: topic.areaId,
        topicId: ti,
        lang,
        appeal: Math.exp(rng.normal(0, 0.55)),
        durationMin,
        hook: clamp(rng.normal(0.45, 0.15), 0.15, 0.85),
      });
    }
  });
  // a few items in other profile languages (most learners who choose them get nothing)
  const extraLang: [number, ContentLang, ResType][] = [
    [3, 'Nepali', 'Microlearning'],
    [9, 'Nepali', 'Microlearning'],
    [3, 'Bengali', 'Document'],
    [12, 'Bengali', 'Microlearning'],
    [9, 'Urdu', 'Document'],
  ];
  extraLang.forEach(([ti, lang, type]) => {
    const topic = TOPICS[ti];
    resources.push({
      id: resources.length,
      title: `${topic.name}${type === 'Microlearning' ? ' in 5 minutes' : ': a practical guide'} (${lang})`,
      type,
      areaId: topic.areaId,
      topicId: ti,
      lang,
      appeal: 0.9,
      durationMin: type === 'Microlearning' ? 5 : 0,
      hook: 0.55,
    });
  });

  // --- learners
  const N = 500;
  const learners: Learner[] = [];
  const occW = [18, 15, 14, 12, 8, 9, 10, 6];
  const waW = [24, 20, 10, 12, 18, 6, 6];
  const langs: ContentLang[] = ['Portuguese', 'English', 'Nepali', 'Bengali', 'Urdu', 'Mandarin'];
  const langW = [56, 28, 6, 4, 4, 2];
  const orgW = [14, 12, 12, 10, 9, 8, 8, 7, 6];
  for (let i = 0; i < N; i++) {
    let regDay: number;
    if (rng.chance(0.14)) regDay = rng.int(0, 45);
    else regDay = Math.floor(TODAY * Math.pow(rng.next(), 0.72));
    regDay = clamp(regDay, 0, TODAY);
    const occupation = rng.chance(0.12) ? NOT_ANSWERED : rng.weighted(OCCUPATIONS, occW);
    const workArea = rng.chance(0.16) ? NOT_ANSWERED : rng.weighted(WORK_AREAS, waW);
    const ageGroup = rng.chance(0.1) ? NOT_ANSWERED : rng.weighted(AGE_GROUPS, occupation === 'Student' ? [85, 15, 0] : [22, 70, 8]);
    const gender = rng.chance(0.09) ? NOT_ANSWERED : rng.weighted(GENDERS, [71, 27, 2]);
    const prefLang = rng.weighted(langs, langW);
    const nInt = rng.int(1, 4);
    const interests: number[] = [];
    while (interests.length < nInt) {
      const t = rng.weighted(TOPICS.map((x) => x.id), TOPICS.map((x) => x.demand));
      if (!interests.includes(t)) interests.push(t);
    }
    let motivation = Math.pow(rng.next(), 0.75);
    if (occupation === 'Student') motivation *= 0.85;
    if (occupation === 'Community development technician' || occupation === 'Social worker') motivation = Math.min(1, motivation * 1.1);
    const ability = rng.normal(0, 1) + (occupation === 'Student' ? -0.25 : 0);
    const org = rng.chance(0.3) ? NOT_ANSWERED : rng.weighted(ORGANISATIONS, orgW);
    const device = rng.weighted(DEVICES, prefLang === 'Portuguese' || prefLang === 'English' ? [49, 43, 6, 2] : [28, 67, 4, 1]);
    learners.push({
      id: i,
      code: `L-${10000 + Math.floor(rng.next() * 89999)}`,
      regDay,
      occupation,
      workArea,
      ageGroup,
      gender,
      prefLang,
      interests,
      org,
      instType: 'None',
      district: '',
      municipality: '',
      experience: NOT_ANSWERED,
      education: NOT_ANSWERED,
      foundVia: NOT_ANSWERED,
      baseline: 0,
      consentEval: true,
      consentRecontact: false,
      consentAI: false,
      viaGate: false,
      device,
      motivation,
      ability,
      communities: [],
      copJoinMonth: -1,
      activeUntil: Math.round(regDay + rng.exp(45 + 210 * motivation)),
    });
  }
  learners.sort((a, b) => a.regDay - b.regDay);
  learners.forEach((l, i) => (l.id = i));

  // --- enrolments, progress, quiz attempts, lesson videos
  const enrolments: Enrolment[] = [];
  const attempts: QuizAttempt[] = [];
  const lessonVideos: LessonVideo[] = [];
  const activityToday: number[][] = learners.map(() => []);
  const activityProposed: number[][] = learners.map(() => []);

  for (const l of learners) {
    const never = rng.chance(0.12 + (1 - l.motivation) * 0.06);
    if (never) continue;
    const n = clamp(1 + rng.poisson(l.motivation * 1.6), 1, 5);
    const chosen = new Set<number>();
    let cursorDay = l.regDay + Math.floor(rng.exp(14));
    for (let k = 0; k < n; k++) {
      if (cursorDay > TODAY || cursorDay > l.activeUntil) break;
      const weights = courses.map((c) => {
        if (chosen.has(c.id)) return 0;
        const matched = c.topicIds.some((t) => l.interests.includes(t));
        const langFit =
          c.lang === l.prefLang ? 1.7 : c.lang === 'English' && l.prefLang !== 'Portuguese' ? 1.15 : 0.55;
        return c.popularity * (matched ? 3.2 : 1) * langFit;
      });
      const course = rng.weighted(courses, weights);
      chosen.add(course.id);
      const matched = course.topicIds.some((t) => l.interests.includes(t));
      const viaRec = rng.chance(matched ? 0.42 : 0.14);
      const enrol: Enrolment = {
        id: enrolments.length,
        learnerId: l.id,
        courseId: course.id,
        day: cursorDay,
        matched,
        viaRec,
        started: false,
        lessonsDone: 0,
        lessonDays: [],
        completedDay: null,
        lastActivityDay: cursorDay,
        timerMin: [],
      };
      enrolments.push(enrol);
      activityToday[l.id].push(cursorDay);
      let day = cursorDay;
      if (rng.chance(0.92 + l.motivation * 0.06)) {
        enrol.started = true;
        for (let li = 0; li < course.lessonIds.length; li++) {
          const lesson = lessons[course.lessonIds[li]];
          day += Math.max(0, Math.round(rng.exp(2 + 5 * (1 - l.motivation))));
          if (day > TODAY) break;
          enrol.lastActivityDay = day;
          enrol.timerMin.push(Math.round(lesson.minutes * Math.exp(rng.normal(0, 0.32))));
          activityToday[l.id].push(day);
          // lesson video (new tracking)
          if (rng.chance(0.9)) {
            const finish = rng.chance(clamp(lesson.videoHook + (l.motivation - 0.5) * 0.4, 0.05, 0.95));
            const watched = finish ? 1 : clamp(Math.pow(rng.next(), 1.3), 0.03, 0.97);
            lessonVideos.push({ learnerId: l.id, courseId: course.id, lessonId: lesson.id, day, watched });
          }
          // quiz attempts
          const quiz = quizzes[lesson.quizId];
          let passed = false;
          for (let att = 1; att <= 5; att++) {
            const correct = quiz.questionIds.map((qid) => {
              const q = questions[qid];
              return rng.chance(sigmoid(q.a * (l.ability + 0.35 * (att - 1) - q.b) + q.c));
            });
            const scorePct = Math.round((100 * correct.filter(Boolean).length) / correct.length);
            passed = scorePct >= quiz.passMark;
            attempts.push({
              learnerId: l.id,
              quizId: quiz.id,
              courseId: course.id,
              day,
              attemptNo: att,
              correct,
              scorePct,
              passed,
              timeSec: Math.round(correct.length * 38 * Math.exp(rng.normal(0, 0.35))),
            });
            if (passed) break;
            const retry = [0, 0.88, 0.76, 0.62, 0.45][att] * (0.7 + 0.5 * l.motivation);
            if (!rng.chance(retry)) break;
            day += rng.int(0, 2);
            if (day > TODAY) break;
            activityToday[l.id].push(day);
          }
          if (!passed) break;
          enrol.lessonsDone = li + 1;
          enrol.lessonDays.push(day);
          enrol.lastActivityDay = day;
          if (li === course.lessonIds.length - 1) {
            enrol.completedDay = day;
            break;
          }
          const cont =
            lesson.continueProb *
            (0.8 + 0.3 * l.motivation) *
            (matched ? 1.03 : 0.96) *
            (viaRec ? 1.02 : 1) *
            (course.lang === l.prefLang ? 1.01 : 0.96);
          if (!rng.chance(clamp(cont, 0, 0.995))) break;
        }
      }
      cursorDay = Math.max(cursorDay, enrol.lastActivityDay) + Math.floor(rng.exp(45 + 40 * (1 - l.motivation)));
    }
  }

  // --- resource events (new tracking) and downloads (Download Manager, today)
  const resEvents: ResourceEvent[] = [];
  for (const l of learners) {
    const nEv = rng.poisson(1.5 + l.motivation * 15);
    for (let k = 0; k < nEv; k++) {
      const lastDay = Math.min(TODAY, Math.max(l.regDay + 3, l.activeUntil));
      const day = Math.floor(l.regDay + (lastDay - l.regDay) * Math.pow(rng.next(), 1.15));
      const weights = resources.map((r) => {
        const matched = l.interests.includes(r.topicId);
        const langFit = r.lang === l.prefLang ? 1.8 : r.lang === 'English' ? 0.9 : r.lang === 'Portuguese' ? 0.8 : 0.15;
        const typePop = [1, 1.25, 0.7, 0.55, 1.3, 0.8][RES_TYPES.indexOf(r.type)];
        return r.appeal * (matched ? 2.4 : 1) * langFit * typePop;
      });
      const r = rng.weighted(resources, weights);
      const matched = l.interests.includes(r.topicId);
      const source = rng.weighted<ResSource>(
        ['Recommendation', 'Search', 'Course link', 'Browsing'],
        [matched ? 30 : 12, 24, 18, 34],
      );
      const device = rng.chance(0.8) ? l.device : rng.pick(DEVICES);
      let kind: ResKind = 'view';
      let watched = 0;
      if (r.type === 'Instructional video' || r.type === 'Podcast' || r.type === '360 video') {
        kind = 'play';
        const mobilePenalty = device === 'Mobile' && r.type === '360 video' ? -0.15 : 0;
        const finish = rng.chance(clamp(r.hook + (l.motivation - 0.5) * 0.3 + mobilePenalty, 0.05, 0.95));
        watched = finish ? 1 : clamp(Math.pow(rng.next(), 1.4), 0.02, 0.97);
      } else if (r.type === 'Microlearning') {
        watched = rng.chance(0.72) ? 1 : clamp(rng.next(), 0.1, 0.9);
      } else if (r.type === 'Download package') {
        kind = 'download';
      }
      resEvents.push({ learnerId: l.id, resourceId: r.id, day, kind, watched, source, device });
      let downloaded = kind === 'download';
      if (r.type === 'Document' && rng.chance(0.38)) {
        resEvents.push({ learnerId: l.id, resourceId: r.id, day, kind: 'download', watched: 0, source, device });
        downloaded = true;
      }
      activityProposed[l.id].push(day);
      if (downloaded) activityToday[l.id].push(day);
    }
  }
  resEvents.sort((a, b) => a.day - b.day);

  // --- anonymous view counts (Post Views Counter) and visitor downloads
  const anon: AnonMonth[] = [];
  const learnerViewsByResMonth = new Map<string, number>();
  for (const e of resEvents) {
    if (e.kind === 'download') continue;
    const key = `${e.resourceId}:${monthIndexOfDay(e.day)}`;
    learnerViewsByResMonth.set(key, (learnerViewsByResMonth.get(key) ?? 0) + 1);
  }
  for (const r of resources) {
    for (let m = 0; m < MONTH_COUNT; m++) {
      const growth = 0.35 + (0.65 * m) / (MONTH_COUNT - 1);
      const partial = m === MONTH_COUNT - 1 ? 17 / 30 : 1;
      const visitors = rng.poisson(r.appeal * 5.5 * growth * partial);
      const learnerViews = learnerViewsByResMonth.get(`${r.id}:${m}`) ?? 0;
      const visitorDownloads =
        r.type === 'Document' || r.type === 'Download package' ? rng.poisson(r.appeal * 1.3 * growth * partial) : 0;
      anon.push({ resourceId: r.id, month: m, views: visitors + Math.round(learnerViews * 0.85), visitorViews: visitors, visitorDownloads });
    }
  }

  // --- recommendation events (new tracking)
  const recStats: RecStat[] = [];
  const carouselBase = [0.075, 0.05, 0.06, 0.032, 0.022, 0.085];
  const posDecay = [1, 0.78, 0.6, 0.46, 0.35, 0.27, 0.21, 0.16];
  for (const l of learners) {
    const startM = monthIndexOfDay(l.regDay);
    const endM = monthIndexOfDay(Math.min(TODAY, Math.max(l.regDay, l.activeUntil)));
    for (let m = startM; m <= endM; m++) {
      const active = rng.chance(0.35 + 0.6 * l.motivation);
      if (!active) continue;
      const visits = 1 + rng.poisson(2.2 * l.motivation);
      for (let c = 0; c < CAROUSELS.length; c++) {
        const clicks = posDecay.map((d) => rng.poisson(visits * carouselBase[c] * d * (0.7 + 0.8 * l.motivation)));
        recStats.push({ learnerId: l.id, carousel: c, month: m, shown: visits, clicks });
      }
      rng.int(0, 27); // keeps the random sequence; a home-page visit is not a learning action
    }
  }

  // --- course survey at completion (new), Course Reviews (today, if switched on)
  const surveys: SurveyResponse[] = [];
  const reviews: CourseReview[] = [];
  const occupationBoost: Record<string, number> = {
    'Social worker': 0.06,
    Teacher: 0.03,
    'Community development technician': 0.08,
    'Public-service staff': -0.02,
    Trainer: 0.05,
    'OSC leader': 0.07,
    Student: -0.12,
    Other: -0.02,
    [NOT_ANSWERED]: 0,
  };
  const orgBoost: Record<string, number> = {
    'Associação Raízes': 0.12,
    'Centro Comunitário Horizonte': 0.07,
    'Rede Social Local Norte': 0.1,
    'IPSS Bem-Estar': 0.02,
    'Cooperativa Social Ponte': 0.05,
    'Escola Básica do Vale': -0.04,
    'Associação Juvenil Elo': 0.03,
    'Junta de Freguesia Sul': -0.06,
    'Fundação Comunidade Viva': 0.04,
    [NOT_ANSWERED]: 0,
  };

  for (const e of enrolments) {
    if (e.completedDay === null) continue;
    const l = learners[e.learnerId];
    const c = courses[e.courseId];
    const answeredFirst = rng.chance(0.45 + 0.15 * l.motivation);
    const answeredAfterReminder = !answeredFirst && e.completedDay + 5 <= TODAY && rng.chance(0.25);
    const answered = answeredFirst || answeredAfterReminder;
    const scores = c.aspectBase.map((base) =>
      Math.round(clamp(rng.normal(base + (e.matched ? 0.08 : -0.08), 0.5), 1, 5)),
    );
    let comment: string | null = null;
    if (answered && rng.chance(0.32)) {
      const minIdx = scores.indexOf(Math.min(...scores));
      const aspects = ['Quality', 'Fits my work', 'Increased my understanding'];
      comment = scores[minIdx] <= 3 ? rng.pick(COMMENTS[aspects[minIdx]]) : rng.pick(COMMENTS.positive);
    }
    const plan = answered && rng.chance(0.58 + 0.2 * l.motivation) ? rng.pick(PLANS[c.areaId]) : null;
    const answerDay = answeredFirst ? e.completedDay + rng.int(0, 3) : e.completedDay + rng.int(5, 9);
    surveys.push({
      enrolmentId: e.id,
      learnerId: l.id,
      courseId: c.id,
      sentDay: e.completedDay,
      reminded: !answeredFirst && e.completedDay + 5 <= TODAY,
      answered: answered && answerDay <= TODAY,
      answerDay: Math.min(answerDay, TODAY),
      scores,
      plan,
      comment,
    });
    if (rng.chance(0.2)) {
      const mean = c.aspectBase.reduce((a, b) => a + b, 0) / c.aspectBase.length;
      reviews.push({
        learnerId: l.id,
        courseId: c.id,
        day: Math.min(TODAY, e.completedDay + rng.int(0, 4)),
        stars: Math.round(clamp(rng.normal(mean + 0.1, 0.7), 1, 5)),
      });
    }
  }

  // --- Communities of Practice (separate application)
  const copMemberMonths: CopMemberMonth[] = [];
  const copCommunityMonths: CopCommunityMonth[] = [];
  const copSurveys: CopSurvey[] = [];
  const communityVibe = [0.85, 1.0, 0.65, 0.75, 0.9];
  const belongingBase = [4.1, 4.3, 3.6, 4.0, 3.9];
  for (const l of learners) {
    if (!rng.chance(0.12 + 0.38 * l.motivation)) continue;
    const areas = new Set(l.interests.map((t) => TOPICS[t].areaId));
    const options = COMMUNITIES.filter((c) => areas.has(c.areaId)).map((c) => c.id);
    const pool = options.length ? options : [0];
    const first = rng.pick(pool);
    l.communities = [first];
    if (rng.chance(0.3)) {
      const second = rng.pick(COMMUNITIES.map((c) => c.id));
      if (second !== first) l.communities.push(second);
    }
    l.copJoinMonth = Math.max(COP_LAUNCH_MONTH, monthIndexOfDay(l.regDay)) + rng.int(0, 2);
    for (const cid of l.communities) {
      // lurkers read but never post
      const lurker = rng.chance(0.42 - 0.22 * l.motivation);
      const lastCopMonth = lurker ? -1 : monthIndexOfDay(Math.min(TODAY, l.activeUntil + 150));
      for (let m = l.copJoinMonth; m < MONTH_COUNT && m <= lastCopMonth; m++) {
        const lam = (0.1 + 1.1 * l.motivation) * communityVibe[cid] * (m === MONTH_COUNT - 1 ? 0.55 : 1);
        const posts = rng.poisson(lam * 0.6);
        const replies = rng.poisson(lam * 1.4);
        if (posts + replies > 0) copMemberMonths.push({ learnerId: l.id, communityId: cid, month: m, posts, replies });
      }
      if (rng.chance(0.42)) {
        copSurveys.push({
          learnerId: l.id,
          communityId: cid,
          belonging: Math.round(clamp(rng.normal(belongingBase[cid] + (l.motivation - 0.5) * 0.6, 0.8), 1, 5)),
          peerSupport: Math.round(clamp(rng.normal(belongingBase[cid] - 0.15 + (l.motivation - 0.5) * 0.5, 0.85), 1, 5)),
        });
      }
    }
  }
  for (const c of COMMUNITIES) {
    for (let m = COP_LAUNCH_MONTH; m < MONTH_COUNT; m++) {
      const age = m - COP_LAUNCH_MONTH;
      const partial = m === MONTH_COUNT - 1 ? 0.55 : 1;
      copCommunityMonths.push({
        communityId: c.id,
        month: m,
        moderatorReplies: Math.round(rng.poisson(9 * communityVibe[c.id]) * partial),
        firstReplyHours: Math.round(clamp(rng.normal(26 - age * 1.6 - communityVibe[c.id] * 6, 3), 3, 48)),
        modPerson: Math.round(rng.poisson(m >= AI_MODERATION_MONTH ? 4 : 8) * partial),
        modAi: m >= AI_MODERATION_MONTH ? Math.round(rng.poisson(3 + (m - AI_MODERATION_MONTH) * 1.4) * partial) : 0,
      });
    }
  }

  // ================================================================ proposal additions
  // A second random stream, so the additions do not shift the data above.
  const r2 = new Rng(20261118);

  // --- Level 1 fields proposed in the framework
  const instTypeByRole: Record<string, number[]> = {
    // OSC, Municipality, School, Public service, University, Other, None
    'Social worker': [45, 25, 0, 20, 0, 10, 0],
    Teacher: [10, 0, 80, 0, 5, 5, 0],
    'Community development technician': [55, 30, 0, 0, 0, 15, 0],
    'Public-service staff': [0, 30, 0, 65, 0, 5, 0],
    Trainer: [40, 0, 0, 0, 20, 25, 15],
    'OSC leader': [100, 0, 0, 0, 0, 0, 0],
    Student: [0, 0, 0, 0, 75, 0, 25],
  };
  const instMunicipality: Record<string, string> = {
    'Associação Raízes': 'Amadora',
    'Centro Comunitário Horizonte': 'Sintra',
    'Rede Social Local Norte': 'Loures',
    'IPSS Bem-Estar': 'Lisboa',
    'Cooperativa Social Ponte': 'Almada',
    'Escola Básica do Vale': 'Odivelas',
    'Associação Juvenil Elo': 'Amadora',
    'Junta de Freguesia Sul': 'Seixal',
    'Fundação Comunidade Viva': 'Porto',
  };
  const gateStart = monthStartDay(GATE_MONTH);
  for (const l of learners) {
    const inst = INSTITUTIONS.find((x) => x.name === l.org);
    l.instType = inst ? inst.type : r2.weighted(INST_TYPES, instTypeByRole[l.occupation] ?? [20, 5, 10, 10, 0, 30, 25]);
    const terr =
      inst && r2.chance(0.85)
        ? TERRITORIES.find((t) => t.municipality === instMunicipality[inst.name])!
        : r2.weighted(TERRITORIES, TERRITORIES.map((t) => t.w));
    l.district = terr.district;
    l.municipality = terr.municipality;
    l.experience = r2.chance(0.38)
      ? NOT_ANSWERED
      : r2.weighted(EXPERIENCE, l.ageGroup === '15-30' ? [55, 38, 7, 0] : l.ageGroup === '65+' ? [3, 7, 15, 75] : [12, 28, 27, 33]);
    l.education = r2.chance(0.45) ? NOT_ANSWERED : r2.weighted(EDUCATION, l.occupation === 'Student' ? [40, 55, 5] : [18, 52, 30]);
    l.foundVia = r2.chance(0.25)
      ? NOT_ANSWERED
      : r2.weighted(FOUND_VIA, l.occupation === 'Student' ? [8, 52, 15, 15, 8, 2] : l.org !== NOT_ANSWERED ? [48, 4, 22, 12, 8, 6] : [18, 6, 26, 22, 20, 8]);
    l.baseline = r2.chance(0.55) ? Math.round(clamp(r2.normal(2.7 + 0.25 * l.ability, 0.8), 1, 5)) : 0;
    l.consentEval = r2.chance(0.91);
    l.consentRecontact = r2.chance(0.56 + 0.25 * l.motivation);
    l.consentAI = r2.chance(0.72);
    l.viaGate = l.regDay >= gateStart && r2.chance(0.38);
  }

  // --- Virtual Tutor (Kappa): conversations linked to the learner ID
  const tutorConvs: TutorConv[] = [];
  const tutorStart = monthStartDay(TUTOR_LAUNCH_MONTH);
  const groupW = [24, 20, 14, 16, 9, 9, 8];
  const groupUp = [0.86, 0.82, 0.74, 0.84, 0.72, 0.8, 0.55];
  const learnerMode: number[] = learners.map(() => 0);
  const tutorUser: boolean[] = learners.map(() => false);
  for (const l of learners) {
    const from = Math.max(l.regDay, tutorStart);
    const to = Math.min(TODAY, l.activeUntil + 30);
    learnerMode[l.id] = clamp((l.device === 'Mobile' ? 0.32 : 0.12) + r2.normal(0, 0.08), 0.02, 0.8);
    if (to <= from) continue;
    if (!r2.chance(0.14 + 0.42 * l.motivation + (l.device === 'Mobile' ? 0.05 : 0))) continue;
    tutorUser[l.id] = true;
    const myLessons = enrolments.filter((e) => e.learnerId === l.id && e.started).flatMap((e) => courses[e.courseId].lessonIds.slice(0, Math.max(1, e.lessonsDone + 1)));
    const n = 1 + r2.poisson(1.2 + 4.5 * l.motivation);
    for (let k = 0; k < n; k++) {
      const day = Math.floor(from + (to - from) * Math.pow(r2.next(), 0.8));
      const mode = r2.chance(learnerMode[l.id]) ? 'Voice' : 'Text';
      const group = r2.weighted(QUESTION_GROUPS.map((_, i) => i), groupW);
      const noMatch = r2.chance(group === 2 ? 0.32 : group === 4 ? 0.22 : 0.07);
      const unmatched = noMatch ? r2.weighted(UNMATCHED_TOPICS.map((_, i) => i), [12, 10, 16, 9, 7, 6, 8]) : -1;
      const fromLesson = myLessons.length > 0 && r2.chance(0.55);
      let lessonId: number | null = null;
      if (fromLesson) {
        // learners ask more where lessons are hard: weight by the lesson's fall-off
        lessonId = r2.weighted(myLessons, myLessons.map((lid) => 1 + 6 * (1 - lessons[lid].continueProb)));
      }
      const rated = r2.chance(0.3);
      const thumbs = rated ? (r2.chance(groupUp[group] - (noMatch ? 0.25 : 0)) ? 1 : -1) : 0;
      tutorConvs.push({
        learnerId: l.id,
        day,
        mode,
        minutes: Math.round(clamp(r2.exp(mode === 'Voice' ? 4.2 : 6.5) + 1, 1, 40) * 10) / 10,
        group: l.consentAI ? group : -1,
        lessonId,
        unmatched,
        thumbs,
      });
      activityProposed[l.id].push(day);
    }
  }
  tutorConvs.sort((a, b) => a.day - b.day);

  // --- one-click resource feedback: "Was this useful for your work?"
  const resFeedback: ResFeedback[] = [];
  for (const e of resEvents) {
    if (!r2.chance(0.22)) continue;
    const r = resources[e.resourceId];
    const l = learners[e.learnerId];
    const matched = l.interests.includes(r.topicId);
    const typeAdj = [0.05, 0.02, -0.04, -0.12, 0.08, 0.06][RES_TYPES.indexOf(r.type)];
    const pYes = clamp(0.42 + 0.12 * Math.log(r.appeal + 0.5) + typeAdj + (matched ? 0.08 : -0.05), 0.1, 0.9);
    const u = r2.next();
    const answer = u < pYes ? 0 : u < pYes + (1 - pYes) * 0.62 ? 1 : 2;
    resFeedback.push({ learnerId: e.learnerId, resourceId: e.resourceId, day: e.day, answer });
  }

  // --- resource library searches (registered learners, event log)
  const searches: SearchEvent[] = [];
  const termPool = TOPIC_LIST.map((t, i) => ({ term: TOPIC_PT[i], topicId: t.id }));
  for (const l of learners) {
    const n = r2.poisson(0.4 + 5 * l.motivation);
    const lastDay = Math.min(TODAY, Math.max(l.regDay + 3, l.activeUntil));
    for (let k = 0; k < n; k++) {
      const day = Math.floor(l.regDay + (lastDay - l.regDay) * r2.next());
      const filter = r2.weighted<SearchEvent['filter']>(['Format', 'Learning area', 'Language', null], [18, 22, 9, 51]);
      if (r2.chance(0.15)) {
        const u = r2.weighted(UNMATCHED_TOPICS.map((_, i) => i), [10, 12, 15, 8, 9, 6, 9]);
        searches.push({ learnerId: l.id, day, term: UNMATCHED_TOPICS[u], results: 0, filter, unmatched: u });
      } else {
        const own = r2.chance(0.6) && l.interests.length ? l.interests[r2.int(0, l.interests.length - 1)] : r2.int(0, TOPIC_LIST.length - 1);
        const supply = resources.filter((r) => r.topicId === own).length;
        searches.push({ learnerId: l.id, day, term: termPool[own].term, results: supply, filter, unmatched: -1 });
      }
    }
  }
  searches.sort((a, b) => a.day - b.day);

  // --- registration gate (proposed: an account after 3 resources), from May 2026 in the demo
  const gateMonths: GateMonth[] = [];
  for (let m = GATE_MONTH; m < MONTH_COUNT; m++) {
    const regs = learners.filter((l) => l.viaGate && monthIndexOfDay(l.regDay) === m).length;
    const partial = m === MONTH_COUNT - 1 ? 17 / 30 : 1;
    gateMonths.push({ month: m, shown: Math.max(regs + 5, Math.round((regs / 0.11) * (0.85 + 0.3 * r2.next()) + r2.poisson(20 * partial))) });
  }

  // --- MonsterInsights (Google Analytics): all visitors who accept analytics cookies, in aggregate
  const traffic: TrafficMonth[] = [];
  const chW: Record<string, number> = { 'Organic search': 34, Direct: 24, Referral: 18, Social: 11, Email: 8, 'AI tools': 5 };
  const refW: Record<string, number> = {
    'Moodle (universities)': 30,
    'Microsoft Teams': 22,
    'Partner OSC websites': 18,
    'chatgpt.com': 10,
    'facebook.com': 9,
    'linkedin.com': 7,
    'perplexity.ai': 3,
    'gemini.google.com': 2,
  };
  for (let m = 0; m < MONTH_COUNT; m++) {
    const growth = 0.4 + (0.6 * m) / (MONTH_COUNT - 1);
    const partial = m === MONTH_COUNT - 1 ? 17 / 30 : 1;
    const sessions = Math.round((1400 + r2.normal(0, 90)) * growth * partial);
    const channels: Record<string, number> = {};
    for (const [k, w] of Object.entries(chW)) {
      const aiGrowth = k === 'AI tools' ? 0.3 + (1.7 * m) / (MONTH_COUNT - 1) : 1;
      channels[k] = Math.round((sessions * w * aiGrowth * (0.9 + 0.2 * r2.next())) / 100);
    }
    const total = Object.values(channels).reduce((a, b) => a + b, 0);
    const devices = {
      Laptop: Math.round(total * (0.5 - 0.004 * m)),
      Mobile: Math.round(total * (0.43 + 0.004 * m)),
      Tablet: Math.round(total * 0.05),
      'VR headset': Math.round(total * (m >= 9 ? 0.02 : 0.006)),
    };
    const regions = {
      Lisboa: Math.round(total * 0.52),
      Setúbal: Math.round(total * 0.12),
      Porto: Math.round(total * 0.11),
      'Rest of Portugal': Math.round(total * 0.13),
      Brazil: Math.round(total * 0.07),
      'Other countries': Math.round(total * 0.05),
    };
    const referrers: Record<string, number> = {};
    for (const [k, w] of Object.entries(refW)) {
      const ai = k.endsWith('.ai') || k.startsWith('chatgpt') || k.startsWith('gemini') ? 0.3 + (1.7 * m) / (MONTH_COUNT - 1) : 1;
      referrers[k] = Math.round((channels.Referral + channels['AI tools']) * (w / 100) * ai * (0.85 + 0.3 * r2.next()));
    }
    const newShare = clamp(0.62 - 0.012 * m, 0.4, 0.7);
    traffic.push({
      month: m,
      channels,
      devices,
      regions,
      referrers,
      newUsers: Math.round(total * 0.78 * newShare),
      returningUsers: Math.round(total * 0.78 * (1 - newShare)),
      engagedRate: clamp(0.52 + 0.006 * m + r2.normal(0, 0.015), 0.4, 0.7),
    });
  }

  // --- Communities of Practice: resources co-created by two or more members
  const copCoCreated: CopCoCreated[] = [];
  for (const c of COMMUNITIES) {
    for (let m = COP_LAUNCH_MONTH + 1; m < MONTH_COUNT; m++) {
      const partial = m === MONTH_COUNT - 1 ? 0.55 : 1;
      copCoCreated.push({
        communityId: c.id,
        month: m,
        started: Math.round(r2.poisson(1.1 * communityVibe[c.id]) * partial),
        completed: Math.round(r2.poisson(0.6 * communityVibe[c.id] * Math.min(1, (m - COP_LAUNCH_MONTH) / 3)) * partial),
      });
    }
  }

  // --- six-monthly platform survey, to learners active in the six months before
  const platformSurveys: PlatformSurvey[] = [];
  const itemBase: Record<string, number> = {
    variety: 3.7,
    quality: 4.1,
    access: 3.55,
    paths: 3.55,
    tutorUseful: 4.0,
    tutorRelevant: 3.7,
    tutorReflect: 3.35,
    lessAlone: 3.45,
    discussions: 3.9,
  };
  PLATFORM_SURVEY_MONTHS.forEach((m, wave) => {
    const day = monthStartDay(m) + 10;
    for (const l of learners) {
      const act = activityProposed[l.id].some((x) => x <= day && x > day - 182);
      if (!act || !l.consentEval) continue;
      const answered = r2.chance(0.24 + 0.3 * l.motivation);
      const es = enrolments.filter((e) => e.learnerId === l.id);
      const matchedShare = es.length ? es.filter((e) => e.matched).length / es.length : 0.5;
      const usedTutor = tutorUser[l.id] && tutorConvs.some((t) => t.learnerId === l.id && t.day <= day);
      const member = l.communities.length > 0 && l.copJoinMonth <= m;
      const lift = wave * 0.12;
      const sc = (base: number, sd = 0.85) => Math.round(clamp(r2.normal(base + lift + (l.motivation - 0.5) * 0.5, sd), 1, 5));
      const items: Record<string, number> = {
        variety: sc(itemBase.variety),
        quality: sc(itemBase.quality, 0.7),
        access: sc(itemBase.access - (l.device === 'Mobile' ? 0.35 : 0)),
        paths: sc(itemBase.paths + (matchedShare - 0.5) * 1.1),
        lessAlone: sc(itemBase.lessAlone + (member ? 0.55 : 0)),
      };
      if (usedTutor) {
        items.tutorUseful = sc(itemBase.tutorUseful, 0.75);
        items.tutorRelevant = sc(itemBase.tutorRelevant);
        items.tutorReflect = sc(itemBase.tutorReflect + (wave ? 0.15 : 0));
      }
      if (member && m > COP_LAUNCH_MONTH) items.discussions = sc(itemBase.discussions);
      const nps = Math.round(clamp(r2.normal(7.6 + (l.motivation - 0.5) * 2.4 + lift, 1.8), 0, 10));
      // stated preference: more learners say they prefer voice than actually use it
      const modePref = usedTutor ? r2.weighted([0, 1, 2], [48 - 30 * learnerMode[l.id], 26 + 50 * learnerMode[l.id], 26]) : r2.weighted([0, 1, 2, 3], [8, 6, 4, 82]);
      platformSurveys.push({ learnerId: l.id, wave, month: m, answered, items, nps, modePref });
    }
  });

  // --- Level 4 follow-ups at +6 and +12 months, for the courses the D&I team selects
  const followUps: FollowUp[] = [];
  const courseApply: Record<number, number> = { 0: 0.04, 2: 0.08, 4: 0.02, 7: 0.14, 8: 0.1, 10: -0.04, 11: 0.03 };
  for (const e of enrolments) {
    if (e.completedDay === null) continue;
    const l = learners[e.learnerId];
    const c = courses[e.courseId];
    [FOLLOWUP_6M, FOLLOWUP_12M].forEach((sel, wave) => {
      if (!sel.includes(c.id)) return;
      const sentDay = (e.completedDay as number) + (wave === 0 ? 182 : 365);
      if (sentDay > TODAY) return;
      const consented = l.consentRecontact;
      const contacted = consented && !r2.chance(0.04);
      const answered = contacted && r2.chance((wave === 0 ? 0.36 : 0.28) + 0.4 * l.motivation);
      const boost = (occupationBoost[l.occupation] ?? 0) + (orgBoost[l.org] ?? 0) * 0.8 + (l.motivation - 0.5) * 0.25 + (courseApply[c.id] ?? 0);
      const pUse = clamp(0.62 + boost + (wave === 1 ? -0.04 : 0), 0.15, 0.95);
      const u = r2.next();
      const use = u < pUse * 0.42 ? 0 : u < pUse ? 1 : u < pUse + (1 - pUse) * 0.6 ? 2 : 3;
      const applying = use <= 1;
      const before = l.baseline > 0 ? Math.max(1, l.baseline + (r2.chance(0.3) ? 1 : 0) - (r2.chance(0.2) ? 1 : 0)) : Math.round(clamp(r2.normal(2.6, 0.8), 1, 5));
      const gain = applying ? (wave === 0 ? 1.1 : 1.3) : 0.4;
      const now = Math.round(clamp(before + gain + r2.normal(0, 0.6), 1, 5));
      const outcomes: FollowUp['outcomes'] = {};
      if (wave === 0) {
        outcomes.tried = r2.chance(clamp(0.5 + boost + (applying ? 0.15 : -0.2), 0.05, 0.95));
        outcomes.shared = r2.chance(clamp(0.38 + boost + (applying ? 0.1 : -0.15), 0.05, 0.95));
      } else {
        outcomes.shared = r2.chance(clamp(0.48 + boost + (applying ? 0.1 : -0.15), 0.05, 0.95));
        outcomes.still = applying && r2.chance(0.82);
        outcomes.orgChange = r2.chance(clamp(0.06 + boost * 0.8 + (applying ? 0.08 : -0.1) + (l.instType === 'OSC' ? 0.06 : 0), 0.03, 0.9));
        outcomes.community = r2.chance(clamp(0.2 + boost + (applying ? 0.1 : -0.15), 0.03, 0.9));
      }
      const barriers: number[] = [];
      if (wave === 0) {
        if (r2.chance(applying ? 0.38 : 0.62)) barriers.push(0);
        if (r2.chance(0.22)) barriers.push(1);
        if (r2.chance(c.areaId === 3 ? 0.42 : 0.18)) barriers.push(2);
        if (r2.chance(c.id === 10 ? 0.45 : 0.14)) barriers.push(3);
        if (r2.chance(0.05)) barriers.push(4);
      }
      const member = l.communities.length > 0;
      followUps.push({
        learnerId: l.id,
        courseId: c.id,
        enrolmentId: e.id,
        wave: wave as 0 | 1,
        sentDay,
        consented,
        contacted,
        answered,
        use,
        outcomes,
        confBefore: before,
        confNow: Math.max(before, now),
        barriers,
        copContacts: member ? r2.chance(0.34 + 0.2 * l.motivation) : null,
        volunteer: answered && r2.chance(0.24),
        changeText: answered && applying && r2.chance(0.6) ? r2.pick(CHANGES[c.areaId]) : null,
      });
    });
  }

  // --- Layer 5: evidence gathered by the AKF teams, recorded in an admin form
  const l5: L5Activity[] = [];
  // the designed picture: what observers see per learning area (1-4)
  const observed = [3.0, 3.4, 2.9, 2.1, 3.0, 3.2, 2.7];
  const plan: [string, number, number][] = [
    // method, count, months back spread
    ['Focus group', 7, 12],
    ['Semi-structured interview', 11, 10],
    ['Manager questionnaire', 6, 12],
    ['Trainer report', 8, 12],
    ['Case study', 3, 12],
    ['Feedback from people served', 3, 9],
  ];
  const roleNames = ['Social worker', 'Teacher', 'Community development technician', 'Public-service staff', 'Trainer', 'OSC leader'];
  let l5id = 0;
  for (const [method, count, back] of plan) {
    for (let k = 0; k < count; k++) {
      const areaId = method === 'Focus group' ? k % 7 : r2.weighted([0, 1, 2, 3, 4, 5, 6], [14, 18, 12, 16, 12, 16, 4]);
      if (areaId === 6 && method !== 'Focus group' && r2.chance(0.7)) continue;
      const day = TODAY - r2.int(5, back * 30);
      const base = observed[areaId];
      const ratings = L5_INDICATORS.map((_, i) => {
        if (r2.chance(method === 'Case study' || method === 'Focus group' ? 0.1 : 0.4)) return 0;
        const adj = i === 4 ? -0.3 : i === 6 ? 0.1 : i === 5 ? -0.15 : 0;
        return Math.round(clamp(r2.normal(base + adj, 0.55), 1, 4));
      });
      const terr = r2.weighted(TERRITORIES, TERRITORIES.map((t) => t.w));
      const participants = method === 'Focus group' ? r2.int(6, 10) : method === 'Manager questionnaire' ? r2.int(8, 25) : method === 'Trainer report' ? r2.int(10, 30) : method === 'Feedback from people served' ? r2.int(12, 40) : 1;
      const nRoles = method === 'Semi-structured interview' || method === 'Case study' ? 1 : r2.int(2, 4);
      const roles = Array.from(new Set(Array.from({ length: nRoles }, () => r2.pick(roleNames))));
      const insts = Array.from(new Set(Array.from({ length: Math.max(1, nRoles - 1) }, () => r2.pick(['OSC', 'Municipality', 'School', 'Public service']))));
      l5.push({
        id: l5id++,
        day,
        method,
        areaId,
        municipality: terr.municipality,
        participants,
        roles,
        instTypes: insts,
        themes: L5_THEMES[areaId].filter(() => r2.chance(0.6)).slice(0, 2).concat(r2.chance(0.3) ? [r2.pick(L5_THEMES[areaId])] : []).filter((x, i, a) => a.indexOf(x) === i),
        quote: L5_QUOTES[areaId],
        ratings,
        observedChange: base,
      });
    }
  }
  l5.sort((a, b) => b.day - a.day);
  l5.forEach((x) => {
    if (!x.themes.length) x.themes = [L5_THEMES[x.areaId][0]];
  });

  // --- GamiPress badges, derived from what learners did
  const badges: BadgeEarned[] = [];
  for (const l of learners) {
    const done = enrolments
      .filter((e) => e.learnerId === l.id && e.completedDay !== null)
      .sort((a, b) => (a.completedDay as number) - (b.completedDay as number));
    if (done[0]) badges.push({ learnerId: l.id, badge: BADGES[0], day: done[0].completedDay as number });
    if (done[2]) badges.push({ learnerId: l.id, badge: BADGES[1], day: done[2].completedDay as number });
    const fast = done.find((e) => (e.completedDay as number) - e.day <= 14);
    if (fast) badges.push({ learnerId: l.id, badge: BADGES[5], day: fast.completedDay as number });
    const firstPasses = attempts.filter((a) => a.learnerId === l.id && a.attemptNo === 1 && a.passed).sort((a, b) => a.day - b.day);
    if (firstPasses[4]) badges.push({ learnerId: l.id, badge: BADGES[2], day: firstPasses[4].day });
    const late = attempts.find((a) => a.learnerId === l.id && a.attemptNo >= 3 && a.passed);
    if (late) badges.push({ learnerId: l.id, badge: BADGES[4], day: late.day });
    const dls = resEvents.filter((e) => e.learnerId === l.id && e.kind === 'download');
    if (dls[4]) badges.push({ learnerId: l.id, badge: BADGES[3], day: dls[4].day });
  }

  // --- finalise activity days
  for (let i = 0; i < learners.length; i++) {
    const t = Array.from(new Set(activityToday[i])).sort((a, b) => a - b);
    activityToday[i] = t;
    activityProposed[i] = Array.from(new Set([...t, ...activityProposed[i]])).sort((a, b) => a - b);
  }

  return {
    courses,
    lessons,
    quizzes,
    questions,
    resources,
    learners,
    enrolments,
    attempts,
    resEvents,
    anon,
    lessonVideos,
    recStats,
    surveys,
    reviews,
    followUps,
    copMemberMonths,
    copCommunityMonths,
    copSurveys,
    copCoCreated,
    tutorConvs,
    platformSurveys,
    resFeedback,
    searches,
    gateMonths,
    traffic,
    l5,
    badges,
    followUpCourses: [FOLLOWUP_6M, FOLLOWUP_12M],
    activityToday,
    activityProposed,
  };
}

export const DATA: Dataset = generate();
