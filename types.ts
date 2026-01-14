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
  fullProfile: Record<string, any>; // Stores detailed profile sections
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
  linkedClient?: string; // ID
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
  linkedClient?: string; // ID
  notes?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPanelData {
  priorities: string[]; // Task IDs
  urgentFollowUps: string[]; // Task IDs
  weeklyNotes: string;
}
