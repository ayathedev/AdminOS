import { Hub } from './types';

export const SYSTEM_PROMPT = `
## ROLE
You are the "Administrative OS", a unified operating system for a small, trauma-informed nonprofit.
You function as a supportive, executive-functioning partner to the founder.
Your tone is calm, professional, trauma-informed, and structured.

## HUBS
You manage 10 hubs:
1. Command Center
2. Client & Case Management
3. Programs & Service Delivery
4. Partnerships & Collaboration
5. Funding, Grants & Admin
6. Policies, Templates & SOPs
7. Meetings, Supervision & Training
8. Strategic Vision & Growth
9. Personal Executive Function Support
10. Archive

## BEHAVIOR
- Ask clarifying questions if info is missing.
- Never invent client/financial data.
- Use structured outputs (bullets, tables, headers).
- Summarize without assumptions.
- Do not give legal/medical advice.

When the user sends a message, classify it into a Hub if possible, and provide the relevant output (workflow, email draft, strategy, list, etc.).
`;

export const HUBS: Hub[] = [
  {
    id: 'command',
    name: 'Command Center',
    icon: 'LayoutDashboard',
    color: 'bg-blue-500',
    description: 'Daily operations and prioritization.',
    pages: ['Control Panel', 'Priorities', 'Urgent Follow-Ups', 'Weekly Overview']
  },
  {
    id: 'clients',
    name: 'Clients',
    icon: 'Users',
    color: 'bg-teal-500',
    description: 'Manage client info, safety notes, and goals.',
    pages: ['Active Clients', 'Closed Clients', 'Crisis Contacts', 'Intake Forms']
  },
  {
    id: 'programs',
    name: 'Programs',
    icon: 'BookOpen',
    color: 'bg-indigo-500',
    description: 'Program logic, workflows, and protocols.',
    pages: ['Stabilization', 'Crisis Navigation', 'Drop-In Support', 'SOPs']
  },
  {
    id: 'partnerships',
    name: 'Partnerships',
    icon: 'Handshake',
    color: 'bg-rose-500',
    description: 'Relationships, referrals, and collaboration.',
    pages: ['Shelters', 'County Agencies', 'Housing Partners', 'Legal Aid']
  },
  {
    id: 'funding',
    name: 'Funding',
    icon: 'PiggyBank',
    color: 'bg-emerald-600',
    description: 'Grants, budgets, and donor tracking.',
    pages: ['Grant Pipeline', 'Current Grants', 'Budgets', 'Donations']
  },
  {
    id: 'policies',
    name: 'Policies',
    icon: 'FileText',
    color: 'bg-slate-600',
    description: 'Templates, SOPs, and frameworks.',
    pages: ['Templates', 'Ethics', 'Safety Plans', 'Guidelines']
  },
  {
    id: 'meetings',
    name: 'Meetings',
    icon: 'CalendarDays',
    color: 'bg-violet-500',
    description: 'Coordination, supervision, and training.',
    pages: ['Team Meetings', 'Supervision', 'Consultations']
  },
  {
    id: 'strategy',
    name: 'Strategy',
    icon: 'Map',
    color: 'bg-amber-500',
    description: 'Long-term vision and growth.',
    pages: ['Vision', 'Expansion', 'Needs Assessment']
  },
  {
    id: 'personal',
    name: 'Personal EF',
    icon: 'Brain',
    color: 'bg-pink-500',
    description: 'Cognitive support and task triage.',
    pages: ['Brain Dump', 'Task Triage', 'Scripts', 'Burnout Prevention']
  },
  {
    id: 'archive',
    name: 'Archive',
    icon: 'Archive',
    color: 'bg-gray-500',
    description: 'Inactive items and history.',
    pages: ['Old Clients', 'Past Grants', 'History']
  }
];

export const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Grant Report Due', time: '2h ago', urgent: true },
  { id: 2, title: 'New Referral: J. Doe', time: '4h ago', urgent: false },
  { id: 3, title: 'Team Meeting at 2pm', time: '5h ago', urgent: false },
];

export const MOCK_TASKS = [
  { id: 1, text: 'Review intake for Sarah M.', done: false },
  { id: 2, text: 'Email County Rep regarding housing voucher', done: true },
  { id: 3, text: 'Update expense log for Q1', done: false },
];
