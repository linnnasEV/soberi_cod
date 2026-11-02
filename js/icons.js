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

  /* Ластик: тёмный контур, потому что лежит не на цветном блоке,
     а на светлой кнопке выбора */
  eraser: '<svg viewBox="0 0 24 24"><path d="M7 20h12M4.5 16.5l7-7a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-4 4H8z" fill="none" stroke="#565E80" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 10l6 6" stroke="#565E80" stroke-width="2.2"/></svg>',

  /* Куда смотрит герой — иначе «вперёд» выглядит для ребёнка случайным */
  facing: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l6 5-6 5" fill="none" stroke="#1F2544" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/></svg>',

  /* Кнопка «прочитай вслух» — на светлом фоне, поэтому currentColor */
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9h3.5L12 5v14l-4.5-4H4z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.3 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',

  /* ===== ГЕРОИ =====
     Девять характеров: зверята, техника и сказка. Ребёнок выбирает того,
     про кого ему хочется сочинить историю, поэтому лица крупные и добрые. */
  cat: '<svg viewBox="0 0 100 100"><path d="M18 46L16 10l30 20z" fill="#F59F3A"/><path d="M82 46l2-36-30 20z" fill="#F59F3A"/><path d="M22 36l-1-16 14 10z" fill="#FFD6A5"/><path d="M78 36l1-16-14 10z" fill="#FFD6A5"/><ellipse cx="50" cy="56" rx="36" ry="32" fill="#FFB25B"/><ellipse cx="50" cy="70" rx="20" ry="13" fill="#FFE3C2"/><ellipse cx="36" cy="52" rx="6" ry="8" fill="#1F2544"/><ellipse cx="64" cy="52" rx="6" ry="8" fill="#1F2544"/><circle cx="38" cy="49" r="2.2" fill="#fff"/><circle cx="66" cy="49" r="2.2" fill="#fff"/><path d="M46 63h8l-4 5z" fill="#F0607A"/><path d="M50 68c-2 5-8 5-10 2M50 68c2 5 8 5 10 2" stroke="#1F2544" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 64H8M28 70l-18 5M72 64h20M72 70l18 5" stroke="#1F2544" stroke-width="2" stroke-linecap="round"/></svg>',
  dog: '<svg viewBox="0 0 100 100"><ellipse cx="20" cy="48" rx="11" ry="22" fill="#9C6433"/><ellipse cx="80" cy="48" rx="11" ry="22" fill="#9C6433"/><ellipse cx="50" cy="54" rx="33" ry="30" fill="#C98B4B"/><ellipse cx="50" cy="70" rx="21" ry="15" fill="#F6E2C6"/><ellipse cx="37" cy="50" rx="5.5" ry="7" fill="#2A1F1A"/><ellipse cx="63" cy="50" rx="5.5" ry="7" fill="#2A1F1A"/><circle cx="39" cy="47" r="2" fill="#fff"/><circle cx="65" cy="47" r="2" fill="#fff"/><ellipse cx="50" cy="65" rx="7.5" ry="5.5" fill="#2A1F1A"/><path d="M50 71c-3 5-9 5-12 1M50 71c3 5 9 5 12 1" stroke="#2A1F1A" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M47 76h6v8a3 3 0 0 1-6 0z" fill="#FF8FA8"/></svg>',
  robot: '<svg viewBox="0 0 100 100"><path d="M50 8v12" stroke="#6B7395" stroke-width="4"/><circle cx="50" cy="8" r="5" fill="#FF6FA8"/><rect x="16" y="20" width="68" height="56" rx="16" fill="#7FA2FF"/><rect x="24" y="30" width="52" height="30" rx="10" fill="#E8EEFF"/><circle cx="38" cy="45" r="7" fill="#1F2544"/><circle cx="62" cy="45" r="7" fill="#1F2544"/><circle cx="40" cy="43" r="2.4" fill="#fff"/><circle cx="64" cy="43" r="2.4" fill="#fff"/><rect x="36" y="64" width="28" height="6" rx="3" fill="#2E5BD9"/><rect x="8" y="38" width="8" height="20" rx="4" fill="#4A7DFF"/><rect x="84" y="38" width="8" height="20" rx="4" fill="#4A7DFF"/><rect x="30" y="78" width="12" height="14" rx="4" fill="#4A7DFF"/><rect x="58" y="78" width="12" height="14" rx="4" fill="#4A7DFF"/></svg>',
  dino: '<svg viewBox="0 0 100 100"><path d="M30 28l7-14 6 14zM45 22l6-14 7 14zM60 26l8-13 5 15z" fill="#2FA86A"/><ellipse cx="50" cy="58" rx="34" ry="30" fill="#4CCB8A"/><ellipse cx="50" cy="72" rx="21" ry="14" fill="#CDF6E1"/><circle cx="37" cy="52" r="8" fill="#fff"/><circle cx="63" cy="52" r="8" fill="#fff"/><circle cx="38" cy="53" r="3.8" fill="#1F2544"/><circle cx="64" cy="53" r="3.8" fill="#1F2544"/><circle cx="27" cy="63" r="5" fill="#FF9BC0" opacity=".65"/><circle cx="73" cy="63" r="5" fill="#FF9BC0" opacity=".65"/><circle cx="45" cy="66" r="2" fill="#1C7A4C"/><circle cx="55" cy="66" r="2" fill="#1C7A4C"/><path d="M40 74c6 5 14 5 20 0" stroke="#1C7A4C" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  knight: '<svg viewBox="0 0 100 100"><path d="M50 4c-7 3-10 9-10 16h20c0-7-3-13-10-16z" fill="#E8453C"/><rect x="18" y="18" width="64" height="52" rx="24" fill="#C6D0E6"/><ellipse cx="50" cy="52" rx="23" ry="21" fill="#FFDFC4"/><rect x="14" y="34" width="72" height="9" rx="4" fill="#9AA6C4"/><circle cx="41" cy="54" r="4" fill="#1F2544"/><circle cx="59" cy="54" r="4" fill="#1F2544"/><circle cx="42.5" cy="52.5" r="1.4" fill="#fff"/><circle cx="60.5" cy="52.5" r="1.4" fill="#fff"/><path d="M43 64c4 4 10 4 14 0" stroke="#C97B5A" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="33" cy="60" r="4.5" fill="#FFADAD" opacity=".7"/><circle cx="67" cy="60" r="4.5" fill="#FFADAD" opacity=".7"/><path d="M22 76h56l6 16H16z" fill="#8894B8"/><path d="M50 78v14" stroke="#C6D0E6" stroke-width="4"/></svg>',
  princess: '<svg viewBox="0 0 100 100"><path d="M30 30l6 10 14-16 14 16 6-10 3 16H27z" fill="#FFD34E" stroke="#E5A500" stroke-width="3" stroke-linejoin="round"/><circle cx="36" cy="33" r="3" fill="#FF6FA8"/><circle cx="64" cy="33" r="3" fill="#6FD0FF"/><path d="M18 62c0-20 14-16 32-16s32-4 32 16v8c-4-10-10-14-14-16-6 4-12 6-18 6s-12-2-18-6c-4 2-10 6-14 16z" fill="#8A5230"/><ellipse cx="50" cy="62" rx="26" ry="25" fill="#FFDFC4"/><path d="M24 52c2-10 12-14 26-14s24 4 26 14c-6-6-14-8-26-8s-20 2-26 8z" fill="#8A5230"/><circle cx="40" cy="62" r="4.5" fill="#1F2544"/><circle cx="60" cy="62" r="4.5" fill="#1F2544"/><circle cx="41.5" cy="60" r="1.6" fill="#fff"/><circle cx="61.5" cy="60" r="1.6" fill="#fff"/><circle cx="31" cy="70" r="5" fill="#FFADC4" opacity=".75"/><circle cx="69" cy="70" r="5" fill="#FFADC4" opacity=".75"/><path d="M44 74c3 4 9 4 12 0" stroke="#D4566F" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  fishHero: '<svg viewBox="0 0 100 100"><path d="M70 50c0 16-13 28-28 28S14 66 14 50s10-28 28-28 28 12 28 28z" fill="#FF9A3C"/><path d="M70 50l20-18v36z" fill="#FF7A1C"/><path d="M40 22c6-10 14-10 18-6-6 2-10 6-12 10z" fill="#FFC98A"/><circle cx="32" cy="42" r="7" fill="#fff"/><circle cx="33" cy="42" r="3.6" fill="#1F2544"/><circle cx="34.5" cy="40.5" r="1.3" fill="#fff"/><path d="M26 58c6 5 14 5 20 1" stroke="#D45A00" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M52 34c6 6 6 24 0 32" stroke="#FFD0A0" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  bird: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="56" rx="34" ry="32" fill="#5BC0EB"/><ellipse cx="50" cy="68" rx="20" ry="16" fill="#D8F3FF"/><path d="M30 54c-12 2-18 12-16 20 10 0 18-6 20-14z" fill="#3A9BD1"/><path d="M50 22c-4-10 4-16 10-14-2 4-4 8-4 14z" fill="#3A9BD1"/><circle cx="40" cy="46" r="6" fill="#1F2544"/><circle cx="62" cy="46" r="6" fill="#1F2544"/><circle cx="42" cy="44" r="2" fill="#fff"/><circle cx="64" cy="44" r="2" fill="#fff"/><path d="M44 56l7 9 7-9z" fill="#FFB000"/><path d="M38 88l-4 6M62 88l4 6" stroke="#FFB000" stroke-width="4" stroke-linecap="round"/></svg>',
  bunny: '<svg viewBox="0 0 100 100"><ellipse cx="35" cy="26" rx="8" ry="21" fill="#EDEBF8"/><ellipse cx="65" cy="26" rx="8" ry="21" fill="#EDEBF8"/><ellipse cx="35" cy="28" rx="4" ry="14" fill="#FFC2D8"/><ellipse cx="65" cy="28" rx="4" ry="14" fill="#FFC2D8"/><ellipse cx="50" cy="62" rx="32" ry="28" fill="#F7F5FD"/><ellipse cx="38" cy="58" rx="5" ry="7" fill="#1F2544"/><ellipse cx="62" cy="58" rx="5" ry="7" fill="#1F2544"/><circle cx="40" cy="55" r="1.9" fill="#fff"/><circle cx="64" cy="55" r="1.9" fill="#fff"/><path d="M46 70h8l-4 5z" fill="#FF7FA8"/><rect x="46" y="79" width="8" height="7" rx="2" fill="#fff" stroke="#D9DCEC" stroke-width="1.5"/><path d="M50 75c-3 4-8 4-10 1M50 75c3 4 8 4 10 1" stroke="#7A819B" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 68H10M28 74l-16 4M72 68h18M72 74l16 4" stroke="#C9CEE4" stroke-width="2" stroke-linecap="round"/></svg>',

  /* ===== ПРЕДМЕТЫ ДЛЯ СЦЕНЫ =====
     Каждый узнаётся с одного взгляда: ребёнок выбирает картинку, а не слово. */
  home:   '<svg viewBox="0 0 100 100"><path d="M50 14L12 46h10v36h56V46h10z" fill="#F2A65A" stroke="#C97B2E" stroke-width="4" stroke-linejoin="round"/><rect x="40" y="56" width="20" height="26" rx="3" fill="#7A4A1E"/><rect x="26" y="52" width="13" height="13" rx="2" fill="#BFE8FF" stroke="#C97B2E" stroke-width="3"/><rect x="61" y="52" width="13" height="13" rx="2" fill="#BFE8FF" stroke="#C97B2E" stroke-width="3"/><path d="M50 14L12 46" stroke="#C97B2E" stroke-width="5" stroke-linecap="round"/></svg>',
  tree:   '<svg viewBox="0 0 100 100"><rect x="44" y="58" width="12" height="32" rx="4" fill="#8A5A33"/><circle cx="50" cy="32" r="20" fill="#5FB36B"/><circle cx="32" cy="46" r="16" fill="#6FC47A"/><circle cx="68" cy="46" r="16" fill="#4FA35E"/><circle cx="50" cy="50" r="17" fill="#63BC70"/><path d="M50 60v14" stroke="#6B4423" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="38" r="3" fill="#F0453A"/><circle cx="62" cy="52" r="3" fill="#F0453A"/></svg>',
  flower: '<svg viewBox="0 0 100 100"><path d="M50 56v30" stroke="#3EA75E" stroke-width="6" stroke-linecap="round"/><path d="M50 72c-10 0-16-6-16-12 10 0 16 6 16 12z" fill="#3EA75E"/><g fill="#FF6FA8"><ellipse cx="50" cy="28" rx="11" ry="14"/><ellipse cx="50" cy="56" rx="11" ry="14"/><ellipse cx="36" cy="42" rx="14" ry="11"/><ellipse cx="64" cy="42" rx="14" ry="11"/></g><circle cx="50" cy="42" r="10" fill="#FFD34E" stroke="#E5A500" stroke-width="3"/></svg>',
  car:    '<svg viewBox="0 0 100 100"><path d="M14 64V50l12-16h40l14 16h6a4 4 0 0 1 4 4v10z" fill="#F0453A" stroke="#C32C22" stroke-width="3" stroke-linejoin="round"/><path d="M30 38h16v12H22z" fill="#BFE8FF"/><path d="M52 38h12l10 12H52z" fill="#BFE8FF"/><rect x="10" y="62" width="80" height="8" rx="4" fill="#C32C22"/><circle cx="30" cy="72" r="11" fill="#2A2F45"/><circle cx="70" cy="72" r="11" fill="#2A2F45"/><circle cx="30" cy="72" r="4.5" fill="#C9D2E6"/><circle cx="70" cy="72" r="4.5" fill="#C9D2E6"/></svg>',
  fountain: '<svg viewBox="0 0 100 100"><path d="M50 18c-5 6-8 10-8 14a8 8 0 0 0 16 0c0-4-3-8-8-14z" fill="#6FD0FF"/><path d="M50 40v22" stroke="#6FD0FF" stroke-width="7" stroke-linecap="round"/><path d="M34 52c4-8 10-10 16-10s12 2 16 10" stroke="#9DE0FF" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="36" y="60" width="28" height="8" rx="4" fill="#A9B3C9"/><path d="M18 70h64l-6 18H24z" fill="#C2CBDD" stroke="#8A93A8" stroke-width="3" stroke-linejoin="round"/><path d="M24 76h52" stroke="#7FD0F0" stroke-width="6" stroke-linecap="round"/></svg>',
  bench:  '<svg viewBox="0 0 100 100"><rect x="16" y="34" width="68" height="8" rx="4" fill="#C98B4B"/><rect x="16" y="46" width="68" height="8" rx="4" fill="#C98B4B"/><rect x="14" y="58" width="72" height="10" rx="5" fill="#B5793B"/><rect x="20" y="28" width="7" height="42" rx="3" fill="#8A5A33"/><rect x="73" y="28" width="7" height="42" rx="3" fill="#8A5A33"/><rect x="24" y="68" width="8" height="18" rx="3" fill="#6E4826"/><rect x="68" y="68" width="8" height="18" rx="3" fill="#6E4826"/></svg>',
  rocket: '<svg viewBox="0 0 100 100"><path d="M50 8c12 10 18 26 18 42v14H32V50c0-16 6-32 18-42z" fill="#EDF1FA" stroke="#9AA6C4" stroke-width="3"/><circle cx="50" cy="40" r="10" fill="#6FD0FF" stroke="#2E5BD9" stroke-width="3"/><path d="M32 52L18 72h14z" fill="#F0453A"/><path d="M68 52l14 20H68z" fill="#F0453A"/><rect x="40" y="64" width="20" height="10" rx="3" fill="#C9D2E6"/><path d="M42 76c2 10 5 14 8 16 3-2 6-6 8-16z" fill="#FFA53A"/><path d="M46 78c1 6 2 9 4 11 2-2 3-5 4-11z" fill="#FFD34E"/></svg>',
  star: '<svg viewBox="0 0 100 100"><path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" fill="#FFC531" stroke="#E59A00" stroke-width="4" stroke-linejoin="round"/><path d="M38 40l8-2" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>',
  starEmpty: '<svg viewBox="0 0 100 100"><path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" fill="#E6EAF5" stroke="#C9D0E6" stroke-width="4" stroke-linejoin="round"/></svg>',
  crown:  '<svg viewBox="0 0 100 100"><path d="M14 72L8 26l22 16 20-24 20 24 22-16-6 46z" fill="#FFD34E" stroke="#E5A500" stroke-width="4" stroke-linejoin="round"/><rect x="14" y="72" width="72" height="12" rx="5" fill="#F2B705" stroke="#E5A500" stroke-width="3"/><circle cx="50" cy="56" r="6" fill="#F0453A"/><circle cx="28" cy="58" r="5" fill="#6FD0FF"/><circle cx="72" cy="58" r="5" fill="#3ECF8E"/></svg>',
  chest:  '<svg viewBox="0 0 100 100"><path d="M16 44c0-14 15-22 34-22s34 8 34 22z" fill="#C98B4B" stroke="#8A5A33" stroke-width="4" stroke-linejoin="round"/><rect x="14" y="44" width="72" height="38" rx="6" fill="#D79A58" stroke="#8A5A33" stroke-width="4"/><rect x="14" y="48" width="72" height="9" fill="#FFD34E" stroke="#E5A500" stroke-width="2.5"/><rect x="42" y="52" width="16" height="20" rx="4" fill="#FFD34E" stroke="#E5A500" stroke-width="3"/><circle cx="50" cy="62" r="3.5" fill="#8A5A33"/></svg>',
  shell:  '<svg viewBox="0 0 100 100"><path d="M50 84C24 84 10 66 10 46 10 26 28 12 50 12s40 14 40 34c0 20-14 38-40 38z" fill="#FFC2D8" stroke="#E287AC" stroke-width="3.5"/><path d="M50 84V12M50 84C38 74 30 56 30 38M50 84c12-10 20-28 20-46M50 84c-6-12-10-30-10-48M50 84c6-12 10-30 10-48" stroke="#E287AC" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M38 16c6-4 18-4 24 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
  crab:   '<svg viewBox="0 0 100 100"><path d="M18 46c-6-6-6-14-2-18 6 2 12 8 12 16z" fill="#F0453A"/><path d="M82 46c6-6 6-14 2-18-6 2-12 8-12 16z" fill="#F0453A"/><ellipse cx="50" cy="58" rx="32" ry="22" fill="#FF6B5A" stroke="#C32C22" stroke-width="3"/><path d="M22 72l-10 12M34 78l-4 12M66 78l4 12M78 72l10 12" stroke="#C32C22" stroke-width="5" stroke-linecap="round"/><circle cx="38" cy="48" r="7" fill="#fff" stroke="#C32C22" stroke-width="2.5"/><circle cx="62" cy="48" r="7" fill="#fff" stroke="#C32C22" stroke-width="2.5"/><circle cx="38" cy="49" r="3.2" fill="#1F2544"/><circle cx="62" cy="49" r="3.2" fill="#1F2544"/><path d="M40 66c6 5 14 5 20 0" stroke="#C32C22" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  sun:    '<svg viewBox="0 0 100 100"><g stroke="#FFA53A" stroke-width="6" stroke-linecap="round"><path d="M50 6v12M50 82v12M6 50h12M82 50h12M19 19l8 8M73 73l8 8M81 19l-8 8M27 73l-8 8"/></g><circle cx="50" cy="50" r="24" fill="#FFD34E" stroke="#E5A500" stroke-width="4"/><circle cx="42" cy="46" r="3" fill="#C97B2E"/><circle cx="58" cy="46" r="3" fill="#C97B2E"/><path d="M42 58c5 5 11 5 16 0" stroke="#C97B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  cloud:  '<svg viewBox="0 0 100 100"><path d="M26 72a18 18 0 0 1-2-36 22 22 0 0 1 42-6 16 16 0 0 1 10 42z" fill="#fff" stroke="#BFD4F0" stroke-width="4" stroke-linejoin="round"/><circle cx="38" cy="54" r="3" fill="#BFD4F0"/><circle cx="58" cy="54" r="3" fill="#BFD4F0"/><path d="M40 62c5 4 11 4 16 0" stroke="#BFD4F0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  grass:  '<svg viewBox="0 0 100 100"><path d="M20 86c0-18 4-30 8-38M34 86c0-22 6-36 12-46M50 86c0-20 2-34 4-44M66 86c0-22-4-36-10-44M80 86c0-18-4-30-8-38" stroke="#4FA35E" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M12 86h76" stroke="#3E8A4C" stroke-width="8" stroke-linecap="round"/><circle cx="34" cy="44" r="4" fill="#FFD34E"/><circle cx="68" cy="50" r="4" fill="#FF6FA8"/></svg>',
  moon:   '<svg viewBox="0 0 100 100"><path d="M64 10a40 40 0 1 0 0 80 34 34 0 0 1 0-80z" fill="#FFE9A8" stroke="#E5C06A" stroke-width="4" stroke-linejoin="round"/><circle cx="40" cy="36" r="6" fill="#EFD48C"/><circle cx="32" cy="58" r="4.5" fill="#EFD48C"/><circle cx="48" cy="68" r="3.5" fill="#EFD48C"/><path d="M80 20l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFD34E"/></svg>',
  fence:  '<svg viewBox="0 0 100 100"><g fill="#D79A58" stroke="#8A5A33" stroke-width="3" stroke-linejoin="round"><path d="M14 38l8-10 8 10v48H14z"/><path d="M42 38l8-10 8 10v48H42z"/><path d="M70 38l8-10 8 10v48H70z"/></g><rect x="8" y="48" width="84" height="8" rx="3" fill="#C98B4B" stroke="#8A5A33" stroke-width="2.5"/><rect x="8" y="68" width="84" height="8" rx="3" fill="#C98B4B" stroke="#8A5A33" stroke-width="2.5"/></svg>',
  stone:  '<svg viewBox="0 0 100 100"><path d="M12 78c-4-20 8-44 30-50 18-5 38 4 46 22 6 14 2 28-4 32-20 4-56 4-72-4z" fill="#8A93A8"/><path d="M26 44c6-8 14-11 22-11" stroke="#B7BFD1" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 80c22 6 50 6 70 0" stroke="#6E768A" stroke-width="5" fill="none"/></svg>',
  potion: '<svg viewBox="0 0 100 100"><rect x="40" y="10" width="20" height="16" rx="4" fill="#C9D2E6" stroke="#8A93A8" stroke-width="3"/><path d="M38 26h24v10l16 26a16 16 0 0 1-14 26H36a16 16 0 0 1-14-26l16-26z" fill="#E8EEFF" stroke="#8A93A8" stroke-width="3.5" stroke-linejoin="round"/><path d="M27 60h46a16 16 0 0 1-9 28H36a16 16 0 0 1-9-28z" fill="#A66BFF"/><circle cx="42" cy="72" r="4" fill="#E0C8FF"/><circle cx="58" cy="78" r="3" fill="#E0C8FF"/><circle cx="52" cy="66" r="2.5" fill="#fff"/></svg>',
  apple:  '<svg viewBox="0 0 100 100"><path d="M50 30c-10-8-34-6-34 22 0 22 16 38 26 38 4 0 6-2 8-2s4 2 8 2c10 0 26-16 26-38 0-28-24-30-34-22z" fill="#F0453A"/><path d="M50 30c0-10 4-16 10-20" stroke="#6B4423" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M54 22c8-10 20-8 22-6-4 8-14 10-22 6z" fill="#3ECF8E"/><ellipse cx="34" cy="46" rx="5" ry="9" fill="#fff" opacity=".45"/></svg>',
  fish:   '<svg viewBox="0 0 100 100"><path d="M62 50c0 14-12 24-26 24S14 64 14 50s8-24 22-24 26 10 26 24z" fill="#FF9A3C"/><path d="M62 50l24-16v32z" fill="#FF7A1C"/><circle cx="28" cy="44" r="4.5" fill="#1F2544"/><path d="M40 58c5 4 11 4 16 0" stroke="#D45A00" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M36 30c4 6 4 12 0 16" stroke="#FFD0A0" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',

  logo: '<svg viewBox="0 0 40 40"><rect x="2" y="2" width="16" height="16" rx="5" fill="#FFD34E"/><rect x="22" y="2" width="16" height="16" rx="5" fill="#4A7DFF"/><rect x="2" y="22" width="16" height="16" rx="5" fill="#3ECF8E"/><rect x="22" y="22" width="16" height="16" rx="5" fill="#FF6FA8"/><path d="M27 10h6M30 7l3 3-3 3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* ===== Герои =====
   Первые трое ходят и по урокам, остальные живут в Мастерской: в заданиях
   герой задан автором, а в своей истории ребёнок выбирает сам. */
