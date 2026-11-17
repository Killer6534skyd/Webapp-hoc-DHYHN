// =========================================================================
// MULTI-PROFILE REGISTRY & GOOGLE / MICROSOFT CLOUD SYNCHRONIZATION
// =========================================================================
function initProfilesRegistryAfterLoad() {
  try {
    const savedScroll = sessionStorage.getItem('hmu_tab_scroll_positions_v1');
    if (savedScroll) {
      const parsedScroll = JSON.parse(savedScroll);
      Object.assign(tabScrollPositions, parsedScroll);
    }
  } catch (e) {}

  try {
    const rawReg = localStorage.getItem(PROFILES_REGISTRY_KEY);
    if (rawReg) {
      const parsedReg = JSON.parse(rawReg);
      if (parsedReg && parsedReg.profiles && Object.keys(parsedReg.profiles).length > 0) {
        profilesRegistry = parsedReg;
      }
    }
  } catch (e) {}

  if (!profilesRegistry.profiles || Object.keys(profilesRegistry.profiles).length === 0) {
    const defId = 'prof_default';
    profilesRegistry = {
      activeProfileId: defId,
      profiles: {
        [defId]: {
          id: defId,
          createdAt: new Date().toLocaleString('vi-VN'),
          updatedAt: new Date().toLocaleString('vi-VN'),
          data: JSON.parse(JSON.stringify(userProgress))
        }
      }
    };
    saveProfilesRegistryToStorage();
  } else {
    const activeId = profilesRegistry.activeProfileId;
    if (activeId && profilesRegistry.profiles[activeId]) {
      profilesRegistry.profiles[activeId].data = JSON.parse(JSON.stringify(userProgress));
      profilesRegistry.profiles[activeId].updatedAt = new Date().toLocaleString('vi-VN');
      saveProfilesRegistryToStorage();
    }
  }
  updateHeaderProfileAndCloudBadge();
}

function saveProfilesRegistryToStorage() {
  try {
    localStorage.setItem(PROFILES_REGISTRY_KEY, JSON.stringify(profilesRegistry));
  } catch (e) {}
}

function syncCurrentProgressIntoActiveProfileRegistry() {
  const activeId = profilesRegistry.activeProfileId || 'prof_default';
  if (!profilesRegistry.profiles) profilesRegistry.profiles = {};
  if (!profilesRegistry.profiles[activeId]) {
    profilesRegistry.profiles[activeId] = {
      id: activeId,
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toLocaleString('vi-VN'),
      data: JSON.parse(JSON.stringify(userProgress))
    };
  } else {
    profilesRegistry.profiles[activeId].data = JSON.parse(JSON.stringify(userProgress));
    profilesRegistry.profiles[activeId].updatedAt = new Date().toLocaleString('vi-VN');
  }
  saveProfilesRegistryToStorage();

  // If autoSync is enabled and linked to Google or Microsoft, sync to Cloud Vault automatically
  if (userProgress.cloudSync && userProgress.cloudSync.provider !== 'local' && userProgress.cloudSync.email && userProgress.cloudSync.autoSync) {
    writeCloudVaultSnapshot(userProgress.cloudSync.provider, userProgress.cloudSync.email, userProgress);
    userProgress.cloudSync.lastSyncAt = new Date().toLocaleString('vi-VN');
  }
  updateHeaderProfileAndCloudBadge();
}

