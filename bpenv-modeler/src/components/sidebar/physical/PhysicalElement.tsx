import { useState, useRef } from 'react';
import { PhysicalPlace, Edge } from '../../../envTypes';
import { useEnvStore } from '../../../envStore';
import { BsTrash } from 'react-icons/bs';
import PhysicalAttributes from './PhysicalAttributes';
import LightStatusIndicator from './LightStatusIndicator';
import { highlightFeature, unhighlightFeature, fitFeaturesOnMap } from '../../../utils';
import { getProviderRegistry } from '../../../services/AttributeProviderRegistry';
import { useMqtt } from '../../../hooks/useMqtt';

type Props = {
  element: PhysicalPlace | Edge;
  type: 'place' | 'edge';
};

const PhysicalElement = ({ element, type }: Props) => {
  const [newName, setNewName] = useState(element.name || '');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [mqttSubscribing, setMqttSubscribing] = useState(false);
  const mapInstance = useEnvStore((state) => state.mapInstance);
  const isEditable = useEnvStore((state) => state.isEditable);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isConnected, isPlaceSubscribed, subscribePlace, unsubscribePlace } = useMqtt();
  const isSubscribed = type === 'place' && isPlaceSubscribed(element.id);

  const updateElement =
    type === 'place'
      ? useEnvStore((state) => state.updatePlace)
      : useEnvStore((state) => state.updateEdge);

  const removeElement =
    type === 'place'
      ? useEnvStore((state) => state.removePlace)
      : useEnvStore((state) => state.removeEdge);

  const handleNameBlur = () => {
    const trimmed = newName.trim();
    if (trimmed === '' || trimmed === element.name) return;

    const list =
      type === 'place'
        ? useEnvStore.getState().physicalPlaces
        : useEnvStore.getState().edges;

    const isDuplicate = list.some(
      (el) => el.name === trimmed && el.id !== element.id
    );

    if (isDuplicate)
      setNewName(element.name);
    else updateElement?.(element.id, { name: trimmed });
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete ${element.name}?`
      )
    ) {
      removeElement(element.id);
    }
  };

  const handleFetchAttributes = async (providerId: string) => {
    if (type !== 'place') {
      alert('Attribute fetching only works for places with coordinates');
      return;
    }

    setLoadingProvider(providerId);

    try {
      const registry = getProviderRegistry();
      const provider = registry.getProvider(providerId);

      if (!provider) {
        alert(`Provider '${providerId}' not found. Did you initialize providers?`);
        return;
      }

      const place = element as PhysicalPlace;

      if (!provider.canHandle(place)) {
        alert(`Provider '${provider.metadata.name}' cannot handle this location`);
        return;
      }

      const result = await provider.fetchAttributes(place);

      if (result.success) {
        const mergedAttributes = {
          ...element.attributes,
          ...result.attributes
        };

        updateElement?.(element.id, { attributes: mergedAttributes });

        const count = Object.keys(result.attributes).length;
        alert(`Success! Fetched ${count} attributes from ${provider.metadata.name}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMqttSubscription = async () => {
    if (type !== 'place') return;

    setMqttSubscribing(true);
    try {
      if (isSubscribed) {
        await unsubscribePlace(element.id);
      } else {
        await subscribePlace(element.id);
      }
    } catch (error) {
      console.error('MQTT subscription error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Subscription failed'}`);
    } finally {
      setMqttSubscribing(false);
    }
  };

  return (
    <li
      className="list-group-item bg-dark text-white"
      onMouseEnter={() => {
        highlightFeature(mapInstance, element.id);

        hoverTimeoutRef.current = setTimeout(() => {
          fitFeaturesOnMap(mapInstance, [element.id]);
        }, 2000);
      }}
      onMouseLeave={() => {
        unhighlightFeature(mapInstance, element.id);

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }}
    >
      <div className="d-flex justify-content-between align-items-center">
        <div className="flex-grow-1">
          <input
            className="form-control form-control-md border-0 bg-transparent text-white p-0 custom-placeholder no-focus-outline"
            value={newName}
            placeholder={type === 'place' ? 'Place Name' : 'Edge Name'}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleNameBlur}
            disabled={!isEditable}
            spellCheck={false}
          />
          <small
            className="text-muted"
            style={{ fontSize: '0.7em', cursor: 'pointer' }}
            title="Click to copy ID"
            onClick={() => {
              navigator.clipboard.writeText(element.id);
            }}
          >
            ID: {element.id}
          </small>
        </div>
        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-light p-1"
            onClick={() => {
              const updatedAttributes = { ...element.attributes };
              updatedAttributes['key'] = 'value';
              updateElement?.(element.id, { attributes: updatedAttributes });
            }}
            title="Add attribute"
            disabled={
              Object.keys(element.attributes).some((key) => key === '' || key === 'key')
            }
            hidden={!isEditable}
          >
            +
          </button>
          <div className="btn-group" role="group" hidden={!isEditable || type !== 'place'}>
            <button
              type="button"
              className="btn btn-outline-info p-1 dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Fetch attributes from API"
              disabled={loadingProvider !== null}
            >
              {loadingProvider ? '⏳' : '🌐'}
            </button>
            <ul className="dropdown-menu dropdown-menu-dark">
              <li>
                <h6 className="dropdown-header">Fetch Attributes From:</h6>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => handleFetchAttributes('weather')}
                  disabled={loadingProvider !== null}
                >
                  {loadingProvider === 'weather' ? '⏳ ' : ''}Weather (NOAA)
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => handleFetchAttributes('geocoding')}
                  disabled={loadingProvider !== null}
                >
                  {loadingProvider === 'geocoding' ? '⏳ ' : ''}Location (Nominatim)
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => handleFetchAttributes('osm-tags')}
                  disabled={loadingProvider !== null}
                >
                  {loadingProvider === 'osm-tags' ? '⏳ ' : ''}OSM Tags (Overpass)
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item text-primary"
                  onClick={async () => {
                    if (type !== 'place') return;
                    setLoadingProvider('all');
                    try {
                      const registry = getProviderRegistry();
                      const providers = registry.getAllProviders();
                      const place = element as PhysicalPlace;

                      let mergedAttributes = { ...element.attributes };
                      let totalCount = 0;

                      for (const provider of providers) {
                        if (provider.canHandle(place)) {
                          const result = await provider.fetchAttributes(place);
                          if (result.success) {
                            mergedAttributes = { ...mergedAttributes, ...result.attributes };
                            totalCount += Object.keys(result.attributes).length;
                          }
                        }
                      }

                      updateElement?.(element.id, { attributes: mergedAttributes });
                      alert(`Success! Fetched ${totalCount} total attributes from all providers`);
                    } catch (error) {
                      alert(`Error: ${error}`);
                    } finally {
                      setLoadingProvider(null);
                    }
                  }}
                  disabled={loadingProvider !== null}
                >
                  {loadingProvider === 'all' ? '⏳ ' : ''}Fetch All
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <h6 className="dropdown-header">MQTT Sensors:</h6>
              </li>
              <li>
                <button
                  className={`dropdown-item ${isSubscribed ? 'text-warning' : ''}`}
                  onClick={handleMqttSubscription}
                  disabled={!isConnected || mqttSubscribing}
                  title={!isConnected ? 'Connect to MQTT broker first' : ''}
                >
                  {mqttSubscribing ? '...' : isSubscribed ? 'Unsubscribe Light Sensor' : 'Subscribe Light Sensor'}
                  {!isConnected && ' (not connected)'}
                </button>
              </li>
            </ul>
          </div>
          <button
            className="btn btn-outline-danger p-1 ms-1"
            onClick={handleDelete}
            title="Delete"
            hidden={!isEditable}
          >
            <BsTrash />
          </button>
        </div>
      </div>

      <PhysicalAttributes elementId={element.id} type={type} initialAttributes={element.attributes} />

      {type === 'place' && <LightStatusIndicator placeId={element.id} />}
    </li>
  );
};

export default PhysicalElement;