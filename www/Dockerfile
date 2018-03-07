FROM pritunl/archlinux:latest

RUN pacman -S nginx npm --noconfirm
RUN npm install -g webpack html-minifier

RUN rm -r /usr/share/nginx/html

WORKDIR /

ADD src                     /src
ADD nginx.conf              /nginx.conf
ADD package.json            /package.json
ADD webpack-prod.config.js  /webpack-prod.config.js
ADD .babelrc                /.babelrc
ADD node_modules            /node_modules

RUN mkdir build && \
    cp src/*.jpg src/*.gif src/*.png src/*.xml src/*.json src/*.ico src/*.css src/*.js build && \
    cp -r src/third-party src/models build && \
    html-minifier src/index.html --remove-comments --collapse-whitespace -o build/index.html && \
    html-minifier src/network.html --remove-comments --collapse-whitespace -o build/network.html && \
    webpack --config webpack-prod.config.js

RUN ln -s /build /usr/share/nginx/html

CMD ["nginx", "-c", "/nginx.conf", "-g", "daemon off;"]
