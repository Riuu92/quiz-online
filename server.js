const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory store with file persistence
let quizzes = {};
if (fs.existsSync(QUIZZES_FILE)) {
  try {
    quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed reading quizzes file, initializing fresh:', err);
    quizzes = {};
  }
}

function saveQuizzes() {
  try {
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving quizzes:', err);
  }
}

// Active online users map: socketId -> { userId, name, avatar, status, currentQuizId, joinedAt }
const onlineUsers = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: generate short unique ID
function generateId(prefix = 'q') {
  return prefix + '_' + Math.random().toString(36).substring(2, 9);
}

// REST API Endpoints

// 1. Get online users list
app.get('/api/online-users', (req, res) => {
  const users = Array.from(onlineUsers.values());
  res.json({ count: users.length, users });
});

// 2. Create Quiz
app.post('/api/quizzes', (req, res) => {
  const { title, description, timePerQuestion, questions, creatorId, creatorName } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Judul kuis wajib diisi.' });
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Kuis harus memiliki minimal 1 pertanyaan.' });
  }

  if (!creatorId || !creatorName) {
    return res.status(400).json({ error: 'Identitas pembuat kuis tidak valid.' });
  }

  // Validate questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text || !q.text.trim()) {
      return res.status(400).json({ error: `Pertanyaan #${i + 1} tidak boleh kosong.` });
    }
    if (!q.options || q.options.length < 2) {
      return res.status(400).json({ error: `Pertanyaan #${i + 1} harus punya minimal 2 pilihan jawaban.` });
    }
    if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
      return res.status(400).json({ error: `Kunci jawaban pertanyaan #${i + 1} belum dipilih.` });
    }
  }

  const quizId = generateId('quiz');
  const newQuiz = {
    id: quizId,
    title: title.trim(),
    description: (description || '').trim(),
    timePerQuestion: Number(timePerQuestion) || 20,
    questions: questions.map((q, idx) => ({
      id: idx + 1,
      text: q.text.trim(),
      options: q.options.map(opt => String(opt).trim()),
      correctAnswer: Number(q.correctAnswer)
    })),
    creatorId,
    creatorName,
    createdAt: new Date().toISOString(),
    results: []
  };

  quizzes[quizId] = newQuiz;
  saveQuizzes();

  // Broadcast new quiz creation activity
  io.emit('activity:new_quiz', {
    quizId,
    title: newQuiz.title,
    creatorName: newQuiz.creatorName,
    questionCount: newQuiz.questions.length
  });

  res.status(201).json({
    success: true,
    quizId,
    quiz: {
      id: newQuiz.id,
      title: newQuiz.title,
      description: newQuiz.description,
      questionCount: newQuiz.questions.length,
      creatorName: newQuiz.creatorName
    }
  });
});

// 3. Get Quiz by ID
app.get('/api/quizzes/:id', (req, res) => {
  const quizId = req.params.id;
  const userId = req.headers['x-user-id'];

  const quiz = quizzes[quizId];
  if (!quiz) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan atau tautan salah.' });
  }

  const isCreator = Boolean(userId && userId === quiz.creatorId);

  if (isCreator) {
    // Creator gets full info including correct answers & player leaderboard
    return res.json({
      ...quiz,
      isCreator: true,
      canPlay: false // Creator CANNOT play!
    });
  }

  // Player gets questions WITHOUT correct answers to prevent inspecting source
  const sanitizedQuestions = quiz.questions.map(q => ({
    id: q.id,
    text: q.text,
    options: q.options
  }));

  res.json({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    timePerQuestion: quiz.timePerQuestion,
    questions: sanitizedQuestions,
    questionCount: sanitizedQuestions.length,
    creatorName: quiz.creatorName,
    createdAt: quiz.createdAt,
    isCreator: false,
    canPlay: true,
    resultsCount: quiz.results.length
  });
});

