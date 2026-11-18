// Invented catalogue, shaped like the real platform: learning areas (akfthemes),
// topics (topic), content languages (akflanguages), LearnDash courses and the five
// ACF resource types plus Download Manager packages. No real titles are used.

export interface Area {
  id: number;
  name: string;
}

export interface Topic {
  id: number;
  areaId: number;
  name: string;
  /** relative share of learners who pick it as an interest */
  demand: number;
}

export const AREAS: Area[] = [
  { id: 0, name: 'Community development' },
  { id: 1, name: 'Early childhood & family' },
  { id: 2, name: 'Education & youth' },
  { id: 3, name: 'Employability & income' },
  { id: 4, name: 'Active ageing' },
  { id: 5, name: 'Organisational strengthening' },
  { id: 6, name: 'Inclusion & citizenship' },
];

export const TOPICS: Topic[] = [
  { id: 0, areaId: 0, name: 'Participatory diagnosis', demand: 0.8 },
  { id: 1, areaId: 0, name: 'Community mobilisation', demand: 0.6 },
  { id: 2, areaId: 0, name: 'Local partnerships', demand: 0.45 },
  { id: 3, areaId: 1, name: 'Parenting support', demand: 0.7 },
  { id: 4, areaId: 1, name: 'Early learning', demand: 0.5 },
  { id: 5, areaId: 1, name: 'Child protection', demand: 0.55 },
  { id: 6, areaId: 2, name: 'School engagement', demand: 0.4 },
  { id: 7, areaId: 2, name: 'Youth participation', demand: 0.6 },
  { id: 8, areaId: 2, name: 'Non-formal education', demand: 0.45 },
  { id: 9, areaId: 3, name: 'Employability skills', demand: 0.65 },
  { id: 10, areaId: 3, name: 'Social entrepreneurship', demand: 0.55 },
  { id: 11, areaId: 3, name: 'Financial literacy', demand: 0.4 },
  { id: 12, areaId: 4, name: 'Active ageing', demand: 0.5 },
  { id: 13, areaId: 4, name: 'Caregiver support', demand: 0.95 },
  { id: 14, areaId: 4, name: 'Intergenerational projects', demand: 0.35 },
  { id: 15, areaId: 5, name: 'Project management', demand: 0.6 },
  { id: 16, areaId: 5, name: 'Monitoring & evaluation', demand: 0.9 },
  { id: 17, areaId: 5, name: 'Fundraising & governance', demand: 0.6 },
  { id: 18, areaId: 6, name: 'Intercultural mediation', demand: 0.55 },
  { id: 19, areaId: 6, name: 'Migrant integration', demand: 0.5 },
];

export const CONTENT_LANGS = ['Portuguese', 'English', 'Nepali', 'Bengali', 'Urdu', 'Mandarin'] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

export const RES_TYPES = [
  'Document',
  'Instructional video',
  'Podcast',
  '360 video',
  'Microlearning',
  'Download package',
] as const;
export type ResType = (typeof RES_TYPES)[number];

export const QTYPES = [
  'Single choice',
  'Multiple choice',
  'Fill in the blank',
  'Sorting',
  'Matrix sorting',
  'Free text',
  'Essay',
] as const;
export type QType = (typeof QTYPES)[number];

/** LearnDash / WP-Pro-Quiz answer_type values, shown in the presenter notes */
export const QTYPE_KEY: Record<QType, string> = {
  'Single choice': 'single',
  'Multiple choice': 'multiple',
  'Fill in the blank': 'cloze_answer',
  Sorting: 'sort_answer',
  'Matrix sorting': 'matrix_sort_answer',
  'Free text': 'free_answer',
  Essay: 'essay',
};

/** Level 1: profession or role, as listed in the client's M&E framework */
export const OCCUPATIONS = [
  'Social worker',
  'Teacher',
  'Community development technician',
  'Public-service staff',
  'Trainer',
  'OSC leader',
  'Student',
  'Other',
] as const;

export const WORK_AREAS = [
  'Social action',
  'Education',
  'Health',
  'Employment',
  'Community development',
  'Culture & leisure',
  'Other',
] as const;

export const AGE_GROUPS = ['15-30', '31-64', '65+'] as const;
export const GENDERS = ['Female', 'Male', 'Other'] as const;
export const NOT_ANSWERED = 'Not answered';

