function matchesQuestionSearchWithHash(q, rawQuery, extraText) {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return true;

  // Check if query starts with '#' or contains '#token' for question identifier lookup
  if (query.startsWith('#')) {
    // Support comma/space separated list of # identifiers or #range + optional keywords
    // Examples: "#15", "#q_15", "#10-20", "#1, #5, #12", "#24.1", "#23a"
    const cleaned = query.replace(/^#+\s*/, '').trim();
    if (!cleaned) return true;

    // Check comma-separated list like "#1, #5, #12" or "#1,#5"
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',').map(s => s.replace(/^#+\s*/, '').trim()).filter(Boolean);
      return parts.some(p => matchesSingleHashToken(q, p));
    }

    // Split first token and optional remaining keyword
    const firstSpace = cleaned.indexOf(' ');
    const hashToken = (firstSpace === -1 ? cleaned : cleaned.slice(0, firstSpace)).trim();
    const restKw = (firstSpace === -1 ? '' : cleaned.slice(firstSpace + 1)).trim();

    if (!matchesSingleHashToken(q, hashToken)) return false;
    if (!restKw) return true;
    const hay = ('#' + q.num + ' ' + q.id + ' ' + q.q + ' ' + (q.options || []).join(' ') + ' ' + q.ans + ' ' + q.exp + ' ' + q.topic + ' ' + (extraText || '')).toLowerCase();
    return hay.includes(restKw);
  }

  const hay = ('#' + q.num + ' ' + q.id + ' ' + q.q + ' ' + (q.options || []).join(' ') + ' ' + q.ans + ' ' + q.exp + ' ' + q.topic + ' ' + (extraText || '')).toLowerCase();
  return hay.includes(query);
}

function matchesSingleHashToken(q, token) {
  const tk = String(token || '').replace(/^#+/, '').trim().toLowerCase();
  if (!tk) return true;
  // 1. Range #start-end (e.g. #10-20)
  const rangeMatch = tk.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[2], 10);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return q.num >= lo && q.num <= hi;
  }
  // 2. Exact question ID (e.g., #q_15, #q_custom_...)
  if (String(q.id || '').toLowerCase() === tk || String(q.id || '').toLowerCase() === 'q_' + tk) {
    if (/^\d+$/.test(tk)) {
      return q.num === parseInt(tk, 10) || String(q.id || '').toLowerCase() === 'q_' + tk;
    }
    return true;
  }
  // 3. Pure integer number (e.g. #15 -> matches q.num === 15)
  if (/^\d+$/.test(tk)) {
    return q.num === parseInt(tk, 10);
  }
  // 4. Sub-question number in original exam text (e.g. #24.1, #31.2, #23a, #1.1)
  const qLower = String(q.q || '').toLowerCase();
  if (qLower.includes('câu ' + tk) || qLower.includes('case ' + tk) || String(q.num) === tk) {
    return true;
  }
  return false;
}

function getFilteredStudyQuestions() {
  const partVal = document.getElementById('studyFilterPart').value;
  const topicVal = document.getElementById('studyFilterTopic').value;
  const statusVal = document.getElementById('studyFilterStatus').value;
  const searchVal = (document.getElementById('studySearchInput').value || '').trim().toLowerCase();
  return QUESTIONS_BANK.filter(q => {
    if (partVal !== 'all' && q.part !== partVal) return false;
    if (topicVal !== 'all' && q.topic !== topicVal) return false;
    const hasAns = userProgress.answers.hasOwnProperty(q.id);
    const isCorrect = hasAns && userProgress.answers[q.id] === q.correct_idx;
    const isBookmarked = !!userProgress.bookmarks[q.id];
    if (statusVal === 'unanswered' && hasAns) return false;
    if (statusVal === 'correct' && !isCorrect) return false;
    if (statusVal === 'wrong' && (!hasAns || isCorrect)) return false;
    const qComments = (userProgress.inlineComments && userProgress.inlineComments[q.id]) ? userProgress.inlineComments[q.id] : [];
    const qHighlights = (userProgress.inlineHighlights && userProgress.inlineHighlights[q.id]) ? userProgress.inlineHighlights[q.id] : [];
    if (statusVal === 'bookmarked' && !isBookmarked) return false;
    if (statusVal === 'stem' && !(q.stem_id && q.stem_total > 1)) return false;
    if (statusVal === 'trap' && !q.is_trap) return false;
    if (statusVal === 'commented' && qComments.length === 0 && qHighlights.length === 0) return false;
    if (statusVal === 'media' && (!Array.isArray(q.media) || q.media.length === 0)) return false;
    if (statusVal === 'custom' && !q.is_custom && !q.is_edited) return false;
    if (searchVal) {
      const cmtText = qComments.map(c => c.quote + ' ' + c.note).join(' ');
      if (!matchesQuestionSearchWithHash(q, searchVal, cmtText)) return false;
    }
    return true;
  });
}


