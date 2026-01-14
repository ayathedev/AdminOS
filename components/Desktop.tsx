import React, { useState, useEffect, useRef, useReducer } from 'react';
import { 
  Wifi, Battery, Bell, Search, LayoutGrid, 
  X, Minus, Square, Send, Maximize2, Minimize2,
  Calendar as CalendarIcon, CheckSquare, Activity, User, 
  PlusCircle, FileText, ClipboardList, Clock as ClockIcon, ArrowLeft,
  ChevronRight, MoreHorizontal, Pencil, Save, XCircle,
  Minimize, RotateCcw, AlertCircle, CalendarDays, CheckCircle2, Circle,
  Filter, Check, Handshake, MapPin, Phone, Mail, Globe, Trash2,
  Sparkles, Pin, PinOff, StickyNote, UserPlus, MessageSquare
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { HUBS, MOCK_NOTIFICATIONS, MOCK_TASKS, CLIENT_INTAKE_CONTEXT, DEFAULT_CLIENT, INITIAL_PARTNERS } from '../constants';
import { Hub, AppWindow, ChatMessage, Client, ClientActivity, OSActivity, Note, Task, Partner, OSState, OSEvent, IntakeSession } from '../types';
import { generateOSResponse } from '../services/geminiService';

// --- Icon Helper ---
const IconComponent = ({ name, className }: { name: string, className?: string }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

// --- Utilities ---
const generateID = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const nowISO = () => new Date().toISOString();

// --- Layout Constants ---
const LAYOUT = {
  MARGIN: 16,
  GRID: 8,
  TOP_BAR_HEIGHT: 48,
  DOCK_HEIGHT: 72, 
};

// --- Initial State ---
const initialState: OSState = {
  windows: { byID: {}, order: [], focusedWindowID: null },
  dock: { pinnedAppIDs: ['command', 'clients', 'partnerships'], runningAppIDs: [] },
  data: {
    clients: { [DEFAULT_CLIENT.id]: DEFAULT_CLIENT },
    notes: {},
    tasks: MOCK_TASKS.reduce((acc, t) => ({ ...acc, [t.id]: t }), {} as Record<string, Task>),
    partners: INITIAL_PARTNERS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Partner>),
    intakes: {}
  },
  system: {
    layout: {
       desktopWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
       desktopHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    },
    overlays: { blurActive: false, activeModalWindowID: null },
    launcherOpen: false,
    chatOpen: false,
    weeklyNotes: "Focus on grant reporting and hiring plan."
  },
  logging: {
    events: [],
    activities: [{ id: 'os-init', timestamp: new Date(), type: 'System', description: 'OS Booted Successfully', target: 'System' }]
  },
};

// --- Handlers (Pure Functions) ---

// Helpers
const logActivity = (state: OSState, type: string, description: string, target?: string): OSState => ({
   ...state,
   logging: {
      ...state.logging,
      activities: [{ id: generateID('act'), timestamp: new Date(), type, description, target }, ...state.logging.activities]
   }
});

const handleSystemResize = (state: OSState, payload: { width: number, height: number }): OSState => {
   return {
      ...state,
      system: {
         ...state.system,
         layout: {
            desktopWidth: payload.width,
            desktopHeight: payload.height
         }
      }
   };
};

const handleWindowOpen = (state: OSState, payload: any): OSState => {
  const { appID, initialPage, extraState } = payload;
  const hub = HUBS.find(h => h.id === appID) || { id: appID, name: appID === 'note-editor' ? 'Note Editor' : (appID === 'intake-wizard' ? 'Intake Wizard' : appID), icon: 'Square', color: 'bg-gray-500', pages: [], description: '' };
  
  const newWindowID = generateID('win');
  const isModal = appID === 'note-editor' || appID === 'intake-wizard';
  
  const { desktopWidth, desktopHeight } = state.system.layout;

  // Default dimensions
  const defaultWidth = appID === 'note-editor' ? 520 : (appID === 'intake-wizard' ? 600 : 960);
  const defaultHeight = appID === 'note-editor' ? 420 : (appID === 'intake-wizard' ? 700 : 640);

  let position = { x: LAYOUT.MARGIN * 2, y: LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN * 2 };

  if (isModal) {
     position = { 
        x: Math.max(LAYOUT.MARGIN, (desktopWidth - defaultWidth) / 2), 
        y: Math.max(LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN, (desktopHeight - defaultHeight) / 2) 
     };
  } else {
     // Stagger logic
     const lastWindowID = state.windows.order.length > 0 ? state.windows.order[state.windows.order.length - 1] : null;
     const lastWindow = lastWindowID ? state.windows.byID[lastWindowID] : null;

     if (lastWindow && !lastWindow.isMaximized && !lastWindow.isMinimized) {
        position = { x: lastWindow.position.x + 32, y: lastWindow.position.y + 32 };
     }

     // Wrap logic
     if (position.x + defaultWidth > desktopWidth - LAYOUT.MARGIN || 
         position.y + defaultHeight > desktopHeight - LAYOUT.DOCK_HEIGHT - LAYOUT.MARGIN) {
         position = { x: LAYOUT.MARGIN * 2, y: LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN * 2 };
     }
  }

  // Final Snap to Grid
  position.x = Math.round(position.x / LAYOUT.GRID) * LAYOUT.GRID;
  position.y = Math.round(position.y / LAYOUT.GRID) * LAYOUT.GRID;

  const newWindow: AppWindow = {
    id: newWindowID,
    hubId: appID,
    title: extraState?.title || hub.name,
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: isModal ? 9999 : state.windows.order.length + 10,
    position,
    size: { width: defaultWidth, height: defaultHeight },
    activePage: initialPage || (hub.pages ? hub.pages[0] : undefined),
    ...extraState
  };

  const newRunning = state.dock.runningAppIDs.includes(appID) ? state.dock.runningAppIDs : [...state.dock.runningAppIDs, appID];
  const newOverlays = isModal ? { blurActive: true, activeModalWindowID: newWindowID } : state.system.overlays;

  const newState = {
    ...state,
    windows: { 
       byID: { ...state.windows.byID, [newWindowID]: newWindow }, 
       order: [...state.windows.order, newWindowID], 
       focusedWindowID: newWindowID 
    },
    dock: { ...state.dock, runningAppIDs: newRunning },
    system: { ...state.system, overlays: newOverlays }
  };
  return logActivity(newState, 'System', `Opened ${hub.name}`, 'WindowManager');
};

const handleWindowClose = (state: OSState, payload: any): OSState => {
  const { windowID } = payload;
  const win = state.windows.byID[windowID];
  if (!win) return state;

  const { [windowID]: _, ...remainingByID } = state.windows.byID;
  const newOrder = state.windows.order.filter(id => id !== windowID);
  
  const newFocused = newOrder.length > 0 ? newOrder[newOrder.length - 1] : null;

  const appID = win.hubId;
  const hasOtherWindows = Object.values(remainingByID).some(w => w.hubId === appID);
  const newRunning = hasOtherWindows ? state.dock.runningAppIDs : state.dock.runningAppIDs.filter(id => id !== appID);

  let newOverlays = state.system.overlays;
  if (state.system.overlays.activeModalWindowID === windowID) {
    newOverlays = { blurActive: false, activeModalWindowID: null };
  }

  const newState = {
    ...state,
    windows: { byID: remainingByID, order: newOrder, focusedWindowID: newFocused },
    dock: { ...state.dock, runningAppIDs: newRunning },
    system: { ...state.system, overlays: newOverlays }
  };
  return logActivity(newState, 'System', `Closed ${win.title}`, 'WindowManager');
};

const handleWindowMinimize = (state: OSState, payload: any): OSState => {
  const { windowID } = payload;
  const win = state.windows.byID[windowID];
  if (!win) return state;
  
  let newFocused = state.windows.focusedWindowID;
  if (state.windows.focusedWindowID === windowID) {
      const visibleWindows = state.windows.order.filter(id => id !== windowID && !state.windows.byID[id].isMinimized);
      newFocused = visibleWindows.length > 0 ? visibleWindows[visibleWindows.length - 1] : null;
  }

  const newState = {
    ...state,
    windows: { 
       ...state.windows, 
       byID: { ...state.windows.byID, [windowID]: { ...win, isMinimized: true } },
       focusedWindowID: newFocused
    }
  };
  return logActivity(newState, 'System', `Minimized ${win.title}`, 'WindowManager');
};

const handleWindowRestore = (state: OSState, payload: any): OSState => {
  const { windowID } = payload;
  const win = state.windows.byID[windowID];
  if (!win) return state;

  const newOrder = [...state.windows.order.filter(id => id !== windowID), windowID];
  
  const newState = {
    ...state,
    windows: { 
       ...state.windows, 
       byID: { ...state.windows.byID, [windowID]: { ...win, isMinimized: false } },
       order: newOrder,
       focusedWindowID: windowID
    }
  };
  return logActivity(newState, 'System', `Restored ${win.title}`, 'WindowManager');
};

const handleWindowFocus = (state: OSState, payload: any): OSState => {
  const { windowID } = payload;
  if (!state.windows.byID[windowID]) return state;
  if (state.windows.focusedWindowID === windowID && state.windows.order[state.windows.order.length - 1] === windowID) return state;

  const newOrder = [...state.windows.order.filter(id => id !== windowID), windowID];
  return {
    ...state,
    windows: { ...state.windows, order: newOrder, focusedWindowID: windowID }
  };
};

const handleWindowMaximizeToggle = (state: OSState, payload: any): OSState => {
  const { windowID } = payload;
  const win = state.windows.byID[windowID];
  if (!win) return state;

  const { desktopWidth, desktopHeight } = state.system.layout;
  const isMax = !win.isMaximized;
  
  let updatedWin: AppWindow;

  if (isMax) {
     // Maximize: Save bounds, fill usable area
     updatedWin = {
        ...win,
        isMaximized: true,
        lastBounds: { x: win.position.x, y: win.position.y, width: win.size?.width || 800, height: win.size?.height || 600 },
        position: { x: LAYOUT.MARGIN, y: LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN },
        size: { 
           width: desktopWidth - LAYOUT.MARGIN * 2, 
           height: desktopHeight - LAYOUT.DOCK_HEIGHT - LAYOUT.MARGIN * 2 - LAYOUT.TOP_BAR_HEIGHT
        }
     };
  } else {
     // Unmaximize: Restore bounds
     const lb = win.lastBounds || { x: 100, y: 100, width: 800, height: 600 };
     updatedWin = {
        ...win,
        isMaximized: false,
        position: { x: lb.x, y: lb.y },
        size: { width: lb.width, height: lb.height }
     };
  }

  const newState = {
     ...state,
     windows: { ...state.windows, byID: { ...state.windows.byID, [windowID]: updatedWin } }
  };
  return logActivity(newState, 'System', isMax ? `Maximized ${win.title}` : `Restored ${win.title}`, 'WindowManager');
};

const handleWindowDrag = (state: OSState, payload: any): OSState => {
  const { windowID, x, y } = payload;
  const win = state.windows.byID[windowID];
  if (!win || win.isMaximized) return state;

  const { desktopWidth, desktopHeight } = state.system.layout;
  
  // Drag Boundaries (Clamp)
  let newX = Math.max(LAYOUT.MARGIN, Math.min(x, desktopWidth - LAYOUT.MARGIN - (win.size?.width || 0)));
  let newY = Math.max(LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN, Math.min(y, desktopHeight - LAYOUT.DOCK_HEIGHT - LAYOUT.MARGIN - (win.size?.height || 0)));

  // Grid Snapping
  newX = Math.round(newX / LAYOUT.GRID) * LAYOUT.GRID;
  newY = Math.round(newY / LAYOUT.GRID) * LAYOUT.GRID;

  // Edge Snapping
  if (Math.abs(newX - LAYOUT.MARGIN) < 8) newX = LAYOUT.MARGIN;
  if (Math.abs(newY - (LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN)) < 8) newY = LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN;

  return {
    ...state,
    windows: { ...state.windows, byID: { ...state.windows.byID, [windowID]: { ...win, position: { x: newX, y: newY } } } }
  };
};

// --- Dock Handlers ---
const handleDockIconClick = (state: OSState, payload: any): OSState => {
  const { appID } = payload;
  const openWindows = Object.values(state.windows.byID).filter(w => w.hubId === appID);
  
  if (openWindows.length === 0) return handleWindowOpen(state, { appID });
  
  const minimized = openWindows.filter(w => w.isMinimized);
  if (minimized.length > 0) {
     const lastMinimized = minimized[minimized.length - 1];
     let s = handleWindowRestore(state, { windowID: lastMinimized.id });
     return handleWindowFocus(s, { windowID: lastMinimized.id });
  }

  const lastActive = openWindows[openWindows.length - 1]; 
  return handleWindowFocus(state, { windowID: lastActive.id });
};

const handleDockPinToggle = (state: OSState, payload: any): OSState => {
  const { appID } = payload;
  const isPinned = state.dock.pinnedAppIDs.includes(appID);
  const newPinned = isPinned ? state.dock.pinnedAppIDs.filter(id => id !== appID) : [...state.dock.pinnedAppIDs, appID];
  const newState = { ...state, dock: { ...state.dock, pinnedAppIDs: newPinned } };
  return logActivity(newState, 'System', isPinned ? `Unpinned ${appID}` : `Pinned ${appID}`, 'Dock');
};

// --- Data Handlers ---
const handleNoteSave = (state: OSState, payload: any): OSState => {
  const { mode, noteID, title, body, linkedClientID } = payload;
  const id = noteID || generateID('note');
  
  const newNote: Note = {
    id,
    title: title || "Untitled",
    body,
    summary: body.substring(0, 50) + '...',
    type: linkedClientID ? 'client' : 'general',
    linkedClient: linkedClientID,
    date: nowISO(),
    createdAt: mode === 'create' ? nowISO() : (state.data.notes[id]?.createdAt || nowISO()),
    updatedAt: nowISO()
  };

  let newClients = state.data.clients;
  if (linkedClientID && state.data.clients[linkedClientID]) {
    const client = state.data.clients[linkedClientID];
    const logEntry = { date: nowISO(), type: 'Note', summary: title, nextSteps: '' };
    newClients = { 
       ...newClients, 
       [linkedClientID]: { 
          ...client, 
          fullProfile: { ...client.fullProfile, contactLog: [logEntry, ...(client.fullProfile.contactLog || [])] } 
       } 
    };
  }

  let newState = {
    ...state,
    data: { ...state.data, notes: { ...state.data.notes, [id]: newNote }, clients: newClients }
  };
  newState = logActivity(newState, 'Note', `${mode === 'create' ? 'Created' : 'Updated'} note`, title);
  if (payload.windowID) return handleWindowClose(newState, { windowID: payload.windowID });
  return newState;
};

const handleClientCreateFromIntake = (state: OSState, payload: any): OSState => {
  const { clientData } = payload;
  const client: Client = {
      ...clientData,
      id: generateID('client'),
      status: 'Active',
      lastUpdated: nowISO()
  };

  let newState = {
     ...state,
     data: { ...state.data, clients: { ...state.data.clients, [client.id]: client } }
  };
  newState = logActivity(newState, 'Intake', 'Client created from intake', client.preferredName);
  return handleWindowOpen(newState, { appID: 'clients', extraState: { navigationState: { selectedClientId: client.id } } });
};

const handleIntakeApprove = (state: OSState, payload: any): OSState => {
   const { clientData, windowID } = payload;
   let s = handleClientCreateFromIntake(state, { clientData });
   return handleWindowClose(s, { windowID });
};

// --- Reducer Routing Table ---

const ROUTES: Record<string, (state: OSState, payload: any) => OSState> = {
  WINDOW_OPEN: handleWindowOpen,
  WINDOW_CLOSE: handleWindowClose,
  WINDOW_MINIMIZE: handleWindowMinimize,
  WINDOW_RESTORE: handleWindowRestore,
  WINDOW_FOCUS: handleWindowFocus,
  WINDOW_MAXIMIZE_TOGGLE: handleWindowMaximizeToggle,
  WINDOW_DRAG: handleWindowDrag,
  
  DOCK_ICON_CLICK: handleDockIconClick,
  DOCK_PIN_TOGGLE: handleDockPinToggle,
  
  NOTE_SAVE: handleNoteSave,
  INTAKE_APPROVE: handleIntakeApprove,
  
  SYSTEM_RESIZE: handleSystemResize,

  SIDEBAR_PAGE_CHANGE: (state, { windowID, newPage }) => {
     const win = state.windows.byID[windowID];
     if (!win) return state;
     return {
        ...state,
        windows: { ...state.windows, byID: { ...state.windows.byID, [windowID]: { ...win, activePage: newPage } } }
     };
  },

  NAVIGATE_INTERNAL: (state, { windowID, state: navState }) => {
     const win = state.windows.byID[windowID];
     if (!win) return state;
     return {
        ...state,
        windows: { ...state.windows, byID: { ...state.windows.byID, [windowID]: { ...win, navigationState: { ...win.navigationState, ...navState } } } }
     };
  },

  CLIENT_UPDATE: (state, { client }) => logActivity({
     ...state,
     data: { ...state.data, clients: { ...state.data.clients, [client.id]: client } }
  }, 'Data', `Updated client ${client.preferredName}`),

  TASK_SAVE: (state, { task }) => logActivity({
     ...state,
     data: { ...state.data, tasks: { ...state.data.tasks, [task.id]: task } }
  }, 'Task', `Saved task ${task.title}`),

  SYSTEM_LAUNCHER_TOGGLE: (state) => ({ ...state, system: { ...state.system, launcherOpen: !state.system.launcherOpen } }),
  SYSTEM_CHAT_TOGGLE: (state) => ({ ...state, system: { ...state.system, chatOpen: !state.system.chatOpen } }),
  SYSTEM_WEEKLY_NOTES: (state, { notes }) => ({ ...state, system: { ...state.system, weeklyNotes: notes } }),
};

function osReducer(state: OSState, event: OSEvent): OSState {
  const handler = ROUTES[event.type];
  if (handler) {
     return handler(state, event.payload);
  }
  console.warn(`No handler for event: ${event.type}`);
  return state;
}

// --- Components ---

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return <span className="text-sm font-medium text-gray-600">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
};

