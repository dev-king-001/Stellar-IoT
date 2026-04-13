use crate::models::Device;

/// Get mock IoT devices
pub fn get_mock_devices() -> Vec<Device> {
    vec![
        Device {
            id: "device-001".to_string(),
            name: "Smart Lock Alpha".to_string(),
            description: "High-security smart lock for residential use".to_string(),
            price: 5.0,
            available: true,
            location: "Building A, Floor 3".to_string(),
        },
        Device {
            id: "device-002".to_string(),
            name: "Temperature Sensor".to_string(),
            description: "Industrial-grade temperature monitoring sensor".to_string(),
            price: 2.5,
            available: true,
            location: "Warehouse B".to_string(),
        },
        Device {
            id: "device-003".to_string(),
            name: "Security Camera".to_string(),
            description: "4K security camera with night vision".to_string(),
            price: 10.0,
            available: true,
            location: "Parking Lot C".to_string(),
        },
        Device {
            id: "device-004".to_string(),
            name: "Air Quality Monitor".to_string(),
            description: "Real-time air quality monitoring device".to_string(),
            price: 3.0,
            available: false,
            location: "Office D".to_string(),
        },
        Device {
            id: "device-005".to_string(),
            name: "Smart Thermostat".to_string(),
            description: "Energy-efficient climate control system".to_string(),
            price: 7.5,
            available: true,
            location: "Building E, Floor 1".to_string(),
        },
        Device {
            id: "device-006".to_string(),
            name: "Water Flow Sensor".to_string(),
            description: "Monitor water usage and detect leaks".to_string(),
            price: 4.0,
            available: true,
            location: "Utility Room F".to_string(),
        },
    ]
}