/** Level 1: institution type (required at registration in the proposal) */
export const INST_TYPES = ['OSC', 'Municipality', 'School', 'Public service', 'University', 'Other', 'None'] as const;

/** Level 1: institution name (optional). Invented names. */
export const INSTITUTIONS: { name: string; type: (typeof INST_TYPES)[number] }[] = [
  { name: 'Associação Raízes', type: 'OSC' },
  { name: 'Centro Comunitário Horizonte', type: 'OSC' },
  { name: 'Rede Social Local Norte', type: 'Municipality' },
  { name: 'IPSS Bem-Estar', type: 'OSC' },
  { name: 'Cooperativa Social Ponte', type: 'OSC' },
  { name: 'Escola Básica do Vale', type: 'School' },
  { name: 'Associação Juvenil Elo', type: 'OSC' },
  { name: 'Junta de Freguesia Sul', type: 'Municipality' },
  { name: 'Fundação Comunidade Viva', type: 'OSC' },
];
export const ORGANISATIONS = INSTITUTIONS.map((i) => i.name);

/** Level 1: location, district and municipality, never an address */
export const TERRITORIES: { district: string; municipality: string; w: number }[] = [
  { district: 'Lisboa', municipality: 'Lisboa', w: 17 },
  { district: 'Lisboa', municipality: 'Amadora', w: 14 },
  { district: 'Lisboa', municipality: 'Sintra', w: 12 },
  { district: 'Lisboa', municipality: 'Loures', w: 8 },
  { district: 'Lisboa', municipality: 'Odivelas', w: 6 },
  { district: 'Lisboa', municipality: 'Oeiras', w: 5 },
  { district: 'Lisboa', municipality: 'Cascais', w: 4 },
  { district: 'Setúbal', municipality: 'Almada', w: 6 },
  { district: 'Setúbal', municipality: 'Seixal', w: 4 },
  { district: 'Setúbal', municipality: 'Barreiro', w: 3 },
  { district: 'Porto', municipality: 'Porto', w: 7 },
  { district: 'Porto', municipality: 'Matosinhos', w: 3 },
  { district: 'Coimbra', municipality: 'Coimbra', w: 4 },
  { district: 'Faro', municipality: 'Faro', w: 3 },
  { district: 'Braga', municipality: 'Braga', w: 4 },
];
export const DISTRICTS = Array.from(new Set(TERRITORIES.map((t) => t.district)));
export const MUNICIPALITIES = TERRITORIES.map((t) => t.municipality);

/** Level 1 profile prompts, asked later in the personal area */
export const EXPERIENCE = ['Under 2 years', '2-5 years', '6-10 years', 'Over 10 years'] as const;
export const EDUCATION = ['Secondary or less', 'Bachelor', 'Master or higher'] as const;
export const FOUND_VIA = ['Partner organisation', 'University', 'Colleague', 'Social media', 'Search engine', 'Event'] as const;

/** intended audiences per role, set by the D&I team (invented targets for the demo) */
export const ROLE_TARGETS: Record<string, number> = {
  'Social worker': 0.2,
  Teacher: 0.15,
  'Community development technician': 0.15,
  'Public-service staff': 0.12,
  Trainer: 0.1,
  'OSC leader': 0.12,
  Student: 0.1,
  Other: 0.06,
};
export const INST_TARGETS: Record<string, number> = {
  OSC: 0.35,
  Municipality: 0.15,
  School: 0.15,
  'Public service': 0.15,
  University: 0.1,
  Other: 0.05,
  None: 0.05,
};
export const DISTRICT_TARGETS: Record<string, number> = { Lisboa: 0.55, Setúbal: 0.15, Porto: 0.15, Coimbra: 0.05, Faro: 0.05, Braga: 0.05 };

export const DEVICES = ['Laptop', 'Mobile', 'Tablet', 'VR headset'] as const;

export const CAROUSELS = [
  'Courses',
  'Documents',
  'Instructional videos',
  'Podcasts',
  '360 videos',
  'Microlearning',
] as const;

/** Level 3: the end-of-course survey items on a 1-5 scale */
export const ASPECTS = ['Quality', 'Fits my work', 'Increased my understanding'] as const;

