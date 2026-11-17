
let activeCourseObj = COURSE_BANKS_DATA[activeCourseId];
hydrateCourseData(activeCourseObj);
const QUESTIONS_BANK = (activeCourseObj.questions || []).map(cloneQuestionFast);

const DEFAULT_SUBJECT_CONFIG = {
  subjectName: activeCourseObj.subjectName,
  subtitle: activeCourseObj.subtitle,
  icon: activeCourseObj.icon,
  year: activeCourseObj.year,
  storageNamespace: activeCourseObj.storageNamespace
};
let activeSubjectConfig = Object.assign({}, DEFAULT_SUBJECT_CONFIG);

let ORIGINAL_BANK_SNAPSHOT = (activeCourseObj.questions || []).map(cloneQuestionFast);
let BUILTIN_STEM_CLUSTERS = JSON.parse(JSON.stringify(activeCourseObj.clusters || {}));

let STORAGE_KEY = activeSubjectConfig.storageNamespace + '_progress';
let PROFILES_REGISTRY_KEY = activeSubjectConfig.storageNamespace + '_profiles';
let CLOUD_VAULT_KEY = activeSubjectConfig.storageNamespace + '_cloud_vault';
const EDIT_HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Lưu tối đa 7 ngày
let userProgress = {
  answers: {},
  bookmarks: {},
  flashcards: {},
  sessions: [],
  profile: {
    name: 'Sinh viên Y khoa ĐHYHN',
    studentId: 'K119 - Bác sĩ Đa khoa',
    targetScore: 8.5,
    examDate: '2026-11-15',
    goalNote: 'Nắm vững triệu chứng, cận lâm sàng và phác đồ Bộ Y tế cho 11 chủ đề Truyền nhiễm.'
  },
  customQuestions: [],
  editedQuestions: {},
  questionEditHistory: {},
  inlineComments: {},
  inlineHighlights: {},
  stemGroups: {},
  questionStemMap: {},
  unlinkedStemQuestions: {},
  stemPenaltyConfig: {
    enabled: true,
    wrongDeductionFactor: 0.5,
    clusterExtraPenalty: 0.25
  },
  cloudSync: {
    provider: 'local',
    email: '',
    displayName: '',
    autoSync: true,
    lastSyncAt: '',
    syncLogs: []
  }
};
let profilesRegistry = {
  activeProfileId: 'prof_default',
  profiles: {}
};
const tabScrollPositions = { study: 0, exam: 0, flashcard: 0, analytics: 0, user: 0, manage: 0, guide: 0 };
const tabInnerScrollPositions = { study: {}, exam: {}, flashcard: {}, analytics: {}, user: {}, manage: {}, guide: {} };
let isRestoringTabScroll = false;
let pendingSelectionInfo = null;
let activeComposerState = { qId: null, commentId: null, quote: '', color: 'hl-yellow', manualMode: false };
let activeViewerState = { qId: null, commentId: null, overlapHlId: null };
let activeHighlightState = { qId: null, hlId: null };
let qmDraftMedia = [];

