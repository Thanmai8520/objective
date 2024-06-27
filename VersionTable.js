import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VersionTable = ({ applicationName }) => {
    const [versions, setVersions] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3000/mae/getBuild/${applicationName}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Data from API:', data); // Log the fetched data
                setVersions(data);
            })
            .catch(error => {
                console.error('Error fetching version details:', error);
                setError(error.message);
            });
    }, [applicationName]);

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="container">
            <h2 className="my-4">Version Details</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Application Name</th>
                        <th>Target Environment</th>
                        <th>Version</th>
                        <th>Release</th>
                        <th>Jira Task ID</th>
                        <th>Release Notes</th>
                        <th>Date and Time</th>
                    </tr>
                </thead>
                <tbody>
                    {versions.length > 0 ? (
                        versions.map((version, index) => (
                            <tr key={index}>
                                <td>{version.ApplicationName}</td>
                                <td>{version.TargetEnvironment}</td>
                                <td>{version.Version}</td>
                                <td>{version.Release}</td>
                                <td><a href={version.JiraTaskId} target="_blank" rel="noopener noreferrer">{version.JiraTaskId}</a></td>
                                <td><a href={version.ReleaseNotes} target="_blank" rel="noopener noreferrer">{version.ReleaseNotes}</a></td>
                                <td>{version.Date_Time}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7">No data available</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default VersionTable;
