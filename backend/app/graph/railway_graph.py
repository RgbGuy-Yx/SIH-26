"""
NetworkX Railway Graph Topology.
Phase 2C: Railway Network Graph, Stations, and Track Section Management.
"""

from typing import Dict, List, Optional, Tuple, Any
import networkx as nx

from app.graph.schemas import StationNode, TrackSection, TrackType


class RailwayGraph:
    """
    NetworkX-based representation of railway physical topology.
    - Nodes represent Stations, Junctions, and Terminals.
    - Edges represent directed or bi-directional Block Track Sections.
    """

    def __init__(self):
        # We use a directed graph; for single lines, bi-directional edge references share a section key
        self.graph = nx.DiGraph()
        self.stations: Dict[str, StationNode] = {}
        self.sections: Dict[str, TrackSection] = {}  # section_id -> TrackSection
        self.pair_to_section: Dict[Tuple[str, str], TrackSection] = {}

    def add_station(self, station: StationNode) -> None:
        """Register a station node in the graph."""
        self.stations[station.station_id] = station
        self.graph.add_node(
            station.station_id,
            name=station.name,
            loop_capacity=station.loop_capacity,
            latitude=station.latitude,
            longitude=station.longitude,
        )

    def add_track_section(self, section: TrackSection, bidirectional: bool = True) -> None:
        """Register a track section (edge) between two stations."""
        self.sections[section.section_id] = section
        self.pair_to_section[(section.station_from, section.station_to)] = section

        # Forward edge
        self.graph.add_edge(
            section.station_from,
            section.station_to,
            section_id=section.section_id,
            length_km=section.length_km,
            track_type=section.track_type,
            max_speed_kmh=section.max_speed_kmh,
            min_headway_minutes=section.min_headway_minutes,
            default_transit_minutes=section.default_transit_minutes,
        )

        # If bidirectional or single track, register the reverse traversal pair
        if bidirectional:
            self.pair_to_section[(section.station_to, section.station_from)] = section
            self.graph.add_edge(
                section.station_to,
                section.station_from,
                section_id=section.section_id,
                length_km=section.length_km,
                track_type=section.track_type,
                max_speed_kmh=section.max_speed_kmh,
                min_headway_minutes=section.min_headway_minutes,
                default_transit_minutes=section.default_transit_minutes,
            )

    def get_station(self, station_id: str) -> Optional[StationNode]:
        """Retrieve station node metadata."""
        return self.stations.get(station_id)

    def get_section(self, station_from: str, station_to: str) -> Optional[TrackSection]:
        """Retrieve track section between two adjacent stations."""
        return self.pair_to_section.get((station_from, station_to))

    def has_path(self, source: str, target: str) -> bool:
        """Check if a path exists between source and target stations."""
        if source not in self.graph or target not in self.graph:
            return False
        return nx.has_path(self.graph, source, target)

    def get_shortest_route(self, source: str, target: str) -> List[str]:
        """Compute shortest station path based on section length."""
        if not self.has_path(source, target):
            return []
        return nx.shortest_path(self.graph, source=source, target=target, weight="length_km")

    @classmethod
    def create_from_dataset(cls, csv_path: Optional[str] = None) -> "RailwayGraph":
        """
        Dynamically builds the complete National Railway Graph from final_training_features.csv.
        """
        from app.graph.dataset_loader import load_national_railway_graph
        return load_national_railway_graph(csv_path=csv_path)

    @classmethod
    def create_default_corridor(cls, csv_path: Optional[str] = None) -> "RailwayGraph":
        """
        Builds the Indian Railways network graph directly from the dataset.
        """
        from app.graph.dataset_loader import load_national_railway_graph
        return load_national_railway_graph(csv_path=csv_path)

