FROM node:lts-buster

RUN apt-get update && \
  apt-get install -y \
  ffmpeg \
  imagemagick \
  webp && \
  apt-get upgrade -y && \
  rm -rf /var/lib/apt/lists/*

# AJOUT DE CETTE LIGNE IMPORTANTE :
WORKDIR /app

COPY package.json .
RUN npm install
COPY . .
CMD ["node", "index.js"]

