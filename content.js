chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PHISHING_ALERT') {
      displayWarning(message.data);
    }
  });
  
  function displayWarning(analysis) {
    // Create warning element
    const warning = document.createElement('div');
    warning.style.position = 'fixed';
    warning.style.top = '0';
    warning.style.left = '0';
    warning.style.width = '100%';
    warning.style.zIndex = '9999';
    warning.style.padding = '15px';
    warning.style.backgroundColor = analysis.isPhishing ? '#ff4444' : '#ffbb33';
    warning.style.color = 'white';
    warning.style.textAlign = 'center';
    warning.style.fontFamily = 'Arial, sans-serif';
    warning.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '10px';
    closeBtn.style.top = '10px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => warning.remove();
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = analysis.isPhishing ? 
      '⚠️ PHISHING WARNING ⚠️' : '⚠️ SUSPICIOUS WEBSITE ⚠️';
    title.style.margin = '0 0 10px 0';
    
    // Create reasons list
    const reasonsList = document.createElement('ul');
    reasonsList.style.textAlign = 'left';
    reasonsList.style.margin = '10px auto';
    reasonsList.style.maxWidth = '600px';
    reasonsList.style.paddingLeft = '20px';
    
    [...analysis.reasons, ...analysis.warnings].forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      reasonsList.appendChild(item);
    });
    
    // Create continue link
    const continueLink = document.createElement('div');
    continueLink.style.marginTop = '10px';
    continueLink.style.fontSize = '14px';
    
    const link = document.createElement('a');
    link.textContent = 'I understand the risks, proceed anyway';
    link.style.color = 'white';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    link.onclick = () => warning.remove();
    
    continueLink.appendChild(link);
    
    // Assemble the warning
    warning.appendChild(closeBtn);
    warning.appendChild(title);
    warning.appendChild(reasonsList);
    if (!analysis.isPhishing) {
      warning.appendChild(continueLink);
    }
    
    // Add to page
    document.body.prepend(warning);
    
    // For phishing sites, consider more aggressive measures
    if (analysis.isPhishing) {
      document.body.style.opacity = '0.7';
      document.body.style.pointerEvents = 'none';
      
      warning.style.backgroundColor = '#ff4444';
      warning.style.pointerEvents = 'auto';
    }
  }