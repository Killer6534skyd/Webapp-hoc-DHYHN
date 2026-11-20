// Load any custom user-created courses for Y1-Y6 from localStorage
try {
  const customCoursesRaw = localStorage.getItem('hmu_custom_courses_catalog_v1');
  if (customCoursesRaw) {
    const customCourses = JSON.parse(customCoursesRaw);
    Object.keys(customCourses).forEach(cid => {
      if (!COURSE_BANKS_DATA[cid]) COURSE_BANKS_DATA[cid] = customCourses[cid];
    });
  }
} catch (e) {}

let activeCourseId = 's37_s38_ung_thu';
try {
  const savedCourseId = localStorage.getItem('hmu_active_course_id_v1');
  if (savedCourseId && COURSE_BANKS_DATA[savedCourseId]) activeCourseId = savedCourseId;
} catch (e) {}

const COURSE_SCRIPT_MANIFEST = {
  s22_ntmd: 'data/courses/s22_ntmd.js',
  s28_than_kinh_hanh_vi: 'data/courses/s28_than_kinh_hanh_vi.js',
  s211_sinh_duc_sinh_san: 'data/courses/s211_sinh_duc_sinh_san.js',
  s310_truyen_nhiem: 'data/courses/s310_truyen_nhiem.js',
  s37_s38_ung_thu: 'data/courses/s37_s38_ung_thu.js',
  nckh3_y5: 'data/courses/nckh3_y5.js',
  s36_gmhs_hscc: 'data/courses/s36_gmhs_hscc.js',
  s38_tam_than: 'data/courses/s38_tam_than.js',
  s39_yhct: 'data/courses/s39_yhct.js',
  s311_csskbd: 'data/courses/s311_csskbd.js',
  s312_1_phcn: 'data/courses/s312_1_phcn.js',
  s312_2_lao: 'data/courses/s312_2_lao.js',
  s312_3_di_ung: 'data/courses/s312_3_di_ung.js',
  s312_4_da_lieu: 'data/courses/s312_4_da_lieu.js',
  s312_5_mat: 'data/courses/s312_5_mat.js',
  s312_6_tmh: 'data/courses/s312_6_tmh.js',
  s312_7_rhm: 'data/courses/s312_7_rhm.js',
  s312_8_ptthtm: 'data/courses/s312_8_ptthtm.js'
};

function ensureCourseScriptLoaded(courseId) {
  if (COURSE_BANKS_DATA[courseId]) return Promise.resolve(COURSE_BANKS_DATA[courseId]);
  const src = COURSE_SCRIPT_MANIFEST[courseId];
  if (!src || typeof document === 'undefined' || !document.createElement) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(COURSE_BANKS_DATA[courseId] || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}


function cloneQuestionFast(q) {
  if (!q || typeof q !== 'object') return q;
  const copy = Object.assign({}, q);
  if (Array.isArray(q.options)) copy.options = q.options.slice();
  if (Array.isArray(q.media)) copy.media = q.media.slice();
  return copy;
}

function hydrateCourseData(courseObj) {
  if (!courseObj || courseObj._hydrated) return courseObj;
  const qs = courseObj.questions || [];
  const ptm = courseObj.partTitleMap || {};
  const defRl = courseObj.defaultRefLabel || '';
  const defRu = courseObj.defaultRefUrl || '';
  const shExps = courseObj._sharedExps || [];
  const shTraps = courseObj._sharedTraps || [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (q._e !== undefined) {
      q.exp = shExps[q._e] || '';
      delete q._e;
    }
    if (q._t !== undefined) {
      q.trap_note = shTraps[q._t] || '';
      delete q._t;
    }
    if (q.ref_label === undefined && defRl) q.ref_label = defRl;
    if (q.ref_url === undefined && defRu) q.ref_url = defRu;
    if (q.part_title === undefined && q.part && ptm[q.part]) q.part_title = ptm[q.part];
    if (q.is_trap === undefined) q.is_trap = false;
    if (q.trap_note === undefined) q.trap_note = '';
  }
  delete courseObj._sharedExps;
  delete courseObj._sharedTraps;
  courseObj._hydrated = true;
  return courseObj;
}
