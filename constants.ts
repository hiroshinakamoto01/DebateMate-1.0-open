import { Speaker, SpeakerRole, Team } from './types';

export const SPEECH_TIME_SECONDS = 7 * 60 + 20; // 7 minutes 20 seconds
export const PREP_TIME_SECONDS = 15 * 60; // 15 minutes

export const INITIAL_SPEAKERS: Speaker[] = [
  { id: '1', role: SpeakerRole.PM, team: Team.OG, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '2', role: SpeakerRole.LO, team: Team.OO, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '3', role: SpeakerRole.DPM, team: Team.OG, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '4', role: SpeakerRole.DLO, team: Team.OO, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '5', role: SpeakerRole.MG, team: Team.CG, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '6', role: SpeakerRole.MO, team: Team.CO, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '7', role: SpeakerRole.GW, team: Team.CG, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
  { id: '8', role: SpeakerRole.OW, team: Team.CO, name: '', isCompleted: false, speechTimeLeft: SPEECH_TIME_SECONDS, isSpeechTimerRunning: false },
];

export const UNIVERSAL_CRITERIA = `
I. ROLE FULFILMENT & BASICS
1. Role Fulfilment: Is the speaker doing the job required by their position? Aware of opening/closing/gov/opp duties?
2. Burden Awareness: Does the speaker correctly understand the burden of proof?
3. Clear Contribution: What did this speech add? Analysis, framing, or rebuttal?
4. Strategic Positioning: Is the speaker consciously positioning their team? Differentiating from opening (if closing)?
5. POI and Interaction: Strategic engagement with opponents?
6. Time and Priority: Efficient time usage on main conflicts?

II. UNIVERSAL META-CRITERIA (WINNING THE MATCH)
1. Clash Identification: Have main clash axes been identified and owned?
2. Framing Power: Does speaker clarify which criteria win the debate? (Normative vs Practical, etc)
3. Comparative Analysis: "We are better than them" (trade-offs, "even if" analysis).
4. Impact Analysis: Clear impact (Who, how, how much).
5. Consistency: Internal logic and consistency with partner.
6. Dynamic Match Reading: Reactive to the live debate vs pre-written.
7. Judge Adaptation: Helps the judge decide? Clear signposting.

III. WINNING MINDSET
1. Winning Mindset: Playing to win vs being right. Risk-reward balance.
`;