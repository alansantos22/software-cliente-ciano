// ecosystem.config.cjs — Configuração do PM2 para o backend Ciano Cotas.
// Usado pelo setup.sh / deploy.sh na VPS. Caminho esperado: /var/www/ciano/backend/.
module.exports = {
  apps: [
    {
      name: 'ciano',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
