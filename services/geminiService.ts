import { GoogleGenAI, Type } from "@google/genai";
import { Speaker, AnalysisResult, RankingResult, MotionContext } from '../types';
import { UNIVERSAL_CRITERIA } from '../constants';

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeMotionContext = async (motion: string): Promise<MotionContext> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the parliamentary debate motion: "${motion}".

    Tasks:
    1. Detect the language of the motion.
    2. Use Google Search to find current events, critical analyses, and context specific to this topic.
    3. Generate 3-5 specific judging criteria that are critical for THIS specific topic (e.g., specific stakeholder impacts, current geopolitical context, economic principles involved).
    4. Provide a brief background summary of the topic.

    Return the result in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for reasoning + tools
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: { type: Type.STRING },
            specificCriteria: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3-5 specific criteria for this motion"
            },
            backgroundInfo: { type: Type.STRING }
          },
          required: ['detectedLanguage', 'specificCriteria', 'backgroundInfo']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Extract grounding metadata if available (optional for UI but good practice)
    // const grounding = response.candidates?.[0]?.groundingMetadata;

    return {
      detectedLanguage: result.detectedLanguage || "Unknown",
      specificCriteria: result.specificCriteria || [],
      backgroundInfo: result.backgroundInfo || "No context found."
    };

  } catch (error) {
    console.error("Error analyzing motion:", error);
    // Fallback if search fails
    return {
      detectedLanguage: "English (Fallback)",
      specificCriteria: ["Analyze based on general logic due to search error."],
      backgroundInfo: "Could not retrieve online context."
    };
  }
};

export const analyzeSpeakerAudio = async (
  audioBlob: Blob,
  role: string,
  motion: string,
  motionContext: MotionContext | null
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Audio = await blobToBase64(audioBlob);

  const contextStr = motionContext 
    ? `
      Detected Language: ${motionContext.detectedLanguage}
      Topic Background: ${motionContext.backgroundInfo}
      TOPIC SPECIFIC CRITERIA:
      ${motionContext.specificCriteria.map((c, i) => `${i+1}. ${c}`).join('\n')}
      `
    : "No specific motion context available.";

  // Combined Prompt
  const prompt = `
    The motion is: "${motion}".
    The speaker is the ${role}.
    
    **Context & Criteria**:
    ${contextStr}

    **Universal Judging Criteria**:
    ${UNIVERSAL_CRITERIA}
    
    **Input Audio Instructions**:
    The speech may be in ANY language, likely matching: ${motionContext?.detectedLanguage}.
    
    **Tasks**:
    1. **Transcription**: Transcribe the speech ACCURATELY in its ORIGINAL language (verbatim).
    2. **Evaluation**: Evaluate the speech on a scale of 0 to 20 based on the Universal Criteria AND the Topic Specific Criteria provided above.
    3. **Feedback**: Provide constructive feedback (in the speech's language) referencing specifically how they met or failed the Burden Awareness, Strategic Positioning, and Topic Specific nuances.

    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            score: { type: Type.NUMBER, description: "Score between 0 and 20" },
            feedback: { type: Type.STRING }
          },
          required: ['transcription', 'score', 'feedback']
        },
        systemInstruction: "You are an expert multilingual parliamentary debate adjudicator connected to real-time knowledge."
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      transcription: result.transcription || "Transcription failed.",
      score: typeof result.score === 'number' ? result.score : 0,
      feedback: result.feedback || "No feedback generated."
    };

  } catch (error) {
    console.error("Error analyzing audio:", error);
    throw error;
  }
};

export const generateFinalRanking = async (
  speakers: Speaker[],
  motion: string,
  motionContext: MotionContext | null
): Promise<RankingResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare context
  const debateContext = speakers.map(s => {
    if (!s.isCompleted) {
        return `Speaker: ${s.role} (${s.team})\nStatus: DID NOT SPEAK / ABSENT\nScore: 0`;
    }
    return `
    Speaker: ${s.role} (${s.team})
    Score: ${s.score}/20
    Summary/Transcription Excerpt: ${s.transcription?.substring(0, 3000)}...
    Feedback: ${s.feedback}
  `;
  }).join('\n\n');

  const contextStr = motionContext 
  ? `TOPIC CRITERIA: ${motionContext.specificCriteria.join('; ')}`
  : "";

  const prompt = `
    The motion was: "${motion}".
    ${contextStr}
    
    Here is the summary of the debate performance by speaker. Some speakers may not have spoken; treat their missing contribution as a failure to fulfill the role (Iron Person) or simply rank based on existing speeches if it's a practice match.
    ${debateContext}

    **Criteria**: Use the Universal Adjudication Criteria (Role Fulfillment, Clash, Impact, etc.) AND the Topic Specific Criteria to determine the winner.
    
    **Tasks**:
    1. **Rank**: Rank the 4 teams (OG, OO, CG, CO).
    2. **Adjudication**: Provide a detailed Reason for Decision (RFD). Write the RFD in the SAME language as the debate was conducted.

    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                rankings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            team: { type: Type.STRING },
                            rank: { type: Type.INTEGER },
                            reasoning: { type: Type.STRING }
                        }
                    }
                },
                overallAdjudication: { type: Type.STRING }
            }
        },
        systemInstruction: "You are the Chief Adjudicator for a British Parliamentary debate."
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as RankingResult;

  } catch (error) {
    console.error("Error generating rankings:", error);
    throw error;
  }
};