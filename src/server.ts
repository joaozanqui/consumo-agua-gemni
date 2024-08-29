import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as dotenv from 'dotenv';
dotenv.config();

import fetch, { Headers } from "node-fetch";
(global as any).fetch = fetch;
(global as any).Headers = Headers;
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

import * as fs from 'fs';
import * as path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const prisma = new PrismaClient();
const app = express();
const port = 3000;

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // Limite de 10MB

app.use(express.json());


// ---------------- Leitura da imagem em base64
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

// ------------------- Obtendo medicao atraves da IA

async function runGemini(base64Image: string, measure_type: string): Promise<string> {
  const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt: string = `Please provide the numerical reading of the ${measure_type} meter in the image. Ignore any symbols or units. Note: The ${measure_type} meter may have different designs and display formats. Please ensure the image is clear and focused on the meter's reading. Provide only the number, disregarding leading zeros.`;

  const imagesParts: GenerativePart[] = [
    createGenerativePart(base64Image, "image/jpeg"),
  ];
  
  const result = await model.generateContent([prompt, ...imagesParts]);
  const response = await result.response;
  const text: string = await response.text();

  return text.toString();
}

// -------------------- Salvando a imagem em base64 em um arquivo
function saveBase64Image(imageId: string, base64Data: string): string {
  const imagePath = path.join(__dirname, 'images', `${imageId}.jpeg`);
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Cria a pasta "images" se ela não existir
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });

  // Salva a imagem
  fs.writeFileSync(imagePath, imageBuffer);

  return imagePath;
}

// Função para gerar um link único para a imagem
function generateImageLink(imageId: string, base64Data: string): string {
  const imagePath = saveBase64Image(imageId, base64Data); // Salva a imagem e obtém o caminho
  const expiresIn = 3600; // Link expira em 1 hora
  const expiresAt = Date.now() + expiresIn * 1000;

  // Retorna o link com a expiração configurada
  return `http://localhost:${port}/image/${imageId}?expiresAt=${expiresAt}`;
}


// ------------------------ Endpoints

// POST /upload
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    var { customer_code, measure_type } = req.body;
    customer_code = customer_code.toUpperCase();
    measure_type = measure_type.toUpperCase();

    const image = req.file;

    // Validar o tipo de dados dos parâmetros enviados (inclusive o base64)
    if (!image || !customer_code || !measure_type) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description: "Campos 'image', 'customer_code', e 'measure_type' são obrigatórios.",
      });
    }

    const base64Image = image.buffer.toString('utf8');

    // Verificar se já existe uma leitura no mês naquele tipo de leitura.
    const existingMeasure = await prisma.image.findFirst({
      where: {
        customer_code,
        measure_type,
        measure_datetime: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(),
        },
      },
    });

    if (existingMeasure) {
      return res.status(409).json({
        error_code: "DOUBLE_REPORT",
        error_description: "Leitura do mês já realizada.",
      });
    }

    // Criar a response

    const newImage = await prisma.image.create({
      data: {
        image: base64Image,
        customer_code,
        measure_type,
        measure_value: await runGemini(base64Image, measure_type),
        confirmed_value: 0,
        image_url: 'url'
      },
    });

    const imageId = newImage.measure_uuid.toString();
    const image_url = generateImageLink(imageId, base64Image);

    // Salva o link gerado no banco de dados
    await prisma.image.update({
      where: { measure_uuid: newImage.measure_uuid },
      data: {
        image_url,
      },
    });

    return res.status(200).json({
      measure_uuid: newImage.measure_uuid,
      measure_value: newImage.measure_value,
      image_url: image_url,
    });
  } catch (error) {
    return res.status(500).json({
      error_code: "SERVER_ERROR",
      error_description: `Erro interno no servidor. - ${error}`,
    });
  }
});



// PATCH /confirm
app.patch('/confirm', async (req, res) => {
  try {
    const { measure_uuid, confirmed_value } = req.body;

    // Validações dos dados fornecidos
    if (typeof measure_uuid !== 'number' || typeof confirmed_value !== 'number') {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description: "Os dados fornecidos no corpo da requisição são inválidos.",
      });
    }

    // Verifica se a leitura existe e se já foi confirmada
    const measure = await prisma.image.findUnique({
      where: { measure_uuid },
    });

    if (!measure) {
      return res.status(404).json({
        error_code: "MEASURE_NOT_FOUND",
        error_description: "Leitura não encontrada.",
      });
    }

    if (measure.has_confirmed) {
      return res.status(409).json({
        error_code: "CONFIRMATION_DUPLICATE",
        error_description: "Leitura já confirmada.",
      });
    }

    // Atualiza a leitura com o novo valor confirmado
    await prisma.image.update({
      where: { measure_uuid },
      data: {
        confirmed_value, // Adiciona o valor confirmado ao banco de dados
        has_confirmed: true,
      },
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      error_code: "SERVER_ERROR",
      error_description: `Erro interno no servidor. - ${error}`,
    });
  }
});




// GET /:customer_code/list
app.get('/:customer_code/list', async (req, res) => {
  try {
    var { customer_code } = req.params;
    customer_code = customer_code.toUpperCase();
    const measureTypeQuery = req.query.measure_type; // Captura o parâmetro measure_type

    // Define o tipo de filtro
    let filter: { customer_code: string; measure_type?: string } = { customer_code };

    // Verifica se o parâmetro measure_type foi fornecido e é uma string
    if (typeof measureTypeQuery === 'string') {
      const measureType: string = measureTypeQuery.toUpperCase();
      const validTypes = ["WATER", "GAS"];

      // Valida se o measure_type é um dos tipos permitidos
      if (!validTypes.includes(measureType)) {
        return res.status(400).json({
          error_code: "INVALID_TYPE",
          error_description: "Tipo de medição não permitida",
        });
      }

      // Adiciona a filtragem pelo tipo de medição
      filter.measure_type = measureType;
    }

    // Busca as medidas no banco de dados com base no filtro
    const measures = await prisma.image.findMany({
      where: filter,
      select: {
        measure_uuid: true,
        measure_datetime: true,
        measure_type: true,
        has_confirmed: true,
        image_url: true,
      },
    });

    // Verifica se nenhuma medida foi encontrada
    if (measures.length === 0) {
      return res.status(404).json({
        error_code: "MEASURES_NOT_FOUND",
        error_description: "Nenhuma leitura encontrada.",
      });
    }

    // Retorna a lista de medidas encontradas
    return res.status(200).json({
      customer_code,
      measures,
    });
  } catch (error) {
    // Retorna erro interno do servidor em caso de exceção
    return res.status(500).json({
      error_code: "SERVER_ERROR",
      error_description: `Erro interno no servidor. - ${error}`,
    });
  }
});


// Retorna a imagem salva

app.get('/image/:measure_uuid', (req, res) => {
  const { measure_uuid } = req.params;
  const expiresAt = parseInt(req.query.expiresAt as string, 10);

  // Verifica se o link expirou
  if (Date.now() > expiresAt) {
    return res.status(410).send('Link expired');
  }

  const imagePath = path.join(__dirname, 'images', `${measure_uuid}.jpeg`);

  // Envia a imagem se ela existir
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).send('Image not found');
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
