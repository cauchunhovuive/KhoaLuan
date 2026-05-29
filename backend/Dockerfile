FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Startup script - tự động push schema + seed data
RUN chmod +x start.sh

EXPOSE 5000

CMD ["./start.sh"]
