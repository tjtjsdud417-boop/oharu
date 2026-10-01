// Preparation only: returns a reviewable plan. Never writes config, registers an
// Apple resource, runs Xcode, or enables an entitlement in the release app.
const draft = require('./integration.json');
function prepareIntegration({hostBundleIdentifier, approvedAppGroupIdentifier, version, buildNumber}) {
  if (hostBundleIdentifier !== draft.hostBundleIdentifier) throw Error('wrong-host');
  if (typeof approvedAppGroupIdentifier !== 'string' || !/^group\.[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)+$/.test(approvedAppGroupIdentifier)) throw Error('approved-app-group-required');
  if (!/^\d+\.\d+\.\d+$/.test(version || '') || !/^\d+$/.test(String(buildNumber || ''))) throw Error('invalid-version');
  const entitlement = {'com.apple.security.application-groups': [approvedAppGroupIdentifier]};
  return {
    status: 'prepared-not-applied', requiresAppleProvisioningVerification: true,
    host: {bundleIdentifier: hostBundleIdentifier, sourceFiles: [...draft.hostModuleSourceFiles], infoPlist: {OharuWidgetAppGroup: approvedAppGroupIdentifier}, entitlements: structuredClone(entitlement)},
    extension: {targetName: draft.targetName, bundleIdentifier: draft.proposedExtensionBundleIdentifier,
      sourceFiles: [...draft.extensionSourceFiles], infoPlistTemplate: 'extension/Info.plist',
      infoPlist: {OharuWidgetAppGroup: approvedAppGroupIdentifier}, entitlements: structuredClone(entitlement),
      buildSettings: {IPHONEOS_DEPLOYMENT_TARGET: draft.deploymentTarget, SWIFT_VERSION: '5.0', APPLICATION_EXTENSION_API_ONLY: 'YES', SKIP_INSTALL: 'YES', MARKETING_VERSION: version, CURRENT_PROJECT_VERSION: String(buildNumber)}},
    embed: {hostBundleIdentifier, targetName: draft.targetName, destination: 'PlugIns'},
    activationBlockedUntil: [...draft.requires],
  };
}
module.exports = {prepareIntegration};
