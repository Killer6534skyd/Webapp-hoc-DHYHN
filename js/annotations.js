function handleDocumentTextSelection(e) {
  const triggerEl = document.getElementById('selectionCommentTrigger');
  const composerEl = document.getElementById('docCommentComposerPopover');
  const viewerEl = document.getElementById('docCommentViewerPopover');
  if (!triggerEl) return;

  if (e && e.target) {
    if (triggerEl.contains(e.target) || (composerEl && composerEl.contains(e.target)) || (viewerEl && viewerEl.contains(e.target))) {
      return;
    }
  }

  setTimeout(() => {
    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel || sel.isCollapsed) {
      triggerEl.classList.add('hidden');
      return;
    }
    const selectedText = sel.toString().trim();
    if (selectedText.length < 2 || selectedText.length > 350) {
      triggerEl.classList.add('hidden');
      return;
    }

    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    const region = node && node.closest ? node.closest('[data-q-id]') : null;
    if (!region) {
      triggerEl.classList.add('hidden');
      return;
    }

    const qId = region.getAttribute('data-q-id');
    if (!qId) {
      triggerEl.classList.add('hidden');
      return;
    }

    const existingComments = (userProgress.inlineComments && userProgress.inlineComments[qId]) ? userProgress.inlineComments[qId] : [];
    const matchedExisting = existingComments.find(c => c.quote && (c.quote.includes(selectedText) || selectedText.includes(c.quote)));

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    pendingSelectionInfo = {
      qId: qId,
      quote: selectedText,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left + rect.width / 2
      }
    };

    if (matchedExisting && selectedText.length >= 3) {
      openDocCommentViewer(qId, matchedExisting.id, null, rect);
    }

    const topPos = Math.max(12, rect.top - 46);
    const leftPos = Math.min(window.innerWidth - 150, Math.max(150, rect.left + rect.width / 2));
    triggerEl.style.top = topPos + 'px';
    triggerEl.style.left = leftPos + 'px';
    triggerEl.classList.remove('hidden');
  }, 20);
}

function setDocComposerColor(colorCls) {
  activeComposerState.color = colorCls;
  ['hl-yellow', 'hl-green', 'hl-pink', 'hl-purple'].forEach(c => {
    const btn = document.getElementById('colorBtn-' + c);
    if (btn) {
      btn.className = (c === colorCls)
        ? btn.className.replace('border-transparent', 'border-slate-800')
        : btn.className.replace('border-slate-800', 'border-transparent');
    }
  });
}

function openDocCommentComposerFromSelection(colorCls) {
  if (!pendingSelectionInfo || !pendingSelectionInfo.qId) return;
  const triggerEl = document.getElementById('selectionCommentTrigger');
  if (triggerEl) triggerEl.classList.add('hidden');
  closeDocCommentViewer();

  activeComposerState = {
    qId: pendingSelectionInfo.qId,
    commentId: null,
    quote: pendingSelectionInfo.quote,
    color: colorCls || 'hl-yellow',
    manualMode: false
  };

  const pop = document.getElementById('docCommentComposerPopover');
  document.getElementById('docComposerTitle').textContent = '💬 Thêm Comment cho đoạn bôi đậm';
  document.getElementById('docComposerQuotePreview').textContent = '"' + activeComposerState.quote + '"';
  document.getElementById('docComposerQuotePreview').classList.remove('hidden');
  document.getElementById('docComposerManualQuoteWrap').classList.add('hidden');
  document.getElementById('docComposerNoteInput').value = '';
  setDocComposerColor(activeComposerState.color);

  const topPos = Math.min(window.innerHeight - 280, Math.max(16, pendingSelectionInfo.rect.bottom + 10));
  const leftPos = Math.min(window.innerWidth - 360, Math.max(16, pendingSelectionInfo.rect.left - 160));
  pop.style.top = topPos + 'px';
  pop.style.left = leftPos + 'px';
  pop.classList.remove('hidden');
  setTimeout(() => document.getElementById('docComposerNoteInput').focus(), 30);
}