/** Level 3: the six-monthly platform survey (1-5 unless stated) */
export const PLATFORM_ITEMS = [
  { key: 'variety', text: 'The variety of courses and resources covers what I need', short: 'Variety covers my needs', group: 'Learning' },
  { key: 'quality', text: 'The quality of the resources overall is good', short: 'Quality of resources', group: 'Learning' },
  { key: 'access', text: 'It is easy to find and open resources, including on my phone and with weak internet', short: 'Easy to find and open', group: 'Learning' },
  { key: 'paths', text: 'The learning paths suggested to me match the interests I gave at registration', short: 'Suggestions match my interests', group: 'Learning' },
  { key: 'tutorUseful', text: "The tutor's answers were useful", short: 'Tutor answers useful', group: 'Virtual Tutor' },
  { key: 'tutorRelevant', text: "The tutor's suggestions were relevant, and detailed enough to act on", short: 'Tutor suggestions actionable', group: 'Virtual Tutor' },
  { key: 'tutorReflect', text: 'The tutor helped me think the problem through rather than just giving me the answer', short: 'Tutor encourages reflection', group: 'Virtual Tutor' },
  { key: 'lessAlone', text: 'The platform makes me feel less alone in my professional practice', short: 'Feel less alone', group: 'Communities of Practice' },
  { key: 'discussions', text: 'The community discussions are useful for my work', short: 'Community discussions useful', group: 'Communities of Practice' },
] as const;
export type PlatformItemKey = (typeof PLATFORM_ITEMS)[number]['key'];

export const TUTOR_MODES = ['Text', 'Voice'] as const;
export const MODE_PREFS = ['Text', 'Voice', 'Both', "I don't use it"] as const;

export const QUESTION_GROUPS = [
  'Applying a method to a real case',
  'Clarifying a concept',
  'Finding a resource',
  'Planning a session or activity',
  'Difficult situations at work',
  'Quizzes and certificates',
  'Platform and technical help',
] as const;

/** topics learners ask the tutor or search for, with no matching resource (invented) */
export const UNMATCHED_TOPICS = [
  'Working with interpreters',
  'Burnout and self-care for practitioners',
  'Respite care for family carers',
  'Funding applications for small OSCs',
  'Digital safety for teenagers',
  'Data protection in community projects',
  'Domestic violence: first response',
] as const;

/** Level 4: use in work, as asked at 6 and 12 months */
export const USE_LEVELS = ['Often', 'Sometimes', 'Not yet', 'No'] as const;
export const BARRIERS = ['Time', 'Resources', 'Management support', 'Fit with my context', 'Other'] as const;
export const FOLLOWUP_WAVES = ['+6 months', '+12 months'] as const;

/** Level 4 outcome questions (yes / no), with the wave they are asked in */
export const OUTCOMES = [
  { key: 'tried', label: 'Tried what they planned', waves: [0] },
  { key: 'shared', label: 'Shared it with colleagues or their team', waves: [0, 1] },
  { key: 'still', label: 'Still applying it', waves: [1] },
  { key: 'orgChange', label: 'Organisation changed a practice or service', waves: [1] },
  { key: 'community', label: 'Made a difference to the people they work with', waves: [1] },
] as const;
export type OutcomeKey = (typeof OUTCOMES)[number]['key'];

/** Layer 5: methods and indicators, as in the framework */
export const L5_METHODS = [
  'Focus group',
  'Semi-structured interview',
  'Manager questionnaire',
  'Trainer report',
  'Case study',
  'Feedback from people served',
] as const;
export const L5_INDICATORS = ['Quality', 'Effectiveness', 'Adequacy', 'Spread', 'Sustainability', 'Equity and inclusion', 'Participation'] as const;

/** kept for the old indicator names in presenter notes */
export const INDICATORS = OUTCOMES.map((o) => o.label);

export const WAVES = FOLLOWUP_WAVES;

export const COMMUNITIES = [
  { id: 0, name: 'Community Facilitators Network', areaId: 0 },
  { id: 1, name: 'Early Childhood Practitioners', areaId: 1 },
  { id: 2, name: 'Youth Workers Circle', areaId: 2 },
  { id: 3, name: 'Active Ageing Network', areaId: 4 },
  { id: 4, name: 'M&E Practitioners', areaId: 5 },
] as const;
