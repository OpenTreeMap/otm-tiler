FROM ubuntu:14.04
COPY . /app/
WORKDIR /app
RUN apt-get update && apt-get install -y curl apt-transport-https software-properties-common
RUN add-apt-repository -y ppa:ubuntu-toolchain-r/test
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs
RUN npm install -g yarn
RUN apt-get update && apt-get install -y checkinstall libmapnik-dev mapnik-utils g++ libstdc++-4.8-dev pkg-config libcairo2-dev libjpeg8-dev libgif-dev libpango1.0-dev
RUN yarn
CMD node server.js