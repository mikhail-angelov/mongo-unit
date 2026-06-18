const expect = require('chai').expect
const mongoUnit = require('../index')
const mongoose = require('mongoose')
const testData = require('./fixtures/testData.json')

let service
mongoUnit.start({ dbName: 'example' })
    .then(() => {
        const baseUrl = mongoUnit.getUrl()
        process.env.MONGO_URL = baseUrl + 'example'
        mongoose.set('strictQuery', false)
        service = require('./app/service')
        return new Promise(resolve => setTimeout(resolve, 500))
    })
    .then(() => {
        run()
    })
    .catch(err => {
        console.error('Test initialization error:', err)
        process.exit(1)
    })

after(async function() {
  this.timeout(10000)
  const client = service.getClient()
  if (client) {
    await client.disconnect()
  }
  await mongoUnit.stop()
})

describe('service', () => {
  beforeEach(() => mongoUnit.initDb(testData))
  afterEach(() => mongoUnit.dropDb())

  it('should find all tasks', () => {
    return service.getTasks().then(tasks => {
      expect(tasks.length).to.equal(1)
      expect(tasks[0].name).to.equal('test')
    })
  })

  it('should create new task', () => {
    return service
      .addTask({ name: 'next', completed: false })
      .then(task => {
        expect(task.name).to.equal('next')
        expect(task.completed).to.equal(false)
      })
      .then(() => service.getTasks())
      .then(tasks => {
        expect(tasks.length).to.equal(2)
        expect(tasks[1].name).to.equal('next')
      })
  })
  it('should remove task', () => {
    return service
      .getTasks()
      .then(tasks => tasks[0]._id)
      .then(taskId => service.deleteTask(taskId))
      .then(() => service.getTasks())
      .then(tasks => {
        expect(tasks.length).to.equal(0)
      })
  })
})
