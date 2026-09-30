// This release uses LOCAL notifications only. The upstream cross-platform plugin
// adds the APNs entitlement even for local-only apps; avoid requesting a new Apple
// push capability/provisioning profile. iOS needs only library autolinking here.
// Android configuration stays identical to this pinned Expo SDK's official plugin.
const {withNotificationsAndroid} = require('expo-notifications/plugin/build/withNotificationsAndroid');
const {createRunOncePlugin} = require('@expo/config-plugins');
const pkg = require('expo-notifications/package.json');
// Register the official plugin name too, so Expo's automatic legacy-plugin pass
// cannot reapply the APNs default after this local-only configuration.
module.exports = createRunOncePlugin((config) => withNotificationsAndroid(config, {defaultChannel:'todo-reminders'}), pkg.name, pkg.version);
