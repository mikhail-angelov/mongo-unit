# mongo-unit

This library is done to simplify creation of integration tests for node.js application with Mongo DB.
I starts local mongodb process using [mongodb-prebuilt](https://github.com/winfinit/mongodb-prebuilt) library, 
and it work in "InMemory" mode, which improve performance of your tests.

### How to use it

Since running embedded mongo takes some time, we need to config `mocha` to wait until mongo is up and running, the easiest way to do it add `--delay` flag for `mocha` and handle async flow, like this

```
//package.json
...
"scripts": {
        ...
        "test": "mocha ./**/*.spec.js --delay",
        ...
    },
...
```

add init.spec.js

```javascript
//init.spec.js
const mongoUnit = require('mongo-unit')

mongoUnit.start().then(() => {
  console.log('fake mongo is started: ', mongoUnit.getUrl())
  process.env.DATABASE_URL = mongoUnit.getUrl() // this var process.env.DATABASE_URL = will keep link to fake mongo
  run() // this line start mocha tests
})

after(() => {
  const dao = require('./dao')
  console.log('stop')
  dao.close()
  return mongoUnit.stop()
})
```

Code under test
```javascript
//dao.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: String,
})
const taskSchema = new mongoose.Schema({
  userId: String,
  task: String,
})

module.exports = {
  init: () => mongoose.connect(process.env.DATABASE_URL),
  close: () => mongoose.disconnect(),
  User: mongoose.model('user', userSchema),
  Task: mongoose.model('task', taskSchema),
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
//dao.spec.js
const {expect} = require('chai')
const mongoUnit = require('mongo-unit')
const testData = require('./data.json')
const daoUT = require('./dao')
describe('dao', ()=>{
  
    before(() => daoUT.init())
    beforeEach(() => mongoUnit.load(testData))
    afterEach(() => mongoUnit.drop())
  
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

## General info
[![CircleCI](https://circleci.com/gh/mikhail-angelov/mongo-unit.svg?style=svg)](https://circleci.com/gh/mikhail-angelov/mongo-unit)

I was inspired by [dbUnit](http://dbunit.sourceforge.net) library, which is very popular in java world.

> There is alternative library for mocking Mongo: [mockgoose](https://github.com/mockgoose/mockgoose)
  
## Requirements
It works on Node.js 8+

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


