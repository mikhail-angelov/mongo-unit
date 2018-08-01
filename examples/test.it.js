const expect = require('chai').expect
const mongoose = require('mongoose')
const mongoUnit = require('../index')
const service = require('./app/service')
const testMongoUrl = process.env.MONGO_URL

describe('service', () => {
  const testData = require('./fixtures/testData.json')
  beforeEach(() => mongoUnit.initDb(testMongoUrl, testData))
  afterEach(() => mongoUnit.drop())

  it('should find all tasks', () => {
    return service.getTasks()
      .then(tasks => {
        expect(tasks.length).to.equal(1)
        expect(tasks[0].name).to.equal('test')
      })
  })

  it('should create new task', () => {
    return service.addTask({ name: 'next', completed: false })
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
    return service.getTasks()
      .then(tasks => tasks[0]._id)
      .then(taskId => service.deleteTask(taskId))
      .then(() => service.getTasks())
      .then(tasks => {
        expect(tasks.length).to.equal(0)
      })
  })
})
