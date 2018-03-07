#!/bin/bash

sleep 5

NGINX=/usr/sbin/nginx
NGINX_CONF=/etc/nginx/nginx.conf
NGINX_TEMPLATE=/etc/nginx/nginx.conf.ctmpl
RESTART_COMMAND=/restart.sh

${NGINX} -c ${NGINX_CONF} -t && \
  ${NGINX} -c ${NGINX_CONF} -g "daemon on;"

/usr/local/bin/consul-template \
    -log-level ${LOG_LEVEL:-warn} \
    -consul ${CONSUL_PORT_8500_TCP_ADDR:-127.0.0.1}:${CONSUL_PORT_8500_TCP_PORT:-8500} \
    -template "${NGINX_TEMPLATE}:${NGINX_CONF}:${RESTART_COMMAND} || true" \
