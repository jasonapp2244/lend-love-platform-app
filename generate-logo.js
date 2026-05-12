/**
 * Generates Lend Love™ brand assets from a high-fidelity SVG.
 * Output: user-app/assets/{icon,adaptive-icon,favicon,splash,logo-mark}.png
 */
const fs = require('fs');
const sharp = require('sharp');

// Heart-with-$ mark only (used as compact app icon)
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="greenBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#5DBF3F"/>
      <stop offset="100%" stop-color="#236E16"/>
    </radialGradient>
    <linearGradient id="heart" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF4A4A"/>
      <stop offset="100%" stop-color="#C62828"/>
    </linearGradient>
    <linearGradient id="dollar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#F5A800"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" fill="url(#greenBg)"/>
  <path d="M512 850 C 270 700 140 540 140 380 C 140 280 220 200 320 200 C 410 200 470 250 512 320 C 554 250 614 200 704 200 C 804 200 884 280 884 380 C 884 540 754 700 512 850 Z" fill="url(#heart)" stroke="#0D0D0D" stroke-width="6"/>
  <text x="512" y="595" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="380" font-weight="900" fill="url(#dollar)" stroke="#FFFFFF" stroke-width="8">$</text>
</svg>`;

// Full wordmark (used as splash)
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1850 1310">
  <defs>
    <linearGradient id="lendGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7BD25A"/>
      <stop offset="100%" stop-color="#236E16"/>
    </linearGradient>
    <linearGradient id="loveGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#C88700"/>
    </linearGradient>
    <linearGradient id="heart2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF4A4A"/>
      <stop offset="100%" stop-color="#C62828"/>
    </linearGradient>
  </defs>
  <rect width="1850" height="1310" fill="#000000"/>

  <!-- "Lend" in cursive script with flourish underline -->
  <text x="925" y="640" text-anchor="middle" font-family="Brush Script MT, Lucida Handwriting, Apple Chancery, cursive" font-size="380" font-weight="700" font-style="italic" fill="url(#lendGrad)">Lend</text>

  <!-- Decorative swash under "Lend" -->
  <path d="M 560 700 Q 700 760 925 720 Q 1180 680 1370 740 Q 1500 770 1520 850 Q 1520 920 1450 920 Q 1380 920 1380 850" stroke="url(#lendGrad)" stroke-width="14" fill="none" stroke-linecap="round"/>

  <!-- "TM" mark -->
  <text x="1500" y="500" font-family="Arial, sans-serif" font-size="60" fill="#B0BEC5">TM</text>

  <!-- "LOVE" with heart-$ in place of O -->
  <text x="775" y="930" font-family="Arial Black, Impact, sans-serif" font-size="180" font-weight="900" fill="url(#loveGrad)">L</text>
  <g transform="translate(900 800)">
    <path d="M 80 200 C 20 160 -30 110 -30 65 C -30 35 -5 10 25 10 C 50 10 70 25 80 50 C 90 25 110 10 135 10 C 165 10 190 35 190 65 C 190 110 140 160 80 200 Z" fill="url(#heart2)" stroke="#0D0D0D" stroke-width="3"/>
    <text x="80" y="135" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="120" font-weight="900" fill="#FFFFFF">$</text>
  </g>
  <text x="1140" y="930" font-family="Arial Black, Impact, sans-serif" font-size="180" font-weight="900" fill="url(#loveGrad)">VE</text>
</svg>`;

(async () => {
  // App icon — square mark on rounded green tile, 1024x1024
  await sharp(Buffer.from(markSvg)).resize(1024, 1024).png().toFile('user-app/assets/icon.png');
  await sharp(Buffer.from(markSvg)).resize(1024, 1024).png().toFile('user-app/assets/adaptive-icon.png');
  await sharp(Buffer.from(markSvg)).resize(64, 64).png().toFile('user-app/assets/favicon.png');

  // Compact mark for use inside the app
  await sharp(Buffer.from(markSvg)).resize(256, 256).png().toFile('user-app/assets/logo-mark.png');

  // Splash + full wordmark for use on welcome screen
  await sharp(Buffer.from(wordmarkSvg)).resize(1850, 1310).png().toFile('user-app/assets/logo-full.png');

  // Splash background: 1242x2688, logo centered
  const splashBg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1242 2688">
    <rect width="1242" height="2688" fill="#0D0D0D"/>
  </svg>`);
  const wordmarkPng = await sharp(Buffer.from(wordmarkSvg)).resize(1000, 708).png().toBuffer();
  await sharp(splashBg)
    .composite([{ input: wordmarkPng, top: 990, left: 121 }])
    .png()
    .toFile('user-app/assets/splash.png');

  console.log('Generated:');
  ['icon', 'adaptive-icon', 'favicon', 'logo-mark', 'logo-full', 'splash'].forEach((n) => {
    const s = fs.statSync(`user-app/assets/${n}.png`);
    console.log(`  ${n}.png ${(s.size / 1024).toFixed(1)} KB`);
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
