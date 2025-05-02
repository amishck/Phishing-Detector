// Cache for known phishing domains
let phishingDomains = new Set();
let suspiciousKeywords = [
  'login', 'verify', 'bank', 'account', 'password', 
  'security', 'update', 'confirm', 'amazon', 'paypal',
  'ebay', 'apple', 'microsoft', 'netflix', 'credit',
  'card', 'ssn', 'social', 'security', 'irs'
];

// Update phishing domains list periodically
chrome.alarms.create('updatePhishingList', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updatePhishingList') {
    updatePhishingDomains();
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  updatePhishingDomains();
});

async function updatePhishingDomains() {
  try {
    // Fetch from PhishTank
    const phishTankResponse = await fetch('https://data.phishtank.com/data/online-valid.json');
    const phishTankData = await phishTankResponse.json();
    
    // Fetch from OpenPhish (would need API key in production)
    // const openPhishResponse = await fetch('https://openphish.com/feed.txt');
    // const openPhishData = await openPhishResponse.text();
    
    // Clear existing data
    phishingDomains.clear();
    
    // Add PhishTank domains
    phishTankData.forEach(entry => {
      try {
        const url = new URL(entry.url);
        phishingDomains.add(url.hostname);
      } catch (e) {
        console.error('Error parsing URL:', entry.url);
      }
    });
    
    // Add OpenPhish domains (would parse the text response)
    // openPhishData.split('\n').forEach(url => {
    //   try {
    //     const parsed = new URL(url);
    //     phishingDomains.add(parsed.hostname);
    //   } catch (e) {}
    // });
    
    console.log('Updated phishing domains list. Total:', phishingDomains.size);
    chrome.storage.local.set({ lastUpdate: Date.now() });
  } catch (error) {
    console.error('Failed to update phishing domains:', error);
  }
}

// Check URL against our detection methods
function analyzeUrl(url) {
  const results = {
    isPhishing: false,
    reasons: [],
    warnings: []
  };
  
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    
    // Check against known phishing domains
    if (phishingDomains.has(hostname)) {
      results.isPhishing = true;
      results.reasons.push(`Known phishing domain: ${hostname}`);
    }
    
    // Check for suspicious characters (homoglyphs)
    const suspiciousPatterns = [
      /[а-я]/i, // Cyrillic
      /[α-ω]/i, // Greek
      // Add more character sets as needed
    ];
    
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(hostname)) {
        results.isPhishing = true;
        results.reasons.push(`Suspicious characters in domain: ${hostname}`);
      }
    });
    
    // Check for domain impersonation
    const commonDomains = ['google', 'facebook', 'amazon', 'apple', 'microsoft', 'paypal'];
    commonDomains.forEach(domain => {
      if (hostname.includes(domain) && !hostname.endsWith(`.${domain}.com`)) {
        results.warnings.push(`Possible impersonation of ${domain}`);
      }
    });
    
    // Check for suspicious keywords in path/query
    const urlLower = url.toLowerCase();
    suspiciousKeywords.forEach(keyword => {
      if (urlLower.includes(keyword)) {
        results.warnings.push(`Suspicious keyword in URL: ${keyword}`);
      }
    });
    
    // Check for IP address as domain
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      results.warnings.push(`Domain is an IP address: ${hostname}`);
    }
    
    // Check for long domain names
    if (hostname.length > 30) {
      results.warnings.push(`Unusually long domain name: ${hostname}`);
    }
    
    // Check for multiple subdomains
    const subdomainCount = hostname.split('.').length - 2;
    if (subdomainCount > 3) {
      results.warnings.push(`Excessive subdomains: ${hostname}`);
    }
    
  } catch (e) {
    console.error('Error analyzing URL:', e);
  }
  
  return results;
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_URL') {
    const analysis = analyzeUrl(message.url);
    sendResponse(analysis);
  } else if (message.type === 'REFRESH_DATA') {
    updatePhishingDomains()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error refreshing data:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicate async response
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const analysis = analyzeUrl(tab.url);
    
    if (analysis.isPhishing || analysis.warnings.length > 0) {
      chrome.tabs.sendMessage(tabId, {
        type: 'PHISHING_ALERT',
        data: analysis
      });
      
      if (analysis.isPhishing) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Phishing Warning!',
          message: `This site (${new URL(tab.url).hostname}) appears to be a phishing site.`,
          priority: 2
        });
      }
    }
  }
});