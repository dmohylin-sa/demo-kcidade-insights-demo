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

export const OCCUPATIONS = [
  'Social worker',
  'Teacher / educator',
  'Community facilitator',
  'NGO staff',
  'Health professional',
  'Public administration',
  'Student',
  'Volunteer',
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

export const ORGANISATIONS = [
  'Associação Raízes',
  'Centro Comunitário Horizonte',
  'Rede Social Local Norte',
  'IPSS Bem-Estar',
  'Cooperativa Social Ponte',
  'Escola Básica do Vale',
  'Associação Juvenil Elo',
  'Junta de Freguesia Sul',
  'Fundação Comunidade Viva',
] as const;

export const DEVICES = ['Desktop', 'Mobile', 'Tablet'] as const;

export const CAROUSELS = [
  'Courses',
  'Documents',
  'Instructional videos',
  'Podcasts',
  '360 videos',
  'Microlearning',
] as const;

export const ASPECTS = ['Structure', 'Relevance', 'Quality', 'Practical usefulness'] as const;

export const INDICATORS = [
  'I use what I learned in my work',
  'My professional practice has improved',
  'Services I deliver to the community have improved',
  'My organisation has changed how it works',
] as const;

export const INDICATOR_SHORT = ['Use in work', 'Practice improved', 'Community services', 'Organisation changed'] as const;

export const WAVES = ['At completion', '6 months', '12 months'] as const;

export const COMMUNITIES = [
  { id: 0, name: 'Community Facilitators Network', areaId: 0 },
  { id: 1, name: 'Early Childhood Practitioners', areaId: 1 },
  { id: 2, name: 'Youth Workers Circle', areaId: 2 },
  { id: 3, name: 'Active Ageing Network', areaId: 4 },
  { id: 4, name: 'M&E Practitioners', areaId: 5 },
] as const;
