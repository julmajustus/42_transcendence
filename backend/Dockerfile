FROM alpine:latest

RUN apk add --no-cache sqlite npm nodejs

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Unit test dependencies
RUN npm install --save-dev tap 
RUN npm install --save-dev proxyquire

COPY . .

ENV SQLITE_DB_PATH=/data/database.sqlite

EXPOSE 8888

CMD ["npm", "run", "dev"]
