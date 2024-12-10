FROM node:22

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN npm install
COPY . /app

CMD ["npm", "test"]