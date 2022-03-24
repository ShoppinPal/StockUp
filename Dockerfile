FROM node:10.15.3 as adminbuilder
ENV MONGOLAB_URI=mongodb://52.170.2.48:27017/warehouse-local
RUN mkdir -p /apps/warehouse
RUN mkdir -p /apps/warehouse/client
RUN chown -R node:node /apps/warehouse
COPY . /apps/warehouse
WORKDIR /apps/warehouse
RUN npm install
RUN npm run angular2-sdk
WORKDIR /apps/warehouse/admin
RUN npm install
RUN npm run admin

FROM node:8.16 as notification
RUN mkdir -p /apps/warehouse
COPY . /apps/warehouse
WORKDIR /apps/warehouse/notification-service
RUN npm install

FROM shoppinpal/node:6.10
ENV MONGOLAB_URI=mongodb://admin:c64e8e7b05a6d35@35.200.175.36:27017/warehouse-local
RUN sed -i '2d' /etc/apt/sources.list && apt-get -y update && apt-get -y dist-upgrade
RUN chown -R node:node /usr/local
RUN apt-get -y update && apt-get -y dist-upgrade && apt-get install -y python-pip python-dev && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/doc/*
RUN pip install awscli --upgrade
ENV DEBIAN_FRONTEND=noninteractive
ENV GOSU_VERSION 1.10
RUN set -x \
	&& apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /apps/warehouse
RUN chown -R node:node /apps/warehouse
WORKDIR /apps/warehouse
COPY package.json /apps/warehouse/package.json
COPY npm-shrinkwrap.json /apps/warehouse/npm-shrinkwrap.json
RUN npm install --no-optional --production && npm install grunt-cli
#RUN npm install -g bower
#RUN mv /apps/warehouse/node_modules /apps/node_modules
COPY . /apps/warehouse
#RUN bower --allow-root install
RUN chown -R node:node /apps/warehouse
ENV SCHEME=http
# Disable the debug logs for warehouse
#ENV DEBUG=shoppinpal:*,boot:*,common:models:*,server:*
#HEALTHCHECK --interval=1m --timeout=3s --start-period=1m CMD curl -f http://localhost:3000/api/StoreModels || exit 1
ENTRYPOINT [ "./docker-entrypoint.sh" ]
EXPOSE 3000
COPY --from=adminbuilder /apps/warehouse/client/admin /apps/warehouse/client/admin
COPY --from=notification /apps/warehouse/notification-service/node_modules /apps/warehouse/notification-service/node_modules
CMD [ "node","server/server.js" ]