const TopBar = () => (
  <div className="h-12 bg-white/80 backdrop-blur-md border-b border-white/50 flex items-center justify-between px-4 fixed top-0 w-full z-50 select-none">
     <div className="flex items-center gap-4">
        <span className="font-bold text-gray-700 tracking-tight">AdminOS</span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
           <span className="hover:text-gray-800 cursor-pointer transition">File</span>
           <span className="hover:text-gray-800 cursor-pointer transition">Edit</span>
           <span className="hover:text-gray-800 cursor-pointer transition">View</span>
        </div>
     </div>
     <div className="flex items-center gap-3">
        <Wifi size={14} className="text-gray-500" />
        <Battery size={14} className="text-gray-500" />
        <Clock />
     </div>
  </div>
);

const NoteEditorContent = ({ linkedClient, clients, onSave, onCancel }: any) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [client, setClient] = useState(linkedClient || '');

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <input 
          className="w-full text-xl font-bold border-b pb-2 outline-none" 
          placeholder="Note Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
        />
        <select 
          className="w-full p-2 border rounded bg-gray-50" 
          value={client} 
          onChange={e => setClient(e.target.value)}
        >
          <option value="">No Linked Client</option>
          {clients.map((c: Client) => (
            <option key={c.id} value={c.id}>{c.preferredName}</option>
          ))}
        </select>
        <textarea 
          className="w-full h-64 p-2 border rounded resize-none outline-none" 
          placeholder="Start typing..." 
          value={body} 
          onChange={e => setBody(e.target.value)} 
        />
      </div>
      <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
        <button onClick={() => onSave({ title, body, linkedClient: client })} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Note</button>
      </div>
    </div>
  );
};

