const mongoose = require('mongoose')
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/example'
mongoose.connect(mongoUrl)
const TaskSchema = new mongoose.Schema({
  name: String,
  started: Date,
  completed: Boolean,
})
const Task = mongoose.model('Task', TaskSchema)

module.exports = {
  getTasks: () => Task.find(),
  addTask: data => new Task(data).save(),
  deleteTask: taskId => Task.findByIdAndRemove(taskId)
}
