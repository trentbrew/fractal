import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
  }
});

page.on('pageerror', err => {
  errors.push(err.message);
});

try {
  console.log('Loading sandbox...');
  await page.goto('http://localhost:8901/sandbox/', { waitUntil: 'networkidle' });
  
  console.log('Page title:', await page.title());
  
  // Check if fractal-canvas exists
  const canvas = await page.$('fractal-canvas');
  console.log('fractal-canvas found:', !!canvas);
  
  // Check for thing shells
  const thingNodes = await page.$$('thing-node, thing-row, thing-card, thing-dialog');
  console.log('Thing shells found:', thingNodes.length);
  
  // Wait a bit for any async errors
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.log('\nConsole errors:');
    errors.forEach(e => console.log('  -', e));
  } else {
    console.log('\nNo console errors!');
  }
  
} catch (e) {
  console.error('Test failed:', e.message);
} finally {
  await browser.close();
}
