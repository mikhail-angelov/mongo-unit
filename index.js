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
  version: 'latest',
}

var mongodHelper
var dbUrl
var dbUrlShort
var dbName

function runMogo(opts, port) {
  const MongodHelper = require('mongodb-prebuilt').MongodHelper
  opts.port = port
  mongodHelper = new MongodHelper([
    '--port', port, 
    '--dbpath', opts.dbpath, 
    '--storageEngine', 'ephemeralForTest'
  ], {
    version: opts.version,
  });
  return mongodHelper.run()
    .then(() => {
      dbUrl = 'mongodb://localhost:' + port + '/' + opts.dbName
      dbUrlShort = 'mongodb://localhost:' + port
      dbName = opts.dbName
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

function getUrlShort() {
  if (dbUrlShort) {
    return dbUrlShort
  } else {
    throw new Error('Please start mongo-unit first, then use this API')
  }
}

function getDbName() {
  if (dbName) {
    return dbName
  } else {
    throw new Error('Please start mongo-unit first, then use this API')
  }
}

function load(data) {
  return client.connect(getUrlShort())
    .then(client => {
      const db = client.db(getDbName())
      const queries = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.insert(data[col])
      })
      return Promise.all(queries).then(() => client.close())
    })
}

function clean(data) {
  return client.connect(getUrlShort())
    .then(client => {
      const db = client.db(getDbName())
      const queries = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.drop()
      })
      return Promise.all(queries).then(() => client.close())
    })
}

function drop() {
  return client.connect(getUrlShort())
    .then(client => client.db(getDbName()).dropDatabase().then(() => client.close()))
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

/**
 * @deprecated Since version 2.0.0. Use initDb(url, dbName, data) instead.
 */
function initDb(fullUrl, data) {
  console.warn('Using full MongoDB url is deprecate. Separate URL and DB name.')
  const splitUrl = fullUrl.split('/')
  const shortUrl = splitUrl.slice(0, -1).join('/')
  const dbName = splitUrl.slice(-1)[0]
  initDb(shortUrl, dbName, data)
}

function initDb(url, name, data) {
  return client.connect(url)
    .then(client => {
      const db = client.db(name)
      const requests = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.insert(data[col])
      })
      return Promise.all(requests).then(() => client.close())
    })
}

/**
 * @deprecated Since version 2.0.0. Use dropDb(url, dbName) instead.
 */
function dropDb(fullUrl, data) {
  console.warn('Using full MongoDB url is deprecate. Separate URL and DB name.')
  const splitUrl = fullUrl.split('/')
  const shortUrl = splitUrl.slice(0, -1).join('/')
  const dbName = splitUrl.slice(-1)[0]
  dropDb(shortUrl, dbName)
}

function dropDb(url, name) {
  return client.connect(url)
    .then(client => {
      const db = client.db(name)
      return db.collections()
        .then(collections => {
          const requests = collections.map(col => col.drop())
          return Promise.all(requests)
        })
        .then(() => client.close())
    })
}

module.exports = {
  start,
  stop,
  getUrl,
  getUrlShort,
  getDbName,
  load,
  clean,
  drop,
  initDb,
  dropDb,
}
