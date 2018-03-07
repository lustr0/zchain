job "zchain-news" {
  region = "global"
  datacenters = ["dc1"]
  type = "service"
  priority = 50
  update {
    stagger      = "30s"
    max_parallel = 2 
  }
  group "zchain-news" {
    count = 1

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-news" {
      driver = "docker"
      config {
        image = "lustro/zchain-news"
        volumes = ["/run/postgresql:/run/postgresql"]
        ssl = true
        network_mode = "host"
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