// --- Intake Wizard as Window Content ---
const IntakeWizardContent = ({ onClose, onApprove }: any) => {
   const [step, setStep] = useState(0);
   const [loading, setLoading] = useState(false);
   const [messages, setMessages] = useState<ChatMessage[]>([{id: '1', role: 'model', text: "I'll help you create a new client profile. To start, what is the client's preferred name?", timestamp: new Date()}]);
   const [input, setInput] = useState("");
   const [clientData, setClientData] = useState<Partial<Client>>({});
   const [isComplete, setIsComplete] = useState(false);

   const handleSend = async () => {
      if (!input.trim()) return;
      const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
      setMessages(prev => [...prev, newMsg]);
      setInput("");
      setLoading(true);

      let responseText = "";
      
      if (step === 0) {
         setClientData(prev => ({ ...prev, preferredName: input }));
         responseText = `Got it. Let's create a profile for ${input}. What is their legal name?`;
         setStep(1);
      } else if (step === 1) {
         setClientData(prev => ({ ...prev, legalName: input }));
         responseText = "Thanks. What is their current housing status? (e.g., Stable, Shelter, Unstable)";
         setStep(2);
      } else if (step === 2) {
         setClientData(prev => ({ ...prev, fullProfile: { ...prev.fullProfile, housingStatus: input } }));
         responseText = "Understood. Finally, briefly describe their primary needs.";
         setStep(3);
      } else if (step === 3) {
         const finalClient = {
            preferredName: clientData.preferredName || "Unknown",
            legalName: clientData.legalName,
            fullProfile: {
               ...DEFAULT_CLIENT.fullProfile,
               housingStatus: (clientData.fullProfile as any)?.housingStatus,
               primaryNeeds: { ...DEFAULT_CLIENT.fullProfile.primaryNeeds, notes: input }
            }
         };
         setClientData(finalClient);
         setIsComplete(true);
         setLoading(false);
         return;
      }

      setTimeout(() => {
         setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText, timestamp: new Date() }]);
         setLoading(false);
      }, 600);
   };

   if (isComplete) {
      return (
         <div className="flex flex-col h-full bg-white p-8 items-center justify-center text-center">
            <CheckCircle2 size={64} className="text-teal-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Intake Complete</h2>
            <p className="text-gray-600 mb-8 max-w-md">The intake session is finished. Review the summary below or approve to create the client.</p>
            <div className="flex gap-4">
               <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50">Cancel</button>
               <button onClick={() => onClose()} className="px-6 py-3 rounded-xl border border-teal-600 text-teal-600 font-medium hover:bg-teal-50">Edit Form</button>
               <button onClick={() => onApprove(clientData)} className="px-6 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-lg">Approve & View Client</button>
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-full bg-white">
         <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
            {messages.map(m => (
               <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800 shadow-sm'}`}>
                     {m.text}
                  </div>
               </div>
            ))}
            {loading && <div className="text-xs text-gray-400 animate-pulse">Processing...</div>}
         </div>
         <div className="p-3 bg-white border-t flex gap-2">
            <input 
               className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
               placeholder="Type your answer..."
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700"><Send size={20}/></button>
         </div>
      </div>
   );
};