const HEROES = {
  cat:      { name: 'Котик',    icon: ICONS.cat },
  dog:      { name: 'Собачка',  icon: ICONS.dog },
  robot:    { name: 'Робот',    icon: ICONS.robot },
  dino:     { name: 'Дракоша',  icon: ICONS.dino },
  knight:   { name: 'Рыцарь',   icon: ICONS.knight },
  princess: { name: 'Принцесса', icon: ICONS.princess },
  fishy:    { name: 'Рыбка',    icon: ICONS.fishHero },
  bird:     { name: 'Птичка',   icon: ICONS.bird },
  bunny:    { name: 'Зайка',    icon: ICONS.bunny }
};

/* ===== Фоны =====
   Не заливка, а нарисованное место: лес, город, пляж. Ребёнку легче
   придумать историю там, где видно, где он находится. Рисунок бледный —
   поверх него лежат клетки, предметы и герой, и они должны читаться. */
const BG_ART = {
  forest:
    '<rect width="140" height="100" fill="#E4F5DC"/><ellipse cx="20" cy="74" rx="40" ry="16" fill="#CBEBBE"/><ellipse cx="110" cy="78" rx="46" ry="18" fill="#CBEBBE"/>' +
    '<g fill="#9ED49A"><circle cx="16" cy="40" r="15"/><circle cx="28" cy="50" r="12"/><circle cx="6" cy="52" r="11"/></g><rect x="14" y="56" width="5" height="22" rx="2" fill="#B98F62"/>' +
    '<g fill="#8FCB8C"><circle cx="124" cy="34" r="16"/><circle cx="112" cy="46" r="12"/><circle cx="134" cy="48" r="11"/></g><rect x="121" y="52" width="6" height="26" rx="2" fill="#B98F62"/>' +
    '<g fill="#A8DCA2"><circle cx="68" cy="26" r="13"/><circle cx="56" cy="34" r="10"/><circle cx="80" cy="34" r="10"/></g><rect x="65" y="38" width="5" height="18" rx="2" fill="#C49C70"/>' +
    '<path d="M0 88h140" stroke="#B5E0A8" stroke-width="10"/>',
  city:
    '<rect width="140" height="100" fill="#DDECFF"/><circle cx="118" cy="20" r="11" fill="#FFE9A8"/>' +
    '<g fill="#B9CCE8"><rect x="6" y="38" width="22" height="50" rx="3"/><rect x="34" y="26" width="18" height="62" rx="3"/><rect x="58" y="44" width="20" height="44" rx="3"/><rect x="84" y="30" width="22" height="58" rx="3"/><rect x="112" y="48" width="22" height="40" rx="3"/></g>' +
    '<g fill="#FFF3C4"><rect x="10" y="44" width="6" height="6"/><rect x="20" y="44" width="6" height="6"/><rect x="10" y="56" width="6" height="6"/><rect x="20" y="56" width="6" height="6"/><rect x="38" y="34" width="6" height="6"/><rect x="38" y="46" width="6" height="6"/><rect x="38" y="58" width="6" height="6"/><rect x="62" y="52" width="6" height="6"/><rect x="70" y="52" width="6" height="6"/><rect x="88" y="38" width="6" height="6"/><rect x="98" y="38" width="6" height="6"/><rect x="88" y="52" width="6" height="6"/><rect x="116" y="56" width="6" height="6"/><rect x="126" y="56" width="6" height="6"/></g>' +
    '<rect y="88" width="140" height="12" fill="#C6CFE0"/><path d="M0 94h16M28 94h16M56 94h16M84 94h16M112 94h16" stroke="#fff" stroke-width="3"/>',
  space:
    '<rect width="140" height="100" fill="#1E2452"/>' +
    '<g fill="#fff"><circle cx="12" cy="14" r="1.6"/><circle cx="36" cy="26" r="1.2"/><circle cx="58" cy="10" r="1.8"/><circle cx="82" cy="22" r="1.3"/><circle cx="104" cy="12" r="1.6"/><circle cx="128" cy="28" r="1.4"/><circle cx="20" cy="48" r="1.3"/><circle cx="48" cy="60" r="1.5"/><circle cx="72" cy="46" r="1.2"/><circle cx="96" cy="64" r="1.6"/><circle cx="120" cy="52" r="1.3"/><circle cx="30" cy="82" r="1.5"/><circle cx="62" cy="88" r="1.2"/><circle cx="90" cy="80" r="1.4"/><circle cx="132" cy="84" r="1.6"/></g>' +
    '<circle cx="112" cy="70" r="16" fill="#6C5BD4"/><ellipse cx="112" cy="70" rx="26" ry="6" fill="none" stroke="#A89BF0" stroke-width="3"/><circle cx="106" cy="64" r="4" fill="#8A7BE0"/>' +
    '<circle cx="24" cy="24" r="9" fill="#F2A65A"/><circle cx="21" cy="21" r="3" fill="#D98A3E"/>',
  fairy:
    '<rect width="140" height="100" fill="#F6E4FF"/><rect y="58" width="140" height="42" fill="#DFF5E4"/>' +
    '<g fill="none" stroke-width="5"><path d="M20 70a50 50 0 0 1 100 0" stroke="#FF9FC4"/><path d="M27 70a43 43 0 0 1 86 0" stroke="#FFD08A"/><path d="M34 70a36 36 0 0 1 72 0" stroke="#FFF0A0"/><path d="M41 70a29 29 0 0 1 58 0" stroke="#A8E6B6"/><path d="M48 70a22 22 0 0 1 44 0" stroke="#A8CFFF"/></g>' +
    '<g><path d="M14 86c0-8 5-12 10-12s10 4 10 12z" fill="#FF8FA8"/><rect x="21" y="84" width="6" height="12" rx="2" fill="#FFF0E0"/><circle cx="20" cy="80" r="2" fill="#fff"/><circle cx="28" cy="82" r="2" fill="#fff"/></g>' +
    '<g><path d="M108 90c0-7 4-10 8-10s8 3 8 10z" fill="#C79BFF"/><rect x="113" y="88" width="6" height="10" rx="2" fill="#FFF0E0"/></g>' +
    '<g fill="#FFD34E"><path d="M60 16l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M96 24l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/><path d="M30 30l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/></g>',
  beach:
    '<rect width="140" height="100" fill="#CFF0FF"/><circle cx="116" cy="18" r="12" fill="#FFD34E"/>' +
    '<rect y="36" width="140" height="30" fill="#7FD0F0"/><path d="M0 36h140" stroke="#5CBEE4" stroke-width="2"/>' +
    '<g stroke="#A9E5FA" stroke-width="3" fill="none" stroke-linecap="round"><path d="M8 46c4-3 8-3 12 0s8 3 12 0"/><path d="M48 56c4-3 8-3 12 0s8 3 12 0"/><path d="M88 44c4-3 8-3 12 0s8 3 12 0"/></g>' +
    '<path d="M0 66h140v34H0z" fill="#FFE6B8"/><path d="M0 66c20 6 40 6 60 0s40-6 80 0" fill="#FFF0D2"/>' +
    '<g><rect x="16" y="58" width="5" height="28" rx="2" fill="#B98F62" transform="rotate(-6 18 72)"/><g fill="#5FB36B"><ellipse cx="18" cy="56" rx="14" ry="5" transform="rotate(-20 18 56)"/><ellipse cx="18" cy="56" rx="14" ry="5" transform="rotate(20 18 56)"/><ellipse cx="18" cy="54" rx="5" ry="12"/></g></g>' +
    '<circle cx="96" cy="84" r="4" fill="#FFC2D8"/><circle cx="60" cy="90" r="3.5" fill="#FFD9E6"/>',
  snow:
    '<rect width="140" height="100" fill="#E9F4FF"/><path d="M0 70c20-10 40-10 60 0s50 8 80-4v34H0z" fill="#fff"/>' +
    '<g fill="#CFE6F7"><path d="M20 72c0-16 6-28 10-34 4 6 10 18 10 34z"/><path d="M110 76c0-14 5-24 8-30 3 6 8 16 8 30z"/></g>' +
    '<g fill="#9ED0E8"><path d="M24 50h12M28 42h4M24 58h12" stroke="#B5DEF0" stroke-width="2"/></g>' +
    '<g fill="#fff" opacity=".9"><circle cx="18" cy="16" r="2.4"/><circle cx="46" cy="26" r="2"/><circle cx="74" cy="14" r="2.6"/><circle cx="100" cy="30" r="2"/><circle cx="126" cy="18" r="2.4"/><circle cx="34" cy="44" r="1.8"/><circle cx="88" cy="48" r="2"/><circle cx="58" cy="54" r="1.8"/></g>' +
    '<path d="M0 94h140" stroke="#DCEEFB" stroke-width="10"/>',
  castle:
    '<rect width="140" height="100" fill="#E7E6FF"/><circle cx="24" cy="20" r="10" fill="#FFE9A8"/><ellipse cx="70" cy="96" rx="80" ry="22" fill="#CBE8C0"/>' +
    '<g fill="#C7CEE8" stroke="#A3ACD0" stroke-width="2"><rect x="34" y="46" width="72" height="42"/><rect x="26" y="34" width="20" height="54"/><rect x="94" y="34" width="20" height="54"/><rect x="60" y="28" width="20" height="60"/></g>' +
    '<g fill="#8E79D6"><path d="M26 34l10-14 10 14zM94 34l10-14 10 14zM60 28l10-16 10 16z"/></g>' +
    '<g fill="#FF8FA8"><path d="M36 16l10 3-10 3zM104 16l10 3-10 3zM70 10l10 3-10 3z"/></g><g stroke="#A3ACD0" stroke-width="2"><path d="M36 20V8M104 20V8M70 14V2"/></g>' +
    '<path d="M62 88V70a8 8 0 0 1 16 0v18z" fill="#9A7B52"/><g fill="#BFE8FF"><rect x="32" y="52" width="7" height="10" rx="3"/><rect x="101" y="52" width="7" height="10" rx="3"/><rect x="46" y="58" width="8" height="10" rx="4"/><rect x="86" y="58" width="8" height="10" rx="4"/></g>',
  day:
    '<rect width="140" height="100" fill="#CDE9FF"/><circle cx="116" cy="20" r="14" fill="#FFD34E"/>' +
    '<g stroke="#FFC531" stroke-width="3" stroke-linecap="round"><path d="M116 2v6M116 40v-4M94 20h6M132 20h6M101 5l4 4M131 35l-4-4M131 5l-4 4M101 35l4-4"/></g>' +
    '<g fill="#fff"><ellipse cx="30" cy="24" rx="16" ry="9"/><ellipse cx="42" cy="22" rx="11" ry="7"/><ellipse cx="74" cy="36" rx="13" ry="7"/><ellipse cx="84" cy="34" rx="9" ry="6"/></g>' +
    '<path d="M0 72c24-8 46-8 70 0s46 8 70 0v28H0z" fill="#BFE8A8"/><path d="M0 84c30-6 50-6 72 0s40 6 68 0" stroke="#A9DD92" stroke-width="4" fill="none"/>',
  night:
    '<rect width="140" height="100" fill="#1B2347"/>' +
    '<path d="M104 10a16 16 0 1 0 0 30 13 13 0 0 1 0-30z" fill="#FFE9A8"/>' +
    '<g fill="#FFF3C4"><circle cx="14" cy="16" r="1.8"/><circle cx="34" cy="28" r="1.3"/><circle cx="54" cy="12" r="2"/><circle cx="72" cy="26" r="1.4"/><circle cx="88" cy="14" r="1.6"/><circle cx="126" cy="26" r="1.8"/><circle cx="24" cy="44" r="1.4"/><circle cx="46" cy="52" r="1.6"/><circle cx="66" cy="42" r="1.2"/><circle cx="96" cy="50" r="1.5"/><circle cx="118" cy="46" r="1.3"/><circle cx="12" cy="62" r="1.5"/><circle cx="80" cy="62" r="1.3"/><circle cx="134" cy="60" r="1.6"/></g>' +
    '<path d="M0 78c20-12 36-12 54 0s42 10 86-4v26H0z" fill="#2C3568"/><path d="M0 88c26-8 44-8 68 0s44 6 72-2v14H0z" fill="#3A4480"/>'
};

