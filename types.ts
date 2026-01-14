export interface Hub {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string;
  description: string;
  pages: string[];
}

export interface AppWindow {
  id: string;
  hubId: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  lastBounds?: { x: number; y: number; width: number; height: number };
  activePage?: string; 
  navigationState?: Record<string, any>; // Generic state for app internal navigation (e.g., selectedClientId)
  noteData?: { clientId?: string; noteId?: string }; // Specific for note editor
  zIndex: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Client {
  id: string;
  preferredName: string;
  legalName?: string;
  status: 'Active' | 'Closed';
  intakeDate: string;
  lastUpdated: string;
  fullProfile: Record<string, any>;
}

export interface ClientActivity {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  clientName?: string;
}

export interface OSActivity {
  id: string;
  timestamp: Date;
  type: string;
  target?: string;
  description: string;
}

export interface Note {
  id: string;
  type: 'client' | 'general';
  linkedClient?: string;
  title?: string;
  body?: string;
  date: string;
  summary: string;
  nextSteps?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  dueDate?: string;
  linkedClient?: string;
  notes?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  category: 'Shelters' | 'County Agencies' | 'Housing Partners' | 'Legal Aid';
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  referralProcess?: string;
  notes?: string;
}

export interface IntakeSession {
    id: string;
    status: 'In Progress' | 'Submitted' | 'Approved' | 'Cancelled';
    answers: Record<string, any>;
    linkedClientId?: string;
    createdAt: string;
}

// --- Event System Types ---

export interface OSEvent {
  type: string;
  source: string;
  payload: any;
  timestamp?: string;
}

export interface OSState {
  windows: {
    byID: Record<string, AppWindow>;
    order: string[]; // Window IDs sorted by Z-index (last is top)
    focusedWindowID: string | null;
  };
  dock: {
    pinnedAppIDs: string[];
    runningAppIDs: string[];
  };
  data: {
    clients: Record<string, Client>;
    notes: Record<string, Note>;
    tasks: Record<string, Task>;
    partners: Record<string, Partner>;
    intakes: Record<string, IntakeSession>;
  };
  system: {
    layout: {
      desktopWidth: number;
      desktopHeight: number;
    };
    overlays: {
      blurActive: boolean;
      activeModalWindowID: string | null;
    };
    launcherOpen: boolean;
    chatOpen: boolean;
    weeklyNotes: string;
  };
  logging: {
    events: OSEvent[];
    activities: OSActivity[];
  };
}