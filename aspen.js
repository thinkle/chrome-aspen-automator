console.log('Hello world - I injected javascript!');
//$('body').prepend('HELLO WORLD');

mid_increment = 1

function remoteControlTest () {
    console.log('Remote Control Test');
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

gft = {} // globals for testing -- bad :)

function setValue (lab, val) {
    getValueSetter().action()
}

function getValueSetter (lab,val) {
    $label = $($('span:contains("'+lab+'")')[0]);
    $labelParent = $($label.parent('td'))
    $nextCell = $($labelParent.siblings('td.detailValue')[0]);
    var doExtraCheck, origVals, timer, totalTimer
    var valueWidgets = $nextCell.find('input')
    var w = valueWidgets[0]
    gft[lab] = valueWidgets
    return DelayedAction(
	function () {
	    console.log('Setting widget %s to %s (%s)',w,val,lab);
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
		if (lab=='Category') {doExtraCheck = true};
	    }},
	function () { // completion checker :)
	    if (timer) {
		// if we're using a timer...
		elapsed = new Date().getTime() - timer
		if (elapsed > 500) {
		    return true
		}
		else {
		    return false
		}
	    }
	    if (valueWidgets.length > 1 && doExtraCheck) {
		newVals = valueWidgets.map(function () {return this.value}).slice(1)
		console.log('Had %s, got %s',
			    origVals.toArray().toString(),
			    newVals.toArray().toString());
		if (newVals.toArray().toString()!=origVals.toArray().toString()) {
		    console.log('Updated!')
		    timer = new Date().getTime()
		}
		else {
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
		else {setTimeout(waiter,500)}
	    }
	);
    }
    waiter()
}

function setTable (data) {
    actions = []
    for (var cat in data) {
	console.log('cat',cat,':',data[cat])
	actions.push(getValueSetter(cat,data[cat]));
    }
    actions.push(Action(doSave,function () {return true}));
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
    $('#saveButton').click()
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
		    console.log('Error at offset % tacking on %s (selector %s)',offset,tr,selector);
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
    //console.log('rows at this point: %s',rows.toString())
    appendToRows(rightSideHeader);
    //console.log('rows at this point: %s',rows.toString())
    headerLength = rows.length;
    //console.log('rows at this point: %s',rows.toString())
    pushToRows(leftSideBottom);
    //console.log('rows at this point: %s',rows.toString())
    appendToRows(rightSideBottom,headerLength);
    //console.log('rows at this point: %s',rows.toString())
    globals = {'leftSideBottom':leftSideBottom,rightSideBottom:rightSideBottom,
	       leftSideHeader:leftSideHeader, rightSideHeader:rightSideHeader}
    return rows
}

function TableObject (data) {
    obj = {
	colHeaders : [],
	rowHeaders : [],

	getData : function () { return data},

	getRow : function (rh) {
	    self = this
	    var idx = self.rowHeaders.indexOf(rh);
	    if (idx == -1) {throw 'Not found :('}
	    return data[idx]
	},

	getCol : function (ch) {
	    self = this;
	    var idx = self.colHeaders.indexOf(ch);
	    if (idx==-1) {throw 'not found'}
	    col = []
	    return data.map(function (row) {col.push(row[idx])});
	    return col;
	},

	getCell : function (rh, ch) {
	    self = this;
	    colIndex = this.colHeaders.indexOf(ch);
	    rowIndex = this.rowHeaders.indexOf(rh);
	    if (colIndex == -1) {throw 'No column '+ch}
	    if (rowIndex == -1) {throw 'No row '+rh}
	    //data[rowIndex][colIndex].innerHTML = val;
	    curcell = data[rowIndex][colIndex]
	    return curcell
	},

	setCellDelayed : function (rh, ch, val, commentContent) {
	    self = this;
	    // We return a delayed action object -- much code repeated
	    // from setCell - sorry world -- the logic is just
	    // different enough to make abstraction awkward
	    var curcell = self.getCell(rh,ch);
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
		    console.log('Onclick URL=%s',onclickUrl);
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
			console.log('Sleep before we finish -- 3s');
			//delayedAction(
			//function () {}
			// Use delayed action to set up a listener to only continue after the
			// image icon has updated :(
			loopThroughActions(
			    [DelayedAction(
				function () {},
				function () { // check for completion...
				    console.log('Checking image icon...');
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
	    self = this;
	    var curcell = self.getCell(rh,ch);
	    $(curcell).click()
	    $(curcell).find('input').val(val);
	    var input = $(curcell).find('input')[0];
	    if (input) {input.dispatchEvent(new MouseEvent("click"));}
	    else {console.log('No input found for %s',curcell)}
	    if (commentContent) {
		console.log('Got commentContent %s, clicking',commentContent);
		var imgLink = $(curcell).find('img')
		var onclick = imgLink[0].getAttribute('onclick');
		var re = /.*doPopup\(['"]([^\),'"]*)/;
		var onclickUrl = re.exec(onclick)[1]
		onclickUrl = onclickUrl.trim();
		console.log('Onclick URL=%s',onclickUrl);
		const context = 'comment'
		chrome.runtime.sendMessage(
		    {'mode':'register',
		     'url':onclickUrl,
		     'action':{'main':commentContent,'private':comemntContent,'name':'comment'}
		    },
		     function () { // callback for registering comment
			 $(curcell).find('img').click();
		     });
	    } // end if comment
	    else {
		console.log('No comment');
	    }
	}
    }
    
    for (var cell of data[0]) {
	textContent = cell.textContent.trim();
	if (textContent.indexOf('\n') > -1) { // if there's newlines...
	    // Try to clean this up...
	    console.log('Try to clean this baby up: has newlines');
	    if ($(cell).find('a').length) {
		links = $(cell).find('a')
		if (links[0].textContent != '...') {
		    textContent = links[0].textContent.trim()
		}
	    }
	}
	console.log('Setting colHeader to: "%s"',textContent);
	obj.colHeaders.push(textContent);
    }
    for (var row of data) {
	obj.rowHeaders.push(row[0].textContent.trim());
    }
    console.log('Returning object: ',obj);
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
    console.log('printArray:\n'+output)
}


function commentAction (comment) {
    var textUrl = $('#scTextComment').attr('src');
    //var privateUrl = $('#scPrivateTextComment').attr('src');
    $('#scPrivateTextComment').remove();
    var done = false
    // Now we have to fire off a bunch of actions...
    // Step 1. register our actions...
    console.log('commentAction %s',comment);
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
				console.log('Sleep before saving...');
				//setTimeout(function () {
				    $('#scTextComment').click()
				    $('#scTextComment')[0].dispatchEvent(new MouseEvent("click"));
				    $('#saveButton').click();
				    console.log('Clicked save!')
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
    console.log('Test grabbing test actions!');
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
    // 				   console.log('Called get, got back data: %s',JSON.stringify(a));
    // 			       })
    // console.log('Test grabbing test actions! x2');
    // chrome.runtime.sendMessage({'mode':'get','context':'test'},
    // 			       function (a) {
    // 				   console.log('2 Called get, got back data: %s',JSON.stringify(a));
    // 			       })
    
    // var actions = [{'do':'Add Table','data': {foo:1,bar:2,baz:3}},
    // 		   {'do':'Add Table','data': {foo:4,bar:5,baz:7}},
    // 		   {'do':'Add Table','data': {foo:10,bar:8,baz:9}}]
    // function registerAnAction (action) {
    // 	console.log('registerAnAction %s',action);
    // 	chrome.runtime.sendMessage({mode: "register",'action':action, context:'a'},
    // 				   function(i) {
    // 				       console.log('Registered as action #%s',i);
    // 				       chrome.runtime.sendMessage(
    // 					   {mode:'get',context:'a'},
    // 					   function (action) {
    // 					       console.log('Doing action: %s',action);
    // 					       chrome.runtime.sendMessage({
    // 						   'mode':'complete',
    // 						   action:action,
    // 						   context:'a'})
    // 					       console.log('Done completing action %s',action);
    // 					   }) // end get action...
    // 				   }) // end register action
    // } // end registerAnAction
    // for (var a of actions ) {registerAnAction(a)}
}


function UserInterface () {

    var self = {}

    // URL MAPPING

    self.urls = [
	[/assignmentList.do/,function () {
	    handleFiles = function (files) {
		console.log('got files: %s',files);
		var file = files[0]
		var reader = new FileReader();
		reader.onload = function (e) {
		    var input = e.target.result
		    csvObj = $.csv.toObjects(input); // GLOBAL for debugging :)
		    console.log('Got CSV OBJ %s!',csvObj);
		}
		reader.readAsText(file);
	    };
	    addToOptionBar(
		Button('Import Assignments', function () {
		    console.log('Add Assignment');
		    $popup = makePopup();
		    function handleFiles = function (files) {
			// Once we get file...
			
			
		    }
	            $input = $('<input type="file" id="csvFileInput" accept=".csv">');
		    $input.change(function () {handleFiles(this.files)});
		    $popup.buttonbar.prepend($input);
		    $popup.body.append(
			$('<p>Select a CSV file to import assignments from. The headers should be as follows...</p>')
		    );
		}
		      )
	    );
	}],
	[/staffGradeInputContainer.do/,function () {
	    addToOptionBar(
		Button('Import Assignment Grades',function () {
		    console.log('Show import grades UI');
		    $popup = makePopup();
	            $input = $('<input type="file" id="csvFileInput" accept=".csv">');
		    handler = csvFileHandler({
			$input:$input,
			fields:['Student Name','Assignment Name','Grade','Comment'],
					    );
		    $popup.buttonbar.prepend($input);
		    var mapper
		    handleFiles = function (files) {
			console.log('got files: %s',files);
			var file = files[0]
			var reader = new FileReader();
			reader.onload = function (e) {
			    var input = e.target.result
			    csvObj = $.csv.toObjects(input); // GLOBAL for debugging :)
			    console.log('Got CSV OBJ %s!',csvObj);
			    $popup.body.append($("<p>Got data!</p>"));
			    var fields = [];
			    for (var field in csvObj[0]) {fields.push(field)};
			    mapper = makeCSVMapper(['Student Name','Assignment Name','Grade','Comment'],fields) // global
			    // Now we need to pick...
			    $body.append(mapper.$div);
			    mapper.finishUI();

			    // Button for actual import...
			    $popup.buttonbar.append(Button(
				actionLabel
				function () {
				    var doMap = mapper.getMapper()
				    //console.log('Got mapping data: %s',map);
				    console.log('Got CSV Data: ',csvObj);
				    mytable = TableObject(getAssignmentsFromGradebook());
				    actions = []
				    for (var csvrow of csvObj) {
					// console.log('Pushing to actions');
					// console.log(csvrow[map['Student Name']])
					// console.log(csvrow[map['Assignment Name']])
					// console.log(csvrow[map['Grade']])
					// console.log(csvrow[map['Comment']])
					
					actions.push(
					    mytable.setCellDelayed(
						doMap(csvrow,'Student Name'),
						doMap(csvrow,'Assignment Name'),
						doMap(csvrow,'Grade'),
						doMap(csvrow,'Comment')
					    )
					);
				    }
				    $popup.hide();
				    console.log('Here we go!');
				    loopThroughActions(actions);
				}) // end import button
						   );
			} // end onload
			reader.readAsText(file);
		    };


		    $popup.body.append(
			$('<p>Select a CSV file to import grades from.</p>')
		    );
		})
	    );
	}]
	] // end urls...


	
	
    }

    function csvFileHandler (args) {
	$input = args.$input
	mapfields = args.mapfields
	actionLabel = args.actionLabel
	actionCallback = args.actionCallback
	$input.change(function () {handleFiles(this.files)});


    function makeCSVMapper (labels, valueOptions) {
	mid = 'aa-select-'+mid_increment
	mid_increment += 1;

	Mapper = {
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
		console.log('Got select: %s',self.$select);
		valueOptions.map(function (f) {self.$select.append('<option value="'+f+'">'+f+'</option>')});
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
		    console.log('Changed value!');
		    if (this.value=='::other') {
			console.log('show other');
			$(this).next('input.aaother').show()
		    }
		}); // end change
		$('#'+mid+' .fieldSelector').each(function (idx, fs) {
		    var header = $(fs).attr('value');
		    $(fs).find('option').each(
			function (idx, o) {
			    var v = $(o).val()
			    if (v==header) {
				fs.selected = v;
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
	    console.log('Error: %s',e);
	}
	return Mapper
    }
	 
    function makePopup () {
	var $popup = $('<div class="aa-popup"><div class="aa-buttonbar"></div></div>');
	$body = $('<div class="aa-body"></div>');
	$buttonbar = $('<div clas="aa-buttonbar"></div>');
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
	    $td = $('<td></td>');
	    $td.append(el)
	    $buttonCell.after($td);
	}
	// The option bar gets nuked after data loads, so we add a watcher
	// to check for the progress window going away before we add ourselves.
	function checkForLoad () {
	    if ($('#progressMeterWindow:visible').length) {
		shown = false;
		console.log('Waiting for load...');
	    }
	    else if (shown==false) {
		shown = true;
		doAdd(el);
		console.log('Done loading: add UI');
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
	    console.log('Found %s interfaces for: %s',ff.length,document.URL);
	    for (var f of ff) {f()}
	}
	else {
	    console.log('No interface for: %s',document.URL);
	}
    }

    return self;
} // end UserInterface

    



function Poller () {

    var self = {}

    self.doAction = function (action) {
	console.log('Do action %s',JSON.stringify(action));
	switch (action.name) {
	case "comment":
	    commentAction(action.main,action.private);
	    break;
	case "writeText":
	    writeText(action.text);
	    break;
	default:
	    console.log('No handler for action: %s',action.name);
	}
	console.log('Complete action: %s',JSON.stringify(action));
	chrome.runtime.sendMessage({'mode':'complete',
				    'url':document.URL,
				    'action':action,
				   },function () {console.log('Completed!');}
				  );
    }

    self.runPoll = function () {
	chrome.runtime.sendMessage(
	    {'mode':'get',
	     'url':document.URL},
	    function (action) {
		if (action==BUSY) {
		    console.log('Already busy completing a task.');
		}
		else {
		    if (action) {
			console.log('ACTION! Got new action to do: %s',JSON.stringify(action));
			self.doAction(action)
		    }
		}
		// wait a half second, poll again...
		setTimeout(self.runPoll,1500)
	    })
    }
    return self
}



$(document).ready(function () {



    // We need to poll universally...

    var p = Poller()
    p.runPoll()

    var ui = UserInterface()
    setTimeout(ui.updateInterface,500); // delay :)
    
    // if (document.URL.indexOf('common/scFrameContent.html')>1) {
    // 	// If we are in a message window, grab the context...
    // 	chrome.runtime.sendMessage(
    // 	    {'mode':'get',
    // 	     'context':'comment'},
    // 	    function (commentContent) { //
    // 		$('body').append(commentContent);
    // 	    }

	
    // }
    // else {
    function addButton (txt, callback) {
	$td = $('<td>')
	$b = $('<span>')
	$b.css('border','2px solid red')
	$b.click(callback)
	$b.append(txt);
	$td.append($b);
	$('.applicationSubtitle').append($td);	
    }
    
    addButton('Fill out assignment',testTable);
    addButton('Save',doSave)
    addButton('Grab Grade Table',function () {
	mytable = TableObject(getAssignmentsFromGradebook()); // GLOBAL
	console.log('Test setting value :)');
	mytable.setCell('Apostolos, Haley','test','B+')
	mytable.setCell('Brody, Jocelyn','test','C+')
	mytable.setCell('Lennon, Keegan','test','B-')
	mytable.setCell('Schmidt, Joshua','test','A','A comment for Josh!')
    });

    addButton('Auto Grade Delayed',
	      function () {
		  mytable = TableObject(getAssignmentsFromGradebook());
		  actions = [
		      mytable.setCellDelayed('Labbe, Ashley','test','C+','Ashley was here'),
		      mytable.setCellDelayed('Apostolos, Haley','test','A-','Haley is so fabulous!!!'),
		      mytable.setCellDelayed('Brody, Jocelyn','test','B-','Josie is so fabulous!!!'),
		      mytable.setCellDelayed('Fonseca, Melissa','test','B+','Melissa is so so fabulous!!!'),
		      mytable.setCellDelayed('Hoyt, Zachary','test','C+','Zach does music.'),
		      mytable.setCellDelayed('Nason, Logan','test','A','Logan is the best!!!'),
		      mytable.setCellDelayed('Nealey, Jane','test','C-','Jane should get a C once in a while.'),
		      mytable.setCellDelayed('Trujillo, Bianca','test','A','Bianca is fine and dandy'),
		      mytable.setCellDelayed('Weldon, Marguerite','test','A-','Meg is thoughtful.'),
		  ]
		  loopThroughActions(actions);
	      });
    addButton('Test Messaging Yeah Yeah Yeah',testMessaging);
    //}
});
