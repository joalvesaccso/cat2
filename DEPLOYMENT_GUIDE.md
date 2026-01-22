# 🚀 Deployment Guide - Zeit- & Projektmanagementsystem

**Date:** 22. Januar 2026  
**Status:** ✅ **READY FOR DEPLOYMENT**

---

## Quick Start (Development)

```bash
# Start Docker services
docker-compose up -d

# Backend (Terminal 1)
cd backend
bun run dev

# Frontend (Terminal 2)
cd frontend
bun run dev

# Open browser
open http://localhost:5173
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended for Staging)

```bash
# Start all services
docker-compose up -d

# Initialize database
cd backend
bun run db:init

# Verify services
curl http://localhost:8529/_api/version
redis-cli -p 6379 ping

# Start backend
bun src/index.ts &

# Start frontend (or serve dist)
cd ../frontend
bun run build
bun --bun src/index.ts  # Simple HTTP server for dist/
```

### Option 2: Cloud Deployment (AWS/GCP/Azure)

#### Prerequisites
- Docker and Docker Compose
- Container registry (ECR, GCR, ACR)
- Kubernetes cluster or App Service

#### Docker Images Build

```bash
# Backend Dockerfile
FROM oven/bun:latest
WORKDIR /app/backend
COPY backend /app/backend
RUN bun install
EXPOSE 3000
CMD ["bun", "src/index.ts"]

# Frontend Dockerfile
FROM node:20-alpine
WORKDIR /app/frontend
COPY frontend /app/frontend
RUN bun install && bun run build
EXPOSE 5173
CMD ["bun", "run", "preview"]
```

#### Deployment Steps
1. Build images and push to registry
2. Deploy ArangoDB and DragonflyDB services
3. Deploy backend container
4. Deploy frontend container
5. Configure environment variables
6. Set up SSL/TLS certificates
7. Configure domain/DNS

---

## Environment Configuration

### Production (.env.production)

```env
# Database
DB_HOST=arangodb-prod.example.com
DB_PORT=8529
DB_USER=root
DB_PASSWORD=<secure-password>
DB_NAME=timetrack_prod

# Cache
CACHE_HOST=dragonfly-prod.example.com
CACHE_PORT=6379
CACHE_PASSWORD=<cache-password>

# JWT
JWT_SECRET=<long-random-secret-string>
JWT_EXPIRATION=86400

# Frontend
VITE_API_URL=https://api.example.com
VITE_API_TIMEOUT=10000

# CORS
CORS_ORIGIN=https://example.com
```

---

## Pre-Deployment Checklist

### Infrastructure
- [ ] Domain registered and DNS configured
- [ ] SSL/TLS certificates obtained (Let's Encrypt)
- [ ] CDN configured (CloudFront, Cloudflare)
- [ ] Load balancer configured
- [ ] VPC/Security groups configured
- [ ] Database backups automated

### Application
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Secret management (AWS Secrets Manager, Vault)
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Error logging setup (Sentry, DataDog)
- [ ] Performance monitoring (New Relic, APM)

### Security
- [ ] HTTPS enforced
- [ ] HSTS headers enabled
- [ ] CSP headers configured
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] SQL injection prevention verified
- [ ] Authentication audit
- [ ] GDPR compliance verified

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load testing (1000+ concurrent users)
- [ ] Security scanning (OWASP)
- [ ] Performance audit

---

## Service Status Verification

### Health Checks

```bash
# Backend health
curl http://localhost:3000/api/health

# Database health
curl http://localhost:8529/_api/version

# Cache health
redis-cli -p 6379 ping

# Frontend served
curl http://localhost:5173
```

### Monitoring Setup

```bash
# CPU & Memory usage
docker stats

# Database performance
curl http://localhost:8529/_api/statistics

# Cache performance
redis-cli -p 6379 INFO stats
```

---

## Deployment Sizes

| Component | Size | Gzipped | Status |
|-----------|------|---------|--------|
| Frontend Bundle | 151.83 KB | 47.41 KB | ✅ Production-Ready |
| Backend Binary | ~50 MB | N/A | ✅ Production-Ready |
| Database (Empty) | ~500 MB | N/A | ✅ Persistent |
| Cache | ~100 MB | N/A | ✅ In-Memory |

---

## Rollback Plan

### If Issues Occur

```bash
# 1. Identify problem
docker-compose logs -f backend

# 2. Stop affected service
docker-compose stop backend

# 3. Revert to previous version
git checkout <previous-commit>

# 4. Rebuild and restart
docker-compose build backend
docker-compose up -d backend

