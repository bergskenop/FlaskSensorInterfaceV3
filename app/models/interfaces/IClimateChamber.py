from abc import ABC, abstractmethod


class IClimateChamber(ABC):
    """Interface defining the contract for any climate chamber implementation."""

    @abstractmethod
    def set_heating(self, power: float):
        """Set heating power (0-100%)."""
        pass

    @abstractmethod
    def set_cooling(self, power: float):
        """Set cooling power (0-100%)."""
        pass

    @abstractmethod
    def stop_all(self):
        """Stop both heating and cooling."""
        pass

    @abstractmethod
    def cleanup(self):
        """Clean up resources."""
        pass