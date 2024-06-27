import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VersionTable = () => {
    const [versions, setVersions] = useState([]);

    useEffect(() => {
        fetch('http://localhost:3000/api/versions')
            .then(response => response.json())
            .then(data => {
                console.log('Data from API:', data);
                setVersions(data);
            })
            .catch(error => {
                console.error('Error fetching version details:', error);
            });
    }, []);

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
                    {versions.map((version, index) => (
                        <tr key={index}>
                            <td>{version.ApplicationName}</td>
                            <td>{version.TargetEnvironment}</td>
                            <td>{version.Version}</td>
                            <td>{version.Release}</td>
                            <td><a href={version.JiraTaskId} target="_blank" rel="noopener noreferrer">{version.JiraTaskId}</a></td>
                            <td><a href={version.ReleaseNotes} target="_blank" rel="noopener noreferrer">{version.ReleaseNotes}</a></td>
                            <td>{version.Date_Time}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default VersionTable;
