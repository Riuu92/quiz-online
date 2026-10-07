// Client State & Real-Time Logic
const AVATAR_OPTIONS = ['🦊', '🐱', '🐼', '🦁', '🐯', '🐶', '🚀', '⚡', '🎮', '🦄', '🤖', '🍕', '👑', '🔥', '🎩', '👻', '🌟', '🦉'];

const state = {
  user: {
    userId: localStorage.getItem('quiz_user_id') || ('usr_' + Math.random().toString(36).substring(2, 9)),
    name: localStorage.getItem('quiz_user_name') || '',
    avatar: localStorage.getItem('quiz_user_avatar') || '🦊'
  },
  onlineUsers: [],
  activeTab: 'home',
  currentQuiz: null,
  activeQuestionIndex: 0,
  playerAnswers: {},
  questionTimer: null,
  questionTimeRemaining: 20,
  quizStartTime: null,
  builderQuestions: []
};

// Save user id immediately
localStorage.setItem('quiz_user_id', state.user.userId);

// Setup Socket.io
const socket = io();

// Connect event
socket.on('connect', () => {
  if (state.user.name) {
    socket.emit('user:join', {
      userId: state.user.userId,
      name: state.user.name,
      avatar: state.user.avatar,
      status: 'Sedang di Lobi'
    });
  }
});

// Real-time online users update
socket.on('users:update', (data) => {
  state.onlineUsers = data.users || [];
  updateOnlineUI();
});

// Real-time activity notifications
socket.on('activity:new_quiz', (data) => {
  if (data.creatorName !== state.user.name) {
    showToast(`✨ ${data.creatorName} baru saja membuat kuis: "${data.title}"!`, 'info');
  }
});

socket.on('activity:quiz_completed', (data) => {
  if (data.playerName !== state.user.name) {
    showToast(`🎯 ${data.playerName} menyelesaikan "${data.quizTitle}" dengan skor ${data.score}!`, 'info');
  }
});

// Real-time submission update for quiz creator
socket.on('quiz:new_submission', (data) => {
  if (state.currentQuiz && state.currentQuiz.id === data.quizId && state.currentQuiz.isCreator) {
    window.soundFx.playCorrect();
    showToast(`🎉 ${data.result.playerName} baru saja menyelesaikan kuismu! Skor: ${data.result.score}/${data.result.total}`, 'success');
    addOrUpdateCreatorLeaderboard(data.result);
  }
});

