#!/bin/bash
# Database Setup Script
# Runs all necessary steps to set up the database from scratch

set -e  # Exit on error

echo "🗄️  Database Setup Script"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file first. See docs/DATABASE_SETUP_GUIDE.md"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Generate Prisma Client${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

echo -e "${BLUE}Step 2: Run Database Migrations${NC}"
npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations applied${NC}"
echo ""

echo -e "${BLUE}Step 3: Create Performance Indexes${NC}"
# Check if using Docker PostgreSQL
if docker ps | grep -q postgres; then
    echo "Detected Docker PostgreSQL..."
    DB_NAME=${DB_NAME:-webapp_dev1}
    docker exec -i postgres psql -U postgres -d "$DB_NAME" < metabase/setup-indexes.sql 2>&1 | grep -v "ERROR.*does not exist" || true
    echo -e "${GREEN}✅ Indexes created (if tables exist)${NC}"
else
    echo -e "${YELLOW}⚠️  Docker PostgreSQL not detected${NC}"
    echo "Run manually: psql -U postgres -d your_db -f metabase/setup-indexes.sql"
fi
echo ""

echo -e "${BLUE}Step 4: Initialize Analytics Cron Jobs${NC}"
npx tsx scripts/init-analytics-crons.ts
echo -e "${GREEN}✅ Analytics initialized${NC}"
echo ""

echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Create your first admin user (see docs/DATABASE_SETUP_GUIDE.md)"
echo "2. Run the app: npm run dev"
echo "3. Set up Metabase (see metabase/README.md)"
echo ""