const OSWindow = ({ win, dispatch, isActive, state }: { win: AppWindow, dispatch: React.Dispatch<OSEvent>, isActive: boolean, state: OSState }) => {
  // --- Lifecycle Phase 5: Minimized windows are not rendered on desktop ---
  if (win.isMinimized) return null;

  const hub = HUBS.find(h => h.id === win.hubId);
  const isModal = win.hubId === 'note-editor' || win.hubId === 'intake-wizard';
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - win.position.x, y: e.clientY - win.position.y });
    dispatch({ type: 'WINDOW_FOCUS', source: 'OSWindow', payload: { windowID: win.id } });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || win.isMaximized) return;
      dispatch({ type: 'WINDOW_DRAG', source: 'OSWindow', payload: { windowID: win.id, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, win.isMaximized, dispatch, win.id]);

  // --- Strict Z-Index Management ---
  const baseZIndex = 10 + win.zIndex; 
  const calculatedZIndex = isModal ? 9999 : (isActive ? 100 : baseZIndex);

  const style = win.isMaximized 
    ? { top: LAYOUT.TOP_BAR_HEIGHT + LAYOUT.MARGIN, left: LAYOUT.MARGIN, width: state.system.layout.desktopWidth - LAYOUT.MARGIN * 2, height: state.system.layout.desktopHeight - LAYOUT.DOCK_HEIGHT - LAYOUT.MARGIN * 2 - LAYOUT.TOP_BAR_HEIGHT, zIndex: calculatedZIndex }
    : { top: win.position.y, left: win.position.x, width: win.size?.width, height: win.size?.height, zIndex: calculatedZIndex };

  // --- Modal Window Shell ---
  if (isModal) {
     return (
       <div ref={windowRef} className={`fixed bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 ${isActive ? 'ring-4 ring-indigo-200' : ''}`} style={style} onClick={() => dispatch({ type: 'WINDOW_FOCUS', source: 'OSWindow', payload: { windowID: win.id } })}>
          <div className={`h-12 ${win.hubId === 'intake-wizard' ? 'bg-teal-600' : 'bg-indigo-600'} flex items-center justify-between px-4 shrink-0 cursor-move text-white`} onMouseDown={handleMouseDown}>
             <div className="font-semibold flex items-center gap-2">
               {win.hubId === 'intake-wizard' ? <UserPlus size={18}/> : <FileText size={18}/>} 
               {win.title}
             </div>
             <button onClick={() => dispatch({ type: 'WINDOW_CLOSE', source: 'OSWindow', payload: { windowID: win.id } })} className="hover:text-white/80"><X size={20}/></button>
          </div>
          {win.hubId === 'note-editor' ? (
             <NoteEditorContent 
                linkedClient={win.noteData?.clientId} 
                clients={Object.values(state.data.clients)} 
                onSave={(n: any) => dispatch({ type: 'NOTE_SAVE', source: 'NoteEditor', payload: { mode: 'create', title: n.title, body: n.body, linkedClientID: n.linkedClient, windowID: win.id } })} 
                onCancel={() => dispatch({ type: 'WINDOW_CLOSE', source: 'NoteEditor', payload: { windowID: win.id } })} 
             />
          ) : (
             <IntakeWizardContent 
                onClose={() => dispatch({ type: 'WINDOW_CLOSE', source: 'IntakeWizard', payload: { windowID: win.id } })}
                onApprove={(clientData: any) => dispatch({ type: 'INTAKE_APPROVE', source: 'IntakeWizard', payload: { clientData, windowID: win.id } })}
             />
          )}
       </div>
     );
  }

  // --- Standard Window Shell ---
  return (
    <div ref={windowRef} className={`fixed bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 transition-all duration-75`} style={style} onClick={() => dispatch({ type: 'WINDOW_FOCUS', source: 'OSWindow', payload: { windowID: win.id } })}>
       <div className={`h-10 ${hub?.color || 'bg-gray-700'} flex items-center justify-between px-3 shrink-0 cursor-move`} onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-2 text-white font-medium text-sm pointer-events-none"><IconComponent name={hub?.icon || 'Square'} className="w-4 h-4 opacity-80" />{hub?.name || win.title}</div>
          <div className="flex items-center gap-2 window-controls">
             <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => dispatch({ type: 'WINDOW_MINIMIZE', source: 'OSWindow', payload: { windowID: win.id } })}><Minimize size={14} /></button>
             <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => dispatch({ type: 'WINDOW_MAXIMIZE_TOGGLE', source: 'OSWindow', payload: { windowID: win.id } })}>{win.isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
             <button className="p-1 hover:bg-red-500/80 rounded text-white/80 hover:text-white" onClick={() => dispatch({ type: 'WINDOW_CLOSE', source: 'OSWindow', payload: { windowID: win.id } })}><X size={14} /></button>
          </div>
       </div>
       <div className="flex-1 overflow-auto bg-gray-50 flex">
          {hub && !['activity-log', 'priorities', 'urgent', 'weekly'].includes(win.hubId) && (
             <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block shrink-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Pages</h4>
                <ul className="space-y-1">
                   {hub.pages.map(page => (
                      <li key={page} 
                          onClick={() => dispatch({ type: 'SIDEBAR_PAGE_CHANGE', source: 'OSWindow', payload: { windowID: win.id, newPage: page } })}
                          className={`text-sm px-3 py-2 rounded cursor-pointer transition ${win.activePage === page ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                         {page}
                      </li>
                   ))}
                </ul>
             </div>
          )}
          <div className="flex-1 overflow-y-auto">
             {(() => {
                 if (win.hubId === 'clients') return <ClientHub clients={Object.values(state.data.clients)} notes={Object.values(state.data.notes)} activePage={win.activePage} navigationState={win.navigationState || {}} dispatch={dispatch} winID={win.id} />;
                 if (win.hubId === 'priorities') return <PrioritiesView tasks={Object.values(state.data.tasks)} dispatch={dispatch} />;
                 if (win.hubId === 'urgent') return <UrgentView tasks={Object.values(state.data.tasks)} clients={Object.values(state.data.clients)} dispatch={dispatch} />;
                 if (win.hubId === 'weekly') return <WeeklyView tasks={Object.values(state.data.tasks)} weeklyNotes={state.system.weeklyNotes} dispatch={dispatch} />;
                 if (win.hubId === 'activity-log') return <ActivityLogHub activities={state.logging.activities} />;
                 if (win.hubId === 'partnerships') return <PartnershipsHub partners={Object.values(state.data.partners)} dispatch={dispatch} />;
                 return <div className="p-8 text-center text-gray-500"><h2 className="text-xl font-bold mb-2">{hub?.name}</h2><p>{hub?.description}</p></div>;
             })()}
          </div>
       </div>
    </div>
  );
};

// --- Sub-Components Implementation using Dispatch ---

const PrioritiesView = ({ tasks, dispatch }: { tasks: Task[], dispatch: React.Dispatch<OSEvent> }) => {
   const high = tasks.filter(t => !t.completed && t.priority === 'High');
   return (
      <div className="p-8 space-y-6">
         <div className="flex justify-between">
            <h2 className="text-2xl font-bold">Top Priorities</h2>
            <button onClick={() => dispatch({ type: 'SYSTEM_MODAL_OPEN', source: 'PrioritiesView', payload: { type: 'TASK_MODAL' } })} className="bg-rose-600 text-white px-4 py-2 rounded-lg flex gap-2"><PlusCircle size={18}/> Add</button>
         </div>
         <div className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-rose-50 p-3 border-b text-rose-800 font-semibold">High Priority</div>
            <div className="divide-y">
               {high.map(t => (
                  <div key={t.id} className="p-4 flex gap-3 hover:bg-gray-50" onClick={() => dispatch({ type: 'SYSTEM_MODAL_OPEN', source: 'PrioritiesView', payload: { type: 'TASK_MODAL', task: t } })}>
                     <button onClick={e => { e.stopPropagation(); dispatch({ type: 'TASK_SAVE', source: 'PrioritiesView', payload: { task: { ...t, completed: true } } }); }}><Circle size={20} className="text-gray-300 hover:text-green-500"/></button>
                     <div className="flex-1 font-medium">{t.title}</div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

const UrgentView = ({ tasks, clients, dispatch }: { tasks: Task[], clients: Client[], dispatch: React.Dispatch<OSEvent> }) => {
   const urgent = tasks.filter(t => !t.completed && (t.priority === 'High' || t.priority === 'Urgent'));
   return (
      <div className="p-8 space-y-6">
         <h2 className="text-2xl font-bold">Urgent Follow Ups</h2>
         <div className="grid gap-4">
            {urgent.map(t => (
               <div key={t.id} className="p-4 bg-white border-l-4 border-l-amber-500 shadow-sm rounded-r-xl" onClick={() => dispatch({ type: 'SYSTEM_MODAL_OPEN', source: 'UrgentView', payload: { type: 'TASK_MODAL', task: t } })}>
                  <div className="font-bold">{t.title}</div>
                  <div className="text-xs text-gray-500 mt-1">Due: {t.dueDate || 'ASAP'}</div>
               </div>
            ))}
         </div>
      </div>
   );
};

const WeeklyView = ({ tasks, weeklyNotes, dispatch }: { tasks: Task[], weeklyNotes: string, dispatch: React.Dispatch<OSEvent> }) => (
   <div className="p-8 space-y-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold">Weekly Overview</h2>
      <div className="grid grid-cols-5 gap-2 flex-1">
         {[0,1,2,3,4].map(i => (
            <div key={i} className="border rounded-lg p-2 bg-white">
               <div className="text-xs font-bold text-gray-400 uppercase mb-2">Day {i+1}</div>
            </div>
         ))}
      </div>
      <div className="h-32 bg-white border rounded-xl p-4">
         <div className="text-xs font-bold text-gray-400 uppercase mb-2">Weekly Notes</div>
         <textarea className="w-full h-full outline-none text-sm resize-none" value={weeklyNotes} onChange={e => dispatch({ type: 'SYSTEM_WEEKLY_NOTES', source: 'WeeklyView', payload: { notes: e.target.value } })} />
      </div>
   </div>
);

const ActivityLogHub = ({ activities }: { activities: OSActivity[] }) => (
   <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Activity Log</h2>
      <div className="bg-white border rounded-xl overflow-hidden">
         <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
               <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
               </tr>
            </thead>
            <tbody className="divide-y">
               {activities.map(a => (
                  <tr key={a.id}>
                     <td className="p-3 text-gray-500">{a.timestamp.toLocaleTimeString()}</td>
                     <td className="p-3 font-medium text-indigo-600">{a.type}</td>
                     <td className="p-3 text-gray-700">{a.description}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   </div>
);

const ClientHub = ({ clients, notes, activePage, navigationState, dispatch, winID }: any) => {
   const [searchTerm, setSearchTerm] = useState('');
   const selectedClientId = navigationState?.selectedClientId;
   const selectedClient = selectedClientId ? clients.find((c: any) => c.id === selectedClientId) : null;
   const isEditing = navigationState?.isEditing || false;
   const [editForm, setEditForm] = useState(selectedClient?.fullProfile || {});

   useEffect(() => {
      if(selectedClient) setEditForm(selectedClient.fullProfile);
   }, [selectedClient]);

   const handleSave = () => {
      if (!selectedClient) return;
      const updated = { ...selectedClient, lastUpdated: new Date().toISOString(), fullProfile: editForm };
      dispatch({ type: 'CLIENT_UPDATE', source: 'ClientHub', payload: { client: updated } });
      dispatch({ type: 'NAVIGATE_INTERNAL', source: 'ClientHub', payload: { windowID: winID, state: { isEditing: false } } });
   };

   if (activePage === 'Intake Forms') {
      return (
         <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <FileText size={48} className="text-teal-200 mb-4"/>
            <h2 className="text-2xl font-bold">Intake Templates</h2>
            <p className="text-gray-500 mb-6">Manage master templates here.</p>
            <button className="bg-teal-600 text-white px-6 py-2 rounded-lg" onClick={() => dispatch({ type: 'INTAKE_EDIT_TEMPLATE', source: 'ClientHub', payload: {} })}>Edit Master Template</button>
         </div>
      );
   }

   if (selectedClient) {
      const clientNotes = [...notes.filter((n: Note) => n.linkedClient === selectedClient.id), ...(selectedClient.fullProfile.contactLog || [])]
          .sort((a: any, b: any) => new Date(b.date||b.createdAt).getTime() - new Date(a.date||a.createdAt).getTime());

      return (
         <div className="h-full flex flex-col">
            <div className="p-6 border-b bg-teal-50 flex justify-between items-start">
               <div>
                  <button onClick={() => dispatch({ type: 'NAVIGATE_INTERNAL', source: 'ClientHub', payload: { windowID: winID, state: { selectedClientId: null } } })} className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-800 mb-2"><ArrowLeft size={14}/> Back</button>
                  <h2 className="text-2xl font-bold">{selectedClient.preferredName}</h2>
               </div>
               <div className="flex gap-2">
                  {isEditing ? (
                     <>
                        <button onClick={() => dispatch({ type: 'NAVIGATE_INTERNAL', source: 'ClientHub', payload: { windowID: winID, state: { isEditing: false } } })} className="px-3 py-1.5 bg-gray-200 rounded text-sm">Cancel</button>
                        <button onClick={handleSave} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm">Save</button>
                     </>
                  ) : (
                     <>
                        <button onClick={() => dispatch({ type: 'NAVIGATE_INTERNAL', source: 'ClientHub', payload: { windowID: winID, state: { isEditing: true } } })} className="bg-white border px-3 py-1.5 rounded text-sm font-medium">Edit</button>
                        <button onClick={() => dispatch({ type: 'WINDOW_OPEN', source: 'ClientHub', payload: { appID: 'note-editor', extraState: { noteData: { clientId: selectedClient.id }, title: 'New Note' } } })} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-medium">Add Note</button>
                     </>
                  )}
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
               {isEditing ? (
                  <div className="space-y-4">
                     <div><label className="text-xs font-bold text-gray-500">Legal Name</label><input className="w-full border p-2 rounded" value={editForm.legalName || ''} onChange={e => setEditForm({...editForm, legalName: e.target.value})} /></div>
                     <div><label className="text-xs font-bold text-gray-500">Phone</label><input className="w-full border p-2 rounded" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 gap-6">
                     <div>
                        <h3 className="font-bold text-gray-400 text-xs uppercase mb-2">Details</h3>
                        <p>Phone: {selectedClient.fullProfile.phone}</p>
                        <p>Email: {selectedClient.fullProfile.email}</p>
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-400 text-xs uppercase mb-2">Notes</h3>
                        <div className="space-y-2">
                           {clientNotes.map((n: any, i: number) => (
                              <div key={i} className="bg-gray-50 p-2 rounded text-sm border">
                                 <div className="font-semibold">{n.summary || n.title}</div>
                                 <div className="text-gray-500 text-xs">{new Date(n.date || n.createdAt).toLocaleDateString()}</div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   }

   return (
      <div className="p-6 h-full flex flex-col">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Active Clients</h2>
            <button onClick={() => dispatch({ type: 'WINDOW_OPEN', source: 'ClientHub', payload: { appID: 'intake-wizard' } })} className="bg-teal-600 text-white px-4 py-2 rounded-lg flex gap-2"><UserPlus size={18}/> New Intake</button>
         </div>
         <input className="w-full border rounded-lg p-2 mb-4" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         <div className="divide-y border rounded-xl overflow-hidden">
            {clients.filter((c: Client) => c.preferredName.toLowerCase().includes(searchTerm.toLowerCase())).map((c: Client) => (
               <div key={c.id} onClick={() => dispatch({ type: 'NAVIGATE_INTERNAL', source: 'ClientHub', payload: { windowID: winID, state: { selectedClientId: c.id } } })} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-700">{c.preferredName[0]}</div>
                  <div>
                     <div className="font-semibold">{c.preferredName}</div>
                     <div className="text-xs text-gray-500">{c.status}</div>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

const PartnershipsHub = ({ partners, dispatch }: { partners: Partner[], dispatch: React.Dispatch<OSEvent> }) => (
   <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Partnerships</h2>
      <div className="grid grid-cols-2 gap-4">
         {partners.map(p => (
            <div key={p.id} className="p-4 border rounded-xl hover:shadow-md transition bg-white">
               <div className="font-bold">{p.name}</div>
               <div className="text-sm text-gray-600">{p.category}</div>
               <div className="text-xs text-gray-400 mt-2">{p.notes}</div>
            </div>
         ))}
      </div>
   </div>
);

// --- Widgets & Overlays ---

const WidgetArea = ({ notifications, onOpenUrgent }: any) => (
  <div className="absolute top-12 right-4 w-80 space-y-4 pointer-events-none z-10">
    <div className="bg-white/90 backdrop-blur shadow-lg rounded-xl p-4 pointer-events-auto border border-white/50">
      <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Notifications</h3>
      <div className="space-y-2">
        {notifications.map((n: any) => (
          <div key={n.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition">
            <div className={`w-2 h-2 mt-1.5 rounded-full ${n.urgent ? 'bg-red-500' : 'bg-blue-400'}`} />
            <div>
              <div className="text-sm font-medium text-gray-800 leading-tight">{n.title}</div>
              <div className="text-xs text-gray-500">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-white/90 backdrop-blur shadow-lg rounded-xl p-4 pointer-events-auto border border-white/50 cursor-pointer hover:bg-white" onClick={onOpenUrgent}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <AlertCircle size={20} />
        </div>
        <div>
          <div className="font-bold text-gray-800">Urgent Attention</div>
          <div className="text-xs text-gray-500">3 tasks require action</div>
        </div>
      </div>
    </div>
  </div>
);

const MinimizedWidgets = ({ windows, onRestore }: any) => {
  const minimized = windows.filter((w: AppWindow) => w.isMinimized);
  if (minimized.length === 0) return null;
  return (
    <div className="absolute bottom-24 right-4 flex flex-col gap-2 items-end z-0">
      {minimized.map((w: AppWindow) => {
         const hub = HUBS.find(h => h.id === w.hubId);
         return (
            <div key={w.id} onClick={() => onRestore(w.id)} className="bg-white/80 backdrop-blur p-2 rounded-lg shadow border border-white/50 flex items-center gap-2 cursor-pointer hover:bg-white w-48 transition-all">
               <div className={`w-8 h-8 rounded flex items-center justify-center text-white ${hub?.color || 'bg-gray-500'}`}>
                  <IconComponent name={hub?.icon || 'Square'} className="w-4 h-4" />
               </div>
               <div className="text-sm font-medium truncate flex-1">{w.title}</div>
            </div>
         );
      })}
    </div>
  );
};

const TaskModal = ({ onClose, clients, onSave }: any) => {
   const [title, setTitle] = useState('');
   const [priority, setPriority] = useState('Medium');
   const [linkedClient, setLinkedClient] = useState('');

   return (
      <div className="fixed inset-0 flex items-center justify-center z-[100]">
         <div className="absolute inset-0 bg-black/40" onClick={onClose} />
         <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6 relative z-10">
            <h3 className="text-xl font-bold mb-4">New Task</h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Title</label>
                  <input className="w-full border rounded p-2" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Priority</label>
                  <select className="w-full border rounded p-2" value={priority} onChange={e => setPriority(e.target.value)}>
                     <option>Low</option>
                     <option>Medium</option>
                     <option>High</option>
                     <option>Urgent</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Link Client (Optional)</label>
                  <select className="w-full border rounded p-2" value={linkedClient} onChange={e => setLinkedClient(e.target.value)}>
                     <option value="">None</option>
                     {clients.map((c: Client) => <option key={c.id} value={c.id}>{c.preferredName}</option>)}
                  </select>
               </div>
               <div className="flex justify-end gap-2 pt-4">
                  <button onClick={onClose} className="px-4 py-2 rounded hover:bg-gray-100">Cancel</button>
                  <button onClick={() => {
                     onSave({ 
                        id: generateID('task'), 
                        title, 
                        priority, 
                        linkedClient: linkedClient || undefined, 
                        completed: false, 
                        createdAt: nowISO(), 
                        updatedAt: nowISO() 
                     });
                     onClose();
                  }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Task</button>
               </div>
            </div>
         </div>
      </div>
   );
};

const Launcher = ({ isOpen, onClose, onOpenApp }: any) => {
   if (!isOpen) return null;
   return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center">
         <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
         <div className="bg-white/90 backdrop-blur-xl w-[800px] rounded-3xl p-8 shadow-2xl relative z-10 grid grid-cols-5 gap-8 animate-in fade-in zoom-in duration-200">
            {HUBS.map(hub => (
               <button key={hub.id} onClick={() => { onOpenApp(hub); onClose(); }} className="flex flex-col items-center gap-3 group">
                  <div className={`w-16 h-16 rounded-2xl ${hub.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                     <IconComponent name={hub.icon} className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{hub.name}</span>
               </button>
            ))}
         </div>
      </div>
   );
};

const ChatOverlay = ({ isOpen, onClose, messages, input, setInput, onSend, isLoading }: any) => {
   const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
   const [localInput, setLocalInput] = useState('');
   const [isProcessing, setIsProcessing] = useState(false);

   const handleLocalSend = async () => {
      if (!localInput.trim()) return;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: localInput, timestamp: new Date() };
      setLocalMessages(prev => [...prev, userMsg]);
      setLocalInput('');
      setIsProcessing(true);

      const responseText = await generateOSResponse(userMsg.text, "User is asking for help via the OS Chat Assistant.");
      const modelMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: responseText, timestamp: new Date() };
      setLocalMessages(prev => [...prev, modelMsg]);
      setIsProcessing(false);
   };

   if (!isOpen) return null;

   return (
      <div className="fixed bottom-24 right-8 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[90] border border-gray-200 animate-in slide-in-from-bottom-10">
         <div className="bg-indigo-600 p-4 text-white font-bold flex justify-between items-center">
            <div className="flex items-center gap-2"><Sparkles size={18}/> AdminOS Assistant</div>
            <button onClick={onClose}><X size={18}/></button>
         </div>
         <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
            {localMessages.length === 0 && (
               <div className="text-center text-gray-400 mt-10">
                  <Sparkles size={48} className="mx-auto mb-4 opacity-50"/>
                  <p>How can I help you manage your nonprofit today?</p>
               </div>
            )}
            {localMessages.map(m => (
               <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border text-gray-800 shadow-sm rounded-bl-sm'}`}>
                     {m.text}
                  </div>
               </div>
            ))}
            {isProcessing && <div className="text-xs text-gray-400 animate-pulse ml-2">Thinking...</div>}
         </div>
         <div className="p-3 bg-white border-t flex gap-2">
            <input 
               className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
               placeholder="Ask anything..."
               value={localInput}
               onChange={e => setLocalInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleLocalSend()}
            />
            <button onClick={handleLocalSend} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition"><Send size={18}/></button>
         </div>
      </div>
   );
};

const Shelf = ({ windows, activeId, onRestore, onMinimize, onToggleLauncher, launcherOpen, pinnedApps, onTogglePin, onOpenApp }: any) => {
   return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl flex items-center px-4 gap-2 z-50 transition-all hover:scale-105">
         <button onClick={onToggleLauncher} className={`p-3 rounded-xl transition ${launcherOpen ? 'bg-indigo-600 text-white shadow-inner' : 'hover:bg-white/50 text-gray-700'}`}>
            <LayoutGrid size={24} />
         </button>
         <div className="w-px h-8 bg-gray-300 mx-1" />
         
         {pinnedApps.map((appID: string) => {
            const hub = HUBS.find(h => h.id === appID);
            if (!hub) return null;
            const isRunning = windows.some((w: AppWindow) => w.hubId === appID);
            const isActive = isRunning && activeId && windows.find((w: AppWindow) => w.id === activeId)?.hubId === appID;

            return (
               <div key={appID} className="relative group">
                  <button 
                     onClick={() => dispatchEvent(new CustomEvent('DOCK_CLICK_INTERNAL', { detail: { appID } }) as any)} 
                     className={`p-2 rounded-xl transition-all duration-300 relative ${isActive ? 'bg-white shadow-sm -translate-y-2' : 'hover:bg-white/40 hover:-translate-y-1'}`}
                     onMouseDown={() => onOpenApp(hub)} // Simplified due to wrapper handling
                  >
                     <div className={`w-10 h-10 rounded-lg ${hub.color} flex items-center justify-center text-white shadow-sm`}>
                        <IconComponent name={hub.icon} className="w-6 h-6" />
                     </div>
                  </button>
                  {isRunning && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />}
               </div>
            );
         })}
         
         {/* Separator for unpinned running apps */}
         {windows.some((w: AppWindow) => !pinnedApps.includes(w.hubId) && w.hubId !== 'note-editor' && w.hubId !== 'intake-wizard') && <div className="w-px h-8 bg-gray-300 mx-1" />}

         {[...new Set(windows.map((w: AppWindow) => w.hubId).filter((id: string) => !pinnedApps.includes(id) && id !== 'note-editor' && id !== 'intake-wizard'))].map((appID: any) => {
             const hub = HUBS.find(h => h.id === appID) || { id: appID, name: appID, icon: 'Box', color: 'bg-gray-400' };
             const isActive = activeId && windows.find((w: AppWindow) => w.id === activeId)?.hubId === appID;
             return (
               <div key={appID} className="relative group">
                  <button 
                     onClick={() => onOpenApp({ id: appID })}
                     className={`p-2 rounded-xl transition-all duration-300 relative ${isActive ? 'bg-white shadow-sm -translate-y-2' : 'hover:bg-white/40 hover:-translate-y-1'}`}
                  >
                     <div className={`w-10 h-10 rounded-lg ${hub.color || 'bg-gray-500'} flex items-center justify-center text-white shadow-sm`}>
                        <IconComponent name={hub.icon || 'Box'} className="w-6 h-6" />
                     </div>
                  </button>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
               </div>
             );
         })}

         <div className="w-px h-8 bg-gray-300 mx-1" />
         <button onClick={() => onToggleLauncher()} className="p-3 rounded-xl hover:bg-white/50 text-gray-700 relative" title="AI Chat">
             <MessageSquare size={24} />
         </button>
      </div>
   );
};

