function applyFlashcardFilters() {
  const partVal = document.getElementById('fcFilterPart').value;
  const topicVal = document.getElementById('fcFilterTopic').value;
  const masteryVal = document.getElementById('fcFilterMastery').value;
  fcList = QUESTIONS_BANK.filter(q => {
    if (partVal !== 'all' && q.part !== partVal) return false;
    if (topicVal !== 'all' && q.topic !== topicVal) return false;
    const rating = userProgress.flashcards[q.id] || 'unrated';
    if (masteryVal === 'trap') return !!q.is_trap;
    if (masteryVal !== 'all' && rating !== masteryVal) return false;
    return true;
  });
  fcCurrentIndex = 0;
  fcIsFlipped = false;
  fcHintVisible = false;
  updateFlashcardCounts();
  renderCurrentFlashcard();
}

function updateFlashcardCounts() {
  let hard = 0, medium = 0, easy = 0;
  QUESTIONS_BANK.forEach(q => {
    const r = userProgress.flashcards[q.id];
    if (r === 'hard') hard++;
    else if (r === 'medium') medium++;
    else if (r === 'easy') easy++;
  });
  document.getElementById('fcCountHard').textContent = String(hard);
  document.getElementById('fcCountMedium').textContent = String(medium);
  document.getElementById('fcCountEasy').textContent = String(easy);
}

function renderCurrentFlashcard() {
  const cardInner = document.getElementById('fcCardInner');
  if (cardInner) {
    if (fcIsFlipped) cardInner.classList.add('flipped');
    else cardInner.classList.remove('flipped');
  }
  if (fcList.length === 0) {
    document.getElementById('fcIndexLabel').textContent = '0 / 0';
    document.getElementById('fcFrontQuestion').textContent = 'Không có thẻ nào khớp với bộ lọc hiện tại.';
    document.getElementById('fcFrontOptions').innerHTML = '';
    document.getElementById('fcBackAnswer').textContent = '';
    document.getElementById('fcBackExplanation').textContent = '';
    return;
  }
  const q = fcList[fcCurrentIndex];
  document.getElementById('fcIndexLabel').textContent = (fcCurrentIndex + 1) + ' / ' + fcList.length;
  document.getElementById('fcFrontPartBadge').textContent = q.part + ' • #' + q.num + (q.stem_id ? (' • 🔗 Thân chung (' + q.stem_index + '/' + q.stem_total + ')') : '');
  document.getElementById('fcFrontTopicBadge').textContent = q.topic;
  document.getElementById('fcFrontQuestion').textContent = (q.stem_vignette ? ('[Case thân chung: ' + q.stem_vignette + '] — ') : '') + q.q;
  document.getElementById('fcFrontOptions').innerHTML = q.options.map(opt => '<div class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs sm:text-sm">' + escapeHtml(opt) + '</div>').join('');
  const hintBox = document.getElementById('fcFrontHintBox');
  if (fcHintVisible) { hintBox.textContent = q.hint; hintBox.classList.remove('hidden'); }
  else hintBox.classList.add('hidden');
  document.getElementById('fcBackAnswer').textContent = '✓ ' + q.ans;
  document.getElementById('fcBackExplanation').textContent = q.exp;
  const trapBox = document.getElementById('fcBackTrapBox');
  if (q.is_trap && q.trap_note) { trapBox.textContent = '⚠️ ' + q.trap_note; trapBox.classList.remove('hidden'); }
  else trapBox.classList.add('hidden');
  const refLink = document.getElementById('fcBackRefLink');
  refLink.href = q.ref_url;
  refLink.textContent = '📖 ' + q.ref_label;
}

function flipFlashcard() {
  if (fcList.length === 0) return;
  fcIsFlipped = !fcIsFlipped;
  const cardInner = document.getElementById('fcCardInner');
  if (cardInner) {
    if (fcIsFlipped) cardInner.classList.add('flipped');
    else cardInner.classList.remove('flipped');
  }
}

function toggleFlashcardHint() {
  fcHintVisible = !fcHintVisible;
  renderCurrentFlashcard();
}

function moveFlashcard(delta) {
  if (fcList.length === 0) return;
  fcCurrentIndex = (fcCurrentIndex + delta + fcList.length) % fcList.length;
  fcIsFlipped = false;
  fcHintVisible = false;
  renderCurrentFlashcard();
}

function rateCurrentFlashcard(level) {
  if (fcList.length === 0) return;
  const q = fcList[fcCurrentIndex];
  userProgress.flashcards[q.id] = level;
  saveProgress();
  updateFlashcardCounts();
  moveFlashcard(1);
}

function shuffleFlashcards() {
  fcList = shuffleArray(fcList);
  fcCurrentIndex = 0;
  fcIsFlipped = false;
  fcHintVisible = false;
  renderCurrentFlashcard();
  showToast('Đã trộn ngẫu nhiên bộ thẻ Flashcard!');
}

