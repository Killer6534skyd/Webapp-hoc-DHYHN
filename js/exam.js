function updateExamPresetSettings() {
  const preset = document.getElementById('examPresetSelect').value;
  const topicWrap = document.getElementById('examTopicWrapper');
  const timeInput = document.getElementById('examTimeMinutes');
  if (preset === 'topic') topicWrap.classList.remove('hidden');
  else topicWrap.classList.add('hidden');
  const presetTimes = { standard37: 30, quick20: 15, part1: 30, part2: 45, part3: 25, part4: 20, part5: 55, topic: 20, wrong_only: 25, full160: 90 };
  if (presetTimes[preset]) timeInput.value = presetTimes[preset];
}

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
  }
  return copy;
}

function startExamSession(customQuestions, customTitle, customMinutes) {
  let pool = [];
  let title = '';
  const shuffle = document.getElementById('examShuffleToggle').checked;
  const allowHints = document.getElementById('examAllowHintToggle').checked;
  let minutes = parseInt(document.getElementById('examTimeMinutes').value, 10) || 30;

  if (Array.isArray(customQuestions) && customQuestions.length > 0) {
    pool = customQuestions.slice();
    title = customTitle || 'Đề ôn tập lại câu sai';
    minutes = customMinutes || Math.max(10, Math.ceil(pool.length * 0.8));
  } else {
    const preset = document.getElementById('examPresetSelect').value;
    const stdCount = (activeCourseObj && activeCourseObj.defaultExamCount) || 40;
    if (preset === 'standard37') { pool = shuffleArray(QUESTIONS_BANK).slice(0, stdCount); title = 'Đề thi chuẩn ' + (activeCourseObj ? activeCourseObj.shortName : 'ĐHYHN') + ' (' + stdCount + ' câu)'; }
    else if (preset === 'quick20') { pool = shuffleArray(QUESTIONS_BANK).slice(0, 20); title = 'Đề phản xạ nhanh (20 câu)'; }
    else if (preset.startsWith('part_')) {
      const pName = preset.replace('part_', '');
      pool = QUESTIONS_BANK.filter(q => q.part === pName);
      title = 'Đề ' + ((activeCourseObj && activeCourseObj.partNames && activeCourseObj.partNames[pName]) || pName);
    }
    else if (preset === 'part1') { pool = QUESTIONS_BANK.filter(q => q.part === 'Phần I'); title = 'Đề Phần I'; }
    else if (preset === 'part2') { pool = QUESTIONS_BANK.filter(q => q.part === 'Phần II'); title = 'Đề Phần II'; }
    else if (preset === 'part3') { pool = QUESTIONS_BANK.filter(q => q.part === 'Phần III'); title = 'Đề Phần III'; }
    else if (preset === 'part4') { pool = QUESTIONS_BANK.filter(q => q.part === 'Phần IV'); title = 'Đề Phần IV'; }
    else if (preset === 'part5') { pool = QUESTIONS_BANK.filter(q => q.part === 'Phần V'); title = 'Đề Phần V'; }
    else if (preset === 'topic') {
      const tp = document.getElementById('examTopicSelect').value;
      pool = QUESTIONS_BANK.filter(q => q.topic === tp);
      title = 'Đề Chuyên đề: ' + tp;
    } else if (preset === 'wrong_only') {
      pool = QUESTIONS_BANK.filter(q => {
        const hasAns = userProgress.answers.hasOwnProperty(q.id);
        const isWrong = hasAns && userProgress.answers[q.id] !== q.correct_idx;
        return isWrong || !!userProgress.bookmarks[q.id] || q.is_trap;
      });
      if (pool.length === 0) pool = QUESTIONS_BANK.filter(q => q.is_trap);
      title = 'Đề Ôn tập Câu sai, Đánh dấu ⭐ & Bẫy lâm sàng';
    } else {
      pool = QUESTIONS_BANK.slice();
      title = 'Đề Tổng hợp Toàn bộ Ngân hàng';
    }
    if (shuffle && preset !== 'standard37' && preset !== 'quick20') pool = shuffleArray(pool);
  }

  if (examState.timerId) clearInterval(examState.timerId);
  const durationSec = Math.max(60, minutes * 60);
  examState = {
    active: true, paused: false, submitted: false, title: title, questions: pool,
    currentIndex: 0, userAnswers: {}, flagged: {}, hintsShown: {}, allowHints: allowHints,
    durationSec: durationSec, remainingSec: durationSec, elapsedSec: 0, timerId: null, reviewFilter: 'all'
  };

  document.getElementById('examSetupPanel').classList.add('hidden');
  document.getElementById('examResultPanel').classList.add('hidden');
  document.getElementById('examActivePanel').classList.remove('hidden');
  document.getElementById('examPausedOverlay').classList.add('hidden');
  document.getElementById('examQuestionCard').classList.remove('hidden');
  document.getElementById('examHeaderTitle').textContent = examState.title;
  document.getElementById('examTotalCountLabel').textContent = String(pool.length);

  renderExamActiveQuestion();
  renderExamPalette();
  startExamCountdown();
}

