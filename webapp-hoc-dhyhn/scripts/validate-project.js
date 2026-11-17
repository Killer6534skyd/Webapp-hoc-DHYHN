#!/usr/bin/env node
/**
 * Kiểm tra toàn diện cấu trúc project, cú pháp JavaScript và tính toàn vẹn dữ liệu 16 học phần.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ LỖI:', msg);
    process.exit(1);
  }
}

// 1. Kiểm tra các đường dẫn CSS/JS trong index.html
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const assetRefs = [
  ...Array.from(indexHtml.matchAll(/<link\s+rel="stylesheet"\s+href="((?!https?:\/\/)[^"]+)"/g)).map(m => m[1]),
  ...Array.from(indexHtml.matchAll(/<script\s+src="((?!https?:\/\/)[^"]+)"><\/script>/g)).map(m => m[1]),
];

assert(assetRefs.length > 0, 'Không tìm thấy thẻ nạp CSS/JS cục bộ trong index.html');
for (const rel of assetRefs) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `File được tham chiếu trong index.html không tồn tại: ${rel}`);
}
console.log(`✓ Đã kiểm tra ${assetRefs.length} liên kết CSS/JS trong index.html.`);

// 2. Kiểm tra cú pháp (node --check) toàn bộ file .js
const jsFiles = assetRefs.filter(r => r.endsWith('.js'));
for (const rel of jsFiles) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: 'inherit' });
}
console.log(`✓ Toàn bộ ${jsFiles.length} file JavaScript đều hợp lệ cú pháp.`);

// 3. Kiểm tra dữ liệu 16 học phần và hàm hydrateCourseData
const sandbox = {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: { addEventListener: () => {} },
  document: { getElementById: () => null },
};
vm.createContext(sandbox);

const dataScripts = jsFiles.filter(r => r.startsWith('data/'));
for (const rel of dataScripts) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const courses = sandbox.COURSE_BANKS_DATA || {};
const courseIds = Object.keys(courses);
assert(courseIds.length >= 16, `Số lượng học phần không đủ (hiện có ${courseIds.length})`);

let totalQuestions = 0;
for (const cid of courseIds) {
  const c = sandbox.hydrateCourseData(courses[cid]);
  assert(Array.isArray(c.questions) && c.questions.length > 0, `Học phần ${cid} không có câu hỏi`);
  for (const q of c.questions) {
    assert(q.id && typeof q.q === 'string', `Câu hỏi thiếu id hoặc nội dung trong học phần ${cid}`);
    assert(Array.isArray(q.options) && q.options.length >= 2, `Câu hỏi ${q.id} (${cid}) thiếu phương án lựa chọn`);
    assert(
      typeof q.correct_idx === 'number' && q.correct_idx >= 0 && q.correct_idx < q.options.length,
      `Câu hỏi ${q.id} (${cid}) có correct_idx không hợp lệ: ${q.correct_idx}`
    );
  }
  totalQuestions += c.questions.length;
}

console.log(`✓ Đã xác thực ${courseIds.length} học phần với tổng cộng ${totalQuestions} câu hỏi.`);
