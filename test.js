'use strict';

const expect = require('chai').expect
const MongoClient = require('mongodb').MongoClient;

describe('mongo-unit',function(){
	this.timeout(100000)
	const mongoUnit = require('./index')

	const testData = {
		col1:[{doc:1},{doc:2}],
		col2:[{rec:1},{rec:2}]
	}

	it('should start mongo', ()=>{
		return mongoUnit.start()
			.then(url=>{
				expect(url.length > 0).to.equal(true)
			})
			.catch(err=>console.log('err',err))
	})

	it('should conect to db and CRUD docs',()=>{
		return mongoUnit.start()
		.then(url=>MongoClient.connect(url))
		.then(db=>{
			const collection = db.collection('test')

			return collection.insert({doc:1})
			.then(()=>collection.find().toArray())
			.then(results=>{
				expect(results.length).to.equal(1)
				expect(results[0].doc).to.equal(1)	
			})
			.then(()=>collection.remove({doc:1}))
			.then(()=>collection.find().toArray())
			.then(results=>{
				expect(results.length).to.equal(0)
			})
		})
	})
	it('should load collection data',()=>{

		return mongoUnit.load(testData)
		.then(()=>mongoUnit.start())
		.then(url=>MongoClient.connect(url))
		.then(db=>{
			const collection1 = db.collection('col1')
			const collection2 = db.collection('col2')
			return collection1.find().toArray()
			.then(results=>{
				expect(results.length).to.equal(2)
				expect(results[0].doc).to.equal(1)	
			})
			.then(()=>collection2.find().toArray())
			.then(results=>{
				expect(results.length).to.equal(2)
				expect(results[1].rec).to.equal(2)
			})
		})
		.then(()=>mongoUnit.clean(testData))
	})

	it('should clean collection data',()=>{

		return mongoUnit.load(testData)
		.then(()=>mongoUnit.clean(testData))
		.then(()=>mongoUnit.start())
		.then(url=>MongoClient.connect(url))
		.then(db=>{
			const collection1 = db.collection('col1')
			const collection2 = db.collection('col2')
			return collection1.find().toArray()
			.then(results=>{
				expect(results.length).to.equal(0)
			})
			.then(()=>collection2.find().toArray())
			.then(results=>{
				expect(results.length).to.equal(0)
			})
		})
	})

})