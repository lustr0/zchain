package main

import (
  "fmt"
  "time"
  "math"
  "errors"
  "database/sql"
  "encoding/json"

  "gopkg.in/redis.v5"
  "github.com/parnurzeal/gorequest"
)

func round(num float64) int {
  return int(num + math.Copysign(0.5, num))
}

func toFixed(num float64, precision int) float64 {
  output := math.Pow(10, float64(precision))
  return float64(round(num * output)) / output
}

func min(x, y float64) float64 {
  if x < y { return x } else { return y }
}

func rpc(method string, parameters []interface{}) (interface{}, error) {
  _body, err := json.Marshal(map[string]interface{} {
    "id"          : "0",
    "jsonrpc"     : "1.0",
    "method"      : method,
    "params"      : parameters,
  })

  if err != nil {
    log.Warningf("Error marshaling JSON: %v", err)
    return nil, err
  }

  resp, body, errs := gorequest.New().
    Post(ZcashRPCHost).
    SetBasicAuth(ZcashRPCUser, ZcashRPCPass).
    Send(string(_body)).
    EndBytes()

  if len(errs) > 0 || resp == nil {
    log.Warningf("Error hitting zcashd: %v", errs)
    return nil, errs[0]
  }

  var res map[string]interface{}
  json.Unmarshal(body, &res)

  if resp.StatusCode != 200 {
    log.Warningf("Bad status: %v, %s", resp.StatusCode, body)
    return nil, errors.New(fmt.Sprintf("%v", res["error"]))
  }

  return res["result"], nil
}

func syncUsageStats(db *sql.DB) {
  for {
    var txCount int
    res := db.QueryRow("SELECT COUNT(*) FROM transactions")
    err := res.Scan(&txCount)
    if err != nil { log.Warningf("Error counting tx: %s", err) }
    var accCount int
    res = db.QueryRow("SELECT COUNT(DISTINCT address) FROM (SELECT address FROM accounts_sent UNION SELECT address FROM accounts_recv) as accounts")
    err = res.Scan(&accCount)
    if err != nil { log.Warningf("Error counting accounts: %s", err) }
    var meanBlockTime float64
    res = db.QueryRow("SELECT AVG(time) FROM (SELECT time FROM blocks ORDER BY height DESC LIMIT 120) as blocks")
    err = res.Scan(&meanBlockTime)
    if err != nil { log.Warningf("Error calculating mean block time: %s", err) }
    _, err = db.Exec("UPDATE network SET transactions = $1, accounts = $2, meanBlockTime = $3", txCount, accCount, meanBlockTime)
    if err != nil { log.Warningf("Error updating network table: %s", err) }
    time.Sleep(10 * time.Second)
  }
}

