function dijkstra(graph, type, source) {
    var dist = new Object();
    var previous = new Object();

    // Sett the distance from the source node to any other to Infinity
    graph.nodes.forEach(n => dist[n.id] = Infinity);

    // Set the distance to the source to 0
    dist[source.id] = 0;

    var Q = graph.nodes.map(n => n.id);

    while (Q.length > 0) {
        // Get the node with the minimum distance that is in Q
        var u = Number(Q.reduce((u1, u2) => {
            return dist[u1] < dist[u2] ? u1 : u2;
        }));

        // Remove node with the minimum value from Q
        Q.splice(Q.indexOf(u), 1);

        // Get the edges associated to u
        var edges = graph.edges.filter(e => {
            return e.source.id === u || e.target.id === u;
        });

        // Filter the edges in case the graph is directed
        if (type === "directed") {
            edges = edges.filter(e => e.source.id === u);
        }

        for (edgeIndex in edges) {
        	var e = edges[edgeIndex];
            // Get the neighbor
            var neighbor = e.source.id === u ? e.target.id : e.source.id;

            // Check the neighbor is still in Q
            if (Q.indexOf(neighbor) === -1) {
                continue;
            }
            var weight = e.weight !== undefined ? e.weight : 1;
            var alt = dist[u] + weight;
            if (alt < dist[neighbor]) {
                dist[neighbor] = alt;
                previous[neighbor] = u;
            }
        }
    }
    return previous;
}
