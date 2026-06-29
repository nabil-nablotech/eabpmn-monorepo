function loadStyleOnce(id, href) {
  if (document.getElementById(id)) {
    return;
  }

  var link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScriptOnce(id, src) {
  return new Promise(function(resolve, reject) {
    if (document.getElementById(id)) {
      return resolve();
    }

    var script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.onload = function() { resolve(); };
    script.onerror = function(e) { reject(e); };
    document.head.appendChild(script);
  });
}

function tryGetDiagramContainer(viewer) {
  try {
    var canvas = viewer.get('canvas');

    // bpmn-js Canvas#getContainer()
    if (canvas && typeof canvas.getContainer === 'function') {
      return canvas.getContainer();
    }
  } catch (e) {
    // ignore
  }

  return null;
}

var ENVIRONMENT_URL = '/environment.html';

/**
 * After the diagram column is narrowed (50% + side panel), bpmn-js must be told the
 * viewport changed, then zoom can refit. Adjust behavior here:
 * - 'fit-viewport' (default): fit whole diagram in the visible area (best after split)
 * - number (e.g. 0.85): relative zoom vs current (if your Cockpit/bpmn-js build supports it)
 */
var BPMN_CANVAS_ZOOM_AFTER_SPLIT = 'fit-viewport';

function refitBpmnCanvas(viewer) {
  try {
    var canvas = viewer.get('canvas');
    if (!canvas || typeof canvas.zoom !== 'function') {
      return;
    }
    if (typeof canvas.resized === 'function') {
      canvas.resized();
    }
    canvas.zoom(BPMN_CANVAS_ZOOM_AFTER_SPLIT);
  } catch (e) {
    // ignore
  }
}

function scheduleRefitBpmnCanvas(viewer) {
  // Let the browser apply width/layout before measuring the diagram viewport
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      refitBpmnCanvas(viewer);
    });
  });
}

export default {
  id: 'eabpmn-osm-sidepanel',
  pluginPoint: 'cockpit.processDefinition.diagram.plugin',
  priority: 0,
  render: function(viewer, data) {
    var diagramContainer = tryGetDiagramContainer(viewer);

    if (!diagramContainer || !diagramContainer.parentElement) {
      return;
    }

    var parent = diagramContainer.parentElement.parentElement.parentElement.parentElement.parentElement;
    var bpmnContainer = parent.children[1];
    bpmnContainer.style.width = '50%';

    // Avoid double-mount of the iframe panel; still refit BPMN when diagram changes
    if (parent.querySelector('[data-eabpmn-osm-panel="true"]')) {
      scheduleRefitBpmnCanvas(viewer);
      return;
    }


    var panel = document.createElement('div');
    panel.setAttribute('data-eabpmn-osm-panel', 'true');
    panel.className = 'eabpmnMapPanel';


    var body = document.createElement('div');
    body.className = 'eabpmnMapPanelBody';

    // Embed your BEE (served separately)
    var iframe = document.createElement('iframe');
    iframe.className = 'eabpmnMapIframe';
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.referrerPolicy = 'no-referrer';

    var processDefinitionId = data && data.processDefinitionId ? String(data.processDefinitionId) : '';
    var url = ENVIRONMENT_URL + (processDefinitionId ? ('?processDefinitionId=' + encodeURIComponent(processDefinitionId)) : '');
    iframe.src = url;

    body.appendChild(iframe);
    panel.appendChild(body);
    parent.appendChild(panel);

    scheduleRefitBpmnCanvas(viewer);

    // Expose context for future integration / postMessage wiring
    panel.__eabpmnProcessDefinitionId = data && data.processDefinitionId;
    panel.__eabpmnAppUrl = url;
    panel.__eabpmnIframe = iframe;


    // Cockpit plugin API supports optional unmount() for cleanup
    return {
     
    };
  }
};

