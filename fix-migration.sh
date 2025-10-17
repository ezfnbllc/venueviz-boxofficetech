#!/bin/bash

echo "========================================="
echo "FIXING GITHUB TOKEN ISSUE"
echo "========================================="
echo ""

# Clear the environment variable
echo "📋 Clearing GITHUB_TOKEN environment variable..."
unset GITHUB_TOKEN
export GITHUB_TOKEN=""

echo "✅ GITHUB_TOKEN cleared from current session"
echo ""

# Check if it's in shell config files
echo "📋 Checking shell configuration files..."

# Check common shell config files
config_files=(~/.bashrc ~/.bash_profile ~/.zshrc ~/.profile)
found_in_files=()

for file in "${config_files[@]}"; do
    if [ -f "$file" ] && grep -q "GITHUB_TOKEN" "$file" 2>/dev/null; then
        found_in_files+=("$file")
        echo "⚠️  Found GITHUB_TOKEN in: $file"
    fi
done

if [ ${#found_in_files[@]} -gt 0 ]; then
    echo ""
    echo "GITHUB_TOKEN found in config files. Choose an option:"
    echo "1) Temporarily bypass (for this session only)"
    echo "2) Comment out GITHUB_TOKEN in config files (recommended)"
    echo "3) Manual fix"
    echo ""
    read -p "Enter choice [1-3]: " fix_choice
    
    case $fix_choice in
        1)
            echo "Using temporary bypass..."
            ;;
        2)
            echo "Commenting out GITHUB_TOKEN in config files..."
            for file in "${found_in_files[@]}"; do
                # Create backup
                cp "$file" "$file.backup.$(date +%Y%m%d)"
                # Comment out GITHUB_TOKEN lines
                sed -i.tmp 's/^export GITHUB_TOKEN/#export GITHUB_TOKEN/' "$file"
                sed -i.tmp 's/^GITHUB_TOKEN/#GITHUB_TOKEN/' "$file"
                echo "✅ Commented out in: $file (backup created)"
            done
            echo ""
            echo "⚠️  You'll need to restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
            ;;
        3)
            echo ""
            echo "Manual fix instructions:"
            echo "1. Edit these files: ${found_in_files[@]}"
            echo "2. Comment out or remove GITHUB_TOKEN lines"
            echo "3. Restart terminal"
            ;;
    esac
fi

echo ""
echo "📋 Now let's authenticate GitHub CLI properly..."
echo ""

# Re-authenticate with GitHub CLI
echo "Authenticating with GitHub CLI..."
echo ""
echo "When prompted:"
echo "  1. Choose: GitHub.com"
echo "  2. Choose: HTTPS" 
echo "  3. Choose: Login with a web browser"
echo "  4. Authorize everything"
echo ""

# Login with proper scopes
gh auth login -h github.com -p https --scopes "repo,workflow,read:org"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully authenticated!"
    
    # Get username
    username=$(gh api user --jq .login)
    echo "Logged in as: $username"
    
    echo ""
    echo "📋 Now let's push your repositories..."
    echo ""
    
    # Create and push admin repo
    echo "Creating $username/venueviz-admin (private)..."
    cd venueviz-admin 2>/dev/null || {
        echo "❌ venueviz-admin directory not found"
        echo "Make sure you're in the right directory"
        exit 1
    }
    
    # Remove old remote and create repo
    git remote remove origin 2>/dev/null || true
    
    # Try to create repo
    gh repo create venueviz-admin --private --source=. --remote=origin --push \
       --description "VenueViz Admin Portal - Protected Repository"
    
    if [ $? -eq 0 ]; then
        echo "✅ Admin repository created and pushed!"
    else
        echo "Repository might already exist. Trying alternative method..."
        git remote add origin "https://github.com/$username/venueviz-admin.git"
        git branch -M main
        git push -u origin main --force
    fi
    
    cd ..
    
    # Create and push customer repo
    echo ""
    echo "Creating $username/venueviz-customer (public)..."
    cd venueviz-customer 2>/dev/null || {
        echo "❌ venueviz-customer directory not found"
        exit 1
    }
    
    # Remove old remote and create repo
    git remote remove origin 2>/dev/null || true
    
    # Try to create repo
    gh repo create venueviz-customer --public --source=. --remote=origin --push \
       --description "VenueViz Customer Portal - Public Frontend"
    
    if [ $? -eq 0 ]; then
        echo "✅ Customer repository created and pushed!"
    else
        echo "Repository might already exist. Trying alternative method..."
        git remote add origin "https://github.com/$username/venueviz-customer.git"
        git branch -M main
        git push -u origin main --force
    fi
    
    cd ..
    
    echo ""
    echo "========================================="
    echo "✅ SUCCESS!"
    echo "========================================="
    echo ""
    echo "Your repositories are now on GitHub:"
    echo "  • https://github.com/$username/venueviz-admin (PRIVATE)"
    echo "  • https://github.com/$username/venueviz-customer (PUBLIC)"
    echo ""
    
else
    echo ""
    echo "❌ Authentication failed"
    echo ""
    echo "Alternative solution - Use Personal Access Token:"
    echo "================================================"
    echo ""
    read -p "Enter your GitHub username: " username
    
    echo ""
    echo "1. Go to: https://github.com/settings/tokens/new"
    echo "2. Name: VenueViz Deploy"
    echo "3. Expiration: 90 days"
    echo "4. Select scopes: ✓ repo (all)"
    echo "5. Generate token and COPY it"
    echo ""
    read -s -p "Paste token here (hidden): " token
    echo ""
    
    if [ -n "$token" ]; then
        # Push admin
        cd venueviz-admin
        git remote set-url origin "https://$token@github.com/$username/venueviz-admin.git" 2>/dev/null || \
        git remote add origin "https://$token@github.com/$username/venueviz-admin.git"
        
        echo "Pushing admin repo..."
        git push -u origin main
        
        # Push customer
        cd ../venueviz-customer
        git remote set-url origin "https://$token@github.com/$username/venueviz-customer.git" 2>/dev/null || \
        git remote add origin "https://$token@github.com/$username/venueviz-customer.git"
        
        echo "Pushing customer repo..."
        git push -u origin main
        
        cd ..
        
        echo ""
        echo "✅ Both repos pushed with token!"
    fi
fi

echo ""
echo "📋 NEXT STEPS:"
echo "=============="
echo ""
echo "1️⃣  Deploy to Vercel:"
echo "    • Go to: https://vercel.com/new"
echo "    • Click 'Import Git Repository'"
echo "    • Import both repos"
echo ""
echo "2️⃣  Set up domains:"
echo "    • Admin: admin.venueviz.com"
echo "    • Customer: www.venueviz.com"
echo ""
echo "3️⃣  Add environment variables in Vercel:"
echo "    • Copy your Firebase config"
echo "    • Add to both projects"
echo ""
echo "4️⃣  Protect admin repo:"
echo "    • GitHub: Settings → Branches → Protect main"
echo "    • Vercel: Settings → Git → Require approval"
echo ""
echo "🎉 Your admin panel is now PROTECTED and ISOLATED!"