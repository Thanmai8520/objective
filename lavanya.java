import java.sql.*;

public class XMLReader {

    // Database connection string
    static final String BcmdbConstr = "jdbc:sqlserver://CUKDBCC1SQL0012\\MSO_SQLVIRT_TEST;databaseName=Barclays.Configuration Management;user=testsql;password=testsql;MultipleActiveResultSets=True;";

    public static void main(String[] args) {
        Connection conn = null;
        try {
            // Establish database connection
            conn = DriverManager.getConnection(BcmdbConstr);

            // Example query execution
            executeQuery(conn);

        } catch (SQLException e) {
            e.printStackTrace();
        } finally {
            // Close database connection
            if (conn != null) {
                try {
                    conn.close();
                } catch (SQLException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    public static void executeQuery(Connection conn) throws SQLException {
        Statement stmt = null;
        ResultSet rs = null;
        try {
            stmt = conn.createStatement();
            String sql = "SELECT * FROM YourTableName"; // Replace with your actual SQL query
            rs = stmt.executeQuery(sql);

            // Process the ResultSet
            while (rs.next()) {
                // Example: Retrieve data from the result set
                int id = rs.getInt("id");
                String name = rs.getString("name");

                // Example: Print data to console
                System.out.println("ID: " + id + ", Name: " + name);
            }
        } finally {
            // Close resources
            if (rs != null) {
                rs.close();
            }
            if (stmt != null) {
                stmt.close();
            }
        }
    }
}