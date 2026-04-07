#!/bin/bash
echo "Starting deployment..."

# Install dependencies
composer install --optimize-autoloader

# Create missing folders
mkdir -p storage/logs
mkdir -p storage/uploads
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p bootstrap/cache
mkdir -p resources/lang

# Set permissions
chmod -R 775 storage
chmod -R 775 bootstrap/cache
chmod -R 775 resources/lang

# Laravel setup
php artisan storage:link
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache

echo "Deployment complete!"