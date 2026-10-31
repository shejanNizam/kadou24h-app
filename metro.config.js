// Sentry's Expo config adds debug ids to the bundle, so errors show the real source lines
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
