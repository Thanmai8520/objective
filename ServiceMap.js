import React, { useState, useEffect } from 'react';
import { Container, Row, Col, ListGroup } from 'react-bootstrap';

const ServiceMap = () => {
    const [traces, setTraces] = useState([]);

    useEffect(() => {
        fetch('http://localhost:8081/traces')
            .then(response => response.json())
            .then(data => setTraces(data))
            .catch(error => console.error('Error fetching traces:', error));
    }, []);

    return (
        <Container>
            <Row>
                <Col>
                    <h1 className="my-4">AWS Service Map</h1>
                    <ListGroup>
                        {traces.map(trace => (
                            <ListGroup.Item key={trace.id}>
                                <strong>ID:</strong> {trace.id} <br />
                                <strong>Duration:</strong> {trace.duration} ms
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Col>
            </Row>
        </Container>
    );
};

export default ServiceMap;
