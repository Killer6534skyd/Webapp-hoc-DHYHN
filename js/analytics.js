function renderAnalyticsDashboard() {
  const total = QUESTIONS_BANK.length;
  let done = 0, correct = 0, wrong = 0;
  QUESTIONS_BANK.forEach(q => {
    if (userProgress.answers.hasOwnProperty(q.id)) {
      done++;
      if (userProgress.answers[q.id] === q.correct_idx) correct++;
      else wrong++;
    }
  });
  const pctDone = Math.round((done / total) * 100);
  const acc = done > 0 ? Math.round((correct / done) * 100) : 0;
  let fcEasy = 0, fcNeedReview = 0;
  QUESTIONS_BANK.forEach(q => {
    const r = userProgress.flashcards[q.id];
    if (r === 'easy') fcEasy++;
    else if (r === 'hard' || r === 'medium') fcNeedReview++;
  });

  document.getElementById('anaCompletedCount').textContent = done + ' / ' + total;
  document.getElementById('anaCompletedSub').textContent = pctDone + '% ngân hàng câu hỏi';
  document.getElementById('anaAccuracyRate').textContent = acc + '%';
  document.getElementById('anaAccuracySub').textContent = correct + ' câu đúng / ' + wrong + ' câu sai';
  document.getElementById('anaFlashcardMastered').textContent = fcEasy + ' / ' + total;
  document.getElementById('anaFlashcardSub').textContent = fcNeedReview + ' thẻ đang đánh dấu cần ôn lại';
  document.getElementById('anaSessionCount').textContent = userProgress.sessions.length + ' phiên';

  const topics = Array.from(new Set(QUESTIONS_BANK.map(q => q.topic)));
  document.getElementById('anaTopicBreakdownList').innerHTML = topics.map(tp => {
    const qs = QUESTIONS_BANK.filter(q => q.topic === tp);
    let tDone = 0, tCorr = 0;
    qs.forEach(q => {
      if (userProgress.answers.hasOwnProperty(q.id)) {
        tDone++;
        if (userProgress.answers[q.id] === q.correct_idx) tCorr++;
      }
    });
    const tAcc = tDone > 0 ? Math.round((tCorr / tDone) * 100) : 0;
    const barWidth = Math.round((tCorr / qs.length) * 100);
    return (
      '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div>' +
            '<span class="text-sm font-bold text-slate-900">' + escapeHtml(tp) + '</span>' +
            '<span class="text-xs text-slate-500 ml-1">(' + tDone + '/' + qs.length + ' đã làm • Chính xác ' + tAcc + '%)</span>' +
          '</div>' +
          '<button type="button" onclick="jumpToTopicStudy(\'' + escapeHtml(tp) + '\')" class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition">Ôn ngay →</button>' +
        '</div>' +
        '<div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">' +
          '<div class="h-full bg-teal-600 rounded-full transition-all" style="width: ' + barWidth + '%"></div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  const tbody = document.getElementById('anaSessionTableBody');
  if (userProgress.sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-xs text-slate-500">Chưa có session nào được lưu. Hãy hoàn thành một bài Thi thử, nhấn nút "💾 Lưu Session" hoặc "📥 Nhập kết quả phiên (.json)".</td></tr>';
  } else {
    tbody.innerHTML = userProgress.sessions.map((s, idx) => {
      const sPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const statusBadgeCls = sPct >= 80
        ? 'bg-emerald-100 text-emerald-800'
        : sPct >= 50
          ? 'bg-amber-100 text-amber-800'
          : 'bg-rose-100 text-rose-800';
      const statusLabel = sPct >= 80 ? 'Tốt' : sPct >= 50 ? 'Đạt' : 'Cần ôn thêm';
      return (
        '<tr class="hover:bg-slate-50">' +
          '<td class="py-2.5 px-3 text-slate-600 whitespace-nowrap">' + escapeHtml(s.date) + '</td>' +
          '<td class="py-2.5 px-3 font-semibold text-slate-800">' + escapeHtml(s.type) + ': ' + escapeHtml(s.label) + '</td>' +
          '<td class="py-2.5 px-3 font-medium">' + s.correct + '/' + s.total + ' (' + sPct + '%)</td>' +
          '<td class="py-2.5 px-3 font-bold text-teal-800">' + escapeHtml(s.score10) + ' / 10</td>' +
          '<td class="py-2.5 px-3 font-mono text-xs">' + formatTime(s.durationSec || 0) + '</td>' +
          '<td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ' + statusBadgeCls + '">' + statusLabel + '</span></td>' +
          '<td class="py-2.5 px-3 text-right whitespace-nowrap space-x-1">' +
            '<button type="button" onclick="openSessionDetailModal(' + idx + ')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">👁️ Chi tiết</button>' +
            '<button type="button" onclick="exportSingleSession(' + idx + ')" class="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold">⬇️ Xuất phiên</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  }

  const traps = QUESTIONS_BANK.filter(q => q.is_trap);
  document.getElementById('anaTrapCardsContainer').innerHTML = traps.map(q => (
    '<div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">' +
      '<div class="text-xs font-bold text-amber-900">' + escapeHtml(q.part) + ' • ' + escapeHtml(q.topic) + '</div>' +
      '<div class="text-xs sm:text-sm font-bold text-slate-900">' + escapeHtml(q.q) + '</div>' +
      '<div class="text-xs font-semibold text-emerald-800">→ Đáp án chuẩn: ' + escapeHtml(q.ans) + '</div>' +
      '<div class="text-xs text-amber-950 leading-relaxed">' + escapeHtml(q.trap_note) + '</div>' +
    '</div>'
  )).join('');
}

function jumpToTopicStudy(topicName) {
  document.getElementById('studyFilterPart').value = 'all';
  document.getElementById('studyFilterTopic').value = topicName;
  document.getElementById('studyFilterStatus').value = 'all';
  switchTab('study');
}

function clearSessionHistory() {
  openAppModal('Xóa lịch sử Session', 'Bạn có chắc muốn xóa danh sách lịch sử các phiên làm bài không?', function () {
    userProgress.sessions = [];
    saveProgress();
    renderAnalyticsDashboard();
    showToast('Đã xóa lịch sử các phiên học!');
  });
}

function copyAnalyticsReport() {
  const total = QUESTIONS_BANK.length;
  let done = 0, correct = 0;
  QUESTIONS_BANK.forEach(q => {
    if (userProgress.answers.hasOwnProperty(q.id)) {
      done++;
      if (userProgress.answers[q.id] === q.correct_idx) correct++;
    }
  });
  const acc = done > 0 ? Math.round((correct / done) * 100) : 0;
  const reportText = [
    '=== BÁO CÁO ÔN TẬP TRUYỀN NHIỄM Y KHOA ===',
    '- Tiến độ: ' + done + '/' + total + ' câu hỏi',
    '- Số câu đúng: ' + correct + ' (' + acc + '%)',
    '- Số phiên đã lưu: ' + userProgress.sessions.length,
    '- Thời gian phiên hiện tại: ' + formatTime(globalSessionSeconds)
  ].join('\n');
  try {
    const ta = document.createElement('textarea');
    ta.value = reportText;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Đã sao chép báo cáo tổng kết vào Clipboard!');
  } catch (e) {
    showToast('Đã tạo báo cáo tổng kết!');
  }
}

function removeVietnameseTones(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function buildUserExportFilename(customName, prefix) {
  const rawName = customName || (userProgress && userProgress.profile && userProgress.profile.name) || 'nguoi-hoc';
  const slugName = removeVietnameseTones(rawName) || 'nguoi-hoc';
  const now = new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const timeStamp = pad2(now.getHours()) + 'h' + pad2(now.getMinutes()) + '-' + pad2(now.getDate()) + '-' + pad2(now.getMonth() + 1);
  const pre = prefix ? (removeVietnameseTones(prefix) + '-') : '';
  return pre + slugName + '-' + timeStamp + '.json';
}

function getActiveStudyCardQuestion() {
  const cards = Array.from(document.querySelectorAll('#studyQuestionsContainer article[data-q-id]'));
  if (cards.length === 0) return null;
  const viewportMid = window.innerHeight * 0.35;
  let bestCard = cards[0];
  let bestDist = Infinity;
  for (const c of cards) {
    const rect = c.getBoundingClientRect();
    if (rect.bottom < 60) continue;
    const dist = Math.abs(rect.top - viewportMid);
    if (dist < bestDist) {
      bestDist = dist;
      bestCard = c;
    }
  }
  const qId = bestCard ? bestCard.getAttribute('data-q-id') : null;
  return qId ? { q: QUESTIONS_BANK.find(x => x.id === qId), card: bestCard } : null;
}

function moveStudyCardFocus(delta) {
  const cards = Array.from(document.querySelectorAll('#studyQuestionsContainer article[data-q-id]'));
  if (cards.length === 0) return;
  const cur = getActiveStudyCardQuestion();
  const idx = cur && cur.card ? cards.indexOf(cur.card) : 0;
  const nextIdx = Math.max(0, Math.min(cards.length - 1, idx + delta));
  const target = cards[nextIdx];
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-2', 'ring-teal-500');
    setTimeout(() => target.classList.remove('ring-2', 'ring-teal-500'), 900);
  }
}

function openKeyboardShortcutsHelpModal() {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  titleEl.textContent = '⌨️ Bảng Phím Tắt Nhanh (Phiên bản 2.2.1)';
  bodyEl.innerHTML = '<div class="space-y-4 text-xs">' +
    '<div class="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-950">' +
      'Sử dụng phím tắt trên bàn phím máy tính giúp tăng tốc độ làm đề, lật Flashcard và tra cứu câu hỏi. Nhấn <kbd class="px-1.5 py-0.5 rounded bg-white border border-teal-300 font-mono font-bold">?</kbd> bất kỳ lúc nào để mở bảng này.' +
    '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
      '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">' +
        '<div class="font-extrabold text-teal-900 text-sm">📚 Chế độ Ôn tập &amp; Giải đáp</div>' +
        '<ul class="space-y-1.5 text-slate-700">' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">1–4</kbd> hoặc <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">A–D</kbd>: Chọn đáp án cho câu đang xem</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">J</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">K</kbd> hoặc <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">→</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">←</kbd>: Chuyển câu tiếp / trước</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">H</kbd>: Bật/tắt gợi ý lâm sàng câu đang xem</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">E</kbd>: Bật/tắt giải thích chi tiết câu đang xem</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">B</kbd>: Đánh dấu ⭐ lưu câu hỏi đang xem</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">/</kbd>: Nhảy nhanh vào ô tìm kiếm câu hỏi</li>' +
        '</ul>' +
      '</div>' +
      '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">' +
        '<div class="font-extrabold text-teal-900 text-sm">⏱️ Chế độ Thi thử Tính giờ</div>' +
        '<ul class="space-y-1.5 text-slate-700">' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">1–4</kbd> hoặc <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">A–D</kbd>: Chọn phương án trả lời</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">→</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">Enter</kbd> và <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">←</kbd>: Câu tiếp theo / Câu trước</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">F</kbd>: Đặt cờ 🚩 xem lại câu hiện tại</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">H</kbd>: Hiện/ẩn gợi ý lâm sàng (nếu bật)</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">P</kbd>: Tạm dừng / Tiếp tục đồng hồ thi</li>' +
        '</ul>' +
      '</div>' +
      '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">' +
        '<div class="font-extrabold text-teal-900 text-sm">🗂️ Chế độ Flashcard 3D</div>' +
        '<ul class="space-y-1.5 text-slate-700">' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">Space</kbd>: Lật thẻ Flashcard 3D</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">←</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">→</kbd>: Thẻ trước / Thẻ tiếp theo</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">1</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">2</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">3</kbd>: Đánh giá Khó / Vừa / Dễ</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">H</kbd>: Xem gợi ý • <kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">R</kbd>: Trộn ngẫu nhiên thẻ</li>' +
        '</ul>' +
      '</div>' +
      '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">' +
        '<div class="font-extrabold text-teal-900 text-sm">🌐 Điều hướng Toàn cục</div>' +
        '<ul class="space-y-1.5 text-slate-700">' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">Alt + 1..7</kbd>: Chuyển nhanh giữa 7 Tab chức năng</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">M</kbd>: Mở Cổng chọn 16 Học phần (Y1–Y6)</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">?</kbd>: Mở bảng hướng dẫn phím tắt này</li>' +
          '<li><kbd class="px-1.5 py-0.5 rounded bg-white border font-mono font-bold">Esc</kbd>: Đóng hộp thoại (Modal) đang mở</li>' +
        '</ul>' +
      '</div>' +
    '</div>' +
  '</div>';

  footerEl.innerHTML = '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold">Đã hiểu</button>';
  modal.classList.remove('hidden');
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (typeof closeCustomDataModal === 'function') closeCustomDataModal();
    if (typeof closeAppModal === 'function') closeAppModal();
    if (typeof closeCourseHubModal === 'function') closeCourseHubModal();
    return;
  }

  const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
  const isTyping = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
  if (isTyping) return;

  // Global Alt + 1..7 tab switching
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const tabs = ['study', 'exam', 'flashcard', 'analytics', 'user', 'manage', 'guide'];
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= tabs.length) {
      e.preventDefault();
      switchTab(tabs[num - 1]);
      return;
    }
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === '?') {
    e.preventDefault();
    openKeyboardShortcutsHelpModal();
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    openCourseHubModal();
    return;
  }

  // Flashcard shortcuts
  if (currentTab === 'flashcard') {
    if (e.code === 'Space') { e.preventDefault(); flipFlashcard(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); moveFlashcard(1); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); moveFlashcard(-1); }
    else if (e.key === '1') rateCurrentFlashcard('hard');
    else if (e.key === '2') rateCurrentFlashcard('medium');
    else if (e.key === '3') rateCurrentFlashcard('easy');
    else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleFlashcardHint(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); shuffleFlashcards(); }
    return;
  }

  // Exam shortcuts
  if (currentTab === 'exam' && examState && examState.active && !examState.submitted) {
    const keyUpper = (e.key || '').toUpperCase();
    const optMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
    if (optMap.hasOwnProperty(keyUpper)) {
      const q = examState.questions[examState.currentIndex];
      if (q && Array.isArray(q.options) && optMap[keyUpper] < q.options.length) {
        e.preventDefault();
        selectExamOption(optMap[keyUpper]);
      }
    } else if (e.code === 'ArrowRight' || e.code === 'Enter') {
      e.preventDefault();
      navigateExamQuestion(1);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      navigateExamQuestion(-1);
    } else if (keyUpper === 'F') {
      e.preventDefault();
      toggleExamFlagCurrent();
    } else if (keyUpper === 'H') {
      e.preventDefault();
      toggleExamQuestionHint();
    } else if (keyUpper === 'P') {
      e.preventDefault();
      togglePauseExam();
    }
    return;
  }

  // Study mode shortcuts
  if (currentTab === 'study') {
    if (e.key === '/') {
      const searchInp = document.getElementById('studySearchInput');
      if (searchInp) {
        e.preventDefault();
        searchInp.focus();
        searchInp.select();
      }
      return;
    }
    const keyUpper = (e.key || '').toUpperCase();
    if (keyUpper === 'J' || e.code === 'ArrowRight') {
      e.preventDefault();
      moveStudyCardFocus(1);
      return;
    }
    if (keyUpper === 'K' || e.code === 'ArrowLeft') {
      e.preventDefault();
      moveStudyCardFocus(-1);
      return;
    }
    const active = getActiveStudyCardQuestion();
    if (!active || !active.q) return;
    const q = active.q;
    const optMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    if (optMap.hasOwnProperty(keyUpper) && Array.isArray(q.options) && optMap[keyUpper] < q.options.length) {
      e.preventDefault();
      selectStudyAnswer(q.id, optMap[keyUpper]);
    } else if (keyUpper === 'H') {
      e.preventDefault();
      toggleStudyHint(q.id);
    } else if (keyUpper === 'E') {
      e.preventDefault();
      toggleStudyExp(q.id);
    } else if (keyUpper === 'B') {
      e.preventDefault();
      toggleBookmark(q.id);
    }
  }
});


function downloadJsonObject(obj, filename) {
  try {
    const jsonStr = JSON.stringify(obj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Đã xuất file: ' + filename);
  } catch (e) {
    openJsonImportExportModal(JSON.stringify(obj, null, 2));
  }
}

function exportSingleSession(sessionIdx) {
  const s = userProgress.sessions[sessionIdx];
  if (!s) {
    showToast('Không tìm thấy dữ liệu phiên học này!');
    return;
  }
  const payload = {
    format: 'HMU_INFECTIOUS_DISEASE_SINGLE_SESSION_V1',
    exportedAt: new Date().toLocaleString('vi-VN'),
    profile: userProgress.profile,
    session: s
  };
  downloadJsonObject(payload, buildUserExportFilename(s.learnerName || (userProgress.profile && userProgress.profile.name)));
}

function exportAllSessionsOnly() {
  if (!userProgress.sessions || userProgress.sessions.length === 0) {
    showToast('Chưa có phiên học nào để xuất!');
    return;
  }
  const payload = {
    format: 'HMU_INFECTIOUS_DISEASE_SESSIONS_LIST_V1',
    exportedAt: new Date().toLocaleString('vi-VN'),
    profile: userProgress.profile,
    sessions: userProgress.sessions
  };
  downloadJsonObject(payload, buildUserExportFilename(userProgress.profile && userProgress.profile.name));
}

function exportAllLearningData() {
  const payload = {
    format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1',
    exportedAt: new Date().toLocaleString('vi-VN'),
    data: userProgress
  };
  downloadJsonObject(payload, buildUserExportFilename(userProgress.profile && userProgress.profile.name));
}

function triggerImportSessionFile() {
  const inp = document.getElementById('sessionFileInput');
  if (inp) {
    inp.value = '';
    inp.click();
  }
}

function handleImportSessionFile(event) {
  const file = event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    processImportedJsonString(ev.target.result);
  };
  reader.readAsText(file, 'utf-8');
}

function processImportedJsonString(rawStr) {
  try {
    const parsed = JSON.parse(rawStr);
    let importedCount = 0;

    if (parsed.format === 'HMU_INFECTIOUS_DISEASE_SINGLE_SESSION_V1' && parsed.session) {
      userProgress.sessions.unshift(parsed.session);
      if (parsed.session.answersSnapshot && typeof parsed.session.answersSnapshot === 'object') {
        Object.assign(userProgress.answers, parsed.session.answersSnapshot);
      }
      importedCount = 1;
    } else if (parsed.format === 'HMU_INFECTIOUS_DISEASE_SESSIONS_LIST_V1' && Array.isArray(parsed.sessions)) {
      parsed.sessions.forEach(s => {
        userProgress.sessions.push(s);
        if (s.answersSnapshot && typeof s.answersSnapshot === 'object') {
          Object.assign(userProgress.answers, s.answersSnapshot);
        }
      });
      importedCount = parsed.sessions.length;
    } else if (parsed.format === 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1' && parsed.data) {
      const d = parsed.data;
      if (d.answers) Object.assign(userProgress.answers, d.answers);
      if (d.bookmarks) Object.assign(userProgress.bookmarks, d.bookmarks);
      if (d.flashcards) Object.assign(userProgress.flashcards, d.flashcards);
      if (Array.isArray(d.sessions)) {
        userProgress.sessions = d.sessions.concat(userProgress.sessions);
        importedCount = d.sessions.length;
      }
      if (d.profile) userProgress.profile = Object.assign({}, userProgress.profile, d.profile);
      if (Array.isArray(d.customQuestions)) {
        const existingIds = new Set(userProgress.customQuestions.map(q => q.id));
        d.customQuestions.forEach(cq => {
          if (!existingIds.has(cq.id)) userProgress.customQuestions.push(cq);
        });
      }
      if (d.editedQuestions) Object.assign(userProgress.editedQuestions, d.editedQuestions);
      if (d.questionEditHistory) Object.assign(userProgress.questionEditHistory, d.questionEditHistory);
      if (d.inlineComments) Object.assign(userProgress.inlineComments, d.inlineComments);
      if (d.inlineHighlights) Object.assign(userProgress.inlineHighlights, d.inlineHighlights);
      if (d.cloudSync) userProgress.cloudSync = Object.assign({}, userProgress.cloudSync, d.cloudSync);
    } else if (Array.isArray(parsed)) {
      if (parsed.length > 0 && parsed[0].q && parsed[0].options) {
        importQuestionsArray(parsed);
        return;
      } else {
        parsed.forEach(s => userProgress.sessions.push(s));
        importedCount = parsed.length;
      }
    } else if (parsed.date && parsed.score10 !== undefined) {
      userProgress.sessions.unshift(parsed);
      importedCount = 1;
    } else {
      showToast('Định dạng file JSON không hợp lệ!');
      return;
    }

    syncQuestionsBankWithCustomizations();
    populateTopicDropdowns();
    saveProgress();
    updateTopStats();
    if (currentTab === 'study') applyStudyFilters();
    else if (currentTab === 'analytics') renderAnalyticsDashboard();
    else if (currentTab === 'user') renderUserProfileAndAdvisor();
    else if (currentTab === 'manage') renderManageQuestionsList();
    showToast('Đã nhập thành công dữ liệu (' + importedCount + ' phiên học)!');
  } catch (e) {
    showToast('Lỗi đọc dữ liệu JSON: Vui lòng kiểm tra lại định dạng file!');
  }
}

function openSessionDetailModal(sessionIdx) {
  const s = userProgress.sessions[sessionIdx];
  if (!s) return;
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  const sPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  titleEl.textContent = '📊 Chi tiết Phiên học: ' + (s.label || s.type);

  let detailRows = '';
  if (s.answersSnapshot && typeof s.answersSnapshot === 'object') {
    const qIds = Object.keys(s.answersSnapshot);
    if (qIds.length > 0) {
      const itemsHtml = qIds.slice(0, 50).map(qid => {
        const qObj = QUESTIONS_BANK.find(x => x.id === qid);
        if (!qObj) return '';
        const chosenIdx = s.answersSnapshot[qid];
        const ok = chosenIdx === qObj.correct_idx;
        return '<div class="p-2.5 rounded-lg border ' + (ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50') + ' flex items-start justify-between gap-2"><div class="text-xs"><span class="font-bold">#' + qObj.num + ' (' + escapeHtml(qObj.topic) + '):</span> ' + escapeHtml(qObj.q) + '<div class="text-[11px] text-slate-600 mt-0.5">Đã chọn: <strong>' + escapeHtml(qObj.options[chosenIdx] || 'Không rõ') + '</strong> • Đáp án chuẩn: <strong class="text-emerald-800">' + escapeHtml(qObj.ans) + '</strong></div></div><span class="px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ' + (ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800') + '">' + (ok ? 'Đúng' : 'Sai') + '</span></div>';
      }).join('');
      detailRows = '<div class="space-y-2 pt-2"><div class="text-xs font-bold uppercase tracking-wider text-slate-500">Chi tiết các câu trả lời trong phiên (' + qIds.length + ' câu)</div><div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">' + itemsHtml + '</div></div>';
    }
  }

  bodyEl.innerHTML = '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center"><div class="p-3 rounded-xl bg-teal-50 border border-teal-200"><div class="text-[11px] text-teal-800">Điểm hệ 10</div><div class="text-lg font-black text-teal-950">' + escapeHtml(s.score10) + ' / 10</div></div><div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200"><div class="text-[11px] text-emerald-800">Số câu đúng</div><div class="text-lg font-black text-emerald-950">' + s.correct + ' / ' + s.total + ' (' + sPct + '%)</div></div><div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200"><div class="text-[11px] text-indigo-800">Thời gian</div><div class="text-lg font-black text-indigo-950">' + formatTime(s.durationSec || 0) + '</div></div><div class="p-3 rounded-xl bg-slate-100 border border-slate-200"><div class="text-[11px] text-slate-600">Thời điểm</div><div class="text-xs font-bold text-slate-900 mt-1">' + escapeHtml(s.date) + '</div></div></div>' + detailRows;

  footerEl.innerHTML = '<button type="button" onclick="exportSingleSession(' + sessionIdx + ')" class="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold">⬇️ Xuất kết quả phiên này (.json)</button><button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function openJsonImportExportModal(prefillText) {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  const exportStr = prefillText || JSON.stringify({
    format: 'HMU_INFECTIOUS_DISEASE_SESSIONS_LIST_V1',
    exportedAt: new Date().toLocaleString('vi-VN'),
    profile: userProgress.profile,
    sessions: userProgress.sessions
  }, null, 2);

  titleEl.textContent = '📋 Sao chép hoặc Dán mã JSON Kết quả Phiên học';
  bodyEl.innerHTML = '<p class="text-xs text-slate-600">Bạn có thể sao chép đoạn mã JSON bên dưới để lưu trữ, hoặc dán mã JSON của phiên học trước vào ô này rồi nhấn <strong>"Nhập dữ liệu từ ô JSON"</strong>:</p><textarea id="jsonModalTextarea" rows="10" class="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"></textarea>';
  setTimeout(() => {
    const ta = document.getElementById('jsonModalTextarea');
    if (ta) ta.value = exportStr;
  }, 20);

  footerEl.innerHTML = '<button type="button" onclick="copyJsonModalText()" class="px-3.5 py-2 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold">📋 Sao chép mã JSON</button><button type="button" onclick="importFromJsonModalTextarea()" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">📥 Nhập dữ liệu từ ô JSON</button><button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function copyJsonModalText() {
  const ta = document.getElementById('jsonModalTextarea');
  if (!ta) return;
  ta.select();
  document.execCommand('copy');
  showToast('Đã sao chép mã JSON vào Clipboard!');
}

