# AEEZO PF1009 July 2026 firmware: Windows setup report

Session: 2026-10-14 (America/Winnipeg). **Home HQ now starts automatically after
a physical power cycle, with working dashboard rendering and physical navigation.**
The owner may build a completely different dashboard later; the current page is
the repository's hosted prototype with sample data.

| Area | Final result |
| --- | --- |
| USB access | Shipped root ADB; persisted across multiple physical power cycles, including after vendor apps were disabled |
| Backup | Full live eMMC user area and both hardware boot areas captured and verified; writable-filesystem consistency is not guaranteed |
| Browser | WebView 106.0.5249.126 loads its native library and renders the dashboard after restart |
| Kiosk | Local Home HQ 1.1.1 / code 3 with native browser-failure fallback |
| Startup | Home HQ selected as Home with **Always**; saved preference and automatic boot physically verified |
| Escape/navigation | Two-finger menu -> Settings -> Apps; floating Dashboard return; physical post-restart round trip passed |
| Vendor apps | AiMOR, updater, and DeviceTest disabled; saved states and restart persistence verified |
| Network/time | Wi-Fi connected after lockdown; time corrected automatically after connection and on a later boot |
| Timezone | Fixed UTC-5 workaround applied; native readback verified; its restart persistence and WebView behavior remain unverified |
| Remaining | Some HTTPS requests fail certificate trust checks; no personal data, custom dashboard deployment, or full timezone database update |

