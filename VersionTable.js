import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VersionTable = () => {
    const [versions, setVersions] = useState([]);

    useEffect(() => {
        axios.get('/api/versions')
            .then(response => {
                setVersions(response.data);
            })
            .catch(error => {
                console.error('There was an error fetching the version details!', error);
            });
    }, []);

    return (
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
    );
};

export default VersionTable;
