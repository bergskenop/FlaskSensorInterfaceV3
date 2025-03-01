#import RPi.GPIO as GPIO


class ClimateChamber:
    _instance = None  # Singleton instance

    # Define GPIO pins for heating and cooling
    HEAT_PIN = 18  # Adjust based on actual hardware
    COOL_PIN = 23  # Adjust based on actual hardware
    PWM_FREQUENCY = 1000  # PWM Frequency in Hz

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ClimateChamber, cls).__new__(cls)
            # cls._instance._initialize_pwm()
        return cls._instance


    # def _initialize_pwm(self):
    #     """Initialize GPIO and PWM for heating and cooling."""
    #     GPIO.setmode(GPIO.BCM)
    #     GPIO.setup(self.HEAT_PIN, GPIO.OUT)
    #     GPIO.setup(self.COOL_PIN, GPIO.OUT)
    #
    #     self.heat_pwm = GPIO.PWM(self.HEAT_PIN, self.PWM_FREQUENCY)
    #     self.cool_pwm = GPIO.PWM(self.COOL_PIN, self.PWM_FREQUENCY)
    #
    #     self.heat_pwm.start(0)  # Start with 0% duty cycle
    #     self.cool_pwm.start(0)  # Start with 0% duty cycle
    #
    # def set_heating(self, power: float):
    #     """Set heating power (0 to 100%)."""
    #     power = max(0, min(100, power))  # Clamp power between 0-100%
    #     self.heat_pwm.ChangeDutyCycle(power)
    #     print(f"Heating set to {power}%")
    #
    # def set_cooling(self, power: float):
    #     """Set cooling power (0 to 100%)."""
    #     power = max(0, min(100, power))  # Clamp power between 0-100%
    #     self.cool_pwm.ChangeDutyCycle(power)
    #     print(f"Cooling set to {power}%")
    #
    # def stop_all(self):
    #     """Stop both heating and cooling."""
    #     self.heat_pwm.ChangeDutyCycle(0)
    #     self.cool_pwm.ChangeDutyCycle(0)
    #     print("Heating and cooling stopped.")
    #
    # def cleanup(self):
    #     """Cleanup GPIO resources."""
    #     self.heat_pwm.stop()
    #     self.cool_pwm.stop()
    #     GPIO.cleanup()
    #     print("GPIO cleaned up.")

