const express = require('express')
const bp = require("body-parser");
const fs = require('fs')
const functions = require('./functions')
const injectors = require('./injectors')
const server = express()

server.use(bp.json());
server.use(bp.urlencoded({ extended: true }));
server.listen(3030)

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
});

server.post('/api/injectors', (req, res) => {
    if (!req?.body?.injectionType) {
      return res.status(400).json({
        status: 'error',
        error: 'injectionType cannot be empty',
      });
    }

    if (req?.body?.injectionType === 'Hardware') {

      const content = [{ message: 'Fault injection hardware...' }]
      const LOG_ID = functions.generateUniqueRandomSequence();
      fs.writeFileSync(`logs/${LOG_ID}.json`, JSON.stringify(content, null, 2), 'utf8');
  
      injectors.hardware(
        req.body.ip,
        req.body.sshPassword,
        req.body.sshUsername,
        LOG_ID
      );
  
      res.status(200).json({
        status: 200,
        data: { log_id: LOG_ID }
      })
    }
});

server.get('/api/injectors/:log_id', function(req, res) {
  if (!req?.params?.log_id) {
    return res.status(400).json({
      status: 'error',
      error: 'log_id cannot be empty',
    });
  }

  const filePath = `logs/${req.params.log_id}.json`;
  const data = fs.readFileSync(filePath, 'utf8');

  res.status(200).json(JSON.parse(data))

});