let studySearchTimer = null;
function debouncedApplyStudyFilters() {
  const val = (document.getElementById('studySearchInput').value || '').trim();
  if (studySearchTimer) clearTimeout(studySearchTimer);
  if (!val || val.startsWith('#')) {
    applyStudyFilters();
    return;
  }
  studySearchTimer = setTimeout(applyStudyFilters, 140);
}

let qmSearchTimer = null;
function debouncedRenderManageQuestionsList() {
  const val = (document.getElementById('qmSearchInput').value || '').trim();
  if (qmSearchTimer) clearTimeout(qmSearchTimer);
  if (!val || val.startsWith('#')) {
    renderManageQuestionsList();
    return;
  }
  qmSearchTimer = setTimeout(renderManageQuestionsList, 140);
}

function applyStudyFilters() {
  const list = getFilteredStudyQuestions();
  document.getElementById('studyFilteredCount').textContent = String(list.length);
  const container = document.getElementById('studyQuestionsContainer');
  if (list.length === 0) {
    if (QUESTIONS_BANK.length === 0) {
      container.innerHTML = '<div class="bg-white rounded-2xl border-2 border-dashed border-teal-300 p-8 text-center space-y-4 max-w-3xl mx-auto my-4 shadow-xs">' +
        '<div class="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-3xl mx-auto">🎓</div>' +
        '<div class="space-y-1.5">' +
          '<span class="px-3 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-extrabold">KHUNG HỆ THỐNG ĐA MÔN HỌC ĐÃ SẴN SÀNG</span>' +
          '<h3 class="text-lg sm:text-xl font-extrabold text-slate-900">Chưa có câu hỏi nào trong Ngân hàng đề của môn học này</h3>' +
          '<p class="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">Đây là phiên bản <strong>Khung Hệ Thống Trống (Blank Template)</strong> giữ nguyên 100% tính năng cao cấp. Bạn có thể nạp câu hỏi cho môn học mới theo 3 cách cực nhanh bên dưới:</p>' +
        '</div>' +
        '<div class="flex flex-wrap items-center justify-center gap-2.5 pt-2">' +
          '<button type="button" onclick="switchTab(\'guide\')" class="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold shadow-xs transition">📖 Xem Hướng dẫn &amp; Copy Prompt Nhờ AI Tạo Đề</button>' +
          '<button type="button" onclick="openBulkQuestionImportModal()" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs transition">📥 Nhập hàng loạt câu hỏi (.JSON)</button>' +
          '<button type="button" onclick="openQuickAddQuestionFromStudy()" class="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold transition">➕ Tự thêm câu hỏi đầu tiên</button>' +
          '<button type="button" onclick="openSubjectConfigModal()" class="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold transition">⚙️ Đổi Tên Môn Học</button>' +
        '</div>' +
      '</div>';
    } else {
      container.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2"><div class="text-3xl">🔍</div><h3 class="text-base font-bold text-slate-800">Không tìm thấy câu hỏi phù hợp với bộ lọc</h3><p class="text-xs text-slate-500">Hãy thử đổi bộ lọc trạng thái hoặc xóa từ khóa tìm kiếm.</p></div>';
    }
    return;
  }
  renderStudyListProgressive(list, container);
}

let studyFilteredListCache = [];
let studyRenderedCount = 0;
const STUDY_BATCH_SIZE = 35;
let studyObserver = null;

function renderStudyListProgressive(list, container) {
  studyFilteredListCache = list;
  studyRenderedCount = 0;
  if (studyObserver) {
    studyObserver.disconnect();
    studyObserver = null;
  }
  container.innerHTML = '';
  appendNextStudyBatch();
}

