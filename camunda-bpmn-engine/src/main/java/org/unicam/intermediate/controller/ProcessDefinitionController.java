package org.unicam.intermediate.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.unicam.intermediate.models.dto.Response;
import org.unicam.intermediate.service.ProcessDefinitionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/process-definitions")
@RequiredArgsConstructor
@Slf4j
public class ProcessDefinitionController {

    private final ProcessDefinitionService processDefinitionService;

    @GetMapping("/deployed")
    public ResponseEntity<Response<List<Map<String, Object>>>> getDeployedProcessDefinitions() {
        try {
            List<Map<String, Object>> deployed = processDefinitionService.getDeployedProcessDefinitionsWithEnvironment();
            return ResponseEntity.ok(Response.ok(deployed));
        } catch (Exception e) {
            log.error("[Process Definitions API] Failed to retrieve deployed process definitions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Response.error("Failed to retrieve deployed process definitions: " + e.getMessage()));
        }
    }
}

