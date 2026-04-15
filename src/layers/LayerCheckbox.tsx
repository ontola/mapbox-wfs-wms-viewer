import { useContext, Dispatch, SetStateAction } from "react";
import { AppContext } from "../App";
import { LayerI } from "./LayerTypes";
import { CustomCheckbox } from "../components/CustomCheckbox";
import { Legend } from "../components/Legend";
import "../components/CustomCheckbox.css";

interface LayerCheckboxProps {
  layer: LayerI;
  setSearchTerm: Dispatch<SetStateAction<string>>;
}

export function LayerCheckbox({ layer, setSearchTerm }: LayerCheckboxProps) {
  const { setLayers } = useContext(AppContext);

  const layerUniqueId = layer.uniqueId || `${layer.serviceId || 'noservice'}-${layer.url || 'nourl'}-${layer.id}`;

  const handleChange = (checked: boolean) => {
    setLayers(prev =>
      prev.map(l => {
        const id = l.uniqueId || `${l.serviceId || 'noservice'}-${l.url || 'nourl'}-${l.id}`;
        if (id === layerUniqueId) return { ...l, visible: checked };
        if (checked) return { ...l, visible: false };
        return l;
      })
    );

    if (checked) {
      setSearchTerm("");
    }
  };

  return (
    <div>
      <CustomCheckbox
        checked={layer.visible}
        onChange={handleChange}
        label={layer.name}
        description={layer.description}
        className="layer-checkbox"
        data-layer-id={layer.id}
      />
      {layer.visible && <Legend layer={layer} />}
    </div>
  );
}
