# Graph Editor
Simple web application for creating graphs. It is implemented using D3.js, JQuery and Bootstrap as the main libraries. It is also built on top of an [existing graph creator](https://bl.ocks.org/cjrd/6863459).

## Installation:
+   Copy or clone this repository
+   Open the file **index.html** in your favourite browser

## Background
Graph Editor has the following functional requirements:

+ **Creation of nodes**: Just click on graph to create a node.
+ **Edition of the text of a node**: Control-click on a node to change its title.
+ **Creation of edges**: Control-click on a node and then drag to another node to connect them.
+ **Drag/scroll to zoom the graph**: Just use the mouse's spin wheel to zoom in or out.
+ **Deletion of nodes/edges**: Select nodes or edges and press backspace/delete to remove them from the graph.
+ **Customizable nodes/edges**: Nodes and edges can be fully customized.
+ **Multiple selection of nodes/edges**: Shift-click to select multiple nodes or edges.
+ **Find nodes by its title**: Search for nodes that contain a specific text.
+ **Find shortest path between two nodes**: Using Dijkstra algorithm, it can find the shortest path between two nodes.
+ **Print Graph**: Print your created graph.

## Keyboard Shortcuts
The following are keyboard shortcuts that can be used to execute the functionalities of the application:

+ **Control + Shift + A**: Select all nodes.
+ **Control + Shift + E**: Select all edges.
+ **Control + Shift + X**: Unselect all elements.
+ **Control + Shift + F**: Find node by name.
+ **Control + Shift + S**: Find shortest path.
+ **Backspace/delete**: Remove a node or edge.