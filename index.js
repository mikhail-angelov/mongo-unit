'use strict';

//process.env.DEBUG= '*'
const portfinder = require('portfinder')
const mongodbServer = require('mongodb-prebuilt')
const client = require('mongodb').MongoClient
const fs = require('fs')
const ps = require('ps-node');

const dataFolder = '/.mongo-unit'
const defaultTempDir = __dirname + dataFolder
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
    makeSureTempDirExist(mongo_opts.args.dbpath)
    return makeSureOtherMongoProcessesKilled(mongo_opts.args.dbpath)
      .then(()=>getFreePort(mongo_opts.args.port))
      .then(port => {
        mongo_opts.args.port = port
        if (mongodbServer.start_server(mongo_opts,(err)=>{console.log('mongo start error', err)}) === 0) {
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

function makeSureOtherMongoProcessesKilled(dataFolder){
  return new Promise((resolve, reject)=>{
    ps.lookup({
        psargs:['-A'],
        command: 'mongod',
        arguments: dataFolder
      }, (err, resultList ) => {
        if (err) {
            return reject( err )
        }

        resultList.forEach(process =>{
            if( process ){
                console.log( 'KILL PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments )
                ps.kill(process.pid)
            }
        });
        return resolve()
    })
  })
}

module.exports = {
  start,
  getUrl,
  load,
  clean,
  drop
}