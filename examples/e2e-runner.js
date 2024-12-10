const mongoUnit = require('../index')
const selenium = require('selenium-standalone')
const Hermione = require('hermione')
const hermione = new Hermione('./hermione.conf.js')

const seleniumInstallConfig = {}

exports.URI = '127.0.0.1'
process.env.MARLEY_CHAT_SERVER_PORT = 3005
process.env.NODE_ENV = 'development'
process.env.MARLEY_LOGGER_LEVEL = 'debug'
const hermioneOpts = {
  reporters: ['flat'],
}
// hermioneOpts.grep = /should create Claim/

seleniumInstall()
  .then(() => seleniumStart())
  .then(mongoUnit.start)
  .then((testMongoUrl) => {
    process.env.MONGO_URL = testMongoUrl
    console.log('mongo fake url', testMongoUrl)
  })
  .then(() => {
    const app = require('./app/index.js')
  })
  .then(delay(1000))
  .then(() => hermione.run('', hermioneOpts))
  .then((success) => {
    console.log('e2e tests done', success)
    process.exit(success ? 0 : 1)
  })
  .catch((e) => {
    console.log('e2e test execution error', e)
    process.exit(1)
  })

function seleniumInstall() {
  return new Promise((resolve, reject) => {
    selenium.install(seleniumInstallConfig, (err) => {
      if (err) {
        console.log('selenium intsll error:', err)
        reject(err)
      } else {
        console.log('selenium is intslled')
        resolve()
      }
    })
  })
}

function seleniumStart() {
  return new Promise((resolve, reject) => {
    selenium.start((err, child) => {
      if (err) {
        console.log('selenium start error:', err)
        reject(err)
      } else {
        console.log('selenium is started')
        // child.stderr.on('data', function (data) {
        //   console.log(data.toString())
        // })
        resolve()
      }
    })
  })
}

function delay(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}
