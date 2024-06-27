import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VersionTable = () => {
    const [versions, setVersions] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState('');
    const [error, setError] = useState(null);
    const [applicationNames, setApplicationNames] = useState([]);

    useEffect(() => {
        // Fetch all application names from the API
        fetch(`http://localhost:3000/mae/getBuild`)
            .then(response => response.json())
            .then(data => {
                const uniqueAppNames = [...new Set(data.map(build => build.ApplicationName))];
                setApplicationNames(uniqueAppNames);
                if (uniqueAppNames.length > 0) {
                    setSelectedApplication(uniqueAppNames[0]); // Select the first application by default
                }
            })
            .catch(error => {
                console.error('Error fetching application names:', error);
                setError(error.message);
            });
    }, []);

    useEffect(() => {
        // Fetch versions based on selected application
        if (selectedApplication) {
            fetch(`http://localhost:3000/mae/getBuild/${selectedApplication}`)
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
        }
    }, [selectedApplication]);

    const handleApplicationChange = (event) => {
        setSelectedApplication(event.target.value);
    };

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="container">
            <h2 className="my-4">Version Details</h2>
            <div className="mb-3">
                <label htmlFor="application-select" className="form-label">Select Application:</label>
                <select
                    id="application-select"
                    className="form-select"
                    value={selectedApplication}
                    onChange={handleApplicationChange}
                >
                    <option value="">All Applications</option>
                    {applicationNames.map((name, index) => (
                        <option key={index} value={name}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
        </div>
    );
};

export default VersionTable;
