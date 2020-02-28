const { h, app } = hyperapp
const actions = {
  getTasks: value => (state, actions) =>
    getTasks().then(tasks => actions.setTasks(tasks)),
  setTasks: tasks => state => ({ tasks }),
  addTask: value => (state, actions) =>
    addTask(state.newTask).then(() => actions.getTasks()),
  removeTask: taskId => (state, actions) =>
    removeTask(taskId).then(() => actions.getTasks()),
  clearTask: value => state => ({ newTask: {} }),
  newTaskChange: data => state => {
    const change = {}
    change[data.field] = data.value
    return { newTask: Object.assign(state.newTask, change) }
  },
}
const Task = (task, actions) =>
  h('div', { class: 'task' }, [
    h('div', { class: 'id' }, task._id),
    h('div', { class: 'item' }, task.name),
    h('div', { class: 'item' }, new Date(task.started).getDate()),
    h(
      'button',
      { class: 'remove', onclick: () => actions.removeTask(task._id) },
      'remove'
    ),
  ])

const view = (state, actions) => {
  const tasks = state.tasks.map(task => Task(task, actions))
  return h('div', { class: 'main', oncreate: actions.getTasks }, [
    h('div', {}, tasks),
    h('input', {
      id: 'name',
      type: 'text',
      value: state.newTask.name,
      oninput: e =>
        actions.newTaskChange({ field: 'name', value: e.target.value }),
    }),
    h('input', {
      id: 'date',
      type: 'date',
      value: state.newTask.started,
      oninput: e =>
        actions.newTaskChange({ field: 'started', value: e.target.value }),
    }),
    h('button', { id: 'addTask', onclick: () => actions.addTask() }, 'addTask'),
    h(
      'button',
      { id: 'clearTask', onclick: () => actions.clearTask() },
      'clearTask'
    ),
  ])
}

const main = app({ tasks: [], newTask: {} }, actions, view, document.body)

function getTasks() {
  return fetch('/example').then(response => response.json())
}
function addTask(task) {
  return fetch('/example', {
    method: 'POST',
    body: JSON.stringify(task),
    headers: { 'Content-Type': 'application/json' },
  }).then(response => response.json())
}
function removeTask(taskId) {
  return fetch(`/example/${taskId}`, {
    method: 'DELETE',
  })
}
