package net.gvidasja.rf2ui;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import net.rfactor2.garage.GarageService;
import net.rfactor2.garage.VehicleMod;
import net.rfactor2.garage.WheelLoc;
import net.rfactor2.garage.WheelMod;
import net.rfactor2.netcomm.NetCommService;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import net.rfactor2.sessions.SessionService;
import net.rfactor2.sessions.SessionSetting;
import net.rfactor2.sessions.Setting;
import net.rfactor2.sessions.SettingMode;

/**
 * Extra endpoints on top of the game's OSGi services. Every service call is queued and executed on
 * the game thread (net.rfactor2.jni.Queue), so each call costs roughly one game frame.
 */
@Path("")
@Produces(MediaType.APPLICATION_JSON)
public class Rest {
    // Same mode the stock /rest/sessions endpoints use.
    private static final SettingMode MODE = SettingMode.SETTING_GRANDPRIX;
    private static final int MAX_STEPS = 1000;

    // Injected by Dependency Manager (see build.ts); all three are registered by the game bootstrap.
    private volatile SessionService m_sessionService;
    private volatile GarageService m_garageService;
    private volatile NetCommService m_netCommService;

    public static class SetValue {
        public long value;
    }

    public static class Kick {
        public int slot;
        public String reason;
    }

    public static class GridPosition {
        public long slotId;
        public int position;
    }

    @GET
    @Path("ping")
    public Map<String, Object> ping() {
        Map<String, Object> m = new HashMap<>();
        m.put("bundle", "gvidasja.rf2ui");
        m.put("sessionService", m_sessionService != null);
        m.put("garageService", m_garageService != null);
        m.put("netCommService", m_netCommService != null);
        return m;
    }

    /**
     * What GET /rest/garage/* leaves out: which setup values are locked (fixed-setup races, series rules)
     * and the game's special labels. Keys match the stock garage keys ("VM_..." and "WM_...-W_FL").
     * Settings with fewer than two values (not adjustable on this car) are skipped.
     * Untested in game: call it from the garage screen only.
     */
    @GET
    @Path("garage/meta")
    public Map<String, Object> garageMeta() {
        GarageService g = require(m_garageService, "garage");
        Map<String, Object> settings = new LinkedHashMap<>();
        for (VehicleMod mod : VehicleMod.values()) {
            if (g.getNumberOfSettings(mod) < 2) continue;
            settings.put(mod.name(), meta(g.isValueLocked(mod), g.getSpecialValue(mod)));
        }
        for (WheelMod mod : WheelMod.values()) {
            for (WheelLoc loc : WheelLoc.values()) {
                if (g.getWheelNumberOfSettings(loc, mod) < 2) continue;
                settings.put(mod.name() + "-" + loc.name(), meta(g.isWheelValueLocked(loc, mod), g.getWheelSpecialValue(loc, mod)));
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("fixedSetupRace", g.isFixedSetupRace());
        out.put("settings", settings);
        return out;
    }

    private static Map<String, Object> meta(boolean locked, String special) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("locked", locked);
        if (special != null && !special.isEmpty()) m.put("special", special);
        return m;
    }

    /** Kick a driver (or AI) by slot id with a reason shown to them. Untested in game. */
    @POST
    @Path("session/kick")
    @Consumes(MediaType.APPLICATION_JSON)
    public void kick(Kick body) {
        require(m_netCommService, "netcomm").kickSlot(body.slot, body.reason == null ? "" : body.reason);
    }

    /**
     * Move a car on the starting grid: the native behind the server admin command
     * "/editgrid &lt;position&gt; V:&lt;vehicle&gt;". Argument order (slot id, position) is inferred. Untested.
     */
    @POST
    @Path("session/grid")
    @Consumes(MediaType.APPLICATION_JSON)
    public void editGrid(GridPosition body) {
        require(m_netCommService, "netcomm").editGrid(body.slotId, body.position);
    }

    private static <T> T require(T service, String name) {
        if (service == null) throw new WebApplicationException(name + " service not available", Response.Status.SERVICE_UNAVAILABLE);
        return service;
    }

    /**
     * The native API only moves a session setting one step up or down (with roll-over), so an absolute
     * set is done by stepping towards the target until it is reached or the value stops moving.
     */
    @POST
    @Path("sessions/settings/{setting}")
    @Consumes(MediaType.APPLICATION_JSON)
    public synchronized Setting setSessionSetting(@PathParam("setting") String name, SetValue body) {
        SessionSetting setting;
        try {
            setting = SessionSetting.valueOf(name);
        } catch (IllegalArgumentException e) {
            throw new WebApplicationException("unknown setting " + name, Response.Status.NOT_FOUND);
        }

        Setting current = m_sessionService.getSetting(setting, MODE);
        long target = body.value;

        for (int i = 0; i < MAX_STEPS; i++) {
            long value = asLong(current);
            if (value == target) {
                return current;
            }
            long direction = target > value ? 1 : -1;
            Setting next = m_sessionService.setValue(setting, direction, MODE);
            long nextValue = asLong(next);

            if (nextValue == value) {
                return next; // clamped at a bound
            }
            if (Long.signum(nextValue - value) != direction) {
                // rolled over past a bound: step back and stop at the bound
                return m_sessionService.setValue(setting, -direction, MODE);
            }
            current = next;
        }
        return current;
    }

    private static long asLong(Setting s) {
        Object v = s.getCurrentValue();
        if (v instanceof Number) {
            return Math.round(((Number) v).doubleValue());
        }
        if (v instanceof Boolean) {
            return ((Boolean) v) ? 1 : 0; // BOOL settings, e.g. SESSSET_run_warmup
        }
        return Long.parseLong(String.valueOf(v));
    }
}
