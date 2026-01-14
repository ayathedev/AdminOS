import React, { useState, useEffect, useRef } from 'react';
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
import { Hub, AppWindow, ChatMessage, Client, ClientActivity, OSActivity, Note, Task, Partner } from '../types';
import { generateOSResponse } from '../services/geminiService';

// --- Type Definitions ---

interface OSWindowProps {
  win: AppWindow;
  isActive: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onOpenChat: () => void;
  onNavigate: (id: string, page: string) => void;
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
  weeklyNotes: string;
  onAddNote: (clientId: string) => void;
  onSaveNote: (note: Note) => void;
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
         else if (win.hubId === 'note-editor') icon = 'StickyNote';

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

const Shelf = ({ windows, activeId, onRestore, onMinimize, onToggleLauncher, launcherOpen, pinnedApps, onTogglePin, onOpenApp }: { windows: AppWindow[], activeId: string | null, onRestore: (id: string) => void, onMinimize: (id: string) => void, onToggleLauncher: () => void, launcherOpen: boolean, pinnedApps: string[], onTogglePin: (id: string) => void, onOpenApp: (hub: any) => void }) => {
  const dockItems = new Map<string, { hubId: string, winId?: string, isOpen: boolean, isMinimized: boolean }>();

  pinnedApps.forEach(hubId => {
     dockItems.set(hubId, { hubId, isOpen: false, isMinimized: false });
  });

  windows.forEach(win => {
     if(win.hubId === 'note-editor') return;

     if (dockItems.has(win.hubId)) {
        dockItems.set(win.hubId, { hubId: win.hubId, winId: win.id, isOpen: true, isMinimized: win.isMinimized });
     } else {
        dockItems.set(win.hubId, { hubId: win.hubId, winId: win.id, isOpen: true, isMinimized: win.isMinimized });
     }
  });

  const sortedItems = Array.from(dockItems.values()).sort((a, b) => {
     const indexA = pinnedApps.indexOf(a.hubId);
     const indexB = pinnedApps.indexOf(b.hubId);
     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
     if (indexA !== -1) return -1;
     if (indexB !== -1) return 1;
     return 0;
  });

  const handleIconClick = (item: any) => {
    if (item.isOpen && item.winId) {
       if (item.isMinimized) {
          onRestore(item.winId);
       } else {
          onRestore(item.winId); 
       }
    } else {
       const hub = HUBS.find(h => h.id === item.hubId);
       if (hub) {
          onOpenApp(hub);
       } else {
          onOpenApp({ id: item.hubId, name: item.hubId });
       }
    }
  };

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
          const isActive = item.winId === activeId && !item.isMinimized;
          
          let icon = hub ? hub.icon : 'AppWindow';
          let color = hub ? hub.color : 'bg-gray-500';
          let title = hub ? hub.name : item.hubId;

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
                   onClick={() => handleIconClick(item)}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all duration-300 
                      ${color} ${isActive ? '-translate-y-2 ring-2 ring-offset-2 ring-indigo-200' : 'hover:-translate-y-1 opacity-80 hover:opacity-100'}
                      ${item.isMinimized ? 'opacity-50' : ''}
                   `}
                >
                   <IconComponent name={icon} className="w-5 h-5" />
                </button>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                   {title} {pinnedApps.includes(item.hubId) && "(Pinned)"}
                </div>
                {item.isOpen && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-500 rounded-full" />}
                {pinnedApps.includes(item.hubId) && !item.isOpen && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-gray-300 rounded-full" />}
             </div>
          );
       })}
    </div>
  );
};

// --- Note Editor Window ---

const NoteEditorContent = ({ 
  linkedClient, 
  onSave, 
  onCancel, 
  clients,
  initialData 
}: { 
  linkedClient?: string, 
  onSave: (note: Note) => void, 
  onCancel: () => void, 
  clients: Client[],
  initialData?: Note 
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || initialData?.summary || '');
  const [clientId, setClientId] = useState(linkedClient || initialData?.linkedClient || '');

  const handleSave = () => {
    if (!body.trim()) return; 
    
    const note: Note = {
        id: initialData?.id || `note-${Date.now()}`,
        title: title || 'Untitled Note',
        body: body,
        summary: body.substring(0, 100) + (body.length > 100 ? '...' : ''), 
        date: new Date().toISOString(),
        type: clientId ? 'client' : 'general',
        linkedClient: clientId || undefined,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    onSave(note);
  };

  const clientName = clients.find(c => c.id === clientId)?.preferredName || 'Unassigned';

  return (
    <div className="flex flex-col h-full bg-white">
       <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Note Title</label>
             <input 
                className="w-full border-b border-gray-200 py-2 text-lg font-semibold text-gray-800 outline-none focus:border-indigo-500 transition"
                placeholder="Enter title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
             />
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Note Content</label>
             <textarea 
                className="w-full h-48 border border-gray-200 rounded-lg p-3 text-sm leading-relaxed outline-none focus:border-indigo-500 transition resize-none"
                placeholder="Type your note here..."
                value={body}
                onChange={e => setBody(e.target.value)}
             />
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
             <User size={16} className="text-gray-400" />
             <span className="text-sm text-gray-600">Linked to: <strong>{clientName}</strong></span>
          </div>
       </div>
       <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition">Save Note</button>
       </div>
    </div>
  );
};

// --- View Components ---

const PrioritiesView = ({ tasks, onUpdateTask, onEditTask, onOpenTaskModal }: { tasks: Task[], onUpdateTask: (t: Task) => void, onEditTask: (t: Task) => void, onOpenTaskModal: () => void }) => {
  const highPriorityTasks = tasks.filter(t => !t.completed && t.priority === 'High');

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
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-rose-50 flex items-center gap-2">
             <AlertCircle size={18} className="text-rose-600" />
             <h3 className="font-semibold text-rose-800">High Priority</h3>
          </div>
          <div className="divide-y divide-gray-100">
             {highPriorityTasks.length === 0 && <div className="p-8 text-center text-gray-400">No high priority tasks.</div>}
             {highPriorityTasks.map(task => (
                <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition cursor-pointer" onClick={() => onEditTask(task)}>
                   <button onClick={(e) => { e.stopPropagation(); onUpdateTask({...task, completed: true, updatedAt: new Date().toISOString()})}} className="mt-0.5 text-gray-300 hover:text-green-500"><Circle size={20} /></button>
                   <div className="flex-1"><p className="font-medium text-gray-800">{task.title}</p></div>
                   <div className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded">High</div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

const ClientHub = ({ 
  clients, 
  onAddClient, 
  onUpdateClient, 
  onOpenIntake, 
  onLogActivity,
  resetViewTrigger,
  onAddNote,
  notes,
  activePage,
  onNavigate 
}: {
  clients: Client[];
  onAddClient: (c: Client) => void;
  onUpdateClient: (c: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (a: any) => void;
  resetViewTrigger: number;
  onAddNote: (clientId: string) => void;
  notes: Note[];
  activePage?: string;
  onNavigate: (page: string) => void;
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activePage === 'Intake Forms') {
       // Render Intake Template View
    } else if (activePage === 'Active Clients') {
       setSelectedClient(null);
    }
  }, [activePage]);

  const filteredClients = clients.filter(c => 
    c.preferredName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.legalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = () => {
    setEditForm(JSON.parse(JSON.stringify(selectedClient!.fullProfile)));
    setIsEditing(true);
  };

  const saveEdit = () => {
    const updated = { ...selectedClient!, lastUpdated: new Date().toISOString(), fullProfile: editForm };
    onUpdateClient(updated);
    setSelectedClient(updated);
    setIsEditing(false);
    onLogActivity({ type: 'Edit', description: 'Updated client profile', clientName: updated.preferredName });
  };

  if (activePage === 'Intake Forms') {
     return (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center h-full flex flex-col items-center justify-center">
           <FileText size={48} className="text-teal-200 mb-4" />
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Intake Form Template</h2>
           <p className="text-gray-500 max-w-md mx-auto mb-6">This is the master template for new client intakes. Editing this will affect all future intake wizard sessions.</p>
           <button className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition" onClick={() => onLogActivity({ type: 'System', description: 'Intake Form Template updated' })}>Save Template Changes</button>
        </div>
     );
  }

  if (selectedClient) {
    const clientNotes = [...(notes.filter(n => n.linkedClient === selectedClient.id)), ...(selectedClient.fullProfile.contactLog || [])]
        .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    return (
      <div className="h-full flex flex-col">
        <button onClick={() => setSelectedClient(null)} className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition shrink-0"><ArrowLeft size={18} /> Back</button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
             <div className="p-6 border-b border-gray-200 bg-teal-50 flex justify-between items-start shrink-0">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900">{selectedClient.preferredName}</h2>
                   <div className="text-sm text-gray-600">ID: {selectedClient.id}</div>
                </div>
                <div className="flex gap-2">
                   {isEditing ? (
                     <>
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                        <button onClick={saveEdit} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium">Save</button>
                     </>
                   ) : (
                     <>
                        <button onClick={startEditing} className="bg-white text-gray-700 px-3 py-1.5 rounded border shadow-sm text-sm font-medium"><Pencil size={14} className="inline mr-1"/> Edit</button>
                        <button onClick={() => onAddNote(selectedClient.id)} className="bg-teal-600 text-white px-3 py-1.5 rounded shadow-sm text-sm font-medium"><PlusCircle size={14} className="inline mr-1"/> Add Note</button>
                     </>
                   )}
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-6">
                {isEditing ? (
                   <div className="grid grid-cols-2 gap-4">
                      {/* Full Editable Fields */}
                      <div><label className="text-xs font-bold text-gray-500">Preferred Name</label><input className="w-full border p-2 rounded" value={editForm.preferredName} onChange={e => setEditForm({...editForm, preferredName: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Legal Name</label><input className="w-full border p-2 rounded" value={editForm.legalName} onChange={e => setEditForm({...editForm, legalName: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Phone</label><input className="w-full border p-2 rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Email</label><input className="w-full border p-2 rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                      <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full border p-2 rounded" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></div>
                      <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Short Term Goals</label><textarea className="w-full border p-2 rounded" value={editForm.shortTermGoals} onChange={e => setEditForm({...editForm, shortTermGoals: e.target.value})} /></div>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                         <h3 className="font-bold text-gray-400 text-xs uppercase">Contact</h3>
                         <p className="text-sm">Phone: {selectedClient.fullProfile.phone}</p>
                         <p className="text-sm">Email: {selectedClient.fullProfile.email}</p>
                         <p className="text-sm">Address: {selectedClient.fullProfile.address}</p>
                      </div>
                      <div className="col-span-2">
                         <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Notes</h3>
                         {clientNotes.map((n: any, i) => (
                            <div key={i} className="mb-3 bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                               <div className="font-semibold">{n.title || n.summary || 'Note'} <span className="text-xs font-normal text-gray-400 ml-2">{new Date(n.date || n.createdAt).toLocaleDateString()}</span></div>
                               <div className="text-gray-600 mt-1">{n.body || n.summary}</div>
                            </div>
                         ))}
                         {clientNotes.length === 0 && <div className="text-gray-400 italic">No notes found.</div>}
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
          <h2 className="text-2xl font-bold text-gray-900">Active Clients</h2>
          <button onClick={onOpenIntake} className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 transition"><User size={18} /> New Intake</button>
       </div>
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center gap-4">
             <Search className="text-gray-400" size={16} />
             <input className="w-full outline-none text-sm" placeholder="Search clients..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="divide-y divide-gray-100">
             {filteredClients.map(c => (
                <div key={c.id} onClick={() => setSelectedClient(c)} className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer">
                   <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold">{c.preferredName[0]}</div>
                   <div><div className="font-semibold">{c.preferredName}</div><div className="text-xs text-gray-500">{c.status}</div></div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

// --- Modals & Overlays ---

const Launcher = ({ isOpen, onClose, onOpenApp }: { isOpen: boolean, onClose: () => void, onOpenApp: (hub: Hub) => void }) => {
   if (!isOpen) return null;
   return (
     <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[600px] bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-200">
        <div className="grid grid-cols-4 gap-6">
           {HUBS.map(hub => (
              <button key={hub.id} onClick={() => onOpenApp(hub)} className="flex flex-col items-center gap-3 group">
                 <div className={`w-14 h-14 ${hub.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition duration-300`}>
                    <IconComponent name={hub.icon} className="w-7 h-7" />
                 </div>
                 <span className="text-xs font-medium text-gray-700">{hub.name}</span>
              </button>
           ))}
        </div>
     </div>
   );
 };
 
 const ChatOverlay = ({ isOpen, onClose, onOpen, messages, input, setInput, onSend, isLoading }: any) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);
 
    if (!isOpen) {
       return (
         <button onClick={onOpen} className="fixed bottom-4 right-4 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-indigo-700 transition z-[100]">
            <MessageSquare className="w-6 h-6" />
         </button>
       );
    }
 
    return (
      <div className="fixed bottom-24 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 z-[100] animate-in slide-in-from-right-10 fade-in">
         <div className="h-14 bg-indigo-600 flex items-center justify-between px-4 shrink-0 text-white">
            <div className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4"/> AdminOS Assistant</div>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
            {messages.map((m: ChatMessage) => (
               <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                     {m.text}
                  </div>
               </div>
            ))}
            {isLoading && <div className="text-xs text-gray-400 text-center animate-pulse">Thinking...</div>}
         </div>
         <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
               <input 
                 className="bg-transparent outline-none flex-1 text-sm" 
                 placeholder="Ask AdminOS..." 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && onSend()}
               />
               <button onClick={onSend} disabled={isLoading} className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"><Send className="w-4 h-4"/></button>
            </div>
         </div>
      </div>
    );
 };
 
 const TaskModal = ({ onClose, clients, onSave }: { onClose: () => void, clients: Client[], onSave: (t: Task) => void }) => {
   const [title, setTitle] = useState('');
   const [priority, setPriority] = useState<'High'|'Medium'|'Low'|'Urgent'>('Medium');
   const [linkedClient, setLinkedClient] = useState('');
 
   const handleSave = () => {
      if(!title) return;
      const newTask: Task = {
         id: Date.now().toString(),
         title,
         priority,
         linkedClient: linkedClient || undefined,
         completed: false,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
      };
      onSave(newTask);
      onClose();
   };
 
   return (
     <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center">
        <div className="bg-white w-96 rounded-xl shadow-2xl p-6">
           <h2 className="text-xl font-bold mb-4">New Task</h2>
           <div className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                 <input className="w-full border p-2 rounded" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                 <select className="w-full border p-2 rounded" value={priority} onChange={e => setPriority(e.target.value as any)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link Client (Optional)</label>
                 <select className="w-full border p-2 rounded" value={linkedClient} onChange={e => setLinkedClient(e.target.value)}>
                    <option value="">-- None --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.preferredName}</option>)}
                 </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                 <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                 <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium">Create Task</button>
              </div>
           </div>
        </div>
     </div>
   );
 }

 const QuickAddClientModal = ({ onClose, onClientCreated }: { onClose: () => void, onClientCreated: (c: Client) => void }) => {
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [input, setInput] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   
   useEffect(() => {
      const init = async () => {
         setIsLoading(true);
         const res = await generateOSResponse("Start intake", CLIENT_INTAKE_CONTEXT);
         setMessages([{ id: 'init', role: 'model', text: res, timestamp: new Date() }]);
         setIsLoading(false);
      };
      init();
   }, []);
 
   const send = async () => {
     if(!input.trim()) return;
     const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
     setMessages(p => [...p, userMsg]);
     setInput('');
     setIsLoading(true);
 
     const contextHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
     const response = await generateOSResponse(input, CLIENT_INTAKE_CONTEXT + "\n\nCONVERSATION HISTORY:\n" + contextHistory);
     
     const jsonMatch = response.match(/```json([\s\S]*?)```/);
     if (jsonMatch && jsonMatch[1]) {
         try {
            const clientData = JSON.parse(jsonMatch[1].trim());
            const newClient: Client = {
               id: `c-${Date.now()}`,
               preferredName: clientData.preferredName || "Unknown",
               legalName: clientData.legalName,
               status: clientData.status || 'Active',
               intakeDate: clientData.intakeDate || new Date().toISOString(),
               lastUpdated: new Date().toISOString(),
               fullProfile: clientData.fullProfile || {}
            };
            onClientCreated(newClient);
            onClose();
            return;
         } catch (e) {
            console.error("Failed to parse client data", e);
         }
     }
 
     setMessages(p => [...p, { id: Date.now().toString(), role: 'model', text: response.replace(/```json[\s\S]*?```/, ''), timestamp: new Date() }]);
     setIsLoading(false);
   };
 
   return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
           <div className="h-14 bg-teal-600 flex items-center justify-between px-6 text-white shrink-0">
              <div className="font-bold text-lg flex items-center gap-2"><UserPlus /> Client Intake Wizard</div>
              <button onClick={onClose}><X /></button>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                        <div className="whitespace-pre-wrap">{m.text}</div>
                     </div>
                  </div>
              ))}
              {isLoading && <div className="flex items-center gap-2 text-gray-400 text-sm ml-4"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/> Thinking...</div>}
           </div>
           <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                 <input className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-teal-500 transition" 
                   placeholder="Type your answer (or 'skip' to generate test data)..."
                   value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                 />
                 <button onClick={send} disabled={isLoading} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition disabled:opacity-50">Send</button>
              </div>
           </div>
        </div>
     </div>
   );
 };

const OSWindow: React.FC<OSWindowProps> = ({ 
  win, isActive, onActivate, onClose, onMinimize, onMaximize, onNavigate,
  clients, activities, osActivities, tasks, notes, onAddClient, onUpdateClient, onOpenIntake, onLogActivity,
  resetViewTrigger, onUpdateTask, onOpenTaskModal, onAddTaskForDay, onUpdateNotes, weeklyNotes, onAddNote, onSaveNote
}) => {
  const hub = HUBS.find(h => h.id === win.hubId);
  const isNoteEditor = win.hubId === 'note-editor';
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - win.position.x, y: e.clientY - win.position.y });
    onActivate(win.id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || win.isMaximized) return;
      if (windowRef.current) {
        windowRef.current.style.left = `${e.clientX - dragOffset.x}px`;
        windowRef.current.style.top = `${e.clientY - dragOffset.y}px`;
      }
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
  }, [isDragging, dragOffset, win.isMaximized]);

  const style = win.isMaximized 
    ? { top: 32, left: 0, width: '100%', height: 'calc(100vh - 4rem)', zIndex: isActive ? 50 : win.zIndex }
    : { top: win.position.y, left: win.position.x, width: win.size?.width ?? (isNoteEditor ? 520 : 900), height: win.size?.height ?? (isNoteEditor ? 420 : 600), zIndex: isActive ? 50 : win.zIndex };

  if (isNoteEditor) {
     return (
       <div ref={windowRef} className={`fixed bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 ${isActive ? 'ring-2 ring-indigo-200' : ''}`} style={style} onClick={() => onActivate(win.id)}>
          <div className="h-12 bg-indigo-600 flex items-center justify-between px-4 shrink-0 cursor-move text-white" onMouseDown={handleMouseDown}>
             <div className="font-semibold flex items-center gap-2"><FileText size={18}/> {win.title}</div>
             <button onClick={() => onClose(win.id)} className="hover:text-indigo-200"><X size={20}/></button>
          </div>
          <NoteEditorContent 
             linkedClient={win.noteData?.clientId} 
             clients={clients} 
             onSave={(n) => { onSaveNote(n); onClose(win.id); }} 
             onCancel={() => onClose(win.id)} 
          />
       </div>
     );
  }

  return (
    <div ref={windowRef} className={`fixed bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 transition-all duration-75`} style={style} onClick={() => onActivate(win.id)}>
       <div className={`h-10 ${hub?.color || 'bg-gray-700'} flex items-center justify-between px-3 shrink-0 cursor-move`} onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-2 text-white font-medium text-sm pointer-events-none"><IconComponent name={hub?.icon || 'Square'} className="w-4 h-4 opacity-80" />{hub?.name || win.title}</div>
          <div className="flex items-center gap-2 window-controls">
             <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => onMinimize(win.id)}><Minimize size={14} /></button>
             <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => onMaximize(win.id)}>{win.isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
             <button className="p-1 hover:bg-red-500/80 rounded text-white/80 hover:text-white" onClick={() => onClose(win.id)}><X size={14} /></button>
          </div>
       </div>
       <div className="flex-1 overflow-auto bg-gray-50 flex">
          {hub && !['activity-log', 'priorities', 'urgent', 'weekly'].includes(win.hubId) && (
             <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block shrink-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Pages</h4>
                <ul className="space-y-1">
                   {hub.pages.map(page => (
                      <li key={page} 
                          onClick={() => onNavigate(win.id, page)}
                          className={`text-sm px-3 py-2 rounded cursor-pointer transition ${win.activePage === page ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                         {page}
                      </li>
                   ))}
                </ul>
             </div>
          )}
          <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
             {win.hubId === 'clients' ? (
                <ClientHub 
                   clients={clients} activePage={win.activePage} onNavigate={(p) => onNavigate(win.id, p)}
                   onAddClient={onAddClient} onUpdateClient={onUpdateClient} onOpenIntake={onOpenIntake}
                   onLogActivity={onLogActivity} resetViewTrigger={resetViewTrigger} onAddNote={onAddNote} notes={notes}
                />
             ) : win.hubId === 'priorities' ? (
                <PrioritiesView tasks={tasks} onUpdateTask={onUpdateTask} onEditTask={() => {}} onOpenTaskModal={onOpenTaskModal} />
             ) : (
                <div className="text-gray-500">Content for {win.activePage || win.title}</div>
             )}
          </div>
       </div>
    </div>
  );
};

