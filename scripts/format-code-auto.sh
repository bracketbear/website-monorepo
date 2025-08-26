#!/bin/bash

# Non-interactive format script for CI/CD and automated workflows
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎨 Running Prettier to format code...${NC}"

# Check if specific files were provided as arguments
if [ $# -eq 0 ]; then
    echo -e "${BLUE}📝 Formatting all files...${NC}"
    npx prettier --write .
else
    echo -e "${BLUE}📝 Formatting specified files: $@${NC}"
    npx prettier --write "$@"
fi

# Check if there were any formatting issues
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Code formatting complete!${NC}"
    
    # Run linting check
    echo -e "${BLUE}🔍 Running ESLint check...${NC}"
    
    # Capture linting output for analysis
    LINT_OUTPUT=$(npm run lint:check 2>&1 || true)
    
    if echo "$LINT_OUTPUT" | grep -q "✖.*problems"; then
        # Parse and summarize the linting issues
        TOTAL_PROBLEMS=$(echo "$LINT_OUTPUT" | grep -o "✖ [0-9]* problems" | grep -o "[0-9]*" || echo "0")
        FILES_WITH_ISSUES=$(echo "$LINT_OUTPUT" | grep -c "^/" || echo "0")
        
        echo -e "${YELLOW}⚠️  Found $TOTAL_PROBLEMS linting issues in $FILES_WITH_ISSUES files. Attempting to fix...${NC}"
        npm run lint:fix
        
        # Check again after fixes
        NEW_LINT_OUTPUT=$(npm run lint:check 2>&1 || true)
        
        if echo "$NEW_LINT_OUTPUT" | grep -q "✖.*problems"; then
            NEW_TOTAL=$(echo "$NEW_LINT_OUTPUT" | grep -o "✖ [0-9]* problems" | grep -o "[0-9]*" || echo "0")
            FIXED_COUNT=$((TOTAL_PROBLEMS - NEW_TOTAL))
            
            if [ "$FIXED_COUNT" -gt 0 ]; then
                echo -e "${GREEN}✅ Fixed $FIXED_COUNT issues automatically!${NC}"
            else
                echo -e "${YELLOW}⚠️  No issues could be auto-fixed.${NC}"
            fi
            
            echo -e "${RED}❌ $NEW_TOTAL issues remain after auto-fix.${NC}"
            echo -e "${YELLOW}💡 Most remaining issues are likely unused variables that need manual attention.${NC}"
            exit 1
        else
            echo -e "${GREEN}✅ All linting issues fixed!${NC}"
        fi
    else
        echo -e "${GREEN}✅ All checks passed!${NC}"
    fi
else
    echo -e "${RED}❌ Some files had formatting issues.${NC}"
    echo -e "${YELLOW}💡 This usually means there are syntax errors preventing formatting.${NC}"
    exit 1
fi