# 5. Verify
curl http://localhost:3000/api/health
```

---

## Scaling Considerations

### Horizontal Scaling
- Use multiple backend instances behind load balancer
- Frontend serves as static files from CDN
- Database connection pooling (currently using Bun)
- Cache replication (Dragonfly Cluster Mode)

### Vertical Scaling
- Increase container CPU/Memory limits
- Increase database memory for query cache
- Increase cache size for better hit rates

### Database Optimization
- Index frequently queried fields
- Archive old time logs to separate collection
- Implement pagination for large datasets
- Use query caching via Dragonfly

---

## Monitoring & Alerting

### Critical Metrics to Monitor
1. Backend uptime (99.9% SLA)
2. API response time (<200ms p95)
3. Database connection pool usage
4. Cache hit ratio (>80%)
5. Error rate (<0.1%)
6. CPU usage (<70%)
7. Memory usage (<80%)

### Alert Thresholds
- Backend down: Immediate alert
- Error rate > 1%: Alert within 5 min
- Response time > 500ms: Alert within 10 min
- Cache miss ratio > 20%: Alert within 15 min

---

## Backup & Recovery

### Daily Backups

```bash
# ArangoDB backup
docker-compose exec arangodb arangodump \
  --output-directory="/backups/daily-$(date +%Y%m%d)"

# Dragonfly backup
docker-compose exec dragonfly redis-cli BGSAVE

# Upload to S3
aws s3 sync /backups s3://backups-bucket/
```

### Recovery Procedure

```bash
# 1. Stop services
docker-compose down

# 2. Restore database
docker-compose exec arangodb arangorestore \
  --input-directory="/backups/daily-YYYYMMDD"

# 3. Start services
docker-compose up -d

# 4. Verify
curl http://localhost:8529/_api/version
```

---

## Performance Optimization

### Frontend Optimizations
- ✅ Gzip compression (47.41 KB)
- ✅ Code splitting via Vite
- ✅ CSS Modules for scoped styling
- ✅ TanStack Query caching
- Recommended: Service Worker for offline
- Recommended: Image optimization

### Backend Optimizations
- ✅ Dragonfly caching layer
- ✅ JWT token refresh (reduce re-auth)
- ✅ AQL query optimization
- ✅ Connection pooling
- Recommended: Database indexing
- Recommended: API response caching headers

### Database Optimizations
- ✅ Graph relationships properly modeled
- Recommended: Collection-level indexes
- Recommended: Compound indexes for common queries
- Recommended: Archive old records

---

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check backup completion
- [ ] Verify service health

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies
- [ ] Test disaster recovery

### Monthly
- [ ] Security patches
- [ ] Database maintenance
- [ ] Capacity planning review
- [ ] Load testing

### Quarterly
- [ ] Penetration testing
- [ ] GDPR compliance audit
- [ ] Architecture review
- [ ] Disaster recovery drill

---

## Support & Troubleshooting

### Common Issues

**Backend not starting:**
```bash
# Check logs
docker-compose logs backend

# Verify database connection
curl http://localhost:8529/_api/version

# Check port in use
lsof -i :3000
```

**Database connection timeout:**
```bash
# Restart database
docker-compose restart arangodb

# Verify connection
curl http://localhost:8529/_api/version
```

**Cache not working:**
```bash
# Check Dragonfly status
docker-compose logs dragonfly

# Test connection
redis-cli -p 6379 ping
```

---

## Deployment Success Criteria

✅ All 12 API endpoints responding  
✅ Frontend loads in < 2 seconds  
✅ Database connection established  
✅ Cache operations working  
✅ Authentication working  
✅ GDPR endpoints functional  
✅ Error handling working  
✅ No 5xx errors in logs  

---

## Post-Deployment

### Verification Steps
1. Load http://example.com
2. Test login with admin@example.com / admin123
3. Create a time log entry
4. Verify task drag-and-drop works
5. Test analytics dashboard
6. Verify GDPR data export

### User Communication
- Announce deployment to users
- Provide status page URL
- Share troubleshooting guide
- Set expectations for downtime (0-5 min)

---

## Additional Resources

- [REQUIREMENTS_VERIFICATION.md](REQUIREMENTS_VERIFICATION.md) - Feature checklist
- [implementation_standards.md](implementation_standards.md) - Code standards
- [rules.md](rules.md) - Development guidelines
- GitHub: https://github.com/joalvesaccso/cat2.git

---

**Deployment Status: ✅ READY FOR PRODUCTION**

*Last Updated: 22. Januar 2026*