// --- Main Desktop ---

export default function Desktop() {
  const [state, dispatch] = useReducer(osReducer, initialState);
  const [modalState, setModalState] = useState<{type: string, props?: any} | null>(null);

  // Unified Event Dispatcher Wrapper
  const dispatchEvent = (event: OSEvent) => {
     // Log to console for dev visibility
     // console.log(`[Event] ${event.type}`, event.payload);
     
     if (event.type === 'SYSTEM_MODAL_OPEN') {
        setModalState({ type: event.payload.type, props: event.payload });
     } else {
        dispatch(event);
     }
  };

  useEffect(() => {
     const handleResize = () => {
        dispatchEvent({ 
           type: 'SYSTEM_RESIZE', 
           source: 'Window', 
           payload: { width: window.innerWidth, height: window.innerHeight } 
        });
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-screen bg-cover bg-center overflow-hidden relative" style={{ backgroundImage: `linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)` }}>
      <TopBar />
      <WidgetArea notifications={MOCK_NOTIFICATIONS} onOpenUrgent={() => dispatchEvent({ type: 'WINDOW_OPEN', source: 'Widget', payload: { appID: 'urgent' } })} />
      
      <MinimizedWidgets windows={Object.values(state.windows.byID)} onRestore={(id: string) => dispatchEvent({ type: 'WINDOW_RESTORE', source: 'Widget', payload: { windowID: id } })} />

      {state.system.overlays.blurActive && <div className="fixed inset-0 bg-white/30 backdrop-blur-sm z-[60]" />}

      {state.windows.order.map(id => {
         const win = state.windows.byID[id];
         if (!win) return null;
         return <OSWindow key={id} win={win} isActive={state.windows.focusedWindowID === id} dispatch={dispatchEvent} state={state} />;
      })}

      {modalState?.type === 'TASK_MODAL' && (
         <TaskModal 
            onClose={() => setModalState(null)} 
            clients={Object.values(state.data.clients)} 
            onSave={(t: Task) => dispatchEvent({ type: 'TASK_SAVE', source: 'TaskModal', payload: { task: t } })} 
         />
      )}

      <Launcher 
         isOpen={state.system.launcherOpen} 
         onClose={() => dispatchEvent({ type: 'SYSTEM_LAUNCHER_TOGGLE', source: 'Desktop', payload: {} })} 
         onOpenApp={(hub: Hub) => dispatchEvent({ type: 'WINDOW_OPEN', source: 'Launcher', payload: { appID: hub.id } })} 
      />
      
      <ChatOverlay 
         isOpen={state.system.chatOpen} 
         onClose={() => dispatchEvent({ type: 'SYSTEM_CHAT_TOGGLE', source: 'Desktop', payload: {} })} 
         onOpen={() => dispatchEvent({ type: 'SYSTEM_CHAT_TOGGLE', source: 'Desktop', payload: {} })} 
         messages={[]} 
         input="" setInput={() => {}} onSend={() => {}} isLoading={false}
      />

      <Shelf 
         windows={Object.values(state.windows.byID)} 
         activeId={state.windows.focusedWindowID} 
         onRestore={(id: string) => dispatchEvent({ type: 'WINDOW_RESTORE', source: 'Shelf', payload: { windowID: id } })} 
         onMinimize={() => {}} 
         onToggleLauncher={() => dispatchEvent({ type: 'SYSTEM_LAUNCHER_TOGGLE', source: 'Shelf', payload: {} })} 
         launcherOpen={state.system.launcherOpen} 
         pinnedApps={state.dock.pinnedAppIDs} 
         onTogglePin={(id: string) => dispatchEvent({ type: 'DOCK_PIN_TOGGLE', source: 'Shelf', payload: { appID: id } })} 
         onOpenApp={(hub: any) => dispatchEvent({ type: 'DOCK_ICON_CLICK', source: 'Shelf', payload: { appID: hub.id || hub } })} 
      />
    </div>
  );
}