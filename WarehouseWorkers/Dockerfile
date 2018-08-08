FROM node:6.9.5-alpine
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -y update && apt-get -y dist-upgrade
RUN mkdir -p /apps/workers
WORKDIR /apps/workers
COPY package.json /apps/workers
RUN npm install && npm install -g nodemon
RUN mv node_modules /apps/
COPY . /apps/workers
CMD [ "node","sqsWorker.js" ]
