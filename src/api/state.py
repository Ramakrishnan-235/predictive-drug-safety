"""Synchronization for the development server's process-local ward state.

This lock does not provide persistence or synchronization across worker processes.
"""

from threading import RLock


WARD_STATE_LOCK = RLock()