function appendNextStudyBatch(countOverride) {
  const container = document.getElementById('studyQuestionsContainer');
  if (!container) return;
  const oldSentinel = document.getElementById('studyLoadMoreSentinel');
  if (oldSentinel) oldSentinel.remove();

  const total = studyFilteredListCache.length;
  if (studyRenderedCount >= total) return;

  const batchSize = countOverride || STUDY_BATCH_SIZE;
  const nextEnd = Math.min(total, studyRenderedCount + batchSize);
  const htmlChunk = studyFilteredListCache.slice(studyRenderedCount, nextEnd).map(q => renderStudyQuestionCard(q)).join('');
  container.insertAdjacentHTML('beforeend', htmlChunk);
  studyRenderedCount = nextEnd;

  if (studyRenderedCount < total) {
    const remain = total - studyRenderedCount;
    const sentinelHtml =
      '<div id="studyLoadMoreSentinel" class="bg-white rounded-xl border border-slate-200 p-4 text-center space-y-2 shadow-xs">' +
        '<div class="text-xs text-slate-600 font-medium">Đang hiển thị <strong>' + studyRenderedCount + ' / ' + total + '</strong> câu hỏi (Tối ưu tốc độ cuộn mượt)</div>' +
        '<div class="flex flex-wrap items-center justify-center gap-2">' +
          '<button type="button" onclick="appendNextStudyBatch(35)" class="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition">⬇️ Tải thêm ' + Math.min(35, remain) + ' câu</button>' +
          '<button type="button" onclick="appendNextStudyBatch(' + remain + ')" class="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition">Hiển thị tất cả (' + remain + ' câu còn lại)</button>' +
        '</div>' +
      '</div>';
    container.insertAdjacentHTML('beforeend', sentinelHtml);
    if ('IntersectionObserver' in window) {
      const sentinelEl = document.getElementById('studyLoadMoreSentinel');
      if (sentinelEl) {
        studyObserver = new IntersectionObserver((entries) => {
          if (entries[0] && entries[0].isIntersecting) {
            if (studyObserver) { studyObserver.disconnect(); studyObserver = null; }
            appendNextStudyBatch(STUDY_BATCH_SIZE);
          }
        }, { rootMargin: '500px' });
        studyObserver.observe(sentinelEl);
      }
    }
  }
}

function ensureStudyQuestionRendered(qId) {
  if (document.getElementById('card-' + qId)) return true;
  const idx = studyFilteredListCache.findIndex(q => q.id === qId);
  if (idx === -1) return false;
  if (idx >= studyRenderedCount) {
    appendNextStudyBatch((idx - studyRenderedCount) + 10);
  }
  return !!document.getElementById('card-' + qId);
}

function renderTextWithDocHighlights(rawText, qId) {
  const str = String(rawText || '');
  if (!str) return '';
  const comments = (userProgress.inlineComments && Array.isArray(userProgress.inlineComments[qId]))
    ? userProgress.inlineComments[qId]
    : [];
  const highlights = (userProgress.inlineHighlights && Array.isArray(userProgress.inlineHighlights[qId]))
    ? userProgress.inlineHighlights[qId]
    : [];
  if (comments.length === 0 && highlights.length === 0) return escapeHtml(str);

  const n = str.length;
  const charHl = new Array(n).fill(null);
  const charCmt = new Array(n).fill(null);

  // Apply standalone highlights first (longer quotes first so smaller specific ones can override if needed)
  highlights.forEach(h => {
    const qt = String(h.quote || '').trim();
    if (!qt || qt.length < 2) return;
    let startIdx = 0;
    while (startIdx < n) {
      const pos = str.indexOf(qt, startIdx);
      if (pos === -1) break;
      for (let i = pos; i < pos + qt.length; i++) {
        charHl[i] = h;
      }
      startIdx = pos + qt.length;
    }
  });

  // Apply comments on top
  comments.forEach(c => {
    const qt = String(c.quote || '').trim();
    if (!qt || qt.length < 2) return;
    let startIdx = 0;
    while (startIdx < n) {
      const pos = str.indexOf(qt, startIdx);
      if (pos === -1) break;
      for (let i = pos; i < pos + qt.length; i++) {
        charCmt[i] = c;
      }
      startIdx = pos + qt.length;
    }
  });

  // Segment contiguous runs of identical (charHl[i], charCmt[i])
  let htmlOut = '';
  let idx = 0;
  while (idx < n) {
    const curHl = charHl[idx];
    const curCmt = charCmt[idx];
    let endIdx = idx + 1;
    while (endIdx < n && charHl[endIdx] === curHl && charCmt[endIdx] === curCmt) {
      endIdx++;
    }
    const segText = escapeHtml(str.substring(idx, endIdx));
    const isLastChunkOfComment = curCmt && (endIdx === n || charCmt[endIdx] !== curCmt);

    if (curHl && curCmt) {
      // OVERLAPPING HIGHLIGHT + COMMENT: visually distinct dual-layer span!
      const bgCls = curHl.color || curCmt.color || 'hl-yellow';
      const badgeHtml = isLastChunkOfComment
        ? '<span class="doc-overlap-badge" title="Phần có Comment nằm trong đoạn Bôi màu">💬+🖍️</span>'
        : '';
      htmlOut += '<mark class="doc-comment-mark doc-overlap-mark ' + bgCls + '" data-q-id="' + qId + '" data-comment-id="' + curCmt.id + '" data-hl-id="' + curHl.id + '" onclick="event.stopPropagation(); openDocCommentViewer(\'' + qId + '\', \'' + curCmt.id + '\', this, null, \'' + curHl.id + '\')" title="Phần có cả Bôi màu và Comment (Nhấn để xem Comment)">' + segText + badgeHtml + '</mark>';
    } else if (curCmt) {
      // COMMENT ONLY
      const colorCls = curCmt.color || 'hl-yellow';
      const badgeHtml = isLastChunkOfComment ? '<span class="doc-comment-badge-sup">💬</span>' : '';
      htmlOut += '<mark class="doc-comment-mark ' + colorCls + '" data-q-id="' + qId + '" data-comment-id="' + curCmt.id + '" onclick="event.stopPropagation(); openDocCommentViewer(\'' + qId + '\', \'' + curCmt.id + '\', this)" title="Nhấn vào phần chữ bôi đậm để xem Comment">' + segText + badgeHtml + '</mark>';
    } else if (curHl) {
      // STANDALONE HIGHLIGHT ONLY (NO COMMENT)
      const colorCls = curHl.color || 'hl-yellow';
      htmlOut += '<mark class="doc-hl-only ' + colorCls + '" data-q-id="' + qId + '" data-hl-id="' + curHl.id + '" onclick="event.stopPropagation(); openDocHighlightViewer(\'' + qId + '\', \'' + curHl.id + '\', this)" title="Đoạn chỉ bôi màu (Nhấn để đổi màu, thêm Comment hoặc xóa màu)">' + segText + '</mark>';
    } else {
      htmlOut += segText;
    }
    idx = endIdx;
  }
  return htmlOut;
}

