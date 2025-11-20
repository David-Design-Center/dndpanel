/**
 * Centralized Provider Exports
 * 
 * This module provides organized access to all context providers in the app.
 * Providers are split into two categories:
 * 
 * 1. CoreProviders - Global app-level providers (Security, Auth, Profile, etc.)
 * 2. FeatureProviders - Feature-specific providers (Email, Contacts, Layout, etc.)
 * 
 * Usage:
 * - Import CoreProviders in main.tsx to wrap the entire app
 * - Import FeatureProviders in App.tsx to wrap authenticated routes
 */

export { CoreProviders } from './CoreProviders';
export { FeatureProviders } from './FeatureProviders';
