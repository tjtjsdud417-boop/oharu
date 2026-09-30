const {withAndroidManifest, withMainApplication, withDangerousMod} = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

function registerPackage(source) {
  if (source.includes('add(OharuWidgetPackage())')) return source;
  const marker = /PackageList\(this\)\.packages\.apply\s*\{/;
  if (!marker.test(source)) throw new Error('Oharu widget: unsupported MainApplication template; refusing incomplete registration');
  return source.replace(marker, '$&\n          add(OharuWidgetPackage())');
}
function registerReceiver(manifest) {
  const app = manifest.manifest.application?.[0];
  if (!app) throw new Error('Oharu widget: Android application missing');
  app.receiver = app.receiver || [];
  const name = '.OharuWidgetProvider';
  if (!app.receiver.some(item => item.$?.['android:name'] === name)) app.receiver.push({
    $: {'android:name': name, 'android:exported': 'false', 'android:label': '@string/oharu_widget_name'},
    'intent-filter': [{action: [{$: {'android:name': 'android.appwidget.action.APPWIDGET_UPDATE'}}]}],
    'meta-data': [{$: {'android:name': 'android.appwidget.provider', 'android:resource': '@xml/oharu_widget_info'}}],
  });
  return manifest;
}
async function writeWidgetFiles(root, packageName) {
  if (!/^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$/.test(packageName)) throw new Error('Oharu widget: invalid package');
  const templateDir = path.join(__dirname, 'widget');
  for (const [src, dest] of [
    ['OharuWidget.kt', `java/${packageName.replace(/\./g, '/')}/OharuWidget.kt`],
    ['oharu_widget.xml','res/layout/oharu_widget.xml'],
    ['oharu_widget_info.xml','res/xml/oharu_widget_info.xml'],
    ['oharu_widget_background.xml','res/drawable/oharu_widget_background.xml'],
    ['oharu_widget_strings.xml','res/values/oharu_widget_strings.xml'],
  ]) {
    const target = path.join(root, 'app/src/main', dest);
    await fs.mkdir(path.dirname(target), {recursive: true});
    const content = (await fs.readFile(path.join(templateDir,src),'utf8')).replaceAll('__PACKAGE__',packageName);
    await fs.writeFile(target,content,'utf8');
  }
}
function withOharuWidget(config) {
  config = withAndroidManifest(config, c => {c.modResults=registerReceiver(c.modResults);return c;});
  config = withMainApplication(config, c => {
    if (c.modResults.language !== 'kt') throw new Error('Oharu widget requires Kotlin MainApplication');
    c.modResults.contents=registerPackage(c.modResults.contents);return c;
  });
  return withDangerousMod(config, ['android', async c => {
    await writeWidgetFiles(c.modRequest.platformProjectRoot,c.android.package);return c;
  }]);
}
module.exports = withOharuWidget;
module.exports.registerPackage = registerPackage;
module.exports.registerReceiver = registerReceiver;
module.exports.writeWidgetFiles = writeWidgetFiles;