// DOM Elements
const elements = {
  headerOnlineCount: document.getElementById('header-online-count'),
  tabOnlineCount: document.getElementById('tab-online-count'),
  onlineViewCount: document.getElementById('online-view-count'),
  headerUserAvatar: document.getElementById('header-user-avatar'),
  headerUserName: document.getElementById('header-user-name'),
  onlinePillBtn: document.getElementById('online-pill-btn'),
  profileBadgeBtn: document.getElementById('profile-badge-btn'),
  logoHomeBtn: document.getElementById('logo-home-btn'),
  navTabs: document.getElementById('main-nav-tabs'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabViews: document.querySelectorAll('.tab-view'),
  
  // Modals
  modalProfile: document.getElementById('modal-profile'),
  modalProfileClose: document.getElementById('modal-profile-close'),
  profileNameInput: document.getElementById('profile-name-input'),
  avatarChoicesGrid: document.getElementById('avatar-choices-grid'),
  btnSaveProfile: document.getElementById('btn-save-profile'),

  modalShare: document.getElementById('modal-share'),
  modalShareClose: document.getElementById('modal-share-close'),
  shareLinkInput: document.getElementById('share-link-input'),
  btnCopyShareLink: document.getElementById('btn-copy-share-link'),
  btnWhatsappShare: document.getElementById('btn-whatsapp-share'),
  btnViewAsCreator: document.getElementById('btn-view-as-creator'),

  // Home View
  heroCreateBtn: document.getElementById('hero-create-btn'),
  heroViewOnlineBtn: document.getElementById('hero-view-online-btn'),
  btnSeeAllMyQuizzes: document.getElementById('btn-see-all-my-quizzes'),
  emptyStateCreateBtn: document.getElementById('empty-state-create-btn'),
  homeRecentQuizzesList: document.getElementById('home-recent-quizzes-list'),

  // Builder View
  quizBuilderForm: document.getElementById('quiz-builder-form'),
  quizTitleInput: document.getElementById('quiz-title-input'),
  quizDescInput: document.getElementById('quiz-desc-input'),
  quizTimerSelect: document.getElementById('quiz-timer-select'),
  questionsCountBadge: document.getElementById('questions-count-badge'),
  questionsBuilderList: document.getElementById('questions-builder-list'),
  btnAddQuestion: document.getElementById('btn-add-question'),

  // My Quizzes View
  myQuizzesGrid: document.getElementById('my-quizzes-grid'),
  btnCreateQuizShortcut: document.getElementById('btn-create-quiz-shortcut'),

  // Online View
  onlineUsersList: document.getElementById('online-users-list'),

  // Play Quiz Views
  creatorBlockScreen: document.getElementById('creator-block-screen'),
  btnShareCurrentQuiz: document.getElementById('btn-share-current-quiz'),
  btnBackToHomeFromCreator: document.getElementById('btn-back-to-home-from-creator'),
  creatorResultsTbody: document.getElementById('creator-results-tbody'),

  playerIntroScreen: document.getElementById('player-intro-screen'),
  playQuizTitle: document.getElementById('play-quiz-title'),
  playQuizDesc: document.getElementById('play-quiz-desc'),
  playQuizCreator: document.getElementById('play-quiz-creator'),
  playQuizTotalQ: document.getElementById('play-quiz-total-q'),
  playQuizTimerInfo: document.getElementById('play-quiz-timer-info'),
  playerScreenAvatar: document.getElementById('player-screen-avatar'),
  playerScreenNameInput: document.getElementById('player-screen-name-input'),
  btnStartQuizPlaying: document.getElementById('btn-start-quiz-playing'),

  playerGameScreen: document.getElementById('player-game-screen'),
  gameCurrentQIndex: document.getElementById('game-current-q-index'),
  gameTotalQCount: document.getElementById('game-total-q-count'),
  gameTimerPill: document.getElementById('game-timer-pill'),
  gameTimerSeconds: document.getElementById('game-timer-seconds'),
  gameProgressBar: document.getElementById('game-progress-bar'),
  gameQuestionText: document.getElementById('game-question-text'),
  gameOptionsContainer: document.getElementById('game-options-container'),
  gameHintText: document.getElementById('game-hint-text'),
  btnGameNext: document.getElementById('btn-game-next'),

  playerResultScreen: document.getElementById('player-result-screen'),
  resultEmoji: document.getElementById('result-emoji'),
  resultTitle: document.getElementById('result-title'),
  resultSubtitle: document.getElementById('result-subtitle'),
  resultScoreNumber: document.getElementById('result-score-number'),
  resultPercentNumber: document.getElementById('result-percent-number'),
  btnResultReviewToggle: document.getElementById('btn-result-review-toggle'),
  resultReviewSection: document.getElementById('result-review-section'),
  resultBreakdownList: document.getElementById('result-breakdown-list'),
  resultLeaderboardTbody: document.getElementById('result-leaderboard-tbody'),
  btnResultCreateOwn: document.getElementById('btn-result-create-own'),
  btnResultHome: document.getElementById('btn-result-home'),

  toastContainer: document.getElementById('toast-container')
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  initAvatarChoices();
  initTabs();
  initQuizBuilderDefault();
  bindEvents();

  // Check URL parameters (e.g. ?quiz=quiz_xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const quizIdParam = urlParams.get('quiz');
  if (quizIdParam) {
    loadQuizById(quizIdParam);
  } else {
    loadMyQuizzes();
  }
});

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// User Profile Logic
function initUserProfile() {
  if (!state.user.name) {
    // Show modal if user doesn't have a name yet
    openProfileModal(true);
  } else {
    updateProfileUI();
  }
}

function updateProfileUI() {
  elements.headerUserAvatar.textContent = state.user.avatar;
  elements.headerUserName.textContent = state.user.name || 'Tamu';
  if (elements.playerScreenAvatar) elements.playerScreenAvatar.textContent = state.user.avatar;
  if (elements.playerScreenNameInput) elements.playerScreenNameInput.value = state.user.name;
}

