job "proxy" {
	region = "global"

	datacenters = ["dc1"]

  type = "system"

	priority = 50

	constraint {
		attribute = "${attr.kernel.name}"
		value = "linux"
	}

	update {
		stagger = "60s"
		max_parallel = 1
	}
 
	group "proxy" {
		count = 1

		restart {
			attempts = 10
			interval = "5m"
			delay = "25s"
			mode = "delay"
		}

		task "proxy" {
			driver = "docker"

			config {
				image = "lustro/zchain-proxy"
        ssl = true
        network_mode = "host"
				port_map {
					"http" = 80
				}
			}

			service {
				name = "proxy"
        tags = []
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
					mbits = 10
					port "http" {
            static = 80
					}
				}
			}
		}
	}
}
