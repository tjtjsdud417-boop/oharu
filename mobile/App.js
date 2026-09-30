import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Platform, BackHandler, Linking, Alert, Keyboard, AppState, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createReminderService } from './reminders.cjs';
import { createWidgetService } from './widget.cjs';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';

// 모바일 전용 번들. 루트 web/index.html 및 기존 저장 키는 변경하지 않는다.
// mobile=1은 게스트 진입을 허용하고, 미지원 Google/PC 전용 UI는 번들에서 숨긴다.
const APP_HTML = require('./assets/web/app.html');
Notifications.setNotificationHandler({handleNotification: async () => ({shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false})});
const reminders = createReminderService(Notifications, Platform.OS);
const widgets = createWidgetService(Platform.OS === 'android' ? NativeModules.OharuWidget : null);

export default function App() {
  // iOS owns the safe area outside the WebView, including loading/error states.
  // Keep Android's existing layout unchanged. Never add a second HTML inset.
  if (Platform.OS !== 'ios') return <OharuContent />;
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
        <OharuContent />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function OharuContent() {
  const [uri, setUri] = useState(null);
  const [error, setError] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const webviewRef = useRef(null);
  const readyTimer = useRef(null);
  const nativeEvent = (name, detail = {}) => {
    webviewRef.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent(${JSON.stringify(name)}, {detail:${JSON.stringify(detail).replace(/</g, '\\u003c')}}));true;`);
  };
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') nativeEvent('oharu:reminders:resync');
    });
    return () => sub.remove();
  }, []);
  const syncKeyboardUI = (visible = Keyboard.isVisible()) => {
    if (Platform.OS !== 'ios') return;
    // Fixed boolean only: no user input, tokens, or arbitrary bridge commands.
    webviewRef.current?.injectJavaScript(
      `document.documentElement.dataset.keyboardOpen = '${visible ? '1' : '0'}'; true;`
    );
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', () => syncKeyboardUI(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => syncKeyboardUI(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const clearReadyTimer = () => {
    if (readyTimer.current) clearTimeout(readyTimer.current);
    readyTimer.current = null;
  };
  const fail = () => {
    clearReadyTimer();
    setError('화면을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
  };
  const retry = () => {
    clearReadyTimer();
    setError(null);
    setUri(null);
    setCanGoBack(false);
    setAttempt((value) => value + 1);
  };
  const openExternal = (url) => {
    if (!/^https:\/\//i.test(url) && !/^mailto:/i.test(url)) return;
    Linking.openURL(url).catch(() => Alert.alert('링크를 열지 못했어요', '잠시 후 다시 시도해주세요.'));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const asset = Asset.fromModule(APP_HTML);
        await asset.downloadAsync();
        if (!asset.localUri) throw new Error('Missing bundled HTML');
        if (active) setUri(`${asset.localUri}?mobile=1${Platform.OS === 'ios' ? '&nativePlatform=ios' : ''}`);
      } catch (e) {
        if (active) fail();
      }
    })();
    return () => { active = false; clearReadyTimer(); };
  }, [attempt]);

  useEffect(() => {
    if (uri && !error) readyTimer.current = setTimeout(fail, 25000);
    return clearReadyTimer;
  }, [uri, error]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>오하루를 열지 못했어요</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#3182F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        key={attempt}
        ref={webviewRef}
        source={{ uri }}
        style={styles.webview}
        onLoad={() => { if (Platform.OS === 'ios') syncKeyboardUI(); }}
        {...(Platform.OS === 'ios' ? {
          // The native SafeAreaView already bounds the entire scroll viewport.
          automaticallyAdjustContentInsets: false,
          contentInsetAdjustmentBehavior: 'never',
        } : {})}
        onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
        onShouldStartLoadWithRequest={({ url }) => {
          if (url === 'about:blank' || url.split('#')[0] === uri) return true;
          openExternal(url);
          return false;
        }}
        onOpenWindow={({ nativeEvent }) => openExternal(nativeEvent.targetUrl)}
        onError={fail}
        onRenderProcessGone={fail}
        onContentProcessDidTerminate={fail}
        onMessage={({ nativeEvent: event }) => {
          // Only the bundled top-level page can request the restricted notification API.
          if (typeof event.url !== 'string' || event.url.split('#')[0] !== uri) return;
          if (event.data === 'oharu:ready') { clearReadyTimer(); nativeEvent('oharu:reminders:resync'); }
          else if (event.data === 'oharu:unsupported-webview') {
            clearReadyTimer();
            setError('Android System WebView 또는 Chrome을 최신 버전으로 업데이트한 뒤 다시 실행해 주세요. 이 버전에서는 안전한 앱 연결을 사용할 수 없어요.');
          }
          else if (event.data === 'oharu:boot-error') fail();
          else {
            let type;
            try { if (event.data.length <= 512000) type = JSON.parse(event.data).type; } catch { return; }
            if (type === 'oharu:widgets:sync') widgets.handle(event.data).then(result => nativeEvent('oharu:native-widgets', result));
            else reminders.handle(event.data).then(result => nativeEvent('oharu:native-reminders', result));
          }
        }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6' },
  webview: { flex: 1, backgroundColor: '#F2F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F6' },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#191F28', marginBottom: 12 },
  errorText: { color: '#4E5968', textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 },
  retryButton: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: '#3182F6', borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
