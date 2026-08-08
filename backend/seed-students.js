/**
 * seed-students.js — Bulk add students
 * Usage: node seed-students.js
 */
const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const db = low(new FileSync(path.join(__dirname, 'db.json')));

// ── ADD YOUR STUDENTS HERE ────────────────────
const STUDENTS = [
  { tr_no: '20240001', password: 'pass1234', name: 'Ahmed Al-Mansoori'  },
  { tr_no: '20240002', password: 'pass1234', name: 'Fatima Al-Zahra'    },
  { tr_no: '20240003', password: 'pass1234', name: 'Mohammed Al-Rashid' },
  { tr_no: '20240004', password: 'pass1234', name: 'Noura Al-Hamdan'    },
  { tr_no: '20240005', password: 'pass1234', name: 'Omar Al-Farsi'      },
  // Add more rows here...
];
// ─────────────────────────────────────────────

let added = 0, skipped = 0;

for (const s of STUDENTS) {
  const exists = db.get('students').find({ tr_no: s.tr_no }).value();
  if (exists) { console.log(`  ⏭  Skip (exists): ${s.tr_no}`); skipped++; continue; }

  const id   = db.get('_nextId.students').value();
  db.set('_nextId.students', id + 1).write();

  db.get('students').push({
    id,
    tr_no:         s.tr_no,
    name:          s.name,
    password_hash: bcrypt.hashSync(s.password, 10),
    xp:            0,
    streak:        0,
    lives:         3,
    lessons_completed: 0,
    last_login:    null,
    lang_code:     'ar_lsd',
    created_at:    new Date().toISOString(),
  }).write();

  console.log(`  ✅ Added: ${s.tr_no} — ${s.name}`);
  added++;
}

console.log(`\nDone. ${added} added, ${skipped} skipped.`);
