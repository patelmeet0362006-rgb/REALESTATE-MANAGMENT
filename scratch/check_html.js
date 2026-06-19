const fs = require('fs');
const path = require('path');

const accountHtmlPath = path.join(__dirname, '..', 'account.html');
const favoritesHtmlPath = path.join(__dirname, '..', 'favorites.html');
const accountHtmlContent = fs.readFileSync(accountHtmlPath, 'utf8');
const favoritesHtmlContent = fs.readFileSync(favoritesHtmlPath, 'utf8');

const accountCheckIds = [
  'tab-login',
  'tab-register',
  'auth-login-form',
  'auth-register-form',
  'auth-notification'
];

const favoritesCheckIds = [
  'favorites-dashboard-section',
  'favorites-listings-grid',
  'favorites-notification',
  'auth-logout-btn'
];

console.log('--- Checking HTML Elements in account.html ---');
accountCheckIds.forEach(id => {
  const count = (accountHtmlContent.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length;
  console.log(`Element with ID "${id}": Found ${count} time(s)`);
});

console.log('--- Checking HTML Elements in favorites.html ---');
favoritesCheckIds.forEach(id => {
  const count = (favoritesHtmlContent.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length;
  console.log(`Element with ID "${id}": Found ${count} time(s)`);
});
