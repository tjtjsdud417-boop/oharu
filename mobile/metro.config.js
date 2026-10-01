const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// require('./assets/web/app.html')가 정적 자산으로 취급되도록 확장자를 등록한다.
// (기본 Metro 설정은 .html을 자산 확장자로 인식하지 않는다.)
config.resolver.assetExts.push('html');

module.exports = config;
