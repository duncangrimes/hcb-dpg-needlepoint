#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to .env.local file
const envPath = path.join(__dirname, '..', '.env.local');

/**
 * Load environment variables from .env.local
 * This ensures Prisma uses the same env vars as Next.js during development
 */
function loadEnvLocal() {
  try {
    if (!fs.existsSync(envPath)) {
      console.warn('⚠️  Warning: .env.local not found. Using default .env if available.');
      return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    // Parse .env.local file
    envContent.split('\n').forEach(line => {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        return;
      }

      // Parse KEY=VALUE pairs
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        envVars[key] = value;
      }
    });

    console.log('✅ Loaded environment from .env.local');
    return envVars;
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    return {};
  }
}

/**
 * Run Prisma command with environment variables from .env.local
 */
function runPrismaCommand() {
  // Get command line arguments (everything after 'node script.js')
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: No Prisma command specified');
    console.log('Usage: node scripts/prisma-with-env.js <prisma-command>');
    console.log('Example: node scripts/prisma-with-env.js migrate dev');
    process.exit(1);
  }

  // Load .env.local
  const envVars = loadEnvLocal();

  // Merge with current process environment (process.env takes precedence for non-.env.local vars)
  const mergedEnv = {
    ...process.env,
    ...envVars
  };

  console.log(`🚀 Running: prisma ${args.join(' ')}\n`);

  // Spawn Prisma process with merged environment
  const prisma = spawn('npx', ['prisma', ...args], {
    stdio: 'inherit',
    env: mergedEnv
  });

  // Handle process exit
  prisma.on('close', (code) => {
    process.exit(code);
  });

  // Handle cleanup on exit signals
  process.on('SIGINT', () => {
    prisma.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    prisma.kill('SIGTERM');
  });
}

// Run the command
runPrismaCommand();