let currentTab = 'study';
let showAllExplanations = false;
let studyHintOpen = {};
let studyExpOpen = {};
let globalSessionSeconds = 0;
let globalTimerInterval = null;
let fcList = [];
let fcCurrentIndex = 0;
let fcIsFlipped = false;
let fcHintVisible = false;
let examState = {
  active: false, paused: false, submitted: false, title: '', questions: [],
  currentIndex: 0, userAnswers: {}, flagged: {}, hintsShown: {}, allowHints: true,
  durationSec: 1800, remainingSec: 1800, elapsedSec: 0, timerId: null, reviewFilter: 'all'
};
let modalCallback = null;
let toastTimeout = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      userProgress.answers = parsed.answers || {};
      userProgress.bookmarks = parsed.bookmarks || {};
      userProgress.flashcards = parsed.flashcards || {};
      userProgress.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      if (parsed.profile && typeof parsed.profile === 'object') {
        userProgress.profile = Object.assign({}, userProgress.profile, parsed.profile);
      }
      userProgress.customQuestions = Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [];
      userProgress.editedQuestions = (parsed.editedQuestions && typeof parsed.editedQuestions === 'object') ? parsed.editedQuestions : {};
      userProgress.inlineComments = (parsed.inlineComments && typeof parsed.inlineComments === 'object') ? parsed.inlineComments : {};
      userProgress.inlineHighlights = (parsed.inlineHighlights && typeof parsed.inlineHighlights === 'object') ? parsed.inlineHighlights : {};
      userProgress.stemGroups = (parsed.stemGroups && typeof parsed.stemGroups === 'object') ? parsed.stemGroups : {};
      userProgress.questionStemMap = (parsed.questionStemMap && typeof parsed.questionStemMap === 'object') ? parsed.questionStemMap : {};
      userProgress.unlinkedStemQuestions = (parsed.unlinkedStemQuestions && typeof parsed.unlinkedStemQuestions === 'object') ? parsed.unlinkedStemQuestions : {};
      userProgress.questionEditHistory = (parsed.questionEditHistory && typeof parsed.questionEditHistory === 'object') ? parsed.questionEditHistory : {};
      if (parsed.stemPenaltyConfig && typeof parsed.stemPenaltyConfig === 'object') {
        userProgress.stemPenaltyConfig = Object.assign({}, userProgress.stemPenaltyConfig, parsed.stemPenaltyConfig);
      }
      if (parsed.cloudSync && typeof parsed.cloudSync === 'object') {
        userProgress.cloudSync = Object.assign({}, userProgress.cloudSync, parsed.cloudSync);
      }
    }
  } catch (e) {}
  pruneExpiredEditHistory(false);
  initProfilesRegistryAfterLoad();
  syncQuestionsBankWithCustomizations();
}

function ensureStemGroupsInitialized() {
  if (!userProgress.stemGroups) userProgress.stemGroups = {};
  if (!userProgress.questionStemMap) userProgress.questionStemMap = {};
  if (!userProgress.unlinkedStemQuestions) userProgress.unlinkedStemQuestions = {};
  Object.keys(BUILTIN_STEM_CLUSTERS).forEach(cid => {
    const b = BUILTIN_STEM_CLUSTERS[cid];
    if (!userProgress.stemGroups[cid]) {
      userProgress.stemGroups[cid] = {
        id: b.id,
        title: b.title,
        vignette: b.vignette
      };
    }
    b.qIds.forEach(qid => {
      if (!userProgress.unlinkedStemQuestions[qid] && !userProgress.questionStemMap[qid]) {
        userProgress.questionStemMap[qid] = cid;
      }
    });
  });
}

function syncQuestionsBankWithCustomizations() {
  ensureStemGroupsInitialized();
  QUESTIONS_BANK.length = 0;
  ORIGINAL_BANK_SNAPSHOT.forEach(orig => {
    let item = Object.assign({}, orig);
    if (userProgress.editedQuestions && userProgress.editedQuestions[orig.id]) {
      item = Object.assign(item, userProgress.editedQuestions[orig.id], { is_edited: true });
    }
    QUESTIONS_BANK.push(item);
  });
  if (Array.isArray(userProgress.customQuestions)) {
    userProgress.customQuestions.forEach((cq, idx) => {
      const item = Object.assign({}, cq, {
        num: ORIGINAL_BANK_SNAPSHOT.length + idx + 1,
        is_custom: true
      });
      QUESTIONS_BANK.push(item);
    });
  }
  // Attach shared-stem metadata and media array
  const stemCounts = {};
  QUESTIONS_BANK.forEach(q => {
    if (!Array.isArray(q.media)) q.media = [];
    const mappedStemId = userProgress.unlinkedStemQuestions[q.id]
      ? ''
      : (userProgress.questionStemMap[q.id] || q.stem_id || '');
    if (mappedStemId && userProgress.stemGroups[mappedStemId]) {
      q.stem_id = mappedStemId;
      q.stem_title = userProgress.stemGroups[mappedStemId].title || mappedStemId;
      q.stem_vignette = userProgress.stemGroups[mappedStemId].vignette || '';
      if (!stemCounts[mappedStemId]) stemCounts[mappedStemId] = [];
      stemCounts[mappedStemId].push(q.id);
    } else {
      q.stem_id = '';
      q.stem_title = '';
      q.stem_vignette = '';
    }
  });
  // Only mark as active shared-stem if at least 1 question is linked to a valid stem group
  QUESTIONS_BANK.forEach(q => {
    if (q.stem_id && stemCounts[q.stem_id]) {
      q.stem_siblings = stemCounts[q.stem_id];
      q.stem_index = stemCounts[q.stem_id].indexOf(q.id) + 1;
      q.stem_total = stemCounts[q.stem_id].length;
    } else {
      q.stem_siblings = [];
      q.stem_index = 0;
      q.stem_total = 0;
    }
  });
  const hdrBadge = document.getElementById('headerTotalQuestionsBadge');
  if (hdrBadge) hdrBadge.textContent = QUESTIONS_BANK.length + ' Câu Hỏi Chuẩn Hóa';
  populateStemIdDatalist();
}

