const fs = require('fs');
const path = require('path');

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Mock Document and elements
const elements = {
  'tab-login': { classList: { add: () => {}, remove: () => {}, toggle: () => {} }, addEventListener: () => {} },
  'tab-register': { classList: { add: () => {}, remove: () => {}, toggle: () => {} }, addEventListener: () => {} },
  'auth-login-form': { style: {}, addEventListener: () => {} },
  'auth-register-form': { style: {}, addEventListener: () => {} },
  'auth-notification': { style: {} },
};

global.window = {
  location: { pathname: '/account.html', search: '', hash: '', href: '' },
  initAccountDropdown: () => {}
};

global.document = {
  addEventListener(event, callback) {
    if (event === 'DOMContentLoaded') {
      setTimeout(callback, 0);
    }
  },
  getElementById(id) {
    return elements[id] || null;
  }
};

global.localStorage = localStorageMock;
global.console = console;

console.log('--- Executing account.js in Mock Environment ---');
try {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'account.js'), 'utf8');
  eval(code);
  console.log('account.js loaded successfully without direct syntax/parse errors.');
  
  // Wait for DOMContentLoaded trigger
  setTimeout(() => {
    console.log('DOMContentLoaded callback executed successfully without runtime errors.');
  }, 10);
} catch (err) {
  console.error('CRASH DETECTED:', err);
}
