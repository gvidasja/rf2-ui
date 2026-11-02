package net.gvidasja.rf2ui;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.jaxrs.json.JacksonJsonProvider;
import java.util.Collections;
import java.util.Set;
import javax.ws.rs.core.Application;

/** JAX-RS application mounted at /rest/rf2ui (see build.ts for the service properties). */
public class RestApp extends Application {
    @Override
    public Set<Object> getSingletons() {
        return Collections.<Object>singleton(new JacksonJsonProvider(new ObjectMapper()));
    }
}
