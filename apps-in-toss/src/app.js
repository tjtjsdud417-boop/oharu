import { initialize, reportFailure } from './adapter.js';

/* ═══════════════════════════════════════════════
   설정 — Supabase 프로젝트의 두 값을 채우면
   "로그인 필수 + 클라우드 저장" 서비스 모드가 됩니다.
   비워두면 로그인 없는 로컬 모드(개발 미리보기용).
   anon key는 클라이언트 공개용 키 — RLS가 진짜 잠금장치.
   ═══════════════════════════════════════════════ */
const SUPABASE_URL = "";      // 예: "https://xxxx.supabase.co"
const SUPABASE_ANON_KEY = ""; // Project Settings > API > anon public

const CLOUD = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
// 데스크톱(Electron) 앱은 URL에 ?desktop=1을 붙여 로드한다: 로그인 필수 + 구글 버튼 숨김
const IS_DESKTOP = new URLSearchParams(location.search).get("desktop") === "1";
const URL_LANGS = new Set(["ko", "en", "ja", "zh", "es"]);
const urlLangParam = new URLSearchParams(location.search).get("lang");

// ── UI 저장 / 다국어 ─────────────────────────────
const UIKEY = "oharu.ui";
const loadUI = () => ({ lang: "ko" });
const saveUI = () => {};

