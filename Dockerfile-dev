FROM node:6.11.1
RUN apt-get -y update && apt-get -y dist-upgrade
RUN chown -R node:node /usr/local
RUN apt-get -y update && apt-get -y dist-upgrade && apt-get install -y python-pip python-dev && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/doc/*
RUN pip install awscli --upgrade
ENV DEBIAN_FRONTEND=noninteractive
ENV GOSU_VERSION 1.10
RUN set -x \
	&& apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/* \
	&& wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
	&& wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
	&& export GNUPGHOME="$(mktemp -d)" \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
	&& gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
	&& rm -r "$GNUPGHOME" /usr/local/bin/gosu.asc \
	&& chmod +x /usr/local/bin/gosu \
	&& gosu nobody true
RUN mkdir -p /apps/warehouse
RUN chown -R node:node /apps/warehouse
WORKDIR /apps/warehouse
RUN npm install -g nodemon
COPY package.json /apps/warehouse/package.json
COPY npm-shrinkwrap.json /apps/warehouse/npm-shrinkwrap.json
RUN npm install && npm install grunt-cli && npm install -g bower
RUN mv /apps/warehouse/node_modules /apps/node_modules
COPY . /apps/warehouse
RUN bower --allow-root install
ENV SCHEME=http
# Disable the debug logs for warehouse
ENV DEBUG=shoppinpal:*,boot:*,common:models:*,server:*
HEALTHCHECK --interval=1m --timeout=3s --start-period=1m CMD curl -f http://localhost:3000/api/StoreModels || exit 1
ENTRYPOINT [ "./dev-entrypoint.sh" ]
EXPOSE 3000
CMD [ "nodemon","server/server.js" ]