function renderQuestionStemBanner(q, mode) {
  if (!q || !q.stem_id || !q.stem_total || q.stem_total < 1) return '';
  const cfg = userProgress.stemPenaltyConfig || { enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 };
  const penaltyBadge = cfg.enabled
    ? '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold" title="Đúng vẫn cộng +1 điểm câu bình thường; Sai bị trừ hệ số ' + cfg.wrongDeductionFactor + ' điểm câu">⚠️ Sai trừ ' + (cfg.wrongDeductionFactor * 100) + '% điểm câu' + (cfg.clusterExtraPenalty > 0 ? ' (Phạt thêm ' + (cfg.clusterExtraPenalty * 100) + '% nếu sai ≥2 câu)' : '') + '</span>'
    : '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">Đang tắt trừ điểm thân chung</span>';

  const siblingPills = (q.stem_siblings || []).map((sibId, sIdx) => {
    const sibQ = QUESTIONS_BANK.find(x => x.id === sibId);
    const isCurrent = sibId === q.id;
    const sibAnswered = userProgress.answers.hasOwnProperty(sibId);
    const sibCorr = sibAnswered && sibQ && userProgress.answers[sibId] === sibQ.correct_idx;
    let dot = '';
    if (sibAnswered && mode === 'study') {
      dot = sibCorr ? ' ✓' : ' ✗';
    }
    const clickAction = mode === 'study'
      ? 'jumpToStudyQuestionCard(\'' + sibId + '\')'
      : (mode === 'exam' ? 'jumpToExamQuestionById(\'' + sibId + '\')' : '');
    return '<button type="button" ' + (clickAction ? 'onclick="' + clickAction + '"' : '') + ' class="px-2 py-0.5 rounded text-[11px] font-bold transition ' + (isCurrent ? 'bg-cyan-800 text-white shadow-xs' : 'bg-white text-cyan-900 border border-cyan-300 hover:bg-cyan-100') + '">Câu ' + (sIdx + 1) + '/' + q.stem_total + ' (#' + (sibQ ? sibQ.num : '') + ')' + dot + '</button>';
  }).join('');

  return '<div class="rounded-xl bg-gradient-to-r from-cyan-50 via-teal-50/70 to-sky-50 border-2 border-cyan-300/80 p-3.5 space-y-2">' +
    '<div class="flex items-center justify-between gap-2 flex-wrap">' +
      '<div class="flex items-center gap-1.5 flex-wrap">' +
        '<span class="px-2.5 py-0.5 rounded-full bg-cyan-800 text-white text-xs font-extrabold flex items-center gap-1"><span>🔗</span><span>CÂU HỎI THÂN CHUNG (Câu ' + q.stem_index + '/' + q.stem_total + ')</span></span>' +
        '<span class="text-xs font-extrabold text-cyan-950">' + escapeHtml(q.stem_title || 'Chùm câu hỏi cùng Case lâm sàng') + '</span>' +
      '</div>' +
      penaltyBadge +
    '</div>' +
    (q.stem_vignette ? '<div class="text-xs text-slate-800 bg-white/90 rounded-lg border border-cyan-200 px-3 py-2 leading-relaxed"><strong>📋 Tình huống / Bệnh án thân chung:</strong> ' + renderTextWithDocHighlights(q.stem_vignette, q.id) + '</div>' : '') +
    (q.stem_total > 1 ? '<div class="flex items-center gap-1.5 flex-wrap pt-0.5"><span class="text-[11px] font-semibold text-cyan-900">Các câu trong cùng Case:</span>' + siblingPills + '</div>' : '') +
  '</div>';
}

