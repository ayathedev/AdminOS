import React, { useState } from 'react';
import { OSState, OSEvent } from '../types';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface DebugSectionProps {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

const DebugSection = ({ title, children, defaultOpen = true }: DebugSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/20">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center gap-2 p-2 text-xs font-bold uppercase tracking-wider hover:bg-white/10 text-gray-300"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {isOpen && <div className="p-2 space-y-2">{children}</div>}
    </div>
  );
};

export default function DebugOverlay({ state, onToggle }: { state: OSState, onToggle: () => void }) {
  if (!state.system.debugMode) return null;

  return (
    <div className="fixed top-0 right-0 w-[360px] h-full bg-black/90 text-green-400 font-mono text-[10px] leading-tight overflow-y-auto z-[10003] shadow-2xl border-l border-white/20">
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-white/20 sticky top-0 z-10">
        <span className="font-bold text-white">ADMIN_OS DEBUGGER</span>
        <button onClick={onToggle} className="text-gray-400 hover:text-white"><X size={14} /></button>
      </div>

      {/* WINDOW MANAGER */}
      <DebugSection title="Window Manager">
        <div className="grid grid-cols-2 gap-2 mb-2 text-gray-400">
          <div>Focused: <span className="text-white">{state.windows.focusedWindowID || 'None'}</span></div>
          <div>Order Count: <span className="text-white">{state.windows.order.length}</span></div>
          <div>Modal: <span className="text-white">{state.system.overlays.activeModalWindowID || 'None'}</span></div>
          <div>Blur: <span className="text-white">{state.system.overlays.blurActive ? 'ON' : 'OFF'}</span></div>
        </div>
        <div className="space-y-1">
          {state.windows.order.map((id, idx) => {
            const w = state.windows.byID[id];
            return (
              <div key={id} className={`p-1 border rounded ${w.id === state.windows.focusedWindowID ? 'border-green-500 bg-green-900/30' : 'border-gray-700'}`}>
                <div className="flex justify-between font-bold text-white">
                  <span>[{idx}] {w.title}</span>
                  <span>{w.zIndex}</span>
                </div>
                <div className="text-gray-500 truncate">{w.id}</div>
                <div className="grid grid-cols-2 gap-1 text-gray-400 mt-1">
                  <span>pos: {w.position.x}, {w.position.y}</span>
                  <span>size: {w.size?.width}x{w.size?.height}</span>
                  <span>hub: {w.hubId}</span>
                  <span>{w.isMaximized ? 'MAX' : ''} {w.isMinimized ? 'MIN' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DebugSection>

      {/* LAYOUT ENGINE */}
      <DebugSection title="Layout Engine">
        <div className="space-y-1 text-gray-300">
          <div className="flex justify-between"><span>Desktop W:</span> <span className="text-white">{state.system.layout.desktopWidth}px</span></div>
          <div className="flex justify-between"><span>Desktop H:</span> <span className="text-white">{state.system.layout.desktopHeight}px</span></div>
          <div className="flex justify-between"><span>Top Bar H:</span> <span className="text-white">48px</span></div>
          <div className="flex justify-between"><span>Dock H:</span> <span className="text-white">72px</span></div>
          <div className="mt-2 text-gray-500">
            Usable Area: [16, 64] to [{state.system.layout.desktopWidth - 16}, {state.system.layout.desktopHeight - 88}]
          </div>
        </div>
      </DebugSection>

      {/* REDUCER DIAGNOSTICS */}
      <DebugSection title="Reducer Diagnostics">
        <div className="space-y-1">
           <div className="flex justify-between"><span>Last Action:</span> <span className="text-white">{state.logging.events[0]?.type || 'N/A'}</span></div>
           <div className="flex justify-between"><span>Time to Reduce:</span> <span className={`font-bold ${state.logging.lastReductionTime > 16 ? 'text-red-500' : 'text-white'}`}>{state.logging.lastReductionTime.toFixed(2)}ms</span></div>
        </div>
      </DebugSection>

      {/* EVENT LOG */}
      <DebugSection title="Event Log (Last 20)">
        <div className="space-y-1">
          {state.logging.events.map((e, i) => (
             <div key={i} className="border-l-2 border-gray-700 pl-2 py-1 hover:bg-white/5">
                <div className="flex justify-between text-gray-400">
                   <span>{e.timestamp ? new Date(e.timestamp).toLocaleTimeString().split(' ')[0] : ''}</span>
                   <span className="text-white font-bold">{e.type}</span>
                </div>
                <div className="text-gray-500 truncate">src: {e.source}</div>
                {e.payload && Object.keys(e.payload).length > 0 && (
                   <div className="text-gray-600 truncate">{JSON.stringify(e.payload)}</div>
                )}
             </div>
          ))}
        </div>
      </DebugSection>
    </div>
  );
}