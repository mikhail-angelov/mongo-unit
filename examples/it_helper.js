const prepare = require('mocha-prepare')
const mongoUnit = require('../index')

prepare(done => mongoUnit.start()
  .then(testMongoUrl => {
    process.env.MONGO_URL = testMongoUrl
    done()
  }))
