import { createGroq } from '@ai-sdk/groq';

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const textModel = groq('llama-3.3-70b-versatile');

export const toolModel = groq('llama-3.1-70b-versatile');