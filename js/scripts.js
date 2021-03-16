var supportedArchiveTypes=['application/x-zip-compressed'
                            ,'application/zip'
                            ,'application/x-tar'
                            ,'application/x-7z-compressed'
                            ,'application/x-rar-compressed'];

var files=[];
var modalJsonLog=[];
var logCacheInterval=50;

$(function() {
    console.log( "ready!" );

    addListeners();

    //$('#replayerModal').modal(); //delete
});
 

/** adds listeners to html elements
 * 
 *  */ 
function addListeners(){
    $("#log-button").click(fileSubmit); //clicked on analyse button
    $("#input-log-type").change(toggleLogArea); //toggled file input
    $(".log-input").change(showLogInputData); //file or folder chosen then shown in log input area
    $("#expand-choose-logs").click(toggleChooseLogs); 
    $('#sidebarCollapse').click(toggleSidebar);
    $('#replayerModal').on('hidden.bs.modal', modalOnHide); 
}


function modalOnHide(){
    modalJsonLog=[];
    $('#modal-sidebar-event-list').empty();  //eemaldame kirjed replayerist
    $("#modal-sidebar-event-data-list").empty();
    $("#modal-main-header").empty();
    $("#modal-program-text").empty();
    $("#modal-shell-text").empty();
}


/**
 * toggles sidebar
 */
function toggleSidebar(){
    $('.sidebar, .content').toggleClass('active');
}

/**
 * displays sidebar
 */
function showSidebar(){
    $('.sidebar, .content').addClass('active');

}

/** toggles log choosing area
 * 
 */
function toggleChooseLogs(){

    var goToTop=!$("#choose-logs").hasClass("show");

    $("#choose-logs").collapse('toggle');

    if (goToTop){
        $(window).scrollTop(0);
    }
    
}

/** shows text of how many files chosen
 * 
 */
function showLogInputData(){
    var logTypeFile=$("#input-log-type")[0].checked;
    var lenFiles=$(this)[0].files.length;

    if(logTypeFile){//file
        $("#log-input-file-msg").text(lenFiles+' files chosen.');
    }else{//folder
        $("#log-input-folder-msg").text(lenFiles+' files present in selected folder.');
    }
}

/**switches list item
 * 
 */
function switchListItem(keyEvent){
    if (!$("#input-analysis-type")[0].checked){ //Multiple student analysis
        $('.failid.active').removeClass('active');   
    }
    $(".tab-pane.active").removeClass('active show');   

    if (keyEvent.which===9){
        $(this).tab('show');
    }
}

function switchFolder(keyEvent){
    if (keyEvent.which===9){
        $(this).click();
    }
}

/**
 * toggle file input and text inside based on file input checkbox
 */
function toggleLogArea(){
    $(".log-input-msg").toggleClass('d-none');
    $(".log-input").toggleClass('d-none');

}

/**
 * clear previously analysed results
 */
function clearAnalysisResults(){
    $('#log-analysis-groups').children().remove();
    $('#log-analysis-results').children().remove();
}

/**
 * Analyse button was clicked
 */
function fileSubmit(){
    var logTypeFile=$("#input-log-type")[0].checked;

    if( logTypeFile){ //File input
        var logInput = $("#file-input");
    }else{ //Folder input
        var logInput = $("#folder-input");
    }

    if( logInput.val()==''){
        alert("No file entered!");
        return;
    }
    clearAnalysisResults();
    toggleChooseLogs();
    showSidebar();
    files=[];

    for(i=0;i<logInput[0].files.length;i++){
        if (logInput[0].files[i].type==='text/plain'){ //if text file
            //addLogAnalysisEntry( i, logInput[0].files[i]);
            readObject( logInput[0].files[i], i,"analyse","",false);
        }else if (supportedArchiveTypes.includes(logInput[0].files[i].type)){ //if zip file
            parseZipFile( i, logInput[0].files[i], logInput[0].files[i].webkitRelativePath);
        }
    }

}


