import React, { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Bell, Search, LayoutGrid, 
  X, Minus, Square, Send, Maximize2, Minimize2,
  Calendar as CalendarIcon, CheckSquare, Activity, User
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { HUBS, MOCK_NOTIFICATIONS, MOCK_TASKS } from '../constants';
import { Hub, AppWindow, ChatMessage } from '../types';
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

// --- Main Desktop ---

export default function Desktop() {
  // State
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Welcome to AdminOS. How can I support you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Window Management ---

  const openApp = (hub: Hub) => {
    // Check if already open
    const existing = windows.find(w => w.hubId === hub.id);
    if (existing) {
      setActiveWindowId(existing.id);
      setIsLauncherOpen(false);
      return;
    }

    const newWindow: AppWindow = {
      id: Date.now().toString(),
      hubId: hub.id,
      title: hub.name,
      isOpen: true,
      isMinimized: false,
      zIndex: windows.length + 1
    };
    setWindows([...windows, newWindow]);
    setActiveWindowId(newWindow.id);
    setIsLauncherOpen(false);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
    if (activeWindowId === id) setActiveWindowId(null);
  };

  const toggleLauncher = () => setIsLauncherOpen(!isLauncherOpen);

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

    // Context from active window
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
            ${windows.some(w => w.hubId === hub.id) ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-white/50 hover:shadow-sm'}
          `}
        >
          <div className={`${hub.color} w-6 h-6 rounded-md flex items-center justify-center text-white shadow-sm`}>
            <IconComponent name={hub.icon} className="w-4 h-4" />
          </div>
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
            {hub.name}
          </span>
          {windows.some(w => w.hubId === hub.id) && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-600"></div>
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
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <Activity size={16} className="mr-2 text-indigo-500"/> Control Panel
          </h3>
          <div className="space-y-3">
             <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">Load</span>
                <span className="text-xs font-bold text-green-600">Normal</span>
             </div>
             <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">Urgent</span>
                <span className="text-xs font-bold text-red-500">2 Items</span>
             </div>
          </div>
        </div>

        {/* Quick Add */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Add</h3>
          <div className="flex gap-2">
            <button className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-lg text-xs font-medium transition">
              Note
            </button>
            <button className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-700 py-2 rounded-lg text-xs font-medium transition">
              Client
            </button>
            <button className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 py-2 rounded-lg text-xs font-medium transition">
              Task
            </button>
          </div>
        </div>
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

  const Launcher = () => (
    <div className={`fixed inset-0 z-40 transition-all duration-300 ${isLauncherOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={toggleLauncher}></div>
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-6 transform transition-transform duration-300 scale-100 origin-bottom">
         <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search apps, settings, and web..." 
              className="w-full bg-gray-100 border border-transparent focus:border-indigo-300 focus:bg-white rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-sm"
              autoFocus
            />
         </div>
         <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
            {HUBS.map(hub => (
              <button 
                key={hub.id} 
                onClick={() => openApp(hub)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all group"
              >
                <div className={`${hub.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent name={hub.icon} className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{hub.name}</span>
              </button>
            ))}
         </div>
      </div>
    </div>
  );

  const OSWindow = ({ win }: { win: AppWindow }) => {
    const hub = HUBS.find(h => h.id === win.hubId);
    if (!hub) return null;

    const isActive = activeWindowId === win.id;

    return (
      <div 
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[80vh] max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border border-gray-200
          ${isActive ? 'z-30 scale-100 opacity-100' : 'z-20 scale-95 opacity-0 pointer-events-none'}
        `}
        style={{ display: win.isOpen ? 'flex' : 'none' }}
        onClick={() => setActiveWindowId(win.id)}
      >
        {/* Window Header */}
        <div className={`h-10 ${hub.color} flex items-center justify-between px-3 shrink-0`}>
           <div className="flex items-center gap-2 text-white font-medium text-sm">
              <IconComponent name={hub.icon} className="w-4 h-4 opacity-80" />
              {win.title}
           </div>
           <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => {/* minimize logic */}}>
                <Minus size={14} />
              </button>
              <button className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white" onClick={() => {/* maximize logic */}}>
                <Square size={12} />
              </button>
              <button className="p-1 hover:bg-red-500/80 rounded text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}>
                <X size={14} />
              </button>
           </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-auto bg-gray-50 flex">
          {/* Sidebar */}
          <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Pages</h4>
            <ul className="space-y-1">
              {hub.pages.map(page => (
                <li key={page} className="text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded cursor-pointer transition">
                  {page}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Main Area */}
          <div className="flex-1 p-8">
             <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {hub.name}</h1>
                  <p className="text-gray-500">{hub.description}</p>
                </div>

                {/* Mock Content based on Hub Type */}
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
                        onClick={() => setChatOpen(true)}
                        className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                      >
                        Open Assistant
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const ChatOverlay = () => (
    <div className={`fixed bottom-20 right-8 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[60] flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
      ${chatOpen ? 'h-[500px] opacity-100 scale-100' : 'h-0 opacity-0 scale-90 pointer-events-none'}
    `}>
      <div className="h-12 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-4 shrink-0">
         <div className="flex items-center gap-2 text-white font-medium">
            <IconComponent name="Bot" className="w-5 h-5" />
            <span>OS Assistant</span>
         </div>
         <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white">
            <X size={16} />
         </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm
              ${msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'}
            `}>
              {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
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
         <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all">
            <input 
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
              placeholder="Type a command or ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className={`ml-2 p-1.5 rounded-lg transition-colors
                ${input.trim() ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}
              `}
            >
               <Send size={16} />
            </button>
         </div>
      </div>
    </div>
  );

  return (
    <div 
      className="w-full h-screen bg-cover bg-center overflow-hidden relative"
      style={{
        backgroundImage: `linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)`
        // Alternatives: Calm minimal gradient
      }}
    >
      <TopBar />
      <WidgetArea />
      
      {/* Windows Layer */}
      {windows.map(win => <OSWindow key={win.id} win={win} />)}

      <Launcher />
      <ChatOverlay />
      <Shelf />
    </div>
  );
}