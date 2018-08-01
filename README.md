# mongo-unit
[![CircleCI](https://circleci.com/gh/mikhail-angelov/mongo-unit.svg?style=svg)](https://circleci.com/gh/mikhail-angelov/mongo-unit)


[![NPM](https://nodei.co/npm/mongo-unit.png)](https://nodei.co/npm/mongo-unit)

I was inspired by [dbUnit](http://dbunit.sourceforge.net) library, which is very popular in java world.

This library is done to simplify creation of integration tests for node.js application with Mongo DB.
I starts local mongodb process using [mongodb-prebuilt](https://github.com/winfinit/mongodb-prebuilt) library, 
and it work in "InMemory" mode, which improve performance of your tests.

> There is alternative library for mocking Mongo: [mockgoose](https://github.com/mockgoose/mockgoose)
  
## Requirements
It works on Node.js 4+ (ES2015)

## Installation
`npm install -D mongo-unit`

## API

### `start(opts)`
It starts mongod on one of available port and returns Promise with URL to connect to this db
`opts` is optional params, you can specify some command line params for mongod 
(more about it in documentation for [mongodb-prebuilt](https://github.com/winfinit/mongodb-prebuilt))
 `opts.port` - preferable mongo db port, default: `27017`
 `opts.dbName` - name of test db, default: `test`
 `opts.dbpath` - db path, default: `<node_modules/mongo-unit>\.mongo-unit`
 `opts.verbose` - enable debug informaton for mongodb-prebuilt, default: `false`

### `stop()`
It stops mongod process

### `getUrl()`
Syncronius API returns URL to connect to test db, if test DB is not started it thows an Exception

### `load(data)`
Inserts given data (like below) DB collections, returns Promise.

```json
{
  "collectionName1":[
    {"field1":"value1"},
    {"field2":"value2"}
  ],
  "collectionName2":[
    {"field3":"value3"},
    {"field4":"value4"}
  ]
}
```

### `clean(data)`
Clear collections based on given data (data format is the same), returns Promise.

### `drop()`
Drops test DB, returns Promise.

### `initDb(url, data)`
helper function, load db data into mongo (url)

### `dropDb(url)`
helper function, clear all db data from mongo (url)

### Basic Usage

Code under test
```javascript
const mongoose = require('mongoose')
const Schema = mongoose.Schema

function dao(url) {

  mongoose.connect(url)

  const userSchema = new Schema({
    name:  String
  })
  const taskSchema = new Schema({
    userId: String,
    task:  String
  })

  return {
    User:  mongoose.model('user', userSchema),
    Task:  mongoose.model('task', taskSchema)
  }
}
```
Test data
```json
{
  "users": [
    {
      "_id": "56d9bf92f9be48771d6fe5b1",
      "name": "test"
    },
    {
      "_id": "56d9bf92f9be48771d6fe5b2",
      "name": "John"
    }
  ],
  "tasks": [
    {
      "userId": "56d9bf92f9be48771d6fe5b1",
      "task": "do stuff"
    },
    {
      "userId": "56d9bf92f9be48771d6fe5b1",
      "task": "fix stuff"
    }
  ]
}
```
Mocha test
```javascript
describe('dao', ()=>{
  const mongoUnit = require('../index')
  const testData = require('./fixtures/basic.json')
  var daoUT

  before(() => mongoUnit.start()
    .then(url=>daoUT=dao(url))
    .then(()=>mongoUnit.load(testData)))

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
      .then(user=>daoUT.Task.find({userId: user._id}))
      .then(tasks => {
        expect(tasks.length).to.equal(2)
        expect(tasks[0].task).to.equal('do stuff')
      })
  })
})
```
