/* Все картинки — встроенные SVG: ничего не скачивается отдельно,
   одинаково выглядят на старых Windows и дешёвых Android (в отличие от эмодзи). */

const ICONS = {
  right: '<svg viewBox="0 0 24 24"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left:  '<svg viewBox="0 0 24 24"><path d="M20 12H6M11 6l-6 6 6 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up:    '<svg viewBox="0 0 24 24"><path d="M12 20V6M6 11l6-6 6 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down:  '<svg viewBox="0 0 24 24"><path d="M12 4v14M6 13l6 6 6-6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  jump:  '<svg viewBox="0 0 24 24"><path d="M4 18c2-9 14-9 16 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M16 16l4 2 1-4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  say:   '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H10l-5 4v-4H4z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="9" cy="10" r="1.3" fill="#fff"/><circle cx="12" cy="10" r="1.3" fill="#fff"/><circle cx="15" cy="10" r="1.3" fill="#fff"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M9 17V5l10-2v12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="2.8" fill="#fff"/><circle cx="16.5" cy="15.5" r="2.8" fill="#fff"/></svg>',
  wait:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M12 9v4l3 2M9 2h6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>',
  repeat:'<svg viewBox="0 0 24 24"><path d="M5 11a7 7 0 0 1 12-4l2 2M19 13a7 7 0 0 1-12 4l-2-2" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M19 4v5h-5M5 20v-5h5" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  star: '<svg viewBox="0 0 100 100"><path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" fill="#FFC531" stroke="#E59A00" stroke-width="4" stroke-linejoin="round"/><path d="M38 40l8-2" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>',
  starEmpty: '<svg viewBox="0 0 100 100"><path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" fill="#E6EAF5" stroke="#C9D0E6" stroke-width="4" stroke-linejoin="round"/></svg>',
  apple: '<svg viewBox="0 0 100 100"><path d="M50 30c-10-8-34-6-34 22 0 22 16 38 26 38 4 0 6-2 8-2s4 2 8 2c10 0 26-16 26-38 0-28-24-30-34-22z" fill="#F0453A"/><path d="M50 30c0-10 4-16 10-20" stroke="#6B4423" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M54 22c8-10 20-8 22-6-4 8-14 10-22 6z" fill="#3ECF8E"/><ellipse cx="34" cy="46" rx="5" ry="9" fill="#fff" opacity=".45"/></svg>',
  stone: '<svg viewBox="0 0 100 100"><path d="M12 78c-4-20 8-44 30-50 18-5 38 4 46 22 6 14 2 28-4 32-20 4-56 4-72-4z" fill="#8A93A8"/><path d="M26 44c6-8 14-11 22-11" stroke="#B7BFD1" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 80c22 6 50 6 70 0" stroke="#6E768A" stroke-width="5" fill="none"/></svg>',

  cat: '<svg viewBox="0 0 100 100"><path d="M18 46L16 10l30 20z" fill="#F59F3A"/><path d="M82 46l2-36-30 20z" fill="#F59F3A"/><path d="M22 36l-1-16 14 10z" fill="#FFD6A5"/><path d="M78 36l1-16-14 10z" fill="#FFD6A5"/><ellipse cx="50" cy="56" rx="36" ry="32" fill="#FFB25B"/><ellipse cx="50" cy="70" rx="20" ry="13" fill="#FFE3C2"/><ellipse cx="36" cy="52" rx="6" ry="8" fill="#1F2544"/><ellipse cx="64" cy="52" rx="6" ry="8" fill="#1F2544"/><circle cx="38" cy="49" r="2.2" fill="#fff"/><circle cx="66" cy="49" r="2.2" fill="#fff"/><path d="M46 63h8l-4 5z" fill="#F0607A"/><path d="M50 68c-2 5-8 5-10 2M50 68c2 5 8 5 10 2" stroke="#1F2544" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 64H8M28 70l-18 5M72 64h20M72 70l18 5" stroke="#1F2544" stroke-width="2" stroke-linecap="round"/></svg>',
  robot: '<svg viewBox="0 0 100 100"><path d="M50 8v12" stroke="#6B7395" stroke-width="4"/><circle cx="50" cy="8" r="5" fill="#FF6FA8"/><rect x="16" y="20" width="68" height="56" rx="16" fill="#7FA2FF"/><rect x="24" y="30" width="52" height="30" rx="10" fill="#E8EEFF"/><circle cx="38" cy="45" r="7" fill="#1F2544"/><circle cx="62" cy="45" r="7" fill="#1F2544"/><circle cx="40" cy="43" r="2.4" fill="#fff"/><circle cx="64" cy="43" r="2.4" fill="#fff"/><rect x="36" y="64" width="28" height="6" rx="3" fill="#2E5BD9"/><rect x="8" y="38" width="8" height="20" rx="4" fill="#4A7DFF"/><rect x="84" y="38" width="8" height="20" rx="4" fill="#4A7DFF"/><rect x="30" y="78" width="12" height="14" rx="4" fill="#4A7DFF"/><rect x="58" y="78" width="12" height="14" rx="4" fill="#4A7DFF"/></svg>',
  bird: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="56" rx="34" ry="32" fill="#5BC0EB"/><ellipse cx="50" cy="68" rx="20" ry="16" fill="#D8F3FF"/><path d="M30 54c-12 2-18 12-16 20 10 0 18-6 20-14z" fill="#3A9BD1"/><path d="M50 22c-4-10 4-16 10-14-2 4-4 8-4 14z" fill="#3A9BD1"/><circle cx="40" cy="46" r="6" fill="#1F2544"/><circle cx="62" cy="46" r="6" fill="#1F2544"/><circle cx="42" cy="44" r="2" fill="#fff"/><circle cx="64" cy="44" r="2" fill="#fff"/><path d="M44 56l7 9 7-9z" fill="#FFB000"/><path d="M38 88l-4 6M62 88l4 6" stroke="#FFB000" stroke-width="4" stroke-linecap="round"/></svg>',

  /* ===== Относительные команды: герой идёт туда, куда смотрит ===== */
  forward:   '<svg viewBox="0 0 24 24"><path d="M12 19V7M7 12l5-5 5 5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21h12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/></svg>',
  turnLeft:  '<svg viewBox="0 0 24 24"><path d="M16 20v-6a5 5 0 0 0-5-5H6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 6L5 9l4 3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  turnRight: '<svg viewBox="0 0 24 24"><path d="M8 20v-6a5 5 0 0 1 5-5h5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6l4 3-4 3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  /* ===== Блоки анимации героя ===== */
  spin:   '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 1-7 4.1" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M4 3v6h6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  grow:   '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M4 10V4h6M4 4l6 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shrink: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="11" height="11" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M20 14v6h-6M20 20l-6-6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  color:  '<svg viewBox="0 0 24 24"><path d="M12 3C7 8 4 11 4 14.5A8 8 0 0 0 20 14.5C20 11 17 8 12 3z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 19a4.5 4.5 0 0 1-4.5-4.5" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>',
  vanish: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="3 3.4"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"/></svg>',

  /* Куда смотрит герой — иначе «вперёд» выглядит для ребёнка случайным */
  facing: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l6 5-6 5" fill="none" stroke="#1F2544" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/></svg>',

  /* Кнопка «прочитай задание вслух» — на светлом фоне, поэтому currentColor */
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9h3.5L12 5v14l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.3 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',

  /* ===== Цели младших уроков: понятнее абстрактной звезды ===== */
  home:   '<svg viewBox="0 0 100 100"><path d="M50 14L12 46h10v36h56V46h10z" fill="#F2A65A" stroke="#C97B2E" stroke-width="4" stroke-linejoin="round"/><rect x="40" y="56" width="20" height="26" rx="3" fill="#7A4A1E"/><rect x="26" y="52" width="13" height="13" rx="2" fill="#BFE8FF" stroke="#C97B2E" stroke-width="3"/><rect x="61" y="52" width="13" height="13" rx="2" fill="#BFE8FF" stroke="#C97B2E" stroke-width="3"/><path d="M50 14L12 46" stroke="#C97B2E" stroke-width="5" stroke-linecap="round"/></svg>',
  fish:   '<svg viewBox="0 0 100 100"><path d="M62 50c0 14-12 24-26 24S14 64 14 50s8-24 22-24 26 10 26 24z" fill="#FF9A3C"/><path d="M62 50l24-16v32z" fill="#FF7A1C"/><circle cx="28" cy="44" r="4.5" fill="#1F2544"/><path d="M40 58c5 4 11 4 16 0" stroke="#D45A00" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M36 30c4 6 4 12 0 16" stroke="#FFD0A0" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  flower: '<svg viewBox="0 0 100 100"><path d="M50 56v30" stroke="#3EA75E" stroke-width="6" stroke-linecap="round"/><path d="M50 72c-10 0-16-6-16-12 10 0 16 6 16 12z" fill="#3EA75E"/><g fill="#FF6FA8"><ellipse cx="50" cy="28" rx="11" ry="14"/><ellipse cx="50" cy="56" rx="11" ry="14"/><ellipse cx="36" cy="42" rx="14" ry="11"/><ellipse cx="64" cy="42" rx="14" ry="11"/></g><circle cx="50" cy="42" r="10" fill="#FFD34E" stroke="#E5A500" stroke-width="3"/></svg>',

  logo: '<svg viewBox="0 0 40 40"><rect x="2" y="2" width="16" height="16" rx="5" fill="#FFD34E"/><rect x="22" y="2" width="16" height="16" rx="5" fill="#4A7DFF"/><rect x="2" y="22" width="16" height="16" rx="5" fill="#3ECF8E"/><rect x="22" y="22" width="16" height="16" rx="5" fill="#FF6FA8"/><path d="M27 10h6M30 7l3 3-3 3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const HEROES = {
  cat:   { name: 'Котик',  icon: ICONS.cat },
  robot: { name: 'Робот',  icon: ICONS.robot },
  bird:  { name: 'Птичка', icon: ICONS.bird }
};

const BACKGROUNDS = {
  meadow: { name: 'Поляна' },
  space:  { name: 'Космос' },
  sea:    { name: 'Море' }
};
