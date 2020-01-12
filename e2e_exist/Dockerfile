FROM node:6.10.3
COPY . /project
WORKDIR /project
RUN npm install -g protractor
RUN npm install
ENTRYPOINT [ "protractor" ]