const T = {
  ko: {
    title: "오하루 — 오늘 할 일",
    authBrand: "오하루",
    authSub: "오늘 할 일에만 집중하는<br>가장 단순한 투두리스트",
    googleBtn: "구글로 계속하기",
    authDivider: "또는 이메일로",
    emailPh: "이메일 주소",
    pwPh: "비밀번호 (6자 이상)",
    loginBtn: "로그인",
    signupBtn: "가입하기",
    backLink: "← 돌아가기",
    switchLogin: '처음이신가요? <a id="switchLink">이메일로 가입하기</a>',
    switchSignup: '이미 계정이 있나요? <a id="switchLink">로그인하기</a>',
    migrateHint: "지금까지 적은 할 일은 로그인하면 계정으로 그대로 옮겨드려요.",
    errEmail: "이메일 주소를 확인해주세요.",
    errPw: "비밀번호는 6자 이상이어야 해요.",
    errLogin: "이메일 또는 비밀번호가 맞지 않아요.",
    errRegistered: "이미 가입된 이메일이에요. 로그인해주세요.",
    errSignup: "가입에 실패했어요. 잠시 후 다시 시도해주세요.",
    msgConfirm: "확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해주세요 ✉️",
    errGoogle: "구글 로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
    errGoogleStart: "구글 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.",
    msgGoogleBrowser: "브라우저에서 구글 로그인을 완료해주세요. 끝나면 자동으로 돌아와요.",
    errGoogleDesktop: "이 버전에서는 구글 로그인을 지원하지 않아요. 이메일로 로그인해주세요.",
    errGoogleFinish: "로그인 마무리에 실패했어요. 다시 시도해주세요.",
    previewSupabase: "Supabase 연결(파일 상단 설정) 후에 실제 로그인이 활성화돼요.",
    headlineEmpty: "오늘은 어떤 하루인가요?",
    headlineDone: "오늘 할 일을 다 끝냈어요 🎉",
    headlineLeft: '할 일이 <span class="num">{n}개</span> 남았어요',
    inputPh: "오늘 할 일을 적어보세요",
    addBtn: "추가",
    clockTitle: "시간 설정 (선택)",
    clockClearTitle: "시간 해제",
    emptyState: "아직 등록한 일이 없어요.<br>가장 중요한 일 하나부터 적어보세요.",
    overdue: " · 지남",
    todaySuffix: " · 오늘",
    noRecords: "이 날은 기록이 없어요",
    nudgeText: "오하루는 오늘 할 일에만 집중하는 투두리스트예요.<br>할 일이 이 기기에만 저장되고 있어요.<br>로그인하면 폰·PC 어디서든 이어져요.",
    calBtnTitle: "목록 보기",
    calBtnAria: "달력으로 전체 보기",
    setBtnTitle: "설정",
    setBtnAria: "설정",
    delAria: "삭제",
    setAccount: "계정",
    guestMode: '게스트 모드 <span class="sub">· 이 기기에만 저장</span>',
    logout: "로그아웃",
    login: "로그인",
    signedIn: "로그인됨",
    setDisplay: "화면",
    bgAlpha: "배경 투명도",
    setLang: "언어",
    langAuto: "자동",
    langKo: "한국어",
    langEn: "English",
    setWidget: "위젯",
    alwaysOnTop: "항상 위에 고정",
    autoLaunch: "PC 시작 시 자동 실행",
    quitAppLabel: "앱 종료",
    quitBtn: "종료",
    setAbout: "정보",
    version: "버전",
    privacy: "개인정보처리방침",
    view: "보기",
    oharuWeb: "오하루 웹",
    contact: "문의",
    logoAria: "오하루 로고",
    installTitle: "윈도우 바탕화면에 설치하기",
    installSub: "항상 위에 떠 있는 투두 위젯",
    pcWidget: "PC 위젯",
    download: "다운로드",
    langJa: "日本語",
    langZh: "中文",
    langEs: "Español",
    futurePh: "이 날 할 일을 적어보세요",
    seoLine: "오하루 — 오늘 할 일에만 집중하는 무료 투두리스트 · 웹과 윈도우 위젯 지원",
    carryTitle: "지난 할 일 {n}개가 남아있어요",
    carryBring: "오늘로 가져오기",
    carryDismiss: "괜찮아요",
    setMcpTitle: "AI 연동",
    mcpLoginRequired: "로그인하면 호환되는 MCP 클라이언트용 개인 토큰을 관리할 수 있어요. 서비스별 연결 지원 범위를 먼저 확인해주세요. 테마 JSON 만들기는 로그인 없이 아래에서 사용할 수 있어요.",
    mcpDesc: "개인 토큰 발급은 AI 연결 성공을 뜻하지 않아요. 호환되는 MCP 클라이언트에서만 사용하고, 토큰이 들어간 주소를 공개하지 마세요. ChatGPT 공개 앱용 OAuth 연결은 아직 준비 중이에요. 별도 API 키 없는 테마 JSON 방식은 아래에서 사용할 수 있어요.",
    mcpCreateBtn: "토큰 발급",
    mcpRevokeBtn: "폐기",
    mcpRevokeConfirm: "이 토큰을 폐기할까요? 연결된 AI에서 더 이상 오하루에 접근할 수 없어요.",
    mcpRevokeFailed: "폐기에 실패했어요. 잠시 후 다시 시도해주세요.",
    mcpCreateFailed: "발급에 실패했어요. 잠시 후 다시 시도해주세요.",
    mcpCreatedAt: "발급",
    mcpLastUsed: "최근 사용",
    mcpNamePh: "연동할 AI",
    mcpTokenWarn: "이 화면을 벗어나면 다시 볼 수 없어요. 지금 복사해서 안전한 곳에 붙여넣으세요.",
    mcpUrlWithTokenLabel: "개인 토큰 포함 주소 (호환성을 확인한 클라이언트 전용)",
    mcpUrlLabel: "서버 주소 (클라이언트의 공식 인증 방식을 확인하세요)",
    mcpTokenLabel: "토큰",
    mcpCopyBtn: "복사",
    mcpCopied: "복사됨",
    mcpCloseBtn: "닫기",
    mcpOptClaude: "클로드",
    mcpOptChatgpt: "챗지피티",
    mcpOptGemini: "제미나이",
    mcpOptOther: "호환 MCP 클라이언트",
  },
  en: {
    title: "Oharu — Today's To-dos",
    authBrand: "Oharu",
    authSub: "The simplest to-do list,<br>focused only on today",
    googleBtn: "Continue with Google",
    authDivider: "or with email",
    emailPh: "Email address",
    pwPh: "Password (6+ characters)",
    loginBtn: "Log in",
    signupBtn: "Sign up",
    backLink: "← Back",
    switchLogin: 'New here? <a id="switchLink">Sign up with email</a>',
    switchSignup: 'Already have an account? <a id="switchLink">Log in</a>',
    migrateHint: "Your to-dos will move to your account when you log in.",
    errEmail: "Please check your email address.",
    errPw: "Password must be at least 6 characters.",
    errLogin: "Email or password is incorrect.",
    errRegistered: "This email is already registered. Please log in.",
    errSignup: "Sign-up failed. Please try again later.",
    msgConfirm: "We sent you a confirmation email. Click the link to finish signing up ✉️",
    errGoogle: "Google sign-in failed. Please try again.",
    errGoogleStart: "Couldn't start Google sign-in. Please try again.",
    msgGoogleBrowser: "Finish signing in with Google in your browser — you'll return automatically.",
    errGoogleDesktop: "Google sign-in isn't available in this version. Please log in with email.",
    errGoogleFinish: "Couldn't complete sign-in. Please try again.",
    previewSupabase: "Sign-in activates after Supabase is configured (top of this file).",
    headlineEmpty: "How's your day going?",
    headlineDone: "All done for today 🎉",
    headlineLeft: '<span class="num">{n}</span> left for today',
    inputPh: "Write today's to-do",
    addBtn: "Add",
    clockTitle: "Set time (optional)",
    clockClearTitle: "Clear time",
    emptyState: "Nothing here yet.<br>Start with the one thing that matters most.",
    overdue: " · overdue",
    todaySuffix: " · Today",
    noRecords: "No records for this day",
    nudgeText: "Oharu is a to-do list focused only on today.<br>Your to-dos are saved only on this device.<br>Log in to sync across phone and PC.",
    calBtnTitle: "Calendar",
    calBtnAria: "Calendar",
    setBtnTitle: "Settings",
    setBtnAria: "Settings",
    delAria: "Delete",
    setAccount: "Account",
    guestMode: 'Guest mode <span class="sub">· saved on this device</span>',
    logout: "Log out",
    login: "Log in",
    signedIn: "Signed in",
    setDisplay: "Display",
    bgAlpha: "Background opacity",
    setLang: "Language",
    langAuto: "Auto",
    langKo: "한국어",
    langEn: "English",
    setWidget: "Widget",
    alwaysOnTop: "Always on top",
    autoLaunch: "Launch at startup",
    quitAppLabel: "Quit app",
    quitBtn: "Quit",
    setAbout: "About",
    version: "Version",
    privacy: "Privacy Policy",
    view: "View",
    oharuWeb: "Oharu Web",
    contact: "Contact",
    logoAria: "Oharu logo",
    installTitle: "Install on your Windows desktop",
    installSub: "An always-on-top to-do widget",
    pcWidget: "PC widget",
    download: "Download",
    langJa: "日本語",
    langZh: "中文",
    langEs: "Español",
    futurePh: "Write a to-do for this day",
    seoLine: "Oharu — a free to-do list focused only on today · Web & Windows widget",
    carryTitle: "{n} unfinished from before",
    carryBring: "Bring to today",
    carryDismiss: "Not now",
    setMcpTitle: "AI connection",
    mcpLoginRequired: "Sign in to manage personal tokens for compatible MCP clients. Check each service's supported connection method first. Theme JSON works below without signing in.",
    mcpDesc: "Issuing a personal token does not confirm an AI connection. Use only compatible MCP clients and never publish token-bearing URLs. OAuth for a public ChatGPT app is not available yet. The theme JSON flow below needs no separate API key.",
    mcpCreateBtn: "Issue token",
    mcpRevokeBtn: "Revoke",
    mcpRevokeConfirm: "Revoke this token? The connected AI will no longer be able to access Oharu.",
    mcpRevokeFailed: "Failed to revoke. Please try again.",
    mcpCreateFailed: "Failed to issue. Please try again.",
    mcpCreatedAt: "Issued",
    mcpLastUsed: "Last used",
    mcpNamePh: "AI to connect",
    mcpTokenWarn: "You won't be able to see this again after leaving this screen. Copy it now and store it somewhere safe.",
    mcpUrlWithTokenLabel: "Personal token URL (only for clients with verified support)",
    mcpUrlLabel: "Server URL (check the client's official authentication method)",
    mcpTokenLabel: "Token",
    mcpCopyBtn: "Copy",
    mcpCopied: "Copied",
    mcpCloseBtn: "Close",
    mcpOptClaude: "Claude",
    mcpOptChatgpt: "ChatGPT",
    mcpOptGemini: "Gemini",
    mcpOptOther: "Compatible MCP client",
  },
  ja: {
    title: "Oharu — 今日のやること",
    authBrand: "Oharu",
    authSub: "今日のタスクだけに集中する、<br>いちばんシンプルなToDoリスト",
    googleBtn: "Googleで続行",
    authDivider: "またはメールで",
    emailPh: "メールアドレス",
    pwPh: "パスワード（6文字以上）",
    loginBtn: "ログイン",
    signupBtn: "登録する",
    backLink: "← 戻る",
    switchLogin: 'はじめての方は <a id="switchLink">メールで登録</a>',
    switchSignup: 'アカウントをお持ちの方は <a id="switchLink">ログイン</a>',
    migrateHint: "これまでのやることは、ログインするとアカウントに引き継がれます。",
    errEmail: "メールアドレスをご確認ください。",
    errPw: "パスワードは6文字以上で入力してください。",
    errLogin: "メールアドレスまたはパスワードが正しくありません。",
    errRegistered: "すでに登録済みのメールです。ログインしてください。",
    errSignup: "登録に失敗しました。しばらくしてからもう一度お試しください。",
    msgConfirm: "確認メールを送信しました。リンクを押して登録を完了してください ✉️",
    errGoogle: "Googleログインに失敗しました。もう一度お試しください。",
    msgGoogleBrowser: "ブラウザでGoogleログインを完了してください。終わると自動で戻ります。",
    headlineEmpty: "今日はどんな一日ですか？",
    headlineDone: "今日のやること、すべて完了 🎉",
    headlineLeft: '残り<span class="num">{n}</span>件',
    inputPh: "今日のやることを書いてみましょう",
    addBtn: "追加",
    clockTitle: "時間を設定（任意）",
    clockClearTitle: "時間を解除",
    emptyState: "まだ登録がありません。<br>いちばん大事なことから書いてみましょう。",
    overdue: " · 時間切れ",
    todaySuffix: " · 今日",
    noRecords: "この日は記録がありません",
    nudgeText: "Oharuは今日のやることだけに集中するToDoリストです。<br>やることはこの端末にのみ保存されています。<br>ログインするとスマホ・PCどこでも続けられます。",
    calBtnTitle: "カレンダー",
    calBtnAria: "カレンダー",
    setBtnTitle: "設定",
    setBtnAria: "設定",
    delAria: "削除",
    setAccount: "アカウント",
    guestMode: 'ゲストモード <span class="sub">· この端末にのみ保存</span>',
    logout: "ログアウト",
    login: "ログイン",
    signedIn: "ログイン中",
    setDisplay: "画面",
    bgAlpha: "背景の透明度",
    setLang: "言語",
    langAuto: "自動",
    langKo: "한국어",
    langEn: "English",
    langJa: "日本語",
    langZh: "中文",
    langEs: "Español",
    setWidget: "ウィジェット",
    alwaysOnTop: "常に手前に表示",
    autoLaunch: "PC起動時に自動起動",
    quitAppLabel: "アプリを終了",
    quitBtn: "終了",
    setAbout: "情報",
    version: "バージョン",
    privacy: "プライバシーポリシー",
    view: "表示",
    oharuWeb: "Oharu Web",
    contact: "お問い合わせ",
    logoAria: "Oharu logo",
    installTitle: "Windowsデスクトップにインストール",
    installSub: "常に手前に表示されるToDoウィジェット",
    pcWidget: "PCウィジェット",
    download: "ダウンロード",
    futurePh: "この日のやることを書く",
    seoLine: "Oharu — 今日のタスクだけに集中する無料ToDo · Web & Windowsウィジェット",
    carryTitle: "未完了のやることが{n}件あります",
    carryBring: "今日に引き継ぐ",
    carryDismiss: "今はしない",
  },
  zh: {
    title: "Oharu — 今日待办",
    authBrand: "Oharu",
    authSub: "只专注于今天的<br>极简待办清单",
    googleBtn: "使用 Google 继续",
    authDivider: "或使用邮箱",
    emailPh: "邮箱地址",
    pwPh: "密码（至少6位）",
    loginBtn: "登录",
    signupBtn: "注册",
    backLink: "← 返回",
    switchLogin: '第一次使用？<a id="switchLink">用邮箱注册</a>',
    switchSignup: '已有账号？<a id="switchLink">登录</a>',
    migrateHint: "登录后，你已写下的待办会自动转移到账号中。",
    errEmail: "请检查邮箱地址。",
    errPw: "密码至少需要6位。",
    errLogin: "邮箱或密码不正确。",
    errRegistered: "该邮箱已注册，请直接登录。",
    errSignup: "注册失败，请稍后重试。",
    msgConfirm: "确认邮件已发送，请点击邮件中的链接完成注册 ✉️",
    errGoogle: "Google 登录失败，请稍后重试。",
    msgGoogleBrowser: "请在浏览器中完成 Google 登录，完成后会自动返回。",
    headlineEmpty: "今天过得怎么样？",
    headlineDone: "今天的待办全部完成 🎉",
    headlineLeft: '还剩 <span class="num">{n}</span> 项',
    inputPh: "写下今天要做的事",
    addBtn: "添加",
    clockTitle: "设置时间（可选）",
    clockClearTitle: "清除时间",
    emptyState: "还没有待办。<br>从最重要的一件事开始吧。",
    overdue: " · 已超时",
    todaySuffix: " · 今天",
    noRecords: "这一天没有记录",
    nudgeText: "Oharu 是一款只专注今日待办的清单。<br>待办目前只保存在此设备上。<br>登录后可在手机和电脑间同步。",
    calBtnTitle: "日历",
    calBtnAria: "日历",
    setBtnTitle: "设置",
    setBtnAria: "设置",
    delAria: "删除",
    setAccount: "账号",
    guestMode: '访客模式 <span class="sub">· 仅保存在此设备</span>',
    logout: "退出登录",
    login: "登录",
    signedIn: "已登录",
    setDisplay: "显示",
    bgAlpha: "背景透明度",
    setLang: "语言",
    langAuto: "自动",
    langKo: "한국어",
    langEn: "English",
    langJa: "日本語",
    langZh: "中文",
    langEs: "Español",
    setWidget: "小组件",
    alwaysOnTop: "窗口置顶",
    autoLaunch: "开机自动启动",
    quitAppLabel: "退出应用",
    quitBtn: "退出",
    setAbout: "关于",
    version: "版本",
    privacy: "隐私政策",
    view: "查看",
    oharuWeb: "Oharu Web",
    contact: "联系我们",
    logoAria: "Oharu logo",
    installTitle: "安装到 Windows 桌面",
    installSub: "始终置顶的待办小组件",
    pcWidget: "PC 小组件",
    download: "下载",
    futurePh: "为这一天添加待办",
    seoLine: "Oharu — 只专注今日待办的免费清单 · 网页与 Windows 小组件",
    carryTitle: "还有 {n} 项未完成的待办",
    carryBring: "移到今天",
    carryDismiss: "暂不",
  },
  es: {
    title: "Oharu — Tareas de hoy",
    authBrand: "Oharu",
    authSub: "La lista de tareas más simple,<br>centrada solo en hoy",
    googleBtn: "Continuar con Google",
    authDivider: "o con tu correo",
    emailPh: "Correo electrónico",
    pwPh: "Contraseña (6+ caracteres)",
    loginBtn: "Iniciar sesión",
    signupBtn: "Registrarse",
    backLink: "← Volver",
    switchLogin: '¿Primera vez? <a id="switchLink">Regístrate con tu correo</a>',
    switchSignup: '¿Ya tienes cuenta? <a id="switchLink">Inicia sesión</a>',
    migrateHint: "Tus tareas se moverán a tu cuenta al iniciar sesión.",
    errEmail: "Revisa tu correo electrónico.",
    errPw: "La contraseña debe tener al menos 6 caracteres.",
    errLogin: "Correo o contraseña incorrectos.",
    errRegistered: "Este correo ya está registrado. Inicia sesión.",
    errSignup: "No se pudo completar el registro. Inténtalo más tarde.",
    msgConfirm: "Te enviamos un correo de confirmación. Haz clic en el enlace para terminar ✉️",
    errGoogle: "Error al iniciar sesión con Google. Inténtalo de nuevo.",
    msgGoogleBrowser: "Completa el acceso con Google en tu navegador; volverás automáticamente.",
    headlineEmpty: "¿Cómo va tu día?",
    headlineDone: "¡Todo listo por hoy! 🎉",
    headlineLeft: '<span class="num">{n}</span> pendientes hoy',
    inputPh: "Escribe una tarea para hoy",
    addBtn: "Añadir",
    clockTitle: "Fijar hora (opcional)",
    clockClearTitle: "Quitar hora",
    emptyState: "Aún no hay nada.<br>Empieza por lo más importante.",
    overdue: " · vencida",
    todaySuffix: " · Hoy",
    noRecords: "Sin registros este día",
    nudgeText: "Oharu es una lista de tareas centrada solo en hoy.<br>Tus tareas solo se guardan en este dispositivo.<br>Inicia sesión para sincronizar entre móvil y PC.",
    calBtnTitle: "Calendario",
    calBtnAria: "Calendario",
    setBtnTitle: "Ajustes",
    setBtnAria: "Ajustes",
    delAria: "Eliminar",
    setAccount: "Cuenta",
    guestMode: 'Modo invitado <span class="sub">· solo en este dispositivo</span>',
    logout: "Cerrar sesión",
    login: "Iniciar sesión",
    signedIn: "Sesión iniciada",
    setDisplay: "Pantalla",
    bgAlpha: "Opacidad del fondo",
    setLang: "Idioma",
    langAuto: "Automático",
    langKo: "한국어",
    langEn: "English",
    langJa: "日本語",
    langZh: "中文",
    langEs: "Español",
    setWidget: "Widget",
    alwaysOnTop: "Siempre visible",
    autoLaunch: "Iniciar con el PC",
    quitAppLabel: "Salir de la app",
    quitBtn: "Salir",
    setAbout: "Información",
    version: "Versión",
    privacy: "Política de privacidad",
    view: "Ver",
    oharuWeb: "Oharu Web",
    contact: "Contacto",
    logoAria: "Oharu logo",
    installSub: "Un widget de tareas siempre visible",
    pcWidget: "Widget para PC",
    download: "Descargar",
    futurePh: "Añade una tarea para este día",
    seoLine: "Oharu — lista de tareas gratis solo para hoy · Web y widget de Windows",
    carryTitle: "{n} tareas pendientes de antes",
    carryBring: "Traer a hoy",
    carryDismiss: "Ahora no",
  },
};