function populateStemIdDatalist() {
  const dl = document.getElementById('qmStemIdDatalist');
  if (!dl || !userProgress.stemGroups) return;
  dl.innerHTML = Object.keys(userProgress.stemGroups).map(sid => {
    const g = userProgress.stemGroups[sid];
    return '<option value="' + escapeHtml(sid) + '">' + escapeHtml(g.title || sid) + '</option>';
  }).join('');
}

function saveProgress() {
  pruneExpiredEditHistory(false);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
    syncCurrentProgressIntoActiveProfileRegistry();
  } catch (e) {}
}

function pruneExpiredEditHistory(showNotification) {
  if (!userProgress.questionEditHistory || typeof userProgress.questionEditHistory !== 'object') {
    userProgress.questionEditHistory = {};
    return 0;
  }
  const now = Date.now();
  let removedCount = 0;
  Object.keys(userProgress.questionEditHistory).forEach(qId => {
    const list = userProgress.questionEditHistory[qId];
    if (!Array.isArray(list)) {
      delete userProgress.questionEditHistory[qId];
      return;
    }
    const valid = list.filter(entry => {
      const ts = entry && entry.timestampMs ? Number(entry.timestampMs) : now;
      const keep = (now - ts) <= EDIT_HISTORY_TTL_MS;
      if (!keep) removedCount++;
      return keep;
    });
    if (valid.length > 0) userProgress.questionEditHistory[qId] = valid;
    else delete userProgress.questionEditHistory[qId];
  });
  if (showNotification) {
    if (currentTab === 'manage') renderManageQuestionsList();
    showToast(removedCount > 0 ? ('Đã dọn dẹp ' + removedCount + ' bản ghi lịch sử chỉnh sửa quá hạn 7 ngày!') : 'Tất cả bản ghi lịch sử chỉnh sửa đều còn trong thời hạn 7 ngày!');
  }
  return removedCount;
}

function formatRemainingTtl7Days(timestampMs) {
  const elapsed = Math.max(0, Date.now() - (Number(timestampMs) || Date.now()));
  const remainMs = Math.max(0, EDIT_HISTORY_TTL_MS - elapsed);
  const totalHours = Math.floor(remainMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return 'Còn ' + days + ' ngày ' + hours + 'h';
  const mins = Math.max(1, Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60)));
  return 'Còn ' + hours + 'h ' + mins + 'p';
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const toast = document.getElementById('appToast');
  const text = document.getElementById('toastText');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.classList.add('hidden'); }, 2800);
}

function openAppModal(title, message, onConfirm) {
  const modal = document.getElementById('appModal');
  const tEl = document.getElementById('modalTitle');
  const mEl = document.getElementById('modalMessage');
  const btn = document.getElementById('modalConfirmBtn');
  if (!modal || !tEl || !mEl || !btn) return;
  tEl.textContent = title;
  mEl.textContent = message;
  modalCallback = onConfirm;
  btn.onclick = function () {
    const cb = modalCallback;
    closeAppModal();
    if (typeof cb === 'function') cb();
  };
  modal.classList.remove('hidden');
}

function closeAppModal() {
  const modal = document.getElementById('appModal');
  if (modal) modal.classList.add('hidden');
  modalCallback = null;
}

