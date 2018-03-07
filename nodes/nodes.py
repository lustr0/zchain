#!/usr/bin/env python2.7

import psycopg2, requests, re, datetime, time, json, sys

regex   = re.compile('(.*) receive version message: (.*): version ([^,]*), blocks=([^,]*), us=([^,]*), peer=([^,]*), peeraddr=(.*)')
regex2  = re.compile('(.*) connect\(\) to ([^\s].*) failed after select\(\): Connection refused \(111\)')

log  = open('/root/.zcash/debug.log')
conn = psycopg2.connect('dbname=zchain user=postgres password=postgres')

last = time.time() - 600

while 1:
  line = log.readline()
  line = line[:-1]
  if line == '':
    time.sleep(0.01)
    continue
  if regex2.match(line):
    info          = regex2.findall(line)[0]
    last_seen     = time.mktime(datetime.datetime.strptime(info[0], '%Y-%m-%d %H:%M:%S').timetuple())
    first_seen    = last_seen
    ip            = ':'.join(info[1].split(':')[:-1])
    port          = info[1].split(':')[-1]
    port          = int(port)
    cursor        = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM nodes WHERE ip = %s', (ip,))
    res = cursor.fetchone()[0]
    if res > 0:
      cursor.execute('UPDATE nodes SET last_seen = %s WHERE ip = %s', (last_seen, ip))
      conn.commit()
      continue
    try:
      res         = requests.get('http://ipinfo.io/{}?token=46aaf14891b76a'.format(ip)).json()
    except:
      continue
    latitude      = float(res['loc'].split(',')[0]) if 'loc' in res else None
    longitude     = float(res['loc'].split(',')[1]) if 'loc' in res else None
    city          = res['city'] if 'city' in res and res['city'] != u'' else None
    country       = res['country'] if 'country' in res and res['country'] != u'' else None
    hostname      = res['hostname'] if 'hostname' in res and res['hostname'] != u'No Hostname' and res['hostname'] != u'' else None
    region        = res['region'] if 'region' in res and res['region'] != u'' else None
    organization  = res['org'] if 'org' in res and res['org'] != u'' else None
    cursor.execute('INSERT INTO nodes (ip, port, first_seen, last_seen, version, blocks, latitude, longitude, city, country, hostname, region, organization)\
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    (ip, port, first_seen, last_seen, '(unknown)', -1, latitude, longitude, city, country, hostname, region, organization))
    conn.commit()
    sys.stderr.write('Added node {} (no version)!\n'.format(ip))
    sys.stdout.flush()
    continue
  if regex.match(line):
    info          = regex.findall(line)[0]
    last_seen     = time.mktime(datetime.datetime.strptime(info[0], '%Y-%m-%d %H:%M:%S').timetuple())
    first_seen    = last_seen
    header        = info[1]
    version       = int(info[2])
    blocks        = int(info[3])
    sys.stderr.write(info[6] + '\n')
    sys.stderr.flush()
    ip            = ':'.join(info[6].split(':')[:-1])
    port          = info[6].split(':')[-1]
    port          = int(port)
    cursor        = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM nodes WHERE ip = %s', (ip,))
    res = cursor.fetchone()[0]
    if res > 0:
      cursor.execute('UPDATE nodes SET last_seen = %s, version = %s WHERE ip = %s', (last_seen, header, ip))
      conn.commit()
      continue
    try:
      res           = requests.get('http://ipinfo.io/{}?token=46aaf14891b76a'.format(ip)).json()
    except:
      continue
    latitude      = float(res['loc'].split(',')[0]) if 'loc' in res else None
    longitude     = float(res['loc'].split(',')[1]) if 'loc' in res else None
    city          = res['city'] if 'city' in res and res['city'] != u'' else None
    country       = res['country'] if 'country' in res and res['country'] != u'' else None
    hostname      = res['hostname'] if 'hostname' in res and res['hostname'] != u'No Hostname' and res['hostname'] != u'' else None
    region        = res['region'] if 'region' in res and res['region'] != u'' else None
    organization  = res['org'] if 'org' in res and res['org'] != u'' else None
    cursor.execute('INSERT INTO nodes (ip, port, first_seen, last_seen, version, blocks, latitude, longitude, city, country, hostname, region, organization)\
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    (ip, port, first_seen, last_seen, header, blocks, latitude, longitude, city, country, hostname, region, organization))
    conn.commit()
    sys.stderr.write('Added node {}!\n'.format(ip))
    sys.stdout.flush()
