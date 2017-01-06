"use strict";

const expect = require('chai').expect
const mongoose = require('mongoose')
const Schema = mongoose.Schema

function dao(url) {

  mongoose.connect(url)

  const userSchema = new Schema({
    name: String
  })
  const taskSchema = new Schema({
    userId: String,
    task: String
  })

  return {
    User: mongoose.model('user', userSchema),
    Task: mongoose.model('task', taskSchema)
  }
}

//test
describe('dao', () => {
  const mongoUnit = require('../index')
  const testData = require('./fixtures/basic.json')
  var daoUT

  before(() => mongoUnit.start()
    .then(url => daoUT = dao(url))
    .then(() => mongoUnit.load(testData)))

  after(() => mongoUnit.drop())

  it('should find all users', () => {
    return daoUT.User.find()
      .then(users => {
        expect(users.length).to.equal(2)
        expect(users[0].name).to.equal('test')
      })
  })

  it('should find all tasks for user 1', () => {
    return daoUT.User.find()
      .then(users => users[0])
      .then(user => daoUT.Task.find({userId: user._id}))
      .then(tasks => {
        expect(tasks.length).to.equal(2)
        expect(tasks[0].task).to.equal('do stuff')
      })
  })
})