function parseZipFile(entryId, zipFile, path=''){
    var new_zip = new JSZip(); //new instance
    new_zip.loadAsync(zipFile)
    .then(function(zip) {
        var files = zip.file(/.*/); //all files in array ZipObjects
        for (let i=0;i<files.length;i++){
            if( RegExp('\.txt').test(files[i].name)){ //text file
                //addLogAnalysisEntry(entryId+'-'+i,files[i],true, path);
                readObject( files[i], entryId+'-'+i, "analyse", path, true);
            }else if(RegExp('\.zip').test(files[i].name)){
                files[i].async("blob")
                .then(function (file) {
                    if(path!==''){
                        path+='/';
                    }
                    parseZipFile(entryId+'-'+i, file, path+files[i].name);
                });
            }
        }
    });
}


/**
 * 
 * @param {ZipObject} file - reads the string
 * @param {String} panelId - id of panel where to add analysation content 
 * @param {String} entryId - id of file analysed
 */
function readObject(file, entryId, type="analyse", path='', isZipObject = false){
    if (isZipObject){
        files[entryId]={"file":file, "type": "zip"};
        file.async("string")
        .then(function success(text) {
            try {
                handleObject(JSON.parse(text), file, entryId, path, isZipObject, type);
            } catch (e){
                console.log('Error reading zip file.');
                console.log(e);
                return;
            }
        });
    }else{  //isnot zip object
        if(file.type==='text/plain'){
            files[entryId]={"file":file, "type": "text"};
            const reader = new FileReader();
            reader.readAsText(file);
            reader.addEventListener('load', (event) => {
                const text = event.target.result;
                try{
                    handleObject(JSON.parse(text), file, entryId, path, isZipObject, type);
                } catch (e){
                    console.log('Error reading text file.');
                    console.log(e);
                    return;
                }
              });
        }else{
            alert("Enter text file!");
        }
    }
}


function handleObject(jsonLog, file, entryId, path, isZipObject, type){
    if (type==="analyse"){
        analyse( jsonLog, file, entryId, path, isZipObject);
    }else if(type==="populateModal"){
        populateModal(jsonLog);
    }
}


/**
 * 
 * @param {JSON object} jsonLog -extracts info from
 */
