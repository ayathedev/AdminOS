import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, Battery, Bell, Search, LayoutGrid, 
  X, Minus, Square, Send, Maximize2, Minimize2,
  Calendar as CalendarIcon, CheckSquare, Activity, User, 
  PlusCircle, FileText, ClipboardList, Clock, ArrowLeft,
  ChevronRight, MoreHorizontal, Pencil, Save, XCircle,
  Minimize, RotateCcw, AlertCircle, CalendarDays, CheckCircle2, Circle,
  Filter, Check
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { HUBS, MOCK_NOTIFICATIONS, MOCK_TASKS, CLIENT_INTAKE_CONTEXT, DEFAULT_CLIENT } from '../constants';
import { Hub, AppWindow, ChatMessage, Client, ClientActivity, OSActivity, Note, Task } from '../types';
import { generateOSResponse } from '../services/geminiService';

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

// --- View Components ---

const PrioritiesView = ({ tasks, onUpdateTask, onOpenTaskModal }: { tasks: Task[], onUpdateTask: (t: Task) => void, onOpenTaskModal: () => void }) => {
  const highPriorityTasks = tasks.filter(t => !t.completed && t.priority === 'High');
  const otherTasks = tasks.filter(t => !t.completed && t.priority !== 'High').slice(0, 3);
  const completedTasks = tasks.filter(t => t.completed).slice(0, 5); // Show last 5 completed
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = (task: Task) => {
    if (editTitle.trim()) {
      onUpdateTask({ ...task, title: editTitle, updatedAt: new Date().toISOString() });
    }
    setEditingId(null);
  };

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
                     onClick={() => onUpdateTask({...task, completed: true, updatedAt: new Date().toISOString()})}
                     className="mt-0.5 text-gray-300 hover:text-green-500 transition"
                   >
                      <Circle size={20} />
                   </button>
                   <div className="flex-1">
                      {editingId === task.id ? (
                        <div className="flex gap-2 items-center">
                          <input 
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(task)}
                            autoFocus
                          />
                          <button onClick={() => saveEdit(task)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={16}/></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={16}/></button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-gray-800">{task.title}</p>
                          {task.dueDate && <p className="text-xs text-rose-600 mt-1">Due: {task.dueDate}</p>}
                        </div>
                      )}
                   </div>
                   {editingId !== task.id && (
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => startEditing(task)} className="text-gray-400 hover:text-indigo-600 p-1"><Pencil size={14} /></button>
                        <div className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-medium">High</div>
                     </div>
                   )}
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
                     <span className="text-gray-700">{task.title}</span>
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

const UrgentView = ({ tasks, clients, onUpdateTask }: { tasks: Task[], clients: Client[], onUpdateTask: (t: Task) => void }) => {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today'>('all');
  
  // Base set of urgent items
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
                 <div key={task.id} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 group transition-all
                    ${isOverdue ? 'border-l-red-500 border-red-200 bg-red-50/20' : 'border-l-amber-500 border-gray-200'}
                 `}>
                    <div className="flex-1 w-full">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">{task.title}</span>
                          {client && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{client.preferredName}</span>}
                          {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Overdue</span>}
                       </div>
                       <div className="flex flex-wrap gap-4 text-xs text-gray-500 items-center mt-2">
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors">
                             <span className="text-gray-400">Due:</span>
                             <input 
                                type="date" 
                                className="bg-transparent border-none outline-none text-gray-700 p-0 h-auto font-medium cursor-pointer w-24"
                                value={task.dueDate || ''}
                                onChange={(e) => onUpdateTask({...task, dueDate: e.target.value, updatedAt: new Date().toISOString()})}
                             />
                          </div>
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">Priority: {task.priority}</span>
                       </div>
                    </div>
                    <button 
                       onClick={() => onUpdateTask({...task, completed: true, updatedAt: new Date().toISOString()})}
                       className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100"
                    >
                       <CheckCircle2 size={14} /> Complete
                    </button>
                 </div>
              );
           })}
        </div>
      </div>

      {/* Filter Footer */}
      <div className="shrink-0 pt-4 border-t border-gray-200 flex gap-2">
         {['all', 'overdue', 'today'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition
                ${filter === f 
                  ? 'bg-gray-800 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
              `}
            >
               {f}
            </button>
         ))}
      </div>
    </div>
  );
};

