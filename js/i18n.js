(() => {
'use strict';
const TD = window.TD;

const STR = {
  en: {
    'tagline': 'Build towers · stop waves · defend base',
    'menu.map': 'MAP  ← →',
    'menu.recordEndless': 'Record: wave {n}',
    'menu.recordCampaign': 'Record: {best}/{total}{time}',
    'menu.starsLegend': '★ HP  ★ no sell  ★ no pause',
    'menu.hint1': '←→ map   ↑↓ mode   Q difficulty   Space start',
    'menu.hint2': 'tower → click slot · CN=ground FK=air · N wave · 1-3 speed',
    'tut.0': 'Pick a tower ↓ (FK=air, CN=ground)',
    'tut.1': 'Click a green slot on the map',
    'tut.2': 'Click tower → UP/SELL · T target',
    'tut.3': 'N or GO — early wave',
    'result.bestStars': 'best ★{n}',
    'result.bestEndless': ' (best E{n})',
    'result.bestTime': ' (best {time})',
    'result.waveEndless': 'Wave: E{wave}{best}',
    'result.waveCampaign': 'Wave: {wave}/{total} · {map}',
    'result.time': 'Time: {time}{best}',
    'result.killsCombo': 'Kills: {kills}  Max combo: {combo}',
    'result.kills': 'Kills: {kills}{combo}',
    'result.baseHp': 'Base HP: {hp}/{max}',
    'result.sellsPauses': 'Sells: {sells}  Pauses: {pauses}',
    'result.tipHp': '★ HP 20/20',
    'result.tipNoSell': '★ no sell',
    'result.tipNoPause': '★ no pause',
    'result.stillPossible': 'Still possible: {tips}',
    'result.perfect': 'All 3 stars — perfect run!',
    'result.menu': 'Click / Space — menu',
    'diff.easy': 'Easy',
    'diff.normal': 'Normal',
    'tip.targetsAll': 'Targets: ground + air',
    'tip.targetsGround': 'Targets: ground only',
    'tip.targetsAir': 'Targets: air only',
    'tip.slow': 'Slow {pct}% · {dur}s',
    'tip.aoe': 'AoE {tiles} tiles',
    'ach.first_win': 'First victory',
    'ach.first_win_desc': 'Beat Campaign',
    'ach.three_stars': 'Perfect',
    'ach.three_stars_desc': '3 stars on a map',
    'ach.endless_10': 'Survivor',
    'ach.endless_10_desc': 'Endless wave 10+',
    'ach.combo_9': 'Combo',
    'ach.combo_9_desc': 'Combo x9+',
    'ach.no_sell': 'No sell',
    'ach.no_sell_desc': 'Win without SELL',
    'ach.tycoon': 'Builder',
    'ach.tycoon_desc': '10+ towers per round',
    'ach.boss_kill': 'Hunter',
    'ach.boss_kill_desc': 'Kill a boss',
    'ach.all_maps': 'Traveler',
    'ach.all_maps_desc': 'Win on all 4 maps',
    'game.boss': 'BOSS!',
    'game.combo': 'COMBO x{combo} +{bonus}g',
    'game.milestone': 'MILESTONE E{wave} +{bonus}g',
    'hud.next': 'Next',
    'hud.now': 'Now',
    'target.far': 'Farthest',
    'target.fast': 'Fastest',
    'target.strong': 'Strongest',
    'target.close': 'Closest',
    'hud.targetHint': 'T: cycle target',
    'rec.sep': ' · ',
    'demo.label': 'DEMO',
    'demo.exitHint': 'F4 or any key \u2014 play',
    'demo.soundHint': 'Space — enable sound',
    'menu.demoHint': 'F4 — Demo / attract (AI plays)',
    'menu.daily': 'Daily challenge',
    'menu.dailyActive': 'Daily · seed {seed}',
    'menu.variant': 'Variant: {seed} (tap reroll)',
    'result.copy': 'Copy text',
    'result.png': 'Save PNG',
    'result.copied': 'Copied!',
    'result.challenge': 'Challenge a friend with the link in the text',
    'result.seed': 'Seed: {seed}'
  },
  uk: {
    'tagline': 'Будуй вежі · відбивай хвилі · захисти базу',
    'menu.map': 'КАРТА  ← →',
    'menu.recordEndless': 'Рекорд: хвиля {n}',
    'menu.recordCampaign': 'Рекорд: {best}/{total}{time}',
    'menu.starsLegend': '★ HP  ★ без продажу  ★ без паузи',
    'menu.hint1': '←→ карта   ↑↓ режим   Q складність   Space старт',
    'menu.hint2': 'вежа → клік слот · CN=земля FK=повітря · N хвиля · 1-3 швидкість',
    'tut.0': 'Обери вежу ↓ (FK=повітря, CN=земля)',
    'tut.1': 'Клікни зелений слот на карті',
    'tut.2': 'Клік вежу → UP/SELL · T ціль',
    'tut.3': 'N або GO — рання хвиля',
    'result.bestStars': 'рек. ★{n}',
    'result.bestEndless': ' (рек. E{n})',
    'result.bestTime': ' (рек. {time})',
    'result.waveEndless': 'Хвиля: E{wave}{best}',
    'result.waveCampaign': 'Хвиля: {wave}/{total} · {map}',
    'result.time': 'Час: {time}{best}',
    'result.killsCombo': 'Вбивств: {kills}  Max combo: {combo}',
    'result.kills': 'Вбивств: {kills}{combo}',
    'result.baseHp': 'HP бази: {hp}/{max}',
    'result.sellsPauses': 'Продаж: {sells}  Пауз: {pauses}',
    'result.tipHp': '★ HP 20/20',
    'result.tipNoSell': '★ без продажу',
    'result.tipNoPause': '★ без паузи',
    'result.stillPossible': 'Ще можна: {tips}',
    'result.perfect': 'Усі 3 зірки — ідеальний прохід!',
    'result.menu': 'Click / Space — меню',
    'diff.easy': 'Легко',
    'diff.normal': 'Нормально',
    'tip.targetsAll': 'Цілі: земля + повітря',
    'tip.targetsGround': 'Цілі: лише земля',
    'tip.targetsAir': 'Цілі: лише повітря',
    'tip.slow': 'Сповільн. {pct}% · {dur}с',
    'tip.aoe': 'AoE {tiles} кліт.',
    'hud.next': 'Наступна',
    'hud.now': 'Тепер',
    'target.far': 'Найдальша',
    'target.fast': 'Найшвидша',
    'target.strong': 'Найсильніша',
    'target.close': 'Найближча',
    'hud.targetHint': 'T: змінити ціль',
    'ach.first_win': 'Перша перемога',
    'ach.first_win_desc': 'Пройди Campaign',
    'ach.three_stars': 'Ідеал',
    'ach.three_stars_desc': '3 зірки на карті',
    'ach.endless_10': 'Вижив',
    'ach.endless_10_desc': 'Endless хвиля 10+',
    'ach.combo_9': 'Комбо',
    'ach.combo_9_desc': 'Комбо x9+',
    'ach.no_sell': 'Без продажу',
    'ach.no_sell_desc': 'Перемога без SELL',
    'ach.tycoon': 'Будівельник',
    'ach.tycoon_desc': '10+ веж за раунд',
    'ach.boss_kill': 'Мисливець',
    'ach.boss_kill_desc': 'Вбий боса',
    'ach.all_maps': 'Мандрівник',
    'ach.all_maps_desc': 'Перемога на 4 картах',
    'game.boss': 'БОС!',
    'game.combo': 'COMBO x{combo} +{bonus}g',
    'game.milestone': 'MILESTONE E{wave} +{bonus}g',
    'hud.next': 'Далі',
    'hud.now': 'Зараз',
    'rec.sep': ' · ',
    'demo.label': 'ДЕМО',
    'demo.exitHint': 'F4 або будь-яка клавіша \u2014 грати',
    'demo.soundHint': 'Пробіл — ввімкнути звук',
    'menu.demoHint': 'F4 — Демо режим (ШІ грає)',
    'menu.daily': 'Щоденний челендж',
    'menu.dailyActive': 'Сьогодні · seed {seed}',
    'menu.variant': 'Варіант: {seed} (tap reroll)',
    'result.copy': 'Копіювати',
    'result.png': 'PNG картка',
    'result.copied': 'Скопійовано!',
    'result.challenge': 'Посилання для друга — у тексті',
    'result.seed': 'Seed: {seed}'
  }
};

TD.detectLocale = function detectLocale() {
  if (typeof navigator === 'undefined') return 'en';
  const primary = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return String(primary).toLowerCase().startsWith('uk') ? 'uk' : 'en';
};

TD.locale = TD.detectLocale();

TD.t = function t(key, params) {
  let s = (STR[TD.locale] || STR.en)[key];
  if (s == null) s = STR.en[key] || key;
  if (params) {
    for (const k of Object.keys(params)) s = s.split('{' + k + '}').join(params[k]);
  }
  return s;
};

TD.getDiffLabel = function getDiffLabel(id) {
  return TD.t('diff.' + id);
};

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = TD.locale;
}
})();