// --- Main Desktop ---

export default function Desktop() {
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const [showClientIntake, setShowClientIntake] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalProps, setTaskModalProps] = useState<any>({});

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

  const logOSActivity = (activity: { type: string, description: string, target?: string, clientName?: string }) => {
    setOsActivities(prev => [{ 
        id: `os-${Date.now()}`, 
        timestamp: new Date(), 
        type: activity.type, 
        description: activity.description, 
        target: activity.target 
    }, ...prev]);
  };

  const openApp = (hub: Hub | {id: string, name: string}, extraData?: any) => {
    const existing = windows.find(w => w.hubId === hub.id);
    if (existing) {
       setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false } : w));
       setActiveWindowId(existing.id);
       setIsLauncherOpen(false);
       return;
    }
    
    const count = windows.length;
    const newWindow: AppWindow = { 
       id: Date.now().toString(), 
       hubId: hub.id, 
       title: hub.name, 
       isOpen: true, 
       isMinimized: false, 
       zIndex: windows.length + 1, 
       position: { x: 100 + (count * 30), y: 50 + (count * 30) },
       activePage: (hub as Hub).pages ? (hub as Hub).pages[0] : undefined,
       noteData: extraData
    };
    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
    setIsLauncherOpen(false);
    logOSActivity({ type: 'System', description: `Launched ${hub.name}`, target: 'WindowManager' });
  };

  const toggleMaximize = (id: string) => {
    setWindows(prev => prev.map(w => {
       if (w.id !== id) return w;
       const isMax = !w.isMaximized;
       logOSActivity({ type: 'System', description: isMax ? `Maximized ${w.title}` : `Restored ${w.title}`, target: 'WindowManager' });
       return { ...w, isMaximized: isMax };
    }));
  };

  const closeWindow = (id: string) => {
     setWindows(prev => prev.filter(w => w.id !== id));
     if (activeWindowId === id) setActiveWindowId(null);
  };

  const updateWindowPage = (id: string, page: string) => {
     setWindows(prev => prev.map(w => w.id === id ? { ...w, activePage: page } : w));
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const responseText = await generateOSResponse(input);
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: 'Sorry, I encountered an error.', timestamp: new Date() }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-cover bg-center overflow-hidden relative" style={{ backgroundImage: `linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)` }}>
      <TopBar />
      <WidgetArea notifications={MOCK_NOTIFICATIONS} onOpenUrgent={() => openApp({ id: 'urgent', name: 'Urgent Follow Ups' })} />
      
      <MinimizedWidgets windows={windows} onRestore={(id) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false } : w)); setActiveWindowId(id); }} />

      {/* Blur overlay for Note Editor */}
      {windows.some(w => w.hubId === 'note-editor') && <div className="fixed inset-0 bg-white/30 backdrop-blur-sm z-[60]" />}

      {windows.map(win => (
        <OSWindow 
          key={win.id} 
          win={win} 
          isActive={activeWindowId === win.id}
          onActivate={(id) => setActiveWindowId(id)}
          onClose={closeWindow}
          onMinimize={(id) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w)); setActiveWindowId(null); }}
          onMaximize={toggleMaximize}
          onNavigate={updateWindowPage}
          onOpenChat={() => setChatOpen(true)}
          clients={clients}
          activities={activities}
          osActivities={osActivities}
          tasks={tasks}
          notes={notes}
          onAddClient={(c) => { setClients(p => [...p, c]); setResetViewTrigger(prev => prev+1); }}
          onUpdateClient={(c) => setClients(p => p.map(ex => ex.id === c.id ? c : ex))}
          onOpenIntake={() => setShowClientIntake(true)}
          onLogActivity={logOSActivity}
          resetViewTrigger={resetViewTrigger}
          onUpdateTask={(t) => setTasks(p => p.map(ex => ex.id === t.id ? t : ex))}
          onOpenTaskModal={() => setShowTaskModal(true)}
          onAddTaskForDay={() => {}}
          onUpdateNotes={setWeeklyNotes}
          weeklyNotes={weeklyNotes}
          onAddNote={(cid) => openApp({ id: 'note-editor', name: 'Note Editor' }, { clientId: cid })}
          onSaveNote={(n) => { setNotes(p => [n, ...p]); logOSActivity({ type: 'Note', description: 'New note created' }); }}
        />
      ))}
      
      {showClientIntake && <QuickAddClientModal onClose={() => setShowClientIntake(false)} onClientCreated={(c) => { setClients(p => [...p, c]); logOSActivity({ type: 'Intake', description: 'Client created' }); }} />}
      {showTaskModal && <TaskModal onClose={() => setShowTaskModal(false)} clients={clients} onSave={(t) => setTasks(p => [t, ...p])} />}

      <Launcher isOpen={isLauncherOpen} onClose={() => setIsLauncherOpen(false)} onOpenApp={openApp} />
      <ChatOverlay isOpen={chatOpen} onClose={() => setChatOpen(false)} onOpen={() => setChatOpen(true)} messages={messages} input={input} setInput={setInput} onSend={handleSendMessage} isLoading={isLoading} />
      <Shelf windows={windows} activeId={activeWindowId} onRestore={(id) => { setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false } : w)); setActiveWindowId(id); }} onMinimize={() => {}} onToggleLauncher={() => setIsLauncherOpen(p => !p)} launcherOpen={isLauncherOpen} pinnedApps={pinnedApps} onTogglePin={(id) => setPinnedApps(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])} onOpenApp={openApp} />
    </div>
  );
}