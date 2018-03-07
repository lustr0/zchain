package main

import (
  "os"
  "fmt"
  "time"
  "database/sql"
  "encoding/json"

  _ "github.com/lib/pq"

  "gopkg.in/kataras/iris.v6"
  "gopkg.in/kataras/iris.v6/adaptors/httprouter"
  "gopkg.in/redis.v5"

  "github.com/op/go-logging"
)

const (

  InternalError   = "Internal error, try again."
  InvalidKey      = "Invalid authorization. Please double-check your API key."
  InvalidOrigin   = "Invalid origin. Provided API key is not permitted access by the received HTTP origin header."
  AccessDenied    = "Authorization required. Please obtain an API key."
  NotFound        = "Object not found. Please ensure that you have specified an existent key."
  Unavailable     = "Service unavailable. Please wait a minute and try again."
  TooManyRequests = "Too many requests. Please rate-limit your client or contact support."

)

var (

  Server  string
  DB      string
  Command string

  log = logging.MustGetLogger("versioning")

)

func init() {
  Server  = os.Getenv("ZCHAIN_SERVER")
  DB      = os.Getenv("ZCHAIN_DATABASE")
  Command = os.Getenv("ZCHAIN_COMMAND")

  backend := logging.NewLogBackend(os.Stderr, "", 0)
  format  := logging.MustStringFormatter(`%{color}%{time:15:04:05.000} %{shortfunc} ? %{level:.4s} %{id:03x}%{color:reset} %{message}`)
  logging.SetBackend(logging.NewBackendFormatter(backend, format))
}

func TimeStart() time.Time {
  return time.Now()
}

func TimeEnd(c *iris.Context, start time.Time) {
  diff := time.Now().Sub(start).Seconds()
  c.SetHeader("X-Runtime", fmt.Sprintf("%.6f", diff))
  c.SetHeader("X-Served-By", Server)
}