function startExamCountdown() {
  if (examState.timerId) clearInterval(examState.timerId);
  updateExamTimerUI();
  examState.timerId = setInterval(() => {
    if (!examState.active || examState.paused || examState.submitted) return;
    examState.remainingSec--;
    examState.elapsedSec++;
    updateExamTimerUI();
    if (examState.remainingSec <= 0) {
      clearInterval(examState.timerId);
      finalizeExamSubmission(true);
    }
  }, 1000);
}

function updateExamTimerUI() {
  const timerText = document.getElementById('examTimerText');
  const badge = document.getElementById('examClockBadge');
  if (timerText) timerText.textContent = formatTime(examState.remainingSec);
  if (badge) {
    badge.className = (examState.remainingSec <= 120)
      ? 'px-3 py-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 font-mono text-base font-bold flex items-center gap-1.5 animate-pulse'
      : 'px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-mono text-base font-bold flex items-center gap-1.5';
  }
}

function togglePauseExam() {
  if (!examState.active || examState.submitted) return;
  examState.paused = !examState.paused;
  const btn = document.getElementById('btnPauseExam');
  const overlay = document.getElementById('examPausedOverlay');
  const card = document.getElementById('examQuestionCard');
  if (examState.paused) {
    btn.textContent = '▶️ Tiếp tục';
    overlay.classList.remove('hidden');
    card.classList.add('hidden');
  } else {
    btn.textContent = '⏸️ Tạm dừng';
    overlay.classList.add('hidden');
    card.classList.remove('hidden');
  }
}

