// PM2 Ecosystem Config — ONE Platform
// Runs Node.js in cluster mode for load balancing across CPU cores
//
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   (auto-start on reboot)
//   pm2 monit                 (live monitoring)
//   pm2 logs                  (view logs)

module.exports = {
  apps: [
    {
      name: 'one-platform',
      script: './server/index.js',

      // ─── Cluster mode: one process per CPU core ────────────────────────────
      // On a 4-core server this spawns 4 Node.js processes automatically
      // nginx upstream routes between them (see nginx.conf)
      instances: 'max',   // or set to a number like 4
      exec_mode: 'cluster',

      // ─── Environment variables ─────────────────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // DATABASE_URL and ANTHROPIC_API_KEY set in server environment
      },

      // ─── Auto-restart settings ─────────────────────────────────────────────
      watch: false,                    // don't watch files in production
      max_memory_restart: '512M',      // restart if process exceeds 512MB RAM
      restart_delay: 3000,             // wait 3s between restarts
      max_restarts: 10,                // stop restarting after 10 failures
      min_uptime: '10s',               // must be up 10s to count as stable

      // ─── Logging ──────────────────────────────────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // ─── Zero-downtime deploys ─────────────────────────────────────────────
      // pm2 reload one-platform   (graceful reload, no downtime)
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  // ─── Deploy config (optional — for pm2 deploy) ────────────────────────────
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/one-platform.git',
      path: '/home/ubuntu/one-platform',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && cd client && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