function detectLang() {
  const nav = (navigator.language || "").toLowerCase();
  const base = nav.slice(0, 2);
  if (base === "ko") return "ko";
  if (base === "ja") return "ja";
  if (base === "es") return "es";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}
function resolveLang() {
  if (urlLangParam && URL_LANGS.has(urlLangParam)) {
    saveUI({ ...loadUI(), lang: urlLangParam });
    return urlLangParam;
  }
  const saved = loadUI().lang;
  if (saved && saved !== "auto" && T[saved]) return saved;
  return detectLang();
}
const LANG = resolveLang();
const INTL_LOCALE = { ko: "ko", en: "en", ja: "ja", zh: "zh-CN", es: "es" };
const intlLocale = () => INTL_LOCALE[LANG] || "en";
const t = (key, vars) => {
  let s = (T[LANG]?.[key] ?? T.en?.[key] ?? T.ko?.[key] ?? key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
};

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const getDays = () => {
  if (LANG === "ko") return DAYS_KO;
  const fmt = new Intl.DateTimeFormat(intlLocale(), { weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
};

function applyTexts() {
  document.documentElement.lang = LANG;
  document.title = t("title");
  $("authLogo").setAttribute("aria-label", t("logoAria"));
  $("authH2").textContent = t("authBrand");
  $("authSub").innerHTML = t("authSub");
  $("googleBtnText").textContent = t("googleBtn");
  $("authDivider").textContent = t("authDivider");
  $("email").placeholder = t("emailPh");
  $("pw").placeholder = t("pwPh");
  $("emailBtn").textContent = t("loginBtn");
  $("switchLine").innerHTML = t("switchLogin");
  $("backLink").textContent = t("backLink");
  $("loginTopBtn").textContent = t("loginBtn");
  $("calBtn").title = t("calBtnTitle");
  $("calBtn").setAttribute("aria-label", t("calBtnAria"));
  $("setBtn").title = t("setBtnTitle");
  $("setBtn").setAttribute("aria-label", t("setBtnAria"));
  $("input").placeholder = t("inputPh");
  $("clock").title = t("clockTitle");
  $("clockClear").title = t("clockClearTitle");
  $("addBtn").textContent = t("addBtn");
  $("emptyText").innerHTML = t("emptyState");
  $("nudgeText").innerHTML = t("nudgeText");
  $("nudgeLoginBtn").textContent = t("loginBtn");
  $("carryBring").textContent = t("carryBring");
  $("carryDismiss").textContent = t("carryDismiss");
  $("setAccountTitle").textContent = t("setAccount");
  $("setMcpTitle").textContent = t("setMcpTitle");
  $("setDesignTitle").textContent = t("setDisplay");
  $("setLangLabel").textContent = t("setLang");
  $("langSelect").options[0].textContent = t("langAuto");
  $("langSelect").options[1].textContent = t("langKo");
  $("langSelect").options[2].textContent = t("langEn");
  $("langSelect").options[3].textContent = t("langJa");
  $("langSelect").options[4].textContent = t("langZh");
  $("langSelect").options[5].textContent = t("langEs");
  $("langSelect").setAttribute("aria-label", t("setLang"));
  $("setBgAlphaLabel").textContent = t("bgAlpha");
  $("bgAlphaRange").setAttribute("aria-label", t("bgAlpha"));
  $("setAppTitle").textContent = t("setWidget");
  $("setAlwaysOnTopLabel").textContent = t("alwaysOnTop");
  $("alwaysOnTopToggle").setAttribute("aria-label", t("alwaysOnTop"));
  $("setAutoLaunchLabel").textContent = t("autoLaunch");
  $("autoLaunchToggle").setAttribute("aria-label", t("autoLaunch"));
  $("setQuitLabel").textContent = t("quitAppLabel");
  $("quitAppBtn").textContent = t("quitBtn");
  $("setAboutTitle").textContent = t("setAbout");
  $("setVersionLabel").textContent = t("version");
  $("setPrivacyLabel").textContent = t("privacy");
  $("setPrivacyLink").textContent = t("view");
  $("setWebLabel").textContent = t("oharuWeb");
  const contactEl = document.querySelector('[data-i18n="contact"]');
  if (contactEl) contactEl.textContent = t("contact");
  $("seoLine").textContent = t("seoLine");
  if (!IS_DESKTOP) {
    $("setPcWidgetRow").hidden = false;
    $("setPcWidgetLabel").textContent = t("pcWidget");
    $("setPcWidgetLink").textContent = t("download");
    $("dlCard").hidden = false;
    $("dlTitle").textContent = t("installTitle");
    $("dlSub").textContent = t("installSub");
    $("dlBtn").textContent = t("download");
  }
}

// ── 유틸 ───────────────────────────────────────
const $ = id => document.getElementById(id);
const dstr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = () => dstr(new Date());
const fmtTime = hhmm => {
  const [h, m] = hhmm.split(":").map(Number);
  if (LANG === "ko") {
    return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
  }
  return new Intl.DateTimeFormat(intlLocale(), { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, m));
};
const fmtDateLine = d => {
  if (LANG === "ko") return `${d.getMonth() + 1}월 ${d.getDate()}일 ${getDays()[d.getDay()]}요일`;
  return new Intl.DateTimeFormat(intlLocale(), { weekday: "short", month: "short", day: "numeric" }).format(d);
};
const fmtCalMonth = (y, m) => {
  if (LANG === "ko") return `${y}년 ${m + 1}월`;
  return new Intl.DateTimeFormat(intlLocale(), { month: "long", year: "numeric" }).format(new Date(y, m, 1));
};
const fmtDayTitle = (sy, sm, sd) => {
  const d = new Date(sy, sm - 1, sd);
  const suffix = selDate === todayStr() ? t("todaySuffix") : "";
  if (LANG === "ko") return `${sm}월 ${sd}일 ${getDays()[d.getDay()]}요일` + suffix;
  return new Intl.DateTimeFormat(intlLocale(), { weekday: "short", month: "short", day: "numeric" }).format(d) + suffix;
};
const isLate = hhmm => {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
};
const newId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);

// ── 저장소: local / cloud 동일 인터페이스 ─────────
// todo: { id, text, time|null, done, todoDate, createdAt }
let repo = null, supabase = null, currentUserId = null;


// ── 앱 상태 ────────────────────────────────────
let todos = [];                 // 전체 (모든 날짜)
let view = "today";             // 'today' | 'cal'
let calCursor = new Date();     // 캘린더가 보고 있는 달
let selDate = todayStr();       // 캘린더에서 선택한 날짜
let lastLoadedTodosJson = "";
let lastLoadedDate = "";
let reminderDataReady = false;
window.OharuReminders?.mount(() => reminderDataReady ? todos : null);

const byDate = date => todos.filter(t => t.todoDate === date);

function legacyCompare(a, b) {
  const at = a.time || "99:99", bt = b.time || "99:99";
  if (at !== bt) return at < bt ? -1 : 1;
  return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
}

function sortItems(arr) {
  const pending = arr.filter(item => !item.done).sort((a, b) => {
    const ao = Number.isFinite(a.sortOrder), bo = Number.isFinite(b.sortOrder);
    if (ao && bo && a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (ao !== bo) return ao ? -1 : 1;
    return legacyCompare(a, b);
  });
  return pending.concat(arr.filter(item => item.done).sort(legacyCompare));
}

async function backfillTodaySortOrder() {
  const todayItems = todos.filter(item => item.todoDate === todayStr() && !item.done);
  if (!todayItems.some(item => !Number.isFinite(item.sortOrder))) return;
  const ordered = [...todayItems].sort(legacyCompare);
  for (const [index, item] of ordered.entries()) {
    const value = index + 1;
    item.sortOrder = value;
    await repo.setOrder(item.id, value);
  }
}

function nextSortOrder(date, time = null) {
  const values = todos
    .filter(item => item.todoDate === date && !item.done && Number.isFinite(item.sortOrder))
    .map(item => item.sortOrder);
  if (time) return (values.length ? Math.min(...values) : 1) - 1;
  return (values.length ? Math.max(...values) : 0) + 1;
}

// ── 헤더 ───────────────────────────────────────
function renderHead() {
  const d = new Date();
  $("dateLine").textContent = fmtDateLine(d);
  const tday = byDate(todayStr());
  const total = tday.length, left = tday.filter(x => !x.done).length;
  const h = $("headline"), bar = $("bar");
  if (total === 0) { h.textContent = t("headlineEmpty"); bar.style.width = "0%"; }
  else if (left === 0) { h.textContent = t("headlineDone"); bar.style.width = "100%"; }
  else {
    h.innerHTML = t("headlineLeft", { n: left });
    bar.style.width = `${Math.round(((total - left) / total) * 100)}%`;
  }
}

// ── 리스트 아이템 공용 렌더러 ────────────────────
let ignoreRowClickUntil = 0;
let ignoreRowClickId = null;

function beginDrag(row, item, e, onCancel = null) {
  e.preventDefault();
  e.stopPropagation();
  ignoreRowClickUntil = Date.now() + 500;
  ignoreRowClickId = item.id;
  const list = row.parentElement;
  if (!list) return;
  const rows = [...list.querySelectorAll(".item")].filter(el => !el.classList.contains("done"));
  const startIndex = rows.indexOf(row);
  const otherRows = rows.filter(itemRow => itemRow !== row);
  const pointerId = e.pointerId;
  const startY = e.clientY;
  const rowHeight = row.offsetHeight;
  const centers = new Map(rows.map(itemRow => [
    itemRow, itemRow.getBoundingClientRect().top + itemRow.offsetHeight / 2,
  ]));
  let targetIndex = startIndex;
  row.classList.add("dragging");

  const resetPreview = () => {
    rows.forEach(itemRow => { itemRow.style.transform = ""; });
  };
  const move = moveEvent => {
    if (moveEvent.pointerId !== pointerId) return;
    moveEvent.preventDefault();
    targetIndex = otherRows.findIndex(itemRow => moveEvent.clientY < centers.get(itemRow));
    if (targetIndex < 0) targetIndex = otherRows.length;
    rows.forEach((itemRow, index) => {
      if (itemRow === row) {
        itemRow.style.transform = `translateY(${moveEvent.clientY - startY}px) scale(1.02)`;
        return;
      }
      let shift = 0;
      if (targetIndex > startIndex && index > startIndex && index <= targetIndex) shift = -rowHeight;
      if (targetIndex < startIndex && index >= targetIndex && index < startIndex) shift = rowHeight;
      itemRow.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  };
  const end = async endEvent => {
    if (endEvent.pointerId !== pointerId) return;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", end);
    document.removeEventListener("pointercancel", end);
    const changed = endEvent.type === "pointerup" && targetIndex !== startIndex;
    if (!changed) {
      resetPreview();
      row.classList.remove("dragging");
      if (endEvent.type !== "pointerup" && onCancel) onCancel();
      return;
    }
    const remainingItems = otherRows
      .map(el => todos.find(todo => todo.id === el.dataset.todoId)).filter(Boolean);
    const previous = remainingItems[targetIndex - 1];
    const next = remainingItems[targetIndex];
    let value;
    if (!previous) value = next.sortOrder - 1;
    else if (!next) value = previous.sortOrder + 1;
    else value = (previous.sortOrder + next.sortOrder) / 2;
    item.sortOrder = value;
    const previewRows = [...otherRows];
    previewRows.splice(targetIndex, 0, row);
    const previewIds = new Set(previewRows.map(itemRow => itemRow.dataset.todoId));
    const previewItems = previewRows
      .map(itemRow => todos.find(todo => todo.id === itemRow.dataset.todoId)).filter(Boolean);
    let previewIndex = 0;
    todos = todos.map(todo => previewIds.has(todo.id) ? previewItems[previewIndex++] : todo);
    const firstDone = list.querySelector(".item.done");
    rows.forEach(itemRow => {
      itemRow.style.transition = "none";
      itemRow.style.transform = "";
    });
    previewRows.forEach(itemRow => list.insertBefore(itemRow, firstDone));
    row.classList.remove("dragging");
    rows.forEach(itemRow => { itemRow.style.transition = ""; });
    updateGrabEdges(list);
    await repo.setOrder(item.id, value);
    rememberLoadedState();
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
}

function attachDragHandle(row, item, onGrab, onCancel) {
  const handle = document.createElement("span");
  handle.className = "grab";
  handle.setAttribute("aria-label", "순서 변경");
  handle.innerHTML = '<svg viewBox="0 0 4 14" aria-hidden="true"><circle cx="2" cy="2" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="2" cy="12" r="1"/></svg>';
  handle.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    onGrab();
    e.stopPropagation();
    beginDrag(row, item, e, onCancel);
  });
  return handle;
}

function attachLongPress(row, item, onGrab, onCancel) {
  let press = null;
  const cancel = () => {
    if (!press) return;
    clearTimeout(press.timer);
    press = null;
  };
  row.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest(".grab, .del")) return;
    press = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        if (!press) return;
        press = null;
        onGrab();
        beginDrag(row, item, e, onCancel);
      }, 400),
    };
  });
  row.addEventListener("pointermove", e => {
    if (!press || e.pointerId !== press.pointerId) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) cancel();
  });
  row.addEventListener("pointerup", cancel);
  row.addEventListener("pointercancel", cancel);
}

