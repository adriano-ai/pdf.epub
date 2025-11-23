import { GoogleGenAI } from "@google/genai";
import { AIActionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

const PROMPTS: Record<AIActionType, string> = {
  [AIActionType.CORRECT]: "Atue como um revisor profissional de português brasileiro. Corrija a gramática, ortografia e pontuação do texto abaixo, mantendo o tom original. Retorne apenas o texto corrigido, sem explicações.",
  [AIActionType.IMPROVE]: "Atue como um editor experiente. Melhore a fluidez, clareza e vocabulário do texto abaixo, tornando-o mais elegante e profissional em português brasileiro. Retorne apenas o texto melhorado.",
  [AIActionType.SUMMARIZE]: "Resuma o texto abaixo em português brasileiro, capturando os pontos principais de forma concisa. Retorne apenas o resumo.",
  [AIActionType.EXPAND]: "Expanda o texto abaixo, adicionando detalhes relevantes e aprofundando os conceitos apresentados, mantendo a coerência. Retorne apenas o texto expandido em português.",
  [AIActionType.TRANSLATE_EN]: "Translate the following text to English efficiently and accurately. Return only the translation."
};

export const processTextWithAI = async (text: string, action: AIActionType): Promise<string> => {
  if (!text.trim()) return "";

  try {
    const prompt = `${PROMPTS[action]}\n\n---\n\n${text}`;
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || text;
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    throw new Error("Falha ao processar o texto com IA.");
  }
};