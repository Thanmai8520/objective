import React, { useState, useEffect } from 'react';

const VersionTable = ({ applicationName }) => {
    const [builds, setBuilds] = useState([]);

    useEffect(() => {
        const fetchBuilds = async () => {
            try {
                const response = await fetch(`http://localhost:3000/mae/getBuild/${applicationName}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch build details');
                }
                const data = await response.json();
                setBuilds(data);
            } catch (error) {
                console.error('Error fetching build details:', error);
            }
        };

        fetchBuilds();
    }, [applicationName]);

    return (
        <div>
            <h2>Build Details for {applicationName}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Environment</th>
                        <th>Version</th>
                        <th>Release</th>
                        <th>Jira Task ID</th>
                        <th>Release Notes</th>
                        <th>Date/Time</th>
                    </tr>
                </thead>
                <tbody>
                    {builds.map((build, index) => (
                        <tr key={index}>
                            <td>{build.TargetEnvironment}</td>
                            <td>{build.Version}</td>
                            <td>{build.Release}</td>
                            <td><a href={build.JiraTaskId}>{build.JiraTaskId}</a></td>
                            <td><a href={build.ReleaseNotes}>{build.ReleaseNotes}</a></td>
                            <td>{build.Date_Time}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default VersionTable;