function analyse(jsonLog, file, entryId, path='', isZipObject = false){
    const startTime=new Date(jsonLog[0].time);
    const endTime=new Date(jsonLog[jsonLog.length-1].time);
    const elapsedDate=new Date(endTime-startTime);
    var elapsedTime=elapsedDate.toISOString().slice(11, -5).split(":");
    elapsedTime=elapsedTime[0].concat("h, ",elapsedTime[1],"min, ",elapsedTime[2],"sec");
    if(elapsedDate.getDate()>1){
        elapsedTime=(elapsedDate.getDate()-1).toString().concat(" days, ", elapsedTime)
    }

    var errorCount=0;
    var runCount=0;
    var copyPasteCount=0;
    var debugCount=0;
    var filesCreated=new Set();
    var filesRan=new Set();
    var filesOpened=new Set();
    var copiedTexts={};
    var errorTexts={};
    for(var i=0;i<jsonLog.length;i++){
        if(jsonLog[i].sequence==='ShellCommand' && jsonLog[i].command_text.slice(0,4)==='%Run'){
            runCount++;
            filesRan.add(jsonLog[i].command_text.slice(5).replaceAll('\'',''));
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Error') && jsonLog[i].text_widget_class==="ShellText"){
            errorCount++;
            var date=getDate1(jsonLog[i].time)
            errorTexts[date]=jsonLog[i].text;
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Debug')){
            debugCount++;
        }
        if(jsonLog[i].sequence==='<<Paste>>' && jsonLog[i].text_widget_class==="CodeViewText"){
            copyPasteCount++;
            var date=getDate1(jsonLog[i-1].time)
            copiedTexts[date]='<pre>'.concat(jsonLog[i-1].text,'</pre>');
        }
        if(jsonLog[i].sequence==='SaveAs'){
            var filename=jsonLog[i].filename.split('\\');
            filesCreated.add(filename[filename.length-1]);
        }
        if(jsonLog[i].sequence==='Open'){
            var filename=jsonLog[i].filename.split('\\');
            filesOpened.add(filename[filename.length-1]);
        }

    }
    
    var generalInfo={
        'Start time':startTime.toLocaleString('en-GB'),
        'End time':endTime.toLocaleString('en-GB'),
        'Elapsed time':elapsedTime,
        'Run count':runCount,
        'Error count':errorCount,
        'Copy-paste count':copyPasteCount,
        'Debug count':debugCount,
        'Files created':[...filesCreated].join('<br>'),
        'Files ran':[...filesRan].join('<br>'),
        'Files opened':[...filesOpened  ].join('<br>')
    }

    var idGeneralInfo=`tableGeneralInfo-${entryId}`;
    var idCopyPaste=`tableCopyPaste-${entryId}`;
    var idErrors=`tableErrors-${entryId}`;

    var tableGeneralInfo=`
                <div class="table-container" id="general-info-block">
                    <table class="table" id='${idGeneralInfo}'>
                        <thead class="thead-light">
                            <tr>
                            <th scope="colgroup" colspan="2">General Info</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>`;
    var tableCopyPaste=`
            <div class="butcollapse" id='copiedTexts-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseCopyPaste-${entryId}" role="button" aria-expanded="false" aria-controls="collapseCopyPaste-${entryId}">
                Copy/Pasted texts (${copyPasteCount})
                </a>
                <div class="collapse" id="collapseCopyPaste-${entryId}">
                    <div class="card card-body">
                        <table class="table" id='${idCopyPaste}'>
                        <tbody>
                            
                        </tbody>
                        </table>  
                    </div>
                </div>
            </div>`;
    var tableErrors=`
            <div class="butcollapse" id='errorTexts-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseErrors-${entryId}" role="button" aria-expanded="false" aria-controls="collapseErrors-${entryId}">
                Errors (${errorCount})
                </a>
                <div class="collapse" id="collapseErrors-${entryId}">
                    <div class="card card-body">
                        <table class="table" id='${idErrors}'>
                        <tbody>
                            
                        </tbody>
                        </table>  
                    </div>
                </div>
            </div>`;
    var replayerButton=`
            <button id="btn-open-replayer-${entryId}" class="btn btn-primary btn-replayer" data-toggle="modal" data-target="#replayerModal" data-entry-id="${entryId}">
              Open Replayer
            </button>
            `;

    var panelId=`list-${entryId}`;
    addLogAnalysisEntry( entryId, panelId, file, isZipObject, path);


    $('#'+panelId).append(tableGeneralInfo);
    $('#'+panelId).append(tableCopyPaste);
    $('#'+panelId).append(tableErrors);
    $('#'+panelId).append(replayerButton);

    displayDataTable(idGeneralInfo,generalInfo);
    displayDataTable(idCopyPaste,copiedTexts);
    displayDataTable(idErrors,errorTexts);

    $('#btn-open-replayer-'+entryId).click(readFileForModal);
}


/**creates list groups tab and panel Single student analysis
 * 
 * @param {String or Integer} entryId marks unique id for list groups defining attributes
 */
