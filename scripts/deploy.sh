#!/bin/bash

# Deploy script for BracketBear websites
# This script ensures all quality checks pass before deploying

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Netlify CLI is installed
check_netlify_cli() {
    if ! command -v netlify &> /dev/null; then
        # Check if it's installed locally
        if [ -f "./node_modules/.bin/netlify" ]; then
            # Use local installation
            NETLIFY_CMD="./node_modules/.bin/netlify"
        else
            print_error "Netlify CLI is not installed. Please install it first:"
            echo "npm install -g netlify-cli"
            echo "or"
            echo "npm install netlify-cli --save-dev"
            exit 1
        fi
    else
        NETLIFY_CMD="netlify"
    fi
}

# Function to check if user is authenticated with Netlify
check_netlify_auth() {
    if ! $NETLIFY_CMD status &> /dev/null; then
        print_error "Not authenticated with Netlify. Please run:"
        echo "$NETLIFY_CMD login"
        exit 1
    fi
}

# Function to run quality checks
run_quality_checks() {
    print_status "Running quality checks..."
    
    print_status "Running tests..."
    npm run test
    
    print_status "Running linting..."
    npm run lint:check
    
    print_status "Running type checking..."
    npm run type-check
    
    print_success "All quality checks passed!"
}

# Function to deploy a specific site
deploy_site() {
    local site_name=$1
    local site_path=$2
    local dist_path=$3
    
    print_status "Deploying $site_name..."
    
    # Change to the site directory
    cd "$site_path"
    
    # Build the site
    print_status "Building $site_name..."
    npm run build
    
    # Deploy to Netlify
    print_status "Deploying $site_name to Netlify..."
    $NETLIFY_CMD deploy --prod --dir="$dist_path"
    
    print_success "$site_name deployed successfully!"
    
    # Return to root directory
    cd - > /dev/null
}

# Main deployment function
main() {
    local target=${1:-"all"}
    
    # Show help if requested
    if [ "$target" = "--help" ] || [ "$target" = "-h" ]; then
        echo "Usage: $0 [target]"
        echo ""
        echo "Targets:"
        echo "  portfolio     Deploy the portfolio website"
        echo "  bracketbear   Deploy the bracketbear website"
        echo "  all           Deploy all websites (default)"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 portfolio"
        echo "  $0 bracketbear"
        echo "  $0 all"
        exit 0
    fi
    
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_netlify_cli
    check_netlify_auth
    
    # Run quality checks
    run_quality_checks
    
    case $target in
        "portfolio")
            deploy_site "Portfolio" "apps/portfolio" "dist"
            ;;
        "bracketbear")
            deploy_site "BracketBear Website" "apps/bracketbear-website" "dist"
            ;;
        "all")
            print_status "Deploying all sites..."
            deploy_site "Portfolio" "apps/portfolio" "dist"
            deploy_site "BracketBear Website" "apps/bracketbear-website" "dist"
            print_success "All sites deployed successfully!"
            ;;
        *)
            print_error "Invalid target. Use: portfolio, bracketbear, or all"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
