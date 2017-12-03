'use strict';

const expect = require('chai').expect
const MongoClient = require('mongodb').MongoClient

describe('mongo-unit', function () {
  this.timeout(100000)
  const mongoUnit = require('./index')
  const testData = {
    col1: [{doc: 1}, {doc: 2}],
    col2: [{rec: 1}, {rec: 2}]
  }


  before(() => mongoUnit.start({verbose:false}))

  afterEach(() => mongoUnit.drop())

  it('should safely start mongo several time', () => {
    return mongoUnit.start()
      .then(url => {
        expect(url).to.equal(mongoUnit.getUrl())
      })
  })

  it('should connect to db and CRUD docs', () => {
    return MongoClient.connect(mongoUnit.getUrl())
      .then(db => {
        const collection = db.collection('test')

        return collection.insert({doc: 1})
          .then(() => collection.find().toArray())
          .then(results => {
            expect(results.length).to.equal(1)
            expect(results[0].doc).to.equal(1)
          })
          .then(() => collection.remove({doc: 1}))
          .then(() => collection.find().toArray())
          .then(results => {
            expect(results.length).to.equal(0)
          })
      })
  })

  it('should load collection data', () => {
    return mongoUnit.load(testData)
      .then(() => MongoClient.connect(mongoUnit.getUrl()))
      .then(db => {
        const collection1 = db.collection('col1')
        const collection2 = db.collection('col2')
        return collection1.find().toArray()
          .then(results => {
            expect(results.length).to.equal(2)
            expect(results[0].doc).to.equal(1)
          })
          .then(() => collection2.find().toArray())
          .then(results => {
            expect(results.length).to.equal(2)
            expect(results[1].rec).to.equal(2)
          })
      })
  })

  it('should clean collection data', () => {
    return mongoUnit.load(testData)
      .then(() => mongoUnit.clean(testData))
      .then(() => MongoClient.connect(mongoUnit.getUrl()))
      .then(db => {
        const collection1 = db.collection('col1')
        const collection2 = db.collection('col2')
        return collection1.find().toArray()
          .then(results => {
            expect(results.length).to.equal(0)
          })
          .then(() => collection2.find().toArray())
          .then(results => {
            expect(results.length).to.equal(0)
          })
      })
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

})