const BACKGROUNDS = {
  forest: { name: 'Лес',    art: BG_ART.forest },
  city:   { name: 'Город',  art: BG_ART.city },
  space:  { name: 'Космос', art: BG_ART.space },
  fairy:  { name: 'Сказка', art: BG_ART.fairy },
  beach:  { name: 'Пляж',   art: BG_ART.beach },
  snow:   { name: 'Снег',   art: BG_ART.snow },
  castle: { name: 'Замок',  art: BG_ART.castle },
  day:    { name: 'День',   art: BG_ART.day },
  night:  { name: 'Ночь',   art: BG_ART.night }
};

/* Работы, сохранённые до смены героев и фонов, должны открываться, а не падать.
   Старое имя переводим в новое, незнакомое — в значение по умолчанию. */
const LEGACY_BG = { meadow: 'forest', sea: 'beach', sunset: 'day', rainbow: 'fairy' };
const LEGACY_HERO = { fox: 'dog', fish: 'fishy' };

function heroId(id) {
  return HEROES[id] ? id : (HEROES[LEGACY_HERO[id]] ? LEGACY_HERO[id] : 'cat');
}

function heroOf(id) { return HEROES[heroId(id)]; }

function bgId(id) {
  return BACKGROUNDS[id] ? id : (BACKGROUNDS[LEGACY_BG[id]] ? LEGACY_BG[id] : 'forest');
}

