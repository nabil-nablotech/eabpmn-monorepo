package org.unicam.intermediate.models.pojo;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Getter;
import lombok.Setter;
import org.unicam.intermediate.models.pojo.deserializer.AttributesMapDeserializer;

import java.util.List;
import java.util.Map;

@Setter
@Getter
public class View {
    private String id;
    private String name;
    private List<String> logicalPlaces;
<<<<<<< HEAD
=======
    @JsonDeserialize(using = AttributesMapDeserializer.class)
>>>>>>> 42e6b1bb38391fb227a028593869ca0eb8131e39
    private Map<String, Object> attributes;
}
