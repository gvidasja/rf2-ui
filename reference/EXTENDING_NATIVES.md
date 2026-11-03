# Adding or hooking native functions

Investigated read-only (Nov 2026). Most robust options are listed first.

## How the natives are bound
- `Bin64/rFactor2.exe` starts the JVM itself: `Bin64/JRE/bin/server/jvm.dll` (Oracle Java 8u111) via
  `JNI_CreateJavaVM` with `-Djava.class.path=Bin/rFactor2.jar -Dorg.osgi.service.http.port=5397`, then `Bootstrap.start`.
- Natives are bound with `RegisterNatives`; there are no `Java_net_rfactor2_*` symbols. The exe also exports
  about 249 natives by plain name (`addAI`, `getLiveStandings`, …), which are stable hook points.
- There is no SecurityManager. Felix 6.0.1 supports `Bundle-NativeCode`, and `System.load` works.
  `net.rfactor2.jni` is exported to all bundles, so a bundle can subclass `Command` and use `Queue.add`
  to run on the game thread.

## Options
1. **Pure Java, available now.** The exe pushes scoring data through `DataPlugin.scoring(byte[])`, which
   is posted as `ScoringInfo` on the EventAdmin topic `net/rfactor2/event/SCORING`. Add an `EventHandler`
   to our bundle. The unused natives are also available (see `NATIVE.md`).
2. **A JNI DLL in our bundle that reads the shared-memory plugin.** `Bin64/Plugins/rFactor2SharedMemoryMapPlugin64.dll`
   v3.7.15.1 is installed and enabled.
   - It outputs telemetry, scoring, rules, force feedback, graphics, pit info and weather.
   - It accepts input for HWControl (pit menu and controls) and, if enabled in
     `UserData/player/CustomPluginVariables.JSON`, rules and weather.
   - It uses a documented interface, so it survives game updates.
3. **Our own InternalsPlugin DLL** (the exe supports V01 to V08), called from the bundle through JNI in the
   same process. Its callbacks run on the game thread. This gives the full SDK, at the cost of maintaining C++.
4. **Hooking with MinHook** on the named exports, or on internals. There is no EasyAntiCheat or BattlEye,
   but the exe is SteamStub-wrapped, so hook in memory rather than patching the file. Hooking internals
   breaks with every update, and a crash takes the whole game down. Avoid.
