package org.unicam.intermediate.service.environmental.layers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.unicam.intermediate.models.pojo.Edge;
import org.unicam.intermediate.models.pojo.LogicalPlace;
import org.unicam.intermediate.models.pojo.PhysicalPlace;
import org.unicam.intermediate.models.pojo.View;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class EnvironmentLayerRepository {

    private static final TypeReference<List<PhysicalPlace>> PHYSICAL_PLACES_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Edge>> EDGES_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<LogicalPlace>> LOGICAL_PLACES_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<View>> VIEWS_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public String insertPhysicalLayer(String source, String deploymentId, String resourceName,
                                     String physicalPlacesJson, String edgesJson) {
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "insert into ENV_PHYSICAL_LAYER (ID, CREATED_AT, SOURCE, DEPLOYMENT_ID, RESOURCE_NAME, PHYSICAL_PLACES_JSON, EDGES_JSON) values (?, ?, ?, ?, ?, ?, ?)",
                id,
                Timestamp.from(Instant.now()),
                source,
                deploymentId,
                resourceName,
                physicalPlacesJson,
                edgesJson
        );
        return id;
    }

    public String insertLogicalLayer(String source, String deploymentId, String resourceName,
                                    String physicalLayerId, String logicalPlacesJson, String viewsJson) {
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "insert into ENV_LOGICAL_LAYER (ID, CREATED_AT, SOURCE, DEPLOYMENT_ID, RESOURCE_NAME, PHYSICAL_LAYER_ID, LOGICAL_PLACES_JSON, VIEWS_JSON) values (?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                Timestamp.from(Instant.now()),
                source,
                deploymentId,
                resourceName,
                physicalLayerId,
                logicalPlacesJson,
                viewsJson
        );
        return id;
    }

    public void upsertCollaborationLayer(String deploymentId, String logicalLayerId) {
        // H2 MERGE works as UPSERT by primary key
        jdbcTemplate.update(
                "merge into ENV_COLLABORATION_LAYER (DEPLOYMENT_ID, LOGICAL_LAYER_ID, CREATED_AT) key (DEPLOYMENT_ID) values (?, ?, ?)",
                deploymentId,
                logicalLayerId,
                Timestamp.from(Instant.now())
        );
    }

    public void upsertProcessDefinitionLayer(String processDefinitionId, String deploymentId, String logicalLayerId) {
        jdbcTemplate.update(
                "merge into ENV_PROCESS_DEFINITION_LAYER (PROCESS_DEFINITION_ID, DEPLOYMENT_ID, LOGICAL_LAYER_ID, CREATED_AT) key (PROCESS_DEFINITION_ID) values (?, ?, ?, ?)",
                processDefinitionId,
                deploymentId,
                logicalLayerId,
                Timestamp.from(Instant.now())
        );
    }

    public Optional<EnvironmentLayerBundle> findBundleByProcessDefinitionId(String processDefinitionId) {
        if (processDefinitionId == null || processDefinitionId.isBlank()) {
            return Optional.empty();
        }

        List<EnvironmentLayerBundle> results = jdbcTemplate.query(
                """
                select
                  p.ID as PHYSICAL_LAYER_ID,
                  l.ID as LOGICAL_LAYER_ID,
                  p.PHYSICAL_PLACES_JSON,
                  p.EDGES_JSON,
                  l.LOGICAL_PLACES_JSON,
                  l.VIEWS_JSON
                from ENV_PROCESS_DEFINITION_LAYER m
                join ENV_LOGICAL_LAYER l on l.ID = m.LOGICAL_LAYER_ID
                join ENV_PHYSICAL_LAYER p on p.ID = l.PHYSICAL_LAYER_ID
                where m.PROCESS_DEFINITION_ID = ?
                """,
                (rs, rowNum) -> {
                    try {
                        return mapBundle(rs);
                    } catch (Exception e) {
                        throw new IllegalStateException("Failed to parse stored environment layer JSON", e);
                    }
                },
                processDefinitionId
        );

        return results.stream().findFirst();
    }

    private EnvironmentLayerBundle mapBundle(ResultSet rs) throws Exception {
        String physicalLayerId = rs.getString("PHYSICAL_LAYER_ID");
        String logicalLayerId = rs.getString("LOGICAL_LAYER_ID");

        String physicalPlacesJson = rs.getString("PHYSICAL_PLACES_JSON");
        String edgesJson = rs.getString("EDGES_JSON");
        String logicalPlacesJson = rs.getString("LOGICAL_PLACES_JSON");
        String viewsJson = rs.getString("VIEWS_JSON");

        List<PhysicalPlace> physicalPlaces = objectMapper.readValue(physicalPlacesJson, PHYSICAL_PLACES_TYPE);
        List<Edge> edges = objectMapper.readValue(edgesJson, EDGES_TYPE);
        List<LogicalPlace> logicalPlaces = objectMapper.readValue(logicalPlacesJson, LOGICAL_PLACES_TYPE);
        List<View> views = objectMapper.readValue(viewsJson, VIEWS_TYPE);

        return new EnvironmentLayerBundle(
                physicalLayerId,
                logicalLayerId,
                physicalPlaces,
                edges,
                logicalPlaces,
                views
        );
    }
}

