#!/bin/bash

# Git History Cleanup Script
# Removes sensitive keys from git history

echo "🔐 Starting Git History Cleanup for Sensitive Keys..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Function to check if a pattern exists in git history
check_sensitive_keys() {
    echo "🔍 Checking for sensitive keys in git history..."

    # Common sensitive key patterns
    local patterns=(
        "AIzaSy[A-Za-z0-9]{30,}"
        "sk-[a-zA-Z0-9]{40,}"
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\."
        "EAAbYQFp8ZBZCYB[A-Za-z0-9]{100,}"
        "[0-9]{10,}"
        "SUPABASE_.*=.*[A-Za-z0-9]{20,}"
        "WHATSAPP_.*=.*[A-Za-z0-9]{20,}"
        "CLIENT_SECRET=.*[A-Za-z0-9]{20,}"
    )

    for pattern in "${patterns[@]}"; do
        if git log --all --grep="$pattern" -i | grep -q "$pattern"; then
            echo "⚠️  Found potential sensitive data in commit messages"
        fi

        if git rev-list --all | xargs git grep -l "$pattern" 2>/dev/null | head -5; then
            echo "⚠️  Found files containing pattern: $pattern"
            echo "   Run: git filter-branch --tree-filter 'git rm --cached --ignore-unmatch FILENAME' HEAD"
        fi
    done
}

# Remove sensitive files from history
cleanup_history() {
    echo "🧹 Cleaning sensitive files from git history..."

    # Common sensitive files to remove
    local sensitive_files=(
        ".env"
        ".env.local"
        ".env.production"
        "config/keys.json"
        "config/secrets.json"
        "secrets.json"
        "keys.json"
    )

    for file in "${sensitive_files[@]}"; do
        if git log --all --name-only -- "$file" | grep -q "$file"; then
            echo "🗑️  Removing $file from git history..."
            git filter-branch --tree-filter "rm -f $file" --prune-empty HEAD 2>/dev/null || echo "   File not found or already removed"
        fi
    done
}

# Remove sensitive commits by message
cleanup_commits() {
    echo "📝 Cleaning sensitive commits..."

    # Look for commits with sensitive patterns in messages
    local sensitive_commits=$(git log --oneline --all --grep="key\|token\|secret\|password\|api" -i)

    if [ -n "$sensitive_commits" ]; then
        echo "⚠️  Found commits with sensitive keywords:"
        echo "$sensitive_commits"
        echo "   Consider rewriting history with: git rebase -i --root"
    fi
}

# Check current status
echo "📊 Current Repository Status:"
echo "   Branch: $(git branch --show-current)"
echo "   Last commit: $(git log -1 --oneline)"
echo "   Total commits: $(git rev-list --count HEAD)"

# Run checks
check_sensitive_keys
cleanup_history
cleanup_commits

echo "✅ Git History Cleanup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review the changes: git log --oneline"
echo "2. Force push to remote: git push --force-with-lease origin main"
echo "3. Notify team members to re-clone the repository"
echo ""
echo "⚠️  WARNING: This rewrites git history and may affect collaborators!"
echo "   Make sure all team members are aware before proceeding."
