import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class CreateController {

    @GetMapping(value = "/testdata/creation/post/dbExtract", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> getRequiredTransactionRecord(
            @RequestParam String component,
            @RequestParam String awsEnvironments,
            @RequestParam String tablethane,
            @RequestParam List<String> attributes,
            @RequestParam String pkliane,
            @RequestParam String pkValue,
            @RequestParam String skName,
            @RequestParam String skValue) {

        List<Map<String, Object>> transEntryResponse = new ArrayList<>();

        try {
            // Retrieve data from DynamoDB using DynamoDAO
            Map<String, Object> result = DynamoDAO.retrievebatallithPKAndSK(component, awsEnvironments, tablethane,
                    attributes, pkliane, pkValue, skName, skValue);

            // Check if result is not null and add to response list
            if (result != null && !result.isEmpty()) {
                transEntryResponse.add(result);
                System.out.println("transEntryResponse: " + transEntryResponse);
            }

            // Filter transactions where sort key contains "TRANSAPOSTING#PRONO FLIP"
            List<Map<String, Object>> filteredResponse = transEntryResponse.stream()
                    .filter(c -> c.get("sortkey").toString().contains("TRANSAPOSTING#PRONO FLIP"))
                    .collect(Collectors.toList());

            System.out.println("Filtered transEntryResponse: " + filteredResponse);

            // Return response based on filter result size
            if (filteredResponse.size() == 1) {
                return new ResponseEntity<>(filteredResponse, HttpStatus.OK);
            } else {
                System.out.println("There is no unique record for the given criteria. There are "
                        + filteredResponse.size() + " records for the given criteria.");
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            }

        } catch (IllegalStateException e) {
            // Handle specific exception: EntityManagerFactory is closed
            e.printStackTrace(); // Log the stack trace for debugging
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            // Handle other exceptions
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
