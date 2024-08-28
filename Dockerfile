FROM node:16.14-alpine

RUN npm install -g npm@8.12.2 @google/generative-ai @google-cloud/storage dotenv prisma

WORKDIR /usr/app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate

COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
