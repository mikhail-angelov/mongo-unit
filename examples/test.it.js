const expect = require('chai').expect
const mongoUnit = require('../index')
const testMongoUrl = process.env.MONGO_URL
const testData = require('./fixtures/testData.json')

let service
mongoUnit.start({ dbName: 'example' }).then(() => {
  process.env.MONGO_URL = mongoUnit.getUrl()
  run() // this line start mocha tests
})

after(async () => {
  const client = service.getClient()
  await client.disconnect()
  await mongoUnit.stop()
})

describe('service', () => {
  before(() => {
    // create it after DB is started
    service = require('./app/service')
  })
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
