function applySubjectConfigUI() {
  const titleEl = document.getElementById('appHeaderTitleText');
  const subEl = document.getElementById('appHeaderSubtitleText');
  const iconEl = document.getElementById('appHeaderIconBox');
  if (titleEl && activeSubjectConfig.subjectName) titleEl.textContent = activeSubjectConfig.subjectName;
  if (subEl && activeSubjectConfig.subtitle) subEl.textContent = activeSubjectConfig.subtitle;
  if (iconEl && activeSubjectConfig.icon) iconEl.textContent = activeSubjectConfig.icon;
  document.title = (activeSubjectConfig.subjectName || 'Hệ Thống Ôn Tập') + ' - Chuẩn Y Khoa';
}

function openSubjectConfigModal() {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  titleEl.textContent = '⚙️ Cài đặt Tên Môn Học, Bộ Môn & Mã Lưu Trữ Riêng';
  bodyEl.innerHTML = '<div class="space-y-3.5">' +
    '<div class="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950">' +
      'Bạn có thể đặt lại tên môn học, mô tả bộ môn và <strong>Mã vùng nhớ lưu trữ (Storage Namespace)</strong> để khi nhân bản file HTML này cho nhiều môn khác nhau (Nội, Ngoại, Sản, Nhi, Dược lý...), dữ liệu từng môn được lưu tách biệt hoàn toàn.' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-4 gap-3">' +
      '<div>' +
        '<label class="block text-xs font-bold text-slate-700 mb-1">Biểu tượng (Emoji)</label>' +
        '<input id="subjCfgIconInput" type="text" value="' + escapeHtml(activeSubjectConfig.icon || '🎓') + '" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base text-center" />' +
      '</div>' +
      '<div class="sm:col-span-3">' +
        '<label class="block text-xs font-bold text-slate-700 mb-1">Tên Hệ thống / Môn học hiển thị trên Header</label>' +
        '<input id="subjCfgNameInput" type="text" value="' + escapeHtml(activeSubjectConfig.subjectName || '') + '" placeholder="VD: Hệ Thống Ôn Tập Nội Khoa Đại Học Y Hà Nội" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-bold" />' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<label class="block text-xs font-bold text-slate-700 mb-1">Mô tả phụ đề / Tài liệu tham chiếu</label>' +
      '<input id="subjCfgSubInput" type="text" value="' + escapeHtml(activeSubjectConfig.subtitle || '') + '" placeholder="VD: Giáo trình Nội khoa ĐHYHN & Hướng dẫn Chẩn đoán, Điều trị Bộ Y tế" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm" />' +
    '</div>' +
    '<div>' +
      '<label class="block text-xs font-bold text-slate-700 mb-1">Mã vùng nhớ riêng của môn học (Storage Namespace)</label>' +
      '<input id="subjCfgNsInput" type="text" value="' + escapeHtml(activeSubjectConfig.storageNamespace || 'hmu_custom_subject_template_v1') + '" placeholder="VD: hmu_noikhoa_y4_v1" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono" />' +
    '</div>' +
  '</div>';

  footerEl.innerHTML = '<button type="button" onclick="saveSubjectConfigFromModal()" class="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold">💾 Lưu Cấu hình Môn học</button>' +
    '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function saveSubjectConfigFromModal() {
  const iconVal = (document.getElementById('subjCfgIconInput').value || '').trim() || '🎓';
  const nameVal = (document.getElementById('subjCfgNameInput').value || '').trim() || 'Hệ Thống Ôn Tập Đa Môn Học';
  const subVal = (document.getElementById('subjCfgSubInput').value || '').trim() || '';
  const nsVal = (document.getElementById('subjCfgNsInput').value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'hmu_custom_subject_template_v1';

  activeSubjectConfig = {
    icon: iconVal,
    subjectName: nameVal,
    subtitle: subVal,
    storageNamespace: nsVal
  };
  try {
    localStorage.setItem('hmu_template_subject_meta_v1', JSON.stringify(activeSubjectConfig));
  } catch (e) {}
  STORAGE_KEY = activeSubjectConfig.storageNamespace + '_progress';
  PROFILES_REGISTRY_KEY = activeSubjectConfig.storageNamespace + '_profiles';
  CLOUD_VAULT_KEY = activeSubjectConfig.storageNamespace + '_cloud_vault';
  applySubjectConfigUI();
  loadProgress();
  populateTopicDropdowns();
  updateTopStats();
  applyStudyFilters();
  closeCustomDataModal();
  showToast('✅ Đã cập nhật cấu hình môn học: ' + nameVal);
}

function copyPromptTemplateText(preId) {
  const el = document.getElementById(preId);
  if (!el) return;
  const ta = document.createElement('textarea');
  ta.value = el.textContent;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('📋 Đã sao chép Mẫu Prompt vào Clipboard! Bạn có thể dán gửi cho AI ngay.');
}


function rebuildCourseSpecificDropdowns() {
  if (!activeCourseObj) return;
  const pOrder = activeCourseObj.partOrder || ['Phần I', 'Phần II', 'Phần III', 'Phần IV', 'Phần V', 'Phần VI'];
  const pNames = activeCourseObj.partNames || {};
  const totalQ = QUESTIONS_BANK.length;

  // 1. studyFilterPart & fcFilterPart
  const partOptionsHtml = '<option value="all">Tất cả các Phần (' + totalQ + ' câu)</option>' +
    pOrder.map(pk => '<option value="' + escapeHtml(pk) + '">' + escapeHtml(pNames[pk] || pk) + '</option>').join('');
  const studyPartSel = document.getElementById('studyFilterPart');
  if (studyPartSel) studyPartSel.innerHTML = partOptionsHtml;
  const fcPartSel = document.getElementById('fcFilterPart');
  if (fcPartSel) fcPartSel.innerHTML = partOptionsHtml;

  // 2. qmPartSelect & qmFilterPart
  const qmPartSel = document.getElementById('qmPartSelect');
  if (qmPartSel) {
    const reversed = pOrder.slice().reverse();
    qmPartSel.innerHTML = reversed.map(pk => '<option value="' + escapeHtml(pk) + '">' + escapeHtml(pNames[pk] || pk) + '</option>').join('');
  }
  const qmFilterPartSel = document.getElementById('qmFilterPart');
  if (qmFilterPartSel) {
    qmFilterPartSel.innerHTML = '<option value="all">Tất cả các Phần</option>' +
      pOrder.map(pk => '<option value="' + escapeHtml(pk) + '">' + escapeHtml(pk) + '</option>').join('');
  }

  // 3. examPresetSelect
  const examPresetSel = document.getElementById('examPresetSelect');
  if (examPresetSel) {
    const stdLabel = activeCourseObj.defaultExamLabel || ('Đề chuẩn ĐHYHN: ' + (activeCourseObj.defaultExamCount || 40) + ' câu ngẫu nhiên');
    const partPresetsHtml = pOrder.filter(pk => QUESTIONS_BANK.some(q => q.part === pk)).map(pk =>
      '<option value="part_' + escapeHtml(pk) + '">Trọn bộ ' + escapeHtml(pNames[pk] || pk) + '</option>'
    ).join('');
    examPresetSel.innerHTML =
      '<option value="standard37">' + escapeHtml(stdLabel) + '</option>' +
      '<option value="quick20">Đề phản xạ nhanh: 20 câu ngẫu nhiên (15 phút)</option>' +
      partPresetsHtml +
      '<option value="topic">Thi theo Chuyên đề / Chủ đề tự chọn</option>' +
      '<option value="wrong_only">Đề ôn tập các câu từng làm sai / Đánh dấu ⭐</option>' +
      '<option value="full160">Toàn bộ ngân hàng câu hỏi (' + totalQ + ' câu)</option>';
  }
  const examTimeInp = document.getElementById('examTimeMinutes');
  if (examTimeInp) examTimeInp.value = activeCourseObj.defaultExamMinutes || 30;

  // 4. qmTopicDatalist
  const dl = document.getElementById('qmTopicDatalist');
  if (dl && Array.isArray(activeCourseObj.topicsList)) {
    dl.innerHTML = activeCourseObj.topicsList.map(tp => '<option value="' + escapeHtml(tp) + '"></option>').join('');
    const qmTpInp = document.getElementById('qmTopicInput');
    if (qmTpInp && activeCourseObj.topicsList.length > 0) qmTpInp.value = activeCourseObj.topicsList[0];
  }

  // 5. Update quick course switcher buttons in top bar
  Object.keys(COURSE_BANKS_DATA).forEach(cid => {
    const btn = document.getElementById('quickCourseBtn-' + cid);
    if (!btn) return;
    if (cid === activeCourseId) {
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 bg-emerald-500 text-slate-950 shadow-sm border border-emerald-300';
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15';
    }
  });

  // Highlight active year pill on top bar
  ['all', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'].forEach(yr => {
    const yBtn = document.getElementById('topYearBtn-' + yr);
    if (!yBtn) return;
    if (activeCourseObj.year === yr) {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-extrabold transition bg-amber-400 text-slate-950 shadow-2xs';
    } else if (yr === 'Y2' || yr === 'Y5') {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-bold transition bg-teal-500/20 border border-teal-400/40 text-teal-200 hover:bg-teal-500/30';
    } else {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-bold transition bg-white/5 hover:bg-white/15 text-slate-300';
    }
  });
}

