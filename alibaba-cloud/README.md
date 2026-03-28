# Alibaba Cloud Server

**IP:** 47.251.81.241
**Instance ID:** i-rj988pr6pz2u80g6w182
**Type:** ecs.t6-c1m1.large (2 cores, 2GB)
**Region:** us-west-1
**Status:** Running

## OpenClaw Gateway
- URL: http://47.251.81.241:3001
- Port: 3001
- Service: systemd (auto-restart)

## Config
```json
{
  "gateway": {
    "mode": "local",
    "port": 3001,
    "bind": "lan"
  }
}
```