func syncMainStats(db *sql.DB) {
  rdc := redis.NewClient(&redis.Options{Addr: RedisHost, Password: RedisPass, DB: RedisDB})
  for {
    miners := make(map[string]int)
    res, err := db.Query("SELECT miner, COUNT(*) FROM blocks GROUP BY miner")
    if err != nil { log.Warningf("Error counting miners: %s", err) }
    for {
      var miner string
      var count int
      if !res.Next() { break }
      res.Scan(&miner, &count)
      miners[miner] = count
    }

    shielded := make(map[string]int)
    res, err = db.Query("SELECT shielded, COUNT(*) FROM transactions GROUP BY shielded")
    if err != nil { log.Warningf("Error counting shielded txns: %s", err) }
    for {
      var shld bool
      var count int
      if !res.Next() { break }
      res.Scan(&shld, &count)
      if shld {
        shielded["shielded"] = count
      } else {
        shielded["public"] = count
      }
    }

    var network Network
    row := db.QueryRow("SELECT name, accounts, transactions, blockHash, blockNumber, difficulty, hashrate, meanBlockTime, peerCount, protocolVersion, relayFee, version, subVersion, totalAmount FROM network")
    err = row.Scan(&network.Name, &network.Accounts, &network.Transactions, &network.BlockHash, &network.BlockNumber, &network.Difficulty, &network.Hashrate, &network.MeanBlockTime,
      &network.PeerCount, &network.ProtocolVersion, &network.RelayFee, &network.Version, &network.SubVersion, &network.TotalAmount)
    if err != nil { log.Warningf("Error scanning network: %s", err) }

    transactionVolumeSplit := make(map[string]float64)
    var shieldedV, transparentV, totalV float64
    row = db.QueryRow("SELECT SUM(shieldedValue) FROM transactions")
    err = row.Scan(&shieldedV)
    if err != nil { log.Warningf("Error scanning shielded value: %s", err) }
    row = db.QueryRow("SELECT SUM(value) FROM transactions")
    err = row.Scan(&transparentV)
    if err != nil { log.Warningf("Error scanning transparent value: %s", err) }
    totalV = shieldedV + transparentV
    transactionVolumeSplit["total"] = totalV
    transactionVolumeSplit["shielded"] = shieldedV
    transactionVolumeSplit["transparent"] = transparentV
    /* Note: Can a transaction have public inputs, public outputs, and join splits at once? Per protocol spec should be possible. */

    transactionKindSplit := make(map[string]int64)
    var shieldedT, transparentT, totalT int64
    row = db.QueryRow("SELECT COUNT(*) FROM transactions WHERE shielded")
    err = row.Scan(&shieldedT)
    if err != nil { log.Warningf("Error scanning shielded txs: %s", err) }
    row = db.QueryRow("SELECT COUNT(*) FROM transactions WHERE NOT shielded")
    err = row.Scan(&transparentT)
    if err != nil { log.Warningf("Error scanning transparent txs: %s", err) }
    totalT = shieldedT + transparentT
    transactionKindSplit["shielded"] = shieldedT
    transactionKindSplit["transparent"] = transparentT
    transactionKindSplit["total"] = totalT

    shieldedValueSplit := make(map[string]float64)
    rpcr, _ := rpc("gettxoutsetinfo", []interface{} {})
    public := rpcr.(map[string]interface{})["total_amount"].(float64)
    total := network.TotalAmount
    coinbase := float64(0)
    res, err = db.Query("SELECT hash, vout FROM transactions WHERE type = 'minerReward'")
    if err != nil { log.Warningf("Error scanning txns: %s", err) }
    lct := 0
    for {
      if !res.Next() { break }
      if lct % 1000 == 0 {
        log.Debugf("vout scan: at txn number %d", lct)
      }
      lct += 1
      var hash string
      var _vout []byte
      err = res.Scan(&hash, &_vout)
      var vout []interface{}
      json.Unmarshal(_vout, &vout)
      if err != nil { log.Warningf("Error scanning tx: %s", err) }
      length := len(vout)
      for n := 0; n < length; n++ {
        res, _ := rpc("gettxout", []interface{} { hash, n })
        if res == nil { continue }
        coinbase += res.(map[string]interface{})["value"].(float64)
      }
    }
    shieldedValueSplit["public"] = public - coinbase
    shieldedValueSplit["coinbase"] = coinbase
    shieldedValueSplit["shielded"] = total - public

    Min := func(x, y float64) float64 {
      if x < y { return x } else { return y }
    }

    hashStats := make([]map[string]interface{}, 0)
    block := network.BlockNumber
    for num := 0; num < block; num += 100 {
      log.Debugf("Main stats: at block %d", num)
      rpcr, _ = rpc("getnetworkhashps", []interface{} { 100, num })
      totalAmount := float64(0)
      for bn := float64(0); bn <= float64(num); bn++ { totalAmount += Min(12.5, 0.000625 * bn) }
      res, err = db.Query("SELECT shielded, COUNT(*) FROM transactions WHERE blockHeight BETWEEN $1 AND $2 GROUP BY shielded", num - 100, num)
      if err != nil { log.Warningf("Error grouping txns: %s", err) }
      txStats := make(map[string]int)
      txStats["public"] = 0
      txStats["shielded"] = 0
      for {
        if !res.Next() { break }
        var shld bool
        var count int
        err = res.Scan(&shld, &count)
        if err != nil { log.Warningf("Error scanning txns: %s", err) }
        if shld {
          txStats["shielded"] = count
        } else {
          txStats["public"] = count
        }
      }
      timestamp := float64(0)
      row = db.QueryRow("SELECT timestamp FROM blocks WHERE height = $1", num)
      err = row.Scan(&timestamp)
      if err != nil { log.Warningf("Error scanning timestamp: %s", err) }
      hashStats = append(hashStats, map[string]interface{} {
        "block"       : num,
        "timestamp"   : timestamp,
        "hashrate"    : rpcr.(float64),
        "totalSupply" : totalAmount,
        "txStats"     : txStats,
      })
    }

    stats := map[string]interface{} {
      "name": "mainnet",
      "blockMinerSplit": miners,
      "transactionShieldedSplit": shielded,
      "transactionKindSplit": transactionKindSplit,
      "transactionVolumeSplit": transactionVolumeSplit,
      "valueShieldedSplit": shieldedValueSplit,
      "hashrateOverTime" : hashStats,
    }

    bin, _ := json.Marshal(stats)
    rdc.Set(MainStatsKey, bin, 0)

    log.Debugf("Wrote statistics!")
    time.Sleep(3600 * time.Second)

  }
}

