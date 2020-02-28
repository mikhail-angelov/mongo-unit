'use strict'
const Debug = require('debug')
const portfinder = require('portfinder')
const MongoClient = require('mongodb').MongoClient
const { MongoMemoryServer } = require('mongodb-memory-server')
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

let mongod = null
let dbUrl = null
let client
let dbName

function runMongo(opts, port) {
  mongod = new MongoMemoryServer({
    instance: {
      port: port,
      dbPath: opts.dbpath,
      dbName: opts.dbName,
      storageEngine: 'ephemeralForTest',
    },
    binary: {
      version: opts.version,
    },
    autoStart: false,
  })
  return mongod
    .start()
    .then(() => {
      console.log('OK after START...')
      return mongod.getDbName()
    })
    .then(dbName => {
      console.log(`OK got a dbname ${dbName}`)
      dbUrl = 'mongodb://localhost:' + port + '/' + dbName
      debug(`mongo is started on ${dbUrl}`)
      return dbUrl
    })
    .then(url => MongoClient.connect(url, { useUnifiedTopology: true }))
    .then(dbClient => {
      client = dbClient
    })
    .catch(err => console.error(err))
}

function start(opts) {
  const mongo_opts = Object.assign(defaultMongoOpts, opts || {})
  if (mongo_opts.verbose) {
    Debug.enable('mongo-unit')
    Debug.enable('*')
  }
  if (dbUrl) {
    console.log(`got db url already! ${dbUrl}`)
    return Promise.resolve(dbUrl)
  } else {
    makeSureTempDirExist(mongo_opts.dbpath)
    return makeSureOtherMongoProcessesKilled(mongo_opts.dbpath)
      .then(() => getFreePort(mongo_opts.port))
      .then(port => runMongo(mongo_opts, port))
  }
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function stop() {
  return client
    .close(true)
    .then(() => mongod.stop())
    .then(() => {
      // mongodHelper && mongodHelper.mongoBin.childProcess.kill()
      dbUrl = null
      return delay(100) //this is small delay to make sure kill signal is sent
    })
}

function getUrl() {
  if (dbUrl) {
    return dbUrl
  } else {
    throw new Error('Please start mongo-unit first, then use this API')
  }
}

function load(data) {
  const db = client.db(dbName)
  const queries = Object.keys(data).map(col => {
    const collection = db.collection(col)
    return collection.insertMany(data[col])
  })
  return Promise.all(queries)
}

function clean(data) {
  const db = client.db(dbName)
  const queries = Object.keys(data).map(col => {
    const collection = db.collection(col)
    return collection.drop()
  })
  return Promise.all(queries)
}

function drop() {
  return client.db(dbName).dropDatabase()
}

function getFreePort(possiblePort) {
  portfinder.basePort = possiblePort
  return new Promise((resolve, reject) =>
    portfinder.getPort((err, port) => {
      if (err) {
        debug(`cannot get free port: ${err}`)
        reject(err)
      } else {
        resolve(port)
      }
    })
  )
}

function makeSureTempDirExist(dir) {
  try {
    fs.mkdirSync(dir)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      console.log('cannot create db folder', dir, e)
      throw e
    }
  }
}

function makeSureOtherMongoProcessesKilled(dataFolder) {
  return new Promise((resolve, reject) => {
    ps.lookup(
      {
        psargs: ['-A'],
        command: 'mongod',
        arguments: dataFolder,
      },
      (err, resultList) => {
        if (err) {
          console.log('ps-node error', err)
          return reject(err)
        }

        resultList.forEach(process => {
          if (process) {
            console.log(
              'KILL PID: %s, COMMAND: %s, ARGUMENTS: %s',
              process.pid,
              process.command,
              process.arguments
            )
            ps.kill(process.pid)
          }
        })
        return resolve()
      }
    )
  })
}

function initDb(url, data) {
  const db = client.db(dbName)
  const requests = Object.keys(data).map(col => {
    const collection = db.collection(col)
    return collection.insertMany(data[col])
  })
  return Promise.all(requests)
}

function dropDb(url) {
  const db = client.db(dbName)
  return db.collections().then(collections => {
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