function bgOf(id) { return BACKGROUNDS[bgId(id)]; }

/* ===== Чем ребёнок наполняет сцену =====
   Символы те же, что в картах уроков, поэтому сцена собирается и проверяется
   уже существующим кодом. Порядок — от самого нужного к редкому. */
const DECOR = [
  { ch: 'S', name: 'Герой',   icon: ICONS.facing },
  { ch: 'h', name: 'Домик',   icon: ICONS.home },
  { ch: 't', name: 'Дерево',  icon: ICONS.tree },
  { ch: 'c', name: 'Цветочек', icon: ICONS.flower },
  { ch: 'm', name: 'Машина',  icon: ICONS.car },
  { ch: 'n', name: 'Фонтан',  icon: ICONS.fountain },
  { ch: 'b', name: 'Скамейка', icon: ICONS.bench },
  { ch: 'r', name: 'Ракета',  icon: ICONS.rocket },
  { ch: '*', name: 'Звезда',  icon: ICONS.star },
  { ch: 'k', name: 'Корона',  icon: ICONS.crown },
  { ch: 'x', name: 'Сундук',  icon: ICONS.chest },
  { ch: 'l', name: 'Ракушка', icon: ICONS.shell },
  { ch: 'q', name: 'Крабик',  icon: ICONS.crab },
  { ch: 'u', name: 'Солнце',  icon: ICONS.sun },
  { ch: 'o', name: 'Облако',  icon: ICONS.cloud },
  { ch: 'g', name: 'Травка',  icon: ICONS.grass },
  { ch: 'w', name: 'Луна',    icon: ICONS.moon },
  { ch: 'e', name: 'Забор',   icon: ICONS.fence },
  { ch: '#', name: 'Камень',  icon: ICONS.stone },
  { ch: 'z', name: 'Зелье',   icon: ICONS.potion },
  { ch: '.', name: 'Убрать',  icon: ICONS.eraser }
];
