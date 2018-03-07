FROM ubuntu:16.04

RUN apt-get update && \
    apt-get -y install python3-pip python3-psycopg2 postgresql-client libxslt-dev

RUN pip3 install requests psycopg2 lxml unidecode python-dateutil newspaper3k

WORKDIR /

ADD news.py /

CMD ["/news.py"]
