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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface WidgetData {
  title: string;
  type: 'list' | 'stat' | 'text' | 'chart';
  data: any;
}

export interface Client {
  id: string;
  preferredName: string;
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