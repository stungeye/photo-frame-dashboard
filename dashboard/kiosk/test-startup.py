"""Host regression checks for native navigation when WebView initialization fails.

Compiles the actual Activity lifecycle methods with minimal Android fakes. These
checks do not establish Android rendering or physical-panel navigation.
"""
import pathlib
import shutil
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parent
source = (root / 'src/com/wesbos/homehq/MainActivity.java').read_text()


def method(signature):
    start = source.index('  @Override\n  ' + signature)
    brace = source.index('{', start)
    depth = 1
    end = brace + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


methods = '\n'.join(method(s) for s in (
    'protected void onCreate(Bundle state)',
    'protected void onNewIntent(Intent intent)',
    'protected void onDestroy()',
))
java = r'''
class Bundle {}
class Intent {}
class WindowManager { static class LayoutParams {
  static final int FLAG_KEEP_SCREEN_ON = 1, FLAG_FULLSCREEN = 2;
} }
class Window { void addFlags(int flags) {} }
class Log { static void e(String tag, String message, Throwable error) {} }
class WebView {
  int destroyed, loaded;
  void destroy() { destroyed++; }
  void loadUrl(String url) { loaded++; }
}
class Handler {
  void removeCallbacks(Object callback) {}
  void removeCallbacksAndMessages(Object token) {}
}
class BaseActivity {
  int unregisterCount;
  protected void onCreate(Bundle state) {}
  protected void onNewIntent(Intent intent) {}
  protected void onDestroy() {}
  Window getWindow() { return new Window(); }
  void setIntent(Intent intent) {}
  Intent getIntent() { return new Intent(); }
  void unregisterReceiver(Object receiver) { unregisterCount++; }
}
class ActivityUnderTest extends BaseActivity {
  static final String TAG = "test";
  WebView web;
  boolean networkReceiverRegistered, fallback;
  int failure, debugCalls;
  Handler handler = new Handler();
  Object retry = new Object(), stall = new Object(), networkChange = new Object();
  String retryUrl;
  void applyHomeFlag(Intent intent) {}
  void keepNavigationEnabled() {}
  void cancelExit() {}
  void applyDebugFlag(Intent intent) { debugCalls++; }
  String urlFrom(Intent intent) { return "http://localhost/"; }
  void initializeBrowser() {
    if (failure == 1) throw new NullPointerException("provider");
    if (failure == 2) throw new NoClassDefFoundError("provider");
    web = new WebView();
    if (failure == 3) throw new IllegalStateException("partially initialized provider");
    networkReceiverRegistered = true;
  }
  void showBrowserUnavailable() { fallback = true; }
__METHODS__
}
public class TestKioskStartup {
  static void require(boolean ok, String message) {
    if (!ok) throw new AssertionError(message);
  }
  public static void main(String[] args) {
    for (int failure = 1; failure <= 3; failure++) {
      ActivityUnderTest a = new ActivityUnderTest();
      a.failure = failure;
      a.onCreate(new Bundle());
      require(a.fallback && a.web == null, "provider failure must show native fallback");
      a.onNewIntent(new Intent());
      require(a.debugCalls == 0, "fallback must not reinitialize broken provider on an intent");
      a.onDestroy();
      require(a.unregisterCount == 0, "failed startup must not unregister an absent receiver");
    }
    ActivityUnderTest a = new ActivityUnderTest();
    a.onCreate(new Bundle());
    require(!a.fallback && a.web != null, "working provider must retain browser");
    WebView web = a.web;
    a.onNewIntent(new Intent());
    require(web.loaded == 1 && a.debugCalls == 1, "working browser must accept new URL");
    a.onDestroy();
    require(a.unregisterCount == 1 && web.destroyed == 1, "successful startup must clean up receiver and browser");
    System.out.println("PASS: runtime and linkage failures, partial startup, fallback intent/cleanup, normal URL loading/cleanup");
  }
}
'''.replace('__METHODS__', methods)

with tempfile.TemporaryDirectory(prefix='homehq-startup-') as folder:
    folder = pathlib.Path(folder)
    testfile = folder / 'TestKioskStartup.java'
    testfile.write_text(java)
    javac = shutil.which('javac')
    runtime = shutil.which('java')
    assert javac and runtime, 'A JDK must be on PATH'
    subprocess.run([javac, str(testfile)], check=True)
    subprocess.run([runtime, '-cp', str(folder), 'TestKioskStartup'], check=True)
