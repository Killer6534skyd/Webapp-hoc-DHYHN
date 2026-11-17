function jumpToPartStudy(partName) {
  document.getElementById('studyFilterPart').value = partName;
  document.getElementById('studyFilterTopic').value = 'all';
  document.getElementById('studyFilterStatus').value = 'all';
  switchTab('study');
}

function startPartExamDirect(partName) {
  const pool = QUESTIONS_BANK.filter(q => q.part === partName);
  if (pool.length === 0) return;
  switchTab('exam');
  startExamSession(pool, 'Đề Thi thử ' + partName + ' (' + pool.length + ' câu)', Math.max(15, Math.ceil(pool.length * 0.8)));
}

function practiceWrongQuestionsNow() {
  const wrongQs = QUESTIONS_BANK.filter(q => userProgress.answers.hasOwnProperty(q.id) && userProgress.answers[q.id] !== q.correct_idx);
  if (wrongQs.length === 0) {
    showToast('Bạn hiện không có câu trả lời sai nào! Hệ thống sẽ lọc các câu bẫy lâm sàng.');
    document.getElementById('studyFilterPart').value = 'all';
    document.getElementById('studyFilterTopic').value = 'all';
    document.getElementById('studyFilterStatus').value = 'trap';
    switchTab('study');
    return;
  }
  document.getElementById('studyFilterPart').value = 'all';
  document.getElementById('studyFilterTopic').value = 'all';
  document.getElementById('studyFilterStatus').value = 'wrong';
  switchTab('study');
  showToast('Đang hiển thị ' + wrongQs.length + ' câu hỏi bạn đã làm sai để ôn kỹ!');
}

function startWeaknessDrillExam() {
  let pool = QUESTIONS_BANK.filter(q => {
    const hasAns = userProgress.answers.hasOwnProperty(q.id);
    const isWrong = hasAns && userProgress.answers[q.id] !== q.correct_idx;
    return isWrong || !!userProgress.bookmarks[q.id] || q.is_trap;
  });
  if (pool.length < 15) {
    const unanswered = QUESTIONS_BANK.filter(q => !userProgress.answers.hasOwnProperty(q.id));
    pool = pool.concat(shuffleArray(unanswered).slice(0, 15 - pool.length));
  }
  pool = shuffleArray(pool).slice(0, 15);
  switchTab('exam');
  startExamSession(pool, 'Đề Luyện Chuyên sâu Phần yếu & Bẫy lâm sàng (15 câu)', 15);
}

function jumpToStudyQuestionCard(qId) {
  document.getElementById('studyFilterPart').value = 'all';
  document.getElementById('studyFilterTopic').value = 'all';
  document.getElementById('studyFilterStatus').value = 'all';
  document.getElementById('studySearchInput').value = '';
  switchTab('study', true);
  setTimeout(() => {
    ensureStudyQuestionRendered(qId);
    const el = document.getElementById('card-' + qId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-500');
      setTimeout(() => {
        tabScrollPositions['study'] = window.scrollY || document.documentElement.scrollTop || 0;
        el.classList.remove('ring-2', 'ring-indigo-500');
      }, 800);
    }
  }, 80);
}

function toggleQmTrapNoteField() {
  const chk = document.getElementById('qmIsTrapCheckbox');
  const wrap = document.getElementById('qmTrapNoteWrapper');
  if (chk && wrap) {
    if (chk.checked) wrap.classList.remove('hidden');
    else wrap.classList.add('hidden');
  }
}

function toggleQmStemFields() {
  const chk = document.getElementById('qmIsStemCheckbox');
  const wrap = document.getElementById('qmStemFieldsWrapper');
  if (chk && wrap) {
    if (chk.checked) wrap.classList.remove('hidden');
    else wrap.classList.add('hidden');
  }
}

function handleQmStemIdChange() {
  const sid = (document.getElementById('qmStemIdInput').value || '').trim();
  if (sid && userProgress.stemGroups && userProgress.stemGroups[sid]) {
    const g = userProgress.stemGroups[sid];
    document.getElementById('qmStemTitleInput').value = g.title || '';
    document.getElementById('qmStemVignetteInput').value = g.vignette || '';
  }
}

function unlinkCurrentEditorQuestionStem() {
  const editingId = (document.getElementById('qmEditingId').value || '').trim();
  document.getElementById('qmIsStemCheckbox').checked = false;
  document.getElementById('qmStemIdInput').value = '';
  document.getElementById('qmStemTitleInput').value = '';
  document.getElementById('qmStemVignetteInput').value = '';
  toggleQmStemFields();
  if (editingId) {
    unlinkQuestionFromStem(editingId);
  } else {
    showToast('Đã bỏ gắn thân chung trên biểu mẫu!');
  }
}

function normalizeMediaAttachment(rawInput, mediaType, mode, selectedPlatform, caption) {
  let str = String(rawInput || '').trim();
  if (!str) return null;
  let isIframe = false;
  let url = str;
  let embedUrl = str;
  let platform = selectedPlatform && selectedPlatform !== 'auto' ? selectedPlatform : 'direct';

  // Extract src if user pasted raw <iframe> code
  if (str.toLowerCase().includes('<iframe')) {
    const m = str.match(/src=["']([^"']+)["']/i);
    if (m && m[1]) {
      url = m[1];
      embedUrl = m[1];
      isIframe = true;
      mediaType = 'video';
    }
  }

  const lower = url.toLowerCase();
  if (url.startsWith('data:')) {
    platform = 'local';
  } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    platform = 'youtube';
    mediaType = 'video';
    isIframe = true;
    let vid = '';
    const m1 = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    const m2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    const m3 = url.match(/youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,})/);
    if (m1) vid = m1[1];
    else if (m2) vid = m2[1];
    else if (m3) vid = m3[1];
    if (vid) embedUrl = 'https://www.youtube.com/embed/' + vid;
  } else if (lower.includes('imgur.com')) {
    platform = 'imgur';
    if (!lower.includes('i.imgur.com') && !/\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(lower)) {
      const parts = url.replace(/\/+$/, '').split('/');
      const lastId = parts[parts.length - 1];
      if (lastId && !lower.includes('/a/') && !lower.includes('/gallery/')) {
        embedUrl = 'https://i.imgur.com/' + lastId + '.jpg';
      }
    }
  } else if (lower.includes('postimg.cc') || lower.includes('postimages.org')) {
    platform = 'postimage';
  } else if (lower.includes('drive.google.com') || lower.includes('photos.app.goo.gl') || lower.includes('photos.google.com') || lower.includes('googleusercontent.com')) {
    platform = 'google_photos';
    const dm = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (dm && dm[1]) {
      if (mediaType === 'image') {
        embedUrl = 'https://lh3.googleusercontent.com/d/' + dm[1];
      } else {
        embedUrl = 'https://drive.google.com/file/d/' + dm[1] + '/preview';
        isIframe = true;
      }
    }
  }

  return {
    id: 'med_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    type: mediaType || 'image',
    mode: mode || 'standard',
    platform: platform,
    url: url,
    embedUrl: embedUrl,
    isIframe: isIframe,
    caption: String(caption || '').trim()
  };
}

