# Deployment
Local prototype: from repository root, run docker build -t querix-web apps/web then docker run --rm -p 127.0.0.1:3000:3000 querix-web. Open http://localhost:3000. Docker build not tested.
Managed staging: configure apps/web as root, npm install, npm run build, npm run start as supported by provider. Require passing CI and access review. No real patient data. Production requires approved security, dependency lockfile, monitoring and rollback. GPU streaming is independent. No provider selected or deployment performed.
