# Metrix 📡

> ⚠ systeminformation can expose sensitive information about your hardware

Framework for scheduling and recording [systeminformation](https://www.npmjs.com/package/systeminformation) to TimescaleDB.

Prerequisites:

* PostgreSQL
* TimescaleDB
* Redis

An `.env` file should be created and populated with database credentials and other data. [PM2](https://www.npmjs.com/package/pm2) can be used to manage the processes or they can run in the background:

```
node worker.js &
PORT=8000 node manager.js &
PORT=8001 node scheduler.js &
```

## Manager

Start here to save a new metric with a description. Metrics follow the format `a.b` where `a` is name of systeminformation group and `b` is value within that group.

```
POST http://manager/

{
  "id": "currentLoad.currentLoad",
  "description": "CPU load in %"
}
```

## Scheduler

Then schedule a repeating job (in milliseconds) for that saved metric. If the metric is not first defined in the Manager the schedule cannot be set.

```
POST http://scheduler/

{
  "id": "currentLoad.currentLoad",
  "every": 5000
}
```

## Worker

The worker will pick up any job in the background. It does not have a REST interface.