function openManualDocCommentComposer(qId) {
  closeDocCommentViewer();
  const qObj = QUESTIONS_BANK.find(x => x.id === qId);
  if (!qObj) return;

  const selText = window.getSelection ? window.getSelection().toString().trim() : '';
  const hasSel = selText.length >= 2 && (qObj.q.includes(selText) || qObj.exp.includes(selText) || qObj.options.some(o => o.includes(selText)));

  activeComposerState = {
    qId: qId,
    commentId: null,
    quote: hasSel ? selText : '',
    color: 'hl-yellow',
    manualMode: !hasSel
  };

  const pop = document.getElementById('docCommentComposerPopover');
  document.getElementById('docComposerTitle').textContent = '💬 Thêm Ghi chú / Comment (Câu #' + qObj.num + ')';
  if (hasSel) {
    document.getElementById('docComposerQuotePreview').textContent = '"' + selText + '"';
    document.getElementById('docComposerQuotePreview').classList.remove('hidden');
    document.getElementById('docComposerManualQuoteWrap').classList.add('hidden');
  } else {
    document.getElementById('docComposerQuotePreview').classList.add('hidden');
    document.getElementById('docComposerManualQuoteWrap').classList.remove('hidden');
    const samplePhrase = qObj.q.split(',')[0].replace(/^Câu\s*\d+[^.]*\.\s*/i, '').slice(0, 45).trim();
    document.getElementById('docComposerManualQuoteInput').value = samplePhrase;
  }
  document.getElementById('docComposerNoteInput').value = '';
  setDocComposerColor('hl-yellow');

  pop.style.top = '120px';
  pop.style.left = Math.max(16, Math.floor((window.innerWidth - 360) / 2)) + 'px';
  pop.classList.remove('hidden');
  setTimeout(() => document.getElementById('docComposerNoteInput').focus(), 30);
}

function closeDocCommentComposer() {
  const pop = document.getElementById('docCommentComposerPopover');
  if (pop) pop.classList.add('hidden');
}

function applyStandaloneHighlightFromSelection(colorCls) {
  if (!pendingSelectionInfo || !pendingSelectionInfo.qId) return;
  const qId = pendingSelectionInfo.qId;
  const quoteText = (pendingSelectionInfo.quote || '').trim();
  if (!quoteText || quoteText.length < 2) return;

  if (!userProgress.inlineHighlights) userProgress.inlineHighlights = {};
  if (!Array.isArray(userProgress.inlineHighlights[qId])) userProgress.inlineHighlights[qId] = [];

  const existingIdx = userProgress.inlineHighlights[qId].findIndex(h => h.quote === quoteText);
  if (existingIdx !== -1) {
    userProgress.inlineHighlights[qId][existingIdx].color = colorCls || 'hl-yellow';
  } else {
    userProgress.inlineHighlights[qId].push({
      id: 'hl_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      quote: quoteText,
      color: colorCls || 'hl-yellow',
      createdAt: new Date().toLocaleString('vi-VN')
    });
  }

  const triggerEl = document.getElementById('selectionCommentTrigger');
  if (triggerEl) triggerEl.classList.add('hidden');
  if (window.getSelection) window.getSelection().removeAllRanges();
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
  if (currentTab === 'exam' && examState.submitted) filterExamReview(examState.reviewFilter || 'all');
  showToast('🖍️ Đã bôi màu đoạn văn bản (Tách biệt với Comment)!');
}

function saveStandaloneHighlightFromComposer() {
  const qId = activeComposerState.qId;
  if (!qId) return;
  let quoteText = activeComposerState.quote;
  if (activeComposerState.manualMode) {
    quoteText = (document.getElementById('docComposerManualQuoteInput').value || '').trim();
  }
  if (!quoteText || quoteText.length < 2) {
    showToast('Vui lòng nhập cụm từ cần bôi màu (tối thiểu 2 ký tự)!');
    return;
  }
  pendingSelectionInfo = { qId: qId, quote: quoteText };
  closeDocCommentComposer();
  applyStandaloneHighlightFromSelection(activeComposerState.color || 'hl-yellow');
}