function addLogAnalysisEntry( entryId, panelId, file, isZipObject = false, path=''){
    var tabList = $("#log-analysis-groups");
    var tabPanel = $("#log-analysis-results");
    var typeOfAnalysis=$("#input-analysis-type")[0].checked;

    setActive="";
    setActivePanel="";
    if (isZipObject){
        fileSize=`${Math.round(file._data.uncompressedSize/1024)}KB`;  
    }else{
        fileSize=`${Math.round(file.size/1024)}KB`;
    }
    if(path!==''){
        path+='/';
    }
    fileName=path+file.name;
    if (!isZipObject && file.webkitRelativePath!=""){
        fileName=file.webkitRelativePath
    }
    if(tabList[0].childElementCount===0){//first entry
        setActive="active";    
        setActivePanel="show active";
    }
    fileName=fileName.replaceAll('_','-');
    var newTabListElement = `<a class="list-group-item list-group-item-action failid ${setActive}" 
                            id="list-${entryId}-list" data-toggle="list" href="#list-${entryId}" role="tab" aria-controls="${entryId}">
                            <span class="badge badge-primary badge-pill">${fileSize}</span><br>${fileName}</a>`;

    var newTabPanelElement = `<div class="tab-pane fade ${setActivePanel}" id="${panelId}" role="tabpanel" aria-labelledby="list-${entryId}-list"></div>`;

    if (!typeOfAnalysis){ //Multiple student analysis
        if(tabList[0].childElementCount===0){//first entry
            var accordion=`<div class="accordion" id="multiple-student-list"></div>`;
            tabList.append(accordion);
        }
        
        if(fileName.split('/').length>1 ){
            tabList=$('#multiple-student-list');
            
            var firstFolderIndex=0;
            if(!$("#input-log-type")[0].checked){
                firstFolderIndex=1;
            }
            firstFolder=fileName.split('/')[firstFolderIndex];  //accordion list element id
            var firstFolderName=firstFolder;

            firstFolderList=firstFolder.split(' ');
            if (firstFolderList.length>1){
                var firstFolderName=firstFolderList[0] + ' ' + firstFolderList[1].split('-')[0]; //list element name
            }

            var folderNameId=firstFolderName.replaceAll(/ |\./ig,'-');
            var multipleStudentId=`student-${firstFolder.replaceAll(/ |\./ig,'-')}`;

            if( $('#'+multipleStudentId).length===0){
                var show = '';
                var expanded = 'false';
                if( $('.list-group-item').length===0){ //first element expanded
                    show = 'show';
                    expanded = 'true';
                }
                var studentListElementName=`<a id="${folderNameId}" class="btn list-group-item list-group-item-action student-name" data-toggle="collapse" data-target="#${multipleStudentId}" aria-expanded="${expanded}" aria-controls="${multipleStudentId}" tabindex="0">
                                                    ${firstFolderName}
                                                </a>`;
                var studentListElementPanel=`<div id="${multipleStudentId}" class="collapse ${show}" aria-labelledby="${firstFolderName}" data-parent="#multiple-student-list">
                                            </div>`;
                tabList.append(studentListElementName);
                tabList.append(studentListElementPanel);
            }
            tabList=$('#'+multipleStudentId);
            $('#'+folderNameId).keyup(switchFolder);
        }
    }

    tabList.append(newTabListElement);
    tabPanel.append(newTabPanelElement);
    
    $(`#list-${entryId}-list`).keyup(switchListItem); //adds event that switches list items when tab pressed
    if (!typeOfAnalysis){ //Multiple student analysis
        $(`#list-${entryId}-list`).click(switchListItem);
    }

    if(tabList[0].childElementCount===1){ //turn first file on
        $('.failid').first().focus();
    }
}


/** displays the data given to a table with id given
 * 
 * @param {string} tableId 
 * @param {json object} data 
 */
function displayDataTable(tableId,data){
    const tbody=$('#'+tableId+" tbody");
    tbody.empty();
    for(const key in data){
        if(Array.isArray(data[key])){
            continue;
        }
        tbody.append('<tr><td>'.concat(key,'</td><td>',data[key],'</td></tr>'));
    }
}

/**
 * 
 * @param {Date} date 
 */
function getDate1(date){
    return new Date(date).toLocaleString('en-GB');
}

function readFileForModal(){
    var entryId=$(this)[0].attributes['data-entry-id'].value

    if (files[entryId]==null){
        alert('File not found in input space.')
    }
    var isZipObject=files[entryId].type=="zip";
    readObject(files[entryId].file, '', type="populateModal", '', isZipObject);
}

