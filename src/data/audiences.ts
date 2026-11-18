// The audiences in the client's framework: what each one sees, decides, how often,
// at which level of detail, and the saved view the demo opens for it.

import type { Filters } from '../lib/store';
import type { PageKey } from './registry';

export type AudienceKey = 'platform' | 'area' | 'leadership' | 'funder' | 'partner' | 'municipality';

export interface Audience {
  key: AudienceKey;
  name: string;
  /** the label of the saved view in the filter row */
  view: string;
  sees: string;
  decides: string;
  rhythm: string;
  detail: string;
  filters: Partial<Filters>;
  start: PageKey;
  screens: PageKey[];
  /** needs a new profile field (institution or territory): not available in today's data */
  proposedOnly?: boolean;
}

export const AUDIENCES: Audience[] = [
  {
    key: 'platform',
    name: 'Platform team',
    view: 'Platform team',
    sees: 'Active learners, return, completion, gate conversion, devices, content gaps',
    decides: 'What to fix, build or promote',
    rhythm: 'Weekly',
    detail: 'Individual learners, with a separate permission',
    filters: { period: '30d' },
    start: 'overview',
    screens: ['overview', 'access', 'courses', 'gaps'],
  },
  {
    key: 'area',
    name: 'Area leads (seven learning areas)',
    view: 'Area lead: Early childhood & family',
    sees: "Their courses and resources: use, quiz results, feedback, learners' questions",
    decides: 'Which content to add, revise or retire',
    rhythm: 'Monthly',
    detail: 'Aggregates',
    filters: { period: '30d', area: 1 },
    start: 'courses',
    screens: ['courses', 'quizzes', 'materials', 'feedback', 'gaps'],
  },
  {
    key: 'leadership',
    name: 'AKF leadership and D&I team',
    view: 'AKF leadership and D&I team',
    sees: 'All five layers against targets, with the triangulation summary',
    decides: 'Strategy, priorities, investment',
    rhythm: 'Quarterly',
    detail: 'Aggregates',
    filters: { period: '90d' },
    start: 'overview',
    screens: ['overview', 'impact', 'triangulation', 'evidence'],
  },
  {
    key: 'funder',
    name: 'Funders of the platform',
    view: 'Funder report',
    sees: 'Reach by segment, engagement, satisfaction, practice change, case stories',
    decides: 'Continued funding; accountability',
    rhythm: "Each funder's reporting cycle",
    detail: 'Aggregates, as an exported report',
    filters: { period: '12m' },
    start: 'learners',
    screens: ['learners', 'overview', 'feedback', 'impact', 'triangulation'],
  },
  {
    key: 'partner',
    name: 'Partner OSCs and universities',
    view: 'Partner: Associação Raízes',
    sees: "Their own staff's participation and feedback",
    decides: 'Staff development; partnership',
    rhythm: 'Each semester or on request',
    detail: 'Aggregates for their institution only',
    filters: { period: '6m', org: 'Associação Raízes' },
    start: 'learners',
    screens: ['learners', 'courses', 'feedback', 'impact'],
    proposedOnly: true,
  },
  {
    key: 'municipality',
    name: 'Municipalities',
    view: 'Municipality: Amadora',
    sees: 'Learners and outcomes in their territory',
    decides: 'Local training plans',
    rhythm: 'Yearly',
    detail: 'Aggregates per municipality',
    filters: { period: '12m', municipality: 'Amadora' },
    start: 'learners',
    screens: ['learners', 'courses', 'impact'],
    proposedOnly: true,
  },
];

export const LEARNER_AUDIENCE = {
  name: 'Learners',
  sees: 'Their own progress, badges, certificates and answers',
  decides: 'Their own learning path',
  rhythm: 'Always',
  detail: 'Their own data only, in their personal area (not in this admin app)',
};

/** groups smaller than this are hidden in reports, so no learner can be identified */
export const MIN_GROUP = 10;