func syncNetwork(db *sql.DB) {
  for {
    _info, _ := rpc("getinfo", []interface{}{})
    info := _info.(map[string]interface{})
    _net, _  := rpc("getnetworkinfo", []interface{}{})
    net := _net.(map[string]interface{})
    hash, _ := rpc("getblockhash", []interface{} { info["blocks"] })
    mhps, _ := rpc("getnetworkhashps", []interface{} { 120, -1 })
    blockNum := info["blocks"].(float64)
    totalAmount := float64(0)
    for bn := float64(0); bn <= blockNum; bn++ {
      totalAmount += min(0.000625 * bn, 12.5)
    }
    _, err := db.Exec("UPDATE network SET name = $1, peerCount = $2, blockNumber = $3, blockHash = $4, totalAmount = $5, version = $6, subVersion = $7," +
      "hashrate = $8, protocolVersion = $9, relayFee = $10, difficulty = $11", "mainnet", info["connections"], info["blocks"], hash, totalAmount, info["version"],
      net["subversion"], mhps, info["protocolversion"], info["relayfee"], info["difficulty"])
    if err != nil { log.Warningf("Error writing network info to DB: %s", err) }
    time.Sleep(1 * time.Second)
  }
}

func syncBlock (db *sql.DB, hash string) {

  _block, err := rpc("getblock", []interface{} { hash })
  if err != nil {
    log.Warningf("Backing off 5s on block sync for hash %s", hash)
    time.Sleep(5 * time.Second)
    syncBlock(db, hash)
    return
  }
  block := _block.(map[string]interface{})
  var miner string
  var time int
  if block["previousblockhash"] != nil {
    _prev, _ := rpc("getblock", []interface{} { block["previousblockhash"] })
    prev := _prev.(map[string]interface{})
    time = int(block["time"].(float64) - prev["time"].(float64))
  }

  txns := block["tx"].([]interface{})
  for ind, txhash := range txns {
    _decoded, err := rpc("getrawtransaction", []interface{} { txhash, 1 })
    if _decoded == nil || err != nil {
      log.Warningf("Skipping transaction: %s", txhash)
      continue
    }
    decoded := _decoded.(map[string]interface{})
    if ind == 0 {
      miner = decoded["vout"].([]interface{})[0].(map[string]interface{})["scriptPubKey"].(map[string]interface{})["addresses"].([]interface{})[0].(string)
    }
  }

  log.Debugf("Block height %f", block["height"])

  tx, err := db.Begin()
  if err != nil { log.Warningf("Unable to start tx: %s", err) }

  _, err = tx.Exec("INSERT INTO blocks (hash, mainChain, size, height, transactions, version, merkleRoot, timestamp, time, nonce, solution, bits, difficulty, chainWork, miner, prevHash)" +
    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)", block["hash"], true, block["size"], block["height"], len(txns), block["version"], block["merkleroot"], block["time"],
    time, block["nonce"], block["solution"], block["bits"], block["difficulty"], block["chainwork"], miner, block["previousblockhash"])

  if block["previousblockhash"] != nil {
    _, err := tx.Exec("UPDATE blocks SET nextHash = $1 WHERE hash = $2", block["hash"], block["previousblockhash"])
    if err != nil {
      log.Warningf("Unable to set nextHash: %s", err)
    }
  }

  if block["nextblockhash"] != nil {
    _, err := tx.Exec("UPDATE blocks SET nextHash = $1 WHERE hash = $2", block["nextblockhash"], block["hash"])
    if err != nil {
      log.Warningf("Unable to set nextHash: %s", err)
    }
  }

  if err != nil {
    log.Warningf("Unable to insert into blocks: %s", err)
  }

  for ind, txhash := range txns {
    _decoded, err := rpc("getrawtransaction", []interface{} { txhash, 1 })
    if _decoded == nil || err != nil {
      log.Warningf("Skipping transaction: %s", txhash)
      continue
    }
    decoded := _decoded.(map[string]interface{})
    if ind == 0 {
      miner = decoded["vout"].([]interface{})[0].(map[string]interface{})["scriptPubKey"].(map[string]interface{})["addresses"].([]interface{})[0].(string)
    }
    var _type string
    var _shielded bool
    if len(decoded["vin"].([]interface{})) == 0 {
      _type = "valueTransfer"
      _shielded = true
    } else if decoded["vin"].([]interface{})[0].(map[string]interface{})["coinbase"] != nil {
      _type = "minerReward"
      _shielded = false
    } else {
      _type = "valueTransfer"
      if len(decoded["vjoinsplit"].([]interface{})) == 0 {
        _shielded = false
      } else {
        _shielded = true
      }
    }
    var shieldedValue, shieldedValue2, inputValue, vpubOld, vpubNew, value, fee float64
    value = 0
    shieldedValue = 0
    shieldedValue2 = 0
    fee = 0
    inputValue = 0
    for _, output := range decoded["vout"].([]interface{}) {
      value += output.(map[string]interface{})["value"].(float64)
    }
    for _, joinsplit := range decoded["vjoinsplit"].([]interface{}) {
      oldV  := joinsplit.(map[string]interface{})["vpub_old"].(float64)
      newV  := joinsplit.(map[string]interface{})["vpub_new"].(float64)
      vpubOld += oldV
      vpubNew += newV
      diff := oldV - newV
      if diff > 0 { shieldedValue2 += diff }
      if diff < 0 { inputValue -= diff }
    }
    shieldedValue = vpubOld - vpubNew
    if shieldedValue < 0 { shieldedValue = -shieldedValue }
    txSenders := make([]interface{}, len(decoded["vin"].([]interface{})))
    inputValue2 := float64(0)
    for index, input := range decoded["vin"].([]interface{}) {
      _input := input.(map[string]interface{})
      if _input["txid"] != nil {
        res, _ := rpc("getrawtransaction", []interface{} { _input["txid"], 1 })
        var txn map[string]interface{}
        txn = res.(map[string]interface{})
        if txn == nil || txn["vout"] == nil { continue }
        out_ := txn["vout"].([]interface{})
        index2 := int(_input["vout"].(float64))
        if index2 < len(out_) {
          out := out_[index2]
          _input["retrievedVout"] = out
          inputValue += out.(map[string]interface{})["value"].(float64)
          inputValue2 += out.(map[string]interface{})["value"].(float64)
          txSenders[index] = out.(map[string]interface{})["scriptPubKey"].(map[string]interface{})["addresses"].([]interface{})[0]
        } else {
          log.Warningf("Unable to retrieve vout")
        }
      }
    }
    if _type == "valueTransfer" {
      fee = inputValue - (value + shieldedValue2)
    }
    fee = toFixed(fee, 8)
    outputValue := value
    if inputValue2 > value { value = inputValue2 }
    value = toFixed(value, 8)
    shieldedValue = toFixed(shieldedValue, 8)
    vinj, _ := json.Marshal(decoded["vin"])
    voutj, _ := json.Marshal(decoded["vout"])
    vjoinsplitj, _ := json.Marshal(decoded["vjoinsplit"])
    _, err = tx.Exec("INSERT INTO transactions (hash, fee, type, shielded, index, blockHash, blockHeight, version, lockTime, timestamp, time, vin, vout, vjoinsplit, value, outputValue, shieldedValue) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (hash) DO UPDATE SET blockHash = $6, blockHeight = $7, version = $8, lockTime = $9, timestamp = $10, time = $11", decoded["txid"], fee, _type, _shielded, ind, hash, block["height"], decoded["version"], decoded["locktime"],
      decoded["time"], time, vinj, voutj, vjoinsplitj, value, outputValue, shieldedValue)
    if err != nil {
      log.Warningf("Unable to insert into transactions: %s", err)
    }
    for index, output := range decoded["vout"].([]interface{}) {
      _addr := output.(map[string]interface{})["scriptPubKey"].(map[string]interface{})["addresses"]
      if _addr == nil { continue }
      addr := _addr.([]interface{})[0]
      _, err := tx.Exec("INSERT INTO accounts_recv (transaction, address, index, amount) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", decoded["txid"], addr, index, output.(map[string]interface{})["value"].(float64))
      if err != nil {
        log.Warningf("Unable to insert into account_recv: %s", err)
      }
      _, err = tx.Exec("INSERT INTO accounts_materialized (address, lastSeen) VALUES ($1, $2) ON CONFLICT (address) DO UPDATE SET lastSeen = $2", addr, decoded["time"])
      if err != nil {
        log.Warningf("Unable to insert into accounts_materialized: %s", err)
      }
    }
    for index, input := range decoded["vin"].([]interface{}) {
      _input := input.(map[string]interface{})
      if _input["txid"] != nil {
        res, _ := rpc("getrawtransaction", []interface{} { _input["txid"], 1 })
        var txn map[string]interface{}
        txn = res.(map[string]interface{})
        if txn == nil || txn["vout"] == nil { continue }
        out_ := txn["vout"].([]interface{})
        index2 := int(_input["vout"].(float64))
        if index2 < len(out_) {
          out := out_[index2]
          _input["retrievedVout"] = out
          txSenders[index] = out.(map[string]interface{})["scriptPubKey"].(map[string]interface{})["addresses"].([]interface{})[0]
          _, err := tx.Exec("INSERT INTO accounts_sent (transaction, address, index, amount) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", decoded["txid"], txSenders[index], index, out.(map[string]interface{})["value"].(float64))
          if err != nil {
            log.Warningf("Unable to insert into accounts_sent: %s", err)
          }
        } else {
          log.Warningf("Unable to retrieve vout")
        }
      }
    }
  }

  _, err = tx.Exec("INSERT INTO synced (hash) VALUES ($1)", hash)
  if err != nil {
    log.Warningf("Unable to update synced: %s", hash)
  }

  err = tx.Commit()
  if err != nil {
    log.Fatalf("Unable to commit tx: %s", err)
  }

  log.Debugf("Commit tx hash %s OK", hash)
}

