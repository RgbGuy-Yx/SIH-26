"""
Conflict Detection and Priority Precedence Engine.
Phase 2C: Deterministic Track Contention and Priority Arbitration.
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from app.graph.schemas import (
    TrackType,
    TrackSection,
    TimeWindow,
    SectionOccupancy,
    ConflictResult,
)
from app.ml.schemas import PriorityTier

logger = logging.getLogger(__name__)


class ConflictEngine:
    """
    Deterministic Conflict Detection and Priority Precedence Engine.
    Evaluates track section occupancy windows and arbitrates conflicts based on Indian Railways Priority Tiers.
    
    Priority Hierarchy:
    - Tier 1: Premium High-Speed (Vande Bharat, Rajdhani, Shatabdi)
    - Tier 2: Superfast Express
    - Tier 3: Mail / Express
    - Tier 4: Passenger / Freight
    (Note: Lower integer value = Higher Precedence)
    """

    def __init__(self):
        # Section occupancy registry: section_id -> List[SectionOccupancy]
        self.occupancies: Dict[str, List[SectionOccupancy]] = {}

    def clear(self) -> None:
        """Clear all active occupancies."""
        self.occupancies.clear()

    def register_occupancy(self, occupancy: SectionOccupancy) -> None:
        """Record an active/projected train occupancy in the section registry."""
        if occupancy.section_id not in self.occupancies:
            self.occupancies[occupancy.section_id] = []
        # Replace existing occupancy for same train on same section if present, else append
        self.occupancies[occupancy.section_id] = [
            occ for occ in self.occupancies[occupancy.section_id]
            if occ.train_id != occupancy.train_id
        ]
        self.occupancies[occupancy.section_id].append(occupancy)

    def check_and_resolve_conflict(
        self,
        candidate_train_id: str,
        candidate_train_name: str,
        candidate_priority: PriorityTier,
        section: TrackSection,
        station_from: str,
        station_to: str,
        entry_time: datetime,
        exit_time: datetime,
    ) -> ConflictResult:
        """
        Check if candidate train's section traversal conflicts with any registered trains,
        and apply deterministic priority-based resolution.
        """
        candidate_window = TimeWindow(start_time=entry_time, end_time=exit_time)
        active_on_section = self.occupancies.get(section.section_id, [])

        buffer_delta = timedelta(minutes=section.min_headway_minutes)

        for other in active_on_section:
            if other.train_id == candidate_train_id:
                continue  # Don't conflict with self

            # 1. Single-Line Conflict Check (Both opposing and same direction contend for single track)
            if section.track_type == TrackType.SINGLE:
                if candidate_window.overlaps_with(other.time_window, buffer_minutes=section.min_headway_minutes):
                    return self._resolve_priority(
                        candidate_train_id=candidate_train_id,
                        candidate_priority=candidate_priority,
                        candidate_entry=entry_time,
                        other=other,
                        section=section,
                        conflict_type="Single-line simultaneous block contention",
                    )

            # 2. Double-Line Conflict Check (Same direction headway violation)
            elif section.track_type in (TrackType.DOUBLE, TrackType.QUAD):
                # On double track, trains travelling in the same direction must maintain safety headway
                is_same_direction = (station_from == other.station_from and station_to == other.station_to)
                if is_same_direction:
                    # Headway violation if entry or exit is closer than min_headway_minutes
                    entry_gap = abs((entry_time - other.entry_time).total_seconds()) / 60.0
                    exit_gap = abs((exit_time - other.exit_time).total_seconds()) / 60.0

                    # Or if windows overlap and overtaking is prohibited on standard block
                    if candidate_window.overlaps_with(other.time_window, buffer_minutes=0.0) or entry_gap < section.min_headway_minutes:
                        return self._resolve_priority(
                            candidate_train_id=candidate_train_id,
                            candidate_priority=candidate_priority,
                            candidate_entry=entry_time,
                            other=other,
                            section=section,
                            conflict_type="Double-line block section headway contention",
                        )

        # No conflict detected
        return ConflictResult(
            has_conflict=False,
            conflict_delay_minutes=0.0,
            conflicting_train_id=None,
            conflicting_priority_tier=None,
            precedence_granted_to=candidate_train_id,
            holding_station_id=None,
            resolution_reason="Clear line: no resource contention detected on section.",
        )

    def _resolve_priority(
        self,
        candidate_train_id: str,
        candidate_priority: PriorityTier,
        candidate_entry: datetime,
        other: SectionOccupancy,
        section: TrackSection,
        conflict_type: str,
    ) -> ConflictResult:
        """
        Determines precedence between candidate train and competing train.
        Lower numeric tier value = Higher priority (Tier 1 > Tier 2 > Tier 3 > Tier 4).
        """
        cand_tier_val = int(candidate_priority)
        other_tier_val = int(other.priority_tier)
        headway_buffer = timedelta(minutes=section.min_headway_minutes)

        # Case 1: Candidate has STRICTLY HIGHER priority (lower integer)
        if cand_tier_val < other_tier_val:
            reason = (
                f"{conflict_type} with Train {other.train_id} (Tier {other_tier_val}). "
                f"Candidate Train {candidate_train_id} has HIGHER precedence (Tier {cand_tier_val}). "
                f"Train {candidate_train_id} proceeds with ZERO conflict delay."
            )
            return ConflictResult(
                has_conflict=True,
                conflict_delay_minutes=0.0,
                conflicting_train_id=other.train_id,
                conflicting_priority_tier=other.priority_tier,
                precedence_granted_to=candidate_train_id,
                holding_station_id=None,
                resolution_reason=reason,
            )

        # Case 2: Candidate has STRICTLY LOWER priority (higher integer)
        elif cand_tier_val > other_tier_val:
            # Candidate must be held at the origin station until competing train clears the block + safety headway
            required_clearance_time = other.exit_time + headway_buffer
            wait_seconds = max(0.0, (required_clearance_time - candidate_entry).total_seconds())
            wait_minutes = round(wait_seconds / 60.0, 2)

            reason = (
                f"{conflict_type} with higher-priority Train {other.train_id} (Tier {other_tier_val}). "
                f"Candidate Train {candidate_train_id} (Tier {cand_tier_val}) yielded precedence. "
                f"Held at station {section.station_from} for {wait_minutes:.2f} mins until line clearance."
            )
            return ConflictResult(
                has_conflict=True,
                conflict_delay_minutes=wait_minutes,
                conflicting_train_id=other.train_id,
                conflicting_priority_tier=other.priority_tier,
                precedence_granted_to=other.train_id,
                holding_station_id=section.station_from,
                resolution_reason=reason,
            )

        # Case 3: EQUAL Priority (Tie-breaker: First-come, first-served / earlier access)
        else:
            if candidate_entry < other.entry_time:
                # Candidate arrives earlier, gets precedence
                reason = (
                    f"{conflict_type} between equal-tier trains (Tier {cand_tier_val}). "
                    f"Candidate Train {candidate_train_id} arrived earlier ({candidate_entry}) and was granted precedence."
                )
                return ConflictResult(
                    has_conflict=True,
                    conflict_delay_minutes=0.0,
                    conflicting_train_id=other.train_id,
                    conflicting_priority_tier=other.priority_tier,
                    precedence_granted_to=candidate_train_id,
                    holding_station_id=None,
                    resolution_reason=reason,
                )
            else:
                # Other train arrived first or is already occupying; candidate yields
                required_clearance_time = other.exit_time + headway_buffer
                wait_seconds = max(0.0, (required_clearance_time - candidate_entry).total_seconds())
                wait_minutes = round(wait_seconds / 60.0, 2)

                reason = (
                    f"{conflict_type} between equal-tier trains (Tier {cand_tier_val}). "
                    f"Train {other.train_id} entered section first ({other.entry_time}). "
                    f"Candidate Train {candidate_train_id} yielded and is held for {wait_minutes:.2f} mins."
                )
                return ConflictResult(
                    has_conflict=True,
                    conflict_delay_minutes=wait_minutes,
                    conflicting_train_id=other.train_id,
                    conflicting_priority_tier=other.priority_tier,
                    precedence_granted_to=other.train_id,
                    holding_station_id=section.station_from,
                    resolution_reason=reason,
                )