function startGlobalSessionClock() {
  if (globalTimerInterval) clearInterval(globalTimerInterval);
  globalTimerInterval = setInterval(() => {
    globalSessionSeconds++;
    const el = document.getElementById('sessionTimerDisplay');
    if (el) el.textContent = formatTime(globalSessionSeconds);
  }, 1000);
}

function updateTopStats() {
  const total = QUESTIONS_BANK.length;
  let done = 0, correct = 0, wrong = 0;
  for (const q of QUESTIONS_BANK) {
    if (userProgress.answers.hasOwnProperty(q.id)) {
      done++;
      if (userProgress.answers[q.id] === q.correct_idx) correct++;
      else wrong++;
    }
  }
  const acc = done > 0 ? Math.round((correct / done) * 100) : 0;
  const bCount = Object.keys(userProgress.bookmarks).filter(k => userProgress.bookmarks[k]).length;
  document.getElementById('statTotalDone').textContent = done + '/' + total;
  document.getElementById('statTotalCorrect').textContent = String(correct);
  document.getElementById('statTotalWrong').textContent = String(wrong);
  document.getElementById('statAccuracyPct').textContent = acc + '%';
  document.getElementById('statBookmarked').textContent = String(bCount);
  let cmtCount = 0;
  if (userProgress.inlineComments) {
    Object.keys(userProgress.inlineComments).forEach(k => {
      if (Array.isArray(userProgress.inlineComments[k])) cmtCount += userProgress.inlineComments[k].length;
    });
  }
  const cmtEl = document.getElementById('statInlineComments');
  if (cmtEl) cmtEl.textContent = String(cmtCount);

  let hlCount = 0;
  if (userProgress.inlineHighlights) {
    Object.keys(userProgress.inlineHighlights).forEach(k => {
      if (Array.isArray(userProgress.inlineHighlights[k])) hlCount += userProgress.inlineHighlights[k].length;
    });
  }
  const hlEl = document.getElementById('statInlineHighlights');
  if (hlEl) hlEl.textContent = String(hlCount);

  // Calculate stem-adjusted score for answered questions in Study mode
  const answeredPool = QUESTIONS_BANK.filter(q => userProgress.answers.hasOwnProperty(q.id));
  const calc = calculateScoreWithStemPenalty(answeredPool, userProgress.answers);
  const adjEl = document.getElementById('statStemAdjustedScore');
  const penEl = document.getElementById('statStemPenaltyInfo');
  if (adjEl) adjEl.textContent = calc.adjustedScore10 + '/10';
  if (penEl) {
    penEl.textContent = calc.penaltyScore10 > 0
      ? '(-' + calc.penaltyScore10.toFixed(2) + 'đ do sai ' + calc.stemWrongCount + ' câu thân chung)'
      : '(Không bị trừ)';
  }
  syncExamStemPenaltyInputsUI();
}

