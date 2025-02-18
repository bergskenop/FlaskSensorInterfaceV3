import time
import json


def read_sensor_data(file_path='app/config/sensor_data.json'):
    """Reads sensor data from a JSON file."""
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

def sensor_data_generator():
    """
    Generator that reads sensor data every 2 seconds and yields it in a format
    suitable for Server-Sent Events (SSE).
    """
    while True:
        data = read_sensor_data()
        # SSE expects a message that begins with "data:" and ends with two newline characters.
        yield f"data: {json.dumps(data)}\n\n"
        time.sleep(0.2)


def main():
    json_file = 'sensor_data.json'

    while True:
        try:
            sensor_data = read_sensor_data(json_file)
            print("Sensor Data:", sensor_data)
        except Exception as e:
            print("Error reading JSON file:", e)

        # Wait for 5 seconds before the next read
        time.sleep(1)


if __name__ == '__main__':
    main()
