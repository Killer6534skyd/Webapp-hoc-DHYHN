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

  // 5. Update quick course switcher buttons & collapsible year drawer in top bar
  updateTopBarYearDrawerUI();
}

let selectedTopBarYear = null;

function toggleTopBarYearCourses(year) {
  if (!year) return;
  if (selectedTopBarYear === year) {
    selectedTopBarYear = null;
  } else {
    selectedTopBarYear = year;
  }
  updateTopBarYearDrawerUI();
}

function closeTopBarYearCourses() {
  selectedTopBarYear = null;
  updateTopBarYearDrawerUI();
}

function updateTopBarYearDrawerUI() {
  const activeTextEl = document.getElementById('topBarActiveCourseText');
  const chevronEl = document.getElementById('topBarDrawerChevron');
  if (activeTextEl && activeCourseObj) {
    activeTextEl.textContent = (activeCourseObj.icon || '🎓') + ' [' + activeCourseObj.year + '] ' + (activeCourseObj.shortName || activeCourseObj.subjectName);
  }
  if (chevronEl) {
    chevronEl.textContent = selectedTopBarYear ? '▴' : '▾';
  }

  // Highlight active/selected year pill on top bar
  ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'].forEach(yr => {
    const yBtn = document.getElementById('topYearBtn-' + yr);
    if (!yBtn) return;
    const isExpandedYear = selectedTopBarYear === yr;
    const isCourseYear = activeCourseObj && activeCourseObj.year === yr;
    if (isExpandedYear) {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-extrabold transition whitespace-nowrap bg-teal-700 text-white shadow-xs';
    } else if (isCourseYear) {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-extrabold transition whitespace-nowrap bg-teal-50 text-teal-800 border border-teal-300';
    } else if (yr === 'Y2' || yr === 'Y5') {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200';
    } else {
      yBtn.className = 'year-pill-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap text-slate-500 hover:bg-slate-100 hover:text-slate-800';
    }
  });

  const drawer = document.getElementById('topBarCoursesDrawer');
  const drawerTitle = document.getElementById('topBarDrawerTitle');
  const dynSlot = document.getElementById('topBarDynamicCoursesSlot');
  if (!drawer) return;

  if (!selectedTopBarYear) {
    drawer.classList.add('hidden');
    return;
  }

  drawer.classList.remove('hidden');
  const coursesInYear = Object.values(COURSE_BANKS_DATA).filter(c => c.year === selectedTopBarYear);
  if (drawerTitle) {
    drawerTitle.textContent = 'Học phần Năm ' + selectedTopBarYear + ' (' + coursesInYear.length + ' môn):';
  }

  // Show only static buttons belonging to selectedTopBarYear
  const staticBtns = document.querySelectorAll('#topBarCoursesListWrapper > button[data-course-year]');
  staticBtns.forEach(btn => {
    const bYear = btn.getAttribute('data-course-year');
    const cid = btn.id.replace('quickCourseBtn-', '');
    if (bYear !== selectedTopBarYear) {
      btn.classList.add('hidden');
      return;
    }
    btn.classList.remove('hidden');
    if (cid === activeCourseId) {
      btn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-teal-700 text-white shadow-xs';
    } else {
      btn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300';
    }
  });

  // Render any custom courses for selectedTopBarYear or empty state
  if (dynSlot) {
    const customForYear = coursesInYear.filter(c => !document.getElementById('quickCourseBtn-' + c.id));
    if (coursesInYear.length === 0) {
      dynSlot.innerHTML =
        '<span class="text-xs text-slate-500 italic mr-2">Năm ' + escapeHtml(selectedTopBarYear) + ' chưa có học phần mặc định.</span>' +
        '<button type="button" onclick="openCreateCustomCourseModal(\'' + escapeHtml(selectedTopBarYear) + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition">➕ Thêm học phần ' + escapeHtml(selectedTopBarYear) + '</button>';
    } else {
      dynSlot.innerHTML = customForYear.map(c => {
        const isCur = c.id === activeCourseId;
        const cls = isCur
          ? 'px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-teal-700 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300';
        return '<button type="button" onclick="switchActiveCourse(\'' + escapeHtml(c.id) + '\')" class="' + cls + '"><span>' + escapeHtml(c.icon || '📘') + '</span><span>' + escapeHtml(c.shortName || c.subjectName) + ' (' + (c.questions ? c.questions.length : 0) + ' câu)</span></button>';
      }).join('');
    }
  }
}

document.addEventListener('click', function (e) {
  if (!selectedTopBarYear) return;
  const root = document.getElementById('topBarSwitcherRoot');
  if (root && !root.contains(e.target)) {
    closeTopBarYearCourses();
  }
});

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
  if (!COURSE_BANKS_DATA[courseId]) {
    if (typeof ensureCourseScriptLoaded === 'function') {
      ensureCourseScriptLoaded(courseId).then(loaded => {
        if (loaded) switchActiveCourse(courseId, closeHubAfter);
      });
    }
    return;
  }
  if (examState && examState.timerId) {
    clearInterval(examState.timerId);
    examState.timerId = null;
    examState.active = false;
  }
  activeCourseId = courseId;
  activeCourseObj = COURSE_BANKS_DATA[courseId];
  selectedTopBarYear = null;
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
  if (currentTab === 'analytics') renderAnalyticsDashboard();
  if (currentTab === 'user') renderUserProfileAndAdvisor();
  if (currentTab === 'manage') {
    renderManageQuestionsList();
    renderStemClustersManager();
  }
  if (closeHubAfter !== false) closeCourseHubModal();
  showToast('🎓 Đã chuyển sang học phần [' + activeCourseObj.year + ']: ' + activeCourseObj.shortName + ' (' + QUESTIONS_BANK.length + ' câu)');
}