func main() {

  db, err := sql.Open("postgres", PostgresHost)

  if err != nil {
    log.Fatalf("Error connecting to PostgreSQL: %s", err)
  }

  if (Command == "sync") { sync(db) }

  ZcashRPCHost = "http://172.17.0.1:8232"

  rdc := redis.NewClient(&redis.Options{Addr: RedisHost, Password: RedisPass, DB: RedisDB})

  cached := func(key string, f func() interface{}) interface{} {
    cacheKey := "zchain:" + key
    val, err := rdc.Get(cacheKey).Result()
    if err == redis.Nil {
      res := f()
      bin, _ := json.Marshal(res)
      rdc.Set(cacheKey, bin, 10 * time.Second)
      return res
    } else {
      var res interface{}
      json.Unmarshal([]byte(val), &res)
      return res
    }
  }

  api := iris.New(iris.Configuration { Gzip: false })

  api.Adapt(httprouter.New())

  api.UseFunc(func (c *iris.Context) {
    defer func() {
      if err := recover(); err != nil {
        log.Warningf("Recovered from panic in web handler, throwing 500: %v", err)
        c.JSON(iris.StatusInternalServerError, InternalError)
      }
    }()
    c.Next()
  })

  api.UseFunc(func (c *iris.Context) {
    origin := c.RequestHeader("Origin")
    if origin != "" {
      c.SetHeader("Access-Control-Allow-Origin", origin)
    }
    method := c.RequestHeader("Access-Control-Request-Method")
    if method != "" {
      c.SetHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    }
    headers := c.RequestHeader("Access-Control-Request-Headers")
    if headers != "" {
      c.SetHeader("Access-Control-Allow-Headers", headers)
    }
    c.SetHeader("Access-Control-Allow-Credentials", "true")
    c.Next()
  })

  api.Get("/v1/*path", func(c *iris.Context) {
    path    := c.Param("path")
    params  := c.URLParams()
    if len(params) > 0 {
      path += "?"
      num  := 0
      for key, value := range params {
        num  += 1
        path += key + "=" + value
        if len(params) > 1 && num != len(params) {
          path += "&"
        }
      }
    }
    c.Redirect("https://api.zcha.in/v2/" + path)
  })

  v2 := api.Party("/v2/mainnet")

  {

    stats := v2.Party("/stats")

    stats.Get("/mainnet", func(c *iris.Context) {
      val, err := rdc.Get(MainStatsKey).Result()
      if err == redis.Nil {
        c.JSON(iris.StatusInternalServerError, nil)
      } else {
        var res interface{}
        json.Unmarshal([]byte(val), &res)
        c.JSON(iris.StatusOK, res)
      }
    })
    stats.Get("/usage", func(c *iris.Context) {
      start := TimeStart()
      res := cached("stats:usage", func() interface{} {
        res := make(map[string]interface{})
        now := int(time.Now().Unix())
        for name, interval := range map[string]int { "hour": 3600, "day": 86400, "week": 604800, "month": 2592000 } {
          limit := now - interval
          var blocksMined int
          var shieldedTx int
          var fullyShieldedTx int
          var transparentTx int
          var shieldedValue float64
          var transparentValue float64
          row := db.QueryRow("SELECT COUNT(*) FROM transactions WHERE timestamp > $1 AND shielded", limit)
          err := row.Scan(&shieldedTx)
          if err != nil {
            log.Warningf("Error scanning txns: %s", err)
          }
          row = db.QueryRow("SELECT COUNT(*) FROM transactions WHERE timestamp > $1 AND shielded AND jsonb_array_length(vin) = 0 AND jsonb_array_length(vout) = 0", limit)
          err = row.Scan(&fullyShieldedTx)
          if err != nil {
            log.Warningf("Error scanning txns: %s", err)
          }
          row = db.QueryRow("SELECT COUNT(*) FROM transactions WHERE timestamp > $1 AND NOT shielded", limit)
          err = row.Scan(&transparentTx)
          if err != nil {
            log.Warningf("Error scanning txns: %s", err)
          }
          row = db.QueryRow("SELECT COUNT(*) FROM blocks WHERE timestamp > $1 and mainChain", limit)
          err = row.Scan(&blocksMined)
          if err != nil {
            log.Warningf("Error scanning blocks: %s", err)
          }
          row = db.QueryRow("SELECT SUM(value), SUM(shieldedValue) FROM transactions WHERE timestamp > $1", limit)
          err = row.Scan(&transparentValue, &shieldedValue)
          if err != nil {
            log.Warningf("Error scanning txns: %s", err)
          }
          res[name] = map[string]interface{} { "blocksMined": blocksMined, "shieldedTx": shieldedTx, "fullyShieldedTx": fullyShieldedTx, "transparentTx": transparentTx, "shieldedValue": shieldedValue, "transparentValue": transparentValue }
        }
        return res
      })
      TimeEnd(c, start)
      c.JSON(iris.StatusOK, res)
    })
    stats.Get("/miners", func(c *iris.Context) {
      start := TimeStart()
      res := cached("stats:miners", func() interface{} {
        res := make([][]interface{}, 0)
        rws, err := db.Query("SELECT height, miner FROM blocks WHERE mainChain")
        if err != nil {
          log.Warningf("Error scanning blocks: %s", err)
        }
        for {
          if !rws.Next() { break }
          var height int
          var miner string
          rws.Scan(&height, &miner)
          res = append(res, []interface{} { height, miner })
        }
        return res
      })
      TimeEnd(c, start)
      c.JSON(iris.StatusOK, res)
    })

    network := v2.Party("/network")
    network.Get("", func(c *iris.Context) {
      start := TimeStart()
      res := cached("network", func() interface{} {
        var res Network
        row := db.QueryRow("SELECT name, accounts, transactions, blockHash, blockNumber, difficulty, hashrate, meanBlockTime, peerCount, protocolVersion, relayFee, version, subVersion, totalAmount FROM network")
        err := row.Scan(&res.Name, &res.Accounts, &res.Transactions, &res.BlockHash, &res.BlockNumber, &res.Difficulty, &res.Hashrate, &res.MeanBlockTime, &res.PeerCount, &res.ProtocolVersion, &res.RelayFee, &res.Version, &res.SubVersion, &res.TotalAmount)
        if err != nil {
          log.Warningf("Error retrieving network: %s", err)
          return nil
        }
        return res
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })

    blocks := v2.Party("/blocks")
    blocks.Get("", func(c *iris.Context) {
      start := TimeStart()
      sort        := c.URLParam("sort")
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      sortable := map[string]bool { "height": true, "difficulty": true, "timestamp": true, "time": true }
      if sortable[sort] != true {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Invalid sort key specified." })
        return
      }
      if direction != "ascending" && direction != "descending" {
        c.JSON(iris.StatusBadRequest, iris.Map { "error": "Invalid direction specified. Options: ascending, descending." })
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "blocks:" + sort + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        var blks []Block
        rws, err := db.Query("SELECT hash, mainChain, size, height, transactions, version, merkleRoot, timestamp, time, nonce, solution, bits, difficulty, chainWork, miner, prevHash, nextHash FROM blocks WHERE mainChain ORDER BY " + sort + " " + direction + " LIMIT $1 OFFSET $2", limit, offset)
        if err != nil {
          log.Warningf("Failed to scan blocks: %s", err)
          return nil
        }
        var blk Block
        for {
          var nextHash sql.NullString
          var prevHash sql.NullString
          if !rws.Next() { break }
          rws.Scan(&blk.Hash, &blk.MainChain, &blk.Size, &blk.Height, &blk.Transactions, &blk.Version, &blk.MerkleRoot, &blk.Timestamp, &blk.Time, &blk.Nonce, &blk.Solution, &blk.Bits, &blk.Difficulty, &blk.ChainWork, &blk.Miner, &prevHash, &nextHash)
          if nextHash.Valid { blk.NextHash = nextHash.String }
          if prevHash.Valid { blk.PrevHash = prevHash.String }
          blks = append(blks, blk)
        }
        return blks
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    blocks.Get("/:key", func(c *iris.Context) {
      start := TimeStart()
      height, err := c.ParamInt("key")
      hash  := c.Param("key")
      res   := cached("blocks:" + hash, func() interface{} {
        var blk Block
        var row *sql.Row
        if err != nil {
          row = db.QueryRow("SELECT hash, mainChain, size, height, transactions, version, merkleRoot, timestamp, time, nonce, solution, bits, difficulty, chainWork, miner, prevHash, nextHash FROM blocks WHERE hash = $1", hash)
        } else {
          row = db.QueryRow("SELECT hash, mainChain, size, height, transactions, version, merkleRoot, timestamp, time, nonce, solution, bits, difficulty, chainWork, miner, prevHash, nextHash FROM blocks WHERE height = $1", height)
        }
        var nextHash sql.NullString
        var prevHash sql.NullString
        err := row.Scan(&blk.Hash, &blk.MainChain, &blk.Size, &blk.Height, &blk.Transactions, &blk.Version, &blk.MerkleRoot, &blk.Timestamp, &blk.Time, &blk.Nonce, &blk.Solution, &blk.Bits, &blk.Difficulty, &blk.ChainWork, &blk.Miner, &prevHash, &nextHash)
        if nextHash.Valid { blk.NextHash = nextHash.String }
        if prevHash.Valid { blk.PrevHash = prevHash.String }
        if err != nil {
          log.Warningf("Failed to scan block: %s", err)
          return nil
        }
        return blk
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    blocks.Get("/:key/transactions", func(c *iris.Context) {
      start := TimeStart()
      blockHash   := c.Param("key")
      height, herr := c.ParamInt("key")
      sort        := c.URLParam("sort")
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      sortable := map[string]bool { "index" : true }
      if sortable[sort] != true {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Invalid sort key specified." })
        return
      }
      if direction != "ascending" && direction != "descending" {
        c.JSON(iris.StatusBadRequest, iris.Map { "error": "Invalid direction specified. Options: ascending, descending." })
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "blocks:" + blockHash + ":tx:" + sort + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        var txns []Transaction
        var rws *sql.Rows
        if herr != nil {
          rws, err = db.Query("SELECT transactions.hash, mainChain, fee, type, shielded, index, blockHash, blockHeight, transactions.version, lockTime, transactions.timestamp, transactions.time, vin, vout, vjoinsplit, value, outputValue, shieldedValue FROM transactions INNER JOIN blocks ON transactions.blockHash = blocks.hash WHERE blockHash = $1 ORDER BY " + sort + " " + direction + " LIMIT $2 OFFSET $3", blockHash, limit, offset)
        } else {
          rws, err = db.Query("SELECT transactions.hash, mainChain, fee, type, shielded, index, blockHash, blockHeight, transactions.version, lockTime, transactions.timestamp, transactions.time, vin, vout, vjoinsplit, value, outputValue, shieldedValue FROM transactions INNER JOIN blocks ON transactions.blockHash = blocks.hash WHERE blocks.height = $1 ORDER BY " + sort + " " + direction + " LIMIT $2 OFFSET $3", height, limit, offset)
        }
        if err != nil {
          log.Warningf("Failed to scan txns: %s", err)
          return nil
        }
        for {
          if !rws.Next() { break }
          txn := Transaction{}
          vin := make([]byte, 0)
          vout := make([]byte, 0)
          vjs := make([]byte, 0)
          rws.Scan(&txn.Hash, &txn.MainChain, &txn.Fee, &txn.Type, &txn.Shielded, &txn.Index, &txn.BlockHash, &txn.BlockHeight, &txn.Version, &txn.LockTime, &txn.Timestamp, &txn.Time, &vin, &vout, &vjs, &txn.Value, &txn.OutputValue, &txn.ShieldedValue)
          json.Unmarshal(vin, &txn.Vin)
          json.Unmarshal(vout, &txn.Vout)
          json.Unmarshal(vjs, &txn.Vjoinsplit)
          txns = append(txns, txn)
        }
        return txns
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })

    transactions := v2.Party("/transactions")
    transactions.Get("", func(c *iris.Context) {
      start := TimeStart()
      sort        := c.URLParam("sort")
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      sortable := map[string]bool { "blockHeight": true, "value": true, "shieldedValue": true, "timestamp": true }
      if sortable[sort] != true {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Invalid sort key specified." })
        return
      }
      if direction != "ascending" && direction != "descending" {
        c.JSON(iris.StatusBadRequest, iris.Map { "error": "Invalid direction specified. Options: ascending, descending." })
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "transactions:" + sort + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        var txns []Transaction
        rws, err := db.Query("SELECT transactions.hash, mainChain, fee, type, shielded, index, blockHash, blockHeight, transactions.version, lockTime, transactions.timestamp, transactions.time, vin, vout, vjoinsplit, value, outputValue, shieldedValue FROM transactions INNER JOIN blocks ON blocks.hash = transactions.blockHash ORDER BY " + sort + " " + direction + " LIMIT $1 OFFSET $2", limit, offset)
        if err != nil {
          log.Warningf("Failed to scan txns: %s", err)
          return nil
        }
        for {
          if !rws.Next() { break }
          txn := Transaction{}
          vin := make([]byte, 0)
          vout := make([]byte, 0)
          vjs := make([]byte, 0)
          rws.Scan(&txn.Hash, &txn.MainChain, &txn.Fee, &txn.Type, &txn.Shielded, &txn.Index, &txn.BlockHash, &txn.BlockHeight, &txn.Version, &txn.LockTime, &txn.Timestamp, &txn.Time, &vin, &vout, &vjs, &txn.Value, &txn.OutputValue, &txn.ShieldedValue)
          json.Unmarshal(vin, &txn.Vin)
          json.Unmarshal(vout, &txn.Vout)
          json.Unmarshal(vjs, &txn.Vjoinsplit)
          txns = append(txns, txn)
        }
        return txns
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    transactions.Get("/:key", func(c *iris.Context) {
      start := TimeStart()
      hash  := c.Param("key")
      res   := cached("transactions:" + hash, func() interface{} {
        var txn Transaction
        var vin []byte
        var vout []byte
        var vjs []byte
        row := db.QueryRow("SELECT transactions.hash, mainChain, fee, type, shielded, index, blockHash, blockHeight, transactions.version, lockTime, transactions.timestamp, transactions.time, vin, vout, vjoinsplit, value, outputValue, shieldedValue FROM transactions INNER JOIN blocks ON blocks.hash = transactions.blockHash WHERE transactions.hash = $1", hash)
        err := row.Scan(&txn.Hash, &txn.MainChain, &txn.Fee, &txn.Type, &txn.Shielded, &txn.Index, &txn.BlockHash, &txn.BlockHeight, &txn.Version, &txn.LockTime, &txn.Timestamp, &txn.Time, &vin, &vout, &vjs, &txn.Value, &txn.OutputValue, &txn.ShieldedValue)
        json.Unmarshal(vin, &txn.Vin)
        json.Unmarshal(vout, &txn.Vout)
        json.Unmarshal(vjs, &txn.Vjoinsplit)
        if err != nil {
          log.Warningf("Failed to scan txn: %s", err)
          return nil
        }
        return txn
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    transactions.Get("/:key/hex", func(c *iris.Context) {
      start := TimeStart()
      hash  := c.Param("key")
      res   := cached("transactions:hex:" + hash, func() interface{} {
        res, err := rpc("getrawtransaction", []interface{} { hash, 0 })
        if err != nil {
          return nil
        } else {
          return res
        }
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.SetStatusCode(iris.StatusOK)
        c.Write([]byte(res.(string)))
      }
    })
    transactions.Post("/broadcast", func(c *iris.Context) {
      start := TimeStart()
      var raw string
      c.ReadJSON(&raw)
      res, err := rpc("sendrawtransaction", []interface{} { raw })
      TimeEnd(c, start)
      if err != nil {
        c.JSON(iris.StatusBadRequest, map[string]interface{} { "result": nil, "error": err.Error() })
      } else {
        c.JSON(iris.StatusCreated, map[string]interface{} { "result": res, "error": nil })
      }
    })
    transactions.Post("/decode", func(c *iris.Context) {
      start := TimeStart()
      var raw string
      c.ReadJSON(&raw)
      res, err := rpc("decoderawtransaction", []interface{} { raw })
      TimeEnd(c, start)
      if err != nil {
        c.JSON(iris.StatusBadRequest, map[string]interface{} { "result": nil, "error": err.Error() })
      } else {
        c.JSON(iris.StatusOK, map[string]interface{} { "result": res, "error": nil })
      }
    })

    accounts := v2.Party("/accounts")
    accounts.Get("", func(c *iris.Context) {
      start := TimeStart()
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      if direction != "ascending" && direction != "descending" {
        c.JSON(iris.StatusBadRequest, iris.Map { "error": "Invalid direction specified. Options: ascending, descending." })
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "accounts:" + "lastSeen" + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        var accs []Account
        rws, err := db.Query("SELECT address FROM accounts_materialized ORDER BY lastSeen " + direction + " LIMIT $1 OFFSET $2", limit, offset)
        if err != nil {
          log.Warningf("Failed to scan accounts materialized: %s", err)
          return nil
        }
        for {
          var acc Account
          var addr string
          if !rws.Next() { break }
          rws.Scan(&addr)
          row := db.QueryRow("SELECT address, firstSeen, lastSeen, sentCount, recvCount FROM accounts WHERE address = $1", addr)
          err = row.Scan(&acc.Address, &acc.FirstSeen, &acc.LastSeen, &acc.SentCount, &acc.RecvCount)
          if err != nil {
            log.Warningf("Failed to scan accounts: %s", err)
            return nil
          }
          accs = append(accs, acc)
        }
        return accs
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    accounts.Get("/:key", func(c *iris.Context) {
      start := TimeStart()
      addr  := c.Param("key")
      res   := cached("accounts:" + addr, func() interface{} {
        var acc Account
        row := db.QueryRow("SELECT address, firstSeen, lastSeen, minedCount, sentCount, totalSent, recvCount, totalRecv, balance FROM accounts WHERE address = $1", addr)
        err := row.Scan(&acc.Address, &acc.FirstSeen, &acc.LastSeen, &acc.MinedCount, &acc.SentCount, &acc.TotalSent, &acc.RecvCount, &acc.TotalRecv, &acc.Balance)
        if err != nil {
          log.Warningf("Failed to scan txn: %s", err)
          return nil
        }
        return acc
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    accounts.Get("/:key/sent", func(c *iris.Context) {
      start := TimeStart()
      addr  := c.Param("key")
      sort        := c.URLParam("sort")
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      sortable := map[string]bool { "blockHeight": true, "value": true, "shieldedValue": true, "timestamp": true }
      if sortable[sort] != true {
        sort = "timestamp"
      }
      if direction != "ascending" && direction != "descending" {
        direction = "descending"
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "accounts:" + addr + ":sent:" + sort + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        txns := make([]Transaction, 0)
        rws, err := db.Query("SELECT transactions.hash, mainChain, fee, type, shielded, transactions.index, blockHash, blockHeight, transactions.version, lockTime, transactions.timestamp, transactions.time, vin, vout, vjoinsplit, value, outputValue, shieldedValue FROM transactions INNER JOIN accounts_sent ON transactions.hash = accounts_sent.transaction INNER JOIN blocks ON blocks.hash = transactions.blockHash WHERE accounts_sent.address = $1 ORDER BY " + sort + " " + direction + " LIMIT $2 OFFSET $3", addr, limit, offset)
        if err != nil {
          log.Warningf("Failed to scan txns: %s", err)
          return nil
        }
        for {
          if !rws.Next() { break }
          txn := Transaction{}
          vin := make([]byte, 0)
          vout := make([]byte, 0)
          vjs := make([]byte, 0)
          rws.Scan(&txn.Hash, &txn.MainChain, &txn.Fee, &txn.Type, &txn.Shielded, &txn.Index, &txn.BlockHash, &txn.BlockHeight, &txn.Version, &txn.LockTime, &txn.Timestamp, &txn.Time, &vin, &vout, &vjs, &txn.Value, &txn.OutputValue, &txn.ShieldedValue)
          json.Unmarshal(vin, &txn.Vin)
          json.Unmarshal(vout, &txn.Vout)
          json.Unmarshal(vjs, &txn.Vjoinsplit)
          txns = append(txns, txn)
        }
        return txns
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })
    accounts.Get("/:key/recv", func(c *iris.Context) {
      start := TimeStart()
      addr  := c.Param("key")
      sort        := c.URLParam("sort")
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      sortable := map[string]bool { "blockHeight": true, "value": true, "shieldedValue": true, "timestamp": true }
      if sortable[sort] != true {
        sort = "timestamp"
      }
      if direction != "ascending" && direction != "descending" {
        direction = "descending"
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "accounts:" + addr + ":recv:" + sort + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        txns := make([]Transaction, 0)
        rws, err := db.Query("SELECT transactions.hash, mainChain, fee, type, shielded, transactions.index, blockHash, blockHeight, transactions.version, lockTime, transactions.timestamp, transactions.time, vin, vout, vjoinsplit, value, outputValue, shieldedValue FROM transactions INNER JOIN accounts_recv ON transactions.hash = accounts_recv.transaction INNER JOIN blocks ON blocks.hash = transactions.blockHash WHERE accounts_recv.address = $1 ORDER BY " + sort + " " + direction + " LIMIT $2 OFFSET $3", addr, limit, offset)
        if err != nil {
          log.Warningf("Failed to scan txns: %s", err)
          return nil
        }
        for {
          if !rws.Next() { break }
          txn := Transaction{}
          vin := make([]byte, 0)
          vout := make([]byte, 0)
          vjs := make([]byte, 0)
          rws.Scan(&txn.Hash, &txn.MainChain, &txn.Fee, &txn.Type, &txn.Shielded, &txn.Index, &txn.BlockHash, &txn.BlockHeight, &txn.Version, &txn.LockTime, &txn.Timestamp, &txn.Time, &vin, &vout, &vjs, &txn.Value, &txn.OutputValue, &txn.ShieldedValue)
          json.Unmarshal(vin, &txn.Vin)
          json.Unmarshal(vout, &txn.Vout)
          json.Unmarshal(vjs, &txn.Vjoinsplit)
          txns = append(txns, txn)
        }
        return txns
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })

    news := v2.Party("/news")
    news.Get("", func(c *iris.Context) {
      start := TimeStart()
      sort        := c.URLParam("sort")
      direction   := c.URLParam("direction")
      limit, err  := c.URLParamInt("limit")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"limit\" must be specified." })
        return
      }
      offset, err := c.URLParamInt("offset")
      if err != nil {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Valid integer parameter \"offset\" must be specified." })
        return
      }
      if limit > 20 {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Maximum single-request limit: 20. Please paginate your requests." })
        return
      }
      sortable := map[string]bool { "timestamp": true }
      if sortable[sort] != true {
        c.JSON(iris.StatusBadRequest, iris.Map { "error" : "Invalid sort key specified." })
        return
      }
      if direction != "ascending" && direction != "descending" {
        c.JSON(iris.StatusBadRequest, iris.Map { "error": "Invalid direction specified. Options: ascending, descending." })
      }
      if direction == "ascending" { direction = "ASC" } else { direction = "DESC" }
      cacheKey := "news:" + sort + ":" + direction + ":" + string(limit) + ":" + string(offset)
      res := cached(cacheKey, func() interface{} {
        var news []News
        rws, err := db.Query("SELECT author, description, title, link, source, timestamp FROM news ORDER BY " + sort + " " + direction + " LIMIT $1 OFFSET $2", limit, offset)
        if err != nil {
          log.Warningf("Failed to scan news: %s", err)
          return nil
        }
        var item News
        for {
          if !rws.Next() { break }
          rws.Scan(&item.Author, &item.Description, &item.Title, &item.Link, &item.Source, &item.Timestamp)
          news = append(news, item)
        }
        return news
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })

    nodes := v2.Party("/nodes")
    nodes.Get("", func(c *iris.Context) {
      start := TimeStart()
      res := cached("nodes", func() interface{} {
        nodes := make([]Node, 0)
        rws, err := db.Query("SELECT ip, port, first_seen, last_seen, version, blocks, latitude, longitude, city, country, hostname, region, organization FROM nodes")
        if err != nil {
          log.Warningf("Error scanning nodes: %s", err)
          return nil
        }
        for {
          if !rws.Next() { break }
          var node Node
          var version sql.NullString
          var city sql.NullString
          var country sql.NullString
          var hostname sql.NullString
          var region sql.NullString
          var organization sql.NullString
          var blocks sql.NullInt64
          var port sql.NullInt64
          rws.Scan(&node.IP, &port, &node.FirstSeen, &node.LastSeen, &version, &blocks, &node.Latitude, &node.Longitude, &city, &country, &hostname, &region, &organization)
          if port.Valid { node.Port = port.Int64 }
          if blocks.Valid { node.Blocks = blocks.Int64 }
          if version.Valid { node.Version = version.String }
          if city.Valid { node.City = city.String }
          if country.Valid { node.Country = country.String }
          if hostname.Valid { node.Hostname = hostname.String }
          if region.Valid { node.Region = region.String }
          if organization.Valid { node.Organization = organization.String }
          nodes = append(nodes, node)
        }
        return nodes
      })
      TimeEnd(c, start)
      if res == nil {
        c.JSON(iris.StatusNotFound, nil)
      } else {
        c.JSON(iris.StatusOK, res)
      }
    })

    nodes.Post("/add", func(c *iris.Context) {
      ip := c.URLParam("ip")
      start := TimeStart()
      res, err := rpc("addnode", []interface{} { ip, "onetry" })
      TimeEnd(c, start)
      c.JSON(iris.StatusCreated, map[string]interface{} { "result": res, "error": err, "ip": ip })
    })

    tips := v2.Party("/tips")
    tips.Get("", func(c *iris.Context) {
      start := TimeStart()
      res, err := rdc.Get("zchain:tips").Result()
      if err != nil {
        log.Warningf("Error getting chain tips: %s", err)
      }
      TimeEnd(c, start)
      c.JSON(iris.StatusOK, res)
    })

  }

  api.Listen("0.0.0.0:5050")

}