function buildItem(item, { interactive = true, sortable = false } = {}) {
  const row = document.createElement("div");
  row.className = "item" + (item.done ? " done" : "");
  row.dataset.todoId = item.id;
  row.setAttribute("role", "checkbox");
  row.setAttribute("aria-checked", item.done);
  if (interactive) row.tabIndex = 0;

  const check = document.createElement("span");
  check.className = "check";
  check.innerHTML = '<svg viewBox="0 0 16 16"><path d="M2.5 8.5l3.5 3.5 7-8"/></svg>';

  const body = document.createElement("div");
  body.className = "body";
  if (item.time) {
    const chip = document.createElement("div");
    const late = !item.done && item.todoDate === todayStr() && isLate(item.time);
    chip.className = "time" + (late ? " late" : "");
    chip.textContent = fmtTime(item.time) + (late ? t("overdue") : "");
    body.appendChild(chip);
  }
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = item.text;
  body.appendChild(label);

  row.append(check, body);

  if (interactive) {
    let suppressNextClick = false;
    let suppressClickTimer = null;
    const clearSuppressedClick = () => {
      suppressNextClick = false;
      ignoreRowClickUntil = 0;
      ignoreRowClickId = null;
      clearTimeout(suppressClickTimer);
      suppressClickTimer = null;
    };
    const suppressGrabClick = () => {
      suppressNextClick = true;
      clearTimeout(suppressClickTimer);
      suppressClickTimer = setTimeout(clearSuppressedClick, 1000);
    };
    row.addEventListener("click", e => {
      if (!suppressNextClick) return;
      clearSuppressedClick();
      e.preventDefault();
      e.stopPropagation();
    }, true);
    row.addEventListener("pointercancel", clearSuppressedClick, true);
    const del = document.createElement("button");
    del.className = "del";
    del.setAttribute("aria-label", t("delAria"));
    del.innerHTML = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>';
    del.onclick = async e => {
      e.stopPropagation();
      todos = todos.filter(x => x.id !== item.id);
      render();
      await repo.remove(item.id);
      rememberLoadedState();
    };
    const toggle = async () => {
      item.done = !item.done;
      row.classList.toggle("done", item.done);
      row.setAttribute("aria-checked", item.done);
      renderHead();
      setTimeout(render, 320);
      await repo.update(item);
      rememberLoadedState();
    };
    row.onclick = e => {
      if (!e.target.closest(".check, .body")) return;
      if (item.id === ignoreRowClickId && Date.now() < ignoreRowClickUntil) return;
      toggle();
    };
    row.onkeydown = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } };
    if (sortable && !item.done && item.todoDate === todayStr()) {
      attachLongPress(row, item, suppressGrabClick, clearSuppressedClick);
      row.append(attachDragHandle(row, item, suppressGrabClick, clearSuppressedClick), del);
    }
    else row.appendChild(del);
  }
  return row;
}

