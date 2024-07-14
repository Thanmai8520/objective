import React, { useState, useEffect } from 'react';

const VersionTable = () => {
    const [versions, setVersions] = useState([]);
    const [filteredVersions, setFilteredVersions] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState('');

    useEffect(() => {
        if (selectedApplication) {
            fetch(`http://localhost:3000/mae/getBuild/${encodeURIComponent(selectedApplication)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Data from API:', data);
                    // Filter and get latest version for each TargetEnvironment
                    const latestVersions = filterLatestVersions(data);
                    setFilteredVersions(latestVersions);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        }
    }, [selectedApplication]);

    const filterLatestVersions = (data) => {
        const latestVersionsMap = new Map();
        data.forEach(version => {
            const key = version.TargetEnvironment;
            if (!latestVersionsMap.has(key) || new Date(version.Date_Time) > new Date(latestVersionsMap.get(key).Date_Time)) {
                latestVersionsMap.set(key, version);
            }
        });
        return Array.from(latestVersionsMap.values());
    };

    const handleApplicationChange = (event) => {
        setSelectedApplication(event.target.value);
    };

    return (
        <div>
            <h2>Version Details</h2>
            <label htmlFor="applicationSelect">Select Application:</label>
            <select id="applicationSelect" value={selectedApplication} onChange={handleApplicationChange}>
                <option value="">-- Select an application --</option>
                {/* Replace with actual application names fetched from backend */}
                {Array.from(new Set(versions.map(version => version.ApplicationName))).map((appName, index) => (
                    <option key={index} value={appName}>{appName}</option>
                ))}
            </select>

            {filteredVersions.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Application Name</th>
                            <th>Environment</th>
                            <th>Version</th>
                            <th>Release</th>
                            <th>Jira Task ID</th>
                            <th>Release Notes</th>
                            <th>Date/Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVersions.map((version, index) => (
                            <tr key={index}>
                                <td>{version.ApplicationName}</td>
                                <td>{version.TargetEnvironment}</td>
                                <td>{version.Version}</td>
                                <td>{version.Release}</td>
                                <td><a href={version.JiraTaskId}>{version.JiraTaskId}</a></td>
                                <td><a href={version.ReleaseNotes}>{version.ReleaseNotes}</a></td>
                                <td>{version.Date_Time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No versions found for the selected application.</p>
            )}
        </div>
    );
};

export default VersionTable;