function calculateScoreWithStemPenalty(questionsPool, answersMap) {
  const total = questionsPool.length;
  if (total === 0) {
    return {
      total: 0, correct: 0, wrong: 0,
      stemTotal: 0, stemCorrect: 0, stemWrongCount: 0, penalizedClustersCount: 0,
      rawUnits: 0, penaltyUnits: 0, netUnits: 0,
      rawScore10: '0.00', penaltyScore10: 0, adjustedScore10: '0.00'
    };
  }
  const cfg = userProgress.stemPenaltyConfig || { enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 };
  const wrongFactor = cfg.enabled ? Math.max(0, parseFloat(cfg.wrongDeductionFactor) || 0) : 0;
  const clusterFine = cfg.enabled ? Math.max(0, parseFloat(cfg.clusterExtraPenalty) || 0) : 0;

  let correct = 0, wrong = 0;
  let stemTotal = 0, stemCorrect = 0, stemWrongCount = 0;
  const clusterWrongMap = {};

  questionsPool.forEach(q => {
    const hasAns = answersMap && answersMap.hasOwnProperty(q.id) && answersMap[q.id] !== null && answersMap[q.id] !== undefined;
    const isCorr = hasAns && answersMap[q.id] === q.correct_idx;
    const isStem = !!(q.stem_id && q.stem_total > 1);
    if (isStem) stemTotal++;

    if (isCorr) {
      correct++;
      if (isStem) stemCorrect++;
    } else if (hasAns) {
      wrong++;
      if (isStem) {
        stemWrongCount++;
        clusterWrongMap[q.stem_id] = (clusterWrongMap[q.stem_id] || 0) + 1;
      }
    } else {
      // Unanswered in a submitted exam counts as wrong; if it's a stem question in exam submission, check if we count unanswered or only wrong selections
      wrong++;
      if (isStem && examState && examState.submitted && questionsPool === examState.questions) {
        stemWrongCount++;
        clusterWrongMap[q.stem_id] = (clusterWrongMap[q.stem_id] || 0) + 1;
      }
    }
  });

  let penalizedClustersCount = 0;
  Object.keys(clusterWrongMap).forEach(cid => {
    if (clusterWrongMap[cid] >= 2) penalizedClustersCount++;
  });

  const rawUnits = correct; // Correct answers in stem questions still earn +1 normal point
  const penaltyUnits = (stemWrongCount * wrongFactor) + (penalizedClustersCount * clusterFine);
  const netUnits = Math.max(0, rawUnits - penaltyUnits);

  const rawScore10Num = (rawUnits / total) * 10;
  const penaltyScore10Num = (penaltyUnits / total) * 10;
  const adjustedScore10Num = Math.max(0, rawScore10Num - penaltyScore10Num);

  return {
    total: total,
    correct: correct,
    wrong: wrong,
    stemTotal: stemTotal,
    stemCorrect: stemCorrect,
    stemWrongCount: stemWrongCount,
    penalizedClustersCount: penalizedClustersCount,
    rawUnits: rawUnits,
    penaltyUnits: penaltyUnits,
    netUnits: netUnits,
    rawScore10: rawScore10Num.toFixed(2),
    penaltyScore10: penaltyScore10Num,
    adjustedScore10: adjustedScore10Num.toFixed(2)
  };
}

function syncExamStemPenaltyInputsUI() {
  const cfg = userProgress.stemPenaltyConfig || { enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 };
  const chk = document.getElementById('examStemPenaltyEnable');
  const wf = document.getElementById('examStemWrongFactor');
  const cf = document.getElementById('examStemClusterFine');
  if (chk) chk.checked = !!cfg.enabled;
  if (wf) wf.value = cfg.wrongDeductionFactor;
  if (cf) cf.value = cfg.clusterExtraPenalty;
}

function syncStemPenaltyFromExamInputs() {
  const chk = document.getElementById('examStemPenaltyEnable');
  const wf = document.getElementById('examStemWrongFactor');
  const cf = document.getElementById('examStemClusterFine');
  userProgress.stemPenaltyConfig = {
    enabled: chk ? !!chk.checked : true,
    wrongDeductionFactor: wf ? Math.max(0, parseFloat(wf.value) || 0) : 0.5,
    clusterExtraPenalty: cf ? Math.max(0, parseFloat(cf.value) || 0) : 0.25
  };
  saveProgress();
  updateTopStats();
  if (currentTab === 'study') applyStudyFilters();
  showToast('Đã cập nhật mức điểm trừ & phạt câu hỏi thân chung!');
}

