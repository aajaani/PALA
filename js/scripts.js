$(function() {
    console.log( "ready!" );
    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      });

    addListeners();
});

function addListeners(){
    $(".input-group-append").click(fileSubmit);
}

function fileSubmit(){
    if(this.previousElementSibling.firstElementChild.value==''){
        alert("Enter text file!");
        return;
    }
    readTxtFile(this.previousElementSibling.firstElementChild.files[0]);
}

function readTxtFile(file){
    if(file.type==='text/plain'){
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener('load', (event) => {
            const result = event.target.result;
            analyse(JSON.parse(result));
          });
    }else{
        alert("Enter text file!");
    }
}

function analyse(jsonLog){
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
    var filesCreated="";
    var copiedTexts={};
    var errorTexts={};
    for(var i=0;i<jsonLog.length;i++){
        if(jsonLog[i].sequence==='ShellCommand' && jsonLog[i].command_text.slice(0,4)==='%Run'){
            runCount++;
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Error')){
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
            copiedTexts[date]=jsonLog[i-1].text;
        }
        if(jsonLog[i].sequence==='SaveAs'){
            var filename=jsonLog[i].filename.split('\\');
            filesCreated+=filename[filename.length-1].concat('<br>');
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
        'Files created':filesCreated
    }

    if($('#general-info-table-c').hasClass('d-none')){
        $('#general-info-table-c').removeClass('d-none');
    }
    if($('#copiedTexts').hasClass('d-none')){
        $('#copiedTexts').removeClass('d-none');
    }
    if($('#errorTexts').hasClass('d-none')){
        $('#errorTexts').removeClass('d-none');
    }
    displayDataTable('general-info-table',generalInfo);
    displayDataTable('tableCopyPaste',copiedTexts);
    displayDataTable('tableErrors',errorTexts);
}

function displayDataTable(tableId,data){
    const tbody=$('#'+tableId+" tbody");
    tbody.empty();
    for(const key in data){
        if(Array.isArray(data[key])){
            console.log('jap');
            continue;
        }
        tbody.append('<tr><td>'.concat(key,'</td><td>',data[key],'</td></tr>'));
    }
}

function getDate1(date){
    return new Date(date).toLocaleString('en-GB');
}