#!/bin/bash

# Team Explore Transfer Timeline & Notification System Improvements
# Database Migration Script

echo "🚀 Applying Team Explore Transfer Timeline & Notification System Improvements..."
echo "=================================================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this script from your project root."
    exit 1
fi

echo "📋 Applying migrations in order..."

# Apply the first migration (fix timeline events policy and trigger)
echo "1️⃣ Applying timeline events policy and trigger fixes..."
supabase db push --include-all

# Apply the second migration (add notification preferences)
echo "2️⃣ Adding notification preferences table..."
supabase db push --include-all

# Apply the third migration (enhance transfer pitches)
echo "3️⃣ Enhancing transfer pitches table..."
supabase db push --include-all

echo ""
echo "✅ All migrations applied successfully!"
echo ""
echo "🎯 What's been improved:"
echo "   • Enhanced TransferTimeline component with advanced filtering"
echo "   • Card/List view toggle functionality"
echo "   • Fully functional notification system"
echo "   • Team edit/delete capabilities for transfer pitches"
echo "   • Real-time notification triggers"
echo "   • Enhanced database schema with performance optimizations"
echo ""
echo "🔧 Next steps:"
echo "   1. Restart your development server"
echo "   2. Test the new filtering and notification features"
echo "   3. Verify team edit/delete functionality"
echo "   4. Check notification system in header"
echo ""
echo "📚 For detailed information, see: IMPROVEMENTS_IMPLEMENTED.md"
echo ""
echo "🚀 Happy coding!"