function updateQmMediaInputPlaceholders() {
  const mType = document.getElementById('qmMediaTypeSelect').value;
  const mMode = document.getElementById('qmMediaModeSelect').value;
  const urlInp = document.getElementById('qmMediaUrlInput');
  if (!urlInp) return;
  if (mMode === 'embed_code') {
    urlInp.placeholder = 'Dán mã nhúng <iframe src="..."></iframe> từ YouTube, Imgur, Google Drive...';
  } else if (mType === 'audio') {
    urlInp.placeholder = 'Dán link file âm thanh (.mp3, .wav, .ogg) hoặc bấm Chọn file từ máy...';
  } else if (mType === 'video') {
    urlInp.placeholder = 'Dán link YouTube (watch?v=... / youtu.be/...), Google Drive video, Imgur MP4...';
  } else {
    urlInp.placeholder = 'Dán link ảnh Imgur, Postimage (postimg.cc), Google Photos/Drive hoặc chọn file ảnh từ máy...';
  }
}

function handleQmLocalMediaUpload(event) {
  const file = event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;
  let detectedType = 'image';
  if (file.type.startsWith('audio/')) detectedType = 'audio';
  else if (file.type.startsWith('video/')) detectedType = 'video';
  document.getElementById('qmMediaTypeSelect').value = detectedType;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const dataUrl = ev.target.result;
    document.getElementById('qmMediaUrlInput').value = dataUrl;
    if (!document.getElementById('qmMediaCaptionInput').value) {
      document.getElementById('qmMediaCaptionInput').value = file.name;
    }
    addMediaItemToQuestionDraft();
  };
  reader.readAsDataURL(file);
}

function addMediaItemToQuestionDraft() {
  const rawUrl = (document.getElementById('qmMediaUrlInput').value || '').trim();
  const mType = document.getElementById('qmMediaTypeSelect').value;
  const mMode = document.getElementById('qmMediaModeSelect').value;
  const mPlat = document.getElementById('qmMediaPlatformSelect').value;
  const caption = (document.getElementById('qmMediaCaptionInput').value || '').trim();

  if (!rawUrl) {
    showToast('Vui lòng dán đường dẫn (URL / mã nhúng) hoặc tải file từ máy!');
    return;
  }
  const item = normalizeMediaAttachment(rawUrl, mType, mMode, mPlat, caption);
  if (!item) return;
  qmDraftMedia.push(item);
  document.getElementById('qmMediaUrlInput').value = '';
  document.getElementById('qmMediaCaptionInput').value = '';
  renderQmDraftMediaList();
  showToast('Đã chèn nội dung đa phương tiện vào biểu mẫu câu hỏi!');
}

function removeMediaItemFromQuestionDraft(mediaId) {
  qmDraftMedia = qmDraftMedia.filter(m => m.id !== mediaId);
  renderQmDraftMediaList();
}

function renderQmDraftMediaList() {
  const badge = document.getElementById('qmMediaCountBadge');
  if (badge) badge.textContent = qmDraftMedia.length + ' tệp đính kèm';
  const container = document.getElementById('qmDraftMediaList');
  if (!container) return;
  if (qmDraftMedia.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-slate-500 italic bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">Chưa có hình ảnh, âm thanh hoặc video nào được đính kèm cho câu hỏi này.</div>';
    return;
  }
  container.innerHTML = qmDraftMedia.map((m, idx) => {
    const icon = m.type === 'audio' ? '🎵' : (m.type === 'video' ? '🎬' : '🖼️');
    const shortUrl = m.url.startsWith('data:') ? '[Tệp tải lên từ máy - Base64]' : m.url;
    return '<div class="p-2.5 rounded-xl bg-white border border-indigo-200 flex items-center justify-between gap-2 text-xs">' +
      '<div class="min-w-0 flex-1">' +
        '<div class="font-bold text-indigo-950 truncate">' + icon + ' #' + (idx + 1) + ' (' + escapeHtml(m.platform.toUpperCase()) + '): ' + escapeHtml(m.caption || 'Không có chú thích') + '</div>' +
        '<div class="text-[10px] text-slate-500 truncate">' + escapeHtml(shortUrl) + '</div>' +
      '</div>' +
      '<button type="button" onclick="removeMediaItemFromQuestionDraft(\'' + m.id + '\')" class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold shrink-0">✕ Xóa</button>' +
    '</div>';
  }).join('');
}

function resetQuestionEditorForm() {
  document.getElementById('qmEditingId').value = '';
  document.getElementById('qmFormModeBadge').textContent = '➕ Chế độ: Thêm câu hỏi mới';
  document.getElementById('qmFormModeBadge').className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800';
  document.getElementById('qmFormHeaderTitle').textContent = 'Biên soạn Câu hỏi Y khoa Mới';
  document.getElementById('qmPartSelect').value = 'Phần VI';
  document.getElementById('qmTopicInput').value = 'Sốt xuất huyết Dengue';
  document.getElementById('qmQuestionInput').value = '';
  document.getElementById('qmOpt0').value = '';
  document.getElementById('qmOpt1').value = '';
  document.getElementById('qmOpt2').value = '';
  document.getElementById('qmOpt3').value = '';
  document.getElementById('qmRadio0').checked = true;
  document.getElementById('qmAnsSummaryInput').value = '';
  document.getElementById('qmHintInput').value = '';
  document.getElementById('qmExpInput').value = '';
  document.getElementById('qmIsTrapCheckbox').checked = false;
  document.getElementById('qmTrapNoteInput').value = '';
  toggleQmTrapNoteField();
  document.getElementById('qmIsStemCheckbox').checked = false;
  document.getElementById('qmStemIdInput').value = '';
  document.getElementById('qmStemTitleInput').value = '';
  document.getElementById('qmStemVignetteInput').value = '';
  toggleQmStemFields();
  qmDraftMedia = [];
  renderQmDraftMediaList();
  const histBox = document.getElementById('qmEditorHistoryBox');
  if (histBox) histBox.classList.add('hidden');
}

function createCleanQuestionSnapshot(qObj) {
  if (!qObj) return null;
  return JSON.parse(JSON.stringify({
    part: qObj.part || 'Phần VI',
    part_title: qObj.part_title || '',
    topic: qObj.topic || '',
    q: qObj.q || '',
    options: Array.isArray(qObj.options) ? qObj.options.slice() : [],
    correct_idx: typeof qObj.correct_idx === 'number' ? qObj.correct_idx : 0,
    ans: qObj.ans || '',
    hint: qObj.hint || '',
    exp: qObj.exp || '',
    ref_label: qObj.ref_label || '',
    ref_url: qObj.ref_url || '',
    is_trap: !!qObj.is_trap,
    trap_note: qObj.trap_note || '',
    stem_id: qObj.stem_id || '',
    stem_title: qObj.stem_title || '',
    stem_vignette: qObj.stem_vignette || '',
    media: Array.isArray(qObj.media) ? qObj.media : []
  }));
}

function summarizeQuestionDiff(beforeSnap, afterSnap) {
  if (!beforeSnap) return 'Tạo mới câu hỏi';
  const changes = [];
  if (beforeSnap.q !== afterSnap.q) changes.push('Nội dung câu hỏi');
  if (JSON.stringify(beforeSnap.options) !== JSON.stringify(afterSnap.options) || beforeSnap.correct_idx !== afterSnap.correct_idx) changes.push('Phương án / Đáp án đúng');
  if (beforeSnap.exp !== afterSnap.exp || beforeSnap.ans !== afterSnap.ans) changes.push('Giải thích chuyên môn');
  if (beforeSnap.hint !== afterSnap.hint) changes.push('Gợi ý lâm sàng');
  if (beforeSnap.topic !== afterSnap.topic || beforeSnap.part !== afterSnap.part) changes.push('Phần / Chủ đề');
  if ((beforeSnap.stem_id || '') !== (afterSnap.stem_id || '') || (beforeSnap.stem_vignette || '') !== (afterSnap.stem_vignette || '')) changes.push('Gắn kết thân chung');
  if (JSON.stringify(beforeSnap.media || []) !== JSON.stringify(afterSnap.media || [])) changes.push('Đa phương tiện (Ảnh/Audio/Video)');
  return changes.length > 0 ? ('Chỉnh sửa: ' + changes.join(', ')) : 'Cập nhật thông tin câu hỏi';
}

