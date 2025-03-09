const express = require('express')
const bp = require("body-parser")
const fs = require('fs')
const cors = require('cors')
const functions = require('./functions')
const injectors = require('./injectors')
const server = express()
const R = require('r-integration');

const allowedOrigins = ['http://localhost:3000'];

server.use(bp.json())
server.use(bp.urlencoded({ extended: true }))
server.listen(3030)

server.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if (!origin) return callback(null, true); if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not ' +
        'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    } 
    
    return callback(null, true);
  }
}));

console.log('[info][START_SERVER] Server start at port 3030')

server.get('/', (req, res) => {
  if (!req?.body?.name) {
    return res.status(400).json({
      status: 'error',
      error: 'req body cannot be empty',
    });
  }
  res.status(200).json({
    status: 'success',
    data: req.body,
  });
})

server.post('/api/injectors', async (req, res) => {
  if (!req?.body?.injectionType) {
    return res.status(400).json({
      status: 'error',
      error: 'injectionType cannot be empty',
    });
  }

  if (req?.body?.timeToFail <= 0) {
    return res.status(400).json({
      status: 'error',
      error: 'timeToFail cannot be less than or equal to zero',
    });
  }

  if (req?.body?.timeToRepair <= 0) {
    return res.status(400).json({
      status: 'error',
      error: 'timeToRepair cannot be less than or equal to zero',
    });
  }

  if (!req?.body?.autoDetectNetworkInterfaceId && (req?.body?.networkInterfaceId == '' || req?.body?.networkInterfaceId == undefined || req?.body?.networkInterfaceId == null)) {
    return res.status(400).json({
      status: 'error',
      error: 'networkInterfaceId cannot be empty',
    });
  }

  let networkInterfaceIds = [req?.body?.networkInterfaceId];

  if (req?.body?.autoDetectNetworkInterfaceId) {
    console.log('[info][START_SERVER] Trying to detect network interfaces')
    let interfaceIndentifierResp = await functions.autoDetectNetworkInterfaceNames(req?.body?.sshUsername, req?.body?.sshPassword, req?.body?.ip);
    if (interfaceIndentifierResp.status === 'success') {
      networkInterfaceIds = interfaceIndentifierResp.data;
    } else {
      return res.status(500).json({
        status: 'error',
        error: 'failure to detect network interface',
      });
    }
  }

  if (req?.body?.injectionType === 'Hardware') {

    const timeToFailRate = 1 / parseInt(req.body.timeToFail);
    const timeToRepairRate = 1 / parseInt(req.body.timeToRepair);

    let experimentCount = 0;

    while (experimentCount < req.body.experimentAttempts) {
      experimentCount++;

      let expFailHW = R.executeRCommand(`rexp(1, rate=${timeToFailRate})`);
      let expRepairHW = R.executeRCommand(`rexp(1, rate=${timeToRepairRate})`);

      let TIMER_TO_FAIL = parseFloat(expFailHW[0]).toFixed(2);
      let TIMER_TO_REPAIR = parseInt(expRepairHW[0]).toFixed(2);

      if (isNaN(TIMER_TO_FAIL) || isNaN(TIMER_TO_REPAIR) || !TIMER_TO_FAIL || !TIMER_TO_REPAIR) {
        functions.logMessage(`(${experimentCount}) Invalid time. Details: TIME=${TIMER_TO_FAIL} TIMER_TO_REPAIR=${TIMER_TO_REPAIR}`, 'ERROR', 'TIMER_TO_REPAIR_GEN_PARSE');
        continue;
      }

      let TIME_TO_FAIL = functions.addMinuteToTimestamp(TIMER_TO_FAIL)
      let TIME_TO_REPAIR = functions.addMinuteToTimestamp(TIMER_TO_REPAIR)

      res.status(200).json({
        status: 200,
        data: {
          time_to_fail: functions.addMinuteToTimestamp(TIMER_TO_FAIL,true),
          time_to_repair: functions.addMinuteToTimestamp(TIMER_TO_REPAIR, true),
          experiment_count: experimentCount
        }
      })

      networkInterfaceIds.map((networkInterfaceId) =>
        injectors.hardware(
          req.body.ip,
          req.body.sshPassword,
          req.body.sshUsername,
          TIME_TO_FAIL,
          TIME_TO_REPAIR,
          networkInterfaceId,
        )
      );

    }
  }
})

server.get('/api/injectors/:log_id', function (req, res) {
  if (!req?.params?.log_id) {
    return res.status(400).json({
      status: 'error',
      error: 'log_id cannot be empty',
    });
  }

  const filePath = `logs/${req.params.log_id}.json`;
  const data = fs.readFileSync(filePath, 'utf8');

  res.status(200).json(JSON.parse(data))

})

server.get('/api/ping/:ip', async (req, res) => {
  if (!req?.params?.ip) {
    return res.status(400).json({
      status: 'error',
      error: 'ip cannot be empty',
    });
  }

  const status = await functions.pingLoop([req?.params?.ip]);

  res.status(200).json({
    status: 200,
    server_status: status
  })

})
