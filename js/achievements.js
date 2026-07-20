(() => {
'use strict';
const TD = window.TD;

TD.ACHIEVEMENTS = [
  { id: 'first_win', labelKey: 'ach.first_win', descKey: 'ach.first_win_desc' },
  { id: 'three_stars', labelKey: 'ach.three_stars', descKey: 'ach.three_stars_desc' },
  { id: 'endless_10', labelKey: 'ach.endless_10', descKey: 'ach.endless_10_desc' },
  { id: 'combo_9', labelKey: 'ach.combo_9', descKey: 'ach.combo_9_desc' },
  { id: 'no_sell', labelKey: 'ach.no_sell', descKey: 'ach.no_sell_desc' },
  { id: 'tycoon', labelKey: 'ach.tycoon', descKey: 'ach.tycoon_desc' },
  { id: 'boss_kill', labelKey: 'ach.boss_kill', descKey: 'ach.boss_kill_desc' },
  { id: 'all_maps', labelKey: 'ach.all_maps', descKey: 'ach.all_maps_desc' }
];

TD.achLabel = function achLabel(def) { return TD.t(def.labelKey); };
TD.achDesc = function achDesc(def) { return TD.t(def.descKey); };

TD.isAchievementUnlocked = function isAchievementUnlocked(id) {
  return localStorage.getItem('ach_' + id) === '1';
};

TD.unlockAchievement = function unlockAchievement(id) {
  if (TD.isAchievementUnlocked(id)) return false;
  localStorage.setItem('ach_' + id, '1');
  const def = TD.ACHIEVEMENTS.find(a => a.id === id);
  if (def) {
    TD.run.achievementToast = { text: '🏆 ' + TD.achLabel(def), life: 2.2 };
    TD.bus.emit('sfx', 'combo');
  }
  return true;
};

TD.getAchievementCount = function getAchievementCount() {
  return TD.ACHIEVEMENTS.filter(a => TD.isAchievementUnlocked(a.id)).length;
};

TD.checkAchievements = function checkAchievements(result) {
  if (!result || TD.isDemo) return;
  const stats = TD.run.runStats;
  if (result.won && result.mode === 'campaign') TD.unlockAchievement('first_win');
  if (result.stars === 3) TD.unlockAchievement('three_stars');
  if (result.mode === 'endless' && result.wave >= 10) TD.unlockAchievement('endless_10');
  if (result.maxCombo >= 9) TD.unlockAchievement('combo_9');
  if (result.won && result.sells === 0) TD.unlockAchievement('no_sell');
  if (stats && stats.builds >= 10) TD.unlockAchievement('tycoon');
  if (stats && stats.bossKills > 0) TD.unlockAchievement('boss_kill');
  if (result.won && result.mode === 'campaign') {
    const wins = TD.MAP_IDS.filter(id => parseInt(localStorage.getItem('bestWave_' + id) || '0') >= TD.getCampaignWaveCount()).length;
    if (wins >= 3) TD.unlockAchievement('all_maps');
  }
};
})();