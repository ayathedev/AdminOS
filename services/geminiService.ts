import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';

const apiKey = process.env.API_KEY || '';

// Initialize Gemini client
// Note: We create a new instance per call in the component to handle key updates if needed,
// but here we keep a static one for simplicity if the key is constant. 
// Given the instructions regarding "Key Selection" mainly apply to Veo, 
// for text generation we can just use the env key.
const ai = new GoogleGenAI({ apiKey });

export const generateOSResponse = async (
  userMessage: string, 
  context: string = ""
): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing. Please check your environment configuration.";
  }

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