function initAvatarChoices() {
  elements.avatarChoicesGrid.innerHTML = '';
  AVATAR_OPTIONS.forEach(avatar => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-choice ${avatar === state.user.avatar ? 'selected' : ''}`;
    btn.textContent = avatar;
    btn.addEventListener('click', () => {
      window.soundFx.playClick();
      document.querySelectorAll('.avatar-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.user.avatar = avatar;
    });
    elements.avatarChoicesGrid.appendChild(btn);
  });
}

function openProfileModal(isForced = false) {
  elements.profileNameInput.value = state.user.name;
  elements.modalProfile.classList.add('active');
  if (isForced) {
    elements.modalProfileClose.style.display = 'none';
  } else {
    elements.modalProfileClose.style.display = 'block';
  }
  setTimeout(() => elements.profileNameInput.focus(), 100);
}

function saveUserProfile() {
  const name = elements.profileNameInput.value.trim();
  if (!name) {
    showToast('Harap masukkan nama panggilanmu!', 'error');
    elements.profileNameInput.focus();
    return;
  }

  state.user.name = name;
  localStorage.setItem('quiz_user_name', name);
  localStorage.setItem('quiz_user_avatar', state.user.avatar);
  updateProfileUI();
  elements.modalProfile.classList.remove('active');

  // Notify server of joined user
  socket.emit('user:join', {
    userId: state.user.userId,
    name: state.user.name,
    avatar: state.user.avatar,
    status: 'Sedang di Lobi'
  });

  window.soundFx.playSelect();
  showToast(`Selamat datang, ${name}! Siap bermain & membuat kuis 🚀`, 'success');
}

// Online UI Updates
function updateOnlineUI() {
  const count = state.onlineUsers.length;
  elements.headerOnlineCount.textContent = `${count} Online`;
  elements.tabOnlineCount.textContent = count;
  elements.onlineViewCount.textContent = count;

  elements.onlineUsersList.innerHTML = '';
  if (count === 0) {
    elements.onlineUsersList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">👥</div>
        <p>Belum ada teman yang online.</p>
      </div>`;
    return;
  }

  state.onlineUsers.forEach(u => {
    const isMe = u.userId === state.user.userId;
    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
      <div class="user-card-avatar">
        ${u.avatar || '🦊'}
        <span class="dot"></span>
      </div>
      <div class="user-card-info">
        <h4>${escapeHtml(u.name)} ${isMe ? '<span style="font-size: 0.7rem; background: var(--primary); padding: 0.15rem 0.4rem; border-radius: 4px;">Kamu</span>' : ''}</h4>
        <p>${escapeHtml(u.status || 'Aktif')}</p>
      </div>
    `;
    elements.onlineUsersList.appendChild(card);
  });
}

// Navigation Tabs
function initTabs() {
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  window.soundFx.playClick();
  state.activeTab = tabId;

  // Clear quiz play if leaving play view
  if (tabId !== 'play' && state.currentQuiz) {
    socket.emit('quiz:leave_room', state.currentQuiz.id);
  }

  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  elements.tabViews.forEach(view => {
    view.style.display = 'none';
  });

  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) {
    activeView.style.display = 'block';
  }

  if (tabId === 'my-quizzes') {
    loadMyQuizzes();
  }
  if (tabId === 'home') {
    loadMyQuizzes();
  }
}

// QUIZ BUILDER LOGIC
function initQuizBuilderDefault() {
  state.builderQuestions = [
    {
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    },
    {
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }
  ];
  renderQuestionsBuilder();
}

function renderQuestionsBuilder() {
  elements.questionsCountBadge.textContent = state.builderQuestions.length;
  elements.questionsBuilderList.innerHTML = '';

  state.builderQuestions.forEach((q, qIdx) => {
    const card = document.createElement('div');
    card.className = 'question-builder-card';
    card.dataset.index = qIdx;

    let optionsHtml = '';
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    q.options.forEach((opt, optIdx) => {
      const isChecked = q.correctAnswer === optIdx;
      optionsHtml += `
        <div class="option-builder-item ${isChecked ? 'correct-selected' : ''}" data-opt-idx="${optIdx}">
          <input type="radio" name="correct_q_${qIdx}" class="radio-correct" title="Tandai sebagai jawaban benar" ${isChecked ? 'checked' : ''} data-q="${qIdx}" data-opt="${optIdx}">
          <span style="font-weight: 700; color: var(--text-muted); width: 22px;">${letters[optIdx]}.</span>
          <input type="text" class="form-input opt-text-input" placeholder="Pilihan jawaban ${letters[optIdx]}..." value="${escapeHtml(opt)}" data-q="${qIdx}" data-opt="${optIdx}" style="padding: 0.5rem 0.8rem;">
          ${q.options.length > 2 ? `
            <button type="button" class="btn btn-danger btn-sm btn-delete-opt" data-q="${qIdx}" data-opt="${optIdx}" title="Hapus opsi ini" style="padding: 0.3rem 0.5rem;">✕</button>
          ` : ''}
        </div>
      `;
    });

    card.innerHTML = `
      <div class="qb-header">
        <span class="qb-number">Soal #${qIdx + 1}</span>
        <div>
          ${state.builderQuestions.length > 1 ? `
            <button type="button" class="btn btn-danger btn-sm btn-delete-question" data-q="${qIdx}">
              🗑️ Hapus Soal
            </button>
          ` : ''}
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 0.75rem;">
        <input type="text" class="form-input q-text-input" placeholder="Tuliskan pertanyaanmu di sini..." value="${escapeHtml(q.text)}" data-q="${qIdx}" required>
      </div>

      <div class="options-builder-list">
        ${optionsHtml}
      </div>

      ${q.options.length < 6 ? `
        <button type="button" class="btn btn-secondary btn-sm btn-add-opt" data-q="${qIdx}" style="margin-top: 0.6rem;">
          ➕ Tambah Pilihan Jawaban
        </button>
      ` : ''}
    `;

    elements.questionsBuilderList.appendChild(card);
  });

  bindBuilderInputEvents();
}

function bindBuilderInputEvents() {
  // Question text changes
  document.querySelectorAll('.q-text-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const qIdx = Number(e.target.dataset.q);
      state.builderQuestions[qIdx].text = e.target.value;
    });
  });

  // Option text changes
  document.querySelectorAll('.opt-text-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const qIdx = Number(e.target.dataset.q);
      const optIdx = Number(e.target.dataset.opt);
      state.builderQuestions[qIdx].options[optIdx] = e.target.value;
    });
  });

  // Radio button correct answer selection
  document.querySelectorAll('.radio-correct').forEach(radio => {
    radio.addEventListener('change', (e) => {
      window.soundFx.playSelect();
      const qIdx = Number(e.target.dataset.q);
      const optIdx = Number(e.target.dataset.opt);
      state.builderQuestions[qIdx].correctAnswer = optIdx;

      // Update styling
      const parentCard = e.target.closest('.question-builder-card');
      parentCard.querySelectorAll('.option-builder-item').forEach((item, idx) => {
        item.classList.toggle('correct-selected', idx === optIdx);
      });
    });
  });

  // Add option to question
  document.querySelectorAll('.btn-add-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      window.soundFx.playClick();
      const qIdx = Number(e.currentTarget.dataset.q);
      state.builderQuestions[qIdx].options.push('');
      renderQuestionsBuilder();
    });
  });

  // Delete option from question
  document.querySelectorAll('.btn-delete-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      window.soundFx.playClick();
      const qIdx = Number(e.currentTarget.dataset.q);
      const optIdx = Number(e.currentTarget.dataset.opt);
      state.builderQuestions[qIdx].options.splice(optIdx, 1);
      if (state.builderQuestions[qIdx].correctAnswer >= state.builderQuestions[qIdx].options.length) {
        state.builderQuestions[qIdx].correctAnswer = 0;
      }
      renderQuestionsBuilder();
    });
  });

  // Delete question
  document.querySelectorAll('.btn-delete-question').forEach(btn => {
    btn.addEventListener('click', (e) => {
      window.soundFx.playClick();
      const qIdx = Number(e.currentTarget.dataset.q);
      state.builderQuestions.splice(qIdx, 1);
      renderQuestionsBuilder();
    });
  });
}

// Add new question card
elements.btnAddQuestion.addEventListener('click', () => {
  window.soundFx.playClick();
  state.builderQuestions.push({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  renderQuestionsBuilder();
  // Scroll to bottom of builder
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

// Submit Quiz Builder Form
elements.quizBuilderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!state.user.name) {
    openProfileModal(true);
    return;
  }

  const title = elements.quizTitleInput.value.trim();
  const description = elements.quizDescInput.value.trim();
  const timePerQuestion = Number(elements.quizTimerSelect.value);

  if (!title) {
    showToast('Judul kuis tidak boleh kosong!', 'error');
    elements.quizTitleInput.focus();
    return;
  }

  // Validate questions
  for (let i = 0; i < state.builderQuestions.length; i++) {
    const q = state.builderQuestions[i];
    if (!q.text.trim()) {
      showToast(`Tuliskan teks pertanyaan pada Soal #${i + 1}!`, 'error');
      return;
    }
    const emptyOpt = q.options.some(opt => !opt.trim());
    if (emptyOpt) {
      showToast(`Ada pilihan jawaban yang masih kosong pada Soal #${i + 1}!`, 'error');
      return;
    }
  }

  const payload = {
    title,
    description,
    timePerQuestion,
    questions: state.builderQuestions,
    creatorId: state.user.userId,
    creatorName: state.user.name
  };

  try {
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal membuat kuis.', 'error');
      return;
    }

    window.soundFx.playFanfare();
    showToast('Kuis berhasil dibuat dan diterbitkan! 🎉', 'success');

    // Reset Form
    elements.quizTitleInput.value = '';
    elements.quizDescInput.value = '';
    initQuizBuilderDefault();

    // Show Share Modal
    openShareModal(data.quizId, data.quiz.title);

    // Refresh my quizzes list
    loadMyQuizzes();

  } catch (err) {
    console.error('Error creating quiz:', err);
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
});

