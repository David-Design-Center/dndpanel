#!/bin/bash

# Script to apply Supabase migrations for Google Drive integration
# Run this when Docker is available

echo "🚀 Starting Supabase local development..."

# Start Supabase services
npx supabase start

echo "📊 Applying migrations..."

# Reset database with new migrations
npx supabase db reset

echo "✅ Shipments table and Google Drive integration setup complete!"
echo ""
echo "📋 Sample data has been added:"
echo "  - 5 sample shipments with different statuses"
echo "  - Table: shipments, shipment_documents (for Google Drive metadata)"
echo ""
echo "⚠️  IMPORTANT: Google Drive integration requires additional setup!"
echo "📖 Please read: README/GOOGLE_DRIVE_SETUP.md"
echo ""
echo "🌐 After completing Google Drive setup, you can:"
echo "  1. View the shipments panel in your app"
echo "  2. Upload documents directly to Google Drive"
echo "  3. Download and delete uploaded documents"
echo ""
echo "💡 The UI is ready - just complete the Google auth integration!"