function importFromJsonModalTextarea() {
  const ta = document.getElementById('jsonModalTextarea');
  if (!ta || !ta.value.trim()) {
    showToast('Vui lòng dán nội dung JSON vào ô!');
    return;
  }
  processImportedJsonString(ta.value.trim());
  closeCustomDataModal();
}

function closeCustomDataModal() {
  const modal = document.getElementById('customDataModal');
  if (modal) modal.classList.add('hidden');
}

function deleteSingleSession(idx) {
  userProgress.sessions.splice(idx, 1);
  saveProgress();
  if (currentTab === 'user') renderUserProfileAndAdvisor();
  if (currentTab === 'analytics') renderAnalyticsDashboard();
  showToast('Đã xóa phiên học khỏi lịch sử!');
}

function saveUserProfile() {
  const nameVal = (document.getElementById('userNameInput').value || '').trim() || 'Sinh viên Y khoa ĐHYHN';
  const stIdVal = (document.getElementById('userStudentIdInput').value || '').trim() || 'K119 - Bác sĩ Đa khoa';
  const targetVal = parseFloat(document.getElementById('userTargetScoreInput').value) || 8.5;
  const dateVal = document.getElementById('userExamDateInput').value || '';
  const noteVal = (document.getElementById('userGoalNoteInput').value || '').trim();

  userProgress.profile = {
    name: nameVal,
    studentId: stIdVal,
    targetScore: Math.min(10, Math.max(1, targetVal)),
    examDate: dateVal,
    goalNote: noteVal
  };
  saveProgress();
  renderUserProfileAndAdvisor();
  showToast('Đã cập nhật hồ sơ người học!');
}

