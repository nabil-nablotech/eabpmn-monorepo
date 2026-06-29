package org.unicam.intermediate.cockpit.plugin;

import jakarta.ws.rs.Path;
import org.camunda.bpm.cockpit.plugin.resource.AbstractPluginRootResource;

import java.util.Arrays;
import java.util.List;

/**
 * Same pattern as Camunda cockpit plugin examples: {@code @Path("plugin/" + pluginId)}
 * plus {@link AbstractPluginRootResource} so {@code /static/...} assets resolve correctly.
 */
@Path("plugin/" + EabpmnMapPlugin.ID)
public class EabpmnMapPluginRootResource extends AbstractPluginRootResource {

  public EabpmnMapPluginRootResource() {
    super(EabpmnMapPlugin.ID);
  }

  @Override
  public List<String> getAllowedAssets() {
    return Arrays.asList(
      "app/plugin.js",
      "app/plugin.css"
    );
  }
}

