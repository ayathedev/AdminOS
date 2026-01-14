import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, Battery, Bell, Search, LayoutGrid, 
  X, Minus, Square, Send, Maximize2, Minimize2,
  Calendar as CalendarIcon, CheckSquare, Activity, User, 
  PlusCircle, FileText, ClipboardList, Clock as ClockIcon, ArrowLeft,
  ChevronRight, MoreHorizontal, Pencil, Save, XCircle,
  Minimize, RotateCcw, AlertCircle, CalendarDays, CheckCircle2, Circle,
  Filter, Check, Handshake, MapPin, Phone, Mail, Globe, Trash2,
  Sparkles, Pin, PinOff
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { HUBS, MOCK_NOTIFICATIONS, MOCK_TASKS, CLIENT_INTAKE_CONTEXT, DEFAULT_CLIENT, INITIAL_PARTNERS } from '../constants';
import { Hub, AppWindow, ChatMessage, Client, ClientActivity, OSActivity, Note, Task, Partner } from '../types';
import { generateOSResponse } from '../services/geminiService';

// --- Type Definitions ---

interface OSWindowProps {
  win: AppWindow;
  isActive: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onOpenChat: () => void;
  clients: Client[];
  activities: ClientActivity[];
  osActivities: OSActivity[];
  tasks: Task[];
  notes: Note[]; // Passed notes
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (activity: any) => void;
  resetViewTrigger: number;
  onUpdateTask: (task: Task) => void;
  onOpenTaskModal: () => void;
  onAddTaskForDay: (date: string) => void;
  onUpdateNotes: (notes: string) => void;
  weeklyNotes: string; // Renamed to differentiate from note objects
  onAddNote: (clientId: string) => void;
}

// --- Helper Components ---

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="flex flex-col items-end mr-4 text-gray-700">
      <span className="text-sm font-medium leading-tight">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className="text-xs text-gray-500 leading-tight">
        {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
    </div>
  );
};

