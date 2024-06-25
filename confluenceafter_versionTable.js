import React, { useState, useEffect } from 'react';

const VersionTable = () => {
    const [versions, setVersions] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/versions')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Data from API:', data);
                setVersions(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }, []);

    return (
        <div>
            <h2>Version Details</h2>
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
                    {versions.map((version, index) => (
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
        </div>
    );
};

export default VersionTable;
