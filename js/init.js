window.addEventListener('DOMContentLoaded', function () {
  if (typeof initAppTheme === 'function') initAppTheme();
  if (typeof initSidebarState === 'function') initSidebarState();
  switchActiveCourse(activeCourseId, false);
  startGlobalSessionClock();
  const hideOnStart = localStorage.getItem('hmu_hide_course_hub_on_startup_v1') === '1';
  if (!hideOnStart) {
    openCourseHubModal();
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
});

