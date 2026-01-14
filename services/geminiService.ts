import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOSResponse = async (
  userMessage: string, 
  context: string = ""
): Promise<string> => {
  try {
    const model = "gemini-3-flash-preview"; 
    
    // Construct a rich prompt with context
    const fullPrompt = `
      ${SYSTEM_PROMPT}

      CONTEXT:
      ${context}

      USER REQUEST:
      ${userMessage}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT, // Also passing as system instruction for reinforcement
      }
    });

    return response.text || "I processed your request but could not generate a text response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error processing your request. Please try again.";
  }
};