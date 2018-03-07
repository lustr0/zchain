FROM nginx:latest

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates
RUN curl -O https://releases.hashicorp.com/consul-template/0.15.0/consul-template_0.15.0_linux_amd64.zip && \
    unzip consul-template_0.15.0_linux_amd64.zip && \
    rm consul-template_0.15.0_linux_amd64.zip && \
    mv consul-template /usr/local/bin && \
    rm -v /etc/nginx/conf.d/*

ADD nginx.conf.ctmpl /etc/nginx/nginx.conf.ctmpl

ADD startup.sh restart.sh /
RUN chmod u+x /startup.sh && \
    chmod u+x /restart.sh

CMD ["./startup.sh"]
