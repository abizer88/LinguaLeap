const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load local db.json
const dbPath = path.join(__dirname, 'db.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

async function seed() {
  console.log('Seeding Supabase database...');

  // 1. Seed Lessons
  if (dbData.lessons && dbData.lessons.length > 0) {
    console.log(`Found ${dbData.lessons.length} lessons. Seeding...`);
    const { error } = await supabase.from('lessons').upsert(
      dbData.lessons.map(l => ({
        id: l.id,
        icon: l.icon,
        label: l.label,
        sort_order: l.sort
      }))
    );
    if (error) {
      console.error('Error seeding lessons:', error.message);
    } else {
      console.log('Lessons seeded successfully!');
    }
  }

  // 2. Seed Questions
  if (dbData.questions && dbData.questions.length > 0) {
    console.log(`Found ${dbData.questions.length} questions. Seeding...`);
    const { error } = await supabase.from('questions').upsert(
      dbData.questions.map(q => ({
        id: q.id,
        lesson_id: q.lesson_id,
        question: q.question,
        choices: q.choices,
        answer: q.answer
      }))
    );
    if (error) {
      console.error('Error seeding questions:', error.message);
    } else {
      console.log('Questions seeded successfully!');
    }
  }

  // 3. Seed Vocabulary
  if (dbData.vocabulary && dbData.vocabulary.length > 0) {
    console.log(`Found ${dbData.vocabulary.length} words. Seeding...`);
    const { error } = await supabase.from('vocabulary').upsert(
      dbData.vocabulary.map(v => ({
        id: v.id,
        arabic: v.arabic,
        lsd: v.lsd,
        category: v.category,
        lesson_id: v.lesson_id
      }))
    );
    if (error) {
      console.error('Error seeding vocabulary:', error.message);
    } else {
      console.log('Vocabulary seeded successfully!');
    }
  }

  console.log('Seeding process complete.');
}

seed();
