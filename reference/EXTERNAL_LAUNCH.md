# Launching a configured offline race from an external app

Investigated Nov 2026. The player.JSON path was tested in game; the rest is still untested.

## Verified in the game binary (Nov 2026)
- The exe code is encrypted on disk (SteamStub `.bind`). It was read from memory while the game ran, using
  ReadProcessMemory, without patching anything.
- `setSessionValue(settingID, …)` is a jump table over the settingIDs. Each case steps the value and writes it
  into a global config-entry object. Each object holds the **player.JSON key name** and a comment such as
  `range: 0-4`. So the session settings *are* the player.JSON entries:
  - `CURNT …` is the active copy;
  - `GPRIX`, `CHAMP`, `MULTI` and `RPLAY` are the per-mode copies.
- **Tested:** the game was closed, `CURNT`/`GPRIX Opponents` and `Race Time` were edited in
  `UserData/player/player.JSON`, and the game was restarted. `GET /rest/sessions` then returned the edited values.
- Extracting these functions into a standalone DLL buys nothing: they only edit that config table. Content
  listing and series filters do depend on engine state, which is initialised by the whole game.

| settingID | session setting | player.JSON key (mode copies: GPRIX/CHAMP/MULTI/RPLAY) |
|---|---|---|
| 0 | `SESSSET_pract1` | `Run Practice1` |
| 1 | `SESSSET_pract2` | `Run Practice2` |
| 2 | `SESSSET_pract3` | `Run Practice3` |
| 3 | `SESSSET_pract4` | `Run Practice4` |
| 4 | `SESSSETD_num_qual_sessions` | `CURNT Num Qual Sessions` |
| 5 | `SESSSET_run_warmup` | `Run Warmup` |
| 6 | `SESSSET_num_race_sessions` | `CURNT Num Race Sessions` |
| 7 | `SESSSET_race_timer` | `Race Timer` |
| 8 | `SESSSET_recon_pit_open` | `Recon Pit Open` |
| 9 | `SESSSET_recon_pit_closed` | `Recon Pit Closed` |
| 10 | `SESSSET_recon_timer` | `Recon Timer` |
| 11 | `SESSSET_reconnaissance` | `CURNT Reconnaissance` |
| 12 | `SESSSET_walkthrough` | `CURNT Grid Walkthrough` |
| 13 | `SESSSET_formation` | `CURNT Formation Lap` |
| 14 | `SESSSET_force_formation` | `Force Formation` |
| 15 | `SESSSET_unsportsmanlike` | `CURNT Unsportsmanlike Sensitivity` |
| 16 | `SESSSET_safetycarcollision` | `CURNT Safety Car Collidable` |
| 17 | `SESSSET_safetycar_thresh` | `CURNT Safety Car Thresh` |
| 18 | `SESSSET_adjust_frozen` | `Adjust Frozen Order` |
| 19 | `SESSSET_flag_rules` | `CURNT Flag Rules` |
| 20 | `SESSSET_blue_flags` | `CURNT BlueFlags` |
| 21 | `SESSSET_cuts_allowed` | `CURNT Track Limits Points Allowed` |
| 22 | `SESSSET_cut_rules` | `CURNT Track Limits Rules` |
| 23 | `SESSSET_weather` | `CURNT Weather` |
| 24 | `SESSSET_timescaled_weather` | `CURNT TimeScaledWeather` |
| 28 | `SESSSET_practice1_starting_time` | `Practice1StartingTime` |
| 29 | `SESSSET_warmup_starting_time` | `WarmupStartingTime` |
| 30 | `SESSSET_qualify_starting_time` | `QualifyingStartingTime` |
| 31 | `SESSSET_race_starting_time` | `CURNT RaceStartingTime` |
| 32 | `SESSSET_race_timescale` | `CURNT RaceTimeScale` |
| 33 | `SESSSET_private_qual` | `CURNT PrivateQualifying` |
| 34 | `SESSSET_private_prac` | `CURNT PrivatePractice` |
| 35 | `SESSSET_parc_ferme` | `CURNT ParcFerme` |
| 39 | `SESSSET_Qualify_Laps` | `qualifying laps` |
| 40 | `SESSSET_Race_Laps` | `CURNT Race Laps` |
| 41 | `SESSSET_Fuel_Usage` | `CURNT Fuel Consumption Multiplier` |
| 42 | `SESSSET_Tire_Wear` | `CURNT Tire Wear Multiplier` |
| 43 | `SESSSET_Mech_Failures` | `CURNT Failure Rate` |
| 44 | `SESSSET_Num_Opponents` | `CURNT Opponents` |
| 45 | `SESSSET_Damage_Multi` | `CURNT Damage Multiplier` |
| 46 | `SESSSET_AI_Strength` | `CURNT AI Driver Strength` |
| 47 | `SESSSET_AI_Aggression` | `AI Aggression` |
| 48 | `SESSSET_AI_Limiter` | `AI Limiter` |
| 49 | `SESSSET_Finish_Criteria` | `CURNT Race Finish Criteria` |
| 50 | `SESSSET_Grid_Position` | `Starting Pos` |
| 60 | `SESSSET_race_time` | `CURNT Race Time` |