function renderExamActiveQuestion() {
  const q = examState.questions[examState.currentIndex];
  if (!q) return;
  document.getElementById('examCurrentIndexLabel').textContent = String(examState.currentIndex + 1);
  const selected = examState.userAnswers.hasOwnProperty(q.id) ? examState.userAnswers[q.id] : null;
  const isFlagged = !!examState.flagged[q.id];
  const hintVisible = !!examState.hintsShown[q.id];

  const flagBtn = document.getElementById('btnExamFlag');
  if (flagBtn) flagBtn.textContent = isFlagged ? '🚩 Bỏ cờ câu này' : '🚩 Đặt cờ xem lại';

  const prevBtn = document.getElementById('btnExamPrev');
  const nextBtn = document.getElementById('btnExamNext');
  if (prevBtn) prevBtn.disabled = examState.currentIndex === 0;
  if (nextBtn) nextBtn.textContent = examState.currentIndex === examState.questions.length - 1 ? 'Nộp bài →' : 'Câu tiếp theo →';

  const optsHtml = q.options.map((optText, idx) => {
    const isChosen = selected === idx;
    const cls = isChosen
      ? 'border-teal-600 bg-teal-50/90 text-teal-950 font-semibold ring-2 ring-teal-500/30'
      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-800';
    const badgeCls = isChosen ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-300';
    return '<button type="button" onclick="selectExamOption(' + idx + ')" class="w-full text-left px-4 py-3 rounded-xl border transition flex items-start gap-3 text-sm ' + cls + '"><span class="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ' + badgeCls + '">' + (idx + 1) + '</span><span class="flex-1 leading-snug">' + escapeHtml(optText) + '</span></button>';
  }).join('');

  const hintBtnHtml = examState.allowHints
    ? '<div class="pt-2"><button type="button" onclick="toggleExamQuestionHint()" class="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition">' + (hintVisible ? 'Ẩn gợi ý lâm sàng' : '💡 Xem gợi ý lâm sàng') + '</button>' + (hintVisible ? '<div class="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900"><strong>' + escapeHtml(q.hint) + '</strong></div>' : '') + '</div>'
    : '';

  const stemBannerHtml = renderQuestionStemBanner(q, 'exam');
  const mediaHtml = renderQuestionMediaGallery(q);
  document.getElementById('examQuestionCard').innerHTML = stemBannerHtml + '<div class="flex items-center justify-between gap-2 flex-wrap"><div class="flex items-center gap-2"><span class="px-2.5 py-0.5 rounded bg-teal-900 text-white text-xs font-bold">Câu ' + (examState.currentIndex + 1) + '</span><span class="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">' + escapeHtml(q.topic) + '</span><span class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-xs">' + escapeHtml(q.part) + '</span></div>' + (isFlagged ? '<span class="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">🚩 Đang đặt cờ</span>' : '') + '</div><h3 class="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">' + escapeHtml(q.q) + '</h3>' + mediaHtml + '<div class="space-y-2.5 pt-1">' + optsHtml + '</div>' + hintBtnHtml;
}

function jumpToExamQuestionById(qId) {
  if (!examState.active || examState.paused) return;
  const idx = examState.questions.findIndex(x => x.id === qId);
  if (idx !== -1) jumpToExamQuestion(idx);
}

function selectExamOption(optionIdx) {
  if (!examState.active || examState.paused || examState.submitted) return;
  const q = examState.questions[examState.currentIndex];
  if (!q) return;
  examState.userAnswers[q.id] = optionIdx;
  renderExamActiveQuestion();
  renderExamPalette();
}

function toggleExamQuestionHint() {
  if (!examState.active || examState.paused) return;
  const q = examState.questions[examState.currentIndex];
  if (!q) return;
  examState.hintsShown[q.id] = !examState.hintsShown[q.id];
  renderExamActiveQuestion();
}

function toggleExamFlagCurrent() {
  if (!examState.active || examState.paused) return;
  const q = examState.questions[examState.currentIndex];
  if (!q) return;
  examState.flagged[q.id] = !examState.flagged[q.id];
  renderExamActiveQuestion();
  renderExamPalette();
}

function navigateExamQuestion(delta) {
  if (!examState.active || examState.paused) return;
  const nextIdx = examState.currentIndex + delta;
  if (nextIdx >= examState.questions.length) {
    requestSubmitExam();
    return;
  }
  if (nextIdx >= 0 && nextIdx < examState.questions.length) {
    examState.currentIndex = nextIdx;
    renderExamActiveQuestion();
    renderExamPalette();
  }
}

function jumpToExamQuestion(idx) {
  if (!examState.active || examState.paused) return;
  examState.currentIndex = idx;
  renderExamActiveQuestion();
  renderExamPalette();
}

function renderExamPalette() {
  const total = examState.questions.length;
  const answeredCount = Object.keys(examState.userAnswers).length;
  document.getElementById('examAnsweredCounter').textContent = 'Đã làm: ' + answeredCount + '/' + total;
  document.getElementById('examPaletteGrid').innerHTML = examState.questions.map((q, idx) => {
    const isCurrent = idx === examState.currentIndex;
    const isAnswered = examState.userAnswers.hasOwnProperty(q.id);
    const isFlagged = !!examState.flagged[q.id];
    let cls = 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
    if (isAnswered) cls = 'bg-teal-600 text-white border-teal-700 font-bold';
    if (isFlagged) cls = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
    if (isCurrent) cls += ' ring-2 ring-offset-1 ring-teal-800';
    return '<button type="button" onclick="jumpToExamQuestion(' + idx + ')" class="h-8 rounded-lg border text-xs transition flex items-center justify-center ' + cls + '">' + (idx + 1) + '</button>';
  }).join('');
}

