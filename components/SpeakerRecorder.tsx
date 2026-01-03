import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, CheckCircle, Play, Pause, RefreshCw, FileText, Maximize2, X } from 'lucide-react';
import { Speaker } from '../types';
import { analyzeSpeakerAudio } from '../services/geminiService';
import { SPEECH_TIME_SECONDS } from '../constants';

interface SpeakerRecorderProps {
  speaker: Speaker;
  motion: string;
  motionContext: any;
  onUpdateSpeaker: (id: string, updates: Partial<Speaker>) => void;
}

export const SpeakerRecorder: React.FC<SpeakerRecorderProps> = ({ speaker, motion, motionContext, onUpdateSpeaker }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechTimerRef = useRef<any>(null);

  // Effect for Speech Timer
  useEffect(() => {
    if (speaker.isSpeechTimerRunning && speaker.speechTimeLeft > 0) {
      speechTimerRef.current = setInterval(() => {
        onUpdateSpeaker(speaker.id, { speechTimeLeft: speaker.speechTimeLeft - 1 });
      }, 1000);
    } else {
      clearInterval(speechTimerRef.current);
    }
    return () => clearInterval(speechTimerRef.current);
  }, [speaker.isSpeechTimerRunning, speaker.speechTimeLeft, speaker.id, onUpdateSpeaker]);

  const toggleSpeechTimer = () => {
    onUpdateSpeaker(speaker.id, { isSpeechTimerRunning: !speaker.isSpeechTimerRunning });
  };

  const resetSpeechTimer = () => {
    onUpdateSpeaker(speaker.id, { isSpeechTimerRunning: false, speechTimeLeft: SPEECH_TIME_SECONDS });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? { mimeType: 'audio/webm;codecs=opus' } 
        : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start(1000);
      setIsRecording(true);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    await processAudio(audioBlob);
  };

  const processAudio = async (blob: Blob) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSpeakerAudio(blob, speaker.role, motion, motionContext);
      onUpdateSpeaker(speaker.id, {
        isCompleted: true,
        transcription: result.transcription,
        score: result.score,
        feedback: result.feedback,
        audioBlob: blob
      });
    } catch (error) {
      console.error(error);
      alert("Failed to analyze audio. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className={`relative bg-white rounded-xl border p-4 transition-all ${speaker.isCompleted ? 'border-green-200 bg-green-50/30' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">{speaker.role}</h3>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${speaker.team.includes('Government') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
              {speaker.team}
            </span>
          </div>
          {speaker.isCompleted && (
            <div className="flex flex-col items-end">
               <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center mb-1">
                 <CheckCircle className="w-3 h-3 mr-1" /> Done
               </div>
               <div className="text-sm font-bold text-slate-700">Score: {speaker.score}</div>
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="space-y-3">
          
          {/* Timer Control */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className={`font-mono text-xl font-medium tabular-nums ${speaker.speechTimeLeft < 60 ? 'text-red-500' : 'text-slate-700'}`}>
              {formatTime(speaker.speechTimeLeft)}
            </span>
            <div className="flex space-x-1">
              <button 
                onClick={toggleSpeechTimer}
                className={`p-2 rounded-full transition-colors ${speaker.isSpeechTimerRunning ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                title={speaker.isSpeechTimerRunning ? "Pause Timer" : "Start Timer"}
              >
                {speaker.isSpeechTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button 
                onClick={resetSpeechTimer}
                className="p-2 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                title="Reset Timer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recording Control */}
          {!speaker.isCompleted ? (
             <div className="flex items-center justify-between">
                {isAnalyzing ? (
                   <div className="flex items-center text-xs text-indigo-600 font-medium">
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                   </div>
                ) : (
                  isRecording ? (
                    <button 
                      onClick={stopRecording}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center text-sm font-medium transition-colors animate-pulse"
                    >
                      <Square className="w-4 h-4 mr-2 fill-current" /> Stop Recording
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg flex items-center justify-center text-sm font-medium transition-colors"
                    >
                      <Mic className="w-4 h-4 mr-2" /> Record Speech
                    </button>
                  )
                )}
             </div>
          ) : (
            <div className="mt-2">
               <div className="flex justify-between items-center mb-1">
                  <span className="font-bold flex items-center text-slate-400 uppercase tracking-wider text-[10px]">
                    <FileText className="w-3 h-3 mr-1"/> Transcript
                  </span>
                  <button 
                    onClick={() => setShowTranscript(true)}
                    className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center transition-colors"
                  >
                    <Maximize2 className="w-3 h-3 mr-1"/> Full Text
                  </button>
               </div>
               <div className="text-xs text-slate-500 bg-white border border-slate-200 p-2 rounded max-h-20 overflow-hidden relative leading-relaxed">
                 {speaker.transcription?.substring(0, 100)}...
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Modal */}
      {showTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{speaker.role} - Transcript</h3>
                <p className="text-sm text-slate-500">{speaker.team}</p>
              </div>
              <button 
                onClick={() => setShowTranscript(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap text-slate-700 leading-relaxed font-sans text-sm md:text-base">
              {speaker.transcription || "No transcription available."}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setShowTranscript(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};