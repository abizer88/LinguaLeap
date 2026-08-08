/**
 * add-content.js
 * ──────────────
 * Add new vocabulary and quiz questions to the repo's JSON-backed database.
 * Usage:  node add-content.js
 */

const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const db = low(new FileSync(path.join(__dirname, 'db.json')));

db.defaults({
  students: [],
  lessons: [],
  questions: [],
  vocabulary: [],
  progress_log: [],
  _nextId: { students: 1, lessons: 1, questions: 1, vocabulary: 1, progress: 1 },
}).write();

function nextId(collection) {
  const current = Number(db.get(`_nextId.${collection}`).value() || 1);
  db.set(`_nextId.${collection}`, current + 1).write();
  return current;
}

const NEW_VOCAB = [
  { arabic: 'أقلام', lsd: 'Pens', category: 'stationery', lesson_id: 2 },
  { arabic: 'دفتر', lsd: 'Notebook', category: 'stationery', lesson_id: 2 },
  { arabic: 'حديقة', lsd: 'Garden', category: 'nature', lesson_id: 4 },
  { arabic: 'نافذة', lsd: 'Window', category: 'home', lesson_id: 5 },
  { arabic: 'أخ', lsd: 'Brother', category: 'people', lesson_id: 6 },
  { arabic: 'أخت', lsd: 'Sister', category: 'people', lesson_id: 6 },
];

for (const v of NEW_VOCAB) {
  const item = {
    id: nextId('vocabulary'),
    arabic: v.arabic,
    lsd: v.lsd,
    category: v.category,
    lesson_id: v.lesson_id,
  };
  db.get('vocabulary').push(item).write();
  console.log(`  📖 Vocab added [id=${item.id}]: ${item.arabic} → ${item.lsd}`);
}

const NEW_QUESTIONS = [
  {
    lesson_id: 2,
    question: '🇦🇪 What does "دفتر" mean?',
    choices: ['Notebook', 'Pencil', 'Bag', 'Chair'],
    answer: 'Notebook',
  },
  {
    lesson_id: 4,
    question: '🇦🇪 What does "حديقة" mean?',
    choices: ['Garden', 'Forest', 'River', 'Desert'],
    answer: 'Garden',
  },
  {
    lesson_id: 6,
    question: '🇦🇪 What does "أخت" mean?',
    choices: ['Sister', 'Brother', 'Mother', 'Friend'],
    answer: 'Sister',
  },
];

for (const q of NEW_QUESTIONS) {
  const item = {
    id: nextId('questions'),
    lesson_id: q.lesson_id,
    question: q.question,
    choices: q.choices,
    answer: q.answer,
  };
  db.get('questions').push(item).write();
  console.log(`  ❓ Question added [id=${item.id}]: ${item.question.slice(0, 40)}...`);
}

console.log('\n✅ Content added successfully.');