function requestSubmitExam() {
  const total = examState.questions.length;
  const answered = Object.keys(examState.userAnswers).length;
  const unanswered = total - answered;
  const msg = unanswered > 0
    ? 'Bạn còn ' + unanswered + '/' + total + ' câu hỏi chưa chọn đáp án. Bạn có chắc chắn muốn nộp bài và chấm điểm ngay không?'
    : 'Bạn đã hoàn thành toàn bộ ' + total + '/' + total + ' câu hỏi. Xác nhận nộp bài và xem kết quả phân tích chi tiết?';
  openAppModal('Xác nhận nộp bài thi', msg, function () { finalizeExamSubmission(false); });
}

function finalizeExamSubmission(autoByTimeout) {
  if (examState.timerId) clearInterval(examState.timerId);
  examState.active = false;
  examState.submitted = true;
  let correct = 0;
  const topicStats = {};
  examState.questions.forEach(q => {
    if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0 };
    topicStats[q.topic].total++;
    const chosen = examState.userAnswers.hasOwnProperty(q.id) ? examState.userAnswers[q.id] : null;
    if (chosen !== null) userProgress.answers[q.id] = chosen;
    if (chosen === q.correct_idx) { correct++; topicStats[q.topic].correct++; }
  });
  const total = examState.questions.length;
  const stemCalc = calculateScoreWithStemPenalty(examState.questions, examState.userAnswers);
  const score10 = stemCalc.adjustedScore10;
  userProgress.sessions.unshift({
    id: 'ses_' + Date.now(),
    date: new Date().toLocaleString('vi-VN'),
    type: 'Thi thử tính giờ',
    label: examState.title + (stemCalc.penaltyScore10 > 0 ? ' (Trừ ' + stemCalc.penaltyScore10.toFixed(2) + 'đ thân chung)' : ''),
    correct: correct,
    total: total,
    score10: score10,
    rawScore10: stemCalc.rawScore10,
    stemPenalty10: stemCalc.penaltyScore10.toFixed(2),
    stemWrongCount: stemCalc.stemWrongCount,
    durationSec: examState.elapsedSec,
    learnerName: (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Sinh viên Y khoa',
    answersSnapshot: Object.assign({}, examState.userAnswers)
  });
  saveProgress();
  updateTopStats();
  document.getElementById('examActivePanel').classList.add('hidden');
  const resPanel = document.getElementById('examResultPanel');
  resPanel.classList.remove('hidden');
  renderExamResultsView(correct, total, score10, topicStats, autoByTimeout, stemCalc);
  if (autoByTimeout) showToast('Hết giờ làm bài! Hệ thống đã tự động chấm điểm.');
}