// ── 오늘 보기 ──────────────────────────────────
function pendingPastCount() {
  const today = todayStr();
  return todos.filter(item => !item.done && item.todoDate < today).length;
}
function checkCarry() {
  const card = $("carryCard");
  const n = pendingPastCount();
  if (n > 0 && loadUI().carryDismissed !== todayStr()) {
    $("carryText").textContent = t("carryTitle", { n });
    card.hidden = false;
  } else {
    card.hidden = true;
  }
}
function updateGrabEdges(list) {
  const grabRows = [...list.querySelectorAll(".item")].filter(row => row.querySelector(".grab"));
  grabRows.forEach(row => row.classList.remove("grab-first", "grab-last"));
  if (!grabRows.length) return;
  if (grabRows[0] === list.firstElementChild) grabRows[0].classList.add("grab-first");
  if (grabRows[grabRows.length - 1] === list.lastElementChild) {
    grabRows[grabRows.length - 1].classList.add("grab-last");
  }
}
function renderToday() {
  const list = $("list");
  list.innerHTML = "";
  const items = sortItems(byDate(todayStr()));
  $("empty").hidden = items.length !== 0;
  for (const item of items) list.appendChild(buildItem(item, { sortable: true }));
  updateGrabEdges(list);
  checkCarry();
}

