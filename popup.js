var url;

function sendAssignmentsToAspen () {
    console.log('Send URL to aspen: %s',url);
    chrome.runtime.sendMessage({
        mode : 'sheet',
        method : 'assignments',
        url : url,
    });
    document.getElementById('message').innerHTML = 'Now navigate to the assignments page for the class you want to import grades to!';
    document.getElementById('commands').style = 'display:none';
    
}

function sendGradesToAspen () {
    console.log('Send URL to aspen: %s',url);
    chrome.runtime.sendMessage({
        mode : 'sheet',
        method : 'grades',
        url : url,
    });
    document.getElementById('message').innerHTML = 'Now navigate to the grades page for the class you want to import grades to!';
    document.getElementById('commands').style = 'display:none';
}



function sendToClipboard (txt) {
    document.addEventListener('copy', function(e) {
        e.clipboardData.setData('text/plain', txt);
        e.preventDefault();
    });
    document.execCommand('copy');
    document.getElementById('message').innerHTML = 'Copied to clipboard. Now use Ctrl-V to paste headers into your spreadsheet.';
    document.getElementById('commands').style = 'display:none';
}


document.getElementById('sendA').addEventListener('click', sendAssignmentsToAspen);
document.getElementById('sendG').addEventListener('click', sendGradesToAspen);
document.getElementById('copyAssignment').addEventListener(
    'click',
    ()=>sendToClipboard(assignmentFields.join('\t'))
);
document.getElementById('copyGrade').addEventListener(
    'click',
    ()=>sendToClipboard(gradebookFields.join('\t'))
);
                                                           
chrome.tabs.query({active:true,currentWindow:true},
                  (ww)=>{
                      var w = ww[0];
                      url = w.url;
                      if (/docs.google.com\/spreadsheets/.exec(url)) {
                          document.getElementById('sheet').style = 'display: block'
                          //document.getElementById('message').innerHTML = 
                          document.getElementById('title').innerHTML = 'Aspen Automator: Google Sheet'
                          //document.getElementById('message').innerHTML = 'This is a spreadsheet';
                      }
                      else {
                          //window.alert(`this is not a spreadsheet: ${w.url}`);
                          //document.getElementById('message').innerHTML = 'Not a spreadsheet';
                      }
                  });

