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
