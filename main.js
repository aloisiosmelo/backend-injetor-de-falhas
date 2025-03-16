const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bp = require("body-parser")
const cors = require('cors')
const functions = require('./functions')

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
server.listen(3030, () => console.log('[info][START_SERVER] Server start at port 3030'))

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not ' +
        'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  }
}));

app.get('/', (req, res) => {
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

wss.on('connection', async (ws) => {
  console.log('[info][WEBSOCKET_CONNECTION] Client connected via WebSocket');

  ws.on('message', async (message) => {
    const req = JSON.parse(message);
    const { error } = await functions.validate(req)
    var networkInterfaceId = req?.networkInterfaceId;

    if (error) {
      ws.send(JSON.stringify({ status: 'error', message: error }));
      return ws.close();
    }

    let serverIsReady = await functions.pingLoop([req?.ip]);

    if(!serverIsReady){
      ws.send(JSON.stringify({ status: 'error', message: 'the server is not responding' }));
      return ws.close();
    }

    if (req?.autoDetectNetworkInterfaceId) {
      let detectHardwareInterfaceIdList = await functions.detectHardwareInterfaceId(req);
      if (detectHardwareInterfaceIdList.length > 0) {
        networkInterfaceId = detectHardwareInterfaceIdList[0];
      } else {
        ws.send(JSON.stringify({ status: 'error', message: 'can not detect hardware interface id' }));
        return ws.close();
      }
    }

    let experimentCount = 0;

    while (experimentCount < parseInt(req.experimentAttempts)) {
      experimentCount++;

      const { timeToFail, timeToRepair } = await functions.generateTimers(req);

      if (!timeToFail && !timeToRepair) {
        ws.send(JSON.stringify({ status: 'error', message: 'cannot generate timers' }));
        return ws.close();
      }

      ws.send(JSON.stringify({
        status: 'ok',
        message: `[${experimentCount}] Time to failure`,
      }));

      ws.send(JSON.stringify({
        status: 'ok',
        message: `[${experimentCount}] ${functions.currentDateTimeFormated(functions.addMinuteToTimestamp(timeToFail,true))}`,
      }));

      let faultInjected = false;
      let repairInjected = false;

      const sshCommandForFault = `sshpass -p '${req.sshPassword}' ssh -tt ${req.sshUsername}@${req.ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at -t ${functions.addMinuteToTimestamp(timeToFail)} <<<"echo ${req.sshPassword} | sudo -S ip link set ${networkInterfaceId} down"'`;
      const sshCommandForRepair = `sshpass -p '${req.sshPassword}' ssh -tt ${req.sshUsername}@${req.ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at -t ${functions.addMinuteToTimestamp(timeToRepair)} <<<"echo ${req.sshPassword} | sudo -S ip link set ${networkInterfaceId} up"'`;
      
      faultInjected = functions.runCommand(sshCommandForFault) ? true : false;
      repairInjected = functions.runCommand(sshCommandForRepair) ? true : false;

      if (faultInjected) {
        ws.send(JSON.stringify({
          status: 'ok',
          message: `[${experimentCount}] Fault injected`,
        }));
      }

      await functions.waitForATime(functions.addMinuteToTimestamp(timeToFail,true));

      for (var i = 0; i < 9; i++) {
        let pingStatus = await functions.pingLoop([req?.ip]);
        ws.send(JSON.stringify({
          status: 'ok',
          message: `[${experimentCount}] ${functions.currentDateTimeFormated(false, true)} ${pingStatus ? 'up' : 'down'}`,
        }));

        await functions.waitForSeconds(5);
      }
      // end fault injection

      ws.send(JSON.stringify({
        status: 'ok',
        message: `[${experimentCount}] Time to repair`,
      }));

      ws.send(JSON.stringify({
        status: 'ok',
        message: `[${experimentCount}] ${functions.currentDateTimeFormated(functions.addMinuteToTimestamp(timeToRepair,true))}`,
      }));

      if (repairInjected) {
        ws.send(JSON.stringify({
          status: 'ok',
          message: `[${experimentCount}] Repair injected`,
        }));
      }

      await functions.waitForATime(functions.addMinuteToTimestamp(timeToRepair,true));

      for (var j = 0; j < 9; j++) {
        let pingStatus = await functions.pingLoop([req?.ip]);
        ws.send(JSON.stringify({
          status: 'ok',
          message: `[${experimentCount}] ${functions.currentDateTimeFormated(false, true)} ${pingStatus ? 'up' : 'down'}`,
        }));

        await functions.waitForSeconds(5);
      }

      console.log(`[${experimentCount}]: Finished inject script`)
    }
    return ws.close();

  });

  // Lidando com desconexões
  ws.on('close', () => {
    console.log('[info][WEBSOCKET_CONNECTION] Client disconnected via WebSocket');
  });
});

app.get('/api/ping/:ip', async (req, res) => {
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
