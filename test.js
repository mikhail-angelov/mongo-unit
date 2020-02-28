'use strict'

const expect = require('chai').expect
const MongoClient = require('mongodb').MongoClient
const co = require('co')

const DB_NAME = 'test'

describe('mongo-unit', function() {
  this.timeout(10000000)
  const mongoUnit = require('./index')
  const testData = {
    col1: [{ doc: 1 }, { doc: 2 }],
    col2: [{ rec: 1 }, { rec: 2 }],
  }

  before(async () => await mongoUnit.start({ dbName: DB_NAME }))

  after(async () => await mongoUnit.stop())

  afterEach(async () => await mongoUnit.drop())

  it('should safely start mongo several time', async () => {
    const url = await mongoUnit.start()
    // .then(url => {
    console.log(`TEST GOT url=${url}`)
    expect(url).to.equal(mongoUnit.getUrl())
    // })
  })

  it('should connect to db and CRUD docs', () =>
    co(function*() {
      const client = yield MongoClient.connect(mongoUnit.getUrl(), {
        useUnifiedTopology: true,
      })
      const db = client.db(DB_NAME)
      const collection = db.collection('test')
      yield collection.insertOne({ doc: 1 })
      let results = yield collection.find().toArray()
      expect(results.length).to.equal(1)
      expect(results[0].doc).to.equal(1)
      yield collection.removeOne({ doc: 1 })
      results = yield collection.find().toArray()
      expect(results.length).to.equal(0)
      yield client.close()
    }))

  it('should load collection data', () =>
    co(function*() {
      yield mongoUnit.load(testData)
      const client = yield MongoClient.connect(mongoUnit.getUrl(), {
        useUnifiedTopology: true,
      })
      const db = client.db(DB_NAME)
      const collection1 = db.collection('col1')
      const collection2 = db.collection('col2')
      let results = yield collection1.find().toArray()
      expect(results.length).to.equal(2)
      expect(results[0].doc).to.equal(1)
      results = yield collection2.find().toArray()
      expect(results.length).to.equal(2)
      expect(results[1].rec).to.equal(2)
      yield client.close()
    }))

  it('should clean collection data', () =>
    co(function*() {
      yield mongoUnit.load(testData)
      yield mongoUnit.clean(testData)
      const client = yield MongoClient.connect(mongoUnit.getUrl(), {
        useUnifiedTopology: true,
      })
      const db = client.db(DB_NAME)
      const collection1 = db.collection('col1')
      const collection2 = db.collection('col2')
      let results = yield collection1.find().toArray()
      expect(results.length).to.equal(0)
      results = yield collection2.find().toArray()
      expect(results.length).to.equal(0)
      yield client.close()
    }))

  it('should init DB data for given URL', () =>
    co(function*() {
      const url = mongoUnit.getUrl()
      yield mongoUnit.initDb(url, testData)
      const client = yield MongoClient.connect(mongoUnit.getUrl(), {
        useUnifiedTopology: true,
      })
      const db = client.db(DB_NAME)
      const collection1 = db.collection('col1')
      const collection2 = db.collection('col2')
      let results = yield collection1.find().toArray()
      expect(results.length).to.equal(2)
      results = yield collection2.find().toArray()
      expect(results.length).to.equal(2)
      yield client.close()
    }))

  it('should dropDb DB data for given URL', () =>
    co(function*() {
      const url = mongoUnit.getUrl()
      yield mongoUnit.initDb(url, testData)
      yield mongoUnit.dropDb(url)
      const client = yield MongoClient.connect(mongoUnit.getUrl(), {
        useUnifiedTopology: true,
      })
      const db = client.db(DB_NAME)
      const collections = yield db.listCollections().toArray()
      expect(collections.length).to.equal(0)
      yield client.close()
    }))

  //   it('should list mongo',(done)=>{

  //     var ps = require('ps-node');

  // // A simple pid lookup
  // ps.lookup({
  //   psargs:['-A'],
  //   command: 'mongod',
  //   arguments: '.mongo-unit'

  //     }, function(err, resultList ) {
  //       console.log('ps', err, resultList)
  //     if (err) {
  //         throw new Error( err );
  //     }

  //     resultList.forEach(function( process ){
  //         if( process ){

  //             console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
  //         }
  //     });
  //     done()
  // });
  //   })

  it('should stop mongo and start again', () => {
    return mongoUnit
      .stop()
      .then(() => {
        expect(mongoUnit.getUrl).to.throw(Error)
        return mongoUnit.start()
      })
      .then(url => {
        expect('mongodb://localhost:27017/test').to.equal(mongoUnit.getUrl(), {
          useUnifiedTopology: true,
        })
      })
  })
})
