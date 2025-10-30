#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Path to .env.local file
const envPath = path.join(__dirname, '..', '.env.local');

// Function to update VERCEL_BLOB_CALLBACK_URL in .env.local
function updateEnvFile(ngrokUrl) {
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace or add VERCEL_BLOB_CALLBACK_URL
    if (envContent.includes('VERCEL_BLOB_CALLBACK_URL=')) {
      envContent = envContent.replace(
        /VERCEL_BLOB_CALLBACK_URL=.*/,
        `VERCEL_BLOB_CALLBACK_URL=${ngrokUrl}`
      );
    } else {
      envContent += `\nVERCEL_BLOB_CALLBACK_URL=${ngrokUrl}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated VERCEL_BLOB_CALLBACK_URL to: ${ngrokUrl}`);
  } catch (error) {
    console.error('❌ Error updating .env.local:', error.message);
  }
}

// Function to kill all ngrok processes
async function killAllNgrokProcesses() {
  try {
    console.log('🔄 Killing existing ngrok processes...');
    // Try pkill first (works on macOS/Linux)
    try {
      await execAsync('pkill ngrok');
      console.log('✅ Killed existing ngrok processes');
    } catch (error) {
      // pkill may exit with non-zero if no processes found, which is fine
      if (error.code === 1) {
        console.log('ℹ️  No existing ngrok processes found');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.warn('⚠️  Warning: Could not kill ngrok processes:', error.message);
  }
}

// Main function to start everything
async function start() {
  // Kill existing ngrok processes first
  await killAllNgrokProcesses();
  
  // Small delay to ensure processes are fully terminated
  await new Promise(resolve => setTimeout(resolve, 500));

  // Start ngrok tunnel
  console.log('🚀 Starting ngrok tunnel on port 3000...');
  const ngrok = spawn('ngrok', ['http', '3000', '--log=stdout'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let ngrokOutput = '';

  ngrok.stdout.on('data', (data) => {
    const output = data.toString();
    ngrokOutput += output;
    
    // Look for the ngrok URL in the output
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/);
    if (urlMatch) {
      const ngrokUrl = urlMatch[0];
      console.log(`🌐 Ngrok tunnel established: ${ngrokUrl}`);
      updateEnvFile(ngrokUrl);
    }
  });

  ngrok.stderr.on('data', (data) => {
    console.error('Ngrok error:', data.toString());
  });

  ngrok.on('close', (code) => {
    console.log(`Ngrok process exited with code ${code}`);
  });

  // Start Next.js dev server
  console.log('🚀 Starting Next.js development server...');
  const nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    ngrok.kill();
    nextDev.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    ngrok.kill();
    nextDev.kill();
    process.exit(0);
  });
}

// Start the application
start().catch((error) => {
  console.error('❌ Error starting application:', error);
  process.exit(1);
});