function resetUserProgressMemoryForCourseSwitch() {
  userProgress = {
    answers: {},
    bookmarks: {},
    flashcards: {},
    sessions: [],
    profile: {
      name: 'Sinh viên Y khoa ĐHYHN',
      studentId: (activeCourseObj ? activeCourseObj.year : 'Y5') + ' - Bác sĩ Đa khoa',
      targetScore: 8.5,
      examDate: '2026-12-15',
      goalNote: (activeCourseObj && activeCourseObj.goalNoteDefault) || ''
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
  profilesRegistry = {
    activeProfileId: 'prof_default',
    profiles: {}
  };
  studyHintOpen = {};
  studyExpOpen = {};
}

function switchActiveCourse(courseId, closeHubAfter) {
  if (!COURSE_BANKS_DATA[courseId]) return;
  if (examState && examState.timerId) {
    clearInterval(examState.timerId);
    examState.timerId = null;
    examState.active = false;
  }
  activeCourseId = courseId;
  activeCourseObj = COURSE_BANKS_DATA[courseId];
  try {
    localStorage.setItem('hmu_active_course_id_v1', courseId);
  } catch (e) {}

  activeSubjectConfig = {
    subjectName: activeCourseObj.subjectName,
    subtitle: activeCourseObj.subtitle,
    icon: activeCourseObj.icon,
    year: activeCourseObj.year,
    storageNamespace: activeCourseObj.storageNamespace
  };
  hydrateCourseData(activeCourseObj);
  ORIGINAL_BANK_SNAPSHOT = (activeCourseObj.questions || []).map(cloneQuestionFast);
  BUILTIN_STEM_CLUSTERS = JSON.parse(JSON.stringify(activeCourseObj.clusters || {}));

  STORAGE_KEY = activeSubjectConfig.storageNamespace + '_progress';
  PROFILES_REGISTRY_KEY = activeSubjectConfig.storageNamespace + '_profiles';
  CLOUD_VAULT_KEY = activeSubjectConfig.storageNamespace + '_cloud_vault';

  resetUserProgressMemoryForCourseSwitch();
  loadProgress();
  applySubjectConfigUI();
  rebuildCourseSpecificDropdowns();
  populateTopicDropdowns();
  updateTopStats();
  applyStudyFilters();
  applyFlashcardFilters();
  if (currentTab === 'analytics') renderAnalyticsView();
  if (currentTab === 'user') renderUserProfileAndAdvisor();
  if (currentTab === 'manage') {
    renderManageQuestionsList();
    renderStemClustersManager();
  }
  if (closeHubAfter !== false) closeCourseHubModal();
  showToast('🎓 Đã chuyển sang học phần [' + activeCourseObj.year + ']: ' + activeCourseObj.shortName + ' (' + QUESTIONS_BANK.length + ' câu)');
}

let currentHubFilterYear = 'all';

function getCourseProgressSummary(courseObj) {
  const total = (courseObj.questions || []).length;
  let done = 0, corr = 0;
  try {
    const raw = localStorage.getItem(courseObj.storageNamespace + '_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      const ansMap = parsed.answers || {};
      (courseObj.questions || []).forEach(q => {
        if (ansMap.hasOwnProperty(q.id)) {
          done++;
          if (ansMap[q.id] === q.correct_idx) corr++;
        }
      });
    }
  } catch (e) {}
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const acc = done > 0 ? Math.round((corr / done) * 100) : 0;
  const caseCount = Object.keys(courseObj.clusters || {}).length;
  return { total, done, corr, pct, acc, caseCount };
}

function openCourseHubModal(filterYear) {
  const modal = document.getElementById('courseHubModal');
  if (!modal) return;
  const startupChk = document.getElementById('showCourseHubOnStartupToggle');
  if (startupChk) {
    startupChk.checked = localStorage.getItem('hmu_hide_course_hub_on_startup_v1') !== '1';
  }
  renderCourseHubCards(filterYear || 'all');
  modal.classList.remove('hidden');
}

function closeCourseHubModal() {
  const modal = document.getElementById('courseHubModal');
  if (modal) modal.classList.add('hidden');
}

function toggleShowCourseHubOnStartup(show) {
  try {
    localStorage.setItem('hmu_hide_course_hub_on_startup_v1', show ? '0' : '1');
  } catch (e) {}
}

function renderCourseHubCards(filterYear) {
  currentHubFilterYear = filterYear || 'all';
  document.querySelectorAll('.hub-year-tab').forEach(btn => {
    const yr = btn.getAttribute('data-year');
    if (yr === currentHubFilterYear) {
      btn.className = 'hub-year-tab px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition bg-teal-800 text-white shadow-xs';
    } else if (yr === 'Y2') {
      btn.className = 'hub-year-tab px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition bg-white hover:bg-emerald-50 text-emerald-900 border-2 border-emerald-500';
    } else if (yr === 'Y5') {
      btn.className = 'hub-year-tab px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-500';
    } else {
      btn.className = 'hub-year-tab px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white hover:bg-slate-50 text-slate-700 border border-slate-300';
    }
  });

  const container = document.getElementById('courseHubCardsContainer');
  if (!container) return;

  const allCourses = Object.values(COURSE_BANKS_DATA);
  const filtered = currentHubFilterYear === 'all'
    ? allCourses
    : allCourses.filter(c => c.year === currentHubFilterYear);

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="col-span-full bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-3">' +
        '<div class="text-3xl">📂</div>' +
        '<h3 class="text-base font-extrabold text-slate-900">Năm học ' + escapeHtml(currentHubFilterYear) + ' hiện chưa có học phần mặc định</h3>' +
        '<p class="text-xs text-slate-600 max-w-lg mx-auto">Các học phần mặc định hiện có nằm ở <strong>Năm Y2 (Nhiễm trùng - Miễn dịch S2.2)</strong> và <strong>Năm Y5 (Bệnh Truyền nhiễm S3.10 &amp; Ung thư học S3.7/S3.8)</strong>. Bạn có thể tạo học phần mới cho Năm ' + escapeHtml(currentHubFilterYear) + ' hoặc chuyển sang xem Tất cả các năm.</p>' +
        '<div class="flex items-center justify-center gap-2 pt-2">' +
          '<button type="button" data-year="all" onclick="renderCourseHubCards(this.dataset.year)" class="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold">Xem tất cả 16 học phần (Y2 &amp; Y5 • 2627 câu)</button>' +
          '<button type="button" data-year="' + escapeHtml(currentHubFilterYear) + '" onclick="openCreateCustomCourseModal(this.dataset.year)" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">➕ Tạo Học phần mới cho ' + escapeHtml(currentHubFilterYear) + '</button>' +
        '</div>' +
      '</div>';
    return;
  }

  container.innerHTML = filtered.map(c => {
    const st = getCourseProgressSummary(c);
    const isCurrent = c.id === activeCourseId;
    const yearBadgeClass = c.year === 'Y2'
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
      : (c.year === 'Y5' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-indigo-100 text-indigo-900 border-indigo-300');

    return '<div class="rounded-2xl border-2 ' + (isCurrent ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/30' : 'border-slate-200 bg-white hover:border-teal-400') + ' p-5 shadow-xs flex flex-col justify-between space-y-4 transition">' +
      '<div class="space-y-3">' +
        '<div class="flex items-center justify-between gap-2 flex-wrap">' +
          '<span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold border ' + yearBadgeClass + '">🎓 Năm ' + escapeHtml(c.year) + '</span>' +
          (isCurrent
            ? '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-700 text-white">✓ Đang mở ôn luyện</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">Độc lập dữ liệu</span>') +
        '</div>' +
        '<div class="flex items-start gap-3">' +
          '<div class="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shrink-0">' + escapeHtml(c.icon || '📘') + '</div>' +
          '<div>' +
            '<h3 class="text-base font-extrabold text-slate-900 leading-snug">' + escapeHtml(c.shortName || c.subjectName) + '</h3>' +
            '<p class="text-[11px] text-slate-500 mt-0.5">' + escapeHtml(c.yearLabel || ('Năm học ' + c.year)) + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="text-xs text-slate-600 leading-relaxed line-clamp-3">' + escapeHtml(c.subtitle || '') + '</p>' +
        '<div class="grid grid-cols-3 gap-2 pt-1 text-center">' +
          '<div class="p-2 rounded-xl bg-slate-50 border border-slate-200">' +
            '<div class="text-[10px] text-slate-500 font-semibold">Ngân hàng</div>' +
            '<div class="text-sm font-black text-slate-900">' + st.total + ' câu</div>' +
          '</div>' +
          '<div class="p-2 rounded-xl bg-cyan-50/70 border border-cyan-200">' +
            '<div class="text-[10px] text-cyan-800 font-semibold">Case Thân chung</div>' +
            '<div class="text-sm font-black text-cyan-950">' + st.caseCount + ' chùm</div>' +
          '</div>' +
          '<div class="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">' +
            '<div class="text-[10px] text-emerald-800 font-semibold">Đã luyện</div>' +
            '<div class="text-sm font-black text-emerald-950">' + st.done + '/' + st.total + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="space-y-1">' +
          '<div class="flex items-center justify-between text-[11px] text-slate-600">' +
            '<span>Tiến độ hoàn thành: <strong>' + st.pct + '%</strong></span>' +
            '<span>Chính xác: <strong class="text-emerald-700">' + st.acc + '%</strong></span>' +
          '</div>' +
          '<div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">' +
            '<div class="h-full bg-teal-600 rounded-full transition-all" style="width:' + st.pct + '%"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pt-2 border-t border-slate-100">' +
        '<button type="button" data-cid="' + escapeHtml(c.id) + '" onclick="switchActiveCourse(this.dataset.cid, true)" class="w-full py-2.5 px-4 rounded-xl ' + (isCurrent ? 'bg-teal-800 hover:bg-teal-900' : 'bg-teal-600 hover:bg-teal-700') + ' text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-1.5">' +
          '<span>🚀 ' + (isCurrent ? 'Tiếp tục Ôn luyện Học phần này' : 'Chọn & Vào Ôn luyện Ngay') + '</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function openCreateCustomCourseModal(defaultYear) {
  closeCourseHubModal();
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  const yr = defaultYear && defaultYear !== 'all' ? defaultYear : 'Y3';
  titleEl.textContent = '➕ Tạo Học Phần Mới Theo Năm Học (Y1 – Y6)';
  bodyEl.innerHTML = '<div class="space-y-3.5 text-xs">' +
    '<div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">' +
      'Tạo một học phần độc lập mới thuộc một trong các năm <strong>Y1, Y2, Y3, Y4, Y5, Y6</strong>. Sau khi tạo, bạn có thể thêm câu hỏi hoặc nhập file JSON câu hỏi vào học phần đó.' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">' +
      '<div>' +
        '<label class="block font-bold text-slate-700 mb-1">Năm học (Y1–Y6)</label>' +
        '<select id="newCourseYearSelect" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-bold">' +
          ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'].map(y => '<option value="' + y + '"' + (y === yr ? ' selected' : '') + '>Năm ' + y + '</option>').join('') +
        '</select>' +
      '</div>' +
      '<div>' +
        '<label class="block font-bold text-slate-700 mb-1">Biểu tượng (Emoji)</label>' +
        '<input id="newCourseIconInput" type="text" value="📘" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-center text-base" />' +
      '</div>' +
      '<div>' +
        '<label class="block font-bold text-slate-700 mb-1">Mã định danh (ID)</label>' +
        '<input id="newCourseIdInput" type="text" placeholder="VD: noikhoa_y4" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono" />' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<label class="block font-bold text-slate-700 mb-1">Tên Học phần hiển thị</label>' +
      '<input id="newCourseNameInput" type="text" placeholder="VD: Học phần Nội cơ sở / Sinh lý học / Ngoại bệnh lý..." class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-bold" />' +
    '</div>' +
    '<div>' +
      '<label class="block font-bold text-slate-700 mb-1">Mô tả chi tiết học phần</label>' +
      '<input id="newCourseSubInput" type="text" placeholder="VD: Ngân hàng câu hỏi trắc nghiệm & Case lâm sàng ĐHYHN" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2" />' +
    '</div>' +
  '</div>';

  footerEl.innerHTML =
    '<button type="button" onclick="saveNewCustomCourse()" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">✨ Tạo & Mở Học Phần</button>' +
    '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Hủy</button>';
  modal.classList.remove('hidden');
}

function saveNewCustomCourse() {
  const yr = (document.getElementById('newCourseYearSelect').value || 'Y3').trim();
  const icon = (document.getElementById('newCourseIconInput').value || '📘').trim();
  const name = (document.getElementById('newCourseNameInput').value || '').trim();
  const sub = (document.getElementById('newCourseSubInput').value || 'Ngân hàng câu hỏi ôn tập Y khoa ĐHYHN').trim();
  let cid = (document.getElementById('newCourseIdInput').value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!name) {
    showToast('⚠️ Vui lòng nhập tên học phần!');
    return;
  }
  if (!cid) cid = 'course_' + yr.toLowerCase() + '_' + Date.now();
  const newObj = {
    id: cid,
    year: yr,
    yearLabel: 'Năm thứ ' + yr.replace('Y', '') + ' (' + yr + ')',
    icon: icon,
    shortName: name,
    subjectName: 'Hệ Thống Ôn Tập: ' + name + ' (Năm ' + yr + ')',
    subtitle: sub,
    storageNamespace: 'hmu_' + cid + '_v1',
    defaultExamCount: 40,
    defaultExamMinutes: 30,
    defaultExamLabel: 'Đề chuẩn: 40 câu ngẫu nhiên (30 phút)',
    partOrder: ['Phần I', 'Phần II', 'Phần III', 'Phần IV', 'Phần V', 'Phần VI'],
    partNames: {
      'Phần I': 'Phần I: Lý thuyết trọng tâm',
      'Phần II': 'Phần II: Đề Review tổng hợp',
      'Phần III': 'Phần III: Case lâm sàng',
      'Phần IV': 'Phần IV: Bổ sung',
      'Phần V': 'Phần V: Đề thi thử',
      'Phần VI': 'Phần VI: Câu hỏi Tự biên soạn'
    },
    partTitleMap: {},
    topicsList: ['Chuyên đề 1', 'Chuyên đề 2', 'Lâm sàng'],
    questions: [],
    clusters: {}
  };
  COURSE_BANKS_DATA[cid] = newObj;
  try {
    const raw = localStorage.getItem('hmu_custom_courses_catalog_v1');
    const map = raw ? JSON.parse(raw) : {};
    map[cid] = newObj;
    localStorage.setItem('hmu_custom_courses_catalog_v1', JSON.stringify(map));
  } catch (e) {}
  closeCustomDataModal();
  switchActiveCourse(cid, true);
}

