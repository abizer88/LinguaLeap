/**
 * LinguaLeap Backend — Node.js + Express + Supabase
 * ──────────────────────────────────────────────────────────────────────────
 * Run:  npm install    (then)    node server.js
 * API:  http://localhost:3000/api
 * DB:   stored in Supabase cloud PostgreSQL database
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from parent folder
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'lingualeap-secret-change-in-prod';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // admin access to bypass RLS for backend operations

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the React production build when available. Keeping the legacy root page as
// a local-development fallback prevents a missing build from breaking the API.
const reactBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
const legacySitePath = path.join(__dirname, '..');
app.use(express.static(require('fs').existsSync(reactBuildPath) ? reactBuildPath : legacySitePath));

// ─────────────────────────────────────────────
//  HELPERS & AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function normalizeTrNo(value) {
  return String(value ?? '').trim().replace(/\s+/g, '');
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing token — please log in' });
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─────────────────────────────────────────────
//  AUTH ROUTES
// ─────────────────────────────────────────────

// POST /api/auth/login  — TR NO + password
app.post('/api/auth/login', async (req, res) => {
  const trNo = normalizeTrNo(req.body.tr_no);
  const { password } = req.body;
  if (!trNo || !password)
    return res.status(400).json({ error: 'TR NO and password are required' });

  // Validate TR NO: numeric string (supports 5 to 8 digits)
  if (!/^\d{5,8}$/.test(trNo))
    return res.status(400).json({ error: 'TR NO must be between 5 and 8 digits.' });

  // Derive university edu email
  const email = `${trNo}@jameasaifiyah.edu`;

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    // 2. Fetch or create student profile in PostgreSQL 'students' table
    let { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('tr_no', trNo)
      .maybeSingle();

    if (studentError) {
      return res.status(500).json({ error: 'Database error reading profile.' });
    }

    // If profile row doesn't exist, create it (handles first-time login synchronization)
    if (!student) {
      const { data: newStudent, error: insertError } = await supabase
        .from('students')
        .insert([
          {
            tr_no: trNo,
            password_hash: 'managed_by_supabase_auth', // password managed securely by GoTrue
            name: `Student ${trNo}`,
            xp: 0,
            streak: 0,
            lives: 3,
            lessons_completed: 0,
            last_login: null,
            lang_code: 'ar_lsd'
          }
        ])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: 'Failed to create student profile in database.' });
      }
      student = newStudent;
    }

    // 3. Calculate streak updates
    const today = new Date().toDateString();
    const yest  = new Date(Date.now() - 86400000).toDateString();
    let streak  = student.streak || 0;

    if (student.last_login === yest) {
      streak += 1;
    } else if (student.last_login !== today) {
      streak = 1;
    }

    // Update streak and last login date in DB
    const { error: updateError } = await supabase
      .from('students')
      .update({ streak, last_login: today })
      .eq('tr_no', trNo);

    if (updateError) {
      console.error('Failed to update streak:', updateError.message);
    }

    // 4. Issue custom JWT for Express API endpoint access
    const token = jwt.sign({ id: student.id, tr_no: student.tr_no }, SECRET, { expiresIn: '7d' });
    res.json({
      token,
      tr_no: student.tr_no,
      name: student.name,
      xp: student.xp,
      streak,
      lives: student.lives,
      lessons_completed: student.lessons_completed
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/set-password
// Handles first-time student registration/signup with university edu email
app.post('/api/auth/set-password', async (req, res) => {
  const trNo = normalizeTrNo(req.body.tr_no);
  const { new_password } = req.body;

  if (!trNo || !/^\d{5,8}$/.test(trNo)) {
    return res.status(400).json({ error: 'TR NO must be between 5 and 8 digits.' });
  }
  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const email = `${trNo}@jameasaifiyah.edu`;

  try {
    // 1. Sign up the user in Supabase Auth
    // Note: By default, this registers the user. If email confirmation is enabled on Supabase,
    // they'll receive an email to confirm their account. If disabled, they can log in instantly.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: new_password
    });

    if (signUpError) {
      // If user already exists in auth
      if (signUpError.message.includes('already registered') || signUpError.status === 400) {
        return res.status(409).json({ error: 'Account already registered. Please log in with your password.' });
      }
      return res.status(400).json({ error: signUpError.message });
    }

    // 2. Ensure student profile exists in DB
    const { data: existingProfile } = await supabase
      .from('students')
      .select('id')
      .eq('tr_no', trNo)
      .maybeSingle();

    if (!existingProfile) {
      const { error: insertError } = await supabase
        .from('students')
        .insert([
          {
            tr_no: trNo,
            password_hash: 'managed_by_supabase_auth',
            name: `Student ${trNo}`,
            xp: 0,
            streak: 0,
            lives: 3,
            lessons_completed: 0,
            last_login: null,
            lang_code: 'ar_lsd'
          }
        ]);

      if (insertError) {
        console.error('Failed to seed profile on signup:', insertError.message);
      }
    }

    res.status(201).json({ message: 'Account created. You can now log in.' });

  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Internal server error during account setup.' });
  }
});

// POST /api/auth/register  — Create student profile manually (admin use)
app.post('/api/auth/register', async (req, res) => {
  const trNo = normalizeTrNo(req.body.tr_no);
  const { password, name } = req.body;
  if (!trNo || !password)
    return res.status(400).json({ error: 'tr_no and password are required' });

  const email = `${trNo}@jameasaifiyah.edu`;

  try {
    // Create user in Supabase Auth using admin API (bypasses email confirmation)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create student profile
    const { data: student, error: insertError } = await supabase
      .from('students')
      .insert([
        {
          tr_no: trNo,
          password_hash: 'managed_by_supabase_auth',
          name: name || `Student ${trNo}`,
          xp: 0,
          streak: 0,
          lives: 3,
          lessons_completed: 0,
          last_login: null,
          lang_code: 'ar_lsd'
        }
      ])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json({ id: student.id, tr_no: student.tr_no, name: student.name });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// ─────────────────────────────────────────────
//  STUDENT ROUTES
// ─────────────────────────────────────────────

// GET /api/students — List all students (admin / leaderboard list)
app.get('/api/students', authenticate, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('students')
      .select('id, tr_no, name, xp, streak, lives, lessons_completed')
      .order('xp', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:tr_no — Single student profile
app.get('/api/students/:tr_no', authenticate, async (req, res) => {
  const trNo = normalizeTrNo(req.params.tr_no);
  if (trNo !== req.user.tr_no) {
    return res.status(403).json({ error: 'You can only view your own student profile.' });
  }
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('tr_no', trNo)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    // Exclude password hash from payload
    const { password_hash, ...safeStudent } = student;
    res.json(safeStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  LESSON ROUTES
// ─────────────────────────────────────────────

// GET /api/lessons
app.get('/api/lessons', authenticate, async (req, res) => {
  try {
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lessons — Add a new lesson (admin / seeding)
app.post('/api/lessons', async (req, res) => {
  const { icon, label, sort } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });

  try {
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert([{ icon: icon || '📖', label, sort_order: sort || 0 }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(lesson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lessons/:id/questions
app.get('/api/lessons/:id/questions', authenticate, async (req, res) => {
  try {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('lesson_id', parseInt(req.params.id));

    if (error) return res.status(500).json({ error: error.message });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  QUESTION ROUTES
// ─────────────────────────────────────────────

// POST /api/questions — Add a quiz question (admin)
app.post('/api/questions', async (req, res) => {
  const { lesson_id, question, choices, answer } = req.body;
  if (!lesson_id || !question || !choices || !answer)
    return res.status(400).json({ error: 'lesson_id, question, choices[], answer required' });

  try {
    const { data: q, error } = await supabase
      .from('questions')
      .insert([{ lesson_id: parseInt(lesson_id), question, choices, answer }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/questions/:id — Remove a question (admin)
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', parseInt(req.params.id));

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  VOCABULARY ROUTES
// ─────────────────────────────────────────────

// GET /api/vocabulary  (optional ?lesson_id=)
app.get('/api/vocabulary', authenticate, async (req, res) => {
  const { lesson_id } = req.query;
  try {
    let query = supabase.from('vocabulary').select('*');
    if (lesson_id) {
      query = query.eq('lesson_id', parseInt(lesson_id));
    }
    const { data: vocab, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    res.json(vocab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vocabulary — Add a word (admin)
app.post('/api/vocabulary', async (req, res) => {
  const { arabic, lsd, category, lesson_id } = req.body;
  if (!arabic || !lsd) return res.status(400).json({ error: 'arabic and lsd are required' });

  try {
    const { data: word, error } = await supabase
      .from('vocabulary')
      .insert([{ arabic, lsd, category: category || 'general', lesson_id: lesson_id || null }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(word);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vocabulary/:id
app.delete('/api/vocabulary/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vocabulary')
      .delete()
      .eq('id', parseInt(req.params.id));

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  PROGRESS ROUTE
// ─────────────────────────────────────────────

// POST /api/progress — Record quiz attempt, award XP
app.post('/api/progress', authenticate, async (req, res) => {
  const { lesson_id, passed } = req.body;
  const xp_earned = passed ? 10 : 0;

  try {
    // 1. Log the progress attempt
    const { error: logError } = await supabase
      .from('progress_log')
      .insert([
        {
          student_id: req.user.id,
          lesson_id: parseInt(lesson_id),
          xp_earned,
          passed: passed ? true : false,
          attempted_at: new Date().toISOString()
        }
      ]);

    if (logError) {
      console.error('Failed to log progress:', logError.message);
    }

    // 2. Fetch the student profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (studentError) {
      return res.status(500).json({ error: 'Failed to retrieve student profile.' });
    }

    // 3. Fetch total lessons count to cap lessons completed
    const { data: lessons } = await supabase.from('lessons').select('id');
    const totalLessons = lessons ? lessons.length : 6;

    // Calculate updates
    const updates = {};
    if (passed) {
      updates.xp = (student.xp || 0) + 10;
      // Increment completed lessons, capping at total lessons count
      updates.lessons_completed = Math.min((student.lessons_completed || 0) + 1, totalLessons);
    } else {
      // Deduct a life
      updates.lives = Math.max((student.lives || 0) - 1, 0);
    }

    // 4. Update the student in DB
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update student progress.' });
    }

    res.json({
      xp_earned,
      xp: updatedStudent.xp,
      lives: updatedStudent.lives,
      lessons_completed: updatedStudent.lessons_completed
    });

  } catch (err) {
    console.error('Progress update error:', err);
    res.status(500).json({ error: 'Internal server error updating progress.' });
  }
});

// ─────────────────────────────────────────────
//  LEADERBOARD
// ─────────────────────────────────────────────
app.get('/api/leaderboard', authenticate, async (req, res) => {
  try {
    const { data: top, error } = await supabase
      .from('students')
      .select('tr_no, name, xp, streak')
      .order('xp', { ascending: false })
      .limit(10);

    if (error) return res.status(500).json({ error: error.message });
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🦜  LinguaLeap backend with Supabase is running!');
  console.log(`    Frontend → http://localhost:${PORT}`);
  console.log(`    API      → http://localhost:${PORT}/api`);
  console.log(`    Database → Connected to Supabase: ${supabaseUrl}\n`);
});
