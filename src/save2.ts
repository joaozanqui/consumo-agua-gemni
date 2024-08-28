import dotenv from "dotenv";
dotenv.config();
import * as fs from "fs";
import fetch, { Headers } from "node-fetch";
(global as any).fetch = fetch;
(global as any).Headers = Headers;
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Carrega o conteúdo do arquivo base64.txt em uma variável string
const base64String: string = fs.readFileSync("base64.txt", "utf8");

interface GenerativePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

function createGenerativePart(base64Data: string, mimeType: string): GenerativePart {
  return {
    inlineData: {
      data: base64Data, // Usa a string base64 carregada
      mimeType,
    },
  };
}

async function run(base64Image: string, measure_type: string): Promise<string> {
  console.log(base64Image);
  const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });
  console.log("1- ");

  const prompt: string = "Please provide the numerical reading of the " + measure_type + " meter in the image. Ignore any symbols or units. Note: The " + measure_type + " meter may have different designs and display formats. Please ensure the image is clear and focused on the meter's reading. Provide only the number.";

  const imagesParts: GenerativePart[] = [
    createGenerativePart(base64Image, "image/jpeg"),
  ];
  // console.log("2- " + imagesParts);

  const result = await model.generateContent([prompt, ...imagesParts]);
  // console.log("3- " + result);

  const response = await result.response;
  // console.log("4- ");
  
  const text: string = await response.text();
  // console.log("5 - " + text);
  return text.toString();
}

async function main() {
  const result = await run(base64String, "Gas");
  console.log(result);
}

main();
