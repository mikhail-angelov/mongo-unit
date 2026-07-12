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
  useReplicaSet: false,
  storageEngine: 'wiredTiger'
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

  let storageEngine;
  if (opts.storageEngine) {
    storageEngine = opts.storageEngine;
  }

  if (opts.useReplicaSet) {
    options.instanceOpts = [
      {
        port: port,
        dbPath: opts.dbpath,
        storageEngine: storageEngine || 'wiredTiger',
      }
    ]

    options.replSet = {
      dbName: opts.dbName,
      storageEngine: storageEngine || 'wiredTiger',
    }

    mongod = await MongoMemoryReplSet.create(options)
    await mongod.waitUntilRunning()
  } else {
    options.instance = {
      port: port,
      dbPath: opts.dbpath,
      dbName: opts.dbName,
      storageEngine: storageEngine || 'wiredTiger',
    }
    mongod = await MongoMemoryServer.create(options)
    await mongod.ensureInstance()
  }
  dbUrl = mongod.getUri()
  client = await MongoClient.connect(dbUrl)
  return dbUrl
}

function start(opts) {
  const mongo_opts = Object.assign(defaultMongoOpts, opts || {})
  if (mongo_opts.verbose) {
    Debug.enable('mongo-unit')
    Debug.enable('*')
  }
  dbName = mongo_opts.dbName;
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
  await client.close()
  await mongod.stop()
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

const ALLOWED_COLLECTION_KEYS = ['indexes', 'documents']

function validateCollectionData(colName, colData) {
  if (!colData || typeof colData !== 'object' || Array.isArray(colData)) {
    return
  }
  const unknownKeys = Object.keys(colData).filter(
    key => !ALLOWED_COLLECTION_KEYS.includes(key)
  )
  if (unknownKeys.length > 0) {
    return new Error(
      `mongo-unit: collection "${colName}" has unknown config field(s): ${unknownKeys
        .map(k => `"${k}"`)
        .join(', ')}. Allowed fields are: ${ALLOWED_COLLECTION_KEYS.map(k => `"${k}"`).join(', ')}.`
    )
  }
  return
}

function createCollectionIndexes(db, colName, colData) {
  const collection = db.collection(colName)
  if (colData && typeof colData === 'object' && !Array.isArray(colData)) {
    const validationError = validateCollectionData(colName, colData)
    if (validationError) {
      return Promise.reject(validationError)
    }
    if (colData.indexes !== undefined) {
      if (!Array.isArray(colData.indexes)) {
        return Promise.reject(
          new Error(
            `mongo-unit: collection "${colName}" has invalid "indexes" field, expected an array.`
          )
        )
      }
      if (colData.indexes.length > 0) {
        return collection.createIndexes(colData.indexes)
      }
    }
  }
  return Promise.resolve()
}

function insertCollectionDocuments(db, colName, colData) {
  const collection = db.collection(colName)
  if (colData && typeof colData === 'object' && !Array.isArray(colData)) {
    if (colData.documents !== undefined) {
      if (!Array.isArray(colData.documents)) {
        return Promise.reject(
          new Error(
            `mongo-unit: collection "${colName}" has invalid "documents" field, expected an array.`
          )
        )
      }
      if (colData.documents.length > 0) {
        return collection.insertMany(colData.documents)
      }
    }
  } else if (Array.isArray(colData) && colData.length > 0) {
    return collection.insertMany(colData)
  }
  return Promise.resolve()
}

function load(data) {
  const db = client.db(dbName)
  const colNames = Object.keys(data)
  return Promise.all(colNames.map(col => createCollectionIndexes(db, col, data[col])))
    .then(() => Promise.all(colNames.map(col => insertCollectionDocuments(db, col, data[col]))))
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
      fs.rmSync(dir, { recursive: true })
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
  const colNames = Object.keys(data)
  return Promise.all(colNames.map(col => createCollectionIndexes(db, col, data[col])))
    .then(() => Promise.all(colNames.map(col => insertCollectionDocuments(db, col, data[col]))))
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
