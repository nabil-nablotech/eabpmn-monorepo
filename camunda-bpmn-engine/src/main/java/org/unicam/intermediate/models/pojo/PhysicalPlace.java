package org.unicam.intermediate.models.pojo;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Getter;
import lombok.Setter;
import org.unicam.intermediate.models.environmental.LocationArea;
import org.unicam.intermediate.models.pojo.deserializer.AttributesMapDeserializer;

import java.util.List;
import java.util.Map;

@Setter
@Getter
@JsonIgnoreProperties({"locationArea"})
public class PhysicalPlace {
    private String id;
    private String name;
    private String temperature;
    private List<List<Double>> coordinates;
    @JsonDeserialize(using = AttributesMapDeserializer.class)
    private Map<String, Object> attributes;

    /** Derived from {@link #coordinates}; ignore JSON so stored env blobs can include an expanded polygon without Jackson needing a LocationArea bean creator. */
    @JsonIgnore
    private transient LocationArea locationArea;

    public LocationArea getLocationArea() {
        if (locationArea == null && coordinates != null && !coordinates.isEmpty()) {
            locationArea = new LocationArea(coordinates);
        }
        return locationArea;
    }
}
