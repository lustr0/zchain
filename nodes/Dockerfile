FROM ubuntu:16.04

RUN apt-get update && \
    apt-get -y install python-pip python-psycopg2 postgresql-client

RUN pip install requests psycopg2

WORKDIR /

ADD nodes.py /

CMD ["/nodes.py"]
