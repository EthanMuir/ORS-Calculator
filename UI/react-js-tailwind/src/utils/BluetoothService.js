// src/utils/BluetoothService.js

class BluetoothService {
    constructor() {
      this.device = null;
      this.server = null;
      this.isConnected = false;
      this.onDataReceived = null;
      this.interval = null;
      this.lastHr = 0;
      this.lastBr = 0;
    }
  
    async connect() {
        try {
          // Force a clean device selection by adding a timestamp to avoid browser caching
          const randomId = Math.floor(Math.random() * 10000);
          
          this.device = await navigator.bluetooth.requestDevice({
            filters: [
              { name: "OIRD_Sensor" },
              // Add optional namePrefix as fallback
              { namePrefix: "OIRD" }
            ],
            // No need for optionalServices if you're not using them yet
            // This helps simplify the discovery
          });
      
          console.log('Device selected:', this.device.name);
          
          this.isConnected = true;
          this.startPolling();
          return true;
        } catch (error) {
          console.error('Bluetooth connection failed:', error);
          this.isConnected = false;
          return false;
        }
      }
  
    // Replace with a proper method to handle advertisements
startPolling() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  
    // Listen for advertisements instead of simulating data
    this.interval = setInterval(async () => {
      try {
        if (!this.device) return;
        
        // Try to read the manufacturer data from the device
        const server = await this.device.gatt.connect();
        const service = await server.getPrimaryService('generic_access');
        const characteristic = await service.getCharacteristic('gap.device_name');
        
        // Read the advertisement data
        const value = await characteristic.readValue();
        
        // Parse the data from the advertisement
        if (value.byteLength >= 4) {
          // Extract heart rate (first 2 bytes) and breath rate (next 2 bytes)
          const hr = (value.getUint8(0) + (value.getUint8(1) << 8)) / 10;
          const br = (value.getUint8(2) + (value.getUint8(3) << 8)) / 10;
          
          // Call the callback with the real data
          if (this.onDataReceived) {
            this.onDataReceived({
              heartRate: hr,
              breathRate: br,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Error reading advertisement data:', error);
      }
    }, 500);
  }
    // Disconnect from the Bluetooth device
    async disconnect() {
      // Stop polling
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
      
      this.isConnected = false;
      
      // If we have a device, disconnect from it
      if (this.device && this.device.gatt.connected) {
        this.device.gatt.disconnect();
        console.log('Bluetooth device disconnected');
      }
    }
  
    // Register a callback for data reception
    setDataReceivedCallback(callback) {
      this.onDataReceived = callback;
      
      // Initialize with some values
      this.lastHr = 70;
      this.lastBr = 16;
    }
  
    // Check if the browser supports Web Bluetooth
    static isSupported() {
      return 'bluetooth' in navigator;
    }
  }
  
  export default BluetoothService;