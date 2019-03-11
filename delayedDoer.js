console.log('Loading delayedDoer');
function doAction (action, completionChecker, nextAction) {
    var firstWait = true;
    try {
	console.log('Run action: %s',action);
        log('Delayed Doer do action ',action)
	action()
    }
    catch (err) {
	console.log('trouble calling %s',action);
	console.log('err=%s',err)
        log('Delayed Doer ERROR on action %s',action)
    }
    function checkForCompletion () {
	if (completionChecker()) {
	    if (nextAction) {
                log('Delayed Doer: nextAction! (done with %s)',action);
                nextAction()}
	}
	else {
            if (firstWait) {
                log('Delayed Doer: waiting... (action %s)',action);
	        console.log('waiting... (action %s)',action);
                firstWait = false;
            }
	    setTimeout(checkForCompletion,100);
	}
    }
    checkForCompletion()
}

function DelayedAction (action, check, nextAction) {
    obj = {}
    obj.action = action
    obj.completionChecker = check
    return obj
}

function GenericDelayedAction (action) {
    var obj = DelayedAction(action, 
			function () {
			    return obj.complete;
			})
    obj.complete = false;
    obj.finishAction = function () {obj.complete = true;};
    return obj
}

function DelayedTimerAction (action, delay) {
    var a = GenericDelayedAction(action);
    setTimeout(delay,a.finishAction);
    return a;
}


function loopThroughActions (aos) {
    aos.reverse()
    initialNext = function () {}
    nextAction = aos.reduce( function (b,a) {
	if (! a) {console.log('WTF: no a %s, b %s',a,b)}
	if (! a.action) {console.log('WTF: no action on %s',JSON.stringify(a))}
	return function () {
	    doAction(
		a.action,
		a.completionChecker,
		b)}
    },undefined); // end reduce
    aos.reverse();
    nextAction()
}

function testDelayed () {    
    actionList = []
    for (let i of [1,2,3,4,5,6,7,8,9,10]) {
	actionList.push(
	    function (foo) {
		a =DelayedAction(
		    function () {console.log('Doing action %s',foo)}, // action
		    function () {return Math.random() > 0.85}
		);
		return a
	    }(i)
	);
    }
    loopThroughActions(actionList);
}
