const { cp } = require('node:fs/promises');

async function main() {
  try {
    await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
    await cp('public', '.next/standalone/public', { recursive: true });
    console.log('Standalone assets copied successfully.');
  } catch (error) {
    console.error('Failed to copy standalone assets:', error);
    process.exit(1);
  }
}

main();
