'use strict';

const portfinder = require('portfinder')
const mongodbServer = require('mongodb-prebuilt')
const client = require('mongodb').MongoClient;
const fs = require('fs')

const defaultTempDir = __dirname+'/.mongo-unit'
const defaultMongoOpts = {
	auto_shutdown: true,
	args: {
		storageEngine: "ephemeralForTest",
		dbpath: defaultTempDir,
		port: 27017
	}
}

var dbUrl;

function start(opts){
	if(dbUrl){
		return Promise.resolve(dbUrl)
	}else{
		makeSureTempDirExist(defaultTempDir)
		return getFreePort()
			.then(port=>{
				const mongo_opts = Object.assign(defaultMongoOpts,(opts||{}))
				mongo_opts.args.port = port
				if(mongodbServer.start_server(mongo_opts) === 0){
					dbUrl = 'mongodb://localhost:'+port
					return dbUrl
				}else{
					return Promise.reject('cannot start mongod')
				}
			})
	}
	
}

function load(data) {
	return start()
		.then(url=>client.connect(url))
		.then(db=>{
			const queries = Object.keys(data).map(col=>{
				const collection = db.collection(col)
				return collection.insert(data[col])
			})
			return Promise.all(queries)
		})
}


function clean(data) {
	return start()
		.then(url=>client.connect(url))
		.then(db=>{
			const queries = Object.keys(data).map(col=>{
				const collection = db.collection(col)
				return collection.drop()
			})
			return Promise.all(queries)
		})
}

function getFreePort() {
	portfinder.basePort = 27017
	return new Promise((resolve, reject)=>portfinder.getPort((err, port)=>{
				if(err){
					reject(err)
				}else{
					resolve(port)
				}
			}))
}

function makeSureTempDirExist(dir){
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
	load,
	clean
}