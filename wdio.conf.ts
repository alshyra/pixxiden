import type { Options } from '@wdio/types'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

let tauriDriver: ChildProcess | null = null

export const config: Options.Testrunner = {
  //
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.e2e.json',
      transpileOnly: true,
    },
  },

  //
  // ==================
  // Specify Test Files
  // ==================
  specs: ['./e2e/tests/**/*.spec.ts'],
  exclude: [],

  //
  // ============
  // Capabilities
  // ============
  maxInstances: 1,
  capabilities: [
    {
      'tauri:options': {
        application: path.resolve('./src-tauri/target/release/pixiden'),
      },
    } as any,
  ],

  //
  // ===================
  // Test Configurations
  // ===================
  logLevel: 'info',
  bail: 0,
  baseUrl: '',
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  //
  // ============
  // Services
  // ============
  port: 4444,
  hostname: '127.0.0.1',

  //
  // Framework
  // ============
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },

  //
  // =====
  // Hooks
  // =====
  onPrepare: async function () {
    const tauriDriverPath = process.env.HOME + '/.cargo/bin/tauri-driver'
    console.log('🚀 Starting tauri-driver...')
    tauriDriver = spawn(tauriDriverPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    tauriDriver.stdout?.on('data', (data) => {
      console.log(`[tauri-driver stdout]: ${data}`)
    })

    tauriDriver.stderr?.on('data', (data) => {
      console.error(`[tauri-driver stderr]: ${data}`)
    })

    // Wait for tauri-driver to be ready
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2000)
    })
    console.log('✅ tauri-driver started')
  },

  onComplete: async function () {
    console.log('🛑 Stopping tauri-driver...')
    if (tauriDriver) {
      tauriDriver.kill()
      tauriDriver = null
    }
    console.log('✅ tauri-driver stopped')
  },

  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    if (!passed) {
      console.log(`❌ Test failed: ${test.title}`)
    }
  },
}
