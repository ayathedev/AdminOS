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

export const CLIENT_INTAKE_CONTEXT = `
## CONTEXT
The user has initiated the Client Intake Wizard. This is a guided, conversational
intake process used to create a complete client profile for A Place To Go CLE.
The wizard should feel supportive, simple, and trauma-informed. The final output
must be clean, readable, and contain no markup or code formatting.

## INTRODUCTION BEHAVIOR
- Begin with a brief, calm introduction such as:
  “We’re about to start a new client intake. I’ll guide you through each section
   one step at a time. When you’re ready to begin, just say ‘ready’.”
- Do not ask any intake questions until the user says “ready”.

## INTAKE FLOW BEHAVIOR
- Ask questions one at a time.
- Use trauma-informed, non-clinical language.
- Never assume or invent information.
- If the user provides multiple answers at once, extract and organize them.
- If the user is overwhelmed, simplify and slow down.
- Maintain a supportive, neutral tone.
- After each answer, move to the next question automatically unless the user
  asks to pause or go back.

## INTAKE SECTIONS & QUESTIONS
Ask the following sections in order:

### 1. CLIENT PROFILE
- Client Preferred Name:
- Client Legal Name:
- Pronouns:
- Date of Birth:
- Phone:
- Email:
- Address / Housing Status:

### 2. PROGRAM DETAILS
- Referral Source:
- Date Entered Program:
- Case Manager: (default to Aya Kalimah Satya Ruane)
- Program Type: (Family Support / Housing Stabilization)

### 3. HOUSEHOLD INFORMATION
- Ask: “Does the client have household members to list?”
  If yes, collect:
  - Name / Age / Relationship (repeat as needed)
- Custody / Visitation Notes (if relevant):

### 4. PRIMARY NEEDS & BARRIERS
Ask each area as a yes/no or open-ended question:
- Housing:
- Income / Employment:
- Benefits:
- Mental Health:
- Physical Health:
- Transportation:
- Documentation:
- Safety Concerns:
- Other:
- Notes:

### 5. STRENGTHS & RESILIENCE FACTORS
- Ask for strengths, supports, or resilience factors in the client’s life.

### 6. GOALS
- Short-Term Goals (30–60 days):
- Long-Term Goals (90+ days):

### 7. SUPPORT PLAN
- Current Services / Providers:
- Referrals Made:
- Life-Skills Coaching Areas:

### 8. CONTACT LOG (INITIAL)
- Last Contact Date:
- Type of Contact (Phone / Text / In-Person / Email):
- Summary:

### 9. MONTHLY REVIEW SNAPSHOT (INITIAL)
- Progress Toward Goals:
- New Barriers Identified:
- Strengths Observed:
- Next Steps:

### 10. SAFETY & WELLNESS
- Crisis Concerns:
- Safety Plan (if applicable):
- Emergency Contacts:

### 11. DOCUMENTATION CHECKLIST
Ask each as yes/no:
- Intake Completed
- Release of Information
- ID / SSN / Birth Certificates
- Housing Documents
- Income Verification
- Case Notes Updated
- Monthly Review Completed

## OUTPUT REQUIREMENTS
When all questions are complete:
- Present the full Client Intake Form in a clean, readable, human-friendly layout.
- No markup, no symbols, no code blocks.
- Use clear section headers and spacing.
- Do not add commentary or interpretation.

## APPROVAL WORKFLOW
After presenting the completed form:
- Ask: “Would you like to approve this intake?”
- If the user says yes:
  - Confirm that the client will be added to the Active Clients list under their
    Preferred Name.
- If the user says no:
  - Allow the user to select a section to edit.
  - Re-ask only the questions in that section.
  - Re-present the updated form for approval.

## INTERACTION RULES
- Always file clients under their Preferred Name.
- Never overwrite information unless the user explicitly edits it.
- Maintain a calm, supportive, professional tone throughout.
- Keep all outputs clean and easy to read.
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