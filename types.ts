export enum Team {
  OG = 'Opening Government',
  OO = 'Opening Opposition',
  CG = 'Closing Government',
  CO = 'Closing Opposition',
}

export enum SpeakerRole {
  PM = 'Prime Minister',
  LO = 'Leader of Opposition',
  DPM = 'Deputy Prime Minister',
  DLO = 'Deputy Leader of Opposition',
  MG = 'Member of Government',
  MO = 'Member of Opposition',
  GW = 'Government Whip',
  OW = 'Opposition Whip',
}

export interface Speaker {
  id: string;
  role: SpeakerRole;
  team: Team;
  name: string;
  isCompleted: boolean;
  audioBlob?: Blob;
  transcription?: string;
  score?: number; // 0-20
  feedback?: string;
  // New fields for speaker management
  speechTimeLeft: number; // in seconds (starts at 440)
  isSpeechTimerRunning: boolean;
}

export interface TeamResult {
  team: Team;
  rank: number;
  totalScore: number;
  reasoning: string;
}

export interface MotionContext {
  detectedLanguage: string;
  specificCriteria: string[]; // Context-specific criteria from the web
  backgroundInfo: string;
}

export interface DebateSession {
  id: string;
  title: string;
  createdAt: number;
  topic: string;
  motionContext: MotionContext | null;
  isPrepTime: boolean;
  prepTimeLeft: number; // in seconds
  // Replaced single currentSpeakerIndex with flexible access
  speakers: Speaker[];
  isAdjudicating: boolean;
  finalRankings: TeamResult[] | null;
  overallAdjudication: string | null;
  // Track phases explicitly
  phase: 'setup' | 'prep' | 'debate' | 'results';
}

export interface AnalysisResult {
  transcription: string;
  score: number;
  feedback: string;
}

export interface RankingResult {
  rankings: {
    team: string; // Will match Team enum string
    rank: number;
    reasoning: string;
  }[];
  overallAdjudication: string;
}