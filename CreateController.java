import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
public class CreateController {

    @GetMapping(value = "/testdata/creation/post/dbExtract", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, AttributeValue>> getRequiredTransactionRecord(
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
                return new ResponseEntity<>(transEntryResponse, HttpStatus.OK);
            }

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
