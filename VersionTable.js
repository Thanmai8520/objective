import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VersionTable = ({ versionDetails }) => {
    const [selectedAppName, setSelectedAppName] = useState('');
    const [filteredVersions, setFilteredVersions] = useState([]);
    const [applicationNames, setApplicationNames] = useState([]);

    useEffect(() => {
        // Extract unique application names from versionDetails
        const uniqueAppNames = Array.from(new Set(versionDetails.map(version => version.ApplicationName)));
        setApplicationNames(uniqueAppNames);
    }, [versionDetails]);

    useEffect(() => {
        // Filter versions based on selected application name
        if (selectedAppName) {
            const filteredVersions = versionDetails.filter(version => version.ApplicationName === selectedAppName);
            setFilteredVersions(filteredVersions);
        } else {
            setFilteredVersions([]);
        }
    }, [selectedAppName, versionDetails]);

    const handleSelectChange = (event) => {
        setSelectedAppName(event.target.value);
    };

    return (
        <div className="container">
            <h2 className="my-4">Version Details</h2>
            <div className="mb-3">
                <label htmlFor="appNameSelect" className="form-label">Select Application Name:</label>
                <select
                    id="appNameSelect"
                    className="form-select"
                    value={selectedAppName}
                    onChange={handleSelectChange}
                >
                    <option value="">All Applications</option>
                    {applicationNames.map((appName, index) => (
                        <option key={index} value={appName}>{appName}</option>
                    ))}
                </select>
            </div>
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
                    {filteredVersions.length > 0 ? (
                        filteredVersions.map((version, index) => (
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
