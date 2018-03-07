job "zchain-zcash" {
  region = "global"
  datacenters = ["dc1"]
  type = "service"
  priority = 50

  update {
    stagger      = "30s"
    max_parallel = 2
  }
 
  group "zchain-zcash-production" {
    count = 1

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-zcash" {
      driver = "docker"
      config {
        image = "lustro/zchain-zcash"
        volumes = ["/root/.zcash:/root/.zcash", "/run/postgresql:/run/postgresql"]
        ssl = true
        network_mode = "host"
      }

      resources {
        cpu = 500
        memory = 8192
        network {
          mbits = 5
          port "rpc" {
            static = 8232
          }
          port "peer" {
            static = 8233
          }
          port "node" {
            static = 18233
          }
        }
      }
    }
  }
} 
