# Imagem base
FROM node:18

# Instalando dependencias do sharp para avif
RUN apt update && apt install -y \
    libvips \
    libaom-dev \
    libheif-dev

# Instalando dependencias do projeto
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

# Copiando o projeto
COPY . .

# Instalando o Prisma
RUN yarn prisma generate

# Compilando o projeto
RUN yarn build

# Definindo o comando de execução e exportando a imagem
CMD ["yarn", "start"]