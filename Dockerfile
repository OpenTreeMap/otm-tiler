FROM ubuntu:14.04

# set up our node install
RUN apt-get install -y software-properties-common && add-apt-repository -y ppa:ubuntu-toolchain-r/test

RUN apt-get update && apt-get install -y \
    checkinstall \
    g++ \
    libstdc++-5-dev \
    pkg-config \
    libcairo2-dev \
    libjpeg8-dev \
    libgif-dev \
    libpango1.0-dev \
    curl

RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && apt-get install -y nodejs

RUN npm install -g yarn

WORKDIR /usr/local/tiler
COPY . .

RUN yarn --force

CMD node server.js
