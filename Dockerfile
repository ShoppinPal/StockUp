FROM node:0.10.48
RUN apt-get -y update && apt-get -y dist-upgrade
ENV GOSU_VERSION 1.7
RUN set -x \
	&& apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/* \
	&& wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
	&& wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
	&& export GNUPGHOME="$(mktemp -d)" \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
	&& gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
	&& rm -r "$GNUPGHOME" /usr/local/bin/gosu.asc \
	&& chmod +x /usr/local/bin/gosu \
	&& gosu nobody true \
	&& apt-get purge -y --auto-remove ca-certificates wget

ENV SCHEME=http
RUN chown -R node:node /usr/local
RUN apt-get -y update && apt-get install -y python-pip
RUN pip install awscli
ENV DEBIAN_FRONTEND=noninteractive
RUN mkdir -p /apps/warehouse
RUN chown -R node:node /apps/warehouse
WORKDIR /apps/warehouse
RUN npm install -g nodemon
COPY package.json /apps/warehouse/package.json
RUN npm install --production
RUN npm install grunt-cli
RUN npm install bower
RUN mv /apps/warehouse/node_modules /apps/node_modules
COPY . /apps/warehouse
RUN ../node_modules/bower/bin/bower --allow-root install
ENV DEBUG=shoppinpal:*,boot:*,common:models:*,server:*
ENTRYPOINT [ "./docker-entrypoint.sh" ]
EXPOSE 3000
CMD [ "node","server/server.js" ]