const IconComponent = ({ name, className }: { name: string, className?: string }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

const calculateAge = (dobString: string) => {
  if (!dobString) return 'N/A';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 'N/A';
  const diff = Date.now() - dob.getTime();
  const age = new Date(diff);
  return Math.abs(age.getUTCFullYear() - 1970);
};

// --- UI Shell Components ---

const TopBar = () => (
  <div className="h-8 bg-white/80 backdrop-blur-md border-b border-white/50 flex items-center justify-between px-4 fixed top-0 w-full z-50">
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

const WidgetArea = ({ notifications, onOpenUrgent }: { notifications: any[], onOpenUrgent: () => void }) => (
  <div className="fixed top-12 right-4 flex flex-col gap-4 z-40 w-80 pointer-events-none">
     {/* Quick Stats Widget */}
     <div className="bg-white/90 backdrop-blur border border-white/50 p-4 rounded-2xl shadow-sm pointer-events-auto">
        <div className="flex justify-between items-center mb-3">
           <h3 className="font-bold text-gray-700">Quick Pulse</h3>
           <Activity size={16} className="text-rose-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
           <div onClick={onOpenUrgent} className="bg-rose-50 p-3 rounded-xl border border-rose-100 cursor-pointer hover:bg-rose-100 transition">
              <div className="text-2xl font-bold text-rose-600">3</div>
              <div className="text-xs text-rose-800 font-medium">Urgent</div>
           </div>
           <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <div className="text-2xl font-bold text-indigo-600">12</div>
              <div className="text-xs text-indigo-800 font-medium">Tasks</div>
           </div>
        </div>
     </div>

     {/* Notifications Widget */}
     <div className="bg-white/90 backdrop-blur border border-white/50 p-4 rounded-2xl shadow-sm pointer-events-auto">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
           <Bell size={16} className="text-amber-500" /> Recent
        </h3>
        <div className="space-y-2">
           {notifications.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition text-sm">
                 <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.urgent ? 'bg-rose-500' : 'bg-blue-500'}`} />
                 <div>
                    <p className="font-medium text-gray-800 leading-tight">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                 </div>
              </div>
           ))}
        </div>
     </div>
  </div>
);

const MinimizedWidgets = ({ windows, onRestore }: { windows: AppWindow[], onRestore: (id: string) => void }) => {
  const minimized = windows.filter(w => w.isMinimized);
  
  if (minimized.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 flex flex-col gap-3 z-30 pointer-events-auto">
      {minimized.map(win => {
         const hub = HUBS.find(h => h.id === win.hubId);
         let icon = hub ? hub.icon : 'AppWindow';
         // Map special views
         if (win.hubId === 'activity-log') icon = 'Activity';
         else if (win.hubId === 'priorities') icon = 'AlertCircle';
         else if (win.hubId === 'urgent') icon = 'Clock';
         else if (win.hubId === 'weekly') icon = 'CalendarDays';

         return (
           <div 
             key={win.id} 
             onClick={() => onRestore(win.id)}
             className="bg-white/80 backdrop-blur-md border border-white/60 p-3 rounded-xl shadow-lg w-48 cursor-pointer hover:bg-white transition hover:scale-105 flex items-center gap-3 animate-in slide-in-from-left-5 fade-in"
           >
              <div className="bg-gray-100 p-2 rounded-lg">
                 <IconComponent name={icon} className="w-5 h-5 text-gray-600" />
              </div>
              <div className="truncate">
                 <div className="text-xs font-semibold text-gray-800 truncate">{win.title}</div>
                 <div className="text-[10px] text-gray-500">Click to restore</div>
              </div>
           </div>
         );
      })}
    </div>
  );
};

const Launcher = ({ isOpen, onClose, onOpenApp }: { isOpen: boolean, onClose: () => void, onOpenApp: (hub: any) => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pb-24" onClick={onClose}>
       <div 
         className="bg-white/80 backdrop-blur-xl border border-white/50 w-[600px] rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 fade-in duration-200"
         onClick={e => e.stopPropagation()}
       >
          <div className="relative mb-6">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
                className="w-full bg-white/50 border border-white/50 pl-10 pr-4 py-3 rounded-xl outline-none focus:bg-white focus:ring-2 ring-indigo-200 transition text-gray-700 placeholder-gray-400"
                placeholder="Search apps, files, or clients..."
                autoFocus
             />
          </div>
          
          <div className="grid grid-cols-5 gap-4">
             {HUBS.map(hub => (
                <button 
                   key={hub.id}
                   onClick={() => onOpenApp(hub)}
                   className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/60 transition group"
                >
                   <div className={`w-12 h-12 ${hub.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition duration-300`}>
                      <IconComponent name={hub.icon} className="w-6 h-6" />
                   </div>
                   <span className="text-xs font-medium text-gray-600 text-center leading-tight">{hub.name}</span>
                </button>
             ))}
          </div>
       </div>
    </div>
  );
};

const Shelf = ({ windows, activeId, onRestore, onMinimize, onToggleLauncher, launcherOpen, pinnedApps, onTogglePin }: { windows: AppWindow[], activeId: string | null, onRestore: (id: string) => void, onMinimize: (id: string) => void, onToggleLauncher: () => void, launcherOpen: boolean, pinnedApps: string[], onTogglePin: (id: string) => void }) => {
  // Combine pinned apps and open windows, removing duplicates by hubId
  const dockItems = new Map<string, { hubId: string, winId?: string, isOpen: boolean }>();

  // Add pinned apps first
  pinnedApps.forEach(hubId => {
     dockItems.set(hubId, { hubId, isOpen: false });
  });

  // Update with open windows
  windows.forEach(win => {
     if (dockItems.has(win.hubId)) {
        dockItems.set(win.hubId, { hubId: win.hubId, winId: win.id, isOpen: true });
     } else {
        dockItems.set(win.hubId, { hubId: win.hubId, winId: win.id, isOpen: true });
     }
  });

  // Sort: Pinned apps first (in order of pinnedApps array), then others
  const sortedItems = Array.from(dockItems.values()).sort((a, b) => {
     const indexA = pinnedApps.indexOf(a.hubId);
     const indexB = pinnedApps.indexOf(b.hubId);
     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
     if (indexA !== -1) return -1;
     if (indexB !== -1) return 1;
     return 0;
  });

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 bg-white/70 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-2xl px-4 flex items-center gap-4 z-[90] transition-all duration-300 hover:scale-[1.02]">
       <button 
         onClick={onToggleLauncher}
         className={`p-2 rounded-xl transition-all duration-300 ${launcherOpen ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-white/50 text-gray-600'}`}
       >
          <LayoutGrid size={24} />
       </button>
       
       <div className="w-px h-8 bg-gray-300/50 mx-1" />
       
       {sortedItems.map(item => {
          const hub = HUBS.find(h => h.id === item.hubId);
          const isActive = item.winId === activeId && item.winId !== undefined && windows.find(w => w.id === item.winId && !w.isMinimized);
          
          let icon = hub ? hub.icon : 'AppWindow';
          let color = hub ? hub.color : 'bg-gray-500';
          let title = hub ? hub.name : item.hubId;

          // Special icons
          if (item.hubId === 'activity-log') { icon = 'Activity'; color = 'bg-gray-700'; title = 'Activity Log'; }
          else if (item.hubId === 'priorities') { icon = 'AlertCircle'; color = 'bg-rose-600'; title = 'Priorities'; }
          else if (item.hubId === 'urgent') { icon = 'Clock'; color = 'bg-amber-600'; title = 'Urgent'; }
          else if (item.hubId === 'weekly') { icon = 'CalendarDays'; color = 'bg-indigo-600'; title = 'Weekly'; }

          return (
             <div 
                key={item.hubId} 
                className="relative group"
                onContextMenu={(e) => { e.preventDefault(); onTogglePin(item.hubId); }}
             >
                <button
                   onClick={() => {
                      if (item.isOpen && item.winId) {
                         if (isActive) onMinimize(item.winId);
                         else onRestore(item.winId);
                      } else {
                         // Need to pass a handler to open app from dock if closed but pinned
                         // This requires passing 'openApp' down or simulating it. 
                         // For now, assume this prop will be added or handled by parent.
                         // Workaround: We can't open a new window from here easily without passing openApp.
                         // See below Desktop component update.
                      }
                   }}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all duration-300 
                      ${color} ${isActive ? '-translate-y-2 ring-2 ring-offset-2 ring-indigo-200' : 'hover:-translate-y-1 opacity-80 hover:opacity-100'}
                   `}
                >
                   <IconComponent name={icon} className="w-5 h-5" />
                </button>
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                   {title} {pinnedApps.includes(item.hubId) && "(Pinned)"}
                </div>
                {/* Active Dot */}
                {item.isOpen && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-500 rounded-full" />}
                {/* Pinned Indicator (Subtle) */}
                {pinnedApps.includes(item.hubId) && !item.isOpen && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-gray-300 rounded-full" />}
             </div>
          );
       })}
    </div>
  );
};

const ChatOverlay = ({ isOpen, onClose, onOpen, messages, input, setInput, onSend, isLoading }: { isOpen: boolean, onClose: () => void, onOpen: () => void, messages: ChatMessage[], input: string, setInput: (s: string) => void, onSend: () => void, isLoading: boolean }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={isOpen ? onClose : onOpen}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-all z-[80] 
          ${isOpen ? 'bg-white text-gray-800 rotate-90' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
        `}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[80] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
           <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 font-semibold">
                 <Sparkles size={18} />
                 <span>AdminOS Assistant</span>
              </div>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={18}/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
              {messages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm leading-relaxed
                       ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'}
                    `}>
                       {msg.text}
                    </div>
                 </div>
              ))}
              {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                       <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                       <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                       <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                 </div>
              )}
           </div>

           <div className="p-3 bg-white border-t border-gray-200">
              <div className="relative">
                 <input 
                    className="w-full bg-gray-100 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl pl-4 pr-10 py-3 text-sm outline-none transition"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                    autoFocus
                 />
                 <button 
                    onClick={onSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                 >
                    <Send size={14} />
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

// --- View Components ---

const PrioritiesView = ({ tasks, onUpdateTask, onEditTask, onOpenTaskModal }: { tasks: Task[], onUpdateTask: (t: Task) => void, onEditTask: (t: Task) => void, onOpenTaskModal: () => void }) => {
  const highPriorityTasks = tasks.filter(t => !t.completed && t.priority === 'High');
  const otherTasks = tasks.filter(t => !t.completed && t.priority !== 'High').slice(0, 3);
  const completedTasks = tasks.filter(t => t.completed).slice(0, 5); 

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Top Priorities</h2>
            <p className="text-gray-500">Focus on these high-impact items today.</p>
          </div>
          <button onClick={onOpenTaskModal} className="bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-rose-700 transition shadow-sm">
             <PlusCircle size={18} /> Add Priority
          </button>
       </div>

       {/* High Priority Section */}
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-rose-50 flex items-center gap-2">
             <AlertCircle size={18} className="text-rose-600" />
             <h3 className="font-semibold text-rose-800">High Priority</h3>
          </div>
          <div className="divide-y divide-gray-100">
             {highPriorityTasks.length === 0 && (
                <div className="p-8 text-center text-gray-400">No high priority tasks. Great job!</div>
             )}
             {highPriorityTasks.map(task => (
                <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition group">
                   <button 
                     onClick={(e) => { e.stopPropagation(); onUpdateTask({...task, completed: true, updatedAt: new Date().toISOString()})}}
                     className="mt-0.5 text-gray-300 hover:text-green-500 transition"
                   >
                      <Circle size={20} />
                   </button>
                   <div 
                     className="flex-1 cursor-pointer"
                     onClick={() => onEditTask(task)}
                   >
                      <p className="font-medium text-gray-800">{task.title}</p>
                      {task.dueDate && <p className="text-xs text-rose-600 mt-1">Due: {task.dueDate}</p>}
                   </div>
                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => onEditTask(task)} className="text-gray-400 hover:text-indigo-600 p-1"><Pencil size={14} /></button>
                      <div className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-medium">High</div>
                   </div>
                </div>
             ))}
          </div>
       </div>

       {/* Other Tasks Section */}
       {otherTasks.length > 0 && (
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-80">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
               <h3 className="font-semibold text-gray-700">Other Active Tasks</h3>
            </div>
            <div className="divide-y divide-gray-100">
               {otherTasks.map(task => (
                  <div key={task.id} className="p-4 flex items-center gap-3">
                     <button 
                       onClick={() => onUpdateTask({...task, completed: true, updatedAt: new Date().toISOString()})}
                       className="text-gray-300 hover:text-green-500 transition"
                     >
                        <Circle size={20} />
                     </button>
                     <span className="text-gray-700 cursor-pointer hover:text-indigo-600" onClick={() => onEditTask(task)}>{task.title}</span>
                  </div>
               ))}
            </div>
         </div>
       )}

       {/* Completed Section */}
       {completedTasks.length > 0 && (
         <div className="pt-4 border-t border-gray-200/50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Completed Today</h3>
            <div className="space-y-1">
               {completedTasks.map(task => (
                  <div key={task.id} className="p-2 flex items-center gap-3 text-gray-400">
                     <CheckCircle2 size={16} className="text-green-500" />
                     <span className="line-through text-sm">{task.title}</span>
                     <button 
                       onClick={() => onUpdateTask({...task, completed: false, updatedAt: new Date().toISOString()})}
                       className="ml-auto text-xs hover:underline text-gray-400 hover:text-indigo-600"
                     >
                       Undo
                     </button>
                  </div>
               ))}
            </div>
         </div>
       )}
    </div>
  );
};

const UrgentView = ({ tasks, clients, onUpdateTask, onEditTask }: { tasks: Task[], clients: Client[], onUpdateTask: (t: Task) => void, onEditTask: (t: Task) => void }) => {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today'>('all');
  const allUrgent = tasks.filter(t => !t.completed && (t.priority === 'High' || (t.dueDate && new Date(t.dueDate) <= new Date(new Date().setDate(new Date().getDate() + 2)))));
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = allUrgent.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return t.dueDate && t.dueDate < todayStr;
    if (filter === 'today') return t.dueDate === todayStr;
    return true;
  });
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="shrink-0">
         <h2 className="text-2xl font-bold text-gray-900">Urgent Follow Ups</h2>
         <p className="text-gray-500">Time-sensitive tasks and client needs.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
           {filteredTasks.length === 0 && (
              <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
                 No {filter !== 'all' ? filter : ''} urgent follow-ups found.
              </div>
           )}
           {filteredTasks.map(task => {
              const client = clients.find(c => c.id === task.linkedClient);
              const isOverdue = task.dueDate && task.dueDate < todayStr;
              return (
                 <div 
                    key={task.id} 
                    onClick={() => onEditTask(task)}
                    className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 group transition-all cursor-pointer hover:shadow-md
                    ${isOverdue ? 'border-l-red-500 border-red-200 bg-red-50/20' : 'border-l-amber-500 border-gray-200 bg-white'}
                 `}>
                    <div className="flex-1 w-full">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">{task.title}</span>
                          {client && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{client.preferredName}</span>}
                          {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Overdue</span>}
                       </div>
                       <div className="flex flex-wrap gap-4 text-xs text-gray-500 items-center mt-2">
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
                             <span className="text-gray-400">Due:</span>
                             <span className="font-medium text-gray-700">{task.dueDate || 'No Date'}</span>
                          </div>
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">Priority: {task.priority}</span>
                       </div>
                    </div>
                    <button 
                       onClick={(e) => { e.stopPropagation(); onUpdateTask({...task, completed: true, updatedAt: new Date().toISOString()})}}
                       className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100"
                    >
                       <CheckCircle2 size={14} /> Complete
                    </button>
                 </div>
              );
           })}
        </div>
      </div>

      <div className="shrink-0 pt-4 border-t border-gray-200 flex gap-2">
         {['all', 'overdue', 'today'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition
                ${filter === f ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
              `}
            >
               {f}
            </button>
         ))}
      </div>
    </div>
  );
};

const WeeklyView = ({ tasks, onAddTaskForDay, notes, onUpdateNotes, onEditTask }: { tasks: Task[], onAddTaskForDay: (date: string) => void, notes: string, onUpdateNotes: (n: string) => void, onEditTask: (t: Task) => void }) => {
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

  useEffect(() => {
    const now = new Date();
    const currentDay = now.getDay(); 
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    
    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    setCurrentWeek(days);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 flex flex-col h-full">
      <div className="flex justify-between items-end shrink-0">
         <div>
            <h2 className="text-2xl font-bold text-gray-900">Weekly Overview</h2>
            <p className="text-gray-500">Structured summary of tasks and deadlines.</p>
         </div>
         <div className="text-sm text-gray-400">
            {currentWeek.length > 0 && `${currentWeek[0].toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${currentWeek[4].toLocaleDateString(undefined, {month:'short', day:'numeric'})}`}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-h-[300px] flex-1">
         {currentWeek.map(dateObj => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const dayTasks = tasks.filter(t => !t.completed && t.dueDate === dateStr);

            return (
              <div key={dateStr} className={`bg-white rounded-xl border flex flex-col ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md z-10' : 'border-gray-200'}`}>
                 <div className={`p-3 border-b ${isToday ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'} flex justify-between items-center`}>
                    <div>
                       <h3 className={`font-bold text-sm ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>{dayName}</h3>
                       <p className="text-[10px] text-gray-400 font-medium">{dateObj.getDate()}</p>
                    </div>
                    <button 
                      onClick={() => onAddTaskForDay(dateStr)}
                      className={`p-1 rounded hover:bg-white transition ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}
                      title="Add task for this day"
                    >
                       <PlusCircle size={16} />
                    </button>
                 </div>
                 
                 <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-gray-50/30">
                    {dayTasks.length === 0 && (
                       <div className="text-[10px] text-gray-300 text-center py-8 italic select-none">Empty</div>
                    )}
                    {dayTasks.map(t => (
                       <div key={t.id} onClick={() => onEditTask(t)} className={`text-xs p-2 rounded border shadow-sm cursor-pointer hover:bg-gray-50 ${t.priority === 'High' ? 'bg-white border-rose-200 border-l-4 border-l-rose-500' : 'bg-white border-gray-200 border-l-4 border-l-gray-300'}`}>
                          <div className="font-medium text-gray-800 mb-1">{t.title}</div>
                          {t.priority === 'High' && <div className="text-[10px] text-rose-600 font-bold uppercase">High Priority</div>}
                       </div>
                    ))}
                 </div>
              </div>
            );
         })}
      </div>

      <div className="shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-4">
         <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" /> Weekly Goals & Notes
         </h3>
         <textarea 
            className="w-full h-20 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:border-indigo-500 focus:bg-white outline-none transition resize-none"
            placeholder="Jot down key objectives or reminders for this week..."
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
         />
      </div>
    </div>
  );
};

// --- Modals ---

const QuickAddNoteModal = ({ onClose, clients, onSave, preselectedClientId }: { onClose: () => void, clients: Client[], onSave: (note: Note) => void, preselectedClientId?: string }) => {
  const [summary, setSummary] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [clientId, setClientId] = useState<string>(preselectedClientId || '');
  
  // Drag logic
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const onUp = () => setIsDragging(false);
    if(isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
  }, [isDragging, dragOffset]);

  const handleSave = () => {
    if (!summary.trim()) return;
    onSave({
      id: `note-${Date.now()}`,
      summary,
      nextSteps,
      date: new Date().toISOString(),
      type: clientId ? 'client' : 'general',
      linkedClient: clientId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80]">
       <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={onClose}></div>
       <div 
         className="absolute bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200"
         style={{ left: pos.x, top: pos.y }}
       >
          <div 
            className="bg-indigo-600 p-4 flex justify-between items-center text-white cursor-move select-none"
            onMouseDown={e => {
              setIsDragging(true);
              setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
            }}
          >
             <h3 className="font-semibold flex items-center gap-2"><FileText size={18}/> New Note</h3>
             <button onClick={onClose} className="hover:text-indigo-200"><X size={20}/></button>
          </div>
          <div className="p-6 space-y-4">
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Link to Client</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  disabled={!!preselectedClientId}
                >
                   <option value="">General Note (No Client)</option>
                   {clients.filter(c => c.status === 'Active').map(c => (
                      <option key={c.id} value={c.id}>{c.preferredName}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title / Summary</label>
                <textarea 
                   className="w-full p-3 border border-gray-300 rounded-lg text-sm h-24 outline-none focus:border-indigo-500"
                   placeholder="Enter note content..."
                   value={summary}
                   onChange={e => setSummary(e.target.value)}
                   autoFocus
                />
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Steps</label>
                <textarea 
                   className="w-full p-3 border border-gray-300 rounded-lg text-sm h-16 outline-none focus:border-indigo-500"
                   placeholder="Follow-up items..."
                   value={nextSteps}
                   onChange={e => setNextSteps(e.target.value)}
                />
             </div>
             <div className="flex gap-2 justify-end">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save Note</button>
             </div>
          </div>
       </div>
    </div>
  );
};

// Unified Task Modal for Add and Edit
const TaskModal = ({ onClose, clients, onSave, onDelete, initialData }: { onClose: () => void, clients: Client[], onSave: (task: Task) => void, onDelete?: (id: string) => void, initialData?: Partial<Task> }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [clientId, setClientId] = useState<string>(initialData?.linkedClient || '');
  const [priority, setPriority] = useState<'High'|'Medium'|'Low'|'Urgent'>(initialData?.priority || 'Medium');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const isEditing = !!initialData?.id;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: initialData?.id || `task-${Date.now()}`,
      title,
      priority,
      dueDate,
      linkedClient: clientId || undefined,
      completed: initialData?.completed || false,
      notes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          <div className="bg-rose-600 p-4 flex justify-between items-center text-white">
             <h3 className="font-semibold flex items-center gap-2">
               <CheckSquare size={18}/> {isEditing ? 'Edit Task' : 'New Task'}
             </h3>
             <button onClick={onClose}><X size={20}/></button>
          </div>
          <div className="p-6 space-y-4">
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Task Title</label>
                <input 
                   className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500"
                   placeholder="e.g. Call Housing Authority"
                   value={title}
                   onChange={e => setTitle(e.target.value)}
                   autoFocus
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Priority</label>
                   <select 
                     className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500"
                     value={priority}
                     onChange={e => setPriority(e.target.value as any)}
                   >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                      <option>Urgent</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Due Date</label>
                   <input 
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                   />
                </div>
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Link to Client (Optional)</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                >
                   <option value="">General Task (No Client)</option>
                   {clients.filter(c => c.status === 'Active').map(c => (
                      <option key={c.id} value={c.id}>{c.preferredName}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes (Optional)</label>
                <textarea 
                   className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 h-20"
                   placeholder="Additional details..."
                   value={notes}
                   onChange={e => setNotes(e.target.value)}
                />
             </div>
             <div className="flex gap-2">
                {isEditing && onDelete && (
                   <button onClick={() => { onDelete(initialData!.id!); onClose(); }} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-red-50 hover:text-red-600 transition">
                      <Trash2 size={18} />
                   </button>
                )}
                <button onClick={handleSave} className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-medium hover:bg-rose-700 transition">
                   {isEditing ? 'Save Changes' : 'Create Task'}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

const QuickAddClientModal = ({ onClose, onClientCreated }: { onClose: () => void, onClientCreated: (client: Client) => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const response = await generateOSResponse(
        "Start the Client Intake Wizard. Provide the introductory message defined in the INTRODUCTION BEHAVIOR section, then wait for the user to say 'ready'. Do not ask the first question yet.", 
        CLIENT_INTAKE_CONTEXT
      );
      setMessages([{
        id: 'init',
        role: 'model',
        text: response,
        timestamp: new Date()
      }]);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    const history = messages.map(m => `${m.role === 'user' ? 'User' : 'System'}: ${m.text}`).join('\n');
    const fullContext = `${CLIENT_INTAKE_CONTEXT}\n\nPREVIOUS CONVERSATION:\n${history}`;

    const responseText = await generateOSResponse(userText, fullContext);

    // Check for JSON block indicating completion
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    let displayText = responseText;

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1];
        const clientData = JSON.parse(jsonStr);
        displayText = responseText.replace(/```json[\s\S]*?```/, '').trim(); 
        
        const newClient: Client = {
          id: `client-${Date.now()}`,
          preferredName: clientData.preferredName || "Unknown",
          legalName: clientData.legalName,
          status: clientData.status || "Active",
          intakeDate: clientData.intakeDate || new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          fullProfile: clientData.fullProfile || clientData
        };

        onClientCreated(newClient);
        setIsComplete(true);
        
      } catch (e) {
        console.error("Failed to parse client JSON", e);
      }
    }

    const newModelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: displayText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newModelMsg]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => { if(isComplete) onClose(); }}></div>
       <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="h-14 bg-teal-600 flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-2 text-white font-semibold">
                <User size={20} />
                <span>New Client Intake</span>
             </div>
             <button onClick={onClose} className="text-teal-100 hover:text-white transition">
                <X size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50" ref={scrollRef}>
             {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'}
                  `}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
             ))}
             {isLoading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                 </div>
               </div>
             )}
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
             {isComplete ? (
               <button 
                 onClick={onClose}
                 className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition shadow-md"
               >
                 Close & View Client
               </button>
             ) : (
               <div className="flex gap-3">
                 <input 
                   className="flex-1 bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-teal-500 rounded-xl px-4 py-3 outline-none transition-all text-sm text-gray-800"
                   placeholder="Type 'ready' to begin..."
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                   disabled={isLoading}
                   autoFocus
                 />
                 <button 
                   onClick={handleSend}
                   disabled={isLoading || !input.trim()}
                   className={`px-4 rounded-xl flex items-center justify-center transition-all
                     ${input.trim() ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md' : 'bg-gray-200 text-gray-400'}
                   `}
                 >
                   <Send size={20} />
                 </button>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

const ActivityLogHub = ({ activities }: { activities: OSActivity[] }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">System Activity Log</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {act.timestamp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-indigo-600">
                    {act.type}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {act.target || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {act.description}
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PartnershipsHub = ({ partners, onAddPartner, onUpdatePartner, onDeletePartner }: { partners: Partner[], onAddPartner: (p: Partner) => void, onUpdatePartner: (p: Partner) => void, onDeletePartner: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'Shelters' | 'County Agencies' | 'Housing Partners' | 'Legal Aid'>('Shelters');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const filteredPartners = partners.filter(p => p.category === activeTab);

  const handleSave = (p: Partner) => {
    if (isAdding) {
      onAddPartner({ ...p, id: `partner-${Date.now()}`, category: activeTab });
    } else {
      onUpdatePartner(p);
    }
    setEditingPartner(null);
    setIsAdding(false);
  };

  const PartnerForm = ({ initialData, onSave, onCancel }: { initialData?: Partial<Partner>, onSave: (p: Partner) => void, onCancel: () => void }) => {
    const [form, setForm] = useState(initialData || {});
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg mb-2">{isAdding ? 'Add Partner' : 'Edit Partner'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className="w-full border p-2 rounded text-sm" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Address</label><input className="w-full border p-2 rounded text-sm" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className="w-full border p-2 rounded text-sm" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Website</label><input className="w-full border p-2 rounded text-sm" value={form.website || ''} onChange={e => setForm({...form, website: e.target.value})} /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Notes</label><textarea className="w-full border p-2 rounded text-sm" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form as Partner)} className="px-4 py-2 bg-rose-600 text-white rounded text-sm hover:bg-rose-700">Save</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Partnerships & Collaboration</h2>
        <button onClick={() => { setIsAdding(true); setEditingPartner({} as Partner); }} className="bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-rose-700 transition"><PlusCircle size={18} /> Add Partner</button>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {['Shelters', 'County Agencies', 'Housing Partners', 'Legal Aid'].map(tab => (
          <button 
            key={tab} 
            onClick={() => { setActiveTab(tab as any); setEditingPartner(null); setIsAdding(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === tab ? 'bg-rose-100 text-rose-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {(isAdding || editingPartner) ? (
        <PartnerForm 
          initialData={editingPartner || {}} 
          onSave={handleSave} 
          onCancel={() => { setEditingPartner(null); setIsAdding(false); }} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPartners.map(p => (
            <div key={p.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition group relative">
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditingPartner(p)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><Pencil size={16}/></button>
                  <button onClick={() => onDeletePartner(p.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={16}/></button>
               </div>
               <h3 className="font-bold text-gray-800 mb-2">{p.name}</h3>
               <div className="space-y-1 text-sm text-gray-600">
                  {p.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-rose-400"/> {p.address}</div>}
                  {p.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-rose-400"/> {p.phone}</div>}
                  {p.website && <div className="flex items-center gap-2"><Globe size={14} className="text-rose-400"/> {p.website}</div>}
                  {p.notes && <div className="mt-3 pt-3 border-t border-gray-100 text-gray-500 italic">{p.notes}</div>}
               </div>
            </div>
          ))}
          {filteredPartners.length === 0 && <div className="col-span-2 text-center py-10 text-gray-400">No partners listed in this category.</div>}
        </div>
      )}
    </div>
  );
};

const ClientHub = ({ 
  clients, 
  activities, 
  onAddClient, 
  onUpdateClient, 
  onOpenIntake, 
  onLogActivity,
  resetViewTrigger,
  onAddNote,
  notes 
}: {
  clients: Client[];
  activities: ClientActivity[];
  onAddClient: (c: Client) => void;
  onUpdateClient: (c: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (a: any) => void;
  resetViewTrigger: number;
  onAddNote: (clientId: string) => void;
  notes: Note[];
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showIntakeTemplate, setShowIntakeTemplate] = useState(false);

  useEffect(() => {
    if (resetViewTrigger > 0) {
      setView('list');
      setSelectedClient(null);
      setIsEditing(false);
    }
  }, [resetViewTrigger]);

  const filteredClients = clients.filter(c => 
    c.preferredName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.legalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = () => {
    setEditForm(JSON.parse(JSON.stringify(selectedClient!.fullProfile)));
    setIsEditing(true);
  };

  const saveEdit = () => {
    const updated = {
      ...selectedClient!,
      lastUpdated: new Date().toISOString(),
      fullProfile: editForm
    };
    onUpdateClient(updated);
    setSelectedClient(updated);
    setIsEditing(false);
    onLogActivity({ type: 'Edit', description: 'Updated client profile', clientName: updated.preferredName });
  };

  const getClientNotes = (clientId: string) => {
    // Merge global notes linked to client AND internal contact log
    const globalNotes = notes.filter(n => n.linkedClient === clientId);
    const internalLog = selectedClient?.fullProfile.contactLog || [];
    // Convert global notes to match log format for display or just show both lists?
    // Prompt says "Notes section showing: All notes linked to that client"
    return [...globalNotes, ...internalLog].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  };

  if (showIntakeTemplate) {
    return (
      <div className="h-full flex flex-col p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Intake Form Template</h2>
          <button onClick={() => setShowIntakeTemplate(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Back</button>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
           <p className="mb-4">This is the Master Intake Template editor.</p>
           <p className="text-sm">In a full implementation, you would drag-and-drop form fields here to configure the wizard.</p>
           <button onClick={() => { onLogActivity({ type: 'Template', description: 'Intake Form Template updated' }); setShowIntakeTemplate(false); }} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">Save Changes</button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedClient) {
    const clientNotes = getClientNotes(selectedClient.id);

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
        <button 
          onClick={() => { setView('list'); setSelectedClient(null); setIsEditing(false); }}
          className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition shrink-0"
        >
          <ArrowLeft size={18} /> Back to Client List
        </button>
        
        {/* Client Detail Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
             <div className="p-6 border-b border-gray-200 bg-teal-50 flex justify-between items-start shrink-0">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900">{selectedClient.preferredName}</h2>
                   <div className="flex gap-2 mt-2 text-sm text-gray-600">
                      <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{selectedClient.status}</span>
                      <span>•</span>
                      <span>ID: {selectedClient.id}</span>
                   </div>
                </div>
                <div className="flex gap-2">
                   {isEditing ? (
                     <>
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Cancel</button>
                        <button onClick={saveEdit} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium">Save Changes</button>
                     </>
                   ) : (
                     <>
                        <button onClick={startEditing} className="bg-white text-gray-700 px-3 py-1.5 rounded border border-gray-200 shadow-sm hover:bg-gray-50 text-sm font-medium">Edit Profile</button>
                        <button onClick={() => onAddNote(selectedClient.id)} className="bg-teal-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-teal-700 text-sm font-medium">Add Note</button>
                     </>
                   )}
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6">
                {isEditing ? (
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-bold text-gray-500">Preferred Name</label><input className="w-full border p-2 rounded" value={editForm.preferredName || selectedClient.preferredName} onChange={e => setEditForm({...editForm, preferredName: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-gray-500">Legal Name</label><input className="w-full border p-2 rounded" value={editForm.legalName || selectedClient.legalName} onChange={e => setEditForm({...editForm, legalName: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-gray-500">Pronouns</label><input className="w-full border p-2 rounded" value={editForm.pronouns} onChange={e => setEditForm({...editForm, pronouns: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-gray-500">DOB</label><input className="w-full border p-2 rounded" value={editForm.dob} onChange={e => setEditForm({...editForm, dob: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-gray-500">Phone</label><input className="w-full border p-2 rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                         <div><label className="text-xs font-bold text-gray-500">Email</label><input className="w-full border p-2 rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full border p-2 rounded" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Housing Status</label><input className="w-full border p-2 rounded" value={editForm.housingStatus} onChange={e => setEditForm({...editForm, housingStatus: e.target.value})} /></div>
                         
                         <div className="col-span-2 pt-4 border-t"><h4 className="font-bold mb-2">Goals & Plan</h4></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Short Term Goals</label><textarea className="w-full border p-2 rounded" value={editForm.shortTermGoals} onChange={e => setEditForm({...editForm, shortTermGoals: e.target.value})} /></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Long Term Goals</label><textarea className="w-full border p-2 rounded" value={editForm.longTermGoals} onChange={e => setEditForm({...editForm, longTermGoals: e.target.value})} /></div>
                         
                         <div className="col-span-2 pt-4 border-t"><h4 className="font-bold mb-2">Safety</h4></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Safety Plan</label><textarea className="w-full border p-2 rounded" value={editForm.safety?.safetyPlan} onChange={e => setEditForm({...editForm, safety: {...editForm.safety, safetyPlan: e.target.value}})} /></div>
                         <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Crisis Concerns</label><textarea className="w-full border p-2 rounded" value={editForm.safety?.crisisConcerns} onChange={e => setEditForm({...editForm, safety: {...editForm.safety, crisisConcerns: e.target.value}})} /></div>
                      </div>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-6">
                         <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Info</h3>
                            <div className="space-y-2 text-sm">
                               <div className="flex items-center gap-2 text-gray-700"><IconComponent name="Phone" className="w-4 h-4 text-gray-400"/> {selectedClient.fullProfile.phone}</div>
                               <div className="flex items-center gap-2 text-gray-700"><IconComponent name="Mail" className="w-4 h-4 text-gray-400"/> {selectedClient.fullProfile.email}</div>
                               <div className="flex items-start gap-2 text-gray-700"><IconComponent name="MapPin" className="w-4 h-4 text-gray-400 mt-0.5"/> {selectedClient.fullProfile.address}</div>
                            </div>
                         </div>
                         <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Demographics</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                               <p>DOB: {selectedClient.fullProfile.dob} (Age: {calculateAge(selectedClient.fullProfile.dob)})</p>
                               <p>Pronouns: {selectedClient.fullProfile.pronouns}</p>
                            </div>
                         </div>
                         <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Household</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                               {selectedClient.fullProfile.householdMembers?.map((m: any, i: number) => (
                                  <div key={i}>{m.name} ({m.age}) - {m.relationship}</div>
                               )) || "None listed"}
                            </div>
                         </div>
                      </div>
                      
                      <div className="col-span-2 space-y-6">
                         <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-indigo-900 text-sm">
                            <h4 className="font-bold mb-1">Current Goals</h4>
                            <p className="mb-2"><strong>Short Term:</strong> {selectedClient.fullProfile.shortTermGoals || "No short term goals listed."}</p>
                            <p><strong>Long Term:</strong> {selectedClient.fullProfile.longTermGoals || "No long term goals listed."}</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                               <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <IconComponent name="ShieldAlert" className="w-4 h-4 text-rose-500"/> Safety
                               </h4>
                               <p className="text-sm text-gray-600">{selectedClient.fullProfile.safety?.crisisConcerns || "No immediate concerns."}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                               <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <IconComponent name="Home" className="w-4 h-4 text-teal-500"/> Housing
                               </h4>
                               <p className="text-sm text-gray-600">{selectedClient.fullProfile.housingStatus}</p>
                            </div>
                         </div>

                         <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Notes & History</h3>
                            <div className="space-y-3">
                               {clientNotes.map((note: any, i: number) => (
                                  <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                     <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-700">{new Date(note.date || note.createdAt).toLocaleDateString()}</span>
                                        <span className="text-xs text-gray-500 uppercase">{note.type || 'Note'}</span>
                                     </div>
                                     <p className="text-gray-600">{note.summary}</p>
                                     {note.nextSteps && <p className="mt-1 text-teal-600 text-xs font-medium">Next: {note.nextSteps}</p>}
                                  </div>
                               ))}
                               {clientNotes.length === 0 && <div className="text-gray-400 italic text-sm">No notes recorded.</div>}
                            </div>
                         </div>
                      </div>
                   </div>
                )}
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
            <p className="text-gray-500">Active cases and profiles.</p>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setShowIntakeTemplate(true)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Intake Forms</button>
             <button 
               onClick={onOpenIntake}
               className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 transition shadow-sm"
             >
                <User size={18} /> New Intake
             </button>
          </div>
       </div>

       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                   className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500 transition"
                   placeholder="Search clients..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Filter size={18}/></button>
          </div>
          
          <div className="divide-y divide-gray-100">
             {filteredClients.map(client => (
                <div 
                  key={client.id} 
                  onClick={() => { setSelectedClient(client); setView('detail'); onLogActivity({ type: 'View', description: 'Viewed client profile', clientName: client.preferredName }); }}
                  className="p-4 flex items-center gap-4 hover:bg-teal-50/50 cursor-pointer transition group"
                >
                   <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold">
                      {client.preferredName[0]}
                   </div>
                   <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{client.preferredName} {client.legalName ? `(${client.legalName})` : ''}</h3>
                      <p className="text-xs text-gray-500">{client.status} • Last updated: {new Date(client.lastUpdated).toLocaleDateString()}</p>
                   </div>
                   <div className="text-right text-sm text-gray-500">
                      <div>{client.fullProfile.caseManager || 'Unassigned'}</div>
                      <div className="text-xs opacity-70">{client.fullProfile.programType}</div>
                   </div>
                   <ChevronRight className="text-gray-300 group-hover:text-teal-500 transition" size={18} />
                </div>
             ))}
             {filteredClients.length === 0 && (
                <div className="p-12 text-center text-gray-400">No clients found matching "{searchTerm}"</div>
             )}
          </div>
       </div>
    </div>
  );
};

const OSWindow: React.FC<OSWindowProps> = ({ 
  win, isActive, onActivate, onClose, onMinimize, onOpenChat, clients, activities, osActivities, tasks,
  onAddClient, onUpdateClient, onOpenIntake, onLogActivity, resetViewTrigger, onUpdateTask, onOpenTaskModal, onAddTaskForDay,
  notes, onUpdateNotes, weeklyNotes, onAddNote
}) => {
  const hub = HUBS.find(h => h.id === win.hubId);
  const isActivityLog = win.hubId === 'activity-log';
  const isPartnerships = win.hubId === 'partnerships';
  const isSpecialView = ['priorities', 'urgent', 'weekly'].includes(win.hubId);
  
  // Custom Window Logic
  let title = win.title;
  let icon = 'Square';
  let color = 'bg-gray-500';

  if (isActivityLog) {
     title = 'Recent Activity Log';
     icon = 'Activity';
     color = 'bg-gray-700';
  } else if (win.hubId === 'priorities') {
     title = 'Top Priorities';
     icon = 'AlertCircle';
     color = 'bg-rose-600';
  } else if (win.hubId === 'urgent') {
     title = 'Urgent Follow Ups';
     icon = 'Clock';
     color = 'bg-amber-600';
  } else if (win.hubId === 'weekly') {
     title = 'Weekly Overview';
     icon = 'CalendarDays';
     color = 'bg-indigo-600';
  } else if (hub) {
     title = hub.name;
     icon = hub.icon;
     color = hub.color;
  }

  // State lifting for this window's specific task editor
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);

  // Dragging logic
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - win.position.x,
      y: e.clientY - win.position.y
    });
    onActivate(win.id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      if (windowRef.current) {
        windowRef.current.style.left = `${newX}px`;
        windowRef.current.style.top = `${newY}px`;
      }
    };
    const handleMouseUp = () => { if (isDragging) setIsDragging(false); };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const initialStyle = {
    left: win.position.x,
    top: win.position.y,
    zIndex: isActive ? 50 : win.zIndex,
    display: win.isOpen && !win.isMinimized ? 'flex' : 'none'
  };

  const handleEditTask = (task: Task) => setTaskToEdit(task);
  const handleCloseTaskEditor = () => setTaskToEdit(null);

  const renderContent = () => {
    if (isActivityLog) return <ActivityLogHub activities={osActivities} />;
    if (win.hubId === 'priorities') return <PrioritiesView tasks={tasks} onUpdateTask={onUpdateTask} onEditTask={handleEditTask} onOpenTaskModal={onOpenTaskModal} />;
    if (win.hubId === 'urgent') return <UrgentView tasks={tasks} clients={clients} onUpdateTask={onUpdateTask} onEditTask={handleEditTask} />;
    if (win.hubId === 'weekly') return <WeeklyView tasks={tasks} onAddTaskForDay={onAddTaskForDay} notes={weeklyNotes} onUpdateNotes={onUpdateNotes} onEditTask={handleEditTask} />;
    if (isPartnerships) return <PartnershipsHub partners={partners} onAddPartner={(p) => setPartners([...partners, p])} onUpdatePartner={(p) => setPartners(partners.map(x => x.id === p.id ? p : x))} onDeletePartner={(id) => setPartners(partners.filter(x => x.id !== id))} />;

    if (!hub) return null;

    if (hub.id === 'clients') {
      return (
        <ClientHub 
          clients={clients} 
          activities={activities} 
          onAddClient={onAddClient} 
          onUpdateClient={onUpdateClient}
          onOpenIntake={onOpenIntake}
          onLogActivity={onLogActivity}
          resetViewTrigger={resetViewTrigger}
          onAddNote={onAddNote}
          notes={notes}
        />
      );
    }

    return (
       <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {hub.name}</h1>
            <p className="text-gray-500">{hub.description}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
             {hub.pages.map(page => (
                <div key={page} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-3 hover:shadow-md transition cursor-pointer group text-center h-40">
                   <div className={`w-12 h-12 rounded-full ${hub.color.replace('bg-', 'bg-').replace('500', '100').replace('600', '100')} flex items-center justify-center group-hover:scale-110 transition`}>
                      <IconComponent name="FileText" className={`w-6 h-6 ${hub.color.replace('bg-', 'text-')}`} />
                   </div>
                   <span className="font-semibold text-gray-700">{page}</span>
                </div>
             ))}
          </div>
       </div>
    );
  };

  return (
    <>
      <div ref={windowRef} className={`fixed w-[90vw] h-[80vh] max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden transition-opacity duration-200 border border-gray-200 ${isActive ? 'opacity-100' : 'opacity-100'}`} style={initialStyle} onClick={() => onActivate(win.id)}>
        <div className={`h-10 ${color} flex items-center justify-between px-3 shrink-0 cursor-move`} onMouseDown={handleMouseDown}>
           <div className="flex items-center gap-2 text-white font-medium text-sm pointer-events-none"><IconComponent name={icon} className="w-4 h-4 opacity-80" />{title}</div>
           <div className="flex items-center gap-2 window-controls">
              <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}><Minimize size={14} /></button>
              <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white"><Square size={12} /></button>
              <button className="p-1 hover:bg-red-500/80 rounded text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); onClose(win.id); }}><X size={14} /></button>
           </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 flex">
          {!isActivityLog && !isSpecialView && !isPartnerships && (
            <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block shrink-0">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Pages</h4>
              <ul className="space-y-1">{hub?.pages.map(page => <li key={page} className="text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded cursor-pointer transition">{page}</li>)}</ul>
            </div>
          )}
          <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">{renderContent()}</div>
        </div>
      </div>
      
      {/* Specific Task Editor for this window context */}
      {taskToEdit && (
        <TaskModal 
          initialData={taskToEdit} 
          onClose={handleCloseTaskEditor} 
          clients={clients} 
          onSave={onUpdateTask}
          onDelete={(id) => { /* Handle delete logic passed from parent */ }} 
        />
      )}
    </>
  );
};

// --- Main Desktop ---

export default function Desktop() {
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const [showClientIntake, setShowClientIntake] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalClientId, setNoteModalClientId] = useState<string | undefined>(undefined);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalProps, setTaskModalProps] = useState<{initialDate?: string, initialPriority?: 'High'|'Medium'|'Low'}>({});

  const [resetViewTrigger, setResetViewTrigger] = useState(0); 
  const [pinnedApps, setPinnedApps] = useState<string[]>(['command', 'clients', 'partnerships']);
  
  const [clients, setClients] = useState<Client[]>([DEFAULT_CLIENT as unknown as Client]); 
  const [weeklyNotes, setWeeklyNotes] = useState("Focus on grant reporting and hiring plan.");
  const [activities, setActivities] = useState<ClientActivity[]>([{ id: 'act-1', timestamp: new Date(Date.now() - 3600000), type: 'System', description: 'System initialized', clientName: 'Jordan' }]);
  const [osActivities, setOsActivities] = useState<OSActivity[]>([{ id: 'os-1', timestamp: new Date(Date.now() - 3600000), type: 'System', description: 'OS Booted Successfully', target: 'System' }]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: '1', role: 'model', text: 'Welcome to AdminOS. How can I support you today?', timestamp: new Date() }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const logOSActivity = (type: string, description: string, target?: string) => {
    const newAct: OSActivity = { id: `os-${Date.now()}`, timestamp: new Date(), type, description, target };
    setOsActivities(prev => [newAct, ...prev]);
  };

  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    const desc = 'New client intake completed';
    setActivities(prev => [{ id: `act-${Date.now()}`, timestamp: new Date(), type: 'New Client', description: desc, clientName: client.preferredName }, ...prev]);
    logOSActivity('Intake', desc, client.preferredName);
    setResetViewTrigger(prev => prev + 1);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    logOSActivity('Edit', 'Client profile updated', updatedClient.preferredName);
  };

  const handleLogClientActivity = (activity: Omit<ClientActivity, 'id' | 'timestamp'>) => {
    setActivities(prev => [{ id: `act-${Date.now()}`, timestamp: new Date(), ...activity }, ...prev]);
    if (activity.type !== 'View') logOSActivity(activity.type, activity.description, activity.clientName);
  };

  const handleSaveNote = (note: Note) => {
    setNotes(prev => [note, ...prev]);
    const client = clients.find(c => c.id === note.linkedClient);
    if (client) {
      const newContactLog = { date: new Date().toISOString(), type: 'Note', summary: note.summary, nextSteps: note.nextSteps };
      // Deep merge note into client profile to sync "Notes section" with "Contact Log" logic if needed,
      // but for now we keep global notes separate but linked. 
      // Update: The ClientHub logic now merges them for display.
      
      handleLogClientActivity({ type: 'Note', description: 'New note added', clientName: client.preferredName });
    } else {
      logOSActivity('Note', 'New general note created', 'General');
    }
  };

  const handleSaveTask = (task: Task) => {
    if (tasks.find(t => t.id === task.id)) {
        handleUpdateTask(task);
    } else {
        setTasks(prev => [task, ...prev]);
        const client = clients.find(c => c.id === task.linkedClient);
        if (client) {
          handleLogClientActivity({ type: 'Task', description: `Task created: ${task.title}`, clientName: client.preferredName });
        } else {
          logOSActivity('Task', 'Administrative task created', 'General');
        }
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    const isCompletionToggle = updatedTask.completed !== tasks.find(t => t.id === updatedTask.id)?.completed;
    if (isCompletionToggle) {
       const status = updatedTask.completed ? 'completed' : 'reopened';
       logOSActivity('Task', `Task ${status}: ${updatedTask.title}`, 'Tasks');
    } else {
       logOSActivity('Task', `Task updated: ${updatedTask.title}`, 'Tasks');
    }
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      logOSActivity('Task', 'Task deleted', 'Tasks');
  };

  const handleOpenTaskModal = (props: {initialDate?: string, initialPriority?: 'High'|'Medium'|'Low'} = {}) => {
    setTaskModalProps(props);
    setShowTaskModal(true);
  };

  const openApp = (hub: Hub | {id: string, name: string}) => {
    const existing = windows.find(w => w.hubId === hub.id);
    if (existing) {
      if (existing.isMinimized) setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false } : w));
      setActiveWindowId(existing.id);
      setIsLauncherOpen(false);
      return;
    }
    const count = windows.length;
    const startX = window.innerWidth / 2 - 400 + (count * 30);
    const startY = window.innerHeight / 2 - 300 + (count * 30);
    const newWindow: AppWindow = { id: Date.now().toString(), hubId: hub.id, title: hub.name, isOpen: true, isMinimized: false, zIndex: windows.length + 1, position: { x: startX, y: startY } };
    setWindows([...windows, newWindow]);
    setActiveWindowId(newWindow.id);
    setIsLauncherOpen(false);
  };

  const closeWindow = (id: string) => { setWindows(windows.filter(w => w.id !== id)); if (activeWindowId === id) setActiveWindowId(null); };
  const minimizeWindow = (id: string) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w)); setActiveWindowId(null); };
  const restoreWindow = (id: string) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false } : w)); setActiveWindowId(id); };
  const toggleLauncher = () => setIsLauncherOpen(!isLauncherOpen);
  const togglePin = (hubId: string) => {
    if (pinnedApps.includes(hubId)) {
      setPinnedApps(prev => prev.filter(id => id !== hubId));
      logOSActivity('System', `Unpinned app: ${hubId}`, 'Dock');
    } else {
      setPinnedApps(prev => [...prev, hubId]);
      logOSActivity('System', `Pinned app: ${hubId}`, 'Dock');
    }
  };

  const openActivityLog = () => openApp({ id: 'activity-log', name: 'Recent Activity Log' });
  const openPriorities = () => openApp({ id: 'priorities', name: 'Top Priorities' });
  const openUrgent = () => openApp({ id: 'urgent', name: 'Urgent Follow Ups' });
  const openWeekly = () => openApp({ id: 'weekly', name: 'Weekly Overview' });

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    let context = "";
    if (activeWindowId) {
      const activeWin = windows.find(w => w.id === activeWindowId);
      const activeHub = HUBS.find(h => h.id === activeWin?.hubId);
      if (activeHub) context = `User is currently looking at the "${activeHub.name}" Hub. Description: ${activeHub.description}. Pages available: ${activeHub.pages.join(', ')}.`;
    }
    const responseText = await generateOSResponse(userMsg.text, context);
    const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  return (
    <div className="w-full h-screen bg-cover bg-center overflow-hidden relative" style={{ backgroundImage: `linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)` }}>
      <TopBar />
      <WidgetArea notifications={MOCK_NOTIFICATIONS} onOpenUrgent={openUrgent} />
      
      {/* Minimized Widgets Area */}
      <MinimizedWidgets windows={windows} onRestore={restoreWindow} />

      {windows.map(win => (
        <OSWindow 
          key={win.id} 
          win={win} 
          isActive={activeWindowId === win.id}
          onActivate={(id) => setActiveWindowId(id)}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onOpenChat={() => setChatOpen(true)}
          clients={clients}
          activities={activities}
          osActivities={osActivities}
          tasks={tasks}
          notes={notes}
          onAddClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          onOpenIntake={() => setShowClientIntake(true)}
          onLogActivity={handleLogClientActivity}
          resetViewTrigger={resetViewTrigger}
          onUpdateTask={handleSaveTask} 
          onOpenTaskModal={() => handleOpenTaskModal({initialPriority: 'High'})}
          onAddTaskForDay={(date) => handleOpenTaskModal({initialDate: date})}
          onUpdateNotes={setWeeklyNotes}
          weeklyNotes={weeklyNotes}
          onAddNote={(clientId) => { setNoteModalClientId(clientId); setShowNoteModal(true); }}
        />
      ))}
      
      {showClientIntake && <QuickAddClientModal onClose={() => setShowClientIntake(false)} onClientCreated={handleAddClient} />}
      {showNoteModal && <QuickAddNoteModal onClose={() => { setShowNoteModal(false); setNoteModalClientId(undefined); }} clients={clients} onSave={handleSaveNote} preselectedClientId={noteModalClientId} />}
      {showTaskModal && <TaskModal onClose={() => setShowTaskModal(false)} clients={clients} onSave={handleSaveTask} onDelete={handleDeleteTask} initialData={taskModalProps.initialDate ? {dueDate: taskModalProps.initialDate} : {priority: taskModalProps.initialPriority}} />}

      <Launcher isOpen={isLauncherOpen} onClose={() => setIsLauncherOpen(false)} onOpenApp={openApp} />
      <ChatOverlay isOpen={chatOpen} onClose={() => setChatOpen(false)} onOpen={() => setChatOpen(true)} messages={messages} input={input} setInput={setInput} onSend={handleSendMessage} isLoading={isLoading} />
      <Shelf windows={windows} activeId={activeWindowId} onRestore={restoreWindow} onMinimize={minimizeWindow} onToggleLauncher={toggleLauncher} launcherOpen={isLauncherOpen} pinnedApps={pinnedApps} onTogglePin={togglePin} />
    </div>
  );
}