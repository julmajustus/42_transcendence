FROM alpine:latest

RUN apk add --no-cache sqlite npm nodejs

RUN npm install -g nodemon

WORKDIR /app

#COPY package.json package-lock.json ./
COPY . .

RUN npm install

# Unit test dependencies
RUN npm install --save-dev tap
RUN npm install --save-dev proxyquire
RUN npm install --save-dev form-data

VOLUME /app/uploads/avatars

ENV SQLITE_DB_PATH=/data/database.sqlite

EXPOSE 8888

CMD ["npm", "run", "dev"]
