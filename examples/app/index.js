const express = require('express')
const bodyParser = require('body-parser')
const service = require('./service')
const app = express()
app.use(bodyParser.json())

app.use(express.static(`${__dirname}/static`))
app.get('/example', (req, res) => {
  service.getTasks().then(tasks => res.json(tasks))
})
app.post('/example', (req, res) => {
  service.addTask(req.body).then(data => res.json(data))
})
app.delete('/example/:taskId', (req, res) => {
  service.deleteTask(req.params.taskId).then(data => res.json(data))
})
app.listen(3000, () => console.log('started on port 3000'))