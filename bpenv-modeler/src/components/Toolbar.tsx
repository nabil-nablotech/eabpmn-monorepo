import { FaHandPaper, FaRegCircle, FaArrowRight, FaMousePointer } from 'react-icons/fa';
import { useEnvStore } from '../envStore';
import MqttConnectionPanel from './mqtt/MqttConnectionPanel';

const Toolbar = () => {
    const activeTool = useEnvStore((state) => state.activeTool);
    const mapInstance = useEnvStore((state) => state.mapInstance);
    const setActiveTool = useEnvStore((state) => state.setActiveTool);

    const handleHandTool = () => {
        if (mapInstance) setActiveTool('hand');
    };

    const handlePlaceTool = () => {
        if (mapInstance) setActiveTool('place');
    };

    const handleEdgeTool = () => {
        if (mapInstance) setActiveTool('edge');
    };

    const handleSelectTool = () => {
        if (mapInstance) setActiveTool('select');
    };

    return (
        <div className="toolbar draggable">
            <button className={activeTool === 'hand' ? "toolbar-btn" : "toolbar-btn-selected"} onClick={handleHandTool}><FaHandPaper /></button>
            <button className={activeTool === 'place' ? "toolbar-btn" : "toolbar-btn-selected"} onClick={handlePlaceTool}><FaRegCircle /></button>
            <button className={activeTool === 'edge' ? "toolbar-btn" : "toolbar-btn-selected"} onClick={handleEdgeTool}><FaArrowRight /></button>
            <button className={activeTool === 'select' ? "toolbar-btn" : "toolbar-btn-selected"} onClick={handleSelectTool}><FaMousePointer /></button>
            {/* <div style={{ width: '1px', height: '24px', backgroundColor: '#666', margin: '0 4px' }} />
            <MqttConnectionPanel /> */}
        </div>
    );
};

export default Toolbar;