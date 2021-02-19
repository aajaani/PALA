var supportedArchiveTypes=['application/x-zip-compressed'
                            ,'application/zip'
                            ,'application/x-tar'
                            ,'application/x-7z-compressed'
                            ,'application/x-rar-compressed'];
$(function() {
    console.log( "ready!" );

    addListeners();

    intializeSidebar();
});

function intializeSidebar(){

    $("#sidebar").mCustomScrollbar({
      theme: "minimal"
      });

}

/** adds listeners to html elements
 * 
 *  */ 
function addListeners(){
    $("#log-button").click(fileSubmit); //clicked on analyse button
    $("#input-log-type").change(toggleLogArea); //toggled file input
    $(".log-input").change(showLogInputData); //file or folder chosen then shown in log input area
    $("#expand-choose-logs").click(toggleChooseLogs); 
    $('#sidebarCollapse').click(toggleSidebar);
}

/**
 * toggles sidebar
 */
function toggleSidebar(){
    $('#sidebar, #content').toggleClass('active');

}

/**
 * displays sidebar
 */
function showSidebar(){
    $('#sidebar, #content').addClass('active');

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
    
/*     if(this.id==="expand-choose-logs"){ //expand
        $("#choose-logs").collapse('toggle');
    }else{ //collapse
        $("#choose-logs").collapse('hide'); 
        $("#expand-choose-logs").collapse('show');
    } */
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
        $('.failid').removeClass('active');   
    }
    $(".tab-pane").removeClass('active show');   

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

    for(i=0;i<logInput[0].files.length;i++){
        if (logInput[0].files[i].type==='text/plain'){ //if text file
            addLogAnalysisEntry( i, logInput[0].files[i]);
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
                addLogAnalysisEntry(entryId+'-'+i,files[i],true, path);
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

/**creates list groups tab and panel Single student analysis
 * 
 * @param {String or Integer} entryId marks unique id for list groups defining attributes
 */
function addLogAnalysisEntry( entryId, file, isZipObject = false, path=''){
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
    var panelId=`list-${entryId}`;
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

            var folderNameId=firstFolderName.replaceAll(/ |\./ig,'-')
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
    if (isZipObject){
        readZipObject(file, panelId, entryId);
    }else{
        readTxtFile( file, panelId, entryId);
    }
    
    $(`#list-${entryId}-list`).keyup(switchListItem); //adds event that switches list items when tab pressed
    if (!typeOfAnalysis){ //Multiple student analysis
        $(`#list-${entryId}-list`).click(switchListItem);
    }

    if(tabList[0].childElementCount===1){
        $('.failid').first().focus();
    }
}

/**
 * 
 * @param {ZipObject} file - reads the string
 * @param {String} panelId - id of panel where to add analysation content 
 * @param {String} entryId - id of file analysed
 */
function readZipObject(file, panelId, entryId){
    file.async("string")
    .then(function success(text) {
        try {
        analyse(JSON.parse(text), panelId, entryId);
        } catch (e){
            return;
        }
    });
}

/**
 * 
 * @param {file object} file - reads the file 
 */
function readTxtFile(file, panelId, entryId){
    if(file.type==='text/plain'){
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener('load', (event) => {
            const result = event.target.result;
            try{
            analyse(JSON.parse(result), panelId, entryId);
            } catch (e){
                return;
            }
          });
    }else{
        alert("Enter text file!");
    }
}

/**
 * 
 * @param {JSON object} jsonLog -extracts info from
 */
function analyse(jsonLog, panelId, entryId){
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
            filesRan.add(jsonLog[i].command_text.slice(5).replaceAll    ('\'',''));
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
        'Run cunt':runCount,
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

    $('#'+panelId).append(tableGeneralInfo);
    $('#'+panelId).append(tableCopyPaste);
    $('#'+panelId).append(tableErrors);

    displayDataTable(idGeneralInfo,generalInfo);
    displayDataTable(idCopyPaste,copiedTexts);
    displayDataTable(idErrors,errorTexts);
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