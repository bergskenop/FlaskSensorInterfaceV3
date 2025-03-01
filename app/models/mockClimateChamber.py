from app.models.mock.MockGPIO import MockGPIO
from app.models.mock.MockPWM import MockPWM
from app.models.config.ControlConfig import ControlConfig


class MockClimateChamber:
    _instance = None  # Singleton instance

    HEAT_PIN = 18
    COOL_PIN = 23
    PWM_FREQUENCY = 1000

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(MockClimateChamber, cls).__new__(cls)
            cls._instance._initialize_pwm()
            cls._instance.config = ControlConfig()
        return cls._instance

    def _initialize_pwm(self):
        """Initialize mock PWM for testing."""
        print("\nInitializing ClimateChamber with MockPWM and MockGPIO...")
        MockGPIO.setmode(MockGPIO.BCM)
        MockGPIO.setup(self.HEAT_PIN, MockGPIO.OUT)
        MockGPIO.setup(self.COOL_PIN, MockGPIO.OUT)

        self.heat_pwm = MockPWM(self.HEAT_PIN, self.PWM_FREQUENCY)
        self.cool_pwm = MockPWM(self.COOL_PIN, self.PWM_FREQUENCY)

        self.heat_pwm.start(0)
        self.cool_pwm.start(0)

    def set_heating(self, power: float):
        """Set mock heating power."""
        power = max(0, min(100, power))
        print("\nClimateChamber: Setting heating power")
        self.heat_pwm.ChangeDutyCycle(power)

    def set_cooling(self, power: float):
        """Set mock cooling power."""
        power = max(0, min(100, power))
        print("\nClimateChamber: Setting cooling power")
        self.cool_pwm.ChangeDutyCycle(power)

    def stop_all(self):
        """Stop both heating and cooling."""
        print("\nClimateChamber: Stopping all processes")
        self.heat_pwm.ChangeDutyCycle(0)
        self.cool_pwm.ChangeDutyCycle(0)

    def cleanup(self):
        """Cleanup mock GPIO."""
        print("\nClimateChamber: Cleaning up resources")
        self.heat_pwm.stop()
        self.cool_pwm.stop()
        MockGPIO.cleanup()