// Share Modal Helpers
function openShareModal(quizId, quizTitle) {
  const shareUrl = `${window.location.origin}/?quiz=${quizId}`;
  elements.shareLinkInput.value = shareUrl;

  // WhatsApp link
  const waText = encodeURIComponent(`Halo! Aku baru aja bikin kuis "${quizTitle}" di QuizLive. Coba kerjakan dan lihat skormu di sini: ${shareUrl}`);
  elements.btnWhatsappShare.onclick = () => {
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
  };

  // View as Creator button
  elements.btnViewAsCreator.onclick = () => {
    elements.modalShare.classList.remove('active');
    loadQuizById(quizId);
  };

  elements.modalShare.classList.add('active');
}

elements.btnCopyShareLink.addEventListener('click', () => {
  window.soundFx.playClick();
  navigator.clipboard.writeText(elements.shareLinkInput.value).then(() => {
    showToast('Link kuis berhasil disalin ke clipboard! 📋', 'success');
  }).catch(() => {
    elements.shareLinkInput.select();
    document.execCommand('copy');
    showToast('Link kuis berhasil disalin!', 'success');
  });
});

elements.modalShareClose.addEventListener('click', () => {
  elements.modalShare.classList.remove('active');
});

// Load My Quizzes
async function loadMyQuizzes() {
  try {
    const res = await fetch('/api/my-quizzes', {
      headers: { 'x-user-id': state.user.userId }
    });
    const data = await res.json();
    renderMyQuizzes(data.quizzes || []);
  } catch (err) {
    console.error('Failed to load my quizzes:', err);
  }
}

