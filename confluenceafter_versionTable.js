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

    const postToConfluence = () => {
        axios.post('/api/post-to-confluence')
            .then(response => {
                alert('Posted to Confluence successfully');
            })
            .catch(error => {
                console.error('There was an error posting to Confluence!', error);
                alert('Error posting to Confluence');
            });
    };

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Environment</th>
                        <th>Version</th>
                        <th>Deployed At</th>
                    </tr>
                </thead>
                <tbody>
                    {versions.map((version, index) => (
                        <tr key={index}>
                            <td>{version.environment}</td>
                            <td>{version.version}</td>
                            <td>{new Date(version.deployedAt).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={postToConfluence}>Post to Confluence</button>
        </div>
    );
};

export default VersionTable;
