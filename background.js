/**** Let's explain how the fuck this thing works...

Action tracker basically listens here...

We get requests from the extension which are objects and which we relay back...

{mode: MODE,
 action : ACTION,
 context: CONTEXT,
 url : URL }

This allows the front end to plan actions that will happen at certain
URLs etc. -- in other words, it allows a chain of actions to survive a
page reload.

The process begins with:

{mode: register...} -> This is how the front end registers an action to be taken in the future.

The next step is

{mode : get...} -> This is how the front end requests the next action to do

Once the front end has carried out an action, it calls:

{mode : complete} -> This is how the front end signals it is DONE with an action.


Also, delays can be triggered with 
{mode : wait, waitlist: [{url:URL},...]} - which either waits for us to have been through a URL before it triggers completion

The front end can also request an action be triggered AGAIN with 
{mode : reset}

Or the front end can trigger us to SKIP an action with
{mode :skip}




****/

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

	skipAction : function (context, url) {
	    var action = self.getAction(context,url);
	    action.inprogress = [] // set to nothing...
	},

	resetAction : function (context, url) {
	    var action = self.getAction(context,url);
            if (action.inprogress) {
	        var newqueue = action.inprogress.concat(action.queue)
	        action.inprogress = [];
	        action.queue = newqueue;
            }
            else {
                console.log('resetAction called, but we have nothing in progress.');
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
      case 'log':
	  //console.log('Got log %s',request.arguments.length);
	  request.arguments[0] = 'FRONTEND LOG: '+request.arguments[0]+' (CONTEXT: '+request.context+')';
	  console.log.apply(this,[request.arguments[0],request.arguments[1],request.arguments[2]]);
	  //console.log.apply(this,request.arguments);
          break;
      case 'reset':
	  actions.resetAction(request.context,request.url);
	  break;
      case 'skip':
	  actions.skipAction(request.context,request.url);
	  // skip the current action for this URL
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
      case 'sleep':
          if (!request.time) {request.time = 500} // default
          console.log('Sleeping for %s',request.time);
          setTimeout(
              ()=>{
                  console.log('Done sleeping!')
                  sendResponse(true);
              },
              request.time
          );
          break;
      default:
	  console.log('Fell thorugh with request mode %s',request.mode);
      }
  }
); // end listener
