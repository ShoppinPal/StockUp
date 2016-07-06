## Step 1
# you can get details about the following image from https://hub.docker.com/_/node/
FROM node:0.10.46

## Step 2
RUN apt-get -y update

# add gosu for easy step-down from root
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

# add our user and group first to make sure their IDs get assigned consistently, regardless of whatever dependencies get added
RUN groupadd -r node && useradd -m -r -g node node
RUN chown -R node:node /usr/local

## Step 3
#RUN apt-get install -y tree

## Step ?
# already installed in node:${version} images
#RUN apt-get install git-all

## Step 4
# for debugging ports
#RUN apt-get install -y telnet

## Step 5
# https://github.com/jfrazelle/dockerfiles/issues/12
ENV DEBIAN_FRONTEND=noninteractive
## Step 6
#RUN apt-get install -y less

## Step 7
RUN mkdir -p /apps/warehouse
## Step 8
COPY . /apps/warehouse
WORKDIR /apps/warehouse
RUN chown -R node:node /apps/warehouse

# https://github.com/docker/docker/issues/1996#issuecomment-185872769
#ARG CACHEBUST=1
#RUN echo ${CACHEBUST}
#RUN git clone https://github.com/ShoppinPal/warehouse.git -b develop

#WORKDIR /apps/warehouse
ENV SCHEME=http

#RUN ls -alrt
#ARG BUILD_ENV
#ARG VM_EXTERNAL_IP
#ARG IW_OAUTH_TOKEN
#ARG IW_URL
#ARG VEND_CLIENT_ID
#ARG VEND_CLIENT_SECRET
#ARG MONGOLAB_URI
#ARG IMPORT_STOCK_ORDER_TO_WAREHOUSE
#ARG IMPORT_STOCK_ORDER_TO_POS
#ARG STOCK_ORDER_WORKER
#ARG GENERATE_STOCK_ORDER_WORKER
#ARG REMOVE_UNFULFILLED_PRODUCTS_WORKER
#ARG REMOVE_UNRECEIVED_PRODUCTS_WORKER

####
### start: logically grouped section of steps
## Step 26
RUN gosu node npm install
## Step 27
RUN gosu node npm install grunt-cli
## Step 28
RUN gosu node npm install bower
## Step 29
RUN gosu node node_modules/bower/bin/bower --allow-root install
###
#### end: logically grouped section of steps

####
### start: logically grouped section of steps
## Step 30
#RUN echo "module.exports = {\n\
#  'site': {\n\
#    'baseUrl': '${SCHEME}://${VM_EXTERNAL_IP}',\n\
#    'proxyUrl': ''\n\
#  },\n\
#  'logging': {\n\
#    'console': true,\n\
#    'file': false\n\
#  },\n\
#  'prestashop': {\n\
#    'apiKey': ''\n\
#  },\n\
#  'vend':{\n\
#    'auth_endpoint': 'https://secure.vendhq.com/connect',\n\
#    'token_service': '.vendhq.com/api/1.0/token',\n\
#    'client_id': '${VEND_CLIENT_ID}',\n\
#    'client_secret': '${VEND_CLIENT_SECRET}'\n\
#  },\n\
#  'ironWorkersUrl': '${IW_URL}',\n\
#  'ironWorkersOauthToken': '${IW_OAUTH_TOKEN}',\n\
#  'importStockOrderToWarehouse': '${IMPORT_STOCK_ORDER_TO_WAREHOUSE}',\n\
#  'importStockOrderToPos': '${IMPORT_STOCK_ORDER_TO_POS}',\n\
#  'generateStockOrderWorker': '${GENERATE_STOCK_ORDER_WORKER}',\n\
#  'removeUnfulfilledProducts': '${REMOVE_UNFULFILLED_PRODUCTS_WORKER}',\n\
#  'removeUnreceivedProducts': '${REMOVE_UNRECEIVED_PRODUCTS_WORKER}',\n\
#  'stockOrderWorker': '${STOCK_ORDER_WORKER}'\n\
#};" > server/config.${BUILD_ENV}.js
## Step 31
#RUN cat server/config.${BUILD_ENV}.js
###
#### end: logically grouped section of steps

## Step 32
#RUN node_modules/grunt-cli/bin/grunt deploy:${BUILD_ENV}

####
### start: logically grouped section of steps
## Step 33
#ARG SKIP_SEEDING
#ENV SKIP_SEEDING=${SKIP_SEEDING}
## Step 34
#ENV NODE_ENV=${BUILD_ENV}
## Step 35
ENV DEBUG=shoppinpal:*,boot:*,common:models:*,server:*
## Step 36
###
#### end: logically grouped section of steps


## Step 37
#RUN npm install -g forever

####
### start: logically grouped section of steps
# The <src> path for COPY must be inside the context of the build;
# you cannot COPY ../something /something, because the first
# step of a docker build is to send the context directory
# (and subdirectories) to the docker daemon.
## Step 38
#ARG SEED_FILE
## Step 39
#RUN echo ${SEED_FILE}
## Step 40
#COPY ${SEED_FILE} ./server/boot/seed.json
###
#### end: logically grouped section of steps
#ADD run.sh /apps/warehouse/run.sh

RUN chmod +x ./docker-entrypoint.sh
ENTRYPOINT [ "./docker-entrypoint.sh" ]
EXPOSE 3000
CMD [ "node","server/server.js" ]

#CMD [ "/bin/sh", "-c", "forever start server/server.js && tail -f $(forever list | grep 'server/server.js' | awk '{print $8}');" ]
