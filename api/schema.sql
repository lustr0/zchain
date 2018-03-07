DROP DATABASE zchain;
CREATE DATABASE zchain;

\c zchain

CREATE TABLE IF NOT EXISTS network (
  name              TEXT PRIMARY KEY,
  peerCount         INT NOT NULL DEFAULT 0,
  blockNumber       INT NOT NULL DEFAULT 0,
  blockHash         TEXT NOT NULL DEFAULT '',
  totalAmount       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  version           INT NOT NULL DEFAULT 0,
  subVersion        TEXT NOT NULL DEFAULT '',
  hashrate          INT NOT NULL DEFAULT 0,
  protocolVersion   INT NOT NULL DEFAULT 0,
  relayFee          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  difficulty        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  transactions      INT NOT NULL DEFAULT 0,
  accounts          INT NOT NULL DEFAULT 0,
  meanBlockTime     DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS blocks (
  hash              TEXT PRIMARY KEY,
  mainChain         BOOLEAN NOT NULL,
  size              INT NOT NULL,
  height            INT NOT NULL,
  transactions      INT NOT NULL,
  version           TEXT NOT NULL,
  merkleRoot        TEXT NOT NULL,
  timestamp         INT NOT NULL,
  time              INT NOT NULL,
  nonce             TEXT NOT NULL,
  solution          TEXT NOT NULL,
  bits              TEXT NOT NULL,
  difficulty        DOUBLE PRECISION NOT NULL,
  chainWork         TEXT NOT NULL,
  miner             TEXT NOT NULL,
  prevHash          TEXT,
  nextHash          TEXT
);

CREATE TABLE IF NOT EXISTS synced (
  hash              TEXT PRIMARY KEY REFERENCES blocks(hash)
);

CREATE TABLE IF NOT EXISTS transactions (
  hash              TEXT PRIMARY KEY,
  fee               DOUBLE PRECISION NOT NULL,
  type              TEXT NOT NULL,
  shielded          BOOLEAN NOT NULL,
  index             INT NOT NULL,
  blockHash         TEXT NOT NULL REFERENCES blocks(hash),
  blockHeight       INT NOT NULL,
  version           INT NOT NULL,
  lockTime          INT NOT NULL,
  timestamp         INT NOT NULL,
  time              INT NOT NULL,
  vin               JSONB,
  vout              JSONB,
  vjoinsplit        JSONB,
  value             DOUBLE PRECISION NOT NULL,
  outputValue       DOUBLE PRECISION NOT NULL,
  shieldedValue     DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts_sent (
  transaction       TEXT NOT NULL REFERENCES transactions(hash),
  address           TEXT NOT NULL,
  index             INT NOT NULL,
  amount            DOUBLE PRECISION NOT NULL,
  CONSTRAINT accounts_sent_pk PRIMARY KEY (transaction, address, index)
);

CREATE TABLE IF NOT EXISTS accounts_recv (
  transaction       TEXT NOT NULL REFERENCES transactions(hash),
  address           TEXT NOT NULL,
  index             INT NOT NULL,
  amount            DOUBLE PRECISION NOT NULL,
  CONSTRAINT accounts_recv_pk PRIMARY KEY (transaction, address, index)
);

CREATE TABLE IF NOT EXISTS news (
  title             TEXT UNIQUE NOT NULL,
  link              TEXT UNIQUE NOT NULL,
  author            TEXT,
  source            TEXT NOT NULL,
  description       TEXT,
  timestamp         INT NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
  ip            TEXT PRIMARY KEY NOT NULL,
  port          INT NOT NULL,
  first_seen    INT NOT NULL,
  last_seen     INT NOT NULL,
  version       TEXT NOT NULL,
  blocks        INT NOT NULL,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  city          TEXT,
  country       TEXT,
  hostname      TEXT,
  region        TEXT,
  organization  TEXT
);

DELETE FROM network;
DELETE FROM blocks;
DELETE FROM synced;
DELETE FROM transactions;
DELETE FROM accounts_sent;
DELETE FROM accounts_recv;
DELETE FROM news;
DELETE FROM nodes;

INSERT INTO network (name) VALUES ('mainnet');

create view addresses as select distinct address from (select address from accounts_sent union all select address from accounts_recv) as sent_recv;

CREATE TABLE IF NOT EXISTS accounts_materialized (
  address   TEXT PRIMARY KEY,
  lastSeen  INT NOT NULL
);

CREATE INDEX ON accounts_materialized (lastSeen);

CREATE INDEX ON accounts_sent (address);
CREATE INDEX ON accounts_recv (address);
CREATE INDEX ON accounts_sent (transaction);
CREATE INDEX ON accounts_recv (transaction);
CREATE INDEX ON accounts_recv (address, transaction);
CREATE INDEX ON accounts_sent (address, transaction);
CREATE INDEX ON transactions (blockHash);
CREATE INDEX ON blocks (miner);
CREATE INDEX ON blocks (mainChain);

create view accounts as select
  addresses.address,
  (select min(timestamp) from (select transactions.timestamp from transactions inner join accounts_sent on transactions.hash = accounts_sent.transaction where accounts_sent.address = addresses.address
  union all select transactions.timestamp from transactions inner join accounts_recv on transactions.hash = accounts_recv.transaction where accounts_recv.address = addresses.address) as ts) as firstSeen,
  (select max(timestamp) from (select transactions.timestamp from transactions inner join accounts_sent on transactions.hash = accounts_sent.transaction where accounts_sent.address = addresses.address
  union all select transactions.timestamp from transactions inner join accounts_recv on transactions.hash = accounts_recv.transaction where accounts_recv.address = addresses.address) as ts) as lastSeen,
  (select count(*) from blocks where miner = address) as minedCount,
  (select count(distinct transaction) from accounts_sent inner join transactions on transactions.hash = accounts_sent.transaction where accounts_sent.address = addresses.address) as sentCount,
  coalesce((select sum(amount) from accounts_sent inner join transactions on transactions.hash = accounts_sent.transaction where accounts_sent.address = addresses.address), 0) as totalSent,
  (select count(distinct transaction) from accounts_recv inner join transactions on transactions.hash = accounts_recv.transaction inner join blocks on transactions.blockHash = blocks.hash where accounts_recv.address = addresses.address and blocks.mainChain) as recvCount,
  coalesce((select sum(amount) from accounts_recv inner join transactions on transactions.hash = accounts_recv.transaction inner join blocks on transactions.blockHash = blocks.hash where accounts_recv.address = addresses.address and blocks.mainChain), 0) as totalRecv,
  coalesce((select sum(amount) from accounts_recv inner join transactions on transactions.hash = accounts_recv.transaction inner join blocks on transactions.blockHash = blocks.hash where accounts_recv.address = addresses.address and blocks.mainChain), 0) 
  - coalesce((select sum(amount) from accounts_sent inner join transactions on transactions.hash = accounts_sent.transaction inner join blocks on transactions.blockHash = blocks.hash where accounts_sent.address = addresses.address and blocks.mainChain), 0) as balance
  from addresses;