let currentHubFilterYear = 'Y5';

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
  const defaultYr = (filterYear && filterYear !== 'all')
    ? filterYear
    : ((activeCourseObj && activeCourseObj.year) || 'Y5');
  renderCourseHubCards(defaultYr);
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
  currentHubFilterYear = (filterYear && filterYear !== 'all')
    ? filterYear
    : ((activeCourseObj && activeCourseObj.year) || 'Y5');
  document.querySelectorAll('.hub-year-tab').forEach(btn => {
    const yr = btn.getAttribute('data-year');
    if (yr === currentHubFilterYear) {
      btn.className = 'hub-year-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition whitespace-nowrap bg-teal-700 text-white shadow-xs';
    } else if (yr === 'Y2' || yr === 'Y5') {
      btn.className = 'hub-year-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap bg-white hover:bg-teal-50 text-slate-800 border border-slate-200 hover:border-teal-300';
    } else {
      btn.className = 'hub-year-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition whitespace-nowrap bg-white hover:bg-slate-100 text-slate-500 border border-slate-200';
    }
  });

  const container = document.getElementById('courseHubCardsContainer');
  if (!container) return;

  const allCourses = Object.values(COURSE_BANKS_DATA);
  const filtered = allCourses.filter(c => c.year === currentHubFilterYear);

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-2.5">' +
        '<div class="text-2xl">📂</div>' +
        '<h3 class="text-sm sm:text-base font-extrabold text-slate-900">Năm học ' + escapeHtml(currentHubFilterYear) + ' hiện chưa có học phần mặc định</h3>' +
        '<p class="text-xs text-slate-500 max-w-md mx-auto">Các học phần có sẵn nằm ở <strong>Năm Y2 (1 môn)</strong> và <strong>Năm Y5 (15 môn)</strong>. Bạn có thể chuyển nhanh hoặc tạo học phần mới.</p>' +
        '<div class="flex flex-wrap items-center justify-center gap-2 pt-1">' +
          '<button type="button" onclick="renderCourseHubCards(\'Y2\')" class="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold">Mở Năm Y2 (1 môn)</button>' +
          '<button type="button" onclick="renderCourseHubCards(\'Y5\')" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">Mở Năm Y5 (15 môn)</button>' +
          '<button type="button" data-year="' + escapeHtml(currentHubFilterYear) + '" onclick="openCreateCustomCourseModal(this.dataset.year)" class="px-3.5 py-1.5 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold">➕ Tạo học phần ' + escapeHtml(currentHubFilterYear) + '</button>' +
        '</div>' +
      '</div>';
    return;
  }

  container.innerHTML = filtered.map(c => {
    const st = getCourseProgressSummary(c);
    const isCurrent = c.id === activeCourseId;
    const yearBadgeClass = c.year === 'Y2'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : (c.year === 'Y5' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-sky-50 text-sky-800 border-sky-200');

    return '<div class="rounded-2xl border ' + (isCurrent ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-sm') + ' p-3.5 sm:p-4 flex flex-col justify-between space-y-3 transition">' +
      '<div class="space-y-2.5">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold border ' + yearBadgeClass + '">Năm ' + escapeHtml(c.year) + '</span>' +
          (isCurrent ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-700 text-white">✓ Đang mở</span>' : '') +
        '</div>' +
        '<div class="flex items-start gap-2.5">' +
          '<div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shrink-0">' + escapeHtml(c.icon || '📘') + '</div>' +
          '<div class="min-w-0">' +
            '<h3 class="text-sm font-extrabold text-slate-900 leading-snug">' + escapeHtml(c.shortName || c.subjectName) + '</h3>' +
            '<p class="text-[11px] text-slate-500 mt-0.5 truncate">' + escapeHtml(c.yearLabel || ('Năm học ' + c.year)) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-3 gap-1.5 text-center">' +
          '<div class="p-1.5 rounded-xl bg-slate-50 border border-slate-200">' +
            '<div class="text-[10px] text-slate-500 font-medium">Câu hỏi</div>' +
            '<div class="text-xs font-extrabold text-slate-900 font-mono">' + st.total + '</div>' +
          '</div>' +
          '<div class="p-1.5 rounded-xl bg-sky-50/70 border border-sky-200">' +
            '<div class="text-[10px] text-sky-800 font-medium">Thân chung</div>' +
            '<div class="text-xs font-extrabold text-sky-900 font-mono">' + st.caseCount + '</div>' +
          '</div>' +
          '<div class="p-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200">' +
            '<div class="text-[10px] text-emerald-800 font-medium">Đã làm</div>' +
            '<div class="text-xs font-extrabold text-emerald-900 font-mono">' + st.done + '/' + st.total + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="space-y-1">' +
          '<div class="flex items-center justify-between text-[11px] text-slate-500">' +
            '<span>Tiến độ <strong class="text-slate-800">' + st.pct + '%</strong></span>' +
            '<span>Đúng <strong class="text-emerald-700">' + st.acc + '%</strong></span>' +
          '</div>' +
          '<div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">' +
            '<div class="h-full bg-teal-600 rounded-full transition-all" style="width:' + st.pct + '%"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<button type="button" data-cid="' + escapeHtml(c.id) + '" onclick="switchActiveCourse(this.dataset.cid, true)" class="w-full py-2 px-3 rounded-xl ' + (isCurrent ? 'bg-teal-800 hover:bg-teal-900 text-white' : 'bg-teal-50 hover:bg-teal-700 text-teal-900 hover:text-white border border-teal-200 hover:border-teal-700') + ' font-bold text-xs transition flex items-center justify-center gap-1.5">' +
        '<span>' + (isCurrent ? 'Tiếp tục ôn luyện →' : 'Chọn học phần này') + '</span>' +
      '</button>' +
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

