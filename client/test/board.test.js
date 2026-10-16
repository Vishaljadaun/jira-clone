import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTasks, overdue, tasksCsv } from '../src/lib/board.js';
const tasks = [
  { title: 'Fix login', description: 'Mobile', status: 'To Do', priority: 'High', assignee: { _id: 'a', name: 'Ana' }, dueDate: '2026-10-01' },
  { title: 'Write docs', status: 'Done', priority: 'Low', dueDate: '2026-10-01' },
  { title: 'Review', status: 'In Progress', priority: 'High', dueDate: '2026-10-20' },
];
test('search, priority, ownership and overdue filters compose', () => {
  assert.deepEqual(filterTasks(tasks, { search: 'MOBILE', assignee: 'a', priority: 'High', late: true }, '2026-10-16'), [tasks[0]]);
  assert.equal(filterTasks(tasks, { assignee: 'unassigned' }).length, 2);
  assert.equal(filterTasks(tasks, { search: 'nothing' }).length, 0);
});
test('completed tasks and tasks due today are not overdue', () => {
  assert.equal(overdue(tasks[1], '2026-10-16'), false);
  assert.equal(overdue(tasks[0], '2026-10-01'), false);
  assert.equal(overdue(tasks[0], '2026-10-02'), true);
});
test('CSV protects formulas, quotes, commas and multiline values', () => {
  const csv = tasksCsv([{ title: '=1+1', description: 'one,"two"\nthree', assignee: { name: '@SUM' } }]);
  assert.ok(csv.includes('"\'=1+1"')); assert.ok(csv.includes('"\'@SUM"'));
  assert.ok(csv.includes('"one,""two""\nthree"'));
});
