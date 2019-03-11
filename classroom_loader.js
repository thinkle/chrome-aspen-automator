// Actually, screw this -- let's load data from GAS just for kicks
// because gapi is not working and I'm sick of troubleshooting the
// gapi API in extensions...
//
// That means to get this working, you'll need my GAS script working
// -- see link below...
//
// https://script.google.com/a/innovationcharter.org/macros/s/AKfycbzAFwr4tyBgH-IAJDaq09HlEqlcrSqLQ8OLZIYnQIKy/dev

var data = ''

// Let's add a way to load a spreadsheet!
function loadGoogleSheetBackasswards (url,callback,ecallback) {
    return grabData(
        {spreadsheeturl:url},
        callback);
}

function loadGoogleSheet (url, callback, ecallback) {
    url = url.replace(/edit#/,"export?format=csv&")
    console.log('URL: %s',url);
    var request = new XMLHttpRequest();
    request.open('GET',url,true);
    request.onreadystatechange = function () {
        console.log('Got data : %s',request.responseText);
        try {
            rawCsv = request.responseText;
            //csvdata = Papa.parse(request.responseText) // global for debugs :)
            if (callback) {
                //callback(csvdata);
                callback(rawCsv); // just give them the data :) - we'll parse browser-side...
            }
        }
        catch (err) {
            console.log('Error parsing: %s',csvdata);
            console.log(err);
            if (ecallback) {ecallback(err)}
        }
    }
    request.send();
    console.log('sent csv request');
}


function grabData (params, callback) {
    console.log('Firing off XMLHttpRequest for data: %s %s',params,callback);
    var str = "";
    for (var key in params) {
        if (str != "") {
            str += "&";
        }
        str += key + "=" + encodeURIComponent(params[key]);
    }
    xhr = new XMLHttpRequest();
    var url = 'https://script.google.com/a/innovationcharter.org/macros/s/AKfycbzAFwr4tyBgH-IAJDaq09HlEqlcrSqLQ8OLZIYnQIKy/dev?'+str
    console.log('URL: %s',url);
    xhr.open('GET',url,true)
    xhr.onreadystatechange = function () {
        console.log('Got us some data(?): %s',xhr.responseText);
        try {
            data = JSON.parse(xhr.responseText)
            console.log('Successfully parsed!');
            if (callback) {
                callback(data);
            }
        }
        catch (err) {
            console.log('Error parsing: %s',err);
            data = xhr.responseText
            
        }
        
    }
    xhr.send();
    console.log('Sent request');
}

function listCourses (callback) {
    grabData({'courses':true},callback)
}

function listCoursework (id,callback) {
    grabData({coursework:id},callback)
}

function listSubmissions (course,assignments,callback,params) {
    if (!params) {params = {
    }}
    if (course) {params.course=course;}
    if (assignments) {params.assignments=assignments;}
    params.submissions = true;
    console.log('Grabbing data with params: %s',JSON.stringify(params));
    grabData(params,(data)=>{
        data.forEach((s)=>{
            s.encId = encodeId(s.workId);
        });
        callback(data)
    });
}

function encodeId (id) {
    return BaseAsMuchAsWeCan.fromNumber(Number(id))
}
function decodeId (id) {
    return BaseAsMuchAsWeCan.toNumber(id)
}

function sampleWork () {
    listGradedAssignments(
        16250887926,
        (w)=>{
            work=w;
            console.log('Sample work in global "work"');
        });
    // listCoursework(16250887926, (r) => {
    //     result = r;
    //     work = r.courseWork.filter((c)=>c.maxPoints);
    //     console.log('Sample work is in global "work"');
    //     work.map(aspenify);
    // });
}

function listGradedAssignments (id, cb) {
    console.log('Fire off listGradedAssignments: cb=%s',cb);
    listCoursework(id, (r) => {
        console.log('listCoursework callback!');
        var result = r;
        if (r && r.courseWork) {
            console.log('Yes assignments!');
            var work = r.courseWork.filter((c)=>c.maxPoints);
            work.map(aspenify);
            cb(work);
        }
        else {
            console.log('weird: no assignments? %s',r);
            console.log('Not sending back data :)');
        }
    });
    console.log('Fired off listGradedAssignments');
}

function aspenify (work) {
    work.encId = encodeId(work.id);
    work.aspenShort = work.encId + ' ' + abbreviate(work.title,9-work.encId.length) 
    work.aspenLong = abbreviate(work.title,50,true); // true flag keeps spaces for readability
}

var abbreviations = [
    [/(\s+|^)with(\s+|$)/g , ' w/ '],
    [/(\s+|^)([Tt]he|[Aa]n?)(\s+|$)/g , ' '],
    [/(\s+|^)(for|in|of)(\s+|$)/g , ' '],
    [/(\s+|^)and(\s+|$)/g , '&'],
    [/(\s+|^)or(\s+|$)/g , '|'],
    [/(\s+|^)(to|from)(\s+|$)/g , '-'],
    [/(\s+|^)(by|per|over)(\s+|$)/g , '/'],
    [/(\s+|^)(some|few|any)(\s+|$)/g , '/'],
    [/(\s+|^)(problem set)(\s+|$)/gi , 'PS'],
    [/(\s+|^)(home\s*work)(\s+|$)/gi , 'HW'],
    [/(\s+|^)(class\s*work)(\s+|$)/gi , 'CW'],
]

function abbreviate (txt, target, keepspaces) {
    if (txt.length <= target) {
        return txt;
    }
    for (var abbrSet of abbreviations) {
        //console.log('Using abbrSet: %s',abbrSet);
        txt = txt.replace(abbrSet[0],abbrSet[1]);
    }
    //console.log('Abbreviations fixed: %s',txt);
    if (txt.length <= target) {
        return txt
    }
    // Internal vowels...
    txt = txt.replace(/(\w)[aeiou]/g,'$1')
    txt = txt.replace(/(\w)[aeiou]/g,'$1')
    txt = txt.replace(/(\w)[aeiou]/g,'$1') // up to three vowels in a row... easier than listing consontants
    //console.log('Internal vowels gone: %s',txt);
    if (txt.length <= target) {
        return txt
    }
    // whitespace...
    if (keepspaces) {
        txt = txt.replace(/\s+/g,' ');
    }
    else {
        txt = txt.replace(/\s+/g,'')
    }
    //console.log('Whitespace gone: %s',txt);
    if (txt.length <= target) {
        return txt;
    }
    // Try to keep numerical indicators...
    var numberMatch = /[\d.-]*\d/.exec(txt);
    if (numberMatch) {
        //console.log('We have a number...')
        var endPos = numberMatch[0].length + numberMatch.index
        if (endPos > target) {
            //console.log('Number will be truncated - no!!!!');
            //console.log('Match: %s',numberMatch[0]);
            //console.log('Number goes from %s to %s',numberMatch.index,endPos);
            // we will lose the number: this is sad
            txt = txt.substr(0,target-numberMatch[0].length)
            txt += numberMatch[0];
            //console.log('Text is now: %s',txt);
            if (txt.length<=target) {
                //console.log('Preserved number...');
                return txt;
            }
        }
    }
    //
    //console.log('Resorting to chopping...');
    return txt.substr(0,target)
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.mode == 'sheet') {
            var actionUrl, actionName;
            if (request.method == 'grades') {
                actionName = 'sendGradeData';
                actionUrl = 'staffGradeInputContainer.do';
            }
            else if (request.method == 'assignments') {
                actionName = 'sendAssignmentData';
                actionUrl = 'assignmentList.do';
            }
            var cb = (d) => {
                if (!d) {
                    console.log('ERROR NO DATA :(');
                    return
                }
                console.log('Callback got data: %s',d);//sendResponse(data),
                var a = {
                    name:actionName,
                    data:{text:d},
                }
                console.log('Queue action! %s',JSON.stringify(a));
                actions.queueAction(a,undefined, // no context
                                    actionUrl //  URL
                                   );
            }
            console.log('Got sheet request!');
            loadGoogleSheet(request.url,
                            cb,
                            (err)=>console.log('Got err: %s',err) // (err)=>sendResponse(err)
                           );
            return true; // async
        }
        if (request.mode == 'classroom') {
            if (request.method=='listCourses') {
                listCourses((cc)=>{
                    console.log('sending back courses: %s',JSON.stringify(cc));
                    sendResponse(cc);
                })
            }
            if (request.method=='listGradedAssignments') {
                listGradedAssignments(request.params.id,
                                  (w)=>{
                                      console.log('Sending back work: %s',JSON.stringify(w));
                                      sendResponse(w);
                                  });;
            }
            if (request.method=='listSubmissions') {
                listSubmissions(request.course,request.assignments,(ss)=>{
                    console.log('Sending back submissions: %s',JSON.stringify(ss));
                    sendResponse(ss);
                });
            }
            console.log('listener returning true to indicate async');
            // https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent/20077854#20077854            
            return true; // async! -- all of these methods are async
        }
    }); // end listener