const WeeklyView = ({ tasks, onAddTaskForDay, notes, onUpdateNotes }: { tasks: Task[], onAddTaskForDay: (date: string) => void, notes: string, onUpdateNotes: (n: string) => void }) => {
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

  useEffect(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)
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
                       <div key={t.id} className={`text-xs p-2 rounded border shadow-sm ${t.priority === 'High' ? 'bg-white border-rose-200 border-l-4 border-l-rose-500' : 'bg-white border-gray-200 border-l-4 border-l-gray-300'}`}>
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

const QuickAddNoteModal = ({ onClose, clients, onSave }: { onClose: () => void, clients: Client[], onSave: (note: Note) => void }) => {
  const [summary, setSummary] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [type, setType] = useState<'client' | 'general'>('general');

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
             <h3 className="font-semibold flex items-center gap-2"><FileText size={18}/> New Note</h3>
             <button onClick={onClose}><X size={20}/></button>
          </div>
          <div className="p-6 space-y-4">
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Link to Client (Optional)</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={clientId}
                  onChange={e => {
                     setClientId(e.target.value);
                     setType(e.target.value ? 'client' : 'general');
                  }}
                >
                   <option value="">General Note (No Client)</option>
                   {clients.filter(c => c.status === 'Active').map(c => (
                      <option key={c.id} value={c.id}>{c.preferredName}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Summary</label>
                <textarea 
                   className="w-full p-3 border border-gray-300 rounded-lg text-sm h-24 outline-none focus:border-indigo-500"
                   placeholder="Brief summary of the note..."
                   value={summary}
                   onChange={e => setSummary(e.target.value)}
                />
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Steps (Optional)</label>
                <textarea 
                   className="w-full p-3 border border-gray-300 rounded-lg text-sm h-16 outline-none focus:border-indigo-500"
                   placeholder="Any follow-up items?"
                   value={nextSteps}
                   onChange={e => setNextSteps(e.target.value)}
                />
             </div>
             <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
                Save Note
             </button>
          </div>
       </div>
    </div>
  );
};

const QuickAddTaskModal = ({ onClose, clients, onSave, initialDate, initialPriority }: { onClose: () => void, clients: Client[], onSave: (task: Task) => void, initialDate?: string, initialPriority?: 'High'|'Medium'|'Low' }) => {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [priority, setPriority] = useState<'High'|'Medium'|'Low'|'Urgent'>(initialPriority || 'Medium');
  const [dueDate, setDueDate] = useState(initialDate || '');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: `task-${Date.now()}`,
      title,
      priority,
      dueDate,
      linkedClient: clientId || undefined,
      completed: false,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          <div className="bg-rose-600 p-4 flex justify-between items-center text-white">
             <h3 className="font-semibold flex items-center gap-2"><CheckSquare size={18}/> New Task</h3>
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
             <button onClick={handleSave} className="w-full bg-rose-600 text-white py-2 rounded-lg font-medium hover:bg-rose-700 transition">
                Create Task
             </button>
          </div>
       </div>
    </div>
  );
};

const QuickAddClientModal = ({ onClose, onClientCreated }: { onClose: () => void, onClientCreated: (client: Client) => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        displayText = responseText.replace(/```json[\s\S]*?```/, '').trim(); // Remove JSON from display
        
        // Ensure we have an ID
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
        
        // Add a system message about closing
        setTimeout(() => {
           onClose();
        }, 3000);
        
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
       <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
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
             <div className="flex gap-3">
               <input 
                 className="flex-1 bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-teal-500 rounded-xl px-4 py-3 outline-none transition-all text-sm text-gray-800"
                 placeholder="Type 'ready' to begin or enter details (or 'skip' to auto-fill)..."
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
          </div>
       </div>
    </div>
  );
};


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
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (activity: Omit<ClientActivity, 'id' | 'timestamp'>) => void;
  resetViewTrigger: number;
  onUpdateTask: (task: Task) => void;
  onOpenTaskModal: () => void;
  onAddTaskForDay: (date: string) => void;
  notes: string;
  onUpdateNotes: (n: string) => void;
}

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

const ClientHub = ({ 
  clients, 
  activities, 
  onAddClient, 
  onUpdateClient, 
  onOpenIntake, 
  onLogActivity,
  resetViewTrigger
}: {
  clients: Client[];
  activities: ClientActivity[];
  onAddClient: (c: Client) => void;
  onUpdateClient: (c: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (a: any) => void;
  resetViewTrigger: number;
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Reset view if triggered from outside (e.g. new client added)
  useEffect(() => {
    if (resetViewTrigger > 0) {
      setView('list');
      setSelectedClient(null);
    }
  }, [resetViewTrigger]);

  const filteredClients = clients.filter(c => 
    c.preferredName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.legalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === 'detail' && selectedClient) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <button 
          onClick={() => { setView('list'); setSelectedClient(null); }}
          className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft size={18} /> Back to Client List
        </button>
        
        {/* Client Detail Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-6 border-b border-gray-200 bg-teal-50 flex justify-between items-start">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900">{selectedClient.preferredName}</h2>
                   <div className="flex gap-2 mt-2 text-sm text-gray-600">
                      <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{selectedClient.status}</span>
                      <span>•</span>
                      <span>ID: {selectedClient.id}</span>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button className="bg-white text-gray-700 px-3 py-1.5 rounded border border-gray-200 shadow-sm hover:bg-gray-50 text-sm font-medium">Edit Profile</button>
                   <button className="bg-teal-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-teal-700 text-sm font-medium">Add Note</button>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                <div className="p-6 border-b md:border-b-0 md:border-r border-gray-200 col-span-1 space-y-4">
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
                </div>
                
                <div className="p-6 col-span-2 space-y-6">
                   <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Goals</h3>
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-indigo-900 text-sm">
                         {selectedClient.fullProfile.shortTermGoals || "No short term goals listed."}
                      </div>
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
                </div>
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
          <button 
            onClick={onOpenIntake}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 transition shadow-sm"
          >
             <User size={18} /> New Intake
          </button>
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
  notes, onUpdateNotes 
}) => {
  const hub = HUBS.find(h => h.id === win.hubId);
  const isActivityLog = win.hubId === 'activity-log';
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

  // Dragging logic
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag from header
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
        // We aren't updating React state continuously for performance, but we should eventually save it
        // For this demo, direct DOM manip is smoother.
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        // In a real app, we'd save the final position to state here
        // win.position = { x: ... } via a callback
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Initial Position style
  const initialStyle = {
    left: win.position.x,
    top: win.position.y,
    zIndex: isActive ? 50 : win.zIndex,
    display: win.isOpen && !win.isMinimized ? 'flex' : 'none'
  };


  const renderContent = () => {
    if (isActivityLog) {
      return <ActivityLogHub activities={osActivities} />;
    }
    if (win.hubId === 'priorities') {
       return <PrioritiesView tasks={tasks} onUpdateTask={onUpdateTask} onOpenTaskModal={onOpenTaskModal} />;
    }
    if (win.hubId === 'urgent') {
       return <UrgentView tasks={tasks} clients={clients} onUpdateTask={onUpdateTask} />;
    }
    if (win.hubId === 'weekly') {
       return <WeeklyView tasks={tasks} onAddTaskForDay={onAddTaskForDay} notes={notes} onUpdateNotes={onUpdateNotes} />;
    }

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
        />
      );
    }

    // Default Generic Content
    return (
       <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {hub.name}</h1>
            <p className="text-gray-500">{hub.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                          <User size={14} />
                        </div>
                        <div>
                          <div className="h-2 w-32 bg-gray-200 rounded mb-1"></div>
                          <div className="h-2 w-20 bg-gray-100 rounded"></div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                  <IconComponent name="Sparkles" className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Need something else?</h3>
                <p className="text-sm text-gray-500 mb-4">Ask the OS Assistant to generate reports, draft emails, or summarize data for this hub.</p>
                <button 
                  onClick={() => onOpenChat()}
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Open Assistant
                </button>
             </div>
          </div>
       </div>
    );
  };

  return (
    <div 
      ref={windowRef}
      className={`fixed w-[90vw] h-[80vh] max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden transition-opacity duration-200 border border-gray-200
        ${isActive ? 'opacity-100' : 'opacity-100'} 
      `}
      style={initialStyle}
      onClick={() => onActivate(win.id)}
    >
      {/* Window Header */}
      <div 
        className={`h-10 ${color} flex items-center justify-between px-3 shrink-0 cursor-move`}
        onMouseDown={handleMouseDown}
      >
         <div className="flex items-center gap-2 text-white font-medium text-sm pointer-events-none">
            <IconComponent name={icon} className="w-4 h-4 opacity-80" />
            {title}
         </div>
         <div className="flex items-center gap-2 window-controls">
            <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}>
              <Minimize size={14} />
            </button>
            <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => {/* maximize logic */}}>
              <Square size={12} />
            </button>
            <button className="p-1 hover:bg-red-500/80 rounded text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); onClose(win.id); }}>
              <X size={14} />
            </button>
         </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto bg-gray-50 flex">
        {/* Sidebar - Hide for Activity Log and Special Views */}
        {!isActivityLog && !isSpecialView && (
          <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block shrink-0">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Pages</h4>
            <ul className="space-y-1">
              {hub?.pages.map(page => (
                <li key={page} className="text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded cursor-pointer transition">
                  {page}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Main Area */}
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
           {renderContent()}
        </div>
      </div>
    </div>
  );
};

// --- Main Desktop ---

export default function Desktop() {
  // State
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Modals
  const [showClientIntake, setShowClientIntake] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalProps, setTaskModalProps] = useState<{initialDate?: string, initialPriority?: 'High'|'Medium'|'Low'}>({});

  const [resetViewTrigger, setResetViewTrigger] = useState(0); 
  
  // Data
  const [clients, setClients] = useState<Client[]>([DEFAULT_CLIENT as unknown as Client]); 
  const [weeklyNotes, setWeeklyNotes] = useState("Focus on grant reporting and hiring plan.");
  const [activities, setActivities] = useState<ClientActivity[]>([
    {
       id: 'act-1',
       timestamp: new Date(Date.now() - 3600000), 
       type: 'System',
       description: 'System initialized',
       clientName: 'Jordan'
    }
  ]);
  const [osActivities, setOsActivities] = useState<OSActivity[]>([
    {
      id: 'os-1',
      timestamp: new Date(Date.now() - 3600000),
      type: 'System',
      description: 'OS Booted Successfully',
      target: 'System'
    }
  ]);
  const [notes, setNotes] = useState<Note[]>([]);
  // Fix mock data type mapping
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Welcome to AdminOS. How can I support you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Logic ---

  const logOSActivity = (type: string, description: string, target?: string) => {
    const newAct: OSActivity = {
      id: `os-${Date.now()}`,
      timestamp: new Date(),
      type,
      description,
      target
    };
    setOsActivities(prev => [newAct, ...prev]);
  };

  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    const desc = 'New client intake completed';
    
    // Client Activity
    const newActivity: ClientActivity = {
      id: `act-${Date.now()}`,
      timestamp: new Date(),
      type: 'New Client',
      description: desc,
      clientName: client.preferredName
    };
    setActivities(prev => [newActivity, ...prev]);
    
    // OS Activity
    logOSActivity('Intake', desc, client.preferredName);

    setResetViewTrigger(prev => prev + 1);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    logOSActivity('Edit', 'Client profile updated', updatedClient.preferredName);
  };

  const handleLogClientActivity = (activity: Omit<ClientActivity, 'id' | 'timestamp'>) => {
    const newActivity: ClientActivity = {
      id: `act-${Date.now()}`,
      timestamp: new Date(),
      ...activity
    };
    setActivities(prev => [newActivity, ...prev]);
    // Also log OS-wide for important ones? Maybe not views to avoid clutter
    if (activity.type !== 'View') {
      logOSActivity(activity.type, activity.description, activity.clientName);
    }
  };

  const handleSaveNote = (note: Note) => {
    setNotes(prev => [note, ...prev]);
    const client = clients.find(c => c.id === note.linkedClient);
    
    if (client) {
      // Add to Client
      const newContactLog = {
        date: new Date().toISOString(),
        type: 'Note',
        summary: note.summary,
        nextSteps: note.nextSteps
      };
      
      const updatedClient = {
        ...client,
        lastUpdated: new Date().toISOString(),
        fullProfile: {
          ...client.fullProfile,
          contactLog: [newContactLog, ...(client.fullProfile.contactLog || [])]
        }
      };
      handleUpdateClient(updatedClient);
      handleLogClientActivity({
        type: 'Note',
        description: 'New note added',
        clientName: client.preferredName
      });
    } else {
      // General Note
      logOSActivity('Note', 'New general note created', 'General');
    }
  };

  const handleSaveTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    const client = clients.find(c => c.id === task.linkedClient);

    if (client) {
      handleLogClientActivity({
        type: 'Task',
        description: `Task created: ${task.title}`,
        clientName: client.preferredName
      });
    } else {
      logOSActivity('Task', 'Administrative task created', 'General');
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    // If only updated date/title, message is diff
    const isCompletionToggle = updatedTask.completed !== tasks.find(t => t.id === updatedTask.id)?.completed;
    if (isCompletionToggle) {
       const status = updatedTask.completed ? 'completed' : 'reopened';
       logOSActivity('Task', `Task ${status}: ${updatedTask.title}`, 'Tasks');
    } else {
       logOSActivity('Task', `Task updated: ${updatedTask.title}`, 'Tasks');
    }
  };

  const handleOpenTaskModal = (props: {initialDate?: string, initialPriority?: 'High'|'Medium'|'Low'} = {}) => {
    setTaskModalProps(props);
    setShowTaskModal(true);
  };

  // --- Window Management ---

  const openApp = (hub: Hub | {id: string, name: string}) => {
    const existing = windows.find(w => w.hubId === hub.id);
    if (existing) {
      if (existing.isMinimized) {
        setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false } : w));
      }
      setActiveWindowId(existing.id);
      setIsLauncherOpen(false);
      return;
    }

    // Default Position (Center)
    // We can randomize slightly to stack
    const count = windows.length;
    const startX = window.innerWidth / 2 - 400 + (count * 20);
    const startY = window.innerHeight / 2 - 300 + (count * 20);

    const newWindow: AppWindow = {
      id: Date.now().toString(),
      hubId: hub.id,
      title: hub.name,
      isOpen: true,
      isMinimized: false,
      zIndex: windows.length + 1,
      position: { x: startX, y: startY }
    };
    setWindows([...windows, newWindow]);
    setActiveWindowId(newWindow.id);
    setIsLauncherOpen(false);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
    if (activeWindowId === id) setActiveWindowId(null);
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    setActiveWindowId(null); // Deselect
  };

  const restoreWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false } : w));
    setActiveWindowId(id);
  };

  const toggleLauncher = () => setIsLauncherOpen(!isLauncherOpen);

  const openActivityLog = () => {
    openApp({ id: 'activity-log', name: 'Recent Activity Log' });
  };

  const openPriorities = () => {
    openApp({ id: 'priorities', name: 'Top Priorities' });
  };

  const openUrgent = () => {
    openApp({ id: 'urgent', name: 'Urgent Follow Ups' });
  };

  const openWeekly = () => {
    openApp({ id: 'weekly', name: 'Weekly Overview' });
  };

  // --- AI Chat Logic ---

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let context = "";
    if (activeWindowId) {
      const activeWin = windows.find(w => w.id === activeWindowId);
      const activeHub = HUBS.find(h => h.id === activeWin?.hubId);
      if (activeHub) {
        context = `User is currently looking at the "${activeHub.name}" Hub. Description: ${activeHub.description}. Pages available: ${activeHub.pages.join(', ')}.`;
      }
    }

    const responseText = await generateOSResponse(userMsg.text, context);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  // --- UI Sections ---

  const TopBar = () => (
    <div className="h-10 bg-white/80 backdrop-blur-md border-b border-white/40 flex items-center justify-between px-4 fixed top-0 w-full z-50 shadow-sm">
      <div className="flex items-center gap-4">
         <span className="font-semibold text-gray-700 tracking-tight">AdminOS</span>
         <div className="hidden md:flex items-center bg-gray-100/50 rounded-full px-3 py-1 border border-gray-200/50 w-64">
            <Search size={14} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search files, clients, commands..." 
              className="bg-transparent border-none outline-none text-xs w-full text-gray-600 placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setChatOpen(true);
                  setInput(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
         </div>
      </div>
      <div className="flex items-center gap-3">
        <Clock />
        <div className="flex items-center gap-2 text-gray-600">
          <div className="p-1.5 hover:bg-gray-200/50 rounded-full cursor-pointer transition">
            <Bell size={16} />
          </div>
          <div className="p-1.5 hover:bg-gray-200/50 rounded-full cursor-pointer transition">
            <Wifi size={16} />
          </div>
          <div className="p-1.5 hover:bg-gray-200/50 rounded-full cursor-pointer transition">
            <Battery size={16} />
          </div>
          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs ml-2 border border-indigo-200">
            F
          </div>
        </div>
      </div>
    </div>
  );

  const Shelf = () => (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-2xl z-50 hover:bg-white/80 transition-all duration-300">
      <button 
        onClick={toggleLauncher}
        className="p-2.5 rounded-xl bg-gray-800/5 hover:bg-indigo-100 text-gray-700 hover:text-indigo-600 transition-all duration-200 group relative"
      >
        <LayoutGrid size={22} />
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
          Launcher
        </span>
      </button>

      <div className="w-px h-8 bg-gray-300/50 mx-1"></div>

      {HUBS.slice(0, 6).map(hub => (
        <button
          key={hub.id}
          onClick={() => openApp(hub)}
          className={`p-2.5 rounded-xl transition-all duration-200 group relative
            ${windows.some(w => w.hubId === hub.id && !w.isMinimized) ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-white/50 hover:shadow-sm'}
            ${windows.some(w => w.hubId === hub.id && w.isMinimized) ? 'opacity-75' : ''}
          `}
        >
          <div className={`${hub.color} w-6 h-6 rounded-md flex items-center justify-center text-white shadow-sm`}>
            <IconComponent name={hub.icon} className="w-4 h-4" />
          </div>
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
            {hub.name}
          </span>
          {windows.some(w => w.hubId === hub.id) && (
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${windows.find(w => w.hubId === hub.id)?.isMinimized ? 'bg-gray-400' : 'bg-gray-600'}`}></div>
          )}
        </button>
      ))}

      <div className="w-px h-8 bg-gray-300/50 mx-1"></div>

       <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`p-2.5 rounded-xl transition-all duration-200 relative
            ${chatOpen ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-indigo-50 text-gray-600'}
          `}
        >
          <IconComponent name="MessageSquareSparkle" className="w-6 h-6" />
          {chatOpen && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600"></div>}
       </button>
    </div>
  );

  const WidgetArea = () => (
    <div className="absolute top-16 left-8 right-8 bottom-24 grid grid-cols-12 gap-6 pointer-events-none">
      {/* Left Column */}
      <div className="col-span-12 md:col-span-3 flex flex-col gap-4 pointer-events-auto">
        {/* Today's Control Panel */}
        <div 
          className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50"
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <Activity size={16} className="mr-2 text-indigo-500"/> Control Panel
          </h3>
          
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
             <button onClick={openPriorities} className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-200 transition">Priorities</button>
             <button onClick={openUrgent} className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-200 transition">Urgent</button>
             <button onClick={openWeekly} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition">Weekly</button>
          </div>

          <div 
             onClick={openActivityLog}
             className="cursor-pointer hover:bg-white/70 transition rounded-xl"
          >
             <div className="space-y-2">
                {osActivities.slice(0, 3).map(act => (
                   <div key={act.id} className="flex justify-between items-center text-xs border-b border-gray-400/10 pb-1 last:border-0">
                      <span className="font-medium text-gray-700 truncate w-24">{act.target || act.type}</span>
                      <span className="text-gray-500">{act.description.substring(0, 20)}...</span>
                   </div>
                ))}
             </div>
             <div className="mt-2 text-[10px] text-indigo-600 font-semibold text-right">View Full Log &rarr;</div>
          </div>
        </div>

        {/* Quick Add */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Add</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowNoteModal(true)}
              className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-lg text-xs font-medium transition"
            >
              Note
            </button>
            <button 
              onClick={() => setShowClientIntake(true)}
              className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-700 py-2 rounded-lg text-xs font-medium transition"
            >
              Client
            </button>
            <button 
              onClick={() => handleOpenTaskModal()}
              className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 py-2 rounded-lg text-xs font-medium transition"
            >
              Task
            </button>
          </div>
        </div>

        {/* Minimized Apps Widget */}
        {windows.some(w => w.isMinimized) && (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50">
             <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                <Minimize size={16} className="mr-2 text-gray-500"/> Minimized Apps
             </h3>
             <div className="flex flex-wrap gap-2">
                {windows.filter(w => w.isMinimized).map(w => {
                  const hub = HUBS.find(h => h.id === w.hubId);
                  const isActivityLog = w.hubId === 'activity-log';
                  const isSpecial = ['priorities', 'urgent', 'weekly'].includes(w.hubId);
                  
                  let color = 'bg-gray-500';
                  let icon = 'Square';
                  
                  if (isActivityLog) { color = 'bg-gray-700'; icon = 'Activity'; }
                  else if (w.hubId === 'priorities') { color = 'bg-rose-600'; icon = 'AlertCircle'; }
                  else if (w.hubId === 'urgent') { color = 'bg-amber-600'; icon = 'Clock'; }
                  else if (w.hubId === 'weekly') { color = 'bg-indigo-600'; icon = 'CalendarDays'; }
                  else if (hub) { color = hub.color; icon = hub.icon; }

                  return (
                    <button 
                      key={w.id} 
                      onClick={() => restoreWindow(w.id)}
                      className={`${color} text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium shadow-sm hover:opacity-90 transition`}
                    >
                      <IconComponent name={icon} className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">{w.title}</span>
                      <RotateCcw size={10} className="ml-1 opacity-50" />
                    </button>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* Middle Workspace - Mostly Empty for Windows */}
      <div className="hidden md:block col-span-6"></div>

      {/* Right Column */}
      <div className="col-span-12 md:col-span-3 flex flex-col gap-4 pointer-events-auto">
        {/* Notifications */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
            <span>Notifications</span>
            <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">3</span>
          </h3>
          <div className="space-y-2">
            {MOCK_NOTIFICATIONS.map(n => (
              <div key={n.id} className="p-3 bg-white/50 rounded-lg border-l-2 border-indigo-400">
                <p className="text-xs font-medium text-gray-800">{n.title}</p>
                <p className="text-[10px] text-gray-500">{n.time}</p>
              </div>
            ))}
          </div>
        </div>

         {/* Calendar Widget */}
         <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
             <CalendarIcon size={16} className="mr-2 text-indigo-500"/> Schedule
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="text-center bg-gray-100 rounded p-1 min-w-[36px]">
                <div className="text-[10px] text-gray-500 uppercase">Today</div>
                <div className="text-sm font-bold text-gray-800">12</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Team Check-in</p>
                <p className="text-[10px] text-gray-500">2:00 PM • Zoom</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-rose-50 relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background Subtle Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
         <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '10s'}}></div>
         <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-rose-200/50 rounded-full blur-[80px] animate-pulse" style={{animationDuration: '15s', animationDelay: '2s'}}></div>
      </div>

      <TopBar />
      
      {/* Desktop Area */}
      <div className="absolute inset-0 pt-10 pb-20 z-0">
        <WidgetArea />

        {/* Windows Layer */}
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
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onOpenIntake={() => setShowClientIntake(true)}
            onLogActivity={handleLogClientActivity}
            resetViewTrigger={resetViewTrigger}
            onUpdateTask={handleUpdateTask}
            onOpenTaskModal={handleOpenTaskModal}
            onAddTaskForDay={(date) => handleOpenTaskModal({initialDate: date})}
            notes={weeklyNotes}
            onUpdateNotes={setWeeklyNotes}
          />
        ))}
      </div>

      <Shelf />

      {/* Overlays */}
      {showClientIntake && <QuickAddClientModal onClose={() => setShowClientIntake(false)} onClientCreated={handleAddClient} />}
      {showNoteModal && <QuickAddNoteModal onClose={() => setShowNoteModal(false)} clients={clients} onSave={handleSaveNote} />}
      {showTaskModal && <QuickAddTaskModal onClose={() => setShowTaskModal(false)} clients={clients} onSave={handleSaveTask} {...taskModalProps} />}

      {/* Chat Overlay */}
      {chatOpen && (
         <div className="fixed bottom-24 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 w-[90vw] md:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
               <div className="flex items-center gap-2 font-semibold">
                  <IconComponent name="MessageSquareSparkle" className="w-5 h-5"/> OS Assistant
               </div>
               <button onClick={() => setChatOpen(false)} className="hover:text-indigo-200 transition"><X size={18}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
               {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm
                        ${msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'}
                     `}>
                        {msg.text}
                     </div>
                  </div>
               ))}
               {isLoading && (
                  <div className="flex justify-start">
                     <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-200">
                        <div className="flex gap-1">
                           <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                           <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                           <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            <div className="p-3 bg-white border-t border-gray-200">
               <div className="relative">
                  <input 
                     className="w-full bg-gray-100 rounded-full pl-4 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
                     placeholder="Ask me anything..."
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                     onClick={handleSendMessage}
                     className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-sm"
                  >
                     <Send size={14} />
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Launcher Overlay */}
      {isLauncherOpen && (
         <div 
           className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm animate-in fade-in"
           onClick={() => setIsLauncherOpen(false)}
         >
            <div 
              className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl grid grid-cols-4 gap-6 max-w-3xl w-full mx-4 border border-white/50"
              onClick={e => e.stopPropagation()}
            >
               {HUBS.map(hub => (
                  <button 
                     key={hub.id}
                     onClick={() => openApp(hub)}
                     className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/50 transition group"
                  >
                     <div className={`${hub.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition duration-200`}>
                        <IconComponent name={hub.icon} className="w-8 h-8" />
                     </div>
                     <span className="font-medium text-gray-700 text-sm">{hub.name}</span>
                  </button>
               ))}
            </div>
         </div>
      )}
    </div>
  );
}