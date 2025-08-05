import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error("GOOGLE_AI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export const gemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 