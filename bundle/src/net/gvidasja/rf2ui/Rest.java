package net.gvidasja.rf2ui;

import java.util.HashMap;
import java.util.Map;
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

    // Injected by Dependency Manager (see build.ts).
    private volatile SessionService m_sessionService;

    public static class SetValue {
        public long value;
    }

    @GET
    @Path("ping")
    public Map<String, Object> ping() {
        Map<String, Object> m = new HashMap<>();
        m.put("bundle", "gvidasja.rf2ui");
        m.put("sessionService", m_sessionService != null);
        return m;
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
        return Long.parseLong(String.valueOf(v));
    }
}
