'use strict';
const Debug = require('debug')
const portfinder = require('portfinder')
const client = require('mongodb').MongoClient
const fs = require('fs')
const ps = require('ps-node')
const debug = Debug('mongo-unit')

const dataFolder = '/.mongo-unit'
const defaultTempDir = __dirname + dataFolder
const defaultMongoOpts = {
  dbName: 'test',
  dbpath: defaultTempDir,
  port: 27017,
}

var mongodHelper
var dbUrl

function runMogo(opts, port) {
  const MongodHelper = require('mongodb-prebuilt').MongodHelper
  opts.port = port
  mongodHelper = new MongodHelper(['--port', port, '--dbpath', opts.dbpath, '--storageEngine', 'ephemeralForTest']);
  return mongodHelper.run()
    .then(() => {
      dbUrl = 'mongodb://localhost:' + port + '/' + opts.dbName
      debug(`mongo is started on ${dbUrl}`)
      return dbUrl
    })
}

function start(opts) {
  const mongo_opts = Object.assign(defaultMongoOpts, (opts || {}))
  if (mongo_opts.verbose) {
    Debug.enable('mongo-unit')
    Debug.enable('*')
  }
  if (dbUrl) {
    return Promise.resolve(dbUrl)
  } else {
    makeSureTempDirExist(mongo_opts.dbpath)
    return makeSureOtherMongoProcessesKilled(mongo_opts.dbpath)
      .then(() => getFreePort(mongo_opts.port))
      .then(port => runMogo(mongo_opts, port))
  }
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}
function stop() {
  mongodHelper && mongodHelper.mongoBin.childProcess.kill()
  dbUrl = null;
  return delay(100) //this is small delay to make sure kill signal is sent
}

function getUrl() {
  if (dbUrl) {
    return dbUrl
  } else {
    throw new Error('Please start mongo-unit first, then use this API')
  }
}

function load(data) {
  return client.connect(getUrl())
    .then(db => {
      const queries = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.insert(data[col])
      })
      return Promise.all(queries).then(() => db.close())
    })
}

function clean(data) {
  return client.connect(getUrl())
    .then(db => {
      const queries = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.drop()
      })
      return Promise.all(queries).then(() => db.close())
    })
}

function drop() {
  return client.connect(getUrl())
    .then(db => db.dropDatabase().then(() => db.close()))
}

function getFreePort(possiblePort) {
  portfinder.basePort = possiblePort
  return new Promise((resolve, reject) => portfinder.getPort((err, port) => {
    if (err) {
      debug(`cannot get free port: ${err}`)
      reject(err)
    } else {
      resolve(port)
    }
  }))
}

function makeSureTempDirExist(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (e) {
    if (e.code !== "EEXIST") {
      console.log('cannot create db folder', dir, e)
      throw e;
    }
  }
}

function makeSureOtherMongoProcessesKilled(dataFolder) {
  return new Promise((resolve, reject) => {
    ps.lookup({
      psargs: ['-A'],
      command: 'mongod',
      arguments: dataFolder
    }, (err, resultList) => {
      if (err) {
        console.log('ps-node error', err)
        return reject(err)
      }

      resultList.forEach(process => {
        if (process) {
          console.log('KILL PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments)
          ps.kill(process.pid)
        }
      });
      return resolve()
    })
  })
}

function initDb(url, data) {
  return client.connect(url)
    .then(db => {
      const requests = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.insert(data[col])
      })
      return Promise.all(requests)
    })
}

function dropDb(url) {
  return client.connect(url)
    .then(db => db.collections())
    .then(collections => {
      const requests = collections.map(col => col.drop())
      return Promise.all(requests)
    })
}

module.exports = {
  start,
  stop,
  getUrl,
  load,
  clean,
  drop,
  initDb,
  dropDb,
}
