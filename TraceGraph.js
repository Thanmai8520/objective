import React from 'react';
import { ForceGraph2D } from 'react-force-graph';

const TraceGraph = ({ data }) => {
    const parseData = (rawData) => {
        const nodes = [];
        const links = [];

        rawData.forEach(item => {
            if (item.id && item.name) {
                nodes.push({ id: item.id, name: item.name });

                if (item.parent_id) {
                    links.push({ source: item.parent_id, target: item.id });
                }
            }
        });

        return { nodes, links };
    };

    const { nodes, links } = parseData(data);

    return (
        <ForceGraph2D
            graphData={{ nodes, links }}
            width={800}
            height={600}
            linkDirectionalParticles="value"
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={0.5}
            linkColor="black"
            nodeLabel="name"
            nodeAutoColorBy="group"
            style={{ fontFamily: 'sans-serif', fontSize: '12px' }}
            nodeCanvasObject={(node, ctx) => {
                const label = node.name;
                const fontSize = 12;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'black';
                ctx.fillText(label, node.x, node.y);
            }}
        />
    );
};

export default TraceGraph;

//npm install axios react-force-graph