function recordQuestionEditHistory(qId, qNum, beforeSnap, afterSnap, customSummary) {
  pruneExpiredEditHistory(false);
  if (!userProgress.questionEditHistory) userProgress.questionEditHistory = {};
  if (!Array.isArray(userProgress.questionEditHistory[qId])) userProgress.questionEditHistory[qId] = [];
  const author = (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Người học';
  const entry = {
    revId: 'rev_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    qId: qId,
    qNum: qNum || 0,
    timestampMs: Date.now(),
    dateStr: new Date().toLocaleString('vi-VN'),
    author: author,
    summary: customSummary || summarizeQuestionDiff(beforeSnap, afterSnap),
    beforeSnapshot: beforeSnap,
    afterSnapshot: afterSnap
  };
  userProgress.questionEditHistory[qId].unshift(entry);
  // Keep up to 25 recent revisions per question within 7 days
  if (userProgress.questionEditHistory[qId].length > 25) {
    userProgress.questionEditHistory[qId] = userProgress.questionEditHistory[qId].slice(0, 25);
  }
}

function renderEditorInlineHistoryBox(qId) {
  const box = document.getElementById('qmEditorHistoryBox');
  const badge = document.getElementById('qmEditorHistoryCountBadge');
  const listEl = document.getElementById('qmEditorHistoryQuickList');
  if (!box || !badge || !listEl) return;
  pruneExpiredEditHistory(false);
  const hist = (userProgress.questionEditHistory && Array.isArray(userProgress.questionEditHistory[qId]))
    ? userProgress.questionEditHistory[qId]
    : [];
  if (hist.length === 0) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  badge.textContent = hist.length + ' phiên bản (Lưu 7 ngày)';
  listEl.innerHTML = hist.slice(0, 5).map((h, idx) => {
    const ttlText = formatRemainingTtl7Days(h.timestampMs);
    return '<div class="p-2 rounded-lg bg-white border border-amber-200 flex items-center justify-between gap-2">' +
      '<div class="min-w-0 flex-1">' +
        '<div class="font-bold text-slate-900 truncate">' + (idx === 0 ? '🟢 Mới nhất: ' : ('Phiên bản #' + (hist.length - idx) + ': ')) + escapeHtml(h.summary) + '</div>' +
        '<div class="text-[10px] text-slate-500">🕒 ' + escapeHtml(h.dateStr) + ' • <span class="text-amber-800 font-semibold">' + escapeHtml(ttlText) + '</span></div>' +
      '</div>' +
      '<button type="button" onclick="revertQuestionToSpecificRevision(\'' + qId + '\', \'' + h.revId + '\', \'before\')" class="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 text-[11px] font-bold shrink-0" title="Khôi phục về trạng thái ngay trước lần chỉnh sửa này">↩️ Revert về trước bản này</button>' +
    '</div>';
  }).join('');
}

function loadQuestionIntoEditor(qId) {
  const q = QUESTIONS_BANK.find(x => x.id === qId);
  if (!q) return;
  document.getElementById('qmEditingId').value = q.id;
  document.getElementById('qmFormModeBadge').textContent = '✏️ Đang chỉnh sửa câu hỏi #' + q.num + ' (' + q.id + ')';
  document.getElementById('qmFormModeBadge').className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900';
  document.getElementById('qmFormHeaderTitle').textContent = 'Chỉnh sửa Câu hỏi #' + q.num;
  document.getElementById('qmPartSelect').value = q.part || 'Phần VI';
  document.getElementById('qmTopicInput').value = q.topic || 'HIV/AIDS';
  document.getElementById('qmQuestionInput').value = q.q || '';
  document.getElementById('qmOpt0').value = q.options[0] || '';
  document.getElementById('qmOpt1').value = q.options[1] || '';
  document.getElementById('qmOpt2').value = q.options[2] || '';
  document.getElementById('qmOpt3').value = q.options[3] || '';
  const rEl = document.getElementById('qmRadio' + Math.min(3, Math.max(0, q.correct_idx || 0)));
  if (rEl) rEl.checked = true;
  document.getElementById('qmAnsSummaryInput').value = q.ans || '';
  document.getElementById('qmHintInput').value = q.hint || '';
  document.getElementById('qmExpInput').value = q.exp || '';
  document.getElementById('qmRefLabelInput').value = q.ref_label || 'Quyết định 5642/QĐ-BYT của Bộ Y tế';
  document.getElementById('qmRefUrlInput').value = q.ref_url || 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-5642-QD-BYT-2015-Huong-dan-chan-doan-va-dieu-tri-mot-so-benh-truyen-nhiem-379633.aspx';
  document.getElementById('qmIsTrapCheckbox').checked = !!q.is_trap;
  document.getElementById('qmTrapNoteInput').value = q.trap_note || '';
  toggleQmTrapNoteField();

  const hasStem = !!(q.stem_id);
  document.getElementById('qmIsStemCheckbox').checked = hasStem;
  document.getElementById('qmStemIdInput').value = q.stem_id || '';
  document.getElementById('qmStemTitleInput').value = q.stem_title || '';
  document.getElementById('qmStemVignetteInput').value = q.stem_vignette || '';
  toggleQmStemFields();

  qmDraftMedia = Array.isArray(q.media) ? JSON.parse(JSON.stringify(q.media)) : [];
  renderQmDraftMediaList();
  renderEditorInlineHistoryBox(q.id);
  const formEl = document.getElementById('qmFormHeaderTitle');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function jumpToEditQuestion(qId) {
  switchTab('manage');
  loadQuestionIntoEditor(qId);
}

function openQuickAddQuestionFromStudy() {
  switchTab('manage');
  resetQuestionEditorForm();
}

function saveQuestionFromEditor() {
  const editingId = (document.getElementById('qmEditingId').value || '').trim();
  const part = document.getElementById('qmPartSelect').value || 'Phần VI';
  const topic = (document.getElementById('qmTopicInput').value || '').trim() || 'Truyền nhiễm tổng hợp';
  const qText = (document.getElementById('qmQuestionInput').value || '').trim();
  const rawOpts = [
    (document.getElementById('qmOpt0').value || '').trim(),
    (document.getElementById('qmOpt1').value || '').trim(),
    (document.getElementById('qmOpt2').value || '').trim(),
    (document.getElementById('qmOpt3').value || '').trim()
  ];

  if (!qText) {
    showToast('Vui lòng nhập nội dung câu hỏi!');
    return;
  }
  const validOpts = rawOpts.filter(Boolean);
  if (validOpts.length < 2) {
    showToast('Vui lòng nhập tối thiểu 2 phương án lựa chọn!');
    return;
  }

  let selectedRadio = 0;
  for (let i = 0; i < 4; i++) {
    const r = document.getElementById('qmRadio' + i);
    if (r && r.checked) selectedRadio = i;
  }
  if (selectedRadio >= validOpts.length) selectedRadio = 0;

  const ansText = (document.getElementById('qmAnsSummaryInput').value || '').trim() || validOpts[selectedRadio];
  const hintText = (document.getElementById('qmHintInput').value || '').trim() || 'Gợi ý: Đối chiếu cơ chế bệnh sinh, triệu chứng điển hình và phác đồ chẩn đoán - điều trị chuẩn của Bộ Y tế.';
  const expText = (document.getElementById('qmExpInput').value || '').trim() || ('Đáp án đúng là: ' + ansText);
  const refLabel = (document.getElementById('qmRefLabelInput').value || '').trim() || 'Hướng dẫn Chẩn đoán & Điều trị của Bộ Y tế';
  const refUrl = (document.getElementById('qmRefUrlInput').value || '').trim() || 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-5642-QD-BYT-2015-Huong-dan-chan-doan-va-dieu-tri-mot-so-benh-truyen-nhiem-379633.aspx';
  const isTrap = !!document.getElementById('qmIsTrapCheckbox').checked;
  const trapNote = isTrap ? (document.getElementById('qmTrapNoteInput').value || '').trim() : '';

  const partTitleMap = (activeCourseObj && activeCourseObj.partTitleMap) ? activeCourseObj.partTitleMap : {};

  const isStemChecked = !!document.getElementById('qmIsStemCheckbox').checked;
  const stemIdVal = isStemChecked ? ((document.getElementById('qmStemIdInput').value || '').trim() || ('case_' + Date.now())) : '';
  const stemTitleVal = isStemChecked ? ((document.getElementById('qmStemTitleInput').value || '').trim() || ('Chùm câu hỏi thân chung ' + stemIdVal)) : '';
  const stemVigVal = isStemChecked ? (document.getElementById('qmStemVignetteInput').value || '').trim() : '';

  const questionData = {
    part: part,
    part_title: partTitleMap[part] || part,
    topic: topic,
    q: qText,
    options: validOpts,
    correct_idx: selectedRadio,
    ans: ansText,
    hint: hintText,
    exp: expText,
    ref_label: refLabel,
    ref_url: refUrl,
    is_trap: isTrap,
    trap_note: trapNote,
    stem_id: stemIdVal,
    stem_title: stemTitleVal,
    stem_vignette: stemVigVal,
    media: JSON.parse(JSON.stringify(qmDraftMedia || []))
  };

  let targetQId = editingId;
  if (editingId) {
    const existingQ = QUESTIONS_BANK.find(x => x.id === editingId);
    const beforeSnap = createCleanQuestionSnapshot(existingQ);
    const afterSnap = createCleanQuestionSnapshot(questionData);
    recordQuestionEditHistory(editingId, existingQ ? existingQ.num : 0, beforeSnap, afterSnap);

    const isOrig = ORIGINAL_BANK_SNAPSHOT.some(o => o.id === editingId);
    if (isOrig) {
      userProgress.editedQuestions[editingId] = questionData;
    } else {
      const cIdx = userProgress.customQuestions.findIndex(c => c.id === editingId);
      if (cIdx !== -1) {
        userProgress.customQuestions[cIdx] = Object.assign({}, userProgress.customQuestions[cIdx], questionData);
      }
    }
    showToast('Đã lưu chỉnh sửa & ghi nhận vào Lịch sử chỉnh sửa (Lưu 7 ngày)!');
  } else {
    targetQId = 'q_custom_' + Date.now();
    const newNum = ORIGINAL_BANK_SNAPSHOT.length + userProgress.customQuestions.length + 1;
    userProgress.customQuestions.push(Object.assign({ id: targetQId }, questionData));
    recordQuestionEditHistory(targetQId, newNum, null, createCleanQuestionSnapshot(questionData), 'Tạo mới câu hỏi tự biên soạn');
    showToast('Đã thêm câu hỏi mới vào Ngân hàng đề!');
  }

  if (isStemChecked && stemIdVal) {
    userProgress.stemGroups[stemIdVal] = {
      id: stemIdVal,
      title: stemTitleVal,
      vignette: stemVigVal
    };
    userProgress.questionStemMap[targetQId] = stemIdVal;
    delete userProgress.unlinkedStemQuestions[targetQId];
  } else if (targetQId) {
    delete userProgress.questionStemMap[targetQId];
    userProgress.unlinkedStemQuestions[targetQId] = true;
  }

  syncQuestionsBankWithCustomizations();
  populateTopicDropdowns();
  saveProgress();
  updateTopStats();
  resetQuestionEditorForm();
  renderManageQuestionsList();
}

function renderManageQuestionsList() {
  const totalEl = document.getElementById('qmBankTotalCount');
  if (totalEl) totalEl.textContent = String(QUESTIONS_BANK.length);

  const partFilter = document.getElementById('qmFilterPart').value;
  const sourceFilter = document.getElementById('qmFilterSource').value;
  const kw = (document.getElementById('qmSearchInput').value || '').trim().toLowerCase();

  const filtered = QUESTIONS_BANK.filter(q => {
    if (partFilter !== 'all' && q.part !== partFilter) return false;
    if (sourceFilter === 'stem' && !q.stem_id) return false;
    if (sourceFilter === 'media' && (!Array.isArray(q.media) || q.media.length === 0)) return false;
    if (sourceFilter === 'custom' && !q.is_custom) return false;
    if (sourceFilter === 'edited' && !q.is_edited) return false;
    if (sourceFilter === 'trap' && !q.is_trap) return false;
    if (kw) {
      if (!matchesQuestionSearchWithHash(q, kw, q.stem_title || '')) return false;
    }
    return true;
  });

  const container = document.getElementById('qmQuestionsListContainer');
  if (!container) return;
  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Không có câu hỏi nào khớp với bộ lọc hiện tại.</div>';
  } else {
    renderManageListProgressive(filtered, container);
  }
  renderStemManagerQuestionPicker();
  renderStemClustersManagerList();
  renderGlobalEditHistoryPanel();
}

let qmFilteredListCache = [];
let qmRenderedCount = 0;
const QM_BATCH_SIZE = 45;
let qmObserver = null;

function renderManageListProgressive(list, container) {
  qmFilteredListCache = list;
  qmRenderedCount = 0;
  if (qmObserver) {
    qmObserver.disconnect();
    qmObserver = null;
  }
  container.innerHTML = '';
  appendNextManageBatch();
}

function renderManageSingleRowHtml(q) {
      const badgeCustom = q.is_custom
        ? '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">➕ Câu tự thêm</span>'
        : (q.is_edited ? '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">✏️ Đã sửa</span>' : '');
      const badgeStem = q.stem_id
        ? '<span class="px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] font-bold">🔗 Thân chung (' + q.stem_index + '/' + q.stem_total + ')</span>'
        : '';
      const badgeMedia = (Array.isArray(q.media) && q.media.length > 0)
        ? '<span class="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-bold">🖼️ ' + q.media.length + ' media</span>'
        : '';
      const stemUnlinkBtn = q.stem_id
        ? '<button type="button" onclick="unlinkQuestionFromStem(\'' + q.id + '\')" class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold" title="Hủy gắn thân chung cho câu hỏi này">🔓 Hủy gắn Case</button>'
        : '';
      const qHist = (userProgress.questionEditHistory && Array.isArray(userProgress.questionEditHistory[q.id])) ? userProgress.questionEditHistory[q.id] : [];
      const histBtn = qHist.length > 0
        ? '<button type="button" onclick="openQuestionEditHistoryModal(\'' + q.id + '\')" class="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold" title="Xem lịch sử chỉnh sửa trong 7 ngày qua">🕒 Lịch sử (' + qHist.length + ')</button>' +
          '<button type="button" onclick="revertQuestionToPreviousVersion(\'' + q.id + '\')" class="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold" title="Revert back về bản ngay trước lần chỉnh sửa vừa rồi">⏪ Revert bản trước</button>'
        : '';
      const actionExtra = q.is_custom
        ? '<button type="button" onclick="deleteCustomQuestion(\'' + q.id + '\')" class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold">🗑️ Xóa</button>'
        : (q.is_edited ? '<button type="button" onclick="revertEditedQuestion(\'' + q.id + '\')" class="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold">↩️ Khôi phục gốc</button>' : '');

      return (
        '<div class="p-3.5 rounded-xl border ' + (q.stem_id ? 'border-cyan-300 bg-cyan-50/30' : 'border-slate-200 bg-slate-50/50') + ' hover:border-teal-300 space-y-1.5 transition">' +
          '<div class="flex items-center justify-between gap-2 flex-wrap">' +
            '<div class="flex items-center gap-1.5 flex-wrap">' +
              '<span class="px-2 py-0.5 rounded bg-teal-900 text-white text-[11px] font-bold" title="Mã định danh: #' + q.num + ' (' + escapeHtml(q.id) + ')">#' + q.num + '</span>' +
              '<span class="text-xs font-semibold text-teal-800">' + escapeHtml(q.part) + '</span>' +
              '<span class="text-xs text-slate-500">• ' + escapeHtml(q.topic) + '</span>' +
              badgeStem + badgeMedia + badgeCustom +
            '</div>' +
            '<div class="flex items-center gap-1.5 flex-wrap">' +
              histBtn + stemUnlinkBtn +
              '<button type="button" onclick="loadQuestionIntoEditor(\'' + q.id + '\')" class="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">✏️ Chỉnh sửa / Chèn Media</button>' +
              actionExtra +
            '</div>' +
          '</div>' +
          (q.stem_title ? '<div class="text-[11px] font-bold text-cyan-900">🔗 Case: ' + escapeHtml(q.stem_title) + '</div>' : '') +
          '<div class="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2">' + escapeHtml(q.q) + '</div>' +
          '<div class="text-xs text-emerald-800 font-medium">✓ Đáp án: ' + escapeHtml(q.ans) + '</div>' +
        '</div>'
      );
}

function appendNextManageBatch(countOverride) {
  const container = document.getElementById('qmQuestionsListContainer');
  if (!container) return;
  const oldSentinel = document.getElementById('qmLoadMoreSentinel');
  if (oldSentinel) oldSentinel.remove();

  const total = qmFilteredListCache.length;
  if (qmRenderedCount >= total) return;

  const batchSize = countOverride || QM_BATCH_SIZE;
  const nextEnd = Math.min(total, qmRenderedCount + batchSize);
  const htmlChunk = qmFilteredListCache.slice(qmRenderedCount, nextEnd).map(renderManageSingleRowHtml).join('');
  container.insertAdjacentHTML('beforeend', htmlChunk);
  qmRenderedCount = nextEnd;

  if (qmRenderedCount < total) {
    const remain = total - qmRenderedCount;
    const sentinelHtml =
      '<div id="qmLoadMoreSentinel" class="p-3 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">' +
        '<div class="text-[11px] text-slate-600">Đang hiển thị <strong>' + qmRenderedCount + ' / ' + total + '</strong> câu hỏi</div>' +
        '<div class="flex items-center justify-center gap-2">' +
          '<button type="button" onclick="appendNextManageBatch(45)" class="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold">⬇️ Tải thêm ' + Math.min(45, remain) + ' câu</button>' +
          '<button type="button" onclick="appendNextManageBatch(' + remain + ')" class="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-semibold">Hiện tất cả (' + remain + ')</button>' +
        '</div>' +
      '</div>';
    container.insertAdjacentHTML('beforeend', sentinelHtml);
    if ('IntersectionObserver' in window) {
      const sentinelEl = document.getElementById('qmLoadMoreSentinel');
      if (sentinelEl) {
        qmObserver = new IntersectionObserver((entries) => {
          if (entries[0] && entries[0].isIntersecting) {
            if (qmObserver) { qmObserver.disconnect(); qmObserver = null; }
            appendNextManageBatch(QM_BATCH_SIZE);
          }
        }, { rootMargin: '400px' });
        qmObserver.observe(sentinelEl);
      }
    }
  }
}

let selectedPickerQuestionIds = new Set();

function renderStemManagerQuestionPicker() {
  const listEl = document.getElementById('stemMgrQuestionPickerList');
  if (!listEl) return;
  const kw = (document.getElementById('stemMgrQuestionFilter')?.value || '').trim().toLowerCase();
  const pool = QUESTIONS_BANK.filter(q => {
    if (!kw) return true;
    return matchesQuestionSearchWithHash(q, kw, q.stem_title || '');
  }).slice(0, 80);

  listEl.innerHTML = pool.map(q => {
    const checked = selectedPickerQuestionIds.has(q.id) ? 'checked' : '';
    const stemTag = q.stem_id ? ' <span class="text-cyan-700 font-bold">[' + escapeHtml(q.stem_id) + ']</span>' : '';
    return '<label class="flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">' +
      '<input type="checkbox" ' + checked + ' onchange="toggleStemPickerQuestion(\'' + q.id + '\', this.checked)" class="mt-0.5 rounded text-cyan-700" />' +
      '<span class="flex-1 leading-snug"><strong>#' + q.num + ' (' + escapeHtml(q.part) + '):</strong> ' + escapeHtml(q.q.slice(0, 95)) + '...' + stemTag + '</span>' +
    '</label>';
  }).join('');
}

function toggleStemPickerQuestion(qId, isChecked) {
  if (isChecked) selectedPickerQuestionIds.add(qId);
  else selectedPickerQuestionIds.delete(qId);
}

function resetStemClusterManagerForm() {
  document.getElementById('stemMgrIdInput').value = '';
  document.getElementById('stemMgrTitleInput').value = '';
  document.getElementById('stemMgrVignetteInput').value = '';
  selectedPickerQuestionIds.clear();
  renderStemManagerQuestionPicker();
}

function loadStemClusterIntoManager(stemId) {
  const g = userProgress.stemGroups && userProgress.stemGroups[stemId];
  if (!g) return;
  document.getElementById('stemMgrIdInput').value = g.id || stemId;
  document.getElementById('stemMgrTitleInput').value = g.title || '';
  document.getElementById('stemMgrVignetteInput').value = g.vignette || '';
  selectedPickerQuestionIds.clear();
  QUESTIONS_BANK.forEach(q => {
    if (q.stem_id === stemId) selectedPickerQuestionIds.add(q.id);
  });
  renderStemManagerQuestionPicker();
  showToast('Đã nạp thông tin chùm thân chung "' + (g.title || stemId) + '" để chỉnh sửa!');
}

function saveAndLinkStemClusterFromManager() {
  const sid = (document.getElementById('stemMgrIdInput').value || '').trim() || ('case_' + Date.now());
  const sTitle = (document.getElementById('stemMgrTitleInput').value || '').trim();
  const sVig = (document.getElementById('stemMgrVignetteInput').value || '').trim();
  if (!sTitle) {
    showToast('Vui lòng nhập Tên hiển thị chùm Case thân chung!');
    return;
  }
  if (selectedPickerQuestionIds.size === 0) {
    showToast('Vui lòng tích chọn ít nhất 1 câu hỏi để gắn vào chùm thân chung!');
    return;
  }
  userProgress.stemGroups[sid] = { id: sid, title: sTitle, vignette: sVig };
  // Unlink any question that was previously in sid but unchecked now
  QUESTIONS_BANK.forEach(q => {
    if (q.stem_id === sid && !selectedPickerQuestionIds.has(q.id)) {
      delete userProgress.questionStemMap[q.id];
      userProgress.unlinkedStemQuestions[q.id] = true;
    }
  });
  selectedPickerQuestionIds.forEach(qid => {
    userProgress.questionStemMap[qid] = sid;
    delete userProgress.unlinkedStemQuestions[qid];
  });
  syncQuestionsBankWithCustomizations();
  saveProgress();
  updateTopStats();
  renderManageQuestionsList();
  showToast('Đã lưu và gắn ' + selectedPickerQuestionIds.size + ' câu hỏi vào chùm thân chung!');
}

function unlinkQuestionFromStem(qId) {
  delete userProgress.questionStemMap[qId];
  userProgress.unlinkedStemQuestions[qId] = true;
  if (userProgress.editedQuestions && userProgress.editedQuestions[qId]) {
    userProgress.editedQuestions[qId].stem_id = '';
    userProgress.editedQuestions[qId].stem_title = '';
    userProgress.editedQuestions[qId].stem_vignette = '';
  }
  const cIdx = userProgress.customQuestions.findIndex(c => c.id === qId);
  if (cIdx !== -1) {
    userProgress.customQuestions[cIdx].stem_id = '';
    userProgress.customQuestions[cIdx].stem_title = '';
    userProgress.customQuestions[cIdx].stem_vignette = '';
  }
  syncQuestionsBankWithCustomizations();
  saveProgress();
  updateTopStats();
  if (currentTab === 'manage') renderManageQuestionsList();
  if (currentTab === 'study') applyStudyFilters();
  showToast('Đã hủy gắn thân chung cho câu hỏi!');
}

function unlinkEntireStemCluster(stemId) {
  openAppModal('Hủy gắn toàn bộ chùm câu hỏi thân chung', 'Bạn có chắc muốn hủy gắn tất cả các câu hỏi trong chùm "' + stemId + '" để các câu trở về câu hỏi đơn lẻ không?', function () {
    QUESTIONS_BANK.forEach(q => {
      if (q.stem_id === stemId) {
        delete userProgress.questionStemMap[q.id];
        userProgress.unlinkedStemQuestions[q.id] = true;
      }
    });
    delete userProgress.stemGroups[stemId];
    syncQuestionsBankWithCustomizations();
    saveProgress();
    updateTopStats();
    renderManageQuestionsList();
    showToast('Đã hủy gắn toàn bộ chùm câu hỏi thân chung!');
  });
}

function renderStemClustersManagerList() {
  const container = document.getElementById('stemMgrClustersContainer');
  const countEl = document.getElementById('stemMgrTotalClusters');
  if (!container) return;
  const clusterMap = {};
  QUESTIONS_BANK.forEach(q => {
    if (q.stem_id) {
      if (!clusterMap[q.stem_id]) {
        clusterMap[q.stem_id] = {
          id: q.stem_id,
          title: q.stem_title || q.stem_id,
          vignette: q.stem_vignette || '',
          questions: []
        };
      }
      clusterMap[q.stem_id].questions.push(q);
    }
  });
  const cKeys = Object.keys(clusterMap);
  if (countEl) countEl.textContent = String(cKeys.length);
  if (cKeys.length === 0) {
    container.innerHTML = '<div class="p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Hiện chưa có chùm câu hỏi thân chung nào.</div>';
    return;
  }
  container.innerHTML = cKeys.map(cid => {
    const cl = clusterMap[cid];
    const qPills = cl.questions.map(q =>
      '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-cyan-300 text-[11px] font-semibold text-cyan-950">' +
        '<span>#' + q.num + '</span>' +
        '<button type="button" onclick="unlinkQuestionFromStem(\'' + q.id + '\')" class="text-rose-600 hover:text-rose-800 font-bold ml-1" title="Hủy gắn câu #' + q.num + ' khỏi chùm này">✕</button>' +
      '</span>'
    ).join('');
    return '<div class="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/40 space-y-2">' +
      '<div class="flex items-start justify-between gap-2 flex-wrap">' +
        '<div>' +
          '<span class="px-2 py-0.5 rounded bg-cyan-800 text-white text-[10px] font-bold">Mã: ' + escapeHtml(cl.id) + ' (' + cl.questions.length + ' câu)</span>' +
          '<h5 class="text-xs sm:text-sm font-extrabold text-slate-900 mt-1">' + escapeHtml(cl.title) + '</h5>' +
        '</div>' +
        '<div class="flex items-center gap-1.5">' +
          '<button type="button" onclick="loadStemClusterIntoManager(\'' + escapeHtml(cl.id) + '\')" class="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">✏️ Sửa / Gắn thêm câu</button>' +
          '<button type="button" onclick="unlinkEntireStemCluster(\'' + escapeHtml(cl.id) + '\')" class="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold">🔓 Hủy cả chùm</button>' +
        '</div>' +
      '</div>' +
      (cl.vignette ? '<p class="text-xs text-slate-700 italic bg-white/80 px-2.5 py-1.5 rounded border border-cyan-100">' + escapeHtml(cl.vignette) + '</p>' : '') +
      '<div class="flex items-center gap-1.5 flex-wrap pt-0.5"><span class="text-[11px] font-semibold text-slate-600">Các câu đang gắn (nhấn ✕ để hủy gắn lẻ):</span>' + qPills + '</div>' +
    '</div>';
  }).join('');
}

function deleteCustomQuestion(qId) {
  openAppModal('Xóa câu hỏi tự thêm', 'Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng đề không?', function () {
    userProgress.customQuestions = userProgress.customQuestions.filter(c => c.id !== qId);
    delete userProgress.answers[qId];
    delete userProgress.bookmarks[qId];
    delete userProgress.inlineComments[qId];
    syncQuestionsBankWithCustomizations();
    populateTopicDropdowns();
    saveProgress();
    updateTopStats();
    renderManageQuestionsList();
    showToast('Đã xóa câu hỏi!');
  });
}

function applyQuestionSnapshotToBank(qId, snap, summaryMsg) {
  if (!snap) return;
  const currentQ = QUESTIONS_BANK.find(x => x.id === qId);
  const beforeSnap = createCleanQuestionSnapshot(currentQ);
  const afterSnap = createCleanQuestionSnapshot(snap);
  recordQuestionEditHistory(qId, currentQ ? currentQ.num : 0, beforeSnap, afterSnap, summaryMsg || 'Revert về phiên bản trước');

  const isOrig = ORIGINAL_BANK_SNAPSHOT.some(o => o.id === qId);
  if (isOrig) {
    userProgress.editedQuestions[qId] = Object.assign({}, snap);
  } else {
    const cIdx = userProgress.customQuestions.findIndex(c => c.id === qId);
    if (cIdx !== -1) {
      userProgress.customQuestions[cIdx] = Object.assign({ id: qId }, snap);
    }
  }

  if (snap.stem_id) {
    userProgress.stemGroups[snap.stem_id] = {
      id: snap.stem_id,
      title: snap.stem_title || snap.stem_id,
      vignette: snap.stem_vignette || ''
    };
    userProgress.questionStemMap[qId] = snap.stem_id;
    delete userProgress.unlinkedStemQuestions[qId];
  } else {
    delete userProgress.questionStemMap[qId];
    userProgress.unlinkedStemQuestions[qId] = true;
  }

  syncQuestionsBankWithCustomizations();
  populateTopicDropdowns();
  saveProgress();
  updateTopStats();
  if (document.getElementById('qmEditingId').value === qId) {
    loadQuestionIntoEditor(qId);
  }
  if (currentTab === 'manage') renderManageQuestionsList();
  if (currentTab === 'study') applyStudyFilters();
}

function revertQuestionToPreviousVersion(qId) {
  pruneExpiredEditHistory(false);
  const hist = (userProgress.questionEditHistory && Array.isArray(userProgress.questionEditHistory[qId]))
    ? userProgress.questionEditHistory[qId]
    : [];
  if (hist.length === 0) {
    showToast('Câu hỏi này chưa có lịch sử chỉnh sửa trong 7 ngày qua!');
    return;
  }
  const latestRev = hist[0];
  if (!latestRev.beforeSnapshot) {
    // Was newly created custom question; revert to original if exists
    const orig = ORIGINAL_BANK_SNAPSHOT.find(o => o.id === qId);
    if (orig) {
      revertEditedQuestion(qId);
      return;
    }
    showToast('Phiên bản đầu tiên là bản tạo mới, không có bản trước đó!');
    return;
  }
  // Pop the latest revision and restore its beforeSnapshot directly
  const targetSnap = JSON.parse(JSON.stringify(latestRev.beforeSnapshot));
  userProgress.questionEditHistory[qId].shift();
  if (userProgress.questionEditHistory[qId].length === 0) {
    delete userProgress.questionEditHistory[qId];
  }

  const orig = ORIGINAL_BANK_SNAPSHOT.find(o => o.id === qId);
  if (orig && JSON.stringify(createCleanQuestionSnapshot(orig)) === JSON.stringify(createCleanQuestionSnapshot(targetSnap))) {
    delete userProgress.editedQuestions[qId];
  } else if (orig) {
    userProgress.editedQuestions[qId] = targetSnap;
  } else {
    const cIdx = userProgress.customQuestions.findIndex(c => c.id === qId);
    if (cIdx !== -1) userProgress.customQuestions[cIdx] = Object.assign({ id: qId }, targetSnap);
  }

  if (targetSnap.stem_id) {
    userProgress.questionStemMap[qId] = targetSnap.stem_id;
    delete userProgress.unlinkedStemQuestions[qId];
  } else {
    delete userProgress.questionStemMap[qId];
  }

  syncQuestionsBankWithCustomizations();
  populateTopicDropdowns();
  saveProgress();
  updateTopStats();
  if (document.getElementById('qmEditingId').value === qId) {
    loadQuestionIntoEditor(qId);
  }
  if (currentTab === 'manage') renderManageQuestionsList();
  if (currentTab === 'study') applyStudyFilters();
  showToast('⏪ Đã Revert câu hỏi về phiên bản ngay trước chỉnh sửa!');
}

function revertCurrentEditorQuestionToPrevious() {
  const qId = (document.getElementById('qmEditingId').value || '').trim();
  if (!qId) return;
  revertQuestionToPreviousVersion(qId);
}

function openCurrentEditorQuestionHistoryModal() {
  const qId = (document.getElementById('qmEditingId').value || '').trim();
  if (!qId) return;
  openQuestionEditHistoryModal(qId);
}

function revertQuestionToSpecificRevision(qId, revId, targetMode) {
  pruneExpiredEditHistory(false);
  const hist = (userProgress.questionEditHistory && Array.isArray(userProgress.questionEditHistory[qId]))
    ? userProgress.questionEditHistory[qId]
    : [];
  const rev = hist.find(r => r.revId === revId);
  if (!rev) {
    showToast('Không tìm thấy phiên bản chỉnh sửa này (có thể đã quá hạn 7 ngày)!');
    return;
  }
  const snap = targetMode === 'after' ? rev.afterSnapshot : rev.beforeSnapshot;
  if (!snap) {
    showToast('Không có dữ liệu bản chụp trước lần tạo mới này!');
    return;
  }
  applyQuestionSnapshotToBank(qId, snap, 'Revert về phiên bản lúc ' + rev.dateStr);
  closeCustomDataModal();
  showToast('⏪ Đã khôi phục câu hỏi về phiên bản lúc ' + rev.dateStr + '!');
}

function openQuestionEditHistoryModal(qId) {
  pruneExpiredEditHistory(false);
  const q = QUESTIONS_BANK.find(x => x.id === qId);
  const hist = (userProgress.questionEditHistory && Array.isArray(userProgress.questionEditHistory[qId]))
    ? userProgress.questionEditHistory[qId]
    : [];
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  titleEl.textContent = '🕒 Lịch sử Chỉnh sửa Câu hỏi #' + (q ? q.num : qId) + ' (Lưu tối đa 7 ngày)';
  if (hist.length === 0) {
    bodyEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Câu hỏi này chưa có lịch sử chỉnh sửa nào trong vòng 7 ngày qua.</div>';
  } else {
    bodyEl.innerHTML = '<div class="space-y-3">' +
      '<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-2 flex-wrap">' +
        '<span>💡 Hệ thống tự động lưu mọi bản chỉnh sửa trong <strong>7 ngày</strong>. Bạn có thể hoàn tác về bản trước bất kỳ lúc nào.</span>' +
        '<button type="button" onclick="revertQuestionToPreviousVersion(\'' + qId + '\'); closeCustomDataModal();" class="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shrink-0">⏪ Revert ngay về bản trước</button>' +
      '</div>' +
      hist.map((h, idx) => {
        const ttl = formatRemainingTtl7Days(h.timestampMs);
        const bef = h.beforeSnapshot;
        const aft = h.afterSnapshot;
        return '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">' +
          '<div class="flex items-center justify-between gap-2 flex-wrap">' +
            '<div>' +
              '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[11px] font-bold">Lần sửa #' + (hist.length - idx) + '</span> ' +
              '<strong class="text-xs text-slate-900">' + escapeHtml(h.summary) + '</strong>' +
            '</div>' +
            '<span class="text-[11px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">⏳ ' + escapeHtml(ttl) + ' • ' + escapeHtml(h.dateStr) + '</span>' +
          '</div>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">' +
            '<div class="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 space-y-1">' +
              '<div class="font-bold text-rose-900 text-[11px]">BẢN TRƯỚC KHI SỬA:</div>' +
              (bef ? ('<div class="text-slate-800 line-clamp-3">' + escapeHtml(bef.q) + '</div><div class="text-[11px] text-emerald-800 font-semibold">Đáp án: ' + escapeHtml(bef.ans) + '</div>') : '<div class="italic text-slate-400">Chưa tồn tại (Tạo mới)</div>') +
            '</div>' +
            '<div class="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">' +
              '<div class="font-bold text-emerald-900 text-[11px]">BẢN SAU KHI SỬA:</div>' +
              (aft ? ('<div class="text-slate-800 line-clamp-3">' + escapeHtml(aft.q) + '</div><div class="text-[11px] text-emerald-800 font-semibold">Đáp án: ' + escapeHtml(aft.ans) + '</div>') : '') +
            '</div>' +
          '</div>' +
          '<div class="flex items-center justify-end gap-2 pt-1">' +
            (bef ? '<button type="button" onclick="revertQuestionToSpecificRevision(\'' + qId + '\', \'' + h.revId + '\', \'before\')" class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">⏪ Revert về Bản trước này</button>' : '') +
            (aft ? '<button type="button" onclick="revertQuestionToSpecificRevision(\'' + qId + '\', \'' + h.revId + '\', \'after\')" class="px-2.5 py-1 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 text-teal-800 text-xs font-semibold">✅ Áp dụng Bản sau này</button>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }
  footerEl.innerHTML = '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function renderGlobalEditHistoryPanel() {
  const container = document.getElementById('qmGlobalEditHistoryContainer');
  if (!container) return;
  pruneExpiredEditHistory(false);
  const allEntries = [];
  if (userProgress.questionEditHistory) {
    Object.keys(userProgress.questionEditHistory).forEach(qId => {
      const qObj = QUESTIONS_BANK.find(x => x.id === qId);
      (userProgress.questionEditHistory[qId] || []).forEach(rev => {
        allEntries.push(Object.assign({}, rev, {
          qNum: qObj ? qObj.num : (rev.qNum || '?'),
          qCurrentTitle: qObj ? qObj.q : (rev.afterSnapshot ? rev.afterSnapshot.q : '')
        }));
      });
    });
  }
  allEntries.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

  if (allEntries.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">Chưa có lịch sử chỉnh sửa câu hỏi nào trong 7 ngày qua. Khi bạn sửa nội dung, đáp án hoặc chèn media vào bất kỳ câu hỏi nào, phiên bản cũ sẽ được lưu tại đây tối đa 7 ngày để bạn Revert back bất cứ lúc nào.</div>';
    return;
  }

  container.innerHTML = allEntries.map(item => {
    const ttl = formatRemainingTtl7Days(item.timestampMs);
    return '<div class="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
      '<div class="space-y-1 min-w-0 flex-1">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="px-2 py-0.5 rounded bg-teal-900 text-white text-[11px] font-bold">Câu #' + item.qNum + '</span>' +
          '<span class="text-xs font-extrabold text-slate-900">' + escapeHtml(item.summary) + '</span>' +
          '<span class="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">🕒 ' + escapeHtml(item.dateStr) + ' (' + escapeHtml(ttl) + ')</span>' +
        '</div>' +
        '<div class="text-xs text-slate-700 truncate">' + escapeHtml(item.qCurrentTitle) + '</div>' +
      '</div>' +
      '<div class="flex items-center gap-1.5 shrink-0">' +
        '<button type="button" onclick="openQuestionEditHistoryModal(\'' + item.qId + '\')" class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold">👁️ So sánh</button>' +
        (item.beforeSnapshot ? '<button type="button" onclick="revertQuestionToSpecificRevision(\'' + item.qId + '\', \'' + item.revId + '\', \'before\')" class="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-2xs">⏪ Revert về bản trước</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function revertEditedQuestion(qId) {
  const orig = ORIGINAL_BANK_SNAPSHOT.find(o => o.id === qId);
  const cur = QUESTIONS_BANK.find(x => x.id === qId);
  if (orig && cur) {
    recordQuestionEditHistory(qId, cur.num, createCleanQuestionSnapshot(cur), createCleanQuestionSnapshot(orig), 'Khôi phục về bản gốc đề chuẩn');
  }
  delete userProgress.editedQuestions[qId];
  syncQuestionsBankWithCustomizations();
  populateTopicDropdowns();
  saveProgress();
  renderManageQuestionsList();
  showToast('Đã khôi phục câu hỏi về nội dung gốc!');
}

function exportQuestionsBankJson() {
  downloadJsonObject(QUESTIONS_BANK, 'ngan_hang_cau_hoi_truyen_nhiem_' + QUESTIONS_BANK.length + '_cau.json');
}

function openBulkQuestionImportModal() {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;

  const sampleJson = JSON.stringify([
    {
      "part": "Phần VI",
      "topic": "Sốt xuất huyết Dengue",
      "q": "Câu hỏi mẫu: Dấu hiệu nào sau đây thuộc nhóm dấu hiệu cảnh báo trong SXH Dengue?",
      "options": ["A. Đau bụng vùng gan hoặc ấn đau vùng gan", "B. Sốt cao 39 độ ngày thứ 2", "C. Nhức hai hốc mắt", "D. Da xung huyết"],
      "correct_idx": 0,
      "ans": "A. Đau bụng vùng gan hoặc ấn đau vùng gan",
      "hint": "Gợi ý: Tra cứu các dấu hiệu cảnh báo theo Quyết định 2760/QĐ-BYT.",
      "exp": "Đau bụng vùng gan hoặc ấn đau vùng gan, nôn nhiều, tiểu ít, xuất huyết niêm mạc, Hct tăng cao kèm tiểu cầu giảm nhanh là các dấu hiệu cảnh báo.",
      "ref_label": "Quyết định 2760/QĐ-BYT năm 2023 của Bộ Y tế",
      "ref_url": "https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-2760-QD-BYT-2023-Huong-dan-chan-doan-dieu-tri-So-xuat-huyet-Dengue-572227.aspx"
    }
  ], null, 2);

  titleEl.textContent = '📥 Nhập hàng loạt câu hỏi (Định dạng JSON)';
  bodyEl.innerHTML = '<p class="text-xs text-slate-600">Dán danh sách câu hỏi theo cấu trúc mảng JSON bên dưới để thêm hàng loạt vào ngân hàng câu hỏi:</p><textarea id="bulkQuestionsTextarea" rows="10" class="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"></textarea>';
  setTimeout(() => {
    const ta = document.getElementById('bulkQuestionsTextarea');
    if (ta) ta.value = sampleJson;
  }, 20);

  footerEl.innerHTML = '<button type="button" onclick="confirmBulkQuestionsImport()" class="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold">📥 Nhập vào Ngân hàng đề</button><button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function confirmBulkQuestionsImport() {
  const ta = document.getElementById('bulkQuestionsTextarea');
  if (!ta || !ta.value.trim()) return;
  try {
    const arr = JSON.parse(ta.value.trim());
    if (!Array.isArray(arr)) {
      showToast('Dữ liệu phải là một mảng JSON [...]!');
      return;
    }
    importQuestionsArray(arr);
    closeCustomDataModal();
  } catch (e) {
    showToast('Lỗi cú pháp JSON! Vui lòng kiểm tra lại.');
  }
}

function importQuestionsArray(arr) {
  let added = 0;
  arr.forEach((item, idx) => {
    if (!item || !item.q || !Array.isArray(item.options) || item.options.length < 2) return;
    const cIdx = typeof item.correct_idx === 'number' ? item.correct_idx : 0;
    userProgress.customQuestions.push({
      id: 'q_custom_' + Date.now() + '_' + idx,
      part: item.part || 'Phần VI',
      part_title: 'PHẦN VI: CÂU HỎI TỰ BIÊN SOẠN & BỔ SUNG',
      topic: item.topic || 'Truyền nhiễm tổng hợp',
      q: item.q,
      options: item.options,
      correct_idx: cIdx,
      ans: item.ans || item.options[cIdx] || '',
      hint: item.hint || 'Gợi ý: Đối chiếu hướng dẫn chẩn đoán và điều trị của Bộ Y tế.',
      exp: item.exp || ('Đáp án chuẩn: ' + (item.ans || item.options[cIdx])),
      ref_label: item.ref_label || 'Quyết định 5642/QĐ-BYT của Bộ Y tế',
      ref_url: item.ref_url || 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-5642-QD-BYT-2015-Huong-dan-chan-doan-va-dieu-tri-mot-so-benh-truyen-nhiem-379633.aspx',
      is_trap: !!item.is_trap,
      trap_note: item.trap_note || ''
    });
    added++;
  });
  syncQuestionsBankWithCustomizations();
  populateTopicDropdowns();
  saveProgress();
  updateTopStats();
  renderManageQuestionsList();
  showToast('Đã thêm thành công ' + added + ' câu hỏi mới!');
}