func syncChain (db *sql.DB) {

  log.Debugf("Starting correction sync with zcashd!")

  for {

    _info, _ := rpc("getinfo", []interface{}{})
    info := _info.(map[string]interface{})
    blocks := int(info["blocks"].(float64))

    start := time.Now()

    for num := 0; num <= blocks; num-- {
      if num % 1000 == 0 {
        log.Debugf("Orphan scan: at height %d", num)
      }
      hash, _ := rpc("getblockhash", []interface{} { num })
      res := db.QueryRow("SELECT COUNT(*) FROM blocks WHERE hash != $1 AND height = $2 AND mainChain", hash, num)
      var count int
      err := res.Scan(&count)
      if err != nil {
        log.Warningf("Error scanning blocks: %s", err)
      }
      db.Exec("UPDATE blocks SET mainChain = true WHERE hash = $1", hash)
      if count > 0 {
        log.Debugf("Found %d orphaned blocks at height %d", count, num)
        db.Exec("UPDATE blocks SET mainChain = false WHERE hash != $1 AND height = $2 AND mainChain", hash, num)
        db.Exec("DELETE FROM synced WHERE hash = $1", hash)
      }
      syncBlock(db, hash.(string))
    }

    log.Debugf("Correction sync iterated through entire main chain in %f seconds", time.Now().Sub(start).Seconds())

    time.Sleep(60 * time.Second)

  }

}