// ── 캘린더 보기 ────────────────────────────────
function buildFutureComposer() {
  const comp = document.createElement("div");
  comp.className = "composer";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 80;
  input.placeholder = t("futurePh");
  input.autocomplete = "off";

  let localTime = null;
  const clockEl = document.createElement("div");
  clockEl.className = "clock";
  clockEl.title = t("clockTitle");
  const clockSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  clockSvg.setAttribute("viewBox", "0 0 24 24");
  clockSvg.setAttribute("fill", "none");
  clockSvg.setAttribute("stroke", "currentColor");
  clockSvg.setAttribute("stroke-width", "2");
  clockSvg.setAttribute("stroke-linecap", "round");
  const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c1.setAttribute("cx", "12"); c1.setAttribute("cy", "12"); c1.setAttribute("r", "9");
  const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p1.setAttribute("d", "M12 7v5l3 2");
  clockSvg.append(c1, p1);
  const clockTextEl = document.createElement("span");
  clockTextEl.className = "t";
  const clearEl = document.createElement("span");
  clearEl.className = "clear";
  clearEl.title = t("clockClearTitle");
  clearEl.textContent = "×";
  const timeIn = document.createElement("input");
  timeIn.type = "time";
  clockEl.append(clockSvg, clockTextEl, clearEl, timeIn);

  timeIn.addEventListener("change", () => {
    localTime = timeIn.value || null;
    clockEl.classList.toggle("set", !!localTime);
    clockTextEl.textContent = localTime ? fmtTime(localTime) : "";
  });
  clearEl.addEventListener("click", e => {
    e.stopPropagation(); e.preventDefault();
    localTime = null; timeIn.value = "";
    clockEl.classList.remove("set"); clockTextEl.textContent = "";
  });

  const addBtn = document.createElement("button");
  addBtn.className = "add";
  addBtn.textContent = t("addBtn");

  async function addFuture() {
    const text = input.value.trim();
    if (!text) return;
    const newTodo = { id: newId(), text, time: localTime, done: false, todoDate: selDate, sortOrder: nextSortOrder(selDate, localTime), createdAt: new Date().toISOString() };
    todos.push(newTodo);
    render();
    await repo.add(newTodo);
    rememberLoadedState();
    input.focus();
  }
  addBtn.onclick = addFuture;
  input.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (e.isComposing || e.keyCode === 229) return;
    addFuture();
  });

  comp.append(input, clockEl, addBtn);
  return comp;
}

