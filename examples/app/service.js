const mongoose = require('mongoose')
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/example'

let client
mongoose.connect(mongoUrl).then((c) => {
  client = c
})
const Task = mongoose.model('tasks', {
  name: String,
  started: Date,
  completed: Boolean,
})

module.exports = {
  getTasks: () => Task.find(),
  addTask: (data) => new Task(data).save(),
  deleteTask: (taskId) => Task.findOneAndDelete({ _id: taskId }),
  getClient: () => client,
}