func sync(db *sql.DB) {

  log.Debugf("Starting DB sync with zcashd!")

  go syncNetwork(db)

  // Initial sync, by block number.

  go func() {

    _info, _ := rpc("getinfo", []interface{}{})
    info := _info.(map[string]interface{})
    blocks := int(info["blocks"].(float64))

    for num := 0; num < blocks; num++ {
      var count int
      if num % 1000 == 0 {
        log.Debugf("Forward scan: at height %d", num)
      }
      hash, _ := rpc("getblockhash", []interface{} { num })
      res := db.QueryRow("SELECT COUNT(*) FROM synced WHERE hash = $1", hash)
      err := res.Scan(&count)
      if err != nil {
        log.Warningf("Unable to read from blocks: %s", err)
      }
      if count == 0 {
        log.Debugf("Syncing block %d / %s", num, hash)
        syncBlock(db, hash.(string))
      }
    }

    log.Debugf("Initial sync complete, syncing backwards from chain tips")

    go syncChain(db)
    go syncUsageStats(db)
    go syncMainStats(db)

  }()

  // Sync backwards from chain tips.

  for {

    _tips, _ := rpc("getchaintips", []interface{}{})
    tips := _tips.([]interface{})
    hash := tips[0].(map[string]interface{})["hash"].(string)

    var count int
    for {
      res := db.QueryRow("SELECT COUNT(*) FROM synced WHERE hash = $1", hash)
      err := res.Scan(&count)
      if err != nil {
        log.Warningf("Unable to read from blocks: %s", err)
      }
      if count != 0 {
        break
      }
      syncBlock(db, hash)
      _block, _ := rpc("getblock", []interface{} { hash })
      block := _block.(map[string]interface{})
      if block["previousblockhash"] != nil {
        hash = block["previousblockhash"].(string)
      } else {
        break
      }
      time.Sleep(time.Second)
    }
  }
}