function openDocHighlightViewer(qId, hlId, markEl) {
  const list = (userProgress.inlineHighlights && userProgress.inlineHighlights[qId]) ? userProgress.inlineHighlights[qId] : [];
  const hl = list.find(h => h.id === hlId);
  if (!hl) return;
  closeDocCommentViewer();
  closeDocCommentComposer();
  activeHighlightState = { qId: qId, hlId: hlId };
  const pop = document.getElementById('docHighlightViewerPopover');
  document.getElementById('docHlViewerQuote').textContent = '"' + hl.quote + '"';
  const rect = markEl ? markEl.getBoundingClientRect() : null;
  if (rect) {
    pop.style.top = Math.min(window.innerHeight - 190, Math.max(12, rect.bottom + 8)) + 'px';
    pop.style.left = Math.min(window.innerWidth - 300, Math.max(12, rect.left)) + 'px';
  } else {
    pop.style.top = '140px';
    pop.style.left = Math.max(12, Math.floor((window.innerWidth - 290) / 2)) + 'px';
  }
  pop.classList.remove('hidden');
}

function closeDocHighlightViewer() {
  const pop = document.getElementById('docHighlightViewerPopover');
  if (pop) pop.classList.add('hidden');
  activeHighlightState = { qId: null, hlId: null };
}

function changeActiveHighlightColor(colorCls) {
  const { qId, hlId } = activeHighlightState;
  if (!qId || !hlId) return;
  const list = (userProgress.inlineHighlights && userProgress.inlineHighlights[qId]) ? userProgress.inlineHighlights[qId] : [];
  const idx = list.findIndex(h => h.id === hlId);
  if (idx !== -1) {
    list[idx].color = colorCls;
    saveProgress();
    rerenderSingleStudyCard(qId);
    closeDocHighlightViewer();
    showToast('Đã đổi màu đoạn Highlight!');
  }
}

function deleteActiveHighlight() {
  const { qId, hlId } = activeHighlightState;
  if (!qId || !hlId) return;
  if (userProgress.inlineHighlights && Array.isArray(userProgress.inlineHighlights[qId])) {
    userProgress.inlineHighlights[qId] = userProgress.inlineHighlights[qId].filter(h => h.id !== hlId);
    if (userProgress.inlineHighlights[qId].length === 0) delete userProgress.inlineHighlights[qId];
  }
  closeDocHighlightViewer();
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
  showToast('Đã xóa bôi màu!');
}

function convertHighlightToComment() {
  const { qId, hlId } = activeHighlightState;
  if (!qId || !hlId) return;
  const list = (userProgress.inlineHighlights && userProgress.inlineHighlights[qId]) ? userProgress.inlineHighlights[qId] : [];
  const hl = list.find(h => h.id === hlId);
  if (!hl) return;
  closeDocHighlightViewer();
  pendingSelectionInfo = {
    qId: qId,
    quote: hl.quote,
    rect: { top: 140, bottom: 160, left: Math.floor(window.innerWidth / 2) }
  };
  openDocCommentComposerFromSelection(hl.color || 'hl-yellow');
}

function deleteOverlapHighlightFromCommentViewer() {
  const { qId, overlapHlId } = activeViewerState;
  if (!qId || !overlapHlId) return;
  if (userProgress.inlineHighlights && Array.isArray(userProgress.inlineHighlights[qId])) {
    userProgress.inlineHighlights[qId] = userProgress.inlineHighlights[qId].filter(h => h.id !== overlapHlId);
    if (userProgress.inlineHighlights[qId].length === 0) delete userProgress.inlineHighlights[qId];
  }
  document.getElementById('docViewerOverlapNotice').classList.add('hidden');
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
  showToast('Đã xóa lớp bôi màu (Giữ nguyên Comment)!');
}

