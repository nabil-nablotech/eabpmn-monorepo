package org.unicam.intermediate.config;

import lombok.extern.slf4j.Slf4j;
import org.camunda.bpm.engine.RepositoryService;
import org.camunda.bpm.engine.repository.Deployment;
import org.camunda.bpm.engine.repository.ProcessDefinition;
import org.camunda.bpm.model.bpmn.Bpmn;
import org.camunda.bpm.model.bpmn.BpmnModelInstance;
import org.camunda.bpm.model.bpmn.instance.Collaboration;
import org.camunda.bpm.model.bpmn.instance.Participant;
import org.camunda.bpm.model.bpmn.instance.Process;
import org.unicam.intermediate.service.environmental.layers.EnvironmentLayerService;
import org.unicam.intermediate.service.participant.ParticipantDataService;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Debug utility that logs JSON resources included in newly created Camunda deployments.
 * Useful to verify "Include additional file" payloads sent by the Modeler.
 */
@Component
@Slf4j
public class DeploymentJsonLogger {

    private final RepositoryService repositoryService;
    private final ParticipantDataService participantDataService;
    private final EnvironmentLayerService environmentLayerService;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private final Set<String> seenDeploymentIds = ConcurrentHashMap.newKeySet();

    public DeploymentJsonLogger(RepositoryService repositoryService,
                                ParticipantDataService participantDataService,
                                EnvironmentLayerService environmentLayerService) {
        this.repositoryService = repositoryService;
        this.participantDataService = participantDataService;
        this.environmentLayerService = environmentLayerService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeSeenDeployments() {
        List<Deployment> existing = repositoryService.createDeploymentQuery()
                .orderByDeploymentTime()
                .asc()
                .list();

        for (Deployment deployment : existing) {
            seenDeploymentIds.add(deployment.getId());
        }

        log.info("[DeploymentJsonLogger] Initialized with {} existing deployments", existing.size());
    }

    @Scheduled(fixedDelay = 2000)
    public void logJsonFilesFromNewDeployments() {
        List<Deployment> latestDeployments = repositoryService.createDeploymentQuery()
                .orderByDeploymentTime()
                .desc()
                .listPage(0, 20);

        if (latestDeployments.isEmpty()) {
            return;
        }

        List<Deployment> newDeployments = new ArrayList<>();
        for (Deployment deployment : latestDeployments) {
            if (seenDeploymentIds.add(deployment.getId())) {
                newDeployments.add(deployment);
            }
        }

        // Log in chronological order when multiple deployments are found together.
        newDeployments.sort(Comparator.comparing(Deployment::getDeploymentTime));

        for (Deployment deployment : newDeployments) {
            processDeploymentResources(deployment);
        }
    }

    private void processDeploymentResources(Deployment deployment) {
        List<String> resourceNames = repositoryService.getDeploymentResourceNames(deployment.getId());

        if (resourceNames == null || resourceNames.isEmpty()) {
            return;
        }

        ingestEnvironmentLayersFromJsonResources(deployment, resourceNames);
        logCollaborationParticipants(deployment, resourceNames);
    }

    private void ingestEnvironmentLayersFromJsonResources(Deployment deployment, List<String> resourceNames) {

        List<String> jsonResources = resourceNames.stream()
                .filter(name -> name != null && name.toLowerCase().endsWith(".json"))
                .toList();

        if (jsonResources.isEmpty()) {
            return;
        }

        log.info("[DeploymentJsonLogger] New deployment '{}' ({}) has JSON resources: {}",
                deployment.getName(), deployment.getId(), jsonResources);

        // Load participant/process info from BPMN to support associating multiple environments to the right pool.
        DeploymentBpmnInfo bpmnInfo = readDeploymentBpmnInfo(deployment.getId(), resourceNames);

        List<StoredLayerInfo> storedLayers = new ArrayList<>();

        for (String resourceName : jsonResources) {
            try (InputStream inputStream = repositoryService.getResourceAsStream(deployment.getId(), resourceName)) {
                if (inputStream == null) {
                    log.warn("[DeploymentJsonLogger] JSON resource '{}' could not be read from deployment {}",
                            resourceName, deployment.getId());
                    continue;
                }

                String content = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
                String source = deployment.getId() + "/" + resourceName;

                Optional<StoredLayerInfo> stored = storeEnvironmentLayersIfPresent(content, source, deployment.getId(), resourceName);
                int loadedParticipants = participantDataService.loadParticipantsFromJsonContent(content, source);

                if (stored.isPresent() || loadedParticipants > 0) {
                    log.info("[DeploymentJsonLogger] Processed deployment JSON '{}' (storedLayers={}, participantsLoaded={})",
                            source, stored.isPresent(), loadedParticipants);
                    stored.ifPresent(storedLayers::add);
                } else {
                    log.info("[DeploymentJsonLogger] JSON '{}' does not contain environment/participants sections to apply",
                            source);
                }
            } catch (Exception e) {
                log.error("[DeploymentJsonLogger] Failed reading JSON resource '{}' from deployment {}: {}",
                        resourceName, deployment.getId(), e.getMessage(), e);
            }
        }

        // If multiple environment JSONs were deployed together, map each processDefinitionId to the best matching layer.
        // Match is done primarily by pool/participant id (and also process id / participant name / json filename).
        if (!storedLayers.isEmpty()) {
            upsertProcessDefinitionLayerMappings(deployment.getId(), storedLayers, bpmnInfo);
        }
    }

    private Optional<StoredLayerInfo> storeEnvironmentLayersIfPresent(String jsonContent, String source, String deploymentId, String resourceName) {
        try {
            JsonNode root = objectMapper.readTree(jsonContent);
            if (root == null || !root.isObject()) {
                return Optional.empty();
            }

            JsonNode physicalPlacesNode = root.get("physicalPlaces");
            JsonNode edgesNode = root.get("edges");
            JsonNode logicalPlacesNode = root.get("logicalPlaces");
            JsonNode viewsNode = root.get("views");

            boolean hasPhysical = physicalPlacesNode != null && physicalPlacesNode.isArray()
                    && edgesNode != null && edgesNode.isArray();
            boolean hasLogical = logicalPlacesNode != null && logicalPlacesNode.isArray()
                    && viewsNode != null && viewsNode.isArray();

            if (!hasPhysical && !hasLogical) {
                return Optional.empty();
            }

            // Always persist as two layers; if a part is missing, store an empty array for that part.
            String physicalPlacesJson = objectMapper.writeValueAsString(
                    hasPhysical ? physicalPlacesNode : Collections.emptyList()
            );
            String edgesJson = objectMapper.writeValueAsString(
                    hasPhysical ? edgesNode : Collections.emptyList()
            );
            String logicalPlacesJson = objectMapper.writeValueAsString(
                    hasLogical ? logicalPlacesNode : Collections.emptyList()
            );
            String viewsJson = objectMapper.writeValueAsString(
                    hasLogical ? viewsNode : Collections.emptyList()
            );

            String physicalLayerId = environmentLayerService.insertPhysicalLayer(
                    source, deploymentId, resourceName, physicalPlacesJson, edgesJson
            );
            String logicalLayerId = environmentLayerService.insertLogicalLayer(
                    source, deploymentId, resourceName, physicalLayerId, logicalPlacesJson, viewsJson
            );

            environmentLayerService.upsertCollaborationLayer(deploymentId, logicalLayerId);

            StoredLayerInfo info = new StoredLayerInfo(
                    physicalLayerId,
                    logicalLayerId,
                    deploymentId,
                    resourceName,
                    source,
                    extractAssociationKeys(root, resourceName)
            );

            // Important: do NOT overwrite the singleton in-memory environment model here.
            // That would break multiple deployments; cockpit will fetch by processDefinitionId.
            log.info("[DeploymentJsonLogger] Stored environment layers physicalLayerId={}, logicalLayerId={} for deployment {} (resource='{}', keys={})",
                    physicalLayerId, logicalLayerId, deploymentId, resourceName, info.associationKeys);
            return Optional.of(info);
        } catch (Exception e) {
            log.warn("[DeploymentJsonLogger] Failed to store environment layers from '{}' (deployment={}): {}",
                    source, deploymentId, e.getMessage());
            return Optional.empty();
        }
    }

    private Set<String> extractAssociationKeys(JsonNode root, String resourceName) {
        Set<String> keys = new HashSet<>();

        // 1) Top-level hints (if provided by future JSON formats)
        addIfText(keys, root.get("participantId"));
        addIfText(keys, root.get("poolId"));
        addIfText(keys, root.get("processId"));
        JsonNode participantsNode = root.get("participants");
        if (participantsNode != null && participantsNode.isArray()) {
            for (JsonNode n : participantsNode) {
                addIfText(keys, n);
            }
        }

        // 2) View-level attributes (best place to attach per-pool mapping without changing schema)
        JsonNode viewsNode = root.get("views");
        if (viewsNode != null && viewsNode.isArray()) {
            for (JsonNode view : viewsNode) {
                if (view == null || !view.isObject()) {
                    continue;
                }
                JsonNode attrs = view.get("attributes");
                if (attrs != null && attrs.isObject()) {
                    addIfText(keys, attrs.get("participantId"));
                    addIfText(keys, attrs.get("poolId"));
                    addIfText(keys, attrs.get("participant"));
                    addIfText(keys, attrs.get("pool"));
                    addIfText(keys, attrs.get("processId"));
                    addIfText(keys, attrs.get("processRef"));
                }
                // Some users may name the view with the pool/participant
                addIfText(keys, view.get("id"));
                addIfText(keys, view.get("name"));
            }
        }

        // 3) Filename hints (common practice: name env file after participant/pool/process)
        if (resourceName != null) {
            keys.add(resourceName);
            String base = resourceName;
            int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
            if (slash >= 0) base = base.substring(slash + 1);
            if (base.toLowerCase().endsWith(".json")) base = base.substring(0, base.length() - 5);
            keys.add(base);
        }

        // normalize
        keys.removeIf(k -> k == null || k.isBlank());
        return keys;
    }

    private void addIfText(Set<String> keys, JsonNode n) {
        if (n == null || n.isNull()) return;
        if (n.isTextual()) {
            String v = n.asText();
            if (v != null && !v.isBlank()) keys.add(v.trim());
        }
    }

    private void upsertProcessDefinitionLayerMappings(String deploymentId, List<StoredLayerInfo> layers, DeploymentBpmnInfo bpmnInfo) {
        List<ProcessDefinition> processDefinitions = repositoryService
                .createProcessDefinitionQuery()
                .deploymentId(deploymentId)
                .list();

        Map<String, ProcessDefinition> byKey = new HashMap<>();
        for (ProcessDefinition pd : processDefinitions) {
            if (pd != null && pd.getKey() != null) {
                byKey.put(pd.getKey(), pd);
            }
        }

        // If only one layer, map all processes to it (keeps previous behavior).
        if (layers.size() == 1) {
            String logicalLayerId = layers.get(0).logicalLayerId;
            for (ProcessDefinition pd : processDefinitions) {
                if (pd == null || pd.getId() == null) continue;
                environmentLayerService.upsertProcessDefinitionLayer(pd.getId(), deploymentId, logicalLayerId);
            }
            log.info("[DeploymentJsonLogger] Mapped {} process definitions to the only logical layer {}", processDefinitions.size(), logicalLayerId);
            return;
        }

        // Multi-layer: map per pool (participant) -> process definition
        int mapped = 0;
        for (PoolInfo pool : bpmnInfo.pools) {
            if (pool == null || pool.processId == null || pool.processId.isBlank()) {
                continue;
            }
            ProcessDefinition pd = byKey.get(pool.processId);
            if (pd == null || pd.getId() == null) {
                continue;
            }

            StoredLayerInfo best = pickBestLayerForPool(layers, pool);
            if (best == null) {
                continue;
            }

            environmentLayerService.upsertProcessDefinitionLayer(pd.getId(), deploymentId, best.logicalLayerId);
            mapped++;
            log.info("[DeploymentJsonLogger] Mapped pool participantId='{}' processId='{}' -> processDefinitionId='{}' using env='{}'",
                    pool.participantId, pool.processId, pd.getId(), best.resourceName);
        }

        if (mapped == 0) {
            // Fallback A (order-based): if counts match, map N JSON files to N process definitions by index.
            // This supports the simple convention: first included JSON -> first process, second JSON -> second process.
            // Deterministic ordering is used to avoid accidental reordering from the engine/query APIs.
            List<ProcessDefinition> orderedProcessDefinitions = processDefinitions.stream()
                    .filter(Objects::nonNull)
                    .filter(pd -> pd.getId() != null && pd.getKey() != null)
                    .sorted((a, b) -> {
                        int c = a.getKey().compareToIgnoreCase(b.getKey());
                        if (c != 0) return c;
                        return a.getId().compareToIgnoreCase(b.getId());
                    })
                    .toList();

            List<StoredLayerInfo> orderedLayers = layers.stream()
                    .filter(Objects::nonNull)
                    .sorted((a, b) -> {
                        String ar = a.resourceName != null ? a.resourceName : "";
                        String br = b.resourceName != null ? b.resourceName : "";
                        int c = ar.compareToIgnoreCase(br);
                        if (c != 0) return c;
                        return a.logicalLayerId.compareToIgnoreCase(b.logicalLayerId);
                    })
                    .toList();

            if (orderedLayers.size() == orderedProcessDefinitions.size() && !orderedLayers.isEmpty()) {
                for (int i = 0; i < orderedLayers.size(); i++) {
                    StoredLayerInfo layer = orderedLayers.get(i);
                    ProcessDefinition pd = orderedProcessDefinitions.get(i);
                    environmentLayerService.upsertProcessDefinitionLayer(pd.getId(), deploymentId, layer.logicalLayerId);
                    log.info("[DeploymentJsonLogger] Order-mapped processDefinitionKey='{}' id='{}' -> env='{}'",
                            pd.getKey(), pd.getId(), layer.resourceName);
                }
                log.warn("[DeploymentJsonLogger] Used ORDER-BASED environment mapping for deployment {} ({} processes <-> {} env JSONs). Consider adding participantId/processId hints for stronger matching.",
                        deploymentId, orderedProcessDefinitions.size(), orderedLayers.size());
                return;
            }

            // Fallback B: map everything to the first layer to keep things usable
            String logicalLayerId = layers.get(0).logicalLayerId;
            for (ProcessDefinition pd : processDefinitions) {
                if (pd == null || pd.getId() == null) continue;
                environmentLayerService.upsertProcessDefinitionLayer(pd.getId(), deploymentId, logicalLayerId);
            }
            log.warn("[DeploymentJsonLogger] Could not resolve per-pool mapping for deployment {} and order-based mapping not applicable (processes={}, envJsons={}). Fell back to mapping all processes to '{}'",
                    deploymentId, processDefinitions.size(), layers.size(), layers.get(0).resourceName);
        } else {
            log.info("[DeploymentJsonLogger] Mapped {} pools to environment layers for deployment {}", mapped, deploymentId);
        }
    }

    private StoredLayerInfo pickBestLayerForPool(List<StoredLayerInfo> layers, PoolInfo pool) {
        // Score layers based on matching keys
        StoredLayerInfo best = null;
        int bestScore = -1;
        for (StoredLayerInfo layer : layers) {
            int score = 0;
            score += matches(layer, pool.participantId) ? 50 : 0;
            score += matches(layer, pool.participantName) ? 20 : 0;
            score += matches(layer, pool.processId) ? 40 : 0;
            // allow filename-base matching for common conventions
            if (score > bestScore) {
                bestScore = score;
                best = layer;
            }
        }
        // Require some match to avoid random assignment
        return bestScore > 0 ? best : null;
    }

    private boolean matches(StoredLayerInfo layer, String value) {
        if (value == null || value.isBlank()) return false;
        String v = value.trim();
        for (String k : layer.associationKeys) {
            if (k == null) continue;
            if (k.equals(v) || k.equalsIgnoreCase(v)) return true;
            // token contains (useful for filenames like Student_env.json)
            if (k.toLowerCase().contains(v.toLowerCase()) || v.toLowerCase().contains(k.toLowerCase())) return true;
        }
        return false;
    }

    private DeploymentBpmnInfo readDeploymentBpmnInfo(String deploymentId, List<String> resourceNames) {
        DeploymentBpmnInfo info = new DeploymentBpmnInfo();

        List<String> bpmnResources = resourceNames.stream()
                .filter(name -> name != null && name.toLowerCase().endsWith(".bpmn"))
                .toList();

        for (String resourceName : bpmnResources) {
            try (InputStream inputStream = repositoryService.getResourceAsStream(deploymentId, resourceName)) {
                if (inputStream == null) continue;
                BpmnModelInstance modelInstance = Bpmn.readModelFromStream(inputStream);

                Collaboration collab = modelInstance.getModelElementsByType(Collaboration.class).stream().findFirst().orElse(null);
                if (collab == null) continue;

                for (Participant p : collab.getParticipants()) {
                    if (p == null) continue;
                    Process pr = p.getProcess();
                    String processId = pr != null ? pr.getId() : null; // processRef id
                    info.pools.add(new PoolInfo(p.getId(), p.getName(), processId));
                }
            } catch (Exception e) {
                log.warn("[DeploymentJsonLogger] Failed to parse BPMN '{}' for pool mapping: {}", resourceName, e.getMessage());
            }
        }

        // Deduplicate
        info.pools.removeIf(Objects::isNull);
        return info;
    }

    private static class StoredLayerInfo {
        final String physicalLayerId;
        final String logicalLayerId;
        final String deploymentId;
        final String resourceName;
        final String source;
        final Set<String> associationKeys;

        StoredLayerInfo(String physicalLayerId, String logicalLayerId, String deploymentId, String resourceName, String source, Set<String> associationKeys) {
            this.physicalLayerId = physicalLayerId;
            this.logicalLayerId = logicalLayerId;
            this.deploymentId = deploymentId;
            this.resourceName = resourceName;
            this.source = source;
            this.associationKeys = associationKeys != null ? associationKeys : Set.of();
        }
    }

    private static class PoolInfo {
        final String participantId;
        final String participantName;
        final String processId;

        PoolInfo(String participantId, String participantName, String processId) {
            this.participantId = participantId;
            this.participantName = participantName;
            this.processId = processId;
        }
    }

    private static class DeploymentBpmnInfo {
        final List<PoolInfo> pools = new ArrayList<>();
    }

    private void logCollaborationParticipants(Deployment deployment, List<String> resourceNames) {
        List<String> bpmnResources = resourceNames.stream()
                .filter(name -> name != null && name.toLowerCase().endsWith(".bpmn"))
                .toList();

        if (bpmnResources.isEmpty()) {
            return;
        }

        List<org.unicam.intermediate.models.pojo.Participant> extractedParticipants = new ArrayList<>();

        for (String resourceName : bpmnResources) {
            try (InputStream inputStream = repositoryService.getResourceAsStream(deployment.getId(), resourceName)) {
                if (inputStream == null) {
                    continue;
                }

                BpmnModelInstance modelInstance = Bpmn.readModelFromStream(inputStream);
                var participants = modelInstance.getModelElementsByType(Participant.class);

                if (participants == null || participants.isEmpty()) {
                    continue;
                }

                log.info("[DeploymentJsonLogger] Collaboration participants in '{}' (deployment={}):",
                        resourceName, deployment.getId());

                for (Participant participant : participants) {
                    String participantId = participant.getId();
                    String participantName = participant.getName();
                    log.info("[DeploymentJsonLogger] - participantId='{}', participantName='{}'",
                            participantId, participantName);

                    if (participantId == null || participantId.isBlank()) {
                        continue;
                    }

                    org.unicam.intermediate.models.pojo.Participant runtimeParticipant =
                            new org.unicam.intermediate.models.pojo.Participant();
                    runtimeParticipant.setId(participantId);
                    runtimeParticipant.setName(participantName);
                    runtimeParticipant.setPosition(null);
                    extractedParticipants.add(runtimeParticipant);
                }
            } catch (Exception e) {
                log.warn("[DeploymentJsonLogger] Failed to parse BPMN '{}' for participants: {}",
                        resourceName, e.getMessage());
            }
        }

        if (!extractedParticipants.isEmpty()) {
            String source = deployment.getId() + "/collaboration-participants";
            int added = participantDataService.mergeParticipants(extractedParticipants, source);
            log.info("[DeploymentJsonLogger] Merged BPMN collaboration participants for deployment {} (added={})",
                    deployment.getId(), added);
        }
    }
}