function renderMyQuizzes(quizzes) {
  // Render in My Quizzes tab
  elements.myQuizzesGrid.innerHTML = '';
  // Render recent 3 in Home tab
  elements.homeRecentQuizzesList.innerHTML = '';

  if (quizzes.length === 0) {
    const emptyHtml = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📭</div>
        <p>Kamu belum membuat kuis apapun.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="switchTab('create')">
          ➕ Buat Kuis Pertamamu
        </button>
      </div>`;
    elements.myQuizzesGrid.innerHTML = emptyHtml;
    elements.homeRecentQuizzesList.innerHTML = emptyHtml;
    return;
  }

  quizzes.forEach(q => {
    const card = createQuizCard(q);
    elements.myQuizzesGrid.appendChild(card);
  });

  // Recent 3 in home
  quizzes.slice(0, 3).forEach(q => {
    const card = createQuizCard(q);
    elements.homeRecentQuizzesList.appendChild(card);
  });
}

function createQuizCard(q) {
  const card = document.createElement('div');
  card.className = 'quiz-card';
  card.innerHTML = `
    <div>
      <div class="quiz-card-head">
        <h4 class="quiz-card-title">${escapeHtml(q.title)}</h4>
        <span class="quiz-badge">${q.questionCount} Soal</span>
      </div>
      <p class="quiz-card-desc">${escapeHtml(q.description || 'Tidak ada deskripsi.')}</p>
    </div>

    <div>
      <div class="quiz-card-stats">
        <span>👥 ${q.totalPlays} Orang Selesai</span>
        <span>📅 ${new Date(q.createdAt).toLocaleDateString('id-ID')}</span>
      </div>

      <div class="quiz-card-actions" style="margin-top: 0.85rem;">
        <button class="btn btn-primary btn-sm btn-open-creator-quiz" data-id="${q.id}" style="flex: 1;">
          📊 Pantau Hasil
        </button>
        <button class="btn btn-secondary btn-sm btn-card-share" data-id="${q.id}" data-title="${escapeHtml(q.title)}" title="Salin Link">
          🔗 Bagikan
        </button>
        <button class="btn btn-danger btn-sm btn-card-delete" data-id="${q.id}" title="Hapus Kuis">
          🗑️
        </button>
      </div>
    </div>
  `;

  // Bind buttons
  card.querySelector('.btn-open-creator-quiz').addEventListener('click', () => {
    loadQuizById(q.id);
  });

  card.querySelector('.btn-card-share').addEventListener('click', (e) => {
    e.stopPropagation();
    openShareModal(q.id, q.title);
  });

  card.querySelector('.btn-card-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`Yakin ingin menghapus kuis "${q.title}"?`)) {
      try {
        const res = await fetch(`/api/quizzes/${q.id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': state.user.userId }
        });
        if (res.ok) {
          showToast('Kuis berhasil dihapus.', 'info');
          loadMyQuizzes();
        }
      } catch (err) {
        showToast('Gagal menghapus kuis.', 'error');
      }
    }
  });

  return card;
}

