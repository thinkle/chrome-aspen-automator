function ActionTracker  () {

    var data = {}
    var url_matchers = {}

    function getUrlMatch (url) {
	for (var pattern in url_matchers) {
	    if (url.indexOf(pattern) > -1) {
		return url_matchers[pattern]
	    }
	}
    }

    var self = {
    
	getAction : function (context, url) {
	    if (!context) {
		context = url_matchers[url]
		if (!context) {
		    context = getUrlMatch(url);
		}
	    }
	    return data[context]
	},

	createAction : function (context, url) {
	    if (context && url) {
		url_matchers[url] = context
	    }
	    else {
		if (url) {
		    url_matchers[url] = url;
		    context = url
		}
	    }
	    data[context] = {'queued':[],
			     'inprogress':[]}
	    return data[context]
	},

	getOrCreateAction : function (context, url) {
	    a = self.getAction(context,url);
	    if (a) {return a}
	    else {return self.createAction(context,url)}
	},

	queueAction : function (action, context, url) {
	    var actionList = self.getOrCreateAction(context,url);
	    if (! actionList) {
		actionList = data[context] 
	    }
	    actionList.queued.push(action)
	    return actionList.queued.length
	}, // end queueAction

	startAction : function (context, url) {
	    var a = self.getAction(context,url)
	    if (a) {
		if (a.inprogress.length > 0) {
		    return BUSY
		}
		if (a.queued.length > 0) {
		    var next = a.queued.shift()
		    a.inprogress.push(next)
		    return next
		}
	    }
	},

	isEmpty : function (context,url) {
	    var a = self.getAction(context, url);
	    if ((a.queued.length + a.inprogress.length) > 0) {
		return false
	    }
	    else {
		return true
	    }
	},

	completeAction : function (action, context, url) {
	    var a = self.getAction(context,url)
	    if (!a) {
		console.log('Oops: %s, %s, %s',JSON.stringify(action),context,url)
		throw "Completing action that doesn't exist"}
	    var i = a.inprogress.indexOf(action)
	    a.inprogress.splice(i,1); // remove item
	},

    } // end Object

    return self
}

actions = ActionTracker()


function doWait (contexts) {
    val = false;
    for (var c of contexts) {
	if (actions.isEmpty(c.context,c.url)) {
	    val = true;
	}
	else {
	    return false
	}
    }
    return val;
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      //console.log(sender.tab ?
      //            "from a content script:" + sender.tab.url :
      //            "from the extension");
      switch (request.mode) {
      case 'register':
	  console.log('register action %s',JSON.stringify(request));
	  sendResponse(
	      actions.queueAction(
		  request.action,
		  request.context,
		  request.url
	      )
	  );
	  break;
      case 'get':
	  var action = actions.startAction(request.context,request.url);
	  if (action) {console.log('Got action %s',JSON.stringify(action));}
	  sendResponse(action);
	  break;
      case 'complete':
	  console.log('Complete action %s %s %s',JSON.stringify(request.action), request.context, request.url);
	  actions.completeAction(
	      request.action,request.context,request.url
	  );
	  break;
      case 'wait':
	  val = doWait(request.waitlist);
	  sendResponse(val);
	  break;
      default:
	  console.log('Fell thorugh with request mode %s',request.mode);
      }
  }
); // end listener