The sections through the first WebView restart describe successive checkpoints.
Their intermediate failures and pending checks are resolved, where tested, in
[Post-restart rendering](#post-restart-rendering) and the later outcome sections.

This is a report of one owner's unit, not a flashing guide. Follow the
[repository rules](../README.md#rules-we-learned-the-hard-way) and the
[A33 start page](pf1007l-start-here.md). The July firmware below is not in the start
page's tested firmware table at the time of this session.

## Stock USB ADB established with a tested cable

After the owner connected the frame using the cable that enumerated the Pixel phone
and let it boot, Windows detected `1f3a:1002`:

- USB mass-storage interface `MI_00`, driver `usbstor.inf`, status Started.
- Android interface `MI_01`, driver `winusb.inf`, status Started.
- `adb devices -l`: `device`, product `astar_m86_8723cs`, model `AEEZO`,
  device `astar-m86_8723cs`.
- `adb -d shell id`: `uid=0(root) gid=0(root)`.
- `ro.build.fingerprint`:
  `AEEZO/astar_m86_8723cs/astar-m86_8723cs:6.0.1/MOB30R/20260708:eng/test-keys`.
- `ro.build.yhk.id` matches the photographed July firmware string.
- `sys.boot_completed`: `1`.

No device configuration command, RAM payload or boot patch was used to obtain access.
No authorization interaction was requested by ADB during this test.
The initial missing enumeration does not prove the included cable is power-only;
the successful test establishes the replacement cable and host path work.

Official Google platform tools were downloaded into the ignored
`diagnostics/platform-tools-download/` directory from
`https://dl.google.com/android/repository/platform-tools-latest-windows.zip`.
The archive SHA-256 recorded for this session is
`45f4d63113e895ebde0c90f194099a4676b6ac653bd28d54314a9e022bbc1a99`;
ADB reports version `37.0.1-15733141` (protocol version `1.0.41`).
This records the downloaded artifact; the latest-download URL is mutable.
The host ADB service failed to start inside the execution sandbox, then started
successfully outside it. That host failure was not evidence of a device fault.

## Initial observations before the successful cable test (historical)

- Product reported by the owner: AEEZO Digital Picture Frame, purchased through
  [Amazon Canada, B0H4T8HX9K](https://www.amazon.ca/dp/B0H4T8HX9K).
- The owner reports PF1009 on the back and at startup.
- The owner's About-screen photo shows:
  - Model: `PF1009`
  - Firmware: `YHK.F-null-A33-1001-D1024-PF1009-V11-1680.0.20260708`
  - AiMOR version: `6.0.78`
  - AiMOR update status: `Had not updated`
- The initial startup photo also shows `V6.0.78`. This is consistent with the
  About-screen AiMOR version; it is not the full firmware identifier.
- Host: Windows, PowerShell. The owner reports the frame connected over USB.
- The owner confirms there is no separate round power jack; USB-C supplies power.
- Initial cable: the USB-A to USB-C cable included with the frame. Its data
  capability was unconfirmed; the later successful test used a phone-tested cable.
  No electrical test established that the included cable was power-only.
- During a subsequent cable test, Windows enumerated the owner's Pixel 8 Pro
  (`18d1:4ee7`, status Started). This confirms a USB data connection to the phone
  through the cable and host path used for that test. Whether this was the included
  cable or an alternative has not been confirmed; frame enumeration with the tested
  cable was still pending at that point; the successful test is recorded above. No phone serial or other unique identifier is recorded.
- Windows connected-device enumeration using `pnputil` found no matching
  Allwinner (`1f3a`), Rockchip (`2207`) or Google Android (`18d1`) USB vendor IDs
  during the checks. No matching Android/ADB/AEEZO description was found either.
  This does not establish whether the cause is the cable, port, power, driver or device.
- `Get-PnpDevice` could not access its CIM resource in the execution environment;
  the enumeration above used `pnputil` instead.
- `adb` and `usbipd` were not found on the host command path. `wsl` and `gh` were
  found; WSL distribution availability and tool installations elsewhere are unverified.
- At this initial stage, `adb devices` had not been run. The later successful
  test is recorded above.
- Local checkout and upstream `main` both pointed to
  `033b5ac9e1bdec84501e3218873a09fe54555c8a` when checked on 2026-10-14.
- Searches of upstream issues and pull requests for `20260708` found no report of
  this exact AEEZO firmware. The issue search returned an unrelated Skylight report.
  This is a bounded search result, not proof that no report exists.

## Hardware interpretation and limits

- `A33` in the firmware string suggests the Allwinner A33 family. The SoC has not
  been independently identified through FEL or Android properties.
- The [April PF1009 report](pf1007l-pf1009-20260417.md) is relevant background,
  but its firmware contains `PF1007L-OS-PF1009.0.20260417`. This unit instead
  contains `PF1009-V11-1680.0.20260708`. Shared branding and AiMOR version do not
  prove identical firmware, partition layout, eMMC or patch compatibility.
- Other ports remain unconfirmed. The included cable's USB data capability
  remains unconfirmed; a power-only cable is a possible explanation for the
  missing USB enumeration, not an established cause.
- Wi-Fi onboarding was encountered. The owner was advised to skip it and leave
  the frame offline because of the documented
  [AiMOR remote root command exposure](aimor-remote-root-shell.md).
  Wi-Fi was subsequently confirmed disconnected during preparation and only
  connected after vendor-package lockdown, as recorded below.
- The independently confirmed boot image hash and live storage layout are
  recorded below.

## Storage and Android inspection

Initial read-only inspection on 2026-10-14 returned ARMv7 (`armeabi-v7a`), SDK 23
(Android 6), SELinux `Disabled`, and WebView `44.0.2403.119`.
AiMOR's live package metadata confirms version `6.0.78`, code `78`.
Both `persist.sys.usb.config` and `sys.usb.config` were `mass_storage,adb`.
At this initial checkpoint, the vendor launcher, updater and DeviceTest packages
were present and enabled. Their later disable and persistence checks are below. `com.android.systemui` was absent from the package list.

Display inspection returned 1280×800 pixels at density 160. The shipped timezone
is `America/New_York` (the owner's timezone is America/Winnipeg). System free
space was 405,820 KiB, enough for the guide's conservative 300,000 KiB WebView
staging requirement. Stock WebView has its APK plus an `oat` directory; a future
replacement must preserve the entire original tree, including optimized code.
`settings get global wifi_on` returned `1`: the radio is enabled. A subsequent
`dumpsys wifi` read showed `DISCONNECTED/SCANNING`; no network association was
established at that check. Detailed Wi-Fi output was saved privately.

The eMMC user area contains **30,535,680 sectors of 512 bytes = 15,634,268,160
bytes**. This is the smaller known capacity, unlike the April PF1009 report.

| Partition | Block device | Start sector | Sectors |
| --- | --- | --- | --- |
| boot | mmcblk0p6 | 172032 | 65,536 |
| system | mmcblk0p7 | 237568 | 2,097,152 |
| recovery | mmcblk0p9 | 2400256 | 65,536 |

`mmcblk0boot0` and `mmcblk0boot1` each contain 8,192 sectors (4,194,304 bytes).
`system` is mounted read-only. Data, cache, logger and the bootloader filesystem
are mounted writable. Consequently a whole-device capture while Android is
running is **not a consistent offline filesystem snapshot** of those writable
partitions, even if its transfer, hash and gzip readback all pass.

### Backup verification passed

The read-only capture uses the shipped `/sbin/busybox dd`, with binary output
handled directly by the host process rather than PowerShell text redirection.
The full user-area capture was exactly 15,634,268,160 bytes. SHA-256 with host
readback, a scan for 4 KiB `0xCC` runs, independent full boot/system/recovery
rereads against the corresponding full-image ranges, two reads of both hardware
boot areas, and complete gzip decompression readback all passed. The direct USB
read ran at approximately 7.3 MiB/s, taking roughly 34 minutes for the first full
pass. A small on-device compression trial was much slower, so the full image was
transferred uncompressed and compressed on the host.

The image, compressed copy, independent partition copies, hardware boot-area
copies and private hash manifest are in ignored
`backups/pf1009-20260708-20261014/`. The full-device hashes remain private. This
is a verified **live capture**, not proof of offline consistency for writable
filesystems. No device changes were made during the backup phase.

The boot header in the initial capture has page size 2,048, kernel size
10,221,784 bytes and ramdisk size 5,659,948 bytes. The calculated Android boot
image length is 15,886,336 bytes (31,028 sectors). Its initial SHA-256 is
`c0093e7f70ad1a17a3fe80b5ad378584f9821bd8078777d4d6e06f2ee23a8dbf`,
confirmed against the independently reread boot partition. This differs from the documented April firmware;
the shared layout is not a reason to reuse another unit's patch payloads.

## Host preparation (before approved installation)

- Rootless Launcher `3.9.1`, package `amirz.rootless.nexuslauncher`, minimum SDK
  21: official F-Droid download matched the guide's pinned SHA-256. APK signature
  verification passed (v1).
- WebView `106.0.5249.126`, package `com.android.webview`, ARMv7, minimum SDK
  23: the pinned LineageOS download matched the guide's SHA-256. APK signature
  verification passed (v1 and v2).
- Home HQ `1.1`, package `com.wesbos.homehq`, minimum and target SDK 23: built
  from the unmodified kiosk source at the recorded repository revision. Used
  Android Studio's installed JBR 21, official Google build-tools 36.1.0 and API
  34. Build-tools 36.1.0 was selected following the kiosk build guide's note about
  newer JDKs. Archive lengths and Google's published SHA-1 checksums were checked,
  and local SHA-256 hashes recorded. Kiosk signature verification and APK metadata
  inspection passed. This verifies host preparation, not rendering on the device.
- The demo dashboard built successfully from the repository's lockfile with
  `npm ci` and `npm run build`. It still contains sample data. The dependency
  audit reported three high-severity entries in the Wrangler/Miniflare/sharp
  development-tool chain; those tools were not used to serve or deploy the
  dashboard, and no dependency versions were changed in this session.

Host tools, signing key and installers remain in ignored `diagnostics/`.

## Approved launcher installation

After the owner approved installing and opening Rootless Launcher, the firmware
and root identity were rechecked, the backup/undo record reviewed, and upstream
PF1009 reports and `main` checked again. Upstream `main` remained at the recorded
revision. The installer still matched the pinned SHA-256.

- `adb -d install diagnostics/rootless-3.9.1.apk` returned `Success`.
- Package metadata reports version `3.9.1`, code `30911`, installed and enabled.
- The installed `/data/app/amirz.rootless.nexuslauncher-1/base.apk` was read back:
  exactly 1,693,305 bytes, SHA-256 matching the verified installer.
- The launcher activity was explicitly opened; Android's resumed-activity record
  confirms Rootless Launcher. The owner then confirmed swiping up on the panel
  opened the app drawer, showing Settings, AiMOR, Android Keyboard, DeviceTest,
  and other stock apps. The launcher was usable on the physical panel;
  access from the future kiosk to Settings → Apps remains untested.
- No default Home choice was made by the agent. AiMOR remains installed and
  enabled. No WebView replacement, kiosk installation or vendor disable was performed.
- Undo: `adb -d uninstall amirz.rootless.nexuslauncher`.

An ADB activity record is not proof of usable on-panel navigation. The later kiosk
escape-path check must still be performed physically before disabling vendor apps.

## WebView replacement prepared and applied with owner approval

The original WebView tree was archived twice independently over root USB ADB.
Both tar streams were byte-identical; host readback matched, and archive members
were inspected. The tree contains the 38,439,481-byte stock APK and the
2,920,940-byte `oat/arm/webview.odex`. The private archive is
`backups/pf1009-20260708-20261014/stock-webview.tar`.

The pinned replacement was extracted on the host, including all three ARMv7
libraries. The four payload files total 120,282,506 bytes. Available system space
remains 405,820 KiB. The intended staging and rollback paths were checked unused.

Approved replacement procedure:

1. Stage the four payload files under `/data/local/tmp/pf1009-webview-106` and
   verify each against its host SHA-256 and byte count.
2. Remount `/system` writable, create `/system/homehq-new-webview` with APK and
   `lib/arm` libraries, apply root ownership and 0755 directory / 0644 file modes,
   and verify every staged file before touching the live tree.
3. Preserve the entire original tree as `/system/homehq-stock-webview.bak`,
   outside Android's scanned app directories, then move the prepared tree to
   `/system/app/webview`.
4. Read back the live files, verify ownership and modes, sync and remount
   `/system` read-only. Preserve the original odex in the rollback tree.
5. Arrange a normal power cycle only after the kiosk is installed and the owner
   has physically checked its route to Settings → Apps. Keep access available
   until that check passes. After restart, check provider version, library load
   errors and actual dashboard rendering.

Undo: through root ADB, remount `/system` writable, move the replacement tree
aside, restore `/system/homehq-stock-webview.bak` to `/system/app/webview`,
verify the original APK and odex against the private backup manifest, remount
read-only and arrange a normal power cycle. Do not overwrite the rollback tree.

### File update result

The owner explicitly approved the replacement. Identity, root access, original
APK/odex bytes, host payload hashes, backup archive, free space and unused staging
and rollback paths were rechecked. Upstream `main` still matched the recorded
revision and no newer PF1009 report changed the procedure.

- All four files were read back after uploading to userdata staging, after
  preparing the system staging tree, and after moving it into the live path.
  Every byte count and SHA-256 matched.
- The complete original tree is preserved at `/system/homehq-stock-webview.bak`.
  Its APK and odex were independently read back and matched the backup manifest.
- Live directories are 0755, live files 0644, all owned by root:root.
- `/system` was synced, remounted read-only and its mount state checked.
- Root USB ADB and Rootless Launcher's active screen remain available.
- No restart was performed. Package Manager's cached provider version and actual
  WebView runtime/rendering are not yet post-restart verified. A successful file
  replacement alone does not prove the upgraded engine works.
- The cached provider metadata still reported `44.0.2403.119` after the file
  swap; this is recorded as pending restart verification, not a successful runtime upgrade.
- At this checkpoint, kiosk installation, physical escape-path testing, and a
  controlled power cycle were still ahead; vendor packages remained enabled.

The prepared static demo is served on computer loopback at port 4173; its HTML
and referenced bundled assets returned HTTP 200.

## Home HQ installed; first launch failed before native-menu testing

The owner approved installing and opening Home HQ with the USB demo. Upstream
`main` had advanced to `e97c50ba459c49ea8237259f69b95cd28054b628`. The kiosk
changes were reviewed: they add optional accessibility-service rebind/master-switch
repair when granted WRITE_SECURE_SETTINGS; they do not change the two-finger menu.
The already verified, owner-approved build from the original recorded revision
was used for this initial test. No accessibility grant was made.

- Home HQ 1.1, code 2, installed successfully. Its installed APK readback was
  exactly 25,127 bytes and matched its host SHA-256.
- USB reverse mapping `tcp:4173` → `tcp:4173` was created and the local demo
  opened with a VIEW intent. No persistent dashboard URL or default Home change
  was made.
- The activity started but then crashed during WebView initialization. Logs show
  cached provider metadata `44.0.2403.119` and Chromium 106 code
  (`chromium-SystemWebView.apk-default-524912600`). The exception was a
  `NullPointerException` from `AwBrowserProcess` during provider construction.
- The device returned to Rootless Launcher, observed via ADB activity state and
  a private screenshot. Root USB access remains available.
- A provider refresh after restart may resolve the mixed state, but the cause
  was not isolated at this checkpoint. A successful file replacement did not yet
  establish working WebView or dashboard rendering.
- The physical kiosk → Settings → Apps escape-path check has not passed.

### Native fallback update applied with owner approval

The local kiosk source now catches runtime/linkage failures during browser
initialization and presents native Settings, launcher and retry controls. The
two-finger menu handles an absent browser, new intents do not reinitialize a
failed provider, and cleanup only unregisters a receiver that was registered.
This prepares a way to test native navigation before a controlled restart; it
does not bypass or repair the browser failure.

Home HQ 1.1.1, code 3, was built with the original signing key so it can update
the installed package. APK signatures and Android 6 compatibility metadata
passed. Host regression checks compile the actual Activity lifecycle methods
against fakes and cover runtime/linkage failures, partial startup, fallback
intent/cleanup, and normal URL loading/cleanup. Physical-device behavior remains
tested only after approval as recorded below. Installer: ignored `diagnostics/homehq-safe-r3/homehq.apk`, SHA-256
`8fe62c5f540d44dd1517a70098b11259f4bccd5308535edb73ff2c7fb661a0dc`.

The owner approved the update and reopening the USB demo. Pre-write identity,
root, read-only system mount, APK hash and upstream checks passed. Upstream `main`
remained at `e97c50ba459c49ea8237259f69b95cd28054b628`.

- In-place installation returned success and version 1.1.1/code 3.
- Installed APK readback matches the host installer byte for byte.
- WebView initialization still fails before restart, but the exception is now
  caught. Home HQ remains the resumed activity and shows the native **Browser
  unavailable** screen with **Android settings**, **Open launcher** and **Try again**.
  This was observed via private screenshot and current-process logs; it is not
  proof of touch navigation by the owner.
- The owner physically held two fingers still and opened the Home HQ menu,
  selected Android settings, and opened Apps. The owner observed Home HQ,
  OTA_YHK and Rootless Pixel Launcher among the installed apps. **The physical
  kiosk → Settings → Apps escape-path check passed**, on the native fallback
  screen before restart. Post-restart availability remains to be checked.
- No restart, default Home change, accessibility grant or vendor disable was made.

Undo: uninstall `com.wesbos.homehq`; the fallback Rootless Launcher
and enabled vendor launcher remain available. Do not change default Home or
disable vendor apps before the physical navigation and persistent-access checks.

## Post-restart rendering

After the owner passed the native fallback's physical escape test, they unplugged
USB power, reconnected it, and selected Rootless at the boot Home chooser.
Read-only checks confirmed the July firmware/fingerprint, boot completion, root
USB ADB, both USB configuration properties `mass_storage,adb`, and `/system`
read-only. Package Manager now reported WebView **106.0.5249.126**. Home HQ's
installed APK still matched the verified 1.1.1 installer byte for byte.

The loopback-only host demo server still returned HTTP 200. With separate owner
approvals, the USB reverse mapping was recreated and the demo VIEW URL reopened.
Current-process logs showed WebView 106 and **Successfully loaded native library**.
The earlier provider-initialization crash did not recur. A screenshot showed the
dashboard rendered at 1280x800, and the owner physically confirmed that it was
visible, responded to taps, and still allowed the two-finger menu -> Settings ->
Apps route.

The restart resolved the observed initialization failure in this session. Its
precise cause was not independently isolated. EGL configuration errors remained
in logs but did not prevent the captured rendering; they were not used as grounds
for speculative graphics changes.

The USB URL was a temporary VIEW override, not a saved preference. Reverse
mappings were lost on power cycles. Later normal Home HQ launches used the
repository's default hosted demo over Wi-Fi and no longer required the computer's
HTTP server or a USB forwarding rule.

## Vendor lockdown with persistent access

Only after root USB persistence and the physical escape path had passed did the
owner separately approve disabling each package:

| Package | Purpose | Result |
| --- | --- | --- |
| `com.efercro.os.aimor` | Vendor launcher / documented remote root-command route | Disabled |
| `com.yhk.qeota` | Vendor updater, version `API_10-usaFrame-P-L_Yes-20240603` | Disabled |
| `com.DeviceTest` | Privileged factory-test app, version `YHKSign_20250303` | Disabled |

Each `pm disable` was followed by root USB checks, package metadata showing
`enabled=2`, and a later read of `/data/system/users/0/package-restrictions.xml`
showing the same disabled state on disk. The first immediate reads could precede
Android's asynchronous XML update; subsequent reads confirmed it had completed.
The private XML was not published.

After a controlled physical power cycle, all three packages remained disabled,
root USB still returned `uid=0(root)`, and both USB properties remained
`mass_storage,adb`. No matching vendor processes or connection to TCP port 7806
were observed. Those observations are bounded checks, not a complete traffic
analysis or proof that the old Android installation is secure.

No boot patch, persistent-ADB modification, vendor firewall rule, or blanket
Android-service disable was needed. Disabling AiMOR did not remove USB root access
on this unit. Do not assume the same for frames whose only access is temporary
ADB obtained through AiMOR.

Undo, with specific owner approval for each write: `pm enable` the corresponding
package. Android 6 on these frames may restore explicitly enabled state rather
than the original default-enabled state. Keep Rootless and root USB available.

## Wi-Fi, clock recovery, and missing photos

The frame stayed disconnected until the three vendor apps were disabled and
persistence had been verified. The owner then connected Wi-Fi through Android
Settings. Read-only checks confirmed `CONNECTED` and no observed port-7806
connection. No network name, password, address, or device identifier is included
here.

The clock initially read December 31, 1969. The owner approved changing the
shipped `America/New_York` timezone to `America/Winnipeg`, then separately approved
a running-clock correction from host UTC. Readback agreed within one second.
`auto_time` and `auto_time_zone` were already `1`.

The manual clock correction **did not survive a physical power cut**. When the
owner connected Wi-Fi, the clock corrected itself automatically. A subsequent
boot also recovered connected Wi-Fi and the correct date/time. The later snapshot
was taken roughly 464 seconds into that boot; it does not measure how quickly
synchronization occurred or guarantee offline timekeeping. No boot-time NTP fix
was installed.

The hosted demo rendered over Wi-Fi, but some requests failed with
`CertPathValidatorException: Trust anchor for certification path not found` and
Chromium `net_error -202`. The photo area was blank. The exact failed request and
certificate chain were not isolated, so this report does not prescribe a root
certificate to install. No certificate store was changed and no TLS validation
was bypassed.

## Navigation outside the kiosk

Opening Wi-Fi Settings exposed a practical gap: the two-finger menu works inside
Home HQ, and this firmware has no usable system navigation bar to bring the owner
back from Settings. With owner approval, an explicit Home HQ activity launch over
USB returned to the dashboard.

The owner then approved opening Accessibility settings and physically enabled
**Home HQ navigation**. The floating **Back** and **Dashboard** buttons worked on
the panel. Readback showed:

```text
accessibility_enabled=1
enabled_accessibility_services=com.wesbos.homehq/com.wesbos.homehq.NavigationService
```

The service was also listed as active by `dumpsys accessibility`. Its manifest
requests no accessibility event types and sets `canRetrieveWindowContent=false`;
it supplies navigation controls rather than screen-content retrieval.

No `WRITE_SECURE_SETTINGS` permission grant was applied. Upstream's newer
navigation rebind/master-switch repair was reviewed but not integrated into this
local build. The owner-tested service remained active across the later physical
restart, without that grant. This single result does not establish behavior after
future app updates or force stops.

Undo: switch **Home HQ navigation** off in Accessibility settings. Root USB stays
available to return to the kiosk if needed.

## Home selection and automatic startup

The owner approved enabling Home HQ's initially disabled Home alias:

```sh
adb -d shell am start -n com.wesbos.homehq/.MainActivity --ez home true
```

Both package metadata and saved XML confirmed `com.wesbos.homehq.Home` in the
enabled components. This step made Home HQ a Home option; it did not choose the
default. The Home chooser was opened with separate approval:

```sh
adb -d shell am start -a android.intent.action.MAIN -c android.intent.category.HOME
```

The first physical selection of Home HQ immediately opened the dashboard, but
saved XML still said `always="false"`. Reopening Home showed **Use Home HQ as
Home**, **JUST ONCE**, **ALWAYS**, and Rootless as the alternative. The owner tapped
**ALWAYS**. Saved preferred activities then showed `com.wesbos.homehq/.Home` with
`always="true"`.

A subsequent physical power cycle booted directly into Home HQ without the owner
launching it manually. Read-only checks confirmed the Home activity, active
navigation service, root USB, connected Wi-Fi, corrected local time, all three
vendor packages still disabled, WebView 106, and `/system` read-only.

The owner then physically completed **two-finger menu -> Android settings ->
floating Dashboard** after that automatic startup. Automatic boot, the escape
path, and navigation persistence have therefore all passed on this unit.

Rootless remains installed as the fallback. To undo automatic startup, choose
Rootless as the default Home in Android Settings, then disable the Home HQ alias
with the same first command using `--ez home false`, with owner approval. Merely
using **Open launcher** visits Rootless; it does not itself change the default.

## Manitoba permanent-DST workaround

Manitoba announced that clocks would no longer fall back on November 1, 2026.
[IANA tzdb 2026e](https://www.iana.org/time-zones/releases/2026e) includes the change
to permanent UTC-5; see also the
[Manitoba announcement](https://news.gov.mb.ca/news/?archive=&item=75397).

The device's database header is **tzdata2016a**. Read-only host parsing of its
`America/Winnipeg` record predicted the obsolete November fall-back to UTC-6.
Internet clock synchronization corrects the UTC clock but does not replace these
timezone rules.

A setting-only workaround was prepared using the already installed fixed zone
`Etc/GMT+5`. Despite the plus sign in this IANA identifier, its actual offset is
**UTC-5**. Host tests using the exact device data confirmed UTC-5 before and after
the November transition and in January and July 2027. With specific owner approval:

```sh
adb -d shell setprop persist.sys.timezone Etc/GMT+5
```

Property readback matched, native `date +%z` returned `-0500`, and local/UTC date
readbacks differed by five hours. Root USB access remained available.

This is **not a timezone database update**. It does not repair historical Manitoba
dates or queries explicitly using stale `America/Winnipeg` rules. Android/ICU and
WebView timezone consumers need their own validation; replacing one system file
must not be assumed to update them all. WebView runtime behavior and restart
persistence of this final fixed-zone setting were **not tested** before stopping.
No device clock was advanced into November for testing.

Undo: with owner approval, set the property back to `America/Winnipeg`; that
restores the original named zone and its obsolete future rules on this firmware.

## The dashboard's separate demo clock

The displayed 3:xx PM time was not evidence that Android's clock was wrong.
`dashboard/js/app.js` calls `App.setTime(15, 18)` on every fresh load. Time then
advances from 3:18 PM using a session offset. The demo controls in
`dashboard/js/system.js` provide **Real time**: hold the small left-sidebar clock
for about 700 ms, choose **Real time**, and close the controls.

That clears the in-memory offset for the current page session; the next page
reload resets it. The owner was given these instructions, but a successful
physical Real time selection was not reported. A future custom dashboard should
use real time by default and explicitly define its timezone behavior.

## Recovery and remaining work

The device setup is usable independently of the USB demo server: Home HQ boots
into the hosted prototype, Wi-Fi/time recovery worked on the tested boot, and
physical navigation and root USB remain available. Wall-charger-only operation
was not separately tested; the physical restart tests used the known USB path.

Verified backups, originals, local signing keys, and exact per-change undo records
remain private in ignored `backups/`, `diagnostics/`, and `frames/`. Preserve this
checkout or explicitly preserve those artifacts before moving work elsewhere.
Do not blindly restore a full live image or apply another PF1009's boot payload.
For WebView rollback, preserve the replacement aside and restore the **whole**
original tree, including odex, verify against the stock archive, return `/system`
read-only, and arrange an approved physical power cycle. Do not overwrite the
original rollback tree.

Remaining work is deliberately separate from the completed device checks:

- Diagnose the exact HTTPS failures before proposing a certificate change.
- Verify the fixed UTC-5 setting across restart and in actual WebView time handling,
  or prepare a compatible complete timezone-data update.
- Build or choose the owner's eventual dashboard. The current UI, calendars,
  weather, people, and other content are sample data. No personal calendar,
  account credentials, or live-data integration was configured.
- If replacing the page, choose a reachable hosting arrangement and save its URL
  in Home HQ with a separately approved change. A USB loopback URL requires the
  computer and is unsuitable for independent wall-power operation.
- Recheck physical escape/navigation after future kiosk updates or access changes.

No firmware/boot patch, CA installation, secure-settings grant, upstream merge,
commit, push, pull request, or public message was performed. Local source and
notes remain uncommitted. Initial working revision was
`033b5ac9e1bdec84501e3218873a09fe54555c8a`; latest upstream main inspected during
setup was `e97c50ba459c49ea8237259f69b95cd28054b628`. No upstream changes were
silently applied to this checkout.

## Unit report checklist

```text
About model / firmware: PF1009 / YHK.F-null-A33-1001-D1024-PF1009-V11-1680.0.20260708
AiMOR: 6.0.78 / code 78, subsequently disabled
OS: Android 6.0.1 / SDK 23 / ARMv7; SELinux Disabled
Ports: USB-C power/data; no separate round DC jack; other ports unconfirmed
Working cable: phone-tested USB-A to USB-C data cable; included cable unproven
USB ID / access: 1f3a:1002 / shipped uid=0 root ADB, persists after physical restart
eMMC user area: 30,535,680 sectors / 15,634,268,160 bytes
Boot partition start: sector 172032; image length 31,028 sectors
Boot image SHA-256: c0093e7f70ad1a17a3fe80b5ad378584f9821bd8078777d4d6e06f2ee23a8dbf
Root route: stock USB ADB; no access patch required
FEL / network-ADB route: not tested or needed
Host: Windows / PowerShell
Result: automatic HomeHQ boot, physical navigation, root USB and vendor-disable persistence passed
Outstanding: photo TLS diagnosis; final fixed-zone WebView/restart checks; personal dashboard
```

## Privacy and publication

Serials, MAC addresses, Wi-Fi details, eMMC identifiers, device credentials, and
whole-device hashes are omitted. Firmware identifiers and the boot-image hash
are included to distinguish this unit from incompatible variants. Raw logs,
screenshots, vendor APKs, dumps, and keys remain private. Review the report and
any source changes with the owner before publishing upstream.