function populateModal(jsonLog){
  const eventListGroup=$('#modal-sidebar-event-list');

  eventListGroup.empty();

  var eventList;
  var split='';

  var replayerFiles=[];
  var shellText=[];

  for(var i=0;i<jsonLog.length;i++){

    [replayerFiles, shellText]=addLogEvent(replayerFiles, shellText, jsonLog[i]);


    if(i%logCacheInterval==0){
        jsonLog[i]["analysation_cache"]={"replayerFiles":JSON.parse(JSON.stringify(replayerFiles)),"shellText":JSON.parse(JSON.stringify(shellText))}; 
    }

    if(i>1){
        split=(new Date(jsonLog[i].time))-(new Date(jsonLog[i-1].time));
        split=Math.floor(split / 1e3)
        if(split<1){
            split='';
        }
    }
    
    eventList=`
                <div id="${'event-list-row-'+i}" class="row event-row event-list-row" data-logfile-object-index="${i}" tabindex="0">
                    <div class="col-7 event-list-name">${encodeEntitie(jsonLog[i].sequence)}</div>
                    <div class="col-4 event-list-sec">${split}</div>
                </div>
                `;

    eventListGroup.append(eventList);
  }
  $('.event-list-row').focus(handleEventListFocus);
  modalJsonLog=jsonLog;
  console.log(jsonLog);
  //console.log(eventListGroup);
  //$('#modal-sidebar-event-list').scrollTop();
  //console.log(eventListGroup[0].scrollTo(0,100));
  //console.log($('#modal-sidebar-event-list'));
  //console.log($('#modal-sidebar-event-list')[0]);
  //console.log($('#modal-sidebar-event-list')[0].scrollTop);
  //console.log($('#modal-sidebar-event-list')[0].id);
  //$('#modal-sidebar-event-list')[0].scrollTop($('#modal-sidebar-event-list')[0].scrollTop);
  //$('#modal-sidebar-event-list')[0].scrollTo(0,200);
}


function addLogEvent(replayerFiles, shellText, logEvent){
    var activeIndex=getActiveIndex(replayerFiles);
    if (logEvent.sequence=='Open' || logEvent.sequence=='NewFile'){

        if(activeIndex!=-1){
            replayerFiles[activeIndex].active=false;
        }

        var filename="";
        if(logEvent.sequence=='NewFile'){
            filename="<untitled>";
        }else if(logEvent.sequence=='Open'){
            var filenameList=logEvent.filename.split('\\');
            filename=filenameList[filenameList.length-1];
        }
        replayerFiles.push({"active":true, "filename":filename, "codeViewText":[]});

    }else if (logEvent.sequence=='SaveAs'){
        var filenameList=logEvent.filename.split('\\');
        var filename=filenameList[filenameList.length-1];

        if(activeIndex!=-1){
            replayerFiles[activeIndex].filename=filename;
        }else{
            console.log("Error replayer no active files.\n"+replayerFiles);
        }
    }else if (logEvent.sequence=='TextInsert' || logEvent.sequence=='TextDelete'){
        if(logEvent.text_widget_class=='CodeViewText'){
            if(activeIndex!=-1){
                replayerFiles[activeIndex].codeViewText=addChangesToText(replayerFiles[activeIndex].codeViewText,logEvent);
            }else{
                console.log("Error replayer no active files.\n"+replayerFiles);
            }
        }else if(logEvent.text_widget_class=='ShellText'){
            var shellText=addChangesToText(shellText,logEvent);
        }
    }
    return [replayerFiles, shellText];
}


function getActiveIndex( objectList){
    for(var i=0; i<objectList.length;i++){
        if(objectList[i].active){
            return i;
        }
    }
    return -1;
}


