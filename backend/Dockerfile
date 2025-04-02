FROM alpine:latest

RUN apk add --no-cache sqlite npm nodejs

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
RUN npm install --save-dev tap 

COPY . .

ENV SQLITE_DB_PATH=/data/database.sqlite

EXPOSE 8888

CMD ["npm", "run", "dev"]