function updateHeaderProfileAndCloudBadge() {
  const nameEl = document.getElementById('headerActiveProfileName');
  const iconEl = document.getElementById('headerCloudProviderIcon');
  const dotEl = document.getElementById('headerSyncStatusDot');
  const profName = (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Hồ sơ chính';
  const cs = userProgress.cloudSync || { provider: 'local' };
  if (nameEl) nameEl.textContent = profName.length > 18 ? (profName.slice(0, 18) + '…') : profName;
  if (iconEl) {
    iconEl.textContent = cs.provider === 'google' ? '🌐' : (cs.provider === 'microsoft' ? '🪟' : '👤');
  }
  if (dotEl) {
    dotEl.className = cs.provider !== 'local'
      ? 'w-2 h-2 rounded-full bg-emerald-500 inline-block'
      : 'w-2 h-2 rounded-full bg-amber-400 inline-block';
  }
  const topGText = document.getElementById('topHeaderGoogleSignInText');
  const topGBtn = document.getElementById('topHeaderGoogleSignInBtn');
  if (topGText && topGBtn) {
    if (cs.provider !== 'local' && cs.email) {
      const shortEmail = cs.email.length > 20 ? (cs.email.slice(0, 18) + '…') : cs.email;
      topGText.textContent = 'Đã liên kết: ' + shortEmail;
      topGBtn.className = 'px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs transition text-xs flex items-center gap-1.5';
    } else {
      topGText.textContent = 'Đăng nhập Google';
      topGBtn.className = 'px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold shadow-2xs transition text-xs flex items-center gap-1.5';
    }
  }
}

function getCloudVaultAll() {
  try {
    const raw = localStorage.getItem(CLOUD_VAULT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeCloudVaultSnapshot(provider, email, dataObj) {
  try {
    const vault = getCloudVaultAll();
    const key = (provider + ':' + String(email || '').trim().toLowerCase());
    vault[key] = {
      provider: provider,
      email: String(email || '').trim().toLowerCase(),
      syncedAt: new Date().toLocaleString('vi-VN'),
      timestampMs: Date.now(),
      payload: JSON.parse(JSON.stringify(dataObj))
    };
    localStorage.setItem(CLOUD_VAULT_KEY, JSON.stringify(vault));
  } catch (e) {}
}

function readCloudVaultSnapshot(provider, email) {
  const vault = getCloudVaultAll();
  const key = (provider + ':' + String(email || '').trim().toLowerCase());
  return vault[key] || null;
}

function appendCloudSyncLog(actionLabel) {
  if (!userProgress.cloudSync) {
    userProgress.cloudSync = { provider: 'local', email: '', displayName: '', autoSync: true, lastSyncAt: '', syncLogs: [] };
  }
  if (!Array.isArray(userProgress.cloudSync.syncLogs)) userProgress.cloudSync.syncLogs = [];
  const nowStr = new Date().toLocaleString('vi-VN');
  userProgress.cloudSync.lastSyncAt = nowStr;
  userProgress.cloudSync.syncLogs.unshift({
    time: nowStr,
    text: actionLabel
  });
  if (userProgress.cloudSync.syncLogs.length > 20) {
    userProgress.cloudSync.syncLogs = userProgress.cloudSync.syncLogs.slice(0, 20);
  }
}

function renderAccountAndProfilesManagerUI() {
  const cs = userProgress.cloudSync || { provider: 'local', email: '', displayName: '', autoSync: true, lastSyncAt: '', syncLogs: [] };
  const statusBadge = document.getElementById('cloudSyncStatusBadge');
  const gBtnText = document.getElementById('btnGoogleConnectText');
  const mBtnText = document.getElementById('btnMicrosoftConnectText');
  const autoToggle = document.getElementById('cloudAutoSyncToggle');

  if (autoToggle) autoToggle.checked = cs.autoSync !== false;

  if (cs.provider === 'google' && cs.email) {
    if (statusBadge) {
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300';
      statusBadge.textContent = '🌐 Đã đồng bộ Google (' + cs.email + ')';
    }
    if (gBtnText) gBtnText.textContent = 'Đã kết nối Google (' + cs.email.split('@')[0] + ')';
    if (mBtnText) mBtnText.textContent = 'Chuyển sang Microsoft';
  } else if (cs.provider === 'microsoft' && cs.email) {
    if (statusBadge) {
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300';
      statusBadge.textContent = '🪟 Đã đồng bộ Microsoft (' + cs.email + ')';
    }
    if (mBtnText) mBtnText.textContent = 'Đã kết nối Microsoft (' + cs.email.split('@')[0] + ')';
    if (gBtnText) gBtnText.textContent = 'Chuyển sang Google';
  } else {
    if (statusBadge) {
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700';
      statusBadge.textContent = '💻 Lưu trữ cục bộ (Chưa liên kết Cloud)';
    }
    if (gBtnText) gBtnText.textContent = 'Kết nối Google';
    if (mBtnText) mBtnText.textContent = 'Kết nối Microsoft';
  }

  const cardEl = document.getElementById('activeCloudAccountCard');
  if (cardEl) {
    if (cs.provider !== 'local' && cs.email) {
      const provTitle = cs.provider === 'google' ? 'Google Account (Google Drive AppData)' : 'Microsoft Account (OneDrive Cloud)';
      const provBadge = cs.provider === 'google'
        ? '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">Google</span>'
        : '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold text-[11px]">Microsoft</span>';
      cardEl.innerHTML = '<div class="flex items-center justify-between gap-2">' +
          '<div class="font-bold text-slate-900 truncate">' + escapeHtml(cs.displayName || userProgress.profile.name) + '</div>' +
          provBadge +
        '</div>' +
        '<div class="text-slate-600 truncate">📧 Tài khoản: <strong>' + escapeHtml(cs.email) + '</strong></div>' +
        '<div class="text-[11px] text-emerald-700 font-semibold">✓ Nền tảng: ' + provTitle + ' • Đồng bộ cuối: ' + escapeHtml(cs.lastSyncAt || 'Vừa xong') + '</div>' +
        '<div class="pt-1 flex items-center gap-2">' +
          '<button type="button" onclick="disconnectCloudAccount()" class="text-[11px] text-rose-600 hover:underline font-semibold">Ngắt liên kết tài khoản này</button>' +
        '</div>';
    } else {
      cardEl.innerHTML = '<div class="text-slate-600">Profile hiện tại đang lưu cục bộ trên trình duyệt. Hãy nhấn <strong>"Kết nối Google"</strong> hoặc <strong>"Kết nối Microsoft"</strong> ở góc trên để liên kết email và đồng bộ hóa dữ liệu học tập tự động.</div>';
    }
  }

  const logEl = document.getElementById('cloudSyncLogList');
  if (logEl) {
    const logs = Array.isArray(cs.syncLogs) ? cs.syncLogs : [];
    if (logs.length === 0) {
      logEl.innerHTML = '<div class="text-slate-400 italic">Chưa có nhật ký đồng bộ đám mây.</div>';
    } else {
      logEl.innerHTML = logs.map(l => '<div class="border-b border-slate-100 pb-1"><strong>' + escapeHtml(l.time) + ':</strong> ' + escapeHtml(l.text) + '</div>').join('');
    }
  }

  // Render Profiles Table
  const tbody = document.getElementById('profilesRegistryTableBody');
  const countLabel = document.getElementById('totalProfilesCountLabel');
  if (!tbody) return;
  const pKeys = Object.keys(profilesRegistry.profiles || {});
  if (countLabel) countLabel.textContent = String(pKeys.length);

  tbody.innerHTML = pKeys.map(pid => {
    const item = profilesRegistry.profiles[pid];
    const d = item.data || {};
    const pProf = d.profile || { name: 'Người học', studentId: 'ĐHYHN', targetScore: 8.5 };
    const pCloud = d.cloudSync || { provider: 'local', email: '' };
    const isCurrent = pid === profilesRegistry.activeProfileId;

    const ansMap = d.answers || {};
    const ansKeys = Object.keys(ansMap);
    let cCount = 0;
    ansKeys.forEach(qid => {
      const qObj = QUESTIONS_BANK.find(x => x.id === qid);
      if (qObj && ansMap[qid] === qObj.correct_idx) cCount++;
    });
    const accPct = ansKeys.length > 0 ? Math.round((cCount / ansKeys.length) * 100) : 0;
    const sesCount = Array.isArray(d.sessions) ? d.sessions.length : 0;

    let cloudCell = '<div class="flex items-center gap-1.5 flex-wrap"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">💻 Cục bộ</span><button type="button" data-prov="google" data-pid="' + pid + '" onclick="openCloudConnectModalForProfile(this.dataset.prov, this.dataset.pid)" class="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold">🔗 Đăng nhập Google</button></div>';
    if (pCloud.provider === 'google' && pCloud.email) {
      cloudCell = '<div class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">G</span><div><div class="font-bold text-slate-900 text-xs">Google Account</div><div class="text-[11px] text-slate-500">' + escapeHtml(pCloud.email) + '</div></div></div>';
    } else if (pCloud.provider === 'microsoft' && pCloud.email) {
      cloudCell = '<div class="flex items-center gap-1.5"><span class="w-4 h-4 rounded bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">⊞</span><div><div class="font-bold text-slate-900 text-xs">Microsoft Account</div><div class="text-[11px] text-slate-500">' + escapeHtml(pCloud.email) + '</div></div></div>';
    }

    const statusPill = isCurrent
      ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">🟢 Đang sử dụng</span>'
      : '<button type="button" onclick="switchActiveLearnerProfile(\'' + pid + '\')" class="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-2xs transition">🔄 Chuyển sang Profile này</button>';

    return '<tr class="' + (isCurrent ? 'bg-teal-50/50' : 'hover:bg-slate-50') + '">' +
      '<td class="py-3 px-3">' +
        '<div class="flex items-center gap-2.5">' +
          '<div class="w-8 h-8 rounded-xl ' + (isCurrent ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-700') + ' font-extrabold text-xs flex items-center justify-center shrink-0">' + escapeHtml((pProf.name || 'BS').slice(0, 2).toUpperCase()) + '</div>' +
          '<div>' +
            '<div class="font-bold text-slate-900 flex items-center gap-1.5">' + escapeHtml(pProf.name || 'Hồ sơ') + '</div>' +
            '<div class="text-[11px] text-slate-500">' + escapeHtml(pProf.studentId || '') + ' • Mục tiêu: ' + (pProf.targetScore || 8.5) + '/10</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td class="py-3 px-3">' + cloudCell + '</td>' +
      '<td class="py-3 px-3">' +
        '<div class="font-bold text-slate-800">' + ansKeys.length + '/' + QUESTIONS_BANK.length + ' câu (' + accPct + '% đúng)</div>' +
        '<div class="text-[11px] text-slate-500">' + sesCount + ' phiên lưu</div>' +
      '</td>' +
      '<td class="py-3 px-3 text-xs text-slate-600">' + escapeHtml(pCloud.lastSyncAt || item.updatedAt || item.createdAt || '--') + '</td>' +
      '<td class="py-3 px-3 text-right whitespace-nowrap space-x-1.5">' +
        statusPill +
        '<button type="button" onclick="exportSingleProfileById(\'' + pid + '\')" class="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold" title="Xuất dữ liệu Profile này ra file JSON">📤 Xuất</button>' +
        (!isCurrent && pKeys.length > 1 ? '<button type="button" onclick="deleteLearnerProfileById(\'' + pid + '\')" class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold" title="Xóa Profile này">🗑️</button>' : '') +
      '</td>' +
    '</tr>';
  }).join('');
}

function switchActiveLearnerProfile(profileId) {
  if (!profilesRegistry.profiles || !profilesRegistry.profiles[profileId]) return;
  syncCurrentProgressIntoActiveProfileRegistry();
  profilesRegistry.activeProfileId = profileId;
  const targetData = JSON.parse(JSON.stringify(profilesRegistry.profiles[profileId].data || {}));

  userProgress.answers = targetData.answers || {};
  userProgress.bookmarks = targetData.bookmarks || {};
  userProgress.flashcards = targetData.flashcards || {};
  userProgress.sessions = Array.isArray(targetData.sessions) ? targetData.sessions : [];
  userProgress.profile = Object.assign({
    name: 'Sinh viên Y khoa ĐHYHN',
    studentId: 'K119 - Bác sĩ Đa khoa',
    targetScore: 8.5,
    examDate: '2026-11-15',
    goalNote: ''
  }, targetData.profile || {});
  userProgress.customQuestions = Array.isArray(targetData.customQuestions) ? targetData.customQuestions : [];
  userProgress.editedQuestions = targetData.editedQuestions || {};
  userProgress.questionEditHistory = targetData.questionEditHistory || {};
  userProgress.inlineComments = targetData.inlineComments || {};
  userProgress.inlineHighlights = targetData.inlineHighlights || {};
  userProgress.stemGroups = targetData.stemGroups || {};
  userProgress.questionStemMap = targetData.questionStemMap || {};
  userProgress.unlinkedStemQuestions = targetData.unlinkedStemQuestions || {};
  userProgress.stemPenaltyConfig = Object.assign({ enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 }, targetData.stemPenaltyConfig || {});
  userProgress.cloudSync = Object.assign({ provider: 'local', email: '', displayName: '', autoSync: true, lastSyncAt: '', syncLogs: [] }, targetData.cloudSync || {});

  saveProfilesRegistryToStorage();
  saveProgress();
  syncQuestionsBankWithCustomizations();
  populateTopicDropdowns();
  updateTopStats();
  renderUserProfileAndAdvisor();
  showToast('🔄 Đã chuyển sang sử dụng Profile: ' + userProgress.profile.name);
}

function openCreateProfileModal() {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  titleEl.textContent = '➕ Tạo Profile Người học Mới / Liên kết Tài khoản';
  bodyEl.innerHTML = '<div class="space-y-3.5">' +
    '<div>' +
      '<label class="block text-xs font-bold text-slate-700 mb-1">Họ và tên Profile người học <span class="text-rose-600">*</span></label>' +
      '<input id="newProfNameInput" type="text" placeholder="VD: BS. Nguyễn Minh Quân - Nội trú Truyền nhiễm" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm" />' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      '<div>' +
        '<label class="block text-xs font-bold text-slate-700 mb-1">Mã SV / Lớp - Khóa</label>' +
        '<input id="newProfStudentIdInput" type="text" value="K119 - Đa khoa ĐHYHN" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm" />' +
      '</div>' +
      '<div>' +
        '<label class="block text-xs font-bold text-slate-700 mb-1">Mục tiêu điểm (Hệ 10)</label>' +
        '<input id="newProfTargetInput" type="number" step="0.1" min="4" max="10" value="9.0" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm" />' +
      '</div>' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      '<div>' +
        '<label class="block text-xs font-bold text-slate-700 mb-1">Liên kết đồng bộ đám mây (Tùy chọn)</label>' +
        '<select id="newProfProviderSelect" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm">' +
          '<option value="local">💻 Chỉ lưu trên thiết bị (Local)</option>' +
          '<option value="google">🌐 Tài khoản Google (Gmail / Google Drive)</option>' +
          '<option value="microsoft">🪟 Tài khoản Microsoft (Outlook / OneDrive)</option>' +
        '</select>' +
      '</div>' +
      '<div>' +
        '<label class="block text-xs font-bold text-slate-700 mb-1">Email tài khoản Google / Microsoft</label>' +
        '<input id="newProfEmailInput" type="email" placeholder="VD: sv.yha@gmail.com hoặc @outlook.com" class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm" />' +
      '</div>' +
    '</div>' +
    '<label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">' +
      '<input type="checkbox" id="newProfCopyCustomBank" checked class="w-4 h-4 rounded text-teal-700" />' +
      '<span>Giữ lại các câu hỏi tự biên soạn, chỉnh sửa và chùm thân chung từ ngân hàng hiện tại</span>' +
    '</label>' +
  '</div>';

  footerEl.innerHTML = '<button type="button" onclick="confirmCreateNewProfile()" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">➕ Tạo &amp; Chuyển sang Profile này</button>' +
    '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Hủy</button>';
  modal.classList.remove('hidden');
}

function confirmCreateNewProfile() {
  const nameVal = (document.getElementById('newProfNameInput').value || '').trim();
  if (!nameVal) {
    showToast('Vui lòng nhập tên Profile người học!');
    return;
  }
  const stIdVal = (document.getElementById('newProfStudentIdInput').value || '').trim() || 'ĐHYHN';
  const targetVal = parseFloat(document.getElementById('newProfTargetInput').value) || 8.5;
  const provVal = document.getElementById('newProfProviderSelect').value || 'local';
  const emailVal = (document.getElementById('newProfEmailInput').value || '').trim();
  const copyBank = !!document.getElementById('newProfCopyCustomBank').checked;

  syncCurrentProgressIntoActiveProfileRegistry();

  const newId = 'prof_' + Date.now();
  const nowStr = new Date().toLocaleString('vi-VN');
  const freshData = {
    answers: {},
    bookmarks: {},
    flashcards: {},
    sessions: [],
    profile: {
      name: nameVal,
      studentId: stIdVal,
      targetScore: targetVal,
      examDate: '2026-11-15',
      goalNote: ''
    },
    customQuestions: copyBank ? JSON.parse(JSON.stringify(userProgress.customQuestions || [])) : [],
    editedQuestions: copyBank ? JSON.parse(JSON.stringify(userProgress.editedQuestions || {})) : {},
    questionEditHistory: copyBank ? JSON.parse(JSON.stringify(userProgress.questionEditHistory || {})) : {},
    inlineComments: {},
    inlineHighlights: {},
    stemGroups: copyBank ? JSON.parse(JSON.stringify(userProgress.stemGroups || {})) : {},
    questionStemMap: copyBank ? JSON.parse(JSON.stringify(userProgress.questionStemMap || {})) : {},
    unlinkedStemQuestions: {},
    stemPenaltyConfig: JSON.parse(JSON.stringify(userProgress.stemPenaltyConfig || { enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 })),
    cloudSync: {
      provider: (provVal !== 'local' && emailVal) ? provVal : 'local',
      email: emailVal,
      displayName: nameVal,
      autoSync: true,
      lastSyncAt: (provVal !== 'local' && emailVal) ? nowStr : '',
      syncLogs: (provVal !== 'local' && emailVal) ? [{ time: nowStr, text: 'Khởi tạo & liên kết tài khoản ' + provVal.toUpperCase() + ' (' + emailVal + ')' }] : []
    }
  };

  // If cloud vault already has data for this provider+email, offer to merge
  if (provVal !== 'local' && emailVal) {
    const existingCloud = readCloudVaultSnapshot(provVal, emailVal);
    if (existingCloud && existingCloud.payload) {
      Object.assign(freshData.answers, existingCloud.payload.answers || {});
      Object.assign(freshData.bookmarks, existingCloud.payload.bookmarks || {});
      Object.assign(freshData.flashcards, existingCloud.payload.flashcards || {});
      freshData.sessions = Array.isArray(existingCloud.payload.sessions) ? existingCloud.payload.sessions : [];
    } else {
      writeCloudVaultSnapshot(provVal, emailVal, freshData);
    }
  }

  profilesRegistry.profiles[newId] = {
    id: newId,
    createdAt: nowStr,
    updatedAt: nowStr,
    data: freshData
  };
  closeCustomDataModal();
  switchActiveLearnerProfile(newId);
}

function exportSingleProfileById(profileId) {
  const item = profilesRegistry.profiles && profilesRegistry.profiles[profileId];
  if (!item) return;
  const pName = (item.data && item.data.profile && item.data.profile.name) ? item.data.profile.name.replace(/\s+/g, '_') : profileId;
  downloadJsonObject({
    format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1',
    exportedAt: new Date().toLocaleString('vi-VN'),
    data: item.data
  }, 'profile_' + pName + '.json');
}

function deleteLearnerProfileById(profileId) {
  if (profileId === profilesRegistry.activeProfileId) {
    showToast('Không thể xóa Profile đang trực tiếp sử dụng!');
    return;
  }
  const item = profilesRegistry.profiles[profileId];
  const pName = (item && item.data && item.data.profile && item.data.profile.name) ? item.data.profile.name : profileId;
  openAppModal('Xóa Profile người học', 'Bạn có chắc chắn muốn xóa Profile "' + pName + '" khỏi danh sách quản lý không?', function () {
    delete profilesRegistry.profiles[profileId];
    saveProfilesRegistryToStorage();
    renderAccountAndProfilesManagerUI();
    showToast('Đã xóa Profile "' + pName + '"!');
  });
}

let activeOAuthModalProvider = 'google';
let targetProfileIdForOAuth = null;
let cloudBroadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    cloudBroadcastChannel = new BroadcastChannel('hmu_cloud_sync_channel_v1');
    cloudBroadcastChannel.onmessage = function (ev) {
      if (ev && ev.data && ev.data.type === 'CLOUD_VAULT_UPDATED') {
        const cs = userProgress.cloudSync || {};
        if (cs.provider === ev.data.provider && cs.email === ev.data.email && cs.autoSync !== false) {
          const snap = readCloudVaultSnapshot(cs.provider, cs.email);
          if (snap && snap.payload) {
            Object.assign(userProgress.answers, snap.payload.answers || {});
            Object.assign(userProgress.bookmarks, snap.payload.bookmarks || {});
            Object.assign(userProgress.flashcards, snap.payload.flashcards || {});
            updateTopStats();
            if (currentTab === 'study') applyStudyFilters();
            if (currentTab === 'user') renderUserProfileAndAdvisor();
          }
        }
      }
    };
  }
} catch (e) {}

function openCloudConnectModalForProfile(provider, profileId) {
  if (profileId && profileId !== profilesRegistry.activeProfileId) {
    switchActiveLearnerProfile(profileId);
  }
  openCloudConnectModal(provider);
}

function openCloudConnectModal(provider, defaultSubTab) {
  activeOAuthModalProvider = (provider === 'microsoft') ? 'microsoft' : 'google';
  const modal = document.getElementById('googleSignInOAuthModal');
  if (!modal) return;
  switchOAuthModalProvider(activeOAuthModalProvider);
  switchOAuthModalSubTab(defaultSubTab || 'signin');
  backToOAuthCredentialsStep();
  renderSavedCloudAccountsListInModal();

  const cs = userProgress.cloudSync || {};
  const whInp = document.getElementById('cloudWebhookUrlInput');
  if (whInp) whInp.value = cs.webhookUrl || '';
  const tkInp = document.getElementById('googleDriveApiTokenInput');
  if (tkInp) tkInp.value = cs.accessToken || '';

  refreshOAuthModalSyncTokenBox();
  modal.classList.remove('hidden');
}

function closeGoogleSignInOAuthModal() {
  const modal = document.getElementById('googleSignInOAuthModal');
  if (modal) modal.classList.add('hidden');
}

function switchOAuthModalProvider(provider) {
  activeOAuthModalProvider = (provider === 'microsoft') ? 'microsoft' : 'google';
  const isGoogle = activeOAuthModalProvider === 'google';
  const gBtn = document.getElementById('oauthSwitchGoogleBtn');
  const mBtn = document.getElementById('oauthSwitchMicrosoftBtn');
  if (gBtn) {
    gBtn.className = isGoogle
      ? 'px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-600 bg-blue-600 text-white transition'
      : 'px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition';
  }
  if (mBtn) {
    mBtn.className = !isGoogle
      ? 'px-2.5 py-1 rounded-lg text-xs font-bold border border-sky-600 bg-sky-600 text-white transition'
      : 'px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition';
  }
  const iconWrap = document.getElementById('oauthModalBrandIconWrap');
  if (iconWrap) {
    iconWrap.innerHTML = isGoogle
      ? '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/><path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.8z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"/></svg>'
      : '<svg class="w-5 h-5" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>';
  }
  const titleEl = document.getElementById('oauthModalTitle');
  const badgeEl = document.getElementById('oauthModalLiveBadge');
  const emailLbl = document.getElementById('oauthEmailLabelProvider');
  const emailInp = document.getElementById('cloudModalEmailInput');
  const nameInp = document.getElementById('cloudModalNameInput');

  if (titleEl) titleEl.textContent = isGoogle ? 'Đăng nhập bằng Google & Đồng bộ Google Drive' : 'Đăng nhập bằng Microsoft & Đồng bộ OneDrive';
  if (badgeEl) badgeEl.textContent = isGoogle ? 'Google Identity & Drive Sync' : 'Microsoft Account & OneDrive';
  if (emailLbl) emailLbl.textContent = isGoogle ? 'Google (@gmail.com / @hmu.edu.vn)' : 'Microsoft (@outlook.com / @live.com / @student.hmu.edu.vn)';

  const curEmail = (userProgress.cloudSync && userProgress.cloudSync.provider === activeOAuthModalProvider)
    ? (userProgress.cloudSync.email || '')
    : (userProgress.cloudSync && userProgress.cloudSync.email ? userProgress.cloudSync.email : '');
  const curName = (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Sinh viên Y khoa ĐHYHN';
  if (emailInp) {
    emailInp.value = curEmail;
    emailInp.placeholder = isGoogle ? 'VD: bacsi.noitru@gmail.com' : 'VD: bacsi.noitru@outlook.com';
  }
  if (nameInp) nameInp.value = curName;

  const footerSt = document.getElementById('oauthModalFooterStatus');
  if (footerSt) {
    if (userProgress.cloudSync && userProgress.cloudSync.provider !== 'local' && userProgress.cloudSync.email) {
      footerSt.innerHTML = '🟢 Đang liên kết: <strong>' + escapeHtml(userProgress.cloudSync.email) + '</strong> (' + escapeHtml(userProgress.cloudSync.provider.toUpperCase()) + ')';
    } else {
      footerSt.textContent = 'Trạng thái: Chưa liên kết tài khoản đám mây';
    }
  }
  renderSavedCloudAccountsListInModal();
}

function switchOAuthModalSubTab(subTab) {
  ['signin', 'cloudbridge', 'token'].forEach(t => {
    const view = document.getElementById('oauthSubView-' + t);
    const btn = document.getElementById('oauthTabBtn-' + t);
    if (view) {
      if (t === subTab) view.classList.remove('hidden');
      else view.classList.add('hidden');
    }
    if (btn) {
      btn.className = (t === subTab)
        ? 'px-3.5 py-2 rounded-t-xl font-bold bg-white text-blue-700 border-t border-x border-slate-200 -mb-px'
        : 'px-3.5 py-2 rounded-t-xl font-semibold text-slate-600 hover:text-slate-900';
    }
  });
  if (subTab === 'token') refreshOAuthModalSyncTokenBox();
}

function renderSavedCloudAccountsListInModal() {
  const listEl = document.getElementById('oauthSavedAccountsList');
  if (!listEl) return;
  const vault = getCloudVaultAll();
  const entries = Object.keys(vault).map(k => vault[k]).filter(x => x && x.email);

  // Also include any accounts linked in profilesRegistry
  Object.keys(profilesRegistry.profiles || {}).forEach(pid => {
    const p = profilesRegistry.profiles[pid];
    const cs = p && p.data && p.data.cloudSync;
    if (cs && cs.email && cs.provider && cs.provider !== 'local') {
      if (!entries.some(e => e.email === cs.email && e.provider === cs.provider)) {
        entries.push({
          provider: cs.provider,
          email: cs.email,
          syncedAt: cs.lastSyncAt || p.updatedAt || 'Đã lưu',
          payload: p.data
        });
      }
    }
  });

  if (entries.length === 0) {
    listEl.innerHTML = '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between gap-2">' +
      '<span>Chưa có tài khoản Google / Microsoft nào từng đăng nhập trên trình duyệt này. Hãy nhập email ở khung bên dưới hoặc dùng thử tài khoản mẫu:</span>' +
      '<button type="button" onclick="quickFillDemoGoogleAccount()" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold shrink-0">⚡ Điền nhanh Gmail mẫu</button>' +
    '</div>';
    return;
  }

  listEl.innerHTML = entries.map(acc => {
    const isCurrent = userProgress.cloudSync && userProgress.cloudSync.email === acc.email && userProgress.cloudSync.provider === acc.provider;
    const pName = (acc.payload && acc.payload.profile && acc.payload.profile.name) ? acc.payload.profile.name : acc.email.split('@')[0];
    const ansCount = (acc.payload && acc.payload.answers) ? Object.keys(acc.payload.answers).length : 0;
    const badge = acc.provider === 'google'
      ? '<span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Google</span>'
      : '<span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 text-[10px] font-bold">Microsoft</span>';
    return '<div data-provider="' + escapeHtml(acc.provider) + '" data-email="' + escapeHtml(acc.email) + '" onclick="quickSignInSavedAccount(this.dataset.provider, this.dataset.email)" class="p-2.5 rounded-xl border ' + (isCurrent ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30') + ' cursor-pointer transition flex items-center justify-between gap-2">' +
      '<div class="flex items-center gap-2.5 min-w-0">' +
        '<div class="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">' + escapeHtml(pName.slice(0, 2).toUpperCase()) + '</div>' +
        '<div class="min-w-0">' +
          '<div class="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">' + escapeHtml(pName) + ' ' + badge + (isCurrent ? '<span class="text-[10px] text-emerald-700 font-extrabold">• Đang kết nối</span>' : '') + '</div>' +
          '<div class="text-[11px] text-slate-500 truncate">' + escapeHtml(acc.email) + ' • Đã lưu ' + ansCount + ' câu trả lời (' + escapeHtml(acc.syncedAt || '') + ')</div>' +
        '</div>' +
      '</div>' +
      '<span class="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold shrink-0">' + (isCurrent ? '🔄 Đồng bộ lại' : 'Đăng nhập →') + '</span>' +
    '</div>';
  }).join('');
}

function quickFillDemoGoogleAccount() {
  const emailInp = document.getElementById('cloudModalEmailInput');
  const nameInp = document.getElementById('cloudModalNameInput');
  const curName = (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'BS. Sinh viên ĐHYHN';
  if (emailInp && !emailInp.value.trim()) {
    emailInp.value = 'bs.truyennhiem.hmu@gmail.com';
  }
  if (nameInp && !nameInp.value.trim()) {
    nameInp.value = curName;
  }
  proceedToOAuthConsentStep();
}

function quickSignInSavedAccount(provider, email) {
  switchOAuthModalProvider(provider);
  const snap = readCloudVaultSnapshot(provider, email);
  const emailInp = document.getElementById('cloudModalEmailInput');
  const nameInp = document.getElementById('cloudModalNameInput');
  if (emailInp) emailInp.value = email;
  if (nameInp && snap && snap.payload && snap.payload.profile && snap.payload.profile.name) {
    nameInp.value = snap.payload.profile.name;
  }
  confirmConnectCloudAccount(provider);
}

function proceedToOAuthConsentStep() {
  const emailInp = document.getElementById('cloudModalEmailInput');
  const nameInp = document.getElementById('cloudModalNameInput');
  const emailVal = (emailInp ? emailInp.value : '').trim().toLowerCase();
  const nameVal = (nameInp ? nameInp.value : '').trim() || userProgress.profile.name || 'Sinh viên Y khoa';
  if (!emailVal || !emailVal.includes('@')) {
    showToast('⚠️ Vui lòng nhập địa chỉ Email tài khoản ' + (activeOAuthModalProvider === 'google' ? 'Google (@gmail.com / @hmu.edu.vn)' : 'Microsoft') + ' hợp lệ!');
    if (emailInp) emailInp.focus();
    return;
  }
  document.getElementById('oauthConsentAvatar').textContent = nameVal.split(' ').filter(Boolean).slice(-2).map(w => w[0].toUpperCase()).join('') || 'BS';
  document.getElementById('oauthConsentName').textContent = nameVal;
  document.getElementById('oauthConsentEmail').textContent = emailVal;
  document.getElementById('oauthStepCredentials').classList.add('hidden');
  document.getElementById('oauthStepConsent').classList.remove('hidden');
}

function backToOAuthCredentialsStep() {
  const cred = document.getElementById('oauthStepCredentials');
  const cons = document.getElementById('oauthStepConsent');
  if (cred) cred.classList.remove('hidden');
  if (cons) cons.classList.add('hidden');
}

function confirmConnectCloudAccount(provider) {
  const emailVal = (document.getElementById('cloudModalEmailInput').value || '').trim().toLowerCase();
  const nameVal = (document.getElementById('cloudModalNameInput').value || '').trim() || userProgress.profile.name;
  const strategy = document.getElementById('cloudModalMergeStrategy').value || 'merge';
  if (!emailVal || !emailVal.includes('@')) {
    showToast('Vui lòng nhập địa chỉ email tài khoản ' + (provider === 'google' ? 'Google' : 'Microsoft') + ' hợp lệ!');
    return;
  }

  const existingSnap = readCloudVaultSnapshot(provider, emailVal);
  if (existingSnap && existingSnap.payload) {
    const cloudData = existingSnap.payload;
    if (strategy === 'pull') {
      userProgress.answers = Object.assign({}, cloudData.answers || {});
      userProgress.bookmarks = Object.assign({}, cloudData.bookmarks || {});
      userProgress.flashcards = Object.assign({}, cloudData.flashcards || {});
      userProgress.sessions = Array.isArray(cloudData.sessions) ? cloudData.sessions : [];
      userProgress.inlineComments = Object.assign({}, cloudData.inlineComments || {});
      userProgress.inlineHighlights = Object.assign({}, cloudData.inlineHighlights || {});
      userProgress.editedQuestions = Object.assign({}, cloudData.editedQuestions || {});
      userProgress.questionEditHistory = Object.assign({}, cloudData.questionEditHistory || {});
    } else if (strategy === 'merge') {
      userProgress.answers = Object.assign({}, cloudData.answers || {}, userProgress.answers || {});
      userProgress.bookmarks = Object.assign({}, cloudData.bookmarks || {}, userProgress.bookmarks || {});
      userProgress.flashcards = Object.assign({}, cloudData.flashcards || {}, userProgress.flashcards || {});
      userProgress.inlineComments = Object.assign({}, cloudData.inlineComments || {}, userProgress.inlineComments || {});
      userProgress.inlineHighlights = Object.assign({}, cloudData.inlineHighlights || {}, userProgress.inlineHighlights || {});
      userProgress.editedQuestions = Object.assign({}, cloudData.editedQuestions || {}, userProgress.editedQuestions || {});
      userProgress.questionEditHistory = Object.assign({}, cloudData.questionEditHistory || {}, userProgress.questionEditHistory || {});
      const existingSesIds = new Set((userProgress.sessions || []).map(s => s.id));
      (cloudData.sessions || []).forEach(s => {
        if (s && !existingSesIds.has(s.id)) userProgress.sessions.push(s);
      });
    }
  }

  userProgress.profile.name = nameVal;
  if (!userProgress.cloudSync) userProgress.cloudSync = {};
  userProgress.cloudSync.provider = provider;
  userProgress.cloudSync.email = emailVal;
  userProgress.cloudSync.displayName = nameVal;
  userProgress.cloudSync.autoSync = true;

  appendCloudSyncLog('Đã liên kết & đồng bộ tài khoản ' + (provider === 'google' ? 'Google' : 'Microsoft') + ' (' + emailVal + ')');
  writeCloudVaultSnapshot(provider, emailVal, userProgress);
  try {
    if (cloudBroadcastChannel) {
      cloudBroadcastChannel.postMessage({ type: 'CLOUD_VAULT_UPDATED', provider: provider, email: emailVal });
    }
  } catch (e) {}
  if (userProgress.cloudSync && userProgress.cloudSync.webhookUrl) {
    syncWithRemoteCloudEndpoint('push', true);
  }
  syncQuestionsBankWithCustomizations();
  saveProgress();
  updateTopStats();
  closeCustomDataModal();
  closeGoogleSignInOAuthModal();
  renderUserProfileAndAdvisor();
  showToast('☁️ Đã đăng nhập & đồng bộ thành công với tài khoản ' + (provider === 'google' ? 'Google' : 'Microsoft') + ': ' + emailVal);
}

function toggleAppsScriptGuideBox() {
  const box = document.getElementById('appsScriptGuideBox');
  if (box) box.classList.toggle('hidden');
}

function copyGoogleAppsScriptCode() {
  const pre = document.getElementById('googleAppsScriptCodeBlock');
  if (!pre) return;
  const ta = document.createElement('textarea');
  ta.value = pre.textContent;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('📋 Đã sao chép mã Google Apps Script vào Clipboard!');
}

function saveCloudWebhookUrlConfig() {
  const inp = document.getElementById('cloudWebhookUrlInput');
  if (!inp) return;
  const url = inp.value.trim();
  if (!userProgress.cloudSync) userProgress.cloudSync = { provider: 'google', email: '', autoSync: true, syncLogs: [] };
  userProgress.cloudSync.webhookUrl = url;
  appendCloudSyncLog('Đã cấu hình Cloud Endpoint URL: ' + (url ? url.slice(0, 45) + '...' : 'Đã xóa'));
  saveProgress();
  const st = document.getElementById('cloudWebhookTestStatus');
  if (st) st.textContent = url ? '✓ Đã lưu URL đồng bộ đám mây!' : 'Đã xóa URL.';
  showToast('Đã lưu địa chỉ Google Drive Web App / Cloud URL!');
}

async function syncWithRemoteCloudEndpoint(direction, silentMode) {
  const inp = document.getElementById('cloudWebhookUrlInput');
  const url = (inp && inp.value.trim()) ? inp.value.trim() : ((userProgress.cloudSync && userProgress.cloudSync.webhookUrl) || '');
  if (!url) {
    if (!silentMode) showToast('⚠️ Vui lòng dán Google Apps Script Web App URL hoặc Firebase URL vào ô trước!');
    return;
  }
  if (!userProgress.cloudSync) userProgress.cloudSync = { provider: 'google', email: '', autoSync: true, syncLogs: [] };
  userProgress.cloudSync.webhookUrl = url;
  const st = document.getElementById('cloudWebhookTestStatus');
  if (st) st.textContent = direction === 'pull' ? '⏳ Đang tải dữ liệu từ Google Drive Cloud...' : '⏳ Đang đẩy dữ liệu lên Google Drive Cloud...';

  try {
    if (direction === 'pull') {
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      const parsed = JSON.parse(text);
      const dataObj = parsed.data || parsed.payload || parsed;
      if (dataObj && (dataObj.answers || dataObj.profile || dataObj.sessions)) {
        processImportedJsonString(JSON.stringify({ format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1', data: dataObj }));
        appendCloudSyncLog('⬇️ Đã Pull thành công dữ liệu từ Google Drive Cloud URL');
        if (st) st.textContent = '✅ Đã tải & cập nhật thành công từ Google Drive!';
      } else {
        if (st) st.textContent = 'ℹ️ Kho đám mây hiện đang trống, hãy nhấn Push trước.';
        if (!silentMode) showToast('Kho đám mây hiện chưa có dữ liệu. Hãy nhấn Push để đẩy dữ liệu lên trước!');
      }
    } else {
      const payload = {
        format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1',
        syncedAt: new Date().toLocaleString('vi-VN'),
        email: userProgress.cloudSync.email || 'user@gmail.com',
        data: userProgress
      };
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      appendCloudSyncLog('⬆️ Đã Push thành công dữ liệu lên Google Drive Cloud URL');
      saveProgress();
      if (st) st.textContent = '✅ Đã đẩy dữ liệu lên Google Drive thành công (' + new Date().toLocaleTimeString('vi-VN') + ')!';
      if (!silentMode) showToast('☁️ Đã đẩy (Push) toàn bộ dữ liệu lên Google Drive Cloud thành công!');
    }
  } catch (err) {
    if (st) st.textContent = '⚠️ Không thể kết nối trực tiếp (Kiểm tra quyền Anyone của Web App URL).';
    if (!silentMode) showToast('⚠️ Không thể kết nối tới URL đám mây. Hãy kiểm tra lại đường dẫn hoặc dùng File/Mã Token!');
  }
  if (currentTab === 'user') renderUserProfileAndAdvisor();
}

async function syncWithGoogleDriveRestApi(direction) {
  const tkInp = document.getElementById('googleDriveApiTokenInput');
  const token = (tkInp && tkInp.value.trim()) ? tkInp.value.trim() : ((userProgress.cloudSync && userProgress.cloudSync.accessToken) || '');
  if (!token) {
    showToast('⚠️ Vui lòng nhập Google OAuth 2.0 Access Token vào ô!');
    return;
  }
  if (!userProgress.cloudSync) userProgress.cloudSync = { provider: 'google', email: '', autoSync: true, syncLogs: [] };
  userProgress.cloudSync.accessToken = token;
  const fileName = 'hmu_medical_study_sync.json';
  try {
    const searchRes = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("name='" + fileName + "' and trashed=false") + '&fields=files(id,name,modifiedTime)', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!searchRes.ok) {
      showToast('⚠️ Access Token không hợp lệ hoặc đã hết hạn! Hãy kiểm tra lại quyền drive.file.');
      return;
    }
    const searchJson = await searchRes.json();
    const existingFile = (searchJson.files && searchJson.files.length > 0) ? searchJson.files[0] : null;

    if (direction === 'pull') {
      if (!existingFile) {
        showToast('Chưa tìm thấy file ' + fileName + ' trên Google Drive của bạn. Hãy nhấn Push trước!');
        return;
      }
      const dlRes = await fetch('https://www.googleapis.com/drive/v3/files/' + existingFile.id + '?alt=media', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const dlData = await dlRes.json();
      const d = dlData.data || dlData;
      processImportedJsonString(JSON.stringify({ format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1', data: d }));
      appendCloudSyncLog('⬇️ Đã tải file ' + fileName + ' trực tiếp từ Google Drive REST API v3');
      saveProgress();
      showToast('✅ Đã tải dữ liệu từ Google Drive API thành công!');
    } else {
      const contentStr = JSON.stringify({
        format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1',
        syncedAt: new Date().toLocaleString('vi-VN'),
        data: userProgress
      }, null, 2);

      if (existingFile) {
        await fetch('https://www.googleapis.com/upload/drive/v3/files/' + existingFile.id + '?uploadType=media', {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=UTF-8'
          },
          body: contentStr
        });
      } else {
        const metadata = { name: fileName, mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([contentStr], { type: 'application/json' }));
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: form
        });
      }
      appendCloudSyncLog('⬆️ Đã lưu file ' + fileName + ' trực tiếp lên Google Drive REST API v3');
      saveProgress();
      showToast('☁️ Đã lưu file ' + fileName + ' lên Google Drive của bạn thành công!');
    }
  } catch (e) {
    showToast('⚠️ Lỗi kết nối Google Drive REST API: Vui lòng kiểm tra kết nối mạng hoặc Token!');
  }
  if (currentTab === 'user') renderUserProfileAndAdvisor();
}

function exportGoogleDriveSyncFile() {
  const emailSlug = (userProgress.cloudSync && userProgress.cloudSync.email)
    ? userProgress.cloudSync.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'hmu_user';
  downloadJsonObject({
    format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1',
    exportedAt: new Date().toLocaleString('vi-VN'),
    data: userProgress
  }, 'google_drive_sync_' + emailSlug + '.json');
}

function refreshOAuthModalSyncTokenBox() {
  const box = document.getElementById('oauthModalSyncTokenBox');
  if (!box) return;
  try {
    const syncBundle = {
      format: 'HMU_CLOUD_SYNC_BUNDLE_V1',
      provider: (userProgress.cloudSync && userProgress.cloudSync.provider) || 'google',
      email: (userProgress.cloudSync && userProgress.cloudSync.email) || '',
      syncedAt: new Date().toLocaleString('vi-VN'),
      data: userProgress
    };
    box.value = btoa(unescape(encodeURIComponent(JSON.stringify(syncBundle))));
  } catch (e) {}
}

function copyOAuthModalSyncToken() {
  const box = document.getElementById('oauthModalSyncTokenBox');
  if (!box) return;
  box.select();
  document.execCommand('copy');
  showToast('📋 Đã sao chép Mã Đồng bộ Đa Thiết bị vào Clipboard!');
}

function importFromOAuthModalSyncToken() {
  const box = document.getElementById('oauthModalSyncTokenBox');
  if (!box || !box.value.trim()) return;
  try {
    const raw = box.value.trim();
    const jsonStr = raw.startsWith('{') ? raw : decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.data) {
      processImportedJsonString(JSON.stringify({ format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1', data: parsed.data }));
      appendCloudSyncLog('🔑 Đã đồng bộ dữ liệu từ Mã Token Đa Thiết Bị');
      saveProgress();
      closeGoogleSignInOAuthModal();
    } else {
      showToast('Mã đồng bộ không hợp lệ!');
    }
  } catch (e) {
    showToast('Không thể giải mã Mã Token! Vui lòng kiểm tra lại.');
  }
}

function toggleCloudAutoSync(isEnabled) {
  if (!userProgress.cloudSync) userProgress.cloudSync = { provider: 'local', email: '', autoSync: true, syncLogs: [] };
  userProgress.cloudSync.autoSync = !!isEnabled;
  saveProgress();
  showToast(isEnabled ? 'Đã bật Tự động đồng bộ Cloud!' : 'Đã tắt Tự động đồng bộ Cloud.');
}

function syncActiveProfileWithCloud(direction) {
  const cs = userProgress.cloudSync || { provider: 'local', email: '' };
  if (!cs.provider || cs.provider === 'local' || !cs.email) {
    openCloudConnectModal('google');
    showToast('Hãy kết nối tài khoản Google hoặc Microsoft để đồng bộ hóa!');
    return;
  }
  const provLabel = cs.provider === 'google' ? 'Google Drive' : 'Microsoft OneDrive';
  if (cs.webhookUrl) {
    syncWithRemoteCloudEndpoint(direction === 'pull' ? 'pull' : 'push', false);
  }
  if (direction === 'pull') {
    const snap = readCloudVaultSnapshot(cs.provider, cs.email);
    if (!snap || !snap.payload) {
      showToast('Chưa có bản sao lưu nào trên ' + provLabel + ' cho tài khoản ' + cs.email);
      return;
    }
    const d = snap.payload;
    userProgress.answers = Object.assign({}, d.answers || {}, userProgress.answers);
    userProgress.bookmarks = Object.assign({}, d.bookmarks || {}, userProgress.bookmarks);
    userProgress.flashcards = Object.assign({}, d.flashcards || {}, userProgress.flashcards);
    userProgress.inlineComments = Object.assign({}, d.inlineComments || {}, userProgress.inlineComments);
    userProgress.inlineHighlights = Object.assign({}, d.inlineHighlights || {}, userProgress.inlineHighlights);
    appendCloudSyncLog('⬇️ Đã tải & hợp nhất dữ liệu từ ' + provLabel + ' (' + cs.email + ')');
  } else {
    writeCloudVaultSnapshot(cs.provider, cs.email, userProgress);
    appendCloudSyncLog('⬆️ Đã đẩy bản đồng bộ mới nhất lên ' + provLabel + ' (' + cs.email + ')');
  }
  saveProgress();
  updateTopStats();
  if (currentTab === 'user') renderUserProfileAndAdvisor();
  showToast('🔄 Đã đồng bộ hóa dữ liệu với ' + provLabel + ' (' + cs.email + ')!');
}

function disconnectCloudAccount() {
  if (!userProgress.cloudSync || userProgress.cloudSync.provider === 'local') return;
  const oldEmail = userProgress.cloudSync.email;
  appendCloudSyncLog('Đã ngắt liên kết tài khoản ' + oldEmail);
  userProgress.cloudSync.provider = 'local';
  userProgress.cloudSync.email = '';
  saveProgress();
  renderUserProfileAndAdvisor();
  showToast('Đã ngắt liên kết tài khoản đám mây (Dữ liệu trên máy vẫn được giữ nguyên).');
}

function openCloudSyncTokenModal() {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  const syncBundle = {
    format: 'HMU_CLOUD_SYNC_BUNDLE_V1',
    provider: (userProgress.cloudSync && userProgress.cloudSync.provider) || 'google',
    email: (userProgress.cloudSync && userProgress.cloudSync.email) || '',
    syncedAt: new Date().toLocaleString('vi-VN'),
    data: userProgress
  };
  const encodedToken = btoa(unescape(encodeURIComponent(JSON.stringify(syncBundle))));

  titleEl.textContent = '🔑 Mã Đồng bộ Đám mây Đa Thiết bị (Google / Microsoft Sync Token)';
  bodyEl.innerHTML = '<div class="space-y-3">' +
    '<p class="text-xs text-slate-600">Sao chép <strong>Mã Đồng bộ Đám mây (Sync Token)</strong> bên dưới để dán sang trình duyệt trên điện thoại, iPad hoặc máy tính khác nhằm đồng bộ tức thì toàn bộ tài khoản, kết quả học và lịch sử chỉnh sửa:</p>' +
    '<textarea id="cloudSyncTokenTextarea" rows="7" class="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-[11px] break-all focus:outline-none focus:ring-2 focus:ring-indigo-600"></textarea>' +
  '</div>';
  setTimeout(() => {
    const ta = document.getElementById('cloudSyncTokenTextarea');
    if (ta) ta.value = encodedToken;
  }, 20);

  footerEl.innerHTML = '<button type="button" onclick="copyCloudSyncToken()" class="px-3.5 py-2 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold">📋 Sao chép Mã Đồng bộ</button>' +
    '<button type="button" onclick="applyCloudSyncTokenFromModal()" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">📥 Nhập &amp; Đồng bộ từ Mã này</button>' +
    '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function copyCloudSyncToken() {
  const ta = document.getElementById('cloudSyncTokenTextarea');
  if (!ta) return;
  ta.select();
  document.execCommand('copy');
  showToast('Đã sao chép Mã Đồng bộ Đám mây vào Clipboard!');
}

function applyCloudSyncTokenFromModal() {
  const ta = document.getElementById('cloudSyncTokenTextarea');
  if (!ta || !ta.value.trim()) return;
  try {
    const raw = ta.value.trim();
    const jsonStr = raw.startsWith('{') ? raw : decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.data) {
      processImportedJsonString(JSON.stringify({ format: 'HMU_INFECTIOUS_DISEASE_FULL_BACKUP_V1', data: parsed.data }));
      appendCloudSyncLog('🔑 Đã đồng bộ dữ liệu từ Mã Đồng bộ Đa thiết bị');
      saveProgress();
      closeCustomDataModal();
    } else {
      showToast('Mã đồng bộ không hợp lệ!');
    }
  } catch (e) {
    showToast('Không thể giải mã Mã Đồng bộ! Vui lòng kiểm tra lại.');
  }
}

