import React, { useState } from 'react';
import { DebateDashboard } from './components/DebateDashboard';
import { DebateSession } from './types';
import { INITIAL_SPEAKERS, PREP_TIME_SECONDS } from './constants';
import { Plus, Layout, Calendar, SortAsc, Trash2, Gavel } from 'lucide-react';

function App() {
  const [sessions, setSessions] = useState<DebateSession[]>([
    {
      id: 'default-1',
      title: 'New Debate 1',
      createdAt: Date.now(),
      topic: '',
      motionContext: null,
      isPrepTime: true,
      prepTimeLeft: PREP_TIME_SECONDS,
      // Default initial state
      phase: 'setup',
      speakers: JSON.parse(JSON.stringify(INITIAL_SPEAKERS)),
      isAdjudicating: false,
      finalRankings: null,
      overallAdjudication: null,
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default-1');
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date');

  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: DebateSession = {
      id: newId,
      title: `New Debate ${sessions.length + 1}`,
      createdAt: Date.now(),
      topic: '',
      motionContext: null,
      isPrepTime: true,
      prepTimeLeft: PREP_TIME_SECONDS,
      phase: 'setup',
      speakers: JSON.parse(JSON.stringify(INITIAL_SPEAKERS)), // Deep copy
      isAdjudicating: false,
      finalRankings: null,
      overallAdjudication: null,
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
  };

  const updateSession = (updated: DebateSession) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sessions.length === 1) return; // Prevent deleting last session
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0].id);
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortOrder === 'date') return b.createdAt - a.createdAt; // Newest first
    return a.title.localeCompare(b.title);
  });

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-screen">
        <div className="p-4 border-b border-slate-700">
           <div className="flex items-center space-x-2 mb-6 text-white font-bold text-xl">
             <Gavel className="w-6 h-6 text-indigo-400" />
             <span>DebateMate</span>
           </div>
           
           <button 
             onClick={createNewSession}
             className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center justify-center hover:bg-indigo-500 transition-colors"
           >
             <Plus className="w-4 h-4 mr-2" /> New Debate
           </button>
        </div>

        <div className="px-4 py-2 flex justify-between items-center text-xs text-slate-500 border-b border-slate-800">
           <span>MATCH RECORDS</span>
           <button onClick={() => setSortOrder(prev => prev === 'date' ? 'name' : 'date')} className="hover:text-white">
             <SortAsc className="w-3 h-3" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedSessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                activeSessionId === session.id 
                ? 'bg-slate-800 text-white' 
                : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{session.title}</div>
                <div className="text-xs text-slate-500 truncate flex items-center mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>
              {sessions.length > 1 && (
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {activeSession ? (
          <DebateDashboard 
            key={activeSession.id} // Key ensures re-mount/reset on switch
            session={activeSession} 
            onUpdate={updateSession} 
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">Select a session</div>
        )}
      </div>
    </div>
  );
}

export default App;