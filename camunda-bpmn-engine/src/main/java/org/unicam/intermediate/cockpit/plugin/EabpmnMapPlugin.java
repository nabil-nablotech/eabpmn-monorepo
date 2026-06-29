package org.unicam.intermediate.cockpit.plugin;

import org.camunda.bpm.cockpit.plugin.spi.impl.AbstractCockpitPlugin;

import java.util.HashSet;
import java.util.Set;

public class EabpmnMapPlugin extends AbstractCockpitPlugin {

  public static final String ID = "eabpmn-map-plugin";

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public Set<Class<?>> getResourceClasses() {
    Set<Class<?>> classes = new HashSet<>();
    classes.add(EabpmnMapPluginRootResource.class);
    return classes;
  }
}

