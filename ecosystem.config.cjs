module.exports = {
  apps: [{
    name: 'lettrix',
    script: 'npx',
    args: 'tsx src/index.ts',
    cwd: __dirname + '/server',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
  }],
};
