#!/bin/bash

# Comprehensive pre-merge/rebase check script
# This script runs all necessary checks before merging or rebasing into dev

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run a check and handle results
run_check() {
    local check_name=$1
    local command=$2
    local required=$3  # "required" or "optional"
    
    print_status $BLUE "🔍 Running $check_name..."
    
    if eval "$command"; then
        print_status $GREEN "✅ $check_name passed"
        return 0
    else
        if [ "$required" = "required" ]; then
            print_status $RED "❌ $check_name failed (REQUIRED)"
            return 1
        else
            print_status $YELLOW "⚠️  $check_name failed (OPTIONAL)"
            return 0
        fi
    fi
}

# Start the comprehensive check
print_status $PURPLE "🚀 Starting comprehensive pre-merge/rebase checks..."
print_status $CYAN "📋 This will run all quality checks before merging into dev branch"
echo

# Track overall success
OVERALL_SUCCESS=true

# 1. Code Formatting Check
print_status $BLUE "📝 STEP 1: Code Formatting"
if ! run_check "Prettier formatting check" "npm run format:check" "required"; then
    print_status $YELLOW "💡 Run 'npm run format' to fix formatting issues"
    OVERALL_SUCCESS=false
fi
echo

# 2. Linting Check
print_status $BLUE "🔍 STEP 2: Code Linting"
if ! run_check "ESLint check" "npm run lint:check" "required"; then
    print_status $YELLOW "💡 Run 'npm run lint:fix' to fix linting issues"
    OVERALL_SUCCESS=false
fi
echo

# 3. TypeScript Type Checking
print_status $BLUE "📘 STEP 3: TypeScript Type Checking"
if ! run_check "TypeScript type check" "npm run type-check" "required"; then
    print_status $YELLOW "💡 Fix TypeScript errors before proceeding"
    OVERALL_SUCCESS=false
fi
echo

# 4. Test Suite
print_status $BLUE "🧪 STEP 4: Test Suite"
if ! run_check "Test suite" "npm run test:run" "required"; then
    print_status $YELLOW "💡 Fix failing tests before proceeding"
    OVERALL_SUCCESS=false
fi
echo

# 5. Build Check
print_status $BLUE "🏗️  STEP 5: Build Verification"
if ! run_check "Build check" "npm run build" "required"; then
    print_status $YELLOW "💡 Fix build errors before proceeding"
    OVERALL_SUCCESS=false
fi
echo

# 6. CSS Pattern Analysis (Optional but recommended)
print_status $BLUE "🎨 STEP 6: CSS Pattern Analysis"
run_check "CSS pattern analysis" "npm run scan:css" "optional"
echo

# 7. Storybook Build Check (Optional)
print_status $BLUE "📚 STEP 7: Storybook Build"
run_check "Storybook build" "npm run build-storybook" "optional"
echo

# 8. Dependency Check
print_status $BLUE "📦 STEP 8: Dependency Check"
if ! run_check "Dependency audit" "npm audit --audit-level=high" "required"; then
    print_status $YELLOW "💡 Run 'npm audit fix' to address security vulnerabilities"
    OVERALL_SUCCESS=false
fi
echo

# 9. Package.json Validation
print_status $BLUE "📋 STEP 9: Package Validation"
if ! run_check "Package.json validation" "npm run --dry-run" "required"; then
    print_status $YELLOW "💡 Fix package.json issues"
    OVERALL_SUCCESS=false
fi
echo

# 10. Git Status Check
print_status $BLUE "📁 STEP 10: Git Status Check"
if ! run_check "Git status check" "git status --porcelain | wc -l | grep -q '^0$'" "required"; then
    print_status $YELLOW "💡 Commit or stash uncommitted changes"
    OVERALL_SUCCESS=false
fi
echo

# Final Results
print_status $PURPLE "🏁 CHECK COMPLETE"
echo

if [ "$OVERALL_SUCCESS" = true ]; then
    print_status $GREEN "🎉 ALL CHECKS PASSED!"
    print_status $GREEN "✅ Safe to merge/rebase into dev branch"
    print_status $CYAN "🚀 You can now proceed with your merge or rebase"
    exit 0
else
    print_status $RED "❌ SOME CHECKS FAILED!"
    print_status $RED "🚫 Please fix the issues above before merging/rebase into dev"
    print_status $YELLOW "💡 Run this script again after fixing the issues"
    exit 1
fi