function renderExamResultsView(correct, total, score10, topicStats, autoByTimeout, stemCalc) {
  stemCalc = stemCalc || calculateScoreWithStemPenalty(examState.questions, examState.userAnswers);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongCount = total - correct;
  let gradeLabel = 'Cần củng cố thêm';
  let gradeColor = 'text-rose-700 bg-rose-50 border-rose-200';
  if (pct >= 85) { gradeLabel = 'Xuất sắc (Nắm vững lâm sàng & bệnh học)'; gradeColor = 'text-emerald-800 bg-emerald-50 border-emerald-300'; }
  else if (pct >= 70) { gradeLabel = 'Khá – Tốt (Đạt chuẩn chuyên môn)'; gradeColor = 'text-teal-800 bg-teal-50 border-teal-300'; }
  else if (pct >= 50) { gradeLabel = 'Đạt yêu cầu (Cần ôn kỹ các câu bẫy)'; gradeColor = 'text-amber-800 bg-amber-50 border-amber-300'; }

  const topicRowsHtml = Object.keys(topicStats).map(tp => {
    const st = topicStats[tp];
    const tpPct = Math.round((st.correct / st.total) * 100);
    const badgeCls = tpPct >= 75
      ? 'bg-emerald-100 text-emerald-800'
      : tpPct >= 50
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-800';
    return (
      '<div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">' +
        '<div>' +
          '<div class="text-xs font-bold text-slate-800">' + escapeHtml(tp) + '</div>' +
          '<div class="text-[11px] text-slate-500">Đúng ' + st.correct + '/' + st.total + ' câu</div>' +
        '</div>' +
        '<span class="px-2.5 py-1 rounded-lg text-xs font-bold ' + badgeCls + '">' + tpPct + '%</span>' +
      '</div>'
    );
  }).join('');

  document.getElementById('examResultPanel').innerHTML =
    '<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">' +
      '<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">' +
        '<div>' +
          '<span class="text-xs font-bold uppercase tracking-wider text-teal-700">' +
            (autoByTimeout ? '⏰ Đã hết giờ làm bài' : '🎉 Hoàn thành bài thi') +
          '</span>' +
          '<h2 class="text-xl font-extrabold text-slate-900 mt-0.5">' + escapeHtml(examState.title) + '</h2>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-2">' +
          (wrongCount > 0
            ? '<button type="button" onclick="retryWrongFromExam()" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition">🔁 Làm lại ' + wrongCount + ' câu sai/chưa làm</button>'
            : '') +
          '<button type="button" onclick="exportSingleSession(0)" class="px-4 py-2 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-semibold transition">⬇️ Xuất kết quả phiên này (.json)</button>' +
          '<button type="button" onclick="resetToExamSetup()" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition">🆕 Tạo đề thi mới</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">' +
        '<div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">' +
          '<div class="text-xs font-medium text-emerald-800">Điểm sau trừ phạt</div>' +
          '<div class="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">' + score10 + '</div>' +
          '<div class="text-[11px] text-emerald-700">Điểm gốc: ' + stemCalc.rawScore10 + '/10</div>' +
        '</div>' +
        '<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">' +
          '<div class="text-xs font-medium text-rose-800">Điểm trừ Thân chung</div>' +
          '<div class="text-2xl sm:text-3xl font-black text-rose-900 mt-1">-' + stemCalc.penaltyScore10.toFixed(2) + '</div>' +
          '<div class="text-[11px] text-rose-700">Sai ' + stemCalc.stemWrongCount + '/' + stemCalc.stemTotal + ' câu thân chung</div>' +
        '</div>' +
        '<div class="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center">' +
          '<div class="text-xs font-medium text-teal-800">Số câu đúng</div>' +
          '<div class="text-2xl sm:text-3xl font-black text-teal-900 mt-1">' + correct + ' / ' + total + '</div>' +
        '</div>' +
        '<div class="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center">' +
          '<div class="text-xs font-medium text-slate-600">Tỷ lệ chính xác</div>' +
          '<div class="text-2xl sm:text-3xl font-black text-slate-900 mt-1">' + pct + '%</div>' +
        '</div>' +
        '<div class="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center">' +
          '<div class="text-xs font-medium text-indigo-800">Thời gian làm bài</div>' +
          '<div class="text-2xl sm:text-3xl font-black text-indigo-900 mt-1">' + formatTime(examState.elapsedSec) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold ' + gradeColor + '">Đánh giá năng lực: ' + gradeLabel + '</div>' +
      '<div class="space-y-2">' +
        '<h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Kết quả theo từng Chủ đề bệnh học trong đề</h3>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">' + topicRowsHtml + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
        '<h3 class="text-base font-bold text-slate-900">Chi tiết Đáp án &amp; Giải thích từng câu trong đề</h3>' +
        '<div class="flex flex-wrap items-center gap-1.5">' +
          '<button type="button" onclick="filterExamReview(\'all\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-100 hover:bg-slate-200">Tất cả (' + total + ')</button>' +
          '<button type="button" onclick="filterExamReview(\'wrong\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100">Câu sai / Chưa làm (' + wrongCount + ')</button>' +
          '<button type="button" onclick="filterExamReview(\'correct\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100">Câu đúng (' + correct + ')</button>' +
        '</div>' +
      '</div>' +
      '<div id="examReviewQuestionsList" class="space-y-3"></div>' +
    '</div>';
  filterExamReview('all');
}

