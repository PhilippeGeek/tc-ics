FROM node AS build

WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install
COPY .babelrc .babelrc
COPY src src
RUN npm run build

FROM node:alpine

WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install --production
COPY --from=build /app/build /app
CMD node app.js
EXPOSE 3000
