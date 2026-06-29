package org.unicam.intermediate.service.environmental.layers;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.unicam.intermediate.models.pojo.Edge;
import org.unicam.intermediate.models.pojo.LogicalPlace;
import org.unicam.intermediate.models.pojo.PhysicalPlace;
import org.unicam.intermediate.models.pojo.View;

import java.util.List;

@Getter
@AllArgsConstructor
public class EnvironmentLayerBundle {
    private final String physicalLayerId;
    private final String logicalLayerId;
    private final List<PhysicalPlace> physicalPlaces;
    private final List<Edge> edges;
    private final List<LogicalPlace> logicalPlaces;
    private final List<View> views;
}

