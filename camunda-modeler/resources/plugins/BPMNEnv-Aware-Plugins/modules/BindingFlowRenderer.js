import { TASK_TYPE_KEYS } from './TaskTypes';

/**
 * Custom renderer for binding/unbinding message flows
 * Adds dots on BOTH ends (symmetric) for visual distinction
 */
function BindingFlowRenderer(
    eventBus,
    elementRegistry,
    canvas,
    messageFlowXmlService
) {
  const self = this;

  // Set up markers on canvas ready
  eventBus.on('canvas.init', function() {
    self.ensureCustomMarkers();
  });

  // After import, update all message flows
  eventBus.on('import.render.complete', function() {
    self.ensureCustomMarkers();
    setTimeout(() => {
      self.updateAllMessageFlows();
    }, 100);
  });

  // Handle connection added
  eventBus.on('connection.added', function(event) {
    const element = event.element;
    if (element && element.type === 'bpmn:MessageFlow') {
      setTimeout(() => {
        self.updateMessageFlow(element);
      }, 50);
    }
  });

  // Handle connection changes
  eventBus.on('connection.changed', function(event) {
    const element = event.element;
    if (element && element.type === 'bpmn:MessageFlow') {
      setTimeout(() => {
        self.updateMessageFlow(element);
      }, 50);
    }
  });

  // Handle elements changed
  eventBus.on('elements.changed', function(event) {
    if (event.elements) {
      event.elements.forEach(element => {
        if (element.type === 'bpmn:MessageFlow') {
          self.updateMessageFlow(element);
        }
      });
    }
  });

  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._messageFlowXmlService = messageFlowXmlService;
}

BindingFlowRenderer.$inject = [
  'eventBus',
  'elementRegistry',
  'canvas',
  'messageFlowXmlService'
];

/**
 * Ensure custom SVG markers are defined in the defs
 */
BindingFlowRenderer.prototype.ensureCustomMarkers = function() {
  const container = this._canvas._svg;
  if (!container) return;

  let defs = container.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    container.insertBefore(defs, container.firstChild);
  }

  const bindingDot = this.createDotMarker('binding-dot');
  defs.appendChild(bindingDot);

};

/**
 * Create a dot marker element - centered so it works for both start and end
 */
BindingFlowRenderer.prototype.createDotMarker = function(id) {
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', id);
  marker.setAttribute('viewBox', '0 0 35 35');
  marker.setAttribute('fill', '#fff');

  // Adjust refX based on whether it's start or end marker
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '10');
  marker.setAttribute('markerWidth', '35');
  marker.setAttribute('markerHeight', '35');
  marker.setAttribute('orient', 'auto');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '5');
  rect.setAttribute('y', '5');
  rect.setAttribute('width', '10');
  rect.setAttribute('height', '10');
  rect.setAttribute('rx', '2'); // Rounded corners
  marker.appendChild(rect);

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '10');
  line.setAttribute('y1', '0');
  line.setAttribute('x2', '10');
  line.setAttribute('y2', '15');
  line.setAttribute('stroke', '#000');
  line.setAttribute('stroke-width', '1');
  marker.appendChild(line);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '10');
  circle.setAttribute('cy', '17.5');
  circle.setAttribute('r', '3.5');
  circle.setAttribute('fill', 'white');
  circle.setAttribute('stroke', '#000');
  circle.setAttribute('stroke-width', '1');
  marker.appendChild(circle);
  return marker;
};

/**
 * Update a single message flow
 */
BindingFlowRenderer.prototype.updateMessageFlow = function(element) {
  if (!element || element.type !== 'bpmn:MessageFlow') return;

  const gfx = this._elementRegistry.getGraphics(element);
  if (!gfx) return;

  // Get the connection type from extension elements
  const connectionInfo = this._messageFlowXmlService.getConnectionInfo(element);

  // Find ALL paths in the visual element
  const paths = gfx.querySelectorAll('.djs-visual path');
  if (!paths || paths.length === 0) return;

  paths.forEach(path => {
    if (connectionInfo && connectionInfo.type) {

      // Clear any existing markers first
      path.removeAttribute('marker-start');
      path.removeAttribute('marker-end');
      path.removeAttribute('marker-mid');

      // Apply the SAME dot marker to BOTH ends
      if (connectionInfo.type === TASK_TYPE_KEYS.BINDING || connectionInfo.type === TASK_TYPE_KEYS.UNBINDING) {

        // Use the same marker for both start and end
        path.setAttribute('marker-start', 'url(#binding-dot)');
        path.setAttribute('marker-end', 'url(#binding-dot)');
      } else {

        // Reset to default for regular message flows
        path.removeAttribute('marker-start');
        path.removeAttribute('marker-end');
      }
    }
  });
};

/**
 * Update all message flows
 */
BindingFlowRenderer.prototype.updateAllMessageFlows = function() {
  const messageFlows = this._elementRegistry.filter(element =>
    element.type === 'bpmn:MessageFlow'
  );

  messageFlows.forEach(flow => {
    this.updateMessageFlow(flow);
  });
};

export default {
  __init__: [ 'bindingFlowRenderer' ],
  bindingFlowRenderer: [ 'type', BindingFlowRenderer ]
};