function renderQuestionMediaGallery(q) {
  if (!q || !Array.isArray(q.media) || q.media.length === 0) return '';
  const itemsHtml = q.media.map(m => {
    const captionHtml = m.caption ? '<div class="text-[11px] text-slate-600 font-medium px-2 py-1 bg-slate-100/80 border-t border-slate-200">' + escapeHtml(m.caption) + '</div>' : '';
    const platBadge = m.platform && m.platform !== 'local' && m.platform !== 'direct'
      ? '<span class="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">' + escapeHtml(m.platform) + '</span>'
      : '';
    if (m.type === 'audio') {
      return '<div class="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">' +
        '<div class="flex items-center justify-between text-xs font-bold text-indigo-950"><span>🎵 Âm thanh lâm sàng đính kèm</span>' + platBadge + '</div>' +
        '<audio controls preload="metadata" class="w-full h-9" src="' + escapeHtml(m.embedUrl || m.url) + '"></audio>' +
        captionHtml +
      '</div>';
    }
    if (m.type === 'video' || m.isIframe) {
      if (m.isIframe || (m.embedUrl && (m.embedUrl.includes('youtube.com/embed/') || m.embedUrl.includes('drive.google.com/file/') || m.embedUrl.includes('player.vimeo.com') || m.embedUrl.includes('imgur.com/')))) {
        return '<div class="rounded-xl border border-slate-200 overflow-hidden bg-slate-900">' +
          '<div class="aspect-video w-full"><iframe src="' + escapeHtml(m.embedUrl || m.url) + '" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>' +
          '<div class="bg-white flex items-center justify-between px-3 py-1.5 text-xs">' +
            '<span class="font-medium text-slate-700">' + escapeHtml(m.caption || 'Video bài giảng / lâm sàng') + '</span>' +
            '<a href="' + escapeHtml(m.url) + '" target="_blank" rel="noopener noreferrer" class="text-indigo-700 hover:underline font-semibold">Mở link gốc ↗</a>' +
          '</div>' +
        '</div>';
      }
      return '<div class="rounded-xl border border-slate-200 overflow-hidden bg-slate-950">' +
        '<video controls preload="metadata" class="w-full max-h-80 mx-auto" src="' + escapeHtml(m.embedUrl || m.url) + '"></video>' +
        '<div class="bg-white">' + captionHtml + '</div>' +
      '</div>';
    }
    // Default: image (standard or hosted on Imgur / Postimage / Google Photos / Drive)
    return '<div class="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs flex flex-col justify-between">' +
      '<div class="relative bg-slate-100 flex items-center justify-center p-2 min-h-[160px]">' +
        '<img src="' + escapeHtml(m.embedUrl || m.url) + '" alt="' + escapeHtml(m.caption || 'Hình ảnh câu hỏi') + '" class="max-h-72 w-auto object-contain rounded cursor-zoom-in mx-auto" onclick="event.stopPropagation(); openMediaLightboxModal(\'' + escapeHtml(m.embedUrl || m.url) + '\', \'' + escapeHtml(m.caption || '') + '\')" onerror="this.onerror=null; this.outerHTML=\'<div class=\\\'p-4 text-center text-xs text-slate-600\\\'><div class=\\\'font-bold text-indigo-900 mb-1\\\'>🖼️ Hình ảnh từ ' + escapeHtml(m.platform || 'Hosting') + '</div><a href=\\\'' + escapeHtml(m.url) + '\\\' target=\\\'_blank\\\' rel=\\\'noopener noreferrer\\\' class=\\\'underline text-teal-700 font-semibold\\\'>Nhấn để mở xem hình ảnh trực tiếp ↗</a></div>\';" />' +
      '</div>' +
      '<div class="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-600">' +
        '<span class="truncate font-medium">' + escapeHtml(m.caption || 'Hình ảnh minh họa lâm sàng') + '</span>' +
        '<div class="flex items-center gap-1.5 shrink-0">' + platBadge +
          (m.url && !m.url.startsWith('data:') ? '<a href="' + escapeHtml(m.url) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-teal-700 hover:underline font-semibold">Link gốc ↗</a>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="grid grid-cols-1 ' + (q.media.length > 1 ? 'md:grid-cols-2' : '') + ' gap-3 pt-1">' + itemsHtml + '</div>';
}

function openMediaLightboxModal(imgUrl, caption) {
  const modal = document.getElementById('customDataModal');
  const titleEl = document.getElementById('customDataModalTitle');
  const bodyEl = document.getElementById('customDataModalBody');
  const footerEl = document.getElementById('customDataModalFooter');
  if (!modal || !titleEl || !bodyEl || !footerEl) return;
  titleEl.textContent = '🖼️ Xem phóng to hình ảnh lâm sàng';
  bodyEl.innerHTML = '<div class="space-y-3 text-center"><img src="' + escapeHtml(imgUrl) + '" class="max-h-[70vh] w-auto mx-auto rounded-xl border border-slate-200" /><div class="text-xs text-slate-700 font-medium">' + escapeHtml(caption || '') + '</div></div>';
  footerEl.innerHTML = '<button type="button" onclick="closeCustomDataModal()" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>';
  modal.classList.remove('hidden');
}

function renderStudyQuestionCard(q) {
  const hasAnswered = userProgress.answers.hasOwnProperty(q.id);
  const userChoice = hasAnswered ? userProgress.answers[q.id] : null;
  const isCorrect = hasAnswered && userChoice === q.correct_idx;
  const isBookmarked = !!userProgress.bookmarks[q.id];
  const hintOpen = !!studyHintOpen[q.id];
  const expOpen = showAllExplanations || hasAnswered || !!studyExpOpen[q.id];
  const qComments = (userProgress.inlineComments && Array.isArray(userProgress.inlineComments[q.id])) ? userProgress.inlineComments[q.id] : [];
  const qHighlights = (userProgress.inlineHighlights && Array.isArray(userProgress.inlineHighlights[q.id])) ? userProgress.inlineHighlights[q.id] : [];
  const isStem = !!(q.stem_id && q.stem_total > 1);
  const cfg = userProgress.stemPenaltyConfig || { enabled: true, wrongDeductionFactor: 0.5, clusterExtraPenalty: 0.25 };

  let statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">Chưa làm</span>';
  if (hasAnswered) {
    if (isCorrect) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">✓ Chính xác (+1.0đ câu)</span>';
    } else {
      const penText = (isStem && cfg.enabled) ? ' (Trừ -' + cfg.wrongDeductionFactor + 'đ câu thân chung)' : '';
      statusBadge = '<span class="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">✗ Đã chọn sai' + penText + '</span>';
    }
  }
  const trapBadge = q.is_trap
    ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">⚠️ Câu bẫy / Lưu ý đề gốc</span>'
    : '';
  const customBadge = q.is_custom
    ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">➕ Tự thêm</span>'
    : (q.is_edited ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">✏️ Đã chỉnh sửa</span>' : '');
  const highlightCountBadge = qHighlights.length > 0
    ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300" title="Số đoạn chỉ bôi màu">🖍️ ' + qHighlights.length + ' bôi màu</span>'
    : '';
  const commentCountBadge = qComments.length > 0
    ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300" title="Nhấn vào phần chữ được bôi đậm có biểu tượng 💬 để mở Comment">💬 ' + qComments.length + ' comment</span>'
    : '';
  const mediaBadge = (Array.isArray(q.media) && q.media.length > 0)
    ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">🖼️ ' + q.media.length + ' media</span>'
    : '';

  const optionsHtml = q.options.map((optText, idx) => {
    let btnClass = 'border-slate-200 bg-slate-50/70 hover:bg-teal-50/60 hover:border-teal-300 text-slate-800';
    let iconHtml = '<span class="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">' + (idx + 1) + '</span>';
    if (expOpen || hasAnswered) {
      if (idx === q.correct_idx) {
        btnClass = 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-500/40';
        iconHtml = '<span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>';
      } else if (hasAnswered && idx === userChoice && idx !== q.correct_idx) {
        btnClass = 'border-rose-400 bg-rose-50 text-rose-900 line-through decoration-rose-400';
        iconHtml = '<span class="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✗</span>';
      }
    }
    return '<button type="button" onclick="handleStudyOptionClick(event, \'' + q.id + '\', ' + idx + ')" class="w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-start gap-3 text-sm annotatable-region ' + btnClass + '" data-q-id="' + q.id + '">' + iconHtml + '<span class="flex-1 leading-snug">' + renderTextWithDocHighlights(optText, q.id) + '</span></button>';
  }).join('');

  const hintSection = hintOpen
    ? '<div class="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 leading-relaxed annotatable-region" data-q-id="' + q.id + '"><strong>💡 ' + renderTextWithDocHighlights(q.hint, q.id) + '</strong></div>'
    : '';
  const trapBox = (q.is_trap && q.trap_note)
    ? '<div class="rounded-lg bg-amber-100/80 border border-amber-300 px-3 py-2 text-xs text-amber-950 leading-relaxed annotatable-region" data-q-id="' + q.id + '"><strong>⚠️ Đính chính &amp; Lưu ý:</strong> ' + renderTextWithDocHighlights(q.trap_note, q.id) + '</div>'
    : '';
  const expSection = expOpen
    ? '<div class="rounded-xl bg-teal-50/70 border border-teal-200 p-4 space-y-2 text-xs sm:text-sm annotatable-region" data-q-id="' + q.id + '"><div class="font-bold text-emerald-800 text-sm">→ Đáp án chuẩn: ' + renderTextWithDocHighlights(q.ans, q.id) + '</div>' + trapBox + '<div class="text-slate-800 leading-relaxed"><strong>Giải thích chuyên môn:</strong> ' + renderTextWithDocHighlights(q.exp, q.id) + '</div><div class="pt-1 flex items-center justify-between flex-wrap gap-2 text-xs text-teal-800 border-t border-teal-200/60"><span>📖 Căn cứ: <a href="' + escapeHtml(q.ref_url) + '" target="_blank" rel="noopener noreferrer" class="underline font-semibold hover:text-teal-950">' + escapeHtml(q.ref_label) + '</a></span>' + (hasAnswered ? '<button type="button" onclick="clearSingleStudyAnswer(\'' + q.id + '\')" class="text-slate-500 hover:text-rose-700 underline">Làm lại câu này</button>' : '') + '</div></div>'
    : '';

  const stemBannerHtml = renderQuestionStemBanner(q, 'study');
  const mediaGalleryHtml = renderQuestionMediaGallery(q);

  return '<article id="card-' + q.id + '" data-q-id="' + q.id + '" class="bg-white rounded-xl border ' + (isStem ? 'border-cyan-300 ring-1 ring-cyan-200/60' : 'border-slate-200') + ' p-4 sm:p-5 shadow-xs space-y-3 transition">' +
    stemBannerHtml +
    '<div class="flex items-center justify-between gap-2 flex-wrap">' +
      '<div class="flex items-center gap-1.5 flex-wrap">' +
        '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-900 text-white" title="Mã định danh câu hỏi: #' + q.num + ' (' + escapeHtml(q.id) + ')">#' + q.num + '</span>' +
        '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">' + escapeHtml(q.part) + '</span>' +
        '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">' + escapeHtml(q.topic) + '</span>' +
        statusBadge + trapBadge + customBadge + highlightCountBadge + commentCountBadge + mediaBadge +
      '</div>' +
      '<div class="flex items-center gap-1.5">' +
        '<button type="button" onclick="openManualDocCommentComposer(\'' + q.id + '\')" class="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold transition" title="Bôi đen chữ bất kỳ trên câu hỏi hoặc nhấn vào đây để bôi màu / thêm Comment">🖍️/💬 Bôi màu &amp; Ghi chú</button>' +
        '<button type="button" onclick="toggleBookmark(\'' + q.id + '\')" class="px-2.5 py-1 rounded-lg border text-xs font-semibold transition ' + (isBookmarked ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100') + '">' + (isBookmarked ? '⭐ Đã lưu' : '☆ Đánh dấu') + '</button>' +
      '</div>' +
    '</div>' +
    '<h3 class="text-sm sm:text-base font-bold text-slate-900 leading-relaxed annotatable-region" data-q-id="' + q.id + '">' + renderTextWithDocHighlights(q.q, q.id) + '</h3>' +
    mediaGalleryHtml +
    '<div class="space-y-2">' + optionsHtml + '</div>' +
    '<div class="flex flex-wrap items-center gap-2 pt-1">' +
      '<button type="button" onclick="toggleStudyHint(\'' + q.id + '\')" class="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition">' + (hintOpen ? 'Ẩn gợi ý' : '💡 Gợi ý lâm sàng') + '</button>' +
      '<button type="button" onclick="toggleStudyExp(\'' + q.id + '\')" class="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition">' + (expOpen ? 'Ẩn giải thích' : '👁️ Xem đáp án &amp; Giải thích') + '</button>' +
    '</div>' +
    hintSection + expSection +
  '</article>';
}

function handleStudyOptionClick(e, qId, optionIdx) {
  const sel = window.getSelection ? window.getSelection().toString().trim() : '';
  if (sel.length >= 2) return;
  selectStudyAnswer(qId, optionIdx);
}

function selectStudyAnswer(qId, optionIdx) {
  userProgress.answers[qId] = optionIdx;
  studyExpOpen[qId] = true;
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
}

function clearSingleStudyAnswer(qId) {
  delete userProgress.answers[qId];
  studyExpOpen[qId] = false;
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
}

function toggleBookmark(qId) {
  if (userProgress.bookmarks[qId]) delete userProgress.bookmarks[qId];
  else userProgress.bookmarks[qId] = true;
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
}

function toggleStudyHint(qId) {
  studyHintOpen[qId] = !studyHintOpen[qId];
  rerenderSingleStudyCard(qId);
}

function toggleStudyExp(qId) {
  studyExpOpen[qId] = !studyExpOpen[qId];
  rerenderSingleStudyCard(qId);
}

function rerenderSingleStudyCard(qId) {
  const cardEl = document.getElementById('card-' + qId);
  const qObj = QUESTIONS_BANK.find(x => x.id === qId);
  if (cardEl && qObj) cardEl.outerHTML = renderStudyQuestionCard(qObj);
  else applyStudyFilters();
}

function toggleShowAllExplanations() {
  showAllExplanations = !showAllExplanations;
  const btn = document.getElementById('btnToggleAllExp');
  if (btn) btn.textContent = showAllExplanations ? '🙈 Ẩn tất cả giải thích (Chế độ tự luyện)' : '👁️ Hiện tất cả đáp án & giải thích';
  applyStudyFilters();
}

function openResetStudyModal() {
  openAppModal('Đặt lại tiến độ luyện tập', 'Bạn có chắc muốn xóa toàn bộ câu trả lời trong chế độ Ôn tập để làm lại từ đầu không?', function () {
    userProgress.answers = {};
    studyExpOpen = {};
    studyHintOpen = {};
    saveProgress();
    updateTopStats();
    applyStudyFilters();
    showToast('Đã đặt lại tiến độ luyện tập!');
  });
}

function saveCurrentStudySession() {
  const total = QUESTIONS_BANK.length;
  let done = 0, correct = 0;
  for (const q of QUESTIONS_BANK) {
    if (userProgress.answers.hasOwnProperty(q.id)) {
      done++;
      if (userProgress.answers[q.id] === q.correct_idx) correct++;
    }
  }
  if (done === 0) {
    showToast('Bạn hãy trả lời ít nhất 1 câu hỏi trước khi lưu Session!');
    return;
  }
  const answeredPool = QUESTIONS_BANK.filter(q => userProgress.answers.hasOwnProperty(q.id));
  const stemCalc = calculateScoreWithStemPenalty(answeredPool, userProgress.answers);
  const score10 = stemCalc.adjustedScore10;
  const snapshot = {};
  QUESTIONS_BANK.forEach(q => {
    if (userProgress.answers.hasOwnProperty(q.id)) snapshot[q.id] = userProgress.answers[q.id];
  });
  userProgress.sessions.unshift({
    id: 'ses_' + Date.now(),
    date: new Date().toLocaleString('vi-VN'),
    type: 'Ôn tập tự do',
    label: 'Luyện tập ' + done + '/' + total + ' câu' + (stemCalc.penaltyScore10 > 0 ? ' (Đã trừ ' + stemCalc.penaltyScore10.toFixed(2) + 'đ thân chung)' : ''),
    correct: correct,
    total: done,
    score10: score10,
    rawScore10: stemCalc.rawScore10,
    stemPenalty10: stemCalc.penaltyScore10.toFixed(2),
    stemWrongCount: stemCalc.stemWrongCount,
    durationSec: globalSessionSeconds,
    learnerName: (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Sinh viên Y khoa',
    answersSnapshot: snapshot
  });
  saveProgress();
  showToast('Đã lưu Session ôn tập vào bảng Tổng kết!');
  if (currentTab === 'analytics') renderAnalyticsDashboard();
}

