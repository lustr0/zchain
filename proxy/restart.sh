#!/bin/sh

NGINX=/usr/sbin/nginx
NGINX_CONF=/etc/nginx/nginx.conf
PID=/var/run/nginx.pid

echo "[$(date)] Restarting nginx"
${NGINX} -c ${NGINX_CONF} -t && \
kill -s HUP $(cat ${PID})
