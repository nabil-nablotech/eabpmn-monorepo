package org.unicam.intermediate.service;

import lombok.RequiredArgsConstructor;
import org.camunda.bpm.engine.RepositoryService;
import org.camunda.bpm.engine.repository.ProcessDefinition;
import org.springframework.stereotype.Service;
import org.unicam.intermediate.service.environmental.layers.EnvironmentLayerService;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProcessDefinitionService {

    private final RepositoryService repositoryService;
    private final EnvironmentLayerService environmentLayerService;

    public List<Map<String, Object>> getDeployedProcessDefinitionsWithEnvironment() {
        return repositoryService.createProcessDefinitionQuery()
                .latestVersion()
                .list()
                .stream()
                .sorted(Comparator.comparing(ProcessDefinition::getKey, String.CASE_INSENSITIVE_ORDER))
                .map(pd -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", pd.getId());
                    row.put("key", pd.getKey());
                    row.put("name", pd.getName() != null ? pd.getName() : "");
                    row.put("version", pd.getVersion());
                    row.put("deploymentId", pd.getDeploymentId());
                    row.put("state", pd.isSuspended() ? "SUSPENDED" : "ACTIVE");
                    row.put(
                            "environment",
                            environmentLayerService
                                    .findEnvironmentPayloadByProcessDefinitionId(pd.getId())
                                    .orElse(null)
                    );
                    return row;
                })
                .toList();
    }
}