Settings missing from the table (session lengths, RealRoad) are written by other code paths. The probe in
`SETTINGS.md` and `player.JSON` itself (`practice length`, `qualifying length`, …) cover them.

## Findings
- **No native switch is known to start a single-player race.** `rFactor2.exe` contains rFactor 1 era strings
  `+quickrace`, `+testday`, `+grandprix`, `+skipoptions`, `+scene`, `+vehicle`, `+page=` and `+autoescape`
  (next to `options.cpp`). Whether they still work is unknown: try them once by hand.
- **Natives can't run without the game.** The roughly 249 JNI exports are in the exe and rely on in-game
  singletons. Installed content can be listed from files instead:
  - cars in `Installed/Vehicles/<name>/<ver>/*.mft|.mas`;
  - tracks in `Installed/Locations/...`;
  - series in `Installed/rFm/*.mas`, read with the MAS2 decoder in `F:/dev/mas2-deno`.
  - The `.rfm` filters (which cars and tracks a series allows) would have to be re-implemented.
- **Where settings persist between runs.** Edit these only while the game is stopped, because it rewrites them on exit.
  - `UserData/player/player.JSON`:
    - `DRIVER` (series `.rfm`, vehicle `.VEH`) and `SCENE` (`.SCN`, `.AIW`, plus a SHA-256 "Scene Signature"
      that may need to be valid);
    - single-player values with the `GPRIX *` prefix (they map one to one onto the `SESSSET_*` keys);
    - shared values for session lengths and start times.
  - `UserData/player/<Mod>.cch` holds `SinglePlayerVehicle` and the AI settings.
  - `UserData/player/Settings/<track>/<layout>s.wet` holds weather per session.
- **Extra arguments reach Java.** Unknown arguments appear in `GET /rest/options/commandline` (`Options.getCommandLine`).
  `JAVA_TOOL_OPTIONS=-D...` is honoured too. `Bootstrap` does not receive argv itself.
- **A dedicated server plus `+connect` is not worth it.** Server and client both load the track, the session
  uses the MULTI rules, and the client still ends up in the garage.

## Recommended design: autostart from the bundle
1. The external app lists content from files and writes `pending-race.json`, holding the series, car, track,
   `SESSSET_*` values, opponent filters and weather.
2. It launches the game with `+rf2ui.race=<file>`, or uses a fixed file in `UserData/player/` if Steam drops
   the arguments.
3. `gvidasja.rf2ui` waits for the main-menu state, then applies the series, car, track and settings
   (natives or REST) and calls `startRace`. Afterwards it deletes the file.

This saves the menu clicks, not loading time. Editing the files (B above) can pre-fill the values so the brief
menu flash shows the right data.
