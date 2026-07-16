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
  const testDataWithIndexes = {
    users: {
      indexes: [
        { key: { email: 1 }, name: 'email_unique_idx', unique: true },
        { key: { name: 1 }, name: 'name_idx' },
      ],
      documents: [{ name: 'Test User', email: 'test@example.com' }],
    },
  }

  before(() => mongoUnit.start({ dbName: DB_NAME }))

  after(() => mongoUnit.stop())

  afterEach(() => mongoUnit.drop())

  it('should safely start mongo several time', () => {
    return mongoUnit.start().then(url => {
      expect(url).to.equal(mongoUnit.getUrl())
    })
  })

  it('should connect to db and CRUD docs', () =>
    co(function*() {
      const client = yield MongoClient.connect(mongoUnit.getUrl())
      const db = client.db(DB_NAME)
      const collection = db.collection('test')
      yield collection.insertOne({ doc: 1 })
      let results = yield collection.find().toArray()
      expect(results.length).to.equal(1)
      expect(results[0].doc).to.equal(1)
      yield collection.deleteMany({ doc: 1 })
      results = yield collection.find().toArray()
      expect(results.length).to.equal(0)
      yield client.close()
    }))

  it('should load collection data', () =>
    co(function*() {
      yield mongoUnit.load(testData)
      const client = yield MongoClient.connect(mongoUnit.getUrl())
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
      const client = yield MongoClient.connect(mongoUnit.getUrl())
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
      yield mongoUnit.initDb(testData)
      const client = yield MongoClient.connect(mongoUnit.getUrl())
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
      yield mongoUnit.initDb(testData)
      yield mongoUnit.dropDb()
      const client = yield MongoClient.connect(mongoUnit.getUrl())
      const db = client.db(DB_NAME)
      const collections = yield db.listCollections().toArray()
      expect(collections.length).to.equal(0)
      yield client.close()
    }))

  it('should create indexes with load function', () =>
    co(function*() {
      yield mongoUnit.load(testDataWithIndexes)
      const client = yield MongoClient.connect(mongoUnit.getUrl())
      const db = client.db(DB_NAME)
      const collection = db.collection('users')
      const indexes = yield collection.listIndexes().toArray()
      const indexNames = indexes.map(idx => idx.name)
      expect(indexNames).to.include('email_unique_idx')
      expect(indexNames).to.include('name_idx')
      const users = yield collection.find().toArray()
      expect(users.length).to.equal(1)
      expect(users[0].name).to.equal('Test User')
      expect(users[0].email).to.equal('test@example.com')
      yield client.close()
    }))

  it('should create indexes with initDb function', () =>
    co(function*() {
      yield mongoUnit.initDb(testDataWithIndexes)
      const client = yield MongoClient.connect(mongoUnit.getUrl())
      const db = client.db(DB_NAME)
      const collection = db.collection('users')
      const indexes = yield collection.listIndexes().toArray()
      const indexNames = indexes.map(idx => idx.name)
      expect(indexNames).to.include('email_unique_idx')
      expect(indexNames).to.include('name_idx')
      yield client.close()
    }))

  it('should enforce unique index during load() itself', () => {
    const dataWithDuplicateUniqueValues = {
      users: {
        indexes: [
          { key: { email: 1 }, name: 'email_unique_idx', unique: true },
        ],
        documents: [
          { name: 'Alice', email: 'duplicate@example.com' },
          { name: 'Bob', email: 'duplicate@example.com' },
        ],
      },
    }
    return mongoUnit.load(dataWithDuplicateUniqueValues).then(
      () => {
        throw new Error(
          'expected mongoUnit.load() to fail for duplicate unique values'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.code).to.equal(11000)
      }
    )
  })

  it('should throw on invalid "indexes" field type', () => {
    const data = {
      users: {
        indexes: 'not-an-array',
        documents: [],
      },
    }
    return mongoUnit.load(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.load() to fail for invalid indexes type'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/indexes/)
      }
    )
  })

  it('should throw on invalid "documents" field type', () => {
    const data = {
      users: {
        indexes: [],
        documents: 'not-an-array',
      },
    }
    return mongoUnit.load(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.load() to fail for invalid documents type'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/documents/)
      }
    )
  })

  it('should throw on invalid collection fixture value type', () => {
    const data = {
      users: 'not-an-array-or-object',
    }
    return mongoUnit.load(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.load() to fail for invalid collection fixture value type'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/invalid fixture value type/i)
        expect(err.message).to.match(/users/)
      }
    )
  })

  it('should throw on invalid "indexes" field type for initDb', () => {
    const data = {
      users: {
        indexes: 'not-an-array',
        documents: [],
      },
    }
    return mongoUnit.initDb(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.initDb() to fail for invalid indexes type'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/indexes/)
      }
    )
  })

  it('should throw on invalid collection fixture value type for initDb', () => {
    const data = {
      users: 'not-an-array-or-object',
    }
    return mongoUnit.initDb(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.initDb() to fail for invalid collection fixture value type'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/invalid fixture value type/i)
        expect(err.message).to.match(/users/)
      }
    )
  })

  it('should throw on unknown collection config fields', () => {
    const data = {
      users: {
        indicies: [],
        document: [],
      },
    }
    return mongoUnit.load(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.load() to fail for unknown collection config fields'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/unknown/i)
        expect(err.message).to.match(/indicies/)
        expect(err.message).to.match(/document/)
      }
    )
  })

  it('should throw on unknown collection config fields for initDb', () => {
    const data = {
      users: {
        indicies: [],
      },
    }
    return mongoUnit.initDb(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.initDb() to fail for unknown collection config fields'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/unknown/i)
        expect(err.message).to.match(/indicies/)
      }
    )
  })

  it('should throw on invalid "documents" field type for initDb', () => {
    const data = {
      users: {
        indexes: [],
        documents: 'not-an-array',
      },
    }
    return mongoUnit.initDb(data).then(
      () => {
        throw new Error(
          'expected mongoUnit.initDb() to fail for invalid documents type'
        )
      },
      err => {
        expect(err).to.exist
        expect(err.message).to.match(/documents/)
      }
    )
  })

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
        expect(true).to.equal(!!mongoUnit.getUrl(), {
          useUnifiedTopology: true,
        })
      })
  })
  it('should work with mongo replica set', async () => {
    await mongoUnit.stop()
    expect(mongoUnit.getUrl).to.throw(Error)
    // test replica set
    await mongoUnit.start({ dbName: DB_NAME, useReplicaSet: true })

    await mongoUnit.load(testData)
    const client = await MongoClient.connect(mongoUnit.getUrl())
    const db = client.db(DB_NAME)
    const collection1 = db.collection('col1')
    let results = await collection1.find().toArray()
    expect(results.length).to.equal(2)
    await client.close()

    //stop replica set
    await mongoUnit.stop()

    //start again
    await mongoUnit.start({ dbName: DB_NAME })
  })
})
