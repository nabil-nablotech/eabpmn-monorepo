package org.unicam.intermediate.service.environmental.layers;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EnvironmentLayerService {

    private final EnvironmentLayerRepository environmentLayerRepository;

    public String insertPhysicalLayer(String source, String deploymentId, String resourceName,
                                      String physicalPlacesJson, String edgesJson) {
        return environmentLayerRepository.insertPhysicalLayer(
                source, deploymentId, resourceName, physicalPlacesJson, edgesJson
        );
    }

    public String insertLogicalLayer(String source, String deploymentId, String resourceName,
                                     String physicalLayerId, String logicalPlacesJson, String viewsJson) {
        return environmentLayerRepository.insertLogicalLayer(
                source, deploymentId, resourceName, physicalLayerId, logicalPlacesJson, viewsJson
        );
    }

    public void upsertCollaborationLayer(String deploymentId, String logicalLayerId) {
        environmentLayerRepository.upsertCollaborationLayer(deploymentId, logicalLayerId);
    }

    public void upsertProcessDefinitionLayer(String processDefinitionId, String deploymentId, String logicalLayerId) {
        environmentLayerRepository.upsertProcessDefinitionLayer(processDefinitionId, deploymentId, logicalLayerId);
    }

    public Optional<Map<String, Object>> findEnvironmentPayloadByProcessDefinitionId(String processDefinitionId) {
        return environmentLayerRepository.findBundleByProcessDefinitionId(processDefinitionId)
                .map(this::toEnvironmentPayload);
    }

    private Map<String, Object> toEnvironmentPayload(EnvironmentLayerBundle bundle) {
        Map<String, Object> env = new HashMap<>();
        env.put("physicalPlaces", toList(bundle.getPhysicalPlaces()));
        env.put("edges", toList(bundle.getEdges()));
        env.put("logicalPlaces", toList(bundle.getLogicalPlaces()));
        env.put("views", toList(bundle.getViews()));
        return env;
    }

    private <T> List<T> toList(List<T> value) {
        return value != null ? value : List.of();
    }
}