function openStemPenaltySettingsModal() {
  const cfg = userProgress.stemPenaltyConfig || { enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 };
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  titleEl.textContent = '⚖️ Cấu hình Điểm trừ & Mức phạt Câu hỏi Thân chung (Case lâm sàng)';
  bodyEl.innerHTML = '<div class="space-y-4">' +
    '<div class="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 leading-relaxed">' +
      '<strong>Nguyên tắc tính điểm Câu hỏi thân chung:</strong><br/>' +
      '• Khi trả lời <strong>ĐÚNG</strong> câu hỏi thuộc chùm thân chung: Vẫn được tính điểm đầy đủ như bình thường (<strong>+1.0 đơn vị câu</strong>).<br/>' +
      '• Khi trả lời <strong>SAI</strong> câu hỏi trong chùm thân chung: Sẽ bị trừ điểm theo hệ số điểm trừ bên dưới, kèm mức phạt bổ sung nếu sai từ 2 câu trở lên trong cùng 1 bệnh án thân chung.' +
    '</div>' +
    '<label class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer">' +
      '<input type="checkbox" id="modalStemPenaltyEnabled" ' + (cfg.enabled ? 'checked' : '') + ' class="w-4 h-4 rounded text-teal-700" />' +
      '<span>Bật chế độ trừ điểm khi làm sai câu hỏi thân chung</span>' +
    '</label>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      '<div class="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1.5">' +
        '<label class="block text-xs font-bold text-rose-950">Mức điểm trừ cho mỗi câu thân chung làm SAI (Hệ số so với 1 câu):</label>' +
        '<input type="number" id="modalStemWrongFactor" step="0.05" min="0" max="5" value="' + cfg.wrongDeductionFactor + '" class="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-bold text-rose-900" />' +
        '<div class="flex flex-wrap gap-1 pt-1">' +
          '<button type="button" onclick="document.getElementById(\'modalStemWrongFactor\').value=\'0.25\'" class="px-2 py-0.5 rounded bg-white border border-rose-200 text-[11px] font-semibold text-rose-800 hover:bg-rose-100">-25% (0.25)</button>' +
          '<button type="button" onclick="document.getElementById(\'modalStemWrongFactor\').value=\'0.5\'" class="px-2 py-0.5 rounded bg-white border border-rose-200 text-[11px] font-semibold text-rose-800 hover:bg-rose-100">-50% (0.5)</button>' +
          '<button type="button" onclick="document.getElementById(\'modalStemWrongFactor\').value=\'1.0\'" class="px-2 py-0.5 rounded bg-white border border-rose-200 text-[11px] font-semibold text-rose-800 hover:bg-rose-100">-100% (1.0)</button>' +
        '</div>' +
      '</div>' +
      '<div class="p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">' +
        '<label class="block text-xs font-bold text-amber-950">Mức phạt bổ sung khi sai ≥ 2 câu trong cùng 1 chùm Case:</label>' +
        '<input type="number" id="modalStemClusterFine" step="0.05" min="0" max="5" value="' + cfg.clusterExtraPenalty + '" class="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-900" />' +
        '<div class="flex flex-wrap gap-1 pt-1">' +
          '<button type="button" onclick="document.getElementById(\'modalStemClusterFine\').value=\'0\'" class="px-2 py-0.5 rounded bg-white border border-amber-200 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">Không phạt thêm (0)</button>' +
          '<button type="button" onclick="document.getElementById(\'modalStemClusterFine\').value=\'0.25\'" class="px-2 py-0.5 rounded bg-white border border-amber-200 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">Phạt 0.25 câu</button>' +
          '<button type="button" onclick="document.getElementById(\'modalStemClusterFine\').value=\'0.5\'" class="px-2 py-0.5 rounded bg-white border border-amber-200 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">Phạt 0.5 câu</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  footerEl.innerHTML = '<button type="button" onclick="saveStemPenaltySettingsFromModal()" class="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold">💾 Lưu cấu hình điểm trừ</button>' +
    '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function saveStemPenaltySettingsFromModal() {
  const en = document.getElementById('modalStemPenaltyEnabled');
  const wf = document.getElementById('modalStemWrongFactor');
  const cf = document.getElementById('modalStemClusterFine');
  userProgress.stemPenaltyConfig = {
    enabled: en ? !!en.checked : true,
    wrongDeductionFactor: wf ? Math.max(0, parseFloat(wf.value) || 0) : 0.5,
    clusterExtraPenalty: cf ? Math.max(0, parseFloat(cf.value) || 0) : 0.25
  };
  saveProgress();
  updateTopStats();
  if (currentTab === 'study') applyStudyFilters();
  closeCustomDataModal();
  showToast('Đã lưu cài đặt mức điểm trừ & phạt câu hỏi thân chung!');
}

function saveCurrentTabScrollState() {
  if (!currentTab || isRestoringTabScroll) return;
  const curView = document.getElementById('view-' + currentTab);
  if (curView && !curView.classList.contains('hidden')) {
    tabScrollPositions[currentTab] = window.scrollY || document.documentElement.scrollTop || 0;
    if (!tabInnerScrollPositions[currentTab]) tabInnerScrollPositions[currentTab] = {};
    curView.querySelectorAll('[id]').forEach(el => {
      if (el.scrollTop > 0 || tabInnerScrollPositions[currentTab][el.id] !== undefined) {
        tabInnerScrollPositions[currentTab][el.id] = el.scrollTop;
      }
    });
    try {
      sessionStorage.setItem('hmu_tab_scroll_positions_v1', JSON.stringify(tabScrollPositions));
    } catch (e) {}
  }
}