function filterExamReview(mode) {
  examState.reviewFilter = mode;
  const container = document.getElementById('examReviewQuestionsList');
  if (!container) return;
  const filtered = examState.questions.filter(q => {
    const chosen = examState.userAnswers.hasOwnProperty(q.id) ? examState.userAnswers[q.id] : null;
    const isCorrect = chosen === q.correct_idx;
    if (mode === 'wrong') return !isCorrect;
    if (mode === 'correct') return isCorrect;
    return true;
  });
  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500">Không có câu hỏi nào trong nhóm này.</div>';
    return;
  }
  container.innerHTML = filtered.map(q => {
    const chosen = examState.userAnswers.hasOwnProperty(q.id) ? examState.userAnswers[q.id] : null;
    const isCorrect = chosen === q.correct_idx;
    const badge = isCorrect
      ? '<span class="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">✓ Trả lời đúng</span>'
      : chosen === null
        ? '<span class="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">⚠️ Bỏ trống</span>'
        : '<span class="px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-bold">✗ Trả lời sai</span>';
    const optsList = q.options.map((opt, oIdx) => {
      let style = 'text-slate-600 bg-slate-50 border-slate-200';
      if (oIdx === q.correct_idx) style = 'text-emerald-950 bg-emerald-50 border-emerald-400 font-semibold';
      else if (chosen === oIdx && oIdx !== q.correct_idx) style = 'text-rose-900 bg-rose-50 border-rose-400 line-through';
      return '<div class="px-3 py-2 rounded-lg border text-xs sm:text-sm ' + style + '">' + escapeHtml(opt) + '</div>';
    }).join('');
    return (
      '<div data-q-id="' + q.id + '" class="p-4 rounded-xl border border-slate-200 space-y-2.5 annotatable-region">' +
        renderQuestionStemBanner(q, 'review') +
        '<div class="flex items-center justify-between gap-2 flex-wrap">' +
          '<span class="text-xs font-bold text-slate-500">' + escapeHtml(q.part) + ' • ' + escapeHtml(q.topic) + '</span>' +
          '<div class="flex items-center gap-1.5">' +
            badge +
            '<button type="button" onclick="openManualDocCommentComposer(\'' + q.id + '\')" class="px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-800 text-[11px] font-semibold">🖍️/💬 Ghi chú</button>' +
          '</div>' +
        '</div>' +
        '<div class="text-sm font-bold text-slate-900">' + renderTextWithDocHighlights(q.q, q.id) + '</div>' +
        renderQuestionMediaGallery(q) +
        '<div class="space-y-1.5">' + optsList + '</div>' +
        '<div class="p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-xs sm:text-sm space-y-1">' +
          '<div class="font-bold text-emerald-800">→ Đáp án chuẩn: ' + renderTextWithDocHighlights(q.ans, q.id) + '</div>' +
          '<div class="text-slate-700 leading-relaxed"><strong>Giải thích:</strong> ' + renderTextWithDocHighlights(q.exp, q.id) + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function retryWrongFromExam() {
  const wrongQs = examState.questions.filter(q => {
    const chosen = examState.userAnswers.hasOwnProperty(q.id) ? examState.userAnswers[q.id] : null;
    return chosen !== q.correct_idx;
  });
  if (wrongQs.length === 0) return;
  startExamSession(wrongQs, 'Làm lại ' + wrongQs.length + ' câu sai từ đề trước', Math.max(5, Math.ceil(wrongQs.length * 1)));
}

function resetToExamSetup() {
  if (examState.timerId) clearInterval(examState.timerId);
  examState.active = false;
  document.getElementById('examActivePanel').classList.add('hidden');
  document.getElementById('examResultPanel').classList.add('hidden');
  document.getElementById('examSetupPanel').classList.remove('hidden');
}

