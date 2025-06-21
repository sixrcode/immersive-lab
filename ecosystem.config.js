module.exports = {
  apps: [
    {
      name: 'next-app',
      script: 'pnpm',
      args: 'start',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    // AI Microservice is deployed as a Firebase Function, so it's not started here.
    // {
    //   name: 'ai-microservice',
    //   script: './ai-microservice/index.js',
    //   cwd: '.',
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '512M',
    //   env: {
    //     NODE_ENV: 'production',
    //     PORT: 3002,
    //   },
    // },
    {
      name: 'collaboration-service',
      script: './collaboration-service/dist/index.js',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001, // Consistent with its Dockerfile and our plan
      },
    },
    {
      name: 'portfolio-microservice',
      script: './portfolio-microservice/src/index.js',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
  ],
};