// 4. Submit Quiz Answers
app.post('/api/quizzes/:id/submit', (req, res) => {
  const quizId = req.params.id;
  const { userId, playerName, answers, timeSpent } = req.body;

  const quiz = quizzes[quizId];
  if (!quiz) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }

  // RULE: Quiz creator CANNOT play their own quiz!
  if (userId && userId === quiz.creatorId) {
    return res.status(403).json({
      error: 'Kamu adalah pembuat kuis ini! Sesuai aturan, pembuat kuis dilarang memainkan kuis buatannya sendiri.'
    });
  }

  if (!playerName || !playerName.trim()) {
    return res.status(400).json({ error: 'Nama pemain wajib diisi.' });
  }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Data jawaban tidak valid.' });
  }

  // Calculate score on server
  let score = 0;
  const breakdown = [];

  quiz.questions.forEach((q, idx) => {
    const playerAns = answers[idx];
    const isCorrect = Number(playerAns) === q.correctAnswer;
    if (isCorrect) {
      score += 1;
    }
    breakdown.push({
      questionIndex: idx,
      questionText: q.text,
      playerAnswer: playerAns !== undefined ? q.options[playerAns] : null,
      correctAnswer: q.options[q.correctAnswer],
      isCorrect
    });
  });

  const total = quiz.questions.length;
  const percentage = Math.round((score / total) * 100);

  const resultEntry = {
    id: generateId('res'),
    userId: userId || 'anon_' + Math.random().toString(36).substring(2, 7),
    playerName: playerName.trim(),
    score,
    total,
    percentage,
    timeSpent: Number(timeSpent) || 0,
    completedAt: new Date().toISOString(),
    breakdown
  };

  quiz.results.unshift(resultEntry);
  saveQuizzes();

  // Notify creator / room in real-time
  io.to(`quiz_${quizId}`).emit('quiz:new_submission', {
    quizId,
    result: {
      playerName: resultEntry.playerName,
      score: resultEntry.score,
      total: resultEntry.total,
      percentage: resultEntry.percentage,
      completedAt: resultEntry.completedAt
    }
  });

  // Global activity notification
  io.emit('activity:quiz_completed', {
    quizTitle: quiz.title,
    playerName: resultEntry.playerName,
    score: `${score}/${total}`
  });

  res.json({
    success: true,
    score,
    total,
    percentage,
    breakdown,
    leaderboard: quiz.results.slice(0, 20).map(r => ({
      playerName: r.playerName,
      score: r.score,
      total: r.total,
      percentage: r.percentage,
      timeSpent: r.timeSpent,
      completedAt: r.completedAt
    }))
  });
});

// 5. Get Quiz Leaderboard / Results (for anyone or creator)
app.get('/api/quizzes/:id/results', (req, res) => {
  const quizId = req.params.id;
  const quiz = quizzes[quizId];
  if (!quiz) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }

  res.json({
    quizId: quiz.id,
    title: quiz.title,
    creatorName: quiz.creatorName,
    totalQuestions: quiz.questions.length,
    results: quiz.results
  });
});

// 6. Get Quizzes created by a user
app.get('/api/my-quizzes', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.json({ quizzes: [] });
  }

  const userQuizzes = Object.values(quizzes)
    .filter(q => q.creatorId === userId)
    .map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questionCount: q.questions.length,
      createdAt: q.createdAt,
      totalPlays: q.results.length,
      latestScores: q.results.slice(0, 3).map(r => ({
        name: r.playerName,
        score: `${r.score}/${r.total}`
      }))
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ quizzes: userQuizzes });
});

// Delete quiz (creator only)
app.delete('/api/quizzes/:id', (req, res) => {
  const quizId = req.params.id;
  const userId = req.headers['x-user-id'];

  const quiz = quizzes[quizId];
  if (!quiz) {
    return res.status(404).json({ error: 'Kuis tidak ditemukan.' });
  }

  if (quiz.creatorId !== userId) {
    return res.status(403).json({ error: 'Hanya pembuat kuis yang dapat menghapusnya.' });
  }

  delete quizzes[quizId];
  saveQuizzes();

  res.json({ success: true, message: 'Kuis berhasil dihapus.' });
});

// WebSocket Connection & Real-Time Presence
io.on('connection', (socket) => {
  let currentUserId = null;

  // When a user logs in / announces presence
  socket.on('user:join', (userData) => {
    if (!userData || !userData.name) return;

    currentUserId = userData.userId;

    // Check if user already had a previous socket connected and update
    onlineUsers.set(socket.id, {
      socketId: socket.id,
      userId: userData.userId,
      name: userData.name,
      avatar: userData.avatar || '🦊',
      status: userData.status || 'Sedang di Lobi',
      currentQuizId: null,
      joinedAt: new Date().toISOString()
    });

    broadcastOnlineUsers();
  });

  // User updates their current activity status
  socket.on('user:status', (statusText) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.status = statusText;
      broadcastOnlineUsers();
    }
  });

  // User joins a specific quiz room to listen for live results
  socket.on('quiz:join_room', (quizId) => {
    socket.join(`quiz_${quizId}`);
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.currentQuizId = quizId;
      const quiz = quizzes[quizId];
      user.status = quiz ? `Melihat Kuis: ${quiz.title}` : 'Di ruang kuis';
      broadcastOnlineUsers();
    }
  });

  // User leaves a quiz room
  socket.on('quiz:leave_room', (quizId) => {
    socket.leave(`quiz_${quizId}`);
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.currentQuizId = null;
      user.status = 'Sedang di Lobi';
      broadcastOnlineUsers();
    }
  });

  // On disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    broadcastOnlineUsers();
  });
});

function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.values());
  io.emit('users:update', {
    count: users.length,
    users
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server Quiz Online berjalan di http://localhost:${PORT}`);
  console.log(`🌐 Bisa diakses di jaringan lokal oleh teman-teman Anda!`);
});
