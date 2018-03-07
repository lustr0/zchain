job "zchain-api" {
  region = "global"
  datacenters = ["dc1"]
  type = "service"
  priority = 50

  update {
    stagger = "30s"
    max_parallel = 1
  }
 
  group "zchain-api-explorer" {
    count = 2

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-api" {
      driver = "docker"
      config {
        image = "lustro/zchain-api"
        volumes = ["/run/postgresql:/run/postgresql"]
        ssl = true
        port_map {
          "http" = 5050
        }
      }

      env {
        ZCHAIN_COMMAND = "explorer"
        ZCHAIN_SERVER  = "meissa"
      }

      service {
        name = "api-zcha-in"
        tags = ["reverse-proxy"]
        port = "http"
        check {
            name = "alive"
            type = "tcp"
            interval = "10s"
            timeout = "2s"
          }   
      }

      resources {
        cpu = 500
        memory = 1024
        network {
          mbits = 5
          port "http" {}
        }
      }
    }
  }

  group "zchain-api-sync" {
    count = 1

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-api" {
      driver = "docker"
      config {
        image = "lustro/zchain-api"
        volumes = ["/run/postgresql:/run/postgresql"]
        ssl = true
        network_mode = "host"
      }

      env {
        ZCHAIN_COMMAND = "sync"
        ZCHAIN_SERVER  = "meissa"
      }

      resources {
        cpu = 2000
        memory = 2048
        network {
          mbits = 2
        }
      }
    }
  }
} 
