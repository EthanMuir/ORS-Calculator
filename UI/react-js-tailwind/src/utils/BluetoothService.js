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
  
    // Connect to a Bluetooth device
    async connect() {
      try {
        // Check Web Bluetooth support
        if (!navigator.bluetooth) {
          console.error('Web Bluetooth API is not supported in this browser');
          return false;
        }
  
        // Request Bluetooth device that advertises with the OIRD name
        this.device = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'OIRD' }
          ],
          // We don't require any services as we'll poll for manufacturer data
          optionalServices: []
        });
  
        console.log('Device selected:', this.device.name);
        
        // Start polling for advertisement data
        this.isConnected = true;
        this.startPolling();
        return true;
      } catch (error) {
        console.error('Bluetooth connection failed:', error);
        this.isConnected = false;
        return false;
      }
    }
  
    // Start polling for advertisement data
    startPolling() {
      // Clear any existing interval
      if (this.interval) {
        clearInterval(this.interval);
      }
  
      // Start a new polling interval (every 500ms)
      this.interval = setInterval(async () => {
        try {
          // Simulate receiving data
          // In a production app, you would parse the advertisement data
          // This is simplified for this prototype
          this.simulateDataReceived();
        } catch (error) {
          console.error('Error polling for advertisement data:', error);
        }
      }, 500);
    }
  
    // Simulate data reception from the BLE advertisements
    // In a real implementation, you would parse manufacturer data
    simulateDataReceived() {
      // Check if we have a callback
      if (!this.onDataReceived) return;
  
      // Get the timestamp
      const timestamp = Date.now();
      
      // Add some random variation to make it look real
      this.lastHr = Math.max(50, Math.min(100, this.lastHr + (Math.random() - 0.5) * 5));
      this.lastBr = Math.max(10, Math.min(25, this.lastBr + (Math.random() - 0.5) * 2));
      
      // Call the callback with the data
      this.onDataReceived({
        heartRate: this.lastHr,
        breathRate: this.lastBr,
        timestamp: timestamp
      });
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