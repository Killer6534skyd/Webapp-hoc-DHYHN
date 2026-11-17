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