function restoreTabScrollState(tabName) {
  const targetY = Number(tabScrollPositions[tabName]) || 0;
  const innerMap = tabInnerScrollPositions[tabName] || {};
  const applyScroll = function () {
    window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
    Object.keys(innerMap).forEach(elId => {
      const el = document.getElementById(elId);
      if (el) el.scrollTop = innerMap[elId];
    });
  };
  applyScroll();
  requestAnimationFrame(() => {
    applyScroll();
    setTimeout(() => {
      applyScroll();
      isRestoringTabScroll = false;
    }, 35);
  });
}

window.addEventListener('scroll', function () {
  if (!isRestoringTabScroll && currentTab) {
    tabScrollPositions[currentTab] = window.scrollY || document.documentElement.scrollTop || 0;
  }
}, { passive: true });

function switchTab(tabName, skipScrollRestore) {
  saveCurrentTabScrollState();
  isRestoringTabScroll = true;
  currentTab = tabName;
  closeDocCommentViewer();
  closeDocHighlightViewer();
  closeDocCommentComposer();
  ['study', 'exam', 'flashcard', 'analytics', 'user', 'manage', 'guide'].forEach(t => {
    const view = document.getElementById('view-' + t);
    const btn = document.getElementById('tabBtn-' + t);
    if (view) {
      if (t === tabName) view.classList.remove('hidden');
      else view.classList.add('hidden');
    }
    if (btn) {
      btn.className = (t === tabName)
        ? 'tab-btn px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap bg-white text-teal-900 shadow-sm'
        : 'tab-btn px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap bg-white/10 text-white hover:bg-white/20';
    }
  });
  if (tabName === 'study') applyStudyFilters();
  else if (tabName === 'flashcard') applyFlashcardFilters();
  else if (tabName === 'analytics') renderAnalyticsDashboard();
  else if (tabName === 'user') renderUserProfileAndAdvisor();
  else if (tabName === 'manage') renderManageQuestionsList();

  if (skipScrollRestore) {
    isRestoringTabScroll = false;
  } else {
    restoreTabScrollState(tabName);
  }
}

function populateTopicDropdowns() {
  const topics = Array.from(new Set(QUESTIONS_BANK.map(q => q.topic)));
  const studySelect = document.getElementById('studyFilterTopic');
  const fcSelect = document.getElementById('fcFilterTopic');
  const examSelect = document.getElementById('examTopicSelect');
  const prevStudy = studySelect ? studySelect.value : 'all';
  const prevFc = fcSelect ? fcSelect.value : 'all';
  if (studySelect) studySelect.innerHTML = '<option value="all">Tất cả ' + topics.length + ' chủ đề bệnh học</option>';
  if (fcSelect) fcSelect.innerHTML = '<option value="all">Tất cả chủ đề</option>';
  if (examSelect) examSelect.innerHTML = '';
  topics.forEach(tp => {
    const count = QUESTIONS_BANK.filter(q => q.topic === tp).length;
    if (studySelect) { const opt1 = document.createElement('option'); opt1.value = tp; opt1.textContent = tp + ' (' + count + ' câu)'; studySelect.appendChild(opt1); }
    if (fcSelect) { const opt2 = document.createElement('option'); opt2.value = tp; opt2.textContent = tp + ' (' + count + ' thẻ)'; fcSelect.appendChild(opt2); }
    if (examSelect) { const opt3 = document.createElement('option'); opt3.value = tp; opt3.textContent = tp + ' (' + count + ' câu)'; examSelect.appendChild(opt3); }
  });
  if (studySelect && Array.from(studySelect.options).some(o => o.value === prevStudy)) studySelect.value = prevStudy;
  if (fcSelect && Array.from(fcSelect.options).some(o => o.value === prevFc)) fcSelect.value = prevFc;
}

