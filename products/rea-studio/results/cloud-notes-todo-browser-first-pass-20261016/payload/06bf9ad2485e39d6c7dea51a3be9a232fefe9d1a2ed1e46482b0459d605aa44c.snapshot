// Newly written source-assisted subset. Original helper code is test-only.
const maximumTimestamp = 8.64e15;
export function todoTimestamp(value, name = 'To-do date') {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximumTimestamp) throw new Error(`${name} must be an exact non-negative supported millisecond timestamp.`);
  return value;
}
export function todoState(note) {
  if (note.todo !== undefined) {
    const value = note.todo;
    if (!value || typeof value !== 'object' || typeof value.isTodo !== 'boolean') throw new Error('Saved to-do state is invalid.');
    return { isTodo: value.isTodo, due: todoTimestamp(value.due), completed: todoTimestamp(value.completed) };
  }
  const props = note.joplin?.props ?? {};
  return { isTodo: Number(props.is_todo ?? 0) === 1, due: todoTimestamp(Number(props.todo_due ?? 0)), completed: todoTimestamp(Number(props.todo_completed ?? 0)) };
}
export function changeTodo(note, request, now) {
  const before = todoState(note);
  let after;
  if (request.action === 'todo-type') {
    if (!['note', 'todo'].includes(request.type)) throw new Error('Choose note or todo as the note type.');
    const isTodo = request.type === 'todo';
    after = before.isTodo === isTodo ? before : { isTodo, due: 0, completed: 0 };
  } else if (request.action === 'todo-completed') {
    if (!before.isTodo) throw new Error('Convert this note to a to-do before completing it.');
    if (typeof request.completed !== 'boolean') throw new Error('Choose an explicit Boolean completion state.');
    after = Boolean(before.completed) === request.completed ? before : { ...before, completed: request.completed ? todoTimestamp(now, 'Completion date') : 0 };
    if (request.completed && !after.completed) throw new Error('A completed to-do needs a positive completion timestamp.');
  } else if (request.action === 'todo-due') {
    if (!before.isTodo) throw new Error('Convert this note to a to-do before setting its due date.');
    const due = todoTimestamp(request.due);
    after = due === before.due ? before : { ...before, due };
  } else throw new Error('Unsupported to-do command.');
  return after === before ? note : { ...note, todo: after };
}
export function todoMatches(note, filter = 'all') {
  if (!['all', 'notes', 'todos', 'open', 'completed'].includes(filter)) throw new Error('Choose a supported note/to-do filter.');
  if (filter === 'all') return true;
  const value = todoState(note);
  return filter === 'notes' ? !value.isTodo : filter === 'todos' ? value.isTodo : filter === 'open' ? value.isTodo && !value.completed : value.isTodo && Boolean(value.completed);
}