function addChangesToText(ideText, logEvent){

    if(logEvent.sequence=='TextInsert'){
        var textEntered=logEvent.text.split("\n");
        var index=logEvent.index.split(".");
        var indexRow=index[0]-1;
        var indexColumn=index[1];

        if (indexRow>=ideText.length){ //text added to end
            ideText=ideText.concat(textEntered);
        }else if(textEntered.length==1){
            var row=ideText[indexRow];
            ideText[indexRow]=row.slice(0,indexColumn)+textEntered[0]+row.slice(indexColumn,row.length);
        }else{
            var firstRow=ideText[indexRow];
            textEntered[textEntered.length-1]=textEntered[textEntered.length-1]+firstRow.slice(indexColumn,firstRow.length);
            ideText[indexRow]=firstRow.slice(0,indexColumn)+textEntered[0];
            ideText.splice(indexRow+1,0, ...textEntered.slice(1,textEntered.length));

        }
    }else if(logEvent.sequence=='TextDelete'){
        var index1=logEvent.index1.split(".");
        var index1Row=parseInt(index1[0]-1);
        var index1Column=parseInt(index1[1]);

        var index2=logEvent.index2;
        var row=ideText[index1Row];
        
        if(row!=null){
            if(index2=="None"){
                if(index1Column<row.length){
                    ideText[index1Row]=row.slice(0,index1Column)+row.slice(index1Column+1,row.length);
                }else{
                    ideText[index1Row]=row+ideText[index1Row+1];
                    ideText.splice(index1Row+1,1);
                }
            }else{
                index2=index2.split(".");
                var index2Row=parseInt(index2[0]-1);
                var index2Column=parseInt(index2[1]);

                if(index1Row==index2Row){
                    ideText[index1Row]=row.slice(0,index1Column)+row.slice(index2Column,row.length);
                }else{
                    var lastRow=ideText[index2Row];

                    if(lastRow!=null){
                        ideText[index1Row]=row.slice(0,index1Column)+lastRow.slice(index2Column,lastRow.length);
                        ideText.splice(index1Row+1,index2Row-index1Row);
                    }
                }
            }
        }
    }
    return ideText;
}


/**
 * 
 * @param {*} stringToEncode 
 */
function encodeEntitie( stringToEncode){
    return stringToEncode.replaceAll('<','&lt;').replaceAll('>','&gt;');
}


/**
 * 
 */
function handleEventListFocus(){
    var jsonLogIndex=$(this)[0].attributes['data-logfile-object-index'].value;
    var eventListId=$(this)[0].attributes['id'].value;
    $(".event-list-row.active").removeClass('active');
    $("#"+eventListId).addClass('active');

    const eventListDataGroup=$('#modal-sidebar-event-data-list');

    eventListDataGroup.empty();

    var eventListData;
    var attrIndex=0;

    var currentObject=modalJsonLog[jsonLogIndex];

    for(const attribute in currentObject){
        eventListData=`
                    <div class="row event-row">
                        <div class="col-6">${attribute}</div>
                        <div class="col-6 json-value">${currentObject[attribute]}</div>
                    </div>    
                    `;

        eventListDataGroup.append(eventListData);
        attrIndex++;
    }

    var nearestCacheIndex=jsonLogIndex-(jsonLogIndex%logCacheInterval);

    var replayerFiles=JSON.parse(JSON.stringify(modalJsonLog[nearestCacheIndex].analysation_cache.replayerFiles));
    var shellText=JSON.parse(JSON.stringify(modalJsonLog[nearestCacheIndex].analysation_cache.shellText));


    for(var i=nearestCacheIndex+1;i<=jsonLogIndex;i++){
        [replayerFiles, shellText]=addLogEvent(replayerFiles, shellText, modalJsonLog[i]);
    }
    
    var programText=replayerFiles[getActiveIndex(replayerFiles)].codeViewText.join("\n");

    $("#modal-program-text").text(programText);
    $("#modal-shell-text").text(shellText.join("\n"));

    $("#modal-main-header").empty()
    for(var i=0;i<replayerFiles.length;i++){
        var file=`<div class="p-2 file ${replayerFiles[i].active ? 'active' : ''}">${encodeEntitie(replayerFiles[i].filename)}</div>`;
        $("#modal-main-header").append(file);
    }

    //$("html, body").animate({ scrollTop: $("#modal-main-shell").scrollTop() }, 1000);
    $("#modal-main-shell").scrollTop()

    hljs.highlightAll();
}