(() => {
'use strict';
const TD = window.TD;

TD.migrateStorage = function migrateStorage() {
  if (localStorage.getItem('migrated_v1')) return;
  const legacy = {
    bestStars: localStorage.getItem('bestStars'),
    bestWave: localStorage.getItem('bestWave'),
    bestTime: localStorage.getItem('bestTime')
  };
  if (legacy.bestStars && !localStorage.getItem('bestStars_meadow')) {
    localStorage.setItem('bestStars_meadow', legacy.bestStars);
  }
  if (legacy.bestWave && !localStorage.getItem('bestWave_meadow')) {
    localStorage.setItem('bestWave_meadow', legacy.bestWave);
  }
  if (legacy.bestTime && !localStorage.getItem('bestTime_meadow')) {
    localStorage.setItem('bestTime_meadow', legacy.bestTime);
  }
  localStorage.setItem('migrated_v1', '1');
};

TD.migrateStorage();
})();