package main

import (
)

const (

  PostgresHost = "user=postgres password=postgres dbname=zchain host=/run/postgresql sslmode=disable"

  RedisHost = "172.17.0.1:6379"
  RedisPass = ""
  RedisDB   = 0

  ZcashRPCUser = "username"
  ZcashRPCPass = "password"

  MainStatsKey = "zchain:mainstats"

)

var (

  ZcashRPCHost = "http://127.0.0.1:8232"

)

type Network struct {
  Name            string    `json:"name"`
  Accounts        int       `json:"accounts"`
  Transactions    int       `json:"transactions"`
  BlockHash       string    `json:"blockHash"`
  BlockNumber     int       `json:"blockNumber"`
  Difficulty      float64   `json:"difficulty"`
  Hashrate        float64   `json:"hashrate"`
  MeanBlockTime   float64   `json:"meanBlockTime"`
  PeerCount       int       `json:"peerCount"`
  ProtocolVersion int       `json:"protocolVersion"`
  RelayFee        float64   `json:"relayFee"`
  Version         int       `json:"version"`
  SubVersion      string    `json:"subVersion"`
  TotalAmount     float64   `json:"totalAmount"`
}

type Block struct {
  Hash            string    `json:"hash"`
  MainChain       bool      `json:"mainChain"`
  Size            int       `json:"size"`
  Height          int       `json:"height"`
  Transactions    int       `json:"transactions"`
  Version         int       `json:"version"`
  MerkleRoot      string    `json:"merkleRoot"`
  Timestamp       int       `json:"timestamp"`
  Time            int       `json:"time"`
  Nonce           string    `json:"nonce"`
  Solution        string    `json:"solution"`
  Bits            string    `json:"bits"`
  Difficulty      float64   `json:"difficulty"`
  ChainWork       string    `json:"chainWork"`
  Miner           string    `json:"miner"`
  PrevHash        string    `json:"prevHash"`
  NextHash        string    `json:"nextHash,omitempty"`
}

type Transaction struct {
  Hash            string        `json:"hash"`
  MainChain       bool          `json:"mainChain"`
  Fee             float64       `json:"fee"`
  Type            string        `json:"type"`
  Shielded        bool          `json:"shielded"`
  Index           int           `json:"index"`
  BlockHash       string        `json:"blockHash"`
  BlockHeight     int           `json:"blockHeight"`
  Version         int           `json:"version"`
  LockTime        int           `json:"lockTime"`
  Timestamp       int           `json:"timestamp"`
  Time            int           `json:"time"`
  Vin             []interface{} `json:"vin"`
  Vout            []interface{} `json:"vout"`
  Vjoinsplit      []interface{} `json:"vjoinsplit"`
  Value           float64       `json:"value"`
  OutputValue     float64       `json:"outputValue"`
  ShieldedValue   float64       `json:"shieldedValue"`
}

type Account struct {
  Address         string        `json:"address"`
  Balance         float64       `json:"balance"`
  FirstSeen       int           `json:"firstSeen"`
  LastSeen        int           `json:"lastSeen"`
  SentCount       int           `json:"sentCount"`
  RecvCount       int           `json:"recvCount"`
  MinedCount      int           `json:"minedCount"`
  TotalSent       float64       `json:"totalSent"`
  TotalRecv       float64       `json:"totalRecv"`
}

type News struct {
  Title           string        `json:"title"`
  Author          string        `json:"author"`
  Source          string        `json:"source"`
  Description     string        `json:"description"`
  Timestamp       float64       `json:"timestamp"`
  Link            string        `json:"link"`
}

type Node struct {
  IP              string        `json:"ip"`
  Port            int64         `json:"port"`
  FirstSeen       int           `json:"firstSeen"`
  LastSeen        int           `json:"lastSeen"`
  Version         string        `json:"version"`
  Blocks          int64         `json:"blocks"`
  Latitude        float64       `json:"latitude"`
  Longitude       float64       `json:"longitude"`
  City            string        `json:"city"`
  Country         string        `json:"country"`
  Hostname        string        `json:"hostname"`
  Region          string        `json:"region"`
  Organization    string        `json:"organization"`
}
