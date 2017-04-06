FROM node:7.7
MAINTAINER tal@tumblr.com

RUN curl -o- -L https://yarnpkg.com/install.sh | bash

# use changes to package.json to force Docker not to use the cache
# when we change our application's nodejs dependencies:
COPY package.json yarn.lock /tmp/
RUN cd /tmp && yarn install --pure-lockfile --production
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/

# From here we load our application's code in, therefore the previous docker
# "layer" thats been cached will be used if possible
WORKDIR /opt/app
ADD . /opt/app

EXPOSE 3001:3001

ENTRYPOINT ["yarn", "run", "server"]
