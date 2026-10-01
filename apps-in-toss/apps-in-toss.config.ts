import { defineConfig } from '@apps-in-toss/web-framework/config';
// Candidate only: confirm the immutable appName in the console before upload.
export default defineConfig({
  appName: 'oharu', brand: { primaryColor: '#2b76f3' }, permissions: [],
  navigationBar: { withBackButton: true, withHomeButton: false, withTitle: true, theme: 'light' },
  webView: { bounces: false, pullToRefreshEnabled: false }, webBundleDir: 'dist',
});
