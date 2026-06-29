import { useState } from 'react';
import { useEnvStore } from '../envStore';
import Modal from './shared/Modal';
import type { Edge, LogicalPlace, PhysicalPlace, View } from '../envTypes';

type DeployedProcess = {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  state: string;
  environment: DeployedEnvironment | null;
};

type DeployedEnvironment = {
  physicalPlaces: PhysicalPlace[];
  edges: Edge[];
  logicalPlaces: LogicalPlace[];
  views: View[];
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

const Header = () => {
  const clearModel = useEnvStore((state) => state.clearModel);
  const setModel = useEnvStore((state) => state.setModel);
  const [showDeploymentsModal, setShowDeploymentsModal] = useState(false);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);
  const [deploymentsError, setDeploymentsError] = useState<string | null>(null);
  const [deployedProcesses, setDeployedProcesses] = useState<DeployedProcess[]>([]);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const model = JSON.parse(event.target?.result as string);
            setModel(model);
          } catch (error) {
            console.log('Error parsing JSON:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const model = {
      physicalPlaces: useEnvStore.getState().physicalPlaces,
      edges: useEnvStore.getState().edges.map((edge) => {
        edge.name = useEnvStore.getState().physicalPlaces.find(place => place.id === edge.source)?.name + '>' +
          useEnvStore.getState().physicalPlaces.find(place => place.id === edge.target)?.name;
        return edge;
      }),
      logicalPlaces: useEnvStore.getState().logicalPlaces,
      views: useEnvStore.getState().views,
    };
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeploymentClick = async () => {
    setShowDeploymentsModal(true);
    setIsLoadingDeployments(true);
    setDeploymentsError(null);

    try {
      const response = await fetch('http://localhost:8082/api/process-definitions/deployed', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = (await response.json()) as ApiResponse<DeployedProcess[]>;
      if (!body || body.success !== true) {
        throw new Error(body?.message || 'Failed to fetch deployed processes');
      }

      setDeployedProcesses(Array.isArray(body.data) ? body.data : []);
    } catch (error) {
      setDeploymentsError(error instanceof Error ? error.message : 'Unknown error');
      setDeployedProcesses([]);
    } finally {
      setIsLoadingDeployments(false);
    }
  };

  const handleLoadEnvironment = (environment: DeployedEnvironment | null) => {
    if (!environment) {
      return;
    }
    setModel(environment);
    setShowDeploymentsModal(false);
  };

  return (
    <>
      <nav className="navbar navbar-dark bg-dark px-3 d-flex justify-content-between align-items-center">
        <span className="navbar-brand mb-0 h1">🌎 BPEnv Modeler</span>
        <div className="btn-group">
          <button className="btn btn-outline-light btn-sm" onClick={handleImport}>
            ⬆️
          </button>
          <button className="btn btn-outline-light btn-sm" onClick={handleExport}>
            ⬇️
          </button>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleDeploymentClick}
            title="Deployments"
            aria-label="Deployments"
          >
            🚀
          </button>
          <button className="btn btn-outline-light btn-sm" onClick={() => {
            if (confirm('Are you sure you want to clear the model?'))
              clearModel();
          }}>
            🗑️
          </button>
        </div>
      </nav>

      {showDeploymentsModal && (
        <Modal
          title="Deployed Processes"
          onClose={() => setShowDeploymentsModal(false)}
        >
          {isLoadingDeployments && <p className="mb-0">Loading deployed processes...</p>}

          {!isLoadingDeployments && deploymentsError && (
            <div className="alert alert-danger mb-0">
              Failed to load deployed processes: {deploymentsError}
            </div>
          )}

          {!isLoadingDeployments && !deploymentsError && deployedProcesses.length === 0 && (
            <p className="mb-0">No deployed process definitions found.</p>
          )}

          {!isLoadingDeployments && !deploymentsError && deployedProcesses.length > 0 && (
            <div className="table-responsive">
              <table className="table table-dark table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>State</th>
                    <th>Name</th>
                    <th>Version</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deployedProcesses.map((p) => (
                    <tr key={p.id}>
                      <td>{p.key}</td>
                      <td>
                        <span className={`badge ${p.state === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                          {p.state}
                        </span>
                      </td>
                      <td>{p.name || '-'}</td>
                      <td>{p.version}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-info btn-sm"
                          onClick={() => handleLoadEnvironment(p.environment)}
                          disabled={!p.environment}
                          title={p.environment ? 'Load environment on map' : 'No environment available'}
                          aria-label={p.environment ? 'Load environment on map' : 'No environment available'}
                        >
                          🗺️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

export default Header;