// LOAD QUIZ BY ID (ROUTER / DISPATCHER)
async function loadQuizById(quizId) {
  try {
    const res = await fetch(`/api/quizzes/${quizId}`, {
      headers: { 'x-user-id': state.user.userId }
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Kuis tidak ditemukan.', 'error');
      switchTab('home');
      return;
    }

    const quiz = await res.json();
    state.currentQuiz = quiz;

    // Update URL without full refresh
    history.pushState(null, '', `?quiz=${quizId}`);

    // Join socket room to receive live updates
    socket.emit('quiz:join_room', quizId);

    // Switch to play view
    elements.tabBtns.forEach(b => b.classList.remove('active'));
    elements.tabViews.forEach(v => v.style.display = 'none');
    document.getElementById('view-play').style.display = 'block';

    // CHECK IF CURRENT USER IS CREATOR
    if (quiz.isCreator) {
      setupCreatorView(quiz);
    } else {
      setupPlayerIntroView(quiz);
    }

  } catch (err) {
    console.error('Error loading quiz:', err);
    showToast('Gagal memuat data kuis.', 'error');
    switchTab('home');
  }
}

// 1. SETUP CREATOR VIEW (BLOCKED FROM PLAYING)
function setupCreatorView(quiz) {
  elements.creatorBlockScreen.style.display = 'block';
  elements.playerIntroScreen.style.display = 'none';
  elements.playerGameScreen.style.display = 'none';
  elements.playerResultScreen.style.display = 'none';

  // Share button
  elements.btnShareCurrentQuiz.onclick = () => {
    openShareModal(quiz.id, quiz.title);
  };

  elements.btnBackToHomeFromCreator.onclick = () => {
    history.pushState(null, '', '/');
    switchTab('home');
  };

  // Populate leaderboard table
  renderCreatorLeaderboard(quiz.results || []);
}

function renderCreatorLeaderboard(results) {
  elements.creatorResultsTbody.innerHTML = '';
  if (!results || results.length === 0) {
    elements.creatorResultsTbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Belum ada teman yang menyelesaikan kuis ini. Kirim link-nya sekarang!
        </td>
      </tr>`;
    return;
  }

  results.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${idx + 1}</strong></td>
      <td><span style="font-weight: 700;">${escapeHtml(r.playerName)}</span></td>
      <td><span style="color: #34d399; font-weight: 700;">${r.score} / ${r.total}</span></td>
      <td><strong>${r.percentage}%</strong></td>
      <td>${r.timeSpent ? r.timeSpent + 's' : '-'}</td>
      <td style="color: var(--text-dim); font-size: 0.8rem;">${new Date(r.completedAt).toLocaleTimeString('id-ID')}</td>
    `;
    elements.creatorResultsTbody.appendChild(tr);
  });
}

function addOrUpdateCreatorLeaderboard(result) {
  if (!state.currentQuiz.results) state.currentQuiz.results = [];
  state.currentQuiz.results.unshift(result);
  renderCreatorLeaderboard(state.currentQuiz.results);
}

// 2. SETUP PLAYER INTRO VIEW
function setupPlayerIntroView(quiz) {
  elements.creatorBlockScreen.style.display = 'none';
  elements.playerIntroScreen.style.display = 'block';
  elements.playerGameScreen.style.display = 'none';
  elements.playerResultScreen.style.display = 'none';

  elements.playQuizTitle.textContent = quiz.title;
  elements.playQuizDesc.textContent = quiz.description || 'Siapkan dirimu dan jawab seluruh pertanyaan dengan tepat!';
  elements.playQuizCreator.textContent = quiz.creatorName || 'Anonim';
  elements.playQuizTotalQ.textContent = `${quiz.questions.length} Soal`;
  elements.playQuizTimerInfo.textContent = quiz.timePerQuestion > 0 ? `${quiz.timePerQuestion} detik/soal` : 'Tanpa batas waktu';

  elements.playerScreenNameInput.value = state.user.name;
  elements.playerScreenAvatar.textContent = state.user.avatar;

  // Start Playing button
  elements.btnStartQuizPlaying.onclick = () => {
    const playerName = elements.playerScreenNameInput.value.trim();
    if (!playerName) {
      showToast('Masukkan nama panggilanmu terlebih dahulu!', 'error');
      elements.playerScreenNameInput.focus();
      return;
    }

    state.user.name = playerName;
    localStorage.setItem('quiz_user_name', playerName);
    updateProfileUI();

    startQuizGame();
  };
}

// 3. START QUIZ GAME RUNNER
function startQuizGame() {
  window.soundFx.playClick();
  state.activeQuestionIndex = 0;
  state.playerAnswers = {};
  state.quizStartTime = Date.now();

  elements.playerIntroScreen.style.display = 'none';
  elements.playerGameScreen.style.display = 'block';

  // Broadcast activity status
  socket.emit('user:status', `Sedang Mengerjakan Kuis: ${state.currentQuiz.title}`);

  loadQuestion(0);
}

