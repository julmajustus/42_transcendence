FROM alpine:latest

RUN apk add --no-cache sqlite npm nodejs openssl

RUN mkdir -p /etc/transcendence/certs
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
	-keyout /etc/transcendence/certs/ssl.key \
	-out /etc/transcendence/certs/ssl.crt \
	-subj "/C=FI/ST=UUSIMA/L=HLSINKI/O=42/OU=HIVE/CN=${USER}"

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
