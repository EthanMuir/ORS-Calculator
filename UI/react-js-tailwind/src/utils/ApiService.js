// src/utils/ApiService.js

class ApiService {
    constructor(apiUrl = 'http://localhost:5030') {  // Updated port to match the server
        this.apiUrl = apiUrl;
        this.isConnected = false;
        this.onDataReceived = null;
        this.pollingInterval = null;
        this.lastData = null;
        this.consecutiveErrors = 0;
      }
  
    // Start polling the API for data
    startPolling(intervalMs = 1000) {
      // Clear any existing interval
      this.stopPolling();
      
      // Set up new polling interval
      this.pollingInterval = setInterval(() => {
        this.fetchVitals();
      }, intervalMs);
      
      this.isConnected = true;
      return true;
    }
    
    // Stop polling
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      this.isConnected = false;
    }
    
    // Fetch vitals from the API
    // Fetch vitals from the API
    async fetchVitals() {
        try {
        const response = await fetch(`${this.apiUrl}/api/vitals`, {
            method: 'GET',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            // Adding credentials might help with CORS issues
            credentials: 'same-origin',
            // Cache control
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            this.consecutiveErrors++;
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received data from API:", data);
        
        // Reset error counter on success
        this.consecutiveErrors = 0;
        
        // Only process if data has changed or it's the first data point
        if (!this.lastData || 
            data.heartRate !== this.lastData.heartRate || 
            data.breathRate !== this.lastData.breathRate || 
            data.pd !== this.lastData.pd) {
            
            this.lastData = data;
            
            // Call the callback if registered
            if (this.onDataReceived) {
            this.onDataReceived(data);
            }
        }
        } catch (error) {
        console.error('Error fetching vitals:', error);
        this.consecutiveErrors++;
        
        // If we're getting persistent errors, we might want to disconnect
        if (this.consecutiveErrors > 5) {
            console.error('Too many consecutive errors, disconnecting');
            this.disconnect();
        }
        }
    }
  
    // Connect to the API server
    async connect() {
        try {
        console.log(`Attempting to connect to API at: ${this.apiUrl}/api/vitals`);
        
        // Test connection to API
        const response = await fetch(`${this.apiUrl}/api/vitals`, {
            method: 'GET',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            // Adding credentials might help with CORS issues
            credentials: 'same-origin',
            // Set a reasonable timeout
            timeout: 5000
        });
        
        if (response.ok) {
            // Start polling for data
            this.startPolling();
            console.log('Successfully connected to API server');
            return true;
        } else {
            console.error('API server returned an error:', response.status, response.statusText);
            return false;
        }
        } catch (error) {
        console.error('Failed to connect to API server:', error);
        return false;
        }
    }
    
    // Disconnect from the API server
    disconnect() {
      this.stopPolling();
      console.log('Disconnected from API server');
    }
    
    // Register callback for data reception
    setDataReceivedCallback(callback) {
      this.onDataReceived = callback;
    }
    
    // Update the API URL
    setApiUrl(url) {
      this.apiUrl = url;
    }
  }
  
  export default ApiService;