import React, { useState, useEffect } from 'react';
import { Container, Row, Col, ListGroup } from 'react-bootstrap';

const ServiceMap = () => {
    const [traces, setTraces] = useState([]);

    useEffect(() => {
        const fetchTraces = async () => {
            try {
                const response = await fetch('http://localhost:8081/traces');
                if (!response.ok) {
                    throw new Error('Failed to fetch traces');
                }
                const data = await response.json();
                setTraces(data); // Assuming data is directly the array of traces
            } catch (error) {
                console.error('Error fetching traces:', error);
                setTraces([]);
            }
        };

        fetchTraces();
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
