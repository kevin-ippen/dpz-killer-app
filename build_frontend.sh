#!/bin/bash

# Build Frontend Script for dpz-killer-app
# This script builds the React/TypeScript frontend for Databricks App deployment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "Building Frontend for dpz-killer-app"
echo "======================================"
echo ""

# Step 1: Check if we're in the right directory
if [ ! -f "app.yaml" ]; then
    echo "${RED}❌ Error: app.yaml not found${NC}"
    echo "   Please run this script from the dpz-killer-app root directory"
    exit 1
fi

# Step 2: Navigate to frontend directory
if [ ! -d "frontend" ]; then
    echo "${RED}❌ Error: frontend directory not found${NC}"
    exit 1
fi

cd frontend
echo "${GREEN}✓ Found frontend directory${NC}"

# Step 3: Check for node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo "${RED}❌ npm install failed${NC}"
        exit 1
    fi
    echo "${GREEN}✓ Dependencies installed${NC}"
else
    echo "${GREEN}✓ Dependencies already installed${NC}"
fi

# Step 4: Clean previous build
if [ -d "dist" ]; then
    echo ""
    echo "Cleaning previous build..."
    rm -rf dist
    echo "${GREEN}✓ Previous build cleaned${NC}"
fi

# Step 5: Build the frontend
echo ""
echo "Building React app with Vite..."
echo "Running: npm run build"
npm run build

if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Frontend built successfully${NC}"
else
    echo "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Step 6: Verify build output
cd ..
if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo ""
    echo "${GREEN}✓ Build verified${NC}"
    echo ""
    echo "Build output:"
    echo "  Directory: frontend/dist/"
    du -sh frontend/dist
    echo ""
    echo "  Files:"
    ls -lh frontend/dist/

    if [ -d "frontend/dist/assets" ]; then
        echo ""
        echo "  Assets:"
        asset_count=$(ls -1 frontend/dist/assets/ | wc -l | tr -d ' ')
        echo "  ${asset_count} files in frontend/dist/assets/"
    fi
else
    echo "${RED}❌ Build verification failed${NC}"
    echo "   Expected: frontend/dist/index.html"
    echo "   Found:"
    ls -la frontend/dist/ 2>&1 || echo "   Directory doesn't exist"
    exit 1
fi

# Step 7: Check backend configuration
echo ""
echo "Backend Status:"
if [ -f "backend/app/main.py" ]; then
    echo "${GREEN}✓ backend/app/main.py found${NC}"

    # Check if it references the correct dist path
    if grep -q "frontend/dist" backend/app/main.py; then
        echo "${GREEN}✓ Backend configured to serve from frontend/dist${NC}"
    else
        echo "${YELLOW}⚠️  Warning: Backend may not be configured correctly${NC}"
        echo "   Check line 162 in backend/app/main.py"
    fi
else
    echo "${RED}❌ backend/app/main.py not found${NC}"
fi

# Step 8: Success message
echo ""
echo "======================================"
echo "${GREEN}✅ Build Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Test locally:"
echo "     cd backend && uvicorn app.main:app --reload"
echo "     Open: http://localhost:8000"
echo ""
echo "  2. Deploy to Databricks:"
echo "     databricks bundle deploy"
echo ""
echo "  3. Start your app in Databricks workspace"
echo ""

# Step 9: Optional - Show build size breakdown
echo "Build size summary:"
if command -v du &> /dev/null; then
    echo "  Total: $(du -sh frontend/dist | cut -f1)"
    if [ -d "frontend/dist/assets" ]; then
        echo "  Assets: $(du -sh frontend/dist/assets | cut -f1)"
    fi
fi
echo ""
