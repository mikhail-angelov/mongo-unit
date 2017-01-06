'use strict';

const portfinder = require('portfinder')
const mongodbServer = require('mongodb-prebuilt')
const client = require('mongodb').MongoClient;
const fs = require('fs')

const defaultTempDir = __dirname + '/.mongo-unit'
const defaultMongoOpts = {
  dbName:'test',
  auto_shutdown: true,
  args: {
    storageEngine: "ephemeralForTest",
    dbpath: defaultTempDir,
    port: 27017
  }
}

var dbUrl

function start(opts) {
  if (dbUrl) {
    return Promise.resolve(dbUrl)
  } else {
    const mongo_opts = Object.assign(defaultMongoOpts, (opts || {}))
    makeSureTempDirExist(defaultTempDir)
    return getFreePort(mongo_opts.args.port)
      .then(port => {
        mongo_opts.args.port = port
        if (mongodbServer.start_server(mongo_opts) === 0) {
          dbUrl = 'mongodb://localhost:' + port+'/'+mongo_opts.dbName
          return dbUrl
        } else {
          return Promise.reject('cannot start mongod')
        }
      })
  }
}

function getUrl() {
  if(dbUrl){
    return dbUrl
  }else{
    throw new Error('Please start mongo-unit firstm then use this API')
  }
}

function load(data) {
  return client.connect(getUrl())
    .then(db => {
      const queries = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.insert(data[col])
      })
      return Promise.all(queries)
    })
}


function clean(data) {
  return client.connect(getUrl())
    .then(db => {
      const queries = Object.keys(data).map(col => {
        const collection = db.collection(col)
        return collection.drop()
      })
      return Promise.all(queries)
    })
}

function drop() {
  return client.connect(getUrl())
    .then(db => db.dropDatabase())
}

function getFreePort(possiblePort) {
  portfinder.basePort = possiblePort
  return new Promise((resolve, reject) => portfinder.getPort((err, port) => {
    if (err) {
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
      throw e;
    }
  }
}

module.exports = {
  start,
  getUrl,
  load,
  clean,
  drop
}