function loadQuestion(index) {
  clearInterval(state.questionTimer);

  const questions = state.currentQuiz.questions;
  const currentQ = questions[index];

  elements.gameCurrentQIndex.textContent = index + 1;
  elements.gameTotalQCount.textContent = questions.length;

  const progressPercent = ((index) / questions.length) * 100;
  elements.gameProgressBar.style.width = `${progressPercent}%`;

  elements.gameQuestionText.textContent = currentQ.text;
  elements.gameHintText.textContent = 'Pilih salah satu jawaban di atas';
  elements.btnGameNext.style.display = 'none';

  // Options
  elements.gameOptionsContainer.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  currentQ.options.forEach((optText, optIdx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-opt-btn';
    btn.innerHTML = `
      <span class="opt-letter">${letters[optIdx]}</span>
      <span style="flex: 1;">${escapeHtml(optText)}</span>
    `;

    btn.addEventListener('click', () => {
      window.soundFx.playSelect();
      selectAnswer(index, optIdx, btn);
    });

    elements.gameOptionsContainer.appendChild(btn);
  });

  // Setup Timer if enabled
  const timeLimit = state.currentQuiz.timePerQuestion;
  if (timeLimit > 0) {
    elements.gameTimerPill.style.display = 'inline-flex';
    elements.gameTimerPill.classList.remove('urgent');
    state.questionTimeRemaining = timeLimit;
    elements.gameTimerSeconds.textContent = `${state.questionTimeRemaining}s`;

    state.questionTimer = setInterval(() => {
      state.questionTimeRemaining--;
      elements.gameTimerSeconds.textContent = `${state.questionTimeRemaining}s`;

      if (state.questionTimeRemaining <= 5) {
        elements.gameTimerPill.classList.add('urgent');
        window.soundFx.playTick();
      }

      if (state.questionTimeRemaining <= 0) {
        clearInterval(state.questionTimer);
        // Time expired: auto-advance
        showToast('Waktu habis untuk pertanyaan ini!', 'error');
        window.soundFx.playWrong();
        handleNextQuestion();
      }
    }, 1000);
  } else {
    elements.gameTimerPill.style.display = 'none';
  }
}

function selectAnswer(qIndex, optionIndex, selectedBtn) {
  // Save answer
  state.playerAnswers[qIndex] = optionIndex;

  // Highlight selected button
  elements.gameOptionsContainer.querySelectorAll('.answer-opt-btn').forEach(b => {
    b.classList.remove('selected');
  });
  selectedBtn.classList.add('selected');

  elements.gameHintText.textContent = 'Jawaban tersimpan! Klik selanjutnya.';
  elements.btnGameNext.style.display = 'inline-flex';

  // Auto advance with smooth slight delay
  setTimeout(() => {
    handleNextQuestion();
  }, 450);
}

elements.btnGameNext.addEventListener('click', () => {
  window.soundFx.playClick();
  handleNextQuestion();
});

function handleNextQuestion() {
  clearInterval(state.questionTimer);
  const nextIdx = state.activeQuestionIndex + 1;

  if (nextIdx < state.currentQuiz.questions.length) {
    state.activeQuestionIndex = nextIdx;
    loadQuestion(nextIdx);
  } else {
    // Finish Quiz
    finishAndSubmitQuiz();
  }
}

