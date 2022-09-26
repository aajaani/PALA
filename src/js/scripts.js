var supportedArchiveTypes=['application/x-zip-compressed'
                            ,'application/zip'
                            ,'application/x-tar'
                            ,'application/x-7z-compressed'
                            ,'application/x-rar-compressed'];

var files=[];
var modalJsonLog=[];
var logCacheInterval=50;
var errorAnalysing=[];
var textGraphDataLog={};
var csvValues=[];

var chart;

$(function() {
    console.log( "ready!" );

    addListeners();

    $('[data-toggle="popover"]').popover({
        trigger: 'focus'
      }); 

    //$('#replayerModal').modal(); //delete
    //$('#textGraphModal').modal(); //delete 

    Split({
        columnGutters: [{
        track: 1,
        element: document.querySelector('.vertical-gutter'),
      }],
      rowGutters: [{
          track: 1,
        element: document.querySelector('.horizontal-gutter'),
      }]
    });
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
    $('#replayerModal').on('shown.bs.modal', replayerOnShown); //This event is fired when the modal has been made visible to the user 
    $('#replayerModal').on('hide.bs.modal', replayerOnHide);   //This event is fired immediately when the hide instance method has been called.
    $('#replayerModal').on('hidden.bs.modal', replayerOnHidden); //This event is fired when the modal has finished being hidden from the user (will wait for CSS transitions to complete).
    $('#modal-sidebar-event-list').on('keydown', onKeyDown); //allows to move around with arrow keys   #log-analysis-groups
    $('#textGraphModal').on('hidden.bs.modal', textGraphOnHidden); //This event is fired when the modal has finished being hidden from the user (will wait for CSS transitions to complete).
    $('.btn-replayer-controls').click(replayerAutoPlay);
    $('#download-csv-button').click(downloadCsv);
}


/**Downloads csv file with results of log analysis
 *
 */
function downloadCsv() {
    if (csvValues.length == 0) {
        return;
    }
    csvRows = [];
    csvRows.push(Object.keys(csvValues[0]).join(','));
    for (const row of csvValues) {
        csvRows.push(Object.values(row).join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    // Creating an object for downloading url
    const url = window.URL.createObjectURL(blob);
    // Creating an anchor(a) tag of HTML
    const a = document.createElement('a');
    // Passing the blob downloading url
    a.setAttribute('href', url);
    let fileDate= (new Date(Date.now())).toISOString().split('.')[0].replaceAll(/:/g,'-');
    a.setAttribute('download', `log-analysis-${fileDate}.csv`);
    // Performing a download with click
    a.click();
}


/** destroys created chart
 * 
 */
function textGraphOnHidden(){
    chart.destroy();
    $("#modal-main-header-graph").empty();
    textGraphDataLog={};
}


/** This event is fired when the modal has been made visible to the user 
 *  Make first element in event list active
 */
function replayerOnShown(){
    $('#event-list-row-0').focus();   
}


/** This event is fired immediately when the hide instance method has been called.
 *  Event list will be scrolled back to top
 */
function replayerOnHide(){
    $('#modal-sidebar-event-list').scrollTop(0);
}


/** This event is fired when the modal has finished being hidden from the user (will wait for CSS transitions to complete).
 * 
 */
function replayerOnHidden(){
    modalJsonLog=[];
    $('#modal-sidebar-event-list').empty();  //eemaldame kirjed replayerist
    $("#modal-main-header-replayer").empty();
    $("#modal-program-text").empty();
    $("#modal-shell-text").empty();
    resetReplayerPlayBtn();
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
    if (keyEvent.code=="Tab" || keyEvent.type=="click"){
        if ($("#input-analysis-type")[0].checked){ //Multiple student analysis
            $('.failid.active').removeClass('active');   
        }
        $(".tab-pane.active").removeClass('active show');   
        
        if (keyEvent.code=="Tab"){
            $(this).tab('show');
        }

        if ($("body").hasClass('modal-open')){

            var entryId=$(this)[0].attributes['aria-controls'].value

            if (files[entryId]==null){
                alert('File not found in input space.')
            }
            var isZipObject=files[entryId].type=="zip";
            if($('#replayerModal').hasClass('show')){
                replayerOnHidden();
                $('#modal-sidebar-event-list').scrollTop(0);
                readObject(files[entryId].file, '', "replayer", '', isZipObject);
            }else if($('#textGraphModal').hasClass('show')){
                chart.destroy();
                textGraphDataLog={};
                readObject(files[entryId].file, '', "textGraph", '', isZipObject);
            }
        }
    }
}


/** scroll replayer event rows with arrow keys
 * 
 */
function onKeyDown(keyEvent){
    if(["ArrowUp","ArrowDown"].indexOf(keyEvent.code) > -1) {
        keyEvent.preventDefault();
        if(keyEvent.code=="ArrowUp"){
            $(".event-list-row.active").prev().focus();
        }else if(keyEvent.code=="ArrowDown"){
            $(".event-list-row.active").next().focus();
        }
    }
} 


/** switch between grouped log file folders in analysed files
 * 
 */
function switchFolder(keyEvent){
    if (keyEvent.code=="Tab"){
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

function getLogFile() {
    if ($("#input-log-type")[0].checked) { //File input
        return $("#file-input");
    } else { //Folder input
        return $("#folder-input");
    }
}

/**
 * Analyse button was clicked
 */
function fileSubmit(){
    var logInput = getLogFile();

    if( logInput.val()==''){
        alert("No file entered!");
        return;
    }
    clearAnalysisResults();
    toggleChooseLogs();
    showSidebar();
    files=[];
    errorAnalysing=[];
    csvValues=[];

    for(i=0;i<logInput[0].files.length;i++){
        if (logInput[0].files[i].type==='text/plain' && logInput[0].files[i].name.includes(".txt")){ //if text file
            readObject( logInput[0].files[i], i,"analyse","",false);
        }else if (supportedArchiveTypes.includes(logInput[0].files[i].type)){ //if zip file
            parseZipFile( i, logInput[0].files[i], logInput[0].files[i].webkitRelativePath);
        }else{ //wrong type
            if(!logInput[0].files[i].name.includes("veebitekst.html")){
                errorAnalysing.push(logInput[0].files[i].name);
            }
        }
    }

    setTimeout(() => {  
         if(errorAnalysing.length>0){
            var tableErrors=`
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <h4 class="alert-heading">Error analysing files</h4>
                <a id='alert-expand-control' class='bold' data-toggle="collapse" href="#alert-expand-body" aria-expanded="false" aria-controls="alert-expand-body">Click here</a> to see list of files which couldn't be analysed.
                <div id="alert-expand-body" class="collapse">
                    <hr>
                    <ul id="alert-error-list" class="scroll-auto">
                    </ul>
                </div>
            </div>
                            `;
            $('body').append(tableErrors);
             for(let i=0;i<errorAnalysing.length;i++){
                $('#alert-error-list').append(`<li>${errorAnalysing[i]}</li>`);
             }
         }
        }, 1000);

}


/** Zipfiles are recursively read and sent to be analysed
 * 
 * @param {*} entryId - unique identifier
 * @param {*} zipFile - zipFile object
 * @param {*} path - path to current zipFile object
 */
function parseZipFile(entryId, zipFile, path=''){
    var new_zip = new JSZip(); //new instance
    new_zip.loadAsync(zipFile)
    .then(function(zip) {
        var files = zip.file(/.*/); //all files in array ZipObjects
        for (let i=0;i<files.length;i++){
            if( RegExp('\.txt').test(files[i].name)){ //text file
                readObject( files[i], entryId+'-'+i, "analyse", path, true);
            }else if(RegExp('\.zip').test(files[i].name)){
                files[i].async("blob")
                .then(function (file) {
                    if(path!==''){
                        path+='/';
                    }
                    parseZipFile(entryId+'-'+i, file, path+files[i].name);
                });
            }else{
                if(! RegExp('veebitekst\.html').test(files[i].name)){ //not veebitekst\.html
                    errorAnalysing.push(path+'/'+files[i].name);
                }
            }
        }
    });
}


/**
 * @param {*} file - file object
 * @param {String} entryId - id of file analysed
 * @param {*} type - describes what to do with read object
 * @param {*} path - path of current file
 * @param {boolean} isZipObject - describes wether file object is zip object
 */
function readObject(file, entryId, type="analyse", path='', isZipObject = false){
    if (isZipObject){
        files[entryId]={"file":file, "type": "zip"};
        file.async("string")
        .then(function success(text) {
            try {
                handleObject(JSON.parse(text), file, entryId, path, isZipObject, type);
            } catch (e){
                console.log(e);
                if(type=="analyse"){
                    errorAnalysing.push(path+file.name);
                }
                return;
            }
        });
    }else{  //is not zip object
        if(file.type==='text/plain'){
            files[entryId]={"file":file, "type": "text"};
            const reader = new FileReader();
            reader.readAsText(file);
            reader.addEventListener('load', (event) => {
                const text = event.target.result;
                try{
                    handleObject(JSON.parse(text), file, entryId, path, isZipObject, type);
                } catch (e){ 
                    console.log(e);
                    if(type=="analyse"){
                        errorAnalysing.push(path+file.name);
                    }
                    return;
                }
              });
        }else{
            alert("Enter text file!");
        }
    }
}


/**
 * 
 * @param {JSON} jsonLog - log content
 * @param {*} file - file object
 * @param {*} entryId - id of file analysed
 * @param {*} path - path of current file
 * @param {*} isZipObject - describes wether file object is zip object
 * @param {*} type - describes what to do with read object
 */
function handleObject(jsonLog, file, entryId, path, isZipObject, type){
    if (type==="analyse"){
        analyse( jsonLog, file, entryId, path, isZipObject);
    }else if(["replayer", "textGraph"].includes(type)){
        parseLogFile(jsonLog, type);
    }
}


/** analyses give jsonlog and add analysation content
 * 
 * @param {*} jsonLog - log content
 * @param {*} file - file object
 * @param {*} entryId - id of file analysed
 * @param {*} path - path of current file
 * @param {*} isZipObject - describes wether file object is zip object
 */
function analyse(jsonLog, file, entryId, path='', isZipObject = false){
    const startTime=new Date(jsonLog[0].time);
    const endTime=new Date(jsonLog[jsonLog.length-1].time);
    const elapsedDate=new Date(endTime-startTime);
    let elapsedTime=elapsedDate.toISOString().slice(11, -5).split(":");
    elapsedTime=elapsedTime[0].concat("h, ",elapsedTime[1],"min, ",elapsedTime[2],"sec");
    if(elapsedDate.getDate()>1){
        elapsedTime=(elapsedDate.getDate()-1).toString().concat(" days, ", elapsedTime)
    }

    let errors = {
        total : 0,
        syntaxError: 0,
        typeError: 0,
        nameError: 0,
        valueError: 0,
        attributeError: 0,
        texts: {}
    }
    let runCount=0;
    let pasted={
        total:0,
        characterCount:0,
        texts: {}
    }
    let debugCount=0;
    let filesCreated=new Set();
    let filesRan=new Set();
    let filesOpened=new Set();
    for(let i=0;i<jsonLog.length;i++){
        if(jsonLog[i].sequence==='ShellCommand'
            && jsonLog[i].command_text.slice(0,4)==='%Run'
            && !jsonLog[i].command_text.includes('$EDITOR_CONTENT')){
            runCount++;
            filesRan.add(jsonLog[i].command_text.slice(5).replaceAll('\'',''));
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Error') && jsonLog[i].text_widget_class==="ShellText"){
            errors.total++;
            switch(jsonLog[i].text.split(":")[0]){
                case "SyntaxError": errors.syntaxError++; break;
                case "TypeError": errors.typeError++; break;
                case "NameError": errors.nameError++; break;
                case "ValueError": errors.valueError++; break;
                case "AttributeError": errors.attributeError++; break;
            }
            let date=getDate1(jsonLog[i].time)
            errors.texts[date]=jsonLog[i].text;
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Debug')){
            debugCount++;
        }
        if(jsonLog[i].sequence==='<<Paste>>'
            && jsonLog[i].text_widget_class!=null
            && jsonLog[i].text_widget_class.includes("CodeViewText")){
            pasted.total++;
            if(jsonLog[i-1].text!=null){
                pasted.characterCount+=jsonLog[i-1].text.length;
                pasted.texts[getDate1(jsonLog[i-1].time)]='<pre>'.concat(jsonLog[i-1].text,'</pre>');
            }
        }
        if(jsonLog[i].sequence==='SaveAs'){
            let filename=jsonLog[i].filename.split('\\');
            filesCreated.add(filename[filename.length-1]);
        }
        if(jsonLog[i].sequence==='Open'){
            let filename=jsonLog[i].filename.split('\\');
            filesOpened.add(filename[filename.length-1]);
        }

    }
    
    var generalInfo={
        'Start time':startTime.toLocaleString('en-GB'),
        'End time':endTime.toLocaleString('en-GB'),
        'Elapsed time':elapsedTime,
        'Run count':runCount,
        'Error count':errors.total,
        'Paste text count':pasted.total,
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
            <div class="analysed-panel-btn-block" id='copiedTexts-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseCopyPaste-${entryId}" role="button" aria-expanded="false" aria-controls="collapseCopyPaste-${entryId}">
                Pasted texts (${pasted.total})
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
            <div class="analysed-panel-btn-block" id='errorTexts-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseErrors-${entryId}" role="button" aria-expanded="false" aria-controls="collapseErrors-${entryId}">
                Errors (${errors.total})
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
            <div class="analysed-panel-btn-block">
                <button id="btn-open-replayer-${entryId}" class="btn btn-primary btn-replayer" data-toggle="modal" data-target="#replayerModal" data-entry-id="${entryId}">
                    Open Replayer
                </button>
            </div>
            `;

    var textGraphButton=`
            <div class="analysed-panel-btn-block">
                <button id="btn-open-text-graph-${entryId}" class="btn btn-primary btn-graph" data-toggle="modal" data-target="#textGraphModal" data-entry-id="${entryId}">
                    Open program length graph
                </button>
            </div>
            `;

    var panelId=`list-${entryId}`;
    addLogAnalysisEntry( entryId, panelId, file, isZipObject, path);


    $('#'+panelId).append(tableGeneralInfo);
    $('#'+panelId).append(tableCopyPaste);
    $('#'+panelId).append(tableErrors);
    $('#'+panelId).append(replayerButton);
    $('#'+panelId).append(textGraphButton);

    displayDataTable(idGeneralInfo,generalInfo);
    displayDataTable(idCopyPaste,pasted.texts);
    displayDataTable(idErrors,errors.texts);

    $('#btn-open-replayer-'+entryId).click(readAnalysedFile);
    $('#btn-open-text-graph-'+entryId).click(readAnalysedFile);

    let nameObject = getNameObject(file, isZipObject, path);
    let fileAnalysisResults = {
        'filename':nameObject.fileName,
        'start time':startTime.toISOString(),
        'end time':endTime.toISOString(),
        'elapsed time':elapsedTime.replaceAll(",",""),
        'run count':runCount,
        'error count': errors.total,
        'SyntaxError count':errors.syntaxError,
        'TypeError count':errors.typeError,
        'NameError count':errors.nameError,
        'ValueError count':errors.valueError,
        'AttributeError count':errors.attributeError,
        'paste count':pasted.total,
        'pasted character count':pasted.characterCount,
        'debug count':debugCount,
        'files opened count':filesOpened.size
    }
    if($("#input-analysis-type")[0].checked){ //multiple student analysis
        fileAnalysisResults = Object.assign({"foldername":nameObject.folderName}, fileAnalysisResults);
    }
    csvValues.push(fileAnalysisResults);
}

/**
 *
 * @param file - file object
 * @param path - path of current file
 */
function getNameObject(file, isZipObject = false, path=''){
    let fileName = (path!=='' ? path+'/' : '') + file.name;
    if (!isZipObject && file.webkitRelativePath!=""){
        fileName=file.webkitRelativePath
    }
    fileName=fileName.replaceAll('_','-');

    let firstFolderIndex= $("#input-log-type")[0].checked ? 0 : 1;
    if(!firstFolderIndex){ //multiple student analysis
        let firstFolder=fileName.split('/')[firstFolderIndex];  //accordion list element id
        let firstFolderList=firstFolder.split(' ');

        let firstFolderName=firstFolder;
        if (firstFolderList.length>1){
            firstFolderName=firstFolderList[0] + ' ' + firstFolderList[1].split('-')[0]; //list element name
        }
        return {'fileName':fileName,
                'folderName':firstFolderName,
                'folderNameId':firstFolderName.replaceAll(/ |\./ig,'-'),
                'multipleStudentId':`student-${firstFolder.replaceAll(/ |\./ig,'-')}`}
    }else{
        return {'filename':fileName}
    }

}


/** adds log file row to analysed files and creates analysed card
 * 
 * @param {*} entryId - marks unique id for list groups defining attributes
 * @param {*} panelId - id of file analysed
 * @param {*} file  - file object
 * @param {*} isZipObject - describes wether file object is zip object
 * @param {*} path - path of current file
 */
function addLogAnalysisEntry( entryId, panelId, file, isZipObject = false, path=''){
    let tabList = $("#log-analysis-groups");
    let tabPanel = $("#log-analysis-results");
    let typeOfAnalysis=$("#input-analysis-type")[0].checked;
    let nameObject = getNameObject(file, isZipObject, path);

    setActive="";
    setActivePanel="";
    if (isZipObject){
        fileSize=`${Math.round(file._data.uncompressedSize/1024)}KB`;  
    }else{
        fileSize=`${Math.round(file.size/1024)}KB`;
    }
    if(tabList[0].childElementCount===0){//first entry
        setActive="active";    
        setActivePanel="show active";
    }

    var newTabListElement = `<a class="list-group-item list-group-item-action failid ${setActive}" 
                            id="list-${entryId}-list" data-toggle="list" href="#list-${entryId}" role="tab" aria-controls="${entryId}" data-filename="${nameObject.fileName}">
                            <span class="badge badge-primary badge-pill">${fileSize}</span><br>${nameObject.fileName}</a>`;

    var newTabPanelElement = `<div class="tab-pane fade ${setActivePanel}" id="${panelId}" role="tabpanel" aria-labelledby="list-${entryId}-list"></div>`;

    if (typeOfAnalysis){ //Multiple student analysis
        if(tabList[0].childElementCount===0){//first entry
            var accordion=`<div class="accordion" id="multiple-student-list"></div>`;
            tabList.append(accordion);
        }
        tabList=$('#multiple-student-list');

        if( $('#'+nameObject.multipleStudentId).length===0){
            var show = '';
            var expanded = 'false';
            if( $('.list-group-item').length===0){ //first element expanded
                show = 'show';
                expanded = 'true';
            }
            var studentListElementName=`<a id='${nameObject.folderNameId}' class='btn list-group-item list-group-item-action student-name student-name-folder' data-toggle='collapse' data-target='#${nameObject.multipleStudentId}' aria-expanded='${expanded}' aria-controls='${nameObject.multipleStudentId}' tabindex='0'>
                                                ${nameObject.folderName}
                                            </a>`;
            var studentListElementPanel=`<div id="${nameObject.multipleStudentId}" class="student-folder-files collapse ${show}" aria-labelledby="${nameObject.folderName}" data-parent="#multiple-student-list">
                                        </div>`;

            //folder ordering
            let students = $('.student-name-folder');
            if (students.length==0){
                tabList.append(studentListElementName);
                tabList.append(studentListElementPanel);
            }else{ //order
                for(let i=0;i<students.length;i++){
                    if(students[i].id>nameObject.folderNameId){ //current folder is alphapetically higher
                        $(students[i]).before(studentListElementName);
                        $(students[i]).before(studentListElementPanel);
                        break;
                    }
                    if(i==students.length-1){ //last in order
                        tabList.append(studentListElementName);
                        tabList.append(studentListElementPanel);
                        break;
                    }
                }
            }
            //folder ordering end
        }
        tabList=$('#'+nameObject.multipleStudentId);
        $('#'+nameObject.folderNameId).keyup(switchFolder);

    }


    //file ordering
    let files = $('.failid');
    if (typeOfAnalysis){ //Multiple student analysis
        files = $('#'+nameObject.multipleStudentId+' .failid');
    }  

    if (files.length==0){
        tabList.append(newTabListElement);
    }else{ //order
        for(let i=0;i<files.length;i++){
            if(files[i].dataset.filename>nameObject.fileName){ //current folder is alphapetically higher
                $(files[i]).before(newTabListElement);
                break;
            }
            if(i==files.length-1){ //last in order
                tabList.append(newTabListElement);
                break;
            }
        }
    }
    //file ordering end
    tabPanel.append(newTabPanelElement);
    
    $(`#list-${entryId}-list`).keyup(switchListItem); //adds event that switches list items when tab pressed
    if (typeOfAnalysis){ //Multiple student analysis
        $(`#list-${entryId}-list`).click(switchListItem);
    }

    if(!$('.failid').first().hasClass('active')){ //turn first file on
        if (typeOfAnalysis && $('.failid').first().is(":hidden")){ //Multiple student analysis
            $('.student-folder-files.show').removeClass('show');
            $('.student-folder-files').first().addClass('show');
        }
        $('.failid').first().click();
    }
}


/** displays the data given to a table with id given
 * 
 * @param {string} tableId 
 * @param {json object} data 
 */
function displayDataTable( tableId, data){
    const tbody=$('#'+tableId+" tbody");
    tbody.empty();
    for(const key in data){
        if(Array.isArray(data[key])){
            continue;
        }
        tbody.append('<tr><td>'.concat(key,'</td><td>',data[key],'</td></tr>'));
    }
}

/** return date which is converted to en-GB LocaleString
 * 
 * @param {Date} date 
 */
function getDate1(date){
    return new Date(date).toLocaleString('en-GB');
}


/**  already analysed file is passed to be read and the type is chosen 
 *  based on what button was clicked
 */
function readAnalysedFile(){

    var entryId=$(this)[0].attributes['data-entry-id'].value

    if (files[entryId]==null){
        alert('File not found in input space.')
    }
    var isZipObject=files[entryId].type=="zip";
    if($(this)[0].attributes['data-target'].value=='#replayerModal'){
        readObject(files[entryId].file, '', "replayer", '', isZipObject);
    }else if($(this)[0].attributes['data-target'].value=='#textGraphModal'){
        readObject(files[entryId].file, '', "textGraph", '', isZipObject);
    }
}


/** Parses jsonLog and caches parced log content to jsonLog. 
 * 
 * @param {*} jsonLog - log content
 * @param {*} type - describes what to do with read object
 */
function parseLogFile(jsonLog, type){
    const eventListGroup=$('#modal-sidebar-event-list');
    if(type=="replayer"){
        eventListGroup.empty();
    }else if(type=="textGraph"){
        if (! textGraphDataLog.hasOwnProperty('AllFiles')){
            textGraphDataLog['AllFiles']=[];
        }
        if (! textGraphDataLog.hasOwnProperty('ShellText')){
            textGraphDataLog['ShellText']=[];
        }
    }

    var eventList;
    var split='';

    var replayerFiles=[];
    var shellText=[];

    var data=[]

    const reducerStringArray = (accumulator, currentValue) => accumulator + currentValue.length;
    const reducerFiles= (accumulator, currentValue) => accumulator + currentValue.codeViewText.reduce(reducerStringArray,0);

    for(var i=0;i<jsonLog.length;i++){

        [replayerFiles, shellText]=addLogEvent(replayerFiles, shellText, jsonLog[i]);

        if(type=="replayer"){
            if(i%logCacheInterval==0){
                jsonLog[i]["analysation_cache"]={"replayerFiles":JSON.parse(JSON.stringify(replayerFiles)),"shellText":JSON.parse(JSON.stringify(shellText))}; 
            }

            if(i>1){
                split=(new Date(jsonLog[i].time))-(new Date(jsonLog[i-1].time));
                split=Math.floor(split / 1e3);
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
        }else if(type=="textGraph"){
            if ((jsonLog[i].sequence=='TextInsert' || jsonLog[i].sequence=='TextDelete') && ((new Date(jsonLog[i].time))-(new Date(jsonLog[i-1].time)))>1/*ms*/){
                textGraphDataLog['AllFiles'].push({"x": jsonLog[i].time,"y":replayerFiles.reduce(reducerFiles,0)});
                if(jsonLog[i].text_widget_class=='ShellText'){
                    textGraphDataLog['ShellText'].push({"x": jsonLog[i].time,"y":shellText.reduce(reducerStringArray,0)});
                }else{
                    let textWidgetId=jsonLog[i].text_widget_id;
                    if (! textGraphDataLog.hasOwnProperty(textWidgetId)){
                        textGraphDataLog[textWidgetId]=[];
                    }
                    let indexOfFile=replayerFiles.findIndex(obj => obj.text_widget_id==textWidgetId);
                    if(indexOfFile!=-1){
                        textGraphDataLog[textWidgetId].push({"x": jsonLog[i].time,"y":replayerFiles[indexOfFile].codeViewText.reduce(reducerStringArray,0)});
                    }
                }
                //data.push(textGraphDataObj); //.split('T').join(' ')  jsonLog[i].time
            }
        }
    }
    if(type=="replayer"){
        $('.event-list-row').focus(handleEventListFocus);
        modalJsonLog=jsonLog;
        $('#event-list-row-0').focus();
    }else if(type=="textGraph"){
    $("#modal-main-header-graph").empty();
    var file=`<div class="file active" onclick="handleTextGraphDataChange(this);" data-text_widget_id="AllFiles">All program files</div>`;
    $("#modal-main-header-graph").append(file);
    file=`<div class="file" onclick="handleTextGraphDataChange(this);" data-text_widget_id="ShellText">Shell</div>`;
    $("#modal-main-header-graph").append(file);
    for(var i=0;i<replayerFiles.length;i++){
        file=`<div class="file " onclick="handleTextGraphDataChange(this);" data-text_widget_id="${replayerFiles[i].text_widget_id}">${encodeEntitie(replayerFiles[i].filename)}</div>`;
        $("#modal-main-header-graph").append(file);
    }
    chart = getNewChart('AllFiles'); 
    }
}


function handleTextGraphDataChange(value){
    $('.file').removeClass('active');
    $(value).addClass('active');
    chart.destroy();
    chart = getNewChart($(value)[0].attributes['data-text_widget_id'].value);
}


function getNewChart(index){
    return new Chart( 'text-length-graph', {
        // The type of chart we want to create  
        type: 'line',
        // The data for our dataset
        data: {
            datasets: [{
              label: 'Character count',
              data:textGraphDataLog[index],
              borderColor: 'rgba(0, 98, 168, 1)',
              backgroundColor: 'rgba(0, 98, 168, 0.1)',
              fill: true,
              pointRadius:0
            }]
          }
        ,
        // Configuration options go here
        options: {
            maintainAspectRatio:false,
            interaction: {
                intersect:false,
                axis: 'x'
              },
            plugins:{
                title: {
                    display: true,
                    text: 'Text length graph',
                    font: {
                        size: 20
                    }
                },
                legend:{
                    display:false
                }
            },
            scales: {
                 y: {
                    min:0,
                    title: {
                        display: true,
                        text: 'Character count',
                        font: {
                            size: 14,
                            style:'bold'
                        }
                    }
                }, 
                x: {
                    type: 'timeseries',
                    display: true,
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            size: 14,
                            style:'bold'
                        }
                    },
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'dd/MM HH:mm'
                        },
                        tooltipFormat: 'dd/MM/yyyy HH:mm:ss'
                    } ,    
                    ticks: {
                        source:'data',
                        maxTicksLimit:10,
                    } 
                }
            }
        }
    });
}


/** Edits replayerFiles, shellText based on logevent.
 * 
 * @param {Array} replayerFiles - contains array objects of opened files and their contents
 * @param {String array} shellText - content of shell
 * @param {*} logEvent - current jsonlog event object
 * @returns edited replayerFiles, shellText
 */
function addLogEvent(replayerFiles, shellText, logEvent){
    var activeIndex=getActiveIndex(replayerFiles);
    let indexOfFile=-2;
    if (logEvent.text_widget_id!=null && logEvent.sequence!='EditorTextCreated' && logEvent.text_widget_class!='ShellText'){
        indexOfFile=replayerFiles.findIndex(obj => obj.text_widget_id==logEvent.text_widget_id);
    }
    if (['Open','NewFile'].includes(logEvent.sequence) || indexOfFile==-1){

        if(activeIndex!=-1){
            replayerFiles[activeIndex].active=false;
        }

        var filename="";
        if(logEvent.sequence=='NewFile' || (indexOfFile==-1 && logEvent.sequence!='Open')){
            filename="<untitled>";
        }else if(logEvent.sequence=='Open'){
            var filenameList=logEvent.filename.split('\\');
            filename=filenameList[filenameList.length-1];
        }
        replayerFiles.push({"active":true, "text_widget_id":logEvent.text_widget_id, "filename":filename, "codeViewText":[]});

    }else if (logEvent.sequence=='SaveAs'){
        var filenameList=logEvent.filename.split('\\');
        var filename=filenameList[filenameList.length-1];

        if(activeIndex!=-1){
            replayerFiles[activeIndex].filename=filename;
        }else{
            console.log("Error replayer no active files.\n"+replayerFiles);
        }
    }else if (logEvent.sequence=='TextInsert' || logEvent.sequence=='TextDelete'){
        if(logEvent.text_widget_class.includes('CodeViewText')){
            if(activeIndex!=-1){
                replayerFiles[activeIndex].codeViewText=addChangesToText(replayerFiles[activeIndex].codeViewText,logEvent);
            }else{
                console.log("Error replayer no active files.\n"+replayerFiles);
            }
        }else if(logEvent.text_widget_class=='ShellText'){
            var shellText=addChangesToText(shellText,logEvent);
        }
    }else if(logEvent.sequence=='<Button-1>'
        && logEvent.text_widget_class!=null
        && logEvent.text_widget_class.includes('CodeViewText')){ //switch files
        if(activeIndex!=-1){
            replayerFiles[activeIndex].active=false;
        }
        for(var i=0; i<replayerFiles.length;i++){
            if(replayerFiles[i].text_widget_id==logEvent.text_widget_id){
                replayerFiles[i].active=true;
                break;    
            }
        }

    }
    return [replayerFiles, shellText];
}


/**
 * 
 * @param {*} objectList list of objects containing an active property.
 * @returns objectlist index of object with active property set to true.
 */
function getActiveIndex( objectList){
    for(var i=0; i<objectList.length;i++){
        if(objectList[i].active){
            return i;
        }
    }
    return -1;
}


/**
 * 
 * @param {String array} ideText - text added or removed based on logEvent
 * @param {*} logEvent - current jsonlog event object
 * @returns edited ideText
 */
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
 * @param {String} stringToEncode 
 * @returns stringToEncode which is made html safe 
 */
function encodeEntitie( stringToEncode){
    return stringToEncode.replaceAll('<','&lt;').replaceAll('>','&gt;');
}


/** When event list row clicked in replayer, the event state is displayed in replayer
 * 
 */
function handleEventListFocus(value){
    var fileSwitch=$(value).hasClass('file');

    var jsonLogIndex=0
    if(fileSwitch){
        jsonLogIndex=$('.event-list-row.active')[0].attributes['data-logfile-object-index'].value;
    }else{
        jsonLogIndex=$(this)[0].attributes['data-logfile-object-index'].value;
        var eventListId=$(this)[0].attributes['id'].value;
        $(".event-list-row.active").removeClass('active');
        $("#"+eventListId).addClass('active');
    }

    var nearestCacheIndex=jsonLogIndex-(jsonLogIndex%logCacheInterval);

    var replayerFiles=JSON.parse(JSON.stringify(modalJsonLog[nearestCacheIndex].analysation_cache.replayerFiles));
    var shellText=JSON.parse(JSON.stringify(modalJsonLog[nearestCacheIndex].analysation_cache.shellText));
    
    var ideIndex=0;
    for(var i=nearestCacheIndex+1;i<=jsonLogIndex;i++){
        [replayerFiles, shellText]=addLogEvent(replayerFiles, shellText, modalJsonLog[i]);
        
         if(modalJsonLog[jsonLogIndex].text_widget_class!=null
             && modalJsonLog[jsonLogIndex].text_widget_class.includes('CodeViewText')){
            if(modalJsonLog[jsonLogIndex].sequence=="TextInsert"){
                ideIndex=modalJsonLog[jsonLogIndex].index;
            }else if(modalJsonLog[jsonLogIndex].sequence=="TextDelete"){
                ideIndex=modalJsonLog[jsonLogIndex].index1;
            }
        }  
    }
    
    var activeIndex=getActiveIndex(replayerFiles);
    if(fileSwitch){
        let text_widget_id = $(value)[0].attributes['data-text_widget_id'].value;
        replayerFiles.map((obj, index) => {
            if(obj.text_widget_id==text_widget_id){
                activeIndex=index;
                obj.active=true;
            }else{
                obj.active=false;
            }
          })
    }
    if(replayerFiles[activeIndex]!=null){
        var programText=replayerFiles[activeIndex].codeViewText.join("\n");
        $("#modal-program-text").text(programText);
    }

    if(shellText!=null){
        $("#modal-shell-text").text(shellText.join("\n"));
    }

    $("#modal-main-header-replayer").empty()
    for(var i=0;i<replayerFiles.length;i++){
        var file=`<div class="file ${replayerFiles[i].active ? 'active' : ''}" onclick="handleEventListFocus(this);" data-text_widget_id="${replayerFiles[i].text_widget_id}">${encodeEntitie(replayerFiles[i].filename)}</div>`;
        $("#modal-main-header-replayer").append(file);
    }

    $('#modal-main-shell').scrollTop( $('#modal-main-shell')[0].scrollHeight); //scroll to bottom of shell

    hljs.highlightAll(); //colour the code in replayer

    //scroll replayer if text insert
    if(replayerFiles[activeIndex]!=null && ideIndex!=0){
        let ideIndexRow=ideIndex.split('.')[0];
        let scrollHeight=$('#modal-main-ide')[0].scrollHeight/replayerFiles[activeIndex].codeViewText.length*ideIndexRow;
        $('#modal-main-ide').scrollTop(scrollHeight);
    }

}


function updateReplayerSpeed(val) {
    $('#replayer-speed').text(val); 
  }

function expandReplayer(val) {
    if($(val)[0].id=='replayer-expand-btn'){
        $('#replayerModal').toggleClass('modal-sb-space');
    }else if($(val)[0].id=='graph-expand-btn'){
        $('#textGraphModal').toggleClass('modal-sb-space');
    }
  }

async function replayerAutoPlay(){
    $('.btn-replayer-controls').toggleClass('d-none');
    await sleep(0);
    var btn=$(this)[0].id;
    if(btn=='replayer-pause'){
        return;
    }
    var speed=parseInt($('#replayer-speed-range').val());
    var jsonLogIndex=parseInt($('.event-list-row.active')[0].attributes['data-logfile-object-index'].value);

    for(var jsonLogIndex;jsonLogIndex<=modalJsonLog.length;jsonLogIndex+=speed){
        if($('.btn-replayer-controls.d-none')[0].id=='replayer-pause'){
            break;
        }
        speed=parseInt($('#replayer-speed-range').val());
        await sleep(30);
        $('#event-list-row-'+jsonLogIndex).focus();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function resetReplayerPlayBtn(){
    if($('#replayer-play').hasClass('d-none')){
        $('.btn-replayer-controls').toggleClass('d-none');
    }
}