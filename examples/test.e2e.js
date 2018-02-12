const expect = require('chai').expect
const co = require('co')
const mongoUnit = require('../index')
const testMongoUrl = process.env.MONGO_URL
const DATA = require('./fixtures/testData.json')

const ui = {
  task: '.task',
  remove: '.task .remove',
  name: '#name',
  date: '#date',
  addTask: '#addTask'
}
describe('Tasks', () => {

  beforeEach(function () {
    return mongoUnit.initDb(testMongoUrl, DATA)
      .then(() => this.browser.url('http://localhost:3000'))
  })

  afterEach(() => mongoUnit.dropDb(testMongoUrl))

  it('should display list of tasks', function () {
    const browser = this.browser
    return co(function* () {
      const tasks = yield browser.elements(ui.task)
      expect(tasks.length, 1)
    })
  })
  it('should create task', function () {
    const browser = this.browser
    return co(function* () {
      yield browser.element(ui.name).setValue('test')
      yield browser.element(ui.addTask).click()
      const tasks = yield browser.elements(ui.task)
      expect(tasks.length, 2)
    })
  })
  it('should remove task', function () {
    const browser = this.browser
    return co(function* () {
      yield browser.element(ui.remove).click()
      const tasks = yield browser.elements(ui.task)
      expect(tasks.length, 0)
    })
  })
})
