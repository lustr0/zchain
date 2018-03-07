#!/usr/bin/env python3

import lxml, requests, unidecode, time, json, urllib, re, newspaper
urlparse = urllib.parse
import psycopg2
from dateutil import parser
from lxml import etree

# Google News

def googleNews():
  def bp(h):
    e = etree.HTML(h)
    return e[0][0]

  def rt(e):
    return (e.text or '') + ''.join(rt(x) for x in e.getchildren())

  def ex(u):
    raw = etree.fromstring(requests.get(u).text)[0]
    ims = []
    for x in [y for y in raw if y.tag == 'item']:
      link = urlparse.parse_qs(x[1].text)['url'][0]
      art  = newspaper.Article(link)
      art.download()
      try: art.parse()
      except: continue
      ims.append({
        'link': link,
        'timestamp': time.mktime(parser.parse(x[3].text).timetuple()),
        'title': art.title,
        'author': art.authors[0] if len(art.authors) > 0 else '', 
        'source': rt(bp(x[4].text)[0][1][0][2][2]),
        'description': art.meta_description,
        'image': art.top_img if art.top_img != u'' else None
      })  
    return [x for x in ims if 'zcash' in x['title'].lower()]

  url = 'https://news.google.com/news?q=zcash&output=rss'
  return ex(url)

def coindesk():

  url = 'http://feeds.feedburner.com/CoinDesk?fmt=xml'
  res = requests.get(url).text
  res = unidecode.unidecode(res).encode('ascii', 'ignore')
  res = etree.fromstring(res)[0]
  its = [x for x in res if x.tag == 'item']

  areg = re.compile('<span class="single-author"><a href=".*" title=".*" rel="author">([A-Za-z0-9 ]*)</a>')
  dreg = re.compile('(.*)<(.*)')

  items = []

  for i in its:
    c = [x.text for x in i if x.tag == 'category' and x.text is not None]
    d = [x.text for x in i if x.tag == 'description'][0]
    d = dreg.findall(d)
    d = d[0][0] if len(d) > 0 else ''
    if 'zcash' not in d.lower(): continue
    link = i[1].text
    res = requests.get(link, allow_redirects = False)
    redirect = urlparse.urlparse(res.headers['Location'])
    redirect = redirect[0] + '://' + redirect[1] + redirect[2]
    art = newspaper.Article(redirect)
    story = art.html
    authors = areg.findall(story)
    items.append({
      'link': redirect,
      'timestamp': time.mktime(parser.parse(i[2].text).timetuple()),
      'title': i[0].text,
      'author': authors[0] if len(authors) > 0 else '', 
      'source': 'Coindesk',
      'description': d,
      'image': art.top_img if art.top_img != u'' else None
    })  

  return [x for x in items if 'zcash' in x['title'].lower()]

sources = [googleNews, coindesk]

if __name__ == '__main__':
  while 1:
    news = [x for y in sources for x in y()]
    for n in news:
      if n['source'].upper() == 'HACKED':
        continue
      conn = psycopg2.connect('user=postgres password=postgres dbname=zchain')
      cur = conn.cursor()
      try: 
        cur.execute('INSERT INTO news (title, link, author, source, description, timestamp) VALUES (%s, %s, %s, %s, %s, %s)', (n['title'], n['link'], n['author'], n['source'], n['description'], n['timestamp']))
        conn.commit()
      except psycopg2.IntegrityError:
        pass
    time.sleep(10)