function renderCal() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  $("calMonth").textContent = fmtCalMonth(y, m);
  const grid = $("calGrid");
  grid.innerHTML = "";
  getDays().forEach((d, i) => {
    const el = document.createElement("div");
    el.className = "dow" + (i === 0 ? " sun" : "");
    el.textContent = d;
    grid.appendChild(el);
  });
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ds = dstr(d);
    const cell = document.createElement("button");
    cell.className = "day"
      + (d.getMonth() !== m ? " other" : "")
      + (ds === todayStr() ? " today" : "")
      + (ds === selDate ? " sel" : "");
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = d.getDate();
    cell.appendChild(n);
    const items = byDate(ds);
    if (items.length) {
      const left = items.filter(item => !item.done).length;
      const cnt = document.createElement("span");
      if (left === 0) {
        cnt.className = "cnt all-done";
        cnt.textContent = "✓";
      } else if (ds > todayStr()) {
        cnt.className = "cnt future";
        cnt.textContent = left;
      } else {
        cnt.className = "cnt has-left";
        cnt.textContent = left;
      }
      cell.appendChild(cnt);
    }
    cell.onclick = () => { selDate = ds; renderCal(); };
    grid.appendChild(cell);
  }
  // 선택한 날짜 상세
  const dd = $("dayDetail");
  dd.innerHTML = "";
  const [sy, sm, sd] = selDate.split("-").map(Number);
  const title = document.createElement("div");
  title.className = "dd-title";
  title.textContent = fmtDayTitle(sy, sm, sd);
  dd.appendChild(title);
  const editable = selDate >= todayStr();
  if (editable) dd.appendChild(buildFutureComposer());
  const items = sortItems(byDate(selDate));
  if (!items.length) {
    if (!editable) {
      const none = document.createElement("div");
      none.className = "none";
      none.textContent = t("noRecords");
      dd.appendChild(none);
    }
  } else {
    const l = document.createElement("div");
    l.className = "list";
    for (const item of items) l.appendChild(buildItem(item, { interactive: editable }));
    dd.appendChild(l);
  }
}

function render() {
  window.OharuReminders?.sync(reminderDataReady ? todos : null, currentUserId);
  renderHead();
  if (view === "today") renderToday();
  else if (view === "cal") renderCal();
}

// ── 보기 전환 (기본은 투두, 버튼 눌렀을 때만 캘린더/설정) ──
function switchView(v) {
  view = v;
  $("calBtn").classList.toggle("on", v === "cal");
  $("setBtn").classList.toggle("on", v === "set");
  $("todayView").hidden = v !== "today";
  $("calView").hidden = v !== "cal";
  $("setView").hidden = v !== "set";
  if (v === "cal") { calCursor = new Date(); selDate = todayStr(); }
  render();
}
$("calBtn").onclick = () => switchView(view === "cal" ? "today" : "cal");
$("setBtn").onclick = () => switchView(view === "set" ? "today" : "set");
$("prevM").onclick = () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCal(); };
$("nextM").onclick = () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCal(); };

