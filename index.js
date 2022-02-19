'use strict'
const Debug = require('debug')
const portfinder = require('portfinder')
const MongoClient = require('mongodb').MongoClient
const { MongoMemoryServer, MongoMemoryReplSet } = require('mongodb-memory-server')
const fs = require('fs')
const ps = require('ps-node')
const debug = Debug('mongo-unit')

const dataFolder = '/.mongo-unit'
const defaultTempDir = __dirname + dataFolder
const defaultMongoOpts = {
  dbName: 'test',
  dbpath: defaultTempDir,
  port: 27017,
  useReplicaSet: false
}

let mongod = null
let dbUrl = null
let client
let dbName

async function runMongo(opts, port) {
  const options = {
    autoStart: false
  }

  if (opts.version) {
    options.binary = { version: opts.version }
  }

  if (opts.useReplicaSet) {
    options.instanceOpts = [
      {
        port: port,
        dbPath: opts.dbpath,
        storageEngine: 'wiredTiger',
      }
    ]

    options.replSet = {
      dbName: opts.dbName,
      storageEngine: 'wiredTiger'
    }

    mongod = await MongoMemoryReplSet.create(options)
    await mongod.waitUntilRunning()
  } else {
    options.instance = {
      port: port,
      dbPath: opts.dbpath,
      dbName: opts.dbName,
      storageEngine: 'ephemeralForTest',
    }
    mongod = await MongoMemoryServer.create(options)
    await mongod.ensureInstance()
  }
  dbUrl = mongod.getUri()
  client = await MongoClient.connect(dbUrl, { useUnifiedTopology: true })
  return dbUrl
}

function start(opts) {
  const mongo_opts = Object.assign(defaultMongoOpts, opts || {})
  if (mongo_opts.verbose) {
    Debug.enable('mongo-unit')
    Debug.enable('*')
  }
  if (dbUrl) {
    return Promise.resolve(dbUrl)
  } else {
    makeSureTempDirExist(mongo_opts.dbpath, mongo_opts.useReplicaSet)
    return makeSureOtherMongoProcessesKilled(mongo_opts.dbpath)
      .then(() => getFreePort(mongo_opts.port))
      .then(port => runMongo(mongo_opts, port))
  }
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

async function stop() {
  await  client.close(true)
  await mongod.stop(true)
  dbUrl = null
  await delay(100) //this is small delay to make sure kill signal is sent
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

function makeSureTempDirExist(dir, useReplicaSet) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, { recursive: true })
    }
    fs.mkdirSync(dir)
  } catch (e) {
    console.log('cannot create db folder', dir, e)
    if (e.code !== 'EEXIST') {
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

function initDb(data) {
  const db = client.db(dbName)
  const requests = Object.keys(data).map(col => {
    const collection = db.collection(col)
    return collection.insertMany(data[col])
  })
  return Promise.all(requests)
}

function dropDb() {
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
