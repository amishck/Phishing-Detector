document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const detailsDiv = document.getElementById('details');
    const updateTimeSpan = document.getElementById('updateTime');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // Get current tab and analyze it
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        chrome.runtime.sendMessage(
          {type: 'ANALYZE_URL', url: tabs[0].url},
          (analysis) => {
            updateUI(analysis);
          }
        );
      } else {
        statusDiv.textContent = 'No active page to analyze';
        statusDiv.className = 'status warning';
      }
    });
    
    // Get last update time
    chrome.storage.local.get(['lastUpdate'], (result) => {
      if (result.lastUpdate) {
        updateTimeSpan.textContent = new Date(result.lastUpdate).toLocaleString();
      }
    });
    
    // Refresh data button
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Updating...';
      
      chrome.runtime.sendMessage({type: 'REFRESH_DATA'}, () => {
        setTimeout(() => {
          refreshBtn.disabled = false;
          refreshBtn.textContent = 'Refresh Data';
          chrome.storage.local.get(['lastUpdate'], (result) => {
            if (result.lastUpdate) {
              updateTimeSpan.textContent = new Date(result.lastUpdate).toLocaleString();
            }
          });
        }, 1000);
      });
    });
    
    function updateUI(analysis) {
      if (analysis.isPhishing) {
        statusDiv.textContent = 'DANGER: Phishing site detected!';
        statusDiv.className = 'status danger';
      } else if (analysis.warnings.length > 0) {
        statusDiv.textContent = 'Warning: Suspicious elements detected';
        statusDiv.className = 'status warning';
      } else {
        statusDiv.textContent = 'This page appears safe';
        statusDiv.className = 'status safe';
      }
      
      detailsDiv.innerHTML = '';
      
      if (analysis.reasons.length > 0 || analysis.warnings.length > 0) {
        const detailsTitle = document.createElement('h3');
        detailsTitle.textContent = 'Details:';
        detailsDiv.appendChild(detailsTitle);
        
        [...analysis.reasons, ...analysis.warnings].forEach(item => {
          const div = document.createElement('div');
          div.className = 'detail-item';
          div.textContent = item;
          detailsDiv.appendChild(div);
        });
      }
    }
  });