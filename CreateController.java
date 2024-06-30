import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class CreateController {

    @GetMapping(value = "/testdata/creation/post/dbExtract", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getRequiredTransactionRecord(
            @RequestParam String component,
            @RequestParam String awsEnvironments,
            @RequestParam String tableName,
            @RequestParam List<String> attributes,
            @RequestParam String pkName,
            @RequestParam String pkValue,
            @RequestParam String skName,
            @RequestParam String skValue) {

        Map<String, AttributeValue> transEntryResponse;

        try {
            transEntryResponse = DynamoDAO.retrieveDataWithPKAndSK(component, awsEnvironments, tableName, attributes,
                    pkName, pkValue, skName, skValue);
            System.out.println("transEntryResponse: " + transEntryResponse);

            if (transEntryResponse.isEmpty()) {
                System.out.println("There is no unique record for the given criteria.");
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                Map<String, Object> result = new HashMap<>();
                for (Map.Entry<String, AttributeValue> entry : transEntryResponse.entrySet()) {
                    result.put(entry.getKey(), convertAttributeValue(entry.getValue()));
                }
                return new ResponseEntity<>(result, HttpStatus.OK);
            }

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Object convertAttributeValue(AttributeValue value) {
        if (value.s() != null)
            return value.s();
        if (value.n() != null)
            return value.n();
        if (value.bool() != null)
            return value.bool();
        if (value.ss() != null)
            return value.ss();
        if (value.ns() != null)
            return value.ns();
        if (value.bs() != null)
            return value.bs();
        if (value.m() != null) {
            Map<String, Object> map = new HashMap<>();
            value.m().forEach((k, v) -> map.put(k, convertAttributeValue(v)));
            return map;
        }
        if (value.l() != null) {
            List<Object> list = new ArrayList<>();
            value.l().forEach(v -> list.add(convertAttributeValue(v)));
            return list;
        }
        return null;
    }
}
