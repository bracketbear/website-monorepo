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

# Function to create git tag for release
create_release_tag() {
    local version=$1
    
    print_status "Creating release tag v$version..."
    
    # Check if tag already exists
    if git tag -l "v$version" | grep -q "v$version"; then
        print_warning "Tag v$version already exists. Skipping tag creation."
        return 0
    fi
    
    # Create and push tag
    git tag -a "v$version" -m "Release v$version"
    git push origin "v$version"
    
    print_success "Release tag v$version created and pushed!"
}

# Function to rollback to previous tag
rollback_to_previous() {
    print_status "Rolling back to previous release..."
    
    # Get the latest two tags
    local tags=($(git tag --sort=-version:refname | head -2))
    
    if [ ${#tags[@]} -lt 2 ]; then
        print_error "No previous release found to rollback to."
        exit 1
    fi
    
    local current_tag=${tags[0]}
    local previous_tag=${tags[1]}
    
    print_status "Rolling back from $current_tag to $previous_tag..."
    
    # Checkout the previous tag
    git checkout "$previous_tag"
    
    # Deploy the previous version using the deploy script directly
    print_status "Deploying previous version..."
    ./scripts/deploy.sh "$1"
    
    print_success "Successfully rolled back to $previous_tag"
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
        echo "  rollback      Rollback to previous release"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 portfolio"
        echo "  $0 bracketbear"
        echo "  $0 all"
        echo "  $0 rollback"
        exit 0
    fi
    
    # Handle rollback command
    if [ "$target" = "rollback" ]; then
        rollback_to_previous "all"
        return 0
    fi
    
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_netlify_cli
    check_netlify_auth
    
    # Run quality checks
    run_quality_checks
    
    # Get version from package.json
    local version=$(node -p "require('./package.json').version")
    
    case $target in
        "portfolio")
            deploy_site "Portfolio" "apps/portfolio" "dist"
            create_release_tag "$version"
            ;;
        "bracketbear")
            deploy_site "BracketBear Website" "apps/bracketbear-website" "dist"
            create_release_tag "$version"
            ;;
        "all")
            print_status "Deploying all sites..."
            deploy_site "Portfolio" "apps/portfolio" "dist"
            deploy_site "BracketBear Website" "apps/bracketbear-website" "dist"
            print_success "All sites deployed successfully!"
            create_release_tag "$version"
            ;;
        *)
            print_error "Invalid target. Use: portfolio, bracketbear, all, or rollback"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
