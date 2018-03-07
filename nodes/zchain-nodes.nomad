job "zchain-nodes" {
  region = "global"
  datacenters = ["dc1"]
  type = "service"
  priority = 50
  update {
    stagger      = "30s"
    max_parallel = 2 
  }
  group "zchain-nodes" {
    count = 1

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-nodes" {
      driver = "docker"
      config {
        image = "lustro/zchain-nodes"
        volumes = ["/root/.zcash:/root/.zcash", "/run/postgresql:/run/postgresql"]
        ssl = true
      }

      resources {
        cpu = 200
        memory = 128
        network {
          mbits = 1
        }
      }
    }
  }
}
