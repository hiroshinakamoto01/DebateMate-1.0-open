import React, { useState, useEffect } from 'react';
import { DebateSession, Team, TeamResult, Speaker, MotionContext } from '../types';
import { PREP_TIME_SECONDS } from '../constants';
import { SpeakerRecorder } from './SpeakerRecorder';
import { generateFinalRanking, analyzeMotionContext } from '../services/geminiService';
import { Clock, Trophy, ChevronRight, Gavel, PlayCircle, Wifi, Mic, Loader2, Globe, BookOpen, AlertTriangle, Square, CheckSquare, User, BarChart3 } from 'lucide-react';

interface DebateDashboardProps {
  session: DebateSession;
  onUpdate: (updatedSession: DebateSession) => void;
}

export const DebateDashboard: React.FC<DebateDashboardProps> = ({ session, onUpdate }) => {
  const [motionInput, setMotionInput] = useState(session.topic);
  const [isAnalyzingMotion, setIsAnalyzingMotion] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [skipPrepTime, setSkipPrepTime] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync inputs
  useEffect(() => { setMotionInput(session.topic); }, [session.id]);

  // Prep Timer
  useEffect(() => {
    let interval: any;
    if (session.phase === 'prep' && session.prepTimeLeft > 0) {
      interval = setInterval(() => {
        onUpdate({ ...session, prepTimeLeft: session.prepTimeLeft - 1 });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.phase, session.prepTimeLeft, session.id]);

  // Actions
  const handleAnalyzeAndStart = async () => {
    if (!motionInput.trim()) return;
    if (!isOnline) {
       alert("Please connect to the internet to generate debate criteria.");
       return;
    }

    setIsAnalyzingMotion(true);
    try {
      const context = await analyzeMotionContext(motionInput);
      
      const nextPhase = skipPrepTime ? 'debate' : 'prep';
      
      onUpdate({
        ...session,
        topic: motionInput,
        title: motionInput.length > 30 ? motionInput.substring(0, 30) + '...' : motionInput,
        motionContext: context,
        phase: nextPhase,
        prepTimeLeft: skipPrepTime ? 0 : PREP_TIME_SECONDS
      });
    } catch (e) {
      alert("Error generating criteria. Please try again.");
    } finally {
      setIsAnalyzingMotion(false);
    }
  };

  const handleSkipPrep = () => {
    onUpdate({ ...session, phase: 'debate', prepTimeLeft: 0 });
  };

  const handleUpdateSpeaker = (id: string, updates: Partial<Speaker>) => {
    const newSpeakers = session.speakers.map(s => s.id === id ? { ...s, ...updates } : s);
    onUpdate({ ...session, speakers: newSpeakers });
  };

  const handleFinishDebate = async () => {
    const completedCount = session.speakers.filter(s => s.isCompleted).length;
    if (completedCount < 8) {
      if(!confirm(`Only ${completedCount}/8 speakers have been recorded. Are you sure you want to end?`)) return;
    }

    onUpdate({ ...session, isAdjudicating: true, phase: 'results' });
    try {
      const result = await generateFinalRanking(session.speakers, session.topic, session.motionContext);
      
      const finalRankings: TeamResult[] = result.rankings.map(r => ({
          team: r.team as Team,
          rank: r.rank,
          totalScore: 0, 
          reasoning: r.reasoning
      }));

      // Calculate total scores
      finalRankings.forEach(teamRank => {
         const teamSpeakers = session.speakers.filter(s => s.team === teamRank.team);
         teamRank.totalScore = teamSpeakers.reduce((acc, s) => acc + (s.score || 0), 0);
      });

      onUpdate({
        ...session,
        phase: 'results', // Explicitly set phase to prevent stale closure reversion
        isAdjudicating: false,
        finalRankings: finalRankings,
        overallAdjudication: result.overallAdjudication
      });
    } catch (e) {
      console.error(e);
      // Revert to debate phase on error so user can retry
      onUpdate({ ...session, isAdjudicating: false, phase: 'debate' });
      alert("Adjudication failed. Please check your connection and try again.");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- VIEW 1: LOGIN / SETUP ---
  if (session.phase === 'setup') {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-4 overflow-y-auto">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 my-auto">
           <div className="text-center mb-8">
             <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Gavel className="w-8 h-8 text-indigo-600" />
             </div>
             <h1 className="text-2xl font-bold text-slate-900">Start New Match</h1>
             <p className="text-slate-500">Enter the motion to begin adjudication.</p>
           </div>

           <div className="space-y-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Debate Motion</label>
               <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                  placeholder="e.g. This House Believes That..."
                  value={motionInput}
                  onChange={(e) => setMotionInput(e.target.value)}
               />
             </div>

             <div 
               className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
               onClick={() => setSkipPrepTime(!skipPrepTime)}
             >
               {skipPrepTime ? (
                 <CheckSquare className="w-5 h-5 text-indigo-600 mr-3" />
               ) : (
                 <Square className="w-5 h-5 text-slate-400 mr-3" />
               )}
               <span className="text-sm font-medium text-slate-700">Skip Preparation Timer (Go straight to debate)</span>
             </div>

             <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center">
                  <Wifi className={`w-4 h-4 mr-2 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
                  {isOnline ? "Connected to Internet" : "No Internet Connection"}
                </div>
                <div className="flex items-center">
                  <Mic className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Permissions Check</span>
                </div>
             </div>

             <button 
               onClick={handleAnalyzeAndStart}
               disabled={!isOnline || !motionInput.trim() || isAnalyzingMotion}
               className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center"
             >
               {isAnalyzingMotion ? (
                 <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating Criteria...</>
               ) : (
                 <>
                   {skipPrepTime ? "Start Debate" : "Go to Preparation"} 
                   <ChevronRight className="w-5 h-5 ml-2" />
                 </>
               )}
             </button>
           </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: PREPARATION ---
  if (session.phase === 'prep') {
    return (
      <div className="flex-1 w-full h-full flex flex-col bg-slate-900 text-white relative overflow-y-auto">
         <div className="absolute inset-0 bg-indigo-900/20 backdrop-blur-3xl z-0 pointer-events-none"></div>
         
         <div className="z-10 flex-1 flex flex-col items-center justify-center min-h-[600px] p-8">
            <h2 className="text-indigo-400 font-medium uppercase tracking-widest mb-4">Motion</h2>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-12 text-center max-w-4xl">{session.topic}</h1>
            
            <div className="mb-16 text-center">
               <div className="text-8xl md:text-9xl font-mono font-bold tracking-tighter tabular-nums text-white">
                 {formatTime(session.prepTimeLeft)}
               </div>
               <p className="text-slate-400 mt-2 text-lg">Preparation Time Remaining</p>
            </div>

            <button 
              onClick={handleSkipPrep}
              className="group bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-all flex items-center z-50 cursor-pointer border-4 border-red-500/30"
            >
              Skip Preparation Time <PlayCircle className="w-8 h-8 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>
    );
  }

  // --- VIEW 3: MAIN INTERFACE (DEBATE) ---
  if (session.phase === 'debate') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
         {/* Top Bar */}
         <div className="bg-white border-b border-slate-200 p-4 px-8 flex justify-between items-center shadow-sm z-10 shrink-0">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase">Current Motion</h2>
              <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-2xl">{session.topic}</p>
            </div>
            {session.motionContext && (
               <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium border border-indigo-100">
                  <Globe className="w-3 h-3" />
                  <span>{session.motionContext.detectedLanguage} Context Active</span>
               </div>
            )}
         </div>

         {/* Speaker Grid */}
         <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto pb-20">
               {session.speakers.map((speaker) => (
                 <SpeakerRecorder 
                   key={speaker.id}
                   speaker={speaker}
                   motion={session.topic}
                   motionContext={session.motionContext}
                   onUpdateSpeaker={handleUpdateSpeaker}
                 />
               ))}
            </div>
         </div>

         {/* Footer Action - Fixed at bottom */}
         <div className="bg-white border-t border-slate-200 p-4 px-8 flex justify-end shrink-0 z-20">
            <button 
              onClick={handleFinishDebate}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center transition-all"
            >
              End Discussion & Proceed to Ranking <Gavel className="w-5 h-5 ml-2" />
            </button>
         </div>
      </div>
    );
  }

  // --- VIEW 4: RESULTS ---
  if (session.phase === 'results') {
    const sortedSpeakers = [...session.speakers].sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
      <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 md:p-8">
        {session.isAdjudicating ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
             <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
             <h2 className="text-2xl font-bold text-slate-800">Adjudicating Debate...</h2>
             <p className="text-slate-500 mt-2 max-w-md text-center">Analyzing transcripts against Universal Criteria and {session.motionContext?.detectedLanguage} context.</p>
          </div>
        ) : session.finalRankings ? (
          <div className="max-w-6xl mx-auto space-y-8 pb-20">
             
             {/* Header */}
             <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-3xl font-bold mb-2">Debate Results</h1>
                <p className="text-slate-400 text-lg opacity-80">{session.topic}</p>
             </div>
             
             {/* Team Rankings */}
             <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" /> Team Rankings
                </h2>
                <div className="grid gap-6 md:grid-cols-4">
                  {session.finalRankings.sort((a,b) => a.rank - b.rank).map((rank) => (
                    <div key={rank.team} className={`relative p-6 rounded-xl border-2 transition-transform hover:scale-[1.02] ${rank.rank === 1 ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-200 bg-white'}`}>
                      {rank.rank === 1 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase shadow-sm">Winner</div>}
                      <div className="text-5xl font-black text-slate-200 mb-2 absolute right-4 top-4 opacity-50">#{rank.rank}</div>
                      <div className="relative z-10">
                         <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 h-10 flex items-center">{rank.team}</h3>
                         <p className="text-sm text-slate-600 line-clamp-3 mb-4">{rank.reasoning}</p>
                         <div className="pt-4 border-t border-slate-100/50 flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Total Score</span>
                            <span className="font-bold text-slate-900 text-lg">{rank.totalScore}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Speaker Rankings */}
             <div className="space-y-4">
               <h2 className="text-xl font-bold text-slate-900 flex items-center">
                 <User className="w-6 h-6 mr-2 text-indigo-500" /> Speaker Rankings
               </h2>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                         <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Speaker Role</th>
                         <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Team</th>
                         <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Score</th>
                         <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Feedback & Analysis</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {sortedSpeakers.map((speaker, index) => (
                         <tr key={speaker.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'}`}>
                               {index + 1}
                             </span>
                           </td>
                           <td className="px-6 py-4 font-medium text-slate-900">{speaker.role}</td>
                           <td className="px-6 py-4 text-sm text-slate-500">
                             <span className={`px-2 py-1 rounded text-xs font-medium ${speaker.team.includes('Government') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                               {speaker.team}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-center">
                             <span className="text-lg font-bold text-indigo-600">{speaker.score || 0}</span>
                             <span className="text-xs text-slate-400 block">/ 20</span>
                           </td>
                           <td className="px-6 py-4 text-sm text-slate-600 leading-relaxed">
                              {speaker.feedback || "No feedback generated."}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>

             {/* Overall Adjudication */}
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <BookOpen className="w-6 h-6 mr-2 text-indigo-500" /> Overall Adjudication (RFD)
                </h2>
                <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                  {session.overallAdjudication}
                </div>
             </div>
             
             {/* Context Info Footer */}
             {session.motionContext && (
               <div className="mt-8 pt-8 border-t border-slate-200">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Evaluated Against Motion Specific Criteria</h3>
                 <div className="flex flex-wrap gap-2">
                    {session.motionContext.specificCriteria.map((c, i) => (
                      <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs border border-slate-200">
                        {c}
                      </span>
                    ))}
                 </div>
               </div>
             )}

             <div className="flex justify-center pt-8">
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center"
                >
                   <Gavel className="w-5 h-5 mr-2" /> Start New Debate Session
                </button>
             </div>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
};