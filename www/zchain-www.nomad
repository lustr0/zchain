job "zchain-www" {
  region = "global"
  datacenters = ["dc1"]
  type = "service"
  priority = 50

  update {
    stagger = "30s"
    max_parallel = 1
  }
 
  group "zchain-www-production" {
    count = 2

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-www" {
      driver = "docker"
      config {
        image = "lustro/zchain-www"
        ssl = true
        port_map {
          "http" = 80
        }
      }

      service {
        name = "explorer-zcha-in"
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
        memory = 256
        network {
          mbits = 5
          port "http" {}
        }
      }
    }
  }

  group "zchain-www-alpha" {
    count = 1

    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }   

    task "zchain-www" {
      driver = "docker"
      config {
        image = "lustro/zchain-www"
        ssl = true
        port_map {
          "http" = 80
        }
      }

      service {
        name = "alpha-zcha-in"
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
        memory = 256
        network {
          mbits = 5
          port "http" {}
        }
      }
    }
  }
} 
