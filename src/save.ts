import dotenv from "dotenv";
dotenv.config();
import fetch, { Headers } from "node-fetch";
(global as any).fetch = fetch;
(global as any).Headers = Headers;
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

interface GenerativePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

function stringToGenerativePart(base64String: string, mimeType: string): GenerativePart {
  return {
    inlineData: {
      data: base64String,
      mimeType,
    },
  };
}

async function run(base64Image: string, measure_type: string): Promise<void> {
  const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt: string = "Please provide the numerical reading of the " + measure_type + " meter in the image. Ignore any symbols or units. Note: The " + measure_type + " meter may have different designs and display formats. Please ensure the image is clear and focused on the meter's reading. Provide only the number.";

  const imagesParts: GenerativePart[] = [
    stringToGenerativePart(base64Image, "image/jpeg"),
  ];

  const result = await model.generateContent([prompt, ...imagesParts]);
  const response = await result.response;
  const text: string = await response.text();
  console.log(text);
}

// Exemplo de uso:
const base64ImageString = "";
run(base64ImageString, "Water");