// 4. SUBMIT QUIZ & DISPLAY RESULTS
async function finishAndSubmitQuiz() {
  clearInterval(state.questionTimer);
  elements.gameProgressBar.style.width = '100%';

  const totalTimeSpentSeconds = Math.round((Date.now() - state.quizStartTime) / 1000);

  const payload = {
    userId: state.user.userId,
    playerName: state.user.name,
    answers: state.playerAnswers,
    timeSpent: totalTimeSpentSeconds
  };

  try {
    const res = await fetch(`/api/quizzes/${state.currentQuiz.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal mengirim jawaban.', 'error');
      return;
    }

    // Broadcast activity status back to lobby
    socket.emit('user:status', `Selesai Kuis: ${state.currentQuiz.title}`);

    // Show result view
    elements.playerGameScreen.style.display = 'none';
    elements.playerResultScreen.style.display = 'block';

    renderResultView(data);

  } catch (err) {
    console.error('Error submitting quiz:', err);
    showToast('Terjadi kesalahan saat mengirim jawaban.', 'error');
  }
}

function renderResultView(data) {
  // Celebration Confetti
  if (window.confetti) {
    window.confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  window.soundFx.playFanfare();

  elements.resultScoreNumber.textContent = `${data.score}/${data.total}`;
  elements.resultPercentNumber.textContent = `${data.percentage}% Benar`;

  if (data.percentage >= 80) {
    elements.resultEmoji.textContent = '🏆';
    elements.resultTitle.textContent = 'Luar Biasa!';
    elements.resultSubtitle.textContent = 'Kamu menjawab hampir semua soal dengan tepat!';
  } else if (data.percentage >= 50) {
    elements.resultEmoji.textContent = '🎉';
    elements.resultTitle.textContent = 'Bagus Sekali!';
    elements.resultSubtitle.textContent = 'Hasil yang cukup memuaskan!';
  } else {
    elements.resultEmoji.textContent = '💪';
    elements.resultTitle.textContent = 'Tetap Semangat!';
    elements.resultSubtitle.textContent = 'Jangan menyerah, coba lagi kuis lainnya!';
  }

  // Answer Breakdown Review
  elements.resultBreakdownList.innerHTML = '';
  data.breakdown.forEach((item, idx) => {
    const div = document.createElement('div');
    div.style.cssText = `
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      background: ${item.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'};
      border: 1px solid ${item.isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'};
    `;
    div.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.3rem; color: #fff;">
        ${item.isCorrect ? '✅' : '❌'} #${idx + 1}. ${escapeHtml(item.questionText)}
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted);">
        Jawaban Kamu: <strong style="color: ${item.isCorrect ? '#34d399' : '#fb7185'};">${escapeHtml(item.playerAnswer || 'Tidak Menjawab')}</strong>
        ${!item.isCorrect ? `<br>Jawaban Benar: <strong style="color: #34d399;">${escapeHtml(item.correctAnswer)}</strong>` : ''}
      </div>
    `;
    elements.resultBreakdownList.appendChild(div);
  });

  // Leaderboard
  elements.resultLeaderboardTbody.innerHTML = '';
  (data.leaderboard || []).forEach((r, idx) => {
    let medal = `#${idx + 1}`;
    if (idx === 0) medal = '🥇 1';
    if (idx === 1) medal = '🥈 2';
    if (idx === 2) medal = '🥉 3';

    const isCurrent = r.playerName === state.user.name;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${medal}</strong></td>
      <td><strong>${escapeHtml(r.playerName)}</strong> ${isCurrent ? '<span style="font-size: 0.7rem; background: var(--primary); padding: 0.1rem 0.3rem; border-radius: 4px;">Kamu</span>' : ''}</td>
      <td><span style="color: #34d399; font-weight: 700;">${r.score}/${r.total}</span></td>
      <td>${r.percentage}%</td>
      <td>${r.timeSpent ? r.timeSpent + 's' : '-'}</td>
    `;
    elements.resultLeaderboardTbody.appendChild(tr);
  });
}

// Toggle Review Section
elements.btnResultReviewToggle.addEventListener('click', () => {
  window.soundFx.playClick();
  const isHidden = elements.resultReviewSection.style.display === 'none';
  elements.resultReviewSection.style.display = isHidden ? 'block' : 'none';
  elements.btnResultReviewToggle.innerHTML = isHidden ? '<span>📋</span> Sembunyikan Pembahasan' : '<span>📋</span> Lihat Pembahasan Soal';
});

elements.btnResultCreateOwn.addEventListener('click', () => {
  history.pushState(null, '', '/');
  switchTab('create');
});

elements.btnResultHome.addEventListener('click', () => {
  history.pushState(null, '', '/');
  switchTab('home');
});

// EVENT BINDINGS
function bindEvents() {
  // Logo click -> home
  elements.logoHomeBtn.addEventListener('click', () => {
    history.pushState(null, '', '/');
    switchTab('home');
  });

  // Online pill click -> online tab
  elements.onlinePillBtn.addEventListener('click', () => {
    switchTab('online');
  });

  // Profile modal
  elements.profileBadgeBtn.addEventListener('click', () => {
    window.soundFx.playClick();
    openProfileModal(false);
  });

  elements.modalProfileClose.addEventListener('click', () => {
    elements.modalProfile.classList.remove('active');
  });

  elements.btnSaveProfile.addEventListener('click', saveUserProfile);

  elements.profileNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveUserProfile();
    }
  });

  // Hero buttons
  elements.heroCreateBtn.addEventListener('click', () => switchTab('create'));
  elements.heroViewOnlineBtn.addEventListener('click', () => switchTab('online'));
  elements.btnSeeAllMyQuizzes.addEventListener('click', () => switchTab('my-quizzes'));
  elements.emptyStateCreateBtn.addEventListener('click', () => switchTab('create'));
  elements.btnCreateQuizShortcut.addEventListener('click', () => switchTab('create'));

  // Close modals on overlay background click
  window.addEventListener('click', (e) => {
    if (e.target === elements.modalProfile && elements.modalProfileClose.style.display !== 'none') {
      elements.modalProfile.classList.remove('active');
    }
    if (e.target === elements.modalShare) {
      elements.modalShare.classList.remove('active');
    }
  });

  // Handle browser back / forward buttons
  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz');
    if (quizId) {
      loadQuizById(quizId);
    } else {
      switchTab('home');
    }
  });
}

// Utility: HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
