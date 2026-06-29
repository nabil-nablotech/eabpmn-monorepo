import { useState, useRef } from 'react';
import { LogicalPlace as LogicalPlaceType, PhysicalPlace } from '../../../envTypes';
import { useEnvStore } from '../../../envStore';
import LogicalPlaceEditor from './LogicalPlaceEditor';
import { highlightFeature, unhighlightFeature, fitFeaturesOnMap } from '../../../utils';
import Modal from '../../shared/Modal';

const LogicalPlace = ({ item }: { item: LogicalPlaceType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const physicalPlaces = useEnvStore((state) => state.physicalPlaces);
  const removeLogicalPlace = useEnvStore((state) => state.removeLogicalPlace);
  const mapInstance = useEnvStore((state) => state.mapInstance);
  const isEditable = useEnvStore((state) => state.isEditable);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMatchingPhysicalPlaceIds = (
    logicalPlace: LogicalPlaceType,
    physicalPlaces: PhysicalPlace[]
  ): string[] => {
    return physicalPlaces
      .filter((place) =>
        logicalPlace.conditions.every((cond) => {
          const attrValue = place.attributes[cond.attribute];

          switch (cond.operator) {
            case '==':
              return attrValue == cond.value;
            case '!=':
              return attrValue != cond.value;
            case '<':
              return parseFloat(attrValue) < parseFloat(cond.value);
            case '>':
              return parseFloat(attrValue) > parseFloat(cond.value);
            default:
              return false;
          }
        })
      )
      .map((p) => p.id);
  };

  return (
    <>
      <li
        className="list-group-item bg-dark text-white d-flex justify-content-between align-items-center"
        onMouseEnter={() => {
          const matchingIds = getMatchingPhysicalPlaceIds(item, physicalPlaces);
          matchingIds.forEach((id) => highlightFeature(mapInstance, id));

          // hoverTimeoutRef.current = setTimeout(() => {
          //   fitFeaturesOnMap(mapInstance, matchingIds);
          // }, 2000);
        }}
        onMouseLeave={() => {
          const matchingIds = getMatchingPhysicalPlaceIds(item, physicalPlaces);
          matchingIds.forEach((id) => unhighlightFeature(mapInstance, id));

          // if (hoverTimeoutRef.current) {
          //   clearTimeout(hoverTimeoutRef.current);
          //   hoverTimeoutRef.current = null;
          // }
        }}
      >
        <span className="text-nowrap px-2 flex-fill">{item.name}</span>

        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-light btn-sm px-2"
            onClick={() => setIsModalOpen(true)}
            style={{ minWidth: "30px" }}
            title="Edit Logical Place"
            hidden={!isEditable}
          >
            ✎
          </button>
          <button
            className="btn btn-outline-danger btn-sm px-2"
            style={{ minWidth: "30px" }}
            onClick={() => removeLogicalPlace(item.id)}
            title="Delete Logical Place"
            hidden={!isEditable}
          >
            x
          </button>
        </div>
      </li>

      {isModalOpen && (
        <Modal
          title="Edit Logical Place"
          onClose={() => setIsModalOpen(false)}
        >
          <LogicalPlaceEditor
            initialPlace={item}
            onSave={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default LogicalPlace;