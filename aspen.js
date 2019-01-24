// Delay we add when needed for X2 to do its thing (in milliseconds)
var DELAY = 5000;

// Variables and such...

gft = {} // globals for testing -- bad :) - just shove stuff in here to see it easily in the console
var mid_increment = 1 // For keeping track of new class/id names we append
var prefs = Prefs(['customStyle']);

// Convenience functions...

function log () {
    console.log.apply(this,arguments);
    chrome.runtime.sendMessage({
	mode:'log',
	arguments:arguments,
	context:document.URL
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
    log('Taking a break...');
    await sleep(2000);
    log('Two second later');
}

// Convenience functions for automating browser actions in X2...

function remoteControlTest () {
    log('Remote Control Test');
    $(':contains("Add Assignment")').click()
}

function simulateKeyPress (character, element) {
    var keyboardEvent = document.createEvent("KeyboardEvent");
    var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
    keyboardEvent[initMethod](
	"keydown", // event type : keydown, keyup, keypress
	true, // bubbles
	true, // cancelable
	window, // viewArg: should be window
	false, // ctrlKeyArg
	false, // altKeyArg
	false, // shiftKeyArg
	false, // metaKeyArg
	0, // keyCodeArg : unsigned long the virtual key code, else 0 ::: TAB
	character.charCodeAt(0) // charCodeArgs : unsigned long the Unicode character associated with the depressed key, else 0
    );
    element.dispatchEvent(keyboardEvent);
}

function dateToAspenDate (dateObj) {
    return dateObj.getMonth()+1 + '/' + dateObj.getDate() + '/' + (dateObj.getYear()+1900);
}

function setValue (lab, val) {
    getValueSetter().action()
}

function getValueSetter (lab,val,n) {
    if (!n) {n=0}
    $label = $($('span:contains("'+lab+'")')[n]);
    $labelParent = $($label.parent('td'))
    $nextCell = $($labelParent.siblings('td.detailValue')[0]);
    var doExtraCheck, origVals, timer, totalTimer
    var valueWidgets = $nextCell.find('input')
    var w = valueWidgets[0]
    gft[lab] = valueWidgets
    waitTime = 500;
    return DelayedAction(
	function () {
	    log('Setting widget %s to %s (%s)',w,val,lab);
	    w.value = val;
	    // X2 does some black magic when updating some fields that requires
	    // us to simulate a keypress in order to get their onchange to fire
	    // Code from:
	    // http://stackoverflow.com/questions/596481/is-it-possible-to-simulate-key-press-events-programatically
	    if (valueWidgets.length > 1) {
		// Ok -- in this case, we have some other things that update magically...
		origVals = valueWidgets.map(function () {return this.value}).slice(1)
		var keyboardEvent = document.createEvent("KeyboardEvent");
		var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
		keyboardEvent[initMethod](
		    "keydown", // event type : keydown, keyup, keypress
		    true, // bubbles
		    true, // cancelable
		    window, // viewArg: should be window
		    false, // ctrlKeyArg
		    false, // altKeyArg
		    false, // shiftKeyArg
		    false, // metaKeyArg
		    9, // keyCodeArg : unsigned long the virtual key code, else 0 ::: TAB
		    0 // charCodeArgs : unsigned long the Unicode character associated with the depressed key, else 0
		);
		w.dispatchEvent(keyboardEvent);
		if (lab=='Category'||lab=='Grade Term') {doExtraCheck = true};
	    }},
	function () { // completion checker :)
	    if (timer) {
		// if we're using a timer...
		elapsed = new Date().getTime() - timer
		if (elapsed > waitTime) {
		    log('After I waited %s, moving on',waitTime);
		    return true
		}
		else {
		    return false
		}
	    }
	    if (valueWidgets.length > 1 && doExtraCheck) {
		newVals = valueWidgets.map(function () {return this.value}).slice(1)
		if (newVals.toArray().toString()!=origVals.toArray().toString()) {
		    log('Updated %s to %s!',origVals.toArray().toString(),newVals.toArray().toString())
		    timer = new Date().getTime()
		    waitTime = 500;
		}
		else {
		    timer = new Date().getTime();
		    waitTime = 2000; // extra time if we had an issue... 2 seconds max
		    return false
		}
	    }
	    else {
		return true // if there's only one widget, assume things are simple :)
	    }
	});
}

function spawnWaiter (url, onComplete) {
    // Wait for a URL to be complete
    function waiter () {
	chrome.runtime.sendMessage(
	    {mode:'wait',
	     waitlist:[{'url':url}]},
	    function (r) {
		if (r) {onComplete()}
		else {setTimeout(waiter,DELAY)}
	    }
	);
    }
    waiter()
}


function setTable (data) {
    actions = []
    for (var cat in data) {
	log('cat',cat,':',data[cat])
	actions.push(getValueSetter(cat,data[cat]));
    }
    actions.push(DelayedAction(doSave,function () {return true}));
    loopThroughActions(actions);
}

function testTable () {
    setTable(
	{'Category':'WH',
	 'GB column name':'Col Test 2',
	 'Assignment name':'Assign test 2',
	 'Total points':47,
	 'Date due':'2/14/2017',
	 'Date assigned':'2/1/2017',
	 'Grade Scale':'Current High School Grading Scale',
	});
    //$('#saveButton').click()
}

function doSave () {
    log('do save!');
    $('#saveButton').click()
}

function doSaveAndNew () {
    log('Save and New!');
    $('#saveAndNewButton').click()
}


function getCurrentClass () {
    var txt = $('#bodytop').text();
    if (txt.search('::')>-1) {
	txt = txt.split('::')[1]
    }
    return txt.trim();
}

function getCurrentClassFromKeys (obj) {
    var curClass = getCurrentClass()
    for (var classname in obj) {
	if (curClass.search(classname)>-1) {
	    log('At our current class');
	    return classname;
	}
    }
}

function setGrademodeAll (after) {
    var sel = $('select[name="columnFieldSetOid"]')
    var el = sel[0]
    if (!el) {
	log("weird - no grade mode yet...");
	log("sleeping 2...");
	//await sleep(2)
	log("try again");
	setTimeout(function () {setGrademodeAll(after),200})
    }
    else {
	var option = sel.children()[0]
	option.dispatchEvent(new MouseEvent("click")) // this actually triggers aspen's js
	el.dispatchEvent(new MouseEvent("click")) // for good measure
	el.selectedIndex = 0; // so the UI is in concert w/ reality
	log('Set grademode!');
	// Let's try triggering a change event manually...
	var evt = document.createEvent("HTMLEvents");
	evt.initEvent("change", true, true);
	el.dispatchEvent(evt);
    }
    log('Run next thing...');
    after()
}

function testTableSet () {
    setValue('Category','WH');
    setValue('GB column name','GB Col Name');
    setValue('Assignment name','Test Assignment');
    setValue('Total points','42');
    $('#saveButton').click()
}

function getAssignmentsFromGradebook () {
    topLevelTable = $('#gradeInputTable');
    // The X2 "table" consists of 4 tables...
    leftSideHeader = $('#div1 > table > tbody > tr')
    rightSideHeader = $('#div2 > table > tbody > tr')
    leftSideBottom = $('#div3 > table > tbody > tr')
    rightSideBottom = $('#div4 > table > tbody > tr')
    rows = []
    function pushToRows (selector) {
	selector.each(
	    function (i,tr) {
		cells = []
		$(tr).children('td').each(
		    function (i,td) {
			cells.push(td)
		    }
		)
		rows.push(cells)
	    })
    }
    function appendToRows (selector, offset) {
	if (!offset) {offset = 0}
	selector.each(
	    function (i,tr) {
		cells = rows[offset];
		if (! cells) {
		    log('Error at offset % tacking on %s (selector %s)',offset,tr,selector);
		}
		else {
		    offset += 1;
		    $(tr).children('td').each(
			function (i,td) {
			    cells.push(td)
			});
		}
	    });
    }
    pushToRows(leftSideHeader);
    //log('rows at this point: %s',rows.toString())
    appendToRows(rightSideHeader);
    //log('rows at this point: %s',rows.toString())
    headerLength = rows.length;
    //log('rows at this point: %s',rows.toString())
    pushToRows(leftSideBottom);
    //log('rows at this point: %s',rows.toString())
    appendToRows(rightSideBottom,headerLength);
    //log('rows at this point: %s',rows.toString())
    globals = {'leftSideBottom':leftSideBottom,rightSideBottom:rightSideBottom,
	       leftSideHeader:leftSideHeader, rightSideHeader:rightSideHeader}
    return rows
}

function TableObject (data) {
    var obj = {
	colHeaders : [],
	rowHeaders : [],

	getData : function () { return data},

	getRow : function (rh) {
	    self = obj;
	    var idx = self.rowHeaders.indexOf(rh);
	    if (idx == -1) {throw 'Not found :('}
	    return data[idx]
	},

	getCol : function (ch) {
	    self = obj;
	    var idx = self.colHeaders.indexOf(ch);
	    if (idx==-1) {throw 'not found'}
	    col = []
	    return data.map(function (row) {col.push(row[idx])});
	    return col;
	},

	getCell : function (rh, ch) {
	    self = obj;
	    colIndex = this.colHeaders.indexOf(ch);
	    rowIndex = this.rowHeaders.indexOf(rh);
	    if (colIndex == -1) {throw 'No column '+ch}
	    if (rowIndex == -1) {throw 'No row '+rh}
	    //data[rowIndex][colIndex].innerHTML = val;
	    curcell = data[rowIndex][colIndex]
	    return curcell
	},

	setCellDelayed : function (rh, ch, val, commentContent) {
	    self = obj;
	    // We return a delayed action object -- much code repeated
	    // from setCell - sorry world -- the logic is just
	    // different enough to make abstraction awkward
	    try {
		var curcell = self.getCell(rh,ch);
	    }
	    catch (err) {
		log('Got error: %s (self=%s)',err,self);
		log('Unable to locate cell %s, %s',rh,ch);
		var da = GenericDelayedAction(showError)
		function showError () {
		    log('We had an error - now we show it')
		    log('Unable to locate cell %s, %s',rh,ch);
		    self.showError && self.showError(
			'Unable to locate cell '+rh+','+ch
		    );
		    da.finishAction();
		}
		return da;
	    }
	    var delayedAction = GenericDelayedAction(setCellInitially)
	    function setCellInitially () {
		//$(curcell).click() // Click the cell - jquery click works here
		curcell.dispatchEvent(new MouseEvent("click")); // For good measure :)
		var input = $(curcell).find('input')[0];
		$(input).val(val);
		if (! commentContent) {
		    delayedAction.finishAction()
		}
		else {
		    // Set comment
		    // click input in cell so comment icon shows up...
		    if (input) {input.dispatchEvent(new MouseEvent("click"))}; 
		    var imgLink = $(curcell).find('img')
		    var onclick = imgLink[0].getAttribute('onclick');
		    var re = /.*doPopup\(['"]([^\),'"]*)/;
		    var onclickUrl = re.exec(onclick)[1]
		    onclickUrl = onclickUrl.trim();
		    log('Onclick URL=%s',onclickUrl);
		    const context = 'comment'
		    chrome.runtime.sendMessage(
			{mode:'register',
			 url:onclickUrl,
			 action:{'main':commentContent,'private':commentContent,'name':'comment'}
			},
			function () { // callback for registering comment
			    $(curcell).find('img').click();
			});
		    // Now we need to check on when it's done :)
		    // spawnWaiter kicks it to the backend to see when this is done...
		    spawnWaiter(onclickUrl,function () {
			log('Sleep before we finish -- 3s');
			// Use delayed action to set up a listener to only continue after the
			// image icon has updated :(
			loopThroughActions(
			    [DelayedAction(
				function () {},
				function () { // check for completion...
				    log('Checking image icon...');
				    return $(curcell)
					.find('img')
					.attr('src')
					.indexOf('commented') > -1;
				}),
			     DelayedAction(
				 function () {
				     setTimeout(delayedAction.finishAction,100);
				 },
				 function () { true }
			     )
			    ]); // end loop
		    }) // end waiter
		} // end else (set comment)
	    }
	    return delayedAction
	},

	setCell : function (rh, ch, val, commentContent) {
	    self = obj;
	    var curcell = self.getCell(rh,ch);
	    $(curcell).click()
	    $(curcell).find('input').val(val);
	    var input = $(curcell).find('input')[0];
	    if (input) {input.dispatchEvent(new MouseEvent("click"));}
	    else {log('No input found for %s',curcell)}
	    if (commentContent) {
		log('Got commentContent %s, clicking',commentContent);
		var imgLink = $(curcell).find('img')
		var onclick = imgLink[0].getAttribute('onclick');
		var re = /.*doPopup\(['"]([^\),'"]*)/;
		var onclickUrl = re.exec(onclick)[1]
		onclickUrl = onclickUrl.trim();
		log('Onclick URL=%s',onclickUrl);
		const context = 'comment'
		chrome.runtime.sendMessage(
		    {'mode':'register',
		      'url':onclickUrl,
		      'action':{'main':commentContent,'private':commentContent,'name':'comment'}
		    },
		    function () { // callback for registering comment
			$(curcell).find('img').click();
		    });
	    } // end if comment
	    else {
		log('No comment');
	    }
	}
    }
    
    for (var cell of data[0]) {
	textContent = cell.textContent.trim();
	if (textContent.indexOf('\n') > -1) { // if there's newlines...
	    // Try to clean this up...
	    log('Try to clean this baby up: has newlines');
	    if ($(cell).find('a').length) {
		links = $(cell).find('a')
		if (links[0].textContent != '...') {
		    textContent = links[0].textContent.trim()
		}
	    }
	}
	log('Setting colHeader to: "%s"',textContent);
	obj.colHeaders.push(textContent);
    }
    for (var row of data) {
	obj.rowHeaders.push(row[0].textContent.trim());
    }
    log('Returning object: ',obj);
    return obj
}

function printAssignments () {
    printArray(getAssignmentsFromGradebook())
}

function getAssignmentData () {
    return TableObject(getAssignmentsFromGradebook())
}

function printArray (data) {
    output = ''

    for (var row of data) {
	cellstr = '';
	for (var cell of row) {
	    cellstr+=cell.textContent.trim()+'\t';
	}
	output = output + cellstr + '\n'
    }
    log('printArray:\n'+output)
}


function commentAction (comment) {
    var textUrl = $('#scTextComment').attr('src');
    //var privateUrl = $('#scPrivateTextComment').attr('src');
    $('#scPrivateTextComment').remove();
    var done = false
    // Now we have to fire off a bunch of actions...
    // Step 1. register our actions...
    log('commentAction %s',comment);
    if (comment) {
	chrome.runtime.sendMessage(
	    {mode:'register',
	     url:textUrl,
	     action:{
		 name:'writeText',
		 text:comment
	     },
	    },
	    // Once registered, we start polling for it to be done...
	    function () {
		// Now that it's done... let's poll
		// Create a separate function so we can call ourselves recursively
		// to keep checking
		spawnWaiter(textUrl,
			    function () {
				log('Sleep before saving...');
				//setTimeout(function () {
				$('#scTextComment').click()
				$('#scTextComment')[0].dispatchEvent(new MouseEvent("click"));
				$('#saveButton').click();
				log('Clicked save!')
				$('#saveButton')[0].dispatchEvent(new MouseEvent("click"));
				done = true;//}, 1);
			    });
	    }) // done registering
    }

    o = {
	isDone : function () {return done}
    }
    return o;
}


function writeText (t) {
    $('body')[0].dispatchEvent(new MouseEvent("click"));
    $('body')[0].innerHTML = t;
    $('body')[0].dispatchEvent(new MouseEvent("click"));
}

//
// Form filling out functions...
//

function clickOptionsAction (actionName) {
    $('.menuOption:contains("'+actionName+'")').click()
}

function addAssignmentsFromAssignmentsTab (assignmentsData, after) {
    var firstOne = true;//}
    for (const assignment of assignmentsData) {
	// we register all the actions :)
	chrome.runtime.sendMessage({
	    'mode':'register',
	    'url':firstOne ? 'addRecord.do' : 'assignmentDetail.do',
	    'action':{'name':'createAssignment',
		      'assignment':assignment}
	})
	firstOne = false;
    }
    if (after) {
	chrome.runtime.sendMessage({
	    'mode':'register',
	    'url':'assignmentDetail.do',
	    'action':after
	});
    }
    clickOptionsAction('Add Assignment'); // and then we click Add :)
}

function fillOutStandard () {
    
}

function fillOutReportingStandard (std) {
    // Register action...
    actions = []
    var delay
    actions.push(getValueSetter('Name',std.name));
    actions.push(getValueSetter('Column header',std.header));
    actions.push(getValueSetter('Name',std.rubric ? std.rubric : 'Digital Portfolio Scale',1));
    actions.push(DelayedAction(function () {delay = new Date().getTime()}, function () {return (new Date().getTime()-delay)>1000}));
    actions.push(DelayedAction(doSave, function () {return true}));
    loopThroughActions(actions);
}



function getFillOutAssignmentActions (data) {
    actionList = []
    //actionList.push(DelayedTimerAction(function () {clickOptionsAction('Add')},500));
    for (var label in data) {
	if (data[label]) {
	    actionList.push(getValueSetter(label,data[label]))
	}
    }
    actionList.push(
	DelayedTimerAction(doSaveAndNew,500)
    );
    return actionList
}


function testFillOutAssignment () {
    actions = getFillOutAssignmentActions(	    {		'Category':'WH','GB column name':'Test GB','Assignment name':'Test-1','Date assigned':'2/15/2017','Date due':'2/17/2017','Total points':8,'Extra credit points':1,'Grade Scale':'Current High School Grade Scale','Grade Term':'S2'});
    loopThroughActions(actions)
}

function testAddAssignments () {
    addAssignmentsFromAssignmentsTab(
	[
	    {		'Category':'WH','GB column name':'Test GB','Assignment name':'Test-1','Date assigned':'2/15/2017','Date due':'2/17/2017','Total points':8,'Extra credit points':1,'Grade Scale':'Current High School Grade Scale','Grade Term':'S2'},
	    {		'Category':'WH','GB column name':'Test GB-2','Assignment name':'Test-2','Date assigned':'2/15/2017','Date due':'2/17/2017','Total points':10,'Extra credit points':1,'Grade Scale':'Current High School Grade Scale','Grade Term':'S2'},
	    {		'Category':'WH','GB column name':'Test GB-3','Assignment name':'Test-3','Date assigned':'2/15/2017','Date due':'2/17/2017','Total points':12,'Extra credit points':1,'Grade Scale':'Current High School Grade Scale','Grade Term':'S2'},
	]
    );
}

// Navigation functions for X2...
function topTabAction (tabName) {
    var $el = $("#header a:contains('"+tabName+"')")
    var href = $el.attr('href');
    clickTab = function () {$el[0].dispatchEvent(new MouseEvent('click'));}
    return {'url':href, 'click':clickTab}
}

function sideTab (tabName) {
    var $el = $(".verticalTab a:contains('"+tabName+"')")
    if ($el) {
	$el[0].dispatchEvent(new MouseEvent('click'));
    }
    else {
	$el = $(".verticalTabLabel a:contains('"+tabName+"')");
	$el[0].dispatchEvent(new MouseEvent('click'));
    }
}

function getNavigationActions (topTab, sideTab) {
    var start = new Date;
    var tabDelay = 500
    function delayChecker () { // checker
	var d = new Date
	if ((d.getTime()-start.getTime()) > tabDelay) {
	    start = d
	    return true;
	}
    } // end checker
    actions = [
	DelayedAction(topTab(topTab),delayChecker),
	DelayedAction(sideTab(sideTab),delayChecker)
    ]
}


function testMessaging () {
    log('Test grabbing test actions!');
    chrome.runtime.sendMessage({mode:'register',
				url:document.URL,
				action:'TEST # 1'})
    setTimeout(
	function () {
	    chrome.runtime.sendMessage({mode:'register',
					url:document.URL,
					action:'TEST # other after a sec'})
	}, 1000)
    
    
    // chrome.runtime.sendMessage({'mode':'get','context':'test'},
    // 			       function (a) {
    // 				   log('Called get, got back data: %s',JSON.stringify(a));
    // 			       })
    // log('Test grabbing test actions! x2');
    // chrome.runtime.sendMessage({'mode':'get','context':'test'},
    // 			       function (a) {
    // 				   log('2 Called get, got back data: %s',JSON.stringify(a));
    // 			       })
    
    // var actions = [{'do':'Add Table','data': {foo:1,bar:2,baz:3}},
    // 		   {'do':'Add Table','data': {foo:4,bar:5,baz:7}},
    // 		   {'do':'Add Table','data': {foo:10,bar:8,baz:9}}]
    // function registerAnAction (action) {
    // 	log('registerAnAction %s',action);
    // 	chrome.runtime.sendMessage({mode: "register",'action':action, context:'a'},
    // 				   function(i) {
    // 				       log('Registered as action #%s',i);
    // 				       chrome.runtime.sendMessage(
    // 					   {mode:'get',context:'a'},
    // 					   function (action) {
    // 					       log('Doing action: %s',action);
    // 					       chrome.runtime.sendMessage({
    // 						   'mode':'complete',
    // 						   action:action,
    // 						   context:'a'})
    // 					       log('Done completing action %s',action);
    // 					   }) // end get action...
    // 				   }) // end register action
    // } // end registerAnAction
    // for (var a of actions ) {registerAnAction(a)}
}

/* Our own user interface which gets added to X2 URLs as follows...
*/
function UserInterface () {

    var self = {}

    // URL MAPPING

    self.urls = [
	[/.*/, function () {
	    // branding
	    showBrand = Button('Aspen Automator', function () {
		myBrand = $(`<div>
             <h2>Aspen Automator</h2>
             <p>Your Aspen Experience is enhanced by Aspen Automator.</p>
             <p>The <button class="aa-button">Buttons</button> that look like this come from this add-on.</p>
             <p>This plugin allows importing CSVs into gradebooks and other long-term wish-list items of mine.</p>
             <p>It relies on automating the Aspen UI, so it will break when they update and YMMV.</p></div>
             `)
		myBrand.append(
		    Button('Toggle Custom Style', function () {
			$('body').toggleClass('aa-custom-style');
                        prefs.set('customStyle',$('body').hasClass('aa-custom-style'));
		    }));
		var $popup = makePopup()
		$popup.body.append(myBrand);
	    });
	    $('.applicationTitle').append(showBrand);
	    $('.applicationTitle').closest('table').css({'width':'650px'});
	}],
	[/.*/, function () {
	    b1 = Button('⟳',function () {
		chrome.runtime.sendMessage({
		    mode:'reset',
		    url:document.URL,
		});
	    });
	    b2 = Button('▶▶',function () { // skip action unicode
		chrome.runtime.sendMessage({
		    mode:'skip',
		    url:document.URL
		})
	    }); // end button 2

            var $appTitle = $('.applicationTitle')
            $appTitle.append(b1);
            $appTitle.append(b2);
            $appTitle.closest('table').css({'width':'750px'});
            /*
	    $td = $('<td style="min-width:84px">')
	    $td.append(b1);
            $td.append('&nbsp;');
            $td.append(b2);
	    $('#contextMenu').parent().before($td);*/
	}],
	// TEST CODE
	//[/.*/, function () {
	/*    b3 = Button('Test CSV',function () {
                var $popup = makePopup();
                var dh = csvDataHandler(
                    ['Category','GB column name'],
                    'Test Test',
                    function (csvData,doMap) {
                        console.log('got data: %s',JSON.stringify(csvData));
                        console.log('Row 1 Category: ',doMap(csvData[0],'Category'));
                        console.log('Row 1 GB: ',doMap(csvData[0],'GB column name'));
                    }
                );
                $popup.buttonbar.append(dh.$buttonArea);
                $popup.body.append(dh.$ui);
                dh.handleData(
                    'header1,header2,header3\n23,24,52\n123,123,123\n431,412,412\n29,951,124\naer,oiuwer,sldkfj'
                );
	    })
	    // b4 = Button('Test Class Switch', function () {
	    //     switchClass('Science 303-001','scores')
	    // });
	    
	    $td = $('<td>')
	    $td.append(b3);
	    $('#contextMenu').parent().before($td)
	    // $td = $('<td>')
	    // $td.append(b4);
	    // $('#contextMenu').parent().before($td)

	}],
        */
	// REMOVE TEST CODE SOON
	[/assignmentList.do/,function () {
	    handleFiles = function (files) {
	    };

	    addToOptionBar(
		Button('Import Assignments for Multiple Classes', function () {
		    log('Add multi-assignments');
		    $popup = makePopup();
	            $input = $('<input type="file" id="csvFileInput" accept=".csv">');
		    $input.change(function () {handleFiles(this.files)});
		    var fields = assignmentFields;
		    var handler = csvFileHandler(
			$input,
			fields,
			'Import Assignments',
			function (csvObj,doMap) {
			    log('Got data!')
			    csvObj = csvObj
			    doMap = doMap
			    var assignments = [] 
			    for (var csvrow of csvObj) {
				var assignment = {}
				for (var f of fields) {
				    val = doMap(csvrow,f)
				    if (val) {
					assignment[f] = val;
				    }
				    else {
					log('No value for %s',f);
				    }
				}
				assignments.push(assignment);
			    }
			    log('Pushing assignments: %s',assignments);
			    var byClass = {}
			    assignments.forEach((a)=>{
				if (!byClass[a['Course Code']]) {
				    byClass[a['Course Code']] = []
				}
				byClass[a['Course Code']].push(a);
			    }
			                       );
			    chrome.runtime.sendMessage({
				mode:'register',
				url:'gradebook.classes.list.gcd',
				action : {
				    name : 'multiAssignments',
				    data : byClass,
				}
			    });
			    log('Registered!');
			    // We used to do this here -- we will get rid of this and move it to poller...
			    // for (var c in byClass) {
			    // 	log('Register switch to %s',c);
			    // 	chrome.runtime.sendMessage({
			    // 	    mode:'register',
			    // 	    url:'aspen/assignmentDetail.do',
			    // 	    action: {
			    // 		name:'switchClass',
			    // 		classname:c,
			    // 		next:'assignments'
			    // 	    }
			    // 	});
			    // 	log('Register add assignments for %s assignments',byClass[c].length);
			    // 	chrome.runtime.sendMessage({
			    // 	    mode:'register',
			    // 	    url:'gradebook.classes.list.gcd',
			    // 	    action:{
			    // 		name:'createAssignments',
			    // 		data:byClass[c],
			    // 	    }
			    // 	});
			    // }
			    sideTab('Assignments').click(); // click
			}
		    );
		    $popup.buttonbar.prepend($input);
		    $popup.buttonbar.append(handler.$buttonArea);
		    $popup.body.append(
			handler.$ui
		    );
		})
	    );



	}
	 
	], // end multi-assignment


	[/assignmentList.do/,function () {
	    addToOptionBar(
		Button('Import Assignments', function () {
		    log('Add Assignment');
		    $popup = makePopup();
	            $input = $('<input type="file" id="csvFileInput" accept=".csv">');
		    var fields = assignmentFields;
		    var handler = csvFileHandler(
			$input,
			fields,
			'Import Assignments',
                        importAssignmentsFromCsvCallback
		    );
		    $popup.buttonbar.prepend($input);
		    $popup.buttonbar.append(handler.$buttonArea);
		    $popup.body.append(
			handler.$ui
		    );
		}
		      )
	    );
	}],

        // Google Classroom Assignment Import
        [/assignmentList.do/,function () {
            console.log('Setup classroom button');
            addToOptionBar(
                Button('Import Google Classroom Assignments', ()=>{
                    var gcp = GoogleClassroomPicker( // GLOBAL FOR DEBUGGING
                        'Import Google Classroom Assignments',
                        (assignments)=>{
                            console.log('GOT ASSIGNMENTS!');
                            assgns = assignments
                            console.log('in global: assgns');
                            console.log(assgns);
                            assignments.forEach((a)=>{
                                a.Category = 'WH';
                                a['GB column name'] = a.aspenShort;
                                a['Assignment name'] = a.aspenLong;
                                a['Date assigned'] = dateToAspenDate(new Date(a.creationTime));
                                a['Date due'] = a.dueDate.month+'/'+a.dueDate.day+'/'+a.dueDate.year;
                                a['Total points'] = a.maxPoints;
                                a['Extra credit points'] = 0;
                                a['Grade Scale'] = 'Current High School Grade Scale';
                                a['Grade Term'] = 'S2';
                            });
                            console.log('Now let\'s import them!')
                            addAssignmentsFromAssignmentsTab(assignments);
                        }
                    );
                }
                      )
            );
            // function () {
            //         var $popup = makePopup();
            //         var courseId = 16239843774; // fixme - hardcoded
            //         $popup.body.append(
            //             $('<p>Assuming this is Web Design: hardcoded for now -- sorry</p>')
            //         );
            //         $popup.buttonbar.append(
            //             Button('Import!', function () {
            //                 console.log('Clicked classroom import!');
            //                 $loader = $popup.body.append('Loading assignment data...');
            //                 chrome.runtime.sendMessage(
            //                     {
            //                         mode:'classroom',
            //                         method:'listGradedAssignments',
            //                         params:{id:courseId}
            //                     },
            //                     function handleResponse (data) {
            //                         if (data) {
            //                             console.log('Got back data: %s',JSON.stringify(data))
            //                             //$popup.body.remove($loader);
            //                             $popup.body.append($('<p>GOT DATA</p>'));
            //                             $popup.body.append(
            //                                 $('<pre>'+JSON.stringify(data)+'<pre>')
            //                             );
            //                         }
            //                         else {
            //                             console.log('Weird, still no data?');
            //                         }
            //                     }
            //                 ) // end send message
            //             }) // end button
            //         ); // end append to button bar
            //     }) // end import classroom button
            // ); // end addToOptionBar
        }], // end classroom assignment import


        // Grade Imports
	
        [/staffGradeInputContainer.do/, function () {
            addToOptionBar(
                Button('Import Google Classroom Grades', ()=>{
                    gcp = GoogleClassroomPicker(
                        'Import Google Classroom Grades',
                        (assignments)=>{

                            function getName (name) {
                                if (mytable.colHeaders.indexOf(name)>-1) {
                                    return name
                                }
                                var matcher = new RegExp(name,'i')
                                for (var i=0; i<mytable.rowHeaders.length; i++) {
                                    if (matcher.exec(mytable.rowHeaders[i])) {
                                        return mytable.rowHeaders[i]
                                    }
                                }
                            }

                            function getAssignment (encId) {
                                var results = mytable.colHeaders.filter((h)=>h.indexOf(encId)==0)
                                if (results.length > 1) {
                                    console.log('WARNING: MORE THAN ONE ASSIGNMENT WITH SAME ID AAAAAAAAACCCCCK');
                                    console.log(results)
                                    console.log('Matching ID: %s',encId);
                                }
                                if (results) {return results[0]}
                            }

                            // Now let's do the actual import....
                            mytable = TableObject(getAssignmentsFromGradebook()); // global
                            var actions = assignments.map(
                                (a)=>mytable.setCellDelayed(
                                    getName(a.name), // row
                                    getAssignment(a.encId),//column
                                    a.grade// val
                                    //comment - no need
                                )
                            );
                            glactions = actions // global!
                            console.log('Not working: here are some globals - mytable, asss, glactions');
                            loopThroughActions(actions);

                            
                        },
                        {getGrades:true}
                    ); // end picker
                }) // end Button
            ); // end addToOptionBar
        } // end classroom gradebook import
        ],


	[/staffGradeInputContainer.do/,function () {
	    addToOptionBar(
		Button('CSV (Many Classes)',function () {
		    log('Show import multi-grades UI');
		    var $popup = makePopup();
	            var $input = $('<input type="file" id="csvFileInput" accept=".csv">');
		    var handler = csvFileHandler(
			$input, // the element,
			gradebookFields, //['Class','Student Name','Assignment Name','Grade','Comment'], // the fields
			'Import Grades', // the action name,
                        //importGradesFromCsvCallback
			function (csvObj, doMap) { // the callback
			    log('Got CSV Data: ',csvObj);
			    var mytable = TableObject(getAssignmentsFromGradebook());
			    mytable.showError = function (e) {
				$popin.body.append($('<br><strong>'+'ERROR: '+e+'</strong>'));
				if (! $popin.out) {$popin.doToggle()}
			    }
			    var actions = []
			    var $popin = makePopin();
			    $('body').append($popin);
			    $popin.body.append('<h3>Importing</h3>');
			    var $ul = $('<ul></ul>');
			    $popin.body.append($ul);
			    var gradesByClass = {}
			    for (var csvrow of csvObj) {
				var classname = doMap(csvrow,'Class'); // grab class
				if (!gradesByClass[classname]) {
				    gradesByClass[classname] = []
				}
				gradesByClass[classname].push(
				    [doMap(csvrow,'Student Name'),
				     doMap(csvrow,'Assignment Name'),
				     doMap(csvrow,'Grade'),
				     doMap(csvrow,'Comment')]
				    // arguments to setCellDelayed...
				)
			    }
			    // Now we have the items we need...
			    chrome.runtime.sendMessage({
				mode:'register',
				url:'staffGradeInputContainer.do?navkey=gradebook.classes.list.input',
				action: {name:'multiClass',
					 data:gradesByClass}
			    });
			    $ul.append(
				$('<li>'+'Sent multiclass data'+'</li>')
			    );
			    $ul.append(
				$('<pre>'+gradesByClass+'</pre>')
			    );
			    log('Here we go! MULTICLASS:'+gradesByClass);
			    log('Remove popup?');
			    $popup.remove();
			}); // end handler creation :)
		    $popup.buttonbar.prepend($input);
		    $popup.buttonbar.append(handler.$buttonArea);
		    $popup.body.append(handler.$ui);
		    $popup.body.append(
			$('<p>Select a CSV file to import grades from.</p>')
		    );
		})
	    );
	}],

	[/staffGradeInputContainer.do/,function () {
	    addToOptionBar(
		Button('Import Assignment Grades',function () {
		    log('Show import grades UI');
		    var $popup = makePopup();
	            var $input = $('<input type="file" id="csvFileInput" accept=".csv">');
		    var handler = csvFileHandler(
			$input, // the element,
			['Student Name','Assignment Name','Grade','Comment'], // the fields
			'Import Grades', // the action name,
                        importGradesFromCsvCallback);
		    $popup.buttonbar.prepend($input);
		    $popup.buttonbar.append(handler.$buttonArea);
		    $popup.body.append(handler.$ui);
		    $popup.body.append(
			$('<p>Select a CSV file to import grades from.</p>')
		    );
		})
	    );
	}]
    ] // end urls...

    // Here are some generics...
    // For handling imports...
    function importGradesFromCsvCallback (csvObj, doMap) { // the callback
	log('Got CSV Data: ',csvObj);
	mytable = TableObject(getAssignmentsFromGradebook());
	mytable.showError = function (e) {
	    $popin.body.append($('<br><strong>'+'ERROR: '+e+'</strong>'));
	    if (! $popin.out) {$popin.doToggle()}
	}
	actions = []
	$popin = makePopin();
	$('body').append($popin);
	$popin.body.append('<h3>Importing</h3>');
	$ul = $('<ul></ul>');
	$popin.body.append($ul);
	for (var csvrow of csvObj) {
	    //log('Appending to ul %s on %s',$ul,$popup);
	    $ul.append(
		$('<li>'+doMap(csvrow,'Student Name')+' '+doMap(csvrow,'Assignment Name')+'</li>')
	    );
	    actions.push(
		mytable.setCellDelayed(
		    doMap(csvrow,'Student Name'),
		    doMap(csvrow,'Assignment Name'),
		    doMap(csvrow,'Grade'),
		    doMap(csvrow,'Comment')
		)
	    );
	}
	$popin.hide();
	log('Here we go!');
	loopThroughActions(actions);
    }

    function importAssignmentsFromCsvCallback (csvObj, doMap) {
	var assignments = []
	for (var csvrow of csvObj) {
	    var assignment = {}
	    for (var f of assignmentFields) {
		val = doMap(csvrow,f)
		if (val) {
		    assignment[f] = val;
		}
		else {
		    log('No value for %s',f);
		}
	    }
	    assignments.push(assignment);
	}
	log('Pushing assignments: %s',assignments);
	addAssignmentsFromAssignmentsTab(assignments);
    }


    function csvDataHandler (mapfields, actionLabel, actionCallback) {
        // Return an interface that can handle files or handle data.
        // create a CSV mapper, then present
	// button with actionLabel which results in actionCallback being called
	// with two arguments:
	// actionCallback(csvDataAsArrayofObjects, MapperFunctionToGoFromMapfieldToCSVField)
	// the mapper function takes the form...
	// doMap(CSVROW,FIELDNAME) -> VALUE
        console.log('csvDataHandler got args:  %s %s %s',mapfields,actionLabel,actionCallback);
	var obj = {}
	obj.$ui = $('<div>');
	obj.$buttonArea = $('<span>');
	var mapper;
        
        function handleEvent (d) {
	    var input = e.target.result;
            handleData(input);
        }

        function handleCsv (csvObj) {
	    log('Got CSV OBJ %s!',csvObj);
	    var fields = [];
	    for (var field in csvObj[0]) {fields.push(field)};
	    mapper = makeCSVMapper(mapfields,fields) 
	    obj.$ui.append(mapper.$div);
	    obj.$buttonArea.append(Button(
		actionLabel,
		function () {
		    var doMap = mapper.getMapper();
		    actionCallback(csvObj,doMap);
		}));
	    mapper.finishUI();
	    log('Finish UI!');
        }

	function handleData (input) {
	    csvObj = $.csv.toObjects(input);
            return handleCsv(csvObj);
	}

	function handleFiles (files) {
	    log('got files: %s',files);
	    var file = files[0]
	    var reader = new FileReader();
	    reader.onload = handleEvent;
	    reader.readAsText(file);
	}
        
        obj.handleFiles = handleFiles;
        obj.handleData = handleData;
        obj.handleCsv = handleCsv;

        console.log('Creating data handler: %s',obj);
        globobj = obj;
        console.log('debugging object: globobj');
        return obj;
        
    }

    
    function csvFileHandler ($input, mapfields, actionLabel, actionCallback) {
	// When file is uploaded to input, create a CSV mapper, then present
	// button with actionLabel which results in actionCallback being called
	// with two arguments:
	// actionCallback(csvDataAsArrayofObjects, MapperFunctionToGoFromMapfieldToCSVField)
	// the mapper function takes the form...
	// doMap(CSVROW,FIELDNAME) -> VALUE
	var obj = csvDataHandler(mapfields, actionLabel, actionCallback);
	$input.change(function () {obj.handleFiles(this.files)});
	obj.$input = $input;
        console.log("CREATED FILE HANDLER %s",obj);
	return obj
    }


    function makeCSVMapper (labels, valueOptions) {
        console.log('Make mapper %s %s',labels,valueOptions);
	var mid = 'aa-select-'+mid_increment
	mid_increment += 1;

	var Mapper = {
	    getData : function () {
		var data = {}
		self.$div.find('.fieldSelector').each(
		    function (idx,fs) {
			var name = $(fs).attr('value')
			data[name] = $($(fs)
				       .find('select')[0]
				       .selectedOptions[0]).attr('value')
			if (data[name]=='::other') {
			    // in this case, grab the value of the input...
			    data[name] = '::'+$(fs).find('input.aaother').val();
			}
		    }); // end each field selector...
		return data;
	    },
	    
	    getMapper : function () {
		var map = this.getData();
		function mapRow (row, name) {
		    var mapped = map[name]
		    if (mapped.indexOf('::')==0) {
			return mapped.substr(2)
		    }
		    else {
			return row[map[name]]
		    }
		}
		return mapRow
	    },
	    
	    buildUI : function () {
		self = this;
		self.$div = $('<div class="aa-mapper" id="'+mid+'">');
		self.$select = $('<select class="aa-field-select"><option value="">-</option></select>');
		log('Got select: %s',self.$select);
		valueOptions.forEach(function (f) {self.$select.append('<option value="'+f+'">'+f+'</option>')});
		$other = $('<option value="::other">::Other</option>');			    
		self.$select.append($other);
		for (var header of labels) {
		    $fieldSelector = $('<div class="fieldSelector" value="'+header+'">'+header+' :</div>')
		    self.$div.append($fieldSelector)
		}
		
	    },

	    finishUI : function () { // must be called after we're attached to DOM
		self = this;
		$('#'+mid+' .fieldSelector').append(self.$select);
		$('#'+mid+' .fieldSelector').append($('<input class="aaother" type="text">').hide());
		$('#'+mid+' .fieldSelector select').change(function () {
		    log('Changed value!');
		    if (this.value=='::other') {
			log('show other');
			$(this).next('input.aaother').show()
		    }
		}); // end change
		$('#'+mid+' .fieldSelector').each(function (idx, fs) {
		    var header = $(fs).attr('value');
		    $(fs).find('option').each(
			function (idx, o) {
			    var v = $(o).val()
			    //log("Check %s against %s",header,v);
			    if (header && v) {
				if (v.indexOf(header)>-1||header.indexOf(v)>-1) {
				    fs.selected = v;
				    log('We better select this baby!');
				    select = $(fs).children('select')[0];
				    select.value = v; select.selected = v;
				    log('Set value to: %s',v);
				    log('Set selected to %s',v)
				}
			    }
			});
		}) // end setting values.
		return self.$div
	    },
	}
	try {
	    Mapper.buildUI()
	}
	catch (e) {
	    log('Error: %s',e);
	}
	return Mapper
    }


    function makePopin () {
	var $popin = $('<div class="aa-popin"></div>');
	$button = $('<span class="aa-slideButton">&gt;</span>');
	$popin.append($button);
	//$popin.append($('<ul><li>Here</li><li>Is a test</li><li>Of the pop-in</li></ul>'));
	$popin.body = $('<div class="aa-popinbody"></div>')
	$popin.append($popin.body);
	$popin.out = true
	$popin.doToggle = function () {
	    if ($popin.out) {
		$popin.animate({'right':'-220px'})
	    }
	    else {
		$popin.animate({'right':'0px'})
	    }
	    $popin.out = ! $popin.out;
	}
	$button.click($popin.doToggle)
	$popin.css({'right':'-100px'})
	return $popin;
    }

    function makePopup () {
	var $popup = $('<div class="aa-popup"><div class="aa-buttonbar"></div></div>');
	$body = $('<div class="aa-body"></div>');
	$buttonbar = $('<div class="aa-buttonbar"></div>');
	$close = Button('Close',function () {$popup.hide()});
	$buttonbar.append($close);
	$popup.append($body);
	$popup.append($buttonbar);
	$popup.body = $body;
	$popup.buttonbar = $buttonbar;
	$('body').append($popup);
	return $popup
    }


    function addToOptionBar (el) {
	var shown = false
	function doAdd (el) {
	    var $optionCells = $('.optionsBar > tbody > tr > td')
	    var $buttonCell = $($optionCells[$optionCells.length-2])
            $spacer = $('<td width="1"><img src="images/spacer.gif" height="1" width="7"></td>');
	    $td = $('<td class="aa-option-cell"></td>');
            $td.append($spacer);
	    $td.append(el)
	    $buttonCell.after($td);
	}
	// The option bar gets nuked after data loads, so we add a watcher
	// to check for the progress window going away before we add ourselves.
	function checkForLoad () {
	    if ($('#progressMeterWindow:visible').length) {
		shown = false;
		log('Waiting for load...');
	    }
	    else if (shown==false) {
		shown = true;
		doAdd(el);
		log('Done loading: add UI');
	    }
	    setTimeout(checkForLoad,500);
	}
	checkForLoad();
    }

    
    // BUTTON CONVENIENCE FUNCTIONS
    function Button (txt, callback) {
	$b = $('<span>')
	$b.addClass('aa-button');
	$b.click(callback)
	$b.append(txt);
	return $b;
    }

    self.getUrlActions = function (url) {
	ff = []
	for (var urlPair of self.urls) {
	    var matcher = urlPair[0]
	    var f = urlPair[1]
	    if (matcher.exec(url)) {ff.push(f)}
	}
	if (ff.length > 0) {return ff}
    }

    self.updateInterface = function () {
	var ff = self.getUrlActions(document.URL);
	if (ff) {
	    log('Found %s interfaces for: %s',ff.length,document.URL);
	    for (var f of ff) {f()}
	}
	else {
	    log('No interface for: %s',document.URL);
	}
    }


    /* Functions to load and confirm outside data sources */
    self.loadAssignmentData = function (data) {
        console.log("GOTDATA: %s",JSON.stringify(data));
        var $popup = makePopup();
        var dh = csvDataHandler(
            assignmentFields,
            'CSV',
            importAssignmentsFromCsvCallback
        );
	$popup.buttonbar.append(dh.$buttonArea);
	$popup.body.append(
	    dh.$ui
	);
        dh.handleData(data);
    }
    
    self.loadGradeData = function (data) {
        var $popup = makePopup();
        var dh = csvDataHandler(
            gradebookFields,
            'Import Grades',
            importGradesFromCsvCallback
        );
	$popup.buttonbar.append(dh.$buttonArea);
	$popup.body.append(
	    dh.$ui
	);        
        dh.handleData(data);
    }


    function GoogleClassroomPicker (header, cb, params) {
        var _lastClass = ''
        if (!params) {params = {getGrades : false}}
        var obj = {
            popup : $popup,

            getSelectedClass : function () {
                var checkedBoxes = $('input[name="aa-google-course"]:checked');
                if (checkedBoxes[0]) {
                    _lastClass = obj.loadedClasses[checkedBoxes[0].value]
                    return _lastClass
                }
                else {
                    return _lastClass
                }
            },
            getSelectedAssignments : function () {
                return $('input[name="aa-google-assignment"]:checked').map(function () {return obj.loadedAssignments[this.value]}).get()
            },
            getGradesForClass : function () {
            },
            fetchClasses : fetchClasses,
            loadedClasses : false,
            loadedAssignments : false,
            loadedGrades : false,
        }
        var $popup = makePopup();
        var $actionButton;
        var $waiting = $(`<div><h2>${header}</h2>
    <h3>Loading Classes from Google...</h3>
    <p>In just a second this will have something useful.
    </p></div>`);
        $popup.body.append($waiting);
        
        fetchClasses()
        return obj


        function fetchGrades () {
            var course = obj.getSelectedClass();
            var assignments = obj.getSelectedAssignments();
            $popup.body.empty();
            $popup.body.append(`<div><h2>${header}</h2><h4>Loading</h4><p>Loading grades from google... this can take a sec</p></div>`);
            chrome.runtime.sendMessage(
                {mode:'classroom',
                 method:'listSubmissions',
                 course:course.id,
                 assignments:assignments.map((a)=>a.id),
                },
                function (assessmentData) {
                    console.log('Got grades! %s',assessmentData);
                    asss = assessmentData; // gloabl for debug
                    $popup.body.append(`<p>${assessmentData.join('<br>')}</p>`);
                    $popup.body.append('<h4>FIXME</h4>')
                    $popup.hide()
                    cb(assessmentData);
                }
            );
        }

        function fetchAssignments () {
            var course = obj.getSelectedClass()
            $popup.body.empty();
            $popup.body.append(`<div><h2>${header}</h2>
                <h3>Fetching assignment data...</h3>
                <p>Fetching assignment data for class ${course.name} (${course.id})</p>
                <p>...</p>
             </div>`);
            chrome.runtime.sendMessage(
                {mode:'classroom',
                 method:'listGradedAssignments',
                 params : {
                     id : course.id
                 }},
                function (assignmentData) {
                    assignmentD = assignmentData
                    console.log('Storing asignment data in assignmentD global for inspection....');
                    $popup.body.empty();
                    obj.loadedAssignments = {}
                    assignmentData.forEach((cw)=>obj.loadedAssignments[cw.id]=cw);
                    $popup.body.append(AssignmentPicker(assignmentData));
                    $actionButton.remove();
                    $actionButton = Button('Select',()=>{
                        if (params.getGrades) {
                            fetchGrades();
                        }
                        else {
                            // Callback with just assignment list
                            cb(obj.getSelectedAssignments())
                        }
                    });
                    $popup.buttonbar.append($actionButton);
                }
            );
        }

        function fetchClasses () {
            chrome.runtime.sendMessage(
                {mode:'classroom',
                 method:'listCourses',
                },
                function handleResponse (data) {
                    var $coursePicker = CoursePicker(data);
                    $waiting.remove();
                    $popup.body.append($coursePicker);
                    obj.loadedClasses = {};
                    data.courses.forEach((c)=>obj.loadedClasses[c.id]=c);
                    $actionButton = Button('Load Assignments',fetchAssignments)
                    $popup.buttonbar.append($actionButton);
                }
            );
        }

        function CoursePicker (data) {
            courseData = data; // global!
            var $picker = $(`<div><h2>${header}</h2><h3>Pick Google Classroom</h3></div>`);
            var $courseList = $('<ul></ul>');
            $picker.append($courseList);
            data.courses.forEach(
                (c)=>{
                    $courseList.append($(`<li><input name="aa-google-course" type="checkbox" class="aa-course-picker" value="${c.id}"> <b><a href="${c.alternateLink}" target="_BLANK">${c.name}</a></b></li>`));
                });
            return $picker;
        }

        function AssignmentPicker (data) {
            var $picker = $('<div><h3>Pick Assignments to Load</h3></div>');
            var $ul = $('<ul></ul>')
            $picker.append($ul);
            
            data.forEach((cw)=>{
                $ul.append($(`<li><input name="aa-google-assignment" type="checkbox" class="aa-google-assignment" value="${cw.id}">
                               <b><a href="${cw.alternateLink}">${cw.title}</a> </b>  Due ${cw.dueDate && cw.dueDate.month}/${cw.dueDate && cw.dueDate.day} ${cw.maxPoints}pts.
                               <br><small>(i.e. ${cw.aspenShort}: ${cw.aspenLong})</small></li>`));
            });
            return $picker;
        }
        
    }



    return self;
} // end UserInterface




// Poller - where we get actions registered with us!
// This one is rather important :)

function Poller (ui) {

    var self = {}

    self.doAction = function (action) {
	log('Do action %s',JSON.stringify(action));
	switch (action.name) {
        case "sendAssignmentData":
            console.log('Got data: %s',action.data);
            globact = action.data
            ui.loadAssignmentData(action.data.text);
            self.complete(action);
            break;
        case "sendGradeData":
            console.log('Got data: %s',action.data);
            globact = action.data;
            ui.loadGradeData(action.data.text);
            self.complete(action);
            break;
	case "comment":
	    commentAction(action.main,action.private);
	    chrome.runtime.sendMessage({'mode':'complete',
					'url':document.URL,
					'action':action,
				       },function () {log('Completed!');}
				      );
	    break;
	case "writeText":
	    writeText(action.text);
	    chrome.runtime.sendMessage({'mode':'complete',
					'url':document.URL,
					'action':action,
				       },function () {log('Completed!');}
                                      );
	    break;

	case "createAssignments":
	    // Register multiple assignments :)
	    log('Got action: create multiple assignments %s',action.data);
	    addAssignmentsFromAssignmentsTab(
		action.data,
		action.next
		//true, // multi-mode...
	    );
	    break;

	case "createAssignment":
	    log('Got action: createAssignment %s',JSON.stringify(action));
	    var actions = getFillOutAssignmentActions(action.assignment);
	    var finishIt = function () {
		log('Sending complete signal %s',action);
		chrome.runtime.sendMessage({'mode':'complete',
					    'url':document.URL,
					    'action':action},function () {log('Completed async')});
	    }
	    // insert our action... 
	    var lastAct = actions[actions.length-1]
	    var lastActAction = lastAct.action
	    lastAct.action = function () {finishIt(); lastActAction()};
	    loopThroughActions(actions);
	    break;  // no fall through


	case "selectClass":
	        log('selectClass %s',action);
	    self.complete(action); // complete first so we know the code runs :)
	    selectClass(action.classname)
	    break;

	case "switchClass":
	    self.complete(action);
	    switchClass(action.classname,action.next)
	    topTabAction('Gradebook');
	    break;

	case "sideTab":
	    log("sideTab %s',action");
	    self.complete(action); // complete first so we know the code runs :)
	    sideTab(action.tab).click();
	    break;


	case "multiClass":
	    var found;
	    log("multiClass action %s",JSON.stringify(Object.keys(action)));
	    var curClass = getCurrentClassFromKeys(action.data)
	    found = curClass && true || false;
	    var actions = []
	    if (found && action.data[curClass] && action.data[curClass].length > 0) {
		log('We have data to enter for this class! %s',curClass)
		log('%s rows of data: ',action.data[curClass].length);
		log('Wait a sec...');
		setTimeout(function () {
		    log('Go!');
		    setGrademodeAll(
			function () {
			    mytable = TableObject(getAssignmentsFromGradebook());
			    log('Entering grade data: %s',action.data[curClass]);
			    for (var i=0; i<action.data[curClass].length; i++) {
				var row = action.data[curClass][i]
				log('Working with data: %s',row);
				actions.push(mytable.setCellDelayed.apply(this,row));
			    }
			    action.data[curClass] = false; // done!
			    actions.push(DelayedAction(
				function () {
				    // register for more...
				    chrome.runtime.sendMessage({
					mode:'register',
					url:'staffGradeInputContainer.do?navkey=gradebook.classes.list.input',
					action:{name:'multiClass',
						data:action.data}
				    });
				},
				function () {return true}
			    ));
			    self.complete(action)
			    loopThroughActions(actions)
			});
		},3000); // 3 second wait
	    }
	    else {
		log('No data for this class: %s',curClass);
		for (var classname in action.data) {
		    if (action.data[classname].length>0) {
			log('Switch to %s to complete %s rows',classname,action.data[classname].length);
			chrome.runtime.sendMessage({
			    mode:'register',
			    url:'staffGradeInputContainer.do?navkey=gradebook.classes.list.input',
			    action:{name:'multiClass',
				    data:action.data}
			});
			self.complete(action);
			setTimeout(
			    ()=>switchClass(classname),3000 // wait before advancing...
			);
			return;
		    }
		}
		log('Weird, we made it to this part of the loop without switching...')
		self.complete(action);
	    }
	    // end multiClass
	    break;
	case "multiAssignments":
	    var curClass = getCurrentClassFromKeys(action.data);

	    if (action.data[curClass]) {
		// Great, Let's add this class
		var curClassData = action.data[curClass];
		delete action.data[curClass] // remove curClass from data...
		log('Register data for %s',curClass);
		chrome.runtime.sendMessage({
		    mode:'register',
		    url:'gradebook.classes.list.gcd',
		    action:{
			name:'createAssignments',
			data:curClassData,
			next:{
			    // And after we'll call ourselves again w/ the rest of our data...
			    name:'multiAssignments',
			    data:action.data
			}
		    }
		});
	    }
	    else {
		// Ok -- we have to switch classes then...
		var classes = Object.keys(action.data);
		if (classes) {
		    // Register to do this thing again...
		    chrome.runtime.sendMessage({
			note:'Re-registering for after the switch!',
			mode:'register',
			url:'gradebook.classes.list.gcd',
			action : {...action}
		    });
		    log('Switch to %s',classes[0]);
		    switchClass(classes[0],'assignments');
		    // DO NOT COMPLETE...
		    return
		}
		else {
		    log('Apparenty we are done!');
		}
	    }
	    self.complete(action) // Finally, let us complete
	    break;


	default:
	    log('No handler for action: %s',action.name);
	    log('Complete action: %s',JSON.stringify(action));
	} // end switch
    }

    self.complete = function (action) {
	chrome.runtime.sendMessage(
	    {mode:'complete',
	     url:document.URL,
	     action:action},
	    function () {'Action marked complete: %s',action}
	);
    }

    self.runPoll = function () {
	chrome.runtime.sendMessage(
	    {'mode':'get',
	     'url':document.URL},
	    function (action) {
		console.log('Polling got %s',action);
		if (action==BUSY) {
		    console.log('Already busy completing a task.');
		}
		else {
		    if (action) {
			log('ACTION! Got new action to do: %s',JSON.stringify(action));
			self.doAction(action)
		    }
		}
		// wait a half second, poll again...
		setTimeout(self.runPoll,1500)
	    })
    }
    return self
}



// JQuery code to inject our UI
$(document).ready(function () {

    /* CSS Extras */

    /* Grab our fonts from google for CSS good measure... */
    $('head').append($('<link href="https://fonts.googleapis.com/css?family=Bitter|Lato|Ubuntu|Sarabun" rel="stylesheet">'));
    $('div:contains("District view")').closest('table').addClass('districtView')
    $('div:contains("School view")').closest('table').addClass('schoolView')
    $('div:contains("Staff view")').closest('table').addClass('staffView')
    $('div:contains("Build view")').closest('table').addClass('buildView')
    $('div:contains("Family view")').closest('table').addClass('familyView')
    $('div:contains("Student view")').closest('table').addClass('studentView')



    prefs.ready(
        ()=>{
            if (prefs.get('customStyle')) {
                console.log('Apply custom style');
                $('body').addClass('aa-custom-style');
            }
            else {
                console.log('Not bothering with custom style');
            }
            
        }
    );
    // We need to poll universally...
    var ui = UserInterface()
    var p = Poller(ui)
    p.runPoll()


    setTimeout(ui.updateInterface,500); // delay :)
    
    // // if (document.URL.indexOf('common/scFrameContent.html')>1) {
    // // 	// If we are in a message window, grab the context...
    // // 	chrome.runtime.sendMessage(
    // // 	    {'mode':'get',
    // // 	     'context':'comment'},
    // // 	    function (commentContent) { //
    // // 		$('body').append(commentContent);
    // // 	    }

    
    // // }
    // // else {
    // function addButton (txt, callback) {
    // 	$td = $('<td>')
    // 	$b = $('<span>')
    // 	$b.css('border','2px solid red')
    // 	$b.click(callback)
    // 	$b.append(txt);
    // 	$td.append($b);
    // 	$('.applicationSubtitle').append($td);	
    // }
    
    // addButton('Fill out assignment',testTable);
    // addButton('Save',doSave)
    // addButton('Grab Grade Table',function () {
    // 	mytable = TableObject(getAssignmentsFromGradebook()); // GLOBAL
    // 	log('Test setting value :)');
    // 	mytable.setCell('Apostolos, Haley','test','B+')
    // 	mytable.setCell('Brody, Jocelyn','test','C+')
    // 	mytable.setCell('Lennon, Keegan','test','B-')
    // 	mytable.setCell('Schmidt, Joshua','test','A','A comment for Josh!')
    // });

    // addButton('Auto Grade Delayed',
    // 	      function () {
    // 		  mytable = TableObject(getAssignmentsFromGradebook());
    // 		  actions = [
    // 		      mytable.setCellDelayed('Labbe, Ashley','test','C+','Ashley was here'),
    // 		      mytable.setCellDelayed('Apostolos, Haley','test','A-','Haley is so fabulous!!!'),
    // 		      mytable.setCellDelayed('Brody, Jocelyn','test','B-','Josie is so fabulous!!!'),
    // 		      mytable.setCellDelayed('Fonseca, Melissa','test','B+','Melissa is so so fabulous!!!'),
    // 		      mytable.setCellDelayed('Hoyt, Zachary','test','C+','Zach does music.'),
    // 		      mytable.setCellDelayed('Nason, Logan','test','A','Logan is the best!!!'),
    // 		      mytable.setCellDelayed('Nealey, Jane','test','C-','Jane should get a C once in a while.'),
    // 		      mytable.setCellDelayed('Trujillo, Bianca','test','A','Bianca is fine and dandy'),
    // 		      mytable.setCellDelayed('Weldon, Marguerite','test','A-','Meg is thoughtful.'),
    // 		  ]
    // 		  loopThroughActions(actions);
    // 	      });
    // addButton('Test Messaging Yeah Yeah Yeah',testMessaging);
    //}
});

//select class...
function selectClass (classname) {
    log('selectClass(%s)',classname);
    $('#dataGrid a:contains("'+classname+'")')[0].click();    
}

function switchClass (classname, nextUp='scores') {    
    log('Switching class to %s',classname);
    log('Register listeners to switch to class');
    chrome.runtime.sendMessage({
	'mode':'register',
	'url':'gradebookClassList.do?navkey=gradebook.classes.list',
	'action':{'name':'selectClass',
		  'classname':classname}
    });
    if (nextUp=='scores') {
	log('Register listener to switch to gradebook');
	chrome.runtime.sendMessage({
	    mode:'register',
	    url:'gradebook.classes.list.detail',
	    action: {name:'sideTab',
		     tab:'Scores'}
	});
	log('switch to gradebook');
	topTabAction('Gradebook').click();;
    }
    if (nextUp=='assignments') {
	log('Register listener to switch to gradebook');
	chrome.runtime.sendMessage({
	    mode:'register',
	    url:'gradebook.classes.list.detail',
	    action: {name:'sideTab',
		     tab:'Assignment'}
	});
	log('switch to gradebook');
	topTabAction('Gradebook').click();;

    }
}


function Prefs (keys) {

    var runWhenReady = [];
    var ready = false;

    var prefObj = {

        prefs : {},


        ready (f) {
            if (ready) {
                console.log('Prefs.ready() run right away');
                f()
            }
            else {
                console.log('Prefs.ready - lets hold on a sec');
                runWhenReady.push(f);
            }
        },

        updatePrefs () {
            var self = this;
            chrome.storage.sync.get(keys, (r)=>{
                console.log('updatePrefs got prefs!');
                keys.forEach(
                    (k)=>{self.prefs[k] = r[k]}
                );
                ready = true;
                while (runWhenReady.length>0) {
                    console.log('Running queued function: prefs are ready!');
                    runWhenReady.pop()();
                }
                    
                
            });
        },

        get (k) {
            return this.prefs[k]
        },

        set (k, v) {
            var self = this;
            if (keys.indexOf(k)==-1) {
                throw Exception('Key %s not registered for prefs %s',k,keys);
            }
            var setDic = {};
            setDic[k] = v;
            self.prefs[k] = v;
            console.log('Initially setting prefs %s: %s',k,self.prefs[k])
            chrome.storage.sync.set(setDic,
                                     ()=>{
                                         console.log('Set %s in memory',k);
                                     });
        }

        
    };

    prefObj.updatePrefs();
    return prefObj;
}

function testPrefs () {
    p = Prefs(['favoriteColor','favoriteFruit','favoriteDrink']);
    
    //p.set('favoriteColor','blue');
    console.log('Get favorite color!');
    //p.set('favoriteFruit','banana');
    setTimeout( ()=>{
        console.log('favorite fruit: %s',p.get('favoriteFruit'));
        p.get('favoriteColor');
        console.log('Got prefs: %s',JSON.stringify(p.prefs));
    }, 500);
    return p;
}

p = testPrefs();
