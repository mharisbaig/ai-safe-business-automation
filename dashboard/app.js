/**
 * Arbre IT Support and Solution
 * Dashboard Application Logic
 */

const API_BASE_URL = window.location.origin + '/api';

class Dashboard {
    constructor() {
        this.stats = {
            safe: 0,
            flagged: 0,
            blocked: 0,
            totalTime: 0,
            count: 0
        };
        
        this.init();
    }

    init() {
        this.loadStats();
        this.loadActivity();
        this.setupAutoRefresh();
    }

    async loadStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/safety/status`);
            const data = await response.json();
            
            document.getElementById('pii-status').textContent = 
                data.guardrails.piiRedaction ? 'Enabled' : 'Disabled';
            document.getElementById('injection-status').textContent = 
                data.guardrails.injectionDetection ? 'Enabled' : 'Disabled';
                
        } catch (error) {
            console.error('Failed to load safety status:', error);
        }
    }

    async loadActivity() {
        // Simulated activity data - replace with actual API call
        const activities = [
            {
                requestId: 'arb_1234567890_abc123',
                time: new Date().toLocaleTimeString(),
                status: 'success',
                checks: ['input_clean', 'pii_redacted', 'output_safe']
            },
            {
                requestId: 'arb_1234567891_def456',
                time: new Date(Date.now() - 60000).toLocaleTimeString(),
                status: 'flagged',
                checks: ['input_clean', 'low_confidence']
            }
        ];

        this.renderActivity(activities);
    }

    renderActivity(activities) {
        const tbody = document.getElementById('activity-body');
        tbody.innerHTML = '';

        activities.forEach(activity => {
            const row = document.createElement('tr');
            
            const statusClass = activity.status === 'success' ? 'safe' : 
                               activity.status === 'flagged' ? 'warning' : 'danger';
            
            row.innerHTML = `
                <td>${activity.requestId}</td>
                <td>${activity.time}</td>
                <td><span class="status-badge ${statusClass}">${activity.status}</span></td>
                <td>${activity.checks.join(', ')}</td>
                <td><button onclick="viewDetails('${activity.requestId}')">View</button></td>
            `;
            
            tbody.appendChild(row);
        });
    }

    setupAutoRefresh() {
        setInterval(() => {
            this.loadStats();
            this.loadActivity();
        }, 30000); // Refresh every 30 seconds
    }

    updateStats(type, processingTime) {
        if (type === 'success') this.stats.safe++;
        else if (type === 'flagged') this.stats.flagged++;
        else if (type === 'blocked') this.stats.blocked++;
        
        this.stats.totalTime += processingTime;
        this.stats.count++;
        
        document.getElementById('safe-requests').textContent = this.stats.safe;
        document.getElementById('flagged-requests').textContent = this.stats.flagged;
        document.getElementById('blocked-requests').textContent = this.stats.blocked;
        document.getElementById('avg-response-time').textContent = 
            this.stats.count > 0 ? Math.round(this.stats.totalTime / this.stats.count) + 'ms' : '0ms';
    }
}

// Global dashboard instance
const dashboard = new Dashboard();

// Test prompt function
async function testPrompt() {
    const prompt = document.getElementById('test-prompt').value;
    const resultBox = document.getElementById('test-result');
    
    if (!prompt.trim()) {
        resultBox.textContent = 'Please enter a prompt to test';
        resultBox.className = 'result-box show error';
        return;
    }

    resultBox.textContent = 'Testing...';
    resultBox.className = 'result-box show';
    
    try {
        const response = await fetch(`${API_BASE_URL}/ai/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken() // Implement token retrieval
            },
            body: JSON.stringify({
                prompt: prompt,
                context: { domain: 'test' }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultBox.innerHTML = `
                <strong>✅ Safe Response</strong><br>
                <strong>Request ID:</strong> ${data.requestId}<br>
                <strong>Response:</strong> ${data.response}<br>
                <strong>Safety Checks:</strong> ${data.safetyChecks.join(', ')}<br>
                <strong>Processing Time:</strong> ${data.processingTime}ms
            `;
            resultBox.className = 'result-box show success';
            dashboard.updateStats('success', data.processingTime);
        } else {
            resultBox.innerHTML = `
                <strong>⚠️ Request Blocked</strong><br>
                <strong>Error Type:</strong> ${data.errorType}<br>
                <strong>Reason:</strong> ${data.safetyReason}<br>
                <strong>Requires Human Review:</strong> ${data.requiresHumanReview ? 'Yes' : 'No'}
            `;
            resultBox.className = 'result-box show error';
            dashboard.updateStats(data.errorType === 'unsafe_input' ? 'blocked' : 'flagged', 0);
        }
        
    } catch (error) {
        resultBox.innerHTML = `<strong>Error:</strong> ${error.message}`;
        resultBox.className = 'result-box show error';
    }
}

function viewDetails(requestId) {
    alert('View details for: ' + requestId);
}

function getToken() {
    // Implement JWT token retrieval from storage
    return localStorage.getItem('auth_token') || '';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌳 Arbre IT Support and Solution - Dashboard Loaded');
});