function renderUserProfileAndAdvisor() {
  const prof = userProgress.profile || {
    name: 'Sinh viên Y khoa ĐHYHN',
    studentId: 'K119 - Bác sĩ Đa khoa',
    targetScore: 8.5,
    examDate: '2026-11-15',
    goalNote: ''
  };

  const nameInp = document.getElementById('userNameInput');
  const idInp = document.getElementById('userStudentIdInput');
  const targetInp = document.getElementById('userTargetScoreInput');
  const dateInp = document.getElementById('userExamDateInput');
  const noteInp = document.getElementById('userGoalNoteInput');
  if (nameInp) nameInp.value = prof.name || '';
  if (idInp) idInp.value = prof.studentId || '';
  if (targetInp) targetInp.value = prof.targetScore || 8.5;
  if (dateInp) dateInp.value = prof.examDate || '';
  if (noteInp) noteInp.value = prof.goalNote || '';

  const initials = (prof.name || 'BS').split(' ').filter(Boolean).slice(-2).map(w => w[0].toUpperCase()).join('') || 'BS';
  document.getElementById('userAvatarInitials').textContent = initials;
  document.getElementById('userDisplayName').textContent = prof.name || 'Sinh viên Y khoa';
  document.getElementById('userDisplaySub').textContent = (prof.studentId || 'ĐHYHN') + ' • Mục tiêu: ' + (prof.targetScore || 8.5) + '/10';

  const totalQ = QUESTIONS_BANK.length;
  let done = 0, correct = 0, wrong = 0, trapWrong = 0;
  QUESTIONS_BANK.forEach(q => {
    if (userProgress.answers.hasOwnProperty(q.id)) {
      done++;
      if (userProgress.answers[q.id] === q.correct_idx) correct++;
      else {
        wrong++;
        if (q.is_trap) trapWrong++;
      }
    }
  });
  const currentScore10 = done > 0 ? (correct / done) * 10 : 0;
  const avgSessionScore = userProgress.sessions.length > 0
    ? (userProgress.sessions.reduce((acc, s) => acc + (parseFloat(s.score10) || 0), 0) / userProgress.sessions.length)
    : currentScore10;

  document.getElementById('userAvgSessionScore').textContent = (done > 0 || userProgress.sessions.length > 0)
    ? avgSessionScore.toFixed(2) + ' / 10'
    : 'Chưa có';

  const gap = avgSessionScore - (prof.targetScore || 8.5);
  const gapEl = document.getElementById('userTargetGapText');
  if (done === 0 && userProgress.sessions.length === 0) {
    gapEl.textContent = 'Mục tiêu ' + (prof.targetScore || 8.5);
    gapEl.className = 'text-sm sm:text-base font-black text-indigo-950 mt-0.5';
  } else if (gap >= 0) {
    gapEl.textContent = '+' + gap.toFixed(2) + ' (Đạt!)';
    gapEl.className = 'text-sm sm:text-base font-black text-emerald-700 mt-0.5';
  } else {
    gapEl.textContent = gap.toFixed(2) + ' điểm';
    gapEl.className = 'text-sm sm:text-base font-black text-rose-700 mt-0.5';
  }

  const cdEl = document.getElementById('userExamCountdown');
  if (prof.examDate) {
    const diffMs = new Date(prof.examDate).getTime() - new Date().setHours(0,0,0,0);
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    cdEl.textContent = days >= 0 ? ('Còn ' + days + ' ngày') : ('Đã qua ' + Math.abs(days) + ' ngày');
  } else {
    cdEl.textContent = 'Chưa đặt';
  }

  const rankBadge = document.getElementById('userRankBadge');
  if (done === 0) {
    rankBadge.textContent = 'Bắt đầu hành trình';
    rankBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700';
  } else if (currentScore10 >= 8.5 && done >= 50) {
    rankBadge.textContent = '🏆 Xuất sắc - Nội trú Truyền nhiễm';
    rankBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
  } else if (currentScore10 >= 7.0) {
    rankBadge.textContent = '⭐ Khá Giỏi - Nắm vững phác đồ';
    rankBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800';
  } else {
    rankBadge.textContent = '🔥 Cần tăng tốc củng cố';
    rankBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
  }

  const topics = Array.from(new Set(QUESTIONS_BANK.map(q => q.topic)));
  const topicMetrics = topics.map(tp => {
    const qs = QUESTIONS_BANK.filter(q => q.topic === tp);
    let tDone = 0, tCorr = 0, tWrong = 0;
    qs.forEach(q => {
      if (userProgress.answers.hasOwnProperty(q.id)) {
        tDone++;
        if (userProgress.answers[q.id] === q.correct_idx) tCorr++;
        else tWrong++;
      }
    });
    const acc = tDone > 0 ? Math.round((tCorr / tDone) * 100) : null;
    const completion = Math.round((tDone / qs.length) * 100);
    const priorityScore = (tWrong * 25) + ((acc !== null && acc < 75) ? (75 - acc) : 0) + ((100 - completion) * 0.35);
    return { topic: tp, total: qs.length, done: tDone, correct: tCorr, wrong: tWrong, acc: acc, completion: completion, priorityScore: priorityScore };
  });

  const weakTopics = topicMetrics.filter(m => m.wrong > 0 || (m.acc !== null && m.acc < 75)).sort((a, b) => b.priorityScore - a.priorityScore);
  const strongTopics = topicMetrics.filter(m => m.done >= 2 && m.acc !== null && m.acc >= 75).sort((a, b) => b.acc - a.acc);
  const untouchedTopics = topicMetrics.filter(m => m.done === 0);

  const diagBox = document.getElementById('userDiagnosticSummaryBox');
  if (done === 0) {
    diagBox.innerHTML = '<div class="font-bold text-teal-950">👋 Chào ' + escapeHtml(prof.name) + '! Bạn chưa làm câu hỏi nào trong ngân hàng đề.</div><p class="text-slate-700">Hãy bắt đầu với <strong>Phần I (38 câu theo chủ đề bệnh học)</strong> hoặc làm thử 1 bài <strong>Đề phản xạ nhanh 20 câu</strong> để hệ thống phân tích chính xác điểm mạnh, điểm yếu và gợi ý lộ trình cải thiện cá nhân hóa cho bạn.</p>';
  } else {
    const pctAcc = Math.round((correct / done) * 100);
    let adviceHtml = '<div class="font-bold text-teal-950 text-sm">📊 Đánh giá tổng quan cho ' + escapeHtml(prof.name) + ': Đã hoàn thành ' + done + '/' + totalQ + ' câu (' + Math.round((done / totalQ) * 100) + '%), tỷ lệ chính xác đạt <span class="text-emerald-800">' + pctAcc + '%</span> (tương đương ' + currentScore10.toFixed(2) + '/10 điểm).</div>';
    const bullets = [];
    if (currentScore10 < prof.targetScore) {
      bullets.push('• <strong>Khoảng cách tới mục tiêu (' + prof.targetScore + '/10):</strong> Bạn cần cải thiện thêm <strong>' + (prof.targetScore - currentScore10).toFixed(2) + ' điểm</strong>. Hãy tập trung xử lý dứt điểm <strong>' + wrong + ' câu đã làm sai</strong>.');
    } else {
      bullets.push('• <strong>Đạt mục tiêu đề ra:</strong> Điểm trung bình hiện tại của bạn đã vượt mục tiêu ' + prof.targetScore + '/10! Hãy tiếp tục hoàn thành <strong>' + (totalQ - done) + ' câu chưa làm</strong> để phủ kín 100% kiến thức.');
    }
    if (weakTopics.length > 0) {
      bullets.push('• <strong>Chuyên đề cần ưu tiên củng cố ngay:</strong> ' + weakTopics.slice(0, 3).map(w => '<strong>' + escapeHtml(w.topic) + '</strong> (' + (w.acc !== null ? w.acc + '% đúng, sai ' + w.wrong + ' câu' : 'chưa vững') + ')').join(', ') + '.');
    }
    if (trapWrong > 0) {
      bullets.push('• <strong>Cảnh báo bẫy lâm sàng:</strong> Bạn đang mắc <strong>' + trapWrong + ' câu bẫy / câu tô vàng sai từ đề gốc</strong>. Hãy lọc trạng thái "⚠️ Câu bẫy" ở mục Ôn tập để đọc kỹ giải thích đính chính.');
    }
    if (untouchedTopics.length > 0) {
      bullets.push('• <strong>Chuyên đề chưa ôn tới:</strong> ' + untouchedTopics.map(u => escapeHtml(u.topic)).join(', ') + '.');
    }
    diagBox.innerHTML = adviceHtml + '<div class="space-y-1 text-slate-800 pt-1">' + bullets.join('<br/>') + '</div>';
  }

  document.getElementById('userWeakTopicCountBadge').textContent = weakTopics.length + ' chủ đề cần chú ý';
  const weakListEl = document.getElementById('userNeedImprovementList');
  if (weakTopics.length === 0) {
    weakListEl.innerHTML = untouchedTopics.length > 0
      ? '<div class="text-slate-600">Chưa phát hiện câu trả lời sai. Bạn còn <strong>' + untouchedTopics.length + ' chủ đề chưa bắt đầu luyện tập</strong> (' + untouchedTopics.slice(0, 4).map(u => escapeHtml(u.topic)).join(', ') + ').</div>'
      : '<div class="text-emerald-800 font-semibold">🎉 Tuyệt vời! Tất cả các chủ đề bạn đã làm đều đạt độ chính xác ≥ 75% và không có câu sai tồn đọng.</div>';
  } else {
    weakListEl.innerHTML = weakTopics.map(w => '<div class="p-2.5 rounded-lg bg-white border border-rose-200 flex items-center justify-between gap-2"><div><div class="font-bold text-slate-900">' + escapeHtml(w.topic) + '</div><div class="text-[11px] text-rose-700">Đúng ' + w.correct + '/' + w.done + ' câu (' + (w.acc !== null ? w.acc + '%' : '0%') + ') • Sai ' + w.wrong + ' câu • Còn ' + (w.total - w.done) + ' câu chưa làm</div></div><button type="button" onclick="jumpToTopicStudy(\'' + escapeHtml(w.topic) + '\')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0">Ôn ngay →</button></div>').join('');
  }

  document.getElementById('userStrongTopicCountBadge').textContent = strongTopics.length + ' chủ đề vững';
  const strongListEl = document.getElementById('userStrengthsList');
  if (strongTopics.length === 0) {
    strongListEl.innerHTML = '<div class="text-slate-600">Hãy hoàn thành tối thiểu 2 câu hỏi mỗi chủ đề với độ chính xác ≥ 75% để ghi nhận các chuyên đề thế mạnh của bạn.</div>';
  } else {
    strongListEl.innerHTML = strongTopics.map(st => '<div class="p-2.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between gap-2"><div><div class="font-bold text-slate-900">' + escapeHtml(st.topic) + '</div><div class="text-[11px] text-emerald-700">Chính xác ' + st.acc + '% (' + st.correct + '/' + st.done + ' câu) • Đã làm ' + st.completion + '% chuyên đề</div></div><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">✓ Vững</span></div>').join('');
  }

  const partsList = (activeCourseObj && activeCourseObj.partOrder) ? activeCourseObj.partOrder : ['Phần I', 'Phần II', 'Phần III', 'Phần IV', 'Phần V', 'Phần VI', 'Phần VII'];
  const partNames = (activeCourseObj && activeCourseObj.partNames) ? activeCourseObj.partNames : {};
  const partCardsHtml = partsList.map(pKey => {
    const pQs = QUESTIONS_BANK.filter(q => q.part === pKey);
    if (pQs.length === 0) return '';
    let pDone = 0, pCorr = 0, pWrong = 0;
    pQs.forEach(q => {
      if (userProgress.answers.hasOwnProperty(q.id)) {
        pDone++;
        if (userProgress.answers[q.id] === q.correct_idx) pCorr++;
        else pWrong++;
      }
    });
    const pAcc = pDone > 0 ? Math.round((pCorr / pDone) * 100) : 0;
    const pRem = pQs.length - pDone;
    let recBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">Cần luyện tập</span>';
    if (pWrong > 0 || (pDone > 0 && pAcc < 70)) recBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">🔴 Ưu tiên ôn gấp (' + pWrong + ' câu sai)</span>';
    else if (pDone === pQs.length && pAcc >= 80) recBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">🟢 Đã nắm vững</span>';

    return (
      '<div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">' +
        '<div class="space-y-1.5">' +
          '<div class="flex items-center justify-between gap-2">' +
            recBadge +
            '<span class="text-xs font-bold text-slate-500">' + pDone + '/' + pQs.length + ' câu</span>' +
          '</div>' +
          '<h4 class="text-sm font-bold text-slate-900">' + escapeHtml(partNames[pKey] || pKey) + '</h4>' +
          '<p class="text-xs text-slate-600">Độ chính xác: <strong>' + pAcc + '%</strong> • Còn <strong>' + pRem + ' câu</strong> chưa làm</p>' +
        '</div>' +
        '<div class="flex items-center gap-2 pt-1">' +
          '<button type="button" onclick="jumpToPartStudy(\'' + pKey + '\')" class="flex-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold text-center transition">📚 Ôn phần này</button>' +
          '<button type="button" onclick="startPartExamDirect(\'' + pKey + '\')" class="px-3 py-1.5 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 text-teal-800 text-xs font-semibold transition">⏱️ Thi thử</button>' +
        '</div>' +
      '</div>'
    );
  }).filter(Boolean).join('');
  document.getElementById('userPartRecommendationGrid').innerHTML = partCardsHtml;

  const sortedAllTopics = topicMetrics.slice().sort((a, b) => b.priorityScore - a.priorityScore);
  const topicTableHtml =
    '<table class="w-full text-left border-collapse text-xs sm:text-sm">' +
      '<thead>' +
        '<tr class="border-b border-slate-200 bg-slate-50 text-slate-600">' +
          '<th class="py-2 px-3 font-semibold">Chủ đề bệnh học</th>' +
          '<th class="py-2 px-3 font-semibold">Tiến độ</th>' +
          '<th class="py-2 px-3 font-semibold">Đúng / Sai</th>' +
          '<th class="py-2 px-3 font-semibold">Mức ưu tiên</th>' +
          '<th class="py-2 px-3 font-semibold text-right">Hành động</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody class="divide-y divide-slate-100">' +
        sortedAllTopics.map(m => {
          let prioBadge = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">🟡 Khuyến nghị ôn tiếp</span>';
          if (m.wrong > 0 || (m.acc !== null && m.acc < 70)) prioBadge = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">🔴 Cần ôn tập ngay</span>';
          else if (m.done === m.total && m.acc >= 80) prioBadge = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">🟢 Đã thành thạo</span>';
          return (
            '<tr class="hover:bg-slate-50">' +
              '<td class="py-2.5 px-3 font-bold text-slate-900">' + escapeHtml(m.topic) + '</td>' +
              '<td class="py-2.5 px-3">' + m.done + '/' + m.total + ' câu (' + m.completion + '%)</td>' +
              '<td class="py-2.5 px-3"><span class="text-emerald-700 font-semibold">' + m.correct + ' đúng</span> / <span class="text-rose-700 font-semibold">' + m.wrong + ' sai</span> (' + (m.acc !== null ? m.acc + '%' : '--') + ')</td>' +
              '<td class="py-2.5 px-3">' + prioBadge + '</td>' +
              '<td class="py-2.5 px-3 text-right">' +
                '<button type="button" onclick="jumpToTopicStudy(\'' + escapeHtml(m.topic) + '\')" class="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold">Ôn chuyên đề →</button>' +
              '</td>' +
            '</tr>'
          );
        }).join('') +
      '</tbody>' +
    '</table>';
  document.getElementById('userTopicRecommendationTable').innerHTML = topicTableHtml;

  const sesContainer = document.getElementById('userSessionHistoryContainer');
  if (userProgress.sessions.length === 0) {
    sesContainer.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Chưa có kết quả phiên học nào. Bạn có thể làm bài thi thử, nhấn "💾 Lưu Session" hoặc nhấn "📥 Nhập Phiên học (.json)" để tải kết quả phiên trước lên.</div>';
  } else {
    sesContainer.innerHTML =
      '<table class="w-full text-left border-collapse text-xs sm:text-sm">' +
        '<thead>' +
          '<tr class="border-b border-slate-200 bg-slate-50 text-slate-600">' +
            '<th class="py-2.5 px-3 font-semibold">#</th>' +
            '<th class="py-2.5 px-3 font-semibold">Thời gian</th>' +
            '<th class="py-2.5 px-3 font-semibold">Phiên học / Đề thi</th>' +
            '<th class="py-2.5 px-3 font-semibold">Kết quả</th>' +
            '<th class="py-2.5 px-3 font-semibold">Điểm số</th>' +
            '<th class="py-2.5 px-3 font-semibold">Thời lượng</th>' +
            '<th class="py-2.5 px-3 font-semibold text-right">Thao tác</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody class="divide-y divide-slate-100">' +
          userProgress.sessions.map((s, idx) => {
            const sPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              '<tr class="hover:bg-slate-50">' +
                '<td class="py-2.5 px-3 font-bold text-slate-500">' + (idx + 1) + '</td>' +
                '<td class="py-2.5 px-3 text-slate-600 whitespace-nowrap">' + escapeHtml(s.date) + '</td>' +
                '<td class="py-2.5 px-3 font-semibold text-slate-900">' + escapeHtml(s.type) + ': ' + escapeHtml(s.label) + '</td>' +
                '<td class="py-2.5 px-3">' + s.correct + '/' + s.total + ' (' + sPct + '%)</td>' +
                '<td class="py-2.5 px-3 font-extrabold text-teal-800">' + escapeHtml(s.score10) + ' / 10</td>' +
                '<td class="py-2.5 px-3 font-mono text-xs">' + formatTime(s.durationSec || 0) + '</td>' +
                '<td class="py-2.5 px-3 text-right whitespace-nowrap space-x-1">' +
                  '<button type="button" onclick="openSessionDetailModal(' + idx + ')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">👁️ Chi tiết</button>' +
                  '<button type="button" onclick="exportSingleSession(' + idx + ')" class="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold">⬇️ Xuất phiên</button>' +
                  '<button type="button" onclick="deleteSingleSession(' + idx + ')" class="px-2 py-1 rounded hover:bg-rose-50 text-rose-600 text-xs font-semibold" title="Xóa phiên này">🗑️</button>' +
                '</td>' +
              '</tr>'
            );
          }).join('') +
        '</tbody>' +
      '</table>';
  }

  const allComments = [];
  if (userProgress.inlineComments) {
    Object.keys(userProgress.inlineComments).forEach(qid => {
      const qObj = QUESTIONS_BANK.find(x => x.id === qid);
      (userProgress.inlineComments[qid] || []).forEach(c => {
        allComments.push({ qId: qid, qNum: qObj ? qObj.num : '?', qTopic: qObj ? qObj.topic : '', comment: c });
      });
    });
  }
  const cmtListEl = document.getElementById('userAllCommentsList');
  if (allComments.length === 0) {
    cmtListEl.innerHTML = '<div class="col-span-2 p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Bạn chưa có ghi chú bôi đậm nào. Khi đang ở mục <strong>Ôn tập &amp; Giải đáp</strong>, hãy <strong>bôi đen bất kỳ từ khóa/cụm từ nào</strong> trên câu hỏi để tạo Comment kiểu Google Docs/Word!</div>';
  } else {
    cmtListEl.innerHTML = allComments.map(item => (
      '<div class="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-1.5 flex flex-col justify-between">' +
        '<div>' +
          '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-xs font-bold text-indigo-950">Câu #' + item.qNum + ' • ' + escapeHtml(item.qTopic) + '</span>' +
            '<span class="text-[11px] text-slate-400">' + escapeHtml(item.comment.createdAt || '') + '</span>' +
          '</div>' +
          '<div class="text-xs bg-yellow-100/90 border-l-4 border-yellow-500 px-2 py-1 text-slate-800 font-semibold italic mt-1">"' + escapeHtml(item.comment.quote) + '"</div>' +
          '<div class="text-xs sm:text-sm text-slate-800 mt-1.5">' + escapeHtml(item.comment.note) + '</div>' +
        '</div>' +
        '<div class="pt-2 flex items-center justify-end gap-2">' +
          '<button type="button" onclick="jumpToStudyQuestionCard(\'' + item.qId + '\')" class="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Đi tới câu hỏi →</button>' +
        '</div>' +
      '</div>'
    )).join('');
  }

  renderAccountAndProfilesManagerUI();
}

