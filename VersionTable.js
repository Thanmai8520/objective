import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VersionTable = () => {
  const [versions, setVersions] = useState([]);
  const [filteredVersions, setFilteredVersions] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState('');
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/mae/getBuild')
      .then(response => response.json())
      .then(data => {
        const latestVersions = getLatestVersions(data);
        setVersions(latestVersions);
        setFilteredVersions(latestVersions);
        const uniqueApps = [...new Set(latestVersions.map(item => item.ApplicationName))];
        setApplications(uniqueApps);
      })
      .catch(error => {
        console.error('Error fetching version details:', error);
        setError(error.message);
      });
  }, []);

  const getLatestVersions = (data) => {
    const latestVersionsMap = new Map();

    data.forEach(item => {
      const key = `${item.ApplicationName}-${item.TargetEnvironment}`;
      const existingItem = latestVersionsMap.get(key);

      if (!existingItem || convertDate(item.Date_Time) > convertDate(existingItem.Date_Time)) {
        latestVersionsMap.set(key, item);
      }
    });

    return Array.from(latestVersionsMap.values()).sort((a, b) => convertDate(b.Date_Time) - convertDate(a.Date_Time));
  };

  const convertDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') {
      console.error('Invalid Date_Time format:', dateString);
      return 0; // Handle undefined, null, or invalid format
    }

    const parts = dateString.split(' ');
    if (parts.length !== 2) {
      console.error('Invalid Date_Time format:', dateString);
      return 0; // Handle unexpected format
    }

    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length !== 3 || timeParts.length !== 3) {
      console.error('Invalid Date_Time format:', dateString);
      return 0; // Handle unexpected format
    }

    const formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    return formattedDate.getTime(); // Return milliseconds for comparison
  };

  const handleApplicationChange = (event) => {
    const applicationName = event.target.value;
    setSelectedApplication(applicationName);

    if (applicationName === '') {
      setFilteredVersions(versions);
    } else {
      const filteredData = versions.filter(version => version.ApplicationName === applicationName);
      setFilteredVersions(filteredData);
    }
  };

  if (error) {
    return <div className="alert alert-danger" role="alert">Error: {error}</div>;
  }

  return (
    <div className="container">
      <h2 className="my-4">Version Details</h2>
      <div className="form-group">
        <label htmlFor="applicationSelect">Select Application:</label>
        <select
          id="applicationSelect"
          className="form-control"
          value={selectedApplication}
          onChange={handleApplicationChange}
        >
          <option value="">All Applications</option>
          {applications.map((app, index) => (
            <option key={index} value={app}>{app}</option>
          ))}
        </select>
      </div>
      <div className="table-responsive">
        <table className="table table-striped mt-4">
          <thead className="thead-dark">
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
    </div>
  );
};

export default VersionTable;
