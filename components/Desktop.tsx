import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, Battery, Bell, Search, LayoutGrid, 
  X, Minus, Square, Send, Maximize2, Minimize2,
  Calendar as CalendarIcon, CheckSquare, Activity, User, 
  PlusCircle, FileText, ClipboardList, Clock, ArrowLeft,
  ChevronRight, MoreHorizontal, Pencil, Save, XCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { HUBS, MOCK_NOTIFICATIONS, MOCK_TASKS, CLIENT_INTAKE_CONTEXT, DEFAULT_CLIENT } from '../constants';
import { Hub, AppWindow, ChatMessage, Client, ClientActivity } from '../types';
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

// --- Client Hub Components ---

interface ClientHubProps {
  clients: Client[];
  activities: ClientActivity[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (activity: Omit<ClientActivity, 'id' | 'timestamp'>) => void;
  resetViewTrigger: number;
}

const ClientHub: React.FC<ClientHubProps> = ({ 
  clients, activities, onOpenIntake, onUpdateClient, onLogActivity, resetViewTrigger 
}) => {
  const [view, setView] = useState<'welcome' | 'active-list' | 'client-detail'>('welcome');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset view when trigger changes (e.g. after new intake)
  useEffect(() => {
    if (resetViewTrigger > 0) {
      setView('welcome');
      setSelectedClientId(null);
    }
  }, [resetViewTrigger]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleClientClick = (id: string) => {
    const client = clients.find(c => c.id === id);
    setSelectedClientId(id);
    setView('client-detail');
    if (client) {
      onLogActivity({
        type: 'View',
        description: 'Opened client profile',
        clientName: client.preferredName
      });
    }
  };

  // -- Views --

  const WelcomeView = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Management Hub</h2>
          <p className="text-gray-500">Welcome back. Here is what's happening today.</p>
        </div>
        <button 
          onClick={onOpenIntake}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
        >
          <PlusCircle size={18} />
          New Intake
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Add New Client', icon: 'UserPlus', action: onOpenIntake, color: 'bg-teal-100 text-teal-700' },
          { label: 'Add Note', icon: 'FileText', action: () => {}, color: 'bg-indigo-100 text-indigo-700' },
          { label: 'Add Task', icon: 'CheckSquare', action: () => {}, color: 'bg-rose-100 text-rose-700' },
          { label: 'Active Clients', icon: 'Users', action: () => setView('active-list'), color: 'bg-blue-100 text-blue-700' },
        ].map((action, i) => (
          <button 
            key={i} 
            onClick={action.action}
            className={`${action.color} p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:opacity-90 transition h-28`}
          >
            <IconComponent name={action.icon} className="w-6 h-6" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" /> Recent Activity
          </h3>
          <div className="space-y-0">
            {activities.slice(0, 10).map((activity, idx) => (
              <div key={activity.id} className="flex gap-4 py-3 border-b border-gray-100 last:border-0 relative">
                 <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2"></div>
                    {idx !== activities.slice(0,10).length - 1 && <div className="w-px h-full bg-gray-200 mt-1"></div>}
                 </div>
                 <div>
                    <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                       <span>{activity.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       <span>•</span>
                       <span>{activity.type}</span>
                       {activity.clientName && (
                         <>
                           <span>•</span>
                           <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{activity.clientName}</span>
                         </>
                       )}
                    </div>
                 </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No recent activity</div>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="space-y-4">
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Lists</h3>
              <div className="space-y-1">
                 {['Active Clients', 'Closed Clients', 'High-Priority', 'Follow-Up Needed', 'Crisis Contacts'].map(item => (
                   <button 
                     key={item}
                     onClick={() => item === 'Active Clients' && setView('active-list')}
                     className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex justify-between items-center group transition"
                   >
                     {item}
                     <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-gray-400" />
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-md p-5 text-white">
              <h3 className="font-semibold mb-1">Total Active Clients</h3>
              <div className="text-3xl font-bold">{clients.filter(c => c.status === 'Active').length}</div>
           </div>
        </div>
      </div>
    </div>
  );

  const ActiveListView = () => {
    const sortedClients = [...clients]
      .filter(c => c.status === 'Active')
      .filter(c => c.preferredName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.preferredName.localeCompare(b.preferredName));

    return (
      <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('welcome')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
             <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">Active Clients</h2>
          <div className="ml-auto relative">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search clients..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
             />
          </div>
        </div>

        {sortedClients.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <User size={48} className="mb-4 opacity-50" />
              <p>No active clients found.</p>
           </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
             <div className="grid grid-cols-12 bg-gray-50 p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <div className="col-span-3">Name & Age</div>
                <div className="col-span-4">Presenting Needs</div>
                <div className="col-span-3">Last Contact</div>
                <div className="col-span-2 text-right">Actions</div>
             </div>
             <div className="overflow-y-auto flex-1">
               {sortedClients.map(client => {
                 const needs = client.fullProfile.primaryNeeds;
                 const activeNeeds = needs ? Object.keys(needs).filter(k => needs[k] === true).slice(0, 3).join(', ') : '';
                 const lastContact = client.fullProfile.contactLog && client.fullProfile.contactLog.length > 0 
                    ? client.fullProfile.contactLog[0].date 
                    : client.lastUpdated;

                 return (
                   <div 
                     key={client.id}
                     onClick={() => handleClientClick(client.id)}
                     className="grid grid-cols-12 p-4 border-b border-gray-100 hover:bg-teal-50/50 cursor-pointer transition items-center text-sm"
                   >
                      <div className="col-span-3">
                        <div className="font-medium text-teal-700">{client.preferredName}</div>
                        <div className="text-xs text-gray-500">Age: {calculateAge(client.fullProfile.dob)}</div>
                      </div>
                      <div className="col-span-4">
                        <div className="text-xs text-gray-600 truncate pr-2">{activeNeeds || 'None listed'}</div>
                      </div>
                      <div className="col-span-3 text-gray-500">
                        {new Date(lastContact).toLocaleDateString()}
                      </div>
                      <div className="col-span-2 flex justify-end">
                         <button className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
                            <MoreHorizontal size={16} />
                         </button>
                      </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}
      </div>
    );
  };

  const ClientDetailView = () => {
    if (!selectedClient) return <div>Client not found</div>;
    const [activeSection, setActiveSection] = useState('Profile');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>(JSON.parse(JSON.stringify(selectedClient.fullProfile)));
    const [editedPreferredName, setEditedPreferredName] = useState(selectedClient.preferredName);

    const sections = [
      'Profile', 'Program', 'Household', 'Needs', 'Strengths', 'Goals', 
      'Support', 'Contact Log', 'Monthly Reviews', 'Safety', 'Documentation'
    ];

    const handleSave = () => {
      const updatedClient = {
        ...selectedClient,
        preferredName: editedPreferredName,
        lastUpdated: new Date().toISOString(),
        fullProfile: { ...formData }
      };
      onUpdateClient(updatedClient);
      onLogActivity({
        type: 'Edit',
        description: 'Updated client profile',
        clientName: updatedClient.preferredName
      });
      setIsEditing(false);
    };

    const handleCancel = () => {
      setFormData(JSON.parse(JSON.stringify(selectedClient.fullProfile)));
      setEditedPreferredName(selectedClient.preferredName);
      setIsEditing(false);
    };

    const renderField = (label: string, key: string, type: 'text' | 'date' | 'textarea' = 'text', nestedKey?: string) => {
      const val = nestedKey ? formData[nestedKey]?.[key] : formData[key];
      
      if (isEditing) {
        return (
          <div className="mb-4">
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
             {type === 'textarea' ? (
               <textarea 
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:border-teal-500 outline-none"
                  value={val || ''}
                  onChange={(e) => {
                    if (nestedKey) {
                       setFormData({...formData, [nestedKey]: {...formData[nestedKey], [key]: e.target.value}});
                    } else {
                       setFormData({...formData, [key]: e.target.value});
                    }
                  }}
               />
             ) : (
               <input 
                  type={type}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:border-teal-500 outline-none"
                  value={val || ''}
                  onChange={(e) => {
                    if (nestedKey) {
                       setFormData({...formData, [nestedKey]: {...formData[nestedKey], [key]: e.target.value}});
                    } else {
                       setFormData({...formData, [key]: e.target.value});
                    }
                  }}
               />
             )}
          </div>
        );
      }

      return (
        <div className="mb-4">
           <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
           <p className="text-sm text-gray-800 whitespace-pre-wrap">{val?.toString() || '-'}</p>
        </div>
      );
    };

    const renderBooleanMap = (groupKey: string, labels: Record<string, string>) => {
      const data = formData[groupKey] || {};
      return (
         <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(labels).map(([key, label]) => (
               <div key={key} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={data[key] || false} 
                    disabled={!isEditing}
                    onChange={(e) => {
                       setFormData({...formData, [groupKey]: {...data, [key]: e.target.checked}});
                    }}
                    className={`rounded text-teal-600 focus:ring-teal-500 ${!isEditing ? 'bg-gray-100' : ''}`}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
               </div>
            ))}
         </div>
      );
    };

    const renderSectionContent = () => {
      switch (activeSection) {
        case 'Profile':
          return (
             <div className="grid grid-cols-2 gap-4">
               {isEditing && (
                 <div className="mb-4 col-span-2">
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Preferred Name</label>
                   <input 
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:border-teal-500 outline-none font-bold"
                      value={editedPreferredName}
                      onChange={(e) => setEditedPreferredName(e.target.value)}
                   />
                 </div>
               )}
               {renderField('Legal Name', 'legalName')}
               {renderField('Pronouns', 'pronouns')}
               {renderField('Date of Birth', 'dob', 'date')}
               {renderField('Phone', 'phone')}
               {renderField('Email', 'email')}
               {renderField('Address', 'address')}
               {renderField('Housing Status', 'housingStatus')}
             </div>
          );
        case 'Program':
          return (
             <div className="grid grid-cols-2 gap-4">
               {renderField('Referral Source', 'referralSource')}
               {renderField('Date Entered', 'dateEntered', 'date')}
               {renderField('Case Manager', 'caseManager')}
               {renderField('Program Type', 'programType')}
             </div>
          );
        case 'Household':
          return (
             <div>
               <h4 className="font-semibold mb-3">Household Members</h4>
               {(formData.householdMembers || []).map((m: any, i: number) => (
                  <div key={i} className="flex gap-4 mb-2 items-end p-2 bg-gray-50 rounded">
                     {isEditing ? (
                       <>
                         <input value={m.name} onChange={e => {
                           const newM = [...formData.householdMembers]; newM[i].name = e.target.value; setFormData({...formData, householdMembers: newM});
                         }} className="p-1 border rounded text-sm flex-1" placeholder="Name"/>
                         <input value={m.age} onChange={e => {
                           const newM = [...formData.householdMembers]; newM[i].age = e.target.value; setFormData({...formData, householdMembers: newM});
                         }} className="p-1 border rounded text-sm w-16" placeholder="Age"/>
                         <input value={m.relationship} onChange={e => {
                           const newM = [...formData.householdMembers]; newM[i].relationship = e.target.value; setFormData({...formData, householdMembers: newM});
                         }} className="p-1 border rounded text-sm w-32" placeholder="Rel"/>
                       </>
                     ) : (
                       <span className="text-sm">{m.name} ({m.age}) - {m.relationship}</span>
                     )}
                  </div>
               ))}
               {renderField('Custody / Visitation Notes', 'custodyNotes', 'textarea')}
             </div>
          );
        case 'Needs':
          return (
             <div>
                {renderBooleanMap('primaryNeeds', {
                   housing: 'Housing', income: 'Income', benefits: 'Benefits', 
                   mentalHealth: 'Mental Health', physicalHealth: 'Physical Health',
                   transportation: 'Transportation', documentation: 'Documentation', safety: 'Safety'
                })}
                {renderField('Notes', 'notes', 'textarea', 'primaryNeeds')}
             </div>
          );
        case 'Strengths':
           return renderField('Strengths & Resilience', 'strengths', 'textarea');
        case 'Goals':
           return (
             <div className="space-y-4">
               {renderField('Short-Term Goals', 'shortTermGoals', 'textarea')}
               {renderField('Long-Term Goals', 'longTermGoals', 'textarea')}
             </div>
           );
        case 'Support':
           return (
             <div className="space-y-4">
               {renderField('Current Services', 'currentServices', 'textarea')}
               {renderField('Referrals Made', 'referrals', 'textarea')}
               {renderField('Life Skills', 'lifeSkills', 'textarea')}
             </div>
           );
        case 'Safety':
           return (
             <div>
                {renderField('Crisis Concerns', 'crisisConcerns', 'textarea', 'safety')}
                {renderField('Safety Plan', 'safetyPlan', 'textarea', 'safety')}
                {renderField('Emergency Contacts', 'emergencyContacts', 'textarea', 'safety')}
             </div>
           );
        case 'Documentation':
           return (
             <div>
                {renderBooleanMap('documentation', {
                   intakeCompleted: 'Intake Completed', roi: 'Release of Information', idDocs: 'ID Documents',
                   housingDocs: 'Housing Documents', incomeVerif: 'Income Verification', caseNotes: 'Case Notes Up to Date'
                })}
             </div>
           );
        default:
          return <div className="text-gray-400">Select a section</div>;
      }
    };

    return (
      <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
         <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => setView('active-list')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
             <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              {isEditing ? `Editing: ${selectedClient.preferredName}` : selectedClient.preferredName}
              {!isEditing && <span className="text-sm font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{selectedClient.status}</span>}
            </h2>
            <p className="text-xs text-gray-500">ID: {selectedClient.id}</p>
          </div>
          <div className="flex gap-2">
             {isEditing ? (
               <>
                 <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                   <XCircle size={16} /> Cancel
                 </button>
                 <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium">
                   <Save size={16} /> Save Changes
                 </button>
               </>
             ) : (
               <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium">
                 <Pencil size={16} /> Edit Profile
               </button>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden">
           {/* Sidebar Navigation */}
           <div className="bg-white rounded-xl border border-gray-200 p-2 h-fit overflow-y-auto">
              {sections.map(section => (
                <button 
                  key={section} 
                  onClick={() => setActiveSection(section)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition flex items-center justify-between group mb-1
                    ${activeSection === section ? 'bg-teal-50 text-teal-700' : 'hover:bg-gray-50 text-gray-600'}
                  `}
                >
                   {section}
                   {activeSection === section && <ChevronRight size={14} className="text-teal-500" />}
                </button>
              ))}
           </div>

           {/* Content Area */}
           <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 p-8 overflow-y-auto relative">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6">{activeSection}</h3>
              {renderSectionContent()}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      {view === 'welcome' && <WelcomeView />}
      {view === 'active-list' && <ActiveListView />}
      {view === 'client-detail' && <ClientDetailView />}
    </div>
  );
};


const QuickAddClientModal = ({ onClose, onClientCreated }: { onClose: () => void, onClientCreated: (client: Client) => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize
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

  // Auto scroll
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
                 placeholder="Type 'ready' to begin or enter details..."
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
  onOpenChat: () => void;
  clients: Client[];
  activities: ClientActivity[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onOpenIntake: () => void;
  onLogActivity: (activity: Omit<ClientActivity, 'id' | 'timestamp'>) => void;
  resetViewTrigger: number;
}

const OSWindow: React.FC<OSWindowProps> = ({ 
  win, isActive, onActivate, onClose, onOpenChat, clients, activities, 
  onAddClient, onUpdateClient, onOpenIntake, onLogActivity, resetViewTrigger 
}) => {
  const hub = HUBS.find(h => h.id === win.hubId);
  if (!hub) return null;

  const renderContent = () => {
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
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[80vh] max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border border-gray-200
        ${isActive ? 'z-30 scale-100 opacity-100' : 'z-20 scale-95 opacity-0 pointer-events-none'}
      `}
      style={{ display: win.isOpen ? 'flex' : 'none' }}
      onClick={() => onActivate(win.id)}
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
            <button className="p-1 hover:bg-red-500/80 rounded text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); onClose(win.id); }}>
              <X size={14} />
            </button>
         </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block shrink-0">
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
  const [showClientIntake, setShowClientIntake] = useState(false);
  const [resetViewTrigger, setResetViewTrigger] = useState(0); // Used to signal ClientHub to reset
  
  // Client DB State
  const [clients, setClients] = useState<Client[]>([DEFAULT_CLIENT as unknown as Client]); // Casting to avoid strict type issues with mock data
  const [activities, setActivities] = useState<ClientActivity[]>([
    {
       id: 'act-1',
       timestamp: new Date(Date.now() - 3600000), // 1 hour ago
       type: 'System',
       description: 'System initialized',
       clientName: 'Jordan'
    }
  ]);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Welcome to AdminOS. How can I support you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Logic ---

  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    const newActivity: ClientActivity = {
      id: `act-${Date.now()}`,
      timestamp: new Date(),
      type: 'New Client',
      description: 'New client intake completed',
      clientName: client.preferredName
    };
    setActivities(prev => [newActivity, ...prev]);
    // Trigger reset to Welcome Center
    setResetViewTrigger(prev => prev + 1);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleLogActivity = (activity: Omit<ClientActivity, 'id' | 'timestamp'>) => {
    const newActivity: ClientActivity = {
      id: `act-${Date.now()}`,
      timestamp: new Date(),
      ...activity
    };
    setActivities(prev => [newActivity, ...prev]);
  };

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
            <button 
              onClick={() => setShowClientIntake(true)}
              className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-700 py-2 rounded-lg text-xs font-medium transition"
            >
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
      }}
    >
      <TopBar />
      <WidgetArea />
      
      {/* Windows Layer */}
      {windows.map(win => (
        <OSWindow 
          key={win.id} 
          win={win} 
          isActive={activeWindowId === win.id}
          onActivate={(id) => setActiveWindowId(id)}
          onClose={closeWindow}
          onOpenChat={() => setChatOpen(true)}
          clients={clients}
          activities={activities}
          onAddClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          onOpenIntake={() => setShowClientIntake(true)}
          onLogActivity={handleLogActivity}
          resetViewTrigger={resetViewTrigger}
        />
      ))}
      {showClientIntake && (
        <QuickAddClientModal 
          onClose={() => setShowClientIntake(false)} 
          onClientCreated={handleAddClient}
        />
      )}

      <Launcher />
      <ChatOverlay />
      <Shelf />
    </div>
  );
}