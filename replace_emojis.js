const fs = require('fs');
let index = fs.readFileSync('c:/laragon/www/abeli-profile/index.html', 'utf-8');
let admin = fs.readFileSync('c:/laragon/www/abeli-profile/admin.js', 'utf-8');

// Insert Phosphor script in index.html head
if(!index.includes('phosphor-icons')){
  index = index.replace('</head>', '    <!-- Phosphor Icons -->\n    <script src="https://unpkg.com/@phosphor-icons/web"></script>\n</head>');
}

const replacements = {
  '👤': '<i class="ph ph-user"></i>',
  '🚪': '<i class="ph ph-sign-out"></i>',
  '➕': '<i class="ph ph-plus"></i>',
  '✏️': '<i class="ph ph-pencil-simple"></i>',
  '🗑️': '<i class="ph ph-trash"></i>',
  '📋': '<i class="ph ph-list-dashes"></i>',
  '💾': '<i class="ph ph-floppy-disk"></i>',
  '📍': '<i class="ph ph-map-pin"></i>',
  '👥': '<i class="ph ph-users"></i>',
  '🏘️': '<i class="ph ph-house"></i>',
  '🌊': '<i class="ph ph-waves"></i>',
  '🏛': '<i class="ph ph-bank"></i>',
  '🏙': '<i class="ph ph-buildings"></i>',
  '📮': '<i class="ph ph-mailbox"></i>',
  '👩‍💼': '<i class="ph ph-user-circle"></i>',
  '🐟': '<i class="ph ph-fish"></i>',
  '🦐': '<i class="ph ph-fish-simple"></i>',
  '🏪': '<i class="ph ph-storefront"></i>',
  '⚓': '<i class="ph ph-anchor"></i>',
  '🏫': '<i class="ph ph-graduation-cap"></i>',
  '🏥': '<i class="ph ph-first-aid"></i>',
  '🚍': '<i class="ph ph-bus"></i>',
  '💧': '<i class="ph ph-drop"></i>',
  '📅': '<i class="ph ph-calendar"></i>',
  '✍️': '<i class="ph ph-pen"></i>',
  '📰': '<i class="ph ph-newspaper"></i>',
  '📝': '<i class="ph ph-notepad"></i>',
  '🛡️': '<i class="ph ph-shield-check"></i>',
  '❤️': '<i class="ph-fill ph-heart" style="color: #ef4444;"></i>'
};

for (const [emoji, icon] of Object.entries(replacements)) {
  index = index.split(emoji).join(icon);
  admin = admin.split(emoji).join(icon);
}

fs.writeFileSync('c:/laragon/www/abeli-profile/index.html', index);
fs.writeFileSync('c:/laragon/www/abeli-profile/admin.js', admin);
console.log('Emojis replaced successfully.');