// ── 설정 ───────────────────────────────────────
const APP_VERSION = "1.8.0";
let openLoginScreen = null; // 모드(로컬/클라우드)별로 연결됨

applyTexts();
$("appVersion").textContent = "v" + APP_VERSION;

const uiSaved = loadUI();
$("langSelect").value = uiSaved.lang || "auto";
$("langSelect").addEventListener("change", () => {
  saveUI({ ...loadUI(), lang: $("langSelect").value });
  location.reload();
});

function renderAccount() {
  $("setAccountTitle").textContent = "저장 방식";
  $("setAccount").textContent = "이 기기에만 저장 · 기기 간 동기화 안 됨";
}
function applyBgAlpha(p) {
  document.documentElement.style.setProperty("--bg-alpha", p / 100);
  $("bgAlphaVal").textContent = p + "%";
}
if (IS_DESKTOP) {
  $("setBgAlphaRow").hidden = false;
  const saved = Math.min(100, Math.max(30, loadUI().bgAlpha ?? 100));
  $("bgAlphaRange").value = saved;
  applyBgAlpha(saved);
  $("bgAlphaRange").addEventListener("input", e => {
    const v = +e.target.value;
    applyBgAlpha(v);
    saveUI({ ...loadUI(), bgAlpha: v });
  });

  const bridge = window.desktopBridge;
  if (bridge) {
    $("setApp").hidden = false;
    const topToggle = $("alwaysOnTopToggle");
    const launchToggle = $("autoLaunchToggle");
    const applyPrefs = (p) => {
      if (!p) return;
      topToggle.checked = !!p.alwaysOnTop;
      launchToggle.checked = !!p.autoLaunch;
    };
    if (bridge.getPrefs) bridge.getPrefs().then(applyPrefs);
    if (bridge.onPrefs) bridge.onPrefs(applyPrefs);
    topToggle.addEventListener("change", () => {
      if (bridge.setAlwaysOnTop) bridge.setAlwaysOnTop(topToggle.checked);
    });
    launchToggle.addEventListener("change", () => {
      if (bridge.setAutoLaunch) bridge.setAutoLaunch(launchToggle.checked);
    });
    $("quitAppBtn").onclick = () => { if (bridge.quitApp) bridge.quitApp(); };
  }
}

// ── AI 연동(MCP) ─────────────────────────────
// 호환성이 확인된 MCP 클라이언트가 개인 토큰으로 오하루에 할 일을 추가할
// 수 있게 하는 기능. 기존 todos CRUD 흐름과는 완전히 분리된 애드온이며,
// public.todos 테이블/RLS는 이 코드에서 전혀 건드리지 않는다.




// ── 시간 선택 ──────────────────────────────────
const clock = $("clock"), timeInput = $("timeInput"), clockText = $("clockText");
let pickedTime = null;
timeInput.addEventListener("change", () => {
  pickedTime = timeInput.value || null;
  clock.classList.toggle("set", !!pickedTime);
  clockText.textContent = pickedTime ? fmtTime(pickedTime) : "";
});
$("clockClear").addEventListener("click", e => {
  e.stopPropagation(); e.preventDefault();
  pickedTime = null; timeInput.value = "";
  clock.classList.remove("set"); clockText.textContent = "";
});

// ── 추가 ───────────────────────────────────────
async function add() {
  const input = $("input");
  const text = input.value.trim();
  if (!text) return;
  const newTodo = { id: newId(), text, time: pickedTime, done: false, todoDate: todayStr(), sortOrder: nextSortOrder(todayStr(), pickedTime), createdAt: new Date().toISOString() };
  todos.push(newTodo);
  input.value = "";
  pickedTime = null; timeInput.value = "";
  clock.classList.remove("set"); clockText.textContent = "";
  render();
  input.focus();
  await repo.add(newTodo);
  rememberLoadedState();
}
$("addBtn").onclick = add;
$("input").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  // 한글(조합형 IME) 입력 중 Enter가 두 번 발화되어 중복 등록되는 버그 방지
  if (e.isComposing || e.keyCode === 229) return;
  add();
});

// ── 과거 미완료 가져오기 ───────────────────────
$("carryBring").onclick = async () => {
  await repo.carryOver();
  const carried = await repo.load();
  if (!carried) return;
  todos = carried; reminderDataReady = true;
  render();
  rememberLoadedState();
};
$("carryDismiss").onclick = () => {
  saveUI({ ...loadUI(), carryDismissed: todayStr() });
  $("carryCard").hidden = true;
};

// ── 부팅 ───────────────────────────────────────
let appStarted = false;
let guestMode = false;
function todosSnapshot(items) {
  return JSON.stringify([...items].sort((a, b) => String(a.id).localeCompare(String(b.id))));
}
function rememberLoadedState() {
  window.OharuReminders?.sync(reminderDataReady ? todos : null, currentUserId);
  lastLoadedTodosJson = todosSnapshot(todos);
  lastLoadedDate = todayStr();
}

async function startApp(r, { canLogout = false, guest = false, email = null, userId = null } = {}) {
  if (appStarted) return; // 로그인 이벤트 다중 발화 시 중복 부팅 방지
  appStarted = true;
  guestMode = guest;
  repo = r;
  currentUserId = userId;
  $("authView").hidden = true;
  $("mainView").hidden = false;
  $("nudge").hidden = !guest;
  renderAccount(canLogout ? (email || t("signedIn")) : null);

  await repo.rollover();
  const initialTodos = await repo.load();
  if (initialTodos) { todos = initialTodos; reminderDataReady = true; }
  await backfillTodaySortOrder();
  render();
  rememberLoadedState();
  setInterval(async () => {
    await repo.rollover();
    const loaded = await repo.load();
    if (!loaded) return;
    reminderDataReady = true;
    const loadedJson = todosSnapshot(loaded);
    const dateChanged = todayStr() !== lastLoadedDate;
    if (loadedJson === lastLoadedTodosJson && !dateChanged) return;
    todos = loaded;
    await backfillTodaySortOrder();
    render();
    rememberLoadedState();
  }, 60 * 1000);
}


try {
  const tossRepo = await initialize(todayStr, () => {
    if (view !== 'today') { switchView('today'); return true; }
    return false;
  });
  await startApp(tossRepo);
  $("setPrivacyLink").textContent = '확인 준비 중';
  ['authView', 'loginTopBtn', 'nudge', 'setMcp', 'setApp', 'dlCard', 'seoLine', 'setPcWidgetRow', 'setDesign'].forEach(id => $(id)?.remove());
  const route = location.pathname.replace(/\/$/, '');
  if (route === '/calendar') switchView('cal');
  if (route === '/settings') switchView('set');
} catch (_) { reportFailure(); }
