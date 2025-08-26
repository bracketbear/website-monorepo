#!/bin/bash

# Enhanced format script with interactive fixes
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to ask yes/no questions
ask_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    
    if [[ "$default" == "y" ]]; then
        prompt="$prompt [Y/n]: "
    else
        prompt="$prompt [y/N]: "
    fi
    
    while true; do
        read -p "$prompt" yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            "" ) if [[ "$default" == "y" ]]; then return 0; else return 1; fi;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

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
        echo -e "${YELLOW}⚠️  Linting issues found.${NC}"
        
        # Parse and summarize the linting issues
        echo -e "${BLUE}📊 Linting Summary:${NC}"
        
        # Count total problems
        TOTAL_PROBLEMS=$(echo "$LINT_OUTPUT" | grep -o "✖ [0-9]* problems" | grep -o "[0-9]*" || echo "0")
        ERRORS=$(echo "$LINT_OUTPUT" | grep -o "[0-9]* errors" | grep -o "[0-9]*" || echo "0")
        WARNINGS=$(echo "$LINT_OUTPUT" | grep -o "[0-9]* warnings" | grep -o "[0-9]*" || echo "0")
        
        echo -e "   • Total issues: ${YELLOW}$TOTAL_PROBLEMS${NC} (${RED}$ERRORS${NC} errors, ${YELLOW}$WARNINGS${NC} warnings)"
        
        # Count files with issues
        FILES_WITH_ISSUES=$(echo "$LINT_OUTPUT" | grep -c "^/" || echo "0")
        echo -e "   • Files affected: ${YELLOW}$FILES_WITH_ISSUES${NC}"
        
        # Show most common issue types
        echo -e "   • Common issues:"
        echo "$LINT_OUTPUT" | grep -o "@typescript-eslint/[a-zA-Z-]*" | sort | uniq -c | sort -nr | head -3 | while read count rule; do
            echo -e "     - ${YELLOW}$rule${NC} ($count occurrences)"
        done
        
        echo ""
        
        if ask_yes_no "Would you like to attempt automatic fixes?" "y"; then
            echo -e "${BLUE}🔧 Running ESLint with --fix...${NC}"
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
                
                echo -e "${YELLOW}⚠️  $NEW_TOTAL issues remain (manual review needed).${NC}"
                echo -e "${BLUE}💡 Most remaining issues are likely unused variables that need manual attention.${NC}"
                
                if ask_yes_no "Would you like to see the remaining issues?" "n"; then
                    echo -e "${BLUE}📋 Remaining linting issues:${NC}"
                    echo "$NEW_LINT_OUTPUT"
                fi
            else
                echo -e "${GREEN}✅ All linting issues fixed!${NC}"
            fi
        else
            echo -e "${YELLOW}💡 Run 'npm run lint:fix' to attempt automatic fixes.${NC}"
            echo -e "${BLUE}💡 For unused variables, prefix with '_' or remove the variable.${NC}"
        fi
    else
        echo -e "${GREEN}✅ All checks passed!${NC}"
    fi
else
    echo -e "${RED}❌ Some files had formatting issues.${NC}"
    echo -e "${YELLOW}💡 This usually means there are syntax errors preventing formatting.${NC}"
    
    if ask_yes_no "Would you like to see the detailed error output?" "y"; then
        echo -e "${BLUE}📋 Running Prettier again with verbose output...${NC}"
        npx prettier --write .
    fi
    
    exit 1
fi