function saveDocCommentFromComposer() {
  const qId = activeComposerState.qId;
  if (!qId) return;
  let quoteText = activeComposerState.quote;
  if (activeComposerState.manualMode) {
    quoteText = (document.getElementById('docComposerManualQuoteInput').value || '').trim();
  }
  const noteText = (document.getElementById('docComposerNoteInput').value || '').trim();
  if (!quoteText || quoteText.length < 2) {
    showToast('Vui lòng bôi đen hoặc nhập cụm từ cần gắn ghi chú (tối thiểu 2 ký tự)!');
    return;
  }
  if (!noteText) {
    showToast('Vui lòng nhập nội dung ghi chú / comment (Hoặc nhấn nút "🖍️ Chỉ bôi màu" nếu không muốn viết Comment)!');
    return;
  }

  if (!userProgress.inlineComments) userProgress.inlineComments = {};
  if (!Array.isArray(userProgress.inlineComments[qId])) userProgress.inlineComments[qId] = [];

  const authorName = (userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Sinh viên Y khoa';
  if (activeComposerState.commentId) {
    const idx = userProgress.inlineComments[qId].findIndex(c => c.id === activeComposerState.commentId);
    if (idx !== -1) {
      userProgress.inlineComments[qId][idx].quote = quoteText;
      userProgress.inlineComments[qId][idx].note = noteText;
      userProgress.inlineComments[qId][idx].color = activeComposerState.color;
      userProgress.inlineComments[qId][idx].createdAt = new Date().toLocaleString('vi-VN');
    }
  } else {
    userProgress.inlineComments[qId].push({
      id: 'cmt_' + Date.now(),
      quote: quoteText,
      note: noteText,
      color: activeComposerState.color || 'hl-yellow',
      author: authorName,
      createdAt: new Date().toLocaleString('vi-VN')
    });
  }

  if (window.getSelection) window.getSelection().removeAllRanges();
  closeDocCommentComposer();
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
  if (currentTab === 'exam' && examState.submitted) filterExamReview(examState.reviewFilter || 'all');
  if (currentTab === 'user') renderUserProfileAndAdvisor();
  showToast('Đã lưu Comment! Nhấn vào cụm từ có biểu tượng 💬 để xem toàn bộ nội dung.');
}

function openDocCommentViewer(qId, commentId, markEl, customRect, overlapHlId) {
  const list = (userProgress.inlineComments && userProgress.inlineComments[qId]) ? userProgress.inlineComments[qId] : [];
  const cmt = list.find(c => c.id === commentId);
  if (!cmt) return;

  closeDocCommentComposer();
  closeDocHighlightViewer();
  activeViewerState = { qId: qId, commentId: commentId, overlapHlId: overlapHlId || null };

  document.querySelectorAll('.doc-comment-mark.active-mark').forEach(el => el.classList.remove('active-mark'));
  if (markEl && markEl.classList) markEl.classList.add('active-mark');

  const viewer = document.getElementById('docCommentViewerPopover');
  const author = cmt.author || ((userProgress.profile && userProgress.profile.name) ? userProgress.profile.name : 'Ghi chú cá nhân');
  const initials = author.split(' ').filter(Boolean).slice(-2).map(w => w[0].toUpperCase()).join('') || 'BS';

  document.getElementById('docViewerAuthorAvatar').textContent = initials;
  document.getElementById('docViewerAuthorName').textContent = author;
  document.getElementById('docViewerTimestamp').textContent = cmt.createdAt || '';
  document.getElementById('docViewerQuoteText').textContent = '"' + cmt.quote + '"';
  document.getElementById('docViewerNoteText').textContent = cmt.note;

  const overlapNotice = document.getElementById('docViewerOverlapNotice');
  if (overlapNotice) {
    if (overlapHlId) overlapNotice.classList.remove('hidden');
    else overlapNotice.classList.add('hidden');
  }

  viewer.classList.remove('hidden');
  // Smart viewport positioning so popover never gets cut off by screen edges
  let rect = customRect;
  if (!rect && markEl && markEl.getBoundingClientRect) {
    rect = markEl.getBoundingClientRect();
  }
  const popHeight = Math.min(viewer.offsetHeight || 260, window.innerHeight * 0.82);
  const popWidth = viewer.offsetWidth || 360;
  if (rect) {
    let topPos = rect.bottom + 8;
    if (topPos + popHeight > window.innerHeight - 12) {
      topPos = Math.max(12, rect.top - popHeight - 8);
    }
    const leftPos = Math.min(window.innerWidth - popWidth - 12, Math.max(12, rect.left));
    viewer.style.top = topPos + 'px';
    viewer.style.left = leftPos + 'px';
  } else {
    viewer.style.top = '110px';
    viewer.style.left = Math.max(12, Math.floor((window.innerWidth - popWidth) / 2)) + 'px';
  }
}

function closeDocCommentViewer() {
  const viewer = document.getElementById('docCommentViewerPopover');
  if (viewer) viewer.classList.add('hidden');
  document.querySelectorAll('.doc-comment-mark.active-mark').forEach(el => el.classList.remove('active-mark'));
  activeViewerState = { qId: null, commentId: null };
}

function editActiveDocComment() {
  const { qId, commentId } = activeViewerState;
  if (!qId || !commentId) return;
  const list = (userProgress.inlineComments && userProgress.inlineComments[qId]) ? userProgress.inlineComments[qId] : [];
  const cmt = list.find(c => c.id === commentId);
  if (!cmt) return;

  const viewer = document.getElementById('docCommentViewerPopover');
  const rect = viewer.getBoundingClientRect();
  closeDocCommentViewer();

  activeComposerState = {
    qId: qId,
    commentId: commentId,
    quote: cmt.quote,
    color: cmt.color || 'hl-yellow',
    manualMode: false
  };

  const pop = document.getElementById('docCommentComposerPopover');
  document.getElementById('docComposerTitle').textContent = '✏️ Chỉnh sửa Comment';
  document.getElementById('docComposerQuotePreview').textContent = '"' + cmt.quote + '"';
  document.getElementById('docComposerQuotePreview').classList.remove('hidden');
  document.getElementById('docComposerManualQuoteWrap').classList.add('hidden');
  document.getElementById('docComposerNoteInput').value = cmt.note || '';
  setDocComposerColor(activeComposerState.color);

  pop.style.top = Math.max(16, rect.top) + 'px';
  pop.style.left = Math.max(16, rect.left) + 'px';
  pop.classList.remove('hidden');
}

function deleteActiveDocComment() {
  const { qId, commentId } = activeViewerState;
  if (!qId || !commentId) return;
  if (userProgress.inlineComments && Array.isArray(userProgress.inlineComments[qId])) {
    userProgress.inlineComments[qId] = userProgress.inlineComments[qId].filter(c => c.id !== commentId);
    if (userProgress.inlineComments[qId].length === 0) delete userProgress.inlineComments[qId];
  }
  closeDocCommentViewer();
  saveProgress();
  updateTopStats();
  rerenderSingleStudyCard(qId);
  if (currentTab === 'user') renderUserProfileAndAdvisor();
  showToast('Đã giải quyết / xóa Comment khỏi đoạn văn bản!');
}

document.addEventListener('mouseup', handleDocumentTextSelection);
document.addEventListener('keyup', function (e) {
  if (e.key === 'Escape') {
    closeDocCommentViewer();
    closeDocCommentComposer();
    const trig = document.getElementById('selectionCommentTrigger');
    if (trig) trig.classList.add('hidden');
  }
});
document.addEventListener('mousedown', function (e) {
  const viewer = document.getElementById('docCommentViewerPopover');
  const hlViewer = document.getElementById('docHighlightViewerPopover');
  const composer = document.getElementById('docCommentComposerPopover');
  const trigger = document.getElementById('selectionCommentTrigger');
  if (hlViewer && !hlViewer.classList.contains('hidden')) {
    if (!hlViewer.contains(e.target) && !(e.target.closest && e.target.closest('.doc-hl-only'))) {
      closeDocHighlightViewer();
    }
  }
  if (viewer && !viewer.classList.contains('hidden')) {
    if (!viewer.contains(e.target) && !(e.target.closest && e.target.closest('.doc-comment-mark'))) {
      closeDocCommentViewer();
    }
  }
  if (composer && !composer.classList.contains('hidden')) {
    if (!composer.contains(e.target) && (!trigger || !trigger.contains(e.target)) && !(e.target.closest && e.target.closest('[onclick*="openManualDocCommentComposer"]'))) {
      closeDocCommentComposer();
    }
  }
});

