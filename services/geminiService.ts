import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Chunk } from "../types";

const SYSTEM_INSTRUCTION = `
You are a "Content Conversion Craftsman" for an English learning app.
I will give you a long English text. Please convert it into "short, separated data chunks" that are easy to read on a smartphone chat screen.

[Method]
1. Divide the provided English text into fine lines based on **meaningful chunks** (chunking).
   (Guideline: Breaks at commas, conjunctions, prepositions, etc., about 3-8 words per line).
2. If there are conversation parts (enclosed in "" or ''), infer and tag "who is speaking".
3. Add a natural Japanese translation to each short English sentence.

[Output Data Format]
Output ONLY the following JSON format for the app to load. No greetings needed.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      en: {
        type: Type.STRING,
        description: "The short English chunk",
      },
      jp: {
        type: Type.STRING,
        description: "Natural Japanese translation",
      },
      speaker: {
        type: Type.STRING,
        nullable: true,
        description: "Name of the speaker if applicable, otherwise null",
      },
    },
    required: ["en", "jp"],
  },
};

export const parseTextToChunks = async (text: string): Promise<Chunk[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1, // Low temperature for consistent formatting
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No response from AI");
    }

    const chunks: Chunk[] = JSON.parse(jsonText);
    return chunks;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
